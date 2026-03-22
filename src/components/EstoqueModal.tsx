import { useState, useEffect } from "react";
import { ItemEstoque } from "@/lib/types";
import { BottomSheet } from "./BottomSheet";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { Package, Calendar, DollarSign, Tag, Archive, CheckCircle2, TrendingUp } from "lucide-react";
import { formatCurrency, calcularSugestaoVenda } from "@/lib/vendas-store";

interface EstoqueModalProps {
  open: boolean;
  item: ItemEstoque | null;
  onClose: () => void;
  onSave: (data: Omit<ItemEstoque, "id">) => void;
}

const emptyForm: Omit<ItemEstoque, "id"> = {
  dataCompra: new Date().toISOString().split("T")[0],
  nomeProduto: "",
  quantidade: 1,
  valorCompra: 0,
  status: "em_estoque",
  origem: "Manual"
};

export function EstoqueModal({ open, item, onClose, onSave }: EstoqueModalProps) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (item) {
      setForm({
        dataCompra: item.dataCompra,
        nomeProduto: item.nomeProduto,
        quantidade: item.quantidade,
        valorCompra: item.valorCompra,
        status: item.status,
        origem: item.origem,
        comprovanteUrl: item.comprovanteUrl
      });
    } else {
      setForm({ ...emptyForm, dataCompra: new Date().toISOString().split("T")[0] });
    }
  }, [item, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nomeProduto.trim()) {
      toast.error("Preencha o nome do produto");
      return;
    }
    onSave(form);
    onClose();
  };

  const set = (key: string, value: unknown) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <BottomSheet open={open} onClose={onClose} title={item ? "Editar Item" : "Novo Lançamento"}>
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto no-scrollbar px-1 pb-4">
        <div className="grid grid-cols-1 gap-5">
          <Field label="Produto">
            <input
              required
              value={form.nomeProduto}
              onChange={(e) => set("nomeProduto", e.target.value.toUpperCase())}
              className="input-field h-12 text-sm font-bold"
              placeholder="NOME DO PRODUTO"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Qtd">
              <input
                required
                type="number"
                min="0"
                value={form.quantidade}
                onChange={(e) => set("quantidade", parseInt(e.target.value) || 0)}
                className="input-field h-12 text-sm font-black"
              />
            </Field>
            <Field label="Valor Compra (un)">
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={form.valorCompra || ""}
                onChange={(e) => set("valorCompra", parseFloat(e.target.value) || 0)}
                className="input-field h-12 text-sm font-black tabular-nums"
                placeholder="0,00"
              />
            </Field>
          </div>

          {form.valorCompra > 0 && (
            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest leading-none mb-1">Sugestão de Venda</p>
                  <p className="text-lg font-black text-emerald-600 tabular-nums leading-none">
                    {formatCurrency(calcularSugestaoVenda(form.valorCompra))}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-emerald-600/40 uppercase tracking-tighter">Lucro Estimado</p>
                <p className="text-sm font-black text-emerald-500">
                  +{formatCurrency(calcularSugestaoVenda(form.valorCompra) - form.valorCompra)}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Data Compra">
              <input
                type="date"
                required
                value={form.dataCompra}
                onChange={(e) => set("dataCompra", e.target.value)}
                className="input-field h-12 font-bold"
              />
            </Field>
            <Field label="Origem">
              <select
                value={form.origem}
                onChange={(e) => set("origem", e.target.value)}
                className="input-field h-12 font-bold"
              >
                <option value="Manual">Manual</option>
                <option value="AliExpress">AliExpress</option>
                <option value="Shopee">Shopee</option>
                <option value="Outros">Outros</option>
              </select>
            </Field>
          </div>

          <Field label="Status">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => set("status", "em_estoque")}
                className={`flex items-center justify-center gap-2 h-12 rounded-2xl border text-xs font-black uppercase tracking-widest transition-all ${
                  form.status === "em_estoque" ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "border-border bg-card text-muted-foreground hover:bg-secondary"
                }`}
              >
                <CheckCircle2 className="h-4 w-4" /> Em Estoque
              </button>
              <button
                type="button"
                onClick={() => set("status", "esgotado")}
                className={`flex items-center justify-center gap-2 h-12 rounded-2xl border text-xs font-black uppercase tracking-widest transition-all ${
                  form.status === "esgotado" ? "border-destructive bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20" : "border-border bg-card text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Archive className="h-4 w-4" /> Esgotado
              </button>
            </div>
          </Field>
        </div>

        <div className="pt-4 border-t border-border/10">
          <Button
            type="submit"
            className="w-full h-14 rounded-2xl font-black uppercase tracking-widest"
          >
            {item ? "Atualizar Estoque" : "Lançar no Estoque"}
          </Button>
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
