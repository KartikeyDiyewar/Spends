-- Create profiles table
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE,
  full_name text,
  email text,
  avatar_url text,
  updated_at timestamp with time zone,
  PRIMARY KEY (id)
);

-- Index for email lookup (used by searchProfilesByEmail)
CREATE UNIQUE INDEX profiles_email_idx ON public.profiles (email);

-- Set up Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile." ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile." ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create friends table
CREATE TABLE public.friends (
  user_id_1 uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id_2 uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text CHECK (status IN ('pending', 'accepted')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (user_id_1, user_id_2)
);

ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friendships." ON public.friends
  FOR SELECT USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

CREATE POLICY "Users can insert friendships." ON public.friends
  FOR INSERT WITH CHECK (auth.uid() = user_id_1);

-- Create groups table
CREATE TABLE public.groups (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Create group_members table
CREATE TABLE public.group_members (
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (group_id, user_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Groups RLS (Users can view groups they are members of)
CREATE POLICY "Users can view groups they belong to." ON public.groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members WHERE group_id = groups.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create groups." ON public.groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Group Members RLS
CREATE POLICY "Users can view members of their groups." ON public.group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Group creators can add members." ON public.group_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.groups WHERE id = group_members.group_id AND created_by = auth.uid()
    )
  );

-- Create expenses table
CREATE TABLE public.expenses (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE, -- Nullable if it's a non-group expense
  paid_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  description text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create expense_splits table
CREATE TABLE public.expense_splits (
  expense_id uuid REFERENCES public.expenses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_owed numeric NOT NULL,
  PRIMARY KEY (expense_id, user_id)
);

ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;

-- Expenses RLS (Users can view expenses if they are involved in it or in the same group)
CREATE POLICY "Users can view relevant expenses." ON public.expenses
  FOR SELECT USING (
    paid_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.expense_splits WHERE expense_id = expenses.id AND user_id = auth.uid()
    ) OR
    (group_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.group_members WHERE group_id = expenses.group_id AND user_id = auth.uid()
    ))
  );

CREATE POLICY "Users can create expenses." ON public.expenses
  FOR INSERT WITH CHECK (auth.uid() = paid_by);

-- Expense splits RLS
CREATE POLICY "Users can view relevant splits." ON public.expense_splits
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.expenses WHERE id = expense_splits.expense_id AND paid_by = auth.uid()
    )
  );

CREATE POLICY "Users can create splits for their expenses." ON public.expense_splits
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.expenses WHERE id = expense_splits.expense_id AND paid_by = auth.uid()
    )
  );

-- Create settlements table
CREATE TABLE public.settlements (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  payer_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  payee_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their settlements." ON public.settlements
  FOR SELECT USING (auth.uid() = payer_id OR auth.uid() = payee_id);

CREATE POLICY "Users can insert settlements." ON public.settlements
  FOR INSERT WITH CHECK (auth.uid() = payer_id);

-- Trigger to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- RPC: create_expense_with_splits
-- Inserts an expense and all its splits atomically inside a single transaction.
-- Validates: amount > 0, splits non-empty, split sum == amount (±0.01).
-- SECURITY INVOKER so the caller's RLS policies on expenses/expense_splits still apply.
CREATE OR REPLACE FUNCTION public.create_expense_with_splits(
  p_group_id    uuid    DEFAULT NULL,
  p_paid_by     uuid,
  p_amount      numeric,
  p_description text,
  p_splits      jsonb   -- [{user_id: uuid, amount_owed: numeric}, ...]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_expense_id uuid;
  v_split_sum  numeric;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be greater than 0';
  END IF;

  IF p_splits IS NULL OR jsonb_array_length(p_splits) = 0 THEN
    RAISE EXCEPTION 'splits array must not be empty';
  END IF;

  IF p_paid_by IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'paid_by must match the authenticated user';
  END IF;

  SELECT COALESCE(SUM((split->>'amount_owed')::numeric), 0)
  INTO v_split_sum
  FROM jsonb_array_elements(p_splits) AS split;

  IF ABS(v_split_sum - p_amount) > 0.01 THEN
    RAISE EXCEPTION 'sum of split amounts (%) does not equal expense amount (%)', v_split_sum, p_amount;
  END IF;

  INSERT INTO public.expenses (group_id, paid_by, amount, description)
  VALUES (p_group_id, p_paid_by, p_amount, p_description)
  RETURNING id INTO v_expense_id;

  INSERT INTO public.expense_splits (expense_id, user_id, amount_owed)
  SELECT v_expense_id,
         (split->>'user_id')::uuid,
         (split->>'amount_owed')::numeric
  FROM jsonb_array_elements(p_splits) AS split;

  RETURN v_expense_id;
END;
$$;
