import { supabase } from './supabase';
import type { Profile, Friend, Expense, ExpenseSplit, Settlement, CreateExpenseWithSplitsParams } from '../types/database';

// ---------------------------------------------------------
// PROFILES
// ---------------------------------------------------------
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  return data;
}

export async function searchProfilesByEmail(email: string): Promise<Profile | null> {
  // Assuming email is stored in profiles or we use an RPC. Wait, our schema doesn't have email in profiles directly.
  // Actually, we can fetch all users or use an edge function. For now, let's just return a mock or update the schema if needed.
  return null;
}

// ---------------------------------------------------------
// FRIENDS
// ---------------------------------------------------------
export async function getFriends(userId: string): Promise<Profile[]> {
  // Fetch where user_id_1 = userId OR user_id_2 = userId
  const { data, error } = await supabase
    .from('friends')
    .select('user_id_1, user_id_2, status')
    .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
    .eq('status', 'accepted');

  if (error || !data) return [];

  const friendIds = data.map(f => f.user_id_1 === userId ? f.user_id_2 : f.user_id_1);
  
  if (friendIds.length === 0) return [];

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .in('id', friendIds);

  if (profileError) return [];
  return profiles;
}

export async function addFriend(userId1: string, userId2: string) {
  const { error } = await supabase
    .from('friends')
    .insert([
      { user_id_1: userId1, user_id_2: userId2, status: 'accepted' }
    ]);
  return error;
}

// ---------------------------------------------------------
// EXPENSES
// ---------------------------------------------------------
export async function addExpense(
  paidBy: string,
  amount: number,
  description: string,
  splits: Omit<ExpenseSplit, 'expense_id'>[],
  groupId?: string | null
): Promise<{ data: { id: string } | null; error: Error | null }> {
  const params: CreateExpenseWithSplitsParams = {
    p_group_id: groupId ?? null,
    p_paid_by: paidBy,
    p_amount: amount,
    p_description: description,
    p_splits: splits.map(s => ({ user_id: s.user_id, amount_owed: s.amount_owed })),
  };

  const { data, error } = await supabase.rpc('create_expense_with_splits', params);

  if (error) {
    console.error('addExpense RPC failed:', error);
    return { data: null, error };
  }

  return { data: { id: data as string }, error: null };
}

// ---------------------------------------------------------
// BALANCES & SETTLEMENTS
// ---------------------------------------------------------

export async function getAllDebtsForUser(userId: string) {
  // 1. Get all expenses I paid for, and their splits (people who owe me)
  const { data: myExpenses, error: err1 } = await supabase
    .from('expenses')
    .select(`
      id, paid_by, amount, description,
      expense_splits ( user_id, amount_owed )
    `)
    .eq('paid_by', userId);

  // 2. Get all splits where I owe someone else
  const { data: mySplits, error: err2 } = await supabase
    .from('expense_splits')
    .select(`
      user_id, amount_owed,
      expenses ( id, paid_by, amount, description )
    `)
    .eq('user_id', userId);

  if (err1 || err2) {
    console.error('Error fetching debts', err1, err2);
    return [];
  }

  const rawDebts: { debtor: string, creditor: string, amount: number }[] = [];

  // Add debts where people owe me
  myExpenses?.forEach(exp => {
    exp.expense_splits.forEach((split: any) => {
      if (split.user_id !== userId && split.amount_owed > 0) {
        rawDebts.push({
          debtor: split.user_id,
          creditor: userId,
          amount: split.amount_owed
        });
      }
    });
  });

  // Add debts where I owe people
  mySplits?.forEach(split => {
    const exp = split.expenses as any;
    if (exp && exp.paid_by !== userId && split.amount_owed > 0) {
      rawDebts.push({
        debtor: userId,
        creditor: exp.paid_by,
        amount: split.amount_owed
      });
    }
  });

  return rawDebts;
}

// ---------------------------------------------------------
// ACTIVITY
// ---------------------------------------------------------
export async function getActivityForUser(userId: string) {
  // First, expenses paid by user
  const { data: myExpenses, error: err1 } = await supabase
    .from('expenses')
    .select('id, amount, description, created_at, paid_by')
    .eq('paid_by', userId);

  // Then, expenses split with user
  const { data: mySplits, error: err2 } = await supabase
    .from('expense_splits')
    .select(`
      expenses ( id, amount, description, created_at, paid_by )
    `)
    .eq('user_id', userId);

  if (err1 || err2) return [];

  const activityMap = new Map();
  
  myExpenses?.forEach(exp => {
    activityMap.set(exp.id, {
      id: exp.id,
      type: 'expense',
      text: `You paid for "${exp.description}"`,
      amount: `$${exp.amount.toFixed(2)}`,
      date: new Date(exp.created_at).toLocaleDateString(),
      timestamp: new Date(exp.created_at).getTime()
    });
  });

  mySplits?.forEach(split => {
    const exp = split.expenses as any;
    if (exp && exp.paid_by !== userId) {
      activityMap.set(exp.id, {
        id: exp.id,
        type: 'expense',
        text: `Someone added "${exp.description}"`,
        amount: `$${exp.amount.toFixed(2)}`,
        date: new Date(exp.created_at).toLocaleDateString(),
        timestamp: new Date(exp.created_at).getTime()
      });
    }
  });

  const activities = Array.from(activityMap.values());
  activities.sort((a, b) => b.timestamp - a.timestamp); // newest first
  return activities;
}
