import { useState, useMemo, useCallback, useEffect } from "react";
import { Header } from "@/components/Header";
import { VendaCard } from "@/components/VendaCard";
import { VendaModal } from "@/components/VendaModal";
import { DeleteConfirmSheet } from "@/components/DeleteConfirmSheet";
import { NotificacoesSheet } from "@/components/NotificacoesSheet";
import { Venda, FiltroStatus } from "@/lib/types";
import { getVendas, addVenda, updateVenda, deleteVenda, formatCurrency, getNotificacoes, baixarParcela } from "@/lib/vendas-store";
import { Plus, Search, X, AlertTriangle, Filter, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

const FILTROS: { key: FiltroStatus; label: string; icon?: React.ReactNode }[] = [
  { key: "todos", label: "Todas" },
  { key: "nao-pago", label: "Pendentes" },
  { key: "vencido", label: "Vencidas", icon: <AlertTriangle className="h-3 w-3" /> },
  { key: "pago", label: "Pagas" },
];

export default function Index() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<FiltroStatus>("todos");
  const [busca, setBusca] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVenda, setEditingVenda] = useState<Venda | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Venda | null>(null);
  const [notifsOpen, setNotifsOpen] = useState(false);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getVendas();
      setVendas(data);
    } catch (error) {
      toast.error("Erro ao carregar dados da planilha");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const notificacoes = useMemo(() => getNotificacoes(vendas), [vendas]);

  const vendasFiltradas = useMemo(() => {
    let list = vendas;
    if (filtro === "pago") list = list.filter((v) => v.pago);
    if (filtro === "nao-pago") list = list.filter((v) => !v.pago);
    if (filtro === "fiado") list = list.filter((v) => v.fiado && !v.pago);
    if (filtro === "vencido") {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      list = list.filter((v) => v.fiado && !v.pago && v.vencimento && new Date(v.vencimento + "T00:00:00") < hoje);
    }
    if (busca.trim()) {
      const q = busca.toLowerCase();
      list = list.filter(
        (v) =>
          v.nomeCliente.toLowerCase().includes(q) ||
          v.descricao.toLowerCase().includes(q)
      );
    }
    return list;
  }, [vendas, filtro, busca]);

  const totais = useMemo(() => {
    const all = vendas.reduce((s, v) => s + v.valor, 0);
    const pagas = vendas.filter((v) => v.pago).reduce((s, v) => s + v.valor, 0);
    const naoPagas = vendas.filter((v) => !v.pago).reduce((s, v) => s + v.valor, 0);
    const vencidas = vendas.filter((v) => {
      if (v.pago || !v.fiado || !v.vencimento) return false;
      const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
      return new Date(v.vencimento + "T00:00:00") < hoje;
    }).reduce((s, v) => s + v.valor, 0);
    return { all, pagas, naoPagas, vencidas };
  }, [vendas]);

  const handleSave = async (data: Omit<Venda, "id">) => {
    try {
      if (editingVenda) {
        await updateVenda(editingVenda.id, data);
        toast.success("Venda atualizada com sucesso!");
      } else {
        await addVenda(data);
        toast.success("Venda adicionada com sucesso!");
      }
      setModalOpen(false);
      setTimeout(reload, 1000);
    } catch (error) {
      toast.error("Erro ao salvar venda");
    }
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      try {
        await deleteVenda(deleteTarget.id);
        toast.success(`Venda excluída`);
        setDeleteTarget(null);
        setTimeout(reload, 1000);
      } catch (error) {
        toast.error("Erro ao excluir venda");
      }
    }
  };

  const handleTogglePago = async (venda: Venda) => {
    try {
      const novoEstado = !venda.pago;
      await updateVenda(venda.id, { pago: novoEstado });
      toast.success(novoEstado ? `${venda.nomeCliente} marcado como pago!` : `${venda.nomeCliente} marcado como pendente`);
      setTimeout(reload, 1000);
    } catch (error) {
      toast.error("Erro ao atualizar status de pagamento");
    }
  };

  const openEdit = (v: Venda) => {
    setEditingVenda(v);
    setModalOpen(true);
  };

  const openAdd = () => {
    setEditingVenda(null);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background selection:bg-primary/30">
      <Header notificacoes={notificacoes} onNotificacoesClick={() => setNotifsOpen(true)} />

      <main className="mx-auto max-w-7xl px-4 pb-32">
        {/* Modern Welcome Header */}
        <div className="mt-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-foreground flex items-center gap-2">
              VENDAS TEC
            </h2>
            <p className="text-sm font-medium text-muted-foreground opacity-70">
              {vendas.length} registros sincronizados em tempo real
            </p>
          </div>
          
          <div className="hidden md:flex gap-2">
            <button 
              onClick={() => reload(true)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-bold hover:bg-secondary/80 transition-all disabled:opacity-50"
            >
              <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Premium Summary Cards */}
        <div className="animate-fade-in-up grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
          <SummaryCard label="Total Geral" value={formatCurrency(totais.all)} icon={<Sparkles className="h-4 w-4" />} />
          <SummaryCard label="Recebido" value={formatCurrency(totais.pagas)} accent="success" />
          <SummaryCard label="Pendente" value={formatCurrency(totais.naoPagas)} accent="warning" />
          <SummaryCard label="Vencidas" value={formatCurrency(totais.vencidas)} accent="destructive" />
        </div>

        {/* Filters & Search - Grid on Desktop */}
        <div className="animate-fade-in-up animate-delay-1 grid grid-cols-1 lg:grid-cols-12 gap-4 mb-8">
          <div className="lg:col-span-5 relative group">
            <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-xl group-focus-within:bg-primary/10 transition-all" />
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar cliente ou produto..."
                className="input-field pl-11 pr-11 py-4 border-white/5 bg-white/5 backdrop-blur-md rounded-2xl shadow-inner w-full"
              />
              {busca && (
                <button
                  onClick={() => setBusca("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1.5 bg-white/10 text-muted-foreground hover:bg-white/20 transition-all active:scale-90"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 flex gap-2 overflow-x-auto no-scrollbar pb-2 lg:pb-0 items-center">
            {FILTROS.map((f) => {
              const isActive = filtro === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setFiltro(f.key)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-wider transition-all active:scale-95 border shadow-lg ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-primary/20"
                      : "bg-card text-muted-foreground border-border/40 hover:bg-accent"
                  }`}
                >
                  {f.icon}
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sales List - Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6 animate-fade-in-up animate-delay-2">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 rounded-3xl bg-secondary/50 animate-pulse" />
            ))
          ) : vendasFiltradas.length > 0 ? (
            vendasFiltradas.map((v) => (
              <VendaCard
                key={v.id}
                venda={v}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                onTogglePago={handleTogglePago}
                onBaixarParcela={async () => {
                  try {
                    await baixarParcela(v.id);
                    toast.success("Parcela baixada!");
                    reload();
                  } catch (e) {
                    toast.error("Erro ao baixar parcela");
                  }
                }}
              />
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-secondary mb-4">
                <Search className="h-10 w-10 text-muted-foreground opacity-20" />
              </div>
              <p className="text-xl font-bold text-foreground opacity-40">Nenhuma venda encontrada</p>
              <p className="text-sm text-muted-foreground mt-1">Tente ajustar seus filtros ou busca</p>
            </div>
          )}
        </div>
      </main>

      {/* Modern Floating Action Button - Responsive positioning */}
      <div className="fixed bottom-8 right-8 md:bottom-12 md:right-12 safe-bottom z-30">
        <button
          onClick={openAdd}
          className="flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-[2rem] bg-primary text-primary-foreground shadow-[0_20px_50px_rgba(255,191,0,0.4)] transition-all hover:scale-110 active:scale-90 relative group overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          <Plus className="h-8 w-8 md:h-10 md:w-10 relative z-10" strokeWidth={3} />
        </button>
      </div>

      <VendaModal
        open={modalOpen}
        venda={editingVenda}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      <DeleteConfirmSheet
        open={!!deleteTarget}
        venda={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      <NotificacoesSheet
        open={notifsOpen}
        onClose={() => setNotifsOpen(false)}
        notificacoes={notificacoes}
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
  icon
}: {
  label: string;
  value: string;
  accent?: "success" | "warning" | "destructive";
  icon?: React.ReactNode;
}) {
  const accentClasses = accent === "success"
    ? "from-success/20 to-success/5 border-success/10 text-success"
    : accent === "warning"
    ? "from-warning/20 to-warning/5 border-warning/10 text-warning"
    : accent === "destructive"
    ? "from-destructive/20 to-destructive/5 border-destructive/10 text-destructive"
    : "from-primary/20 to-primary/5 border-primary/10 text-primary";

  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 backdrop-blur-sm shadow-lg ${accentClasses}`}>
      <div className="absolute -right-2 -top-2 opacity-10">{icon}</div>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">
        {label}
      </p>
      <p className="text-base font-black tabular-nums tracking-tight">{value}</p>
    </div>
  );
}
