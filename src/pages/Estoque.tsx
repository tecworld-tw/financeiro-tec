import { useState, useMemo, useCallback, useEffect } from "react";
import { Header } from "@/components/Header";
import { EstoqueCard } from "@/components/EstoqueCard";
import { EstoqueModal } from "@/components/EstoqueModal";
import { DeleteConfirmSheet } from "@/components/DeleteConfirmSheet";
import { NotificacoesSheet } from "@/components/NotificacoesSheet";
import { ItemEstoque, FiltroEstoque } from "@/lib/types";
import { getEstoque, addEstoque, updateEstoque, deleteEstoque, parseAliExpressReceipt, getVendas, getNotificacoes } from "@/lib/vendas-store";
import { Search, Plus, FileText, Filter, Package, Loader2, ArrowLeft, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const Estoque = () => {
  const [estoque, setEstoque] = useState<ItemEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState<FiltroEstoque>("todos");
  const [notificacoes, setNotificacoes] = useState<any[]>([]);
  const [notifsOpen, setNotifsOpen] = useState(false);
  
  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemEstoque | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ItemEstoque | null>(null);
  const [parsing, setParsing] = useState(false);

  const reload = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const [dataEstoque, dataVendas] = await Promise.all([
        getEstoque(force),
        getVendas(force)
      ]);
      setEstoque(dataEstoque);
      setNotificacoes(getNotificacoes(dataVendas));
    } catch (err) {
      toast.error("Erro ao carregar estoque");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const itemsFiltrados = useMemo(() => {
    return estoque.filter((item) => {
      const matchesSearch = item.nomeProduto.toLowerCase().includes(search.toLowerCase());
      const matchesFiltro = 
        filtro === "todos" || 
        (filtro === "disponivel" && item.status === "em_estoque") || 
        (filtro === "esgotado" && item.status === "esgotado");
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
      reload(true);
    } catch (err) {
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
    } catch (err) {
      toast.error("Erro ao remover item");
    }
  };

  const handleToggleStatus = async (item: ItemEstoque) => {
    try {
      const newStatus = item.status === "em_estoque" ? "esgotado" : "em_estoque";
      await updateEstoque(item.id, { status: newStatus });
      toast.success(`Status alterado para ${newStatus === "em_estoque" ? "Em Estoque" : "Esgotado"}`);
      reload(true);
    } catch (err) {
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
      e.target.value = ""; // Clear input
    }
  };

  const openAdd = () => {
    setEditingItem(null);
    setModalOpen(true);
  };

  const openEdit = (item: ItemEstoque) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background selection:bg-primary/30">
      <Header notificacoes={notificacoes} onNotificacoesClick={() => setNotifsOpen(true)} />

      <main className="mx-auto max-w-7xl px-4 pb-32">
        <div className="mt-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-foreground flex items-center gap-2">
              ESTOQUE TEC
            </h2>
            <p className="text-sm font-medium text-muted-foreground opacity-70">
              {estoque.length} produtos cadastrados
            </p>
          </div>
          
          <div className="flex gap-2">
            <label className={`flex-1 md:flex-none flex items-center justify-center gap-2 rounded-2xl bg-secondary px-6 py-4 text-sm font-black uppercase tracking-widest text-foreground transition-all hover:bg-secondary/80 active:scale-95 cursor-pointer ${parsing ? "opacity-50 pointer-events-none" : ""}`}>
              {parsing ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
              Anexar Comprovante
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={parsing} />
            </label>
            <button 
              onClick={openAdd}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-sm font-black uppercase tracking-widest text-primary-foreground shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Plus className="h-5 w-5" />
              Lançamento Manual
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="relative group md:col-span-2">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <input
              type="text"
              placeholder="Buscar produto no estoque..."
              className="input-field h-14 pl-12 text-base"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value as FiltroEstoque)}
              className="input-field h-14 text-sm font-bold uppercase tracking-wider"
            >
              <option value="todos">Todos</option>
              <option value="disponivel">Disponível</option>
              <option value="esgotado">Esgotado</option>
            </select>
          </div>
        </div>

        {/* Grid Items */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6 animate-fade-in-up">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-48 rounded-3xl bg-secondary/50 animate-pulse" />
            ))
          ) : itemsFiltrados.length > 0 ? (
            itemsFiltrados.map((item, idx) => (
              <EstoqueCard
                key={item.id}
                item={item}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                onToggleStatus={handleToggleStatus}
                delay={idx * 50}
              />
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-secondary mb-4">
                <Package className="h-10 w-10 text-muted-foreground opacity-20" />
              </div>
              <p className="text-xl font-bold text-foreground opacity-40">Nenhum item no estoque</p>
              <p className="text-sm text-muted-foreground mt-1">Adicione manualmente ou anexe um comprovante</p>
            </div>
          )}
        </div>
      </main>

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
