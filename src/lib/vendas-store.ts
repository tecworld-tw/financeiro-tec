import { Venda, Notificacao } from "./types";

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;

// Cache em memória para evitar re-fetches desnecessários durante a mesma sessão
let memoryCache: Venda[] | null = null;
let lastFetchTime = 0;
let fetchPromise: Promise<Venda[]> | null = null;
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

function mapToBackend(v: Partial<Venda>) {
  const payload: any = {};
  if (v.id) payload.linhaNumero = parseInt(v.id);
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
  if (!forceRefresh && memoryCache && (now - lastFetchTime < CACHE_TTL)) {
    return memoryCache;
  }

  // Se já houver uma busca em andamento, retorna a mesma promessa
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    const tryFetch = async (url: string, isAllOrigins = false) => {
      const response = await fetch(url, { method: "GET", headers: { "Accept": "application/json" } });
      if (!response.ok) throw new Error("Status " + response.status);
      if (isAllOrigins) {
        const wrapper = await response.json();
        return JSON.parse(wrapper.contents);
      }
      return await response.json();
    };

    const endpoints = [
      `${APPS_SCRIPT_URL}?action=getVendas&t=${now}`,
      `https://corsproxy.io/?${encodeURIComponent(APPS_SCRIPT_URL + "?action=getVendas")}`,
      `https://api.allorigins.win/get?url=${encodeURIComponent(APPS_SCRIPT_URL + "?action=getVendas")}&timestamp=${now}`
    ];

    for (const endpoint of endpoints) {
      try {
        const data = await tryFetch(endpoint, endpoint.includes("allorigins"));
        if (Array.isArray(data)) {
          const mappedData = data.map(mapToFrontend).sort((a, b) => b.dataVenda.localeCompare(a.dataVenda));
          memoryCache = mappedData;
          lastFetchTime = Date.now();
          localStorage.setItem("vendas_backup", JSON.stringify(mappedData));
          fetchPromise = null;
          return mappedData;
        }
      } catch (err) {}
    }

    fetchPromise = null;
    const cached = localStorage.getItem("vendas_backup");
    return cached ? JSON.parse(cached) : [];
  })();

  return fetchPromise;
}

async function gasPost(payload: any) {
  // Invalida o cache após qualquer alteração
  memoryCache = null;
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

export const diasParaVencimento = (v: Venda) => {
  if (!v.fiado || !v.vencimento || v.pago) return null;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(v.vencimento + "T00:00:00").getTime() - hoje.getTime()) / 86400000);
};
