import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Detecta mobile: en pantallas chicas el scatter scroll-driven (500+ ScrollTriggers)
// hace que se trabe. Lo desactivamos pero mantenemos el idle, el split de letras
// (para legibilidad) y todo el resto del sistema visual.
const isMobile = window.matchMedia('(max-width: 768px)').matches;

function initSmoothScroll() {
  if (prefersReduced) return;
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

function initReveals() {
  const reveals = document.querySelectorAll<HTMLElement>('[data-reveal]');
  reveals.forEach((el) => {
    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => el.classList.add('is-revealed'),
    });
  });

  const groups = document.querySelectorAll<HTMLElement>('[data-reveal-stagger]');
  groups.forEach((group) => {
    const children = Array.from(group.children) as HTMLElement[];
    const stagger = parseFloat(group.dataset.staggerDelay ?? '0.08');
    children.forEach((child, i) => {
      child.style.transitionDelay = `${i * stagger}s`;
    });
    ScrollTrigger.create({
      trigger: group,
      start: 'top 85%',
      once: true,
      onEnter: () => group.classList.add('is-revealed'),
    });
  });
}

function initParallax() {
  if (prefersReduced) return;
  const layers = document.querySelectorAll<HTMLElement>('[data-parallax]');
  layers.forEach((el) => {
    const speed = parseFloat(el.dataset.parallax ?? '0.3');
    gsap.to(el, {
      yPercent: -100 * speed,
      ease: 'none',
      scrollTrigger: {
        trigger: el.dataset.parallaxTrigger
          ? (document.querySelector(el.dataset.parallaxTrigger) as Element | null) ?? el
          : el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });
  });
}

function initDepthLayers() {
  if (prefersReduced) return;
  const layers = document.querySelectorAll<HTMLElement>('[data-depth]');
  const vh = window.innerHeight;

  layers.forEach((el) => {
    const depth = el.dataset.depth as 'back' | 'mid' | 'front';
    const triggerEl =
      (el.closest('section, [data-depth-trigger]') as HTMLElement | null) ?? el;

    // Rangos EXTREMOS — cada elemento toma random
    // back: prácticamente inmóviles (lejanos)
    // front: hasta 6× viewport en distancia (literalmente vuelan)
    const yRanges = {
      back: { min: 0.02, max: 0.18 },
      mid: { min: 0.25, max: 0.9 },
      front: { min: 2.5, max: 6.5 },
    };
    const xRanges = {
      back: { min: -15, max: 15 },
      mid: { min: -120, max: 120 },
      front: { min: -400, max: 400 },
    };

    const yRange = yRanges[depth] ?? { min: 0.3, max: 0.5 };
    const xRange = xRanges[depth] ?? { min: 0, max: 0 };

    const ySpeed = el.dataset.depthSpeed
      ? parseFloat(el.dataset.depthSpeed)
      : yRange.min + Math.random() * (yRange.max - yRange.min);
    const xDrift = el.dataset.depthDrift
      ? parseFloat(el.dataset.depthDrift)
      : xRange.min + Math.random() * (xRange.max - xRange.min);

    const blurPx = el.dataset.depthBlur ? parseFloat(el.dataset.depthBlur) : 0;
    const rot = parseFloat(el.dataset.depthRotate ?? '0');

    if (blurPx > 0) {
      el.style.filter = `blur(${blurPx}px)`;
    }

    el.style.setProperty('--depth-glow', '0');
    el.style.setProperty('--depth-fade', '0');

    // La distancia se calcula sobre la altura del trigger (sección o capa global)
    // multiplicada por el ySpeed. Eso mantiene el ratio "velocidad efectiva" = ySpeed
    // independiente de cuán alto sea el trigger. Para particles globales con trigger
    // = body, una particle con speed 6 se mueve 6× la altura del documento.
    const triggerHeight = triggerEl.offsetHeight || vh;
    const yDistance = Math.max(triggerHeight * ySpeed, vh * ySpeed);

    gsap.to(el, {
      y: -yDistance,
      x: xDrift,
      rotation: rot,
      ease: 'none',
      scrollTrigger: {
        trigger: triggerEl,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });

    // Pulso de luz: trigger SIEMPRE el elemento mismo (no el container global),
    // así cada particle se prende cuando ELLA está en el centro del viewport.
    const pulseTl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 0.6,
      },
    });
    pulseTl.fromTo(
      el,
      { '--depth-glow': 0, '--depth-fade': 0 },
      { '--depth-glow': 1.6, '--depth-fade': 1, ease: 'sine.inOut', duration: 0.5 },
    );
    pulseTl.to(el, {
      '--depth-glow': 0,
      '--depth-fade': 0,
      ease: 'sine.inOut',
      duration: 0.5,
    });
  });
}

// Scatter (containers): movimiento sutil sin blur, para que las letras hijas
// puedan escapar visualmente. Safe zone 30%, entrada/salida 35% cada una.
function initScatter() {
  if (prefersReduced) return;
  if (isMobile) return; // mobile: skip por performance
  const els = document.querySelectorAll<HTMLElement>('[data-scatter]');
  els.forEach((el) => {
    const intensity = parseFloat(el.dataset.scatter ?? '1');
    const dirIn = (Math.random() - 0.5) * 2;
    const dirOut = (Math.random() - 0.5) * 2;

    const xIn = dirIn * 80 * intensity;
    const yIn = (Math.random() * 60 + 30) * intensity;
    const rotIn = (Math.random() - 0.5) * 6 * intensity;
    const scaleIn = 0.85 + Math.random() * 0.05;

    const xOut = dirOut * 60 * intensity;
    const yOut = -(Math.random() * 50 + 25) * intensity;
    const rotOut = (Math.random() - 0.5) * 5 * intensity;
    const scaleOut = 0.9 + Math.random() * 0.05;

    gsap.set(el, { willChange: 'transform, opacity' });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1.6,
      },
    });

    tl.fromTo(
      el,
      { x: xIn, y: yIn, rotation: rotIn, scale: scaleIn, opacity: 0.3 },
      { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, ease: 'power3.out', duration: 0.35 },
    );
    tl.to(el, { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, duration: 0.3 });
    tl.to(el, {
      x: xOut,
      y: yOut,
      rotation: rotOut,
      scale: scaleOut,
      opacity: 0.6,
      ease: 'power3.in',
      duration: 0.35,
    });
  });
}

// Letter scatter: cada letra tiene "depth verdict" — algunas viajan al frente
// (scale up, sin blur), otras al fondo (scale down + blur). Independencia total
// entre letras, con safe zone para legibilidad.
function splitAndScatter(el: HTMLElement) {
  let letters: HTMLElement[];
  const alreadySplit = el.dataset.lettersAlreadySplit === 'true';
  if (alreadySplit) {
    letters = Array.from(el.children).filter(
      (c) => c.tagName === 'SPAN',
    ) as HTMLElement[];
  } else {
    const text = el.textContent ?? '';
    if (!text.trim()) return;
    el.textContent = '';
    el.setAttribute('aria-label', text);
    letters = [];
    [...text].forEach((char) => {
      const span = document.createElement('span');
      // Non-breaking space para que el espacio NO se colapse dentro de inline-block
      span.textContent = char === ' ' ? ' ' : char;
      span.style.display = 'inline-block';
      span.style.willChange = 'transform, filter, opacity';
      span.setAttribute('aria-hidden', 'true');
      el.appendChild(span);
      letters.push(span);
    });
    el.dataset.lettersAlreadySplit = 'true';
  }

  // Mobile: dejar splitted (para idle) pero saltar el scatter timeline.
  if (isMobile) return;

  const intensity = parseFloat(
    el.dataset.scatterLetters ?? el.dataset.heroScatter ?? '1',
  );

  letters.forEach((letter) => {
    const fwdIn = Math.random() > 0.5;
    const fwdOut = Math.random() > 0.5;

    const xIn = (Math.random() - 0.5) * 50 * intensity;
    const yIn = (Math.random() - 0.5) * 35 * intensity;
    const rotIn = (Math.random() - 0.5) * 25 * intensity;
    const scaleIn = fwdIn
      ? 1.15 + Math.random() * 0.4
      : 0.5 + Math.random() * 0.3;
    const blurIn = fwdIn
      ? Math.random() * 1.5 * intensity
      : (3 + Math.random() * 4) * intensity;

    const xOut = (Math.random() - 0.5) * 40 * intensity;
    const yOut = (Math.random() - 0.5) * 30 * intensity;
    const rotOut = (Math.random() - 0.5) * 22 * intensity;
    const scaleOut = fwdOut
      ? 1.1 + Math.random() * 0.35
      : 0.55 + Math.random() * 0.25;
    const blurOut = fwdOut
      ? Math.random() * 1.2 * intensity
      : (2.5 + Math.random() * 3) * intensity;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start: 'top 95%',
        end: 'bottom 5%',
        scrub: 1.6,
      },
    });

    tl.fromTo(
      letter,
      {
        x: xIn,
        y: yIn,
        rotation: rotIn,
        scale: scaleIn,
        opacity: 0.35,
        filter: `blur(${blurIn}px)`,
      },
      {
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        opacity: 1,
        filter: 'blur(0px)',
        ease: 'power3.out',
        duration: 0.35,
      },
    );
    tl.to(letter, {
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
      opacity: 1,
      filter: 'blur(0px)',
      duration: 0.3,
    });
    tl.to(letter, {
      x: xOut,
      y: yOut,
      rotation: rotOut,
      scale: scaleOut,
      opacity: 0.7,
      filter: `blur(${blurOut}px)`,
      ease: 'power3.in',
      duration: 0.35,
    });
  });
}

function initLetterScatter() {
  if (prefersReduced) return;
  const els = document.querySelectorAll<HTMLElement>('[data-scatter-letters]');
  els.forEach((el) => splitAndScatter(el));
}

// Scatter por palabra: cada palabra del texto es un span con su propio
// scatter random. Útil para párrafos largos donde scatear letra por letra
// sería excesivo y no se notaría — pero el scatter en bloque tampoco
// rompe la sensación de movimiento individual.
function initWordScatter() {
  if (prefersReduced) return;
  const els = document.querySelectorAll<HTMLElement>('[data-scatter-words]');
  els.forEach((el) => {
    const text = el.textContent ?? '';
    if (!text.trim()) return;
    el.textContent = '';
    el.setAttribute('aria-label', text);

    const intensity = parseFloat(el.dataset.scatterWords ?? '1');
    const tokens = text.split(/(\s+)/);
    const wordSpans: HTMLElement[] = [];
    tokens.forEach((token) => {
      if (token.length === 0) return;
      if (/^\s+$/.test(token)) {
        el.appendChild(document.createTextNode(token));
        return;
      }
      const span = document.createElement('span');
      span.textContent = token;
      span.style.display = 'inline-block';
      span.style.willChange = 'transform, filter, opacity';
      el.appendChild(span);
      wordSpans.push(span);
    });

    // Mobile: split listo, pero saltamos el scatter timeline para no trabar.
    if (isMobile) return;

    wordSpans.forEach((word) => {
      const fwdIn = Math.random() > 0.5;
      const fwdOut = Math.random() > 0.5;

      const xIn = (Math.random() - 0.5) * 80 * intensity;
      const yIn = (Math.random() - 0.5) * 50 * intensity;
      const rotIn = (Math.random() - 0.5) * 12 * intensity;
      const scaleIn = fwdIn ? 1.1 + Math.random() * 0.25 : 0.6 + Math.random() * 0.3;
      const blurIn = fwdIn ? Math.random() * 1.2 * intensity : (2.5 + Math.random() * 3) * intensity;

      const xOut = (Math.random() - 0.5) * 60 * intensity;
      const yOut = (Math.random() - 0.5) * 40 * intensity;
      const rotOut = (Math.random() - 0.5) * 10 * intensity;
      const scaleOut = fwdOut ? 1.05 + Math.random() * 0.2 : 0.65 + Math.random() * 0.25;
      const blurOut = fwdOut ? Math.random() * 1 * intensity : (2 + Math.random() * 2.5) * intensity;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: 'top 95%',
          end: 'bottom 5%',
          scrub: 1.6,
        },
      });

      tl.fromTo(
        word,
        {
          x: xIn,
          y: yIn,
          rotation: rotIn,
          scale: scaleIn,
          opacity: 0.3,
          filter: `blur(${blurIn}px)`,
        },
        {
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
          opacity: 1,
          filter: 'blur(0px)',
          ease: 'power3.out',
          duration: 0.35,
        },
      );
      tl.to(word, {
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        opacity: 1,
        filter: 'blur(0px)',
        duration: 0.3,
      });
      tl.to(word, {
        x: xOut,
        y: yOut,
        rotation: rotOut,
        scale: scaleOut,
        opacity: 0.7,
        filter: `blur(${blurOut}px)`,
        ease: 'power3.in',
        duration: 0.35,
      });
    });
  });
}

function initMagnetic() {
  if (prefersReduced) return;
  const els = document.querySelectorAll<HTMLElement>('[data-magnetic]');
  els.forEach((el) => {
    const strength = parseFloat(el.dataset.magnetic ?? '0.3');
    const inner = (el.querySelector('[data-magnetic-inner]') as HTMLElement | null) ?? el;
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      gsap.to(inner, {
        x: x * strength,
        y: y * strength,
        duration: 0.6,
        ease: 'power3.out',
      });
    });
    el.addEventListener('mouseleave', () => {
      gsap.to(inner, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)' });
    });
  });
}

function initTilt() {
  if (prefersReduced) return;
  const cards = document.querySelectorAll<HTMLElement>('[data-tilt]');
  cards.forEach((card) => {
    const max = parseFloat(card.dataset.tilt ?? '6');
    card.style.transformStyle = 'preserve-3d';
    card.style.willChange = 'transform';
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const rx = (0.5 - py) * max;
      const ry = (px - 0.5) * max;
      gsap.to(card, {
        rotateX: rx,
        rotateY: ry,
        duration: 0.5,
        ease: 'power2.out',
        transformPerspective: 1000,
      });
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        rotateX: 0,
        rotateY: 0,
        duration: 0.8,
        ease: 'power3.out',
      });
    });
  });
}

function initHeroLetters() {
  if (prefersReduced) return;
  const heroes = document.querySelectorAll<HTMLElement>('[data-hero-title]');
  heroes.forEach((el) => {
    const text = el.textContent ?? '';
    el.textContent = '';
    el.setAttribute('aria-label', text);
    const letters: HTMLSpanElement[] = [];
    [...text].forEach((char) => {
      const span = document.createElement('span');
      span.textContent = char === ' ' ? ' ' : char;
      span.style.display = 'inline-block';
      span.style.transform = 'translateY(110%)';
      span.style.willChange = 'transform, filter, opacity';
      span.setAttribute('aria-hidden', 'true');
      el.appendChild(span);
      letters.push(span);
    });
    // Marcar como splitted enseguida para que initIdleFloat e initLetterScatter
    // (que corre antes en initAnimations) puedan reusar las letras.
    el.dataset.lettersAlreadySplit = 'true';
    if (!el.dataset.scatterLetters) {
      el.dataset.scatterLetters = el.dataset.heroScatter ?? '0.7';
    }
    gsap.to(letters, {
      y: 0,
      duration: 1.1,
      ease: 'expo.out',
      stagger: 0.025,
      delay: 0.2,
      onComplete: () => {
        splitAndScatter(el);
      },
    });
  });
}

function initCursorGradient() {
  if (prefersReduced) return;
  const target = document.querySelector<HTMLElement>('[data-cursor-glow]');
  if (!target) return;
  const accent = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-accent')
    .trim() || '#5dcfc0';
  const glow = document.createElement('div');
  glow.style.cssText = `
    position: absolute;
    width: 600px;
    height: 600px;
    border-radius: 50%;
    background: radial-gradient(circle, ${accent}22 0%, ${accent}00 60%);
    pointer-events: none;
    transform: translate(-50%, -50%);
    left: 50%;
    top: 50%;
    transition: opacity 0.4s;
    z-index: 0;
    will-change: transform;
  `;
  target.appendChild(glow);
  target.addEventListener('mousemove', (e) => {
    const rect = target.getBoundingClientRect();
    gsap.to(glow, {
      x: e.clientX - rect.left - rect.width / 2,
      y: e.clientY - rect.top - rect.height / 2,
      duration: 0.6,
      ease: 'power3.out',
    });
  });
}

function initFitText() {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-fit-text]'));
  if (els.length === 0) return;

  const fit = (el: HTMLElement) => {
    const parent = el.parentElement;
    if (!parent) return;
    const cw = parent.clientWidth;
    if (cw === 0) return;
    el.style.fontSize = '100px';
    el.style.lineHeight = '1';
    const tw = el.scrollWidth;
    if (tw === 0) return;
    const target = (cw / tw) * 100;
    el.style.fontSize = `${target}px`;
  };

  const fitAll = () => {
    els.forEach(fit);
    ScrollTrigger.refresh();
  };

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fitAll);
  }
  fitAll();

  let resizeTimer: number | undefined;
  window.addEventListener('resize', () => {
    if (resizeTimer) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(fitAll, 80);
  });
}

function initMarquee() {
  if (prefersReduced) return;
  const tracks = document.querySelectorAll<HTMLElement>('[data-marquee]');
  tracks.forEach((track) => {
    const speed = parseFloat(track.dataset.marquee ?? '40');
    gsap.to(track, {
      xPercent: -50,
      ease: 'none',
      duration: speed,
      repeat: -1,
    });
  });
}

// Reveal liviano para mobile: 1 IntersectionObserver global + transition CSS.
// Cada bloque arranca blurreado y oscuro, se aclara cuando entra al viewport.
// Mucho más liviano que ScrollTrigger + scatter por elemento.
function initMobileReveal() {
  if (!isMobile || prefersReduced) return;

  const els = document.querySelectorAll<HTMLElement>(
    '[data-scatter], [data-scatter-letters], [data-scatter-words]',
  );

  els.forEach((el) => el.classList.add('mobile-veil'));

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-unveiled');
        } else {
          entry.target.classList.remove('is-unveiled');
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -5% 0px' },
  );

  els.forEach((el) => io.observe(el));
}

function initScrollProgress() {
  const bar = document.querySelector<HTMLElement>('[data-scroll-progress]');
  if (!bar) return;
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      bar.style.transform = `scaleX(${self.progress})`;
    },
  });
}

// Idle float: distintos perfiles según el tipo de elemento.
// - "particle": amplitud grande (las partículas decorativas vagan dramático)
// - "text":     amplitud pequeña + frecuencia un toque más alta (sutil pero notable)
// Usa Web Animations API con composite:'add' para sumar al transform de GSAP.
function initIdleFloat() {
  if (prefersReduced) return;

  type Profile = 'particle' | 'title';
  const targets = new Map<HTMLElement, Profile>();

  const addTarget = (el: HTMLElement, profile: Profile) => {
    if (!targets.has(el)) targets.set(el, profile);
  };

  // Decoraciones depth → PARTICLE (amplitud muy grande)
  document
    .querySelectorAll<HTMLElement>('[data-depth]')
    .forEach((el) => addTarget(el, 'particle'));

  // Letras de TÍTULOS splitted → TITLE (sutil + frecuencia alta)
  // Solo aplica a h1/h2/h3 con letter-scatter, NO al texto largo (words/scatter).
  document
    .querySelectorAll<HTMLElement>(
      '[data-scatter-letters][data-letters-already-split="true"]',
    )
    .forEach((parent) => {
      Array.from(parent.children).forEach((child) => {
        if ((child as HTMLElement).tagName === 'SPAN') {
          addTarget(child as HTMLElement, 'title');
        }
      });
    });

  // data-idle manual → respeta perfil o cae en title
  document.querySelectorAll<HTMLElement>('[data-idle]').forEach((el) => {
    const p = (el.dataset.idleProfile as Profile) ?? 'title';
    addTarget(el, p);
  });

  const configs: Record<Profile, { dx: number; dy: number; dr: number; durMin: number; durMax: number }> = {
    // Particles: amplitud x4 — vagan dramático en todas direcciones.
    particle: { dx: 320, dy: 260, dr: 32, durMin: 9000, durMax: 23000 },
    // Títulos: amplitud apenas, frecuencia alta (dura 2.5–6s).
    title: { dx: 3.5, dy: 2.8, dr: 0.8, durMin: 2500, durMax: 6000 },
  };

  targets.forEach((profile, el) => {
    if (el.dataset.idleApplied === 'true') return;
    el.dataset.idleApplied = 'true';

    const range = parseFloat(el.dataset.idle ?? '1');
    const cfg = configs[profile];

    const dx = (Math.random() - 0.5) * cfg.dx * range;
    const dy = (Math.random() - 0.5) * cfg.dy * range;
    const dr = (Math.random() - 0.5) * cfg.dr * range;
    const dur = cfg.durMin + Math.random() * (cfg.durMax - cfg.durMin);
    const delay = -Math.random() * dur;

    try {
      el.animate(
        [
          { transform: 'translate(0px, 0px) rotate(0deg)' },
          {
            transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) rotate(${dr.toFixed(2)}deg)`,
          },
        ],
        {
          duration: dur,
          delay,
          iterations: Infinity,
          direction: 'alternate',
          easing: 'ease-in-out',
          composite: 'add',
        },
      );
    } catch {
      // Sin soporte composite:'add' → silencioso
    }
  });
}

export function initAnimations() {
  initSmoothScroll();
  initReveals();
  initParallax();
  initDepthLayers();
  initScatter();
  initLetterScatter();
  initWordScatter();
  initMagnetic();
  initTilt();
  initHeroLetters();
  initFitText();
  initMarquee();
  initCursorGradient();
  initScrollProgress();
  initMobileReveal();
  // Idle al final: todos los splits y selectores ya existen.
  initIdleFloat();
}
