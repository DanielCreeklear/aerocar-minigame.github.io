 
export const TUTORIAL_SEED = 20260101;

export const TUTORIAL_KEYS = {
  STORAGE_KEY: "aerocar_tutorial_done",
};

 
export const TUTORIAL_HIGHLIGHTS = {
  BATTERY: "battery-bar",
  CURVE: "curve-indicator",
  AERO_BADGE: "aero-badge",
};

 
export const TUTORIAL_STEPS = [
  {
    id: "welcome",
    title: "BEM-VINDO",
    instruction: "Bem-vindo ao tutorial. Aprenda os controles básicos. Toque para continuar.",
    highlight: null,
    autoAdvanceOnInput: true,
  },
  {
    id: "boost",
    title: "USO DO BOOST",
    instruction: "Segure BOOST para acelerar. Observe a barra de bateria no canto superior esquerdo.",
    highlight: TUTORIAL_HIGHLIGHTS.BATTERY,
    
    conditionName: "boostUsed",
    timeoutMs: 10000,
  },
  {
    id: "braking",
    title: "FREAR NAS CURVAS",
    instruction: "Lembre-se de frear antes da curva para não sair da pista.",
    highlight: TUTORIAL_HIGHLIGHTS.CURVE,
    conditionName: "brakedForCurve",
    timeoutMs: 10000,
  },
  {
    id: "mode_z",
    title: "MODO Z (DOWNFORCE)",
    instruction: "Troque para o modo Z antes de curvas fechadas para ganhar aderência.",
    highlight: TUTORIAL_HIGHLIGHTS.AERO_BADGE,
    conditionName: "usedModeZInCurve",
    timeoutMs: 10000,
  },
  {
    id: "mode_x",
    title: "MODO X (BAIXO DRAG)",
    instruction: "Use o modo X nas retas longas para atingir maior velocidade.",
    highlight: TUTORIAL_HIGHLIGHTS.AERO_BADGE,
    conditionName: "usedModeXOnStraight",
    timeoutMs: 10000,
  },
  {
    id: "drift",
    title: "DERIVA E REGEN",
    instruction: "Em velocidade alta e modo X você pode derivar — isso regenera um pouco de bateria.",
    highlight: null,
    conditionName: "driftDetected",
    timeoutMs: 12000,
  },
  {
    id: "complete",
    title: "PARABÉNS",
    instruction: "Tutorial concluído. Você pode voltar ao menu para começar uma corrida.",
    highlight: null,
    autoAdvanceOnInput: false,
  },
];
