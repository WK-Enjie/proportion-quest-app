/* ═══════════════════════════════════════════════════════
   ProPortion Quest — Main Entry Point
   Boots the entire application, wires all systems
═══════════════════════════════════════════════════════ */

(function() {
  'use strict';

  // ── BOOT SEQUENCE ──────────────────────────────────
  const Boot = {

    // Track init steps for debugging
    _steps: [],

    log(msg) {
      this._steps.push(msg);
      console.log(`[ProPortion Quest] ${msg}`);
    },

    // ── MAIN INIT ────────────────────────────────────
    init() {
      this.log('Starting boot sequence...');

      // 1. Wait for DOM
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this._boot());
      } else {
        this._boot();
      }
    },

    _boot() {
      try {
        this._initSystems();
        this._initUI();
        this._initGlobalHandlers();
        this._preventDefaultTouchBehaviours();
        this._checkDevice();
        this._showSplash();
        this.log('Boot complete ✓');
      } catch (err) {
        console.error('[ProPortion Quest] Boot error:', err);
        this._showErrorScreen(err);
      }
    },

    // ── INIT ALL SYSTEMS ─────────────────────────────
    _initSystems() {
      this.log('Initialising GameState...');
      GameState.init();

      this.log('Initialising QuestionEngine listeners...');
      // Listeners set up lazily when game screen loads

      this.log('All systems initialised ✓');
    },

    // ── INIT UI ──────────────────────────────────────
    _initUI() {
      this.log('Initialising UI...');
      UI.init();
      this.log('UI initialised ✓');
    },

    // ── GLOBAL EVENT HANDLERS ────────────────────────
    _initGlobalHandlers() {
      this.log('Wiring global handlers...');

      // ── Hardware back button (Android) ─────────────
      window.addEventListener('popstate', (e) => {
        const screen = GameState.get('currentScreen');
        const backMap = {
          'howtoplay':    'splash',
          'setup':        'splash',
          'worldmap':     'setup',
          'game':         'worldmap',
          'levelcomplete':'worldmap',
          'leaderboard':  'splash',
          'minigame':     'game'
        };
        const target = backMap[screen];
        if (target) {
          e.preventDefault();
          if (screen === 'game') {
            // Confirm before leaving game
            if (confirm('Leave this level? Progress will be lost.')) {
              QuestionEngine.stopTimer();
              UI.showScreen(target);
              if (target === 'worldmap') {
                UI.renderWorldMap();
              }
            }
          } else {
            UI.showScreen(target);
          }
        }
      });

      // Push initial state for back-button support
      history.pushState({ screen: 'splash' }, '', '');

      // ── Visibility change (tab switch / phone lock) ─
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          // Pause timer when app goes to background
          const screen = GameState.get('currentScreen');
          if (screen === 'game') {
            QuestionEngine.stopTimer();
            this.log('Timer paused — app hidden');
          }
        }
      });

      // ── Orientation change ──────────────────────────
      window.addEventListener('orientationchange', () => {
        setTimeout(() => {
          this._adjustForOrientation();
        }, 300);
      });

      // ── Resize (iPad split view etc.) ───────────────
      window.addEventListener('resize', _debounce(() => {
        this._adjustForOrientation();
      }, 200));

      // ── Prevent zoom on double-tap (iOS) ───────────
      let lastTap = 0;
      document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTap < 300) {
          e.preventDefault();
        }
        lastTap = now;
      }, { passive: false });

      // ── Keyboard: Enter key for inputs ─────────────
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const screen = GameState.get('currentScreen');
          if (screen === 'setup') {
            document.getElementById('btn-go-worldmap')?.click();
          }
        }

        // Dev shortcuts (only in development)
        if (e.ctrlKey && e.shiftKey) {
          switch(e.key) {
            case 'U':
              // Unlock all worlds (dev)
              _devUnlockAll();
              break;
            case 'S':
              // Skip to next question
              document.getElementById('btn-next-question')?.click();
              break;
            case 'R':
              // Full reset
              if (confirm('Reset all progress?')) {
                GameState.fullReset();
                location.reload();
              }
              break;
          }
        }
      });

      this.log('Global handlers wired ✓');
    },

    // ── PREVENT DEFAULT TOUCH BEHAVIOURS ─────────────
    _preventDefaultTouchBehaviours() {
      // Prevent pull-to-refresh on Chrome mobile
      document.body.style.overscrollBehavior = 'none';

      // Prevent context menu on long press (game elements)
      document.addEventListener('contextmenu', (e) => {
        if (e.target.closest('.screen')) {
          e.preventDefault();
        }
      });

      this.log('Touch behaviours configured ✓');
    },

    // ── DEVICE DETECTION & ADJUSTMENT ────────────────
    _checkDevice() {
      const ua        = navigator.userAgent;
      const isIOS     = /iPad|iPhone|iPod/.test(ua);
      const isAndroid = /Android/.test(ua);
      const isIPad    = /iPad/.test(ua) ||
                        (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
      const isPhone   = window.innerWidth < 500;

      this.log(`Device: iOS=${isIOS}, Android=${isAndroid}, iPad=${isIPad}`);

      // Add device classes to body
      if (isIOS)     document.body.classList.add('ios');
      if (isAndroid) document.body.classList.add('android');
      if (isIPad)    document.body.classList.add('ipad');
      if (isPhone)   document.body.classList.add('phone');

      // iOS safe area adjustments
      if (isIOS) {
        document.documentElement.style.setProperty(
          '--safe-top',
          'env(safe-area-inset-top)'
        );
        document.documentElement.style.setProperty(
          '--safe-bottom',
          'env(safe-area-inset-bottom)'
        );
      }

      // iPad: wider layout
      if (isIPad && window.innerWidth >= 768) {
        document.body.classList.add('wide-layout');
        this._applyIPadLayout();
      }

      this._adjustForOrientation();
    },

    // ── IPAD LAYOUT ──────────────────────────────────
    _applyIPadLayout() {
      // On iPad, constrain game to a phone-width column
      const style = document.createElement('style');
      style.textContent = `
        .screen {
          max-width: 580px !important;
          margin: 0 auto !important;
          box-shadow: 0 0 60px rgba(0,0,0,0.5);
        }
        body {
          background: #0a0a15 !important;
        }
        .celebration-overlay,
        .wrong-flash,
        .powerup-toast,
        .tip-bubble {
          max-width: 580px;
          left: 50%;
          transform: translateX(-50%);
        }
      `;
      document.head.appendChild(style);
      this.log('iPad layout applied ✓');
    },

    // ── ORIENTATION ADJUSTMENT ────────────────────────
    _adjustForOrientation() {
      const isLandscape = window.innerWidth > window.innerHeight;

      if (isLandscape && window.innerWidth < 900) {
        // Small phone in landscape — show rotate hint
        _showRotateHint();
      } else {
        _hideRotateHint();
      }
    },

    // ── SHOW SPLASH ───────────────────────────────────
    _showSplash() {
      UI.showScreen('splash');
      this.log('Splash screen shown ✓');

      // Animate floating symbols
      _animateFloatingSymbols();
    },

    // ── ERROR SCREEN ──────────────────────────────────
    _showErrorScreen(err) {
      document.body.innerHTML = `
        <div style="
          display:flex;flex-direction:column;
          align-items:center;justify-content:center;
          height:100vh;padding:20px;text-align:center;
          background:#1a1a2e;color:white;font-family:sans-serif;
        ">
          <div style="font-size:4rem;margin-bottom:20px">😢</div>
          <h2 style="color:#e74c3c;margin-bottom:12px">Oops! Something went wrong</h2>
          <p style="opacity:0.7;margin-bottom:20px;font-size:0.9rem">
            ${err.message || 'Unknown error'}
          </p>
          <button
            onclick="location.reload()"
            style="
              background:#4f8ef7;border:none;border-radius:12px;
              padding:14px 30px;color:white;font-size:1rem;
              font-weight:700;cursor:pointer;
            "
          >
            🔄 Reload Game
          </button>
        </div>
      `;
    }
  };

  // ── FLOATING SYMBOLS ANIMATION ─────────────────────
  function _animateFloatingSymbols() {
    const symbols = document.querySelectorAll('.sym');
    symbols.forEach((sym, i) => {
      sym.style.animationPlayState = 'running';
    });
  }

  // ── ROTATE HINT ────────────────────────────────────
  function _showRotateHint() {
    if (document.getElementById('rotate-hint')) return;

    const hint = document.createElement('div');
    hint.id = 'rotate-hint';
    hint.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.95);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      color: white;
      font-family: sans-serif;
      text-align: center;
      padding: 20px;
    `;
    hint.innerHTML = `
      <div style="font-size:4rem;animation:spin 2s linear infinite">📱</div>
      <h3 style="font-size:1.3rem;font-weight:900;color:#f5c842">
        Please Rotate Your Device
      </h3>
      <p style="opacity:0.7;font-size:0.9rem">
        ProPortion Quest works best in portrait mode!
      </p>
    `;
    document.body.appendChild(hint);
  }

  function _hideRotateHint() {
    document.getElementById('rotate-hint')?.remove();
  }

  // ── DEBOUNCE UTILITY ───────────────────────────────
  function _debounce(fn, delay) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // ── DEV: UNLOCK ALL WORLDS ─────────────────────────
  function _devUnlockAll() {
    [1,2,3,4,5].forEach(w => {
      GameState.set(`players.1.worldProgress.${w}.unlocked`, true);
      GameState.set(`players.2.worldProgress.${w}.unlocked`, true);
    });
    UI.renderWorldMap();
    Animations.showToast('🔓 Dev: All worlds unlocked!', 2000);
    console.log('[DEV] All worlds unlocked');
  }

  // ── PWA: SERVICE WORKER REGISTRATION ──────────────
  function _registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('./sw.js')
          .then(reg => {
            console.log('[PWA] Service worker registered:', reg.scope);
          })
          .catch(err => {
            console.warn('[PWA] Service worker registration failed:', err);
          });
      });
    }
  }

  // ── BOOT ───────────────────────────────────────────
  Boot.init();
  _registerServiceWorker();

  // Expose to window for UI inline handlers
  window.UI              = UI;
  window.GameState       = GameState;
  window.Players         = Players;
  window.QuestionBank    = QuestionBank;
  window.QuestionEngine  = QuestionEngine;
  window.Animations      = Animations;

})();