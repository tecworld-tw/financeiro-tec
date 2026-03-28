import { useState, useEffect } from "react";
import { ItemEstoque } from "@/lib/types";
import { BottomSheet } from "./BottomSheet";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { Package, Calendar, DollarSign, Tag, Archive, CheckCircle2, TrendingUp, Truck, MapPin } from "lucide-react";
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
  precoVenda: 0,
  status: "em_estoque",
  estoque: "SÃO LUÍS",
  origem: "Manual",
  imagemUrl: ""
};

function normalizeImagemUrl(input: string): string {
  const value = input.trim();
  if (!value) return "";
  const srcMatch = value.match(/src\s*=\s*["'`]\s*([^"'`>]+)\s*["'`]/i);
  if (srcMatch?.[1]) return srcMatch[1].trim();
  const urlMatch = value.match(/https?:\/\/[^\s"'`>]+/i);
  if (urlMatch?.[0]) return urlMatch[0].trim();
  return value;
}

export function EstoqueModal({ open, item, onClose, onSave }: EstoqueModalProps) {
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (item) {
      setForm({
        dataCompra: item.dataCompra,
        nomeProduto: item.nomeProduto,
        quantidade: item.quantidade,
        valorCompra: item.valorCompra,
        precoVenda: item.precoVenda || 0,
        status: item.status,
        estoque: item.estoque || "SÃO LUÍS",
        origem: item.origem,
        comprovanteUrl: item.comprovanteUrl,
        imagemUrl: item.imagemUrl || ""
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
    onSave({ ...form, imagemUrl: normalizeImagemUrl(form.imagemUrl || "") });
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

          <Field label="Link da Imagem">
            <input
              type="text"
              value={form.imagemUrl || ""}
              onChange={(e) => set("imagemUrl", normalizeImagemUrl(e.target.value))}
              className="input-field h-12 text-sm font-bold"
              placeholder='https://... ou <img src="...">'
            />
          </Field>

          <div className="grid grid-cols-3 gap-4">
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
            <Field label="Vlr Compra">
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
            <Field label="Vlr Venda">
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={form.precoVenda || ""}
                onChange={(e) => set("precoVenda", parseFloat(e.target.value) || 0)}
                className="input-field h-12 text-sm font-black tabular-nums text-emerald-600"
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
                  +{formatCurrency((form.precoVenda || calcularSugestaoVenda(form.valorCompra)) - form.valorCompra)}
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

          <Field label="Localização do Estoque">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => set("estoque", "SÃO LUÍS")}
                className={`flex items-center justify-center gap-2 h-12 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                  form.estoque === "SÃO LUÍS" ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "border-border bg-card text-muted-foreground hover:bg-secondary"
                }`}
              >
                <MapPin className="h-4 w-4" /> SÃO LUÍS
              </button>
              <button
                type="button"
                onClick={() => set("estoque", "PARNAIBA")}
                className={`flex items-center justify-center gap-2 h-12 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                  form.estoque === "PARNAIBA" ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "border-border bg-card text-muted-foreground hover:bg-secondary"
                }`}
              >
                <MapPin className="h-4 w-4" /> PARNAIBA
              </button>
            </div>
          </Field>

          <Field label="Status">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => set("status", "em_estoque")}
                className={`flex flex-col items-center justify-center gap-1 h-14 rounded-2xl border text-[9px] font-black uppercase tracking-tighter transition-all ${
                  form.status === "em_estoque" ? "border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "border-border bg-card text-muted-foreground hover:bg-secondary"
                }`}
              >
                <CheckCircle2 className="h-4 w-4" /> <span>Em Estoque</span>
              </button>
              <button
                type="button"
                onClick={() => set("status", "a_caminho")}
                className={`flex flex-col items-center justify-center gap-1 h-14 rounded-2xl border text-[9px] font-black uppercase tracking-tighter transition-all ${
                  form.status === "a_caminho" ? "border-amber-500 bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "border-border bg-card text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Truck className="h-4 w-4" /> <span>A Caminho</span>
              </button>
              <button
                type="button"
                onClick={() => set("status", "esgotado")}
                className={`flex flex-col items-center justify-center gap-1 h-14 rounded-2xl border text-[9px] font-black uppercase tracking-tighter transition-all ${
                  form.status === "esgotado" ? "border-destructive bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20" : "border-border bg-card text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Archive className="h-4 w-4" /> <span>Esgotado</span>
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
