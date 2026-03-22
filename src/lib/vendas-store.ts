import { Venda, Notificacao, ItemEstoque } from "./types";
import { createWorker } from "tesseract.js";

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

// Cache em memória para evitar re-fetches desnecessários durante a mesma sessão
let memoryCache: Venda[] | null = null;
let lastFetchTime = 0;
let fetchPromise: Promise<Venda[]> | null = null;

let estoqueCache: ItemEstoque[] | null = null;
let lastEstoqueFetchTime = 0;
let estoqueFetchPromise: Promise<ItemEstoque[]> | null = null;

const CACHE_TTL = 30000; // 30 segundos de cache em memória

function parseDate(dateStr: any): string {
  if (!dateStr || dateStr === "N/A") return "";
  const s = String(dateStr).trim();
  const brMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return isoMatch[0];
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  } catch (e) {}
  return s;
}

function parseNumber(val: any): number {
  if (typeof val === "number") return val;
  if (!val) return 0;
  const s = String(val).trim();
  if (s.includes(",") && s.includes(".")) return Number(s.replace(/\./g, "").replace(",", "."));
  if (s.includes(",")) return Number(s.replace(",", "."));
  return Number(s) || 0;
}

function mapToFrontend(v: any): Venda {
  try {
    return {
      id: String(v.linhaNumero || v.id || Math.random()),
      dataVenda: parseDate(v["data venda"] || v.dataVenda),
      nomeCliente: String(v.cliente || v.nomeCliente || "").trim(),
      contato: String(v.numeroInsta || v.contato || "").trim(),
      valor: parseNumber(v.valor),
      quantidade: parseNumber(v.qtd || v.quantidade || 1),
      descricao: String(v.descricao || v.produto || "").trim(),
      fiado: String(v.fiado).toLowerCase() === "sim" || v.fiado === true,
      vencimento: parseDate(v.vencimento),
      pago: String(v["status pagamento"] || v.pago).toLowerCase() === "sim" || v.pago === true,
      formaPagamento: v.formaPagamento || "Dinheiro",
      tipoCartao: v.tipoCartao || "",
      parcelasTotal: parseNumber(v.parcelasTotal) || 1,
      parcelasPagas: parseNumber(v.parcelasPagas) || 0,
      valorPago: parseNumber(v.valorPago) || 0,
      valorRestante: parseNumber(v.valorRestante) || 0,
    };
  } catch (err) {
    return {
      id: "error-" + Math.random(),
      dataVenda: "",
      nomeCliente: "Erro nos dados",
      contato: "",
      valor: 0,
      quantidade: 0,
      descricao: "Dados inválidos",
      fiado: false,
      vencimento: "",
      pago: false
    };
  }
}

function mapEstoqueToFrontend(v: any): ItemEstoque {
  return {
    id: String(v.linhaNumero),
    dataCompra: parseDate(v.dataCompra),
    nomeProduto: String(v.nomeProduto || "").trim(),
    quantidade: parseNumber(v.quantidade),
    valorCompra: parseNumber(v.valorCompra),
    status: v.status || "em_estoque",
    origem: v.origem || "Manual",
    comprovanteUrl: v.comprovanteUrl || ""
  };
}

function mapToBackend(v: Partial<Venda>) {
  const payload: any = {};
  if (v.id) payload.linhaNumero = parseInt(v.id);
  if ((v as any).estoqueId) payload.estoqueId = (v as any).estoqueId;
  if (v.nomeCliente !== undefined) payload.nomeCliente = v.nomeCliente;
  if (v.contato !== undefined) payload.numeroInsta = v.contato;
  if (v.valor !== undefined) payload.valor = v.valor;
  if (v.quantidade !== undefined) payload.qtd = v.quantidade;
  if (v.descricao !== undefined) payload.descricao = v.descricao;
  if (v.fiado !== undefined) payload.fiado = v.fiado ? "Sim" : "Não";
  if (v.pago !== undefined) payload.pago = v.pago ? "Sim" : "Não";
  if (v.formaPagamento !== undefined) payload.formaPagamento = v.formaPagamento;
  if (v.tipoCartao !== undefined) payload.tipoCartao = v.tipoCartao;
  if (v.parcelasTotal !== undefined) payload.parcelasTotal = v.parcelasTotal;
  if (v.parcelasPagas !== undefined) payload.parcelasPagas = v.parcelasPagas;
  if (v.valorPago !== undefined) payload.valorPago = v.valorPago;
  if (v.valorRestante !== undefined) payload.valorRestante = v.valorRestante;
  if (v.dataVenda) {
    const [y, m, d] = v.dataVenda.split("-");
    payload.dataVenda = `${d}/${m}/${y}`;
  }
  if (v.vencimento !== undefined) {
    if (v.vencimento && v.vencimento.includes("-")) {
      const [y, m, d] = v.vencimento.split("-");
      payload.vencimento = `${d}/${m}/${y}`;
    } else {
      payload.vencimento = v.vencimento || "N/A";
    }
  }
  return payload;
}

export async function getVendas(forceRefresh = false): Promise<Venda[]> {
  const now = Date.now();
  if (!forceRefresh && memoryCache && (now - lastFetchTime < CACHE_TTL)) return memoryCache;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    const data = await gasGet("getVendas");
    const mapped = Array.isArray(data) ? data.map(mapToFrontend).sort((a, b) => b.dataVenda.localeCompare(a.dataVenda)) : [];
    memoryCache = mapped;
    lastFetchTime = Date.now();
    localStorage.setItem("vendas_backup", JSON.stringify(mapped));
    fetchPromise = null;
    return mapped;
  })();
  return fetchPromise;
}

export async function getEstoque(forceRefresh = false): Promise<ItemEstoque[]> {
  const now = Date.now();
  if (!forceRefresh && estoqueCache && (now - lastEstoqueFetchTime < CACHE_TTL)) return estoqueCache;
  if (estoqueFetchPromise) return estoqueFetchPromise;

  estoqueFetchPromise = (async () => {
    const data = await gasGet("getEstoque");
    const mapped = Array.isArray(data) ? data.map(mapEstoqueToFrontend).sort((a, b) => b.dataCompra.localeCompare(a.dataCompra)) : [];
    estoqueCache = mapped;
    lastEstoqueFetchTime = Date.now();
    estoqueFetchPromise = null;
    return mapped;
  })();
  return estoqueFetchPromise;
}

async function gasGet(action: string) {
  const t = Date.now();
  const url = `${APPS_SCRIPT_URL}?action=${action}&t=${t}`;
  try {
    const response = await fetch(url);
    if (response.ok) return await response.json();
  } catch (err) {}
  
  // Proxy fallback
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}&timestamp=${t}`;
    const response = await fetch(proxyUrl);
    const wrapper = await response.json();
    return JSON.parse(wrapper.contents);
  } catch (err) {
    return [];
  }
}

async function gasPost(payload: any) {
  memoryCache = null;
  estoqueCache = null;
  return fetch(APPS_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(payload),
  });
}

export const addVenda = async (venda: Omit<Venda, "id">) => {
  await gasPost({ action: "add", ...mapToBackend(venda) });
  return { ...venda, id: "pending-" + Date.now() } as Venda;
};

export const updateVenda = async (id: string, data: Partial<Venda>) => 
  gasPost({ action: "update", linhaNumero: parseInt(id), ...mapToBackend(data) });

export const deleteVenda = async (id: string) => 
  gasPost({ action: "delete", linhaNumero: parseInt(id) });

export const baixarParcela = async (id: string) => 
  gasPost({ action: "baixarParcela", linhaNumero: parseInt(id) });

// Estoque CRUD
export const addEstoque = async (item: Omit<ItemEstoque, "id">) => 
  gasPost({ action: "addEstoque", ...item });

export const updateEstoque = async (id: string, data: Partial<ItemEstoque>) => 
  gasPost({ action: "updateEstoque", linhaNumero: parseInt(id), ...data });

export const deleteEstoque = async (id: string) => 
  gasPost({ action: "deleteEstoque", linhaNumero: parseInt(id) });

export const formatCurrency = (v: number) => 
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const formatDate = (d: string) => {
  if (!d) return "";
  const [y, m, d_] = d.split("-");
  return `${d_}/${m}/${y}`;
};

export function getNotificacoes(vendas: Venda[]): Notificacao[] {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const notifs: Notificacao[] = [];
  vendas.forEach((v) => {
    if (v.pago || !v.fiado || !v.vencimento) return;
    const venc = new Date(v.vencimento + "T00:00:00");
    const diffMs = venc.getTime() - hoje.getTime();
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const msgBase = `${formatCurrency(v.valor)} - ${v.nomeCliente}`;
    if (diffDias < 0) notifs.push({ id: `n-${v.id}-v`, vendaId: v.id, tipo: "vencido", mensagem: `Vencido há ${Math.abs(diffDias)} dias (${msgBase})`, cliente: v.nomeCliente, valor: v.valor, lida: false, data: v.vencimento });
    else if (diffDias === 0) notifs.push({ id: `n-${v.id}-h`, vendaId: v.id, tipo: "vence-hoje", mensagem: `Vence hoje (${msgBase})`, cliente: v.nomeCliente, valor: v.valor, lida: false, data: v.vencimento });
    else if (diffDias <= 3) notifs.push({ id: `n-${v.id}-b`, vendaId: v.id, tipo: "vence-breve", mensagem: `Vence em ${diffDias} dias (${msgBase})`, cliente: v.nomeCliente, valor: v.valor, lida: false, data: v.vencimento });
  });
  return notifs.sort((a, b) => {
    const order = { vencido: 0, "vence-hoje": 1, "vence-breve": 2 };
    return order[a.tipo as keyof typeof order] - order[b.tipo as keyof typeof order];
  });
}

export const isVencida = (v: Venda) => {
  if (v.pago || !v.fiado || !v.vencimento) return false;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  return new Date(v.vencimento + "T00:00:00") < hoje;
};

/**
 * Lógica de precificação sugerida (Senior):
 * - Abaixo de R$ 100: +100% (x2)
 * - Entre R$ 100 e R$ 150: +80% (x1.8)
 * - Acima de R$ 150: +50% (x1.5)
 */
export function calcularSugestaoVenda(valorCompra: number): number {
  if (valorCompra < 100) return valorCompra * 2;
  if (valorCompra <= 150) return valorCompra * 1.8;
  return valorCompra * 1.5;
}

// OCR Logic for AliExpress Receipts
export async function parseAliExpressReceipt(imageFile: File): Promise<Partial<ItemEstoque>[]> { 
   const worker = await createWorker("por"); 
   const { data: { text } } = await worker.recognize(imageFile); 
   await worker.terminate(); 
 
   console.log("OCR Result:", text); 
 
   // ── 1. DATA ─────────────────────────────────────────────────────────────── 
   let dataCompra = new Date().toISOString().split("T")[0]; 
   const dateMatch = text.match(/(\d{1,2})\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez),?\s+(\d{4})/i); 
   if (dateMatch) { 
     const months: any = { 
       jan:"01", fev:"02", mar:"03", abr:"04", mai:"05", jun:"06", 
       jul:"07", ago:"08", set:"09", out:"10", nov:"11", dez:"12" 
     }; 
     dataCompra = `${dateMatch[3]}-${months[dateMatch[2].toLowerCase()]}-${dateMatch[1].padStart(2,"0")}`; 
   } 
 
   // ── 2. IMPOSTOS E DESCONTOS DO PEDIDO ──────────────────────────────────── 
   const impostoMatch  = text.match(/impostos?[:\s]+R\$\s*(\d+[,.]\d+)/i); 
   const descontoMatch = text.match(/todos\s+os\s+descontos?[:\s]+R\$\s*(\d+[,.]\d+)/i); 
 
   const totalImpostos  = impostoMatch  ? parseNumber(impostoMatch[1])  : 0; 
   const totalDescontos = descontoMatch ? parseNumber(descontoMatch[1]) : 0; 
 
   console.log(`[Pedido] Impostos: R$${totalImpostos} | Descontos: R$${totalDescontos}`); 
 
   // ── 3. ITENS ────────────────────────────────────────────────────────────── 
   const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0); 
 
   interface RawItem { 
     nomeProduto: string; 
     valorUnitario: number; 
     quantidade: number; 
   } 
   const rawItems: RawItem[] = []; 
 
   for (let i = 0; i < lines.length; i++) { 
     const line = lines[i]; 
 
     const priceQtyMatch = line.match(/R\$\s*(\d+[,.]\d+)\s+x(\d+)/i); 
     if (!priceQtyMatch || i < 2) continue; 
 
     const prevLine  = lines[i - 1]; 
     const prev2Line = lines[i - 2]; 
 
     const isVariation = /^(?:black|white|grey|gray|red|blue|pink|gold|silver|type[\s-]?c|usb[\w\s]*|\d+\s*in\s*\d+|\d+m|[\w\s]+,\s*\d+m)/i.test(prevLine); 
     let nomeProduto = (isVariation ? prev2Line : prevLine) 
       .replace(/\s+(?:Choice|Official|Factory|Digital\s+3c\s+)?(?:Store|Digital\s+Store)$/i, "") 
       .trim(); 
 
     if (!nomeProduto || nomeProduto.toLowerCase().includes("detalhes do item")) continue; 
 
     rawItems.push({ 
       nomeProduto, 
       valorUnitario: parseNumber(priceQtyMatch[1]), 
       quantidade: parseInt(priceQtyMatch[2]) || 1, 
     }); 
   } 
 
   // ── 4. RATEAR DESCONTOS E IMPOSTOS PROPORCIONALMENTE ───────────────────── 
   // Base de rateio = subtotal bruto de cada item (antes de qualquer ajuste) 
   const subtotalPedido = rawItems.reduce( 
     (sum, item) => sum + item.valorUnitario * item.quantidade, 0 
   ); 
 
   const items: Partial<ItemEstoque>[] = rawItems.map(item => { 
     const subtotalItem = item.valorUnitario * item.quantidade; 
     const proporcao    = subtotalPedido > 0 ? subtotalItem / subtotalPedido : 0; 
 
     // Fatia proporcional de cada ajuste para este item 
     const descontosRateados = parseFloat((totalDescontos * proporcao).toFixed(2)); 
     const impostosRateados  = parseFloat((totalImpostos  * proporcao).toFixed(2)); 
 
     // Custo real = (subtotal − desconto + imposto) / quantidade 
     const valorFinal = parseFloat( 
       ((subtotalItem - descontosRateados + impostosRateados) / item.quantidade).toFixed(2) 
     ); 
 
     console.log( 
       `[${item.nomeProduto}] R$${item.valorUnitario} x${item.quantidade}`, 
       `| Desconto rateado: -R$${descontosRateados}`, 
       `| Imposto rateado:  +R$${impostosRateados}`, 
       `| Custo final/un:    R$${valorFinal}` 
     ); 
 
     return { 
       nomeProduto: item.nomeProduto, 
       valorCompra: valorFinal, 
       quantidade: item.quantidade, 
       dataCompra, 
       origem: "AliExpress", 
       status: "em_estoque" 
     }; 
   }); 
 
   // ── 5. FALLBACK ─────────────────────────────────────────────────────────── 
   if (items.length === 0) { 
     const priceMatch = text.match(/R\$\s*(\d+[,.]\d+)/i); 
     const qtyMatch   = text.match(/x(\d+)/i); 
     if (priceMatch) { 
       items.push({ 
         nomeProduto: "Produto AliExpress (Verificar)", 
         valorCompra: parseNumber(priceMatch[1]), 
         quantidade: qtyMatch ? parseInt(qtyMatch[1]) : 1, 
         dataCompra, 
         origem: "AliExpress", 
         status: "em_estoque" 
       }); 
     } 
   } 
 
   return items; 
 }
