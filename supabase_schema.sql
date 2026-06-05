-- Create profiles table
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone,
  PRIMARY KEY (id)
);

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
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
