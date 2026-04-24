// Renders a simple tutorial overlay panel and optional highlight
export function drawTutorialOverlay(ctx, step, w, h, highlightCallback) {
  if (!step) return;
  const pad = Math.max(14, Math.round(w * 0.035));
  const panelW = Math.min(400, w - pad * 2);
  const hasAction = step.autoAdvanceOnInput;
  const baseH = hasAction ? 155 : 135;
  const panelH = Math.min(baseH, h * 0.26);
  const x = Math.round((w - panelW) / 2);
  // Center vertically in the top 40% so it doesn't cover the whole screen
  const y = Math.round(h * 0.08);

  ctx.save();

  // Drop shadow
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 4;

  // Backdrop
  ctx.fillStyle = "rgba(10,10,20,0.88)";
  roundRect(ctx, x, y, panelW, panelH, 14);
  ctx.fill();

  // Accent top border line
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,200,0,0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 14, y + 1);
  ctx.lineTo(x + panelW - 14, y + 1);
  ctx.stroke();

  // Title
  ctx.fillStyle = "#FFD700";
  const titleSz = Math.max(13, Math.min(18, w * 0.036));
  ctx.font = `700 ${titleSz}px 'Barlow Condensed', monospace`;
  ctx.textAlign = "left";
  const titleX = x + pad;
  const titleY = y + pad + titleSz + 6;
  ctx.fillText(step.title || "", titleX, titleY);

  // Instruction (wrap)
  const instrSz = Math.max(11, Math.min(15, w * 0.030));
  ctx.font = `${instrSz}px 'Segoe UI', sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  const instrY = titleY + 16;
  const instrMaxW = panelW - pad * 2;
  wrapText(ctx, step.instruction || "", x + pad, instrY, instrMaxW, instrSz + 6);

  // Skip button (top-right corner, small)
  const skipW = 58;
  const skipH = 20;
  const skipX = x + panelW - skipW - 10;
  const skipY = y + 10;
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  roundRect(ctx, skipX, skipY, skipW, skipH, 7);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1;
  roundRect(ctx, skipX, skipY, skipW, skipH, 7);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `600 10px 'Segoe UI', sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("PULAR", skipX + skipW / 2, skipY + skipH / 2 + 4);

  // "CONTINUAR" button for autoAdvanceOnInput steps
  if (hasAction) {
    const btnW = Math.min(140, panelW * 0.42);
    const btnH = 32;
    const btnX = x + Math.round((panelW - btnW) / 2);
    const btnY = y + panelH - btnH - 10;
    // button glow/fill
    const g = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
    g.addColorStop(0, "#FFD700");
    g.addColorStop(1, "#e6a800");
    ctx.fillStyle = g;
    roundRect(ctx, btnX, btnY, btnW, btnH, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1;
    roundRect(ctx, btnX, btnY, btnW, btnH, 10);
    ctx.stroke();
    ctx.fillStyle = "#1a1a1a";
    ctx.font = `700 ${Math.max(11, Math.min(14, w * 0.029))}px 'Barlow Condensed', monospace`;
    ctx.textAlign = "center";
    ctx.fillText("CONTINUAR ▶", btnX + btnW / 2, btnY + btnH / 2 + 5);
  }

  ctx.restore();

  // optional highlight callback
  if (highlightCallback && typeof highlightCallback === "function") {
    try { highlightCallback(step.highlight); } catch (e) {}
  }
}

/** Returns the hitbox of the CONTINUAR button for the given canvas dimensions, or null */
export function getContinuarButtonRect(step, w, h) {
  if (!step || !step.autoAdvanceOnInput) return null;
  const pad = Math.max(14, Math.round(w * 0.035));
  const panelW = Math.min(400, w - pad * 2);
  const baseH = 155;
  const panelH = Math.min(baseH, h * 0.26);
  const x = Math.round((w - panelW) / 2);
  const y = Math.round(h * 0.08);
  const btnW = Math.min(140, panelW * 0.42);
  const btnH = 32;
  const btnX = x + Math.round((panelW - btnW) / 2);
  const btnY = y + panelH - btnH - 10;
  return { x: btnX, y: btnY, w: btnW, h: btnH };
}

/** Returns the hitbox of the PULAR (skip) button for the given canvas dimensions */
export function getSkipButtonRect(w, h) {
  const pad = Math.max(14, Math.round(w * 0.035));
  const panelW = Math.min(400, w - pad * 2);
  const x = Math.round((w - panelW) / 2);
  const y = Math.round(h * 0.08);
  return { x: x + panelW - 58 - 10, y: y + 10, w: 58, h: 20 };
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
    if (ctx.measureText(testLine).width > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}
