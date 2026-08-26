/**
 * DashboardView - Vista LIVE con datos en vivo.
 * Estilo racing: negro + verde neón.
 */

const DashboardView = (() => {
  let pollInterval = null;
  let currentData = { rpm: 0, speed: 0, temp: 0, throttle: 0, voltage: 0, intakeTemp: 0, fuelLevel: 0 };
  let altPoll = false; // Para alternar PIDs secundarios

  function render() {
    const content = document.getElementById('app-content');
    content.innerHTML = `
      <div class="status-header">
        <div class="status-info">
          <div class="status-info-dot" style="background:${OBDManager.isConnected ? '#00FF41' : '#FF3B30'}"></div>
          <span class="status-info-label">${OBDManager.isConnected ? 'VEHÍCULO VINCULADO' : 'SISTEMA DESCONECTADO'}</span>
        </div>
        ${OBDManager.isConnected
          ? `<button class="btn-disconnect" id="btn-disconnect">CORTAR</button>`
          : `<button class="btn-scan" id="btn-scan-dash">BUSCAR ADAPTADOR</button>`
        }
      </div>

      <div class="data-grid" id="data-grid">
        <div class="data-card">
          <span class="data-card-label">VELOCIDAD</span>
          <div class="data-card-value-row">
            <span class="data-card-value" id="val-speed" style="color:#FFF">0</span>
            <span class="data-card-unit">KM/H</span>
          </div>
          <div class="data-card-indicator" style="background:#FFF"></div>
        </div>
        <div class="data-card">
          <span class="data-card-label">REVOLUCIONES</span>
          <div class="data-card-value-row">
            <span class="data-card-value" id="val-rpm" style="color:#00FF41">0</span>
            <span class="data-card-unit">RPM</span>
          </div>
          <div class="data-card-indicator" style="background:#00FF41"></div>
        </div>
        <div class="data-card small">
          <span class="data-card-label">VOLTAJE BATERÍA</span>
          <div class="data-card-value-row">
            <span class="data-card-value" id="val-voltage" style="color:#FFD700">0.0</span>
            <span class="data-card-unit">V</span>
          </div>
          <div class="data-card-indicator" style="background:#FFD700"></div>
        </div>
        <div class="data-card small">
          <span class="data-card-label">NIVEL GASOLINA</span>
          <div class="data-card-value-row">
            <span class="data-card-value" id="val-fuel" style="color:#007AFF">0</span>
            <span class="data-card-unit">%</span>
          </div>
          <div class="data-card-indicator" style="background:#007AFF"></div>
        </div>
        <div class="data-card small">
          <span class="data-card-label">TEMP. MOTOR</span>
          <div class="data-card-value-row">
            <span class="data-card-value" id="val-temp" style="color:#00FF41">0</span>
            <span class="data-card-unit">°C</span>
          </div>
          <div class="data-card-indicator" style="background:#00FF41"></div>
        </div>
        <div class="data-card small">
          <span class="data-card-label">TEMP. ADMISIÓN</span>
          <div class="data-card-value-row">
            <span class="data-card-value" id="val-intake" style="color:#FF9500">0</span>
            <span class="data-card-unit">°C</span>
          </div>
          <div class="data-card-indicator" style="background:#FF9500"></div>
        </div>
        <div class="data-card" style="grid-column: span 2;">
          <span class="data-card-label">CARGA MOTOR / ACELERADOR</span>
          <div class="data-card-value-row">
            <span class="data-card-value" id="val-throttle" style="color:#AAA">0</span>
            <span class="data-card-unit">%</span>
          </div>
          <div style="margin-top:10px; height:4px; background:#080808;">
            <div id="throttle-bar-fill" style="height:100%; width:0%; background:#AAA; transition: width 0.3s;"></div>
          </div>
        </div>
      </div>
    `;

    // Listeners
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

    // Aplicar conversiones de unidades
    const speed = SettingsManager.convertSpeed(d.speed);
    const temp = SettingsManager.convertTemp(d.temp);
    const intakeTemp = SettingsManager.convertTemp(d.intakeTemp);

    set('val-speed', Math.round(speed));
    set('val-rpm', Math.round(d.rpm));
    set('val-voltage', d.voltage ? d.voltage.toFixed(1) : '0.0');
    set('val-fuel', Math.round(d.fuelLevel));
    set('val-throttle', Math.round(d.throttle));
    set('val-intake', Math.round(intakeTemp));

    // Temp motor con color dinámico según umbral de alerta
    const tempEl = document.getElementById('val-temp');
    const alertTempThreshold = SettingsManager.get('alertEngineTempThreshold') || 105;
    if (tempEl) {
      tempEl.textContent = Math.round(temp);
      tempEl.style.color = d.temp > alertTempThreshold ? '#FF3B30' : '#00FF41';
    }

    // Barra de acelerador
    const bar = document.getElementById('throttle-bar-fill');
    if (bar) bar.style.width = `${Math.round(d.throttle)}%`;

    // Sistema de alertas
    checkAlerts(d);
  }

  function checkAlerts(d) {
    const alerts = [];

    // Alerta temperatura motor
    if (SettingsManager.get('alertEngineTemp')) {
      const threshold = SettingsManager.get('alertEngineTempThreshold') || 105;
      if (d.temp > threshold) {
        alerts.push({ type: 'temp', message: `⚠️ TEMPERATURA ALTA: ${Math.round(d.temp)}°C` });
      }
    }

    // Alerta batería baja
    if (SettingsManager.get('alertBatteryLow')) {
      const threshold = SettingsManager.get('alertBatteryThreshold') || 11.5;
      if (d.voltage > 0 && d.voltage < threshold) {
        alerts.push({ type: 'battery', message: `🔋 BATERÍA BAJA: ${d.voltage.toFixed(1)}V` });
      }
    }

    // Alerta RPM altas
    if (SettingsManager.get('alertHighRPM')) {
      const threshold = SettingsManager.get('alertHighRPMThreshold') || 6500;
      if (d.rpm > threshold) {
        alerts.push({ type: 'rpm', message: `⚡ RPM ALTAS: ${Math.round(d.rpm)}` });
      }
    }

    // Alerta velocidad máxima
    if (SettingsManager.get('alertMaxSpeed')) {
      const threshold = SettingsManager.get('alertMaxSpeedThreshold') || 120;
      if (d.speed > threshold) {
        alerts.push({ type: 'speed', message: `🚗 VELOCIDAD: ${Math.round(d.speed)} km/h` });
      }
    }

    // Mostrar/ocultar alertas
    showHideAlerts(alerts);
  }

  function showHideAlerts(alerts) {
    // Eliminar alertas existentes
    const existing = document.querySelectorAll('.alert-banner');
    existing.forEach(el => el.remove());

    // Crear nuevas alertas
    alerts.forEach((alert, idx) => {
      const banner = document.createElement('div');
      banner.className = `alert-banner ${alert.type}`;
      banner.textContent = alert.message;
      banner.style.top = `${52 + idx * 40}px`; // Offset desde header
      document.body.appendChild(banner);
    });
  }

  function stopPolling() {
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
  }

  function onConnect() { startPolling(); render(); }
  function destroy() { stopPolling(); }

  return { render, destroy, onConnect, getCurrentData: () => currentData };
})();
