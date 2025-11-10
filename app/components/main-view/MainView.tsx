"use client";
import React, { useEffect, useRef, useState, useMemo } from "react";
import "./MainView.css";

interface Particle {
  x: number;
  y: number;
  size: number;
}

const MainView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const connectionsRef = useRef<[number, number][]>([]);

  // Memoizar la inicialización de partículas y conexiones
  const initStaticParticles = useMemo(() => {
    return (canvas: HTMLCanvasElement) => {
      const particles: Particle[] = [];
      const numParticles = 80;
      
      for (let i = 0; i < numParticles; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: 2,
        });
      }
      
      return particles;
    };
  }, []);

  // Pre-calcular conexiones una sola vez
  const initConnections = useMemo(() => {
    return (particles: Particle[]): [number, number][] => {
      const connections: [number, number][] = [];
      const maxDistance = 120;
      const maxDistanceSquared = maxDistance * maxDistance;
      
      for (let a = 0; a < particles.length; a++) {
        for (let b = a + 1; b < particles.length; b++) {
          const dx = particles[a].x - particles[b].x;
          const dy = particles[a].y - particles[b].y;
          const distanceSquared = dx * dx + dy * dy;
          
          if (distanceSquared < maxDistanceSquared) {
            connections.push([a, b]);
          }
        }
      }
      
      return connections;
    };
  }, []);

  // Dibujar una sola vez - versión estática
  const drawStaticScene = useMemo(() => {
    return (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
      const particles = particlesRef.current;
      const connections = connectionsRef.current;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Dibujar conexiones
      ctx.strokeStyle = "rgba(0, 240, 255, 0.15)";
      ctx.lineWidth = 0.5;
      
      connections.forEach(([a, b]) => {
        const particleA = particles[a];
        const particleB = particles[b];
        
        ctx.beginPath();
        ctx.moveTo(particleA.x, particleA.y);
        ctx.lineTo(particleB.x, particleB.y);
        ctx.stroke();
      });
      
      // Dibujar partículas
      ctx.fillStyle = "#00f0ff";
      particles.forEach(particle => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      });
    };
  }, []);

  // Versión con hover sutil
  const drawWithHover = useMemo(() => {
    return (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, mouseX: number, mouseY: number) => {
      const particles = particlesRef.current;
      const connections = connectionsRef.current;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Dibujar conexiones con efecto de hover
      ctx.lineWidth = 0.5;
      
      connections.forEach(([a, b]) => {
        const particleA = particles[a];
        const particleB = particles[b];
        
        // Efecto sutil de brillo en conexiones cercanas al mouse
        const distanceToMouseA = Math.sqrt(
          Math.pow(particleA.x - mouseX, 2) + Math.pow(particleA.y - mouseY, 2)
        );
        const distanceToMouseB = Math.sqrt(
          Math.pow(particleB.x - mouseX, 2) + Math.pow(particleB.y - mouseY, 2)
        );
        
        const minDistance = Math.min(distanceToMouseA, distanceToMouseB);
        if (minDistance < 150) {
          ctx.strokeStyle = `rgba(0, 240, 255, ${0.3 - (minDistance / 150) * 0.2})`;
        } else {
          ctx.strokeStyle = "rgba(0, 240, 255, 0.1)";
        }
        
        ctx.beginPath();
        ctx.moveTo(particleA.x, particleA.y);
        ctx.lineTo(particleB.x, particleB.y);
        ctx.stroke();
      });
      
      // Dibujar partículas con efecto de hover
      particles.forEach(particle => {
        const distanceToMouse = Math.sqrt(
          Math.pow(particle.x - mouseX, 2) + Math.pow(particle.y - mouseY, 2)
        );
        
        if (distanceToMouse < 100) {
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size + 1, 0, Math.PI * 2);
          ctx.closePath();
          ctx.fill();
        }
        
        ctx.fillStyle = "#00f0ff";
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      });
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let mouseX = 0;
    let mouseY = 0;
    let animationFrameId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      particlesRef.current = initStaticParticles(canvas);
      connectionsRef.current = initConnections(particlesRef.current);
      
      drawStaticScene(canvas, ctx);
    };

    resize();

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      animationFrameId = requestAnimationFrame(() => {
        drawWithHover(canvas, ctx, mouseX, mouseY);
      });
    };

    const handleMouseLeave = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      drawStaticScene(canvas, ctx);
    };

    window.addEventListener("resize", resize);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [initStaticParticles, initConnections, drawStaticScene, drawWithHover]);

  return (
    <div className="header">
      {/* REMOVÍ el style={{ cursor: 'none' }} que causaba el problema */}
      <canvas ref={canvasRef} className="particles-bg"></canvas>
      <div className="header-content">
        <h1 className="brand-name">
          <span>Brecomperu</span> IT Solutions
        </h1>
        <h2 className="phrase">Llevamos tu negocio al futuro con Inteligencia Artificial</h2>
        <p className="industry">Automatización, innovación y software de alto nivel para cualquier industria</p>
        <a href="tel:+51972243083" className="cta-btn">
          Llamar Ahora +51 972 243 083
        </a>
      </div>
    </div>
  );
};

export default MainView;