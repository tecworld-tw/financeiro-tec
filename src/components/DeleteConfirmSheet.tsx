import { Venda, ItemEstoque } from "@/lib/types";
import { BottomSheet } from "./BottomSheet";
import { formatCurrency } from "@/lib/vendas-store";
import { AlertTriangle } from "lucide-react";

interface DeleteConfirmSheetProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  // Props opcionais para Venda (legado)
  venda?: Venda | null;
  // Novas props genéricas
  title?: string;
  description?: string;
}

export function DeleteConfirmSheet({ open, onClose, onConfirm, venda, title, description }: DeleteConfirmSheetProps) {
  // Se for uma venda (compatibilidade), preenche os dados
  const displayTitle = title || (venda ? `Excluir venda de ${venda.nomeCliente}?` : "Confirmar Exclusão");
  const displayDesc = description || (venda ? `${venda.descricao} — ${formatCurrency(venda.valor)}` : "Essa ação não pode ser desfeita.");

  // Só não renderiza se não estiver aberto
  if (!open) return null;

  return (
    <BottomSheet open={open} onClose={onClose} title={title || "Confirmar Exclusão"}>
      <div className="text-center py-4">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <p className="font-semibold text-foreground mb-1 px-4">
          {displayTitle}
        </p>
        <p className="text-sm text-muted-foreground px-4">
          {displayDesc}
        </p>
        {!description && (
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mt-4">
            Essa ação é irreversível
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 pt-2 safe-bottom px-4">
        <button 
          onClick={onClose} 
          className="rounded-xl bg-secondary px-5 py-4 font-bold text-foreground transition-all active:scale-[0.97]"
        >
          Cancelar
        </button>
        <button
          onClick={() => { onConfirm(); onClose(); }}
          className="rounded-xl bg-destructive px-5 py-4 font-bold text-white shadow-lg shadow-destructive/20 transition-all active:scale-[0.97]"
        >
          Excluir
        </button>
      </div>
    </BottomSheet>
  );
}