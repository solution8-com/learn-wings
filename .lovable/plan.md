
# Plan: Add Profile Editing at All Levels

## Overview
Enhance the existing Settings page to provide comprehensive profile editing capabilities for all user roles (learners, org admins, and platform admins). This includes updating display name and changing password with proper validation.

## Current State Analysis

### What Already Exists
- **Settings page** (`src/pages/Settings.tsx`): Basic profile name editing with a simple form
- **Route**: `/app/settings` is already configured and protected
- **Sidebar access**: Settings is accessible from the user dropdown menu in the sidebar
- **Auth hook**: `useAuth()` provides `profile`, `user`, and `refreshUserContext()`

### What's Missing
- Password change functionality
- Email display (read-only, for user reference)
- Form validation with Zod
- Better UX with separate sections for profile and security
- Proper loading states and confirmation feedback

## Implementation Steps

### Step 1: Enhance Settings.tsx
Expand the current Settings page with:

1. **Profile Section** (existing, enhanced)
   - Full name input with validation
   - Email display (read-only)
   - Save button with loading state

2. **Security Section** (new)
   - Current password verification (optional, Supabase doesn't require it for logged-in users)
   - New password input with validation (min 6 chars)
   - Confirm password input
   - Change password button with loading state

3. **Account Information Section** (new, read-only)
   - Account created date
   - Current role/organization info
   - Member since date

## UI/UX Design

```text
+------------------------------------------+
| Settings                                  |
+------------------------------------------+

+------------------------------------------+
| Profile                                   |
| Update your personal information.         |
+------------------------------------------+
| Email                                     |
| [user@example.com]  (read-only, dimmed)  |
|                                          |
| Full Name                                |
| [John Doe                    ]           |
|                                          |
| [Save Changes]                           |
+------------------------------------------+

+------------------------------------------+
| Security                                  |
| Change your password.                     |
+------------------------------------------+
| New Password                             |
| [••••••••                    ]           |
| Must be at least 6 characters            |
|                                          |
| Confirm Password                         |
| [••••••••                    ]           |
|                                          |
| [Update Password]                        |
+------------------------------------------+

+------------------------------------------+
| Account Information                       |
+------------------------------------------+
| Account created: Jan 15, 2026            |
| Role: Learner at Acme Corp               |
+------------------------------------------+
```

## Technical Details

### Files to Modify

**1. `src/pages/Settings.tsx`**
- Add password change section with new/confirm password fields
- Add email display (read-only)
- Add account information section
- Implement Zod validation for both profile and password forms
- Use `supabase.auth.updateUser({ password })` for password changes
- Add proper error handling and success feedback

### Password Change Implementation

```typescript
import { z } from 'zod';

const passwordSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const handlePasswordChange = async () => {
  setPasswordSaving(true);
  
  const { error } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (error) {
    toast({
      title: 'Failed to update password',
      description: error.message,
      variant: 'destructive',
    });
  } else {
    toast({
      title: 'Password updated',
      description: 'Your password has been changed successfully.',
    });
    // Clear password fields
    setNewPassword('');
    setConfirmPassword('');
  }
  setPasswordSaving(false);
};
```

### Profile Update Implementation

```typescript
const profileSchema = z.object({
  fullName: z.string().trim().min(1, 'Name is required').max(100, 'Name is too long'),
});

const handleProfileSave = async () => {
  const result = profileSchema.safeParse({ fullName });
  if (!result.success) {
    // Handle validation errors
    return;
  }

  setSaving(true);
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', profile.id);

  if (error) {
    toast({ title: 'Failed to update profile', variant: 'destructive' });
  } else {
    toast({ title: 'Profile updated' });
    await refreshUserContext();
  }
  setSaving(false);
};
```

### Component Structure

```typescript
// State variables
const [fullName, setFullName] = useState(profile?.full_name || '');
const [saving, setSaving] = useState(false);
const [profileErrors, setProfileErrors] = useState<{ fullName?: string }>({});

// Password state
const [newPassword, setNewPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
const [passwordSaving, setPasswordSaving] = useState(false);
const [passwordErrors, setPasswordErrors] = useState<{ 
  newPassword?: string; 
  confirmPassword?: string 
}>({});
```

### UI Components Used
- `Card`, `CardHeader`, `CardContent`, `CardTitle`, `CardDescription`
- `Input` for text and password fields
- `Label` for field labels
- `Button` with loading states
- `Separator` between sections
- Icons: `Loader2`, `User`, `Lock`, `Mail`, `Calendar`

## Security Considerations
- Password change uses Supabase's built-in `auth.updateUser()` which requires an active session
- Email is displayed but not editable (would require email verification flow)
- Input validation with Zod prevents injection attacks
- No sensitive data exposed in error messages

## Accessibility
- Proper labels for all form fields
- Password fields use `type="password"`
- Loading states communicated via button text and icons
- Error messages associated with form fields

## Role-Specific Considerations
All user roles (learner, org_admin, platform_admin) access the same Settings page with identical functionality. The account information section will display role-specific information:
- **Learner**: Shows organization membership
- **Org Admin**: Shows organization admin status
- **Platform Admin**: Shows platform admin badge

## Testing Recommendations
After implementation:
1. Log in as each role type (learner, org admin, platform admin)
2. Test updating display name with valid/invalid inputs
3. Test password change with matching/non-matching passwords
4. Test password validation (min 6 characters)
5. Verify toast notifications appear on success/failure
6. Verify name updates are reflected in sidebar immediately
7. Verify password change allows re-login with new password
