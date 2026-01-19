# Data Models

## Core Data Models

### User Model

**Purpose:** Represents a registered user of the application. Managed by Supabase Auth with extended profile information.

**Key Attributes:**
- `id`: UUID - Primary key (from Supabase Auth)
- `email`: string - User's email address (from Supabase Auth)
- `created_at`: timestamp - Account creation date
- `updated_at`: timestamp - Last profile update

**TypeScript Interface:**

```typescript
interface User {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}
```

**Relationships:**
- One-to-Many with Receipts
- One-to-Many with Categories

---

### Receipt Model

**Purpose:** Represents a single supermarket receipt uploaded by a user.

**Key Attributes:**
- `id`: UUID - Primary key
- `user_id`: UUID - Foreign key to User (with RLS)
- `store_name`: string - Name of the store
- `purchase_date`: date - Date of purchase
- `total_amount`: decimal - Total amount spent
- `image_url`: string - Supabase Storage URL
- `notes`: string (optional) - User notes
- `created_at`: timestamp - Upload timestamp
- `updated_at`: timestamp - Last edit timestamp

**TypeScript Interface:**

```typescript
interface Receipt {
  id: string;
  user_id: string;
  store_name: string;
  purchase_date: string; // ISO 8601 date
  total_amount: number;
  image_url: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Virtual fields (joined)
  categories?: Category[];
}
```

**Relationships:**
- Many-to-One with User
- Many-to-Many with Categories (through ReceiptCategory junction)

---

### Category Model

**Purpose:** Represents an expense category that users can assign to receipts.

**Key Attributes:**
- `id`: UUID - Primary key
- `user_id`: UUID - Foreign key to User (user-specific categories)
- `name`: string - Category name (max 30 chars)
- `color`: string - Hex color code for UI
- `is_default`: boolean - Whether it's a system default category
- `created_at`: timestamp - Creation timestamp

**TypeScript Interface:**

```typescript
interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string; // Hex color, e.g., "#FF5733"
  is_default: boolean;
  created_at: string;
  // Virtual fields
  receipt_count?: number;
}
```

**Relationships:**
- Many-to-One with User
- Many-to-Many with Receipts (through ReceiptCategory junction)

---

### ReceiptCategory Model (Junction Table)

**Purpose:** Links receipts to categories in a many-to-many relationship.

**Key Attributes:**
- `id`: UUID - Primary key
- `receipt_id`: UUID - Foreign key to Receipt
- `category_id`: UUID - Foreign key to Category
- `created_at`: timestamp - Association timestamp

**TypeScript Interface:**

```typescript
interface ReceiptCategory {
  id: string;
  receipt_id: string;
  category_id: string;
  created_at: string;
}
```

**Relationships:**
- Many-to-One with Receipt
- Many-to-One with Category

---
