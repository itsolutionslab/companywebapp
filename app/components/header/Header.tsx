"use client";


import React, { useEffect, useRef } from "react";
import "./Header.css";

const Header: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let particles: Particle[] = [];

    // Inicializamos en 0 para evitar null
    let mouse = { x: 0, y: 0 };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    resize();

    window.addEventListener("mousemove", (e) => {
      mouse.x = e.x;
      mouse.y = e.y;
    });

    class Particle {
      x: number;
      y: number;
      size: number;
      baseX: number;
      baseY: number;
      density: number;

      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.size = 2;
        this.baseX = x;
        this.baseY = y;
        this.density = Math.random() * 30 + 1;
      }

      draw() {
        ctx.fillStyle = "#00f0ff";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      }

      update() {
        let dx = mouse.x - this.x;
        let dy = mouse.y - this.y;
        let distance = Math.sqrt(dx * dx + dy * dy);
        let maxDistance = 120;
        let force = (maxDistance - distance) / maxDistance;
        let directionX = (dx / distance) * force * this.density;
        let directionY = (dy / distance) * force * this.density;

        if (distance < maxDistance) {
          this.x -= directionX;
          this.y -= directionY;
        } else {
          if (this.x !== this.baseX) {
            let dx = this.x - this.baseX;
            this.x -= dx / 10;
          }
          if (this.y !== this.baseY) {
            let dy = this.y - this.baseY;
            this.y -= dy / 10;
          }
        }
      }
    }

    const init = () => {
      particles = [];
      const numParticles = 120;
      for (let i = 0; i < numParticles; i++) {
        let x = Math.random() * canvas.width;
        let y = Math.random() * canvas.height;
        particles.push(new Particle(x, y));
      }
    };
    init();

    const connectParticles = () => {
      for (let a = 0; a < particles.length; a++) {
        for (let b = a; b < particles.length; b++) {
          let dx = particles[a].x - particles[b].x;
          let dy = particles[a].y - particles[b].y;
          let distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 120) {
            ctx.strokeStyle = "rgba(0, 240, 255, 0.2)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[a].x, particles[a].y);
            ctx.lineTo(particles[b].x, particles[b].y);
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < particles.length; i++) {
        particles[i].draw();
        particles[i].update();
      }
      connectParticles();
      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <header className="header">
      <canvas ref={canvasRef} className="particles-bg"></canvas>
      <div className="header-content">
        <h1 className="brand-name">
          <span>Brecomperu</span> IT Solutions
        </h1>
          <h2 className="phrase">Llevamos tu negocio al futuro con Inteligencia Artificial</h2>
          <p className="industry">Automatización, innovación y software de alto nivel para cualquier industria</p>
          <a href="#contacto" className="cta-btn">Comienza tu proyecto</a>
        </div>
    </header>
  );
};

export default Header;
