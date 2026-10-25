'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { isRoomEditorPath } from '@/lib/rooms/route-paths';

export type CursorEffect = 'home' | 'dashboard' | 'settings' | 'login' | 'signup' | 'recovery' | 'privacy' | 'terms' | 'editor' | 'default';

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
    const glow = layer.querySelector<HTMLElement>('.cursor-reactive__glow');
    const halo = layer.querySelector<HTMLElement>('.cursor-reactive__halo');
    const core = layer.querySelector<HTMLElement>('.cursor-reactive__core');

    const animate = () => {
      glowX += (targetX - glowX) * 0.24;
      glowY += (targetY - glowY) * 0.24;
      haloX += (targetX - haloX) * 0.12;
      haloY += (targetY - haloY) * 0.12;

      glow?.style.setProperty('transform', `translate3d(${glowX}px, ${glowY}px, 0) translate(-50%, -50%)`);
      halo?.style.setProperty('transform', `translate3d(${haloX}px, ${haloY}px, 0) translate(-50%, -50%)`);
      core?.style.setProperty('transform', `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%)`);

      if (Math.abs(targetX - glowX) + Math.abs(targetY - glowY) > 0.5) {
        frame = window.requestAnimationFrame(animate);
      } else {
        frame = 0;
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      targetX = event.clientX;
      targetY = event.clientY;
      layer.dataset.active = 'true';
      if (!frame) frame = window.requestAnimationFrame(animate);
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        layer.dataset.active = 'false';
      }, 650);
    };

    const onPointerDown = () => {
      layer.dataset.pressed = 'true';
      window.clearTimeout(pressTimer);
      pressTimer = window.setTimeout(() => {
        layer.dataset.pressed = 'false';
      }, 240);
    };

    const onPointerLeave = () => {
      layer.dataset.active = 'false';
      layer.dataset.pressed = 'false';
      window.clearTimeout(idleTimer);
      window.clearTimeout(pressTimer);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      window.cancelAnimationFrame(frame);
      window.clearTimeout(idleTimer);
      window.clearTimeout(pressTimer);
    };
  }, [effect]);

  return (
    <div ref={layerRef} aria-hidden="true" className="cursor-reactive-layer" data-effect={effect}>
      <span className="cursor-reactive__glow" />
      <span className="cursor-reactive__halo" />
      <span className="cursor-reactive__core" />
    </div>
  );
}
