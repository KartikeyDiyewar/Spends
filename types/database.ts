export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
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

export type CreateExpenseWithSplitsParams = {
  p_group_id: string | null;
  p_paid_by: string;
  p_amount: number;
  p_description: string;
  p_splits: Array<{ user_id: string; amount_owed: number }>;
};
