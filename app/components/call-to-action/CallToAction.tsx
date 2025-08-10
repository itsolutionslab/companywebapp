"use client";
import { useState, useEffect, useRef } from "react";
import "./CallToAction.css";

export default function CallToAction() {
  const [greeting, setGreeting] = useState("¿Listo para transformar tu industria?");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const calendlyURL = "https://calendly.com/brecomperuitsolutions/business"; // ✅ URL pública del evento

  // Mensajes dinámicos
  useEffect(() => {
    const frases = [
      "Impulsa tu negocio con inteligencia artificial",
      "Automatiza y crece sin límites",
      "Soluciones únicas para desafíos únicos",
      "La innovación comienza contigo",
    ];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % frases.length;
      setGreeting(frases[i]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fondo red neuronal interactiva
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    let mouseX = width / 2;
    let mouseY = height / 2;

    const points = Array.from({ length: 40 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      pulse: 0,
      wave: 0,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        const distMouse = Math.hypot(p.x - mouseX, p.y - mouseY);
        if (distMouse < 150) {
          p.pulse = Math.min(1, p.pulse + 0.05);
          p.wave = 1;
        } else {
          p.pulse = Math.max(0, p.pulse - 0.02);
        }

        const radius = 2 + p.pulse * 4;
        const glow = 5 + p.pulse * 15;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 210, 255, ${0.7 + p.pulse * 0.3})`;
        ctx.shadowBlur = glow;
        ctx.shadowColor = "#00d2ff";
        ctx.fill();

        for (let j = i + 1; j < points.length; j++) {
          const q = points[j];
          const dist = Math.hypot(p.x - q.x, p.y - q.y);
          if (dist < 150) {
            const alpha = 1 - dist / 150;
            let color = `rgba(0, 210, 255, ${alpha})`;

            if (p.wave > 0 || q.wave > 0) {
              const waveStrength = Math.max(p.wave, q.wave);
              color = `rgba(0, 255, 100, ${0.5 + 0.5 * waveStrength})`;
            }

            ctx.strokeStyle = color;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }

        if (p.wave > 0) p.wave -= 0.02;
      }

      requestAnimationFrame(draw);
    };
    draw();

    const moveHandler = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    const touchHandler = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouseX = e.touches[0].clientX;
        mouseY = e.touches[0].clientY;
      }
    };

    window.addEventListener("mousemove", moveHandler);
    window.addEventListener("touchmove", touchHandler);
    window.addEventListener("resize", () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    });

    return () => {
      window.removeEventListener("mousemove", moveHandler);
      window.removeEventListener("touchmove", touchHandler);
    };
  }, []);

  // Carga del script y CSS de Calendly
  useEffect(() => {
    if (!document.querySelector("#calendly-css")) {
      const link = document.createElement("link");
      link.id = "calendly-css";
      link.href = "https://assets.calendly.com/assets/external/widget.css";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    if (!document.querySelector("#calendly-script")) {
      const script = document.createElement("script");
      script.id = "calendly-script";
      script.src = "https://assets.calendly.com/assets/external/widget.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const openCalendly = () => {
    if (typeof window !== "undefined" && (window as any).Calendly?.initPopupWidget) {
      (window as any).Calendly.initPopupWidget({ url: calendlyURL });
    } else {
      alert("El widget de Calendly aún se está cargando. Intenta de nuevo en un momento.");
    }
  };

  return (
    <section className="cta-section">
      <canvas ref={canvasRef} className="cta-canvas"></canvas>
      <div className="cta-content">
        <h2 className="cta-title">{greeting}</h2>
        <p className="cta-text">
          En Brecomperu convertimos ideas en realidades inteligentes.
          Da el siguiente paso hacia el futuro.
        </p>
        <div className="cta-buttons">
          <button
            onClick={openCalendly}
            style={{
              padding: "12px 24px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            📅 Agendar reunión de 15 min
          </button>
          {/* <a href="#servicios" className="cta-btn-secondary">Explora nuestras soluciones</a> */}
        </div>
      </div>
    </section>
  );
}
