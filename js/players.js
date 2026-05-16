/* ═══════════════════════════════════════════════════════
   ProPortion Quest — Player System
   Handles player setup, power-up logic, display
═══════════════════════════════════════════════════════ */

const Players = (() => {

  // ── POWER-UP DEFINITIONS ──────────────────────────
  const POWERUP_DEFS = {
    freeze: {
      id:     'freeze',
      icon:   '⏰',
      name:   'Time Freeze',
      desc:   'Adds 15 seconds to the timer',
      color:  '#3498db'
    },
    hint: {
      id:     'hint',
      icon:   '💡',
      name:   'Hint',
      desc:   'Eliminates 2 wrong answer choices',
      color:  '#f39c12'
    },
    double: {
      id:     'double',
      icon:   '💣',
      name:   'Double Down',
      desc:   'Doubles your points this round',
      color:  '#e74c3c'
    },
    shield: {
      id:     'shield',
      icon:   '🛡️',
      name:   'Shield',
      desc:   'Blocks next heart loss',
      color:  '#2ecc71'
    }
  };

  // ── AVATAR SETS ───────────────────────────────────
  const AVATARS = {
    p1: ['🧑‍🎓','🦸','🧙','🤖','🐉','🦊','🐼','🚀'],
    p2: ['👩‍🏫','🧑‍🏫','🧝','🦉','🐯','🦁','🐸','⭐']
  };

  // ── RANK TITLES ───────────────────────────────────
  const RANKS = [
    { min: 0,    title: '📚 Ratio Rookie',     badge: '🥉' },
    { min: 200,  title: '🔢 Number Ninja',      badge: '🥈' },
    { min: 500,  title: '📐 Proportion Pro',    badge: '🥇' },
    { min: 900,  title: '🧮 Equation Expert',   badge: '🏆' },
    { min: 1400, title: '🌟 Proportion Master', badge: '👑' }
  ];

  // ── GET RANK ──────────────────────────────────────
  function getRank(totalScore) {
    let rank = RANKS[0];
    for (const r of RANKS) {
      if (totalScore >= r.min) rank = r;
    }
    return rank;
  }

  // ── APPLY POWER-UP ────────────────────────────────
  function applyPowerUp(playerId, puType) {
    const player = GameState.getPlayer(playerId);
    const pu = player.powerUps[puType];

    if (!pu || pu.count <= 0) {
      showPowerUpToast('❌ No more ' + POWERUP_DEFS[puType].name + ' left!');
      return false;
    }

    // Check if it's the active player's turn
    if (GameState.get('currentTurn') !== playerId) {
      showPowerUpToast('⚠️ Wait for your turn!');
      return false;
    }

    const success = GameState.usePowerUp(playerId, puType);
    if (success) {
      const def = POWERUP_DEFS[puType];
      showPowerUpToast(`${def.icon} ${def.name} activated!`);
      animatePowerUpButton(playerId, puType);

      // Special handling
      if (puType === 'hint') {
        applyHint();
      }
    }
    return success;
  }

  // ── HINT: ELIMINATE 2 WRONG ANSWERS ───────────────
  function applyHint() {
    const question = GameState.get('currentQuestion');
    if (!question) return;

    const correctIndex = question.correctIndex;
    const buttons = document.querySelectorAll('.answer-btn');
    const wrongIndices = [];

    buttons.forEach((btn, i) => {
      if (i !== correctIndex && !btn.classList.contains('eliminated')) {
        wrongIndices.push(i);
      }
    });

    // Randomly eliminate 2 wrong answers
    const toEliminate = wrongIndices
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);

    toEliminate.forEach(i => {
      if (buttons[i]) {
        buttons[i].classList.add('eliminated');
        // Animate removal
        buttons[i].style.transition = 'all 0.3s ease';
        buttons[i].style.opacity = '0.2';
        buttons[i].style.textDecoration = 'line-through';
      }
    });
  }

  // ── POWER-UP TOAST ────────────────────────────────
  function showPowerUpToast(message) {
    const toast = document.getElementById('powerup-toast');
    const text  = document.getElementById('powerup-toast-text');
    if (!toast || !text) return;

    text.textContent = message;
    toast.classList.remove('hidden');

    clearTimeout(toast._hideTimeout);
    toast._hideTimeout = setTimeout(() => {
      toast.classList.add('hidden');
    }, 2500);
  }

  // ── ANIMATE POWER-UP BUTTON ───────────────────────
  function animatePowerUpButton(playerId, puType) {
    const btn = document.querySelector(
      `.pu-btn[data-pu="${puType}"][data-player="${playerId}"]`
    );
    if (!btn) return;
    btn.classList.add('activating');
    setTimeout(() => {
      btn.classList.remove('activating');
      const playerState = GameState.getPlayer(playerId);
      if (playerState.powerUps[puType].count <= 0) {
        btn.classList.add('used');
      }
    }, 400);
  }

  // ── UPDATE HUD ────────────────────────────────────
  function updateHUD(playerId) {
    const player = GameState.getPlayer(playerId);
    const prefix = `hud-p${playerId}`;

    // Avatar & Name
    const avatarEl = document.getElementById(`${prefix}-avatar`);
    const nameEl   = document.getElementById(`${prefix}-name`);
    const scoreEl  = document.getElementById(`${prefix}-score`);
    const heartsEl = document.getElementById(`${prefix}-hearts`);

    if (avatarEl) avatarEl.textContent = player.avatar;
    if (nameEl)   nameEl.textContent   = player.name;
    if (scoreEl) {
      scoreEl.textContent = player.score.toLocaleString();
    }
    if (heartsEl) {
      heartsEl.textContent = renderHearts(player.hearts, player.maxHearts);
    }

    // Power-up buttons
    Object.keys(player.powerUps).forEach(puType => {
      const pu  = player.powerUps[puType];
      const btn = document.querySelector(
        `.pu-btn[data-pu="${puType}"][data-player="${playerId}"]`
      );
      if (!btn) return;
      if (pu.count <= 0) {
        btn.classList.add('used');
      } else {
        btn.classList.remove('used');
        // Show count
        const def = POWERUP_DEFS[puType];
        btn.title = `${def.name} (${pu.count} left) — ${def.desc}`;
        // Badge count
        btn.setAttribute('data-count', pu.count);
      }
    });
  }

  // ── RENDER HEARTS ─────────────────────────────────
  function renderHearts(current, max) {
    let str = '';
    for (let i = 0; i < max; i++) {
      str += i < current ? '❤️' : '🖤';
    }
    return str;
  }

  // ── SCORE POP ANIMATION ───────────────────────────
  function showScorePop(playerId, points) {
    const hudEl = document.getElementById(`hud-p${playerId}`);
    if (!hudEl) return;

    const pop = document.createElement('div');
    pop.className = 'score-pop';
    pop.textContent = `+${points}`;

    const rect = hudEl.getBoundingClientRect();
    pop.style.left = `${rect.left + rect.width / 2}px`;
    pop.style.top  = `${rect.top}px`;
    document.body.appendChild(pop);

    setTimeout(() => pop.remove(), 1000);
  }

  // ── HIGHLIGHT ACTIVE PLAYER ───────────────────────
  function highlightActivePlayer(playerId) {
    [1, 2].forEach(id => {
      const hudEl = document.getElementById(`hud-p${id}`);
      if (!hudEl) return;
      hudEl.classList.remove('active-player');
    });
    const activeHud = document.getElementById(`hud-p${playerId}`);
    if (activeHud) {
      activeHud.classList.add('active-player');
    }

    // Update turn indicator
    const turnIndicator = document.getElementById('turn-indicator');
    if (turnIndicator) {
      const player = GameState.getPlayer(playerId);
      turnIndicator.textContent = `${player.avatar} ${player.name}'s Turn`;
      turnIndicator.style.background = playerId === 1 ? '#4f8ef7' : '#f74f8e';
    }
  }

  // ── BUILD PLAYER SETUP SCREEN ─────────────────────
  function initSetupScreen() {
    // Avatar pickers
    [1, 2].forEach(id => {
      const picker = document.getElementById(`avatar-picker-${id}`);
      if (!picker) return;

      picker.querySelectorAll('.avatar-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          picker.querySelectorAll('.avatar-btn').forEach(b => {
            b.classList.remove('selected');
          });
          btn.classList.add('selected');
          GameState.setPlayerAvatar(id, btn.dataset.avatar);
        });
      });
    });

    // Name inputs
    const p1Input = document.getElementById('p1-name');
    const p2Input = document.getElementById('p2-name');

    if (p1Input) {
      p1Input.addEventListener('input', () => {
        GameState.setPlayerName(1, p1Input.value);
      });
      p1Input.addEventListener('focus', () => {
        p1Input.parentElement.classList.add('focused');
      });
    }

    if (p2Input) {
      p2Input.addEventListener('input', () => {
        GameState.setPlayerName(2, p2Input.value);
      });
    }
  }

  // ── SCORE SUMMARY ─────────────────────────────────
  function buildScoreSummary(playerId) {
    const player = GameState.getPlayer(playerId);
    const rank   = getRank(player.totalScore);
    const accuracy = player.correctAnswers + player.wrongAnswers > 0
      ? Math.round(player.correctAnswers /
          (player.correctAnswers + player.wrongAnswers) * 100)
      : 0;

    return {
      name:     player.name,
      avatar:   player.avatar,
      score:    player.score,
      total:    player.totalScore,
      rank:     rank,
      accuracy: accuracy,
      streak:   player.maxStreak
    };
  }

  // ── LEADERBOARD ───────────────────────────────────
  function buildLeaderboard(type = 'session') {
    const history = GameState.get('sessionHistory');
    const lbEl    = document.getElementById('lb-list');
    if (!lbEl) return;

    if (!history || history.length === 0) {
      lbEl.innerHTML = `
        <div style="text-align:center;opacity:0.5;padding:40px;">
          No games played yet!<br>Play your first battle to see scores here.
        </div>`;
      return;
    }

    // Aggregate by player name
    const map = {};
    history.forEach(record => {
      [record.p1, record.p2].forEach(p => {
        if (!map[p.name]) {
          map[p.name] = { name: p.name, avatar: p.avatar, total: 0, games: 0 };
        }
        map[p.name].total += p.score;
        map[p.name].games++;
      });
    });

    const sorted = Object.values(map).sort((a, b) => b.total - a.total);

    lbEl.innerHTML = sorted.map((entry, i) => {
      const medals = ['🥇','🥈','🥉'];
      const medal  = medals[i] || `${i+1}.`;
      const rank   = getRank(entry.total);
      return `
        <div class="lb-entry slide-up" style="animation-delay:${i*0.1}s">
          <div class="lb-rank ${i===0?'gold':i===1?'silver':i===2?'bronze':''}">${medal}</div>
          <div style="font-size:1.5rem">${entry.avatar}</div>
          <div class="lb-info">
            <div class="lb-name">${entry.name}</div>
            <div class="lb-detail">${rank.title} · ${entry.games} game${entry.games!==1?'s':''}</div>
          </div>
          <div class="lb-score">${entry.total.toLocaleString()}</div>
        </div>`;
    }).join('');
  }

  // ── PUBLIC API ────────────────────────────────────
  return {
    POWERUP_DEFS,
    AVATARS,
    getRank,
    applyPowerUp,
    applyHint,
    updateHUD,
    renderHearts,
    showScorePop,
    highlightActivePlayer,
    initSetupScreen,
    buildScoreSummary,
    buildLeaderboard
  };

})();