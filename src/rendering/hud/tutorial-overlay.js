// Renders a simple tutorial overlay panel and optional highlight
export function drawTutorialOverlay(ctx, step, w, h, highlightCallback) {
  if (!step) return;
  const pad = Math.max(12, Math.round(w * 0.03));
  const panelW = Math.min(460, w - pad * 2);
  const panelH = Math.min(160, h * 0.22);
  const x = Math.round((w - panelW) / 2);
  const y = Math.round(h * 0.06);

  ctx.save();
  // translucent backdrop
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  roundRect(ctx, x, y, panelW, panelH, 10);
  ctx.fill();

  // Title
  ctx.fillStyle = "#fff";
  ctx.font = "700 18px 'Barlow Condensed', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(step.title || "", x + pad, y + pad + 14);

  // Instruction (wrap)
  ctx.font = "14px 'Segoe UI', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  wrapText(ctx, step.instruction || "", x + pad, y + pad + 36, panelW - pad * 2, 18);

  // Skip button (top-right)
  const btnW = 80;
  const btnH = 28;
  const bx = x + panelW - btnW - pad;
  const by = y + pad;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  roundRect(ctx, bx, by, btnW, btnH, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = "600 12px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("PULAR", bx + btnW / 2, by + btnH / 2 + 4);

  ctx.restore();

  // optional highlight callback (used to make HUD elements blink)
  if (highlightCallback && typeof highlightCallback === "function") {
    try {
      highlightCallback(step.highlight);
    } catch (e) {}
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}
