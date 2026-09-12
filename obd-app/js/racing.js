/**
 * RacingView - Dashboard de carreras tipo F1.
 * Rev limiter LED, barras verticales throttle/brake, gear indicator, speed.
 * Polling ultra-rápido (200ms). Estructura con utilidades de Bootstrap;
 * los widgets sin equivalente (rev-limiter, v-bars, gear circle) usan
 * las clases td-* de css/theme.css.
 */

const RacingView = (() => {
  let pollInterval = null;
  let data = { rpm: 0, speed: 0, throttle: 0, brake: 0, temp: 0, load: 0, gear: 'N' };
  let lastSpeed = 0;
  let altPoll = 0;

  function render() {
    const content = document.getElementById('app-content');

    if (!OBDManager.isConnected) {
      content.innerHTML = `
        <div class="d-flex align-items-center justify-content-center text-center" style="min-height: calc(100vh - var(--td-header-height) - var(--td-nav-height) - 2rem);">
          <div class="border border-danger-subtle rounded p-4 bg-black bg-opacity-50">
            <div class="fw-bold td-mono mb-2" style="color:var(--td-red); letter-spacing:2px;">SISTEMA OFFLINE</div>
            <div class="text-secondary small fw-bold" style="letter-spacing:1px;">CONECTA EL ELM327 EN EL DASHBOARD PRINCIPAL</div>
          </div>
        </div>
      `;
      return;
    }

    content.innerHTML = `
      <div class="td-rev-limiter mb-3" id="rev-limiter"></div>

      <div class="d-flex align-items-center justify-content-around mb-4">
        <div class="text-center">
          <div class="td-vbar-label mb-1">THR</div>
          <div class="td-vbar-track">
            <div class="td-vbar-fill" id="vbar-thr" style="height:0%; background:var(--td-green);"></div>
          </div>
          <div class="td-vbar-value mt-1" id="vbar-thr-val">0%</div>
        </div>

        <div class="d-flex flex-column align-items-center gap-3">
          <div class="td-gear-circle">
            <span class="td-gear-text" id="gear-display">N</span>
          </div>
          <div class="text-center">
            <div class="td-mono fw-bold" style="font-size:3.5rem; line-height:1;" id="race-speed">0</div>
            <div class="text-secondary fw-bold small" style="letter-spacing:3px;">KM/H</div>
          </div>
        </div>

        <div class="text-center">
          <div class="td-vbar-label mb-1">BRK</div>
          <div class="td-vbar-track">
            <div class="td-vbar-fill" id="vbar-brk" style="height:0%; background:var(--td-red);"></div>
          </div>
          <div class="td-vbar-value mt-1" id="vbar-brk-val">0%</div>
        </div>
      </div>

      <div class="row g-2 td-data-strip text-center mb-4">
        <div class="col-4">
          <div class="td-data-card py-2">
            <div class="td-data-key">WATER</div>
            <div class="td-data-val" id="race-temp">0°C</div>
          </div>
        </div>
        <div class="col-4">
          <div class="td-data-card py-2">
            <div class="td-data-key">ENGINE LOAD</div>
            <div class="td-data-val" id="race-load">0%</div>
          </div>
        </div>
        <div class="col-4">
          <div class="td-data-card py-2">
            <div class="td-data-key">REAL RPM</div>
            <div class="td-data-val" id="race-rpm">0</div>
          </div>
        </div>
      </div>

      <button class="btn btn-outline-light w-100 fw-bold" id="racing-exit">← VOLVER</button>
    `;

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
      let cls = 'td-rev-segment';
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
      tempEl.style.color = data.temp > 100 ? 'var(--td-red)' : '';
    }

    const thrFill = document.getElementById('vbar-thr');
    const brkFill = document.getElementById('vbar-brk');
    if (thrFill) thrFill.style.height = `${Math.min(data.throttle, 100)}%`;
    if (brkFill) brkFill.style.height = `${Math.min(data.brake, 100)}%`;
    set('vbar-thr-val', `${Math.round(data.throttle)}%`);
    set('vbar-brk-val', `${Math.round(data.brake)}%`);

    renderRevLimiter(data.rpm);
  }

  function stopPolling() {
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
  }

  function onConnect() { render(); }
  function destroy() { stopPolling(); }

  return { render, destroy, onConnect };
})();