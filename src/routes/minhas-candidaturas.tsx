import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  MapPin,
  Building2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  UserCheck,
  ChevronRight,
  Eye,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useSessionState } from "@/lib/auth";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/minhas-candidaturas")({
  head: () => ({
    meta: [
      { title: "Minhas Candidaturas | Talentos" },
      {
        name: "description",
        content: "Acompanhe suas inscrições e o status dos processos seletivos.",
      },
    ],
  }),
  component: MinhasCandidaturasPage,
});

type ApplicationStatus = Database["public"]["Enums"]["application_status"];

interface StatusConfig {
  label: string;
  badgeClass: string;
  icon: typeof Clock;
  description: string;
  step: number;
}

const statusConfigMap: Record<ApplicationStatus, StatusConfig> = {
  received: {
    label: "Recebida",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    icon: Clock,
    description: "Sua candidatura foi registrada e está na fila para avaliação inicial.",
    step: 1,
  },
  screening: {
    label: "Em Triagem",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    icon: UserCheck,
    description: "A equipe de Recursos Humanos está analisando o seu perfil e currículo.",
    step: 2,
  },
  interview: {
    label: "Entrevista",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
    icon: Sparkles,
    description: "Você avançou para a etapa de entrevistas! Fique atento ao seu e-mail e telefone.",
    step: 3,
  },
  offer: {
    label: "Proposta",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    icon: CheckCircle2,
    description: "Parabéns! Uma proposta de contratação foi estendida para você.",
    step: 4,
  },
  rejected: {
    label: "Não Selecionado",
    badgeClass: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800",
    icon: AlertCircle,
    description: "Agradecemos seu interesse. No momento, o processo seguiu com outro perfil.",
    step: -1,
  },
};

function MinhasCandidaturasPage() {
  const { user, loading: sessionLoading } = useSessionState();
  const [openingResume, setOpeningResume] = useState<string | null>(null);

  const { data: applications, isLoading } = useQuery({
    queryKey: ["my-applications", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select(`
          id,
          status,
          created_at,
          cover_letter,
          resume_path,
          job:jobs (
            id,
            title,
            department,
            location,
            employment_type,
            salary_range,
            status
          )
        `)
        .eq("candidate_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleOpenResume = async (path: string | null) => {
    if (!path) return;
    setOpeningResume(path);
    try {
      const { data, error } = await supabase.storage.from("resumes").createSignedUrl(path, 120);
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      console.error("Erro ao gerar link do currículo:", err);
    } finally {
      setOpeningResume(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="gap-2">
            <Link to="/">
              <ArrowLeft className="size-4" /> Ver vagas abertas
            </Link>
          </Button>
        </div>

        {/* Cabeçalho da Página */}
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Minhas Candidaturas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe o andamento de cada processo seletivo e o status atual do seu currículo.
          </p>
        </div>

        {/* Estado de Carregamento da Sessão */}
        {sessionLoading && (
          <div className="space-y-4">
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
          </div>
        )}

        {/* Usuário não autenticado */}
        {!sessionLoading && !user && (
          <Card className="border-dashed p-8 text-center shadow-card">
            <CardHeader className="flex flex-col items-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Briefcase className="size-6" />
              </div>
              <CardTitle className="mt-3 text-xl">Faça login para ver suas candidaturas</CardTitle>
              <CardDescription>
                Você precisa estar conectado na sua conta para acompanhar as vagas em que se inscreveu.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/auth" search={{ redirect: "/minhas-candidaturas" }}>
                  Entrar na minha conta
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Carregando dados de candidaturas */}
        {!sessionLoading && user && isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
          </div>
        )}

        {/* Lista Vazia */}
        {!sessionLoading && user && !isLoading && (!applications || applications.length === 0) && (
          <Card className="border-dashed p-10 text-center shadow-card">
            <CardHeader className="flex flex-col items-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <FileText className="size-7" />
              </div>
              <CardTitle className="mt-4 text-xl font-semibold">
                Nenhuma candidatura encontrada
              </CardTitle>
              <CardDescription className="max-w-md text-sm">
                Você ainda não se inscreveu em nenhuma vaga. Explore nossas oportunidades em aberto
                e dê o próximo passo na sua carreira!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="mt-2">
                <Link to="/">Explorar vagas disponíveis</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Listagem de Candidaturas */}
        {!sessionLoading && user && !isLoading && applications && applications.length > 0 && (
          <div className="space-y-5">
            {applications.map((app) => {
              const job = app.job;
              const statusCfg = statusConfigMap[app.status] || statusConfigMap.received;
              const StatusIcon = statusCfg.icon;
              const dateStr = new Date(app.created_at).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              });

              return (
                <Card
                  key={app.id}
                  className="overflow-hidden border border-border/80 shadow-card transition-all hover:border-primary/40 hover:shadow-lift"
                >
                  <CardHeader className="flex flex-col gap-4 pb-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Status da Inscrição */}
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusCfg.badgeClass}`}
                        >
                          <StatusIcon className="size-3.5" />
                          {statusCfg.label}
                        </span>

                        {job?.department && (
                          <Badge variant="secondary" className="text-xs">
                            {job.department}
                          </Badge>
                        )}

                        {job?.employment_type && (
                          <Badge variant="outline" className="border-border text-xs">
                            {job.employment_type}
                          </Badge>
                        )}

                        {job?.status === "closed" && (
                          <Badge variant="destructive" className="text-xs">
                            Vaga Encerrada
                          </Badge>
                        )}
                      </div>

                      <CardTitle className="mt-2.5 text-xl font-bold">
                        {job ? (
                          <Link
                            to="/vagas/$jobId"
                            params={{ jobId: job.id }}
                            className="transition-colors hover:text-primary hover:underline"
                          >
                            {job.title}
                          </Link>
                        ) : (
                          "Vaga não identificada"
                        )}
                      </CardTitle>

                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {job?.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3.5 text-primary" />
                            {job.location}
                          </span>
                        )}
                        {job?.salary_range && (
                          <span className="flex items-center gap-1">
                            <Building2 className="size-3.5" />
                            {job.salary_range}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="size-3.5" />
                          Inscrito em {dateStr}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                      {job && (
                        <Button variant="outline" size="sm" asChild className="h-8 gap-1 text-xs">
                          <Link to="/vagas/$jobId" params={{ jobId: job.id }}>
                            <span>Ver vaga</span>
                            <ChevronRight className="size-3.5" />
                          </Link>
                        </Button>
                      )}

                      {app.resume_path && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenResume(app.resume_path)}
                          disabled={openingResume === app.resume_path}
                          className="h-8 gap-1.5 text-xs"
                        >
                          <Eye className="size-3.5" />
                          {openingResume === app.resume_path ? "Abrindo..." : "Currículo"}
                        </Button>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="pt-2">
                    {/* Linha de Status / Progresso */}
                    <div className="rounded-xl bg-muted/50 p-3.5 text-xs">
                      <div className="flex items-start gap-2">
                        <StatusIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                        <div>
                          <p className="font-semibold text-foreground">{statusCfg.label}</p>
                          <p className="mt-0.5 text-muted-foreground leading-relaxed">
                            {statusCfg.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Carta de apresentação caso o candidato tenha enviado */}
                    {app.cover_letter && (
                      <div className="mt-3">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
                              <FileText className="mr-1.5 size-3" /> Ver minha carta de apresentação
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                              <DialogTitle className="text-lg">Carta de apresentação enviada</DialogTitle>
                            </DialogHeader>
                            <div className="max-h-72 overflow-y-auto rounded-lg bg-muted/40 p-4 text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                              {app.cover_letter}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
