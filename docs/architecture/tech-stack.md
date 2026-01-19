# Tech Stack

This is the definitive technology selection for the entire project. All development must use these exact versions.

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| Frontend Language | TypeScript | 5.3+ | Type-safe development | Industry standard for React apps, prevents runtime errors |
| Frontend Framework | Next.js | 14.0+ | React framework with App Router | App Router provides RSC, optimal performance, and modern patterns |
| UI Component Library | Radix UI | Latest | Unstyled accessible components | WAI-ARIA compliant, works perfectly with Tailwind CSS |
| CSS Framework | Tailwind CSS | 3.4+ | Utility-first styling | Rapid responsive design, small bundle size with JIT |
| State Management | React Hooks + Zustand | 4.4+ | Client-side state | Zustand for global state, React hooks for local state |
| Backend Language | TypeScript | 5.3+ | API routes and serverless functions | Same language as frontend, type-safe end-to-end |
| Backend Framework | Next.js API Routes | 14.0+ | Serverless API endpoints | Built into Next.js, deployed as Vercel Edge Functions |
| API Style | REST (Supabase Client) | - | Data access pattern | Supabase provides REST API, consider tRPC for custom endpoints |
| Database | PostgreSQL | 15+ | Relational database | Managed by Supabase, supports complex queries and relationships |
| Cache | Vercel Edge Cache | - | Response caching | Built into Vercel, no additional setup needed |
| File Storage | Supabase Storage | - | Receipt image storage | S3-compatible, integrated with RLS, includes CDN |
| Authentication | Supabase Auth | - | User authentication | Email/password, JWT tokens, integrated with Next.js middleware |
| Frontend Testing | Vitest + React Testing Library | Latest | Unit and component tests | Fast, ESM-native, better DX than Jest |
| Backend Testing | Vitest | Latest | API route testing | Same test runner for consistency |
| E2E Testing | Playwright | Latest | End-to-end tests | Cross-browser, reliable, great DX |
| Build Tool | Next.js | 14.0+ | Application bundler | Built-in optimized build process |
| Bundler | Turbopack | - | Module bundler (dev) | Next.js 14 default, faster than Webpack |
| Package Manager | pnpm | 8.0+ | Dependency management | Fast, efficient, supports workspaces |
| IaC Tool | Vercel CLI + Supabase CLI | Latest | Infrastructure management | Declarative deployment configuration |
| CI/CD | GitHub Actions | - | Continuous integration | Free for public repos, Vercel integration |
| Monitoring | Vercel Analytics | - | Performance monitoring | Built-in Core Web Vitals tracking |
| Error Tracking | Sentry | Latest | Error monitoring | Industry standard, React + Next.js integration |
| Logging | Vercel Logs + Supabase Logs | - | Application logging | Built into both platforms |
| Form Handling | React Hook Form | 7.0+ | Form state management | Minimal re-renders, built-in validation |
| Validation | Zod | 3.22+ | Schema validation | Type-safe validation, works with React Hook Form |
| Date Handling | date-fns | 3.0+ | Date manipulation | Tree-shakeable, smaller than Moment.js |
| Charts | Recharts | 2.10+ | Data visualization | React-based, responsive, customizable |

---
