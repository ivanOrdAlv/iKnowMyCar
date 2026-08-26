/**
 * PerformanceView - G-Meter + 0-100 Timer + 1/4 Milla
 * 
 * Usa DeviceMotionEvent para el G-Meter y datos OBD para los cronómetros.
 */

const PerformanceView = (() => {
  let currentMode = 'menu'; // menu | gmeter | accel | quarter
  let motionHandler = null;
  let obdInterval = null;

  // G-Meter state
  let gData = { lateral: 0, longitudinal: 0, maxLateral: 0, maxLongitudinal: 0, maxBraking: 0 };

  // Acceleration timer state
  let accelState = 'idle'; // idle | waiting | running | finished
  let accelStartTime = 0;
  let accelStartKm = 0;
  let accelCurrentSpeed = 0;
  let accelTargetSpeed = 100; // 0-100 o 0-200
  let accelDistance = 0;
  let accelTime = 0;
  let lastSpeed = 0;

  // Quarter mile state
  let quarterState = 'idle';
  let quarterStartTime = 0;
  let quarterDistance = 0;
  let quarterCurrentSpeed = 0;
  let quarterTime = 0;
  let lastQuarterSpeed = 0;

  function render() {
    if (currentMode === 'menu') renderMenu();
    else if (currentMode === 'gmeter') renderGmeter();
    else if (currentMode === 'accel') renderAccel();
    else if (currentMode === 'quarter') renderQuarter();
  }

  // ================================================================
  //  MENU
  // ================================================================

  function renderMenu() {
    const content = document.getElementById('app-content');
    const best0100 = PerformanceStorage.getBest('0-100');
    const bestQuarter = PerformanceStorage.getBest('quarter');
    const bestG = PerformanceStorage.getBest('g-meter');

    content.innerHTML = `
      <button class="btn-back" id="btn-back-perf">← VOLVER</button>
      <h2 class="section-detail-title">PERFORMANCE</h2>

      <div class="perf-menu-grid">
        <div class="perf-menu-card" data-mode="gmeter">
          <div class="perf-menu-icon">📐</div>
          <div class="perf-menu-title">G-METER</div>
          <div class="perf-menu-desc">Fuerzas G en tiempo real</div>
          ${bestG ? `<div class="perf-menu-best">MAX: ${bestG.value}G</div>` : ''}
        </div>

        <div class="perf-menu-card" data-mode="accel">
          <div class="perf-menu-icon">⚡</div>
          <div class="perf-menu-title">0-100 KM/H</div>
          <div class="perf-menu-desc">Cronómetro de aceleración</div>
          ${best0100 ? `<div class="perf-menu-best">MEJOR: ${best0100.time.toFixed(2)}s</div>` : ''}
        </div>

        <div class="perf-menu-card" data-mode="quarter">
          <div class="perf-menu-icon">🏁</div>
          <div class="perf-menu-title">1/4 MILLA</div>
          <div class="perf-menu-desc">402m desde parado</div>
          ${bestQuarter ? `<div class="perf-menu-best">${bestQuarter.time.toFixed(2)}s @ ${bestQuarter.speed}km/h</div>` : ''}
        </div>
      </div>

      ${renderBestTimesList()}
    `;

    document.getElementById('btn-back-perf').addEventListener('click', () => App.navigateTo('dashboard'));

    document.querySelectorAll('.perf-menu-card').forEach(card => {
      card.addEventListener('click', () => {
        currentMode = card.dataset.mode;
        render();
      });
    });
  }

  function renderBestTimesList() {
    const records = PerformanceStorage.getRecords();
    if (records.length === 0) return '';

    return `
      <div class="card" style="margin-top:16px;">
        <div class="card-title">MEJORES TIEMPOS</div>
        ${records.slice(0, 10).map(r => `
          <div class="perf-record-row">
            <div class="perf-record-type">${r.type === '0-100' ? '⚡' : r.type === 'quarter' ? '🏁' : '📐'}</div>
            <div class="perf-record-info">
              <div class="perf-record-label">${r.type === '0-100' ? '0-100 km/h' : r.type === 'quarter' ? '1/4 Milla' : 'G-Meter Max'}</div>
              <div class="perf-record-date">${new Date(r.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</div>
            </div>
            <div class="perf-record-value">${r.type === 'g-meter' ? r.value + 'G' : r.time.toFixed(2) + 's'}</div>
            <button class="btn-delete-record" data-id="${r.id}">🗑</button>
          </div>
        `).join('')}
        <button class="btn-reset" id="btn-clear-perf" style="margin-top:12px;">BORRAR HISTORIAL</button>
      </div>
    `;
  }

  // ================================================================
  //  G-METER
  // ================================================================

  function renderGmeter() {
    const content = document.getElementById('app-content');
    gData = { lateral: 0, longitudinal: 0, maxLateral: 0, maxLongitudinal: 0, maxBraking: 0 };

    content.innerHTML = `
      <button class="btn-back" id="btn-back-gmeter">← VOLVER</button>

      <div class="gmeter-container">
        <div class="gmeter-ring">
          <svg width="280" height="280" viewBox="0 0 280 280">
            <!-- Círculos de referencia -->
            <circle cx="140" cy="140" r="120" fill="none" stroke="#111" stroke-width="1"/>
            <circle cx="140" cy="140" r="80" fill="none" stroke="#111" stroke-width="1"/>
            <circle cx="140" cy="140" r="40" fill="none" stroke="#111" stroke-width="1"/>
            <!-- Líneas de referencia -->
            <line x1="140" y1="20" x2="140" y2="260" stroke="#111" stroke-width="1"/>
            <line x1="20" y1="140" x2="260" y2="140" stroke="#111" stroke-width="1"/>
            <!-- Etiquetas -->
            <text x="140" y="16" text-anchor="middle" fill="#333" font-size="10" font-weight="900">ACEL</text>
            <text x="140" y="274" text-anchor="middle" fill="#333" font-size="10" font-weight="900">FREN</text>
            <text x="8" y="143" text-anchor="middle" fill="#333" font-size="10" font-weight="900">IZQ</text>
            <text x="272" y="143" text-anchor="middle" fill="#333" font-size="10" font-weight="900">DER</text>
            <!-- Valores G -->
            <text x="140" y="35" text-anchor="middle" fill="#444" font-size="8">1G</text>
            <text x="140" y="75" text-anchor="middle" fill="#444" font-size="8">0.5G</text>
            <!-- Punto indicador -->
            <circle id="g-dot" cx="140" cy="140" r="12" fill="#00FF41" opacity="0.9">
              <animate attributeName="opacity" values="0.7;1;0.7" dur="1.5s" repeatCount="indefinite"/>
            </circle>
            <!-- Trail (estela) -->
            <circle id="g-trail-1" cx="140" cy="140" r="6" fill="#00FF41" opacity="0.2"/>
            <circle id="g-trail-2" cx="140" cy="140" r="4" fill="#00FF41" opacity="0.1"/>
          </svg>
        </div>

        <div class="gmeter-values">
          <div class="gmeter-value-box">
            <div class="gmeter-value-label">LATERAL</div>
            <div class="gmeter-value" id="g-lateral">0.00</div>
            <div class="gmeter-value-unit">G</div>
          </div>
          <div class="gmeter-value-box">
            <div class="gmeter-value-label">LONGITUD.</div>
            <div class="gmeter-value" id="g-longitudinal">0.00</div>
            <div class="gmeter-value-unit">G</div>
          </div>
        </div>

        <div class="gmeter-max-row">
          <div class="gmeter-max">
            <span class="gmeter-max-label">MAX LATERAL</span>
            <span class="gmeter-max-value" id="g-max-lat">0.00G</span>
          </div>
          <div class="gmeter-max">
            <span class="gmeter-max-label">MAX ACEL</span>
            <span class="gmeter-max-value" id="g-max-acc">0.00G</span>
          </div>
          <div class="gmeter-max">
            <span class="gmeter-max-label">MAX FREN</span>
            <span class="gmeter-max-value" id="g-max-brk">0.00G</span>
          </div>
        </div>

        <button class="btn-primary" id="btn-save-gmeter" style="margin-top:16px;">GUARDAR MAX G</button>
      </div>
    `;

    document.getElementById('btn-back-gmeter').addEventListener('click', () => { stopMotion(); currentMode = 'menu'; render(); });
    document.getElementById('btn-save-gmeter').addEventListener('click', saveMaxG);

    startMotion();
  }

  function startMotion() {
    // iOS requiere permiso explícito
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission().then(response => {
        if (response === 'granted') attachMotion();
        else alert('Permiso denegado para el acelerómetro');
      }).catch(() => alert('Error solicitando permiso del acelerómetro'));
    } else {
      attachMotion();
    }
  }

  function attachMotion() {
    const trail = [{ x: 140, y: 140 }, { x: 140, y: 140 }];

    motionHandler = (event) => {
      const acc = event.acceleration || event.accelerationIncludingGravity;
      if (!acc) return;

      // x = lateral, y = longitudinal (aceleración/frenada)
      const lat = (acc.x || 0) / 9.81;
      const lon = (acc.y || 0) / 9.81;

      gData.lateral = lat;
      gData.longitudinal = lon;
      gData.maxLateral = Math.max(gData.maxLateral, Math.abs(lat));
      if (lon > 0) gData.maxLongitudinal = Math.max(gData.maxLongitudinal, lon); // aceleración
      if (lon < 0) gData.maxBraking = Math.max(gData.maxBraking, Math.abs(lon)); // frenada

      // Actualizar UI
      const dot = document.getElementById('g-dot');
      if (dot) {
        // Mapear G a píxeles (1G = 120px de radio)
        const px = 140 + lat * 120;
        const py = 140 - lon * 120; // Invertido: aceleración = arriba
        dot.setAttribute('cx', Math.max(20, Math.min(260, px)));
        dot.setAttribute('cy', Math.max(20, Math.min(260, py)));

        // Color según fuerza
        const totalG = Math.sqrt(lat * lat + lon * lon);
        if (totalG > 0.8) dot.setAttribute('fill', '#FF3B30');
        else if (totalG > 0.5) dot.setAttribute('fill', '#FFD700');
        else dot.setAttribute('fill', '#00FF41');

        // Trail
        trail.unshift({ x: px, y: py });
        trail.length = 3;
        const t1 = document.getElementById('g-trail-1');
        const t2 = document.getElementById('g-trail-2');
        if (t1 && trail[1]) { t1.setAttribute('cx', trail[1].x); t1.setAttribute('cy', trail[1].y); }
        if (t2 && trail[2]) { t2.setAttribute('cx', trail[2].x); t2.setAttribute('cy', trail[2].y); }
      }

      const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      set('g-lateral', lat.toFixed(2));
      set('g-longitudinal', lon.toFixed(2));
      set('g-max-lat', gData.maxLateral.toFixed(2) + 'G');
      set('g-max-acc', gData.maxLongitudinal.toFixed(2) + 'G');
      set('g-max-brk', gData.maxBraking.toFixed(2) + 'G');
    };

    window.addEventListener('devicemotion', motionHandler);
  }

  function stopMotion() {
    if (motionHandler) {
      window.removeEventListener('devicemotion', motionHandler);
      motionHandler = null;
    }
  }

  function saveMaxG() {
    const maxG = Math.max(gData.maxLateral, gData.maxLongitudinal, gData.maxBraking);
    if (maxG < 0.1) { alert('No se han detectado fuerzas G significativas'); return; }
    PerformanceStorage.addRecord({
      type: 'g-meter',
      value: parseFloat(maxG.toFixed(2)),
      lateral: parseFloat(gData.maxLateral.toFixed(2)),
      acceleration: parseFloat(gData.maxLongitudinal.toFixed(2)),
      braking: parseFloat(gData.maxBraking.toFixed(2)),
    });
    alert(`Registrado: ${maxG.toFixed(2)}G máximo`);
    currentMode = 'menu';
    stopMotion();
    render();
  }

  // ================================================================
  //  0-100 KM/H
  // ================================================================

  function renderAccel() {
    const content = document.getElementById('app-content');
    accelState = 'idle';
    accelTime = 0;
    accelDistance = 0;
    accelCurrentSpeed = 0;

    content.innerHTML = `
      <button class="btn-back" id="btn-back-accel">← VOLVER</button>

      <div class="accel-container">
        <div class="accel-target-row">
          <button class="accel-target-btn active" data-target="100">0-100</button>
          <button class="accel-target-btn" data-target="200">0-200</button>
        </div>

        <div class="accel-display">
          <div class="accel-time" id="accel-time">0.00</div>
          <div class="accel-time-label">SEGUNDOS</div>
        </div>

        <div class="accel-speed-display">
          <div class="accel-speed" id="accel-speed">0</div>
          <div class="accel-speed-label">KM/H</div>
        </div>

        <div class="accel-stats-row">
          <div class="accel-stat">
            <div class="accel-stat-value" id="accel-distance">0</div>
            <div class="accel-stat-label">METROS</div>
          </div>
          <div class="accel-stat">
            <div class="accel-stat-value" id="accel-status">PARADO</div>
            <div class="accel-stat-label">ESTADO</div>
          </div>
        </div>

        <div class="accel-instruction" id="accel-instruction">
          ${!OBDManager.isConnected ? '⚠️ CONECTA EL OBD PARA EMPEZAR' : 'PULSA INICIAR Y PISA A FONDO'}
        </div>

        <button class="btn-primary" id="btn-accel-start" ${!OBDManager.isConnected ? 'disabled' : ''}>
          INICIAR PRUEBA
        </button>

        <button class="btn-secondary" id="btn-accel-reset" style="margin-top:10px; display:none;">REINICIAR</button>
      </div>
    `;

    document.getElementById('btn-back-accel').addEventListener('click', () => { stopAccel(); currentMode = 'menu'; render(); });

    document.querySelectorAll('.accel-target-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.accel-target-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        accelTargetSpeed = parseInt(btn.dataset.target);
      });
    });

    document.getElementById('btn-accel-start').addEventListener('click', startAccel);
    document.getElementById('btn-accel-reset').addEventListener('click', () => { stopAccel(); renderAccel(); });
  }

  function startAccel() {
    accelState = 'waiting';
    accelDistance = 0;
    lastSpeed = 0;
    document.getElementById('accel-status').textContent = 'ESPERANDO';
    document.getElementById('accel-instruction').textContent = 'EMPIEZA A MOVERTE...';
    document.getElementById('btn-accel-start').style.display = 'none';
    document.getElementById('btn-accel-reset').style.display = 'block';

    obdInterval = setInterval(async () => {
      if (!OBDManager.isConnected) { stopAccel(); return; }

      try {
        const speed = await OBDManager.requestPID('010D');
        if (speed == null) return;

        accelCurrentSpeed = speed;
        document.getElementById('accel-speed').textContent = Math.round(speed);

        // Calcular distancia
        if (accelState === 'running' || accelState === 'waiting') {
          const dt = 0.2; // 200ms entre lecturas
          accelDistance += (speed / 3.6) * dt; // m/s * s = metros
          document.getElementById('accel-distance').textContent = Math.round(accelDistance);
        }

        if (accelState === 'waiting' && speed > 2) {
          // Empezar cronómetro
          accelState = 'running';
          accelStartTime = performance.now();
          accelStartKm = speed;
          accelDistance = 0;
          document.getElementById('accel-status').textContent = '¡GO!';
          document.getElementById('accel-instruction').textContent = `ACELERANDO HASTA ${accelTargetSpeed} KM/H`;
        }

        if (accelState === 'running') {
          accelTime = (performance.now() - accelStartTime) / 1000;
          document.getElementById('accel-time').textContent = accelTime.toFixed(2);

          if (speed >= accelTargetSpeed) {
            // ¡Fin!
            accelState = 'finished';
            accelTime = (performance.now() - accelStartTime) / 1000;
            document.getElementById('accel-time').textContent = accelTime.toFixed(2);
            document.getElementById('accel-status').textContent = '✓ FIN';
            document.getElementById('accel-instruction').textContent = `0-${accelTargetSpeed}: ${accelTime.toFixed(2)}s · ${Math.round(accelDistance)}m`;

            // Guardar
            PerformanceStorage.addRecord({
              type: '0-100',
              target: accelTargetSpeed,
              time: parseFloat(accelTime.toFixed(2)),
              distance: Math.round(accelDistance),
              speed: Math.round(speed),
            });

            clearInterval(obdInterval);
            obdInterval = null;
          }
        }
      } catch (e) { console.warn('Accel poll error:', e); }
    }, 200);
  }

  function stopAccel() {
    if (obdInterval) { clearInterval(obdInterval); obdInterval = null; }
    accelState = 'idle';
  }

  // ================================================================
  //  1/4 MILLA (402m)
  // ================================================================

  function renderQuarter() {
    const content = document.getElementById('app-content');
    quarterState = 'idle';
    quarterTime = 0;
    quarterDistance = 0;
    quarterCurrentSpeed = 0;

    content.innerHTML = `
      <button class="btn-back" id="btn-back-quarter">← VOLVER</button>

      <div class="accel-container">
        <div class="accel-display">
          <div class="accel-time" id="q-time">0.00</div>
          <div class="accel-time-label">SEGUNDOS</div>
        </div>

        <div class="accel-speed-display">
          <div class="accel-speed" id="q-speed">0</div>
          <div class="accel-speed-label">KM/H</div>
        </div>

        <!-- Barra de progreso 402m -->
        <div class="quarter-progress">
          <div class="quarter-progress-bar" id="q-progress-bar" style="width:0%"></div>
          <div class="quarter-progress-labels">
            <span>0m</span>
            <span>100m</span>
            <span>200m</span>
            <span>300m</span>
            <span>402m</span>
          </div>
        </div>

        <div class="accel-stats-row">
          <div class="accel-stat">
            <div class="accel-stat-value" id="q-distance">0</div>
            <div class="accel-stat-label">METROS</div>
          </div>
          <div class="accel-stat">
            <div class="accel-stat-value" id="q-status">PARADO</div>
            <div class="accel-stat-label">ESTADO</div>
          </div>
        </div>

        <div class="accel-instruction" id="q-instruction">
          ${!OBDManager.isConnected ? '⚠️ CONECTA EL OBD PARA EMPEZAR' : 'PULSA INICIAR Y PISA A FONDO'}
        </div>

        <button class="btn-primary" id="btn-q-start" ${!OBDManager.isConnected ? 'disabled' : ''}>INICIAR 1/4 MILLA</button>
        <button class="btn-secondary" id="btn-q-reset" style="margin-top:10px; display:none;">REINICIAR</button>
      </div>
    `;

    document.getElementById('btn-back-quarter').addEventListener('click', () => { stopQuarter(); currentMode = 'menu'; render(); });
    document.getElementById('btn-q-start').addEventListener('click', startQuarter);
    document.getElementById('btn-q-reset').addEventListener('click', () => { stopQuarter(); renderQuarter(); });
  }

  function startQuarter() {
    quarterState = 'waiting';
    quarterDistance = 0;
    lastQuarterSpeed = 0;
    document.getElementById('q-status').textContent = 'ESPERANDO';
    document.getElementById('q-instruction').textContent = 'EMPIEZA A MOVERTE...';
    document.getElementById('btn-q-start').style.display = 'none';
    document.getElementById('btn-q-reset').style.display = 'block';

    obdInterval = setInterval(async () => {
      if (!OBDManager.isConnected) { stopQuarter(); return; }

      try {
        const speed = await OBDManager.requestPID('010D');
        if (speed == null) return;

        quarterCurrentSpeed = speed;
        document.getElementById('q-speed').textContent = Math.round(speed);

        if (quarterState === 'waiting' || quarterState === 'running') {
          const dt = 0.2;
          quarterDistance += (speed / 3.6) * dt;
          document.getElementById('q-distance').textContent = Math.round(quarterDistance);

          const pct = Math.min((quarterDistance / 402) * 100, 100);
          const bar = document.getElementById('q-progress-bar');
          if (bar) bar.style.width = pct + '%';
        }

        if (quarterState === 'waiting' && speed > 2) {
          quarterState = 'running';
          quarterStartTime = performance.now();
          quarterDistance = 0;
          document.getElementById('q-status').textContent = '¡GO!';
          document.getElementById('q-instruction').textContent = 'ACELERANDO... 402 METROS';
        }

        if (quarterState === 'running') {
          quarterTime = (performance.now() - quarterStartTime) / 1000;
          document.getElementById('q-time').textContent = quarterTime.toFixed(2);

          if (quarterDistance >= 402) {
            quarterState = 'finished';
            quarterTime = (performance.now() - quarterStartTime) / 1000;
            document.getElementById('q-time').textContent = quarterTime.toFixed(2);
            document.getElementById('q-status').textContent = '✓ FIN';
            document.getElementById('q-instruction').textContent = `1/4 MILLA: ${quarterTime.toFixed(2)}s @ ${Math.round(speed)} km/h`;

            PerformanceStorage.addRecord({
              type: 'quarter',
              time: parseFloat(quarterTime.toFixed(2)),
              distance: 402,
              speed: Math.round(speed),
            });

            clearInterval(obdInterval);
            obdInterval = null;
          }
        }
      } catch (e) { console.warn('Quarter poll error:', e); }
    }, 200);
  }

  function stopQuarter() {
    if (obdInterval) { clearInterval(obdInterval); obdInterval = null; }
    quarterState = 'idle';
  }

  function destroy() {
    stopMotion();
    stopAccel();
    stopQuarter();
    currentMode = 'menu';
  }

  return { render, destroy };
})();
