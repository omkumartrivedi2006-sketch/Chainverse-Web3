/* ========================================
   CHAINVERSE — SHARED NAV + PARTICLES
   Loaded on every page.
   ======================================== */

(function () {
  // ---------- 1. INJECT NAV ----------
  const NAV_HTML = `
  <nav class="navbar">
    <div class="nav-inner">
      <a href="index.html" class="brand">
        <span class="brand-logo">C</span>
        <span class="brand-text">ChainVerse</span>
      </a>
      <button class="nav-toggle" id="navToggle" aria-label="Toggle navigation">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
      <ul class="nav-links" id="navLinks">
        <li><a href="index.html" data-page="index.html">Home</a></li>
        <li><a href="concepts.html" data-page="concepts.html">Concepts</a></li>
        <li><a href="prices.html" data-page="prices.html">Live Prices</a></li>
        <li><a href="simulator.html" data-page="simulator.html">Simulator</a></li>
      </ul>
    </div>
  </nav>`;

  // Inject background grid
  const BG_HTML = `<div class="bg-grid"></div><canvas id="particles"></canvas>`;

  document.body.insertAdjacentHTML('afterbegin', BG_HTML);

  // Find a target to inject nav at the very top
  const firstChild = document.body.firstElementNode || document.body.firstElementChild;
  // We inserted BG_HTML above; insert nav AFTER the bg elements
  document.body.insertAdjacentHTML('afterbegin', NAV_HTML);

  // ---------- 2. HIGHLIGHT ACTIVE LINK ----------
  const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.getAttribute('data-page') === path) a.classList.add('active');
  });

  // ---------- 3. MOBILE TOGGLE ----------
  const toggle = document.getElementById('navToggle');
  const links  = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => links.classList.remove('open'))
    );
  }

  // ---------- 4. RIPPLE EFFECT ON BUTTONS ----------
  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn');
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top  - size / 2;
    const r = document.createElement('span');
    r.className = 'ripple';
    r.style.width = r.style.height = size + 'px';
    r.style.left = x + 'px'; r.style.top = y + 'px';
    btn.appendChild(r);
    setTimeout(() => r.remove(), 650);
  });

  // ---------- 5. INTERSECTION OBSERVER FADE-INS ----------
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // ---------- 6. PARTICLE CANVAS (shared, lightweight) ----------
  const canvas = document.getElementById('particles');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let w, h, particles;
    const COUNT = window.innerWidth < 700 ? 40 : 90;

    function resize() {
      w = canvas.width  = window.innerWidth;
      h = canvas.height = window.innerHeight;
      particles = Array.from({ length: COUNT }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 1.6 + 0.6,
        c: Math.random() > 0.6 ? '#21e6ff' : '#8a5cff'
      }));
    }
    function step() {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.c;
        ctx.shadowColor = p.c;
        ctx.shadowBlur  = 10;
        ctx.fill();
      }
      // connecting lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 140) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(138,92,255,${0.12 * (1 - d / 140)})`;
            ctx.lineWidth = 0.6;
            ctx.shadowBlur = 0;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(step);
    }
    resize();
    window.addEventListener('resize', resize);
    step();
  }

  // ---------- 7. ANIMATED NUMBER COUNTER HELPER ----------
  window.cvCount = function (el, target, duration = 1600, suffix = '') {
    const start = 0;
    const t0 = performance.now();
    function frame(t) {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = Math.floor(start + (target - start) * eased);
      el.textContent = v.toLocaleString() + suffix;
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = target.toLocaleString() + suffix;
    }
    requestAnimationFrame(frame);
  };
})();
