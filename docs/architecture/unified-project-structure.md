# Unified Project Structure

```
daticket/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Run tests on PR
│       └── deploy.yml                # Deploy to Vercel
├── apps/
│   └── web/                          # Next.js application
│       ├── src/
│       │   ├── app/                  # Next.js App Router
│       │   │   ├── (auth)/           # Auth route group
│       │   │   ├── (dashboard)/      # Protected route group
│       │   │   ├── api/              # API routes
│       │   │   ├── layout.tsx
│       │   │   └── page.tsx
│       │   ├── components/           # React components
│       │   │   ├── auth/
│       │   │   ├── receipts/
│       │   │   ├── categories/
│       │   │   ├── analytics/
│       │   │   └── ui/
│       │   ├── services/             # API service layer
│       │   │   ├── receipts.service.ts
│       │   │   ├── categories.service.ts
│       │   │   └── analytics.service.ts
│       │   ├── hooks/                # Custom React hooks
│       │   │   ├── useReceipts.ts
│       │   │   ├── useCategories.ts
│       │   │   └── useAnalytics.ts
│       │   ├── stores/               # Zustand stores
│       │   │   └── app.store.ts
│       │   ├── lib/                  # Utilities
│       │   │   ├── supabase.ts
│       │   │   └── utils.ts
│       │   └── middleware.ts
│       ├── public/                   # Static assets
│       ├── tests/                    # Tests
│       │   ├── unit/
│       │   ├── integration/
│       │   └── e2e/
│       ├── .env.local.example
│       ├── next.config.js
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       └── package.json
├── packages/
│   ├── database/                     # Supabase schema and migrations
│   │   ├── migrations/
│   │   │   ├── 20250115_initial_schema.sql
│       │   └── 20250115_seed_defaults.sql
│   │   ├── types/                    # Generated TypeScript types
│   │   │   └── database.types.ts
│   │   └── package.json
│   └── shared/                       # Shared TypeScript types and utils
│       ├── src/
│       │   ├── types/
│       │   │   ├── receipt.ts
│       │   │   ├── category.ts
│       │   │   └── index.ts
│       │   ├── api/
│       │   │   └── client.ts
│       │   └── utils/
│       │       └── date.ts
│       ├── tsconfig.json
│       └── package.json
├── docs/                             # Documentation
│   ├── prd/
│   │   ├── prd.md
│   │   └── PRD-UPDATE-SUMMARY.md
│   ├── architecture.md               # This document
│   └── README.md
├── scripts/                          # Build and utility scripts
│   ├── generate-types.sh             # Generate Supabase types
│   └── seed-db.sh                    # Seed database
├── .env.example                      # Environment template
├── .gitignore
├── package.json                      # Root package.json with workspaces
├── pnpm-workspace.yaml               # pnpm workspace config
├── turbo.json                        # Optional: Turborepo config
└── README.md
```

---
