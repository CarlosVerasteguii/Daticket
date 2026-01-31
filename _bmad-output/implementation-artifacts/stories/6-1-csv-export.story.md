# Story 6-1: CSV Export

## Status: done

## Story
As a user, I want to export my receipts to a CSV file so that I can use the data in spreadsheets or other applications.

## Acceptance Criteria
- [x] AC1: "Export CSV" button visible in receipts page header
- [x] AC2: Button is disabled when no receipts are visible
- [x] AC3: Export includes currently filtered receipts only
- [x] AC4: CSV contains: Store, Date, Amount, Category, Notes, Created At
- [x] AC5: Proper CSV escaping for special characters (quotes, commas)
- [x] AC6: Downloaded file named with current date (receipts-export-YYYY-MM-DD.csv)
- [x] AC7: Swiss design styling matching other buttons

## Technical Implementation
- `exportToCSV()` callback function in receipts page
- Creates Blob with CSV content and triggers download
- Respects current filter state (exports filteredReceipts)
- Download icon from lucide-react

## Files Changed
- `src/app/receipts/page.tsx` - Added Download import, exportToCSV function, Export button

## DoD Checklist
- [x] All ACs implemented
- [x] Build passes
- [x] Code follows project conventions
- [x] No regressions in existing functionality

## Completed
- Date: 2025-01-22
- Duration: ~3 minutes
