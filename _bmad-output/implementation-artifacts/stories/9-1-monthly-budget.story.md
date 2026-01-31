# Story 9-1: Monthly Budget Setting

## Status: done

## Story
As a user, I want to set a total monthly budget and allocate budgets to specific categories, so that I can plan and control my spending more effectively.

## Acceptance Criteria
- [x] AC1: Budget page accessible from sidebar navigation
- [x] AC2: Set total monthly budget with edit functionality
- [x] AC3: Add per-category budgets from predefined list
- [x] AC4: Edit existing category budgets inline
- [x] AC5: Remove category budgets
- [x] AC6: Show percentage of total allocated to categories
- [x] AC7: Budgets persist across sessions via localStorage
- [x] AC8: Show current month name in header
- [x] AC9: Full dark mode support
- [x] AC10: Empty state when no category budgets set

## Technical Context
- BudgetProvider context in src/lib/budget.tsx
- MonthlyBudget interface with totalBudget and categoryBudgets array
- localStorage key: `daticket-budgets` (stores all months)
- Month format: YYYY-MM for budget identification
- Budget page at /budget with full CRUD operations

## Dev Notes
- Created BudgetProvider with CRUD operations for budgets
- Added to provider chain in layout.tsx
- Budget page with inline editing for total and categories
- useBudget hook provides currentMonthBudget and helper functions
- Added Budget link to sidebar navigation

## File List
- src/lib/budget.tsx (created)
- src/app/budget/page.tsx (created)
- src/app/layout.tsx (modified - added BudgetProvider)
- src/components/layout/DashboardShell.tsx (modified - added Budget nav)

## Definition of Done
- [x] All ACs implemented and verified
- [x] Build passes without errors
- [x] Budgets persist to localStorage
- [x] Dark mode styling applied
- [x] Navigation works correctly
