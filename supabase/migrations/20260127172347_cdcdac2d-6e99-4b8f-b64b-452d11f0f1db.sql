-- Allow org_id to be nullable for platform admin invites
ALTER TABLE public.invitations ALTER COLUMN org_id DROP NOT NULL;

-- Add column to track if this is a platform admin invite
ALTER TABLE public.invitations ADD COLUMN is_platform_admin_invite boolean NOT NULL DEFAULT false;

-- Add check constraint: either org_id is set (for org invites) or is_platform_admin_invite is true
ALTER TABLE public.invitations ADD CONSTRAINT invitations_org_or_platform_admin_check 
  CHECK (org_id IS NOT NULL OR is_platform_admin_invite = true);

-- Update RLS policy to allow platform admins to view all invitations
DROP POLICY IF EXISTS "Anyone can read invitation by token for signup" ON public.invitations;
CREATE POLICY "Anyone can read invitation by token for signup" 
  ON public.invitations 
  FOR SELECT 
  USING (true);