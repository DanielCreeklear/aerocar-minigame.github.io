import { formatTime } from "../utils/math.js";
const R = {
  bg: "#FDB80B",
  bgTop: "#1a1a2e",
  bgMid: "#16213e",
  buttonBody: "#2B2B2B",
  buttonShadow: "#8E8E8E",
  accent: "#E60000",
  gold: "#FDB80B",
  steel: "#FFFFFF",
  steelDim: "rgba(255, 255, 255, 0.70)",
  text: "#FFFFFF",
  textDim: "rgba(255, 255, 255, 0.80)",
  textFaint: "rgba(255, 255, 255, 0.35)",
  textHeader: "#000000",
  barBg: "#1C1C1C",
  divider: "rgba(0, 0, 0, 0.25)",
  font: "monospace",
};
function csz(ref, ratio, lo, hi) {
  return Math.max(lo, Math.min(hi, ref * ratio));
}
function drawButton(ctx, x, y, w, h, label, isSelected) {
  const shadow = 4;
  ctx.fillStyle = R.buttonShadow;
  ctx.fillRect(x + shadow, y + shadow, w, h);
  const bx = isSelected ? x + shadow : x;
  const by = isSelected ? y + shadow : y;
  ctx.fillStyle = R.buttonBody;
  ctx.fillRect(bx, by, w, h);
  const sz = Math.max(12, Math.min(18, h * 0.45));
  const pad = Math.round(h * 0.35);
  ctx.fillStyle = R.text;
  ctx.font = `700 ${sz}px ${R.font}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, bx + pad, by + h * 0.5);
  const cbSize = Math.max(10, Math.round(h * 0.38));
  const cbX = bx + w - pad - cbSize;
  const cbY = by + (h - cbSize) * 0.5;
  ctx.strokeStyle = isSelected ? R.gold : "rgba(255,255,255,0.45)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(cbX, cbY, cbSize, cbSize);
  if (isSelected) {
    ctx.fillStyle = R.gold;
    ctx.fillRect(cbX + 3, cbY + 3, cbSize - 6, cbSize - 6);
  }
}
function drawSmallButton(ctx, x, y, w, h, label, isSelected) {
  
  ctx.save();
  const shadow = 2;
  
  ctx.fillStyle = R.buttonShadow;
  ctx.fillRect(x + shadow, y + shadow, w, h);
  
  ctx.fillStyle = isSelected ? R.gold : R.buttonBody;
  ctx.fillRect(x, y, w, h);
  
  ctx.strokeStyle = R.textHeader;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  
  const sz = Math.max(10, Math.min(12, h * 0.45));
  ctx.font = `700 ${sz}px ${R.font}`;
  
  ctx.fillStyle = R.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + w * 0.5, y + h * 0.5);
  ctx.restore();
}
function sectionHeader(ctx, x, y, w, text, color) {
  const sz = Math.max(11, Math.min(15, w * 0.038));
  ctx.save();
  ctx.font = `700 ${sz}px ${R.font}`;
  ctx.fillStyle = color || R.textHeader;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`* ${text}`, x, y);
  ctx.strokeStyle = color || R.textHeader;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y + 5);
  ctx.lineTo(x + w, y + 5);
  ctx.stroke();
  ctx.restore();
}
function bottomBar(ctx, w, h, actions) {
  const bh = 40;
  const by = h - bh;
  ctx.save();
  ctx.fillStyle = R.bg;
  ctx.fillRect(0, by, w, bh);
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, by);
  ctx.lineTo(w, by);
  ctx.stroke();
  const sz = Math.max(12, Math.min(15, w * 0.032));
  ctx.font = `700 ${sz}px ${R.font}`;
  ctx.textBaseline = "middle";
  const cy = by + bh * 0.5;
  let curX = 20;
  for (const action of actions) {
    ctx.fillStyle = R.textHeader;
    ctx.textAlign = "left";
    ctx.fillText(`${action.icon} ${action.label}`, curX, cy);
    curX += ctx.measureText(`${action.icon} ${action.label}`).width + 28;
  }
  ctx.restore();
}
function topStripe(ctx, w, leftTxt, rightTxt) {
  const sh = 32;
  ctx.save();
  ctx.fillStyle = R.barBg;
  ctx.fillRect(0, 0, w, sh);
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
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
  ctx.fillStyle = R.steelDim;
  ctx.textAlign = "right";
  ctx.fillText(rightTxt, w - 20, sh * 0.5);
  ctx.restore();
}
function drawRankList(ctx, x, y, w, rowH, rankings, slotCount) {
  for (let i = 0; i < slotCount; i++) {
    const ry = y + i * (rowH + 4);
    const entry = (rankings || [])[i];
    ctx.fillStyle = i % 2 === 0 ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.04)";
    ctx.fillRect(x, ry, w, rowH);
    const mid = ry + rowH * 0.5;
    const sz = Math.max(11, Math.min(16, rowH * 0.45));
    ctx.save();
    ctx.font = `700 ${sz}px ${R.font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = R.textHeader;
    ctx.fillText(`${(i + 1).toString().padStart(2, "0")}`, x + 6, mid);
    if (entry) {
      ctx.fillText(entry.name.substring(0, 8), x + 34, mid);
      ctx.font = `700 ${sz}px monospace`;
      ctx.textAlign = "right";
      ctx.fillText(formatTime(entry.time), x + w - 10, mid);
    } else {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillText("---", x + 34, mid);
      ctx.font = `700 ${sz}px monospace`;
      ctx.textAlign = "right";
      ctx.fillText("--:--.---", x + w - 10, mid);
    }
    ctx.restore();
  }
}
function drawResultRows(ctx, x, y, w, rowH, rankings, slotCount, hlIdx) {
  const accentW = 4;
  for (let i = 0; i < slotCount; i++) {
    const ry = y + i * (rowH + 4);
    const isHL = i === hlIdx;
    const entry = rankings && rankings[i];
    
    if (isHL) {
      ctx.fillStyle = R.buttonBody;
      ctx.fillRect(x, ry, w, rowH);
      
      ctx.fillStyle = R.gold;
      ctx.fillRect(x, ry, accentW, rowH);
    } else {
      ctx.fillStyle = i % 2 === 0 ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.04)";
      ctx.fillRect(x, ry, w, rowH);
    }
    const mid = ry + rowH * 0.5;
    const sz = Math.max(11, Math.min(16, rowH * 0.45));
    
    ctx.save();
    ctx.font = `700 ${sz}px ${R.font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const textX = x + (isHL ? accentW + 6 : 6);
    ctx.fillStyle = isHL ? R.gold : R.textHeader;
    ctx.fillText(`${(i + 1).toString().padStart(2, "0")}`, textX, mid);
    if (entry) {
      ctx.fillStyle = isHL ? R.steel : R.textHeader;
      ctx.fillText(entry.name.substring(0, 8), textX + 28, mid);
      ctx.font = `700 ${sz}px monospace`;
      ctx.fillStyle = isHL ? R.gold : R.textHeader;
      ctx.textAlign = "right";
      ctx.fillText(formatTime(entry.time), x + w - 10, mid);
    } else {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillText("---", textX + 28, mid);
      ctx.font = `700 ${sz}px monospace`;
      ctx.textAlign = "right";
      ctx.fillText("--:--.---", x + w - 10, mid);
    }
    ctx.restore();
  }
}
function drawNewEntryRow(ctx, x, y, w, rowH, entryTime, pending, blink) {
  const mid = y + rowH * 0.5;
  const sz = Math.max(11, Math.min(16, rowH * 0.45));
  ctx.fillStyle = R.bg;
  ctx.fillRect(x, y, w + 4, rowH + 4);
  ctx.fillStyle = R.buttonShadow;
  ctx.fillRect(x + 4, y + 4, w, rowH);
  ctx.fillStyle = R.buttonBody;
  ctx.fillRect(x, y, w, rowH);
  ctx.fillStyle = R.gold;
  ctx.fillRect(x, y, 4, rowH);
  ctx.save();
  ctx.font = `700 ${sz}px ${R.font}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = R.gold;
  ctx.fillText(">", x + 6, mid);
  const cursor = blink ? "\u25AE" : "\u25AF";
  const display = (pending + cursor).substring(0, 9);
  ctx.fillStyle = R.steel;
  ctx.fillText(display, x + 4 + 28, mid);
  ctx.font = `700 ${sz}px monospace`;
  ctx.textAlign = "right";
  ctx.fillText(formatTime(entryTime), x + w - 10, mid);
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
  ctx.fillStyle = R.buttonBody;
  ctx.fillRect(mapX, mapY, mapW, mapH);
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
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
  ctx.strokeStyle = R.gold;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.fillStyle = R.accent;
  ctx.beginPath();
  ctx.arc(path[0].x, path[0].y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = R.gold;
  ctx.beginPath();
  ctx.arc(path[path.length - 1].x, path[path.length - 1].y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = R.steel;
  ctx.font = `700 10px ${R.font}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("START", path[0].x + 8, path[0].y);
  ctx.restore();
}
function drawIOSPermissionButton(ctx, x, y, w, blink) {
  const btnH = 44;
  drawButton(
    ctx,
    x,
    y,
    Math.min(w, w * 0.9),
    btnH,
    "ATIVAR SENSOR DE MOVIMENTO",
    blink,
  );
}
function drawGyroscopeWarning(ctx, x, y, w) {
  const sz = Math.max(10, Math.min(13, w * 0.028));
  ctx.save();
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillStyle = R.textHeader;
  ctx.font = `700 ${sz}px ${R.font}`;
  ctx.fillText("[!] USE SAFARI NO iOS PARA GIROSCOPIO", x, y);
  ctx.restore();
}
function drawStartScreen(ctx, w, h, gameState, track) {
  const isPortrait = h > w;
  const age = gameState ? gameState.screenAge || 0 : 0;
  const fade = Math.min(1, age / 0.5);
  const blink = Math.sin(age * Math.PI * 1.4) > 0;
  const rankings = (gameState && gameState.rankings) || [];
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.fillStyle = R.bg;
  ctx.fillRect(0, 0, w, h);
  const pad = Math.max(20, w * 0.05);
  const btnW = Math.min(w - pad * 2, 380);
  const btnH = Math.max(44, Math.round(h * 0.075));
  const btnGap = Math.max(10, Math.round(h * 0.018));
  if (isPortrait) {
    const titleSz = csz(w, 0.16, 40, 72);
    ctx.fillStyle = R.textHeader;
    ctx.font = `700 ${titleSz}px ${R.font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("APEX", pad, h * 0.14);
    ctx.fillText("TYPE Z", pad, h * 0.14 + titleSz * 1.1);
    const subSz = csz(w, 0.03, 11, 14);
    ctx.font = `700 ${subSz}px ${R.font}`;
    ctx.fillStyle = R.textHeader;
    ctx.fillText("TIME ATTACK", pad, h * 0.14 + titleSz * 2.4);
    ctx.strokeStyle = R.textHeader;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pad, h * 0.14 + titleSz * 2.7);
    ctx.lineTo(w - pad, h * 0.14 + titleSz * 2.7);
    ctx.stroke();
    const btnStartY = h * 0.44;
    drawButton(ctx, pad, btnStartY, btnW, btnH, "INICIAR CORRIDA", blink);
    if (gameState && gameState.iosPermissionStatus === "prompt") {
      drawIOSPermissionButton(
        ctx,
        pad,
        btnStartY + btnH + btnGap + 4,
        btnW,
        blink,
      );
    } else if (gameState && gameState.gyroscopeWarning) {
      drawGyroscopeWarning(ctx, pad, btnStartY + btnH + btnGap + 4, btnW);
    }
    const rkY = h * 0.63;
    
    sectionHeader(ctx, pad, rkY, w - pad * 2, "RANKING");
    
    const hdrBtnW = Math.min(72, Math.round(w * 0.14));
    const hdrBtnH = 20;
    const hdrBtnX = w - pad - hdrBtnW;
    const hdrBtnY = rkY - hdrBtnH - 6;
    drawSmallButton(ctx, hdrBtnX, hdrBtnY, hdrBtnW, hdrBtnH, "VER TUDO", false);
    const rkAvail = h - 40 - (rkY + 14) - 8;
    const rowH = Math.max(24, Math.min(34, rkAvail / 5 - 4));
    drawRankList(ctx, pad, rkY + 14, w - pad * 2, rowH, rankings, 5);
  } else {
    const divX = Math.round(w * 0.5);
    const leftW = divX - pad - 16;
    const rightX = divX + 20;
    const rightW = w - rightX - pad;
    ctx.strokeStyle = R.textHeader;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(divX, pad);
    ctx.lineTo(divX, h - 48);
    ctx.stroke();
    const titleSz = csz(leftW, 0.22, 36, 80);
    ctx.fillStyle = R.textHeader;
    ctx.font = `700 ${titleSz}px ${R.font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("APEX", pad, h * 0.28);
    ctx.fillText("TYPE Z", pad, h * 0.28 + titleSz * 1.1);
    const subSz = csz(w, 0.02, 10, 13);
    ctx.font = `700 ${subSz}px ${R.font}`;
    ctx.fillText("TIME ATTACK", pad, h * 0.28 + titleSz * 2.35);
    const btnStartY = h * 0.62;
    drawButton(
      ctx,
      pad,
      btnStartY,
      Math.min(leftW, btnW),
      btnH,
      "INICIAR CORRIDA",
      blink,
    );
    if (gameState && gameState.iosPermissionStatus === "prompt") {
      drawIOSPermissionButton(
        ctx,
        pad,
        btnStartY + btnH + btnGap,
        Math.min(leftW, btnW),
        blink,
      );
    } else if (gameState && gameState.gyroscopeWarning) {
      drawGyroscopeWarning(ctx, pad, btnStartY + btnH + btnGap, leftW);
    }
    sectionHeader(ctx, rightX, pad + 8, rightW, "RANKING");
    
    const hdrBtnW = Math.min(72, Math.round(w * 0.12));
    const hdrBtnH = 18;
    const hdrBtnX = rightX + rightW - hdrBtnW;
    const hdrBtnY = pad + 8 - hdrBtnH - 4;
    drawSmallButton(ctx, hdrBtnX, hdrBtnY, hdrBtnW, hdrBtnH, "VER TUDO", false);
    const rkAvail = h - 40 - (pad + 22) - 8;
    const rowH = Math.max(24, Math.min(42, rkAvail / 5 - 4));
    drawRankList(ctx, rightX, pad + 22, rightW, rowH, rankings, 5);
  }
  bottomBar(ctx, w, h, [
    { icon: "○", label: "INICIAR" },
    { icon: "△", label: "CONFIG" },
  ]);
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
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.fillStyle = R.bg;
  ctx.fillRect(0, 0, w, h);
  const pad = Math.max(20, w * 0.05);
  if (isPortrait) {
    const headSz = csz(w, 0.09, 24, 44);
    ctx.fillStyle = R.textHeader;
    ctx.font = `700 ${headSz}px ${R.font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("RESULT", pad, h * 0.1);
    sectionHeader(ctx, pad, h * 0.13, w - pad * 2, "TEMPO TOTAL");
    const timeSz = csz(w, 0.11, 36, 64);
    ctx.fillStyle = R.buttonBody;
    ctx.font = `700 ${timeSz}px ${R.font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(formatTime(finalTime), pad, h * 0.13 + 14 + timeSz);
    const rkY = h * 0.36;
    sectionHeader(ctx, pad, rkY, w - pad * 2, "RANKING");
    const rkAvail = h - 40 - (rkY + 14) - 8;
    const rowH = Math.max(24, Math.min(34, rkAvail / 5 - 4));
    const rkStart = rkY + 14;
    if (isEntering) {
      drawRankList(ctx, pad, rkStart, w - pad * 2, rowH, rankings, 4);
      drawNewEntryRow(
        ctx,
        pad,
        rkStart + 4 * (rowH + 4),
        w - pad * 2,
        rowH,
        finalTime,
        pending,
        blink,
      );
    } else {
      drawResultRows(ctx, pad, rkStart, w - pad * 2, rowH, rankings, 5, hlIdx);
    }
  } else {
    const divX = Math.round(w * 0.5);
    const leftW = divX - pad - 16;
    const rightX = divX + 20;
    const rightW = w - rightX - pad;
    ctx.strokeStyle = R.textHeader;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(divX, pad);
    ctx.lineTo(divX, h - 48);
    ctx.stroke();
    const headSz = csz(leftW, 0.18, 24, 52);
    ctx.fillStyle = R.textHeader;
    ctx.font = `700 ${headSz}px ${R.font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("RACE", pad, h * 0.22);
    ctx.fillText("RESULT", pad, h * 0.22 + headSz * 1.1);
    sectionHeader(ctx, pad, h * 0.56, leftW, "TEMPO TOTAL");
    const timeSz = csz(leftW, 0.14, 32, 60);
    ctx.fillStyle = R.buttonBody;
    ctx.font = `700 ${timeSz}px ${R.font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(formatTime(finalTime), pad, h * 0.56 + 14 + timeSz);
    sectionHeader(ctx, rightX, pad + 8, rightW, "RANKING");
    const rkAvail = h - 40 - (pad + 22) - 8;
    const rowH = Math.max(24, Math.min(42, rkAvail / 5 - 4));
    const rkStart = pad + 22;
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
  if (isEntering) {
    bottomBar(ctx, w, h, [{ icon: "↵", label: "SALVAR NOME" }]);
  } else {
    bottomBar(ctx, w, h, [{ icon: "○", label: "JOGAR NOVAMENTE" }]);
  }
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
  ctx.fillStyle = R.bg;
  ctx.fillRect(0, 0, w, h);
  topStripe(ctx, w, "CIRCUIT SELECT", "CIRCUIT 01");
  const stripeH = 32;
  const barH = 40;
  const pad = Math.max(12, w * 0.03);
  const infoRows = [
    ["SEED", String(track.seed)],
    ["SEGS", String(segs)],
    ["VOLTA", `${km} km`],
    ["VOLTAS", "3"],
  ];
  if (isPortrait) {
    const mapH = Math.round((h - stripeH - barH) * 0.48);
    drawMinimap(ctx, pad, stripeH + 6, w - pad * 2, mapH, track);
    const infoX = pad;
    const infoW = w - pad * 2;
    const infoY = stripeH + 6 + mapH + 18;
    const rowSz = csz(w, 0.034, 13, 18);
    sectionHeader(ctx, infoX, infoY, infoW, "CIRCUITO", R.textHeader);
    ctx.save();
    ctx.font = `700 ${rowSz}px ${R.font}`;
    infoRows.forEach(([label, value], i) => {
      const ry = infoY + 18 + i * (rowSz + 8);
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = R.textHeader;
      ctx.textAlign = "left";
      ctx.fillText(label, infoX, ry);
      ctx.textAlign = "right";
      ctx.fillText(value, infoX + infoW, ry);
    });
    ctx.restore();
  } else {
    const mapW = Math.round(w * 0.52);
    const mapH = Math.round((h - stripeH - barH) * 0.9);
    drawMinimap(ctx, pad, stripeH + 6, mapW - pad - 4, mapH, track);
    ctx.strokeStyle = R.textHeader;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mapW + 8, stripeH + 14);
    ctx.lineTo(mapW + 8, h - barH - 10);
    ctx.stroke();
    const infoX = mapW + 20;
    const infoW = w - infoX - pad;
    const infoY = stripeH + 20;
    const rowSz = csz(w, 0.026, 13, 20);
    sectionHeader(ctx, infoX, infoY, infoW, "CIRCUITO", R.textHeader);
    ctx.save();
    ctx.font = `700 ${rowSz}px ${R.font}`;
    infoRows.forEach(([label, value], i) => {
      const ry = infoY + 18 + i * (rowSz + 14);
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = R.textHeader;
      ctx.textAlign = "left";
      ctx.fillText(label, infoX, ry);
      ctx.textAlign = "right";
      ctx.fillText(value, infoX + infoW, ry);
    });
    ctx.restore();
  }
  bottomBar(ctx, w, h, [{ icon: "○", label: "CONTINUAR" }]);
  ctx.restore();
}

function drawRankListPaged(ctx, x, y, w, rowH, rankings, slotCount, offset) {
  for (let i = 0; i < slotCount; i++) {
    const ry = y + i * (rowH + 4);
    const entry = (rankings || [])[offset + i];
    ctx.fillStyle = i % 2 === 0 ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.04)";
    ctx.fillRect(x, ry, w, rowH);
    const mid = ry + rowH * 0.5;
    const sz = Math.max(11, Math.min(16, rowH * 0.45));
    ctx.save();
    ctx.font = `700 ${sz}px ${R.font}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = R.textHeader;
    ctx.fillText(`${(offset + i + 1).toString().padStart(2, "0")}`, x + 6, mid);
    if (entry) {
      ctx.fillText(entry.name.substring(0, 8), x + 34, mid);
      ctx.font = `700 ${sz}px monospace`;
      ctx.textAlign = "right";
      ctx.fillText(formatTime(entry.time), x + w - 10, mid);
    } else {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillText("---", x + 34, mid);
      ctx.font = `700 ${sz}px monospace`;
      ctx.textAlign = "right";
      ctx.fillText("--:--.---", x + w - 10, mid);
    }
    ctx.restore();
  }
}

function drawLeaderboardScreen(ctx, w, h, gameState) {
  const isPortrait = h > w;
  const age = gameState ? gameState.screenAge || 0 : 0;
  const fade = Math.min(1, age / 0.5);
  const rankings = (gameState && gameState.rankings) || [];
  const page = (gameState && typeof gameState.leaderboardPage === "number") ? gameState.leaderboardPage : 0;
  const effectivePageSize = isPortrait ? 6 : 10;
  const totalPages = Math.max(1, Math.ceil((rankings.length || 0) / effectivePageSize));
  const curPage = Math.max(0, Math.min(page, totalPages - 1));

  ctx.save();
  ctx.globalAlpha = fade;
  ctx.fillStyle = R.bg;
  ctx.fillRect(0, 0, w, h);
  const pad = Math.max(20, w * 0.05);
  const titleSz = csz(w, 0.06, 18, 36);
  ctx.fillStyle = R.textHeader;
  ctx.font = `700 ${titleSz}px ${R.font}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("RANKING", pad, pad + titleSz);
  ctx.strokeStyle = R.textHeader;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad, pad + titleSz + 6);
  ctx.lineTo(w - pad, pad + titleSz + 6);
  ctx.stroke();

  
  const ctrlBtnW = Math.min(72, Math.round(w * 0.14));
  const ctrlBtnH = isPortrait ? 24 : 18;
  const gap = 6;
  
  const lineY = pad + titleSz + 6;
  const nextBtnX = w - pad - ctrlBtnW;
  const prevBtnX = nextBtnX - (ctrlBtnW + gap);
  const ctrlBtnY = Math.round(lineY + 6);
  const showPagingControls = (rankings && rankings.length) > 10;
  if (showPagingControls) {
    drawSmallButton(ctx, prevBtnX, ctrlBtnY, ctrlBtnW, ctrlBtnH, "ANT", false);
    drawSmallButton(ctx, nextBtnX, ctrlBtnY, ctrlBtnW, ctrlBtnH, "PROX", false);
  }

  

  
  const topY = showPagingControls ? Math.max(pad + titleSz + 18, ctrlBtnY + ctrlBtnH + 6) : (pad + titleSz + 18);
  const bottomH = 40;
  const availH = h - topY - bottomH - pad;
  
  const rowH = Math.max(20, Math.min(48, availH / effectivePageSize - 4));
  const offset = curPage * effectivePageSize;
  drawRankListPaged(ctx, pad, topY, w - pad * 2, rowH, rankings, effectivePageSize, offset);

  bottomBar(ctx, w, h, [{ icon: "✕", label: "VOLTAR" }]);
  ctx.restore();
}
function drawSettingsScreen(ctx, w, h, gameState) {
  const age = gameState ? gameState.screenAge || 0 : 0;
  const fade = Math.min(1, age / 0.5);
  const isPortrait = h > w;
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.fillStyle = R.bg;
  ctx.fillRect(0, 0, w, h);
  const pad = Math.max(20, w * 0.05);
  const btnW = Math.min(w - pad * 2, 380);
  const btnH = Math.max(44, Math.round(h * 0.075));
  const btnGap = Math.max(10, Math.round(h * 0.018));
  const titleSz = csz(w, 0.055, 18, 30);
  ctx.fillStyle = R.textHeader;
  ctx.font = `700 ${titleSz}px ${R.font}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("* CONFIG", pad, pad + titleSz);
  ctx.strokeStyle = R.textHeader;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad, pad + titleSz + 5);
  ctx.lineTo(
    isPortrait ? w - pad : Math.min(w - pad, pad + btnW + 4),
    pad + titleSz + 5,
  );
  ctx.stroke();
  let curY = pad + titleSz + 24;
  sectionHeader(ctx, pad, curY, btnW, "CONTROLES");
  curY += 16;
  const ctrlLines = [
    "← ESQUERDA  —  FREIO / ERS",
    "→ DIREITA   —  BOOST",
    "Z ou X      —  MODO AERO",
  ];
  const lineSz = csz(w, 0.028, 11, 15);
  ctx.font = `700 ${lineSz}px ${R.font}`;
  ctx.fillStyle = R.textHeader;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctrlLines.forEach((line, i) => {
    ctx.fillText(line, pad, curY + (lineSz + 7) * i + lineSz);
  });
  curY += ctrlLines.length * (lineSz + 7) + 20;
  sectionHeader(ctx, pad, curY, btnW, "MODO AERO");
  curY += 18;
  const aeroItems = [
    { label: "MODO X  —  ALTA CARGA  (CURVAS)", isSelected: false },
    { label: "MODO Z  —  BAIXA CARGA  (RETAS)", isSelected: true },
  ];
  aeroItems.forEach((item) => {
    drawButton(ctx, pad, curY, btnW, btnH, item.label, item.isSelected);
    curY += btnH + btnGap;
  });
  if (gameState && gameState.gyroscopeWarning) {
    drawGyroscopeWarning(ctx, pad, curY + 8, btnW);
  }
  bottomBar(ctx, w, h, [{ icon: "✕", label: "VOLTAR" }]);
  ctx.restore();
}
export {
  drawStartScreen,
  
  drawLeaderboardScreen,
  drawGameOverScreen,
  drawTrackPreviewScreen,
  drawSettingsScreen,
};
