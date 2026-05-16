/* ═══════════════════════════════════════════════════════
   ProPortion Quest — Question Engine (FIXED)
   Spin wheel, question rendering, timer, answer checking
═══════════════════════════════════════════════════════ */

const QuestionEngine = (() => {

  // ── PRIVATE STATE ──────────────────────────────────
  let _currentQuestions   = [];
  let _questionIndex      = 0;
  let _timerInterval      = null;
  let _timeLeft           = 30;
  let _answerLocked       = false;
  let _wheelSpun          = false;
  let _currentSpinType    = null;
  let _miniGameEvery      = 5;
  let _questionCount      = 0;
  let _wheelTotalRotation = 0;
  let _wheelBuilt         = false;

  // ── CONSTANTS ─────────────────────────────────────
  const BASE_POINTS = 100;

  // ── WHEEL CONFIGURATION ────────────────────────────
  /*
    6 segments × 60° each.
    Pointer is FIXED at the TOP of the wheel frame.
    Segment 0 starts at 0° (top), goes clockwise.

    To land segment[i] under the pointer we rotate the
    wheel so that the segment's centre (i*60+30)° is
    at the top, i.e. total rotation = 360 - (i*60+30)
    plus any full extra spins.
  */
  const WHEEL_CONFIG = [
    { type:'mcq',         label:'MCQ\n❓',          color:'#4f8ef7', emoji:'❓' },
    { type:'table',       label:'Table\n📊',         color:'#2ecc71', emoji:'📊' },
    { type:'findK',       label:'Find k\n🔍',        color:'#e74c3c', emoji:'🔍' },
    { type:'trueFalse',   label:'True /\nFalse ⚖️',  color:'#f39c12', emoji:'⚖️' },
    { type:'fillBlank',   label:'Fill\nBlank ✏️',    color:'#9b59b6', emoji:'✏️' },
    { type:'wordProblem', label:'Word\nProblem 📖',  color:'#1abc9c', emoji:'📖' }
  ];

  const SEG_COUNT = WHEEL_CONFIG.length; // 6
  const SEG_DEG   = 360 / SEG_COUNT;    // 60

  // ── BUILD WHEEL DOM (called once) ──────────────────
  function _buildWheel() {
    if (_wheelBuilt) return;
    _wheelBuilt = true;

    const wheelEl = document.getElementById('spin-wheel');
    if (!wheelEl) return;

    wheelEl.innerHTML = '';

    WHEEL_CONFIG.forEach((seg, i) => {
      const label = document.createElement('div');
      label.className = `wheel-label lbl-${i}`;

      const span = document.createElement('span');
      // Split label on \n for two-line display
      span.innerHTML = seg.label.replace('\n', '<br>');
      label.appendChild(span);
      wheelEl.appendChild(label);
    });
  }

  // ── SHOW SPIN WHEEL ────────────────────────────────
  function showSpinWheel() {
    _buildWheel();

    const overlay  = document.getElementById('wheel-overlay');
    const resultEl = document.getElementById('wheel-result');
    let   spinBtn  = document.getElementById('btn-spin');

    if (!overlay) return;

    // Reset state
    _wheelSpun = false;

    // Reset result text
    if (resultEl) {
      resultEl.textContent = 'Tap SPIN to begin!';
      resultEl.classList.remove('revealed');
      resultEl.style.borderColor = '';
      resultEl.style.background  = '';
    }

    // Reset button — clone to wipe old listeners
    if (spinBtn) {
      spinBtn.textContent = '🎡 SPIN!';
      spinBtn.disabled    = false;
      spinBtn.classList.remove('ready');

      const fresh = spinBtn.cloneNode(true);
      spinBtn.parentNode.replaceChild(fresh, spinBtn);
      spinBtn = fresh;
      spinBtn.addEventListener('click', _onSpinBtnClick);
    }

    overlay.classList.remove('hidden');
  }

  // ── SPIN BUTTON CLICK ──────────────────────────────
  // This handler covers BOTH states:
  //   State 1 (!_wheelSpun) → run the spin
  //   State 2 (_wheelSpun)  → hide overlay and load Q
  function _onSpinBtnClick() {
    if (!_wheelSpun) {
      _doSpin();
    } else {
      document.getElementById('wheel-overlay')
        .classList.add('hidden');
      loadQuestion();
    }
  }

  // ── EXECUTE THE SPIN ───────────────────────────────
  function _doSpin() {
    if (_wheelSpun) return;
    _wheelSpun = true;

    const wheelEl  = document.getElementById('spin-wheel');
    const resultEl = document.getElementById('wheel-result');
    const spinBtn  = document.getElementById('btn-spin');

    if (!wheelEl) return;

    // Disable during animation
    if (spinBtn) {
      spinBtn.disabled    = true;
      spinBtn.textContent = '🌀 Spinning…';
    }

    // Pick random target segment
    const targetIndex = Math.floor(Math.random() * SEG_COUNT);
    const seg         = WHEEL_CONFIG[targetIndex];
    _currentSpinType  = seg.type;

    /*
      segCentre  = degrees from top to the centre of targetIndex
                 = targetIndex * 60 + 30
      alignAngle = how much to rotate wheel so that centre
                   comes to the top pointer
                 = 360 - segCentre   (mod 360 not needed
                   since we add extra full rotations anyway)
      finalAngle = accumulated + extra spins + alignAngle
    */
    const segCentre  = targetIndex * SEG_DEG + SEG_DEG / 2;
    const alignAngle = 360 - segCentre;
    const extraSpins = 5 * 360; // dramatic effect
    const finalAngle = _wheelTotalRotation + extraSpins + alignAngle;

    // Store so next spin continues forward (no snap-back)
    _wheelTotalRotation = finalAngle;

    // Animate
    wheelEl.style.transition =
      'transform 3.5s cubic-bezier(0.23, 1, 0.32, 1)';
    wheelEl.style.transform  = `rotate(${finalAngle}deg)`;

    // After spin settles
    setTimeout(() => {

      // Show result banner
      if (resultEl) {
        resultEl.innerHTML   =
          `<span style="font-size:1.3rem">${seg.emoji}</span>
           &nbsp; ${_friendlyName(seg.type)}`;
        resultEl.classList.add('revealed');
        resultEl.style.borderColor = seg.color;
      }

      // Small bounce
      wheelEl.style.transition = 'transform 0.1s ease-out';
      wheelEl.style.transform  = `rotate(${finalAngle + 4}deg)`;
      setTimeout(() => {
        wheelEl.style.transition = 'transform 0.15s ease-in-out';
        wheelEl.style.transform  = `rotate(${finalAngle}deg)`;
      }, 110);

      // Update button → GO state
      if (spinBtn) {
        spinBtn.disabled    = false;
        spinBtn.textContent = `▶ Go! (${seg.emoji} ${_friendlyName(seg.type)})`;
        spinBtn.classList.add('ready');
        // _wheelSpun is already true, so next click
        // will hit the "else" branch in _onSpinBtnClick
      }

    }, 3600); // 3500ms transition + 100ms buffer
  }

  // ── FRIENDLY TYPE NAME ─────────────────────────────
  function _friendlyName(type) {
    const map = {
      mcq:         'Multiple Choice',
      table:       'Table Question',
      findK:       'Find the Value of k',
      trueFalse:   'True or False',
      fillBlank:   'Fill in the Blank',
      wordProblem: 'Word Problem'
    };
    return map[type] || type;
  }

  // ── INIT LEVEL ─────────────────────────────────────
  function initLevel(world, level) {
    _questionCount      = 0;
    _questionIndex      = 0;
    _wheelSpun          = false;
    _answerLocked       = false;
    _wheelBuilt         = false;   // rebuild wheel labels fresh
    _wheelTotalRotation = 0;       // reset accumulated rotation

    // Reset wheel visual
    const wheelEl = document.getElementById('spin-wheel');
    if (wheelEl) {
      wheelEl.style.transition = 'none';
      wheelEl.style.transform  = 'rotate(0deg)';
    }

    // Load questions for this world/level
    _currentQuestions = QuestionBank.getQuestions(world, level, 10);

    // Pad if needed
    if (_currentQuestions.length < 5) {
      const extra = QuestionBank.getRandomMix(world, 5);
      _currentQuestions = [..._currentQuestions, ...extra];
    }

    _updateRoundCounter();
    _updateWorldIndicator(world);

    // Show spin wheel for first question
    showSpinWheel();
  }

  // ── LOAD QUESTION ──────────────────────────────────
  function loadQuestion() {
    if (_questionIndex >= _currentQuestions.length) {
      _endLevel();
      return;
    }

    _answerLocked = false;
    _questionCount++;

    // Trigger mini-game interlude periodically
    if (_questionCount > 1 && (_questionCount - 1) % _miniGameEvery === 0) {
      _triggerMiniGame();
      return;
    }

    // Try to find a question matching the spun type
    let q = _currentQuestions[_questionIndex];

    if (_currentSpinType) {
      // Look ahead in remaining questions for a type match
      const remaining = _currentQuestions.slice(_questionIndex);
      const match     = remaining.find(cq => cq.type === _currentSpinType);
      if (match) {
        const matchIdx = _currentQuestions.indexOf(match);
        // Swap match to current position
        if (matchIdx !== _questionIndex) {
          [_currentQuestions[_questionIndex],
           _currentQuestions[matchIdx]] =
          [_currentQuestions[matchIdx],
           _currentQuestions[_questionIndex]];
        }
        q = _currentQuestions[_questionIndex];
      }
      // If no match, just use next question (any type)
    }

    _questionIndex++;
    GameState.setCurrentQuestion(q);

    _renderQuestion(q);
    _renderOptions(q);
    _clearExplanation();
    _startTimer(GameState.get('settings.timeLimit') || 30);

    Players.updateHUD(1);
    Players.updateHUD(2);
    Players.highlightActivePlayer(GameState.get('currentTurn'));
    _updateRoundCounter();
  }

  // ── RENDER QUESTION ────────────────────────────────
  function _renderQuestion(q) {
    const badge = document.getElementById('q-type-badge');
    if (badge) {
      badge.textContent    = q.topic || _friendlyName(q.type);
      badge.style.background = _topicColor(q.world);
    }

    const ptsBadge = document.getElementById('q-points-badge');
    if (ptsBadge) {
      const isDouble = GameState.get('isDoublePoints');
      ptsBadge.textContent = isDouble
        ? `+${(q.points || BASE_POINTS) * 2} pts 💣`
        : `+${q.points || BASE_POINTS} pts`;
    }

    const qText = document.getElementById('question-text');
    if (qText) qText.textContent = q.question;

    // Table
    const tableWrapper = document.getElementById('q-table-wrapper');
    if (tableWrapper) {
      if (q.table) {
        tableWrapper.classList.remove('hidden');
        _renderTable(q.table);
      } else {
        tableWrapper.classList.add('hidden');
      }
    }

    // Formula
    const formulaEl = document.getElementById('q-formula');
    if (formulaEl) {
      if (q.formula) {
        formulaEl.classList.remove('hidden');
        formulaEl.textContent = q.formula;
      } else {
        formulaEl.classList.add('hidden');
      }
    }

    // Animate in
    const qBox = document.getElementById('question-box');
    if (qBox) {
      qBox.style.animation = 'none';
      qBox.offsetHeight;
      qBox.style.animation = 'slideInUp 0.3s ease';
    }
  }

  // ── RENDER TABLE ───────────────────────────────────
  function _renderTable(tableData) {
    const headRow  = document.getElementById('q-table-head');
    const tbody    = document.getElementById('q-table-body');
    if (!headRow || !tbody) return;

    headRow.innerHTML = tableData.headers
      .map(h => `<th>${h}</th>`).join('');

    tbody.innerHTML = tableData.rows
      .map(row =>
        `<tr>${row.map(cell => {
          const blank = cell === '?' || cell === '';
          return `<td class="${blank ? 'highlight' : ''}">
                    ${blank ? '?' : cell}
                  </td>`;
        }).join('')}</tr>`
      ).join('');
  }

  // ── RENDER OPTIONS ─────────────────────────────────
  function _renderOptions(q) {
    const ids = ['ans-a','ans-b','ans-c','ans-d'];
    q.options.forEach((opt, i) => {
      const btn = document.getElementById(ids[i]);
      if (!btn) return;
      btn.textContent            = opt;
      btn.className              = 'answer-btn';
      btn.disabled               = false;
      btn.style.opacity          = '';
      btn.style.textDecoration   = '';
      btn.style.animation        = 'none';
      btn.offsetHeight;
      btn.style.animation =
        `slideInUp 0.3s ease ${i * 0.07}s both`;
    });
  }

  // ── HANDLE ANSWER ──────────────────────────────────
  function handleAnswer(selectedIndex) {
    if (_answerLocked) return;
    _answerLocked = true;

    stopTimer();

    const q          = GameState.get('currentQuestion');
    const playerId   = GameState.get('currentTurn');
    const isCorrect  = QuestionBank.checkAnswer(q, selectedIndex);
    const timeBonus  = isCorrect
      ? GameState.getTimeBonus(
          _timeLeft,
          GameState.get('settings.timeLimit') || 30)
      : 0;
    const streakMult = GameState.getStreakMultiplier(playerId);
    const base       = q.points || BASE_POINTS;

    let finalPoints = 0;
    if (isCorrect) {
      finalPoints = Math.round((base + timeBonus) * streakMult);
      const awarded = GameState.addScore(playerId, finalPoints);
      Players.showScorePop(playerId, awarded);
    }

    const newStreak = GameState.updateStreak(playerId, isCorrect);

    if (!isCorrect) {
      GameState.loseHeart(playerId);
    }

    GameState.recordAnswer(playerId, selectedIndex, isCorrect);
    _highlightAnswers(selectedIndex, q.correctIndex);

    if (newStreak >= 2) {
      _showStreakBanner(playerId, newStreak, streakMult);
    }

    setTimeout(() => {
      _showExplanation(q, isCorrect, finalPoints, timeBonus);
    }, 800);

    if (isCorrect) Animations.celebrate(playerId);
    else           Animations.wrongFlash();

    Players.updateHUD(playerId);

    if (Math.random() < 0.4 && q.tip) {
      setTimeout(() => _showTip(q.tip), 1600);
    }
  }

  // ── HIGHLIGHT ANSWER BUTTONS ───────────────────────
  function _highlightAnswers(selected, correct) {
    ['ans-a','ans-b','ans-c','ans-d'].forEach((id, i) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.disabled = true;
      btn.classList.add('disabled');
      if (i === correct)                        btn.classList.add('correct');
      else if (i === selected && i !== correct)  btn.classList.add('wrong');
    });
  }

  // ── SHOW EXPLANATION ───────────────────────────────
  function _showExplanation(q, isCorrect, points, timeBonus) {
    const expBox  = document.getElementById('explanation-box');
    const icon    = document.getElementById('exp-result-icon');
    const text    = document.getElementById('exp-result-text');
    const steps   = document.getElementById('exp-steps');
    const nextBtn = document.getElementById('btn-next-question');
    if (!expBox) return;

    expBox.classList.remove('hidden','wrong-exp');
    if (!isCorrect) expBox.classList.add('wrong-exp');

    if (icon) icon.textContent = isCorrect ? '✅' : '❌';

    if (text) {
      if (isCorrect) {
        let msg = `Correct! +${points} pts`;
        if (timeBonus > 0) msg += ` (⚡+${timeBonus} speed bonus)`;
        text.textContent = msg;
      } else {
        text.textContent = 'Not quite! Study the solution:';
      }
    }

    if (steps && q.steps) {
      steps.innerHTML = q.steps.map((s, i) =>
        `<div class="step">
           <span class="step-num">${i+1}.</span>
           <span>${s}</span>
         </div>`
      ).join('');
    }

    if (nextBtn) {
      const isLast = _questionIndex >= _currentQuestions.length;
      nextBtn.textContent = isLast ? '🏁 See Results!' : 'Next Question →';

      // Clone to remove old listener
      const fresh = nextBtn.cloneNode(true);
      nextBtn.parentNode.replaceChild(fresh, nextBtn);
      fresh.addEventListener('click', () => {
        expBox.classList.add('hidden');
        _hideTip();

        if (_questionIndex >= _currentQuestions.length) {
          _endLevel();
        } else {
          GameState.nextTurn();
          showSpinWheel();
        }
      });
    }

    expBox.style.animation = 'none';
    expBox.offsetHeight;
    expBox.style.animation = 'slideInUp 0.4s ease';
  }

  // ── CLEAR EXPLANATION ──────────────────────────────
  function _clearExplanation() {
    const el = document.getElementById('explanation-box');
    if (el) el.classList.add('hidden');
  }

  // ── TIMER ──────────────────────────────────────────
  function _startTimer(seconds) {
    stopTimer();
    _timeLeft = seconds;

    const fill = document.getElementById('timer-fill');
    const text = document.getElementById('timer-text');
    if (fill) { fill.style.width = '100%'; fill.className = 'timer-fill'; }
    if (text) { text.textContent = seconds; text.style.color = ''; }

    _timerInterval = setInterval(() => {
      if (GameState.get('isFrozen')) return;

      _timeLeft--;

      const pct = Math.max(0, (_timeLeft / seconds) * 100);
      if (fill) {
        fill.style.width = `${pct}%`;
        fill.classList.remove('warning','danger');
        if      (_timeLeft <= 5)  fill.classList.add('danger');
        else if (_timeLeft <= 12) fill.classList.add('warning');
      }
      if (text) {
        text.textContent = Math.max(0, _timeLeft);
        text.style.color = _timeLeft <= 5 ? '#e74c3c' : '';
      }

      if (_timeLeft <= 0) {
        stopTimer();
        _onTimeUp();
      }
    }, 1000);
  }

  function stopTimer() {
    clearInterval(_timerInterval);
    _timerInterval = null;
  }

  function _onTimeUp() {
    if (_answerLocked) return;
    _answerLocked = true;

    const q        = GameState.get('currentQuestion');
    const playerId = GameState.get('currentTurn');

    _highlightAnswers(-1, q.correctIndex);
    GameState.loseHeart(playerId);
    GameState.updateStreak(playerId, false);
    Players.updateHUD(playerId);
    Animations.wrongFlash();
    Animations.showToast('⏰ Time\'s up!', 1800);

    setTimeout(() => _showExplanation(q, false, 0, 0), 600);
  }

  // ── STREAK BANNER ──────────────────────────────────
  function _showStreakBanner(playerId, streak, mult) {
    const banner = document.getElementById('streak-banner');
    if (!banner) return;
    const p = GameState.getPlayer(playerId);
    banner.textContent = `🔥 ${p.name}: ${streak}× Streak! ×${mult} bonus!`;
    banner.classList.remove('hidden');
    clearTimeout(banner._t);
    banner._t = setTimeout(() => banner.classList.add('hidden'), 2500);
  }

  // ── TIP BUBBLE ─────────────────────────────────────
  function _showTip(tip) {
    const bubble = document.getElementById('tip-bubble');
    const text   = document.getElementById('tip-text');
    if (!bubble || !text) return;
    text.textContent = tip;
    bubble.classList.remove('hidden');
  }

  function _hideTip() {
    document.getElementById('tip-bubble')?.classList.add('hidden');
  }

  // ── MINI-GAME TRIGGER ──────────────────────────────
  function _triggerMiniGame() {
    const world = GameState.get('currentWorld');
    const games = ['slider','graphMatch','raceCalc'];
    const game  = games[Math.floor(Math.random() * games.length)];
    UI.showMiniGame(game, world, () => loadQuestion());
  }

  // ── END LEVEL ──────────────────────────────────────
  function _endLevel() {
    stopTimer();
    const p1    = GameState.getPlayer(1);
    const p2    = GameState.getPlayer(2);
    const total = _currentQuestions.length * BASE_POINTS * 2;
    const stars = GameState.calculateStars(p1.score, p2.score, total);
    const world = GameState.get('currentWorld');
    const level = GameState.get('currentLevel');
    GameState.completeLevel(stars);
    UI.showLevelComplete(stars, world, level);
  }

  // ── HELPERS ────────────────────────────────────────
  function _topicColor(world) {
    return ({
      1:'rgba(46,204,113,0.2)',
      2:'rgba(52,152,219,0.2)',
      3:'rgba(231,76,60,0.2)',
      4:'rgba(155,89,182,0.2)',
      5:'rgba(243,156,18,0.2)'
    })[world] || 'rgba(79,142,247,0.2)';
  }

  function _updateRoundCounter() {
    const el = document.getElementById('round-counter');
    if (el) el.textContent =
      `Q ${_questionIndex}/${_currentQuestions.length}`;
  }

  function _updateWorldIndicator(world) {
    const el = document.getElementById('world-indicator');
    if (!el) return;
    const icons = {1:'🌱',2:'🪐',3:'🌋',4:'🏗️',5:'⚔️'};
    const names = {
      1:'Ratio Realm', 2:'Proportion Planet',
      3:'Variable Volcano', 4:'Triple Trouble', 5:'Boss Arena'
    };
    el.textContent =
      `${icons[world]||'🎮'} ${names[world]||'World '+world}`;
  }

  // ── SETUP LISTENERS (called once from ui.js) ───────
  function setupAnswerListeners() {
    ['ans-a','ans-b','ans-c','ans-d'].forEach((id, i) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      // Clone to prevent duplicate listeners
      const fresh = btn.cloneNode(true);
      btn.parentNode.replaceChild(fresh, btn);
      fresh.addEventListener('click', () => {
        if (_answerLocked) return;
        fresh.style.transform = 'scale(0.94)';
        setTimeout(() => fresh.style.transform = '', 140);
        handleAnswer(i);
      });
    });

    // Tip close
    const tipClose = document.getElementById('tip-close');
    if (tipClose) {
      tipClose.addEventListener('click', _hideTip);
    }

    // Power-up buttons
    document.querySelectorAll('.pu-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const puType   = btn.dataset.pu;
        const playerId = parseInt(btn.dataset.player);
        Players.applyPowerUp(playerId, puType);
        Players.updateHUD(1);
        Players.updateHUD(2);
      });
    });
  }

  // ── PUBLIC API ─────────────────────────────────────
  return {
    initLevel,
    loadQuestion,
    handleAnswer,
    showSpinWheel,
    stopTimer,
    setupAnswerListeners
  };

})();