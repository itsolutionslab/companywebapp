"use client";
import React, { useEffect, useRef } from "react";
import "./Industries.css";

const industriesData = [
  { icon: "🏭", title: "Manufactura", desc: "Automatización avanzada y control inteligente de procesos." },
  { icon: "🏦", title: "Finanzas", desc: "IA para análisis de riesgos, predicciones y detección de fraudes." },
  { icon: "🏥", title: "Salud", desc: "Soluciones para diagnóstico asistido y gestión hospitalaria." },
  { icon: "🛒", title: "Retail & E-Commerce", desc: "Optimización de inventarios y experiencia de compra personalizada." },
  { icon: "🚚", title: "Logística", desc: "Rutas inteligentes y gestión eficiente de entregas." },
  { icon: "🎓", title: "Educación", desc: "Plataformas de aprendizaje adaptativo impulsadas por IA." },
];

const Industries: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Efecto de partículas en el fondo
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: { x: number; y: number; vx: number; vy: number }[] = [];
    const numParticles = 40;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(0,255,204,0.2)";
      ctx.fillStyle = "rgba(0,255,204,0.6)";

      particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();

        for (let j = idx + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.sqrt((p.x - p2.x) ** 2 + (p.y - p2.y) ** 2);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  return (
    <section className="industries-section">
      <canvas ref={canvasRef} className="industries-bg" />
      <h2 className="industries-title">Industrias a las que servimos</h2>
      <div className="industries-orbit">
        {industriesData.map((industry, index) => (
          <div key={index} className="industry-portal">
            <div className="portal-inner">
              <span className="portal-icon">{industry.icon}</span>
              <h3>{industry.title}</h3>
              <p>{industry.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Industries;
