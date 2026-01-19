# Features & Requirements

This section organizes features into epics aligned with sprint-based development. Each epic contains detailed acceptance criteria (ACs) that will be used to generate user stories.

### Epic 1: User Authentication & Profile Management

**Epic Goal:** Enable secure user registration, login, and profile management so users can safely access their personal expense data.

**User Value:** Users need a secure, private space to store sensitive financial information and access it from any device.

#### Features & Acceptance Criteria

**Feature 1.1: User Registration (MVP - Simplified)**
- AC1: User can register with email and password
- AC2: System validates email format and password strength (min 8 characters, 1 uppercase, 1 number)
- AC3: ~~User receives confirmation email upon successful registration~~ **[Phase 2]**
- AC4: System prevents duplicate email registrations
- AC5: Registration form displays clear error messages for validation failures

**MVP Scope:** Email/password registration WITHOUT email verification. Users can immediately log in after registration.

**Feature 1.2: User Login (MVP - Simplified)**
- AC1: User can log in with registered email and password
- AC2: System maintains secure session after successful login
- AC3: ~~User remains logged in across browser sessions (remember me option)~~ **[Phase 2]**
- AC4: System displays appropriate error for invalid credentials
- AC5: Login redirects to dashboard after successful authentication

**MVP Scope:** Basic session management only. Sessions last 7 days by default (Supabase default).

**Feature 1.3: Password Recovery** **[DEFERRED TO PHASE 2]**
- ~~AC1: User can request password reset via email~~ **[Phase 2]**
- ~~AC2: System sends password reset link to registered email~~ **[Phase 2]**
- ~~AC3: Reset link expires after 24 hours~~ **[Phase 2]**
- ~~AC4: User can set new password using valid reset link~~ **[Phase 2]**
- ~~AC5: System invalidates old password after successful reset~~ **[Phase 2]**

**MVP Scope:** Feature 1.3 entirely moved to Phase 2. MVP users must create new account if password forgotten.

**Feature 1.4: User Profile Management (MVP - Simplified)**
- AC1: User can view current profile information (email, name)
- AC2: ~~User can update profile details (name, preferences)~~ **[Phase 2]**
- AC3: ~~User can change password while logged in~~ **[Phase 2]**
- AC4: ~~System logs out user on all devices after password change~~ **[Phase 2]**
- AC5: ~~User can delete their account and all associated data~~ **[Phase 2]**

**MVP Scope:** Read-only profile view. Updates and deletions deferred to Phase 2.

---

### Epic 2: Receipt Upload & Storage

**Epic Goal:** Provide seamless receipt photo upload and storage functionality that works reliably across mobile and desktop devices.

**User Value:** Users can quickly capture and store receipts immediately after shopping, eliminating paper clutter and ensuring no purchases are forgotten.

#### Features & Acceptance Criteria

**Feature 2.1: Receipt Photo Upload**
- AC1: User can upload receipt photo from mobile device camera
- AC2: User can upload receipt photo from desktop file system
- AC3: System accepts common image formats (JPG, PNG, HEIC)
- AC4: System validates image file size (max 10MB)
- AC5: Upload progress indicator displays during file transfer
- AC6: System displays preview of uploaded image before saving

**Feature 2.2: Receipt Metadata Entry**
- AC1: User can enter store name for receipt
- AC2: User can select/enter purchase date (defaults to today)
- AC3: User can enter total amount spent
- AC4: User can add optional notes to receipt
- AC5: All required fields (store, date, amount) are validated before save
- AC6: System saves receipt data to database with user association

**Feature 2.3: Receipt Image Storage**
- AC1: Uploaded images are stored securely in Supabase Storage
- AC2: Each image has unique identifier linked to receipt record
- AC3: Images are accessible only by the owning user (RLS enforced)
- AC4: System compresses images to optimize storage (max 2MB per image)
- AC5: Failed uploads display clear error message and retry option

**Feature 2.4: Receipt List View**
- AC1: User can view paginated list of all uploaded receipts
- AC2: Each receipt displays thumbnail, store, date, and amount
- AC3: List is sorted by purchase date (newest first) by default
- AC4: User can filter receipts by date range
- AC5: User can search receipts by store name
- AC6: Clicking receipt opens detail view

**Feature 2.5: Receipt Detail & Management**
- AC1: User can view full-size receipt image
- AC2: User can view all receipt metadata (store, date, amount, notes)
- AC3: User can edit receipt metadata after upload
- AC4: User can delete receipt and associated image
- AC5: Delete action requires confirmation to prevent accidents

---

### Epic 3: Expense Categorization System

**Epic Goal:** Enable users to organize receipts into meaningful categories for better spending insights and analysis.

**User Value:** Users can understand where their money goes by grouping expenses into categories like Food, Household, Personal Care, etc.

#### Features & Acceptance Criteria

**Feature 3.1: Default Category Setup**
- AC1: System provides 5 default categories on user registration (Food, Household, Personal Care, Beverages, Other)
- AC2: Each default category has predefined color for visual distinction
- AC3: User can view all available categories
- AC4: Categories are unique per user (user-specific)

**Feature 3.2: Custom Category Creation**
- AC1: User can create new custom categories
- AC2: User can assign name to custom category (max 30 characters)
- AC3: User can select color for custom category from color picker
- AC4: System prevents duplicate category names for same user
- AC5: New categories appear immediately in category selection lists

**Feature 3.3: Category Management**
- AC1: User can edit existing category name and color
- AC2: User can delete categories not assigned to any receipts
- AC3: System prevents deletion of categories assigned to receipts
- AC4: User can reassign category before deleting used category
- AC5: Category list displays number of receipts in each category

**Feature 3.4: Receipt Categorization**
- AC1: User can assign one or more categories to a receipt
- AC2: User can select categories during receipt creation
- AC3: User can add/remove categories from existing receipts
- AC4: Category selection uses checkbox interface for multiple selection
- AC5: Assigned categories display with colored badges on receipt views

**Feature 3.5: Category-Based Filtering**
- AC1: User can filter receipt list by single category
- AC2: User can filter receipt list by multiple categories (AND/OR logic)
- AC3: Filter displays count of matching receipts
- AC4: User can clear filters to return to full list
- AC5: Active filters display as removable chips/tags

---

### Epic 4: Spending Analytics Dashboard

**Epic Goal:** Provide visual insights into spending patterns through charts and summaries that help users understand their supermarket expenses.

**User Value:** Users can identify spending trends, compare periods, and make data-driven decisions about their grocery shopping habits.

#### Features & Acceptance Criteria

**Feature 4.1: Dashboard Overview**
- AC1: Dashboard displays total spending for current month
- AC2: Dashboard shows number of receipts uploaded this month
- AC3: Dashboard displays average spending per receipt
- AC4: Dashboard shows comparison to previous month (% change)
- AC5: User can switch time period (week, month, quarter, year)

**Feature 4.2: Category Breakdown Visualization**
- AC1: Pie chart displays spending distribution across categories
- AC2: Each category uses its assigned color in visualization
- AC3: Chart shows both percentage and dollar amount for each category
- AC4: User can hover/tap for detailed category information
- AC5: Chart updates dynamically when time period changes

**Feature 4.3: Spending Trends Chart**
- AC1: Line chart displays spending over time for selected period
- AC2: User can view daily, weekly, or monthly trend granularity
- AC3: Chart highlights highest and lowest spending periods
- AC4: User can toggle category overlay to see category trends
- AC5: Chart is responsive and readable on mobile devices

**Feature 4.4: Store-Wise Analysis**
- AC1: Table/chart shows total spending per store
- AC2: Display includes visit frequency and average amount per store
- AC3: User can sort stores by total spent, visit count, or average
- AC4: Clicking store name filters dashboard to that store only
- AC5: Store analysis respects selected time period filter

**Feature 4.5: Quick Stats Cards**
- AC1: Card displays most frequent category this period
- AC2: Card shows highest single purchase amount and date
- AC3: Card displays most visited store
- AC4: Card shows days since last receipt upload
- AC5: All cards update based on selected time period

---

### Future Features (Phase 2+)

The following features are planned for post-MVP releases and are not included in the initial sprint planning:

#### Enhanced Analytics (Phase 2)
- **Price tracking** across different stores
- **Budget setting and alerts**
- **Spending predictions** based on historical data
- **Export functionality** for external analysis

#### Advanced Features (Phase 3)
- **Shopping list integration** with spending data
- **Receipt OCR** for automatic data extraction
- **Multi-store price comparison**
- **Seasonal spending pattern analysis**
