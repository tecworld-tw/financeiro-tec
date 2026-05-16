import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { Cliente } from "./types";

const COLLECTION = "clientes";

let cache: Cliente[] | null = null;
let fetchPromise: Promise<Cliente[]> | null = null;

export async function getClientes(forceRefresh = false): Promise<Cliente[]> {
  if (!forceRefresh && cache) return cache;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const snap = await getDocs(
        query(collection(db, COLLECTION), orderBy("nome", "asc"))
      );
      cache = snap.docs.map((d) => ({
        id: d.id,
        nome: String(d.data().nome || "").trim(),
        telefone: String(d.data().telefone || "").trim(),
      }));
      return cache;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

export async function addCliente(data: Omit<Cliente, "id">): Promise<Cliente> {
  const payload = {
    nome: String(data.nome || "").trim().toUpperCase(),
    telefone: String(data.telefone || "").trim(),
  };
  const ref = await addDoc(collection(db, COLLECTION), payload);
  cache = null;
  return { id: ref.id, ...payload };
}

export async function updateCliente(id: string, data: Partial<Omit<Cliente, "id">>) {
  const payload: Record<string, string> = {};
  if (data.nome !== undefined) payload.nome = String(data.nome).trim().toUpperCase();
  if (data.telefone !== undefined) payload.telefone = String(data.telefone).trim();
  await updateDoc(doc(db, COLLECTION, id), payload);
  cache = null;
}

export async function deleteCliente(id: string) {
  await deleteDoc(doc(db, COLLECTION, id));
  cache = null;
}
