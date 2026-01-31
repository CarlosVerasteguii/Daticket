# Story 10-3: Password Recovery (Forgot Password)

## Status: In Progress

## Story
**As a** user who forgot their password  
**I want** to reset my password via email  
**So that** I can regain access to my account

## Acceptance Criteria

### AC1: Forgot Password Link on Login
- Login page shows "Forgot password?" link
- Link navigates to /forgot-password page
- Styled consistently with Swiss design system

### AC2: Forgot Password Form
- Email input field with validation
- Submit button triggers password reset email
- Loading state during submission
- Success message confirming email sent
- Error handling for invalid/unregistered email

### AC3: Password Reset Email
- Uses Supabase auth.resetPasswordForEmail()
- Redirect URL points to /reset-password
- Email contains secure reset link

### AC4: Reset Password Page
- Accessible only via email link (with token)
- New password and confirm password fields
- Same password validation as password change (8+ chars, 1 number, 1 uppercase)
- Submit updates password and redirects to login
- Error handling for expired/invalid tokens

## Technical Context

### Supabase Auth API
```typescript
// Send reset email
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/reset-password`,
})

// Handle reset on /reset-password page
// Supabase sets session automatically from URL hash
const { error } = await supabase.auth.updateUser({
  password: newPassword
})
```

### Existing Patterns
- Login page at `src/app/login/page.tsx`
- Swiss International design (brutalist)
- React Hook Form with Zod validation
- Lucide icons

## Tasks
- [x] Add forgot password link to login page
- [x] Create /forgot-password page with email form
- [x] Create /reset-password page for new password
- [x] Implement password reset API flow
- [x] Add validation and error handling
- [x] Test build passes

## DoD Checklist
- [x] All ACs implemented
- [x] Build passes (`npm run build`)
- [x] Forgot password flow works end-to-end
- [x] Reset password with valid token works
- [x] Error states handled gracefully

## Implementation Notes
### Files Created
- `src/app/forgot-password/page.tsx` - Email entry form
- `src/app/reset-password/page.tsx` - New password form

### Files Modified
- `src/app/login/page.tsx` - Added "Forgot password?" link

### Completed
- 2026-01-31T11:02:00-06:00
