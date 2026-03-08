
CREATE TABLE camp_ingredient_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id uuid NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
  camp_meal_id uuid REFERENCES camp_meals(id) ON DELETE SET NULL,
  ingredient_name text NOT NULL,
  quantity_used numeric NOT NULL DEFAULT 0,
  unit text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE camp_ingredient_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view usage of own camps" ON camp_ingredient_usage
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM camps WHERE camps.id = camp_ingredient_usage.camp_id AND camps.user_id = auth.uid()));

CREATE POLICY "Users can insert usage to own camps" ON camp_ingredient_usage
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM camps WHERE camps.id = camp_ingredient_usage.camp_id AND camps.user_id = auth.uid()));

CREATE POLICY "Users can update usage of own camps" ON camp_ingredient_usage
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM camps WHERE camps.id = camp_ingredient_usage.camp_id AND camps.user_id = auth.uid()));

CREATE POLICY "Users can delete usage of own camps" ON camp_ingredient_usage
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM camps WHERE camps.id = camp_ingredient_usage.camp_id AND camps.user_id = auth.uid()));
