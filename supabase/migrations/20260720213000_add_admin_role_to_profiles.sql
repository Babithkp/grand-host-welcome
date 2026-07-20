-- Add role for admin access control
ALTER TABLE public.profiles
  ADD COLUMN role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));

-- SECURITY DEFINER helper avoids recursive RLS evaluation when a policy
-- on profiles needs to check the *current user's own* role.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Admins can read every profile row; the existing "Own profile select"
-- policy (auth.uid() = id) still applies for everyone else.
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT
  USING (public.is_admin());
