"use client";
import { useEffect, useRef, useState } from "react";
import "./Footer.css";

export default function Footer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phraseIndex, setPhraseIndex] = useState(0);

  const phrases = [
    "Conectamos ideas con tecnología",
    "Innovación que impulsa industrias",
    "Tu proyecto, nuestra misión",
    "Inteligencia que crea futuro"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % phrases.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = 350;
    canvas.width = width;
    canvas.height = height;

    const points = Array.from({ length: 40 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      wave: 0,
      pulse: 0
    }));

    const particles: { x: number; y: number; tx: number; ty: number; progress: number }[] = [];

    const triggerWave = (i: number) => {
      points[i].wave = 1;
    };

    const spawnParticle = (x: number, y: number, tx: number, ty: number) => {
      particles.push({ x, y, tx, ty, progress: 0 });
    };

    setInterval(() => {
      const nodeIndex = Math.floor(Math.random() * points.length);
      triggerWave(nodeIndex);

      // encontrar nodo lejano para enviar partícula
      let farthestIndex = 0;
      let maxDist = 0;
      for (let i = 0; i < points.length; i++) {
        const dist = Math.hypot(points[nodeIndex].x - points[i].x, points[nodeIndex].y - points[i].y);
        if (dist > maxDist) {
          maxDist = dist;
          farthestIndex = i;
        }
      }
      spawnParticle(points[nodeIndex].x, points[nodeIndex].y, points[farthestIndex].x, points[farthestIndex].y);
    }, 2000);

    const draw = () => {
      // luz ambiental
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#000010");
      gradient.addColorStop(1, "#001020");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        const radius = 2 + p.pulse * 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 210, 255, ${0.6 + p.pulse * 0.4})`;
        ctx.shadowBlur = 15 + p.pulse * 25;
        ctx.shadowColor = "#00d2ff";
        ctx.fill();

        for (let j = i + 1; j < points.length; j++) {
          const q = points[j];
          const dist = Math.hypot(p.x - q.x, p.y - q.y);
          if (dist < 150) {
            let alpha = 1 - dist / 150;
            ctx.strokeStyle = `rgba(0, 210, 255, ${alpha})`;

            if (p.wave > 0 || q.wave > 0) {
              ctx.strokeStyle = `rgba(0, 255, 150, ${0.6})`;
              if (p.wave > 0.9 && q.wave <= 0) q.wave = 0.8;
            }

            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }

        if (p.wave > 0) {
          p.wave -= 0.02;
          p.pulse = 1;
        } else {
          p.pulse = Math.max(0, p.pulse - 0.02);
        }
      }

      // partículas de datos
      for (let i = particles.length - 1; i >= 0; i--) {
        const part = particles[i];
        part.progress += 0.02;
        if (part.progress >= 1) {
          particles.splice(i, 1);
          continue;
        }
        const px = part.x + (part.tx - part.x) * part.progress;
        const py = part.y + (part.ty - part.y) * part.progress;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,255,150,0.9)";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#00ff96";
        ctx.fill();
      }

      // frase inspiradora
      ctx.font = "20px Arial";
      ctx.fillStyle = "rgba(255,255,255,0.07)";
      ctx.textAlign = "center";
      ctx.fillText(phrases[phraseIndex], width / 2, height / 2);

      requestAnimationFrame(draw);
    };
    draw();

    window.addEventListener("resize", () => {
      width = window.innerWidth;
      height = 350;
      canvas.width = width;
      canvas.height = height;
    });
  }, [phraseIndex]);

  return (
    <footer className="footer">
      <canvas ref={canvasRef} className="footer-canvas"></canvas>
      <div className="footer-content">
        <div className="footer-column">
          <h3>Brecomperu IT Solutions</h3>
          <p>Innovación y desarrollo de software a la medida de tu industria.</p>
        </div>
        <div className="footer-column">
          <h4>Enlaces</h4>
          <ul>
            <li><a href="#servicios">Servicios</a></li>
            <li><a href="#portafolio">Portafolio</a></li>
            <li><a href="#contacto">Contacto</a></li>
          </ul>
        </div>
        <div className="footer-column">
          <h4>Contacto</h4>
          <p>Email: contacto@brecomperu.com</p>
          <p>Tel: +51 994 857 723</p>
        </div>
      </div>
      <div className="footer-bottom">
        © {new Date().getFullYear()} Brecomperu IT Solutions - Todos los derechos reservados
      </div>
    </footer>
  );
}
