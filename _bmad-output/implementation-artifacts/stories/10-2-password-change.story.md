# Story 10-2: Password Change Flow

## Status: In Progress

## Story
**As a** user  
**I want** to change my password from the Settings page  
**So that** I can update my credentials periodically for security

## Acceptance Criteria

### AC1: Password Change Form
- Form displays in Security section of Settings
- Current password field with visibility toggle
- New password field with visibility toggle
- Confirm password field with visibility toggle
- Submit button disabled until all fields valid

### AC2: Password Validation
- Minimum 8 characters required
- Must contain at least one number
- Must contain at least one uppercase letter
- Real-time validation feedback
- New password and confirm must match

### AC3: Password Update Flow
- Verify current password before allowing change
- Call Supabase auth.updateUser() with new password
- Show loading state during update
- Toast notification on success
- Clear form and close after success

### AC4: Error Handling
- Show error if current password is incorrect
- Show validation errors inline
- Network error handling with retry option
- Maintain form state on error

## Technical Context

### Supabase Auth API
```typescript
// To update password
const { error } = await supabase.auth.updateUser({
  password: newPassword
})

// Note: Supabase doesn't have built-in "verify current password"
// Must re-authenticate first to verify:
const { error: signInError } = await supabase.auth.signInWithPassword({
  email: user.email!,
  password: currentPassword
})
```

### Existing UI Patterns
- Settings page at `src/app/settings/page.tsx`
- Security section already exists with SessionsList
- Swiss International design style (brutalist)
- Toast notifications via custom pattern

### Component Location
- Create: `src/components/settings/PasswordChange.tsx`
- Integrate into Security section below SessionsList

## Tasks
- [x] Create PasswordChange component with form fields
- [x] Implement password validation with visual feedback
- [x] Create API route for password verification/change
- [x] Integrate into Settings Security section
- [x] Add toast notifications for success/error
- [x] Test build passes

## DoD Checklist
- [x] All ACs implemented
- [x] Build passes (`npm run build`)
- [x] Password change works end-to-end
- [x] Validation feedback displays correctly
- [x] Error states handled gracefully

## Implementation Notes
### Files Created
- `src/components/settings/PasswordChange.tsx` - Password change form component

### Files Modified
- `src/app/settings/page.tsx` - Added PasswordChange to Security section

### Completed
- 2026-01-31T10:55:00-06:00
