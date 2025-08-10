"use client";
import React, { useEffect, useRef } from "react";

type Props = {
  delayMs?: number;         // Tiempo antes de iniciar el primer scroll (ms)
  intervalMs?: number;      // Cada cuánto se mueve (ms)
  stepPx?: number;          // Distancia que avanza cada vez (px)
};

export default function StepAutoScroll({
  delayMs = 5000,
  intervalMs = 5000,
  stepPx = 100,
}: Props) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const stoppedRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    const stopAutoScroll = () => {
      if (!stoppedRef.current) {
        stoppedRef.current = true;
        if (timerRef.current) clearTimeout(timerRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    };

    // Detener si el usuario interactúa
    window.addEventListener("wheel", stopAutoScroll, { passive: true });
    window.addEventListener("touchstart", stopAutoScroll, { passive: true });
    window.addEventListener("keydown", stopAutoScroll, { passive: true });
    window.addEventListener("scroll", stopAutoScroll, { passive: true });

    // Iniciar después del delay inicial
    timerRef.current = setTimeout(() => {
      if (stoppedRef.current) return;
      intervalRef.current = setInterval(() => {
        if (stoppedRef.current) return;
        const maxScroll =
          (document.documentElement.scrollHeight || document.body.scrollHeight) -
          window.innerHeight;
        const currentY = window.scrollY || window.pageYOffset;
        if (currentY < maxScroll) {
          window.scrollTo({
            top: Math.min(currentY + stepPx, maxScroll),
            behavior: "smooth",
          });
        } else {
          stopAutoScroll();
        }
      }, intervalMs);
    }, delayMs);

    return () => {
      stopAutoScroll();
      window.removeEventListener("wheel", stopAutoScroll);
      window.removeEventListener("touchstart", stopAutoScroll);
      window.removeEventListener("keydown", stopAutoScroll);
      window.removeEventListener("scroll", stopAutoScroll);
    };
  }, [delayMs, intervalMs, stepPx]);

  return null;
}
