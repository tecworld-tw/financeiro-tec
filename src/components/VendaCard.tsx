import { memo, useState } from "react";
import { Venda } from "@/lib/types";
import { formatCurrency, formatDate, isVencida, baixarParcela } from "@/lib/vendas-store";
import { gerarPDFPromissoria } from "@/lib/pdf-utils";
import { Edit2, Trash2, Phone, AlertTriangle, Clock, CheckCircle2, User, Package, CreditCard, Banknote, Landmark, Receipt, ChevronRight, Loader2, FileText, Download } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface VendaCardProps {
  venda: Venda;
  onEdit: (venda: Venda) => void;
  onDelete: (venda: Venda) => void;
  onTogglePago: (venda: Venda) => void;
  onBaixarParcela?: () => void;
  delay?: number;
}

export const VendaCard = memo(function VendaCard({ venda, onEdit, onDelete, onTogglePago, onBaixarParcela, delay = 0 }: VendaCardProps) {
  const vencida = isVencida(venda);
  const [loadingBaixa, setLoadingBaixa] = useState(false);

  const getPaymentIcon = () => {
    switch (venda.formaPagamento) {
      case "Dinheiro": return <Banknote className="h-3 w-3" />;
      case "Pix": return <Landmark className="h-3 w-3" />;
      case "Cartão": return <CreditCard className="h-3 w-3" />;
      case "Promissória": return <Receipt className="h-3 w-3" />;
      default: return <Banknote className="h-3 w-3" />;
    }
  };

  const handleBaixa = async () => {
    if (!onBaixarParcela) return;
    try {
      setLoadingBaixa(true);
      await onBaixarParcela();
    } finally {
      setLoadingBaixa(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      toast.info("Gerando PDF da Promissória...");
      await gerarPDFPromissoria(venda);
      toast.success("PDF gerado com sucesso!");
    } catch (err) {
      toast.error("Erro ao gerar PDF");
      console.error(err);
    }
  };

  return (
    <Card 
      style={{ animationDelay: `${delay}ms` }}
      className="overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur-sm group/card h-full flex flex-col"
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-full bg-primary/10 text-primary group-hover/card:bg-primary group-hover/card:text-primary-foreground transition-colors shrink-0">
                <User className="h-3.5 w-3.5" />
              </div>
              <h3 className="font-extrabold text-foreground text-base truncate tracking-tight">{venda.nomeCliente}</h3>
            </div>
            <div className="flex flex-wrap gap-1.5 items-center">
              {venda.contato && (
                <a
                  href={`tel:${String(venda.contato).replace(/\D/g, "")}`}
                  className="flex items-center gap-1 text-[10px] font-bold text-info hover:text-info/80 transition-colors bg-info/5 px-2 py-0.5 rounded-md"
                >
                  <Phone className="h-3 w-3" />
                  {venda.contato}
                </a>
              )}
              <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md border border-border/20">
                {getPaymentIcon()}
                <span>{venda.formaPagamento}</span>
              </div>
            </div>
          </div>
          <Badge 
            variant={venda.pago ? "default" : vencida ? "destructive" : "secondary"}
            className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest shadow-sm shrink-0 ${
              venda.pago ? "bg-emerald-500 text-white border-none" : ""
            }`}
          >
            {venda.pago ? "Liquidado" : vencida ? "Vencido" : "Pendente"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 py-2 space-y-3 flex-1">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/40 group-hover/card:border-primary/20 transition-colors">
          <div className="p-2 rounded-lg bg-background shadow-inner shrink-0">
            <Package className="h-4 w-4 text-primary opacity-80" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-foreground/90 truncate leading-tight">{venda.descricao || "PRODUTO"}</p>
            <p className="text-[10px] text-muted-foreground font-medium">Qtd: <span className="text-foreground font-bold">{venda.quantidade} un.</span></p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 leading-none mb-1">Total</p>
            <p className="text-base font-black text-primary tabular-nums tracking-tighter leading-none">{formatCurrency(venda.valor)}</p>
          </div>
        </div>

        {/* Lógica de Parcelas */}
        {(venda.formaPagamento === "Promissória" || (venda.formaPagamento === "Cartão" && venda.tipoCartao === "Crédito")) && (
          <div className="space-y-2 p-3 rounded-xl bg-primary/5 border border-primary/10 shadow-inner relative overflow-hidden">
            <div className="flex justify-between items-center relative z-10">
              <span className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground/60">Parcelamento</span>
              <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                {venda.parcelasPagas}/{venda.parcelasTotal} OK
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 relative z-10">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest leading-none">Pago</span>
                <span className="text-sm font-black text-emerald-500 tabular-nums leading-none">{formatCurrency(venda.valorPago || 0)}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest leading-none">Falta</span>
                <span className="text-sm font-black text-destructive tabular-nums leading-none">{formatCurrency(venda.valorRestante || 0)}</span>
              </div>
            </div>

            {!venda.pago && (
              <div className="flex gap-2 mt-1">
                <Button 
                  size="sm" 
                  variant="default" 
                  className="flex-1 h-10 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 group-hover/card:scale-[1.01] transition-transform"
                  onClick={handleBaixa}
                  disabled={loadingBaixa}
                >
                  {loadingBaixa ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>Baixar <ChevronRight className="ml-1 h-3.5 w-3.5" /></>
                  )}
                </Button>
                
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-10 px-3 border-primary/20 text-primary hover:bg-primary/10 hover:text-primary transition-all"
                  onClick={handleDownloadPDF}
                  title="Gerar PDF da Promissória"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {vencida && !venda.pago && (
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider p-2 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 animate-pulse">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Vencido!</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-2 flex items-center justify-between border-t border-border/40 bg-muted/5 mt-auto">
        <div className="flex items-center gap-1.5 text-[9px] font-black text-muted-foreground/60 uppercase tracking-tighter">
          <Clock className="h-3 w-3 opacity-50" />
          {formatDate(venda.dataVenda)}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex bg-background/50 rounded-lg p-0.5 border border-border/30">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"
              onClick={() => onEdit(venda)}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(venda)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className={`h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
              venda.pago 
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" 
                : "bg-destructive/5 border-destructive/20 text-destructive"
            }`}
            onClick={() => onTogglePago(venda)}
          >
            {venda.pago ? "PAGO" : "PENDENTE"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
});
