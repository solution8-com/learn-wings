

# Email Notifications for Invitations using Resend

## Prerequisites (Your Action Required)

### Step 1: Create Resend Account
1. Go to **https://resend.com** and sign up for a free account

### Step 2: Verify Your Domain
1. Navigate to **https://resend.com/domains**
2. Click **"Add Domain"**
3. Enter: `ai-uddannelse.dk`
4. Resend will show you DNS records to add. You'll need to add these in your GoDaddy DNS settings:
   - **SPF record** (TXT record)
   - **DKIM record** (TXT record) 
   - **DMARC record** (TXT record - optional but recommended)
5. Wait for verification (usually 5-30 minutes)

### Step 3: Create API Key
1. Go to **https://resend.com/api-keys**
2. Click **"Create API Key"**
3. Name it: `lovable-invitations`
4. Copy the key immediately (you'll only see it once)

### Step 4: Provide the API Key
When you approve this plan, I'll prompt you to securely input the `RESEND_API_KEY`

---

## Implementation Overview

### What Gets Built

1. **Edge Function**: `send-invitation-email` - Sends professional HTML invitation emails
2. **Integration**: All 3 invitation creation points will trigger emails automatically

### Email Template Features
- Professional HTML design with platform branding
- Dynamic content based on invitation type (Org invite vs Platform Admin invite)
- Clear call-to-action button with the signup link
- Role identification (Learner, Admin, Platform Admin)
- 7-day expiration notice

---

## Technical Details

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/send-invitation-email/index.ts` | **New** - Edge function for sending emails |
| `supabase/config.toml` | **Modified** - Register new function |
| `src/components/org-admin/BulkInviteDialog.tsx` | **Modified** - Trigger email after bulk invite |
| `src/pages/platform-admin/UsersManager.tsx` | **Modified** - Trigger email for platform admin invites |
| `src/pages/platform-admin/OrganizationsManager.tsx` | **Modified** - Trigger email when creating org with initial admin |

### Edge Function Request Format
```typescript
{
  email: string;           // Recipient email address
  orgName: string | null;  // Organization name (null for platform admin invites)
  role: string;            // 'learner' | 'org_admin' | 'platform_admin'
  inviteLink: string;      // Full signup URL (e.g., https://ai-uddannelse.dk/signup?invite=abc123)
}
```

### Email Sender
- **From**: `AIR Academy <no-reply@ai-uddannelse.dk>`
- **Subject**: "You've been invited to join [Organization] on AIR Academy" (or "You've been invited as a Platform Administrator")

### Error Handling
- If email sending fails, the invitation is still created (email is an enhancement)
- Toast notification indicates whether email was sent successfully
- Errors are logged for debugging

---

## Flow Diagram

```text
User creates invitation
        ↓
Invitation inserted in database
        ↓
Retrieve link_id from database
        ↓
Call send-invitation-email edge function
        ↓
Resend API sends email from no-reply@ai-uddannelse.dk
        ↓
Show success/error toast to admin
```

---

## Next Steps After Approval

1. You'll be prompted to enter the `RESEND_API_KEY`
2. I'll create the edge function and update the invitation components
3. Test by creating an invitation from any of the 3 entry points

