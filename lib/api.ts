import { supabase } from './supabase';
import type { Profile, Friend, Group, GroupMember, Expense, ExpenseSplit, Settlement, CreateExpenseWithSplitsParams } from '../types/database';

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

export async function getProfilesByIds(ids: string[]): Promise<Profile[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('id', ids);

  if (error) {
    console.error('getProfilesByIds failed:', error);
    return [];
  }
  return data ?? [];
}

// Option A: email stored in profiles (populated by handle_new_user trigger)
export async function searchProfilesByEmail(email: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  if (error) {
    console.error('searchProfilesByEmail failed:', error);
    return null;
  }
  return data ?? null;
}

export async function updateProfile(userId: string, updates: { full_name?: string }): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('updateProfile failed:', error);
    return false;
  }
  return true;
}

// ---------------------------------------------------------
// FRIENDS
// ---------------------------------------------------------
export async function getFriends(userId: string): Promise<Profile[]> {
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
  return profiles ?? [];
}

export async function sendFriendRequest(fromUserId: string, toUserId: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from('friends')
    .insert([{ user_id_1: fromUserId, user_id_2: toUserId, status: 'pending' }]);
  if (error) console.error('sendFriendRequest failed:', error);
  return { error };
}

export async function getPendingRequests(userId: string): Promise<Array<{ requester: Profile; user_id_1: string; user_id_2: string }>> {
  const { data, error } = await supabase
    .from('friends')
    .select('user_id_1, user_id_2')
    .eq('user_id_2', userId)
    .eq('status', 'pending');

  if (error || !data || data.length === 0) return [];

  const requesterIds = data.map(f => f.user_id_1);
  const profiles = await getProfilesByIds(requesterIds);
  const profileMap = new Map(profiles.map(p => [p.id, p]));

  return data.map(f => ({
    requester: profileMap.get(f.user_id_1)!,
    user_id_1: f.user_id_1,
    user_id_2: f.user_id_2,
  })).filter(r => r.requester != null);
}

export async function acceptFriendRequest(user_id_1: string, user_id_2: string): Promise<boolean> {
  const { error } = await supabase
    .from('friends')
    .update({ status: 'accepted' })
    .eq('user_id_1', user_id_1)
    .eq('user_id_2', user_id_2);

  if (error) {
    console.error('acceptFriendRequest failed:', error);
    return false;
  }
  return true;
}

export async function addFriend(userId1: string, userId2: string) {
  const { error } = await supabase
    .from('friends')
    .insert([{ user_id_1: userId1, user_id_2: userId2, status: 'accepted' }]);
  return error;
}

// ---------------------------------------------------------
// GROUPS
// ---------------------------------------------------------
export async function getGroups(userId: string): Promise<Group[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId);

  if (error || !data || data.length === 0) return [];

  const groupIds = data.map(m => m.group_id);
  const { data: groups, error: groupError } = await supabase
    .from('groups')
    .select('*')
    .in('id', groupIds)
    .order('created_at', { ascending: false });

  if (groupError) {
    console.error('getGroups failed:', groupError);
    return [];
  }
  return groups ?? [];
}

export async function createGroup(name: string, creatorId: string, memberIds: string[]): Promise<Group | null> {
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .insert([{ name, created_by: creatorId }])
    .select()
    .single();

  if (groupError || !group) {
    console.error('createGroup failed:', groupError);
    return null;
  }

  const allMemberIds = Array.from(new Set([creatorId, ...memberIds]));
  const members = allMemberIds.map(uid => ({ group_id: group.id, user_id: uid }));

  const { error: memberError } = await supabase
    .from('group_members')
    .insert(members);

  if (memberError) {
    console.error('createGroup member insert failed:', memberError);
    return null;
  }
  return group;
}

export async function getGroupMembers(groupId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId);

  if (error || !data || data.length === 0) return [];

  return getProfilesByIds(data.map(m => m.user_id));
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
): Promise<{ data: { id: string } | null; error: any }> {
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

export async function getExpenseDetail(expenseId: string): Promise<{
  expense: Expense;
  splits: Array<{ profile: Profile; amount_owed: number }>;
} | null> {
  const { data: expense, error: expError } = await supabase
    .from('expenses')
    .select('*')
    .eq('id', expenseId)
    .single();

  if (expError || !expense) {
    console.error('getExpenseDetail expense failed:', expError);
    return null;
  }

  const { data: splits, error: splitsError } = await supabase
    .from('expense_splits')
    .select('user_id, amount_owed')
    .eq('expense_id', expenseId);

  if (splitsError) {
    console.error('getExpenseDetail splits failed:', splitsError);
    return null;
  }

  const userIds = (splits ?? []).map(s => s.user_id);
  const profiles = await getProfilesByIds(userIds);
  const profileMap = new Map(profiles.map(p => [p.id, p]));

  const enrichedSplits = (splits ?? []).map(s => ({
    profile: profileMap.get(s.user_id) ?? ({ id: s.user_id, full_name: s.user_id, avatar_url: null, updated_at: null } as Profile),
    amount_owed: s.amount_owed,
  }));

  return { expense, splits: enrichedSplits };
}

// ---------------------------------------------------------
// SETTLEMENTS
// ---------------------------------------------------------
export async function createSettlement(
  payerId: string,
  payeeId: string,
  amount: number
): Promise<{ data: Settlement | null; error: any }> {
  const { data, error } = await supabase
    .from('settlements')
    .insert([{ payer_id: payerId, payee_id: payeeId, amount }])
    .select()
    .single();

  if (error) {
    console.error('createSettlement failed:', error);
    return { data: null, error };
  }
  return { data, error: null };
}

// ---------------------------------------------------------
// BALANCES
// ---------------------------------------------------------
export async function getAllDebtsForUser(userId: string) {
  const { data: myExpenses, error: err1 } = await supabase
    .from('expenses')
    .select(`
      id, paid_by, amount, description,
      expense_splits ( user_id, amount_owed )
    `)
    .eq('paid_by', userId);

  const { data: mySplits, error: err2 } = await supabase
    .from('expense_splits')
    .select(`
      user_id, amount_owed,
      expenses ( id, paid_by, amount, description )
    `)
    .eq('user_id', userId);

  const { data: settlements, error: err3 } = await supabase
    .from('settlements')
    .select('payer_id, payee_id, amount')
    .or(`payer_id.eq.${userId},payee_id.eq.${userId}`);

  if (err1 || err2 || err3) {
    console.error('Error fetching debts', err1, err2, err3);
    return [];
  }

  const rawDebts: { debtor: string; creditor: string; amount: number }[] = [];

  myExpenses?.forEach(exp => {
    (exp.expense_splits as any[]).forEach(split => {
      if (split.user_id !== userId && split.amount_owed > 0) {
        rawDebts.push({ debtor: split.user_id, creditor: userId, amount: split.amount_owed });
      }
    });
  });

  mySplits?.forEach(split => {
    const exp = split.expenses as any;
    if (exp && exp.paid_by !== userId && split.amount_owed > 0) {
      rawDebts.push({ debtor: userId, creditor: exp.paid_by, amount: split.amount_owed });
    }
  });

  // Settlements net out debts: payer paid payee, so payee's debt to payer is reduced
  settlements?.forEach(s => {
    if (s.amount > 0) {
      rawDebts.push({ debtor: s.payee_id, creditor: s.payer_id, amount: s.amount });
    }
  });

  return rawDebts;
}

// ---------------------------------------------------------
// ACTIVITY
// ---------------------------------------------------------
export async function getActivityForUser(userId: string) {
  const { data: myExpenses, error: err1 } = await supabase
    .from('expenses')
    .select('id, amount, description, created_at, paid_by')
    .eq('paid_by', userId);

  const { data: mySplits, error: err2 } = await supabase
    .from('expense_splits')
    .select(`expenses ( id, amount, description, created_at, paid_by )`)
    .eq('user_id', userId);

  const { data: settlements, error: err3 } = await supabase
    .from('settlements')
    .select('id, payer_id, payee_id, amount, created_at')
    .or(`payer_id.eq.${userId},payee_id.eq.${userId}`);

  if (err1 || err2) return [];

  const activityMap = new Map<string, any>();

  myExpenses?.forEach(exp => {
    activityMap.set(exp.id, {
      id: exp.id,
      type: 'expense',
      text: `You paid for "${exp.description}"`,
      amount: `$${Number(exp.amount).toFixed(2)}`,
      date: new Date(exp.created_at).toLocaleDateString(),
      timestamp: new Date(exp.created_at).getTime(),
      expenseId: exp.id,
    });
  });

  mySplits?.forEach(split => {
    const exp = split.expenses as any;
    if (exp && exp.paid_by !== userId) {
      activityMap.set(exp.id, {
        id: exp.id,
        type: 'expense',
        text: `Someone added "${exp.description}"`,
        amount: `$${Number(exp.amount).toFixed(2)}`,
        date: new Date(exp.created_at).toLocaleDateString(),
        timestamp: new Date(exp.created_at).getTime(),
        expenseId: exp.id,
      });
    }
  });

  // Collect participant IDs from settlements to resolve names later
  const settlementParticipantIds: string[] = [];
  settlements?.forEach(s => {
    if (s.payer_id !== userId) settlementParticipantIds.push(s.payer_id);
    if (s.payee_id !== userId) settlementParticipantIds.push(s.payee_id);
  });

  const uniqueIds = Array.from(new Set(settlementParticipantIds));
  const profiles = uniqueIds.length > 0 ? await getProfilesByIds(uniqueIds) : [];
  const nameMap = new Map(profiles.map(p => [p.id, p.full_name ?? p.id]));

  settlements?.forEach(s => {
    if (!s) return;
    const isPayer = s.payer_id === userId;
    const otherName = nameMap.get(isPayer ? s.payee_id : s.payer_id) ?? 'someone';
    const text = isPayer
      ? `You paid ${otherName} $${Number(s.amount).toFixed(2)}`
      : `${otherName} paid you $${Number(s.amount).toFixed(2)}`;

    activityMap.set(`settlement-${s.id}`, {
      id: `settlement-${s.id}`,
      type: 'settlement',
      text,
      amount: `$${Number(s.amount).toFixed(2)}`,
      date: new Date(s.created_at).toLocaleDateString(),
      timestamp: new Date(s.created_at).getTime(),
    });
  });

  const activities = Array.from(activityMap.values());
  activities.sort((a, b) => b.timestamp - a.timestamp);
  return activities;
}
