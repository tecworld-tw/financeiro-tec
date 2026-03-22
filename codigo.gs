/**
 * TecWorld - Google Apps Script Backend (V4 - Com Gestão de Estoque)
 * Otimizado para redução de chamadas de disco e processamento em lote.
 */

const SHEET_VENDAS = "Vendas";
const SHEET_ESTOQUE = "estoque";
const SPREADSHEET_ID = "1URTuXQOinj2bsG_Ld2dtw3AQ1WJywW40Ac7LYnQRXDI";

// Cache de cabeçalhos para evitar múltiplas chamadas
let cachedHeaders = {};

function getHeaders(sheet) {
  const name = sheet.getName();
  if (cachedHeaders[name]) return cachedHeaders[name];
  cachedHeaders[name] = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return cachedHeaders[name];
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
  
  // Setup Vendas
  let sheetVendas = ss.getSheetByName(SHEET_VENDAS);
  const headersVendas = [
    "data venda", "cliente", "valor", "qtd", "descricao", "fiado", 
    "vencimento", "status pagamento", "numeroInsta", "formaPagamento", 
    "tipoCartao", "parcelasTotal", "parcelasPagas", "valorPago", "valorRestante"
  ];
  if (!sheetVendas) {
    sheetVendas = ss.insertSheet(SHEET_VENDAS);
    sheetVendas.getRange(1, 1, 1, headersVendas.length).setValues([headersVendas]);
    sheetVendas.setFrozenRows(1);
    sheetVendas.getRange("C:C").setNumberFormat("R$ #,##0.00");
    sheetVendas.getRange("N:O").setNumberFormat("R$ #,##0.00");
    sheetVendas.getRange("A:A").setNumberFormat("dd/MM/yyyy");
    sheetVendas.getRange("G:G").setNumberFormat("dd/MM/yyyy");
  }

  // Setup Estoque
  let sheetEstoque = ss.getSheetByName(SHEET_ESTOQUE);
  const headersEstoque = [
    "dataCompra", "nomeProduto", "quantidade", "valorCompra", "status", "origem", "comprovanteUrl"
  ];
  if (!sheetEstoque) {
    sheetEstoque = ss.insertSheet(SHEET_ESTOQUE);
    sheetEstoque.getRange(1, 1, 1, headersEstoque.length).setValues([headersEstoque]);
    sheetEstoque.setFrozenRows(1);
    sheetEstoque.getRange("D:D").setNumberFormat("R$ #,##0.00");
    sheetEstoque.getRange("A:A").setNumberFormat("dd/MM/yyyy");
  }

  return { ss, sheetVendas, sheetEstoque };
}

function doGet(e) {
  const { sheetVendas, sheetEstoque } = setup(); 
  const action = e.parameter.action;
  
  if (action === "getVendas") return handleGetGeneric(sheetVendas);
  if (action === "getEstoque") return handleGetGeneric(sheetEstoque);
  
  return createResponse({ error: "Ação inválida" });
}

function doPost(e) {
  const { sheetVendas, sheetEstoque } = setup();
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    data = e.parameter;
  }
  
  const action = data.action;
  
  // Vendas
  if (action === "add") return handleAddVenda(sheetVendas, data);
  if (action === "update") return handleUpdateVenda(sheetVendas, data);
  if (action === "delete") return handleDeleteGeneric(sheetVendas, data);
  if (action === "baixarParcela") return handleBaixarParcela(sheetVendas, data);
  
  // Estoque
  if (action === "addEstoque") return handleAddEstoque(sheetEstoque, data);
  if (action === "updateEstoque") return handleUpdateEstoque(sheetEstoque, data);
  if (action === "deleteEstoque") return handleDeleteGeneric(sheetEstoque, data);
  
  return createResponse({ error: "Ação não reconhecida" });
}

function handleGetGeneric(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return createResponse([]);
  
  const headers = data[0];
  const result = data.slice(1).map((row, index) => {
    const obj = {};
    headers.forEach((h, i) => {
      let val = row[i];
      if (val instanceof Date) val = Utilities.formatDate(val, "GMT-3", "yyyy-MM-dd");
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

function handleAddEstoque(sheet, data) {
  const row = [
    data.dataCompra || Utilities.formatDate(new Date(), "GMT-3", "yyyy-MM-dd"),
    String(data.nomeProduto || "").toUpperCase(),
    parseInt(data.quantidade) || 0,
    parseFloat(data.valorCompra) || 0,
    data.status || "em_estoque",
    data.origem || "Manual",
    data.comprovanteUrl || ""
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
  
  for (let key in data) {
    const idx = headers.indexOf(key);
    if (idx !== -1 && key !== "linhaNumero" && key !== "action") {
      let val = data[key];
      if (key === "fiado" || key === "pago") val = (val === "Sim" || val === true) ? "Sim" : "Não";
      values[idx] = val;
    }
  }
  
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

function handleUpdateEstoque(sheet, data) {
  const rowNum = parseInt(data.linhaNumero);
  if (!rowNum || rowNum < 2) return createResponse({ error: "ID inválido" });
  
  const headers = getHeaders(sheet);
  const range = sheet.getRange(rowNum, 1, 1, headers.length);
  const values = range.getValues()[0];
  
  for (let key in data) {
    const idx = headers.indexOf(key);
    if (idx !== -1 && key !== "linhaNumero" && key !== "action") {
      values[idx] = data[key];
    }
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

function handleDeleteGeneric(sheet, data) {
  const rowNum = parseInt(data.linhaNumero);
  if (rowNum >= 2) sheet.deleteRow(rowNum);
  return createResponse({ success: true });
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
