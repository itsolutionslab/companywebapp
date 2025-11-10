"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import "./CallToAction.css";

export default function CallToAction() {
  const [greeting, setGreeting] = useState("¿Listo para transformar tu industria?");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const calendlyURL = "https://calendly.com/brecomperuitsolutions/business";

  // Mensajes dinámicos OPTIMIZADOS
  useEffect(() => {
    const frases = [
      "¿Listo para transformar tu industria?",
      "Impulsa tu negocio con inteligencia artificial",
      "Automatiza y crece sin límites", 
      "Soluciones únicas para desafíos únicos",
    ];
    
    let i = 0;
    // Usar setTimeout en lugar de setInterval para mejor control
    const timer = setTimeout(function cycle() {
      i = (i + 1) % frases.length;
      setGreeting(frases[i]);
      setTimeout(cycle, 3000);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  // NODOS ESTÁTICOS - CERO ANIMACIÓN
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
      const maxDistSq = 150 * 150; // Distancia al cuadrado
      
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
  const drawStaticNetwork = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    // Fondo sólido (más eficiente que clearRect)
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    const nodes = initStaticNodes(width, height);
    const connections = initConnections(nodes);

    // Dibujar conexiones
    ctx.strokeStyle = "rgba(0, 210, 255, 0.08)";
    ctx.lineWidth = 0.6;
    
    connections.forEach(([i, j]) => {
      ctx.beginPath();
      ctx.moveTo(nodes[i].x, nodes[i].y);
      ctx.lineTo(nodes[j].x, nodes[j].y);
      ctx.stroke();
    });

    // Dibujar nodos
    ctx.fillStyle = "rgba(0, 210, 255, 0.3)";
    nodes.forEach(node => {
      ctx.beginPath();
      ctx.arc(node.x, node.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [initStaticNodes, initConnections]);

  // EFECTO HOVER LIGERO (solo cuando hay interacción)
  const [isHovering, setIsHovering] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const drawHoverEffect = useCallback((canvas: HTMLCanvasElement, mouseX: number, mouseY: number) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    // Limpiar y redibujar base
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    const nodes = initStaticNodes(width, height);
    const connections = initConnections(nodes);

    // Conexiones con efecto hover
    connections.forEach(([i, j]) => {
      const nodeA = nodes[i];
      const nodeB = nodes[j];
      
      // Calcular distancia al mouse SIN Math.hypot
      const dxA = nodeA.x - mouseX;
      const dyA = nodeA.y - mouseY;
      const dxB = nodeB.x - mouseX;
      const dyB = nodeB.y - mouseY;
      const distSqA = dxA * dxA + dyA * dyA;
      const distSqB = dxB * dxB + dyB * dyB;
      const minDistSq = Math.min(distSqA, distSqB);
      
      if (minDistSq < 22500) { // 150px al cuadrado
        const opacity = 0.15 - (minDistSq / 22500) * 0.1;
        ctx.strokeStyle = `rgba(0, 255, 100, ${opacity})`;
      } else {
        ctx.strokeStyle = "rgba(0, 210, 255, 0.05)";
      }
      
      ctx.lineWidth = 0.8;
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
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(node.x, node.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.fillStyle = "rgba(0, 210, 255, 0.4)";
      ctx.beginPath();
      ctx.arc(node.x, node.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [initStaticNodes, initConnections]);

  // CANVAS EFFECT - MEGA OPTIMIZADO
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationId: number;
    let needsRedraw = false;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drawStaticNetwork(canvas);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isHovering) setIsHovering(true);
      
      setMousePos({ 
        x: e.clientX, 
        y: e.clientY 
      });
      
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
          drawHoverEffect(canvas, mousePos.x, mousePos.y);
        } else {
          drawStaticNetwork(canvas);
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
  }, [drawStaticNetwork, drawHoverEffect, isHovering, mousePos]);

  // CALENDLY OPTIMIZADO - carga diferida
  useEffect(() => {
    const loadCalendly = () => {
      if (!document.querySelector("#calendly-css")) {
        const link = document.createElement("link");
        link.id = "calendly-css";
        link.href = "https://assets.calendly.com/assets/external/widget.css";
        link.rel = "stylesheet";
        document.head.appendChild(link);
      }
    };

    // Cargar solo cuando el usuario interactúe o después de delay
    const timer = setTimeout(loadCalendly, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  const openCalendly = useCallback(() => {
    if (typeof window !== "undefined" && (window as any).Calendly) {
      (window as any).Calendly.initPopupWidget({ url: calendlyURL });
    } else {
      // Cargar Calendly on-demand
      const script = document.createElement("script");
      script.src = "https://assets.calendly.com/assets/external/widget.js";
      script.async = true;
      script.onload = () => {
        (window as any).Calendly.initPopupWidget({ url: calendlyURL });
      };
      document.body.appendChild(script);
    }
  }, [calendlyURL]);

  return (
    <section className="cta-section">
      <canvas 
        ref={canvasRef} 
        className="cta-canvas"
        style={{ display: 'block' }} // Optimizar renderizado
      />
      <div className="cta-content">
        <h2 className="cta-title">{greeting}</h2>
        <p className="cta-text">
          En Brecomperu convertimos ideas en realidades inteligentes.
          Da el siguiente paso hacia el futuro.
        </p>
        <div className="cta-buttons">
          <button
            onClick={openCalendly}
            className="cta-button-primary"
          >
            📅 Agendar reunión de 15 min
          </button>
        </div>
      </div>
    </section>
  );
}