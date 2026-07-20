
CREATE POLICY "Own docs read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'application-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Own docs insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'application-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Own docs delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'application-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
