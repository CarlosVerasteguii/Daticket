# Story 6-2: PDF Monthly Report

## Status: done

## Story
As a user, I want to generate a printable expense report so that I can save it as PDF or print for my records.

## Acceptance Criteria
- [x] AC1: "Report" button in receipts page header
- [x] AC2: Dedicated /receipts/report page with print-optimized layout
- [x] AC3: Report shows summary: Total Spent, Receipts Count, Average
- [x] AC4: Category breakdown with amounts and percentages
- [x] AC5: Top 10 stores by spending
- [x] AC6: Full transaction list
- [x] AC7: "Print / Save as PDF" button triggers browser print dialog
- [x] AC8: Print styles hide navigation, optimize layout for paper
- [x] AC9: Date range passed via URL params from receipts page
- [x] AC10: Swiss design aesthetic maintained

## Technical Implementation
- Created `/app/receipts/report/page.tsx` with Suspense boundary
- Uses `useSearchParams` for date range
- Print-optimized CSS with `@media print`
- Category and store breakdowns computed from receipts

## Files Changed
- `src/app/receipts/report/page.tsx` - New report page
- `src/app/receipts/page.tsx` - Added Report button, FileText import

## DoD Checklist
- [x] All ACs implemented
- [x] Build passes
- [x] Code follows project conventions
- [x] No regressions in existing functionality

## Completed
- Date: 2025-01-22
- Duration: ~5 minutes
