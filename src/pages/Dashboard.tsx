import { useState, useMemo, useCallback, useEffect } from "react";
import { Header } from "@/components/Header";
import { getVendas, formatCurrency, getNotificacoes } from "@/lib/vendas-store";
import { NotificacoesSheet } from "@/components/NotificacoesSheet";
import { Venda } from "@/lib/types";
import { toast } from "sonner";
import {
  DollarSign, ShoppingBag, Clock, CreditCard, AlertTriangle, TrendingUp, Users, Package, Loader2
} from "lucide-react";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function Dashboard() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesFiltro, setMesFiltro] = useState<string>("");
  const [anoFiltro, setAnoFiltro] = useState<string>("");
  const [notifsOpen, setNotifsOpen] = useState(false);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getVendas();
      setVendas(data);
    } catch (error) {
      toast.error("Erro ao carregar dados do dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

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
    const qtdTotal = filtradas.length;
    const pagas = filtradas.filter(v => v.pago);
    const recebido = pagas.reduce((s, v) => s + v.valor, 0);
    const pendentes = filtradas.filter(v => !v.pago);
    const aReceber = pendentes.reduce((s, v) => s + v.valor, 0);
    const fiadas = filtradas.filter(v => v.fiado);
    const totalFiado = fiadas.reduce((s, v) => s + v.valor, 0);

    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const vencidas = filtradas.filter(v => v.fiado && !v.pago && v.vencimento && new Date(v.vencimento+"T00:00:00") < hoje);
    const totalVencidas = vencidas.reduce((s, v) => s + v.valor, 0);

    const clientes = new Set(filtradas.map(v => v.nomeCliente)).size;
    const ticketMedio = qtdTotal > 0 ? faturamento / qtdTotal : 0;

    return { faturamento, qtdTotal, recebido, aReceber, totalFiado, totalVencidas, clientes, ticketMedio, qtdPendentes: pendentes.length, qtdVencidas: vencidas.length };
  }, [filtradas]);

  return (
    <div className="min-h-screen bg-background">
      <Header notificacoes={notificacoes} onNotificacoesClick={() => setNotifsOpen(true)} />

      <main className="mx-auto max-w-7xl px-4 pb-16">
        <div className="mt-8 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-foreground">
              Dashboard <TrendingUp className="inline-block h-6 w-6 text-primary ml-1" />
            </h2>
            <p className="text-sm font-medium text-muted-foreground opacity-70">
              Visão geral do seu negócio
            </p>
          </div>

          {/* Filters */}
          <div className="animate-fade-in-up flex gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
            <select
              value={mesFiltro}
              onChange={(e) => setMesFiltro(e.target.value)}
              className="input-field min-w-[140px] text-xs font-bold"
            >
              <option value="">Todos os meses</option>
              {MESES.map((m, i) => (
                <option key={i} value={String(i + 1)}>{m}</option>
              ))}
            </select>
            <select
              value={anoFiltro}
              onChange={(e) => setAnoFiltro(e.target.value)}
              className="input-field min-w-[100px] text-xs font-bold"
            >
              <option value="">Todos</option>
              {anos.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            {(mesFiltro || anoFiltro) && (
              <button
                onClick={() => { setMesFiltro(""); setAnoFiltro(""); }}
                className="whitespace-nowrap rounded-xl bg-primary/10 px-4 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-all"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* KPI Grid - Responsive */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-32 rounded-3xl bg-secondary/50 animate-pulse" />
            ))
          ) : (
            <>
              <KpiTile
                icon={<DollarSign className="h-5 w-5" />}
                label="Faturamento"
                value={formatCurrency(kpis.faturamento)}
                accent="primary"
                delay={0}
              />
              <KpiTile
                icon={<TrendingUp className="h-5 w-5" />}
                label="Recebido"
                value={formatCurrency(kpis.recebido)}
                accent="success"
                delay={60}
              />
              <KpiTile
                icon={<Clock className="h-5 w-5" />}
                label="A Receber"
                value={formatCurrency(kpis.aReceber)}
                sub={`${kpis.qtdPendentes} venda(s)`}
                accent="warning"
                delay={120}
              />
              <KpiTile
                icon={<AlertTriangle className="h-5 w-5" />}
                label="Vencidas"
                value={formatCurrency(kpis.totalVencidas)}
                sub={`${kpis.qtdVencidas} venda(s)`}
                accent="destructive"
                delay={180}
              />
              <KpiTile
                icon={<CreditCard className="h-5 w-5" />}
                label="Total Fiado"
                value={formatCurrency(kpis.totalFiado)}
                accent="info"
                delay={240}
              />
              <KpiTile
                icon={<ShoppingBag className="h-5 w-5" />}
                label="Total Vendas"
                value={String(kpis.qtdTotal)}
                accent="primary"
                delay={300}
              />
              <KpiTile
                icon={<Users className="h-5 w-5" />}
                label="Clientes"
                value={String(kpis.clientes)}
                accent="info"
                delay={360}
              />
              <KpiTile
                icon={<Package className="h-5 w-5" />}
                label="Ticket Médio"
                value={formatCurrency(kpis.ticketMedio)}
                accent="primary"
                delay={420}
              />
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

function KpiTile({
  icon,
  label,
  value,
  sub,
  accent,
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent: "primary" | "success" | "warning" | "destructive" | "info";
  delay?: number;
}) {
  const iconBg = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
    info: "bg-info/10 text-info",
  }[accent];

  const borderColor = {
    primary: "border-t-primary/40",
    success: "border-t-success/40",
    warning: "border-t-warning/40",
    destructive: "border-t-destructive/40",
    info: "border-t-info/40",
  }[accent];

  return (
    <div
      className={`animate-fade-in-up glass-card border-t-2 p-4 ${borderColor}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <div className={`rounded-lg p-1.5 ${iconBg}`}>{icon}</div>
      </div>
      <p className="text-lg font-bold tabular-nums leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
