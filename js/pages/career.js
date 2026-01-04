import { el, card } from "../ui.js";
import { store } from "../store.js";
import { signPack, exportPackJson } from "../signature.js";

function input(style) {
  return el("input", {
    style: style || "width:100%;padding:12px;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03);color:rgba(245,245,247,.95)"
  });
}

function select(style) {
  return el("select", {
    style: style || "width:100%;padding:12px;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03);color:rgba(245,245,247,.95)"
  });
}

function btn(text, onClick) {
  const b = el("button", { class: "btnPrimary", text });
  b.addEventListener("click", onClick);
  return b;
}

function seasonEpisodes() {
  // MVP: temporada 1 fixa (AAA depois vem por pack)
  return {
    s1: {
      title: "Temporada 1 — Fundamentos",
      episodes: [
        { id: "e1", title: "Episódio 1: Cena segura + XABCDE", rewardXp: 30 },
        { id: "e2", title: "Episódio 2: START + múltiplas vítimas", rewardXp: 40 },
        { id: "e3", title: "Episódio 3: SBAR + registro", rewardXp: 35 }
      ]
    }
  };
}

export default async function Career() {
  const career = store.getCareer();
  const seasons = seasonEpisodes();

  const root = el("div", {}, [
    el("h2", { style: "margin:8px 0 10px 0", text: "Carreira" }),
    el("p", {
      style: "color:rgba(245,245,247,.72);margin-top:0",
      text: "Perfil + progressão + temporadas. Também inclui Pack Builder (criar conteúdo no celular)."
    }),
    el("div", { class: "hr" })
  ]);

  // PERFIL
  const profileCard = el("div", { class: "card" }, [
    el("div", { class: "cardTitle", text: "Perfil" }),
    el("div", { class: "cardSub", text: "Edite seu nome e função (influencia trilhas e validações futuras)." }),
    el("div", { style: "height:10px" }),
    el("div", { style: "display:grid;gap:10px" }, [
      el("div", { style: "color:rgba(245,245,247,.8);font-weight:800" }, ["Nome"]),
      (() => {
        const i = input();
        i.value = career.profile.name || "Jogador";
        i.id = "career_name";
        return i;
      })(),
      el("div", { style: "color:rgba(245,245,247,.8);font-weight:800;margin-top:8px" }, ["Função"]),
      (() => {
        const s = select();
        const roles = [
          ["bombeiro_civil", "Bombeiro Civil"],
          ["socorrista", "Socorrista"],
          ["enfermagem", "Enfermagem"],
          ["estudante", "Estudante"]
        ];
        roles.forEach(([v, t]) => {
          const o = document.createElement("option");
          o.value = v;
          o.textContent = t;
          s.appendChild(o);
        });
        s.value = career.profile.role || "bombeiro_civil";
        s.id = "career_role";
        return s;
      })()
    ]),
    el("div", { style: "display:flex;gap:10px;justify-content:flex-end;margin-top:12px" }, [
      btn("Salvar perfil", () => {
        const name = document.getElementById("career_name")?.value || "Jogador";
        const role = document.getElementById("career_role")?.value || "bombeiro_civil";
        store.setProfile({ name, role });
        location.hash = "#/career";
      })
    ])
  ]);

  // PROGRESSÃO
  const progCard = card({
    title: "Progressão",
    subtitle:
      `Nome: ${career.profile.name}\nFunção: ${career.profile.role}\n\nRank: ${career.rank}\nLevel: ${career.level}\nXP atual: ${career.xp}`
  });

  // TEMPORADAS
  const seasonsWrap = el("div", { style: "display:grid;gap:12px;margin-top:12px" });
  Object.entries(seasons).forEach(([sid, s]) => {
    const lines = s.episodes.map((e) => `• ${e.title} (+${e.rewardXp} XP)`).join("\n");
    seasonsWrap.appendChild(card({
      title: s.title,
      subtitle:
        `Episódios:\n${lines}\n\nObs.: No AAA final, cada episódio liga direto a um cenário/pacote.`
    }));
  });

  // PACK BUILDER (MVP)
  const builderTitle = el("h3", { style: "margin:18px 0 8px 0", text: "Pack Builder (MVP)" });
  const builderHint = el("p", {
    style: "color:rgba(245,245,247,.72);margin-top:0",
    text: "Crie um pack simples pelo celular. Salva local e aparece em Pacotes. Você pode exportar o JSON para colar no GitHub depois."
  });

  const packId = input(); packId.placeholder = "id do pack (ex: pack-user-01)";
  const packName = input(); packName.placeholder = "nome do pack (ex: Minha Temporada)";
  const scenarioId = input(); scenarioId.placeholder = "id do cenário (ex: scn-user-01)";
  const scenarioTitle = input(); scenarioTitle.placeholder = "título do cenário";
  const scenarioBrief = input(); scenarioBrief.placeholder = "brief do cenário (texto curto)";

  const exportArea = el("textarea", {
    style: "width:100%;min-height:180px;padding:12px;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03);color:rgba(245,245,247,.95)",
    placeholder: "Aqui vai aparecer o JSON exportado para você copiar/colar."
  });

  const builderCard = el("div", { class: "card" }, [
    el("div", { class: "cardTitle", text: "Criar pack básico (1 cenário)" }),
    el("div", { class: "cardSub", text: "MVP: cria 1 cenário com estrutura compatível. Depois evoluímos para editor completo de fases/ações." }),
    el("div", { style: "height:10px" }),
    el("div", { style: "display:grid;gap:10px" }, [
      packId, packName, scenarioId, scenarioTitle, scenarioBrief
    ]),
    el("div", { style: "display:flex;gap:10px;justify-content:flex-end;margin-top:12px;flex-wrap:wrap" }, [
      btn("Salvar Pack", () => {
        const id = (packId.value || "").trim();
        const name = (packName.value || "").trim();
        const scnId = (scenarioId.value || "").trim();
        const scnTitle = (scenarioTitle.value || "").trim();
        const brief = (scenarioBrief.value || "").trim();

        if (!id || !name || !scnId || !scnTitle || !brief) {
          alert("Preencha todos os campos.");
          return;
        }

        const packObj = {
          manifest: {
            id,
            name,
            version: "1.0.0",
            minEngineVersion: "0.1.0",
            publisher: "User Pack (local)",
            schemaVersion: "1.0.0",
            createdAt: new Date().toISOString()
          },
          protocols: { protocols: [] },
          references: { sources: [{ id: "ref-user", title: "Pack criado no app", note: "Adicione referências oficiais ao publicar." }] },
          scenarios: {
            scenarios: [
              {
                id: scnId,
                title: scnTitle,
                brief,
                protocolId: "prot-xabcde",
                role: career.profile.role,
                meta: { difficulty: "media", tags: ["UserPack"], estimatedMin: 5 },
                environment: { hazards: [] },
                inventory: { items: [{ id: "luvas", label: "Luvas", qty: 2 }] },
                patients: [
                  { id: "p1", label: "Vítima 01", initial: { conscious: true, breathing: true, pulse: true, bleedingMassive: false, shockIndex: 0.85, condition: "moderada", canWalk: true } }
                ],
                phases: [
                  { phase: "SceneBriefing", actions: [{ id: "a_scene_check", label: "Avaliar cena e riscos", hint: "Verifique riscos e segurança.", severity: "critical", timeCostSec: 6 }] },
                  { phase: "SafetyCheck", actions: [{ id: "a_put_gloves", label: "Colocar EPIs (luvas)", hint: "Proteção do socorrista.", severity: "critical", timeCostSec: 4 }] },
                  { phase: "PrimarySurvey", actions: [{ id: "a_start_triage", label: "START: Triagem rápida", hint: "Triagem rápida na vítima.", severity: "critical", timeCostSec: 10 }] },
                  { phase: "InterventionLoop", actions: [{ id: "a_reassess", label: "Reavaliar (XABCDE rápido)", hint: "Reavaliação antes de ações.", severity: "critical", timeCostSec: 8 }] },
                  { phase: "Escalation", actions: [{ id: "a_call_samu", label: "Acionar suporte (SAMU/Resgate)", hint: "Chame ajuda.", severity: "critical", timeCostSec: 8 }] },
                  { phase: "Handover", actions: [{ id: "a_handover", label: "Encerrar: gerar SBAR + registro", hint: "Gerar SBAR.", severity: "normal", timeCostSec: 14 }] }
                ],
                rules: {
                  mustDoBefore: [
                    { actionId: "a_scene_check", beforePhase: "SafetyCheck", criticalIfMissed: true },
                    { actionId: "a_put_gloves", beforePhase: "PrimarySurvey", criticalIfMissed: true },
                    { actionId: "a_start_triage", beforePhase: "InterventionLoop", criticalIfMissed: true },
                    { actionId: "a_call_samu", beforePhase: "Handover", criticalIfMissed: true }
                  ]
                }
              }
            ]
          }
        };

        packObj.signature = signPack(packObj);

        store.saveUserPack(packObj);
        // recarregar packs em runtime: força reload simples (MVP)
        location.reload();
      }),
      btn("Exportar JSON do Pack", () => {
        const id = (packId.value || "").trim();
        const up = store.listUserPacks().find((p) => p.manifest.id === id);
        if (!up) {
          alert("Salve o pack primeiro (ou use o id de um pack existente).");
          return;
        }
        exportArea.value = exportPackJson(up);
      })
    ]),
    el("div", { style: "height:10px" }),
    exportArea,
    el("div", { style: "color:rgba(245,245,247,.6);margin-top:8px;font-size:12px;line-height:1.35" }, [
      "Dica: copie o JSON exportado e cole em um novo arquivo dentro do GitHub (content-packs/...). Depois a gente cria um carregador por URL."
    ])
  ]);

  root.appendChild(profileCard);
  root.appendChild(el("div", { style: "height:12px" }));
  root.appendChild(progCard);
  root.appendChild(seasonsWrap);
  root.appendChild(el("div", { class: "hr" }));
  root.appendChild(builderTitle);
  root.appendChild(builderHint);
  root.appendChild(builderCard);

  return root;
}