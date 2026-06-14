# Database Reference

The database is a Supabase-hosted Postgres instance. The full DDL lives in `supabase_schema.sql` at the project root. Apply it once to a fresh Supabase project.

---

## Tables

### `profiles`

Mirrors `auth.users` — one row per registered user.

```sql
CREATE TABLE public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name   text,
  avatar_url  text,
  updated_at  timestamptz
);
```

| Column | Notes |
|---|---|
| `id` | Same UUID as `auth.users.id` |
| `full_name` | Set from signup metadata by the `handle_new_user` trigger |
| `avatar_url` | Not currently used in the UI; reserved for future avatar upload |
| `updated_at` | Must be set manually on profile updates |

**RLS Policies**:
- `SELECT` — public (any authenticated user can read any profile)
- `INSERT` — only if `auth.uid() = id`
- `UPDATE` — only if `auth.uid() = id`

---

### `friends`

Bidirectional friendship — one row per pair, regardless of direction.

```sql
CREATE TABLE public.friends (
  user_id_1  uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id_2  uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  status     text CHECK (status IN ('pending', 'accepted')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id_1, user_id_2)
);
```

| Column | Notes |
|---|---|
| `user_id_1` | The user who initiated the request |
| `user_id_2` | The recipient |
| `status` | `'pending'` or `'accepted'` |

**RLS Policies**:
- `SELECT` — visible if `auth.uid()` is either `user_id_1` or `user_id_2`
- `INSERT` — only if `auth.uid() = user_id_1` (requester only)

**Important**: Queries must use `.or('user_id_1.eq.X,user_id_2.eq.X')` to find all friendships for a user (see `getFriends` in `lib/api.ts`).

---

### `groups`

Named expense groups (e.g. "House 2026", "Road Trip").

```sql
CREATE TABLE public.groups (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        text NOT NULL,
  created_by  uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now()
);
```

**RLS Policies**:
- `SELECT` — only if the user is in `group_members` for this group
- `INSERT` — only if `auth.uid() = created_by`

---

### `group_members`

Join table linking users to groups.

```sql
CREATE TABLE public.group_members (
  group_id   uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at  timestamptz DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
```

**RLS Policies**:
- `SELECT` — visible if `auth.uid()` is already a member of the same group
- `INSERT` — only if `auth.uid()` is the `created_by` of the group

---

### `expenses`

A single payment made by one person on behalf of a group.

```sql
CREATE TABLE public.expenses (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id    uuid REFERENCES public.groups(id) ON DELETE CASCADE, -- nullable
  paid_by     uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount      numeric NOT NULL,
  description text NOT NULL,
  created_at  timestamptz DEFAULT now()
);
```

| Column | Notes |
|---|---|
| `group_id` | `NULL` for 1-on-1 expenses not tied to a group |
| `paid_by` | The user who paid upfront |
| `amount` | Total amount paid |

**RLS Policies**:
- `SELECT` — visible if: `paid_by = auth.uid()`, OR user appears in `expense_splits` for this expense, OR user is in the group this expense belongs to
- `INSERT` — only if `auth.uid() = paid_by`

---

### `expense_splits`

Who owes what for a given expense.

```sql
CREATE TABLE public.expense_splits (
  expense_id   uuid REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_owed  numeric NOT NULL,
  PRIMARY KEY (expense_id, user_id)
);
```

| Column | Notes |
|---|---|
| `expense_id` | The parent expense |
| `user_id` | The person who owes |
| `amount_owed` | Their share of the expense |

**RLS Policies**:
- `SELECT` — if `user_id = auth.uid()` OR the expense was paid by `auth.uid()`
- `INSERT` — only if `auth.uid()` is the `paid_by` on the parent expense

---

### `settlements`

Records that one user paid another outside the app (cash, Venmo, etc.).

```sql
CREATE TABLE public.settlements (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  payer_id   uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  payee_id   uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount     numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

**RLS Policies**:
- `SELECT` — if `auth.uid()` is either `payer_id` or `payee_id`
- `INSERT` — only if `auth.uid() = payer_id`

---

## Triggers

### `handle_new_user`

Fires `AFTER INSERT ON auth.users`. Automatically creates a `profiles` row when a new user signs up, pulling `full_name` and `avatar_url` from the signup metadata.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

**This means**: To create a user with a name, you must pass `full_name` in the signup metadata:
```typescript
supabase.auth.signUp({
  email,
  password,
  options: { data: { full_name: 'Jane Doe' } }
});
```

---

## TypeScript Types

All table shapes are typed in `types/database.ts`:

```typescript
export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  updated_at: string | null;
};

export type Friend = {
  user_id_1: string;
  user_id_2: string;
  status: 'pending' | 'accepted';
  created_at: string;
};

export type Group = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
};

export type GroupMember = {
  group_id: string;
  user_id: string;
  joined_at: string;
};

export type Expense = {
  id: string;
  group_id: string | null;
  paid_by: string;
  amount: number;
  description: string;
  created_at: string;
};

export type ExpenseSplit = {
  expense_id: string;
  user_id: string;
  amount_owed: number;
};

export type Settlement = {
  id: string;
  payer_id: string;
  payee_id: string;
  amount: number;
  created_at: string;
};
```

Always import from `types/database.ts` — do not redeclare these types inline.

---

## Entity Relationship Diagram

```
auth.users
    │ (1:1)
    ▼
profiles ◄──────────────────────────────┐
    │                                   │
    │  user_id_1, user_id_2             │
    ├──────────────► friends            │
    │                                   │
    │  created_by                       │
    ├──────────────► groups             │
    │                    │              │
    │  user_id           │ group_id     │
    ├──────────────► group_members ◄────┤
    │                                   │
    │  paid_by     group_id (nullable)  │
    ├──────────────► expenses           │
    │                    │              │
    │  user_id           │ expense_id   │
    ├──────────────► expense_splits ◄───┘
    │
    │  payer_id, payee_id
    └──────────────► settlements
```

---

## Common Query Patterns

### Fetch a user's full name given their ID
```typescript
const { data } = await supabase
  .from('profiles')
  .select('full_name')
  .eq('id', userId)
  .single();
```

### Fetch all accepted friends with their profile data
```typescript
// Step 1: get friend IDs
const { data: friendRows } = await supabase
  .from('friends')
  .select('user_id_1, user_id_2')
  .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
  .eq('status', 'accepted');

// Step 2: map to the other user's ID
const ids = friendRows.map(r => r.user_id_1 === userId ? r.user_id_2 : r.user_id_1);

// Step 3: fetch profiles
const { data: profiles } = await supabase
  .from('profiles')
  .select('*')
  .in('id', ids);
```

### Insert an expense with splits (transactional pattern)
```typescript
// 1. Insert parent expense, get ID
const { data: exp } = await supabase
  .from('expenses')
  .insert([{ paid_by, amount, description }])
  .select()
  .single();

// 2. Insert splits referencing the new expense ID
await supabase
  .from('expense_splits')
  .insert(splits.map(s => ({ ...s, expense_id: exp.id })));
```
