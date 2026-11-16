-- Fix get_user_role() function to be SECURITY DEFINER
-- This prevents circular dependency in RLS policies

-- Drop existing function (CASCADE to drop dependent policies)
DROP FUNCTION IF EXISTS get_user_role(UUID) CASCADE;

-- Recreate with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.users WHERE id = user_id;
  RETURN user_role;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role(UUID) TO anon;

COMMENT ON FUNCTION get_user_role(UUID) IS 'Gets user role bypassing RLS to prevent circular dependencies. SECURITY DEFINER with fixed search_path for security.';

-- Recreate the policies that were dropped by CASCADE
DROP POLICY IF EXISTS admins_view_all_users_optimized ON users;
CREATE POLICY admins_view_all_users_optimized ON users
  FOR SELECT
  TO public
  USING (get_user_role(auth.uid()) = 'admin');

DROP POLICY IF EXISTS admins_update_users_optimized ON users;
CREATE POLICY admins_update_users_optimized ON users
  FOR UPDATE
  TO public
  USING (get_user_role(auth.uid()) = 'admin')
  WITH CHECK (get_user_role(auth.uid()) = 'admin');
