import { initializeApp } from "firebase/app";
import { addDoc, collection, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDnTBkzrxW4vQb59jdRwCgpiMJQV1oF-pQ",
  authDomain: "tecworld-ffa43.firebaseapp.com",
  projectId: "tecworld-ffa43",
  storageBucket: "tecworld-ffa43.firebasestorage.app",
  messagingSenderId: "732822986577",
  appId: "1:732822986577:web:21c6ae498121c0b6143d70",
  measurementId: "G-DHSKXKNLHE",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const raw = `
21/06/2025\tSUELEN\t80\t1\tFONE LENOVO LP40\tSim\t2025-07-21\tSim
15/06/2025\tFABIO VIGIA\t70\t1\tREPETIDOR DE SINAL\tNão\t\tSim
15/06/2025\tRAISSA VIEIRA\t70\t1\tLENOVO LP40\tNão\t\tSim
15/05/2025\tRAISSA VIEIRA\t20\t1\tFONE COM FIO IPHONE\tNão\t\tSim
28/06/2025\tIRLAN VIEGAS\t35\t1\tCABO USB-C IPHONE\tNão\t\tSim
28/06/2025\tTERRA VIVA\t50\t1\tCABO USB-C IPHONE BASEUS 150cm\tNão\t\tSim
06/07/2025\tLIVRAMENTO\t130\t1\tAIR PODS\tSim\t2025-08-06\tSim
06/07/2025\tGUILHERME SILVA\t125\t1\tCALIBRADOR DE PNEU\tSim\t2025-08-06\tSim
06/07/2025\tPAI DO MATHIAS\t130\t1\tFONE BASEUS\tSim\t2025-08-06\tSim
08/07/2025\tLANNE SANTOS\t70\t1\tFONE HAYLOU NEO\tSim\t2025-08-08\tSim
08/07/2025\tIZA LOURENCO\t130\t1\tFONE QCY T17\tSim\t2025-08-08\tSim
14/07/2025\tTIA MATHIAS\t49\t1\tFONE ESSAGAR 65W\tNão\t\tSim
10/07/2025\tLARYSSA BUCELES\t200\t1\tPOWERBANK BASEUS\tSim\t2025-10-08\tSim
08/08/2025\tSUELEN\t70\t1\tFONE REALFIT F1\tSim\t2025-10-05\tSim
09/09/2025\tKANANDA MONTEIRO\t75\t1\tCARREGADOR BASEUS COMPLETO\tSim\t2025-10-06\tSim
09/09/2025\tLAYNARA\t25\t1\tFONE REALFIT\tSim\t\tSim
09/09/2025\tLARYSSA BUCELES\t30\t1\tCABO BASEUS\tSim\t2025-05-09\tSim
09/09/2025\tMEIRY SÁ\t60\t1\tCARREGADOR SEM FIO ESSAGER\tSim\t2025-09-22\tSim
10/09/2025\tLIZ RAMOS\t60\t1\tADAPTADOR PARA PC\tNão\t\tSim
16/09/2025\tNEWTIELE\t30\t1\tREALFIT F1\tSim\t2025-10-16\tSim
18/09/2025\tLARYSSA BUCELES\t30\t1\tCABO P/ IPHONE\tSim\t2025-10-06\tSim
12/10/2025\tLANNE SANTOS\t54\t1\tTH10\tSim\t\tSim
12/10/2025\tKEYLLA BARBOSA\t70\t1\tREAL FIT F1\tNão\t\tSim
17/10/2025\tTHAY PEREIRA\t25\t1\tFONE ESSAGER COM FIO\tNão\t\tSim
27/10/2025\tLARYSSA BUCELES\t80\t1\tCARREGADOR COMPLETO\tSim\t\tSim
06/11/2025\tJOSYKARLA\t50\t1\tMOUSE SEM FIO\tSim\t\tSim
11/11/2025\tGUILHERME SILVA\t33\t1\tREAL FIT F1\tSim\t\tSim
12/11/2025\tFABIO FRANÇA\t20\t2\tREAL FIT F1\tSim\t2026-02-23\tNão\t\tPROMISSÓRIA\t\t1\t0\t0\t20
24/11/2025\tFÁBIO AR\t40\t1\tCARREGADOR COMPLETO\tSim\t\tSim
01/12/2025\tROBERTA OLIVEIRA SANTIAGO\t100\t1\tAIR PODS 6\tNão\t\tSim
04/12/2025\tIZA\t80\t1\tHEADSET TH10\tSim\t\tSim
16/12/2025\tHERIK FONSECA\t35\t1\tMOUSE\tSim\t\tSim
18/12/2025\tLARYSSA BUCELES\t50\t1\tCARREGADOR SEM FIO ESSAGER\tSim\t\tSim
18/12/2025\tANA MARIA\t70\t1\tREAL FIT F1\tSim\t\tSim
18/12/2025\tMANJ ARAÚJO\t70\t1\tREAL FIT F1\tSim\t\tSim
19/12/2025\tFÁBIO DO AR\t130\t1\tTH30 LENOVO\tSim\t\tSim
23/12/2025\tIANARA\t30\t1\tCABO ESSAGER 2 EM 1\tNão\t\tSim
22/01/2026\tIANNARA\t35\t1\tCABO ESSEGAR 2 M\tSim\t\tSim
22/01/2026\tFABIO DO AR\t55\t1\tFONE LENOVO LP40\tSim\t\tSim
23/01/2026\tTERRA VIVA\t60\t1\tMOUSE ERGONOMICO\tSim\t2026-02-23\tNão\t\tPROMISSÓRIA\t\t1\t0\t0\t60
04/02/2026\tNATIELE\t30\t1\tCABO LISO BASEUS C-C\tNão\t\tSim
20/02/2026\tLANNE SANTOS\t60\t1\tCARREGADOR BASEUS 25 W\tSim\t2026-03-09\tNão\t\tPROMISSÓRIA\t\t1\t0\t0\t60
20/03/2026\tKANANDA\t110\t1\tFONE BASEUS EZ10\tNão\t\tSim
20/03/2026\tDENNILSON\t110\t1\tAIR PODS 6\tNão\t\tSim
20/03/2026\tAMIGO DO PAI\t120\t1\tFONE JBL TH500\tNão\t\tSim
20/03/2026\tEDUARDA\t175\t1\tAIS PODS + CABO MAGNETICO\tSim\tN/A\tNão
10/03/2026\tTERRA VIVA\t20\t1\tCABO MICRO USB\tSim\t2026-04-10\tNão\t\tPROMISSÓRIA\t\t1\t0\t0\t20
23/03/2026\tTHAYLANE PEREIRA\t50\t1\tBASEUS FONTE DUPLA 10.5W\tSim\t2026-04-23\tNão\t98 8350-0159\tPROMISSÓRIA\t\t2\t0\t0\t50
`;

function parseNumber(value) {
  if (value === undefined || value === null || value === "") return 0;
  return Number(String(value).replace(",", ".").trim()) || 0;
}

function toIsoDate(value) {
  const v = String(value || "").trim();
  if (!v || v.toUpperCase() === "N/A") return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{3,4})$/);
  if (!m) return "";
  let [, d, mo, y] = m;
  if (y === "202") y = "2025";
  if (y.length !== 4) return "";
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

function parseBooleanSimNao(value) {
  return String(value || "").trim().toLowerCase() === "sim";
}

function parseLine(line) {
  const cols = line.split("\t").map((c) => c.trim());
  const base = cols.filter((_, i) => i <= 14);

  const dataVenda = toIsoDate(base[0]);
  const nomeCliente = String(base[1] || "").trim();
  const valor = parseNumber(base[2]);
  const quantidade = parseNumber(base[3]) || 1;
  const descricao = String(base[4] || "").trim();
  const fiado = parseBooleanSimNao(base[5]);
  const vencimento = toIsoDate(base[6]);
  const pago = parseBooleanSimNao(base[7]);
  const numeroInsta = String(base[8] || "").trim();
  const formaPagamento = String(base[9] || "").trim() || "Dinheiro";
  const tipoCartao = String(base[10] || "").trim();
  const parcelasTotal = parseNumber(base[11]) || 1;
  const parcelasPagas = parseNumber(base[12]) || 0;
  const valorPagoInformado = parseNumber(base[13]);
  const valorRestanteInformado = parseNumber(base[14]);

  const valorPago = valorPagoInformado || (pago ? valor : 0);
  const valorRestante = valorRestanteInformado || Math.max(0, valor - valorPago);

  return {
    dataVenda,
    nomeCliente,
    contato: numeroInsta,
    valor,
    quantidade,
    descricao,
    fiado,
    vencimento,
    pago,
    formaPagamento,
    tipoCartao,
    parcelasTotal,
    parcelasPagas,
    valorPago,
    valorRestante,
  };
}

const linhas = raw
  .split("\n")
  .map((l) => l.trim())
  .filter(Boolean);

let inseridos = 0;
for (const linha of linhas) {
  const venda = parseLine(linha);
  if (!venda.dataVenda || !venda.nomeCliente || !venda.descricao || venda.valor <= 0) continue;
  await addDoc(collection(db, "vendas"), venda);
  inseridos++;
}

console.log(`✅ ${inseridos} vendas inseridas na coleção "vendas"`);
