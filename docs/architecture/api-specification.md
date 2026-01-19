# API Specification

## REST API via Supabase Client

This application primarily uses the Supabase JavaScript client for data access, which provides auto-generated REST APIs based on database schema. Custom API routes are used ONLY for complex business logic that cannot be handled client-side.

**MVP Strategy:** Minimize custom API routes to reduce complexity and serverless debugging overhead.

## Supabase Auto-Generated Endpoints

```typescript
// Example: Supabase client automatically provides CRUD operations
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(supabaseUrl, supabaseKey);

// GET receipts (with RLS auto-filtering by user)
const { data, error } = await supabase
  .from('receipts')
  .select('*, categories(*)')
  .order('purchase_date', { ascending: false });

// POST new receipt
const { data, error } = await supabase
  .from('receipts')
  .insert({
    store_name: 'Whole Foods',
    purchase_date: '2025-01-15',
    total_amount: 85.50
  });

// PUT (update) receipt
const { data, error } = await supabase
  .from('receipts')
  .update({ notes: 'Weekly grocery run' })
  .eq('id', receiptId);

// DELETE receipt
const { data, error } = await supabase
  .from('receipts')
  .delete()
  .eq('id', receiptId);
```

## Custom API Routes

**MVP Scope:** Only implement when absolutely necessary. Most operations should use Supabase client directly.

**POST /api/receipts/upload-image**
- **Purpose:** Handle image upload with client-side compression
- **Note:** Image compression happens in browser before upload
- Uploads receipt image to Supabase Storage
- Returns public URL
- **MVP Priority:** High (required for Epic 2)

**GET /api/analytics/dashboard**
- **Purpose:** Aggregate spending data for dashboard
- Query params: `period` (week|month|quarter|year)
- Returns: total, average, category breakdown
- **MVP Priority:** Medium (defer to Sprint 4-5 if needed)

**Note:** Removed analytics/trends endpoint - will use simple aggregations in component instead of custom API route for MVP.

## API Response Format

```typescript
// Success Response
interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

// Error Response
interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}
```

---
