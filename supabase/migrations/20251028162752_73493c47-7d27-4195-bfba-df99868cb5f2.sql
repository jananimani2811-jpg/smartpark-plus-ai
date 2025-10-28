-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  wallet_balance DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create parking_areas table
CREATE TABLE public.parking_areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  total_slots INTEGER NOT NULL,
  hourly_rate DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for parking_areas
ALTER TABLE public.parking_areas ENABLE ROW LEVEL SECURITY;

-- Public read access to parking areas
CREATE POLICY "Anyone can view parking areas"
  ON public.parking_areas FOR SELECT
  USING (true);

-- Create parking_slots table
CREATE TABLE public.parking_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parking_area_id UUID NOT NULL REFERENCES public.parking_areas ON DELETE CASCADE,
  slot_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parking_area_id, slot_number)
);

-- Enable RLS for parking_slots
ALTER TABLE public.parking_slots ENABLE ROW LEVEL SECURITY;

-- Public read access to parking slots
CREATE POLICY "Anyone can view parking slots"
  ON public.parking_slots FOR SELECT
  USING (true);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles ON DELETE CASCADE,
  parking_slot_id UUID NOT NULL REFERENCES public.parking_slots ON DELETE CASCADE,
  parking_area_id UUID NOT NULL REFERENCES public.parking_areas ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  actual_end_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  total_amount DECIMAL(10, 2) NOT NULL,
  fine_amount DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for bookings
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Bookings policies
CREATE POLICY "Users can view their own bookings"
  ON public.bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = user_id);

-- Create payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.bookings ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('wallet', 'card', 'qr', 'cash')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Payments policies
CREATE POLICY "Users can view their own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payments"
  ON public.payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample parking areas
INSERT INTO public.parking_areas (name, address, latitude, longitude, total_slots, hourly_rate) VALUES
  ('Downtown Plaza', '123 Main St, Downtown', 40.7128, -74.0060, 50, 5.00),
  ('City Center Mall', '456 Center Ave, City Center', 40.7589, -73.9851, 100, 4.50),
  ('Airport Parking', '789 Airport Rd, Airport', 40.6413, -73.7781, 200, 3.00);

-- Insert sample parking slots for each area
INSERT INTO public.parking_slots (parking_area_id, slot_number, status)
SELECT 
  pa.id,
  'A' || gs.n,
  CASE 
    WHEN random() < 0.3 THEN 'occupied'
    WHEN random() < 0.5 THEN 'reserved'
    ELSE 'available'
  END
FROM public.parking_areas pa
CROSS JOIN generate_series(1, 20) AS gs(n);