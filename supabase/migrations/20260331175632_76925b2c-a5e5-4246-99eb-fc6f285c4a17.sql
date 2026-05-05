
INSERT INTO storage.buckets (id, name, public) VALUES ('menu-images', 'menu-images', true);

CREATE POLICY "Authenticated users can upload menu images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'menu-images');

CREATE POLICY "Anyone can view menu images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'menu-images');

CREATE POLICY "Authenticated users can delete own menu images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'menu-images');
