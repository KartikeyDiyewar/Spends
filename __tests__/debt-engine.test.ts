import { simplifyDebts, Debt } from '../lib/debt-engine';

describe('Debt Engine Unit Tests', () => {
  it('Simple debt chain A->B->C simplifies to A->C', () => {
    const input: Debt[] = [
      { debtor: 'A', creditor: 'B', amount: 10 },
      { debtor: 'B', creditor: 'C', amount: 10 },
    ];
    const result = simplifyDebts(input);
    expect(result).toEqual([{ debtor: 'A', creditor: 'C', amount: 10 }]);
  });

  it('Equal opposing debts simplify to empty array', () => {
    const input: Debt[] = [
      { debtor: 'A', creditor: 'B', amount: 10 },
      { debtor: 'B', creditor: 'A', amount: 10 },
    ];
    const result = simplifyDebts(input);
    expect(result).toEqual([]);
  });

  it('Sub-cent net balance (<0.01) simplifies to empty array', () => {
    const input: Debt[] = [
      { debtor: 'A', creditor: 'B', amount: 0.005 },
      { debtor: 'B', creditor: 'A', amount: 0.004 },
    ];
    const result = simplifyDebts(input);
    expect(result).toEqual([]);
  });

  it('Multiple debts and creditors settle correctly', () => {
    const input: Debt[] = [
      { debtor: 'A', creditor: 'B', amount: 50 },
      { debtor: 'A', creditor: 'C', amount: 30 },
      { debtor: 'B', creditor: 'D', amount: 20 },
      { debtor: 'C', creditor: 'D', amount: 10 },
    ];
    const result = simplifyDebts(input);
    const totalDebtorAmount = result.filter((d) => d.debtor === 'A').reduce((acc, d) => acc + d.amount, 0);
    expect(totalDebtorAmount).toEqual(80);
    expect(result.length).toEqual(3);
  });
});
