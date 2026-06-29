/* ========================================
   CHAINVERSE — LIVE PRICES (CoinGecko)
   Robust version: defensive rendering,
   guarded numeric ops, retry countdown.
   ======================================== */

(function () {
  const COINS = [
    { id: 'bitcoin',       name: 'Bitcoin',  symbol: 'BTC',   cls: 'btc' },
    { id: 'ethereum',      name: 'Ethereum', symbol: 'ETH',   cls: 'eth' },
    { id: 'solana',        name: 'Solana',   symbol: 'SOL',   cls: 'sol' },
    { id: 'matic-network', name: 'Polygon',  symbol: 'MATIC', cls: 'matic' }
  ];

  const LOGOS = {
    BTC:   '<i class="fa-brands fa-bitcoin"></i>',
    ETH:   '<i class="fa-brands fa-ethereum"></i>',
    SOL:   '<i class="fa-solid fa-bolt"></i>',
    MATIC: '<i class="fa-solid fa-cube"></i>'
  };

  const API = 'https://api.coingecko.com/api/v3/simple/price'
            + '?ids=ethereum,bitcoin,solana,matic-network'
            + '&vs_currencies=usd&include_24hr_change=true';

  const grid     = document.getElementById('priceGrid');
  const lastTxt  = document.getElementById('lastUpdated');
  const refresh  = document.getElementById('refreshBtn');
  const errorBox = document.getElementById('errorBox');
  const errorMsg = document.getElementById('errorMsg');

  // ---------- Safe number helpers ----------
  function fmtUsd(n) {
    const v = Number(n);
    if (!isFinite(v)) return '—';
    if (v >= 1)    return v.toLocaleString('en-US', { minimumFractionDigits: 2,    maximumFractionDigits: 2 });
    if (v >= 0.01) return v.toLocaleString('en-US', { minimumFractionDigits: 4,    maximumFractionDigits: 4 });
    return v.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 });
  }
  function safe(n, fallback) {
    const v = Number(n);
    return isFinite(v) ? v : fallback;
  }
  function fmtPct(n) {
    const v = safe(n, 0);
    const sign = v >= 0 ? '+' : '';
    return sign + v.toFixed(2) + '%';
  }

  // ---------- Skeleton ----------
  function renderSkeleton() {
    grid.innerHTML = COINS.map(c => `
      <div class="glass price-card">
        <div class="coin-head">
          <div class="coin-logo ${c.cls}">${LOGOS[c.symbol]}</div>
          <div>
            <div class="coin-name">${c.name}</div>
            <div class="coin-tick">${c.symbol}</div>
          </div>
        </div>
        <div class="coin-price skeleton" style="width:60%; height:32px;">$${'$'.repeat(8)}</div>
        <div class="skeleton sk-line" style="width:50%;"></div>
        <div class="skeleton sk-line" style="width:40%;"></div>
      </div>
    `).join('');
  }

  // ---------- Render real cards ----------
  function renderCards(data) {
    grid.innerHTML = COINS.map(c => {
      const d = data && data[c.id];
      // Defensive fallbacks for missing/incomplete rows
      const price = d ? safe(d.usd, null) : null;
      const change = d ? safe(d.usd_24h_change, null) : null;
      const hasData = price !== null;

      if (!hasData) {
        return `
          <div class="glass price-card">
            <div class="coin-head">
              <div class="coin-logo ${c.cls}">${LOGOS[c.symbol]}</div>
              <div>
                <div class="coin-name">${c.name}</div>
                <div class="coin-tick">${c.symbol}</div>
              </div>
            </div>
            <div class="coin-price" data-target-price="">—</div>
            <div class="coin-change down">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <span>data unavailable</span>
            </div>
          </div>`;
      }

      const up    = (change || 0) >= 0;
      const arrow = up ? '▲' : '▼';

      return `
        <div class="glass price-card reveal in">
          <div class="coin-head">
            <div class="coin-logo ${c.cls}">${LOGOS[c.symbol]}</div>
            <div>
              <div class="coin-name">${c.name}</div>
              <div class="coin-tick">${c.symbol}</div>
            </div>
          </div>
          <div class="coin-price" data-target-price="${price}">$${fmtUsd(price)}</div>
          <div class="coin-change ${up ? 'up' : 'down'}">
            <span>${arrow}</span>
            <span>${fmtPct(change)}</span>
            <span style="color:var(--muted); margin-left:6px;">24h</span>
          </div>
        </div>`;
    }).join('');

    // Animated counters — only on real price elements with valid target
    grid.querySelectorAll('.coin-price').forEach(el => {
      const target = parseFloat(el.dataset.targetPrice);
      if (!isFinite(target) || target <= 0) return;  // <-- THE FIX: skip unavailable cards
      animatePrice(el, target);
    });
  }

  function animatePrice(el, target) {
    const start = 0;
    const dur = 1400;
    const t0 = performance.now();
    function frame(now) {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = start + (target - start) * eased;
      el.textContent = '$' + fmtUsd(v);
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = '$' + fmtUsd(target);
    }
    requestAnimationFrame(frame);
  }

  // ---------- Status ----------
  function setUpdated(date) {
    const t = date.toLocaleTimeString('en-US', { hour12: false });
    lastTxt.textContent = `Live · last update ${t}`;
  }

  // ---------- Retry countdown ----------
  let countdownTimer = null;
  let retryIn = 0;
  function clearCountdown() {
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
  }
  function showRetryCountdown(seconds, reason) {
    clearCountdown();
    retryIn = seconds;
    const tick = () => {
      if (retryIn <= 0) {
        errorBox.style.display = 'none';
        clearCountdown();
        fetchPrices();
        return;
      }
      errorMsg.textContent =
        `${reason} — auto-retrying in ${retryIn}s (or click Refresh).`;
      retryIn--;
    };
    tick();
    countdownTimer = setInterval(tick, 1000);
  }

  // ---------- Fetch ----------
  async function fetchPrices() {
    clearCountdown();                       // cancel any pending auto-retry
    refresh.classList.add('spinning');
    errorBox.style.display = 'none';
    renderSkeleton();

    try {
      // 8s hard timeout so we don't hang forever on a dead network
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);

      let res;
      try {
        res = await fetch(API, { cache: 'no-store', signal: ctrl.signal });
      } finally {
        clearTimeout(timer);
      }

      if (!res.ok) {
        if (res.status === 429) throw new Error('CoinGecko rate-limit (HTTP 429)');
        throw new Error('HTTP ' + res.status);
      }

      const json = await res.json();
      // sanity check — must contain at least one known coin
      const known = ['bitcoin','ethereum','solana','matic-network'];
      const anyKnown = known.some(k => json && json[k]);
      if (!anyKnown) throw new Error('Unrecognized response shape');

      renderCards(json);
      setUpdated(new Date());
    } catch (e) {
      grid.innerHTML = '';                  // clear skeletons
      renderCards({});                      // render "data unavailable" cards
      errorBox.style.display = 'flex';

      let reason = 'Could not fetch live prices';
      if (e && e.name === 'AbortError') reason = 'Request timed out (network slow)';
      else if (e && e.message)           reason = e.message;

      // Behave nicely: auto-retry for transient errors, manual-only for parse errors
      const transient = /429|timeout|network|fetch|abort/i.test(reason + (e && e.name || ''));
      if (transient) showRetryCountdown(20, reason);
      else errorMsg.textContent = reason + ' — click Refresh to try again.';
    } finally {
      setTimeout(() => refresh.classList.remove('spinning'), 600);
    }
  }

  refresh.addEventListener('click', fetchPrices);

  // initial load + 60s auto-refresh
  fetchPrices();
  setInterval(fetchPrices, 60000);
})();
