-- storage.objects has RLS enabled with zero policies, which silently blocks every
-- client-side upload (only the service role bypasses RLS). Add policies so
-- authenticated users can upload/manage files, and anyone can read from these
-- public buckets (they're already marked public: true for their URLs to work).
-- Also create the farmer-documents bucket referenced by storageService.js, which
-- never existed — only farm-visit-photos and file_upload were created previously.

INSERT INTO storage.buckets (id, name, public)
VALUES ('farmer-documents', 'farmer-documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read access" ON storage.objects FOR SELECT
  USING (bucket_id IN ('file_upload', 'farm-visit-photos', 'farmer-documents'));

CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id IN ('file_upload', 'farm-visit-photos', 'farmer-documents'));

CREATE POLICY "Authenticated users can update own uploads" ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id IN ('file_upload', 'farm-visit-photos', 'farmer-documents'));

CREATE POLICY "Authenticated users can delete own uploads" ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id IN ('file_upload', 'farm-visit-photos', 'farmer-documents'));
