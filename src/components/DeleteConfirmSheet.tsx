import { Venda } from "@/lib/types";
import { BottomSheet } from "./BottomSheet";
import { formatCurrency } from "@/lib/vendas-store";
import { AlertTriangle } from "lucide-react";

interface DeleteConfirmSheetProps {
  open: boolean;
  venda: Venda | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmSheet({ open, venda, onClose, onConfirm }: DeleteConfirmSheetProps) {
  if (!venda) return null;

  return (
    <BottomSheet open={open} onClose={onClose} title="Confirmar Exclusão">
      <div className="text-center py-4">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <p className="font-semibold text-foreground mb-1">
          Excluir venda de {venda.nomeCliente}?
        </p>
        <p className="text-sm text-muted-foreground">
          {venda.descricao} — {formatCurrency(venda.valor)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Essa ação não pode ser desfeita.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-2 safe-bottom">
        <button onClick={onClose} className="btn-ghost bg-secondary text-center">
          Cancelar
        </button>
        <button
          onClick={() => { onConfirm(); onClose(); }}
          className="rounded-xl bg-destructive px-5 py-3 font-bold text-destructive-foreground transition-all active:scale-[0.97]"
        >
          Excluir
        </button>
      </div>
    </BottomSheet>
  );
}