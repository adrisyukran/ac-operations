-- Phase 3: Add completion fields to orders table
-- Add fields for job completion: work_done, extra_charges, remarks, final_amount, photo_urls

ALTER TABLE orders 
ADD COLUMN work_done TEXT,
ADD COLUMN extra_charges NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN remarks TEXT,
ADD COLUMN final_amount NUMERIC(10, 2),
ADD COLUMN photo_urls TEXT[] DEFAULT '{}';

-- Create storage bucket for job photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('job-photos', 'job-photos', true);

-- Set up storage policy to allow authenticated uploads
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'job-photos');

CREATE POLICY "Allow public access" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'job-photos');
