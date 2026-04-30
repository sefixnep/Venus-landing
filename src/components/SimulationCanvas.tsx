import { useRef, useEffect } from 'react';
import type { SimulationState } from '../types/simulation';

interface Props {
  state: SimulationState;
  width: number;
  height: number;
}

/* ─── helpers ─── */

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * clamp(t, 0, 1);
}

function lerpColor(a: string, b: string, t: number): string {
  t = clamp(t, 0, 1);
  const ah = parseInt(a.slice(1), 16);
  const bh = parseInt(b.slice(1), 16);
  const r = Math.round(lerp((ah >> 16) & 0xff, (bh >> 16) & 0xff, t));
  const g = Math.round(lerp((ah >> 8) & 0xff, (bh >> 8) & 0xff, t));
  const bl = Math.round(lerp(ah & 0xff, bh & 0xff, t));
  return `rgb(${r},${g},${bl})`;
}

/** Simple seeded pseudo-random (deterministic). */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ─── sky / background ─── */

const SKY_STOPS: [number, string][] = [
  // [altitude km, color]
  [0,   '#6b4422'],
  [5,   '#8a5a30'],
  [15,  '#9e6e3a'],
  [30,  '#8a6530'],
  [45,  '#7a5a30'],
  [55,  '#5a4028'],
  [65,  '#3a2820'],
  [80,  '#1e1425'],
  [100, '#10101e'],
  [130, '#08080f'],
  [200, '#050508'],
];

function getSkyColor(altKm: number): string {
  if (altKm <= SKY_STOPS[0][0]) return SKY_STOPS[0][1];
  for (let i = 0; i < SKY_STOPS.length - 1; i++) {
    const [h0, c0] = SKY_STOPS[i];
    const [h1, c1] = SKY_STOPS[i + 1];
    if (altKm >= h0 && altKm <= h1) {
      return lerpColor(c0, c1, (altKm - h0) / (h1 - h0));
    }
  }
  return SKY_STOPS[SKY_STOPS.length - 1][1];
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, altKm: number) {
  // Vertical gradient around current altitude ±20 km mapped to canvas
  const top = getSkyColor(altKm + 20);
  const mid = getSkyColor(altKm);
  const bot = getSkyColor(Math.max(0, altKm - 20));
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, top);
  grad.addColorStop(0.45, mid);
  grad.addColorStop(1, bot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

/* ─── stars ─── */

function drawStars(ctx: CanvasRenderingContext2D, w: number, h: number, altKm: number) {
  const opacity = clamp((altKm - 50) / 50, 0, 1);
  if (opacity <= 0) return;

  ctx.save();
  const rng = seeded(42);

  for (let i = 0; i < 120; i++) {
    const x = rng() * w;
    const y = rng() * h * 0.75;
    const r = 0.4 + rng() * 1.4;
    const brightness = 0.4 + rng() * 0.6;
    ctx.globalAlpha = opacity * brightness;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // A few colored stars
  for (let i = 0; i < 8; i++) {
    const x = rng() * w;
    const y = rng() * h * 0.6;
    const r = 0.8 + rng() * 1.0;
    ctx.globalAlpha = opacity * 0.6;
    const hue = rng() > 0.5 ? '#ffd8a8' : '#a8c8ff';
    ctx.fillStyle = hue;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ─── clouds ─── */

function drawCloudLayer(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  altKm: number,
  time: number,
) {
  // Venus cloud deck: 45–70 km, densest at ~55 km
  // Only show when near or inside the layer
  if (altKm < 30 || altKm > 90) return;

  const rng = seeded(137);

  // Map cloud layer to screen y-coordinates
  // Clouds above craft → top of screen; below → bottom
  const layers = [
    { baseAlt: 68, count: 10, alpha: 0.12, color: '#d4b878', speed: 0.08, sizeScale: 1.0 },
    { baseAlt: 60, count: 14, alpha: 0.20, color: '#c8a860', speed: 0.05, sizeScale: 1.3 },
    { baseAlt: 52, count: 12, alpha: 0.25, color: '#b89850', speed: 0.03, sizeScale: 1.5 },
    { baseAlt: 46, count: 8,  alpha: 0.15, color: '#a88840', speed: 0.02, sizeScale: 1.2 },
  ];

  ctx.save();

  for (const layer of layers) {
    // Vertical position on screen: distance from craft mapped to pixels
    const dy = (altKm - layer.baseAlt) * 6; // 6px per km
    const baseY = h * 0.4 + dy;

    // Fade out if layer is far from view
    const dist = Math.abs(altKm - layer.baseAlt);
    const distFade = clamp(1 - dist / 30, 0, 1);
    if (distFade <= 0) continue;

    for (let i = 0; i < layer.count; i++) {
      const seed_x = rng();
      const seed_y = rng();
      const seed_rx = rng();
      const seed_ry = rng();
      const seed_phase = rng();

      // Horizontal drift
      const drift = time * layer.speed * 60 + seed_phase * 600;
      const cx = ((seed_x * w * 1.6 + drift) % (w + 200)) - 100;
      const cy = baseY + (seed_y - 0.5) * 40;

      const rx = (40 + seed_rx * 80) * layer.sizeScale;
      const ry = (12 + seed_ry * 20) * layer.sizeScale;

      ctx.globalAlpha = layer.alpha * distFade;

      // Soft cloud: radial gradient ellipse
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
      grad.addColorStop(0, layer.color);
      grad.addColorStop(0.6, layer.color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/* ─── atmospheric haze ─── */

function drawHaze(ctx: CanvasRenderingContext2D, w: number, h: number, altKm: number) {
  // Dense lower atmosphere haze below ~30 km
  const hazeAlpha = clamp((30 - altKm) / 30, 0, 0.3);
  if (hazeAlpha <= 0) return;

  ctx.save();
  const grad = ctx.createLinearGradient(0, h * 0.3, 0, h);
  grad.addColorStop(0, `rgba(180,140,80,0)`);
  grad.addColorStop(0.5, `rgba(180,140,80,${hazeAlpha * 0.5})`);
  grad.addColorStop(1, `rgba(160,120,60,${hazeAlpha})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/* ─── surface ─── */

function drawSurface(ctx: CanvasRenderingContext2D, w: number, h: number, altKm: number) {
  if (altKm > 25) return;

  // Surface line position: approaches from bottom as altitude decreases
  const surfaceY = h - 5 + Math.min(h * 0.6, altKm * 25);
  if (surfaceY > h + 20) return;

  ctx.save();

  // Ground gradient
  const grad = ctx.createLinearGradient(0, surfaceY - 8, 0, h + 20);
  grad.addColorStop(0, '#8a6a35');
  grad.addColorStop(0.05, '#7a5a28');
  grad.addColorStop(0.3, '#6a4a20');
  grad.addColorStop(1, '#4a3015');
  ctx.fillStyle = grad;
  ctx.fillRect(0, surfaceY - 8, w, h - surfaceY + 28);

  // Horizon glow
  ctx.globalAlpha = 0.4;
  const horizonGrad = ctx.createLinearGradient(0, surfaceY - 20, 0, surfaceY + 5);
  horizonGrad.addColorStop(0, 'rgba(200,160,80,0)');
  horizonGrad.addColorStop(0.5, 'rgba(200,160,80,0.3)');
  horizonGrad.addColorStop(1, 'rgba(200,160,80,0)');
  ctx.fillStyle = horizonGrad;
  ctx.fillRect(0, surfaceY - 20, w, 25);

  // Rocky terrain (only visible when close)
  if (altKm < 10) {
    const rng = seeded(999);
    const detail = clamp(1 - altKm / 10, 0, 1);
    ctx.globalAlpha = detail * 0.6;

    for (let i = 0; i < 20; i++) {
      const x = rng() * w;
      const bw = 8 + rng() * 30;
      const bh = 3 + rng() * 8;
      ctx.fillStyle = rng() > 0.5 ? '#5a3a18' : '#6a4a25';
      ctx.fillRect(x, surfaceY + rng() * 10, bw, bh);
    }

    // A few boulders
    ctx.globalAlpha = detail * 0.4;
    for (let i = 0; i < 6; i++) {
      const x = rng() * w;
      const r = 4 + rng() * 12;
      ctx.fillStyle = '#5a4020';
      ctx.beginPath();
      ctx.arc(x, surfaceY + 5 + rng() * 8, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/* ─── spacecraft ─── */

function drawSpacecraft(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  state: SimulationState,
  time: number,
) {
  ctx.save();
  ctx.translate(cx, cy);

  // Subtle sway during parachute descent
  if (state.drogueDeployed || state.mainChuteDeployed) {
    const sway = Math.sin(time * 1.2) * 1.5 + Math.sin(time * 0.7) * 0.8;
    ctx.rotate((sway * Math.PI) / 180);
  }

  const bw = 22; // body half-width at base
  const bh = 34; // body height

  // ── Re-entry plasma / heat glow ──
  if (state.heatShieldActive && state.machNumber > 1.5) {
    const intensity = clamp((state.machNumber - 1.5) / 15, 0, 1);

    // Outer glow
    const outerR = 40 + intensity * 30;
    const outer = ctx.createRadialGradient(0, bh / 2 + 6, 4, 0, bh / 2 + 6, outerR);
    outer.addColorStop(0, `rgba(255,220,100,${intensity * 0.8})`);
    outer.addColorStop(0.3, `rgba(255,140,40,${intensity * 0.5})`);
    outer.addColorStop(0.6, `rgba(255,60,20,${intensity * 0.25})`);
    outer.addColorStop(1, 'rgba(255,30,10,0)');
    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.arc(0, bh / 2 + 6, outerR, 0, Math.PI * 2);
    ctx.fill();

    // Shock layer (bright thin arc in front of heat shield)
    if (intensity > 0.2) {
      ctx.strokeStyle = `rgba(255,240,200,${intensity * 0.7})`;
      ctx.lineWidth = 2 + intensity * 2;
      ctx.beginPath();
      ctx.arc(0, bh / 2 + 4, bw + 8, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
  }

  // ── Main body ──
  // Capsule shape with metallic shading
  const bodyGrad = ctx.createLinearGradient(-bw, 0, bw, 0);
  bodyGrad.addColorStop(0, '#8a8a92');
  bodyGrad.addColorStop(0.3, '#d0d0d8');
  bodyGrad.addColorStop(0.5, '#e8e8f0');
  bodyGrad.addColorStop(0.7, '#c8c8d0');
  bodyGrad.addColorStop(1, '#909098');
  ctx.fillStyle = bodyGrad;

  ctx.beginPath();
  ctx.moveTo(-bw + 2, bh / 2);                // bottom-left
  ctx.lineTo(-bw - 2, 0);                      // mid-left (widest)
  ctx.quadraticCurveTo(-bw + 2, -bh / 3, -bw / 2.5, -bh / 2); // upper-left curve
  ctx.lineTo(bw / 2.5, -bh / 2);              // top edge
  ctx.quadraticCurveTo(bw - 2, -bh / 3, bw + 2, 0); // upper-right curve
  ctx.lineTo(bw - 2, bh / 2);                 // bottom-right
  ctx.closePath();
  ctx.fill();

  // Edge highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Panel lines
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-bw / 3, -bh / 2 + 4);
  ctx.lineTo(-bw / 3 - 2, bh / 2 - 2);
  ctx.moveTo(bw / 3, -bh / 2 + 4);
  ctx.lineTo(bw / 3 + 2, bh / 2 - 2);
  ctx.stroke();

  // Antenna nub on top
  ctx.strokeStyle = '#a0a0a8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -bh / 2);
  ctx.lineTo(0, -bh / 2 - 6);
  ctx.stroke();
  ctx.fillStyle = '#c0c0c8';
  ctx.beginPath();
  ctx.arc(0, -bh / 2 - 6, 2, 0, Math.PI * 2);
  ctx.fill();

  // ── Heat shield ──
  if (state.heatShieldActive) {
    const shieldGrad = ctx.createLinearGradient(0, bh / 2 - 2, 0, bh / 2 + 8);
    shieldGrad.addColorStop(0, '#705030');
    shieldGrad.addColorStop(0.5, '#503820');
    shieldGrad.addColorStop(1, '#3a2815');
    ctx.fillStyle = shieldGrad;
    ctx.beginPath();
    ctx.ellipse(0, bh / 2 + 2, bw + 5, 7, 0, 0, Math.PI);
    ctx.fill();

    // Shield edge highlight
    ctx.strokeStyle = 'rgba(180,140,80,0.4)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(0, bh / 2 + 2, bw + 5, 7, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
  }

  // ── Drogue chute ──
  if (state.drogueDeployed && !state.mainChuteDeployed) {
    drawParachute(ctx, bh, {
      lines: 3,
      spread: 16,
      lineLen: 40,
      canopyW: 22,
      canopyH: 18,
      color1: '#e88030',
      color2: '#d06820',
      stripe: '#fff',
      stripeH: 0.3,
      time,
    });
  }

  // ── Main chute ──
  if (state.mainChuteDeployed) {
    drawParachute(ctx, bh, {
      lines: 6,
      spread: 38,
      lineLen: 65,
      canopyW: 48,
      canopyH: 32,
      color1: '#e88030',
      color2: '#c85818',
      stripe: '#ffffff',
      stripeH: 0.35,
      time,
    });
  }

  // ── Engine flame ──
  if (state.engineRunning && state.fuel > 0) {
    drawFlame(ctx, bh, time);
  }

  ctx.restore();
}

interface ChuteOpts {
  lines: number;
  spread: number;
  lineLen: number;
  canopyW: number;
  canopyH: number;
  color1: string;
  color2: string;
  stripe: string;
  stripeH: number;
  time: number;
}

function drawParachute(ctx: CanvasRenderingContext2D, bh: number, o: ChuteOpts) {
  const topY = -bh / 2;
  const canopyY = topY - o.lineLen;

  // Suspension lines
  ctx.strokeStyle = 'rgba(200,200,200,0.6)';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < o.lines; i++) {
    const frac = o.lines === 1 ? 0.5 : i / (o.lines - 1);
    const attachX = lerp(-6, 6, frac);
    const topX = lerp(-o.spread, o.spread, frac);
    // Slight catenary curve
    const midX = (attachX + topX) / 2;
    const midY = (topY + canopyY) / 2 + 3;
    ctx.beginPath();
    ctx.moveTo(attachX, topY);
    ctx.quadraticCurveTo(midX, midY, topX, canopyY + o.canopyH * 0.3);
    ctx.stroke();
  }

  // Canopy — billowing shape
  const billow = Math.sin(o.time * 1.5) * 2;
  const cw = o.canopyW + billow;

  // Canopy gradient
  const cGrad = ctx.createLinearGradient(0, canopyY, 0, canopyY + o.canopyH);
  cGrad.addColorStop(0, o.color1);
  cGrad.addColorStop(0.5, o.color2);
  cGrad.addColorStop(1, o.color1);
  ctx.fillStyle = cGrad;

  ctx.beginPath();
  ctx.moveTo(-cw, canopyY + o.canopyH * 0.4);
  ctx.bezierCurveTo(
    -cw * 0.6, canopyY - o.canopyH * 0.15,
    cw * 0.6, canopyY - o.canopyH * 0.15,
    cw, canopyY + o.canopyH * 0.4,
  );
  ctx.bezierCurveTo(
    cw * 0.5, canopyY + o.canopyH * 0.55,
    -cw * 0.5, canopyY + o.canopyH * 0.55,
    -cw, canopyY + o.canopyH * 0.4,
  );
  ctx.fill();

  // Canopy edge highlight
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-cw, canopyY + o.canopyH * 0.4);
  ctx.bezierCurveTo(
    -cw * 0.6, canopyY - o.canopyH * 0.15,
    cw * 0.6, canopyY - o.canopyH * 0.15,
    cw, canopyY + o.canopyH * 0.4,
  );
  ctx.stroke();

  // White stripe
  ctx.fillStyle = o.stripe;
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  const sw = cw * 0.55;
  const sy = canopyY + o.canopyH * 0.1;
  ctx.moveTo(-sw, sy + o.canopyH * o.stripeH);
  ctx.bezierCurveTo(
    -sw * 0.5, sy - o.canopyH * 0.05,
    sw * 0.5, sy - o.canopyH * 0.05,
    sw, sy + o.canopyH * o.stripeH,
  );
  ctx.bezierCurveTo(
    sw * 0.4, sy + o.canopyH * (o.stripeH + 0.08),
    -sw * 0.4, sy + o.canopyH * (o.stripeH + 0.08),
    -sw, sy + o.canopyH * o.stripeH,
  );
  ctx.fill();
  ctx.globalAlpha = 1;

  // Gore lines (radial seams)
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 0.5;
  for (let i = 1; i < 6; i++) {
    const frac = i / 6;
    const gx = lerp(-cw * 0.9, cw * 0.9, frac);
    ctx.beginPath();
    ctx.moveTo(gx, canopyY + o.canopyH * 0.4);
    const peakY = canopyY + lerp(o.canopyH * 0.05, -o.canopyH * 0.1, 0.5 - Math.abs(frac - 0.5));
    ctx.lineTo(gx * 0.6, peakY);
    ctx.stroke();
  }
}

function drawFlame(ctx: CanvasRenderingContext2D, bh: number, time: number) {
  const baseY = bh / 2 + 4;

  // Multiple flame layers for richness
  const layers = [
    { width: 10, length: 28, color1: 'rgba(255,255,220,0.9)', color2: 'rgba(255,180,60,0.7)', color3: 'rgba(255,80,20,0)' },
    { width: 6,  length: 20, color1: 'rgba(255,255,255,0.8)', color2: 'rgba(255,220,100,0.6)', color3: 'rgba(255,140,40,0)' },
  ];

  for (const l of layers) {
    const flicker = Math.sin(time * 35) * 4 + Math.sin(time * 53) * 3 + Math.sin(time * 17) * 2;
    const fLen = l.length + flicker;

    const grad = ctx.createLinearGradient(0, baseY, 0, baseY + fLen);
    grad.addColorStop(0, l.color1);
    grad.addColorStop(0.35, l.color2);
    grad.addColorStop(1, l.color3);
    ctx.fillStyle = grad;

    const wobble = Math.sin(time * 25) * 1.5;
    ctx.beginPath();
    ctx.moveTo(-l.width, baseY);
    ctx.quadraticCurveTo(-l.width * 0.3, baseY + fLen * 0.6, wobble, baseY + fLen);
    ctx.quadraticCurveTo(l.width * 0.3, baseY + fLen * 0.6, l.width, baseY);
    ctx.closePath();
    ctx.fill();
  }

  // Engine glow on body
  ctx.globalAlpha = 0.15 + Math.sin(time * 30) * 0.05;
  const glow = ctx.createRadialGradient(0, baseY, 2, 0, baseY, 18);
  glow.addColorStop(0, 'rgba(255,200,100,0.6)');
  glow.addColorStop(1, 'rgba(255,200,100,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, baseY, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/* ─── HUD overlay ─── */

function drawHUD(ctx: CanvasRenderingContext2D, w: number, h: number, state: SimulationState) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '11px "Courier New", monospace';

  // Altitude (right side)
  ctx.textAlign = 'right';
  const altKm = state.altitude / 1000;
  ctx.fillText(`${altKm.toFixed(1)} km`, w - 12, h / 2 + 4);

  // Tick mark
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w - 58, h / 2);
  ctx.lineTo(w - 50, h / 2);
  ctx.stroke();

  // Speed & Mach (bottom-left)
  ctx.textAlign = 'left';
  ctx.fillText(`v: ${Math.abs(state.velocity).toFixed(0)} m/s`, 12, h - 12);
  ctx.fillText(`Mach ${state.machNumber.toFixed(1)}`, 12, h - 27);

  ctx.restore();
}

/* ─── main render ─── */

export default function SimulationCanvas({ state, width, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = width;
    const h = height;
    const altKm = state.altitude / 1000;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Layers back-to-front
    drawBackground(ctx, w, h, altKm);
    drawStars(ctx, w, h, altKm);
    drawCloudLayer(ctx, w, h, altKm, state.time);
    drawSurface(ctx, w, h, altKm);
    drawHaze(ctx, w, h, altKm);

    // Spacecraft position
    const craftX = w / 2;
    const craftY = state.altitude <= 0 ? h - 60 : h * 0.4;
    drawSpacecraft(ctx, craftX, craftY, state, state.time);

    drawHUD(ctx, w, h, state);
  }, [state, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        borderRadius: '8px',
      }}
    />
  );
}
