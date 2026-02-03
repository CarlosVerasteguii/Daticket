# Database Schema

## PostgreSQL Schema (Supabase)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
-- Note: Supabase Auth manages the auth.users table
-- We can add a profiles table if we need extended user data

-- Receipts table
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_name VARCHAR(255),
  purchase_date DATE,
  total_amount DECIMAL(10, 2) CHECK (total_amount >= 0),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  primary_file_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Receipt files table (Supabase Storage objects referenced by path)
CREATE TABLE receipt_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket_id TEXT NOT NULL DEFAULT 'receipts' CHECK (bucket_id = 'receipts'),
  path TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('original', 'thumbnail', 'attachment')),
  mime_type TEXT,
  size_bytes BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(bucket_id, path)
);

-- Link receipts.primary_file_id -> receipt_files.id
ALTER TABLE receipts
  ADD CONSTRAINT receipts_primary_file_id_fkey
  FOREIGN KEY (primary_file_id)
  REFERENCES receipt_files(id)
  ON DELETE SET NULL;

-- Receipt items table (optional line items for analytics)
CREATE TABLE receipt_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(30) NOT NULL,
  color VARCHAR(7) NOT NULL, -- Hex color
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name) -- Prevent duplicate category names per user
);

-- Indexes for performance
CREATE INDEX idx_receipts_user_id ON receipts(user_id);
CREATE INDEX idx_receipts_purchase_date ON receipts(purchase_date DESC);
CREATE INDEX idx_receipts_user_date ON receipts(user_id, purchase_date DESC);
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_receipt_files_receipt_id ON receipt_files(receipt_id);
CREATE INDEX idx_receipt_items_receipt_id ON receipt_items(receipt_id);

-- Row Level Security (RLS) Policies
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Receipts RLS: Users can only access their own receipts
CREATE POLICY "Users can view own receipts"
  ON receipts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own receipts"
  ON receipts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own receipts"
  ON receipts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own receipts"
  ON receipts FOR DELETE
  USING (auth.uid() = user_id);

-- Receipt files RLS: Users can only access their own file records
CREATE POLICY "Users can view own receipt_files"
  ON receipt_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own receipt_files"
  ON receipt_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own receipt_files"
  ON receipt_files FOR DELETE
  USING (auth.uid() = user_id);

-- Receipt items RLS: Users can only access their own items
CREATE POLICY "Users can view own receipt_items"
  ON receipt_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own receipt_items"
  ON receipt_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own receipt_items"
  ON receipt_items FOR DELETE
  USING (auth.uid() = user_id);

-- Categories RLS: Users can only access their own categories
CREATE POLICY "Users can view own categories"
  ON categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON categories FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_receipts_updated_at
  BEFORE UPDATE ON receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to seed default categories for new users
CREATE OR REPLACE FUNCTION create_default_categories_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO categories (user_id, name, color, is_default) VALUES
    (NEW.id, 'Food', '#4CAF50', TRUE),
    (NEW.id, 'Household', '#2196F3', TRUE),
    (NEW.id, 'Personal Care', '#FF9800', TRUE),
    (NEW.id, 'Beverages', '#9C27B0', TRUE),
    (NEW.id, 'Other', '#607D8B', TRUE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default categories when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_categories_for_user();
```

---
