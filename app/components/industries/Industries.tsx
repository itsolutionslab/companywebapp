"use client";
import React, { useEffect, useRef, useMemo } from "react";
import "./Industries.css";

const industriesData = [
  { icon: "🏭", title: "Manufactura", desc: "Automatización avanzada y control inteligente de procesos." },
  { icon: "🏦", title: "Finanzas", desc: "IA para análisis de riesgos, predicciones y detección de fraudes." },
  { icon: "🏥", title: "Salud", desc: "Soluciones para diagnóstico asistido y gestión hospitalaria." },
  { icon: "🛒", title: "Retail & E-Commerce", desc: "Optimización de inventarios y experiencia de compra personalizada." },
  { icon: "🚚", title: "Logística", desc: "Rutas inteligentes y gestión eficiente de entregas." },
  { icon: "🎓", title: "Educación", desc: "Plataformas de aprendizaje adaptativo impulsadas por IA." },
];

interface Particle {
  x: number;
  y: number;
}

const Industries: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const connectionsRef = useRef<[number, number][]>([]);

  // Pre-calcular partículas estáticas
  const initStaticParticles = useMemo(() => {
    return (canvas: HTMLCanvasElement): Particle[] => {
      const particles: Particle[] = [];
      const numParticles = 30; // Reducido de 40 para mejor rendimiento
      
      for (let i = 0; i < numParticles; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
        });
      }
      
      return particles;
    };
  }, []);

  // Pre-calcular conexiones una sola vez
  const initConnections = useMemo(() => {
    return (particles: Particle[]): [number, number][] => {
      const connections: [number, number][] = [];
      const maxDistance = 150;
      const maxDistanceSquared = maxDistance * maxDistance;
      
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distanceSquared = dx * dx + dy * dy;
          
          if (distanceSquared < maxDistanceSquared) {
            connections.push([i, j]);
          }
        }
      }
      
      return connections;
    };
  }, []);

  // Dibujar escena estática una sola vez
  const drawStaticScene = useMemo(() => {
    return (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const particles = particlesRef.current;
      const connections = connectionsRef.current;

      // Dibujar conexiones
      ctx.strokeStyle = "rgba(0,255,204,0.08)"; // Más transparente
      ctx.lineWidth = 0.8;
      
      connections.forEach(([i, j]) => {
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.stroke();
      });

      // Dibujar partículas
      ctx.fillStyle = "rgba(0,255,204,0.4)"; // Más transparente
      particles.forEach(particle => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2); // Tamaño reducido
        ctx.fill();
      });
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Reinicializar solo en resize
      particlesRef.current = initStaticParticles(canvas);
      connectionsRef.current = initConnections(particlesRef.current);
      
      // Dibujar una sola vez
      drawStaticScene(canvas, ctx);
    };

    // Inicialización
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [initStaticParticles, initConnections, drawStaticScene]);

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