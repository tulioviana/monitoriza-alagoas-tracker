
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create enum for item types
CREATE TYPE public.item_type AS ENUM ('produto', 'combustivel');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  app_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create tracked_items table
CREATE TABLE public.tracked_items (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_type item_type NOT NULL,
  search_criteria JSONB NOT NULL,
  nickname TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create establishments table
CREATE TABLE public.establishments (
  cnpj VARCHAR(14) PRIMARY KEY,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  address_json JSONB NOT NULL
);

-- Create price_history table
CREATE TABLE public.price_history (
  id BIGSERIAL PRIMARY KEY,
  tracked_item_id BIGINT REFERENCES tracked_items(id) ON DELETE CASCADE NOT NULL,
  establishment_cnpj VARCHAR(14) REFERENCES establishments(cnpj) NOT NULL,
  fetch_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  sale_date TIMESTAMP WITH TIME ZONE NOT NULL,
  declared_price NUMERIC(10, 5),
  sale_price NUMERIC(13, 5) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracked_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.establishments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for tracked_items
CREATE POLICY "Users can view own tracked items" ON public.tracked_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tracked items" ON public.tracked_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tracked items" ON public.tracked_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tracked items" ON public.tracked_items
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for establishments (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view establishments" ON public.establishments
  FOR SELECT TO authenticated USING (true);

-- RLS Policies for price_history (users can only see history of their tracked items)
CREATE POLICY "Users can view price history of own tracked items" ON public.price_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tracked_items 
      WHERE tracked_items.id = price_history.tracked_item_id 
      AND tracked_items.user_id = auth.uid()
    )
  );

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.email)
  );
  RETURN new;
END;
$$;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_tracked_items_user_id ON tracked_items(user_id);
CREATE INDEX idx_tracked_items_is_active ON tracked_items(is_active);
CREATE INDEX idx_price_history_tracked_item_id ON price_history(tracked_item_id);
CREATE INDEX idx_price_history_fetch_date ON price_history(fetch_date);
