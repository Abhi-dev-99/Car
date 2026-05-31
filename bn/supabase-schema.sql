-- ============================================
-- AutoVahan - Indian Cars Showroom Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cars Table
CREATE TABLE IF NOT EXISTS cars (
  id BIGSERIAL PRIMARY KEY,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  starting_price BIGINT NOT NULL,
  price_display TEXT NOT NULL,
  year INTEGER NOT NULL,
  body_type TEXT NOT NULL,
  fuel_type TEXT NOT NULL,
  transmission TEXT NOT NULL,
  mileage TEXT NOT NULL,
  engine TEXT NOT NULL,
  power TEXT NOT NULL,
  torque TEXT NOT NULL,
  seating INTEGER NOT NULL,
  boot_space INTEGER NOT NULL,
  safety_rating INTEGER NOT NULL DEFAULT 0,
  image_url TEXT NOT NULL,
  images JSONB NOT NULL DEFAULT '[]',
  description TEXT NOT NULL,
  features JSONB NOT NULL DEFAULT '{"safety": [], "comfort": [], "technology": []}',
  variants JSONB NOT NULL DEFAULT '[]',
  rating DECIMAL(2,1) NOT NULL DEFAULT 4.0,
  popular BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inquiries / Test Drive Requests Table
CREATE TABLE IF NOT EXISTS inquiries (
  id BIGSERIAL PRIMARY KEY,
  car_id BIGINT REFERENCES cars(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  message TEXT,
  preferred_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_cars_brand ON cars(brand);
CREATE INDEX IF NOT EXISTS idx_cars_body_type ON cars(body_type);
CREATE INDEX IF NOT EXISTS idx_cars_fuel_type ON cars(fuel_type);
CREATE INDEX IF NOT EXISTS idx_cars_starting_price ON cars(starting_price);
CREATE INDEX IF NOT EXISTS idx_cars_popular ON cars(popular);
CREATE INDEX IF NOT EXISTS idx_cars_rating ON cars(rating DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_car_id ON inquiries(car_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);

-- Enable Row Level Security (RLS)
ALTER TABLE cars ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- Public read access for cars (anyone can view the catalog)
CREATE POLICY "Cars are viewable by everyone" 
  ON cars FOR SELECT 
  USING (true);

-- Only service role can insert/update/delete cars (via backend)
CREATE POLICY "Service role can manage cars" 
  ON cars FOR ALL 
  USING (auth.role() = 'service_role');

-- Anyone can create inquiries (public form submissions)
CREATE POLICY "Anyone can submit inquiries" 
  ON inquiries FOR INSERT 
  WITH CHECK (true);

-- Service role can view all inquiries
CREATE POLICY "Service role can view all inquiries" 
  ON inquiries FOR SELECT 
  USING (auth.role() = 'service_role');

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cars_updated_at 
  BEFORE UPDATE ON cars 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Full-text search index (optional but nice for search)
CREATE INDEX IF NOT EXISTS idx_cars_search ON cars 
  USING GIN (to_tsvector('english', brand || ' ' || model || ' ' || description));

COMMENT ON TABLE cars IS 'Main catalog of 55+ Indian market cars with full specifications';
COMMENT ON TABLE inquiries IS 'Customer test drive / quote requests from the website';
