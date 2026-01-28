

# SharePoint Video Support for Lessons

## Overview

This plan adds SharePoint video embedding support for video lessons, allowing you to link SharePoint-hosted videos instead of uploading files directly.

---

## How It Works

### For Platform Admins (Creating/Editing Lessons)

When adding or editing a video lesson, you'll see two options:

1. **Upload Video** - The existing file upload (for files under 20MB)
2. **SharePoint URL** - Paste a SharePoint video link

### For Learners (Viewing Lessons)

The video player will display SharePoint videos in an embedded iframe. The experience is seamless - learners simply watch the video within the lesson.

---

## SharePoint Setup Guide

To use SharePoint videos, you'll need to generate a shareable link:

1. Navigate to your video in SharePoint
2. Click **Share** then select **Anyone with the link** or **People in your organization**
3. Click **Copy link** (the standard share URL works)
4. Optionally, use the **Embed** option for a direct embed URL
5. Paste either URL into the lesson editor

The system accepts:
- Share links: `https://yourcompany.sharepoint.com/:v:/s/...`
- Embed URLs: `https://yourcompany.sharepoint.com/.../_layouts/15/embed.aspx?...`

---

## Changes Summary

### Database

| Change | Description |
|--------|-------------|
| Add `video_url` column to `lessons` table | Stores external SharePoint video URLs (nullable text) |

### Files Changed/Created

| File | Changes |
|------|---------|
| `src/lib/sharepoint.ts` | **New** - SharePoint URL validation and embed transformation |
| `src/lib/types.ts` | Add `video_url` field to Lesson interface |
| `src/pages/platform-admin/CourseEditor.tsx` | Add video source toggle and SharePoint URL input |
| `src/pages/learner/CoursePlayer.tsx` | Add SharePoint iframe rendering for external videos |

---

## Technical Details

### SharePoint URL Transformation

The system detects SharePoint URLs and transforms them to embeddable format:

```text
Input patterns:
  - https://company.sharepoint.com/:v:/s/SiteName/...
  - https://company.sharepoint.com/:v:/r/sites/...
  - https://company-my.sharepoint.com/:v:/g/personal/...

Output:
  - Transforms share links to embed.aspx URLs
  - Preserves action=embedview parameter for proper embedding
```

### Video Rendering Priority

When displaying a video lesson:

1. If `video_url` exists (SharePoint) - render iframe embed
2. Else if `video_storage_path` exists - use signed URL video player
3. Else - show placeholder

### Lesson Editor UI

For video lesson type:

```text
+---------------------------------------------+
|  Video Source                               |
|  ( ) Upload Video    (x) SharePoint URL     |
+---------------------------------------------+
|  [When SharePoint URL selected]             |
|                                             |
|  SharePoint Video URL                       |
|  +---------------------------------------+  |
|  | https://company.sharepoint.com/:v:/...   |
|  +---------------------------------------+  |
|  (i) Paste a SharePoint share or embed link |
+---------------------------------------------+
```

### SharePoint Embed Component

A responsive iframe with:
- Sandboxed execution (`allow-scripts allow-same-origin`)
- Aspect ratio container (16:9)
- Loading state handling
- Error boundary for failed loads

### Security Considerations

| Concern | Mitigation |
|---------|------------|
| Invalid URLs | Validate URL matches `*.sharepoint.com` domain pattern |
| XSS via iframe | Use `sandbox` attribute on iframes |
| Access control | SharePoint handles permissions - video only plays if user/link has access |

---

## Limitations

- **Authentication**: If your SharePoint videos require sign-in, learners will see a Microsoft login prompt within the iframe. For seamless playback, use "Anyone with the link" sharing.
- **Completion tracking**: Video watch progress isn't tracked - completion is based on clicking "Mark as Complete"
- **Offline access**: SharePoint videos require internet connectivity

---

## Implementation Steps

1. **Database migration** - Add `video_url` column to lessons table
2. **Create SharePoint utilities** - URL validation and embed transformation helper
3. **Update Lesson type** - Add `video_url` to TypeScript interface
4. **Update CourseEditor** - Add video source toggle with SharePoint URL input
5. **Update CoursePlayer** - Render SharePoint embeds when `video_url` is present

