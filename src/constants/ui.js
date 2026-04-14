export const UI_COLORS = {
  // Base backgrounds — deep indigo-navy (R4 nocturnal luxury)
  startBgA: "#050416",
  startBgB: "#0a0820",
  startBgC: "#030212",
  previewBgA: "#060520",
  previewBgB: "#030212",
  // Accent palette
  gold: "#e8a820", // warm amber (R4 gold)
  neonCyan: "#6090d8", // muted azure
  neonGreen: "#4ab870", // earthy emerald
  neonPink: "#c84864", // deep wine-rose
  neonOrange: "#c88030", // amber-orange
  textLight: "#f4edd8", // warm ivory
  infoBlue: "#5a8ac8", // soft azure
  success: "#4ab870",
  danger: "#c84864",
  tipGray: "#8c7e6a", // warm stone
  accentOrange: "#c88030",
  white: "#ffffff",
  transparentBlack: "rgba(0, 0, 0, 0)",
  vignette: "rgba(2, 1, 10, 0.78)",
  // Panel styling
  panelFill: "rgba(5, 4, 20, 0.93)",
  panelStroke: "rgba(200, 144, 26, 0.88)", // amber border
  panelAccent: "rgba(180, 60, 90, 0.72)", // wine accent bar
  previewPanelFill: "rgba(6, 5, 22, 0.94)",
  previewPanelStroke: "rgba(58, 142, 200, 0.85)",
  previewMapFill: "rgba(3, 2, 14, 0.96)",
  previewMapStroke: "rgba(90, 138, 200, 0.6)",
  gameOverOverlay: "rgba(2, 1, 10, 0.90)",
  subtleText: "rgba(244, 237, 216, 0.65)",
  shadow: "rgba(0, 0, 0, 0.85)",
};

export const UI_LAYOUT = {
  halfRatio: 0.5,
  startPanelWidthRatio: 0.86,
  startPanelMaxWidth: 760,
  startPanelHeightRatio: 0.74,
  startPanelMaxHeight: 520,
  startPanelMinTopMargin: 20,
  previewPanelWidthRatio: 0.9,
  previewPanelMaxWidth: 860,
  previewPanelHeightRatio: 0.84,
  previewPanelMaxHeight: 620,
  startVignetteCenterYRatio: 0.45,
  startVignetteInnerRatio: 0.2,
  startVignetteOuterRatio: 0.7,
  titleYRatio: 0.16,
  subtitleYRatio: 0.23,
  sectionTopYRatio: 0.35,
  startCtaYRatio: 0.86,
  startTipYRatio: 0.92,
  previewTitleYRatio: 0.12,
  previewInfoYRatio: 0.18,
  previewMapYRatio: 0.22,
  previewMapHeightRatio: 0.56,
  previewCtaYRatio: 0.9,
  leftColumnXRatio: 0.12,
  rightColumnXRatio: 0.54,
  mapPaddingRatio: 0.08,
  mapPaddingMax: 64,
  lineSpacing1: 36,
  lineSpacing2: 68,
  lineSpacing3: 100,
  launchLabelXOffset: 44,
};

export const UI_FONT = {
  family: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  bold: "bold",
  startTitle: { min: 30, max: 54, ratio: 0.072 },
  startSubtitle: { min: 14, max: 20, ratio: 0.03 },
  startSection: { min: 16, max: 22, ratio: 0.03 },
  startBody: { min: 13, max: 18, ratio: 0.022 },
  startTip: { min: 12, max: 16, ratio: 0.02 },
  startCta: { min: 18, max: 26, ratio: 0.035 },
  previewTitle: { min: 26, max: 44, ratio: 0.052 },
  previewInfo: { min: 13, max: 18, ratio: 0.022 },
  previewLabel: { min: 12, max: 16, ratio: 0.019 },
  previewCta: { min: 18, max: 24, ratio: 0.03 },
  gameOverTitle: { min: 28, max: 48, ratio: 0.065 },
  gameOverTime: { min: 36, max: 64, ratio: 0.085 },
  gameOverHint: { min: 14, max: 22, ratio: 0.028 },
};

export const UI_SHAPE = {
  panelRadius: 6,
  accentInset: 12,
  accentHeight: 4,
  accentRadius: 2,
  mapRadius: 4,
  markerRadius: 6,
  mapRouteWidth: 3,
  strokeWidth: 2,
  thinStrokeWidth: 1,
  shadowStrong: 14,
  shadowSoft: 6,
  shadowOff: 0,
  previewMaxPointsStep: 800,
  mapDrawPadding: 18,
};

export const UI_TEXT = {
  gameTitle: "APEX TYPE Z",
  startSubtitle: "TIME ATTACK",
  controlsTitle: "CONTROLES",
  controlsLeft: "<- ESQUERDA (segurar): Freio / ERS",
  controlsRight: "-> DIREITA (segurar): Boost",
  controlsTip: "Meio-direita / Z ou X: Alterna Modo",
  goalTitle: "OBJETIVO",
  goalLine1: "Conclua o trajeto em menor tempo",
  goalLine2: "equilibrando curvas e retas",
  goalTagline: "Novo regulamento F1 2026",
  startCta: "APERTE ESPACO OU CLIQUE PARA INICIAR",
  startFootnote: "Prepare-se: largada ao iniciar",
  previewTitle: "Preview da Pista",
  previewInfoTemplate:
    "Seed fixa {seed} | Segmentos {segments} | Volta {km} km",
  launchLabel: "Largada",
  previewCta: "APERTE ESPACO, ENTER OU CLIQUE PARA IR PARA A LARGADA",
  gameOverTitle: "FIM DE CORRIDA!",
  gameOverHint: "Aperte Espaço para tentar de novo",
};

export const HUD_COLORS = {
  // Speedometer — amber accent (R4 feel)
  speedPanel: "rgba(5, 4, 20, 0.90)",
  speedPanelBorder: "rgba(200, 144, 26, 0.75)",
  speedPanelGlow: "rgba(200, 144, 26, 0.30)",
  speedValue: "#e8a820",
  speedLabel: "rgba(200, 144, 26, 0.72)",
  // Battery bar
  batteryPanel: "rgba(5, 4, 20, 0.90)",
  batteryBorder: "rgba(74, 184, 112, 0.55)",
  batteryFull: "#4ab870",
  batteryMid: "#d4a018",
  batteryLow: "#c84864",
  batteryRegen: "#5a8ac8",
  batteryLabel: "rgba(244, 237, 216, 0.85)",
  batterySegmentSep: "rgba(5, 4, 20, 0.7)",
  // Aero badge
  badgeModeX: "rgba(196, 58, 90, 0.92)", // wine-rose
  badgeModeXBorder: "rgba(230, 100, 130, 0.78)",
  badgeModeXGlow: "rgba(196, 58, 90, 0.45)",
  badgeModeZ: "rgba(42, 90, 168, 0.92)", // deep royal blue
  badgeModeZBorder: "rgba(90, 138, 200, 0.78)",
  badgeModeZGlow: "rgba(42, 90, 168, 0.38)",
  badgeText: "#f4edd8",
  // Lap panel — amber
  lapPanel: "rgba(5, 4, 20, 0.90)",
  lapPanelBorder: "rgba(200, 144, 26, 0.68)",
  lapTime: "#e8a820",
  lapLabel: "rgba(200, 144, 26, 0.62)",
  lapCount: "#f4edd8",
  lapCountLabel: "rgba(244, 237, 216, 0.52)",
  // Grip / off-track warning — muted rose / amber
  warningBorder: "rgba(196, 72, 100, 0.82)",
  warningGlow: "rgba(196, 72, 100, 0.32)",
  offTrackBorder: "rgba(200, 128, 48, 0.78)",
  offTrackGlow: "rgba(200, 128, 48, 0.28)",
  // Curve indicator
  curveNormal: "#c8d4e8",
  curveMild: "#e8a820",
  curveHard: "#c84864",
};

export const HUD_FONTS = {
  family: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  bold: "bold",
  // Speedometer
  speedValue: { min: 32, max: 56, ratio: 0.055 },
  speedLabel: { min: 10, max: 14, ratio: 0.014 },
  // Battery
  batteryLabel: { min: 9, max: 12, ratio: 0.012 },
  // Aero badge
  badgeMode: { min: 11, max: 16, ratio: 0.018 },
  // Lap panel
  lapTime: { min: 18, max: 30, ratio: 0.032 },
  lapLabel: { min: 8, max: 11, ratio: 0.011 },
  lapCount: { min: 12, max: 18, ratio: 0.02 },
  // Curve indicator
  curveArrow: { min: 22, max: 42, ratio: 0.042 },
};

export const HUD_LAYOUT = {
  // Speedometer — bottom-right
  speedRightMarginRatio: 0.022,
  speedBottomMarginRatio: 0.028,
  speedWidthRatio: 0.18,
  speedHeightRatio: 0.14,
  speedMinWidth: 120,
  speedMaxWidth: 210,
  speedMinHeight: 68,
  speedMaxHeight: 108,
  speedMinMargin: 10,
  speedMaxMargin: 22,
  // Battery bar — top-left
  batteryLeftMarginRatio: 0.028,
  batteryTopMarginRatio: 0.022,
  batteryWidthRatio: 0.22,
  batteryHeightRatio: 0.038,
  batteryMinWidth: 110,
  batteryMaxWidth: 240,
  batteryMinHeight: 14,
  batteryMaxHeight: 24,
  batterySegments: 10,
  batteryMinMargin: 14,
  batteryMaxMargin: 26,
  // Aero badge — bottom-right, above speedometer
  badgeWidthRatio: 0.13,
  badgeHeightRatio: 0.062,
  badgeMinWidth: 68,
  badgeMaxWidth: 120,
  badgeMinHeight: 26,
  badgeMaxHeight: 46,
  // Lap panel — top-right
  lapRightMarginRatio: 0.028,
  lapTopMarginRatio: 0.022,
  lapWidthRatio: 0.24,
  lapHeightRatio: 0.11,
  lapMinWidth: 145,
  lapMaxWidth: 255,
  lapMinHeight: 56,
  lapMaxHeight: 96,
  lapMinMargin: 14,
  lapMaxMargin: 28,
  // Warning border
  warningThickness: 6,
  warningPulseSpeed: 0.008,
  // Curve indicator
  curveIndicatorY: 46,
};
