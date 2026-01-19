# Testing Strategy

## Testing Pyramid

```
        E2E Tests (Playwright)
       /                      \
      Integration Tests (Vitest)
     /                          \
    Unit Tests (Vitest + React Testing Library)
```

## Test Organization

### Frontend Tests

```
apps/web/tests/
├── unit/
│   ├── components/
│   │   ├── ReceiptCard.test.tsx
│   │   └── CategoryPicker.test.tsx
│   ├── services/
│   │   └── receipts.service.test.ts
│   └── utils/
│       └── date.test.ts
├── integration/
│   ├── auth.test.tsx
│   ├── receipt-upload.test.tsx
│   └── analytics.test.tsx
└── e2e/
    ├── auth-flow.spec.ts
    ├── receipt-management.spec.ts
    └── analytics-dashboard.spec.ts
```

### Backend Tests

```
apps/web/tests/
├── api/
│   ├── images/
│   │   └── upload.test.ts
│   └── analytics/
│       └── dashboard.test.ts
```

## Test Examples

### Frontend Component Test

```typescript
// apps/web/tests/unit/components/ReceiptCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReceiptCard } from '@/components/receipts/ReceiptCard';

describe('ReceiptCard', () => {
  const mockReceipt = {
    id: '1',
    store_name: 'Whole Foods',
    purchase_date: '2025-01-15',
    total_amount: 85.50,
    image_url: 'https://example.com/image.jpg',
  };

  it('renders receipt information', () => {
    render(<ReceiptCard receipt={mockReceipt} />);
    
    expect(screen.getByText('Whole Foods')).toBeInTheDocument();
    expect(screen.getByText('$85.50')).toBeInTheDocument();
  });

  it('formats date correctly', () => {
    render(<ReceiptCard receipt={mockReceipt} />);
    
    expect(screen.getByText(/Jan 15, 2025/)).toBeInTheDocument();
  });
});
```

### Backend API Test

```typescript
// apps/web/tests/api/images/upload.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { POST } from '@/app/api/images/upload/route';
import { createMocks } from 'node-mocks-http';

describe('POST /api/images/upload', () => {
  it('requires authentication', async () => {
    const { req } = createMocks({
      method: 'POST',
    });

    const response = await POST(req as any);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('validates file presence', async () => {
    // Mock authenticated request
    const { req } = createMocks({
      method: 'POST',
      headers: {
        authorization: 'Bearer mock-token',
      },
    });

    const response = await POST(req as any);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error.code).toBe('NO_FILE');
  });
});
```

### E2E Test

```typescript
// apps/web/tests/e2e/auth-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('user can register, login, and access dashboard', async ({ page }) => {
    // Navigate to register
    await page.goto('/register');

    // Fill registration form
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPass123');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard after registration
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Verify user is logged in
    await expect(page.locator('text=Welcome')).toBeVisible();

    // Logout
    await page.click('button:has-text("Logout")');
    
    // Should redirect to landing page
    await expect(page).toHaveURL('/');

    // Login again
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'TestPass123');
    await page.click('button[type="submit"]');

    // Should access dashboard
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
```

---
