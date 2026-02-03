# Technical Specifications

### Architecture Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js       │    │   Supabase      │    │   PostgreSQL    │
│   Frontend      │◄──►│   Backend       │◄──►│   Database      │
│                 │    │   (API/Auth)    │    │                 │
│ - Responsive UI │    │ - Authentication│    │ - User Data     │
│ - Image Upload  │    │ - File Storage  │    │ - Receipt Data  │
│ - Data Display  │    │ - Database      │    │ - Categories    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Technology Stack

#### Frontend
- **Framework:** Next.js 16+ with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS (responsive design)
- **State Management:** React hooks + context
- **Image Handling:** Next.js Image component

#### Backend & Database
- **Backend-as-a-Service:** Supabase
- **Database:** PostgreSQL (via Supabase)
- **Authentication:** Supabase Auth (email/password)
- **File Storage:** Supabase Storage (receipt images)
- **API:** Supabase REST/GraphQL APIs

#### Development & Deployment
- **Version Control:** Git + GitHub
- **Deployment:** Vercel
- **Environment:** Node.js 18+
- **Package Manager:** npm/yarn

### Data Model

#### Core Entities

**Users Table** (Supabase Auth built-in)
- id (UUID, Primary Key)
- email (String, Unique)
- created_at (Timestamp)
- updated_at (Timestamp)

**Receipts Table**
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key → Users)
- store_name (String)
- purchase_date (Date)
- total_amount (Decimal)
- category_id (UUID, Foreign Key → Categories, Optional)
- primary_file_id (UUID, Foreign Key → ReceiptFiles, Optional)
- notes (Text, Optional)
- created_at (Timestamp)
- updated_at (Timestamp)

**ReceiptFiles Table**
- id (UUID, Primary Key)
- receipt_id (UUID, Foreign Key → Receipts)
- user_id (UUID, Foreign Key → Users)
- bucket_id (String, e.g. `"receipts"`)
- path (String, Storage object path: `{user_id}/{receipt_id}/...`)
- kind (String: `original|thumbnail|attachment`)
- mime_type (String, Optional)
- size_bytes (Number, Optional)
- created_at (Timestamp)

**ReceiptItems Table** (Optional, for analytics)
- id (UUID, Primary Key)
- receipt_id (UUID, Foreign Key → Receipts)
- user_id (UUID, Foreign Key → Users)
- name (String)
- quantity (Number)
- unit_price (Number)
- total_price (Number)
- created_at (Timestamp)

**Categories Table**
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key → Users)
- name (String)
- color (String, Hex color for UI)
- created_at (Timestamp)

### API Endpoints

#### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

#### Receipts
- `GET /api/receipts` - List user's receipts
- `POST /api/receipts` - Create new receipt
- `GET /api/receipts/[id]` - Get specific receipt
- `PUT /api/receipts/[id]` - Update receipt
- `DELETE /api/receipts/[id]` - Delete receipt
- `POST /api/receipts/[id]/upload` - Upload receipt image

#### Analytics
- `GET /api/analytics/spending` - Spending overview
- `GET /api/analytics/categories` - Category breakdown
- `GET /api/analytics/trends` - Spending trends

### Non-Functional Requirements (NFRs)

These requirements define the quality attributes that the system must meet across all features.

#### Security (SEC)

**SEC-1: Authentication Security**
- Password hashing handled by Supabase Auth (bcrypt, industry standard)
- JWT token management with secure httpOnly cookies
- Session timeout after 7 days of inactivity
- Secure password reset flow with time-limited tokens

**SEC-2: Authorization & Data Isolation**
- Row Level Security (RLS) enforced on all database tables
- Users can only access their own receipts, categories, and data
- API endpoints validate user ownership before data operations
- Admin operations (if added) require separate role-based access

**SEC-3: Data Protection**
- Receipt images encrypted at rest in Supabase Storage
- HTTPS/TLS for all data transmission
- No sensitive data logged or exposed in error messages
- GDPR compliance: user data export and deletion capabilities

**SEC-4: Input Validation**
- All user inputs sanitized to prevent XSS attacks
- SQL injection prevention via Supabase parameterized queries
- File upload validation (type, size, content verification)
- CORS configuration restricted to application domain

#### Performance (PERF)

**PERF-1: Page Load Performance**
- Initial page load < 2 seconds on 3G mobile connection
- Time to Interactive (TTI) < 3 seconds
- Largest Contentful Paint (LCP) < 2.5 seconds
- First Input Delay (FID) < 100ms

**PERF-2: Image Handling**
- Image compression on upload (target: max 2MB per image)
- Progressive image loading with low-quality placeholders
- Lazy loading for receipt thumbnails in list views
- Responsive image delivery based on device size

**PERF-3: Data Query Performance**
- Receipt list queries return results < 500ms
- Dashboard analytics calculate < 1 second
- Category filtering operations < 300ms
- Database queries optimized with proper indexing

**PERF-4: Scalability Targets**
- Support up to 1,000 receipts per user without degradation
- Handle 100 concurrent users without performance issues
- Image storage scales with user count (Supabase auto-scaling)

#### Reliability (REL)

**REL-1: Availability**
- 99% uptime target for web application
- Graceful degradation when backend services unavailable
- Offline-first architecture not required for MVP, but network errors handled gracefully

**REL-2: Data Integrity**
- Receipt uploads are transactional (image + metadata committed together)
- Failed uploads don't leave orphaned records
- Database constraints prevent data inconsistencies
- Automatic retry mechanism for transient network failures

**REL-3: Error Handling**
- User-friendly error messages for all failure scenarios
- Detailed error logging for debugging (without exposing sensitive data)
- Failed operations allow user retry without data loss
- Network timeout handling with clear user feedback

**REL-4: Backup & Recovery**
- Supabase automated daily database backups
- Point-in-time recovery capability (Supabase feature)
- User can export their data for personal backup

#### Usability (USE)

**USE-1: Responsive Design**
- Mobile-first design approach
- Optimized layouts for: mobile (320px-767px), tablet (768px-1023px), desktop (1024px+)
- Touch-friendly UI elements (min 44x44px tap targets)
- Readable font sizes across all devices (min 16px base)

**USE-2: Accessibility**
- WCAG 2.1 Level AA compliance target
- Semantic HTML structure
- Keyboard navigation support for all interactive elements
- Color contrast ratios meet accessibility standards (4.5:1 for normal text)
- Alt text for all images
- Screen reader compatibility

**USE-3: User Experience**
- Maximum 3 clicks to reach any feature from dashboard
- Clear visual feedback for all user actions
- Consistent UI patterns across all features
- Loading states for async operations
- Success/error notifications for critical actions

**USE-4: Onboarding**
- First-time user sees brief feature tour on dashboard
- Helpful empty states with clear calls to action
- Tooltips for non-obvious features
- Sample data option for testing features (optional)

#### Maintainability (MAINT)

**MAINT-1: Code Quality**
- TypeScript strict mode enabled
- ESLint and Prettier configured for code consistency
- Component-based architecture with clear separation of concerns
- Code comments for complex business logic

**MAINT-2: Testing**
- Unit test coverage > 70% for business logic
- Integration tests for critical user flows
- E2E tests for core features (auth, upload, dashboard)
- Manual testing checklist for each release

**MAINT-3: Documentation**
- README with setup instructions
- API endpoint documentation
- Database schema documentation
- Inline code documentation for complex functions

**MAINT-4: Monitoring & Observability**
- Error tracking integrated (e.g., Sentry)
- Performance monitoring (Vercel Analytics)
- User analytics (basic usage metrics)
- Database query performance monitoring (Supabase dashboard)

