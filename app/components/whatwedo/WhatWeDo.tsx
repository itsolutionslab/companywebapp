"use client";
import React, { useEffect, useRef, useMemo } from "react";
import "./WhatWeDo.css";

interface Node {
  x: number;
  y: number;
}

const WhatWeDo: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nodesRef = useRef<Node[]>([]);
  const connectionsRef = useRef<[number, number][]>([]);

  // Pre-calcular nodos estáticos
  const initStaticNodes = useMemo(() => {
    return (canvas: HTMLCanvasElement) => {
      const totalNodes = window.innerWidth < 600 ? 25 : 50;
      const nodes: Node[] = [];
      
      for (let i = 0; i < totalNodes; i++) {
        nodes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
        });
      }
      
      return nodes;
    };
  }, []);

  // Pre-calcular conexiones una sola vez
  const initConnections = useMemo(() => {
    return (nodes: Node[]): [number, number][] => {
      const connections: [number, number][] = [];
      const maxDistance = 120;
      const maxDistanceSquared = maxDistance * maxDistance; // Evitar Math.sqrt
      
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
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
    return (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const nodes = nodesRef.current;
      const connections = connectionsRef.current;

      // Dibujar conexiones
      ctx.strokeStyle = "rgba(0,255,204,0.1)";
      ctx.lineWidth = 0.8;
      
      connections.forEach(([i, j]) => {
        ctx.beginPath();
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[j].x, nodes[j].y);
        ctx.stroke();
      });

      // Dibujar nodos
      nodes.forEach((node) => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = "#00ffcc";
        ctx.fill();
      });
    };
  }, []);

  // Versión con hover sutil (opcional)
  const drawWithHover = useMemo(() => {
    return (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, mouseX: number, mouseY: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const nodes = nodesRef.current;
      const connections = connectionsRef.current;

      // Dibujar conexiones con efecto hover
      connections.forEach(([i, j]) => {
        const nodeA = nodes[i];
        const nodeB = nodes[j];
        
        // Calcular distancia al mouse sin Math.sqrt (optimizado)
        const dxA = nodeA.x - mouseX;
        const dyA = nodeA.y - mouseY;
        const dxB = nodeB.x - mouseX;
        const dyB = nodeB.y - mouseY;
        const distSqA = dxA * dxA + dyA * dyA;
        const distSqB = dxB * dxB + dyB * dyB;
        const minDistSq = Math.min(distSqA, distSqB);
        
        if (minDistSq < 25000) { // 150px al cuadrado
          const opacity = 0.2 - (minDistSq / 25000) * 0.1;
          ctx.strokeStyle = `rgba(0,255,204,${opacity})`;
        } else {
          ctx.strokeStyle = "rgba(0,255,204,0.08)";
        }
        
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(nodeA.x, nodeA.y);
        ctx.lineTo(nodeB.x, nodeB.y);
        ctx.stroke();
      });

      // Dibujar nodos con efecto hover
      nodes.forEach((node) => {
        const dx = node.x - mouseX;
        const dy = node.y - mouseY;
        const distSq = dx * dx + dy * dy;
        
        if (distSq < 10000) { // 100px al cuadrado
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(node.x, node.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        
        ctx.fillStyle = "#00ffcc";
        ctx.beginPath();
        ctx.arc(node.x, node.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let mouseX = 0;
    let mouseY = 0;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight * 0.6;
      
      // Reinicializar solo en resize
      nodesRef.current = initStaticNodes(canvas);
      connectionsRef.current = initConnections(nodesRef.current);
      
      // Dibujar escena estática
      drawStaticScene(ctx, canvas);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
      
      // Cancelar frame anterior y redibujar con hover
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      animationFrameId = requestAnimationFrame(() => {
        drawWithHover(ctx, canvas, mouseX, mouseY);
      });
    };

    const handleMouseLeave = () => {
      // Volver a escena estática cuando el mouse sale
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      drawStaticScene(ctx, canvas);
    };

    // Inicialización
    resizeCanvas();
    
    // Event listeners
    window.addEventListener("resize", resizeCanvas);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [initStaticNodes, initConnections, drawStaticScene, drawWithHover]);

  return (
    <section className="whatwedo-container">
      <canvas ref={canvasRef} className="whatwedo-canvas"></canvas>
      <div className="whatwedo-content">
        <h2>Qué hacemos</h2>
        <p>
          En <strong>Brecomperu IT Solutions</strong>, desarrollamos aplicaciones web, aplicaciones moviles,
          sistemas desktop, <span>sistemas de servidores</span>, servicios de integración, <span>saas</span> y 
          sistemas basados en la nube usando <strong>Inteligencia Artificial</strong>.
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