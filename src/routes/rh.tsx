import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  Briefcase,
  Users,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  Eye,
  FileText,
  MapPin,
  Building2,
  Clock,
  Phone,
  Mail,
  ArrowUpRight,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  UserCheck,
  Calendar,
  Layers,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useSessionState } from "@/lib/auth";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/rh")({
  head: () => ({
    meta: [
      { title: "Painel do RH | Gestão de Vagas e Candidatos" },
      {
        name: "description",
        content: "Painel de recrutamento para abertura de vagas e triagem de currículos.",
      },
    ],
  }),
  component: RhDashboardPage,
});

type JobStatus = Database["public"]["Enums"]["job_status"];
type ApplicationStatus = Database["public"]["Enums"]["application_status"];

const jobSchema = z.object({
  title: z.string().trim().min(3, "Informe um título válido para a vaga").max(150),
  department: z.string().trim().min(2, "Informe o departamento").max(80),
  location: z.string().trim().min(2, "Informe a localização ou Remoto").max(100),
  employment_type: z.string().trim().min(2, "Selecione o regime de contratação"),
  seniority: z.string().trim().min(2, "Informe a senioridade"),
  salary_range: z.string().trim().max(100).optional(),
  description: z.string().trim().min(20, "A descrição deve ter ao menos 20 caracteres"),
  requirements: z.string().trim().max(3000).optional(),
});

const statusOptions: { value: ApplicationStatus; label: string; badgeClass: string }[] = [
  {
    value: "received",
    label: "Recebida",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  },
  {
    value: "screening",
    label: "Em Triagem",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  },
  {
    value: "interview",
    label: "Entrevista",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
  },
  {
    value: "offer",
    label: "Proposta",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  },
  {
    value: "rejected",
    label: "Não Selecionado",
    badgeClass: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800",
  },
];

function RhDashboardPage() {
  const { user, isHr, loading: sessionLoading } = useSessionState();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"vagas" | "candidatos">("vagas");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submittingJob, setSubmittingJob] = useState(false);
  const [openingResume, setOpeningResume] = useState<string | null>(null);

  // Filtros de Candidatos
  const [filterJobId, setFilterJobId] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchCandidate, setSearchCandidate] = useState("");

  // 1. Consulta de Vagas
  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ["rh-jobs"],
    enabled: Boolean(user && isHr),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // 2. Consulta de Candidaturas com detalhes da vaga
  const { data: applications, isLoading: appsLoading } = useQuery({
    queryKey: ["rh-applications"],
    enabled: Boolean(user && isHr),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select(`
          *,
          job:jobs(id, title, department, location)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Mutação: Alterar status da Vaga (abrir / encerrar)
  const toggleJobStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: JobStatus }) => {
      const { error } = await supabase.from("jobs").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.newStatus === "open" ? "Vaga reaberta com sucesso!" : "Vaga encerrada com sucesso!"
      );
      void queryClient.invalidateQueries({ queryKey: ["rh-jobs"] });
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: (err: Error) => {
      toast.error("Erro ao alterar status da vaga", { description: err.message });
    },
  });

  // Mutação: Alterar status da Candidatura
  const updateAppStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ApplicationStatus }) => {
      const { error } = await supabase.from("applications").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status da candidatura atualizado!");
      void queryClient.invalidateQueries({ queryKey: ["rh-applications"] });
      void queryClient.invalidateQueries({ queryKey: ["my-applications"] });
    },
    onError: (err: Error) => {
      toast.error("Erro ao atualizar status", { description: err.message });
    },
  });

  // Submissão do Formulário de Nova Vaga
  const handleCreateJob = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const form = new FormData(e.currentTarget);
    const parsed = jobSchema.safeParse({
      title: String(form.get("title") ?? ""),
      department: String(form.get("department") ?? ""),
      location: String(form.get("location") ?? ""),
      employment_type: String(form.get("employment_type") ?? "CLT"),
      seniority: String(form.get("seniority") ?? "Pleno"),
      salary_range: String(form.get("salary_range") ?? ""),
      description: String(form.get("description") ?? ""),
      requirements: String(form.get("requirements") ?? ""),
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Preencha os campos corretamente");
      return;
    }

    setSubmittingJob(true);
    const { error } = await supabase.from("jobs").insert({
      title: parsed.data.title,
      department: parsed.data.department,
      location: parsed.data.location,
      employment_type: parsed.data.employment_type,
      seniority: parsed.data.seniority,
      salary_range: parsed.data.salary_range || null,
      description: parsed.data.description,
      requirements: parsed.data.requirements || null,
      status: "open",
      created_by: user.id,
    });
    setSubmittingJob(false);

    if (error) {
      toast.error("Falha ao publicar vaga", { description: error.message });
      return;
    }

    toast.success("Vaga publicada com sucesso!");
    setIsCreateOpen(false);
    void queryClient.invalidateQueries({ queryKey: ["rh-jobs"] });
    void queryClient.invalidateQueries({ queryKey: ["jobs"] });
  };

  // Abrir Currículo no Storage
  const handleOpenResume = async (path: string | null) => {
    if (!path) {
      toast.error("Currículo não encontrado");
      return;
    }
    setOpeningResume(path);
    try {
      const { data, error } = await supabase.storage.from("resumes").createSignedUrl(path, 120);
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Não foi possível carregar o currículo", { description: message });
    } finally {
      setOpeningResume(null);
    }
  };

  // Métricas rápidas
  const stats = useMemo(() => {
    const totalJobs = jobs?.length ?? 0;
    const openJobs = jobs?.filter((j) => j.status === "open").length ?? 0;
    const totalApps = applications?.length ?? 0;
    const inReviewApps =
      applications?.filter((a) => a.status === "screening" || a.status === "interview").length ?? 0;
    return { totalJobs, openJobs, totalApps, inReviewApps };
  }, [jobs, applications]);

  // Candidaturas filtradas
  const filteredApplications = useMemo(() => {
    return (applications ?? []).filter((app) => {
      const matchJob = filterJobId === "all" || app.job_id === filterJobId;
      const matchStatus = filterStatus === "all" || app.status === filterStatus;
      const matchSearch =
        !searchCandidate.trim() ||
        `${app.full_name} ${app.email} ${app.job?.title ?? ""}`
          .toLowerCase()
          .includes(searchCandidate.toLowerCase().trim());
      return matchJob && matchStatus && matchSearch;
    });
  }, [applications, filterJobId, filterStatus, searchCandidate]);

  // Contagem de candidaturas por vaga
  const appsCountByJob = useMemo(() => {
    const counts: Record<string, number> = {};
    (applications ?? []).forEach((a) => {
      counts[a.job_id] = (counts[a.job_id] ?? 0) + 1;
    });
    return counts;
  }, [applications]);

  // 1. Carregamento inicial da autenticação
  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-4 py-12">
          <Skeleton className="h-10 w-64 mb-6 rounded-lg" />
          <div className="grid gap-4 sm:grid-cols-4 mb-8">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-28 rounded-xl" />
          </div>
          <Skeleton className="h-80 rounded-2xl" />
        </main>
      </div>
    );
  }

  // 2. Não autenticado
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-20 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldAlert className="size-7" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">Acesso Restrito ao RH</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Você precisa estar autenticado com uma conta autorizada da equipe de Recursos Humanos.
          </p>
          <Button asChild className="mt-6">
            <Link to="/auth" search={{ redirect: "/rh" }}>
              Fazer Login
            </Link>
          </Button>
        </main>
      </div>
    );
  }

  // 3. Autenticado mas sem permissão de RH
  if (!isHr) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="mx-auto flex max-w-lg flex-col items-center justify-center px-4 py-20 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
            <ShieldAlert className="size-7" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">Permissão Insuficiente</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sua conta está registrada como <strong>Candidato</strong> e não possui privilégios de
            gestão de vagas e recrutamento.
          </p>
          <div className="mt-4 rounded-xl border border-border/80 bg-card p-4 text-left text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Dica para desenvolvedores e testes:</p>
            <p className="mt-1">
              Para conceder acesso de RH a este usuário, adicione um registro na tabela{" "}
              <code>user_roles</code> no Supabase com o <code>role = 'hr'</code> ou{" "}
              <code>role = 'admin'</code> para o seu ID de usuário.
            </p>
          </div>
          <Button variant="outline" asChild className="mt-6">
            <Link to="/">Voltar para a página inicial</Link>
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        {/* Cabeçalho do Painel */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                <ShieldCheck className="size-3.5" /> Painel de Recrutamento
              </span>
            </div>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Gestão de Vagas & Candidatos
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Publique novas vagas, encerre processos e avalie os candidatos inscritos.
            </p>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-sm">
                <Plus className="size-4" /> Nova Vaga
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl">Cadastrar Nova Vaga</DialogTitle>
                <DialogDescription>
                  Preencha os dados da oportunidade para publicar no portal de talentos da empresa.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateJob} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Título do Cargo *</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="Ex: Engenheiro(a) de Software Pleno"
                    required
                    maxLength={150}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="department">Departamento / Área *</Label>
                    <Input
                      id="department"
                      name="department"
                      placeholder="Ex: Tecnologia, Produto, RH..."
                      required
                      maxLength={80}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Localização / Formato *</Label>
                    <Input
                      id="location"
                      name="location"
                      placeholder="Ex: São Paulo - Híbrido, Remoto..."
                      required
                      maxLength={100}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="employment_type">Regime de Contratação *</Label>
                    <select
                      id="employment_type"
                      name="employment_type"
                      defaultValue="CLT"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="CLT">CLT</option>
                      <option value="PJ">PJ</option>
                      <option value="Estágio">Estágio</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seniority">Senioridade *</Label>
                    <select
                      id="seniority"
                      name="seniority"
                      defaultValue="Pleno"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="Estágio">Estágio</option>
                      <option value="Júnior">Júnior</option>
                      <option value="Pleno">Pleno</option>
                      <option value="Sênior">Sênior</option>
                      <option value="Especialista">Especialista</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salary_range">Faixa Salarial</Label>
                    <Input
                      id="salary_range"
                      name="salary_range"
                      placeholder="Ex: R$ 7.000 - R$ 9.000"
                      maxLength={100}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição das Atividades e Sobre a Vaga *</Label>
                  <Textarea
                    id="description"
                    name="description"
                    rows={4}
                    placeholder="Descreva o dia a dia da posição, objetivos e principais desafios..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requirements">Requisitos e Qualificações</Label>
                  <Textarea
                    id="requirements"
                    name="requirements"
                    rows={3}
                    placeholder="Liste as competências desejadas, tecnologias, experiência prévia e formação..."
                  />
                </div>

                <DialogFooter className="pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                    disabled={submittingJob}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submittingJob}>
                    {submittingJob ? "Publicando..." : "Publicar Vaga"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Cards de Métricas */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="border border-border/80 shadow-card">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Vagas Abertas
                </span>
                <Briefcase className="size-4 text-primary" />
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
                {stats.openJobs}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">de {stats.totalJobs} criadas</p>
            </CardContent>
          </Card>

          <Card className="border border-border/80 shadow-card">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Candidaturas
                </span>
                <Users className="size-4 text-primary" />
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
                {stats.totalApps}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">recebidas no total</p>
            </CardContent>
          </Card>

          <Card className="border border-border/80 shadow-card">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Em Avaliação
                </span>
                <Sparkles className="size-4 text-amber-500" />
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
                {stats.inReviewApps}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">triagem ou entrevista</p>
            </CardContent>
          </Card>

          <Card className="border border-border/80 shadow-card">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Média por Vaga
                </span>
                <Layers className="size-4 text-primary" />
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
                {stats.totalJobs > 0 ? (stats.totalApps / stats.totalJobs).toFixed(1) : "0"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">candidatos/vaga</p>
            </CardContent>
          </Card>
        </div>

        {/* Abas Principais: Vagas e Candidatos */}
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as "vagas" | "candidatos")}
          className="mt-8"
        >
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="vagas" className="gap-2">
              <Briefcase className="size-4" />
              <span>Vagas ({jobs?.length ?? 0})</span>
            </TabsTrigger>
            <TabsTrigger value="candidatos" className="gap-2">
              <Users className="size-4" />
              <span>Candidatos ({applications?.length ?? 0})</span>
            </TabsTrigger>
          </TabsList>

          {/* ABA 1: GESTÃO DE VAGAS */}
          <TabsContent value="vagas" className="mt-6 space-y-4">
            {jobsLoading && (
              <div className="space-y-3">
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
              </div>
            )}

            {!jobsLoading && (!jobs || jobs.length === 0) && (
              <Card className="border-dashed p-10 text-center">
                <CardTitle className="text-lg">Nenhuma vaga cadastrada</CardTitle>
                <CardDescription className="mt-1">
                  Clique no botão "Nova Vaga" para publicar sua primeira oportunidade.
                </CardDescription>
                <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                  Criar Primeira Vaga
                </Button>
              </Card>
            )}

            {!jobsLoading &&
              jobs &&
              jobs.map((job) => {
                const count = appsCountByJob[job.id] ?? 0;
                const isClosed = job.status === "closed";

                return (
                  <Card
                    key={job.id}
                    className={`border border-border/80 shadow-card transition-all ${
                      isClosed ? "bg-muted/30 opacity-80" : "hover:border-primary/40"
                    }`}
                  >
                    <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={isClosed ? "secondary" : "default"}>
                            {isClosed ? "Encerrada" : "Aberta"}
                          </Badge>
                          <Badge variant="outline">{job.employment_type}</Badge>
                          <Badge variant="secondary">{job.department}</Badge>
                          {job.seniority && <Badge variant="outline">{job.seniority}</Badge>}
                        </div>

                        <CardTitle className="mt-2 text-xl font-bold">
                          <Link
                            to="/vagas/$jobId"
                            params={{ jobId: job.id }}
                            className="hover:text-primary hover:underline transition-colors"
                          >
                            {job.title}
                          </Link>
                        </CardTitle>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3.5 text-primary" /> {job.location}
                          </span>
                          {job.salary_range && (
                            <span className="flex items-center gap-1">
                              <Building2 className="size-3.5" /> {job.salary_range}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3.5" /> Criada em{" "}
                            {new Date(job.created_at).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 text-xs"
                          onClick={() => {
                            setFilterJobId(job.id);
                            setActiveTab("candidatos");
                          }}
                        >
                          <Users className="size-3.5 text-primary" />
                          <span>{count} candidato(s)</span>
                        </Button>

                        <Button
                          variant={isClosed ? "default" : "secondary"}
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() =>
                            toggleJobStatusMutation.mutate({
                              id: job.id,
                              newStatus: isClosed ? "open" : "closed",
                            })
                          }
                          disabled={toggleJobStatusMutation.isPending}
                        >
                          {isClosed ? "Reabrir vaga" : "Encerrar vaga"}
                        </Button>

                        <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-xs">
                          <Link to="/vagas/$jobId" params={{ jobId: job.id }} target="_blank">
                            <ArrowUpRight className="size-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
          </TabsContent>

          {/* ABA 2: TRIAGEM DE CANDIDATOS */}
          <TabsContent value="candidatos" className="mt-6 space-y-5">
            {/* Barra de Filtros */}
            <div className="grid gap-3 rounded-xl border border-border/80 bg-card p-4 shadow-card sm:grid-cols-12">
              <div className="relative sm:col-span-4">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  value={searchCandidate}
                  onChange={(e) => setSearchCandidate(e.target.value)}
                  placeholder="Buscar por nome ou e-mail..."
                  className="pl-9 text-xs sm:text-sm"
                />
              </div>

              <div className="sm:col-span-4">
                <select
                  value={filterJobId}
                  onChange={(e) => setFilterJobId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs sm:text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="all">Todas as vagas</option>
                  {jobs?.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} ({j.department})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs sm:text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="all">Todos os status</option>
                  {statusOptions.map((st) => (
                    <option key={st.value} value={st.value}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end sm:col-span-1">
                {(filterJobId !== "all" || filterStatus !== "all" || searchCandidate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilterJobId("all");
                      setFilterStatus("all");
                      setSearchCandidate("");
                    }}
                    title="Limpar filtros"
                    className="h-9 px-2 text-xs"
                  >
                    <RotateCcw className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {appsLoading && (
              <div className="space-y-3">
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
                <Skeleton className="h-32 rounded-xl" />
              </div>
            )}

            {!appsLoading && filteredApplications.length === 0 && (
              <Card className="border-dashed p-10 text-center">
                <Users className="mx-auto size-10 text-muted-foreground" />
                <CardTitle className="mt-3 text-lg">Nenhum candidato encontrado</CardTitle>
                <CardDescription className="mt-1">
                  Não há inscrições para os filtros selecionados.
                </CardDescription>
              </Card>
            )}

            {!appsLoading &&
              filteredApplications.map((app) => {
                const currentStatus =
                  statusOptions.find((s) => s.value === app.status) ?? statusOptions[0];

                return (
                  <Card
                    key={app.id}
                    className="overflow-hidden border border-border/80 shadow-card transition-all hover:border-primary/40"
                  >
                    <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${currentStatus.badgeClass}`}
                          >
                            {currentStatus.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Inscrito em {new Date(app.created_at).toLocaleDateString("pt-BR")}
                          </span>
                        </div>

                        <CardTitle className="mt-2 text-lg font-bold">{app.full_name}</CardTitle>

                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 font-medium text-foreground/90">
                            <Briefcase className="size-3.5 text-primary" />
                            Vaga: {app.job?.title ?? "Vaga"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Mail className="size-3.5" /> {app.email}
                          </span>
                          {app.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="size-3.5" /> {app.phone}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Controle de Etapa / Status pelo RH */}
                      <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                        <Label htmlFor={`status-${app.id}`} className="sr-only">
                          Status da candidatura
                        </Label>
                        <select
                          id={`status-${app.id}`}
                          value={app.status}
                          onChange={(e) =>
                            updateAppStatusMutation.mutate({
                              id: app.id,
                              status: e.target.value as ApplicationStatus,
                            })
                          }
                          disabled={updateAppStatusMutation.isPending}
                          className="h-8 rounded-md border border-input bg-background px-2.5 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          {statusOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>

                        {app.resume_path && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenResume(app.resume_path)}
                            disabled={openingResume === app.resume_path}
                            className="h-8 gap-1.5 text-xs"
                          >
                            <FileText className="size-3.5 text-primary" />
                            {openingResume === app.resume_path ? "Abrindo..." : "Ver Currículo"}
                          </Button>
                        )}
                      </div>
                    </CardHeader>

                    {/* Carta de apresentação se houver */}
                    {app.cover_letter && (
                      <CardContent className="pt-2">
                        <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed">
                          <span className="font-semibold text-foreground">Carta de apresentação: </span>
                          <p className="mt-1 whitespace-pre-line text-foreground/85">
                            {app.cover_letter}
                          </p>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
