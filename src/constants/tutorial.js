 
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
    id: "enable-gyro",
    title: "SENSOR DE MOVIMENTO",
    instruction: "Toque em qualquer lugar da tela para ativar o controle por inclinação do dispositivo.",
    highlight: null,
    autoAdvanceOnInput: true,
  },
  {
    id: "welcome",
    title: "BEM-VINDO",
    instruction: "DIREITA=BOOST | ESQUERDA=FREAR | CENTRO=TROCA MODO\n\nGIRO: INCLINE O CELULAR PARA CURVAR",
    highlight: null,
    autoAdvanceOnInput: true,
  },
  {
    id: "boost",
    title: "USO DO BOOST",
    instruction: "Toque e SEGURE na DIREITA da tela para acelerar. Observe a barra de bateria no canto superior esquerdo.",
    highlight: TUTORIAL_HIGHLIGHTS.BATTERY,
    
    conditionName: "boostUsed",
    timeoutMs: 10000,
  },
  {
    id: "braking",
    title: "FREAR NAS CURVAS",
    instruction: "Toque na ESQUERDA para frear. Freie ANTES da curva para não sair da pista.",
    highlight: TUTORIAL_HIGHLIGHTS.CURVE,
    conditionName: "brakedForCurve",
    timeoutMs: 10000,
  },
  {
    id: "mode_z",
    title: "MODO Z (DOWNFORCE)",
    instruction: "Toque no CENTRO para trocar para Modo Z. Use antes de curvas fechadas.",
    highlight: TUTORIAL_HIGHLIGHTS.AERO_BADGE,
    conditionName: "usedModeZInCurve",
    timeoutMs: 10000,
  },
  {
    id: "mode_x",
    title: "MODO X (BAIXO DRAG)",
    instruction: "Toque no CENTRO para trocar para Modo X. Use nas retas para atingir maior velocidade.",
    highlight: TUTORIAL_HIGHLIGHTS.AERO_BADGE,
    conditionName: "usedModeXOnStraight",
    timeoutMs: 10000,
  },
  {
    id: "drift",
    title: "DERIVA E REGEN",
    instruction: "Com Modo X ativado em alta velocidade voce pode derrapar - isso regenera bateria.",
    highlight: null,
    conditionName: "driftDetected",
    timeoutMs: 12000,
  },
  {
    id: "complete",
    title: "PARABÉNS",
    instruction: "Tutorial concluído! Toque em CONTINUAR para voltar ao menu.",
    highlight: null,
    autoAdvanceOnInput: true,
  },
];
