-- Add parking_type column to parking_slots table
ALTER TABLE public.parking_slots 
ADD COLUMN parking_type text NOT NULL DEFAULT 'regular' 
CHECK (parking_type IN ('regular', 'ev', 'handicapped', 'cargo'));

-- Update some existing slots to have different parking types for demo
UPDATE public.parking_slots 
SET parking_type = 'ev' 
WHERE slot_number LIKE '%1' OR slot_number LIKE '%6';

UPDATE public.parking_slots 
SET parking_type = 'handicapped' 
WHERE slot_number LIKE '%2' OR slot_number LIKE '%7';

UPDATE public.parking_slots 
SET parking_type = 'cargo' 
WHERE slot_number LIKE '%3' OR slot_number LIKE '%8';

-- Add comment for documentation
COMMENT ON COLUMN public.parking_slots.parking_type IS 'Type of parking slot: regular, ev (electric vehicle), handicapped, or cargo';