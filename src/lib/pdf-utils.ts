import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Venda } from "./types";
import { formatCurrency, formatDate } from "./vendas-store";

// ─── Paleta TecWorld ───────────────────────────────────────────────────────────
const C = {
  preto:        [13,  13,  13]  as [number,number,number], // #0D0D0D
  amarelo:      [245, 197,  24] as [number,number,number], // #F5C518
  amareloEsc:   [180, 140,   0] as [number,number,number], // #B48C00
  branco:       [255, 255, 255] as [number,number,number],
  cinzaClaro:   [246, 246, 246] as [number,number,number], // #F6F6F6
  cinzaMedio:   [210, 210, 210] as [number,number,number], // #D2D2D2
  cinzaEscuro:  [ 90,  90,  90] as [number,number,number], // #5A5A5A
  vermelho:     [180,  30,  10] as [number,number,number], // #B41E0A
  vermelhoClaro:[255, 240, 237] as [number,number,number], // #FFF0ED
  vermelhoBorda:[220, 140, 120] as [number,number,number], // #DC8C78
  verde:        [ 22, 130,  60] as [number,number,number], // #16823C
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setFill(doc: jsPDF, c: [number,number,number]) {
  doc.setFillColor(c[0], c[1], c[2]);
}
function setDraw(doc: jsPDF, c: [number,number,number]) {
  doc.setDrawColor(c[0], c[1], c[2]);
}
function setTextC(doc: jsPDF, c: [number,number,number]) {
  doc.setTextColor(c[0], c[1], c[2]);
}

/**
 * Desenha um retângulo com bordas arredondadas (simulado via fillRoundedRect quando disponível,
 * senão usa rect comum). Aceita "F" (fill), "S" (stroke) ou "FD" (fill+stroke).
 */
function roundRect(
  doc: jsPDF,
  x: number, y: number, w: number, h: number,
  r: number,
  style: "F" | "S" | "FD" = "F"
) {
  (doc as any).roundedRect?.(x, y, w, h, r, r, style) ?? doc.rect(x, y, w, h, style);
}

/**
 * Bloco de rótulo + valor empilhados, usado nos cards de info.
 */
function infoCard(
  doc: jsPDF,
  x: number, y: number, w: number,
  label: string, value: string,
  valueColor: [number,number,number] = C.preto
) {
  // fundo do card
  setFill(doc, C.cinzaClaro);
  setDraw(doc, C.cinzaMedio);
  roundRect(doc, x, y, w, 18, 2, "FD");

  // label
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setTextC(doc, C.cinzaEscuro);
  doc.text(label.toUpperCase(), x + 5, y + 6);

  // value
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  setTextC(doc, valueColor);
  doc.text(value, x + 5, y + 13.5);
}

/**
 * Faixa de título de seção — fundo preto, texto branco com acento amarelo.
 */
function sectionHeader(doc: jsPDF, x: number, y: number, w: number, label: string) {
  setFill(doc, C.preto);
  roundRect(doc, x, y, w, 9, 2, "F");

  // barra de acento amarelo à esquerda
  setFill(doc, C.amarelo);
  doc.rect(x, y, 3, 9, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  setTextC(doc, C.branco);
  doc.text(label, x + 8, y + 6.2);
}

// ─── Função principal ─────────────────────────────────────────────────────────
export async function gerarPDFPromissoria(venda: Venda) {
  const doc   = new jsPDF({ unit: "mm", format: "a4" });
  const PW    = doc.internal.pageSize.getWidth();   // 210
  const PH    = doc.internal.pageSize.getHeight();  // 297
  const ML    = 14;   // margin left
  const MR    = 14;   // margin right
  const CW    = PW - ML - MR; // content width = 182

  // ── 1. CABEÇALHO PRETO ────────────────────────────────────────────────────
  setFill(doc, C.preto);
  doc.rect(0, 0, PW, 38, "F");

  // Linha decorativa amarela no rodapé do header
  setFill(doc, C.amarelo);
  doc.rect(0, 35, PW, 3, "F");

  // Texto TECWORLD
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  setTextC(doc, C.amarelo);
  doc.text("TECWORLD", ML, 18);

  // Subtítulo
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setTextC(doc, C.cinzaMedio);
  doc.text("COMPROVANTE DE VENDA  ·  NOTA PROMISSÓRIA", ML, 25);

  // Nº e data — lado direito
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setTextC(doc, C.cinzaMedio);
  doc.text(`Nº DOC: ${String(venda.id ?? "0001").padStart(4, "0")}`, PW - MR, 18, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`Emitido em: ${formatDate(venda.dataVenda)}`, PW - MR, 24, { align: "right" });

  // ── 2. DADOS DO CLIENTE ───────────────────────────────────────────────────
  let y = 45;
  sectionHeader(doc, ML, y, CW, "DADOS DO CLIENTE");
  y += 13;

  const cardW3 = (CW - 6) / 3;

  infoCard(doc, ML,                    y, cardW3, "Nome do Cliente",   venda.nomeCliente);
  infoCard(doc, ML + cardW3 + 3,       y, cardW3, "Contato / WhatsApp", venda.contato || "—");
  infoCard(doc, ML + (cardW3 + 3) * 2, y, cardW3, "Data da Venda",     formatDate(venda.dataVenda));

  // ── 3. DETALHES DA COMPRA ─────────────────────────────────────────────────
  y += 24;
  sectionHeader(doc, ML, y, CW, "DETALHES DA COMPRA");
  y += 12;

  autoTable(doc, {
    startY: y,
    head: [["PRODUTO / SERVIÇO", "QTD", "VALOR UNIT.", "TOTAL"]],
    body: [[
      venda.descricao,
      String(venda.quantidade),
      formatCurrency(venda.valor / venda.quantidade),
      formatCurrency(venda.valor),
    ]],
    headStyles: {
      fillColor:  C.preto,
      textColor:  C.amarelo,
      fontStyle:  "bold",
      fontSize:   8,
      halign:     "center",
      cellPadding: 4,
    },
    bodyStyles: {
      fontSize:    9,
      textColor:   C.preto,
      halign:      "center",
      cellPadding: 5,
    },
    columnStyles: {
      0: { halign: "left", cellWidth: 90 },
      1: { cellWidth: 18 },
      2: { cellWidth: 36 },
      3: { cellWidth: 38, fontStyle: "bold" },
    },
    alternateRowStyles: { fillColor: C.cinzaClaro },
    styles: { lineColor: C.cinzaMedio, lineWidth: 0.3 },
    margin: { left: ML, right: MR },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ── 4. FLUXO DE PAGAMENTO ─────────────────────────────────────────────────
  sectionHeader(doc, ML, y, CW, "FLUXO DE PAGAMENTO");
  y += 13;

  const cardW4 = (CW - 9) / 4;

  infoCard(doc, ML,                         y, cardW4, "Forma de Pagamento", venda.formaPagamento);
  infoCard(doc, ML + (cardW4 + 3),          y, cardW4, "Parcelas Quitadas",  `${venda.parcelasPagas} de ${venda.parcelasTotal}`);
  infoCard(doc, ML + (cardW4 + 3) * 2,      y, cardW4, "Valor Pago",         formatCurrency(venda.valorPago ?? 0), C.verde);
  infoCard(doc, ML + (cardW4 + 3) * 3,      y, cardW4, "Vencimento",         venda.vencimento ? formatDate(venda.vencimento) : "—", C.vermelho);

  // ── 5. SALDO DEVEDOR — destaque total ────────────────────────────────────
  y += 24;
  setFill(doc, C.preto);
  roundRect(doc, ML, y, CW, 16, 3, "F");

  // acento amarelo
  setFill(doc, C.amarelo);
  roundRect(doc, ML, y, 4, 16, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setTextC(doc, C.cinzaMedio);
  doc.text("SALDO DEVEDOR:", ML + 10, y + 10);

  doc.setFontSize(14);
  setTextC(doc, C.amarelo);
  doc.text(formatCurrency(venda.valorRestante ?? 0), PW - MR, y + 10.5, { align: "right" });

  // ── 6. AVISO DE INADIMPLÊNCIA ─────────────────────────────────────────────
  y += 22;

  // Fundo avermelhado
  setFill(doc, C.vermelhoClaro);
  setDraw(doc, C.vermelhoBorda);
  roundRect(doc, ML, y, CW, 40, 3, "FD");

  // Faixa de título do aviso
  setFill(doc, C.vermelho);
  roundRect(doc, ML, y, CW, 9, 3, "F");
  // corrigir cantos inferiores
  doc.rect(ML, y + 5, CW, 4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setTextC(doc, C.branco);
  doc.text("⚠  AVISO IMPORTANTE SOBRE INADIMPLÊNCIA", ML + 5, y + 6.2);

  const avisos = [
    "1.  O atraso no pagamento acarretará em juros e multa conforme a política da loja.",
    "2.  Em caso de inadimplência superior a 30 dias, o débito poderá ser enviado para órgãos de proteção ao crédito (SPC/Serasa).",
    "3.  Evite transtornos. Mantenha suas parcelas em dia.",
    "4.  Dúvidas sobre pagamentos, entre em contato via WhatsApp.",
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setTextC(doc, C.vermelho);

  let ay = y + 14;
  for (const aviso of avisos) {
    // quebra de linha automática dentro do bloco
    const lines = doc.splitTextToSize(aviso, CW - 10);
    doc.text(lines, ML + 5, ay);
    ay += lines.length * 5;
  }

  // ── 7. ASSINATURAS ────────────────────────────────────────────────────────
  y += 48;
  const halfW = (CW - 10) / 2;

  setDraw(doc, C.cinzaMedio);
  // linha cliente
  doc.line(ML, y + 12, ML + halfW, y + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  setTextC(doc, C.cinzaEscuro);
  doc.text("Assinatura do Cliente", ML + halfW / 2, y + 16, { align: "center" });

  // linha loja
  const x2 = ML + halfW + 10;
  doc.line(x2, y + 12, x2 + halfW, y + 12);
  doc.text("Assinatura do Responsável / Loja", x2 + halfW / 2, y + 16, { align: "center" });

  // ── 8. RODAPÉ ─────────────────────────────────────────────────────────────
  const fy = PH - 14;
  setDraw(doc, C.cinzaMedio);
  doc.setLineWidth(0.3);
  doc.line(ML, fy - 4, PW - MR, fy - 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setTextC(doc, C.cinzaEscuro);
  doc.text("TecWorld – Soluções em Tecnologia", ML, fy);
  doc.text(
    `Documento gerado em ${new Date().toLocaleString("pt-BR")}`,
    PW - MR, fy,
    { align: "right" }
  );

  // ── Download ──────────────────────────────────────────────────────────────
  doc.save(`Promissoria_TEC_${venda.nomeCliente.replace(/\s+/g, "_")}.pdf`);
}