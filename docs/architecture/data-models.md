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
- `category_id`: UUID (optional) - Foreign key to Category
- `primary_file_id`: UUID (optional) - Foreign key to ReceiptFile (current primary image)
- `notes`: string (optional) - User notes
- `created_at`: timestamp - Upload timestamp
- `updated_at`: timestamp - Last edit timestamp

**TypeScript Interface:**

```typescript
interface Receipt {
  id: string;
  user_id: string;
  store_name: string | null;
  purchase_date: string | null; // ISO 8601 date
  total_amount: number | null;
  category_id?: string | null;
  primary_file_id?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Virtual fields (joined)
  category?: Category | null;
  primary_file?: ReceiptFile | null;
  items?: ReceiptItem[];
}
```

**Relationships:**
- Many-to-One with User
- Many-to-One with Category (optional)
- One-to-Many with ReceiptFile
- One-to-Many with ReceiptItem

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
- One-to-Many with Receipts

---

### ReceiptFile Model

**Purpose:** Represents a file stored in Supabase Storage associated with a receipt (e.g., original image, thumbnail, attachments).

**Key Attributes:**
- `id`: UUID - Primary key
- `receipt_id`: UUID - Foreign key to Receipt
- `user_id`: UUID - Foreign key to User (with RLS)
- `bucket_id`: string - Storage bucket (e.g., `"receipts"`)
- `path`: string - Object path inside the bucket (e.g., `{user_id}/{receipt_id}/original.jpg`)
- `kind`: string - `"original" | "thumbnail" | "attachment"`
- `mime_type`: string (optional) - MIME type (e.g., `image/jpeg`)
- `size_bytes`: number (optional) - File size in bytes
- `created_at`: timestamp - Creation timestamp

**TypeScript Interface:**

```typescript
interface ReceiptFile {
  id: string;
  receipt_id: string;
  user_id: string;
  bucket_id: string;
  path: string;
  kind: 'original' | 'thumbnail' | 'attachment';
  mime_type?: string | null;
  size_bytes?: number | null;
  created_at: string;
}
```

**Relationships:**
- Many-to-One with Receipt
- Many-to-One with User

---

### ReceiptItem Model

**Purpose:** Represents individual line items extracted from a receipt for price history and analytics.

**Key Attributes:**
- `id`: UUID - Primary key
- `receipt_id`: UUID - Foreign key to Receipt
- `user_id`: UUID - Foreign key to User (with RLS)
- `name`: string - Item name
- `quantity`: number - Quantity
- `unit_price`: number - Unit price
- `total_price`: number - Total price for this item
- `created_at`: timestamp - Creation timestamp

**TypeScript Interface:**

```typescript
interface ReceiptItem {
  id: string;
  receipt_id: string;
  user_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}
```

**Relationships:**
- Many-to-One with Receipt
- Many-to-One with User
