import { useEffect, useState } from "react";
import { Venda, ItemEstoque } from "@/lib/types";
import { BottomSheet } from "./BottomSheet";
import { toast } from "sonner";
import { CreditCard, Banknote, Landmark, Receipt, Package, Search } from "lucide-react";
import { getEstoque, calcularSugestaoVenda } from "@/lib/vendas-store";

interface VendaModalProps {
  open: boolean;
  venda: Venda | null;
  onClose: () => void;
  onSave: (data: Omit<Venda, "id">) => void;
}

const emptyForm: Omit<Venda, "id"> = {
  dataVenda: new Date().toISOString().split("T")[0],
  nomeCliente: "",
  contato: "",
  valor: 0,
  quantidade: 1,
  descricao: "",
  fiado: false,
  vencimento: "",
  pago: false,
  formaPagamento: "Dinheiro",
  tipoCartao: "",
  parcelasTotal: 1,
  parcelasPagas: 0,
  valorPago: 0,
  valorRestante: 0,
};

function toDateInputValue(value: string): string {
  const v = String(value || "").trim();
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return v;
  const br = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  return v;
}

function toIsoDate(value: string): string {
  const v = String(value || "").trim();
  const br = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;
  return v;
}

function toBrDisplayDate(value: string): string {
  const v = String(value || "").trim();
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const br = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) return `${br[1].padStart(2, "0")}/${br[2].padStart(2, "0")}/${br[3]}`;
  return "";
}

export function VendaModal({ open, venda, onClose, onSave }: VendaModalProps) {
  const [form, setForm] = useState(emptyForm);
  const [estoque, setEstoque] = useState<ItemEstoque[]>([]);
  const [search, setSearch] = useState("");
  const [showEstoque, setShowEstoque] = useState(false);

  useEffect(() => {
    if (open) {
      getEstoque().then(setEstoque);
    }
  }, [open]);

  useEffect(() => {
    if (venda) {
      setForm({
        dataVenda: venda.dataVenda,
        nomeCliente: venda.nomeCliente,
        contato: venda.contato,
        valor: venda.valor,
        quantidade: venda.quantidade,
        descricao: venda.descricao,
        fiado: venda.fiado,
        vencimento: toDateInputValue(venda.vencimento),
        pago: venda.pago,
        formaPagamento: venda.formaPagamento || "Dinheiro",
        tipoCartao: venda.tipoCartao || "",
        parcelasTotal: venda.parcelasTotal || 1,
        parcelasPagas: venda.parcelasPagas || 0,
        valorPago: venda.valorPago || 0,
        valorRestante: venda.valorRestante || 0,
      });
    } else {
      setForm({ ...emptyForm, dataVenda: new Date().toISOString().split("T")[0] });
    }
  }, [venda, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nomeCliente.trim() || !form.descricao.trim()) {
      toast.error("Preencha nome do cliente e descrição");
      return;
    }

    // Validar estoque se houver um item selecionado
    const selectedEstoqueId = (form as any).estoqueId;
    if (selectedEstoqueId) {
      const item = estoque.find(i => i.id === selectedEstoqueId);
      if (item && item.quantidade < form.quantidade) {
        toast.error(`Estoque insuficiente! Apenas ${item.quantidade} em estoque.`);
        return;
      }
    }

    if (form.valor <= 0) {
      toast.error("Valor deve ser maior que zero");
      return;
    }
    const payload = { ...form, vencimento: toIsoDate(form.vencimento) };
    onSave(payload);
    onClose();
  };

  const set = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }));

  const filteredEstoque = estoque.filter(item => 
    item.status === "em_estoque" && 
    item.quantidade > 0 &&
    item.nomeProduto.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <BottomSheet open={open} onClose={onClose} title={venda ? "Editar Venda" : "Nova Venda"}>
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto no-scrollbar px-1 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Cliente">
            <input
              required
              value={form.nomeCliente}
              onChange={(e) => set("nomeCliente", e.target.value.toUpperCase())}
              className="input-field h-12 text-sm font-bold"
              placeholder="NOME DO CLIENTE"
            />
          </Field>

          <div className="relative">
            <Field label="Produto do Estoque">
              <div className="relative flex items-center">
                <input
                  required
                  value={form.descricao}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    set("descricao", val);
                    setSearch(val);
                    setShowEstoque(true);
                    // Se o usuário digitar algo diferente, limpa o ID do estoque para não dar baixa errada
                    if ((form as any).estoqueId) {
                      set("estoqueId", undefined);
                    }
                  }}
                  onFocus={() => setShowEstoque(true)}
                  className="input-field h-12 text-sm font-bold pr-10"
                  placeholder="BUSCAR NO ESTOQUE..."
                />
                <div className="absolute right-3 text-muted-foreground">
                  {showEstoque ? <Search className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                </div>
              </div>
            </Field>

            {showEstoque && filteredEstoque.length > 0 && (
              <div className="absolute z-50 w-full mt-2 max-h-60 overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in slide-in-from-top-2">
                {filteredEstoque.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      set("descricao", item.nomeProduto.toUpperCase());
                      set("estoqueId", item.id);
                      const precoSugerido = calcularSugestaoVenda(item.valorCompra);
                      set("valor", precoSugerido);
                      setShowEstoque(false);
                      setSearch("");
                      toast.success(`Produto selecionado: Sugestão R$ ${precoSugerido.toFixed(2)}`);
                    }}
                    className="w-full flex items-center justify-between p-4 hover:bg-primary/5 border-b border-border/50 last:border-0 transition-colors"
                  >
                    <div className="flex flex-col items-start">
                      <span className="text-xs font-black uppercase tracking-tight">{item.nomeProduto}</span>
                      <span className="text-[10px] text-muted-foreground font-bold">
                        {item.quantidade} EM ESTOQUE • CUSTO {item.valorCompra.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] block font-bold text-muted-foreground uppercase">Sugestão</span>
                      <span className="text-xs font-black text-primary">
                        {calcularSugestaoVenda(item.valorCompra).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {showEstoque && search && filteredEstoque.length === 0 && (
              <div className="absolute z-50 w-full mt-2 p-4 rounded-2xl border border-border bg-card shadow-2xl text-center">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Nenhum produto encontrado</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Valor (R$)">
              <input
                required
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={form.valor || ""}
                onChange={(e) => set("valor", parseFloat(e.target.value) || 0)}
                className="input-field h-12 text-sm font-black tabular-nums"
                placeholder="0,00"
              />
            </Field>
            <Field label="Quantidade">
              <input
                required
                type="number"
                min="1"
                inputMode="numeric"
                value={form.quantidade}
                onChange={(e) => set("quantidade", parseInt(e.target.value) || 1)}
                className="input-field h-12 text-sm font-black tabular-nums"
              />
            </Field>
          </div>

          <Field label="Contato / WhatsApp">
            <input
              value={form.contato}
              onChange={(e) => set("contato", e.target.value)}
              className="input-field h-12 text-sm font-bold"
              placeholder="(00) 00000-0000"
            />
          </Field>
        </div>

        <div className="space-y-3">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
            Forma de Pagamento
          </span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <PaymentOption 
              active={form.formaPagamento === "Dinheiro"} 
              onClick={() => {
                set("formaPagamento", "Dinheiro");
                set("pago", true);
                set("fiado", false);
                set("parcelasTotal", 1);
              }}
              icon={<Banknote className="h-5 w-5" />}
              label="Dinheiro"
            />
            <PaymentOption 
              active={form.formaPagamento === "Pix"} 
              onClick={() => {
                set("formaPagamento", "Pix");
                set("pago", true);
                set("fiado", false);
                set("parcelasTotal", 1);
              }}
              icon={<Landmark className="h-5 w-5" />}
              label="Pix"
            />
            <PaymentOption 
              active={form.formaPagamento === "Cartão"} 
              onClick={() => {
                set("formaPagamento", "Cartão");
                set("tipoCartao", "Débito");
                set("pago", true);
                set("fiado", false);
              }}
              icon={<CreditCard className="h-5 w-5" />}
              label="Cartão"
            />
            <PaymentOption 
              active={form.formaPagamento === "Promissória"} 
              onClick={() => {
                set("formaPagamento", "Promissória");
                set("pago", false);
                set("fiado", true);
              }}
              icon={<Receipt className="h-5 w-5" />}
              label="Promissória"
            />
          </div>
        </div>

        {form.formaPagamento === "Cartão" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in p-5 rounded-3xl bg-primary/5 border border-primary/10">
            <Field label="Tipo de Cartão">
              <div className="grid grid-cols-2 gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    set("tipoCartao", "Débito");
                    set("parcelasTotal", 1);
                    set("pago", true);
                  }}
                  className={`flex items-center justify-center gap-2 h-12 rounded-2xl border text-xs font-black uppercase tracking-widest transition-all ${
                    form.tipoCartao === "Débito" ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "border-border bg-card text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  Débito
                </button>
                <button
                  type="button"
                  onClick={() => {
                    set("tipoCartao", "Crédito");
                    set("pago", false);
                  }}
                  className={`flex items-center justify-center gap-2 h-12 rounded-2xl border text-xs font-black uppercase tracking-widest transition-all ${
                    form.tipoCartao === "Crédito" ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "border-border bg-card text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  Crédito
                </button>
              </div>
            </Field>

            {form.tipoCartao === "Crédito" && (
              <Field label="Parcelas (até 3x)">
                <div className="flex items-center gap-3 mt-1">
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => set("parcelasTotal", n)}
                      className={`flex-1 h-12 rounded-2xl border font-black transition-all ${
                        form.parcelasTotal === n ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "border-border bg-card text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {n}x
                    </button>
                  ))}
                </div>
              </Field>
            )}
          </div>
        )}

        {form.formaPagamento === "Promissória" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in p-5 rounded-3xl bg-primary/5 border border-primary/10">
            <Field label="Parcelas (até 3x)">
              <div className="flex items-center gap-3 mt-1">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => set("parcelasTotal", n)}
                    className={`flex-1 h-12 rounded-2xl border font-black transition-all ${
                      form.parcelasTotal === n ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "border-border bg-card text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {n}x
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Data de Vencimento">
              <div className="space-y-1.5">
                <input
                  type="date"
                  required
                  lang="pt-BR"
                  value={form.vencimento}
                  onChange={(e) => set("vencimento", e.target.value)}
                  className="input-field h-12 font-bold"
                />
                {!!form.vencimento && (
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                    Selecionada: {toBrDisplayDate(form.vencimento)}
                  </p>
                )}
              </div>
            </Field>
          </div>
        )}

        <div className="pt-4 border-t border-border/10">
          <button
            type="submit"
            className="w-full h-14 rounded-2xl bg-primary px-5 py-4 font-black uppercase tracking-widest text-primary-foreground shadow-xl shadow-primary/20 transition-all hover:scale-[1.01] active:scale-95"
          >
            {venda ? "Atualizar Registro" : "Cadastrar Venda"}
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function PaymentOption({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl border p-3 text-xs font-bold transition-all ${
        active ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted/50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
