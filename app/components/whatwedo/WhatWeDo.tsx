"use client";
import React, { useEffect, useRef } from "react";
import "./WhatWeDo.css";

const WhatWeDo: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nodes: { x: number; y: number; vx: number; vy: number }[] = [];

  // Inicializar nodos
  const initNodes = (canvas: HTMLCanvasElement) => {
    const totalNodes = window.innerWidth < 600 ? 25 : 50;
    nodes.length = 0;
    for (let i = 0; i < totalNodes; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
      });
    }
  };

  // Animar red neuronal
  const animate = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujar nodos
    nodes.forEach((node) => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = "#00ffcc";
      ctx.fill();

      // Movimiento
      node.x += node.vx;
      node.y += node.vy;

      if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
      if (node.y < 0 || node.y > canvas.height) node.vy *= -1;
    });

    // Conexiones
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 120) {
          ctx.strokeStyle = "rgba(0,255,204,0.15)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(() => animate(ctx, canvas));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight * 0.6;
      initNodes(canvas);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    animate(ctx, canvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return (
    <section className="whatwedo-container">
      <canvas ref={canvasRef} className="whatwedo-canvas"></canvas>
      <div className="whatwedo-content">
        <h2>Qué hacemos</h2>
        <p>
          En <strong>Brecomperu IT Solutions</strong>, desarrollamos sistemas inteligentes
          que <span>automatizan procesos</span>, potencian la <span>productividad</span> y 
          transforman industrias usando <strong>Inteligencia Artificial</strong>.
        </p>
        <div className="whatwedo-services">
          <div className="service">
            <h3>🤖 Automatización IA</h3>
            <p>Implementamos soluciones que piensan, aprenden y actúan.</p>
          </div>
          <div className="service">
            <h3>⚙️ Optimización de Procesos</h3>
            <p>Reducción de costos y tiempos en operaciones críticas.</p>
          </div>
          <div className="service">
            <h3>💻 Software a medida</h3>
            <p>Plataformas personalizadas que se adaptan a tu negocio.</p>
          </div>
        </div>
        <a href="#contacto" className="cta-button">Hablemos de tu proyecto</a>
      </div>
    </section>
  );
};

export default WhatWeDo;
