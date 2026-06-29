/* ========================================
   CHAINVERSE — BLOCK MINING SIMULATOR
   Uses Web Crypto API (SHA-256) for PoW.

   Mining rule: SHA-256(prevHash + data + nonce)
   must START WITH "00" to be considered valid.
   ======================================== */

(function () {
  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);

  const data1 = $('data1'), nonce1 = $('nonce1'), prev1 = $('prevHash1'), hash1 = $('hash1');
  const stat1 = $('status1'), mineStatus1 = $('mineStatus1'), attempts1 = $('attempts1');
  const btn1  = $('mineBtn1'),  counter1 = $('nonceCounter1'), block1 = $('block1');

  const data2 = $('data2'), nonce2 = $('nonce2'), prev2 = $('prevHash2'), hash2 = $('hash2');
  const stat2 = $('status2'), mineStatus2 = $('mineStatus2'), attempts2 = $('attempts2');
  const btn2  = $('mineBtn2'),  counter2 = $('nonceCounter2'), block2 = $('block2');

  const overlay = $('brokenOverlay');

  // ---------- STATE ----------
  let block1FinalHash = null;
  let block2FinalHash = null;
  const PREV1 = '0000000000000000';  // gen
  const TARGET_PREFIX = '00';

  // ---------- HELPERS ----------
  function buf2hex(buffer) {
    const bytes = new Uint8Array(buffer);
    let s = '';
    for (let i = 0; i < bytes.length; i++) {
      s += bytes[i].toString(16).padStart(2, '0');
    }
    return s;
  }
  async function sha256hex(text) {
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return buf2hex(buf);
  }
  function setStatus(el, kind, label) {
    el.className = 'block-status ' + kind;
    let icon = 'fa-circle';
    if (kind === 'valid')   icon = 'fa-circle-check';
    if (kind === 'invalid') icon = 'fa-circle-xmark';
    if (kind === 'mining')  icon = 'fa-spinner fa-spin';
    el.innerHTML = `<i class="fa-solid ${icon}"></i> ${label}`;
  }

  // ---------- TYPEWRITER HASH ----------
  function typeHash(el, finalHash, speed = 18) {
    el.classList.remove('empty');
    let i = 0;
    el.textContent = '';
    const interval = setInterval(() => {
      el.textContent += finalHash[i];
      i++;
      if (i >= finalHash.length) clearInterval(interval);
    }, speed);
  }

  // ---------- MINE LOOP (async, yields to UI) ----------
  async function mine(blockNum) {
    const data  = (blockNum === 1 ? data1 : data2).value || '';
    const prev  = blockNum === 1 ? PREV1 : (block1FinalHash || '');
    let nonce   = parseInt((blockNum === 1 ? nonce1 : nonce2).value, 10) || 0;

    const stat   = blockNum === 1 ? stat1 : stat2;
    const mineSt = blockNum === 1 ? mineStatus1 : mineStatus2;
    const attEl  = blockNum === 1 ? attempts1 : attempts2;
    const btn    = blockNum === 1 ? btn1 : btn2;
    const hashEl = blockNum === 1 ? hash1 : hash2;
    const nInput = blockNum === 1 ? nonce1 : nonce2;
    const cEl    = blockNum === 1 ? counter1 : counter2;
    const prevIn = blockNum === 1 ? prev1 : prev2;

    prevIn.textContent = prev || '—';

    setStatus(stat, 'mining', 'Mining…');
    mineSt.textContent = '⛏ Searching for a hash starting with "' + TARGET_PREFIX + '"…';
    btn.disabled = true;

    let attempts = 0;
    const BATCH = 12;     // nonces per yield for smooth UI
    const TICK_MS = 18;   // visual cadence

    return new Promise(resolve => {
      const tick = setInterval(async () => {
        // process a small batch
        let found = null;
        for (let i = 0; i < BATCH; i++) {
          const h = await sha256hex(prev + data + nonce);
          attempts++;
          if (h.startsWith(TARGET_PREFIX)) { found = h; break; }
          nonce++;
        }
        cEl.textContent  = `Nonce: ${nonce.toLocaleString()}`;
        nInput.value     = nonce;
        attEl.textContent = attempts.toLocaleString();

        if (found) {
          clearInterval(tick);
          typeHash(hashEl, found, 14);
          mineSt.textContent = '✓ Found in ' + attempts.toLocaleString() + ' attempts';
          mineSt.style.color = 'var(--green)';
          attEl.textContent  = attempts.toLocaleString();

          const isValid = found.startsWith(TARGET_PREFIX);
          if (isValid) {
            setStatus(stat, 'valid', 'Block Valid');
            hashEl.style.color = 'var(--green)';
            if (blockNum === 1) {
              block1FinalHash = found;
              // chain propagation
              prev2.textContent = found;
              btn2.disabled = false;
              mineStatus2.textContent = 'Previous hash set — ready to mine';
              // if block 2 already mined, it instantly becomes INVALID
              if (block2FinalHash) invalidate2();
            } else {
              block2FinalHash = found;
            }
          } else {
            setStatus(stat, 'invalid', 'Block Invalid');
            hashEl.style.color = 'var(--red)';
          }
          btn.disabled = false;
          resolve(found);
        }
      }, TICK_MS);
    });
  }

  // ---------- INVALIDATION ----------
  function invalidate2() {
    block2.classList.add('shake');
    setStatus(stat2, 'invalid', 'Block Invalid');
    mineStatus2.textContent = 'Broken chain — Block #1 changed';
    prev2.classList.add('invalid');
    hash2.style.color = 'var(--red)';
    flashOverlay();
    setTimeout(() => block2.classList.remove('shake'), 700);
  }

  function flashOverlay() {
    overlay.style.animation = 'none';
    // force reflow
    void overlay.offsetWidth;
    overlay.style.animation = '';
  }

  // ---------- EVENTS ----------
  btn1.addEventListener('click', () => mine(1));
  btn2.addEventListener('click', () => mine(2));

  // When the user changes Block 1 data after Block 1 is mined,
  // Block 2 becomes invalid (because its prevHash references the OLD hash).
  data1.addEventListener('input', () => {
    if (!block1FinalHash) return;
    if (block2FinalHash) invalidate2();
    else {
      // mark block 1 as invalid until re-mined
      setStatus(stat1, 'invalid', 'Data changed');
      mineStatus1.textContent = 'Re-mine to lock the chain';
    }
  });

  // Enable Block 2 mining once Block 1 hash exists
  // (also re-enable if user already enabled and we lost state)
  setInterval(() => {
    if (block1FinalHash && btn2.disabled) btn2.disabled = false;
  }, 400);

  // ---------- CHAIN CANVAS (linking graphic) ----------
  (function () {
    const c = document.getElementById('chainCanvas');
    if (!c) return;
    const ctx = c.getContext('2d');
    function resize() {
      const r = c.getBoundingClientRect();
      c.width  = r.width  * (window.devicePixelRatio || 1);
      c.height = r.height * (window.devicePixelRatio || 1);
      ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    let brokenTimeout = null;
    const baseColor = () => block1FinalHash && block2FinalHash ? '#21e6ff' : '#8a5cff';
    function draw() {
      const w = c.clientWidth, h = c.clientHeight;
      ctx.clearRect(0, 0, w, h);
      const cy = h / 2;
      // link segments
      const segs = 5;
      const pad = 10;
      const linkW = (w - pad * 2) / segs;
      const t = performance.now() / 700;

      for (let i = 0; i < segs; i++) {
        const x0 = pad + i * linkW;
        const x1 = x0 + linkW * 0.55;
        ctx.strokeStyle = baseColor();
        ctx.lineWidth   = 6;
        ctx.lineCap     = 'round';
        ctx.shadowColor = baseColor();
        ctx.shadowBlur  = 14;
        ctx.beginPath();
        ctx.moveTo(x0, cy);
        ctx.lineTo(x1, cy);
        ctx.stroke();
        // tiny connector pulse
        ctx.shadowBlur  = 0;
        ctx.fillStyle   = '#fff';
        ctx.beginPath();
        ctx.arc(x0 + ((x1 - x0) * ((t + i * 0.18) % 1)), cy, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // shards when broken
      if (block1FinalHash && !block2FinalHash && data1.value) {
        // minor "sparks" effect
        for (let i = 0; i < 14; i++) {
          ctx.fillStyle = 'rgba(255,77,109,' + (0.2 + Math.random() * 0.3) + ')';
          ctx.shadowColor = '#ff4d6d';
          ctx.shadowBlur  = 8;
          ctx.beginPath();
          ctx.arc(Math.random() * w, cy + (Math.random() - 0.5) * 30, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      requestAnimationFrame(draw);
    }
    draw();
  })();

  // ---------- AUTO-MINE BLOCK 1 ON LOAD (showcase) ----------
  // Comment out for "manual" feel:
  // setTimeout(() => mine(1), 800);
})();
