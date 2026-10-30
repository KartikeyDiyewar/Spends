import { simplifyDebts, Debt } from '../lib/debt-engine';

function assertEqual<T>(actual: T, expected: T, message: string) {
  const aStr = JSON.stringify(actual);
  const eStr = JSON.stringify(expected);
  if (aStr !== eStr) {
    console.error(`❌ FAILED: ${message}`);
    console.error(`   Actual:   ${aStr}`);
    console.error(`   Expected: ${eStr}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

function testSimpleChain() {
  const input: Debt[] = [
    { debtor: 'A', creditor: 'B', amount: 10 },
    { debtor: 'B', creditor: 'C', amount: 10 },
  ];
  const result = simplifyDebts(input);
  assertEqual(result, [{ debtor: 'A', creditor: 'C', amount: 10 }], 'Simple debt chain A->B->C simplifies to A->C');
}

function testZeroBalance() {
  const input: Debt[] = [
    { debtor: 'A', creditor: 'B', amount: 10 },
    { debtor: 'B', creditor: 'A', amount: 10 },
  ];
  const result = simplifyDebts(input);
  assertEqual(result, [], 'Equal opposing debts simplify to empty array');
}

function testFloatingPointPrecision() {
  const input: Debt[] = [
    { debtor: 'A', creditor: 'B', amount: 0.005 },
    { debtor: 'B', creditor: 'A', amount: 0.004 },
  ];
  const result = simplifyDebts(input);
  assertEqual(result, [], 'Sub-cent net balance (<0.01) simplifies to empty array');
}

function testMultipleDebtsAndCreditors() {
  const input: Debt[] = [
    { debtor: 'A', creditor: 'B', amount: 50 },
    { debtor: 'A', creditor: 'C', amount: 30 },
    { debtor: 'B', creditor: 'D', amount: 20 },
    { debtor: 'C', creditor: 'D', amount: 10 },
  ];
  // Balances:
  // A: -80
  // B: +50 - 20 = +30
  // C: +30 - 10 = +20
  // D: +30
  const result = simplifyDebts(input);
  const totalDebtorAmount = result.filter((d) => d.debtor === 'A').reduce((acc, d) => acc + d.amount, 0);
  assertEqual(totalDebtorAmount, 80, 'Debtor A settles total of 80');
  assertEqual(result.length, 3, 'Result has 3 transactions for 3 creditors');
}

function testEmptyTransactions() {
  const input: Debt[] = [];
  const result = simplifyDebts(input);
  assertEqual(result, [], 'Empty array of debts simplifies to empty array');
}

function testSingleTransaction() {
  const input: Debt[] = [
    { debtor: 'A', creditor: 'B', amount: 15 },
  ];
  const result = simplifyDebts(input);
  assertEqual(result, [{ debtor: 'A', creditor: 'B', amount: 15 }], 'Single transaction remains unchanged');
}

function testMultipleSamePair() {
  const input: Debt[] = [
    { debtor: 'A', creditor: 'B', amount: 10 },
    { debtor: 'A', creditor: 'B', amount: 20 },
  ];
  const result = simplifyDebts(input);
  assertEqual(result, [{ debtor: 'A', creditor: 'B', amount: 30 }], 'Multiple debts between same pair are summed up');
}

function testDebtCycle() {
  const input: Debt[] = [
    { debtor: 'A', creditor: 'B', amount: 10 },
    { debtor: 'B', creditor: 'C', amount: 10 },
    { debtor: 'C', creditor: 'A', amount: 10 },
  ];
  const result = simplifyDebts(input);
  assertEqual(result, [], 'Circular debt chain simplifies to empty array');
}

function testDisjointGroups() {
  const input: Debt[] = [
    { debtor: 'A', creditor: 'B', amount: 10 },
    { debtor: 'B', creditor: 'C', amount: 10 },
    { debtor: 'X', creditor: 'Y', amount: 20 },
    { debtor: 'Y', creditor: 'Z', amount: 20 },
  ];
  const result = simplifyDebts(input);
  // Expect A->C 10 and X->Z 20
  // Note: result order is determined by sorting, so we need to be careful with exact match.
  // debtors: X (20), A (10)
  // creditors: Z (20), C (10)
  // Result should be: X->Z 20, A->C 10
  const expected = [
    { debtor: 'X', creditor: 'Z', amount: 20 },
    { debtor: 'A', creditor: 'C', amount: 10 },
  ];
  assertEqual(result, expected, 'Disjoint debt groups simplify correctly');
}

function runTests() {
  console.log('--- Running Debt Engine Unit Tests ---');
  testSimpleChain();
  testZeroBalance();
  testFloatingPointPrecision();
  testMultipleDebtsAndCreditors();
  testEmptyTransactions();
  testSingleTransaction();
  testMultipleSamePair();
  testDebtCycle();
  testDisjointGroups();
  console.log('All unit tests passed successfully!\n');
}

runTests();
