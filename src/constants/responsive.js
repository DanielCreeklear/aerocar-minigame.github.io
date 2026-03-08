export const PORTRAIT_ASPECT_THRESHOLD = 1;
export const COMPACT_MOBILE_WIDTH = 480;
export const SHORT_MOBILE_HEIGHT = 740;

export function getViewportProfile(width, height) {
  const safeWidth = Math.max(1, width);
  const aspect = height / safeWidth;
  const isPortrait = aspect >= PORTRAIT_ASPECT_THRESHOLD;

  return {
    aspect,
    isPortrait,
    isCompactWidth: width <= COMPACT_MOBILE_WIDTH,
    isShortHeight: height <= SHORT_MOBILE_HEIGHT,
  };
}

export function getResponsiveUILayout(baseLayout, profile) {
  if (!profile.isPortrait) {
    return baseLayout;
  }

  const portraitLayout = {
    startPanelHeightRatio: 0.64,
    startPanelMaxHeight: 420,
    previewPanelHeightRatio: 0.72,
    previewPanelMaxHeight: 460,
    previewMapHeightRatio: 0.46,
    sectionTopYRatio: 0.33,
    lineSpacing1: 30,
    lineSpacing2: 54,
    lineSpacing3: 76,
    startCtaYRatio: 0.88,
    startTipYRatio: 0.94,
  };

  if (!profile.isCompactWidth && !profile.isShortHeight) {
    return { ...baseLayout, ...portraitLayout };
  }

  return {
    ...baseLayout,
    ...portraitLayout,
    startPanelHeightRatio: 0.58,
    startPanelMaxHeight: 360,
    previewPanelHeightRatio: 0.66,
    previewPanelMaxHeight: 420,
    previewMapHeightRatio: 0.4,
    sectionTopYRatio: 0.31,
    lineSpacing1: 24,
    lineSpacing2: 44,
    lineSpacing3: 62,
    startCtaYRatio: 0.86,
    startTipYRatio: 0.92,
  };
}
