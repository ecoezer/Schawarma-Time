-- =============================================
-- SMASH47 — RLS Helper Functions Fix
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Define has_role function (missing in original schema)
CREATE OR REPLACE FUNCTION public.has_role(target_roles text[])
RETURNS boolean AS $$
BEGIN
  -- If not logged in, return false
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = ANY(target_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Define is_admin function (optional but useful)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN public.has_role(ARRAY['manager', 'cashier']);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure your current user has the 'manager' role to see customers
-- Replace 'YOUR_USER_ID' with your actual Supabase auth UID if needed
-- UPDATE profiles SET role = 'manager' WHERE id = '...';

-- 4. Re-apply the profiles policy just in case
DROP POLICY IF EXISTS "Managers read all profiles" ON public.profiles;
CREATE POLICY "Managers read all profiles" ON public.profiles FOR SELECT
  USING (public.has_role(ARRAY['manager']));
