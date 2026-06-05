// Type definitions for the debt engine
export type Debt = {
  debtor: string; // The person who owes money
  creditor: string; // The person who is owed money
  amount: number;
};

/**
 * Debt Simplification Algorithm
 * 
 * Takes an array of raw transactions/debts and simplifies them
 * to the minimum number of transactions required to settle up.
 *
 * Example: A owes B $10, B owes C $10 => A owes C $10
 */
export function simplifyDebts(transactions: Debt[]): Debt[] {
  // 1. Calculate net balances for every user
  const balances: Record<string, number> = {};

  for (const { debtor, creditor, amount } of transactions) {
    if (!balances[debtor]) balances[debtor] = 0;
    if (!balances[creditor]) balances[creditor] = 0;

    balances[debtor] -= amount; // Debtor's balance decreases
    balances[creditor] += amount; // Creditor's balance increases
  }

  // 2. Separate into debtors and creditors
  const debtors: { user: string; balance: number }[] = [];
  const creditors: { user: string; balance: number }[] = [];

  for (const [user, balance] of Object.entries(balances)) {
    if (balance < -0.01) debtors.push({ user, balance: -balance }); // store as positive debt
    else if (balance > 0.01) creditors.push({ user, balance });
  }

  // 3. Sort to potentially match largest debts first (optimization)
  debtors.sort((a, b) => b.balance - a.balance);
  creditors.sort((a, b) => b.balance - a.balance);

  // 4. Resolve debts
  const simplified: Debt[] = [];
  let i = 0; // index for debtors
  let j = 0; // index for creditors

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const settledAmount = Math.min(debtor.balance, creditor.balance);

    simplified.push({
      debtor: debtor.user,
      creditor: creditor.user,
      amount: Number(settledAmount.toFixed(2)),
    });

    debtor.balance -= settledAmount;
    creditor.balance -= settledAmount;

    if (Math.abs(debtor.balance) < 0.01) i++;
    if (Math.abs(creditor.balance) < 0.01) j++;
  }

  return simplified;
}
