async function fetchJson(url) {
  const r = await fetch(url, { cache: "no-cache" });
  if (!r.ok) throw new Error(`Falha ao carregar: ${url}`);
  return await r.json();
}

export async function loadLocalPacks() {
  const base = "./content-packs/pack-xabcde-sbv-v1";
  const manifest = await fetchJson(`${base}/manifest.json`);
  const protocols = await fetchJson(`${base}/protocols.json`);
  const scenarios = await fetchJson(`${base}/scenarios.json`);
  const references = await fetchJson(`${base}/references.json`);
  return [{ manifest, protocols, scenarios, references }];
}