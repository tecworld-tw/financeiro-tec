import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "@/assets/logo-tecworld.png";
import { BarChart3, Bell, Package, LogOut, Users } from "lucide-react";
import { Notificacao } from "@/lib/types";
import { useAuth } from "@/lib/AuthContext";

interface HeaderProps {
  notificacoes?: Notificacao[];
  onNotificacoesClick?: () => void;
}

export function Header({ notificacoes = [], onNotificacoesClick }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const path = location.pathname;
  const urgentes = notificacoes.filter((n) => n.tipo === "vencido" || n.tipo === "vence-hoje");

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <header className="safe-top safe-x sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border/40">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-4 py-4 md:py-5">
        <Link to="/" className="flex items-center gap-3 group">
          <img
            src={logo}
            alt="TecWorld"
            className="h-10 w-10 md:h-12 md:w-12 rounded-xl transition-transform group-active:scale-95 shadow-lg shadow-primary/10"
          />
          <div className="leading-none">
            <h1 className="font-display text-xl md:text-2xl font-black uppercase tracking-tighter text-primary leading-none">
              TecWorld
            </h1>
            <p className="text-[10px] md:text-xs text-muted-foreground font-bold mt-1 tracking-widest uppercase opacity-60">
              FINANCEIRO TEC
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <nav className="hidden md:flex items-center gap-1 mr-4 border-r border-border/50 pr-4">
            <NavLink to="/" active={path === "/"}>Vendas</NavLink>
            <NavLink to="/dashboard" active={path === "/dashboard"}>Dashboard</NavLink>
            <NavLink to="/estoque" active={path === "/estoque"}>Estoque</NavLink>
            <NavLink to="/clientes" active={path === "/clientes"}>Clientes</NavLink>
          </nav>

          {onNotificacoesClick && (
            <button
              onClick={onNotificacoesClick}
              className="relative rounded-2xl p-3 text-muted-foreground transition-all hover:bg-secondary hover:text-primary active:scale-95 group"
            >
              <Bell className="h-5 w-5 md:h-6 md:w-6 transition-transform group-hover:rotate-12" />
              {urgentes.length > 0 && (
                <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-black text-destructive-foreground animate-pulse-glow border-2 border-background">
                  {urgentes.length}
                </span>
              )}
            </button>
          )}

          <button
            onClick={handleSignOut}
            title="Sair"
            className="rounded-2xl p-3 text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive active:scale-95"
          >
            <LogOut className="h-5 w-5" />
          </button>

          <div className="md:hidden flex gap-2">
            <Link
              to="/clientes"
              className={`rounded-xl p-3 text-sm font-black transition-all ${path === "/clientes" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}
            >
              <Users className="h-5 w-5" />
            </Link>
            <Link
              to="/estoque"
              className={`rounded-xl p-3 text-sm font-black transition-all ${path === "/estoque" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}
            >
              <Package className="h-5 w-5" />
            </Link>
            <Link
              to="/dashboard"
              className={`rounded-xl p-3 text-sm font-black transition-all ${path === "/dashboard" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}
            >
              <BarChart3 className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({ to, children, active }: { to: string, children: React.ReactNode, active: boolean }) {
  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${
        active 
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}