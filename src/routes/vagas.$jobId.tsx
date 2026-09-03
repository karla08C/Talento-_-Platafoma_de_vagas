import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Building2, Upload } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useSessionState } from "@/lib/auth";

export const Route = createFileRoute("/vagas/$jobId")({
  head: () => ({
    meta: [
      { title: "Detalhes da vaga | Talentos" },
      {
        name: "description",
        content: "Confira os detalhes da vaga, requisitos e envie sua candidatura com currículo.",
      },
      { property: "og:title", content: "Detalhes da vaga | Talentos" },
      { property: "og:description", content: "Requisitos, benefícios e inscrição para a vaga." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: JobDetail,
});

const applicationSchema = z.object({
  fullName: z.string().trim().min(3, "Informe seu nome completo").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  phone: z.string().trim().max(30).optional(),
  coverLetter: z.string().trim().max(2000).optional(),
});

function JobDetail() {
  const { jobId } = Route.useParams();
  const { user, loading: sessionLoading } = useSessionState();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const { data: job, isLoading } = useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      const { data, error } = await supabase.from("jobs").select("*").eq("id", jobId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: existing } = useQuery({
    queryKey: ["application", jobId, user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("id, status")
        .eq("job_id", jobId)
        .eq("candidate_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const form = new FormData(e.currentTarget);
    const parsed = applicationSchema.safeParse({
      fullName: String(form.get("fullName") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      coverLetter: String(form.get("coverLetter") ?? ""),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }

    const file = form.get("resume");
    if (!(file instanceof File) || file.size === 0) {
      toast.error("Anexe seu currículo (PDF, DOC ou DOCX)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("O currículo deve ter no máximo 10 MB");
      return;
    }

    setSubmitting(true);
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
    const path = `${user.id}/${jobId}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage.from("resumes").upload(path, file);
    if (uploadError) {
      setSubmitting(false);
      toast.error("Falha ao enviar o currículo", { description: uploadError.message });
      return;
    }

    const { error } = await supabase.from("applications").insert({
      job_id: jobId,
      candidate_id: user.id,
      full_name: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      cover_letter: parsed.data.coverLetter || null,
      resume_path: path,
    });
    setSubmitting(false);

    if (error) {
      toast.error("Não foi possível concluir a inscrição", { description: error.message });
      return;
    }

    toast.success("Candidatura enviada!", { description: "Acompanhe o status em Minhas candidaturas." });
    void queryClient.invalidateQueries({ queryKey: ["application", jobId, user.id] });
    navigate({ to: "/minhas-candidaturas" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link to="/">
            <ArrowLeft className="size-4" /> Todas as vagas
          </Link>
        </Button>

        {isLoading && <Skeleton className="h-64 rounded-xl" />}

        {!isLoading && !job && (
          <p className="text-muted-foreground">Vaga não encontrada ou não está mais aberta.</p>
        )}

        {job && (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{job.department}</Badge>
              <Badge variant="outline">{job.employment_type}</Badge>
              <Badge variant="outline">{job.seniority}</Badge>
              {job.status === "closed" && <Badge variant="destructive">Encerrada</Badge>}
            </div>
            <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">{job.title}</h1>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" /> {job.location}
              </span>
              <span className="flex items-center gap-1.5">
                <Building2 className="size-4" /> {job.salary_range ?? "Salário a combinar"}
              </span>
            </div>

            <section className="mt-8 space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Sobre a vaga</h2>
                <p className="mt-2 whitespace-pre-line text-muted-foreground">{job.description}</p>
              </div>
              {job.requirements && (
                <div>
                  <h2 className="text-xl font-semibold">Requisitos</h2>
                  <p className="mt-2 whitespace-pre-line text-muted-foreground">{job.requirements}</p>
                </div>
              )}
            </section>

            <Card className="mt-10 shadow-card" id="candidatar">
              <CardHeader>
                <CardTitle>Inscrever-se nesta vaga</CardTitle>
                <CardDescription>
                  Preencha seus dados e anexe o currículo em PDF, DOC ou DOCX (até 10 MB).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sessionLoading && <Skeleton className="h-24 rounded-lg" />}

                {!sessionLoading && !user && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Entre ou crie sua conta gratuita para enviar o currículo.
                    </p>
                    <Button asChild>
                      <Link to="/auth" search={{ redirect: `/vagas/${jobId}` }}>
                        Entrar para me candidatar
                      </Link>
                    </Button>
                  </div>
                )}

                {!sessionLoading && user && existing && (
                  <p className="text-sm">
                    Você já se candidatou a esta vaga.{" "}
                    <Link to="/minhas-candidaturas" className="underline underline-offset-4">
                      Ver minhas candidaturas
                    </Link>
                  </p>
                )}

                {!sessionLoading && user && !existing && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Nome completo</Label>
                        <Input id="fullName" name="fullName" required maxLength={120} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">E-mail</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          required
                          maxLength={255}
                          defaultValue={user.email ?? ""}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input id="phone" name="phone" maxLength={30} placeholder="(11) 90000-0000" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="coverLetter">Carta de apresentação</Label>
                      <Textarea
                        id="coverLetter"
                        name="coverLetter"
                        rows={5}
                        maxLength={2000}
                        placeholder="Conte por que você é a pessoa certa para esta vaga."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="resume">Currículo</Label>
                      <Input
                        id="resume"
                        name="resume"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        required
                      />
                    </div>
                    <Button type="submit" disabled={submitting}>
                      <Upload className="size-4" />
                      {submitting ? "Enviando..." : "Enviar candidatura"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
