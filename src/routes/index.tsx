import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { MapPin, Building2, Clock, Search } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Talentos | Vagas abertas e inscrição de candidatos" },
      {
        name: "description",
        content:
          "Veja as vagas abertas da empresa, inscreva-se em poucos minutos e envie seu currículo direto pela plataforma de recrutamento.",
      },
      { property: "og:title", content: "Talentos | Vagas abertas na empresa" },
      {
        property: "og:description",
        content: "Portal de vagas: candidate-se e envie seu currículo online.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const [term, setTerm] = useState("");
  const [department, setDepartment] = useState<string>("Todos");

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["jobs", "open"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const departments = useMemo(
    () => ["Todos", ...Array.from(new Set((jobs ?? []).map((j) => j.department)))],
    [jobs],
  );

  const filtered = (jobs ?? []).filter((job) => {
    const matchesTerm = `${job.title} ${job.description} ${job.location}`
      .toLowerCase()
      .includes(term.toLowerCase());
    const matchesDept = department === "Todos" || job.department === department;
    return matchesTerm && matchesDept;
  });

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="bg-hero-gradient text-primary-foreground">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary-foreground/70">
            Trabalhe com a gente
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
            Vagas abertas para quem quer construir junto
          </h1>
          <p className="mt-4 max-w-xl text-base text-primary-foreground/80">
            Escolha a vaga que combina com você, faça sua inscrição e envie o currículo em poucos
            minutos. O time de RH acompanha cada candidatura por aqui.
          </p>
          <div className="mt-8 flex max-w-md items-center gap-2 rounded-xl bg-background/95 p-2 shadow-lift">
            <Search className="ml-2 size-4 text-muted-foreground" />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Buscar por cargo, área ou cidade"
              className="border-0 bg-transparent text-foreground shadow-none focus-visible:ring-0"
              aria-label="Buscar vagas"
            />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-wrap items-center gap-2">
          {departments.map((dept) => (
            <Button
              key={dept}
              size="sm"
              variant={dept === department ? "default" : "outline"}
              onClick={() => setDepartment(dept)}
            >
              {dept}
            </Button>
          ))}
        </div>

        <h2 className="mt-10 text-2xl font-semibold">
          {isLoading ? "Carregando vagas" : `${filtered.length} vaga(s) em aberto`}
        </h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}

          {!isLoading &&
            filtered.map((job) => (
              <Card key={job.id} className="shadow-card transition-shadow hover:shadow-lift">
                <CardHeader>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{job.department}</Badge>
                    <Badge variant="outline">{job.employment_type}</Badge>
                    <Badge variant="outline">{job.seniority}</Badge>
                  </div>
                  <CardTitle className="mt-3 text-xl">{job.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-3 text-sm text-muted-foreground">{job.description}</p>
                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-4" /> {job.location}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Building2 className="size-4" /> {job.salary_range ?? "A combinar"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-4" />
                      {new Date(job.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <Button className="mt-6" asChild>
                    <Link to="/vagas/$jobId" params={{ jobId: job.id }}>
                      Ver vaga e candidatar-se
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
        </div>

        {!isLoading && filtered.length === 0 && (
          <p className="mt-10 text-center text-muted-foreground">
            Nenhuma vaga encontrada com esses filtros no momento.
          </p>
        )}
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        Plataforma de recrutamento e seleção — Talentos
      </footer>
    </div>
  );
}
