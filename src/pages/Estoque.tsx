import { useState, useMemo, useCallback, useEffect } from "react";
import { Header } from "@/components/Header";
import { EstoqueCard } from "@/components/EstoqueCard";
import { EstoqueModal } from "@/components/EstoqueModal";
import { DeleteConfirmSheet } from "@/components/DeleteConfirmSheet";
import { NotificacoesSheet } from "@/components/NotificacoesSheet";
import { ItemEstoque, FiltroEstoque } from "@/lib/types";
import { getEstoque, addEstoque, updateEstoque, deleteEstoque, parseAliExpressReceipt, getVendas, getNotificacoes } from "@/lib/vendas-store";
import { Search, Plus, FileText, Package, Loader2, X } from "lucide-react";
import { toast } from "sonner";

const FILTROS: { key: FiltroEstoque; label: string }[] = [
  { key: "todos",      label: "Todos"      },
  { key: "disponivel", label: "Disponível" },
  { key: "esgotado",   label: "Esgotado"   },
];

const Estoque = () => {
  const [estoque,      setEstoque]      = useState<ItemEstoque[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [filtro,       setFiltro]       = useState<FiltroEstoque>("todos");
  const [notificacoes, setNotificacoes] = useState<any[]>([]);
  const [notifsOpen,   setNotifsOpen]   = useState(false);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editingItem,  setEditingItem]  = useState<ItemEstoque | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ItemEstoque | null>(null);
  const [parsing,      setParsing]      = useState(false);

  const reload = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const [dataEstoque, dataVendas] = await Promise.all([
        getEstoque(force),
        getVendas(force),
      ]);
      setEstoque(dataEstoque);
      setNotificacoes(getNotificacoes(dataVendas));
    } catch {
      toast.error("Erro ao carregar estoque");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const itemsFiltrados = useMemo(() => {
    return estoque.filter((item) => {
      const matchesSearch  = item.nomeProduto.toLowerCase().includes(search.toLowerCase());
      const matchesFiltro  =
        filtro === "todos" ||
        (filtro === "disponivel" && item.status === "em_estoque") ||
        (filtro === "esgotado"   && item.status === "esgotado");
      return matchesSearch && matchesFiltro;
    });
  }, [estoque, search, filtro]);

  const handleSave = async (data: Omit<ItemEstoque, "id">) => {
    try {
      if (editingItem) {
        await updateEstoque(editingItem.id, data);
        toast.success("Item atualizado!");
      } else {
        await addEstoque(data);
        toast.success("Item adicionado ao estoque!");
      }
      setModalOpen(false);
      reload(true);
    } catch {
      toast.error("Erro ao salvar item");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteEstoque(deleteTarget.id);
      toast.success("Item removido do estoque");
      setDeleteTarget(null);
      setTimeout(() => reload(true), 1000);
    } catch {
      toast.error("Erro ao remover item");
    }
  };

  const handleToggleStatus = async (item: ItemEstoque) => {
    try {
      const newStatus = item.status === "em_estoque" ? "esgotado" : "em_estoque";
      await updateEstoque(item.id, { status: newStatus });
      toast.success(`Status alterado para ${newStatus === "em_estoque" ? "Em Estoque" : "Esgotado"}`);
      reload(true);
    } catch {
      toast.error("Erro ao alterar status");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    toast.info("Lendo comprovante... Por favor, aguarde.");
    try {
      const results = await parseAliExpressReceipt(file);
      if (results.length > 0) {
        for (const item of results) {
          await addEstoque(item as Omit<ItemEstoque, "id">);
        }
        toast.success(`${results.length} item(ns) lançados automaticamente!`);
        reload(true);
      } else {
        toast.error("Não foi possível identificar itens no comprovante.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar comprovante. Tente lançamento manual.");
    } finally {
      setParsing(false);
      e.target.value = "";
    }
  };

  const openAdd  = () => { setEditingItem(null);  setModalOpen(true); };
  const openEdit = (item: ItemEstoque) => { setEditingItem(item); setModalOpen(true); };

  return (
    // ✅ Mesma estrutura raiz do Index: min-h-screen + selection
    <div className="min-h-screen bg-background selection:bg-primary/30">
      <Header notificacoes={notificacoes} onNotificacoesClick={() => setNotifsOpen(true)} />

      {/* ✅ Mesmo padrão de main do Index: max-w-7xl px-4 pb-32 */}
      <main className="mx-auto max-w-7xl px-4 pb-32">

        {/* Cabeçalho da página */}
        <div className="mt-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-foreground">
              ESTOQUE TEC
            </h2>
            <p className="text-sm font-medium text-muted-foreground opacity-70">
              {estoque.length} produtos cadastrados
            </p>
          </div>

          {/* Botão Atualizar — visível só em desktop, igual ao Index */}
          <div className="hidden md:flex gap-2">
            <button
              onClick={() => reload(true)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-bold hover:bg-secondary/80 transition-all disabled:opacity-50"
            >
              <Loader2 className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Filtros e busca — mesmo padrão grid do Index */}
        <div className="animate-fade-in-up animate-delay-1 grid grid-cols-1 lg:grid-cols-12 gap-4 mb-8">

          {/* Campo de busca */}
          <div className="lg:col-span-5 relative group">
            <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-xl group-focus-within:bg-primary/10 transition-all" />
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produto no estoque..."
                className="input-field pl-11 pr-11 py-4 border-white/5 bg-white/5 backdrop-blur-md rounded-2xl shadow-inner w-full"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1.5 bg-white/10 text-muted-foreground hover:bg-white/20 transition-all active:scale-90"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Pills de filtro — mesmo padrão do Index */}
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
                  {f.label}
                </button>
              );
            })}

            {/* Botão comprovante — inline nos filtros, compacto */}
            <label
              className={`flex items-center gap-2 whitespace-nowrap rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-wider border shadow-lg bg-card text-muted-foreground border-border/40 hover:bg-accent transition-all active:scale-95 cursor-pointer ${parsing ? "opacity-50 pointer-events-none" : ""}`}
            >
              {parsing
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <FileText className="h-3.5 w-3.5" />
              }
              Comprovante
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
                disabled={parsing}
              />
            </label>
          </div>
        </div>

        {/* Grid de itens */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6 animate-fade-in-up animate-delay-2">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-48 rounded-3xl bg-secondary/50 animate-pulse" />
            ))
          ) : itemsFiltrados.length > 0 ? (
            itemsFiltrados.map((item) => (
              <EstoqueCard
                key={item.id}
                item={item}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                onToggleStatus={handleToggleStatus}
              />
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-secondary mb-4">
                <Package className="h-10 w-10 text-muted-foreground opacity-20" />
              </div>
              <p className="text-xl font-bold text-foreground opacity-40">Nenhum item no estoque</p>
              <p className="text-sm text-muted-foreground mt-1">
                Adicione manualmente ou anexe um comprovante
              </p>
            </div>
          )}
        </div>
      </main>

      {/* ✅ FAB flutuante — mesmo padrão exato do Index */}
      <div className="fixed bottom-8 right-8 md:bottom-12 md:right-12 safe-bottom z-30">
        <button
          onClick={openAdd}
          className="flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-[2rem] bg-primary text-primary-foreground shadow-[0_20px_50px_rgba(255,191,0,0.4)] transition-all hover:scale-110 active:scale-90 relative group overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          <Plus className="h-8 w-8 md:h-10 md:w-10 relative z-10" strokeWidth={3} />
        </button>
      </div>

      <EstoqueModal
        open={modalOpen}
        item={editingItem}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      <DeleteConfirmSheet
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Remover do Estoque?"
        description={`Tem certeza que deseja remover ${deleteTarget?.nomeProduto}? Esta ação não pode ser desfeita.`}
      />

      <NotificacoesSheet
        open={notifsOpen}
        onClose={() => setNotifsOpen(false)}
        notificacoes={notificacoes}
      />
    </div>
  );
};

export default Estoque;