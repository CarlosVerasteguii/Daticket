# Story 10-1: Session Management UI

## Status: done

## Story
As a user,
I want to view and manage my active sessions from the settings page,
so that I can see where I'm logged in and revoke access from unauthorized devices.

## Acceptance Criteria
- [x] AC1: Settings page has a "Security" section displaying active sessions
- [x] AC2: Each session shows device info (browser, OS), location (if available), IP address, and last active timestamp
- [x] AC3: Current session is clearly marked with "Current Session" badge
- [x] AC4: Users can revoke/terminate any session except the current one
- [x] AC5: Revoking a session immediately invalidates it (user on that device gets logged out)
- [x] AC6: Confirmation dialog before revoking a session
- [x] AC7: Success/error toast notifications for session actions

## Technical Context

### Supabase Auth Session Management
Supabase Auth provides session management through:
- `supabase.auth.getSession()` - Gets current session
- `supabase.auth.signOut({ scope: 'global' })` - Sign out from all devices
- `supabase.auth.signOut({ scope: 'local' })` - Sign out current device only
- `supabase.auth.admin.listUserSessions(userId)` - List all sessions (requires service role)

### Database Schema Addition
```sql
-- User sessions tracking table (optional - for enhanced session info)
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL UNIQUE,
  device_info JSONB,
  ip_address INET,
  location JSONB,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_current BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT
  USING (auth.uid() = user_id);
```

### Existing Patterns
- Settings page: `src/app/settings/page.tsx` - Add new Security section
- Auth client: `src/lib/supabase/client.ts`
- Toast notifications: Use existing toast pattern from settings page
- UI components: Lucide icons, Tailwind, motion animations

### API Route for Session Management
Create `/api/sessions` endpoint using Supabase service role for:
- GET: List user's sessions with device info parsing from user_agent
- DELETE: Revoke specific session by session_id

## Tasks / Subtasks

- [x] Task 1: Create Sessions API Route (AC1, AC2, AC4, AC5)
  - [x] Create `src/app/api/sessions/route.ts`
  - [x] GET handler: Fetch sessions, parse user_agent for device info
  - [x] DELETE handler: Revoke session by ID using admin API
  - [x] Add proper error handling and auth validation

- [x] Task 2: Create Sessions UI Components (AC1, AC2, AC3)
  - [x] Create `src/components/settings/SessionsList.tsx`
  - [x] Display session card with device icon, browser, OS, IP
  - [x] Show "Current Session" badge for active session
  - [x] Show relative timestamps (e.g., "Active 2 hours ago")
  - [x] Empty state when no other sessions

- [x] Task 3: Add Revoke Session Functionality (AC4, AC5, AC6, AC7)
  - [x] Add revoke button to each session card (not current)
  - [x] Create confirmation modal/dialog
  - [x] Call DELETE API on confirmation
  - [x] Show success/error toast
  - [x] Refresh session list after revoke

- [x] Task 4: Integrate into Settings Page (AC1)
  - [x] Add "Security" section to settings page
  - [x] Import and render SessionsList component
  - [x] Add Lock icon and section styling matching existing sections
  - [x] Add "Sign Out All Devices" option

- [x] Task 5: Testing and Polish
  - [x] Build passes
  - [x] All components render correctly
  - [x] Confirmation modals implemented
  - [x] Toast notifications working

## Dev Notes

### User Agent Parsing
Use a simple regex or library like `ua-parser-js` to extract:
- Browser name and version
- Operating system
- Device type (desktop/mobile/tablet)

### Session Data Structure
```typescript
interface SessionInfo {
  id: string;
  device: {
    browser: string;
    os: string;
    type: 'desktop' | 'mobile' | 'tablet';
  };
  ipAddress: string;
  location?: {
    city?: string;
    country?: string;
  };
  lastActive: string;
  isCurrent: boolean;
  createdAt: string;
}
```

### Supabase Admin Client
For session management, need service role client:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
```

## DoD Checklist
- [x] All ACs implemented
- [x] Build passes (`npm run build`)
- [x] Sessions display correctly with device info
- [x] Revoke session works and logs out target device
- [x] Current session protected from revocation
- [x] Proper error handling and user feedback

## Implementation Notes
### Files Created
- `src/app/api/sessions/route.ts` - Sessions API (GET/POST/DELETE)
- `src/components/settings/SessionsList.tsx` - Sessions UI component

### Files Modified
- `src/app/settings/page.tsx` - Added Security section with SessionsList

### Dependencies Added
- `ua-parser-js` - User agent parsing for device detection
- `@types/ua-parser-js` - TypeScript types

### Completed
- 2026-01-31T10:51:00-06:00
