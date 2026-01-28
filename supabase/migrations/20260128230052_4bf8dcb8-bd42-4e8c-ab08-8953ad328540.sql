-- Add first_name, last_name, and department columns to invitations table
ALTER TABLE public.invitations 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS department text;

-- Update the accept_invitation function to copy these fields to the profile
CREATE OR REPLACE FUNCTION public.accept_invitation(p_invitation_link_id text, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invitation RECORD;
  v_result jsonb;
BEGIN
  -- Get the invitation
  SELECT * INTO v_invitation
  FROM invitations
  WHERE link_id = p_invitation_link_id
    AND status = 'pending'
    AND expires_at > NOW();
  
  IF v_invitation IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;
  
  -- Update profile with invitation metadata (first_name, last_name, department)
  IF v_invitation.first_name IS NOT NULL OR v_invitation.last_name IS NOT NULL OR v_invitation.department IS NOT NULL THEN
    UPDATE profiles
    SET 
      first_name = COALESCE(v_invitation.first_name, first_name),
      last_name = COALESCE(v_invitation.last_name, last_name),
      department = COALESCE(v_invitation.department, department),
      full_name = CASE 
        WHEN v_invitation.first_name IS NOT NULL AND v_invitation.last_name IS NOT NULL 
        THEN v_invitation.first_name || ' ' || v_invitation.last_name
        WHEN v_invitation.first_name IS NOT NULL 
        THEN v_invitation.first_name
        ELSE full_name
      END
    WHERE id = p_user_id;
  END IF;
  
  -- Handle platform admin invite
  IF v_invitation.is_platform_admin_invite THEN
    UPDATE profiles
    SET is_platform_admin = true
    WHERE id = p_user_id;
  -- Handle org invite
  ELSIF v_invitation.org_id IS NOT NULL THEN
    -- Check if membership already exists
    IF NOT EXISTS (
      SELECT 1 FROM org_memberships
      WHERE org_id = v_invitation.org_id AND user_id = p_user_id
    ) THEN
      -- Insert membership with the role from the invitation
      INSERT INTO org_memberships (org_id, user_id, role, status)
      VALUES (v_invitation.org_id, p_user_id, v_invitation.role, 'active');
    END IF;
  END IF;
  
  -- Mark invitation as accepted
  UPDATE invitations
  SET status = 'accepted'
  WHERE id = v_invitation.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'is_platform_admin', v_invitation.is_platform_admin_invite,
    'org_id', v_invitation.org_id,
    'role', v_invitation.role
  );
END;
$function$;