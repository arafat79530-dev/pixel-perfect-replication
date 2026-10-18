CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TABLE public.profiles (id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, display_name text NOT NULL DEFAULT '' CHECK (length(display_name) <= 100), email text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role public.app_role NOT NULL, UNIQUE(user_id, role));
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
CREATE POLICY own_roles ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE TABLE public.memberships (user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE, status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revoked')), decided_by uuid, decided_at timestamptz);
GRANT SELECT ON public.memberships TO authenticated;
GRANT ALL ON public.memberships TO service_role;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY memberships_read ON public.memberships FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE FUNCTION public.initialize_account() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN
IF TG_OP = 'INSERT' THEN
INSERT INTO public.profiles(id, display_name, email) VALUES(NEW.id, left(coalesce(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', ''),100), NEW.email);
INSERT INTO public.memberships(user_id) VALUES(NEW.id);
END IF;
IF lower(NEW.email) = 'm.arafatj4@gmail.com' AND NEW.email_confirmed_at IS NOT NULL THEN
INSERT INTO public.user_roles(user_id, role) VALUES(NEW.id, 'admin') ON CONFLICT DO NOTHING;
UPDATE public.memberships SET status = 'approved' WHERE user_id = NEW.id;
END IF;
RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.initialize_account() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER ghost_account_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.initialize_account();
CREATE TRIGGER ghost_account_confirmed AFTER UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW EXECUTE FUNCTION public.initialize_account();
CREATE FUNCTION public.can_use_app() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS(SELECT 1 FROM public.memberships WHERE user_id = auth.uid() AND status = 'approved') $$;
REVOKE ALL ON FUNCTION public.can_use_app() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_use_app() TO authenticated, service_role;
CREATE FUNCTION public.decide_access(target_user uuid, new_status text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN
IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
IF new_status NOT IN ('approved', 'rejected', 'revoked') THEN RAISE EXCEPTION 'Invalid status'; END IF;
IF public.has_role(target_user, 'admin') THEN RAISE EXCEPTION 'Owner access cannot be changed'; END IF;
UPDATE public.memberships SET status = new_status, decided_by = auth.uid(), decided_at = now() WHERE user_id = target_user;
IF NOT FOUND THEN RAISE EXCEPTION 'Account not found'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.decide_access(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_access(uuid,text) TO authenticated;
