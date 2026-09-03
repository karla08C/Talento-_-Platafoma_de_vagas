CREATE TYPE public.app_role AS ENUM ('admin', 'hr', 'candidate');
CREATE TYPE public.job_status AS ENUM ('open', 'closed');
CREATE TYPE public.application_status AS ENUM ('received', 'screening', 'interview', 'offer', 'rejected');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  linkedin_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_hr(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('hr','admin'))
$$;

CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT 'Geral',
  location TEXT NOT NULL DEFAULT 'Remoto',
  employment_type TEXT NOT NULL DEFAULT 'CLT',
  seniority TEXT NOT NULL DEFAULT 'Pleno',
  salary_range TEXT,
  description TEXT NOT NULL,
  requirements TEXT,
  status public.job_status NOT NULL DEFAULT 'open',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.jobs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  cover_letter TEXT,
  resume_path TEXT,
  status public.application_status NOT NULL DEFAULT 'received',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, candidate_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.is_hr(auth.uid()));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_hr(auth.uid()));

CREATE POLICY "jobs_public_open" ON public.jobs FOR SELECT TO anon USING (status = 'open');
CREATE POLICY "jobs_auth_select" ON public.jobs FOR SELECT TO authenticated USING (status = 'open' OR public.is_hr(auth.uid()));
CREATE POLICY "jobs_hr_insert" ON public.jobs FOR INSERT TO authenticated WITH CHECK (public.is_hr(auth.uid()));
CREATE POLICY "jobs_hr_update" ON public.jobs FOR UPDATE TO authenticated USING (public.is_hr(auth.uid())) WITH CHECK (public.is_hr(auth.uid()));
CREATE POLICY "jobs_hr_delete" ON public.jobs FOR DELETE TO authenticated USING (public.is_hr(auth.uid()));

CREATE POLICY "apps_select" ON public.applications FOR SELECT TO authenticated USING (auth.uid() = candidate_id OR public.is_hr(auth.uid()));
CREATE POLICY "apps_insert_own" ON public.applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = candidate_id);
CREATE POLICY "apps_update" ON public.applications FOR UPDATE TO authenticated USING (public.is_hr(auth.uid()) OR auth.uid() = candidate_id) WITH CHECK (public.is_hr(auth.uid()) OR auth.uid() = candidate_id);
CREATE POLICY "apps_delete_own" ON public.applications FOR DELETE TO authenticated USING (auth.uid() = candidate_id);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER jobs_updated BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER applications_updated BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'candidate') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY "resumes_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "resumes_select_own_or_hr" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'resumes' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_hr(auth.uid())));
CREATE POLICY "resumes_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

INSERT INTO public.jobs (title, department, location, employment_type, seniority, salary_range, description, requirements, status) VALUES
('Pessoa Desenvolvedora Front-end Pleno', 'Tecnologia', 'São Paulo - Híbrido', 'CLT', 'Pleno', 'R$ 8.000 - R$ 11.000', 'Você vai construir interfaces do nosso produto principal ao lado de designers e product managers, cuidando de performance, acessibilidade e qualidade de código.', 'React e TypeScript; testes automatizados; noções de acessibilidade; inglês técnico.', 'open'),
('Analista de Recursos Humanos', 'Recursos Humanos', 'Remoto', 'CLT', 'Júnior', 'R$ 4.000 - R$ 5.500', 'Apoiar todo o ciclo de recrutamento e seleção, desde a abertura da vaga até a integração da pessoa contratada.', 'Experiência com recrutamento; boa comunicação; organização e uso de planilhas.', 'open'),
('Analista de Dados Sênior', 'Dados', 'Rio de Janeiro - Presencial', 'PJ', 'Sênior', 'R$ 14.000 - R$ 18.000', 'Responsável por modelagem de dados, dashboards executivos e apoio à tomada de decisão das áreas de negócio.', 'SQL avançado; Python; experiência com data warehouse; storytelling com dados.', 'open'),
('Estágio em Marketing', 'Marketing', 'Belo Horizonte - Híbrido', 'Estágio', 'Estágio', 'R$ 2.000 + benefícios', 'Apoiar a produção de conteúdo, campanhas de mídia paga e análise de métricas das redes sociais.', 'Cursando Marketing, Publicidade ou áreas afins; boa escrita; interesse por redes sociais.', 'open');