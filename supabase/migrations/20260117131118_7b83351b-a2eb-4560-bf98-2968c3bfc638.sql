-- Create storage bucket for creator assets (avatars, banners, merchandise images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'creator-assets', 
  'creator-assets', 
  true,
  10485760, -- 10MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Anyone can view creator assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'creator-assets');

-- Allow creators to upload their own assets
CREATE POLICY "Creators can upload own assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'creator-assets' 
  AND auth.role() = 'authenticated'
);

-- Allow creators to update their own assets
CREATE POLICY "Creators can update own assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'creator-assets' 
  AND auth.role() = 'authenticated'
);

-- Allow creators to delete their own assets
CREATE POLICY "Creators can delete own assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'creator-assets' 
  AND auth.role() = 'authenticated'
);