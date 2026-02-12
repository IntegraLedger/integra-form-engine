/**
 * GlobeCanvas — thin React shell around the canvas globe renderer.
 *
 * Responsibilities:
 *  - ResizeObserver for canvas sizing
 *  - MutationObserver on <html> for dark/light mode (.dark class)
 *  - requestAnimationFrame loop → renderGlobe()
 *  - prefers-reduced-motion → static at angle=0, no pulse
 */

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { renderGlobe } from './globe-renderer';

interface GlobeCanvasProps {
  className?: string;
}

export function GlobeCanvas({ className }: GlobeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    width: 0,
    height: 0,
    dpr: 1,
    isDark: false,
    reducedMotion: false,
    rafId: 0,
    startTime: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const s = stateRef.current;
    s.startTime = performance.now();

    // Detect initial dark mode
    s.isDark = document.documentElement.classList.contains('dark');

    // Detect reduced motion
    const motionMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
    s.reducedMotion = motionMQ.matches;
    const onMotionChange = (e: MediaQueryListEvent) => {
      s.reducedMotion = e.matches;
    };
    motionMQ.addEventListener('change', onMotionChange);

    // MutationObserver for dark/light toggle
    const mutObs = new MutationObserver(() => {
      s.isDark = document.documentElement.classList.contains('dark');
    });
    mutObs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Resize handler
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      s.dpr = Math.min(window.devicePixelRatio || 1, 2);
      s.width = rect.width;
      s.height = rect.height;
      canvas.width = s.width * s.dpr;
      canvas.height = s.height * s.dpr;
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    function frame(now: number) {
      const elapsed = now - s.startTime;
      const angle = s.reducedMotion ? 0 : elapsed * 0.0003;
      const time = s.reducedMotion ? 0 : now;

      renderGlobe({
        ctx: ctx!,
        width: s.width,
        height: s.height,
        dpr: s.dpr,
        angle,
        time,
        isDark: s.isDark,
      });

      s.rafId = requestAnimationFrame(frame);
    }

    s.rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(s.rafId);
      ro.disconnect();
      mutObs.disconnect();
      motionMQ.removeEventListener('change', onMotionChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={cn('block', className)}
      style={{ width: '100%', height: '100%' }}
      aria-hidden="true"
    />
  );
}
