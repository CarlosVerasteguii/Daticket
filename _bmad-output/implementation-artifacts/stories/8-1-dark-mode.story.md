# Story 8-1: Dark Mode Toggle

## Status: done

## Story
As a user,
I want to switch between light and dark themes,
so that I can use the app comfortably in any lighting condition.

## Acceptance Criteria
- [x] AC1: Theme toggle in Settings with Light/Dark/System options
- [x] AC2: System preference detection on initial load
- [x] AC3: Theme persists in localStorage
- [x] AC4: Smooth transition between themes
- [x] AC5: All dashboard components support dark mode

## Implementation Details

### Files Created
- `src/lib/theme.tsx` - ThemeProvider context with useTheme hook

### Files Modified
- `src/app/layout.tsx` - Added ThemeProvider wrapper
- `src/app/globals.css` - Added dark mode CSS variables and @variant dark
- `src/app/settings/page.tsx` - Added theme toggle dropdown
- `src/components/layout/DashboardShell.tsx` - Dark mode classes throughout

### Technical Approach
1. Created ThemeProvider context with Light/Dark/System options
2. Uses `html.dark` class strategy with Tailwind v4 `@variant dark`
3. Detects system preference via `matchMedia('(prefers-color-scheme: dark)')`
4. Persists to localStorage under key `daticket-theme`
5. Added dark: variants to all UI components

## DoD Checklist
- [x] All ACs implemented
- [x] Build passes
- [x] Theme toggle works in Settings
- [x] System preference detection works
- [x] Preference persists across page loads
