-- Fix 1: Create safe RPC function for platform admins to query invitations
-- This prevents exposing token and token_hash to client-side code

CREATE OR REPLACE FUNCTION public.get_platform_invitations_safe(p_org_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  email TEXT,
  org_id UUID,
  role org_role,
  status invitation_status,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  link_id TEXT,
  is_platform_admin_invite BOOLEAN,
  invited_by_user_id UUID
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    i.id,
    i.email,
    i.org_id,
    i.role,
    i.status,
    i.expires_at,
    i.created_at,
    i.link_id,
    i.is_platform_admin_invite,
    i.invited_by_user_id
  FROM invitations i
  WHERE is_platform_admin()
    AND (p_org_id IS NULL OR i.org_id = p_org_id)
  ORDER BY i.created_at DESC;
$$;

-- Fix 2: Drop the unsafe invitations_safe view
-- This view cannot have RLS enabled (PostgreSQL limitation) and is accessible to all authenticated users
-- The application uses secure RPC functions instead, so this view is unused and poses a security risk
DROP VIEW IF EXISTS public.invitations_safe;