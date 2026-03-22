/**
 * TecWorld - Google Apps Script Backend (V3 - Alta Performance)
 * Otimizado para redução de chamadas de disco e processamento em lote.
 */

const SHEET_NAME = "Vendas";
const SPREADSHEET_ID = "1URTuXQOinj2bsG_Ld2dtw3AQ1WJywW40Ac7LYnQRXDI";

// Cache de cabeçalhos para evitar múltiplas chamadas getDataRange()[0]
let cachedHeaders = null;

function getHeaders(sheet) {
  if (cachedHeaders) return cachedHeaders;
  cachedHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return cachedHeaders;
}

function getSS() {
  try {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  } catch (e) {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

function setup() {
  const ss = getSS();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  const headers = [
    "data venda", "cliente", "valor", "qtd", "descricao", "fiado", 
    "vencimento", "status pagamento", "numeroInsta", "formaPagamento", 
    "tipoCartao", "parcelasTotal", "parcelasPagas", "valorPago", "valorRestante"
  ];

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange("C:C").setNumberFormat("R$ #,##0.00");
    sheet.getRange("N:O").setNumberFormat("R$ #,##0.00");
    sheet.getRange("A:A").setNumberFormat("dd/MM/yyyy");
    sheet.getRange("G:G").setNumberFormat("dd/MM/yyyy");
  }
  return sheet;
}

function doGet(e) {
  const sheet = setup(); 
  if (e.parameter.action === "getVendas") return handleGetVendas(sheet);
  return createResponse({ error: "Ação inválida" });
}

function doPost(e) {
  const sheet = setup();
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    data = e.parameter;
  }
  
  const action = data.action;
  if (action === "add") return handleAddVenda(sheet, data);
  if (action === "update") return handleUpdateVenda(sheet, data);
  if (action === "delete") return handleDeleteVenda(sheet, data);
  if (action === "baixarParcela") return handleBaixarParcela(sheet, data);
  
  return createResponse({ error: "Ação não reconhecida" });
}

function handleGetVendas(sheet) {
  // Otimização: Lê tudo de uma vez para a memória (muito mais rápido que ler célula por célula)
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return createResponse([]);
  
  const headers = data[0];
  const result = data.slice(1).map((row, index) => {
    const obj = {};
    headers.forEach((h, i) => {
      let val = row[i];
      if (val instanceof Date) val = Utilities.formatDate(val, "GMT-3", "dd/MM/yyyy");
      obj[h] = val;
    });
    obj.linhaNumero = index + 2; 
    return obj;
  });
  
  return createResponse(result);
}

function handleAddVenda(sheet, data) {
  const valorTotal = parseFloat(data.valor) || 0;
  const forma = data.formaPagamento || "Dinheiro";
  const tipoC = data.tipoCartao || "";
  
  const isVista = forma === "Dinheiro" || forma === "Pix" || (forma === "Cartão" && tipoC === "Débito");
  
  const row = [
    data.dataVenda || Utilities.formatDate(new Date(), "GMT-3", "dd/MM/yyyy"),
    String(data.nomeCliente || "").toUpperCase(),
    valorTotal,
    parseInt(data.qtd) || 1,
    String(data.descricao || "").toUpperCase(),
    (data.fiado === "Sim" || data.fiado === true) ? "Sim" : "Não",
    data.vencimento || "N/A",
    isVista ? "Sim" : "Não",
    String(data.numeroInsta || ""),
    forma,
    tipoC,
    isVista ? 1 : (parseInt(data.parcelasTotal) || 1),
    isVista ? 1 : 0,
    isVista ? valorTotal : 0,
    isVista ? 0 : valorTotal
  ];
  
  sheet.appendRow(row);
  return createResponse({ success: true });
}

function handleUpdateVenda(sheet, data) {
  const rowNum = parseInt(data.linhaNumero);
  if (!rowNum || rowNum < 2) return createResponse({ error: "ID inválido" });
  
  const headers = getHeaders(sheet);
  const range = sheet.getRange(rowNum, 1, 1, headers.length);
  const values = range.getValues()[0];
  
  // Otimização: Atualiza o array em memória e grava de uma vez só no disco (1 chamada vs N chamadas)
  for (let key in data) {
    const idx = headers.indexOf(key);
    if (idx !== -1 && key !== "linhaNumero" && key !== "action") {
      let val = data[key];
      if (key === "fiado" || key === "pago") val = (val === "Sim" || val === true) ? "Sim" : "Não";
      values[idx] = val;
    }
  }
  
  // Recalcula campos calculados
  const vIdx = headers.indexOf("valor");
  const vpIdx = headers.indexOf("valorPago");
  const vrIdx = headers.indexOf("valorRestante");
  
  if (vIdx !== -1 && vpIdx !== -1 && vrIdx !== -1) {
    const vTotal = parseFloat(values[vIdx]) || 0;
    const vPago = parseFloat(values[vpIdx]) || 0;
    values[vrIdx] = vTotal - vPago;
  }
  
  range.setValues([values]);
  return createResponse({ success: true });
}

function handleBaixarParcela(sheet, data) {
  const rowNum = parseInt(data.linhaNumero);
  if (!rowNum || rowNum < 2) return createResponse({ error: "ID inválido" });
  
  const headers = getHeaders(sheet);
  const range = sheet.getRange(rowNum, 1, 1, headers.length);
  const v = range.getValues()[0];
  
  const vIdx = headers.indexOf("valor");
  const ptIdx = headers.indexOf("parcelasTotal");
  const ppIdx = headers.indexOf("parcelasPagas");
  const vpIdx = headers.indexOf("valorPago");
  const vrIdx = headers.indexOf("valorRestante");
  const spIdx = headers.indexOf("status pagamento");

  if (vIdx === -1 || ptIdx === -1 || ppIdx === -1) return createResponse({ error: "Colunas não encontradas" });

  const vTotal = parseFloat(v[vIdx]) || 0;
  const pTotal = parseInt(v[ptIdx]) || 1;
  let pPagas = parseInt(v[ppIdx]) || 0;

  if (pPagas < pTotal) {
    pPagas++;
    const vPago = (vTotal / pTotal) * pPagas;
    v[ppIdx] = pPagas;
    if (vpIdx !== -1) v[vpIdx] = vPago;
    if (vrIdx !== -1) v[vrIdx] = vTotal - vPago;
    if (pPagas === pTotal && spIdx !== -1) v[spIdx] = "Sim";
    range.setValues([v]);
    return createResponse({ success: true });
  }
  return createResponse({ error: "Já quitado" });
}

function handleDeleteVenda(sheet, data) {
  const rowNum = parseInt(data.linhaNumero);
  if (rowNum >= 2) sheet.deleteRow(rowNum);
  return createResponse({ success: true });
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
