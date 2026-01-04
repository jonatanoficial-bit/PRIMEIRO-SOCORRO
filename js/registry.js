import { store } from "./store.js";
import { verifyPack } from "./signature.js";

export function getActivePackOrNull() {
  const p = store.getActivePack();
  if (!p) return null;

  // se for pack do usuário, valida assinatura
  if (p.__source === "user") {
    const ok = verifyPack(p);
    if (!ok) return null;
  }
  return p;
}

export function listScenarios() {
  const pack = getActivePackOrNull();
  return pack?.scenarios?.scenarios || [];
}

export function getScenarioById(id) {
  const all = listScenarios();
  return all.find((s) => s.id === id) || null;
}

export function listProtocols() {
  const pack = getActivePackOrNull();
  return pack?.protocols?.protocols || [];
}

export function groupProtocolsByTag() {
  const protocols = listProtocols();
  const map = new Map();

  for (const pr of protocols) {
    const tags = Array.isArray(pr.tags) && pr.tags.length ? pr.tags : ["Geral"];
    for (const t of tags) {
      if (!map.has(t)) map.set(t, []);
      map.get(t).push(pr);
    }
  }

  const rows = Array.from(map.entries())
    .map(([tag, items]) => ({
      tag,
      items: items.slice().sort((a, b) => (a.title || "").localeCompare(b.title || ""))
    }))
    .sort((a, b) => a.tag.localeCompare(b.tag));

  return rows;
}