# Monitoring and Observability

## Monitoring Stack

- **Frontend Monitoring:** Vercel Analytics (Core Web Vitals, page views, performance)
- **Backend Monitoring:** Vercel Logs (API route performance, errors)
- **Error Tracking:** Sentry (runtime errors, unhandled exceptions)
- **Database Monitoring:** Supabase Dashboard (query performance, connections)
- **Uptime Monitoring:** Vercel (automatic health checks)

## Key Metrics

**Frontend Metrics:**
- **Core Web Vitals**
  - LCP (Largest Contentful Paint): Target < 2.5s
  - FID (First Input Delay): Target < 100ms
  - CLS (Cumulative Layout Shift): Target < 0.1
- **JavaScript Errors:** Track error rates and types
- **API Response Times:** Monitor calls from frontend
- **User Interactions:** Track button clicks, form submissions

**Backend Metrics:**
- **Request Rate:** Requests per minute by endpoint
- **Error Rate:** 4xx/5xx errors percentage (target < 1%)
- **Response Time:** P50, P95, P99 latencies (target P95 < 500ms)
- **Database Query Performance:** Query execution time

**Database Metrics:**
- **Active Connections:** Monitor connection pool usage
- **Slow Queries:** Queries taking > 1000ms
- **Table Size Growth:** Monitor storage usage
- **Cache Hit Rate:** Supabase query cache efficiency

## Sentry Integration

```typescript
// apps/web/src/app/layout.tsx
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of transactions
  integrations: [
    new Sentry.BrowserTracing(),
  ],
});
```

---
