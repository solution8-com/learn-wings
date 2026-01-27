-- =====================================================
-- SECURITY FIX 1: Invitations table - Remove public exposure
-- Replace the overly permissive "USING (true)" policy with 
-- a restrictive policy that still allows token-based lookups
-- =====================================================

-- Drop the dangerous policy that exposes all invitations
DROP POLICY IF EXISTS "Anyone can read invitation by token for signup" ON public.invitations;

-- Create a helper function for secure invitation lookup
-- This function validates the token server-side and prevents enumeration
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(lookup_token TEXT)
RETURNS SETOF public.invitations
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.invitations
  WHERE token = lookup_token
    AND status = 'pending'
    AND expires_at > NOW()
  LIMIT 1
$$;

-- No public SELECT policy needed - use the RPC function instead
-- Platform admins and org admins can still manage invitations via their existing policies

-- =====================================================
-- SECURITY FIX 2: Storage - Restrict cross-tenant access
-- Replace generic authenticated user policy with course-access validation
-- =====================================================

-- Drop the overly permissive storage policy if it exists
DROP POLICY IF EXISTS "Authenticated users can view assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can view assets for accessible courses" ON storage.objects;

-- Create a security definer function to check if user can access storage path
CREATE OR REPLACE FUNCTION public.can_access_lms_asset(file_path TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_platform_admin() 
    OR EXISTS (
      SELECT 1 
      FROM lessons l
      JOIN course_modules cm ON cm.id = l.module_id
      JOIN courses c ON c.id = cm.course_id
      JOIN org_course_access oca ON oca.course_id = c.id
      WHERE c.is_published = TRUE
        AND oca.org_id IN (SELECT current_org_ids_for_user())
        AND oca.access = 'enabled'
        AND (l.video_storage_path = file_path OR l.document_storage_path = file_path)
    )
$$;

-- Create restrictive storage policy
CREATE POLICY "Users can view assets for their accessible courses"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'lms-assets' AND (
    is_platform_admin() OR
    public.can_access_lms_asset(name)
  )
);

-- =====================================================
-- SECURITY FIX 3: Quiz options - Hide correct answers from learners
-- Create a view that excludes is_correct for non-admins
-- =====================================================

-- Create a secure view for quiz options that hides is_correct
CREATE OR REPLACE VIEW public.quiz_options_public
WITH (security_invoker=on) AS
  SELECT 
    id,
    question_id,
    option_text
    -- is_correct is intentionally excluded for learners
  FROM public.quiz_options;

-- Grant access to authenticated users
GRANT SELECT ON public.quiz_options_public TO authenticated;

-- Create a function that returns options with correct answers only for admins
-- or for checking answers after submission
CREATE OR REPLACE FUNCTION public.get_quiz_options_with_answers(p_question_id UUID)
RETURNS TABLE (
  id UUID,
  question_id UUID,
  option_text TEXT,
  is_correct BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT qo.id, qo.question_id, qo.option_text, qo.is_correct
  FROM public.quiz_options qo
  WHERE qo.question_id = p_question_id
    AND is_platform_admin()
$$;

-- Update the base table policy to deny direct SELECT for non-admins
DROP POLICY IF EXISTS "Users can view options for accessible questions" ON public.quiz_options;

-- Only platform admins can directly query quiz_options (to see is_correct)
CREATE POLICY "Platform admins can view all quiz options"
ON public.quiz_options FOR SELECT
USING (is_platform_admin());

-- Keep the ALL policy for platform admins to manage options
-- (already exists: "Platform admins can do everything with options")