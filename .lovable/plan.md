
# Community Module Implementation Plan

This plan details an end-to-end implementation of the Community feature for AIR Academy Hub, supporting two scopes (Organization and Platform/Global) with Posts and Ideas content types.

## Overview

The Community module will be a new major section of the platform with:
- **Organization Community**: Private space for org members (posts + ideas)
- **Platform Community**: Global space for all authenticated users (posts only in Phase 1)
- Shared UI patterns but separate data isolation via RLS

---

## 1. Database Schema Design

### 1.1 New Tables to Create

#### `community_categories` (replacing empty `idea_categories`)
Stores the 8 required categories with metadata for special handling.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| name | text | Category name |
| slug | text | URL-friendly identifier |
| description | text | Helper text |
| icon | text | Lucide icon name |
| is_restricted | boolean | True for Announcements/Events |
| sort_order | integer | Display order |

Pre-populated with:
1. Ideas / Opportunities
2. Challenges / Obstacles  
3. Risks & Mitigation
4. Questions & Help
5. Wins / Learnings
6. Resources / Templates
7. Announcements (restricted)
8. Events / Office Hours (restricted)

#### `community_posts`
Main table for all community posts (both scopes).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| scope | enum('org', 'global') | Determines visibility |
| org_id | uuid | Required for org scope, null for global |
| user_id | uuid | Author |
| category_id | uuid | FK to community_categories |
| title | text | Post title |
| content | text | Post body (markdown) |
| tags | text[] | Array of tags |
| is_pinned | boolean | Pinned to top of feed |
| is_hidden | boolean | Hidden by moderator |
| is_locked | boolean | Comments disabled |
| event_date | timestamptz | For Events category |
| event_location | text | Physical or virtual location |
| event_registration_url | text | Sign-up link |
| event_recording_url | text | After event ends |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `community_comments`
Comments on posts.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| post_id | uuid | FK to community_posts |
| user_id | uuid | Author |
| org_id | uuid | For RLS (matches parent post scope) |
| content | text | Comment body |
| parent_comment_id | uuid | For threaded replies |
| is_hidden | boolean | Hidden by moderator |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `community_reports`
User-submitted reports for moderation.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| reporter_user_id | uuid | Who reported |
| target_type | enum('post', 'comment') | What was reported |
| target_id | uuid | ID of post or comment |
| org_id | uuid | For org-scope reports, null for global |
| reason | text | Reporter's explanation |
| status | enum('pending', 'reviewed', 'dismissed') | |
| reviewed_by | uuid | Admin who handled |
| reviewed_at | timestamptz | |
| admin_notes | text | Internal notes |
| created_at | timestamptz | |

### 1.2 Modifications to Existing Tables

#### `ideas` table enhancements
Add new columns to support the structured form requirements:

| New Column | Type | Notes |
|------------|------|-------|
| business_area | enum | HR, Finance, Sales, Support, Ops, IT, Legal, Other |
| tags | text[] | Searchable tags |
| current_process | text | "As-is" description |
| pain_points | text | Why it matters |
| affected_roles | text | Who is affected |
| frequency_volume | text | How often/how much |
| proposed_improvement | text | AI improvement idea |
| desired_process | text | "To-be" (optional) |
| data_inputs | text | Data sources (optional) |
| systems_involved | text | Tools used (optional) |
| constraints_risks | text | Limitations (optional) |
| success_metrics | text | Measurement criteria (optional) |
| admin_notes | text | Internal notes (not visible to learners) |
| rejection_reason | text | When rejected |

#### Update `idea_status` enum
Change from current values to:
- draft
- submitted
- in_review
- accepted
- rejected
- in_progress
- done

### 1.3 RLS Policies

**community_posts**:
- Org scope: Only org members can read; org admins or platform admins can write restricted categories
- Global scope: All authenticated users can read; only platform admins can write restricted categories
- Authors can edit/delete own non-restricted posts (unless hidden/locked)

**community_comments**:
- Inherit visibility from parent post
- Authors can edit/delete own comments (unless hidden)

**community_reports**:
- Any authenticated user can create for content they can see
- Org admins see org-scope reports; platform admins see all

**ideas** (update existing):
- Continue org-scoped only
- Authors can edit drafts; after submission, only admins can modify status/admin fields

---

## 2. New Frontend Pages

### 2.1 Community Hub Pages

#### `/app/community` - Community Landing
Tabs or cards linking to:
- Organization Community (if user has org membership)
- Platform Community

#### `/app/community/org` - Org Community Feed
- Post list with category badges, tags, comment count
- Search, category filter, tag filter
- "New Post" button
- "Submit Idea" button (prominent)
- Upcoming Events widget (sidebar or top)
- Announcements highlighted

#### `/app/community/org/posts/:postId` - Post Detail
- Full post content
- Comments thread
- Report button
- Edit/Delete for author
- Hide/Lock for admins

#### `/app/community/org/ideas` - Idea Library
- List of submitted ideas (filterable by status, business area, tags)
- Click to open idea detail

#### `/app/community/org/ideas/:ideaId` - Idea Detail
- Structured display of all idea fields
- Discussion thread (via `idea_comments`)
- Status indicator
- Admin actions (change status, add notes)

#### `/app/community/org/ideas/new` - Submit Idea Form
- Multi-step or single-page structured form
- Helper text and examples for each field
- Save as Draft / Submit buttons

#### `/app/community/global` - Global Community Feed
- Same pattern as org feed but for global scope
- No idea submission (org-only in Phase 1)

#### `/app/community/global/posts/:postId` - Global Post Detail
- Same as org post detail

### 2.2 Admin Pages

#### `/app/admin/org/community` - Org Admin Moderation
- Reports list (pending/reviewed/dismissed tabs)
- Quick actions: View content, Hide, Remove, Lock
- Navigate to reported item

#### `/app/admin/org/ideas` - Org Admin Idea Management
- Dense table/list of all org ideas
- Tabs: Inbox (Submitted/In Review), Backlog (Accepted/In Progress/Done), All
- Quick status change
- Open idea detail
- Add admin notes
- Reject with reason

#### `/app/admin/platform/community` - Platform Admin Moderation
- Global scope reports
- Same functionality as org moderation

---

## 3. Navigation Updates

### Sidebar Changes

**Learner Section** (add):
- "Community" with nested or direct links:
  - Org Community
  - Global Community

**Organization Section** (add for org admins):
- "Moderation" - org community moderation
- "Ideas Overview" - dedicated idea management

**Platform Admin Section** (add):
- "Community Moderation" - global moderation

---

## 4. Component Architecture

### Shared Components (src/components/community/)

```text
components/community/
  ├── PostCard.tsx              # Post preview in feed
  ├── PostDetail.tsx            # Full post view
  ├── PostForm.tsx              # Create/edit post
  ├── CommentThread.tsx         # Comments display + input
  ├── CommentItem.tsx           # Single comment
  ├── CategoryBadge.tsx         # Styled category chip
  ├── TagList.tsx               # Tag display
  ├── EventCard.tsx             # Event post special display
  ├── UpcomingEvents.tsx        # Events widget
  ├── AnnouncementBanner.tsx    # Pinned announcements
  ├── ReportDialog.tsx          # Report content modal
  ├── IdeaCard.tsx              # Idea preview
  ├── IdeaDetail.tsx            # Full idea view
  ├── IdeaForm.tsx              # Structured idea submission
  ├── IdeaStatusBadge.tsx       # Status indicator
  ├── AdminIdeaActions.tsx      # Status change, notes
  ├── ModerationCard.tsx        # Report item in admin view
  └── CommunityEmptyState.tsx   # Empty state variants
```

---

## 5. Type Definitions

Add to `src/lib/types.ts`:

```typescript
// Community types
export type CommunityScope = 'org' | 'global';
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed';
export type ReportTargetType = 'post' | 'comment';
export type IdeaStatus = 'draft' | 'submitted' | 'in_review' | 'accepted' | 'rejected' | 'in_progress' | 'done';
export type BusinessArea = 'hr' | 'finance' | 'sales' | 'support' | 'ops' | 'it' | 'legal' | 'other';

export interface CommunityCategory { ... }
export interface CommunityPost { ... }
export interface CommunityComment { ... }
export interface CommunityReport { ... }
export interface Idea { ... } // Enhanced with new fields
```

---

## 6. Feature Toggle

Add `community_enabled: boolean` to platform features settings so it can be disabled if needed.

---

## 7. Implementation Order

### Phase A: Foundation (Database + Types)
1. Create migration for new tables and enum types
2. Insert default categories
3. Update `ideas` table with new columns
4. Create RLS policies for all new tables
5. Add TypeScript types

### Phase B: Core UI
1. Create shared community components
2. Implement org community feed page
3. Implement post detail page
4. Implement comments system
5. Add navigation entries

### Phase C: Ideas Module
1. Idea submission form
2. Idea library page
3. Idea detail page
4. Org admin idea management page

### Phase D: Global Community
1. Global community feed
2. Global post detail
3. Platform admin access

### Phase E: Moderation
1. Report functionality
2. Org admin moderation page
3. Platform admin moderation page
4. Hide/Lock/Remove actions

### Phase F: Events & Announcements
1. Event post form with metadata
2. Upcoming events widget
3. Announcement highlighting

---

## 8. Key Technical Decisions

### Scope Isolation
- Org community: `scope = 'org'` AND `org_id = current_org`
- Global community: `scope = 'global'` (org_id is null)
- RLS ensures no cross-org data leakage

### Categories
- Single table shared across scopes
- `is_restricted` flag controls who can post (admins only for Announcements/Events)

### Ideas vs Posts
- Ideas remain in `ideas` table (org-scoped only)
- Ideas linked to org community but have their own distinct UI/flow
- Posts handle all other content types including org discussions

### Comments Architecture
- Use existing `idea_comments` for ideas
- New `community_comments` for posts
- Same threaded reply pattern

### Moderation Flow
1. User clicks "Report" on post/comment
2. Report stored with pending status
3. Admin sees in moderation queue
4. Admin can: dismiss, hide content, lock thread, add notes
5. Report marked reviewed

---

## 9. Testing Checklist

After implementation, verify these scenarios:

**Org Member (Learner)**:
- Can view org community feed
- Can create posts in non-restricted categories
- Cannot create Announcements or Events
- Can comment on posts
- Can report content
- Can submit ideas (save draft, submit)
- Can view idea library
- Can view global community
- Cannot see other orgs' content

**Org Admin**:
- All learner capabilities plus:
- Can create Announcements/Events in org scope
- Can access moderation page
- Can hide/lock posts and comments
- Can access idea management
- Can change idea status
- Can add admin notes to ideas
- Can reject ideas with reason

**Platform Admin**:
- Can create Announcements/Events in global scope
- Can moderate global community
- Can view all org ideas (if viewing as org admin)
- Cannot access org-specific content without switching view mode

---

## 10. Files to Create/Modify

### New Files (~25-30 files):
- 1 database migration
- 15+ component files in `src/components/community/`
- 8+ page files in `src/pages/community/`
- 2 admin pages for moderation

### Modified Files:
- `src/lib/types.ts` - Add community types
- `src/components/layout/AppSidebar.tsx` - Add nav items
- `src/App.tsx` - Add routes
- `src/hooks/usePlatformSettings.tsx` - Add community toggle
- `src/pages/platform-admin/PlatformSettings.tsx` - Add toggle UI
