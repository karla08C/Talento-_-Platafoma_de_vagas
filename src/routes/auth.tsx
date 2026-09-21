import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Lock, Mail, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { safeRedirect } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search["redirect"] === "string" ? search["redirect"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta | Talentos" },
      {
        name: "description",
        content:
          "Acesse sua conta para se candidatar às vagas abertas e acompanhar seu processo seletivo.",
      },
      { property: "og:title", content: "Entrar ou criar conta | Talentos" },
      { property: "og:description", content: "Acesse o portal de vagas da empresa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const signUpSchema = z.object({
  fullName: z.string().trim().min(3, "Informe seu nome completo").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(8, "A senha deve ter ao menos 8 caracteres").max(72),
});

function translateAuthError(errMessage: string): string {
  const msg = errMessage.toLowerCase();
  if (msg.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos. Se você ainda não possui cadastro, acesse a aba 'Criar conta'.";
  }
  if (msg.includes("email not confirmed")) {
    return "Seu e-mail ainda não foi confirmado. Verifique a caixa de entrada (ou spam) do seu e-mail para ativar a conta antes de entrar.";
  }
  if (msg.includes("user already registered") || msg.includes("already registered")) {
    return "Este e-mail já está cadastrado. Você pode fazer login diretamente na aba 'Entrar'.";
  }
  if (msg.includes("password should be at least")) {
    return "A senha deve conter no mínimo 8 caracteres.";
  }
  if (msg.includes("rate limit") || msg.includes("too many requests")) {
    return "Muitas tentativas em pouco tempo. Por segurança, aguarde alguns instantes antes de tentar novamente.";
  }
  return errMessage;
}

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const target = safeRedirect(search.redirect);

  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate({ to: target as any, replace: true });
      }
    });
  }, [navigate, target]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (!email || !password) {
      setErrorMessage("Por favor, preencha o e-mail e a senha.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      const friendly = translateAuthError(error.message);
      setErrorMessage(friendly);
      toast.error("Não foi possível entrar", { description: friendly });
      return;
    }

    toast.success("Login realizado com sucesso!");
    await queryClient.invalidateQueries();
    navigate({ to: target as any, replace: true }).catch(() => {
      if (typeof window !== "undefined") {
        window.location.assign(target);
      }
    });
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const form = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({
      fullName: String(form.get("fullName") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });

    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Dados inválidos";
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}${target}`,
        data: { full_name: parsed.data.fullName },
      },
    });
    setLoading(false);

    if (error) {
      const friendly = translateAuthError(error.message);
      setErrorMessage(friendly);
      toast.error("Não foi possível criar a conta", { description: friendly });
      return;
    }

    if (!data.session) {
      const msg = `Conta criada! Enviamos uma mensagem de confirmação para ${parsed.data.email}. Por favor, verifique sua caixa de entrada e confirme o link para ativar a conta antes de entrar.`;
      setSuccessMessage(msg);
      toast.success("Confirme seu e-mail", { description: msg });
      return;
    }

    toast.success("Conta criada e conectada com sucesso!");
    await queryClient.invalidateQueries();
    navigate({ to: target as any, replace: true }).catch(() => {
      if (typeof window !== "undefined") {
        window.location.assign(target);
      }
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero-gradient px-4 py-12">
      <Card className="w-full max-w-md shadow-lift">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Portal de vagas</CardTitle>
          <CardDescription>
            Entre ou cadastre-se para se candidatar e acompanhar seus processos seletivos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              setActiveTab(val as "signin" | "signup");
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
          >
            <TabsList className="w-full">
              <TabsTrigger value="signin" className="flex-1">
                Entrar
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">
                Criar conta
              </TabsTrigger>
            </TabsList>

            {/* Alerta de Erro em Destaque */}
            {errorMessage && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive leading-relaxed">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Atenção</p>
                  <p className="mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Alerta de Sucesso / Confirmação de E-mail */}
            {successMessage && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-600" />
                <div>
                  <p className="font-semibold">Cadastro quase concluído!</p>
                  <p className="mt-0.5">{successMessage}</p>
                </div>
              </div>
            )}

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      placeholder="seu.email@exemplo.com"
                      required
                      maxLength={255}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      id="signin-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      className="pl-9"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nome completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      id="signup-name"
                      name="fullName"
                      placeholder="Nome e Sobrenome"
                      required
                      maxLength={120}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="seu.email@exemplo.com"
                      required
                      maxLength={255}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      placeholder="Mínimo de 8 caracteres"
                      required
                      minLength={8}
                      className="pl-9"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    A senha deve possuir ao menos 8 caracteres.
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Criando conta..." : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/" className="underline underline-offset-4 hover:text-foreground">
              Voltar para as vagas
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
