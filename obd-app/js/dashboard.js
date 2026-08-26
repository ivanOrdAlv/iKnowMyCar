/**
 * DashboardView - Vista LIVE con datos en vivo.
 * Markup con grid de Bootstrap; colores y tipografía del tema racing (theme.css).
 */

const DashboardView = (() => {
  let pollInterval = null;
  let currentData = { rpm: 0, speed: 0, temp: 0, throttle: 0, voltage: 0, intakeTemp: 0, fuelLevel: 0 };
  let altPoll = false;

  function render() {
    const content = document.getElementById('app-content');
    content.innerHTML = `
      <div class="d-flex align-items-center justify-content-between mb-3">
        <span class="td-status-badge ${OBDManager.isConnected ? 'connected' : 'disconnected'} rounded-pill">
          <span class="dot"></span> ${OBDManager.isConnected ? 'VEHÍCULO VINCULADO' : 'SISTEMA DESCONECTADO'}
        </span>
        ${OBDManager.isConnected
          ? `<button class="btn btn-outline-danger btn-sm fw-bold" id="btn-disconnect">CORTAR</button>`
          : `<button class="btn btn-success btn-sm fw-bold" id="btn-scan-dash">BUSCAR ADAPTADOR</button>`
        }
      </div>

      <div class="row g-2" id="data-grid">
        <div class="col-6">
          <div class="td-data-card h-100">
            <span class="data-card-label">VELOCIDAD</span>
            <div>
              <span class="data-card-value text-white" id="val-speed">0</span>
              <span class="data-card-unit">KM/H</span>
            </div>
            <div class="data-card-indicator bg-white"></div>
          </div>
        </div>
        <div class="col-6">
          <div class="td-data-card h-100">
            <span class="data-card-label">REVOLUCIONES</span>
            <div>
              <span class="data-card-value" id="val-rpm" style="color:var(--td-green)">0</span>
              <span class="data-card-unit">RPM</span>
            </div>
            <div class="data-card-indicator" style="background:var(--td-green)"></div>
          </div>
        </div>
        <div class="col-4">
          <div class="td-data-card h-100">
            <span class="data-card-label">BATERÍA</span>
            <div>
              <span class="data-card-value fs-4" id="val-voltage" style="color:var(--td-yellow)">0.0</span>
              <span class="data-card-unit">V</span>
            </div>
            <div class="data-card-indicator" style="background:var(--td-yellow)"></div>
          </div>
        </div>
        <div class="col-4">
          <div class="td-data-card h-100">
            <span class="data-card-label">GASOLINA</span>
            <div>
              <span class="data-card-value fs-4" id="val-fuel" style="color:var(--td-cyan)">0</span>
              <span class="data-card-unit">%</span>
            </div>
            <div class="data-card-indicator" style="background:var(--td-cyan)"></div>
          </div>
        </div>
        <div class="col-4">
          <div class="td-data-card h-100">
            <span class="data-card-label">TEMP. MOTOR</span>
            <div>
              <span class="data-card-value fs-4" id="val-temp" style="color:var(--td-green)">0</span>
              <span class="data-card-unit">°C</span>
            </div>
            <div class="data-card-indicator" style="background:var(--td-green)"></div>
          </div>
        </div>
        <div class="col-12">
          <div class="td-data-card">
            <span class="data-card-label">CARGA MOTOR / ACELERADOR</span>
            <div>
              <span class="data-card-value fs-3 text-secondary" id="val-throttle">0</span>
              <span class="data-card-unit">%</span>
            </div>
            <div class="progress mt-2" style="height:4px; background:var(--td-bg-elev);">
              <div id="throttle-bar-fill" class="progress-bar" role="progressbar"
                   style="width:0%; background:var(--td-text-muted); transition: width 0.3s;"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    const scanBtn = document.getElementById('btn-scan-dash');
    if (scanBtn) scanBtn.addEventListener('click', () => document.getElementById('btn-connect').click());

    const disconnectBtn = document.getElementById('btn-disconnect');
    if (disconnectBtn) disconnectBtn.addEventListener('click', () => {
      OBDManager.disconnect();
      stopPolling();
      render();
    });

    if (OBDManager.isConnected) startPolling();
  }

  function startPolling() {
    if (pollInterval) clearInterval(pollInterval);

    const poll = async () => {
      if (!OBDManager.isConnected) { stopPolling(); return; }
      try {
        const rpm = await OBDManager.requestPID('010C');
        const speed = await OBDManager.requestPID('010D');

        let voltage = null, intakeTemp = null, fuelLevel = null, coolantTemp = null, throttle = null;

        altPoll = !altPoll;
        if (altPoll) {
          coolantTemp = await OBDManager.requestPID('0105');
          throttle = await OBDManager.requestPID('0111');
          const voltageRaw = await OBDManager.sendAT('AT RV');
          voltage = voltageRaw ? OBDParser.parseVoltage(voltageRaw) : null;
          intakeTemp = await OBDManager.requestPID('010F');
          fuelLevel = await OBDManager.requestPID('012F');
        }

        currentData = {
          rpm: rpm ?? currentData.rpm,
          speed: speed ?? currentData.speed,
          temp: coolantTemp ?? currentData.temp,
          throttle: throttle ?? currentData.throttle,
          voltage: voltage ?? currentData.voltage,
          intakeTemp: intakeTemp ?? currentData.intakeTemp,
          fuelLevel: fuelLevel ?? currentData.fuelLevel,
        };

        updateUI();
      } catch (e) { console.warn('Poll error:', e); }
    };

    poll();
    pollInterval = setInterval(poll, 1000);
  }

  function updateUI() {
    const d = currentData;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    const speed = SettingsManager.convertSpeed(d.speed);
    const temp = SettingsManager.convertTemp(d.temp);

    set('val-speed', Math.round(speed));
    set('val-rpm', Math.round(d.rpm));
    set('val-voltage', d.voltage ? d.voltage.toFixed(1) : '0.0');
    set('val-fuel', Math.round(d.fuelLevel));
    set('val-throttle', Math.round(d.throttle));

    const tempEl = document.getElementById('val-temp');
    const alertTempThreshold = SettingsManager.get('alertEngineTempThreshold') || 105;
    if (tempEl) {
      tempEl.textContent = Math.round(temp);
      tempEl.style.color = d.temp > alertTempThreshold ? 'var(--td-red)' : 'var(--td-green)';
    }

    const bar = document.getElementById('throttle-bar-fill');
    if (bar) bar.style.width = `${Math.round(d.throttle)}%`;

    checkAlerts(d);
  }

  function checkAlerts(d) {
    const alerts = [];

    if (SettingsManager.get('alertEngineTemp')) {
      const threshold = SettingsManager.get('alertEngineTempThreshold') || 105;
      if (d.temp > threshold) alerts.push({ type: 'danger', message: `⚠️ TEMPERATURA ALTA: ${Math.round(d.temp)}°C` });
    }
    if (SettingsManager.get('alertBatteryLow')) {
      const threshold = SettingsManager.get('alertBatteryThreshold') || 11.5;
      if (d.voltage > 0 && d.voltage < threshold) alerts.push({ type: 'warning', message: `🔋 BATERÍA BAJA: ${d.voltage.toFixed(1)}V` });
    }
    if (SettingsManager.get('alertHighRPM')) {
      const threshold = SettingsManager.get('alertHighRPMThreshold') || 6500;
      if (d.rpm > threshold) alerts.push({ type: 'warning', message: `⚡ RPM ALTAS: ${Math.round(d.rpm)}` });
    }
    if (SettingsManager.get('alertMaxSpeed')) {
      const threshold = SettingsManager.get('alertMaxSpeedThreshold') || 120;
      if (d.speed > threshold) alerts.push({ type: 'info', message: `🚗 VELOCIDAD: ${Math.round(d.speed)} km/h` });
    }

    showHideAlerts(alerts);
  }

  function showHideAlerts(alerts) {
    document.querySelectorAll('.td-alert-toast').forEach(el => el.remove());

    let container = document.getElementById('td-toast-stack');
    if (!container && alerts.length > 0) {
      container = document.createElement('div');
      container.id = 'td-toast-stack';
      container.className = 'position-fixed top-0 start-50 translate-middle-x mt-5 pt-2 d-flex flex-column gap-2';
      container.style.zIndex = 1080;
      document.body.appendChild(container);
    }
    if (container && alerts.length === 0) { container.remove(); return; }

    alerts.forEach((alert) => {
      const el = document.createElement('div');
      el.className = `td-alert-toast alert alert-${alert.type} py-2 px-3 mb-0 fw-bold small shadow`;
      el.textContent = alert.message;
      container.appendChild(el);
    });
  }

  function stopPolling() {
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
  }

  function onConnect() { startPolling(); render(); }
  function destroy() { stopPolling(); }

  return { render, destroy, onConnect, getCurrentData: () => currentData };
})();
