import gsap from 'https://cdn.skypack.dev/gsap';
import ScrollTrigger from 'https://cdn.skypack.dev/gsap/ScrollTrigger';
import Lenis from 'https://cdn.jsdelivr.net/npm/@studio-freight/lenis/dist/lenis.mjs';

gsap.registerPlugin(ScrollTrigger);

const SVGNS = 'http://www.w3.org/2000/svg';
const PALETTE = ['#00f0ff', '#ff2bd6', '#b6ff00', '#8b5cf6', '#ff6123'];

// seeded rng so the procedural layout is identical on every reload/resize
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Lenis Setup ---
const lenis = new Lenis({
  duration: 1.2,
  smoothTouch: true,
  gestureOrientation: 'both',
});

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});

lenis.on('scroll', ScrollTrigger.update);

// --- GSAP Horizontal Scroll (translate the whole track) ---
const track = document.querySelector('.track');
const progressBar = document.getElementById('progress-bar');
const getMaxScroll = () => track.scrollWidth - window.innerWidth;

let parallaxItems = [];

function applyParallax(progress) {
  const max = getMaxScroll();
  for (const item of parallaxItems) {
    // depth < 1 lags behind the track (background), depth > 1 outruns it (foreground)
    item.el.style.transform = `translateX(${progress * max * (1 - item.depth)}px)`;
  }
}

const horizontal = gsap.to(track, {
  x: () => -getMaxScroll(),
  ease: 'none',
  scrollTrigger: {
    id: 'horizontalScroll',
    trigger: '.scroll-container',
    pin: true,
    scrub: 1,
    end: () => '+=' + getMaxScroll(),
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      gsap.set(progressBar, { scaleX: self.progress });
      applyParallax(self.progress);
    },
  },
});

// drifting background words etc. — anything with data-speed
gsap.utils.toArray('[data-speed]').forEach((el) => {
  const speed = parseFloat(el.dataset.speed) || 1;
  const drift = (speed - 1) * window.innerWidth * 0.8;
  gsap.fromTo(el, { x: drift }, {
    x: -drift,
    ease: 'none',
    scrollTrigger: {
      trigger: el,
      containerAnimation: horizontal,
      start: 'left right',
      end: 'right left',
      scrub: true,
    },
  });
});

// --- Procedural neon orbs + particles ---
const fxLayer = document.getElementById('fx-layer');

function buildFx() {
  fxLayer.querySelectorAll('*').forEach((el) => gsap.killTweensOf(el));
  fxLayer.innerHTML = '';
  parallaxItems = [];

  const rng = mulberry32(0xC0FFEE);
  const w = track.scrollWidth;
  const h = window.innerHeight;

  const orbCount = Math.round(w / 240);
  for (let i = 0; i < orbCount; i++) {
    const wrap = document.createElement('div');
    wrap.className = 'orb-wrap';
    const orb = document.createElement('div');
    orb.className = 'orb';

    const size = 80 + rng() * 280;
    const color = PALETTE[Math.floor(rng() * PALETTE.length)];
    const depth = 0.1 + rng() * 1.2;

    wrap.style.left = rng() * w + 'px';
    wrap.style.top = rng() * h + 'px';
    orb.style.width = size + 'px';
    orb.style.height = size + 'px';
    orb.style.background = `radial-gradient(circle, ${color} 0%, transparent 70%)`;
    orb.style.opacity = (0.05 + depth * 0.12).toFixed(3);

    wrap.appendChild(orb);
    fxLayer.appendChild(wrap);
    parallaxItems.push({ el: wrap, depth });

    gsap.to(orb, {
      y: (rng() * 2 - 1) * 60,
      x: (rng() * 2 - 1) * 40,
      duration: 6 + rng() * 8,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    });
  }

  for (let i = 0; i < orbCount * 3; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const color = PALETTE[Math.floor(rng() * PALETTE.length)];
    p.style.left = rng() * w + 'px';
    p.style.top = rng() * h + 'px';
    p.style.background = color;
    p.style.boxShadow = `0 0 6px ${color}`;
    fxLayer.appendChild(p);
    parallaxItems.push({ el: p, depth: 0.2 + rng() * 1.6 });

    gsap.to(p, {
      opacity: 0.15 + rng() * 0.6,
      duration: 1.5 + rng() * 3,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    });
  }

  applyParallax(horizontal.scrollTrigger ? horizontal.scrollTrigger.progress : 0);
}

// --- Procedural wavy dashed line through all .wave-node elements ---
const waveSvg = document.getElementById('wave-svg');
const wavePath = document.getElementById('wave-path');
const waveGlowPath = document.getElementById('wave-glow-path');
const waveDots = document.getElementById('wave-dots');

function buildWave() {
  const w = track.scrollWidth;
  const h = window.innerHeight;

  waveSvg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  waveSvg.setAttribute('width', w);
  waveSvg.setAttribute('height', h);

  const grad = document.getElementById('wave-grad');
  grad.setAttribute('x2', w);

  // anchor points = centers of every .wave-node, measured relative to the track
  const trackRect = track.getBoundingClientRect();
  const anchors = [...document.querySelectorAll('.wave-node')].map((node) => {
    const r = node.getBoundingClientRect();
    return {
      x: r.left - trackRect.left + r.width / 2,
      y: r.top - trackRect.top + r.height / 2,
    };
  }).sort((a, b) => a.x - b.x);

  if (anchors.length < 2) return;

  // weave extra oscillation points between anchors so the line dips and rises
  const rng = mulberry32(20260611);
  const pts = [anchors[0]];
  for (let i = 1; i < anchors.length; i++) {
    const a = anchors[i - 1];
    const b = anchors[i];
    const gap = b.x - a.x;
    const extra = Math.min(3, Math.floor(gap / (window.innerWidth * 0.35)));
    for (let j = 1; j <= extra; j++) {
      const x = a.x + (gap * j) / (extra + 1);
      const base = a.y + ((b.y - a.y) * j) / (extra + 1);
      const amp = h * (0.12 + rng() * 0.18) * (j % 2 ? 1 : -1) * (rng() > 0.5 ? 1 : -1);
      pts.push({ x, y: gsap.utils.clamp(h * 0.08, h * 0.92, base + amp) });
    }
    pts.push(b);
  }

  // smooth cubic beziers with horizontal tangents -> clean up/down waves
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const dx = (p1.x - p0.x) / 2;
    d += ` C ${(p0.x + dx).toFixed(1)} ${p0.y.toFixed(1)}, ${(p1.x - dx).toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }

  wavePath.setAttribute('d', d);
  waveGlowPath.setAttribute('d', d);

  // pulsing node dots at every anchor
  waveDots.querySelectorAll('circle').forEach((c) => gsap.killTweensOf(c));
  waveDots.innerHTML = '';
  anchors.forEach((a, i) => {
    const halo = document.createElementNS(SVGNS, 'circle');
    halo.setAttribute('cx', a.x);
    halo.setAttribute('cy', a.y);
    halo.setAttribute('r', 5);
    halo.setAttribute('class', 'wave-halo');
    halo.style.stroke = PALETTE[i % PALETTE.length];

    const dot = document.createElementNS(SVGNS, 'circle');
    dot.setAttribute('cx', a.x);
    dot.setAttribute('cy', a.y);
    dot.setAttribute('r', 4.5);
    dot.setAttribute('class', 'wave-dot');

    waveDots.append(halo, dot);
    gsap.fromTo(halo,
      { attr: { r: 5 }, opacity: 0.8 },
      { attr: { r: 20 }, opacity: 0, duration: 2, repeat: -1, ease: 'power1.out', delay: i * 0.35 }
    );
  });
}

// dashes flow along the line forever (offset = multiple of the 24px dash period)
gsap.to(wavePath, { strokeDashoffset: -240, duration: 8, ease: 'none', repeat: -1 });

buildFx();
buildWave();
ScrollTrigger.addEventListener('refresh', buildWave);
window.addEventListener('load', () => ScrollTrigger.refresh());

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(buildFx, 200);
});

// --- Cursor glow ---
const cursorGlow = document.getElementById('cursor-glow');
const glowX = gsap.quickTo(cursorGlow, 'x', { duration: 0.6, ease: 'power3' });
const glowY = gsap.quickTo(cursorGlow, 'y', { duration: 0.6, ease: 'power3' });
window.addEventListener('mousemove', (e) => {
  glowX(e.clientX);
  glowY(e.clientY);
});

// --- Hero entrance animations (IntersectionObserver) ---
const options = {
  root: document.querySelector('.scroll-container'),
  rootMargin: '0px',
  threshold: 0.3,
};

const callback = (entries) => {
  entries.forEach((entry) => {
    if (entry.target === title) {
      setTimeout(() => { title.classList.add('opacity-100', 'translate-y-0'); }, 300);
    } else if (entry.target === bar) {
      setTimeout(() => { entry.target.classList.add('scale-x-100'); }, 300);
    } else if (entry.target === descriptor) {
      setTimeout(() => { descriptor.classList.add('opacity-100', 'translate-y-0'); }, 600);
    } else if (entry.target === profileImage) {
      setTimeout(() => { profileImage.classList.add('opacity-100', 'scale-100'); }, 50);
    } else if (entry.target.classList.contains('bullet-animate')) {
      setTimeout(() => { entry.target.classList.remove('-rotate-90'); }, 500);
    } else if (entry.target.classList.contains('x-animate')) {
      entry.target.classList.remove('scale-x-100');
      setTimeout(() => { entry.target.classList.add('scale-x-0'); }, 500);
    } else if (entry.target === button_container) {
      setTimeout(() => { entry.target.classList.remove('btn-idle'); entry.target.classList.add('btn-neon'); }, 300);
    } else if (entry.target === button_arrow) {
      setTimeout(() => { entry.target.classList.remove('scale-0', 'opacity-0'); }, 300);
    } else if (entry.target === button_magnify) {
      setTimeout(() => { entry.target.classList.remove('scale-100', 'opacity-100'); entry.target.classList.add('scale-0', 'opacity-0'); }, 300);
    }
  });
};

const observer = new IntersectionObserver(callback, options);

const bar = document.querySelector('.bar');
observer.observe(bar);

const title = document.querySelector('#title-text');
observer.observe(title);

const descriptor = document.querySelector('#descriptor-text');
observer.observe(descriptor);

const profileImage = document.getElementById('profile-image');
observer.observe(profileImage);

document.querySelectorAll('.bullet-animate').forEach((el) => observer.observe(el));
document.querySelectorAll('.x-animate').forEach((el) => observer.observe(el));

const button_container = document.querySelector('.button-container');
observer.observe(button_container);

const button_arrow = document.querySelector('.button-arrow');
observer.observe(button_arrow);

const button_magnify = document.querySelector('.button-magnify');
observer.observe(button_magnify);

// --- Menu navigation ---
document.querySelectorAll('.menu-link').forEach((link) => {
  link.addEventListener('click', function (e) {
    e.preventDefault();
    const targetId = this.dataset.target || this.getAttribute('id').replace('-link', '');
    const panel = document.getElementById(targetId);

    if (panel) {
      const sections = gsap.utils.toArray('.panel');
      const index = sections.indexOf(panel);

      if (index !== -1) {
        const scrollTrigger = ScrollTrigger.getById('horizontalScroll');
        const totalDistance = scrollTrigger.end - scrollTrigger.start;
        const scrollDistance = scrollTrigger.start + index * (totalDistance / (sections.length - 1));

        lenis.scrollTo(scrollDistance, {
          duration: 1.2,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        });
      }
    }
  });
});
