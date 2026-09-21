import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  MapPin,
  Building2,
  Clock,
  Search,
  Laptop,
  Briefcase,
  GraduationCap,
  X,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react";
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
          "Veja as vagas abertas da empresa, filtre por modalidade (remoto, híbrido, presencial), regime (CLT, PJ, estágio) e inscreva-se online.",
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

type ModalityType = "Todas" | "Remoto" | "Híbrido" | "Presencial";
type ContractType = "Todos" | "CLT" | "PJ" | "Estágio";

function getJobModality(location: string): "Remoto" | "Híbrido" | "Presencial" {
  const norm = location.toLowerCase();
  if (norm.includes("remoto")) return "Remoto";
  if (norm.includes("híbrido") || norm.includes("hibrido")) return "Híbrido";
  return "Presencial";
}

function Home() {
  const [term, setTerm] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [modality, setModality] = useState<ModalityType>("Todas");
  const [contractType, setContractType] = useState<ContractType>("Todos");
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

  const availableCities = useMemo(() => {
    const cities = new Set<string>();
    (jobs ?? []).forEach((job) => {
      // Extrai nome da cidade antes de traço ou delimitador se houver
      const parts = job.location.split("-");
      const city = (parts[0] || job.location).trim();
      if (city) cities.add(city);
    });
    return Array.from(cities);
  }, [jobs]);

  const filtered = useMemo(() => {
    return (jobs ?? []).filter((job) => {
      // Filtro por termo (título, descrição, departamento)
      const matchesTerm =
        !term.trim() ||
        `${job.title} ${job.description} ${job.department}`
          .toLowerCase()
          .includes(term.toLowerCase().trim());

      // Filtro por localização
      const matchesLocation =
        !locationQuery.trim() ||
        job.location.toLowerCase().includes(locationQuery.toLowerCase().trim());

      // Filtro por modalidade (Remoto, Híbrido, Presencial)
      const jobModality = getJobModality(job.location);
      const matchesModality = modality === "Todas" || jobModality === modality;

      // Filtro por regime (CLT, PJ, Estágio)
      const matchesContract =
        contractType === "Todos" ||
        job.employment_type.toLowerCase() === contractType.toLowerCase();

      // Filtro por departamento
      const matchesDept = department === "Todos" || job.department === department;

      return matchesTerm && matchesLocation && matchesModality && matchesContract && matchesDept;
    });
  }, [jobs, term, locationQuery, modality, contractType, department]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (term.trim()) count++;
    if (locationQuery.trim()) count++;
    if (modality !== "Todas") count++;
    if (contractType !== "Todos") count++;
    if (department !== "Todos") count++;
    return count;
  }, [term, locationQuery, modality, contractType, department]);

  const clearAllFilters = () => {
    setTerm("");
    setLocationQuery("");
    setModality("Todas");
    setContractType("Todos");
    setDepartment("Todos");
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-hero-gradient text-primary-foreground">
        {/* Detalhes de luz suave e estética moderna */}
        <div className="pointer-events-none absolute -right-20 -top-20 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 size-96 rounded-full bg-black/15 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 py-8 sm:py-12">
          <h1 className="sr-only">Vagas e Oportunidades</h1>

          {/* Barra de Busca Dupla: Cargo + Localização */}
          <div className="grid max-w-3xl gap-3 rounded-2xl bg-card p-3 shadow-lift sm:grid-cols-12">
            {/* Input de Cargo / Palavra-chave */}
            <div className="relative flex items-center sm:col-span-6">
              <Search className="absolute left-3.5 size-4 text-muted-foreground" />
              <Input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Cargo ou tecnologia..."
                className="h-11 border-0 bg-transparent pl-10 text-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
                aria-label="Buscar por cargo"
              />
              {term && (
                <button
                  onClick={() => setTerm("")}
                  className="mr-2 text-muted-foreground hover:text-foreground"
                  aria-label="Limpar termo"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Divisor no desktop */}
            <div className="hidden h-8 self-center border-l border-border sm:col-span-1 sm:block sm:justify-self-center" />

            {/* Input de Localização */}
            <div className="relative flex items-center sm:col-span-5">
              <MapPin className="absolute left-3.5 size-4 text-primary" />
              <Input
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                placeholder="Cidade, estado ou remoto..."
                className="h-11 border-0 bg-transparent pl-10 text-foreground shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
                aria-label="Buscar por localização"
              />
              {locationQuery && (
                <button
                  onClick={() => setLocationQuery("")}
                  className="mr-2 text-muted-foreground hover:text-foreground"
                  aria-label="Limpar localização"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>

          {/* Atalhos rápidos de localização frequente */}
          {availableCities.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-primary-foreground/80">
              <span className="font-medium text-white/90">Sugestões de local:</span>
              {availableCities.slice(0, 4).map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => setLocationQuery(city === locationQuery ? "" : city)}
                  className={`rounded-full px-2.5 py-0.5 transition-colors ${
                    locationQuery === city
                      ? "bg-white text-primary font-semibold shadow-sm"
                      : "bg-white/15 text-white hover:bg-white/25"
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Conteúdo Principal */}
      <main className="mx-auto max-w-6xl px-4 py-10">
        {/* Caixa de Filtros Avançados */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <SlidersHorizontal className="size-4 text-primary" />
              <span>Filtrar Vagas</span>
              {activeFiltersCount > 0 && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                  {activeFiltersCount} ativo(s)
                </span>
              )}
            </div>

            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-3.5" />
                Limpar filtros
              </Button>
            )}
          </div>

          {/* Grupos de Filtros */}
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {/* 1. Filtro de Modalidade */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Modalidade de Trabalho
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(["Todas", "Remoto", "Híbrido", "Presencial"] as ModalityType[]).map((mod) => (
                  <Button
                    key={mod}
                    size="sm"
                    variant={modality === mod ? "default" : "outline"}
                    onClick={() => setModality(mod)}
                    className="h-8 text-xs"
                  >
                    {mod === "Remoto" && <Laptop className="mr-1.5 size-3.5" />}
                    {mod === "Híbrido" && <Building2 className="mr-1.5 size-3.5" />}
                    {mod === "Presencial" && <MapPin className="mr-1.5 size-3.5" />}
                    {mod}
                  </Button>
                ))}
              </div>
            </div>

            {/* 2. Filtro de Regime de Contratação */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Regime de Contratação
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(["Todos", "CLT", "PJ", "Estágio"] as ContractType[]).map((type) => (
                  <Button
                    key={type}
                    size="sm"
                    variant={contractType === type ? "default" : "outline"}
                    onClick={() => setContractType(type)}
                    className="h-8 text-xs"
                  >
                    {type === "Estágio" && <GraduationCap className="mr-1.5 size-3.5" />}
                    {type === "CLT" && <Briefcase className="mr-1.5 size-3.5" />}
                    {type === "PJ" && <Building2 className="mr-1.5 size-3.5" />}
                    {type}
                  </Button>
                ))}
              </div>
            </div>

            {/* 3. Filtro de Departamento / Área */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Área / Departamento
              </label>
              <div className="flex flex-wrap gap-1.5">
                {departments.map((dept) => (
                  <Button
                    key={dept}
                    size="sm"
                    variant={department === dept ? "default" : "outline"}
                    onClick={() => setDepartment(dept)}
                    className="h-8 text-xs"
                  >
                    {dept}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Tags de Filtros Ativos para remoção rápida */}
          {activeFiltersCount > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/40 pt-3 text-xs">
              <span className="text-muted-foreground">Filtros aplicados:</span>
              {term.trim() && (
                <Badge variant="secondary" className="gap-1 pl-2">
                  Cargo: "{term}"
                  <button onClick={() => setTerm("")} className="hover:opacity-75">
                    <X className="size-3" />
                  </button>
                </Badge>
              )}
              {locationQuery.trim() && (
                <Badge variant="secondary" className="gap-1 pl-2">
                  Local: "{locationQuery}"
                  <button onClick={() => setLocationQuery("")} className="hover:opacity-75">
                    <X className="size-3" />
                  </button>
                </Badge>
              )}
              {modality !== "Todas" && (
                <Badge variant="secondary" className="gap-1 pl-2">
                  Modalidade: {modality}
                  <button onClick={() => setModality("Todas")} className="hover:opacity-75">
                    <X className="size-3" />
                  </button>
                </Badge>
              )}
              {contractType !== "Todos" && (
                <Badge variant="secondary" className="gap-1 pl-2">
                  Regime: {contractType}
                  <button onClick={() => setContractType("Todos")} className="hover:opacity-75">
                    <X className="size-3" />
                  </button>
                </Badge>
              )}
              {department !== "Todos" && (
                <Badge variant="secondary" className="gap-1 pl-2">
                  Área: {department}
                  <button onClick={() => setDepartment("Todos")} className="hover:opacity-75">
                    <X className="size-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Cabeçalho dos Resultados */}
        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground sm:text-2xl">
            {isLoading
              ? "Buscando vagas disponíveis..."
              : `${filtered.length} vaga(s) encontrada(s)`}
          </h2>
        </div>

        {/* Lista de Cards de Vagas */}
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))}

          {!isLoading &&
            filtered.map((job) => {
              const jobModality = getJobModality(job.location);

              return (
                <Card
                  key={job.id}
                  className="group relative flex flex-col justify-between overflow-hidden border border-border/80 shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lift"
                >
                  {/* Linha superior de destaque em hover */}
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-orange-400 to-amber-500 opacity-0 transition-opacity group-hover:opacity-100" />

                  <CardHeader className="pb-3 pt-5">
                    {/* Badges de Destaque */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Modalidade */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          jobModality === "Remoto"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                            : jobModality === "Híbrido"
                              ? "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                              : "bg-orange-50 text-orange-800 border border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800"
                        }`}
                      >
                        {jobModality === "Remoto" && <Laptop className="size-3" />}
                        {jobModality === "Híbrido" && <Building2 className="size-3" />}
                        {jobModality === "Presencial" && <MapPin className="size-3" />}
                        {jobModality}
                      </span>

                      {/* Regime de Contratação */}
                      <Badge
                        variant="outline"
                        className="font-medium text-foreground/80 border-border"
                      >
                        {job.employment_type === "Estágio" ? (
                          <GraduationCap className="mr-1 size-3 text-primary" />
                        ) : (
                          <Briefcase className="mr-1 size-3 text-primary" />
                        )}
                        {job.employment_type}
                      </Badge>

                      {/* Departamento */}
                      <Badge variant="secondary" className="font-medium">
                        {job.department}
                      </Badge>

                      {/* Senioridade */}
                      {job.seniority && (
                        <Badge variant="outline" className="text-muted-foreground">
                          {job.seniority}
                        </Badge>
                      )}
                    </div>

                    <CardTitle className="mt-3 text-xl font-bold transition-colors group-hover:text-primary">
                      {job.title}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <p className="line-clamp-3 text-sm text-muted-foreground leading-relaxed">
                      {job.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="size-3.5 text-primary" />
                        {job.location}
                      </span>

                      <span className="flex items-center gap-1.5">
                        <Building2 className="size-3.5 text-muted-foreground" />
                        {job.salary_range ?? "Salário a combinar"}
                      </span>

                      <span className="flex items-center gap-1.5">
                        <Clock className="size-3.5 text-muted-foreground" />
                        Publicada em {new Date(job.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>

                    <div className="pt-2">
                      <Button
                        className="w-full font-medium transition-transform group-hover:scale-[1.01]"
                        asChild
                      >
                        <Link to="/vagas/$jobId" params={{ jobId: job.id }}>
                          Ver vaga e candidatar-se
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>

        {/* Mensagem de Vazio */}
        {!isLoading && filtered.length === 0 && (
          <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Search className="size-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">Nenhuma vaga encontrada</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Não encontramos vagas para a combinação de filtros selecionada. Tente ajustar ou
              limpar os filtros.
            </p>
            <Button variant="outline" size="sm" onClick={clearAllFilters} className="mt-5">
              Limpar todos os filtros
            </Button>
          </div>
        )}
      </main>

      <footer className="mt-16 border-t border-border bg-card/50 py-8 text-center text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Talento Conecta</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Plataforma de Recrutamento & Seleção desenvolvida para conectar os melhores talentos.
        </p>
      </footer>
    </div>
  );
}
