# Coding Standards

## Critical Fullstack Rules

- **Type Sharing:** Always define shared types in `packages/shared/src/types` and import from `@daticket/shared/types`
- **No Direct Database Access:** Never use Supabase client directly in components; always use service layer from `services/`
- **Environment Variables:** Access only through `process.env.NEXT_PUBLIC_*` for client-side, never expose secrets
- **Error Handling:** All API routes must use standardized error response format (see API Specification section)
- **State Updates:** Never mutate state directly; use Zustand actions or React setState
- **Validation:** All form inputs must be validated with Zod schemas on both client and server
- **Authentication:** Always check session in API routes using `createRouteHandlerClient`
- **Image Optimization:** All uploaded images must be compressed before storage (use Sharp in API route)
- **Database Queries:** Always use RLS-enabled queries; never bypass with service role key unless absolutely necessary
- **Component Boundaries:** Server Components for data fetching, Client Components only when interactivity is needed

## Naming Conventions

| Element | Frontend | Backend | Example |
|---------|----------|---------|---------|
| Components | PascalCase | - | `ReceiptCard.tsx` |
| Hooks | camelCase with 'use' prefix | - | `useReceipts.ts` |
| Services | camelCase with '.service' suffix | - | `receipts.service.ts` |
| API Routes | kebab-case | kebab-case | `/api/receipt-upload` |
| Database Tables | snake_case | snake_case | `receipt_categories` |
| Database Columns | snake_case | snake_case | `user_id`, `created_at` |
| TypeScript Types | PascalCase | PascalCase | `Receipt`, `Category` |
| Environment Variables | SCREAMING_SNAKE_CASE | SCREAMING_SNAKE_CASE | `NEXT_PUBLIC_SUPABASE_URL` |

---
