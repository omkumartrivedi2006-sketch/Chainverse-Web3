/* ========================================
   CHAINVERSE — SHARED NAV + PARTICLES + 3D
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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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

  // Insert nav at the top
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
    const btn = e.target.closest('.btn, .mine-btn, .refresh-btn');
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
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // ---------- 6. 3D CARD TILT + GLARE EFFECT (EVENT DELEGATION) ----------
  document.addEventListener('mousemove', e => {
    const card = e.target.closest('.glass, .vs-col, .block-card, .price-card, .key-pill, .flip-face');
    if (!card) return;

    // Skip tilt on active mining block to avoid visual jittering
    if (card.classList.contains('block-card') && card.querySelector('.block-status.mining')) return;

    // Ensure glare element exists
    let glare = card.querySelector('.card-glare');
    if (!glare) {
      glare = document.createElement('div');
      glare.className = 'card-glare';
      card.appendChild(glare);
    }

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;

    // Subtle professional tilt (max 8 degrees)
    const rx = -8 * ((y - h / 2) / (h / 2));
    const ry = 8 * ((x - w / 2) / (w / 2));

    card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.015, 1.015, 1.015)`;
    card.style.transition = 'transform 0.1s ease-out, box-shadow 0.25s ease, border-color 0.25s ease';

    // Update glare position & opacity
    const px = (x / w) * 100;
    const py = (y / h) * 100;
    glare.style.background = `radial-gradient(circle at ${px}% ${py}%, rgba(255, 255, 255, 0.08) 0%, transparent 65%)`;
    glare.style.opacity = '1';
  });

  document.addEventListener('mouseout', e => {
    const card = e.target.closest('.glass, .vs-col, .block-card, .price-card, .key-pill, .flip-face');
    if (!card) return;

    const related = e.relatedTarget;
    if (related && card.contains(related)) return;

    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    card.style.transition = 'transform 0.4s ease-out, box-shadow 0.3s ease, border-color 0.3s ease';
    
    const glare = card.querySelector('.card-glare');
    if (glare) {
      glare.style.opacity = '0';
    }
  });

  // ---------- 7. PARTICLE CANVAS (minimal, clean) ----------
  const canvas = document.getElementById('particles');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let w, h, particles;
    const COUNT = window.innerWidth < 700 ? 30 : 60;

    function resize() {
      w = canvas.width  = window.innerWidth;
      h = canvas.height = window.innerHeight;
      particles = Array.from({ length: COUNT }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.2 + 0.5,
        c: Math.random() > 0.6 ? 'rgba(6, 182, 212, 0.4)' : 'rgba(99, 102, 241, 0.4)'
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
        ctx.shadowBlur  = 6;
        ctx.fill();
      }
      // connecting lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i], b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 160) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.05 * (1 - d / 160)})`;
            ctx.lineWidth = 0.5;
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

  // ---------- 8. ANIMATED NUMBER COUNTER HELPER ----------
  window.cvCount = function (el, target, duration = 1600, suffix = '') {
    const start = 0;
    const t0 = performance.now();
    function frame(t) {
      const p = Math.min(1, (t - t0) / duration);
      const colorProgress = 1 - Math.pow(1 - p, 3);
      const v = Math.floor(start + (target - start) * colorProgress);
      el.textContent = v.toLocaleString() + suffix;
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = target.toLocaleString() + suffix;
    }
    requestAnimationFrame(frame);
  };
})();
