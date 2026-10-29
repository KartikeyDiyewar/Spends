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

function runTests() {
  console.log('--- Running Debt Engine Unit Tests ---');
  testSimpleChain();
  testZeroBalance();
  testFloatingPointPrecision();
  testMultipleDebtsAndCreditors();
  console.log('All unit tests passed successfully!\n');
}

runTests();
