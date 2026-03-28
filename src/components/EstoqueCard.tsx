import { memo } from "react";
import { ItemEstoque } from "@/lib/types";
import { formatCurrency, formatDate, calcularSugestaoVenda } from "@/lib/vendas-store";
import { Edit2, Trash2, Package, Calendar, DollarSign, Tag, Archive, CheckCircle2, TrendingUp, Truck, MapPin } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface EstoqueCardProps {
  item: ItemEstoque;
  onEdit: (item: ItemEstoque) => void;
  onDelete: (item: ItemEstoque) => void;
  onToggleStatus: (item: ItemEstoque) => void;
  delay?: number;
}

export const EstoqueCard = memo(function EstoqueCard({ item, onEdit, onDelete, onToggleStatus, delay = 0 }: EstoqueCardProps) {
  const isEsgotado = item.status === "esgotado";
  const isACaminho = item.status === "a_caminho";

  return (
    <Card 
      style={{ animationDelay: `${delay}ms` }}
      className={`overflow-hidden transition-all hover:shadow-2xl hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur-sm group/card h-full flex flex-col ${isEsgotado ? "opacity-75 grayscale-[0.5]" : ""}`}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-full transition-colors shrink-0 ${
                isEsgotado ? "bg-muted text-muted-foreground" : 
                isACaminho ? "bg-amber-500/10 text-amber-500" :
                "bg-primary/10 text-primary group-hover/card:bg-primary group-hover/card:text-primary-foreground"
              }`}>
                {isACaminho ? <Truck className="h-3.5 w-3.5" /> : <Package className="h-3.5 w-3.5" />}
              </div>
              <h3 className="font-extrabold text-foreground text-base truncate tracking-tight uppercase">{item.nomeProduto}</h3>
            </div>
            <div className="flex flex-wrap gap-1.5 items-center">
              <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md border border-border/20">
                <Tag className="h-3 w-3" />
                <span>{item.origem}</span>
              </div>
              <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-primary bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
                <MapPin className="h-3 w-3" />
                <span>{item.estoque || "SÃO LUÍS"}</span>
              </div>
            </div>
          </div>
          <Badge 
            variant={isEsgotado ? "destructive" : isACaminho ? "secondary" : "default"}
            className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest shadow-sm shrink-0 ${
              !isEsgotado && !isACaminho ? "bg-emerald-500 text-white border-none" : 
              isACaminho ? "bg-amber-500 text-white border-none" : ""
            }`}
          >
            {isEsgotado ? "Esgotado" : isACaminho ? "A Caminho" : "Em Estoque"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 py-2 space-y-3 flex-1">
        <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/20 border border-border/40 group-hover/card:border-primary/20 transition-colors">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest leading-none mb-1">Quantidade</span>
            <span className="text-sm font-black text-foreground tabular-nums leading-none">{item.quantidade} un.</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest leading-none mb-1">Custo Unit.</span>
            <span className="text-sm font-black text-primary tabular-nums leading-none">{formatCurrency(item.valorCompra)}</span>
          </div>
        </div>

        {/* Preço de Venda */}
        <div className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
          item.precoVenda ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-500/5 border-emerald-500/10"
        }`}>
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${item.precoVenda ? "bg-emerald-500/20 text-emerald-600" : "bg-emerald-500/10 text-emerald-500"}`}>
              <DollarSign className="h-3 w-3" />
            </div>
            <span className={`text-[9px] font-black uppercase tracking-widest ${item.precoVenda ? "text-emerald-700" : "text-emerald-600/80"}`}>
              {item.precoVenda ? "Valor da Venda" : "Sugestão de Venda"}
            </span>
          </div>
          <span className={`text-sm font-black tabular-nums ${item.precoVenda ? "text-emerald-700" : "text-emerald-600"}`}>
            {formatCurrency(item.precoVenda || calcularSugestaoVenda(item.valorCompra))}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[9px] font-black text-muted-foreground/60 uppercase tracking-tighter">
          <Calendar className="h-3 w-3 opacity-50" />
          Compra: {formatDate(item.dataCompra)}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-2 flex items-center justify-between border-t border-border/40 bg-muted/5 mt-auto">
        <div className="flex items-center gap-1.5">
          <div className="flex bg-background/50 rounded-lg p-0.5 border border-border/30">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"
              onClick={() => onEdit(item)}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(item)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className={`h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
            isEsgotado ? "border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10" : 
            isACaminho ? "border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10" :
            "border-destructive/30 text-destructive hover:bg-destructive/10"
          }`}
          onClick={() => onToggleStatus(item)}
        >
          {isEsgotado ? "Repor Estoque" : isACaminho ? "Chegou" : "Marcar Esgotado"}
        </Button>
      </CardFooter>
    </Card>
  );
});
