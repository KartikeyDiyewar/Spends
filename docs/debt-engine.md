# Debt Simplification Engine

**File**: `lib/debt-engine.ts`  
**Type**: Pure TypeScript module — no side effects, no Supabase calls, no I/O.

---

## Purpose

When multiple people share expenses across many transactions, the raw debt graph can have many redundant edges. The debt engine collapses that graph to the **minimum number of cash transfers** needed to fully settle everyone.

**Example**:
```
Raw debts:
  Alice → Bob   $10
  Bob   → Carol $10

Simplified:
  Alice → Carol $10   (Bob is eliminated)
```

This is especially valuable in groups where Bob paid for dinner, Carol paid for the taxi, and Alice paid for drinks — instead of everyone paying everyone else, the engine finds the fewest transfers.

---

## API

```typescript
import { simplifyDebts, Debt } from '../lib/debt-engine';

type Debt = {
  debtor: string;    // UUID of the person who owes money
  creditor: string;  // UUID of the person who is owed money
  amount: number;
};

const simplified: Debt[] = simplifyDebts(rawDebts);
```

Input and output are both `Debt[]`. The output array has fewer or equal entries compared to the input.

---

## Algorithm

### Step 1 — Compute net balances

For every unique user in the debt list, compute their net position:

```
balance[user] += amount   when user is a creditor
balance[user] -= amount   when user is a debtor
```

A positive balance means the user is owed money overall.  
A negative balance means the user owes money overall.  
A balance near zero means they're settled.

```typescript
const balances: Record<string, number> = {};

for (const { debtor, creditor, amount } of transactions) {
  balances[debtor]   = (balances[debtor]   ?? 0) - amount;
  balances[creditor] = (balances[creditor] ?? 0) + amount;
}
```

### Step 2 — Partition into debtors and creditors

```typescript
const debtors:   { user: string; balance: number }[] = [];
const creditors: { user: string; balance: number }[] = [];

for (const [user, balance] of Object.entries(balances)) {
  if (balance < -0.01) debtors.push({ user, balance: -balance }); // positive debt
  else if (balance > 0.01) creditors.push({ user, balance });
}
```

The `0.01` threshold avoids floating-point noise from treating $0.001 as an unsettled debt.

### Step 3 — Sort largest first (greedy optimization)

```typescript
debtors.sort((a, b) => b.balance - a.balance);
creditors.sort((a, b) => b.balance - a.balance);
```

Sorting by descending balance causes the greedy pass to match large debts first, which tends to produce fewer total transactions.

### Step 4 — Two-pointer greedy resolution

```typescript
let i = 0, j = 0;
while (i < debtors.length && j < creditors.length) {
  const settled = Math.min(debtors[i].balance, creditors[j].balance);

  simplified.push({
    debtor: debtors[i].user,
    creditor: creditors[j].user,
    amount: Number(settled.toFixed(2)),
  });

  debtors[i].balance   -= settled;
  creditors[j].balance -= settled;

  if (Math.abs(debtors[i].balance) < 0.01) i++;
  if (Math.abs(creditors[j].balance) < 0.01) j++;
}
```

Each iteration:
- Takes the minimum of the current debtor's outstanding debt and the current creditor's outstanding credit.
- Emits one transaction for that amount.
- Reduces both balances by `settled`.
- Advances the pointer for whoever is now fully settled.

This is `O(n log n)` — sorting dominates the linear two-pointer pass.

---

## Guarantees and Limitations

| Property | Status |
|---|---|
| Conservation: total money in = total money out | ✅ Preserved |
| Minimality: fewest possible transactions | ✅ Greedy is optimal when balances are exact |
| Floating point: amounts rounded to 2 decimal places | ✅ `toFixed(2)` on output |
| Currency: single currency only | ✅ (no multi-currency support) |
| Pure function: no I/O, no mutations | ✅ Safe to call anywhere |

**Important**: The algorithm operates on user IDs (UUIDs), not names. Callers are responsible for resolving IDs to display names.

---

## Integration in the Dashboard

The dashboard (`app/(tabs)/index.tsx`) uses the engine like this:

```typescript
// 1. Fetch all raw debts from Supabase
const rawDebts = await getAllDebtsForUser(currentUserId);

// 2. Simplify
const simplified = simplifyDebts(rawDebts);

// 3. Compute net balance for current user
let balance = 0;
simplified.forEach(d => {
  if (d.creditor === currentUserId) balance += d.amount;
  if (d.debtor   === currentUserId) balance -= d.amount;
});

setDebts(simplified);
setNetBalance(balance);
```

Then the render splits debts by direction:
```typescript
const myCredits = debts.filter(d => d.creditor === currentUserId); // "You are owed"
const myDebts   = debts.filter(d => d.debtor   === currentUserId); // "You owe"
```

---

## Testing the Engine

The engine is a pure function with no dependencies, making it easy to unit test:

```typescript
import { simplifyDebts } from '../lib/debt-engine';

// Chain: A→B $10, B→C $10 should become A→C $10
const result = simplifyDebts([
  { debtor: 'A', creditor: 'B', amount: 10 },
  { debtor: 'B', creditor: 'C', amount: 10 },
]);
// result: [{ debtor: 'A', creditor: 'C', amount: 10 }]

// Already settled: no output
const zero = simplifyDebts([
  { debtor: 'A', creditor: 'B', amount: 10 },
  { debtor: 'B', creditor: 'A', amount: 10 },
]);
// zero: []
```

When adding tests, place them in `__tests__/debt-engine.test.ts` using Jest (included with Expo).
