# Security and Performance

## Security Requirements

**Frontend Security:**
- **CSP Headers:** Configure in `next.config.js` to prevent XSS
  ```javascript
  {
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-eval' 'unsafe-inline';"
  }
  ```
- **XSS Prevention:** React auto-escapes by default, validate user input with Zod
- **Secure Storage:** JWT tokens stored in httpOnly cookies by Supabase Auth

**Backend Security:**
- **Input Validation:** All API routes validate input with Zod schemas
- **Rate Limiting:** Configure Vercel rate limiting for API routes
- **CORS Policy:** Restrict to application domain only
  ```typescript
  headers: [
    {
      key: 'Access-Control-Allow-Origin',
      value: process.env.NEXT_PUBLIC_APP_URL
    }
  ]
  ```

**Authentication Security:**
- **Token Storage:** httpOnly cookies (managed by Supabase Auth)
- **Session Management:** 7-day sessions with refresh tokens
- **Password Policy:** Min 8 chars, 1 uppercase, 1 number (validated client + server)

**Database Security:**
- **Row Level Security:** Enforced on all tables
- **Prepared Statements:** Supabase client uses parameterized queries
- **Service Role Key:** Only used in API routes, never exposed to client

## Performance Optimization

**Frontend Performance:**
- **Bundle Size Target:** < 200KB initial JS bundle
- **Loading Strategy:** 
  - React Server Components for static content
  - Dynamic imports for heavy components (charts)
  - Lazy load images with Next.js Image
- **Caching Strategy:**
  - Static assets: Immutable cache (1 year)
  - API responses: SWR with 30s stale time
  - Images: CDN cache with ETags

**Backend Performance:**
- **Response Time Target:** < 500ms for API routes, < 200ms for database queries
- **Database Optimization:**
  - Indexes on frequently queried columns
  - Connection pooling (managed by Supabase)
  - Query optimization (select only needed columns)
- **Caching Strategy:**
  - Vercel Edge cache for static API responses
  - Client-side cache with Tanstack Query

**Image Optimization:**
- Compress uploads to max 2MB with Sharp
- Serve optimized images via Supabase CDN
- Use Next.js Image component with automatic format detection (WebP/AVIF)

---
