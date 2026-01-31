# Story 10-4: User Activity Audit Log

## Status: In Progress

## Story
**As a** security-conscious user  
**I want** to view a log of important account activities  
**So that** I can detect suspicious access and track changes

## Acceptance Criteria

### AC1: Audit Log Data Structure
- Store audit events in user_metadata.audit_log array
- Each entry: type, timestamp, details, ip (if available)
- Event types: login, password_change, session_revoked, data_export, data_delete
- Keep last 50 events (FIFO)

### AC2: Audit Event Capture
- Log login events (via middleware or auth callback)
- Log password changes (from PasswordChange component)
- Log session revocations (from SessionsList)
- Log data exports (from Settings)
- Log account deletions (from Settings)

### AC3: Audit Log UI in Settings
- New "Activity Log" section in Settings Security area
- List of recent events with icons and timestamps
- Event type badges (Login, Security, Data)
- Relative timestamps (e.g., "2 hours ago")
- Expandable details for each event

### AC4: Log Pagination/Scroll
- Show last 10 events initially
- "Show more" button to load older events
- Empty state when no events exist

## Technical Context

### Storing Audit Events
```typescript
// Structure in user_metadata.audit_log
interface AuditEvent {
  id: string
  type: 'login' | 'password_change' | 'session_revoked' | 'data_export' | 'data_delete'
  timestamp: string // ISO 8601
  details?: string
  ip?: string
}

// Add event via admin API
await supabaseAdmin.auth.admin.updateUserById(userId, {
  user_metadata: {
    ...existingMetadata,
    audit_log: [newEvent, ...existingLog].slice(0, 50)
  }
})
```

### Component Location
- Create: `src/components/settings/AuditLog.tsx`
- Add helper: `src/lib/audit.ts` for logging utility
- Integrate in Settings Security section

## Tasks
- [x] Create audit helper utility for logging events
- [x] Create API route for fetching/adding audit events
- [x] Create AuditLog UI component
- [x] Integrate audit logging in PasswordChange
- [x] Integrate audit logging in SessionsList
- [x] Integrate in Settings page
- [x] Test build passes

## DoD Checklist
- [ ] All ACs implemented
- [ ] Build passes (`npm run build`)
- [ ] Audit events display correctly
- [ ] New events logged from actions
- [ ] Empty state handled
