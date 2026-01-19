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
  store_name VARCHAR(255) NOT NULL,
  purchase_date DATE NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
  image_url TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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

-- Receipt Categories junction table (many-to-many)
CREATE TABLE receipt_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_id UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(receipt_id, category_id) -- Prevent duplicate assignments
);

-- Indexes for performance
CREATE INDEX idx_receipts_user_id ON receipts(user_id);
CREATE INDEX idx_receipts_purchase_date ON receipts(purchase_date DESC);
CREATE INDEX idx_receipts_user_date ON receipts(user_id, purchase_date DESC);
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_receipt_categories_receipt_id ON receipt_categories(receipt_id);
CREATE INDEX idx_receipt_categories_category_id ON receipt_categories(category_id);

-- Row Level Security (RLS) Policies
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_categories ENABLE ROW LEVEL SECURITY;

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

-- Receipt Categories RLS: Users can only manage their own receipt-category links
CREATE POLICY "Users can view own receipt_categories"
  ON receipt_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM receipts
      WHERE receipts.id = receipt_categories.receipt_id
      AND receipts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own receipt_categories"
  ON receipt_categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM receipts
      WHERE receipts.id = receipt_categories.receipt_id
      AND receipts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own receipt_categories"
  ON receipt_categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM receipts
      WHERE receipts.id = receipt_categories.receipt_id
      AND receipts.user_id = auth.uid()
    )
  );

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
