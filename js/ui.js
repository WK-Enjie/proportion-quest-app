/* ═══════════════════════════════════════════════════════
   ProPortion Quest — UI Manager
   Handles all screen transitions, renders, and DOM updates
═══════════════════════════════════════════════════════ */

const UI = (() => {

  // ── CURRENT SCREEN TRACKER ─────────────────────────
  let _currentScreen = 'splash';

  // ── NAVIGATE TO SCREEN ─────────────────────────────
  function showScreen(screenId) {
    const prev = document.getElementById(`screen-${_currentScreen}`);
    const next = document.getElementById(`screen-${screenId}`);

    if (!next) {
      console.warn(`Screen not found: screen-${screenId}`);
      return;
    }

    if (prev) prev.classList.remove('active');

    next.classList.add('active');
    next.style.animation = 'none';
    next.offsetHeight;
    next.style.animation = 'slideInUp 0.3s ease';

    _currentScreen = screenId;
    GameState.set('currentScreen', screenId);
  }

  // ── SPLASH SCREEN ──────────────────────────────────
  function initSplash() {
    // Start button
    _on('btn-start-game', 'click', () => {
      showScreen('setup');
      Players.initSetupScreen();
    });

    // How to play
    _on('btn-how-to-play', 'click', () => {
      showScreen('howtoplay');
    });

    // Leaderboard
    _on('btn-leaderboard-splash', 'click', () => {
      Players.buildLeaderboard('session');
      showScreen('leaderboard');
    });
  }

  // ── HOW TO PLAY ────────────────────────────────────
  function initHowToPlay() {
    _on('btn-back-htp', 'click', () => showScreen('splash'));
    _on('btn-htp-play', 'click', () => {
      showScreen('setup');
      Players.initSetupScreen();
    });
  }

  // ── SETUP SCREEN ───────────────────────────────────
  function initSetup() {
    _on('btn-back-setup', 'click', () => showScreen('splash'));

    _on('btn-go-worldmap', 'click', () => {
      // Validate names
      const p1Name = document.getElementById('p1-name')?.value.trim();
      const p2Name = document.getElementById('p2-name')?.value.trim();

      if (p1Name) GameState.setPlayerName(1, p1Name);
      if (p2Name) GameState.setPlayerName(2, p2Name);

      // Default names if empty
      if (!GameState.getPlayer(1).name || GameState.getPlayer(1).name === 'Player 1') {
        if (!p1Name) GameState.setPlayerName(1, 'Player 1');
      }
      if (!GameState.getPlayer(2).name || GameState.getPlayer(2).name === 'Player 2') {
        if (!p2Name) GameState.setPlayerName(2, 'Player 2');
      }

      showScreen('worldmap');
      renderWorldMap();
      updateWorldMapScores();
    });
  }

  // ── WORLD MAP ──────────────────────────────────────
  function initWorldMap() {
    _on('btn-back-worldmap', 'click', () => showScreen('setup'));

    // World node clicks
    document.querySelectorAll('.world-node').forEach(node => {
      node.addEventListener('click', () => {
        const worldId = parseInt(node.dataset.world);
        const player1 = GameState.getPlayer(1);

        if (!player1.worldProgress[worldId].unlocked) {
          Animations.shake('world-' + worldId);
          Animations.showToast('🔒 Complete the previous world first!', 2000);
          return;
        }

        // Show level picker
        showLevelPicker(worldId);
      });
    });

    // Level dots
    document.querySelectorAll('.level-dot').forEach(dot => {
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        const worldId = parseInt(dot.closest('.world-node').dataset.world);
        const levelId = parseInt(dot.dataset.level);
        const player1 = GameState.getPlayer(1);

        if (!player1.worldProgress[worldId].unlocked) {
          Animations.showToast('🔒 Unlock this world first!', 2000);
          return;
        }

        startLevel(worldId, levelId);
      });
    });
  }

  function renderWorldMap() {
    const player1 = GameState.getPlayer(1);

    [1,2,3,4,5].forEach(worldId => {
      const worldEl = document.getElementById(`world-${worldId}`);
      if (!worldEl) return;

      const progress = player1.worldProgress[worldId];

      // Unlock state
      if (progress.unlocked) {
        worldEl.classList.remove('locked');
        worldEl.classList.add('unlocked');
      } else {
        worldEl.classList.add('locked');
        worldEl.classList.remove('unlocked');
      }

      // Stars
      const starsEl = document.getElementById(`stars-${worldId}`);
      if (starsEl) {
        let starsStr = '';
        for (let i = 0; i < 3; i++) {
          starsStr += i < progress.stars ? '⭐' : '☆';
        }
        starsEl.textContent = starsStr;
      }

      // Level dots
      const dots = worldEl.querySelectorAll('.level-dot');
      dots.forEach(dot => {
        const levelId = parseInt(dot.dataset.level);
        dot.classList.remove('complete', 'active');
        if (progress.levelsComplete.includes(levelId)) {
          dot.classList.add('complete');
          dot.textContent = '✓';
        } else if (progress.unlocked) {
          dot.classList.add('active');
        }
      });
    });
  }

  function updateWorldMapScores() {
    const p1 = GameState.getPlayer(1);
    const p2 = GameState.getPlayer(2);
    const p1El = document.getElementById('wm-p1-score');
    const p2El = document.getElementById('wm-p2-score');
    if (p1El) p1El.textContent = `${p1.avatar} ${p1.name}: ${p1.totalScore}`;
    if (p2El) p2El.textContent = `${p2.avatar} ${p2.name}: ${p2.totalScore}`;
  }

  // ── LEVEL PICKER MODAL ─────────────────────────────
  function showLevelPicker(worldId) {
    const worldNames = {
      1:'Ratio Realm', 2:'Proportion Planet',
      3:'Variable Volcano', 4:'Triple Trouble Tower', 5:'Boss Arena'
    };
    const worldIcons = { 1:'🌱', 2:'🪐', 3:'🌋', 4:'🏗️', 5:'⚔️' };
    const player1    = GameState.getPlayer(1);
    const progress   = player1.worldProgress[worldId];

    const modal = document.createElement('div');
    modal.id    = 'level-picker-modal';
    modal.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.85);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    `;

    const levelDescs = {
      1: 'Basics & Identification',
      2: 'Forming Equations',
      3: 'Challenge Round'
    };

    modal.innerHTML = `
      <div style="
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        border: 2px solid rgba(255,255,255,0.2);
        border-radius: 24px;
        padding: 24px;
        width: 100%;
        max-width: 380px;
        text-align: center;
      ">
        <div style="font-size:3rem;margin-bottom:8px">
          ${worldIcons[worldId]}
        </div>
        <h3 style="font-size:1.3rem;font-weight:900;color:#f5c842;margin-bottom:4px">
          World ${worldId}: ${worldNames[worldId]}
        </h3>
        <p style="font-size:0.85rem;opacity:0.6;margin-bottom:20px">
          Choose a level
        </p>

        <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px">
          ${[1,2,3].map(lvl => {
            const done = progress.levelsComplete.includes(lvl);
            return `
              <button
                onclick="UI.startLevel(${worldId}, ${lvl}); document.getElementById('level-picker-modal').remove();"
                style="
                  background: ${done ? 'rgba(46,204,113,0.2)' : 'rgba(255,255,255,0.08)'};
                  border: 2px solid ${done ? 'rgba(46,204,113,0.5)' : 'rgba(255,255,255,0.15)'};
                  border-radius: 16px;
                  padding: 16px;
                  color: white;
                  font-size: 1rem;
                  font-weight: 700;
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  width: 100%;
                "
              >
                <span>Level ${lvl}: ${levelDescs[lvl]}</span>
                <span>${done ? '✅' : '▶'}</span>
              </button>
            `;
          }).join('')}
        </div>

        <button
          onclick="document.getElementById('level-picker-modal').remove()"
          style="
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 12px;
            padding: 12px 24px;
            color: white;
            font-size: 0.9rem;
            cursor: pointer;
            width: 100%;
          "
        >
          ← Back to Map
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  // ── START LEVEL ────────────────────────────────────
  function startLevel(worldId, levelId) {
    // Remove any lingering modals
    document.getElementById('level-picker-modal')?.remove();

    // Boss world intro
    if (worldId === 5) {
      Animations.bossEntrance();
    }

    // Set state
    GameState.setWorld(worldId, levelId);
    GameState.resetLevel();

    // Transition animation
    Animations.levelTransition(worldId, levelId, () => {
      showScreen('game');
      _initGameScreen(worldId, levelId);
    });
  }

  // ── GAME SCREEN ────────────────────────────────────
  function _initGameScreen(worldId, levelId) {
    // Update HUD with player info
    Players.updateHUD(1);
    Players.updateHUD(2);
    Players.highlightActivePlayer(1);

    // Setup answer listeners (once)
    QuestionEngine.setupAnswerListeners();

    // Update world indicator
    const worldIndicator = document.getElementById('world-indicator');
    const worldIcons = { 1:'🌱', 2:'🪐', 3:'🌋', 4:'🏗️', 5:'⚔️' };
    const worldNames = {
      1:'Ratio Realm', 2:'Proportion Planet',
      3:'Variable Volcano', 4:'Triple Trouble', 5:'Boss Arena'
    };
    if (worldIndicator) {
      worldIndicator.textContent =
        `${worldIcons[worldId]} W${worldId}-L${levelId}`;
    }

    // Back button — asks confirmation
    _on('btn-back-worldmap', 'click', () => {
      if (confirm('Leave this level? Progress will be lost.')) {
        QuestionEngine.stopTimer();
        showScreen('worldmap');
        renderWorldMap();
      }
    });

    // Init question engine
    Animations.countdown(3, () => {
      QuestionEngine.initLevel(worldId, levelId);
    });
  }

  // ── LEVEL COMPLETE SCREEN ──────────────────────────
  function showLevelComplete(stars, world, level) {
    const p1 = GameState.getPlayer(1);
    const p2 = GameState.getPlayer(2);

    // Determine winner
    const p1Wins = p1.score >= p2.score;

    // Update level complete screen
    _setText('lc-title', stars === 3 ? '🏆 Perfect Round!' :
                          stars === 2 ? '🎉 Great Work!' :
                          stars === 1 ? '👍 Level Complete!' : '💪 Keep Practising!');

    // Player info
    _setText('lc-p1-avatar', p1.avatar);
    _setText('lc-p1-name',   p1.name);
    _setText('lc-p2-avatar', p2.avatar);
    _setText('lc-p2-name',   p2.name);

    // Animate scores
    const p1ScoreEl = document.getElementById('lc-p1-score');
    const p2ScoreEl = document.getElementById('lc-p2-score');
    if (p1ScoreEl) Animations.animateScore('lc-p1-score', 0, p1.score);
    if (p2ScoreEl) Animations.animateScore('lc-p2-score', 0, p2.score);

    // Badges
    const p1Rank = Players.getRank(p1.totalScore);
    const p2Rank = Players.getRank(p2.totalScore);
    _setText('lc-p1-badge', p1Wins
      ? `👑 Winner! ${p1Rank.badge}`
      : p1Rank.title);
    _setText('lc-p2-badge', !p1Wins
      ? `👑 Winner! ${p2Rank.badge}`
      : p2Rank.title);

    // Highlight winner card
    const p1Card = document.querySelector('.lc-score-card.p1-card');
    const p2Card = document.querySelector('.lc-score-card.p2-card');
    if (p1Wins && p1Card) {
      p1Card.style.borderColor = '#f5c842';
      p1Card.style.boxShadow   = '0 0 20px rgba(245,200,66,0.4)';
    } else if (p2Card) {
      p2Card.style.borderColor = '#f5c842';
      p2Card.style.boxShadow   = '0 0 20px rgba(245,200,66,0.4)';
    }

    // Concept summary
    const summary = QuestionBank.getConceptSummary(world, level);
    _setText('lc-concept-summary', summary);

    // Stars
    Animations.revealStars(stars, 'lc-stars');

    // Fireworks
    setTimeout(() => Animations.fireworks('lc-fireworks'), 300);

    // Button handlers
    _on('btn-retry-level', 'click', () => {
      startLevel(world, level);
    });

    _on('btn-next-level', 'click', () => {
      const nextLevel = level + 1;
      const nextWorld = world + 1;

      if (nextLevel <= 3) {
        startLevel(world, nextLevel);
      } else if (nextWorld <= 5 &&
                 GameState.getPlayer(1).worldProgress[nextWorld].unlocked) {
        startLevel(nextWorld, 1);
      } else {
        // All done or next world locked
        showScreen('worldmap');
        renderWorldMap();
        updateWorldMapScores();
        if (nextWorld <= 5) {
          Animations.worldUnlock(nextWorld);
        }
      }
    });

    _on('btn-back-to-map', 'click', () => {
      showScreen('worldmap');
      renderWorldMap();
      updateWorldMapScores();
    });

    // Reset winner styles on re-render
    if (p1Card) { p1Card.style.borderColor = ''; p1Card.style.boxShadow = ''; }
    if (p2Card) { p2Card.style.borderColor = ''; p2Card.style.boxShadow = ''; }

    showScreen('levelcomplete');
  }

  // ── LEADERBOARD ────────────────────────────────────
  function initLeaderboard() {
    _on('btn-back-lb', 'click', () => showScreen('splash'));

    document.querySelectorAll('.lb-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.lb-tab').forEach(t => {
          t.classList.remove('active');
        });
        tab.classList.add('active');
        Players.buildLeaderboard(tab.dataset.tab);
      });
    });
  }

  // ── MINI-GAME SCREEN ───────────────────────────────
  function showMiniGame(gameType, world, onComplete) {
    const container = document.getElementById('minigame-container');
    const title     = document.getElementById('minigame-title');
    if (!container || !title) {
      if (typeof onComplete === 'function') onComplete();
      return;
    }

    showScreen('minigame');

    switch (gameType) {
      case 'slider':
        _buildSliderGame(container, title, world, onComplete);
        break;
      case 'graphMatch':
        _buildGraphMatchGame(container, title, world, onComplete);
        break;
      case 'raceCalc':
        _buildRaceCalcGame(container, title, world, onComplete);
        break;
      default:
        if (typeof onComplete === 'function') onComplete();
    }
  }

  // ── MINI-GAME: SLIDER ──────────────────────────────
  function _buildSliderGame(container, title, world, onComplete) {
    title.textContent = '⚡ Slider Challenge!';

    // Generate random direct proportion question
    const k      = Math.floor(Math.random() * 5) + 2;
    const xVal   = Math.floor(Math.random() * 8) + 2;
    const answer = k * xVal;
    const maxVal = answer * 2;

    container.innerHTML = `
      <div style="padding:20px;text-align:center">
        <div style="
          background:rgba(255,255,255,0.1);
          border-radius:16px;
          padding:24px;
          margin-bottom:20px;
        ">
          <p style="font-size:1.1rem;margin-bottom:8px;opacity:0.8">
            ⚡ Quick Fire Round!
          </p>
          <p style="font-size:1.3rem;font-weight:700;margin-bottom:20px">
            y = ${k}x. Find y when x = ${xVal}
          </p>
          <div style="font-size:3rem;font-weight:900;color:#f5c842;margin:16px 0"
               id="slider-display">
            ${Math.round(maxVal/2)}
          </div>
          <input
            type="range"
            id="mg-slider"
            min="0"
            max="${maxVal}"
            value="${Math.round(maxVal/2)}"
            step="1"
            style="
              width:100%;
              height:12px;
              border-radius:6px;
              outline:none;
              cursor:pointer;
              accent-color:#4f8ef7;
              margin:10px 0;
            "
          />
          <div style="display:flex;justify-content:space-between;
                      font-size:0.75rem;opacity:0.5;margin-bottom:16px">
            <span>0</span>
            <span>${maxVal}</span>
          </div>
          <button
            id="mg-confirm"
            style="
              background:linear-gradient(135deg,#4f8ef7,#6c63ff);
              border:none;
              border-radius:16px;
              padding:16px 40px;
              color:white;
              font-size:1.1rem;
              font-weight:700;
              cursor:pointer;
              width:100%;
            "
          >
            ✅ Lock In Answer!
          </button>
        </div>

        <div id="mg-result" style="display:none;margin-top:16px"></div>

        <div style="opacity:0.4;font-size:0.8rem;margin-top:16px">
          Slide to your answer, then tap Lock In!
        </div>
      </div>
    `;

    // Live slider update
    const slider  = document.getElementById('mg-slider');
    const display = document.getElementById('slider-display');
    if (slider && display) {
      slider.addEventListener('input', () => {
        display.textContent = slider.value;
        const pct = (slider.value / maxVal) * 100;
        display.style.color = Math.abs(slider.value - answer) <= 2
          ? '#2ecc71' : '#f5c842';
      });
    }

    // Confirm button
    const confirmBtn = document.getElementById('mg-confirm');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        const chosen  = parseInt(slider.value);
        const correct = chosen === answer;
        const close   = Math.abs(chosen - answer) <= 1;

        const resultEl = document.getElementById('mg-result');
        if (resultEl) {
          resultEl.style.display = 'block';

          if (correct) {
            resultEl.innerHTML = `
              <div style="color:#2ecc71;font-size:1.3rem;font-weight:900">
                🎉 Perfect! y = ${answer}
              </div>`;
            // Award bonus
            const currentPlayer = GameState.get('currentTurn');
            GameState.addScore(currentPlayer, 50);
            Players.updateHUD(1);
            Players.updateHUD(2);
            Animations.celebrate(currentPlayer);
          } else if (close) {
            resultEl.innerHTML = `
              <div style="color:#f39c12;font-size:1.1rem;font-weight:700">
                🤏 So close! Answer was ${answer}. You got ${chosen}. +10 pts!
              </div>`;
            const currentPlayer = GameState.get('currentTurn');
            GameState.addScore(currentPlayer, 10);
          } else {
            resultEl.innerHTML = `
              <div style="color:#e74c3c;font-size:1.1rem;font-weight:700">
                ❌ Not quite! y = ${k} × ${xVal} = ${answer}
              </div>`;
            Animations.wrongFlash();
          }
        }

        confirmBtn.textContent = '▶ Continue →';
        confirmBtn.onclick     = () => {
          showScreen('game');
          if (typeof onComplete === 'function') onComplete();
        };
      });
    }
  }

  // ── MINI-GAME: GRAPH MATCH ─────────────────────────
  function _buildGraphMatchGame(container, title, world, onComplete) {
    title.textContent = '📊 Graph Match Challenge!';

    const questions = [
      {
        equation: 'y = 3x',
        type:     'direct',
        desc:     'Straight line through origin, slope upward',
        correct:  0
      },
      {
        equation: 'y = 12/x',
        type:     'inverse',
        desc:     'Curve that goes down as x increases',
        correct:  1
      },
      {
        equation: 'y = 2x²',
        type:     'quadratic',
        desc:     'U-shaped curve starting from origin',
        correct:  2
      }
    ];

    const q = questions[Math.floor(Math.random() * questions.length)];
    const options = [
      { label: '📈 Straight line through (0,0)', type: 'direct' },
      { label: '📉 Hyperbola — curves down', type: 'inverse' },
      { label: '📐 Parabola — U-shaped curve', type: 'quadratic' },
      { label: '➡️ Horizontal flat line', type: 'none' }
    ];

    // Shuffle options keeping track of correct
    const shuffled  = [...options].sort(() => Math.random() - 0.5);
    const corrIdx   = shuffled.findIndex(o => o.type === q.type);

    container.innerHTML = `
      <div style="padding:20px">
        <div style="
          background:rgba(255,255,255,0.08);
          border-radius:16px;
          padding:24px;
          text-align:center;
          margin-bottom:16px;
        ">
          <p style="font-size:0.9rem;opacity:0.7;margin-bottom:8px">
            Which graph shape shows:
          </p>
          <div style="
            font-size:1.8rem;
            font-weight:900;
            color:#f5c842;
            margin-bottom:8px;
          ">
            ${q.equation}
          </div>
          <p style="font-size:0.8rem;opacity:0.5">
            Tap the correct graph shape!
          </p>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px">
          ${shuffled.map((opt, i) => `
            <button
              class="mg-graph-btn"
              data-index="${i}"
              style="
                background: rgba(255,255,255,0.08);
                border: 2px solid rgba(255,255,255,0.15);
                border-radius:14px;
                padding:16px;
                color:white;
                font-size:1rem;
                font-weight:600;
                text-align:left;
                cursor:pointer;
                transition: all 0.2s;
              "
            >
              ${opt.label}
            </button>
          `).join('')}
        </div>

        <div id="mg-graph-result" style="
          display:none;
          margin-top:16px;
          text-align:center;
          padding:16px;
          border-radius:12px;
        "></div>
      </div>
    `;

    // Button handlers
    document.querySelectorAll('.mg-graph-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const chosen  = parseInt(btn.dataset.index);
        const correct = chosen === corrIdx;

        // Disable all
        document.querySelectorAll('.mg-graph-btn').forEach((b, i) => {
          b.style.pointerEvents = 'none';
          if (i === corrIdx) {
            b.style.background   = 'rgba(46,204,113,0.3)';
            b.style.borderColor  = '#2ecc71';
          } else if (i === chosen && !correct) {
            b.style.background   = 'rgba(231,76,60,0.3)';
            b.style.borderColor  = '#e74c3c';
          }
        });

        const resultEl = document.getElementById('mg-graph-result');
        if (resultEl) {
          resultEl.style.display = 'block';
          if (correct) {
            resultEl.style.background = 'rgba(46,204,113,0.15)';
            resultEl.innerHTML = `
              <div style="color:#2ecc71;font-size:1.2rem;font-weight:800">
                🎯 Correct! +30 bonus pts!
              </div>
              <div style="opacity:0.7;margin-top:6px;font-size:0.85rem">
                ${q.equation} → ${q.desc}
              </div>`;
            GameState.addScore(GameState.get('currentTurn'), 30);
            Animations.celebrate(GameState.get('currentTurn'));
          } else {
            resultEl.style.background = 'rgba(231,76,60,0.15)';
            resultEl.innerHTML = `
              <div style="color:#e74c3c;font-size:1.1rem;font-weight:700">
                ❌ Not quite! ${q.equation} → ${q.desc}
              </div>`;
            Animations.wrongFlash();
          }

          // Continue button
          setTimeout(() => {
            const cont = document.createElement('button');
            cont.textContent = '▶ Continue →';
            cont.style.cssText = `
              margin-top:12px;
              background:linear-gradient(135deg,#4f8ef7,#6c63ff);
              border:none;border-radius:12px;
              padding:14px 30px;color:white;
              font-size:1rem;font-weight:700;
              cursor:pointer;width:100%;
            `;
            cont.onclick = () => {
              showScreen('game');
              Players.updateHUD(1);
              Players.updateHUD(2);
              if (typeof onComplete === 'function') onComplete();
            };
            resultEl.appendChild(cont);
          }, 500);
        }
      });
    });
  }

  // ── MINI-GAME: RACE CALCULATOR ─────────────────────
  function _buildRaceCalcGame(container, title, world, onComplete) {
    title.textContent = '🏎️ Race Calculator!';

    // Generate 3 quick-fire questions
    const questions = _generateQuickFire(world);
    let   qIndex    = 0;
    let   p1Score   = 0;
    let   p2Score   = 0;
    let   p1Done    = false;
    let   p2Done    = false;

    const p1 = GameState.getPlayer(1);
    const p2 = GameState.getPlayer(2);

    function renderRaceQ() {
      if (qIndex >= questions.length) {
        _endRace();
        return;
      }
      const q = questions[qIndex];

      container.innerHTML = `
        <div style="padding:16px">
          <div style="
            display:flex;gap:10px;margin-bottom:16px;
            justify-content:space-between;
          ">
            <div style="
              flex:1;text-align:center;
              background:rgba(79,142,247,0.15);
              border:2px solid rgba(79,142,247,0.4);
              border-radius:12px;padding:10px;
            ">
              <div style="font-size:1.4rem">${p1.avatar}</div>
              <div style="font-weight:700">${p1.name}</div>
              <div style="color:#f5c842;font-size:1.2rem;font-weight:900">
                ${p1Score} pts
              </div>
            </div>
            <div style="
              display:flex;align-items:center;
              font-size:1.3rem;font-weight:900;color:#f5c842;
            ">🏎️</div>
            <div style="
              flex:1;text-align:center;
              background:rgba(247,79,142,0.15);
              border:2px solid rgba(247,79,142,0.4);
              border-radius:12px;padding:10px;
            ">
              <div style="font-size:1.4rem">${p2.avatar}</div>
              <div style="font-weight:700">${p2.name}</div>
              <div style="color:#f5c842;font-size:1.2rem;font-weight:900">
                ${p2Score} pts
              </div>
            </div>
          </div>

          <div style="
            text-align:center;
            background:rgba(255,255,255,0.08);
            border-radius:16px;padding:20px;
            margin-bottom:16px;
          ">
            <div style="opacity:0.6;font-size:0.8rem;margin-bottom:8px">
              Question ${qIndex+1} of ${questions.length}
            </div>
            <div style="font-size:1.2rem;font-weight:700;margin-bottom:16px">
              ${q.text}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              ${q.options.map((opt, i) => `
                <button
                  class="race-btn"
                  data-index="${i}"
                  style="
                    background:rgba(255,255,255,0.08);
                    border:2px solid rgba(255,255,255,0.15);
                    border-radius:12px;padding:14px;
                    color:white;font-size:0.95rem;
                    font-weight:600;cursor:pointer;
                  "
                >
                  ${opt}
                </button>
              `).join('')}
            </div>
          </div>

          <div style="text-align:center;opacity:0.4;font-size:0.75rem">
            First to tap the correct answer wins the point!
          </div>
        </div>
      `;

      // Race handlers — first correct tap wins
      p1Done = false;
      p2Done = false;

      document.querySelectorAll('.race-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const chosen  = parseInt(btn.dataset.index);
          const correct = chosen === q.correct;

          // Lock all buttons
          document.querySelectorAll('.race-btn').forEach((b, i) => {
            b.style.pointerEvents = 'none';
            if (i === q.correct) {
              b.style.background  = 'rgba(46,204,113,0.3)';
              b.style.borderColor = '#2ecc71';
            } else if (i === chosen && !correct) {
              b.style.background  = 'rgba(231,76,60,0.3)';
              b.style.borderColor = '#e74c3c';
            }
          });

          // Since it's simultaneous play, give point to answerer
          const currentPlayer = GameState.get('currentTurn');
          if (correct) {
            if (currentPlayer === 1) p1Score += 25;
            else p2Score += 25;
            Animations.celebrate(currentPlayer);
          } else {
            Animations.wrongFlash();
          }

          qIndex++;
          setTimeout(renderRaceQ, 1200);
        });
      });
    }

    function _endRace() {
      const winner = p1Score > p2Score ? p1 : p2Score > p1Score ? p2 : null;
      const bonus  = p1Score > p2Score ? 1 : 2;

      if (winner) {
        GameState.addScore(bonus, Math.max(p1Score, p2Score));
      }

      container.innerHTML = `
        <div style="padding:30px;text-align:center">
          <div style="font-size:4rem;margin-bottom:16px">
            ${winner ? winner.avatar : '🤝'}
          </div>
          <div style="font-size:1.5rem;font-weight:900;color:#f5c842;margin-bottom:16px">
            ${winner ? winner.name + ' wins!' : 'It\'s a tie!'}
          </div>
          <div style="display:flex;gap:16px;justify-content:center;margin-bottom:24px">
            <div>${p1.avatar} ${p1.name}: ${p1Score} pts</div>
            <div>|</div>
            <div>${p2.avatar} ${p2.name}: ${p2Score} pts</div>
          </div>
          <button
            id="race-done"
            style="
              background:linear-gradient(135deg,#4f8ef7,#6c63ff);
              border:none;border-radius:16px;
              padding:16px 40px;color:white;
              font-size:1rem;font-weight:700;
              cursor:pointer;width:100%;
            "
          >
            ▶ Back to Questions →
          </button>
        </div>
      `;

      Animations.fireworks('confetti-container');
      Players.updateHUD(1);
      Players.updateHUD(2);

      document.getElementById('race-done')?.addEventListener('click', () => {
        showScreen('game');
        if (typeof onComplete === 'function') onComplete();
      });
    }

    renderRaceQ();
  }

  // ── GENERATE QUICK-FIRE QUESTIONS ─────────────────
  function _generateQuickFire(world) {
    const pools = {
      1: [
        { text: 'y = 4x. Find y when x = 5', options: ['20','16','25','30'], correct: 0 },
        { text: 'y = 12/x. Find y when x = 3', options: ['4','9','36','3'], correct: 0 },
        { text: 'Is y/x constant → Direct or Inverse?',
          options: ['Direct','Inverse','Neither','Both'], correct: 0 }
      ],
      2: [
        { text: 'y = kx. y=20, x=4. Find k.', options: ['5','80','16','0.2'], correct: 0 },
        { text: 'y ∝ x². x=3, y=18. Find k.', options: ['2','6','54','9'], correct: 0 },
        { text: 'y = k/x. y=6, x=5. Find k.', options: ['30','1.2','11','0.83'], correct: 0 }
      ],
      3: [
        { text: 'y ∝ x². x doubles → y?', options: ['×4','×2','÷2','×8'], correct: 0 },
        { text: 'y ∝ 1/x. x triples → y?', options: ['÷3','×3','÷9','×9'], correct: 0 },
        { text: 'y=3x². y when x=4?', options: ['48','144','12','36'], correct: 0 }
      ],
      4: [
        { text: '6 workers, 8 days. Total work?',
          options: ['48 wd','14 wd','48 d','6 wd'], correct: 0 },
        { text: '4 taps fill in 6h. 8 taps → ?',
          options: ['3h','12h','24h','8h'], correct: 0 },
        { text: 'W=knd. k=2,n=3,d=4. W=?',
          options: ['24','9','14','6'], correct: 0 }
      ],
      5: [
        { text: 'y=kx²+3. Is y ∝ x²?',
          options: ['No','Yes','Maybe','Always'], correct: 0 },
        { text: 'x×3, y∝x² → y×?',
          options: ['9','3','6','27'], correct: 0 },
        { text: 'F∝1/d². d doubles → F?',
          options: ['÷4','÷2','×4','×2'], correct: 0 }
      ]
    };

    const pool = pools[Math.min(world, 5)] || pools[1];
    return pool.sort(() => Math.random() - 0.5).slice(0, 3);
  }

  // ── HELPER: set element text ───────────────────────
  function _setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  // ── HELPER: add event listener safely ─────────────
  function _on(id, event, handler) {
    const el = document.getElementById(id);
    if (el) {
      // Clone to remove old listeners
      const clone = el.cloneNode(true);
      el.parentNode.replaceChild(clone, el);
      clone.addEventListener(event, handler);
    }
  }

  // ── INIT ALL SCREENS ───────────────────────────────
  function init() {
    initSplash();
    initHowToPlay();
    initSetup();
    initWorldMap();
    initLeaderboard();

    // Subscribe to state events
    GameState.subscribe((event, data) => {
      switch(event) {
        case 'scoreUpdate':
          Players.updateHUD(data.playerId);
          break;
        case 'heartLost':
          Players.updateHUD(data.playerId);
          Animations.animateHeartLoss(data.playerId);
          break;
        case 'shieldBlocked':
          Animations.showToast(`🛡️ Shield blocked the heart loss!`, 2000);
          break;
        case 'worldUnlocked':
          // Will be handled in level complete
          break;
        case 'turnChange':
          Players.highlightActivePlayer(data.turn);
          break;
        case 'streakUpdate':
          // Handled in question engine
          break;
        case 'playerOut':
          Animations.showToast(
            `💔 ${GameState.getPlayer(data.playerId).name} is out of hearts!`,
            2500
          );
          break;
      }
    });
  }

  // ── PUBLIC API ─────────────────────────────────────
  return {
    init,
    showScreen,
    renderWorldMap,
    updateWorldMapScores,
    showLevelComplete,
    showMiniGame,
    startLevel
  };

})();