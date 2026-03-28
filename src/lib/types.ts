export interface Venda {
  id: string;
  dataVenda: string;
  nomeCliente: string;
  contato: string;
  valor: number;
  quantidade: number;
  descricao: string;
  fiado: boolean;
  vencimento: string;
  pago: boolean;
  
  // Novos campos de pagamento
  formaPagamento?: "Dinheiro" | "Pix" | "Cartão" | "Promissória";
  tipoCartao?: "Débito" | "Crédito" | "";
  parcelasTotal?: number;
  parcelasPagas?: number;
  valorPago?: number;
  valorRestante?: number;
}

export interface Notificacao {
  id: string;
  vendaId: string;
  tipo: "vencido" | "vence-hoje" | "vence-breve";
  mensagem: string;
  cliente: string;
  valor: number;
  lida: boolean;
  data: string;
}

export type FiltroStatus = "todos" | "pago" | "nao-pago" | "vencido" | "fiado";

export interface ItemEstoque {
  id: string;
  dataCompra: string;
  nomeProduto: string;
  quantidade: number;
  valorCompra: number;
  status: "em_estoque" | "esgotado" | "a_caminho";
  estoque: "SÃO LUÍS" | "PARNAIBA";
  origem: string; // Ex: AliExpress, Manual, etc.
  comprovanteUrl?: string;
  imagemUrl?: string;
  precoVenda?: number;
}

export type FiltroEstoque = "todos" | "disponivel" | "esgotado";
