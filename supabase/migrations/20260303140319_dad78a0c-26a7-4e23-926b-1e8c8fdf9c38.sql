
-- Create update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Menus table
CREATE TABLE public.menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('petit-dejeuner', 'dejeuner', 'gouter', 'diner')),
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view default menus and own menus" ON public.menus FOR SELECT USING (is_default = true OR auth.uid() = user_id);
CREATE POLICY "Users can insert own menus" ON public.menus FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own menus" ON public.menus FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own menus" ON public.menus FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_menus_updated_at BEFORE UPDATE ON public.menus FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Menu ingredients
CREATE TABLE public.menu_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity DECIMAL NOT NULL,
  unit TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.menu_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view ingredients of accessible menus" ON public.menu_ingredients FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.menus WHERE menus.id = menu_id AND (menus.is_default = true OR menus.user_id = auth.uid()))
);
CREATE POLICY "Users can insert ingredients to own menus" ON public.menu_ingredients FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.menus WHERE menus.id = menu_id AND menus.user_id = auth.uid())
);
CREATE POLICY "Users can update ingredients of own menus" ON public.menu_ingredients FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.menus WHERE menus.id = menu_id AND menus.user_id = auth.uid())
);
CREATE POLICY "Users can delete ingredients of own menus" ON public.menu_ingredients FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.menus WHERE menus.id = menu_id AND menus.user_id = auth.uid())
);

-- Camps table
CREATE TABLE public.camps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  participant_count INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.camps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own camps" ON public.camps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own camps" ON public.camps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own camps" ON public.camps FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own camps" ON public.camps FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_camps_updated_at BEFORE UPDATE ON public.camps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Camp meals (assigns menus to specific dates and meal slots)
CREATE TABLE public.camp_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id UUID NOT NULL REFERENCES public.camps(id) ON DELETE CASCADE,
  menu_id UUID NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  meal_date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('petit-dejeuner', 'dejeuner', 'gouter', 'diner')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.camp_meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view meals of own camps" ON public.camp_meals FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.camps WHERE camps.id = camp_id AND camps.user_id = auth.uid())
);
CREATE POLICY "Users can insert meals to own camps" ON public.camp_meals FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.camps WHERE camps.id = camp_id AND camps.user_id = auth.uid())
);
CREATE POLICY "Users can update meals of own camps" ON public.camp_meals FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.camps WHERE camps.id = camp_id AND camps.user_id = auth.uid())
);
CREATE POLICY "Users can delete meals of own camps" ON public.camp_meals FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.camps WHERE camps.id = camp_id AND camps.user_id = auth.uid())
);
