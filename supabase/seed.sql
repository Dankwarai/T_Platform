-- Seed reference data for local dev: garment types + their measurement
-- fields, plus Phase 3 product categories.

insert into public.garment_types (id, name, description) values
  ('11111111-1111-1111-1111-111111111111', 'Shirt', 'Dress shirts, casual shirts'),
  ('22222222-2222-2222-2222-222222222222', 'Trouser', 'Trousers, pants'),
  ('33333333-3333-3333-3333-333333333333', 'Dress', 'Dresses, gowns');

insert into public.measurement_fields (garment_type_id, field_key, field_label, display_order, guide_instructions) values
  ('11111111-1111-1111-1111-111111111111', 'chest', 'Chest', 1, 'Measure around the fullest part of the chest, keeping the tape horizontal.'),
  ('11111111-1111-1111-1111-111111111111', 'shoulder', 'Shoulder', 2, 'Measure from shoulder seam to shoulder seam across the back.'),
  ('11111111-1111-1111-1111-111111111111', 'sleeve_length', 'Sleeve Length', 3, 'Measure from the shoulder seam to the wrist bone.'),
  ('11111111-1111-1111-1111-111111111111', 'neck', 'Neck', 4, 'Measure around the base of the neck.'),
  ('22222222-2222-2222-2222-222222222222', 'waist', 'Waist', 1, 'Measure around the natural waistline.'),
  ('22222222-2222-2222-2222-222222222222', 'hip', 'Hip', 2, 'Measure around the fullest part of the hips.'),
  ('22222222-2222-2222-2222-222222222222', 'inseam', 'Inseam', 3, 'Measure from the crotch to the bottom of the ankle.'),
  ('22222222-2222-2222-2222-222222222222', 'outseam', 'Outseam', 4, 'Measure from the waist to the bottom of the ankle.'),
  ('33333333-3333-3333-3333-333333333333', 'bust', 'Bust', 1, 'Measure around the fullest part of the bust.'),
  ('33333333-3333-3333-3333-333333333333', 'waist', 'Waist', 2, 'Measure around the natural waistline.'),
  ('33333333-3333-3333-3333-333333333333', 'hip', 'Hip', 3, 'Measure around the fullest part of the hips.'),
  ('33333333-3333-3333-3333-333333333333', 'dress_length', 'Dress Length', 4, 'Measure from the shoulder to the desired hemline.');

insert into public.product_categories (id, name) values
  ('44444444-4444-4444-4444-444444444444', 'Fabric'),
  ('55555555-5555-5555-5555-555555555555', 'Buttons'),
  ('66666666-6666-6666-6666-666666666666', 'Thread'),
  ('77777777-7777-7777-7777-777777777777', 'Tools'),
  ('88888888-8888-8888-8888-888888888888', 'Trims');
