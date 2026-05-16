import { useState, useMemo, useCallback, useEffect } from "react";
import { Header } from "@/components/Header";
import { Cliente } from "@/lib/types";
import { getClientes, addCliente, updateCliente, deleteCliente } from "@/lib/clientes-store";
import { getVendas, getNotificacoes } from "@/lib/vendas-store";
import { Search, Plus, X, Pencil, Trash2, Loader2, Users, Phone } from "lucide-react";
import { toast } from "sonner";
import { BottomSheet } from "@/components/BottomSheet";

/* ── phone mask ── */
function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}

/* ── modal de cadastro / edição ── */
interface ClienteModalProps {
  open: boolean;
  cliente: Cliente | null;
  onClose: () => void;
  onSave: (data: Omit<Cliente, "id">) => Promise<void>;
}

function ClienteModal({ open, cliente, onClose, onSave }: ClienteModalProps) {
  const [nome, setNome]         = useState("");
  const [telefone, setTelefone] = useState("");
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    if (open) {
      setNome(cliente?.nome ?? "");
      setTelefone(cliente?.telefone ?? "");
    }
  }, [open, cliente]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) { toast.error("Informe o nome do cliente"); return; }
    setSaving(true);
    try {
      await onSave({ nome: nome.trim(), telefone });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={cliente ? "Editar Cliente" : "Novo Cliente"}
    >
      <form onSubmit={handleSubmit} className="space-y-5 px-1 pb-4">
        {/* nome */}
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Nome
          </label>
          <input
            required
            autoFocus
            value={nome}
            onChange={(e) => setNome(e.target.value.toUpperCase())}
            placeholder="NOME DO CLIENTE"
            className="input-field h-12 text-sm font-bold w-full"
          />
        </div>

        {/* telefone */}
        <div>
          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Telefone / WhatsApp
          </label>
          <input
            inputMode="tel"
            value={telefone}
            onChange={(e) => setTelefone(maskPhone(e.target.value))}
            placeholder="(00) 00000-0000"
            className="input-field h-12 text-sm font-bold w-full"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full h-14 rounded-2xl bg-primary font-black uppercase tracking-widest text-primary-foreground shadow-xl shadow-primary/20 transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {cliente ? "Salvar Alterações" : "Cadastrar Cliente"}
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}

/* ── página principal ── */
export default function Clientes() {
  const [clientes,     setClientes]     = useState<Cliente[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editing,      setEditing]      = useState<Cliente | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Cliente | null>(null);
  const [deleting,     setDeleting]     = useState(false);
  const [notificacoes, setNotificacoes] = useState<any[]>([]);
  const [notifsOpen,   setNotifsOpen]   = useState(false);

  const reload = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const [data, vendas] = await Promise.all([
        getClientes(force),
        getVendas(false),
      ]);
      setClientes(data);
      setNotificacoes(getNotificacoes(vendas));
    } catch {
      toast.error("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const filtrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter(
      (c) => c.nome.toLowerCase().includes(q) || c.telefone.includes(q)
    );
  }, [clientes, search]);

  const handleSave = async (data: Omit<Cliente, "id">) => {
    if (editing) {
      await updateCliente(editing.id, data);
      toast.success("Cliente atualizado!");
    } else {
      await addCliente(data);
      toast.success("Cliente cadastrado!");
    }
    reload(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCliente(deleteTarget.id);
      toast.success(`${deleteTarget.nome} removido`);
      setDeleteTarget(null);
      reload(true);
    } catch {
      toast.error("Erro ao excluir cliente");
    } finally {
      setDeleting(false);
    }
  };

  const openEdit = (c: Cliente) => { setEditing(c); setModalOpen(true); };
  const openAdd  = () => { setEditing(null); setModalOpen(true); };

  return (
    <div className="min-h-screen bg-background selection:bg-primary/30">
      <Header notificacoes={notificacoes} onNotificacoesClick={() => setNotifsOpen(true)} />

      <main className="mx-auto max-w-7xl px-4 pb-32">
        {/* título */}
        <div className="mt-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-foreground">
              CLIENTES
            </h2>
            <p className="text-sm font-medium text-muted-foreground opacity-70">
              {clientes.length} cliente{clientes.length !== 1 ? "s" : ""} cadastrado{clientes.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => reload(true)}
            disabled={loading}
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-sm font-bold hover:bg-secondary/80 transition-all disabled:opacity-50"
          >
            <Loader2 className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>

        {/* busca */}
        <div className="relative group mb-8 max-w-lg">
          <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-xl group-focus-within:bg-primary/10 transition-all" />
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou telefone..."
              className="input-field pl-11 pr-11 py-4 border-white/5 bg-white/5 backdrop-blur-md rounded-2xl shadow-inner w-full"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1.5 bg-white/10 text-muted-foreground hover:bg-white/20 transition-all"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* lista */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 rounded-3xl bg-secondary/50 animate-pulse" />
            ))}
          </div>
        ) : filtrados.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtrados.map((c) => (
              <div
                key={c.id}
                className="group relative rounded-3xl border border-border/40 bg-card p-5 shadow-lg hover:border-primary/30 hover:shadow-primary/5 transition-all"
              >
                {/* avatar */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary font-black text-sm shrink-0">
                    {c.nome.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-sm uppercase tracking-tight truncate">{c.nome}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                      <p className="text-xs text-muted-foreground font-medium truncate">
                        {c.telefone || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* actions */}
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(c)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold bg-secondary hover:bg-primary/10 hover:text-primary transition-all"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button
                    onClick={() => setDeleteTarget(c)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold bg-secondary hover:bg-destructive/10 hover:text-destructive transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-secondary mb-4">
              <Users className="h-10 w-10 text-muted-foreground opacity-20" />
            </div>
            <p className="text-xl font-bold text-foreground opacity-40">
              {search ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {search ? "Tente ajustar a busca" : "Clique no botão + para adicionar"}
            </p>
          </div>
        )}
      </main>

      {/* FAB */}
      <div className="fixed bottom-8 right-8 md:bottom-12 md:right-12 z-30">
        <button
          onClick={openAdd}
          className="flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-[2rem] bg-primary text-primary-foreground shadow-[0_20px_50px_rgba(255,191,0,0.4)] transition-all hover:scale-110 active:scale-90 relative group overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          <Plus className="h-8 w-8 md:h-10 md:w-10 relative z-10" strokeWidth={3} />
        </button>
      </div>

      {/* modal cadastro/edição */}
      <ClienteModal
        open={modalOpen}
        cliente={editing}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      {/* confirmação exclusão */}
      {deleteTarget && (
        <BottomSheet
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="Excluir Cliente"
        >
          <div className="px-1 pb-4 space-y-5">
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja excluir{" "}
              <span className="font-black text-foreground">{deleteTarget.nome}</span>?
              Essa ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-12 rounded-2xl border border-border font-bold text-sm transition-all hover:bg-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 h-12 rounded-2xl bg-destructive text-destructive-foreground font-black text-sm transition-all hover:brightness-110 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Excluir
              </button>
            </div>
          </div>
        </BottomSheet>
      )}

      <BottomSheet open={notifsOpen} onClose={() => setNotifsOpen(false)} title="Notificações">
        <div className="px-1 pb-4">
          <p className="text-sm text-muted-foreground text-center py-8">Sem notificações no momento.</p>
        </div>
      </BottomSheet>
    </div>
  );
}
