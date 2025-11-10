"use client";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import "./Footer.css";

export default function Footer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phraseIndex, setPhraseIndex] = useState(0);

  const phrases = useMemo(() => [
    "Conectamos ideas con tecnología",
    "Innovación que impulsa industrias", 
    "Tu proyecto, nuestra misión",
    "Inteligencia que crea futuro"
  ], []);

  // Frases con intervalo optimizado
  useEffect(() => {
    const timer = setTimeout(function cycle() {
      setPhraseIndex(prev => (prev + 1) % phrases.length);
      setTimeout(cycle, 5000);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [phrases.length]);

  // NODOS ESTÁTICOS - SIN ANIMACIÓN
  const initStaticNodes = useMemo(() => {
    return (width: number, height: number) => {
      const nodes = [];
      const numNodes = 25; // Reducido de 40
      
      for (let i = 0; i < numNodes; i++) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
        });
      }
      return nodes;
    };
  }, []);

  // CONEXIONES PRE-CALCULADAS
  const initConnections = useMemo(() => {
    return (nodes: {x: number, y: number}[]) => {
      const connections = [];
      const maxDistSq = 150 * 150;
      
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const distSq = dx * dx + dy * dy;
          
          if (distSq < maxDistSq) {
            connections.push([i, j]);
          }
        }
      }
      return connections;
    };
  }, []);

  // DIBUJADO ESTÁTICO UNA SOLA VEZ
  const drawStaticScene = useCallback((canvas: HTMLCanvasElement, currentPhrase: string) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Fondo sólido (más eficiente que gradient)
    ctx.fillStyle = "#000a14";
    ctx.fillRect(0, 0, width, height);

    const nodes = initStaticNodes(width, height);
    const connections = initConnections(nodes);

    // Dibujar conexiones
    ctx.strokeStyle = "rgba(0, 210, 255, 0.06)";
    ctx.lineWidth = 0.5;
    
    connections.forEach(([i, j]) => {
      ctx.beginPath();
      ctx.moveTo(nodes[i].x, nodes[i].y);
      ctx.lineTo(nodes[j].x, nodes[j].y);
      ctx.stroke();
    });

    // Dibujar nodos
    ctx.fillStyle = "rgba(0, 210, 255, 0.25)";
    nodes.forEach(node => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Texto de frase (solo si hay espacio)
    if (height > 100) {
      ctx.font = "16px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.textAlign = "center";
      ctx.fillText(currentPhrase, width / 2, height / 2);
    }
  }, [initStaticNodes, initConnections]);

  // EFECTO HOVER MUY LIGERO
  const [isHovering, setIsHovering] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const drawHoverEffect = useCallback((canvas: HTMLCanvasElement, currentPhrase: string, mouseX: number, mouseY: number) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Fondo
    ctx.fillStyle = "#000a14";
    ctx.fillRect(0, 0, width, height);

    const nodes = initStaticNodes(width, height);
    const connections = initConnections(nodes);

    // Conexiones con efecto hover sutil
    connections.forEach(([i, j]) => {
      const nodeA = nodes[i];
      const nodeB = nodes[j];
      
      // Distancia al mouse sin Math.hypot
      const dxA = nodeA.x - mouseX;
      const dyA = nodeA.y - mouseY;
      const dxB = nodeB.x - mouseX;
      const dyB = nodeB.y - mouseY;
      const distSqA = dxA * dxA + dyA * dyA;
      const distSqB = dxB * dxB + dyB * dyB;
      const minDistSq = Math.min(distSqA, distSqB);
      
      if (minDistSq < 22500) { // 150px al cuadrado
        const opacity = 0.1 - (minDistSq / 22500) * 0.05;
        ctx.strokeStyle = `rgba(0, 255, 150, ${opacity})`;
      } else {
        ctx.strokeStyle = "rgba(0, 210, 255, 0.04)";
      }
      
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(nodeA.x, nodeA.y);
      ctx.lineTo(nodeB.x, nodeB.y);
      ctx.stroke();
    });

    // Nodos con efecto hover
    nodes.forEach(node => {
      const dx = node.x - mouseX;
      const dy = node.y - mouseY;
      const distSq = dx * dx + dy * dy;
      
      if (distSq < 10000) { // 100px al cuadrado
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.beginPath();
        ctx.arc(node.x, node.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.fillStyle = "rgba(0, 210, 255, 0.3)";
      ctx.beginPath();
      ctx.arc(node.x, node.y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Texto
    if (height > 100) {
      ctx.font = "16px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.textAlign = "center";
      ctx.fillText(currentPhrase, width / 2, height / 2);
    }
  }, [initStaticNodes, initConnections]);

  // EFFECT PRINCIPAL - MEGA OPTIMIZADO
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationId: number;
    let needsRedraw = false;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = 300; // Altura fija optimizada
      
      // Forzar redibujado
      needsRedraw = true;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      setMousePos({ 
        x: e.clientX - rect.left, 
        y: e.clientY - rect.top 
      });
      
      if (!isHovering) setIsHovering(true);
      needsRedraw = true;
    };

    const handleMouseLeave = () => {
      setIsHovering(false);
      needsRedraw = true;
    };

    // Animation frame controlado
    const animate = () => {
      if (needsRedraw) {
        if (isHovering) {
          drawHoverEffect(canvas, phrases[phraseIndex], mousePos.x, mousePos.y);
        } else {
          drawStaticScene(canvas, phrases[phraseIndex]);
        }
        needsRedraw = false;
      }
      animationId = requestAnimationFrame(animate);
    };

    // Inicialización
    handleResize();
    animationId = requestAnimationFrame(animate);

    // Event listeners
    window.addEventListener("resize", handleResize);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(animationId);
    };
  }, [drawStaticScene, drawHoverEffect, isHovering, mousePos, phraseIndex, phrases]);

  return (
    <footer className="footer">
      <canvas 
        ref={canvasRef} 
        className="footer-canvas"
        style={{ display: 'block' }}
      />
      <div className="footer-content">
        <div className="footer-column">
          <h3>Brecomperu IT Solutions</h3>
          <p>Innovación y desarrollo de software a la medida de tu industria.</p>
        </div>
        <div className="footer-column">
          <h4>Contacto</h4>
          <p>Email: contacto@brecomperu.com</p>
          <p>Tel: +51 972 243 083</p>
        </div>
      </div>
      <div className="footer-bottom">
        © {new Date().getFullYear()} Brecomperu IT Solutions - Todos los derechos reservados
      </div>
    </footer>
  );
}