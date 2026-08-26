/**
 * RouteView - Pantalla de telemetría (TRACK).
 * Estilo F1: grabación con telemetry bars, shift light, guardar/descartar.
 */

const RouteView = (() => {
  let status = 'idle';
  let summary = null;
  let pollInterval = null;
  let activeTripId = null;
  let elapsedSeconds = 0;
  let timerInterval = null;
  let telemetry = { rpm: 0, speed: 0, throttle: 0, brake: 0, fuelRate: 0, temp: 0 };
  let lastSpeed = 0;
  let tickCount = 0;

  function render() {
    const content = document.getElementById('app-content');

    if (status === 'idle') renderIdle(content);
    else if (status === 'recording') renderRecording(content);
    else if (status === 'processing') renderProcessing(content);
    else if (status === 'summary') renderSummary(content);
  }

  function renderIdle(el) {
    el.innerHTML = `
      <div class="route-hero">
        <div class="route-hero-title">TELEMETRÍA</div>
        <div class="route-hero-subtitle">SISTEMA DE ADQUISICIÓN DE DATOS</div>

        <button class="btn-record" id="btn-start-route" ${!OBDManager.isConnected ? 'disabled' : ''}>
          <div class="btn-record-inner">
            <span class="btn-record-text">RECORD</span>
          </div>
        </button>

        <div class="route-status">
          <div class="route-status-dot" style="background:${OBDManager.isConnected ? '#00FF41' : '#333'}"></div>
          <span class="route-status-text">${OBDManager.isConnected ? 'SISTEMA LISTO' : 'ESPERANDO OBD'}</span>
        </div>
      </div>
    `;
    document.getElementById('btn-start-route').addEventListener('click', startRoute);
  }

  function renderRecording(el) {
    const mm = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
    const ss = String(elapsedSeconds % 60).padStart(2, '0');
      const shiftThreshold = SettingsManager.get('racingShiftRPM') || 5500;
      const showShift = telemetry.rpm > shiftThreshold;

    el.innerHTML = `
      <div class="recording-screen ${showShift ? 'shift-active' : ''}">
        ${showShift ? '<div class="shift-light"><span class="shift-light-text">SUBIR MARCHA</span></div>' : ''}
        <div class="rec-top-bar">
          <div class="rec-timer-box">
            <div class="rec-icon"></div>
            <span class="rec-timer" id="timer">${mm}:${ss}</span>
          </div>
          <button class="btn-stop" id="btn-stop-route">DETENER</button>
        </div>
        <div class="rec-telemetry">
          <div class="rec-speed-display">
            <div class="rec-speed-value" id="live-speed">${Math.round(telemetry.speed)}</div>
            <div class="rec-speed-label">KM/H</div>
          </div>
          <div>
            ${renderTelemetryBar('THROTTLE', telemetry.throttle, '#00FF41', 100)}
            ${renderTelemetryBar('BRAKE', telemetry.brake, '#FF3B30', 100)}
            ${renderTelemetryBar('POWER RANGE', telemetry.rpm, '#007AFF', 7000, true)}
          </div>
        </div>
      </div>
    `;
    document.getElementById('btn-stop-route').addEventListener('click', () => showFinishDialog());
  }

  function renderTelemetryBar(label, value, color, maxVal, isRpm = false) {
    const pct = Math.min(Math.max((value / maxVal) * 100, 0), 100);
    const isRevLimit = isRpm && pct > 90;
    const barColor = isRevLimit ? '#FF3B30' : color;
    const valText = isRpm ? Math.round(value) : Math.round(value) + '%';

    return `
      <div class="telemetry-bar">
        <div class="telemetry-bar-header">
          <span class="telemetry-bar-label">${label}</span>
          <span class="telemetry-bar-value" style="${isRevLimit ? 'color:#FF3B30' : ''}">${valText}</span>
        </div>
        <div class="telemetry-bar-bg">
          <div class="telemetry-bar-fill" style="width:${pct}%; background:${barColor}"></div>
        </div>
      </div>
    `;
  }

  function renderProcessing(el) {
    el.innerHTML = `
      <div class="processing">
        <div class="spinner"></div>
        <p style="color:#00FF41; font-weight:900; letter-spacing:2px; font-size:11px;">PROCESANDO...</p>
      </div>
    `;
  }

  function renderSummary(el) {
    if (!summary) return;
    const ec = summary.eventCounts;

    el.innerHTML = `
      <div class="summary-title">INFORME DE SESIÓN</div>
      <div class="summary-grid">
        <div class="summary-stat">
          <div class="summary-stat-value">${summary.durationMin} min</div>
          <div class="summary-stat-label">DURACIÓN</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-value">${summary.distanceKm} km</div>
          <div class="summary-stat-label">DISTANCIA</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-value">${summary.fuelUsedL} L</div>
          <div class="summary-stat-label">COMBUSTIBLE</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-value">${summary.consumptionPer100}</div>
          <div class="summary-stat-label">L/100km</div>
        </div>
      </div>

      <div class="card">
        <div class="card-title">EVENTOS DETECTADOS</div>
        <div class="event-counts">
          <div class="event-count">
            <div class="event-count-num" style="color:#FF3B30">${ec.hardBrakes}</div>
            <div style="font-size:10px;color:#666;">Frenazos</div>
          </div>
          <div class="event-count">
            <div class="event-count-num" style="color:#00FF41">${ec.hardAccels}</div>
            <div style="font-size:10px;color:#666;">Acelerones</div>
          </div>
          <div class="event-count">
            <div class="event-count-num" style="color:#FF9500">${ec.highThrottleMoments}</div>
            <div style="font-size:10px;color:#666;">A fondo</div>
          </div>
        </div>
        ${summary.events.length > 0
          ? summary.events.map(ev => {
              const meta = EventDetector.EVENT_LABELS[ev.type];
              const time = new Date(ev.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              return `<div class="event-item"><span class="event-icon">${meta.icon}</span><span>${meta.label}</span><span class="event-time">${time}</span></div>`;
            }).join('')
          : '<div class="no-events">CONDUCCIÓN SUAVE 👍</div>'
        }
      </div>

      <div style="display:flex;gap:10px;margin-top:16px;">
        <button class="btn-export" id="btn-export-json">📥 JSON</button>
        <button class="btn-export" id="btn-export-csv">📄 CSV</button>
      </div>

      <button class="btn-new-route" id="btn-new-route">NUEVA RUTA</button>
    `;

    document.getElementById('btn-new-route').addEventListener('click', resetRoute);
    document.getElementById('btn-export-json').addEventListener('click', () => exportTrip('json'));
    document.getElementById('btn-export-csv').addEventListener('click', () => exportTrip('csv'));
  }

  function showFinishDialog() {
    const modal = document.getElementById('modal-confirm');
    document.getElementById('confirm-title').textContent = 'FINALIZAR';
    document.getElementById('confirm-message').textContent = '¿Qué deseas hacer con los datos de la sesión?';
    modal.classList.remove('hidden');

    const okBtn = document.getElementById('btn-confirm-ok');
    const cancelBtn = document.getElementById('btn-confirm-cancel');

    const cleanup = () => {
      modal.classList.add('hidden');
      okBtn.replaceWith(okBtn.cloneNode(true));
      cancelBtn.replaceWith(cancelBtn.cloneNode(true));
    };

    document.getElementById('btn-confirm-ok').addEventListener('click', () => { cleanup(); finishRoute(true); });
    document.getElementById('btn-confirm-cancel').addEventListener('click', () => { cleanup(); finishTrip(false); });
  }

  async function startRoute() {
    if (!OBDManager.isConnected) return;

    const hasGPS = await LocationTracker.requestPermission();
    if (hasGPS) LocationTracker.startWatching();

    const tripId = await TripStorage.startTrip();
    activeTripId = tripId;
    elapsedSeconds = 0;
    tickCount = 0;
    telemetry = { rpm: 0, speed: 0, throttle: 0, brake: 0, fuelRate: 0, temp: 0 };
    lastSpeed = 0;
    status = 'recording';
    render();

    timerInterval = setInterval(() => {
      elapsedSeconds++;
      const timerEl = document.getElementById('timer');
      if (timerEl) {
        const mm = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
        const ss = String(elapsedSeconds % 60).padStart(2, '0');
        timerEl.textContent = `${mm}:${ss}`;
      }
    }, 1000);

    // Polling cada 500ms (más rápido)
    pollInterval = setInterval(async () => {
      try {
        const rpm = await OBDManager.requestPID('010C');
        const speed = await OBDManager.requestPID('010D');
        const throttle = await OBDManager.requestPID('0111');

        let temp = telemetry.temp;
        let maf = null;
        let fuelRate = telemetry.fuelRate;

        tickCount++;
        if (tickCount % 4 === 0) { // Cada 2 segundos
          const t = await OBDManager.requestPID('0105');
          if (t != null) temp = t;
          const m = await OBDManager.requestPID('0110');
          if (m != null) maf = m;
          fuelRate = maf > 0 ? FuelEstimator.estimateFuelRateLH(maf) : fuelRate;
        }

        let brakeValue = 0;
        if (speed < lastSpeed - 0.5) {
          brakeValue = Math.min(100, (lastSpeed - speed) * 30);
        }
        lastSpeed = speed;

        const position = LocationTracker.getLastPosition();
        await TripStorage.saveReading(activeTripId, {
          rpm, speed, coolantTemp: temp, throttle, maf, fuelRate,
          latitude: position?.latitude, longitude: position?.longitude,
        });

        telemetry = { rpm, speed, throttle, brake: brakeValue, fuelRate, temp };
        updateRecordingUI();
      } catch (e) { console.warn('Record error:', e); }
    }, 500);
  }

  function updateRecordingUI() {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('live-speed', Math.round(telemetry.speed));

    // Actualizar barras (re-render sería costoso, actualizamos por DOM)
    const bars = document.querySelectorAll('.telemetry-bar-fill');
    const values = document.querySelectorAll('.telemetry-bar-value');
    if (bars.length >= 3) {
      bars[0].style.width = `${Math.min(telemetry.throttle, 100)}%`;
      bars[1].style.width = `${Math.min(telemetry.brake, 100)}%`;
        // RPM bar uses settings max
        const maxRpm = SettingsManager.get('racingMaxRPM') || 7000;
        bars[2].style.width = `${Math.min((telemetry.rpm / maxRpm) * 100, 100)}%`;
    }
    if (values.length >= 3) {
      values[0].textContent = `${Math.round(telemetry.throttle)}%`;
      values[1].textContent = `${Math.round(telemetry.brake)}%`;
      values[2].textContent = `${Math.round(telemetry.rpm)}`;
      if (telemetry.rpm > 6300) values[2].style.color = '#FF3B30';
    }

    // Shift light
      const shiftThreshold = SettingsManager.get('racingShiftRPM') || 5500;
      if (telemetry.rpm > shiftThreshold) {
      if (!document.querySelector('.shift-light')) {
        const screen = document.querySelector('.recording-screen');
        if (screen) screen.classList.add('shift-active');
        const container = document.querySelector('.recording-screen');
        if (container) {
          const sl = document.createElement('div');
          sl.className = 'shift-light';
          sl.innerHTML = '<span class="shift-light-text">SUBIR MARCHA</span>';
          container.prepend(sl);
        }
      }
    } else {
      const sl = document.querySelector('.shift-light');
      if (sl) sl.remove();
      const screen = document.querySelector('.recording-screen');
      if (screen) screen.classList.remove('shift-active');
    }
  }

  async function finishTrip(save) {
    clearInterval(pollInterval);
    clearInterval(timerInterval);
    LocationTracker.stopWatching();
    pollInterval = null;
    timerInterval = null;

    const tripId = activeTripId;
    activeTripId = null;

    if (save) {
      status = 'processing';
      render();

      await TripStorage.endTrip(tripId);
      const readings = await TripStorage.getReadingsForTrip(tripId);
      const events = EventDetector.detectEvents(readings);
      await TripStorage.saveEvents(tripId, events);

      const totalFuel = FuelEstimator.calculateTotalFuelUsed(readings);
      const totalDistance = FuelEstimator.calculateTotalDistanceKm(readings);

      summary = {
        tripId,
        durationMin: Math.max(1, Math.round(elapsedSeconds / 60)),
        distanceKm: totalDistance.toFixed(1),
        fuelUsedL: totalFuel.toFixed(2),
        consumptionPer100: totalDistance > 0 ? ((totalFuel / totalDistance) * 100).toFixed(1) : '--',
        events,
        eventCounts: EventDetector.summarizeEvents(events),
      };
      status = 'summary';
    } else {
      await TripStorage.deleteTrip(tripId);
      status = 'idle';
    }
    render();
  }

  function resetRoute() {
    status = 'idle';
    summary = null;
    telemetry = { rpm: 0, speed: 0, throttle: 0, brake: 0, fuelRate: 0, temp: 0 };
    render();
  }

  async function exportTrip(format) {
    if (!summary) return;
    if (format === 'json') {
      const data = await TripStorage.exportTripJSON(summary.tripId);
      downloadFile(`ruta_${summary.tripId}.json`, JSON.stringify(data, null, 2), 'application/json');
    } else {
      const csv = await TripStorage.exportTripCSV(summary.tripId);
      downloadFile(`ruta_${summary.tripId}.csv`, csv, 'text/csv');
    }
  }

  function downloadFile(name, content, mime) {
    const blob = new Blob([content], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function destroy() {
    if (pollInterval) clearInterval(pollInterval);
    if (timerInterval) clearInterval(timerInterval);
  }

  return { render, destroy };
})();
