"use client";
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import "./Header.css";

interface Particle {
  x: number;
  y: number;
  size: number;
  baseX: number;
  baseY: number;
  density: number;
}

const Header: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hover, setHover] = useState(false);

  const initParticles = useCallback((canvas: HTMLCanvasElement): Particle[] => {
    const particles: Particle[] = [];
    const numParticles = 80; // Reducido de 120 a 80
    for (let i = 0; i < numParticles; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      particles.push({
        x,
        y,
        size: 2,
        baseX: x,
        baseY: y,
        density: Math.random() * 30 + 1,
      });
    }
    return particles;
  }, []);

  const connectParticles = useCallback((ctx: CanvasRenderingContext2D, particles: Particle[]) => {
    for (let a = 0; a < particles.length; a++) {
      for (let b = a + 1; b < particles.length; b++) {
        const dx = particles[a].x - particles[b].x;
        const dy = particles[a].y - particles[b].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 120) {
          ctx.strokeStyle = "rgba(0, 240, 255, 0.2)";
          ctx.lineWidth = 0.5; // Reducido de 1 a 0.5
          ctx.beginPath();
          ctx.moveTo(particles[a].x, particles[a].y);
          ctx.lineTo(particles[b].x, particles[b].y);
          ctx.stroke();
        }
      }
    }
  }, []);

  const updateParticles = useCallback((particles: Particle[], mouse: { x: number; y: number }) => {
    particles.forEach((particle) => {
      const dx = mouse.x - particle.x;
      const dy = mouse.y - particle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxDistance = 120;
      const force = (maxDistance - distance) / maxDistance;
      const directionX = (dx / distance) * force * particle.density;
      const directionY = (dy / distance) * force * particle.density;

      if (distance < maxDistance) {
        particle.x -= directionX;
        particle.y -= directionY;
      } else {
        if (particle.x !== particle.baseX) {
          const dxBase = particle.x - particle.baseX;
          particle.x -= dxBase / 10;
        }
        if (particle.y !== particle.baseY) {
          const dyBase = particle.y - particle.baseY;
          particle.y -= dyBase / 10;
        }
      }
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let particles: Particle[] = [];
    let mouse = { x: 0, y: 0 };
    let animationFrameId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = initParticles(canvas);
    };

    window.addEventListener("resize", resize);
    resize();

    window.addEventListener("mousemove", (e) => {
      mouse.x = e.x;
      mouse.y = e.y;
    });

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      updateParticles(particles, mouse);
      particles.forEach((particle) => {
        ctx.fillStyle = "#00f0ff";
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      });
      connectParticles(ctx, particles);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [initParticles, connectParticles, updateParticles]);

  return (
    <header className="header">
      <canvas ref={canvasRef} className="particles-bg"></canvas>
      <div className="header-content">
        <h1 className="brand-name">
          <span>Brecomperu</span> IT Solutions
        </h1>
        <h2 className="phrase">Llevamos tu negocio al futuro con Inteligencia Artificial</h2>
        <p className="industry">Automatización, innovación y software de alto nivel para cualquier industria</p>
        <a href="tel:+51972243083" className="cta-btn">
          Llamar ahora
        </a>
      </div>
    </header>
  );
};

export default Header;
