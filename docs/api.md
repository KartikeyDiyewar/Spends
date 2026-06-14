# API Layer Reference

All database access is centralized in `lib/api.ts`. Screens and components must **only** import from this file — never call `supabase` directly in a screen.

The Supabase client singleton is in `lib/supabase.ts`.

---

## Conventions

- Every function is `async` and returns typed data or `null` / `[]` on error.
- Errors are logged with `console.error` and swallowed; callers receive empty/null data.
- No throwing — callers must check for empty results.
- Types are imported from `types/database.ts`.

---

## Profiles

### `getProfile(userId: string): Promise<Profile | null>`

Fetches a single user's profile.

```typescript
import { getProfile } from '../lib/api';

const profile = await getProfile(session.user.id);
if (profile) console.log(profile.full_name);
```

**Supabase query**: `SELECT * FROM profiles WHERE id = userId LIMIT 1`

---

### `searchProfilesByEmail(email: string): Promise<Profile | null>`

**Currently returns `null` (stub).**

The `profiles` table does not store email — email lives in `auth.users` which is not directly queryable from the client. Options to implement this:
- Supabase Edge Function that queries `auth.users` server-side.
- Add an `email` column to `profiles` and populate it on signup.

---

## Friends

### `getFriends(userId: string): Promise<Profile[]>`

Returns full `Profile` objects for all accepted friends of `userId`.

```typescript
const friends = await getFriends(session.user.id);
// friends: Profile[]
```

**Implementation**:
1. Query `friends` table filtering by `user_id_1 = userId OR user_id_2 = userId` and `status = 'accepted'`.
2. Map results to the "other" user's ID.
3. Fetch `profiles` for those IDs.
4. Returns `[]` on any error.

---

### `addFriend(userId1: string, userId2: string): Promise<PostgrestError | null>`

Inserts a friendship row with `status: 'accepted'` immediately (no pending flow).

```typescript
const error = await addFriend(currentUserId, friendId);
if (error) console.error('Could not add friend:', error);
```

**Note**: The current implementation skips the pending/accept handshake — both users are immediately friends. The `status: 'pending'` flow is not yet wired up in the UI.

---

## Expenses

### `addExpense(paidBy, amount, description, splits): Promise<{ error, data }>`

Creates an expense and its splits atomically (two sequential inserts).

```typescript
import { addExpense } from '../lib/api';
import type { ExpenseSplit } from '../types/database';

const splits: Omit<ExpenseSplit, 'expense_id'>[] = [
  { user_id: 'alice-uuid', amount_owed: 25.00 },
  { user_id: 'bob-uuid',   amount_owed: 25.00 },
];

const { data, error } = await addExpense(
  session.user.id,  // who paid
  50.00,            // total amount
  'Dinner',         // description
  splits
);
```

**Implementation**:
1. `INSERT INTO expenses (paid_by, amount, description)` → gets new `id`.
2. `INSERT INTO expense_splits` for each split, referencing the new `id`.
3. Returns `{ data: expenseRow, error: null }` on success, or `{ error, data: undefined }` on failure.

**Important**: If the expense insert succeeds but the splits insert fails, the expense row will exist without splits. There is no rollback currently. Future improvement: use a Supabase RPC (stored procedure) wrapped in a transaction.

---

## Balances & Debts

### `getAllDebtsForUser(userId: string): Promise<RawDebt[]>`

Returns all raw (un-simplified) debts involving `userId`.

```typescript
type RawDebt = { debtor: string; creditor: string; amount: number };

const rawDebts = await getAllDebtsForUser(session.user.id);
```

**Implementation**:
1. Query `expenses WHERE paid_by = userId` + their `expense_splits` → people who owe the user.
2. Query `expense_splits WHERE user_id = userId` + parent `expenses` → people the user owes.
3. Build `RawDebt[]` from both result sets.
4. Returns `[]` on error.

**Note**: This returns raw debts before simplification. Pass the result to `simplifyDebts()` from `lib/debt-engine.ts` to get the minimal transaction set.

**Current limitation**: The returned debts contain user IDs — there is no name resolution step yet. The dashboard currently shows raw UUIDs. To show names, you'd need to fetch profiles for all unique IDs in the result.

---

## Activity

### `getActivityForUser(userId: string): Promise<ActivityItem[]>`

Returns a combined, sorted list of expenses the user was involved in.

```typescript
type ActivityItem = {
  id: string;
  type: 'expense' | 'settlement';
  text: string;       // human-readable description
  amount: string;     // '$45.00'
  date: string;       // locale date string
  timestamp: number;  // Unix ms, used for sorting
};

const activities = await getActivityForUser(session.user.id);
// newest first
```

**Implementation**:
1. Query `expenses WHERE paid_by = userId` (expenses I paid for).
2. Query `expense_splits WHERE user_id = userId` joined to `expenses` (expenses others paid but I'm split into).
3. De-duplicate by `expense.id` using a `Map`.
4. Sort by `timestamp` descending.

**Text generation**:
- Expenses you paid → `"You paid for "${description}"`
- Expenses others paid → `"Someone added "${description}"` (TODO: resolve payer name)

**What's missing**: Settlements are not yet included in the activity feed (the `settlements` table is not queried here).

---

## Adding New API Functions

When adding a new function to `lib/api.ts`:

1. Import the relevant type from `types/database.ts`.
2. Use the `supabase` singleton from `lib/supabase.ts`.
3. Return typed data, never raw Supabase responses.
4. Handle errors at the function level: log + return empty/null.
5. Export the function — all consumers import from `lib/api.ts`.

**Template**:
```typescript
export async function doSomething(param: string): Promise<SomeType | null> {
  const { data, error } = await supabase
    .from('some_table')
    .select('*')
    .eq('column', param)
    .single();

  if (error) {
    console.error('doSomething failed:', error);
    return null;
  }
  return data;
}
```
