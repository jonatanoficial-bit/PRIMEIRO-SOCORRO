// Assinatura local simples (não criptográfica):
// objetivo: detectar alteração + evitar pack corrompido.
// Em AAA futuro: assinatura real com chave.

export function stableStringify(obj) {
  const seen = new WeakSet();
  return JSON.stringify(obj, function (k, v) {
    if (v && typeof v === "object") {
      if (seen.has(v)) return;
      seen.add(v);
      if (Array.isArray(v)) return v;
      return Object.keys(v).sort().reduce((acc, key) => { acc[key] = v[key]; return acc; }, {});
    }
    return v;
  });
}

export function simpleHash(str) {
  // FNV-1a 32-bit
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ("00000000" + (h >>> 0).toString(16)).slice(-8);
}

export function signPack(packObj) {
  const payload = {
    manifest: packObj.manifest,
    protocols: packObj.protocols,
    scenarios: packObj.scenarios,
    references: packObj.references
  };
  const s = stableStringify(payload);
  return simpleHash(s);
}

export function verifyPack(packObj) {
  if (!packObj?.signature) return false;
  return signPack(packObj) === packObj.signature;
}

export function exportPackJson(packObj) {
  const payload = {
    manifest: packObj.manifest,
    protocols: packObj.protocols,
    scenarios: packObj.scenarios,
    references: packObj.references,
    signature: packObj.signature
  };
  return stableStringify(payload);
}