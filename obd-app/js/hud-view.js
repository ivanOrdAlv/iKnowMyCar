/**
 * HUDView - Head-Up Display (modo espejo para proyectar en parabrisas)
 * 
 * Muestra velocidad, RPM, marcha y temperatura en modo reflejado.
 * Pantalla completa, diseño minimalista, colores brillantes.
 */

const HUDView = (() => {
  let pollInterval = null;
  let data = { speed: 0, rpm: 0, gear: 'N', temp: 0, throttle: 0 };
  let lastSpeed = 0;
  let isFullscreen = false;

  function render() {
    const content = document.getElementById('app-content');
    
    // Ocultar header y nav
    document.getElementById('app-header').style.display = 'none';
    document.getElementById('bottom-nav').style.display = 'none';

    content.innerHTML = `
      <div class="hud-container" id="hud-container">
        <button class="hud-exit" id="hud-exit">✕</button>
        <button class="hud-fullscreen" id="hud-fullscreen">⛶</button>
        
        <div class="hud-content">
          <!-- RPM Bar superior -->
          <div class="hud-rpm-bar">
            <div class="hud-rpm-segments" id="hud-rpm-segments"></div>
          </div>

          <!-- Marcha y Velocidad -->
          <div class="hud-main">
            <div class="hud-gear">
              <div class="hud-gear-value" id="hud-gear">N</div>
            </div>
            <div class="hud-speed-section">
              <div class="hud-speed" id="hud-speed">0</div>
              <div class="hud-speed-unit">KM/H</div>
            </div>
          </div>

          <!-- Datos inferiores -->
          <div class="hud-bottom-row">
            <div class="hud-data-item">
              <div class="hud-data-value" id="hud-rpm">0</div>
              <div class="hud-data-label">RPM</div>
            </div>
            <div class="hud-data-item">
              <div class="hud-data-value" id="hud-temp">--</div>
              <div class="hud-data-label">°C</div>
            </div>
            <div class="hud-data-item">
              <div class="hud-data-value" id="hud-throttle">0</div>
              <div class="hud-data-label">THR%</div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Aplicar espejo horizontal
    const hudContainer = document.getElementById('hud-container');
    hudContainer.classList.add('hud-mirrored');

    // Listeners
    document.getElementById('hud-exit').addEventListener('click', exitHUD);
    document.getElementById('hud-fullscreen').addEventListener('click', toggleFullscreen);

    // Fullscreen al entrar
    requestFullscreen();

    // Renderizar segmentos RPM
    renderRPMSegments(0);

    // Iniciar polling OBD
    startPolling();
  }

  function startPolling() {
    if (pollInterval) clearInterval(pollInterval);

    pollInterval = setInterval(async () => {
      if (!OBDManager.isConnected) return;

      try {
        const speed = await OBDManager.requestPID('010D');
        const rpm = await OBDManager.requestPID('010C');
        const throttle = await OBDManager.requestPID('0111');

        let temp = data.temp;
        if (Math.random() > 0.8) {
          const t = await OBDManager.requestPID('0105');
          if (t != null) temp = t;
        }

        data = {
          speed: speed || 0,
          rpm: rpm || 0,
          throttle: throttle || 0,
          temp,
          gear: calculateGear(speed || 0),
        };

        updateUI();
      } catch (e) {
        console.warn('HUD poll error:', e);
      }
    }, 250);
  }

  function updateUI() {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    set('hud-speed', Math.round(data.speed));
    set('hud-rpm', Math.round(data.rpm));
    set('hud-gear', data.gear);
    set('hud-throttle', Math.round(data.throttle));

    // Temperatura con color si es alta
    const tempEl = document.getElementById('hud-temp');
    if (tempEl) {
      tempEl.textContent = Math.round(data.temp);
      const threshold = SettingsManager.get('alertEngineTempThreshold') || 105;
      if (data.temp > threshold) {
        tempEl.style.color = '#FF3B30';
      } else if (data.temp > threshold - 10) {
        tempEl.style.color = '#FFD700';
      } else {
        tempEl.style.color = '#FFF';
      }
    }

    // RPM segments
    renderRPMSegments(data.rpm);
  }

  function renderRPMSegments(rpm) {
    const container = document.getElementById('hud-rpm-segments');
    if (!container) return;

    const maxRpm = SettingsManager.get('racingMaxRPM') || 7000;
    const segments = 20;
    const ratio = Math.min(rpm / maxRpm, 1);
    const active = Math.floor(ratio * segments);
    const shiftRpm = SettingsManager.get('racingShiftRPM') || 5500;
    const isShiftZone = rpm >= shiftRpm;

    let html = '';
    for (let i = 0; i < segments; i++) {
      let color = '#1A1A1A';
      if (i < active) {
        if (i < segments * 0.4) color = '#00FF41';       // Verde
        else if (i < segments * 0.7) color = '#FFD700';  // Amarillo
        else color = '#FF3B30';                           // Rojo
      }

      // Parpadeo en zona de cambio
      if (isShiftZone && i >= segments - 4) {
        const blink = Math.floor(Date.now() / 100) % 2 === 0;
        if (blink) color = '#FFF';
      }

      html += `<div class="hud-rpm-segment" style="background:${color}"></div>`;
    }
    container.innerHTML = html;
  }

  function calculateGear(speed) {
    return SettingsManager.calculateGear(speed);
  }

  function requestFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().then(() => {
        isFullscreen = true;
      }).catch(() => {
        // Fallback: intentar con webkit (iOS Safari)
        if (el.webkitRequestFullscreen) {
          el.webkitRequestFullscreen();
          isFullscreen = true;
        }
      });
    }
  }

  function toggleFullscreen() {
    if (isFullscreen) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
      isFullscreen = false;
    } else {
      requestFullscreen();
    }
  }

  function exitHUD() {
    if (isFullscreen) {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
    stopPolling();
    // Restaurar header y nav
    document.getElementById('app-header').style.display = 'flex';
    document.getElementById('bottom-nav').style.display = 'flex';
    App.navigateTo('dashboard');
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  function destroy() {
    stopPolling();
    // Restaurar header y nav si se destruye
    const header = document.getElementById('app-header');
    const nav = document.getElementById('bottom-nav');
    if (header) header.style.display = 'flex';
    if (nav) nav.style.display = 'flex';
  }

  return { render, destroy };
})();
