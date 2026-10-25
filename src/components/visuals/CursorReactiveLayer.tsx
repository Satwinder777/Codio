'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { isRoomEditorPath } from '@/lib/rooms/route-paths';

export type CursorEffect = 'home' | 'dashboard' | 'settings' | 'login' | 'signup' | 'recovery' | 'privacy' | 'terms' | 'editor' | 'default';

type CursorPalette = { particles: string[]; haze: string };

const CURSOR_PALETTES: Record<CursorEffect, CursorPalette> = {
  home: { particles: ['#c4b5fd', '#67e8f9', '#ffffff'], haze: 'rgba(103, 232, 249, 0.12)' },
  dashboard: { particles: ['#67e8f9', '#6ee7b7', '#e0fbff'], haze: 'rgba(34, 211, 238, 0.12)' },
  settings: { particles: ['#fde68a', '#f9a8d4', '#fff7ed'], haze: 'rgba(251, 191, 36, 0.11)' },
  login: { particles: ['#93c5fd', '#c4b5fd', '#eff6ff'], haze: 'rgba(96, 165, 250, 0.11)' },
  signup: { particles: ['#f0abfc', '#a5b4fc', '#fdf4ff'], haze: 'rgba(217, 70, 239, 0.11)' },
  recovery: { particles: ['#a5b4fc', '#7dd3fc', '#eef2ff'], haze: 'rgba(129, 140, 248, 0.1)' },
  privacy: { particles: ['#5eead4', '#a7f3d0', '#ecfdf5'], haze: 'rgba(45, 212, 191, 0.1)' },
  terms: { particles: ['#cbd5e1', '#a5b4fc', '#f8fafc'], haze: 'rgba(148, 163, 184, 0.1)' },
  editor: { particles: ['#67e8f9', '#a5f3fc', '#ffffff'], haze: 'rgba(34, 211, 238, 0.08)' },
  default: { particles: ['#a5b4fc', '#7dd3fc', '#ffffff'], haze: 'rgba(99, 102, 241, 0.1)' },
};

type CursorSpark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  decay: number;
  color: string;
};

const PARTICLE_FIELD_SIZE = 480;

export function getCursorEffect(pathname: string | null): CursorEffect {
  if (!pathname || pathname === '/') return 'home';
  if (pathname === '/dashboard') return 'dashboard';
  if (pathname === '/settings') return 'settings';
  if (pathname === '/login') return 'login';
  if (pathname === '/signup') return 'signup';
  if (pathname === '/forgot-password') return 'recovery';
  if (pathname === '/privacy') return 'privacy';
  if (pathname === '/terms') return 'terms';
  if (isRoomEditorPath(pathname)) return 'editor';
  return 'default';
}

export function CursorReactiveLayer() {
  const pathname = usePathname();
  const layerRef = useRef<HTMLDivElement>(null);
  const effect = getCursorEffect(pathname);

  useEffect(() => {
    const layer = layerRef.current;
    const canAnimate = window.matchMedia(
      '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
    );
    if (!layer || !canAnimate.matches) return;

    let targetX = -200;
    let targetY = -200;
    let glowX = targetX;
    let glowY = targetY;
    let haloX = targetX;
    let haloY = targetY;
    let frame = 0;
    let idleTimer = 0;
    let pressTimer = 0;
    let lastPointerX = targetX;
    let lastPointerY = targetY;
    let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);
    let canvasOriginX = targetX - PARTICLE_FIELD_SIZE / 2;
    let canvasOriginY = targetY - PARTICLE_FIELD_SIZE / 2;
    const particles: CursorSpark[] = [];
    const glow = layer.querySelector<HTMLElement>('.cursor-reactive__glow');
    const halo = layer.querySelector<HTMLElement>('.cursor-reactive__halo');
    const core = layer.querySelector<HTMLElement>('.cursor-reactive__core');
    const canvas = layer.querySelector<HTMLCanvasElement>('.cursor-reactive__particles');
    const context = canvas?.getContext('2d');
    const palette = CURSOR_PALETTES[effect];

    const resizeCanvas = () => {
      if (!canvas || !context) return;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25);
      canvas.width = Math.round(PARTICLE_FIELD_SIZE * pixelRatio);
      canvas.height = Math.round(PARTICLE_FIELD_SIZE * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const addSparks = (x: number, y: number, count: number) => {
      for (let index = 0; index < count; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.12 + Math.random() * 0.72;
        particles.push({
          x: x + (Math.random() - 0.5) * 8,
          y: y + (Math.random() - 0.5) * 8,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.16,
          radius: 0.7 + Math.random() * (effect === 'home' ? 1.9 : 1.4),
          life: 1,
          decay: 0.018 + Math.random() * 0.012,
          color: palette.particles[Math.floor(Math.random() * palette.particles.length)],
        });
      }

      if (particles.length > 28) particles.splice(0, particles.length - 28);
    };

    const animate = () => {
      glowX += (targetX - glowX) * 0.24;
      glowY += (targetY - glowY) * 0.24;
      haloX += (targetX - haloX) * 0.12;
      haloY += (targetY - haloY) * 0.12;

      glow?.style.setProperty('transform', `translate3d(${glowX}px, ${glowY}px, 0) translate(-50%, -50%)`);
      halo?.style.setProperty('transform', `translate3d(${haloX}px, ${haloY}px, 0) translate(-50%, -50%)`);
      core?.style.setProperty('transform', `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%)`);

      if (context && canvas) {
        canvasOriginX = targetX - PARTICLE_FIELD_SIZE / 2;
        canvasOriginY = targetY - PARTICLE_FIELD_SIZE / 2;
        canvas.style.setProperty('transform', `translate3d(${canvasOriginX}px, ${canvasOriginY}px, 0)`);
        context.clearRect(0, 0, PARTICLE_FIELD_SIZE, PARTICLE_FIELD_SIZE);
        context.globalCompositeOperation = 'lighter';

        if (particles.length > 0) {
          const radius = effect === 'home' ? 170 : effect === 'editor' ? 105 : 130;
          const localGlowX = glowX - canvasOriginX;
          const localGlowY = glowY - canvasOriginY;
          const haze = context.createRadialGradient(localGlowX, localGlowY, 0, localGlowX, localGlowY, radius);
          haze.addColorStop(0, palette.haze);
          haze.addColorStop(1, 'rgba(0, 0, 0, 0)');
          context.fillStyle = haze;
          context.fillRect(localGlowX - radius, localGlowY - radius, radius * 2, radius * 2);
        }

        context.lineWidth = 0.7;
        for (let index = particles.length - 1; index >= 0; index -= 1) {
          const spark = particles[index];
          spark.x += spark.vx;
          spark.y += spark.vy;
          spark.vx *= 0.986;
          spark.vy = spark.vy * 0.986 + 0.006;
          spark.life -= spark.decay;

          if (
            spark.life <= 0
            || spark.x < canvasOriginX - 12
            || spark.y < canvasOriginY - 12
            || spark.x > canvasOriginX + PARTICLE_FIELD_SIZE + 12
            || spark.y > canvasOriginY + PARTICLE_FIELD_SIZE + 12
          ) {
            particles.splice(index, 1);
            continue;
          }

          context.globalAlpha = spark.life * 0.78;
          context.fillStyle = spark.color;
          context.beginPath();
          context.arc(
            spark.x - canvasOriginX,
            spark.y - canvasOriginY,
            spark.radius * (0.6 + spark.life * 0.5),
            0,
            Math.PI * 2,
          );
          context.fill();
        }

        context.globalAlpha = 1;
        for (let index = 0; index < particles.length - 1; index += 1) {
          const first = particles[index];
          const second = particles[index + 1];
          const distance = Math.hypot(first.x - second.x, first.y - second.y);
          if (distance > 30) continue;
          context.globalAlpha = Math.min(first.life, second.life) * (1 - distance / 30) * 0.16;
          context.strokeStyle = first.color;
          context.beginPath();
          context.moveTo(first.x - canvasOriginX, first.y - canvasOriginY);
          context.lineTo(second.x - canvasOriginX, second.y - canvasOriginY);
          context.stroke();
        }
        context.globalAlpha = 1;
        context.globalCompositeOperation = 'source-over';
      }

      if (Math.abs(targetX - glowX) + Math.abs(targetY - glowY) > 0.5 || particles.length > 0) {
        frame = window.requestAnimationFrame(animate);
      } else {
        frame = 0;
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const nextX = event.clientX;
      const nextY = event.clientY;
      const movement = Math.hypot(nextX - targetX, nextY - targetY);
      if (movement < 1.5) return;

      targetX = nextX;
      targetY = nextY;
      layer.dataset.active = 'true';
      const distance = Math.hypot(targetX - lastPointerX, targetY - lastPointerY);
      if (distance > 4) {
        const segments = Math.min(5, Math.max(1, Math.ceil(distance / 30)));
        for (let index = 1; index <= segments; index += 1) {
          const progress = index / segments;
          const x = lastPointerX + (targetX - lastPointerX) * progress;
          const y = lastPointerY + (targetY - lastPointerY) * progress;
          addSparks(x, y, 1);
        }
      }
      lastPointerX = targetX;
      lastPointerY = targetY;
      if (!frame) frame = window.requestAnimationFrame(animate);
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        layer.dataset.active = 'false';
      }, 650);
    };

    const onPointerDown = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      lastPointerX = targetX;
      lastPointerY = targetY;
      layer.dataset.active = 'true';
      layer.dataset.pressed = 'true';
      addSparks(targetX, targetY, effect === 'home' ? 8 : 4);
      if (!frame) frame = window.requestAnimationFrame(animate);
      window.clearTimeout(pressTimer);
      pressTimer = window.setTimeout(() => {
        layer.dataset.pressed = 'false';
      }, 240);
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        layer.dataset.active = 'false';
      }, 800);
    };

    const onPointerLeave = () => {
      layer.dataset.active = 'false';
      layer.dataset.pressed = 'false';
      window.clearTimeout(idleTimer);
      window.clearTimeout(pressTimer);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('resize', resizeCanvas);
      window.cancelAnimationFrame(frame);
      window.clearTimeout(idleTimer);
      window.clearTimeout(pressTimer);
    };
  }, [effect]);

  return (
    <div ref={layerRef} aria-hidden="true" className="cursor-reactive-layer" data-effect={effect}>
      <canvas className="cursor-reactive__particles" />
      <span className="cursor-reactive__glow" />
      <span className="cursor-reactive__halo" />
      <span className="cursor-reactive__core" />
    </div>
  );
}
