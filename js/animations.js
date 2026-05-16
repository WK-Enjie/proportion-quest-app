/* ═══════════════════════════════════════════════════════
   ProPortion Quest — Animations & Visual Effects
   Confetti, celebrations, score pops, screen transitions
═══════════════════════════════════════════════════════ */

const Animations = (() => {

  // ── COLOUR PALETTES ────────────────────────────────
  const CONFETTI_COLORS = [
    '#f5c842', '#4f8ef7', '#2ecc71', '#e74c3c',
    '#9b59b6', '#f39c12', '#1abc9c', '#e67e22',
    '#f74f8e', '#ffffff'
  ];

  const P1_COLORS = ['#4f8ef7', '#6c63ff', '#3498db', '#ffffff'];
  const P2_COLORS = ['#f74f8e', '#e74c3c', '#f39c12', '#ffffff'];

  // ── CONFETTI BURST ─────────────────────────────────
  function confettiBurst(count = 60, colors = CONFETTI_COLORS) {
    const container = document.getElementById('confetti-container');
    if (!container) return;

    container.innerHTML = '';

    for (let i = 0; i < count; i++) {
      const piece = document.createElement('div');
      const types = ['square', 'circle', 'triangle'];
      const type  = types[Math.floor(Math.random() * types.length)];

      piece.className = `confetti-piece ${type}`;

      const color = colors[Math.floor(Math.random() * colors.length)];
      const size  = Math.random() * 10 + 6;
      const left  = Math.random() * 100;
      const delay = Math.random() * 0.5;
      const dur   = Math.random() * 2 + 2;
      const drift = (Math.random() - 0.5) * 200;

      piece.style.cssText = `
        background: ${color};
        color: ${color};
        width: ${size}px;
        height: ${type === 'triangle' ? 0 : size + 'px'};
        left: ${left}%;
        animation: confettiFall ${dur}s ease ${delay}s forwards;
        transform: translateX(${drift}px);
      `;

      container.appendChild(piece);
    }

    // Clean up after animation
    setTimeout(() => {
      container.innerHTML = '';
    }, 3500);
  }

  // ── CELEBRATE (correct answer) ─────────────────────
  function celebrate(playerId) {
    const overlay = document.getElementById('celebration-overlay');
    const text    = document.getElementById('celebration-text');
    if (!overlay || !text) return;

    const colors    = playerId === 1 ? P1_COLORS : P2_COLORS;
    const player    = GameState.getPlayer(playerId);
    const messages  = [
      `🎉 Correct! Well done ${player.avatar}!`,
      `⚡ Brilliant! ${player.avatar}`,
      `🔥 Nailed it! ${player.avatar}`,
      `🌟 Excellent! ${player.avatar}`,
      `💫 Perfect! ${player.avatar}`,
      `🎯 Spot on! ${player.avatar}`
    ];

    text.textContent = messages[Math.floor(Math.random() * messages.length)];

    overlay.classList.remove('hidden');
    confettiBurst(50, colors);

    setTimeout(() => {
      overlay.classList.add('hidden');
    }, 1800);
  }

  // ── WRONG FLASH ────────────────────────────────────
  function wrongFlash() {
    const flash = document.getElementById('wrong-flash');
    if (!flash) return;

    flash.classList.remove('hidden');
    flash.style.animation = 'none';
    flash.offsetHeight;
    flash.style.animation = 'fadeInOut 0.8s ease forwards';

    setTimeout(() => {
      flash.classList.add('hidden');
    }, 900);
  }

  // ── SCREEN TRANSITION ──────────────────────────────
  function transitionTo(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });

    // Show target
    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active');
      target.style.animation = 'none';
      target.offsetHeight;
      target.style.animation = 'slideInUp 0.3s ease';
    }
  }

  // ── SCORE POP ──────────────────────────────────────
  function scorePop(x, y, points, isBonus = false) {
    const pop = document.createElement('div');
    pop.className = 'score-pop';
    pop.textContent = isBonus ? `⚡+${points}` : `+${points}`;
    pop.style.left  = `${x}px`;
    pop.style.top   = `${y}px`;
    pop.style.color = isBonus ? '#f39c12' : '#f5c842';
    document.body.appendChild(pop);
    setTimeout(() => pop.remove(), 1200);
  }

  // ── STAR REVEAL (level complete) ───────────────────
  function revealStars(count, containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    el.innerHTML = '';
    const delay = 400;

    for (let i = 0; i < 3; i++) {
      const star = document.createElement('span');
      star.className = 'star-appear';
      star.style.animationDelay = `${i * delay}ms`;
      star.style.display = 'inline-block';
      star.style.fontSize = '2.5rem';

      if (i < count) {
        star.textContent = '⭐';
        star.style.filter = 'drop-shadow(0 0 10px rgba(245,200,66,0.8))';
      } else {
        star.textContent = '☆';
        star.style.opacity = '0.3';
      }

      el.appendChild(star);

      // Confetti for each star earned
      if (i < count) {
        setTimeout(() => {
          confettiBurst(15, CONFETTI_COLORS);
        }, i * delay + 200);
      }
    }
  }

  // ── WORLD UNLOCK ───────────────────────────────────
  function worldUnlock(worldId) {
    const worldEl = document.getElementById(`world-${worldId}`);
    if (!worldEl) return;

    worldEl.classList.remove('locked');
    worldEl.classList.add('unlocked', 'just-unlocked');

    // Big celebration
    confettiBurst(80, CONFETTI_COLORS);

    // Toast
    const names = {
      2: '🪐 Proportion Planet',
      3: '🌋 Variable Volcano',
      4: '🏗️ Triple Trouble Tower',
      5: '⚔️ Boss Arena'
    };

    showToast(`🔓 Unlocked: ${names[worldId] || 'World ' + worldId}!`, 3000);

    setTimeout(() => {
      worldEl.classList.remove('just-unlocked');
    }, 1000);
  }

  // ── GENERIC TOAST ──────────────────────────────────
  function showToast(message, duration = 2500) {
    const toast = document.getElementById('powerup-toast');
    const text  = document.getElementById('powerup-toast-text');
    if (!toast || !text) return;

    text.textContent = message;
    toast.classList.remove('hidden');

    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      toast.classList.add('hidden');
    }, duration);
  }

  // ── HEART LOSS ANIMATION ───────────────────────────
  function animateHeartLoss(playerId) {
    const heartsEl = document.getElementById(`hud-p${playerId}-hearts`);
    if (!heartsEl) return;
    heartsEl.style.animation = 'none';
    heartsEl.offsetHeight;
    heartsEl.style.animation = 'heartbeat 0.6s ease';
    heartsEl.style.color = '#e74c3c';
    setTimeout(() => {
      heartsEl.style.color = '';
    }, 800);
  }

  // ── SCORE COUNTER (animated number roll) ───────────
  function animateScore(elementId, fromVal, toVal, duration = 800) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const startTime = performance.now();
    const diff = toVal - fromVal;

    function update(currentTime) {
      const elapsed  = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress);
      const current = Math.round(fromVal + diff * eased);

      el.textContent = current.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  // ── PULSE ELEMENT ──────────────────────────────────
  function pulse(elementId, color = '#f5c842') {
    const el = document.getElementById(elementId);
    if (!el) return;

    const originalBg = el.style.background;
    el.style.transition = 'background 0.15s ease';
    el.style.background = color;
    setTimeout(() => {
      el.style.background = originalBg;
    }, 300);
  }

  // ── SHAKE ELEMENT ──────────────────────────────────
  function shake(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = 'shake 0.4s ease';
    setTimeout(() => el.style.animation = '', 500);
  }

  // ── BOUNCE ELEMENT ─────────────────────────────────
  function bounce(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.style.animation = 'none';
    el.offsetHeight;
    el.style.animation = 'bounceIn 0.5s ease';
  }

  // ── FIREWORKS (level complete) ─────────────────────
  function fireworks(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const burst = () => {
      confettiBurst(40, CONFETTI_COLORS);
    };

    burst();
    setTimeout(burst, 600);
    setTimeout(burst, 1200);
    setTimeout(burst, 1800);
  }

  // ── BOSS ENTRANCE ──────────────────────────────────
  function bossEntrance() {
    // Red flash across screen
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(231,76,60,0.5);
      z-index: 9999;
      pointer-events: none;
      animation: fadeInOut 0.6s ease forwards;
    `;
    document.body.appendChild(flash);

    // Shake the screen
    document.body.style.animation = 'shake 0.4s ease';

    setTimeout(() => {
      flash.remove();
      document.body.style.animation = '';
    }, 700);

    showToast('⚔️ BOSS LEVEL! Double points on offer!', 3000);
  }

  // ── COUNTDOWN ──────────────────────────────────────
  function countdown(from = 3, onComplete) {
    let count = from;

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.7);
      z-index: 200;
      font-size: 8rem;
      font-weight: 900;
      color: #f5c842;
    `;
    document.body.appendChild(overlay);

    const tick = () => {
      if (count <= 0) {
        overlay.textContent = 'GO! 🚀';
        setTimeout(() => {
          overlay.remove();
          if (typeof onComplete === 'function') onComplete();
        }, 600);
        return;
      }
      overlay.textContent = count;
      overlay.style.animation = 'none';
      overlay.offsetHeight;
      overlay.style.animation = 'bounceIn 0.4s ease';
      count--;
      setTimeout(tick, 800);
    };

    tick();
  }

  // ── LEVEL TRANSITION ───────────────────────────────
  function levelTransition(worldNum, levelNum, onComplete) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      z-index: 300;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
    `;

    const worldIcons = { 1:'🌱', 2:'🪐', 3:'🌋', 4:'🏗️', 5:'⚔️' };
    const worldNames = {
      1:'Ratio Realm', 2:'Proportion Planet',
      3:'Variable Volcano', 4:'Triple Trouble', 5:'Boss Arena'
    };

    overlay.innerHTML = `
      <div style="font-size:5rem;animation:bounceIn 0.5s ease">
        ${worldIcons[worldNum] || '🎮'}
      </div>
      <div style="font-size:1.5rem;font-weight:900;color:#f5c842">
        World ${worldNum}: ${worldNames[worldNum]}
      </div>
      <div style="font-size:1rem;opacity:0.7">Level ${levelNum}</div>
      <div style="font-size:2rem;margin-top:20px">
        Get Ready! 🚀
      </div>
    `;
    document.body.appendChild(overlay);

    confettiBurst(30, CONFETTI_COLORS);

    setTimeout(() => {
      overlay.style.transition = 'opacity 0.5s ease';
      overlay.style.opacity    = '0';
      setTimeout(() => {
        overlay.remove();
        if (typeof onComplete === 'function') onComplete();
      }, 500);
    }, 2000);
  }

  // ── PUBLIC API ─────────────────────────────────────
  return {
    celebrate,
    wrongFlash,
    confettiBurst,
    transitionTo,
    scorePop,
    revealStars,
    worldUnlock,
    showToast,
    animateHeartLoss,
    animateScore,
    pulse,
    shake,
    bounce,
    fireworks,
    bossEntrance,
    countdown,
    levelTransition
  };

})();