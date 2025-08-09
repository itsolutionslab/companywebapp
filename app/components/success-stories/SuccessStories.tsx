"use client";
import React, { useEffect, useRef, useState } from "react";
import "./SuccessStories.css";

type Island = {
  id: string;
  title: string;
  short: string;
  full: string;
  x: number; // world coordinates
  y: number;
  colorA: string;
  colorB: string;
  radius?: number;
};

const islandsSeed: Island[] = [
  {
    id: "manufactura",
    title: "Manufactura",
    short: "Automatización industrial con IA",
    full:
      "Implementamos visión por computadora y control predictivo: downtime -42%, throughput +28%.",
    x: 200,
    y: 150,
    colorA: "#0b2433",
    colorB: "#0f6b4d",
    radius: 80,
  },
  {
    id: "finanzas",
    title: "Finanzas",
    short: "IA para riesgo y antifraude",
    full:
      "Scoring en tiempo real y pipeline KYC: detección 98% y procesamiento 5x más rápido.",
    x: 900,
    y: 260,
    colorA: "#0a102a",
    colorB: "#3b1f6a",
    radius: 70,
  },
  {
    id: "salud",
    title: "Salud",
    short: "Diagnóstico asistido y gestión clínica",
    full:
      "Modelo de imagen médica que acelera diagnósticos x3 y reduce falsos negativos.",
    x: 520,
    y: 700,
    colorA: "#08101b",
    colorB: "#164b5e",
    radius: 75,
  },
];

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export default function IndustryJourney() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);

  // world size - can be larger than viewport
  const world = useRef({ width: 1600, height: 1200 });

  // camera center in world coords (the viewport center)
  const camera = useRef({ x: 400, y: 300, targetX: 400, targetY: 300, speed: 600 }); // px/sec

  // islands (immutable seed)
  const islandsRef = useRef<Island[]>(islandsSeed);

  // UI state
  const [hoveredIsland, setHoveredIsland] = useState<null | Island>(null);
  const [openStory, setOpenStory] = useState<null | Island>(null);
  const [collected, setCollected] = useState<Record<string, boolean>>({});
  const keysRef = useRef<Record<string, boolean>>({});
  const draggingRef = useRef(false);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const [showHelp, setShowHelp] = useState(true);

  // init collected map
  useEffect(() => {
    const map: Record<string, boolean> = {};
    islandsRef.current.forEach((it) => (map[it.id] = collected[it.id] ?? false));
    setCollected(map);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keyboard for camera pan
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
    };
    const up = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // pointer handlers to pan camera by dragging (desktop & touch)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onPointerDown = (e: PointerEvent) => {
      draggingRef.current = true;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      // capture
      (e.target as Element).setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!draggingRef.current || !lastPointerRef.current) return;
      const dx = e.clientX - lastPointerRef.current.x;
      const dy = e.clientY - lastPointerRef.current.y;
      // move camera target opposite to drag for "drag the world" feeling
      camera.current.targetX = clamp(
        camera.current.targetX - dx,
        0,
        world.current.width
      );
      camera.current.targetY = clamp(
        camera.current.targetY - dy,
        0,
        world.current.height
      );
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
    };
    const onPointerUp = (e: PointerEvent) => {
      draggingRef.current = false;
      lastPointerRef.current = null;
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  // navigation helpers (UI buttons outside)
  const panBy = (dx: number, dy: number) => {
    camera.current.targetX = clamp(camera.current.targetX + dx, 0, world.current.width);
    camera.current.targetY = clamp(camera.current.targetY + dy, 0, world.current.height);
  };

  const centerOnIsland = (island: Island) => {
    camera.current.targetX = clamp(island.x, 0, world.current.width);
    camera.current.targetY = clamp(island.y, 0, world.current.height);
  };

  // main loop: update camera, draw world
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const DPR = Math.max(1, window.devicePixelRatio || 1);

    const resize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      canvas.style.width = `${vw}px`;
      canvas.style.height = `${vh}px`;
      canvas.width = Math.floor(vw * DPR);
      canvas.height = Math.floor(vh * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      // clamp camera to new bounds
      camera.current.targetX = clamp(camera.current.targetX, 0, world.current.width);
      camera.current.targetY = clamp(camera.current.targetY, 0, world.current.height);
    };

    resize();
    window.addEventListener("resize", resize);

    lastRef.current = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastRef.current) / 1000);
      lastRef.current = now;

      // keyboard pan speed
      const panSpeed = 480; // px per second
      let vx = 0;
      let vy = 0;
      if (keysRef.current["arrowleft"] || keysRef.current["a"]) vx = -1;
      if (keysRef.current["arrowright"] || keysRef.current["d"]) vx = 1;
      if (keysRef.current["arrowup"] || keysRef.current["w"]) vy = -1;
      if (keysRef.current["arrowdown"] || keysRef.current["s"]) vy = 1;
      if (vx !== 0 || vy !== 0) {
        // normalize diagonal
        const len = Math.hypot(vx, vy) || 1;
        camera.current.targetX = clamp(camera.current.targetX + (vx / len) * panSpeed * dt, 0, world.current.width);
        camera.current.targetY = clamp(camera.current.targetY + (vy / len) * panSpeed * dt, 0, world.current.height);
      }

      // smooth camera lerp to target
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
      const t = Math.min(1, 1 - Math.pow(0.002, dt)); // smooth factor dependent on dt
      camera.current.x = lerp(camera.current.x, camera.current.targetX, t);
      camera.current.y = lerp(camera.current.y, camera.current.targetY, t);

      draw(ctx, canvas);

      // check proximity to islands for hover / collect
      const cx = camera.current.x;
      const cy = camera.current.y;
      let foundHover: Island | null = null;
      for (const isl of islandsRef.current) {
        const dx = isl.x - cx;
        const dy = isl.y - cy;
        const dist = Math.hypot(dx, dy);
        const hoverRadius = (isl.radius ?? 70) + 80; // reveal radius
        if (dist < hoverRadius) {
          foundHover = isl;
          // if close enough to "collect" treasure (smaller threshold)
          if (dist < (isl.radius ?? 70) + 18 && !collected[isl.id]) {
            // collect and open modal (only once)
            setCollected((prev) => ({ ...prev, [isl.id]: true }));
            setOpenStory(isl);
          }
          break;
        }
      }
      setHoveredIsland(foundHover);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collected]);

  // Draw world relative to camera center
  const draw = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const vw = canvas.getBoundingClientRect().width;
    const vh = canvas.getBoundingClientRect().height;
    // clear
    ctx.clearRect(0, 0, vw, vh);

    // background (space-like infinite)
    const grad = ctx.createLinearGradient(0, 0, vw, vh);
    grad.addColorStop(0, "#020617");
    grad.addColorStop(1, "#071426");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, vw, vh);

    // subtle stars grid (parallax)
    drawStars(ctx, vw, vh, camera.current.x, camera.current.y);

    // draw islands at world positions transformed to screen
    const cx = camera.current.x;
    const cy = camera.current.y;

    for (const isl of islandsRef.current) {
      const screenX = (isl.x - cx) + vw / 2;
      const screenY = (isl.y - cy) + vh / 2;

      // subtle distance scale (farther islands smaller)
      const distToCenter = Math.hypot(screenX - vw / 2, screenY - vh / 2);
      const maxDist = Math.hypot(vw / 2, vh / 2);
      const scale = 1 - Math.min(0.6, distToCenter / maxDist * 0.6);

      // island glow radial
      const r = (isl.radius ?? 70) * scale;
      const rg = ctx.createRadialGradient(screenX, screenY, r * 0.2, screenX, screenY, r * 1.6);
      rg.addColorStop(0, `${isl.colorA}CC`);
      rg.addColorStop(1, `${isl.colorB}00`);
      ctx.beginPath();
      ctx.fillStyle = rg;
      ctx.arc(screenX, screenY, r * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // island main circle
      ctx.beginPath();
      ctx.fillStyle = isl.colorB;
      ctx.strokeStyle = isl.colorA;
      ctx.lineWidth = 2;
      ctx.arc(screenX, screenY, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // title badge when in reveal distance
      const dx = isl.x - cx;
      const dy = isl.y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < (isl.radius ?? 70) + 140) {
        ctx.save();
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.roundRect(screenX - 86, screenY - r - 46, 172, 36, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#e9fff7";
        ctx.font = "600 14px Inter, Arial";
        ctx.textAlign = "center";
        ctx.fillText(isl.title, screenX, screenY - r - 22);
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.font = "12px Inter, Arial";
        ctx.fillText(isl.short, screenX, screenY - r - 8);
        ctx.restore();
      }

      // collected marker
      if (collected[isl.id]) {
        ctx.save();
        ctx.fillStyle = "#ffd66b";
        ctx.beginPath();
        ctx.arc(screenX + r * 0.7, screenY - r * 0.7, 10 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#07121b";
        ctx.font = `${12 * scale}px Arial`;
        ctx.textAlign = "center";
        ctx.fillText("✓", screenX + r * 0.7, screenY - r * 0.7 + (4 * scale));
        ctx.restore();
      }
    }

    // HUD corner: instructions (outside visual center)
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "14px Inter, Arial";
    ctx.textAlign = "left";
    ctx.fillText("Explora libremente — arrastra, usa WASD o las flechas", 18, 26);
    ctx.restore();

    // if hovered island, show small panel at bottom-left (but not inside canvas elements beyond this)
    if (hoveredIsland) {
      ctx.save();
      const pad = 14;
      const boxW = Math.min(420, vw - 36);
      const boxH = 88;
      const x = 18;
      const y = vh - boxH - 18;
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = "rgba(2,6,12,0.86)";
      ctx.roundRect(x, y, boxW, boxH, 12);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,255,204,0.06)";
      ctx.stroke();
      ctx.fillStyle = "#00ffcc";
      ctx.font = "700 16px Inter, Arial";
      ctx.fillText(hoveredIsland.title, x + pad, y + 26);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "13px Inter, Arial";
      ctx.fillText(hoveredIsland.short, x + pad, y + 48);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "12px Inter, Arial";
      ctx.fillText("Acércate para descubrir el caso de éxito.", x + pad, y + 68);
      ctx.restore();
    }
  };

  // stars / parallax background
  const drawStars = (ctx: CanvasRenderingContext2D, vw: number, vh: number, cx: number, cy: number) => {
    // use a deterministic set per viewport size
    const count = Math.floor((vw * vh) / 40000);
    ctx.save();
    for (let i = 0; i < count; i++) {
      const nx = (i * 99991) % world.current.width; // deterministic-ish
      const ny = (i * 524287) % world.current.height;
      // screen pos with parallax factor based on world position
      const parallaxFactor = 0.07; // subtle
      const sx = (nx - cx) * (1 - parallaxFactor) + vw / 2;
      const sy = (ny - cy) * (1 - parallaxFactor) + vh / 2;
      const alpha = 0.08 + ((nx + ny) % 7) * 0.02;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  // canvas-roundRect polyfill for older contexts
useEffect(() => {
  const canvas = canvasRef.current;
  if (!canvas) return; // Evita que siga si no existe el canvas

  const ctx = canvas.getContext("2d");
  if (!ctx) return; // Evita seguir si no se pudo obtener el contexto

  // Polyfill de roundRect si no existe
  if (!("roundRect" in ctx)) {
    (ctx as CanvasRenderingContext2D).roundRect = function (
      x: number,
      y: number,
      w: number,
      h: number,
      r: number
    ) {
      this.beginPath();
      this.moveTo(x + r, y);
      this.arcTo(x + w, y, x + w, y + h, r);
      this.arcTo(x + w, y + h, x, y + h, r);
      this.arcTo(x, y + h, x, y, r);
      this.arcTo(x, y, x + w, y, r);
      this.closePath();
    };
  }
}, []);


  return (
    <section className="journey-section">
      {/* Controls OUTSIDE canvas */}
      <div className="journey-controls">
        <div className="left-controls">
          <button onClick={() => panBy(-220, 0)} aria-label="pan left">◀</button>
          <button onClick={() => panBy(220, 0)} aria-label="pan right">▶</button>
          <button onClick={() => panBy(0, -220)} aria-label="pan up">▲</button>
          <button onClick={() => panBy(0, 220)} aria-label="pan down">▼</button>
        </div>

        <div className="center-controls">
          {islandsRef.current.map((isl) => (
            <button
              key={isl.id}
              className={`island-chip ${collected[isl.id] ? "done" : ""}`}
              onClick={() => centerOnIsland(isl)}
            >
              {isl.title}
            </button>
          ))}
        </div>

        <div className="right-controls">
          <button onClick={() => setShowHelp((s) => !s)}>{showHelp ? "Ocultar ayuda" : "Mostrar ayuda"}</button>
        </div>
      </div>

      {/* Fullscreen canvas */}
      <div className="journey-canvas-wrap">
        <canvas ref={canvasRef} className="journey-canvas" />
      </div>

      {/* Modal story (manual close required). On mobile it will not auto-close. */}
      {openStory && (
        <div className="journey-modal" role="dialog" aria-modal="true">
          <div className="journey-modal-panel">
            <h3>{openStory.title}</h3>
            <p>{openStory.full}</p>
            <div className="modal-actions">
              <button onClick={() => setOpenStory(null)}>Cerrar</button>
              <a className="contact" href="#contacto">Solicitar proyecto</a>
            </div>
          </div>
        </div>
      )}

      {/* small help overlay (outside canvas) */}
      {showHelp && (
        <div className="journey-help">
          <strong>Cómo explorar</strong>
          <p>Arrastra la pantalla o usa WASD / Flechas. Pulsa los chips para centrar una industria.</p>
        </div>
      )}
    </section>
  );
}
