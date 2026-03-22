import { useState, useMemo, useCallback, useEffect } from "react";
import { Header } from "@/components/Header";
import { getVendas, formatCurrency, getNotificacoes } from "@/lib/vendas-store";
import { NotificacoesSheet } from "@/components/NotificacoesSheet";
import { Venda } from "@/lib/types";
import { toast } from "sonner";
import {
  DollarSign, ShoppingBag, Clock, CreditCard,
  AlertTriangle, TrendingUp, Users, Package, Loader2, X,
} from "lucide-react";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function Dashboard() {
  const [vendas,     setVendas]     = useState<Venda[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [mesFiltro,  setMesFiltro]  = useState<string>("");
  const [anoFiltro,  setAnoFiltro]  = useState<string>("");
  const [notifsOpen, setNotifsOpen] = useState(false);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getVendas();
      setVendas(data);
    } catch {
      toast.error("Erro ao carregar dados do dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const notificacoes = useMemo(() => getNotificacoes(vendas), [vendas]);

  const anos = useMemo(() => {
    const set = new Set<string>();
    vendas.forEach((v) => { const y = v.dataVenda.split("-")[0]; if (y) set.add(y); });
    return Array.from(set).sort();
  }, [vendas]);

  const filtradas = useMemo(() => {
    return vendas.filter((v) => {
      const [y, m] = v.dataVenda.split("-");
      if (anoFiltro && y !== anoFiltro) return false;
      if (mesFiltro && parseInt(m) !== parseInt(mesFiltro)) return false;
      return true;
    });
  }, [vendas, mesFiltro, anoFiltro]);

  const kpis = useMemo(() => {
    const faturamento = filtradas.reduce((s, v) => s + v.valor, 0);
    const qtdTotal    = filtradas.length;
    const pagas       = filtradas.filter((v) => v.pago);
    const recebido    = pagas.reduce((s, v) => s + v.valor, 0);
    const pendentes   = filtradas.filter((v) => !v.pago);
    const aReceber    = pendentes.reduce((s, v) => s + v.valor, 0);
    const fiadas      = filtradas.filter((v) => v.fiado);
    const totalFiado  = fiadas.reduce((s, v) => s + v.valor, 0);

    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    const vencidas     = filtradas.filter((v) => v.fiado && !v.pago && v.vencimento && new Date(v.vencimento + "T00:00:00") < hoje);
    const totalVencidas = vencidas.reduce((s, v) => s + v.valor, 0);

    const clientes    = new Set(filtradas.map((v) => v.nomeCliente)).size;
    const ticketMedio = qtdTotal > 0 ? faturamento / qtdTotal : 0;

    return {
      faturamento, qtdTotal, recebido, aReceber,
      totalFiado, totalVencidas, clientes, ticketMedio,
      qtdPendentes: pendentes.length,
      qtdVencidas:  vencidas.length,
    };
  }, [filtradas]);

  const temFiltro = mesFiltro || anoFiltro;

  return (
    // ✅ Mesma estrutura raiz do Index
    <div className="min-h-screen bg-background selection:bg-primary/30">
      <Header notificacoes={notificacoes} onNotificacoesClick={() => setNotifsOpen(true)} />

      {/* ✅ Mesmo padrão de main do Index: max-w-7xl px-4 pb-32 */}
      <main className="mx-auto max-w-7xl px-4 pb-32">

        {/* Cabeçalho */}
        <div className="mt-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-foreground flex items-center gap-2">
              DASHBOARD
              <TrendingUp className="inline-block h-6 w-6 text-primary" />
            </h2>
            <p className="text-sm font-medium text-muted-foreground opacity-70">
              Visão geral do seu negócio
            </p>
          </div>

          {/* Botão Atualizar desktop */}
          <div className="hidden md:flex gap-2">
            <button
              onClick={reload}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-bold hover:bg-secondary/80 transition-all disabled:opacity-50"
            >
              <Loader2 className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </button>
          </div>
        </div>

        {/* ✅ Filtros — mesmo padrão grid + pills do Index */}
        <div className="animate-fade-in-up animate-delay-1 grid grid-cols-1 lg:grid-cols-12 gap-4 mb-8">

          {/* Selects de mês/ano agrupados no lugar da busca */}
          <div className="lg:col-span-5 flex gap-2">
            <div className="relative flex-1 group">
              <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-xl group-focus-within:bg-primary/10 transition-all" />
              <select
                value={mesFiltro}
                onChange={(e) => setMesFiltro(e.target.value)}
                className="relative input-field py-4 border-white/5 bg-white/5 backdrop-blur-md rounded-2xl shadow-inner w-full text-sm font-bold appearance-none"
              >
                <option value="">Todos os meses</option>
                {MESES.map((m, i) => (
                  <option key={i} value={String(i + 1)}>{m}</option>
                ))}
              </select>
            </div>
            <div className="relative group">
              <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-xl group-focus-within:bg-primary/10 transition-all" />
              <select
                value={anoFiltro}
                onChange={(e) => setAnoFiltro(e.target.value)}
                className="relative input-field py-4 border-white/5 bg-white/5 backdrop-blur-md rounded-2xl shadow-inner text-sm font-bold appearance-none"
              >
                <option value="">Todos</option>
                {anos.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Pills de período rápido */}
          <div className="lg:col-span-7 flex gap-2 overflow-x-auto no-scrollbar pb-2 lg:pb-0 items-center">
            {[
              { label: "Este mês", mes: String(new Date().getMonth() + 1), ano: String(new Date().getFullYear()) },
              { label: "Mês passado", mes: String(new Date().getMonth() === 0 ? 12 : new Date().getMonth()), ano: String(new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear()) },
              { label: "Este ano", mes: "", ano: String(new Date().getFullYear()) },
            ].map((p) => {
              const isActive = mesFiltro === p.mes && anoFiltro === p.ano;
              return (
                <button
                  key={p.label}
                  onClick={() => { setMesFiltro(p.mes); setAnoFiltro(p.ano); }}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-wider transition-all active:scale-95 border shadow-lg ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-primary/20"
                      : "bg-card text-muted-foreground border-border/40 hover:bg-accent"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}

            {/* Limpar filtro */}
            {temFiltro && (
              <button
                onClick={() => { setMesFiltro(""); setAnoFiltro(""); }}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-wider border shadow-lg bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 transition-all active:scale-95"
              >
                <X className="h-3 w-3" />
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Grid KPIs — mesmo padrão do Index */}
        <div className="animate-fade-in-up animate-delay-2 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-32 rounded-3xl bg-secondary/50 animate-pulse" />
            ))
          ) : (
            <>
              <KpiCard label="Faturamento"  value={formatCurrency(kpis.faturamento)}  icon={<DollarSign  className="h-4 w-4" />} accent="primary"     />
              <KpiCard label="Recebido"     value={formatCurrency(kpis.recebido)}      icon={<TrendingUp  className="h-4 w-4" />} accent="success"     />
              <KpiCard label="A Receber"    value={formatCurrency(kpis.aReceber)}      icon={<Clock       className="h-4 w-4" />} accent="warning"     sub={`${kpis.qtdPendentes} venda(s)`} />
              <KpiCard label="Vencidas"     value={formatCurrency(kpis.totalVencidas)} icon={<AlertTriangle className="h-4 w-4" />} accent="destructive" sub={`${kpis.qtdVencidas} venda(s)`} />
              <KpiCard label="Total Fiado"  value={formatCurrency(kpis.totalFiado)}   icon={<CreditCard  className="h-4 w-4" />} accent="primary"     />
              <KpiCard label="Total Vendas" value={String(kpis.qtdTotal)}             icon={<ShoppingBag className="h-4 w-4" />} accent="success"     />
              <KpiCard label="Clientes"     value={String(kpis.clientes)}             icon={<Users       className="h-4 w-4" />} accent="warning"     />
              <KpiCard label="Ticket Médio" value={formatCurrency(kpis.ticketMedio)}  icon={<Package     className="h-4 w-4" />} accent="destructive" />
            </>
          )}
        </div>
      </main>

      <NotificacoesSheet
        open={notifsOpen}
        onClose={() => setNotifsOpen(false)}
        notificacoes={notificacoes}
      />
    </div>
  );
}

// ✅ SummaryCard idêntico ao do Index (renomeado KpiCard para clareza)
function KpiCard({
  label, value, accent, icon, sub,
}: {
  label:  string;
  value:  string;
  accent: "primary" | "success" | "warning" | "destructive";
  icon?:  React.ReactNode;
  sub?:   string;
}) {
  const accentClasses =
    accent === "success"     ? "from-success/20 to-success/5 border-success/10 text-success"
    : accent === "warning"   ? "from-warning/20 to-warning/5 border-warning/10 text-warning"
    : accent === "destructive" ? "from-destructive/20 to-destructive/5 border-destructive/10 text-destructive"
    : "from-primary/20 to-primary/5 border-primary/10 text-primary";

  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 backdrop-blur-sm shadow-lg ${accentClasses}`}>
      <div className="absolute -right-2 -top-2 opacity-10">{icon}</div>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{label}</p>
      <p className="text-base font-black tabular-nums tracking-tight">{value}</p>
      {sub && <p className="text-[10px] opacity-60 mt-0.5">{sub}</p>}
    </div>
  );
}