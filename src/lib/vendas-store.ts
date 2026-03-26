import { Venda, Notificacao, ItemEstoque } from "./types";
import { createWorker } from "tesseract.js";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, runTransaction, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

const VENDAS_COLLECTION = "vendas";
const ESTOQUE_COLLECTION = "produtos";

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
  if (typeof dateStr?.toDate === "function") {
    const d = dateStr.toDate();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  if (dateStr instanceof Date) {
    const y = dateStr.getFullYear();
    const m = String(dateStr.getMonth() + 1).padStart(2, "0");
    const day = String(dateStr.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  const s = String(dateStr).trim();
  const brMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return isoMatch[0];
  const tsMatch = s.match(/seconds[:=]\s*(\d+)/i);
  if (tsMatch) {
    const d = new Date(Number(tsMatch[1]) * 1000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
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

function parseImagemUrl(val: unknown): string {
  if (!val) return "";
  const input = String(val).trim();
  const srcMatch = input.match(/src\s*=\s*["'`]\s*([^"'`>]+)\s*["'`]/i);
  if (srcMatch?.[1]) return srcMatch[1].trim();
  const urlMatch = input.match(/https?:\/\/[^\s"'`>]+/i);
  if (urlMatch?.[0]) return urlMatch[0].trim();
  return input;
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
  const valorBase = v.valorCompra ?? v.precoVenda ?? v.preco ?? 0;
  return {
    id: String(v.id || ""),
    dataCompra: parseDate(v.dataCompra || v.data || ""),
    nomeProduto: String(v.nomeProduto || v.nome || v.produto || "").trim(),
    quantidade: parseNumber(v.quantidade),
    valorCompra: parseNumber(valorBase),
    status: v.status || "em_estoque",
    origem: v.origem || v.categoria || "Manual",
    comprovanteUrl: v.comprovanteUrl || "",
    imagemUrl: parseImagemUrl(v.imagemUrl),
    precoVenda: parseNumber(v.precoVenda)
  };
}

function mapVendaToFrontend(v: any, id: string): Venda {
  return {
    id,
    dataVenda: parseDate(v.dataVenda || v["data venda"]),
    nomeCliente: String(v.nomeCliente || v.cliente || "").trim(),
    contato: String(v.contato || v.numeroInsta || "").trim(),
    valor: parseNumber(v.valor),
    quantidade: parseNumber(v.quantidade || v.qtd || 1),
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
}

function todayIsoDate() {
  return new Date().toISOString().split("T")[0];
}

export async function getVendas(forceRefresh = false): Promise<Venda[]> {
  const now = Date.now();
  if (!forceRefresh && memoryCache && (now - lastFetchTime < CACHE_TTL)) return memoryCache;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    const vendasQuery = query(collection(db, VENDAS_COLLECTION), orderBy("dataVenda", "desc"));
    const snapshot = await getDocs(vendasQuery);
    const mapped = snapshot.docs.map((d) => mapVendaToFrontend(d.data(), d.id));
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
    const estoqueQuery = query(collection(db, ESTOQUE_COLLECTION), orderBy("dataCompra", "desc"));
    const snapshot = await getDocs(estoqueQuery);
    const mapped = snapshot.docs
      .map((d) => mapEstoqueToFrontend({ id: d.id, ...d.data() }))
      .sort((a, b) => b.dataCompra.localeCompare(a.dataCompra));
    estoqueCache = mapped;
    lastEstoqueFetchTime = Date.now();
    estoqueFetchPromise = null;
    return mapped;
  })();
  return estoqueFetchPromise;
}

function invalidateCache() {
  memoryCache = null;
  estoqueCache = null;
}

export const addVenda = async (venda: Omit<Venda, "id">) => {
  const formaPagamento = venda.formaPagamento || "Dinheiro";
  const tipoCartao = venda.tipoCartao || "";
  const valor = parseNumber(venda.valor);
  const quantidade = parseNumber(venda.quantidade) || 1;
  const isVista = formaPagamento === "Dinheiro" || formaPagamento === "Pix" || (formaPagamento === "Cartão" && tipoCartao === "Débito");
  const parcelasTotal = isVista ? 1 : (parseNumber(venda.parcelasTotal) || 1);
  const parcelasPagas = isVista ? 1 : (parseNumber(venda.parcelasPagas) || 0);
  const valorPago = isVista ? valor : (parseNumber(venda.valorPago) || 0);
  const valorRestante = isVista ? 0 : Math.max(0, parseNumber(venda.valorRestante) || (valor - valorPago));

  const payload = {
    dataVenda: parseDate(venda.dataVenda) || todayIsoDate(),
    nomeCliente: String(venda.nomeCliente || "").trim(),
    contato: String(venda.contato || "").trim(),
    valor,
    quantidade,
    descricao: String(venda.descricao || "").trim(),
    fiado: formaPagamento === "Promissória" ? true : !!venda.fiado,
    vencimento: parseDate(venda.vencimento) || "",
    pago: isVista ? true : !!venda.pago,
    formaPagamento,
    tipoCartao,
    parcelasTotal,
    parcelasPagas,
    valorPago,
    valorRestante,
  };

  const docRef = await addDoc(collection(db, VENDAS_COLLECTION), payload);
  const estoqueId = (venda as any).estoqueId ? String((venda as any).estoqueId) : "";
  if (estoqueId) {
    await runTransaction(db, async (tx) => {
      const estoqueRef = doc(db, ESTOQUE_COLLECTION, estoqueId);
      const estoqueSnap = await tx.get(estoqueRef);
      if (!estoqueSnap.exists()) return;
      const estoqueData = estoqueSnap.data();
      const qtdAtual = parseNumber(estoqueData.quantidade);
      const novaQtd = Math.max(0, qtdAtual - quantidade);
      tx.update(estoqueRef, {
        quantidade: novaQtd,
        status: novaQtd <= 0 ? "esgotado" : (estoqueData.status || "em_estoque"),
      });
    });
  }

  invalidateCache();
  return { ...payload, id: docRef.id } as Venda;
};

export const updateVenda = async (id: string, data: Partial<Venda>) => 
{
  const vendaRef = doc(db, VENDAS_COLLECTION, id);
  const payload: any = { ...data };
  if (payload.dataVenda !== undefined) payload.dataVenda = parseDate(payload.dataVenda);
  if (payload.vencimento !== undefined) payload.vencimento = parseDate(payload.vencimento);
  if (payload.valor !== undefined) payload.valor = parseNumber(payload.valor);
  if (payload.quantidade !== undefined) payload.quantidade = parseNumber(payload.quantidade);
  if (payload.valorPago !== undefined) payload.valorPago = parseNumber(payload.valorPago);
  if (payload.parcelasTotal !== undefined) payload.parcelasTotal = parseNumber(payload.parcelasTotal);
  if (payload.parcelasPagas !== undefined) payload.parcelasPagas = parseNumber(payload.parcelasPagas);

  if (payload.valor !== undefined || payload.valorPago !== undefined) {
    const snap = await getDoc(vendaRef);
    if (snap.exists()) {
      const current = snap.data();
      const valor = payload.valor !== undefined ? parseNumber(payload.valor) : parseNumber(current.valor);
      const valorPago = payload.valorPago !== undefined ? parseNumber(payload.valorPago) : parseNumber(current.valorPago);
      payload.valorRestante = Math.max(0, valor - valorPago);
    }
  }

  await updateDoc(vendaRef, payload);
  invalidateCache();
};

export const deleteVenda = async (id: string) => 
{
  await deleteDoc(doc(db, VENDAS_COLLECTION, id));
  invalidateCache();
};

export const baixarParcela = async (id: string) => 
{
  await runTransaction(db, async (tx) => {
    const vendaRef = doc(db, VENDAS_COLLECTION, id);
    const vendaSnap = await tx.get(vendaRef);
    if (!vendaSnap.exists()) throw new Error("Venda não encontrada");

    const venda = vendaSnap.data();
    const valor = parseNumber(venda.valor);
    const parcelasTotal = parseNumber(venda.parcelasTotal) || 1;
    const parcelasPagas = parseNumber(venda.parcelasPagas) || 0;
    if (parcelasPagas >= parcelasTotal) throw new Error("Já quitado");

    const novasParcelasPagas = parcelasPagas + 1;
    const novoValorPago = (valor / parcelasTotal) * novasParcelasPagas;
    const novoValorRestante = Math.max(0, valor - novoValorPago);

    tx.update(vendaRef, {
      parcelasPagas: novasParcelasPagas,
      valorPago: novoValorPago,
      valorRestante: novoValorRestante,
      pago: novasParcelasPagas >= parcelasTotal,
    });
  });
  invalidateCache();
};

// Estoque CRUD
export const addEstoque = async (item: Omit<ItemEstoque, "id">) => 
{
  const valorCompra = parseNumber(item.valorCompra);
  const precoVenda = item.precoVenda !== undefined
    ? parseNumber(item.precoVenda)
    : calcularSugestaoVenda(valorCompra);
  const nomeProduto = String(item.nomeProduto || "").trim();
  const origem = item.origem || "Manual";
  const payload = {
    dataCompra: parseDate(item.dataCompra) || todayIsoDate(),
    nomeProduto,
    nome: nomeProduto,
    quantidade: parseNumber(item.quantidade),
    valorCompra,
    precoVenda,
    status: item.status || "em_estoque",
    origem,
    categoria: origem,
    comprovanteUrl: item.comprovanteUrl || "",
    imagemUrl: parseImagemUrl(item.imagemUrl),
  };
  await addDoc(collection(db, ESTOQUE_COLLECTION), payload);
  invalidateCache();
};

export const updateEstoque = async (id: string, data: Partial<ItemEstoque>) => 
{
  const payload: any = { ...data };
  if (payload.nomeProduto !== undefined) payload.nome = String(payload.nomeProduto || "").trim();
  if (payload.origem !== undefined) payload.categoria = payload.origem || "Manual";
  if (payload.dataCompra !== undefined) payload.dataCompra = parseDate(payload.dataCompra);
  if (payload.quantidade !== undefined) payload.quantidade = parseNumber(payload.quantidade);
  if (payload.valorCompra !== undefined) {
    payload.valorCompra = parseNumber(payload.valorCompra);
    if (payload.precoVenda === undefined) payload.precoVenda = calcularSugestaoVenda(payload.valorCompra);
  }
  if (payload.precoVenda !== undefined) payload.precoVenda = parseNumber(payload.precoVenda);
  if (payload.imagemUrl !== undefined) payload.imagemUrl = parseImagemUrl(payload.imagemUrl);
  await updateDoc(doc(db, ESTOQUE_COLLECTION, id), payload);
  invalidateCache();
};

export const deleteEstoque = async (id: string) => 
{
  await deleteDoc(doc(db, ESTOQUE_COLLECTION, id));
  invalidateCache();
};

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
