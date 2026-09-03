import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Briefcase, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSessionState } from "@/lib/auth";

export function SiteHeader() {
  const { user, isHr, loading } = useSessionState();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-hero-gradient text-primary-foreground">
            <Briefcase className="size-4" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">Talentos</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">Vagas</Link>
          </Button>

          {!loading && user && (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/minhas-candidaturas">Minhas candidaturas</Link>
              </Button>
              {isHr && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/rh">Painel RH</Link>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </>
          )}

          {!loading && !user && (
            <Button size="sm" asChild>
              <Link to="/auth">Entrar</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
