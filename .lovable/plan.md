

# Ideas Hub, AI Brainstorming & Community Platform

## Overview

This plan extends AIR Academy with a comprehensive innovation management system that enables learners to develop process optimization ideas with AI assistance, submit them for organizational review, and engage in community discussions at both organizational and platform-wide levels.

---

## Architecture Summary

```text
+------------------+     +------------------+     +------------------+
|   LEARNER VIEW   |     | ORG ADMIN VIEW   |     | PLATFORM ADMIN   |
+------------------+     +------------------+     +------------------+
| - AI Brainstorm  |     | - Ideas Backlog  |     | - Community Mod  |
| - My Ideas       |     | - Evaluation     |     | - Global Ideas   |
| - Idea Library   |     | - Specifications |     | - Analytics      |
| - Org Community  |     | - Org Community  |     +------------------+
| - Global Community|    +------------------+
+------------------+
```

---

## Phase 1: Ideas Management Core

### 1.1 Database Schema

**New Tables:**

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `ideas` | Core idea records | id, org_id, user_id, title, description, problem_statement, proposed_solution, expected_impact, status, category_id |
| `idea_categories` | Taxonomy | id, name, description, parent_id (for hierarchy) |
| `idea_comments` | Discussion threads | id, idea_id, user_id, org_id, content, parent_comment_id |
| `idea_votes` | Interest tracking | id, idea_id, user_id, org_id |
| `idea_evaluations` | Org admin assessments | id, idea_id, evaluated_by, value_score, complexity_score, notes, viability_assessment |
| `idea_specifications` | Scope documents | id, idea_id, created_by, title, problem_definition, success_criteria, requirements, out_of_scope, estimated_effort |
| `ai_conversations` | Chat history | id, user_id, org_id, context_type, context_id (lesson/course), messages (JSONB), created_at |

**Idea Status Workflow:**
- `draft` - Still being developed with AI
- `submitted` - Sent for review
- `under_review` - Org admin is evaluating
- `approved` - Accepted for development
- `in_progress` - Being implemented
- `completed` - Deployed
- `archived` - Not proceeding

**RLS Policies:**
- Learners: CRUD own ideas, view all org ideas (fully transparent)
- Org Admins: Full access to org ideas, can evaluate/approve
- Platform Admins: Read access to all ideas for analytics

### 1.2 Learner Ideas Hub

**New Route:** `/app/ideas`

**Components:**
- `IdeasHub.tsx` - Main container with tabs
- `AIBrainstormChat.tsx` - Chat interface with AI assistant
- `MyIdeas.tsx` - User's drafts and submissions
- `IdeaLibrary.tsx` - Searchable catalog of org ideas
- `IdeaCard.tsx` - Display component for idea previews
- `IdeaDetailDialog.tsx` - Full view with comments/votes
- `IdeaSubmissionForm.tsx` - Structured form for finalizing ideas

**AI Brainstorm Chat Features:**
- Full learning history context (courses completed, quiz scores, previous ideas)
- Probing questions about feasibility, scope, resources, impact
- Similar idea detection before submission
- Structured output extraction to populate idea fields
- Conversation persistence for continuing later

### 1.3 AI Assistant Edge Function

**Function:** `supabase/functions/idea-assistant/index.ts`

**Capabilities:**
- Receives user message + context (learning history, current conversation)
- Uses Lovable AI (gemini-3-flash-preview) with specialized system prompt
- Maintains conversational state
- Extracts structured idea fields when ready to submit
- Semantic search for similar existing ideas

**System Prompt Design:**
The AI will be instructed to:
1. Act as a critical thinking partner, not a yes-person
2. Ask probing questions about: problem clarity, scope boundaries, resource requirements, measurable outcomes, potential risks
3. Challenge assumptions constructively
4. Guide toward actionable, well-defined ideas
5. Suggest similar existing ideas when relevant

### 1.4 Similar Idea Detection

**Approach:** Use AI embeddings for semantic similarity

**Implementation:**
- Generate embeddings for idea title + description on submission
- Store in `idea_embeddings` table (or pgvector extension if available)
- On new idea draft, compare against existing embeddings
- Surface similar ideas with > 70% similarity

---

## Phase 2: Org Admin Ideas Management

### 2.1 Ideas Backlog

**New Route:** `/app/admin/ideas`

**Views:**
- **Kanban Board** - Drag ideas between status columns
- **Table View** - Sortable/filterable list with all metadata
- **Matrix View** - Value vs Complexity 2x2 grid for prioritization

**Components:**
- `IdeasBacklog.tsx` - Main container with view switcher
- `IdeasKanban.tsx` - Drag-and-drop status management
- `IdeasTable.tsx` - Data table with sorting/filtering
- `IdeaEvaluationDialog.tsx` - Assessment form
- `ValueComplexityMatrix.tsx` - Visual prioritization tool

### 2.2 AI Evaluation Assistant

**Edge Function:** `supabase/functions/idea-evaluator/index.ts`

**Features:**
- Analyzes idea against common evaluation criteria
- Suggests value and complexity scores with reasoning
- Identifies potential risks and dependencies
- Generates initial specification draft

### 2.3 Specification Builder

**Component:** `SpecificationBuilder.tsx`

**Outputs a structured document with:**
- Problem Definition
- Proposed Solution Overview
- Success Criteria / KPIs
- Functional Requirements
- Non-Functional Requirements
- Out of Scope
- Dependencies & Risks
- Estimated Effort Range
- Recommended Next Steps

**Export Options:**
- Markdown download
- PDF generation (via edge function)
- Copy to clipboard

---

## Phase 3: Community System

### 3.1 Database Schema

**New Tables:**

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `community_topics` | Categories | id, name, description, is_org_level, org_id (null for platform) |
| `community_posts` | Forum posts | id, topic_id, user_id, org_id (null for platform), title, content, content_type, linked_idea_id, parent_post_id |
| `community_reactions` | Likes/reactions | id, post_id, user_id, reaction_type |
| `community_bookmarks` | Saved posts | id, post_id, user_id |

**RLS Policies:**
- Org Community: Only org members can read/write
- Platform Community: All authenticated users can read/write (no org_id filter)

### 3.2 Organization Community

**New Route:** `/app/community/org`

**Features:**
- Discussion topics linked to ideas
- Department-based sub-forums
- @mentions for team members
- Rich content: images, links, embedded media
- Notification on replies to your posts

### 3.3 Platform-Wide Community

**New Route:** `/app/community`

**Features:**
- General AI/process optimization discussions
- Best practices sharing
- No org-specific or confidential content (enforced via guidelines)
- Moderation by platform admins
- Featured/pinned posts

**Components:**
- `CommunityHub.tsx` - Main container
- `CommunityTopicList.tsx` - Category navigation
- `PostCard.tsx` - Post preview component
- `PostEditor.tsx` - Rich text editor for posts
- `PostDetail.tsx` - Full post with replies

---

## Phase 4: CoursePlayer AI Integration

### 4.1 Embedded AI Panel

**Location:** Within CoursePlayer, accessible via floating button

**Features:**
- Context-aware: knows current course, module, lesson
- Quick idea capture during learning
- Can reference specific course content
- Seamless transition to full Ideas Hub for deeper brainstorming

**Implementation:**
- Add `AIBrainstormPanel.tsx` component
- Floating action button on CoursePlayer
- Slide-out panel or modal for chat
- "Open in Ideas Hub" link for complex discussions

---

## Navigation Updates

### Learner Sidebar (Learning Section)
```
Learning
├── Dashboard
├── My Courses
├── Ideas Hub (NEW)
├── Community (NEW - Platform-wide)
└── Certificates
```

### Org Admin Sidebar (Organization Section)
```
Organization
├── Organization
├── Team Members
├── Ideas Backlog (NEW)
├── Org Discussions (NEW)
└── Analytics
```

### Platform Admin Sidebar
```
Platform Admin
├── Organizations
├── Users
├── Course Manager
├── Community Moderation (NEW)
├── Global Analytics
└── Platform Settings
```

---

## Feature Toggles

Add to `platform_settings` features:
- `ideas_enabled`: Toggle entire ideas system
- `community_enabled`: Toggle community features
- `ai_brainstorm_enabled`: Toggle AI assistant (allows ideas without AI)

---

## Implementation Order

### Sprint 1: Ideas Core (Est. 3-4 sessions)
1. Database migrations for ideas tables
2. Idea types and basic CRUD
3. Ideas Hub page with My Ideas tab
4. Idea submission form
5. Idea Library (view all org ideas)

### Sprint 2: AI Brainstorming (Est. 2-3 sessions)
1. AI conversation edge function
2. AI Brainstorm Chat component
3. Learning history context integration
4. Structured idea extraction
5. AI conversations persistence

### Sprint 3: Similar Idea Detection (Est. 1-2 sessions)
1. Embedding generation edge function
2. Similarity search implementation
3. "Similar Ideas" suggestions in UI

### Sprint 4: Org Admin Tools (Est. 2-3 sessions)
1. Ideas Backlog page with table view
2. Kanban board for status management
3. Idea evaluation dialog
4. Value/Complexity matrix view

### Sprint 5: Specifications (Est. 1-2 sessions)
1. AI evaluator edge function
2. Specification builder component
3. Export functionality

### Sprint 6: Community (Est. 3-4 sessions)
1. Database migrations for community tables
2. Org Community pages and components
3. Platform Community pages
4. Rich content editor
5. Linking ideas to discussions

### Sprint 7: CoursePlayer Integration (Est. 1 session)
1. Floating AI button in CoursePlayer
2. Context-passing to AI assistant
3. Quick idea capture flow

---

## Security Considerations

- All ideas tables use org_id scoping with RLS
- Platform community posts have no org_id (public to all users)
- Org community posts require org membership
- AI conversations are user-scoped
- Edge functions validate user identity and org membership
- Rate limiting on AI endpoints

---

## Technical Notes

**AI Integration:**
- Uses Lovable AI Gateway (gemini-3-flash-preview)
- Streaming responses for chat interface
- Tool calling for structured output extraction
- LOVABLE_API_KEY already available

**Rich Content:**
- Use markdown for post content with react-markdown for rendering
- Image uploads to Supabase Storage
- Link embeds parsed from URLs

**Real-time Updates:**
- Enable Supabase realtime on `community_posts` and `idea_comments`
- Live updates when new comments/posts appear

