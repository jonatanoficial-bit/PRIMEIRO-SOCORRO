import { store } from "./store.js";

export function getActivePackOrNull() {
  return store.getActivePack();
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

export function getProtocolById(id) {
  const all = listProtocols();
  return all.find((p) => p.id === id) || null;
}

/**
 * Netflix-like: agrupa protocolos por tags
 * Retorna: { tag: string, items: Protocol[] }[]
 */
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

  // Ordena por nome da tag e mantém itens por título
  const rows = Array.from(map.entries())
    .map(([tag, items]) => ({
      tag,
      items: items.slice().sort((a, b) => (a.title || "").localeCompare(b.title || ""))
    }))
    .sort((a, b) => a.tag.localeCompare(b.tag));

  return rows;
}