import { formatTime } from "../utils/math.js";

const R = {
  bg: "#060c18",
  bgMid: "#0c1420",
  bgTop: "#0f1c2e",
  crimson: "#CC001E",
  crimsonDim: "rgba(204, 0, 30, 0.50)",
  crimsonFill: "rgba(204, 0, 30, 0.13)",
  crimsonHigh: "rgba(204, 0, 30, 0.26)",
  gold: "#C87D12",
  steel: "#4A6890",
  steelDim: "rgba(74, 104, 144, 0.75)",
  text: "#F2EDE4",
  textDim: "rgba(242, 237, 228, 0.60)",
  textFaint: "rgba(242, 237, 228, 0.28)",
  barBg: "#030a14",
  divider: "rgba(204, 0, 30, 0.35)",
  font: "'Barlow Condensed', 'Segoe UI', Arial, sans-serif",
};

function csz(ref, ratio, lo, hi) {
  return Math.max(lo, Math.min(hi, ref * ratio));
}

function scanlines(ctx, w, h) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.05)";
  for (let y = 0; y < h; y += 2) ctx.fillRect(0, y, w, 1);
  ctx.restore();
}

function bottomBar(ctx, w, h, leftTxt, rightTxt, blink) {
  const bh = 44,
    by = h - bh;
  ctx.save();
  ctx.fillStyle = R.barBg;
  ctx.fillRect(0, by, w, bh);
  ctx.strokeStyle = R.divider;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, by);
  ctx.lineTo(w, by);
  ctx.stroke();
  ctx.textBaseline = "middle";
  const cy = by + bh * 0.5;
  ctx.font = `400 ${csz(w, 0.016, 12, 16)}px ${R.font}`;
  ctx.fillStyle = R.textDim;
  ctx.textAlign = "left";
  ctx.fillText(leftTxt, 22, cy);
  ctx.font = `700 ${csz(w, 0.018, 13, 18)}px ${R.font}`;
  if (blink) {
    ctx.shadowColor = R.crimson;
    ctx.shadowBlur = 10;
    ctx.fillStyle = R.crimson;
  } else {
    ctx.fillStyle = R.textFaint;
  }
  ctx.textAlign = "right";
  ctx.fillText(rightTxt, w - 22, cy);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function topStripe(ctx, w, leftTxt, rightTxt) {
  const sh = 32;
  ctx.save();
  ctx.fillStyle = "#0a1220";
  ctx.fillRect(0, 0, w, sh);
  ctx.strokeStyle = R.divider;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, sh);
  ctx.lineTo(w, sh);
  ctx.stroke();
  ctx.textBaseline = "middle";
  ctx.fillStyle = R.steel;
  ctx.font = `700 ${csz(w, 0.016, 11, 15)}px ${R.font}`;
  ctx.textAlign = "left";
  ctx.fillText(leftTxt, 20, sh * 0.5);
  ctx.fillStyle = R.textDim;
  ctx.textAlign = "right";
  ctx.fillText(rightTxt, w - 20, sh * 0.5);
  ctx.restore();
}

function diagonalCut(ctx, w, size) {
  ctx.save();
  ctx.fillStyle = R.crimson;
  ctx.beginPath();
  ctx.moveTo(w - size, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w, size);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function sectionLabel(ctx, x, y, w, text) {
  ctx.save();
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = R.steel;
  ctx.font = `700 ${csz(w, 0.04, 10, 15)}px ${R.font}`;
  ctx.fillText(text, x, y);
  const lw = ctx.measureText(text).width;
  ctx.strokeStyle = R.divider;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + lw + 10, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();
  ctx.restore();
}

function drawRankList(ctx, x, y, w, rowH, rankings, slotCount) {
  const numW = csz(w, 0.08, 16, 24);
  const nameSz = csz(w, 0.056, 11, 17);
  const timeSz = csz(w, 0.052, 11, 16);
  for (let i = 0; i < slotCount; i++) {
    const ry = y + i * (rowH + 4);
    const mid = ry + rowH * 0.5;
    const entry = (rankings || [])[i];
    ctx.save();
    ctx.textBaseline = "middle";
    ctx.fillStyle = R.steelDim;
    ctx.font = `700 ${csz(w, 0.042, 9, 13)}px ${R.font}`;
    ctx.textAlign = "left";
    ctx.fillText(`${(i + 1).toString().padStart(2, "0")}`, x, mid);
    if (entry) {
      ctx.fillStyle = R.textDim;
      ctx.font = `700 ${nameSz}px ${R.font}`;
      ctx.fillText(entry.name.substring(0, 8), x + numW, mid);
      ctx.fillStyle = R.textDim;
      ctx.font = `700 ${timeSz}px ${R.font}`;
      ctx.textAlign = "right";
      ctx.fillText(formatTime(entry.time), x + w, mid);
    } else {
      ctx.fillStyle = R.textFaint;
      ctx.font = `400 ${nameSz}px ${R.font}`;
      ctx.fillText("---", x + numW, mid);
      ctx.textAlign = "right";
      ctx.fillText("--:--.---", x + w, mid);
    }
    ctx.restore();
  }
}

function drawResultRows(ctx, x, y, w, rowH, rankings, slotCount, hlIdx) {
  const numW = csz(w, 0.08, 16, 24);
  const nameSz = csz(w, 0.056, 11, 17);
  const timeSz = csz(w, 0.052, 11, 16);
  for (let i = 0; i < slotCount; i++) {
    const ry = y + i * (rowH + 4);
    const mid = ry + rowH * 0.5;
    const isHL = i === hlIdx;
    const entry = rankings && rankings[i];
    if (isHL) {
      ctx.save();
      ctx.fillStyle = R.crimsonHigh;
      ctx.fillRect(x - 4, ry - 1, w + 8, rowH + 2);
      ctx.strokeStyle = R.crimson;
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 4, ry - 1, w + 8, rowH + 2);
      ctx.restore();
    }
    ctx.save();
    ctx.textBaseline = "middle";
    ctx.fillStyle = isHL ? R.crimson : R.steelDim;
    ctx.font = `700 ${csz(w, 0.042, 9, 13)}px ${R.font}`;
    ctx.textAlign = "left";
    ctx.fillText(`${(i + 1).toString().padStart(2, "0")}`, x, mid);
    if (entry) {
      ctx.fillStyle = isHL ? R.text : R.textDim;
      ctx.font = `700 ${nameSz}px ${R.font}`;
      ctx.fillText(entry.name.substring(0, 8), x + numW, mid);
      ctx.fillStyle = isHL ? R.gold : R.textDim;
      ctx.font = `700 ${timeSz}px ${R.font}`;
      ctx.textAlign = "right";
      ctx.fillText(formatTime(entry.time), x + w, mid);
      if (isHL) {
        ctx.fillStyle = R.crimson;
        ctx.font = `700 ${csz(w, 0.038, 8, 11)}px ${R.font}`;
        const tw = ctx.measureText(formatTime(entry.time)).width;
        ctx.fillText("NEW", x + w - tw - 8, mid);
      }
    } else {
      ctx.fillStyle = R.textFaint;
      ctx.font = `400 ${nameSz}px ${R.font}`;
      ctx.fillText("---", x + numW, mid);
      ctx.textAlign = "right";
      ctx.fillText("--:--.---", x + w, mid);
    }
    ctx.restore();
  }
}

function drawNewEntryRow(ctx, x, y, w, rowH, entryTime, pending, blink) {
  const mid = y + rowH * 0.5;
  const numW = csz(w, 0.08, 16, 24);
  const nameSz = csz(w, 0.056, 11, 17);
  const timeSz = csz(w, 0.052, 11, 16);
  ctx.save();
  ctx.fillStyle = R.crimsonFill;
  ctx.fillRect(x - 4, y - 1, w + 8, rowH + 2);
  ctx.strokeStyle = R.crimsonDim;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 4, y - 1, w + 8, rowH + 2);
  ctx.textBaseline = "middle";
  ctx.fillStyle = R.crimson;
  ctx.font = `700 ${csz(w, 0.042, 9, 13)}px ${R.font}`;
  ctx.textAlign = "left";
  ctx.fillText("—", x, mid);
  const cursor = blink ? "▮" : "▯";
  const display = (pending + cursor).substring(0, 9);
  ctx.fillStyle = R.text;
  ctx.font = `700 ${nameSz}px ${R.font}`;
  ctx.fillText(display, x + numW, mid);
  ctx.fillStyle = R.gold;
  ctx.font = `700 ${timeSz}px ${R.font}`;
  ctx.textAlign = "right";
  ctx.fillText(formatTime(entryTime), x + w, mid);
  ctx.restore();
}

function calculateTrackBounds(points) {
  let minX = Infinity;
  let maxX = -Infinity;

  for (let i = 0; i < points.length; i++) {
    if (points[i].x < minX) minX = points[i].x;
    if (points[i].x > maxX) maxX = points[i].x;
  }

  return { minX, xRange: Math.max(1, maxX - minX) };
}

function projectTrackPoint(points, index, bounds, map) {
  const t = points.length > 1 ? index / (points.length - 1) : 0;
  const nx = (points[index].x - bounds.minX) / bounds.xRange;
  return {
    x: map.mapX + map.drawPad + nx * map.usableW,
    y: map.mapY + map.drawPad + t * map.usableH,
  };
}

function sampleTrackPointIndexes(pointsLength) {
  const step = Math.max(1, Math.floor(pointsLength / 800));
  const out = [];
  for (let i = 0; i < pointsLength; i += step) out.push(i);
  if (out[out.length - 1] !== pointsLength - 1) out.push(pointsLength - 1);
  return out;
}

function drawMinimap(ctx, mapX, mapY, mapW, mapH, track) {
  ctx.fillStyle = "rgba(4,10,20,0.97)";
  ctx.fillRect(mapX, mapY, mapW, mapH);
  ctx.strokeStyle = "rgba(58,80,112,0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(mapX, mapY, mapW, mapH);
  const points = track.trackData;
  if (!points || points.length < 2) return;
  const pad = 16;
  const map = {
    mapX,
    mapY,
    drawPad: pad,
    usableW: mapW - pad * 2,
    usableH: mapH - pad * 2,
  };
  const bnd = calculateTrackBounds(points);
  const idx = sampleTrackPointIndexes(points.length);
  const path = idx.map((i) => projectTrackPoint(points, i, bnd, map));
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
  ctx.shadowColor = R.steel;
  ctx.shadowBlur = 6;
  ctx.strokeStyle = R.steel;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = R.crimson;
  ctx.beginPath();
  ctx.arc(path[0].x, path[0].y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = R.gold;
  ctx.beginPath();
  ctx.arc(path[path.length - 1].x, path[path.length - 1].y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = R.textDim;
  ctx.font = `700 10px ${R.font}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("START", path[0].x + 8, path[0].y);
  ctx.restore();
}

function drawGyroscopeWarning(ctx, x, y, w) {
  const sz = csz(w, 0.028, 10, 13);
  ctx.save();
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillStyle = R.gold;
  ctx.font = `700 ${sz}px ${R.font}`;
  ctx.fillText(
    "[!]  CHROME NO iOS NAO SUPORTA SENSOR DE MOVIMENTO — USE O SAFARI",
    x,
    y,
  );
  ctx.restore();
}

function drawIOSPermissionButton(ctx, x, y, w, blink) {
  const sz = csz(w, 0.034, 11, 15);
  const btnH = sz + 16;
  const btnW = Math.min(w, w * 0.9);
  ctx.save();
  ctx.fillStyle = blink
    ? "rgba(74, 104, 144, 0.18)"
    : "rgba(74, 104, 144, 0.10)";
  ctx.fillRect(x, y, btnW, btnH);
  ctx.strokeStyle = blink ? R.steel : R.steelDim;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, btnW, btnH);
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = blink ? R.steel : R.steelDim;
  ctx.font = `700 ${sz}px ${R.font}`;
  ctx.fillText("▶  ATIVAR SENSOR DE MOVIMENTO", x + 10, y + btnH / 2);
  ctx.restore();
}

function drawStartScreen(ctx, w, h, gameState, track) {
  const isPortrait = h > w;
  const age = gameState ? gameState.screenAge || 0 : 0;
  const fade = Math.min(1, age / 0.5);
  const blink = Math.sin(age * Math.PI * 1.4) > 0;
  const rankings = (gameState && gameState.rankings) || [];
  const km = track ? ((track.lapLength || 0) / 1000).toFixed(2) : "?.??";
  const seed = track ? track.seed : "—";
  const segs = track && track.segments ? track.segments.length : 0;

  ctx.save();
  ctx.globalAlpha = fade;

  const _bgGrad = ctx.createLinearGradient(0, 0, w * 0.4, h);
  _bgGrad.addColorStop(0, R.bgTop);
  _bgGrad.addColorStop(0.5, R.bgMid);
  _bgGrad.addColorStop(1, R.bg);
  ctx.fillStyle = _bgGrad;
  ctx.fillRect(0, 0, w, h);
  scanlines(ctx, w, h);
  diagonalCut(ctx, w, isPortrait ? 50 : 72);

  {
    const btnSz = csz(w, 0.06, 18, 28);
    const btnPad = 8;
    const btnX = btnPad;
    const btnY = btnPad;
    ctx.save();
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillStyle = R.steel;
    ctx.font = `700 ${btnSz}px ${R.font}`;
    ctx.fillText("⚙ CONFIG", btnX, btnY);
    ctx.restore();
  }

  if (isPortrait) {
    const tx = csz(w, 0.06, 18, 36);
    const apexSz = csz(w, 0.2, 48, 80);
    const typezSz = csz(w, 0.168, 40, 66);

    ctx.save();
    ctx.shadowColor = R.crimson;
    ctx.shadowBlur = 18;
    ctx.fillStyle = R.crimson;
    ctx.font = `700 ${apexSz}px ${R.font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("APEX", tx, h * 0.155);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = R.text;
    ctx.font = `700 ${typezSz}px ${R.font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("TYPE Z", tx, h * 0.155 + apexSz * 1.1);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = R.steel;
    ctx.font = `400 ${csz(w, 0.028, 12, 16)}px ${R.font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("TIME ATTACK", tx, h * 0.36);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = R.divider;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tx, h * 0.4);
    ctx.lineTo(w * 0.9, h * 0.4);
    ctx.stroke();
    ctx.restore();

    const ctrlSz = csz(w, 0.034, 12, 16);
    const ctrlY = h * 0.44;
    sectionLabel(ctx, tx, ctrlY, w * 0.88, "CONTROLES");
    ctx.save();
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillStyle = R.textDim;
    ctx.font = `400 ${ctrlSz}px ${R.font}`;
    ctx.fillText("←  SEGURAR ESQUERDA  —  FREIO / ERS", tx, ctrlY + 14);
    ctx.fillText("→  SEGURAR DIREITA   —  BOOST", tx, ctrlY + 14 + ctrlSz + 5);
    ctx.fillStyle = R.steelDim;
    ctx.font = `400 ${csz(w, 0.028, 10, 14)}px ${R.font}`;
    ctx.fillText(
      "CENTRO-DIREITA / Z ou X  —  ALTERNA MODO",
      tx,
      ctrlY + 14 + (ctrlSz + 5) * 2,
    );
    ctx.restore();

    if (gameState && gameState.iosPermissionStatus === "prompt") {
      drawIOSPermissionButton(ctx, tx, h * 0.54, w - tx * 2, blink);
    } else if (gameState && gameState.gyroscopeWarning) {
      drawGyroscopeWarning(ctx, tx, h * 0.54, w - tx * 2);
    }

    const rkY = h * 0.6;
    sectionLabel(ctx, tx, rkY, w * 0.88, "RANKING");
    const rkAvail = h - 44 - (rkY + 16) - 8;
    const rowH = Math.min(36, rkAvail / 5 - 4);
    drawRankList(ctx, tx, rkY + 16, w - tx * 2, rowH, rankings, 5);
  } else {
    const divX = Math.round(w * 0.6);
    const titleX = csz(w, 0.04, 18, 40);
    const leftW = divX - titleX - 24;
    const rightX = divX + 20;
    const rightW = w - rightX - 16;

    ctx.save();
    ctx.strokeStyle = R.divider;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(divX, 22);
    ctx.lineTo(divX, h - 52);
    ctx.stroke();
    ctx.restore();

    const apexSz = csz(w, 0.12, 52, 108);
    const typezSz = csz(w, 0.095, 42, 86);

    ctx.save();
    ctx.shadowColor = R.crimson;
    ctx.shadowBlur = 22;
    ctx.fillStyle = R.crimson;
    ctx.font = `700 ${apexSz}px ${R.font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("APEX", titleX, h * 0.26);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = R.text;
    ctx.font = `700 ${typezSz}px ${R.font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("TYPE Z", titleX, h * 0.26 + apexSz * 1.1);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = R.steel;
    ctx.font = `400 ${csz(w, 0.018, 12, 17)}px ${R.font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("TIME ATTACK", titleX, h * 0.26 + apexSz * 1.1 + typezSz);
    ctx.restore();

    const ruleY = h * 0.57;
    ctx.save();
    ctx.strokeStyle = R.divider;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(titleX, ruleY);
    ctx.lineTo(divX - 20, ruleY);
    ctx.stroke();
    ctx.restore();

    const ctrlY = ruleY + 18;
    const ctrlSz = csz(w, 0.022, 12, 17);
    sectionLabel(ctx, titleX, ctrlY, leftW, "CONTROLES");
    ctx.save();
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillStyle = R.textDim;
    ctx.font = `400 ${ctrlSz}px ${R.font}`;
    ctx.fillText("←  SEGURAR ESQUERDA  —  FREIO / ERS", titleX, ctrlY + 14);
    ctx.fillText(
      "→  SEGURAR DIREITA   —  BOOST",
      titleX,
      ctrlY + 14 + ctrlSz + 5,
    );
    ctx.fillStyle = R.steelDim;
    ctx.font = `400 ${csz(w, 0.018, 10, 14)}px ${R.font}`;
    ctx.fillText(
      "CENTRO-DIREITA / Z ou X  —  ALTERNA MODO AERO",
      titleX,
      ctrlY + 14 + (ctrlSz + 5) * 2,
    );
    ctx.restore();

    if (gameState && gameState.iosPermissionStatus === "prompt") {
      drawIOSPermissionButton(
        ctx,
        titleX,
        ctrlY + 14 + (ctrlSz + 5) * 3 + 4,
        leftW,
        blink,
      );
    } else if (gameState && gameState.gyroscopeWarning) {
      drawGyroscopeWarning(
        ctx,
        titleX,
        ctrlY + 14 + (ctrlSz + 5) * 3 + 4,
        leftW,
      );
    }

    sectionLabel(ctx, rightX, h * 0.12, rightW, "RANKING");
    const rkAvail = h - 44 - (h * 0.12 + 16) - 8;
    const rowH = Math.min(48, rkAvail / 5 - 4);
    drawRankList(ctx, rightX, h * 0.12 + 16, rightW, rowH, rankings, 5);
  }

  bottomBar(
    ctx,
    w,
    h,
    `SEED ${seed}  ·  ${segs} SEG  ·  ${km} km`,
    "INICIAR  ▶",
    blink,
  );
  ctx.restore();
}

function drawGameOverScreen(ctx, w, h, gameState) {
  const isPortrait = h > w;
  const age = gameState ? gameState.screenAge || 0 : 0;
  const fade = Math.min(1, age / 0.6);
  const blink = Math.sin(age * Math.PI * 1.4) > 0;
  const finalTime = (gameState && gameState.finalTime) || 0;
  const rankings = (gameState && gameState.rankings) || [];
  const phase = (gameState && gameState.rankingPhase) || "results";
  const hlIdx = gameState
    ? gameState.newEntryIndex != null
      ? gameState.newEntryIndex
      : -1
    : -1;
  const pending = (gameState && gameState.pendingName) || "";
  const isEntering = phase === "entering";

  ctx.save();
  ctx.globalAlpha = fade;

  const _goGrad = ctx.createLinearGradient(0, 0, w * 0.4, h);
  _goGrad.addColorStop(0, R.bgTop);
  _goGrad.addColorStop(0.5, R.bgMid);
  _goGrad.addColorStop(1, R.bg);
  ctx.fillStyle = _goGrad;
  ctx.fillRect(0, 0, w, h);
  scanlines(ctx, w, h);

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, R.crimson);
  grad.addColorStop(1, "rgba(204,0,30,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 3, h);

  if (isPortrait) {
    const headSz = csz(w, 0.09, 28, 48);
    ctx.save();
    ctx.shadowColor = R.crimson;
    ctx.shadowBlur = 14;
    ctx.fillStyle = R.text;
    ctx.font = `700 ${headSz}px ${R.font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("RACE RESULT", w * 0.5, h * 0.1);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = R.crimson;
    ctx.fillRect(w * 0.5 - 60, h * 0.1 + 6, 120, 2);
    ctx.restore();

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = R.steelDim;
    ctx.font = `700 ${csz(w, 0.03, 11, 15)}px ${R.font}`;
    ctx.fillText("TEMPO TOTAL", w * 0.5, h * 0.18);
    const timeSz = csz(w, 0.12, 40, 70);
    ctx.shadowColor = R.gold;
    ctx.shadowBlur = 18;
    ctx.fillStyle = R.gold;
    ctx.font = `700 ${timeSz}px ${R.font}`;
    ctx.fillText(formatTime(finalTime), w * 0.5, h * 0.18 + timeSz + 8);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = R.divider;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(16, h * 0.36);
    ctx.lineTo(w - 16, h * 0.36);
    ctx.stroke();
    ctx.restore();

    const rkX = 20;
    const rkW = w - 40;
    const rkY = h * 0.38;
    sectionLabel(ctx, rkX, rkY, rkW, "LEADERBOARD");
    const rkAvail = h - 44 - (rkY + 16) - 8;
    const rowH = Math.min(36, rkAvail / 5 - 4);
    const rkStart = rkY + 16;
    if (isEntering) {
      drawRankList(ctx, rkX, rkStart, rkW, rowH, rankings, 4);
      drawNewEntryRow(
        ctx,
        rkX,
        rkStart + 4 * (rowH + 4),
        rkW,
        rowH,
        finalTime,
        pending,
        blink,
      );
    } else {
      drawResultRows(ctx, rkX, rkStart, rkW, rowH, rankings, 5, hlIdx);
    }
  } else {
    const divX = Math.round(w * 0.5);
    const leftX = csz(w, 0.06, 24, 56);
    const leftW = divX - leftX - 16;
    const rightX = divX + 20;
    const rightW = w - rightX - 20;

    ctx.save();
    ctx.strokeStyle = R.divider;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(divX, 20);
    ctx.lineTo(divX, h - 52);
    ctx.stroke();
    ctx.restore();

    const headSz = csz(leftW, 0.18, 28, 54);
    ctx.save();
    ctx.shadowColor = R.crimson;
    ctx.shadowBlur = 14;
    ctx.fillStyle = R.text;
    ctx.font = `700 ${headSz}px ${R.font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("RACE", leftX, h * 0.22);
    ctx.fillText("RESULT", leftX, h * 0.22 + headSz * 1.1);
    ctx.shadowBlur = 0;
    ctx.restore();

    ctx.save();
    ctx.fillStyle = R.crimson;
    ctx.fillRect(
      leftX,
      h * 0.22 + headSz * 2.35,
      Math.min(120, leftW * 0.5),
      2,
    );
    ctx.restore();

    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = R.steelDim;
    ctx.font = `700 ${csz(leftW, 0.04, 11, 15)}px ${R.font}`;
    ctx.fillText("TEMPO TOTAL", leftX, h * 0.62);
    const timeSz = csz(leftW, 0.15, 38, 70);
    ctx.shadowColor = R.gold;
    ctx.shadowBlur = 16;
    ctx.fillStyle = R.gold;
    ctx.font = `700 ${timeSz}px ${R.font}`;
    ctx.fillText(formatTime(finalTime), leftX, h * 0.62 + timeSz + 8);
    ctx.restore();

    sectionLabel(ctx, rightX, h * 0.12, rightW, "LEADERBOARD");
    const rkAvail = h - 44 - (h * 0.12 + 16) - 8;
    const rowH = Math.min(48, rkAvail / 5 - 4);
    const rkStart = h * 0.12 + 16;
    if (isEntering) {
      drawRankList(ctx, rightX, rkStart, rightW, rowH, rankings, 4);
      drawNewEntryRow(
        ctx,
        rightX,
        rkStart + 4 * (rowH + 4),
        rightW,
        rowH,
        finalTime,
        pending,
        blink,
      );
    } else {
      drawResultRows(ctx, rightX, rkStart, rightW, rowH, rankings, 5, hlIdx);
    }
  }

  const ctaLeft = isEntering ? "INSIRA SEU NOME E PRESSIONE ENTER" : "";
  const ctaRight = isEntering ? "ENTER PARA SALVAR" : "JOGAR NOVAMENTE  ▶";
  bottomBar(ctx, w, h, ctaLeft, ctaRight, !isEntering || blink);
  ctx.restore();
}

function drawTrackPreviewScreen(ctx, w, h, track, gameState) {
  const isPortrait = h > w;
  const age = gameState ? gameState.screenAge || 0 : 0;
  const fade = Math.min(1, age / 0.5);
  const blink = Math.sin(age * Math.PI * 1.4) > 0;
  const km = ((track.lapLength || 0) / 1000).toFixed(2);
  const segs = track.segments ? track.segments.length : "?";

  ctx.save();
  ctx.globalAlpha = fade;

  const _csGrad = ctx.createLinearGradient(0, 0, w * 0.4, h);
  _csGrad.addColorStop(0, R.bgTop);
  _csGrad.addColorStop(0.5, R.bgMid);
  _csGrad.addColorStop(1, R.bg);
  ctx.fillStyle = _csGrad;
  ctx.fillRect(0, 0, w, h);
  scanlines(ctx, w, h);
  topStripe(ctx, w, "CIRCUIT SELECT", "CIRCUIT 01");

  const stripeH = 32;
  const barH = 44;
  const infoRows = [
    ["SEED", String(track.seed)],
    ["SEGMENTOS", String(segs)],
    ["VOLTA", `${km} km`],
    ["VOLTAS", "3"],
  ];

  if (isPortrait) {
    const mapH = Math.round((h - stripeH - barH) * 0.5);
    drawMinimap(ctx, 10, stripeH + 6, w - 20, mapH, track);

    const infoX = 20;
    const infoW = w - 40;
    const infoY = stripeH + 6 + mapH + 16;
    const rowSz = csz(w, 0.035, 14, 20);
    const labSz = csz(w, 0.026, 10, 14);
    sectionLabel(ctx, infoX, infoY, infoW, "CONFIGURAÇÃO");
    ctx.save();
    infoRows.forEach(([label, value], i) => {
      const ry = infoY + 20 + i * (rowSz + 8);
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";
      ctx.fillStyle = R.steelDim;
      ctx.font = `700 ${labSz}px ${R.font}`;
      ctx.fillText(label, infoX, ry);
      ctx.fillStyle = R.text;
      ctx.font = `700 ${rowSz}px ${R.font}`;
      ctx.textAlign = "right";
      ctx.fillText(value, infoX + infoW, ry);
    });
    ctx.restore();
  } else {
    const mapW = Math.round(w * 0.52);
    const mapH = Math.round((h - stripeH - barH) * 0.9);
    drawMinimap(ctx, 10, stripeH + 6, mapW - 10, mapH, track);

    ctx.save();
    ctx.strokeStyle = R.divider;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mapW + 8, stripeH + 14);
    ctx.lineTo(mapW + 8, h - barH - 10);
    ctx.stroke();
    ctx.restore();

    const infoX = mapW + 22;
    const infoW = w - infoX - 16;
    const infoY = stripeH + 20;
    const rowSz = csz(w, 0.028, 14, 22);
    const labSz = csz(w, 0.018, 10, 14);
    sectionLabel(ctx, infoX, infoY, infoW, "CONFIGURAÇÃO");
    ctx.save();
    infoRows.forEach(([label, value], i) => {
      const ry = infoY + 22 + i * (rowSz + 14);
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";
      ctx.fillStyle = R.steelDim;
      ctx.font = `700 ${labSz}px ${R.font}`;
      ctx.fillText(label, infoX, ry);
      ctx.fillStyle = R.text;
      ctx.font = `700 ${rowSz}px ${R.font}`;
      ctx.textAlign = "right";
      ctx.fillText(value, infoX + infoW, ry);
    });
    ctx.restore();
  }

  bottomBar(ctx, w, h, "", "CONTINUAR  ▶", blink);
  ctx.restore();
}

function drawSettingsScreen(ctx, w, h, gameState) {
  const isPortrait = h > w;
  const age = gameState ? gameState.screenAge || 0 : 0;
  const fade = Math.min(1, age / 0.5);
  const blink = Math.sin(age * Math.PI * 1.4) > 0;

  ctx.save();
  ctx.globalAlpha = fade;

  const _bgGrad = ctx.createLinearGradient(0, 0, w * 0.4, h);
  _bgGrad.addColorStop(0, R.bgTop);
  _bgGrad.addColorStop(0.5, R.bgMid);
  _bgGrad.addColorStop(1, R.bg);
  ctx.fillStyle = _bgGrad;
  ctx.fillRect(0, 0, w, h);
  scanlines(ctx, w, h);
  diagonalCut(ctx, w, isPortrait ? 50 : 72);

  const tx = csz(w, 0.06, 18, 40);

  ctx.save();
  ctx.shadowColor = R.crimson;
  ctx.shadowBlur = 14;
  ctx.fillStyle = R.text;
  ctx.font = `700 ${csz(w, 0.1, 28, 52)}px ${R.font}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("CONFIG", tx, h * 0.18);
  ctx.shadowBlur = 0;
  ctx.restore();

  ctx.save();
  ctx.fillStyle = R.crimson;
  ctx.fillRect(tx, h * 0.18 + 6, 80, 2);
  ctx.restore();

  const secY1 = h * 0.26;
  const colW = isPortrait ? w - tx * 2 : (w - tx * 3) * 0.5;
  const col2X = isPortrait ? tx : tx * 2 + colW;

  const ctrlSz = csz(w, 0.032, 12, 17);
  const labSz = csz(w, 0.024, 10, 14);

  sectionLabel(ctx, tx, secY1, colW, "CONTROLES");
  ctx.save();
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillStyle = R.textDim;
  ctx.font = `400 ${ctrlSz}px ${R.font}`;
  const ctrlLines = [
    "←  SEGURAR ESQUERDA  —  FREIO / ERS",
    "→  SEGURAR DIREITA   —  BOOST",
  ];
  ctrlLines.forEach((line, i) => {
    ctx.fillText(line, tx, secY1 + 18 + i * (ctrlSz + 6));
  });
  ctx.fillStyle = R.steelDim;
  ctx.font = `400 ${labSz}px ${R.font}`;
  ctx.fillText(
    "CENTRO-DIREITA / Z ou X  —  ALTERNA MODO AERO",
    tx,
    secY1 + 18 + ctrlLines.length * (ctrlSz + 6),
  );
  ctx.restore();

  const secY2 = isPortrait ? secY1 + 18 + (ctrlLines.length + 1) * (ctrlSz + 6) + 24 : secY1;
  sectionLabel(ctx, col2X, secY2, colW, "MODOS AERO");
  ctx.save();
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  const modeLines = [
    ["MODO X", "Alta carga — melhor em curvas"],
    ["MODO Z", "Baixa carga — melhor em retas"],
  ];
  modeLines.forEach(([label, desc], i) => {
    const ly = secY2 + 18 + i * (ctrlSz + 10);
    ctx.fillStyle = i === 0 ? R.crimson : R.steel;
    ctx.font = `700 ${ctrlSz}px ${R.font}`;
    ctx.fillText(label, col2X, ly);
    const lw = ctx.measureText(label).width;
    ctx.fillStyle = R.textDim;
    ctx.font = `400 ${labSz}px ${R.font}`;
    ctx.fillText(`  ${desc}`, col2X + lw, ly);
  });
  ctx.restore();

  if (gameState && gameState.gyroscopeWarning) {
    drawGyroscopeWarning(ctx, tx, h * 0.74, w - tx * 2);
  }

  bottomBar(ctx, w, h, "", "◀  VOLTAR", blink);
  ctx.restore();
}

export { drawStartScreen, drawGameOverScreen, drawTrackPreviewScreen, drawSettingsScreen };
