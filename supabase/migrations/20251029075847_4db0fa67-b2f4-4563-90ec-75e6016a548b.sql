-- Fix 1: Update handle_new_user function to set search_path (fixes SUPA_function_search_path_mutable)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$function$;

-- Fix 2: Create security definer function to safely update parking slot status (fixes MISSING_RLS)
CREATE OR REPLACE FUNCTION public.update_parking_slot_status(
  _slot_id uuid,
  _new_status text,
  _booking_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the user owns the booking if booking_id is provided
  IF _booking_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.bookings 
      WHERE id = _booking_id 
      AND user_id = auth.uid()
      AND parking_slot_id = _slot_id
    ) THEN
      RAISE EXCEPTION 'Unauthorized: You do not own this booking';
    END IF;
  END IF;
  
  -- Update the slot status
  UPDATE public.parking_slots
  SET status = _new_status
  WHERE id = _slot_id;
END;
$$;

-- Fix 3: Create validation function for bookings (fixes INPUT_VALIDATION)
CREATE OR REPLACE FUNCTION public.validate_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _hourly_rate numeric;
  _expected_amount numeric;
  _duration_hours numeric;
BEGIN
  -- Validate start_time is in the future
  IF NEW.start_time <= now() THEN
    RAISE EXCEPTION 'Start time must be in the future';
  END IF;
  
  -- Validate end_time is after start_time
  IF NEW.end_time <= NEW.start_time THEN
    RAISE EXCEPTION 'End time must be after start time';
  END IF;
  
  -- Calculate duration in hours
  _duration_hours := EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 3600;
  
  -- Validate duration is reasonable (between 1 and 24 hours)
  IF _duration_hours < 1 OR _duration_hours > 24 THEN
    RAISE EXCEPTION 'Duration must be between 1 and 24 hours';
  END IF;
  
  -- Check if slot is available
  IF EXISTS (
    SELECT 1 FROM public.parking_slots
    WHERE id = NEW.parking_slot_id
    AND status != 'available'
  ) THEN
    RAISE EXCEPTION 'Parking slot is not available';
  END IF;
  
  -- Check for overlapping bookings on the same slot
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE parking_slot_id = NEW.parking_slot_id
    AND status IN ('active', 'pending')
    AND (
      (NEW.start_time >= start_time AND NEW.start_time < end_time)
      OR (NEW.end_time > start_time AND NEW.end_time <= end_time)
      OR (NEW.start_time <= start_time AND NEW.end_time >= end_time)
    )
  ) THEN
    RAISE EXCEPTION 'Slot already booked for this time period';
  END IF;
  
  -- Validate total_amount calculation
  SELECT hourly_rate INTO _hourly_rate
  FROM public.parking_areas
  WHERE id = NEW.parking_area_id;
  
  _expected_amount := _hourly_rate * _duration_hours;
  
  -- Allow 1 rupee tolerance for rounding
  IF ABS(NEW.total_amount - _expected_amount) > 1 THEN
    RAISE EXCEPTION 'Invalid total amount. Expected: %, Got: %', _expected_amount, NEW.total_amount;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for booking validation
DROP TRIGGER IF EXISTS validate_booking_trigger ON public.bookings;
CREATE TRIGGER validate_booking_trigger
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_booking();

-- Fix 4: Create payment processing function with wallet balance check (fixes CLIENT_SIDE_AUTH)
CREATE OR REPLACE FUNCTION public.process_payment(
  _booking_id uuid,
  _payment_method text,
  _amount numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _booking_amount numeric;
  _wallet_balance numeric;
  _payment_id uuid;
BEGIN
  -- Get user ID
  _user_id := auth.uid();
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Verify booking exists and belongs to user
  SELECT total_amount INTO _booking_amount
  FROM public.bookings
  WHERE id = _booking_id
  AND user_id = _user_id
  AND status = 'active';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found or already completed';
  END IF;
  
  -- Verify amount matches
  IF _amount != _booking_amount THEN
    RAISE EXCEPTION 'Payment amount does not match booking amount';
  END IF;
  
  -- For wallet payments, check and deduct balance
  IF _payment_method = 'wallet' THEN
    SELECT wallet_balance INTO _wallet_balance
    FROM public.profiles
    WHERE id = _user_id;
    
    IF _wallet_balance < _amount THEN
      RAISE EXCEPTION 'Insufficient wallet balance';
    END IF;
    
    -- Deduct from wallet
    UPDATE public.profiles
    SET wallet_balance = wallet_balance - _amount
    WHERE id = _user_id;
  END IF;
  
  -- For card/UPI/QR, payment gateway integration would go here
  -- For now, we'll mark as pending and require manual verification
  
  -- Create payment record
  INSERT INTO public.payments (
    booking_id,
    user_id,
    amount,
    payment_method,
    status
  ) VALUES (
    _booking_id,
    _user_id,
    _amount,
    _payment_method,
    CASE 
      WHEN _payment_method = 'wallet' THEN 'completed'
      ELSE 'pending'
    END
  ) RETURNING id INTO _payment_id;
  
  -- Update booking status only if payment is completed
  IF _payment_method = 'wallet' THEN
    UPDATE public.bookings
    SET status = 'completed'
    WHERE id = _booking_id;
    
    -- Release parking slot
    UPDATE public.parking_slots
    SET status = 'available'
    WHERE id = (SELECT parking_slot_id FROM public.bookings WHERE id = _booking_id);
  END IF;
  
  RETURN _payment_id;
END;
$$;

-- Add status constraints for data integrity
ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS bookings_status_check;

ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_status_check 
CHECK (status IN ('pending', 'active', 'completed', 'cancelled'));

ALTER TABLE public.parking_slots 
DROP CONSTRAINT IF EXISTS parking_slots_status_check;

ALTER TABLE public.parking_slots 
ADD CONSTRAINT parking_slots_status_check 
CHECK (status IN ('available', 'reserved', 'occupied'));

ALTER TABLE public.payments 
DROP CONSTRAINT IF EXISTS payments_status_check;

ALTER TABLE public.payments 
ADD CONSTRAINT payments_status_check 
CHECK (status IN ('pending', 'completed', 'failed', 'refunded'));

-- Create index for better performance on overlapping booking checks
CREATE INDEX IF NOT EXISTS idx_bookings_slot_time 
ON public.bookings(parking_slot_id, start_time, end_time) 
WHERE status IN ('active', 'pending');