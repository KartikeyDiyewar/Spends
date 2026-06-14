-- Migration: create_expense_with_splits RPC
-- Replaces the two-step (expense + splits) insert with a single atomic transaction.
-- Both rows are written or neither is — no orphaned expense rows.

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
  -- Validate: amount must be positive
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be greater than 0';
  END IF;

  -- Validate: splits array must not be empty
  IF p_splits IS NULL OR jsonb_array_length(p_splits) = 0 THEN
    RAISE EXCEPTION 'splits array must not be empty';
  END IF;

  -- Validate: caller must be the payer (mirrors the RLS policy explicitly)
  IF p_paid_by IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'paid_by must match the authenticated user';
  END IF;

  -- Validate: sum of splits must equal the expense amount (±0.01 tolerance)
  SELECT COALESCE(SUM((split->>'amount_owed')::numeric), 0)
  INTO v_split_sum
  FROM jsonb_array_elements(p_splits) AS split;

  IF ABS(v_split_sum - p_amount) > 0.01 THEN
    RAISE EXCEPTION 'sum of split amounts (%) does not equal expense amount (%)', v_split_sum, p_amount;
  END IF;

  -- Insert the expense row (RLS: paid_by = auth.uid() enforced above)
  INSERT INTO public.expenses (group_id, paid_by, amount, description)
  VALUES (p_group_id, p_paid_by, p_amount, p_description)
  RETURNING id INTO v_expense_id;

  -- Insert all splits in one statement (atomic with the expense insert above)
  INSERT INTO public.expense_splits (expense_id, user_id, amount_owed)
  SELECT v_expense_id,
         (split->>'user_id')::uuid,
         (split->>'amount_owed')::numeric
  FROM jsonb_array_elements(p_splits) AS split;

  RETURN v_expense_id;
END;
$$;
