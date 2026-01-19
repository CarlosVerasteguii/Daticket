# Frontend Architecture

## Component Architecture

### Component Organization

```
apps/web/src/
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   ├── PasswordResetForm.tsx
│   │   └── ProfileForm.tsx
│   ├── receipts/
│   │   ├── ReceiptUploadForm.tsx
│   │   ├── ReceiptList.tsx
│   │   ├── ReceiptCard.tsx
│   │   ├── ReceiptDetail.tsx
│   │   ├── ReceiptFilters.tsx
│   │   └── ImagePreview.tsx
│   ├── categories/
│   │   ├── CategoryList.tsx
│   │   ├── CategoryForm.tsx
│   │   ├── CategoryPicker.tsx
│   │   └── CategoryBadge.tsx
│   ├── analytics/
│   │   ├── Dashboard.tsx
│   │   ├── SpendingOverview.tsx
│   │   ├── CategoryBreakdownChart.tsx
│   │   ├── TrendChart.tsx
│   │   ├── StoreAnalysis.tsx
│   │   └── QuickStats.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Card.tsx
│       └── ... (Radix UI wrappers)
```

### Component Template

```typescript
'use client'; // Only for Client Components

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Zod schema for validation
const schema = z.object({
  field: z.string().min(1, 'Required'),
});

type FormData = z.infer<typeof schema>;

export function ExampleForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    // Handle submission
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('field')} />
      {errors.field && <span>{errors.field.message}</span>}
      <button type="submit" disabled={isSubmitting}>
        Submit
      </button>
    </form>
  );
}
```

## State Management Architecture

### State Structure

```typescript
// Global state with Zustand
import { create } from 'zustand';

interface AppState {
  // User state
  user: User | null;
  setUser: (user: User | null) => void;
  
  // UI state
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  
  // Filter state
  filters: {
    dateRange: { start: Date; end: Date } | null;
    categories: string[];
    stores: string[];
  };
  setFilters: (filters: Partial<AppState['filters']>) => void;
  clearFilters: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  filters: {
    dateRange: null,
    categories: [],
    stores: [],
  },
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
    })),
  clearFilters: () =>
    set({
      filters: { dateRange: null, categories: [], stores: [] },
    }),
}));
```

### State Management Patterns

- **Server State:** Managed by Tanstack Query (React Query) for data fetching, caching, and synchronization
- **Form State:** Managed by React Hook Form with Zod validation
- **Global UI State:** Managed by Zustand for sidebar, modals, filters
- **Local Component State:** Managed by useState for component-specific state
- **URL State:** Search params for shareable filters and pagination

## Routing Architecture

### Route Organization

```
apps/web/src/app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx
│   ├── register/
│   │   └── page.tsx
│   └── reset-password/
│       └── page.tsx
├── (dashboard)/
│   ├── layout.tsx              # Protected layout with auth check
│   ├── dashboard/
│   │   └── page.tsx            # Analytics dashboard
│   ├── receipts/
│   │   ├── page.tsx            # Receipt list
│   │   ├── new/
│   │   │   └── page.tsx        # Upload new receipt
│   │   └── [id]/
│   │       ├── page.tsx        # Receipt detail
│   │       └── edit/
│   │           └── page.tsx    # Edit receipt
│   ├── categories/
│   │   ├── page.tsx            # Category management
│   │   └── [id]/
│   │       └── edit/
│   │           └── page.tsx    # Edit category
│   └── profile/
│       └── page.tsx            # User profile
├── api/
│   ├── images/
│   │   └── upload/
│   │       └── route.ts
│   └── analytics/
│       ├── dashboard/
│       │   └── route.ts
│       └── trends/
│           └── route.ts
├── layout.tsx                  # Root layout
└── page.tsx                    # Landing page
```

### Protected Route Pattern

```typescript
// apps/web/src/app/(dashboard)/layout.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.Node;
}) {
  const supabase = createServerComponentClient({ cookies });
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main>{children}</main>
    </div>
  );
}
```

## Frontend Services Layer

### API Client Setup

```typescript
// packages/shared/src/api/client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// Helper for authenticated requests
export async function getAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  
  return {
    Authorization: `Bearer ${session?.access_token}`,
  };
}
```

### Service Example

```typescript
// apps/web/src/services/receipts.service.ts
import { supabase } from '@daticket/shared/api/client';
import type { Receipt, InsertReceipt } from '@daticket/shared/types';

export const receiptsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('receipts')
      .select(`
        *,
        categories (*)
      `)
      .order('purchase_date', { ascending: false });

    if (error) throw error;
    return data as Receipt[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('receipts')
      .select(`
        *,
        categories (*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Receipt;
  },

  async create(receipt: InsertReceipt) {
    const { data, error } = await supabase
      .from('receipts')
      .insert(receipt)
      .select()
      .single();

    if (error) throw error;
    return data as Receipt;
  },

  async update(id: string, updates: Partial<InsertReceipt>) {
    const { data, error } = await supabase
      .from('receipts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Receipt;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('receipts')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
```


---
