# Story 8-5: Account Deletion

## Status: done

## Story
As a user, I want to permanently delete my account and all associated data, so that I can exercise my GDPR right to be forgotten and ensure my data is completely removed from the system.

## Acceptance Criteria
- [x] AC1: Delete Account button visible in Settings "Danger Zone" section
- [x] AC2: Clicking opens confirmation modal with clear warnings
- [x] AC3: User must type "DELETE" to confirm (prevents accidental deletion)
- [x] AC4: Deletes all user receipts from database
- [x] AC5: Deletes all user categories from database
- [x] AC6: Clears all localStorage preferences
- [x] AC7: Signs user out after deletion
- [x] AC8: Redirects to home page after completion
- [x] AC9: Error handling with visual feedback
- [x] AC10: Full dark mode support

## Technical Context
- Danger Zone section with red styling for visual warning
- Modal with AnimatePresence for smooth animation
- Confirmation input requires exact "DELETE" match
- Sequential deletion: receipts → categories → localStorage → signOut
- No actual account deletion (requires Supabase admin API in production)

## Dev Notes
- handleDeleteAccount: Deletes data, clears storage, signs out
- showDeleteModal, deleteConfirmation, deleteStatus state management
- GDPR-style warnings listing all data that will be deleted
- Red-themed UI for danger zone and modal

## File List
- src/app/settings/page.tsx (modified - danger zone section, delete modal)

## Definition of Done
- [x] All ACs implemented and verified
- [x] Build passes without errors
- [x] Confirmation modal works correctly
- [x] Data deletion sequence complete
- [x] Dark mode styling applied
- [x] Error handling for failures
