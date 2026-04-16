import { UI_FONT } from "../constants/index.js";

export function resizeCanvas(canvas) {

  
  const vv = typeof window !== "undefined" && window.visualViewport;
  canvas.width = vv ? Math.round(vv.width) : window.innerWidth;
  canvas.height = vv ? Math.round(vv.height) : window.innerHeight;
}

export function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function responsiveSize(width, spec) {
  return Math.max(spec.min, Math.min(spec.max, width * spec.ratio));
}

export function responsiveFont(width, spec, weight = "") {
  const weightPrefix = weight ? `${weight} ` : "";
  return `${weightPrefix}${responsiveSize(width, spec)}px ${UI_FONT.family}`;
}
