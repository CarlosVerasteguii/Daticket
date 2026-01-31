# Story 8-4: Data Export/Import

## Status: done

## Story
As a user, I want to export all my data as a JSON backup and import it back, so that I can safely backup my receipts and restore them if needed.

## Acceptance Criteria
- [x] AC1: Export button in Settings downloads complete JSON backup
- [x] AC2: Export includes all receipts with metadata
- [x] AC3: Export includes user categories
- [x] AC4: Export includes preferences (theme, currency, notifications)
- [x] AC5: Import accepts JSON file via file picker
- [x] AC6: Import restores receipts (skip duplicates by store+amount+date)
- [x] AC7: Import restores preferences
- [x] AC8: Visual feedback during export/import (loading, success, error states)
- [x] AC9: Dark mode support for all buttons and states

## Technical Context
- Export generates daticket-backup-YYYY-MM-DD.json
- Import validates file structure before processing
- Duplicate detection uses store_name + amount + receipt_date
- All Supabase queries scoped to current user_id
- File input ref for programmatic reset

## Dev Notes
- handleExport: Fetches receipts + categories, generates blob, triggers download
- handleImport: Parses file, validates, upserts receipts, applies preferences
- exportStatus/importStatus state for button feedback
- Uses fileInputRef to reset file picker after import

## File List
- src/app/settings/page.tsx (modified - export/import UI and handlers)

## Definition of Done
- [x] All ACs implemented and verified
- [x] Build passes without errors
- [x] Export generates valid JSON file
- [x] Import restores data correctly
- [x] Dark mode styling applied
- [x] Error handling for invalid files
