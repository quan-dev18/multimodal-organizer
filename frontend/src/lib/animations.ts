/**
 * Animation utilities – CSS keyframes, spring easing, smooth number
 * transitions, stagger calculators, and a smooth‑progress interpolator.
 *
 * Designed for React + TailwindCSS 4 desktop apps (Tauri).
 */

/* ================================================================== *
 *  1. CSS KEYFRAME ANIMATIONS                                        *
 * ================================================================== */

/** Map of keyframe name → CSS `@keyframes` block (string). */
export const keyframes = {
  fadeIn: `
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}`,

  fadeOut: `
@keyframes fadeOut {
  from { opacity: 1; }
  to   { opacity: 0; }
}`,

  slideUp: `
@keyframes slideUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}`,

  slideDown: `
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}`,

  slideInLeft: `
@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-12px); }
  to   { opacity: 1; transform: translateX(0); }
}`,

  slideInRight: `
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(12px); }
  to   { opacity: 1; transform: translateX(0); }
}`,

  scaleIn: `
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}`,

  scaleOut: `
@keyframes scaleOut {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(0.95); }
}`,

  pulse: `
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.6; }
}`,

  shimmer: `
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}`,

  spin: `
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}`,

  shake: `
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%      { transform: translateX(-3px); }
  40%      { transform: translateX(3px); }
  60%      { transform: translateX(-2px); }
  80%      { transform: translateX(2px); }
}`,
} as const;

/**
 * Inject all (or selected) keyframes into the document once.
 * Safe to call multiple times – skips if already injected.
 */
let _injected = false;
export function injectKeyframes(only?: (keyof typeof keyframes)[]): void {
  if (typeof document === 'undefined') return;
  if (_injected) return;
  _injected = true;

  const css = (only ?? (Object.keys(keyframes) as (keyof typeof keyframes)[]))
    .map((k) => keyframes[k])
    .join('\n');

  const style = document.createElement('style');
  style.setAttribute('data-animations', 'ui-utils');
  style.textContent = css;
  document.head.appendChild(style);
}

/** Shorthand to build a CSS `animation` value. */
export function anim(
  name: keyof typeof keyframes,
  durationMs = 200,
  easing = 'ease-out',
  fillMode: 'forwards' | 'backwards' | 'both' | 'none' = 'both',
): string {
  return `${name} ${durationMs}ms ${easing} ${fillMode}`;
}

/* ================================================================== *
 *  2. SPRING / EASING FUNCTIONS                                      *
 * ================================================================== */

export interface SpringConfig {
  /** Stiffness (default 170) */
  stiffness: number;
  /** Damping (default 26) */
  damping: number;
  /** Mass (default 1) */
  mass: number;
  /** Precision – stop threshold (default 0.01) */
  precision: number;
}

const DEFAULT_SPRING: SpringConfig = {
  stiffness: 170,
  damping: 26,
  mass: 1,
  precision: 0.01,
};

export const springPresets: Record<string, SpringConfig> = {
  default: { ...DEFAULT_SPRING },
  gentle: { stiffness: 120, damping: 14, mass: 1, precision: 0.01 },
  wobbly: { stiffness: 180, damping: 12, mass: 1, precision: 0.01 },
  stiff: { stiffness: 210, damping: 20, mass: 1, precision: 0.01 },
  slow: { stiffness: 100, damping: 30, mass: 1.5, precision: 0.01 },
};

/**
 * Generate a CSS `cubic-bezier()` approximation for a spring.
 * Good enough for transition‑based UI work.
 */
export function springEasing(config: Partial<SpringConfig> = {}): string {
  const { stiffness, damping, mass } = { ...DEFAULT_SPRING, ...config };
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  // Attempt a cubic-bezier approximation for underdamped springs
  if (zeta < 1) {
    const p1x = 0.35;
    const p1y = 1 + (1 - zeta) * 0.35;
    const p2x = 0.6 + zeta * 0.1;
    const p2y = 1.0;
    return `cubic-bezier(${p1x.toFixed(3)}, ${p1y.toFixed(3)}, ${p2x.toFixed(3)}, ${p2y.toFixed(3)})`;
  }
  // Over/critically damped – ease-out is close enough
  const p1y = Math.min(1.2, 1 / (w0 * 0.008));
  return `cubic-bezier(0.25, ${p1y.toFixed(3)}, 0.3, 1)`;
}

/**
 * Solve a spring at time `t` (seconds) → returns position ∈ [0, 1].
 * Useful for JS‑driven animations.
 */
export function springSolve(
  t: number,
  config: Partial<SpringConfig> = {},
): number {
  const { stiffness, damping, mass } = { ...DEFAULT_SPRING, ...config };
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));

  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return (
      1 -
      Math.exp(-zeta * w0 * t) *
        (Math.cos(wd * t) + (zeta * w0) / wd * Math.sin(wd * t))
    );
  }
  // Critically / over‑damped
  const r = -w0 * zeta;
  return 1 - (1 + r * t) * Math.exp(r * t);
}

/* ================================================================== *
 *  3. SMOOTH NUMBER TRANSITION                                       *
 * ================================================================== */

export interface SmoothNumberOptions {
  /** Duration in ms (default 400) */
  duration?: number;
  /** Easing fn mapping [0,1] → [0,1] (default: ease‑out quad) */
  easing?: (t: number) => number;
}

const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);

/**
 * Animate from `from` to `to`, calling `onUpdate` every frame.
 * Returns a cancel function.
 *
 * Uses `requestAnimationFrame` for silky 60 fps updates.
 *
 * ```ts
 * const cancel = smoothNumber(0, 100, (v) => setCount(Math.round(v)));
 * ```
 */
export function smoothNumber(
  from: number,
  to: number,
  onUpdate: (value: number) => void,
  options: SmoothNumberOptions = {},
): () => void {
  const { duration = 400, easing = easeOutQuad } = options;
  let rafId = 0;
  let start: number | null = null;
  let cancelled = false;

  const step = (timestamp: number) => {
    if (cancelled) return;
    if (start === null) start = timestamp;
    const elapsed = timestamp - start;
    const progress = Math.min(elapsed / duration, 1);
    const value = from + (to - from) * easing(progress);
    onUpdate(value);
    if (progress < 1) {
      rafId = requestAnimationFrame(step);
    } else {
      onUpdate(to); // ensure final value is exact
    }
  };

  rafId = requestAnimationFrame(step);

  return () => {
    cancelled = true;
    cancelAnimationFrame(rafId);
  };
}

/* ================================================================== *
 *  4. SMOOTH PROGRESS INTERPOLATOR                                   *
 * ================================================================== */

/**
 * Creates a smooth‑progress tracker that interpolates between jumpy
 * progress values (e.g. download %) and outputs a smooth stream via
 * `requestAnimationFrame`.
 *
 * ```ts
 * const sp = createSmoothProgress((v) => setProgress(v));
 * // on each real update:
 * sp.set(42);   // smoothly glides to 42
 * sp.set(78);   // smoothly glides to 78
 * sp.destroy(); // clean up
 * ```
 */
export interface SmoothProgressController {
  /** Set the new target value (0–100 or custom range). */
  set(target: number): void;
  /** Get the current interpolated value. */
  current(): number;
  /** Stop the animation loop. */
  destroy(): void;
}

export function createSmoothProgress(
  onUpdate: (value: number) => void,
  /** How quickly the value catches up (0–1, default 0.08) */
  lerpFactor = 0.08,
): SmoothProgressController {
  let target = 0;
  let value = 0;
  let rafId = 0;
  let running = true;

  const tick = () => {
    if (!running) return;
    const diff = target - value;
    if (Math.abs(diff) < 0.05) {
      value = target;
    } else {
      value += diff * lerpFactor;
    }
    onUpdate(value);
    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);

  return {
    set(t: number) {
      target = t;
    },
    current() {
      return value;
    },
    destroy() {
      running = false;
      cancelAnimationFrame(rafId);
    },
  };
}

/* ================================================================== *
 *  5. STAGGER DELAY CALCULATOR                                       *
 * ================================================================== */

export interface StaggerOptions {
  /** Base delay in ms (default 40) */
  baseDelay?: number;
  /** Max total stagger in ms – caps the accumulated delay (default 600) */
  maxDelay?: number;
  /** Easing for the stagger curve: 'linear' | 'ease-in' | 'ease-out' (default 'ease-out') */
  easing?: 'linear' | 'ease-in' | 'ease-out';
}

/**
 * Return the delay (ms) for item at `index` in a list of `total` items.
 *
 * ```tsx
 * {items.map((item, i) => (
 *   <div
 *     key={item.id}
 *     style={{
 *       animation: anim('slideUp', 250),
 *       animationDelay: `${staggerDelay(i, items.length)}ms`,
 *     }}
 *   />
 * ))}
 * ```
 */
export function staggerDelay(
  index: number,
  total: number,
  options: StaggerOptions = {},
): number {
  const { baseDelay = 40, maxDelay = 600, easing = 'ease-out' } = options;

  if (total <= 1) return 0;

  const t = index / (total - 1); // normalised position [0, 1]

  let curved: number;
  switch (easing) {
    case 'linear':
      curved = t;
      break;
    case 'ease-in':
      curved = t * t;
      break;
    case 'ease-out':
    default:
      curved = 1 - (1 - t) * (1 - t);
      break;
  }

  return Math.min(curved * baseDelay * (total - 1), maxDelay);
}

/**
 * Convenience: return an array of stagger delays for a list.
 */
export function staggerDelays(
  total: number,
  options: StaggerOptions = {},
): number[] {
  return Array.from({ length: total }, (_, i) =>
    staggerDelay(i, total, options),
  );
}
