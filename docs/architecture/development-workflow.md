# Development Workflow

## Local Development Setup

### Prerequisites

```bash
# Install Node.js 18+
node --version  # Should be 18.x or higher

# Install pnpm
npm install -g pnpm

# Install Supabase CLI
brew install supabase/tap/supabase  # macOS
# or
scoop install supabase  # Windows
```

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd daticket

# Install dependencies
pnpm install

# Copy environment variables
cp apps/web/.env.local.example apps/web/.env.local

# Edit .env.local with your Supabase credentials
# Get from https://app.supabase.com

# Run database migrations
cd packages/database
supabase db push

# Generate TypeScript types from database
pnpm run generate:types

# Return to root
cd ../..

# Start development server
pnpm dev
```

### Development Commands

```bash
# Start all services (Next.js dev server)
pnpm dev

# Start frontend only
pnpm --filter web dev

# Run tests
pnpm test                    # All tests
pnpm test:unit               # Unit tests only
pnpm test:e2e                # E2E tests only

# Linting and formatting
pnpm lint                    # Run ESLint
pnpm format                  # Run Prettier

# Database commands
pnpm db:push                 # Push migrations to database
pnpm db:reset                # Reset database (caution!)
pnpm generate:types          # Generate TypeScript types from DB

# Build for production
pnpm build
```

## Environment Configuration

### Required Environment Variables

```bash
# Frontend (.env.local in apps/web)
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Backend (same file)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
SENTRY_DSN=your-sentry-dsn  # For error tracking
```

---
