# Story 8-2: Currency Format Settings

## Status: done

## Story
As a user,
I want to select my preferred currency format,
so that amounts display in a format familiar to me.

## Acceptance Criteria
- [x] AC1: Currency selector in Settings with 8 common currencies
- [x] AC2: Shows currency symbol, code, and name in dropdown
- [x] AC3: Preference persists in localStorage
- [x] AC4: CurrencyProvider context with formatAmount helper
- [x] AC5: Supports different decimal/thousand separators

## Implementation Details

### Files Created
- `src/lib/currency.tsx` - CurrencyProvider context with useCurrency hook

### Files Modified  
- `src/app/layout.tsx` - Added CurrencyProvider wrapper
- `src/app/settings/page.tsx` - Added currency dropdown selector

### Supported Currencies
1. USD - US Dollar ($)
2. EUR - Euro (€)
3. GBP - British Pound (£)
4. CHF - Swiss Franc (CHF)
5. MXN - Mexican Peso ($)
6. JPY - Japanese Yen (¥)
7. CAD - Canadian Dollar (CA$)
8. AUD - Australian Dollar (A$)

### Technical Approach
1. Created CurrencyConfig interface with symbol position, separators
2. formatAmount() handles thousand separators and symbol placement
3. Persists to localStorage under key `daticket-currency`
4. Dropdown with animated dropdown similar to theme selector

## DoD Checklist
- [x] All ACs implemented
- [x] Build passes
- [x] Currency selector works in Settings
- [x] Preference persists across page loads
