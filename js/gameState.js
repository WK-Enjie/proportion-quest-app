/* ═══════════════════════════════════════════════════════
   ProPortion Quest — Central Game State Manager
   Single source of truth for all game data
═══════════════════════════════════════════════════════ */

const GameState = (() => {

  // ── INITIAL STATE ──────────────────────────────────
  const INITIAL_STATE = {
    // Screen management
    currentScreen: 'splash',
    previousScreen: null,

    // Player data
    players: {
      1: {
        id: 1,
        name: 'Player 1',
        avatar: '🧑‍🎓',
        score: 0,
        totalScore: 0,
        hearts: 3,
        maxHearts: 3,
        streak: 0,
        maxStreak: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        powerUps: {
          freeze:  { count: 2, used: false },
          hint:    { count: 2, used: false },
          double:  { count: 1, used: false },
          shield:  { count: 1, used: false }
        },
        worldProgress: {
          1: { unlocked: true,  stars: 0, levelsComplete: [] },
          2: { unlocked: false, stars: 0, levelsComplete: [] },
          3: { unlocked: false, stars: 0, levelsComplete: [] },
          4: { unlocked: false, stars: 0, levelsComplete: [] },
          5: { unlocked: false, stars: 0, levelsComplete: [] }
        }
      },
      2: {
        id: 2,
        name: 'Player 2',
        avatar: '👩‍🏫',
        score: 0,
        totalScore: 0,
        hearts: 3,
        maxHearts: 3,
        streak: 0,
        maxStreak: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        powerUps: {
          freeze:  { count: 2, used: false },
          hint:    { count: 2, used: false },
          double:  { count: 1, used: false },
          shield:  { count: 1, used: false }
        },
        worldProgress: {
          1: { unlocked: true,  stars: 0, levelsComplete: [] },
          2: { unlocked: false, stars: 0, levelsComplete: [] },
          3: { unlocked: false, stars: 0, levelsComplete: [] },
          4: { unlocked: false, stars: 0, levelsComplete: [] },
          5: { unlocked: false, stars: 0, levelsComplete: [] }
        }
      }
    },

    // World & Level
    currentWorld: 1,
    currentLevel: 1,
    currentTurn: 1,          // Which player's turn (1 or 2)
    currentRound: 1,
    totalRounds: 10,          // Questions per level

    // Question state
    currentQuestion: null,
    currentQuestionIndex: 0,
    questionsThisLevel: [],
    answeredThisRound: false,
    selectedAnswer: null,
    isDoublePoints: false,
    isShielded: { 1: false, 2: false },
    isFrozen: false,

    // Timer
    timeLimit: 30,
    timeRemaining: 30,
    timerInterval: null,

    // Spin wheel
    wheelResult: null,
    questionTypes: [
      'mcq', 'table', 'findK', 'trueFalse', 'fillBlank', 'wordProblem'
    ],

    // Session leaderboard
    sessionHistory: [],

    // Flags
    gameStarted: false,
    levelComplete: false,
    gameOver: false,

    // Settings
    settings: {
      soundEnabled: true,
      animationsEnabled: true,
      timeLimit: 30
    }
  };

  // ── PRIVATE STATE ──────────────────────────────────
  let _state = JSON.parse(JSON.stringify(INITIAL_STATE));
  let _listeners = [];

  // ── PERSISTENCE ───────────────────────────────────
  function saveToStorage() {
    try {
      const toSave = {
        sessionHistory: _state.sessionHistory,
        players: {
          1: { worldProgress: _state.players[1].worldProgress,
               totalScore:    _state.players[1].totalScore },
          2: { worldProgress: _state.players[2].worldProgress,
               totalScore:    _state.players[2].totalScore }
        }
      };
      localStorage.setItem('pq_save', JSON.stringify(toSave));
    } catch(e) {
      console.warn('Storage save failed:', e);
    }
  }

  function loadFromStorage() {
    try {
      const saved = localStorage.getItem('pq_save');
      if (!saved) return;
      const data = JSON.parse(saved);
      if (data.sessionHistory) {
        _state.sessionHistory = data.sessionHistory.slice(-20); // keep last 20
      }
    } catch(e) {
      console.warn('Storage load failed:', e);
    }
  }

  // ── SUBSCRIBER PATTERN ────────────────────────────
  function subscribe(listener) {
    _listeners.push(listener);
    return () => {
      _listeners = _listeners.filter(l => l !== listener);
    };
  }

  function _notify(event, data) {
    _listeners.forEach(l => l(event, data));
  }

  // ── GETTERS ───────────────────────────────────────
  function get(path) {
    if (!path) return _state;
    return path.split('.').reduce((obj, key) => {
      return obj && obj[key] !== undefined ? obj[key] : undefined;
    }, _state);
  }

  function getPlayer(id) {
    return _state.players[id];
  }

  function getCurrentPlayer() {
    return _state.players[_state.currentTurn];
  }

  function getOpponentPlayer() {
    return _state.players[_state.currentTurn === 1 ? 2 : 1];
  }

  // ── SETTERS ───────────────────────────────────────
  function set(path, value) {
    const keys = path.split('.');
    let obj = _state;
    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    _notify('stateChange', { path, value });
  }

  // ── PLAYER ACTIONS ────────────────────────────────
  function setPlayerName(id, name) {
    _state.players[id].name = name.trim() || `Player ${id}`;
    _notify('playerUpdate', { id, field: 'name' });
  }

  function setPlayerAvatar(id, avatar) {
    _state.players[id].avatar = avatar;
    _notify('playerUpdate', { id, field: 'avatar' });
  }

  function addScore(playerId, points) {
    const player = _state.players[playerId];
    const multiplier = _state.isDoublePoints ? 2 : 1;
    const finalPoints = points * multiplier;
    player.score += finalPoints;
    player.totalScore += finalPoints;
    _notify('scoreUpdate', { playerId, points: finalPoints, total: player.score });
    return finalPoints;
  }

  function loseHeart(playerId) {
    const player = _state.players[playerId];
    // Check shield
    if (_state.isShielded[playerId]) {
      _state.isShielded[playerId] = false;
      _notify('shieldBlocked', { playerId });
      return false; // heart not lost
    }
    if (player.hearts > 0) {
      player.hearts--;
      _notify('heartLost', { playerId, hearts: player.hearts });
      if (player.hearts === 0) {
        _notify('playerOut', { playerId });
      }
      return true;
    }
    return false;
  }

  function updateStreak(playerId, correct) {
    const player = _state.players[playerId];
    if (correct) {
      player.streak++;
      player.correctAnswers++;
      if (player.streak > player.maxStreak) {
        player.maxStreak = player.streak;
      }
    } else {
      player.streak = 0;
      player.wrongAnswers++;
    }
    _notify('streakUpdate', { playerId, streak: player.streak });
    return player.streak;
  }

  function getStreakMultiplier(playerId) {
    const streak = _state.players[playerId].streak;
    if (streak >= 5) return 2.0;
    if (streak >= 3) return 1.5;
    if (streak >= 2) return 1.25;
    return 1.0;
  }

  // ── POWER-UP ACTIONS ──────────────────────────────
  function usePowerUp(playerId, type) {
    const pu = _state.players[playerId].powerUps[type];
    if (!pu || pu.count <= 0) return false;

    pu.count--;

    switch(type) {
      case 'freeze':
        _state.isFrozen = true;
        _state.timeRemaining += 15;
        _notify('powerUpUsed', { playerId, type, effect: 'Time frozen! +15 seconds' });
        break;
      case 'hint':
        _notify('powerUpUsed', { playerId, type, effect: 'Eliminating 2 wrong answers...' });
        break;
      case 'double':
        _state.isDoublePoints = true;
        _notify('powerUpUsed', { playerId, type, effect: 'Double points this round!' });
        break;
      case 'shield':
        _state.isShielded[playerId] = true;
        _notify('powerUpUsed', { playerId, type, effect: 'Shield activated!' });
        break;
    }
    return true;
  }

  function resetRoundPowerUps() {
    _state.isDoublePoints = false;
    _state.isFrozen = false;
  }

  // ── TURN MANAGEMENT ───────────────────────────────
  function nextTurn() {
    _state.answeredThisRound = false;
    _state.selectedAnswer = null;
    resetRoundPowerUps();

    if (_state.currentTurn === 1) {
      _state.currentTurn = 2;
    } else {
      _state.currentTurn = 1;
      _state.currentRound++;
    }
    _notify('turnChange', {
      turn: _state.currentTurn,
      round: _state.currentRound
    });
  }

  function forcePlayerTurn(playerId) {
    _state.currentTurn = playerId;
    _notify('turnChange', { turn: playerId });
  }

  // ── WORLD / LEVEL MANAGEMENT ──────────────────────
  function setWorld(worldId, levelId = 1) {
    _state.currentWorld = worldId;
    _state.currentLevel = levelId;
    _state.currentRound = 1;
    _state.currentTurn = 1;
    _state.questionsThisLevel = [];
    _state.currentQuestionIndex = 0;

    // Reset hearts & streaks for new level
    [1, 2].forEach(id => {
      _state.players[id].hearts    = _state.players[id].maxHearts;
      _state.players[id].score     = 0;
      _state.players[id].streak    = 0;
    });

    _notify('worldSet', { world: worldId, level: levelId });
  }

  function completeLevel(stars) {
    const world = _state.currentWorld;
    const level = _state.currentLevel;

    [1, 2].forEach(id => {
      const wp = _state.players[id].worldProgress[world];
      if (!wp.levelsComplete.includes(level)) {
        wp.levelsComplete.push(level);
      }
      if (stars > wp.stars) wp.stars = stars;
    });

    // Unlock next world if all 3 levels done
    if (_state.players[1].worldProgress[world].levelsComplete.length >= 3) {
      const nextWorld = world + 1;
      if (nextWorld <= 5) {
        [1, 2].forEach(id => {
          _state.players[id].worldProgress[nextWorld].unlocked = true;
        });
        _notify('worldUnlocked', { world: nextWorld });
      }
    }

    // Save session record
    _saveSessionRecord();
    saveToStorage();

    _state.levelComplete = true;
    _notify('levelComplete', { world, level, stars });
  }

  function _saveSessionRecord() {
    const record = {
      timestamp: Date.now(),
      world: _state.currentWorld,
      level: _state.currentLevel,
      p1: {
        name:  _state.players[1].name,
        avatar: _state.players[1].avatar,
        score: _state.players[1].score
      },
      p2: {
        name:  _state.players[2].name,
        avatar: _state.players[2].avatar,
        score: _state.players[2].score
      },
      winner: _state.players[1].score >= _state.players[2].score ? 1 : 2
    };
    _state.sessionHistory.unshift(record);
    if (_state.sessionHistory.length > 20) {
      _state.sessionHistory = _state.sessionHistory.slice(0, 20);
    }
  }

  // ── TIMER MANAGEMENT ──────────────────────────────
  function startTimer(seconds, onTick, onExpire) {
    clearInterval(_state.timerInterval);
    _state.timeRemaining = seconds;
    _state.timerInterval = setInterval(() => {
      if (!_state.isFrozen) {
        _state.timeRemaining--;
      }
      if (typeof onTick === 'function') {
        onTick(_state.timeRemaining);
      }
      if (_state.timeRemaining <= 0) {
        clearInterval(_state.timerInterval);
        if (typeof onExpire === 'function') {
          onExpire();
        }
      }
    }, 1000);
  }

  function stopTimer() {
    clearInterval(_state.timerInterval);
    _state.timerInterval = null;
  }

  function getTimeBonus(timeRemaining, totalTime) {
    const ratio = timeRemaining / totalTime;
    return Math.round(50 * ratio); // up to 50 bonus points
  }

  // ── QUESTION STATE ────────────────────────────────
  function setCurrentQuestion(question) {
    _state.currentQuestion = question;
    _state.answeredThisRound = false;
    _state.selectedAnswer = null;
    _notify('questionSet', { question });
  }

  function recordAnswer(playerId, answerIndex, correct) {
    _state.answeredThisRound = true;
    _state.selectedAnswer = answerIndex;
    _notify('answerRecorded', { playerId, answerIndex, correct });
  }

  // ── CALCULATE STARS ───────────────────────────────
  function calculateStars(p1Score, p2Score, totalPossible) {
    const combined = p1Score + p2Score;
    const ratio = combined / totalPossible;
    if (ratio >= 0.85) return 3;
    if (ratio >= 0.60) return 2;
    if (ratio >= 0.30) return 1;
    return 0;
  }

  // ── RESET ─────────────────────────────────────────
  function resetLevel() {
    [1, 2].forEach(id => {
      _state.players[id].score   = 0;
      _state.players[id].hearts  = _state.players[id].maxHearts;
      _state.players[id].streak  = 0;
      // Refresh power-ups for new level
      _state.players[id].powerUps = {
        freeze:  { count: 2, used: false },
        hint:    { count: 2, used: false },
        double:  { count: 1, used: false },
        shield:  { count: 1, used: false }
      };
    });
    _state.currentRound = 1;
    _state.currentTurn  = 1;
    _state.questionsThisLevel = [];
    _state.currentQuestionIndex = 0;
    _state.levelComplete = false;
    _state.isDoublePoints = false;
    _state.isFrozen = false;
    _state.isShielded = { 1: false, 2: false };
    stopTimer();
    _notify('levelReset', {});
  }

  function fullReset() {
    stopTimer();
    _state = JSON.parse(JSON.stringify(INITIAL_STATE));
    loadFromStorage();
    _notify('fullReset', {});
  }

  // ── INIT ──────────────────────────────────────────
  function init() {
    loadFromStorage();
    _notify('init', {});
  }

  // ── PUBLIC API ────────────────────────────────────
  return {
    // Core
    init,
    get,
    set,
    subscribe,

    // Players
    getPlayer,
    getCurrentPlayer,
    getOpponentPlayer,
    setPlayerName,
    setPlayerAvatar,
    addScore,
    loseHeart,
    updateStreak,
    getStreakMultiplier,

    // Power-ups
    usePowerUp,
    resetRoundPowerUps,

    // Turn
    nextTurn,
    forcePlayerTurn,

    // World/Level
    setWorld,
    completeLevel,
    calculateStars,

    // Timer
    startTimer,
    stopTimer,
    getTimeBonus,

    // Questions
    setCurrentQuestion,
    recordAnswer,

    // Reset
    resetLevel,
    fullReset,
    saveToStorage
  };

})();