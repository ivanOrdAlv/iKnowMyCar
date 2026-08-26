/**
 * RacingView - Dashboard de carreras tipo F1.
 * Rev limiter LED, barras verticales throttle/brake, gear indicator, speed.
 * Polling ultra-rápido (200ms).
 */

const RacingView = (() => {
  let pollInterval = null;
  let data = { rpm: 0, speed: 0, throttle: 0, brake: 0, temp: 0, load: 0, gear: 'N' };
  let lastSpeed = 0;
  let altPoll = 0;

  function render() {
    const content = document.getElementById('app-content');
    content.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'racing-container';
    container.id = 'racing-container';

    if (!OBDManager.isConnected) {
      container.innerHTML = `
        <div class="disconnect-overlay">
          <div class="warning-box">
            <div class="warning-title">SISTEMA OFFLINE</div>
            <div class="warning-text">CONECTA EL ELM327 EN EL DASHBOARD PRINCIPAL</div>
          </div>
        </div>
      `;
      content.appendChild(container);
      return;
    }

    container.innerHTML = `
      <div class="rev-limiter" id="rev-limiter"></div>
      <div class="racing-main">
        <div class="v-bar">
          <span class="v-bar-label">THR</span>
          <div class="v-bar-bg">
            <div class="v-bar-fill" id="vbar-thr" style="height:0%; background:#00FF41;"></div>
          </div>
          <span class="v-bar-value" id="vbar-thr-val">0%</span>
        </div>
        <div class="racing-center">
          <div class="gear-circle">
            <span class="gear-text" id="gear-display">N</span>
          </div>
          <div class="racing-speed">
            <div class="racing-speed-value" id="race-speed">0</div>
            <div class="racing-speed-label">KM/H</div>
          </div>
        </div>
        <div class="v-bar right">
          <span class="v-bar-label">BRK</span>
          <div class="v-bar-bg">
            <div class="v-bar-fill" id="vbar-brk" style="height:0%; background:#FF3B30;"></div>
          </div>
          <span class="v-bar-value" id="vbar-brk-val">0%</span>
        </div>
      </div>
      <div class="data-strip">
        <div class="data-block">
          <div class="data-key">WATER</div>
          <div class="data-val" id="race-temp">0°C</div>
        </div>
        <div class="data-block">
          <div class="data-key">ENGINE LOAD</div>
          <div class="data-val" id="race-load">0%</div>
        </div>
        <div class="data-block">
          <div class="data-key">REAL RPM</div>
          <div class="data-val" id="race-rpm">0</div>
        </div>
      </div>
      <button class="racing-exit-btn" id="racing-exit">← VOLVER</button>
    `;

    content.appendChild(container);

    // Botón de volver
    document.getElementById('racing-exit').addEventListener('click', () => {
      stopPolling();
      App.navigateTo('dashboard');
    });

    renderRevLimiter(data.rpm);
    startPolling();
  }

  function renderRevLimiter(rpm) {
    const container = document.getElementById('rev-limiter');
    if (!container) return;

    const maxRpm = SettingsManager.get('racingMaxRPM') || 7000;
    const segments = 16;
    const ratio = Math.min(rpm / maxRpm, 1);
    const active = Math.floor(ratio * segments);
    const isRevLimit = active >= segments - 1;
    const blinkPhase = isRevLimit && Math.floor(Date.now() / 80) % 2 === 0;

    let html = '';
    for (let i = 0; i < segments; i++) {
      let cls = 'rev-segment';
      if (i < active) {
        if (isRevLimit && blinkPhase && i >= segments - 4) {
          cls += ' blink';
        } else if (i < 6) {
          cls += ' green';
        } else if (i < 11) {
          cls += ' yellow';
        } else {
          cls += ' red';
        }
      }
      html += `<div class="${cls}"></div>`;
    }
    container.innerHTML = html;
  }

  function startPolling() {
    if (pollInterval) clearInterval(pollInterval);

    pollInterval = setInterval(async () => {
      if (!OBDManager.isConnected) {
        stopPolling();
        render();
        return;
      }

      try {
        const rpm = await OBDManager.requestPID('010C');
        const speed = await OBDManager.requestPID('010D');
        const throttle = await OBDManager.requestPID('0111');

        altPoll++;
        let load = data.load;
        let temp = data.temp;
        if (altPoll % 5 === 0) {
          const l = await OBDManager.requestPID('0104');
          const t = await OBDManager.requestPID('0105');
          if (l != null) load = l;
          if (t != null) temp = t;
        }

        let brakeValue = 0;
        if (speed < lastSpeed - 0.2) {
          brakeValue = Math.min(100, (lastSpeed - speed) * 60);
        }
        lastSpeed = speed;

        // Gear estimado por velocidad (usando SettingsManager)
        const gear = SettingsManager.calculateGear(speed);

        data = { rpm: rpm || 0, speed: speed || 0, throttle: throttle || 0, brake: brakeValue, temp, load, gear };
        updateUI();
      } catch (e) { console.warn('Race poll error:', e); }
    }, 200);
  }

  function updateUI() {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    set('race-speed', Math.round(data.speed));
    set('gear-display', data.gear);
    set('race-rpm', Math.round(data.rpm));
    set('race-load', `${Math.round(data.load)}%`);

    const tempEl = document.getElementById('race-temp');
    if (tempEl) {
      tempEl.textContent = `${Math.round(data.temp)}°C`;
      if (data.temp > 100) tempEl.style.color = '#FF3B30';
      else tempEl.style.color = '#FFF';
    }

    // Vertical bars
    const thrFill = document.getElementById('vbar-thr');
    const brkFill = document.getElementById('vbar-brk');
    if (thrFill) thrFill.style.height = `${Math.min(data.throttle, 100)}%`;
    if (brkFill) brkFill.style.height = `${Math.min(data.brake, 100)}%`;
    set('vbar-thr-val', `${Math.round(data.throttle)}%`);
    set('vbar-brk-val', `${Math.round(data.brake)}%`);

    // Rev limiter
    renderRevLimiter(data.rpm);
  }

  function stopPolling() {
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
  }

  function onConnect() { render(); }
  function destroy() { stopPolling(); }

  return { render, destroy, onConnect };
})();
