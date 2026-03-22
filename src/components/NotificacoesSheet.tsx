import { Notificacao } from "@/lib/types";
import { BottomSheet } from "./BottomSheet";
import { formatCurrency, formatDate } from "@/lib/vendas-store";
import { AlertTriangle, Clock, AlertCircle } from "lucide-react";

interface NotificacoesSheetProps {
  open: boolean;
  onClose: () => void;
  notificacoes: Notificacao[];
  onGoToVenda?: (vendaId: string) => void;
}

const iconMap = {
  vencido: <AlertTriangle className="h-4 w-4 text-destructive" />,
  "vence-hoje": <AlertCircle className="h-4 w-4 text-warning" />,
  "vence-breve": <Clock className="h-4 w-4 text-info" />,
};

const bgMap = {
  vencido: "border-l-destructive bg-destructive/5",
  "vence-hoje": "border-l-warning bg-warning/5",
  "vence-breve": "border-l-info bg-info/5",
};

const labelMap = {
  vencido: "Vencido",
  "vence-hoje": "Vence Hoje",
  "vence-breve": "Em Breve",
};

export function NotificacoesSheet({ open, onClose, notificacoes }: NotificacoesSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Notificações">
      {notificacoes.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Nenhuma pendência</p>
          <p className="text-xs mt-1">Todas as vendas estão em dia 🎉</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notificacoes.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl border-l-4 p-3.5 ${bgMap[n.tipo]}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{iconMap[n.tipo]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="font-semibold text-sm truncate">{n.cliente}</span>
                    <span className={`badge text-[10px] ${
                      n.tipo === "vencido" ? "bg-destructive/15 text-destructive"
                      : n.tipo === "vence-hoje" ? "bg-warning/15 text-warning"
                      : "bg-info/15 text-info"
                    }`}>
                      {labelMap[n.tipo]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{n.mensagem}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Vencimento: {formatDate(n.data)}
                  </p>
                </div>
              </div>
            </div>
          ))}

          <div className="text-center pt-3 pb-1">
            <p className="text-xs text-muted-foreground">
              {notificacoes.filter(n => n.tipo === "vencido").length} vencida(s) ·{" "}
              {notificacoes.filter(n => n.tipo === "vence-hoje").length} hoje ·{" "}
              {notificacoes.filter(n => n.tipo === "vence-breve").length} em breve
            </p>
          </div>
        </div>
      )}
    </BottomSheet>
  );
}