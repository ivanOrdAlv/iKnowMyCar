/**
 * SettingsView - Pantalla de ajustes completa.
 * 
 * Secciones: Conexión, Unidades, Alertas, Racing, Rutas, Datos, Acerca de.
 * Todos los ajustes se persisten en SettingsManager.
 */

const SettingsView = (() => {
  let currentSection = null; // null = vista principal, o nombre de sección

  function render() {
    const content = document.getElementById('app-content');

    if (currentSection) {
      renderSection(content, currentSection);
      return;
    }

    const s = SettingsManager.getAll();

    content.innerHTML = `
      <button class="btn-back" id="btn-back-settings">← VOLVER</button>

      <!-- CONEXIÓN OBD -->
      <div class="settings-section-title">CONEXIÓN OBD</div>
      <div class="settings-card">
        ${settingRow('Auto-conectar', 'Conectar al último ELM327 automáticamente', 'toggle', 'autoConnect', s.autoConnect)}
        ${settingRow('Protocolo', getProtocolLabel(s.protocol), 'chevron', 'protocol', null, () => openSection('connection'))}
        ${settingRow('Velocidad polling', getPollingLabel(s.pollingSpeed), 'chevron', 'pollingSpeed', null, () => openSection('connection'))}
        ${settingRow('Timeout comandos', s.commandTimeout / 1000 + 's', 'chevron', 'commandTimeout', null, () => openSection('connection'))}
      </div>

      <!-- UNIDADES -->
      <div class="settings-section-title">UNIDADES</div>
      <div class="settings-card">
        ${settingRow('Velocidad', s.speedUnit === 'kmh' ? 'KM/H' : 'MPH', 'chevron', 'speedUnit', null, () => openSection('units'))}
        ${settingRow('Temperatura', s.tempUnit === 'celsius' ? 'Celsius (°C)' : 'Fahrenheit (°F)', 'chevron', 'tempUnit', null, () => openSection('units'))}
        ${settingRow('Distancia', s.distanceUnit === 'km' ? 'Kilómetros' : 'Millas', 'chevron', 'distanceUnit', null, () => openSection('units'))}
        ${settingRow('Consumo', getFuelLabel(s.fuelUnit), 'chevron', 'fuelUnit', null, () => openSection('units'))}
      </div>

      <!-- ALERTAS -->
      <div class="settings-section-title">ALERTAS</div>
      <div class="settings-card">
        ${settingRow('Temp. motor alta', s.alertEngineTemp ? `Alerta a ${s.alertEngineTempThreshold}°C` : 'Desactivada', 'toggle', 'alertEngineTemp', s.alertEngineTemp)}
        ${settingRow('Batería baja', s.alertBatteryLow ? `Alerta a ${s.alertBatteryThreshold}V` : 'Desactivada', 'toggle', 'alertBatteryLow', s.alertBatteryLow)}
        ${settingRow('RPM altas', s.alertHighRPM ? `Alerta a ${s.alertHighRPMThreshold} RPM` : 'Desactivada', 'toggle', 'alertHighRPM', s.alertHighRPM)}
        ${settingRow('Velocidad máxima', s.alertMaxSpeed ? `Alerta a ${s.alertMaxSpeedThreshold} km/h` : 'Desactivada', 'toggle', 'alertMaxSpeed', s.alertMaxSpeed)}
        <div style="text-align:right; padding-top:8px;">
          <button class="settings-link" data-section="alerts">Configurar umbrales ›</button>
        </div>
      </div>

      <!-- RACING DASHBOARD -->
      <div class="settings-section-title">RACING DASHBOARD</div>
      <div class="settings-card">
        ${settingRow('RPM máximo', s.racingMaxRPM.toLocaleString(), 'chevron', 'racingMaxRPM', null, () => openSection('racing'))}
        ${settingRow('Shift light a', s.racingShiftRPM.toLocaleString() + ' RPM', 'chevron', 'racingShiftRPM', null, () => openSection('racing'))}
        ${settingRow('Mapeo de marchas', s.racingGearMap === 'auto' ? 'Automático' : 'Personalizado', 'chevron', 'racingGearMap', null, () => openSection('racing'))}
      </div>

      <!-- GRABACIÓN DE RUTAS -->
      <div class="settings-section-title">GRABACIÓN DE RUTAS</div>
      <div class="settings-card">
        ${settingRow('GPS activado', s.routeGpsEnabled ? 'Sí' : 'No', 'toggle', 'routeGpsEnabled', s.routeGpsEnabled)}
        ${settingRow('Auto-guardar', s.routeAutoSave ? 'Al finalizar' : 'Preguntar', 'toggle', 'routeAutoSave', s.routeAutoSave)}
        ${settingRow('Intervalo de lectura', s.routePollingMs + 'ms', 'chevron', 'routePollingMs', null, () => openSection('route'))}
      </div>

      <!-- DATOS -->
      <div class="settings-section-title">DATOS</div>
      <div class="settings-card">
        ${settingRow('Auto-exportar al terminar', s.autoExportOnFinish ? 'Sí' : 'No', 'toggle', 'autoExportOnFinish', s.autoExportOnFinish)}
        ${settingRow('Formato exportación', s.exportFormat === 'json' ? 'JSON' : 'CSV', 'chevron', 'exportFormat', null, () => openSection('data'))}
        <div class="setting-item">
          <div class="setting-text">
            <div class="setting-title">Exportar ajustes</div>
            <div class="setting-desc">Descargar configuración actual</div>
          </div>
          <button class="settings-action-btn" id="btn-export-settings">📥</button>
        </div>
        <div class="setting-item">
          <div class="setting-text">
            <div class="setting-title">Importar ajustes</div>
            <div class="setting-desc">Cargar configuración desde archivo</div>
          </div>
          <button class="settings-action-btn" id="btn-import-settings">📤</button>
        </div>
        <div class="setting-item">
          <div class="setting-text">
            <div class="setting-title">Almacenamiento</div>
            <div class="setting-desc" id="storage-info">Calculando...</div>
          </div>
        </div>
      </div>

      <!-- ACERCA DE -->
      <div class="settings-section-title">ACERCA DE IKNOWMYCAR</div>
      <div class="settings-card">
        ${settingRow('Versión', '1.3.0 (Racing Build)', 'none')}
        ${settingRow('Motor', 'Web Bluetooth + OBD-II', 'none')}
        ${settingRow('Licencia', 'MIT Open Source', 'none')}
        ${settingRow('Autor', 'Tu nombre aquí', 'none')}
      </div>

      <!-- Reset -->
      <button class="btn-reset" id="btn-reset-all">RESTABLECER TODOS LOS AJUSTES</button>

      <div style="height:20px;"></div>
    `;

    bindListeners();
    loadStorageInfo();
  }

  function settingRow(title, desc, type, key, value, onClick) {
    if (type === 'toggle') {
      return `
        <div class="setting-item">
          <div class="setting-text">
            <div class="setting-title">${title}</div>
            <div class="setting-desc" id="desc-${key}">${desc}</div>
          </div>
          <button class="toggle-switch ${value ? 'active' : ''}" data-key="${key}"></button>
        </div>
      `;
    }
    if (type === 'chevron') {
      return `
        <div class="setting-item setting-clickable" data-action="${key}" ${onClick ? '' : ''}>
          <div class="setting-text">
            <div class="setting-title">${title}</div>
            <div class="setting-desc">${desc}</div>
          </div>
          <span class="setting-chevron">›</span>
        </div>
      `;
    }
    return `
      <div class="setting-item">
        <div class="setting-text">
          <div class="setting-title">${title}</div>
          <div class="setting-desc">${desc}</div>
        </div>
      </div>
    `;
  }

  function renderSection(content, section) {
    const s = SettingsManager.getAll();
    let html = `<button class="btn-back" id="btn-back-section">← AJUSTES</button>`;

    if (section === 'connection') {
      html += `
        <h2 class="section-detail-title">CONEXIÓN OBD</h2>

        <div class="settings-card">
          <div class="setting-item">
            <div class="setting-text">
              <div class="setting-title">Protocolo ELM327</div>
              <div class="setting-desc">El protocolo de comunicación con la ECU</div>
            </div>
          </div>
          <div class="settings-options-grid">
            ${optionBtn('protocol', 'auto', 'Automático', s.protocol)}
            ${optionBtn('protocol', 'can11', 'CAN 11-bit', s.protocol)}
            ${optionBtn('protocol', 'can29', 'CAN 29-bit', s.protocol)}
            ${optionBtn('protocol', 'iso9141', 'ISO 9141-2', s.protocol)}
            ${optionBtn('protocol', 'kwp_slow', 'KWP Slow', s.protocol)}
            ${optionBtn('protocol', 'kwp_fast', 'KWP Fast', s.protocol)}
          </div>
        </div>

        <div class="settings-card">
          <div class="setting-item">
            <div class="setting-text">
              <div class="setting-title">Velocidad de polling</div>
              <div class="setting-desc">Frecuencia de lectura de datos OBD</div>
            </div>
          </div>
          <div class="settings-options-grid">
            ${optionBtn('pollingSpeed', 'slow', 'Lenta (2s)', s.pollingSpeed)}
            ${optionBtn('pollingSpeed', 'normal', 'Normal (1s)', s.pollingSpeed)}
            ${optionBtn('pollingSpeed', 'fast', 'Rápida (500ms)', s.pollingSpeed)}
            ${optionBtn('pollingSpeed', 'racing', 'Racing (200ms)', s.pollingSpeed)}
          </div>
          <p class="setting-warning">⚠️ Polling muy rápido puede saturar la conexión BLE</p>
        </div>

        <div class="settings-card">
          <div class="setting-item">
            <div class="setting-text">
              <div class="setting-title">Timeout de comandos</div>
              <div class="setting-desc">Tiempo máximo de espera para respuestas del ELM327</div>
            </div>
          </div>
          <div class="settings-slider-row">
            <input type="range" id="slider-timeout" min="1000" max="8000" step="500" value="${s.commandTimeout}" class="settings-slider" />
            <span class="settings-slider-value" id="val-timeout">${s.commandTimeout / 1000}s</span>
          </div>
        </div>

        <button class="btn-reset-section" data-section="connection">RESTABLECER SECCIÓN</button>
      `;
    }

    else if (section === 'units') {
      html += `
        <h2 class="section-detail-title">UNIDADES</h2>

        <div class="settings-card">
          <div class="setting-item"><div class="setting-text"><div class="setting-title">Velocidad</div></div></div>
          <div class="settings-options-grid">
            ${optionBtn('speedUnit', 'kmh', 'KM/H', s.speedUnit)}
            ${optionBtn('speedUnit', 'mph', 'MPH', s.speedUnit)}
          </div>
        </div>

        <div class="settings-card">
          <div class="setting-item"><div class="setting-text"><div class="setting-title">Temperatura</div></div></div>
          <div class="settings-options-grid">
            ${optionBtn('tempUnit', 'celsius', 'Celsius (°C)', s.tempUnit)}
            ${optionBtn('tempUnit', 'fahrenheit', 'Fahrenheit (°F)', s.tempUnit)}
          </div>
        </div>

        <div class="settings-card">
          <div class="setting-item"><div class="setting-text"><div class="setting-title">Distancia</div></div></div>
          <div class="settings-options-grid">
            ${optionBtn('distanceUnit', 'km', 'Kilómetros', s.distanceUnit)}
            ${optionBtn('distanceUnit', 'mi', 'Millas', s.distanceUnit)}
          </div>
        </div>

        <div class="settings-card">
          <div class="setting-item"><div class="setting-text"><div class="setting-title">Consumo</div></div></div>
          <div class="settings-options-grid">
            ${optionBtn('fuelUnit', 'l100km', 'L/100km', s.fuelUnit)}
            ${optionBtn('fuelUnit', 'mpg_us', 'MPG (US)', s.fuelUnit)}
            ${optionBtn('fuelUnit', 'mpg_uk', 'MPG (UK)', s.fuelUnit)}
          </div>
        </div>

        <button class="btn-reset-section" data-section="units">RESTABLECER SECCIÓN</button>
      `;
    }

    else if (section === 'alerts') {
      html += `
        <h2 class="section-detail-title">UMBRALES DE ALERTA</h2>

        <div class="settings-card">
          <div class="setting-item">
            <div class="setting-text">
              <div class="setting-title">🌡️ Temperatura del motor</div>
              <div class="setting-desc">Alerta visual cuando supera el umbral</div>
            </div>
            <button class="toggle-switch ${s.alertEngineTemp ? 'active' : ''}" data-key="alertEngineTemp"></button>
          </div>
          <div class="settings-slider-row">
            <input type="range" id="slider-temp" min="85" max="120" step="1" value="${s.alertEngineTempThreshold}" class="settings-slider" />
            <span class="settings-slider-value" id="val-temp">${s.alertEngineTempThreshold}°C</span>
          </div>
        </div>

        <div class="settings-card">
          <div class="setting-item">
            <div class="setting-text">
              <div class="setting-title">🔋 Voltaje de batería</div>
              <div class="setting-desc">Alerta cuando el voltaje es bajo</div>
            </div>
            <button class="toggle-switch ${s.alertBatteryLow ? 'active' : ''}" data-key="alertBatteryLow"></button>
          </div>
          <div class="settings-slider-row">
            <input type="range" id="slider-battery" min="10" max="13" step="0.1" value="${s.alertBatteryThreshold}" class="settings-slider" />
            <span class="settings-slider-value" id="val-battery">${s.alertBatteryThreshold}V</span>
          </div>
        </div>

        <div class="settings-card">
          <div class="setting-item">
            <div class="setting-text">
              <div class="setting-title">⚡ RPM altas</div>
              <div class="setting-desc">Alerta de shift light</div>
            </div>
            <button class="toggle-switch ${s.alertHighRPM ? 'active' : ''}" data-key="alertHighRPM"></button>
          </div>
          <div class="settings-slider-row">
            <input type="range" id="slider-rpm-alert" min="3000" max="8000" step="100" value="${s.alertHighRPMThreshold}" class="settings-slider" />
            <span class="settings-slider-value" id="val-rpm-alert">${s.alertHighRPMThreshold.toLocaleString()} RPM</span>
          </div>
        </div>

        <div class="settings-card">
          <div class="setting-item">
            <div class="setting-text">
              <div class="setting-title">🚗 Velocidad máxima</div>
              <div class="setting-desc">Alerta al superar la velocidad</div>
            </div>
            <button class="toggle-switch ${s.alertMaxSpeed ? 'active' : ''}" data-key="alertMaxSpeed"></button>
          </div>
          <div class="settings-slider-row">
            <input type="range" id="slider-speed" min="60" max="200" step="5" value="${s.alertMaxSpeedThreshold}" class="settings-slider" />
            <span class="settings-slider-value" id="val-speed">${s.alertMaxSpeedThreshold} km/h</span>
          </div>
        </div>

        <button class="btn-reset-section" data-section="alerts">RESTABLECER SECCIÓN</button>
      `;
    }

    else if (section === 'racing') {
      html += `
        <h2 class="section-detail-title">RACING DASHBOARD</h2>

        <div class="settings-card">
          <div class="setting-item">
            <div class="setting-text">
              <div class="setting-title">RPM máximo del motor</div>
              <div class="setting-desc">Para la barra del rev limiter LED</div>
            </div>
          </div>
          <div class="settings-slider-row">
            <input type="range" id="slider-max-rpm" min="4000" max="10000" step="500" value="${s.racingMaxRPM}" class="settings-slider" />
            <span class="settings-slider-value" id="val-max-rpm">${s.racingMaxRPM.toLocaleString()} RPM</span>
          </div>
        </div>

        <div class="settings-card">
          <div class="setting-item">
            <div class="setting-text">
              <div class="setting-title">Shift light</div>
              <div class="setting-desc">RPM a la que se enciende el aviso de subir marcha</div>
            </div>
          </div>
          <div class="settings-slider-row">
            <input type="range" id="slider-shift-rpm" min="3000" max="9000" step="100" value="${s.racingShiftRPM}" class="settings-slider" />
            <span class="settings-slider-value" id="val-shift-rpm">${s.racingShiftRPM.toLocaleString()} RPM</span>
          </div>
        </div>

        <div class="settings-card">
          <div class="setting-item">
            <div class="setting-text">
              <div class="setting-title">Mapeo de marchas</div>
              <div class="setting-desc">Velocidades para cada marcha (km/h)</div>
            </div>
          </div>
          <div class="gears-editor" id="gears-editor">
            ${s.racingGears.map((g, i) => `
              <div class="gear-row">
                <span class="gear-label">${g.gear}ª</span>
                <span class="gear-until">hasta</span>
                <input type="number" class="gear-input" data-gear-idx="${i}" value="${g.max}" min="10" max="300" step="5" />
                <span class="gear-unit">km/h</span>
              </div>
            `).join('')}
          </div>
          <p class="setting-warning">⚠️ Los valores son la velocidad máxima de cada marcha</p>
        </div>

        <button class="btn-reset-section" data-section="racing">RESTABLECER SECCIÓN</button>
      `;
    }

    else if (section === 'route') {
      html += `
        <h2 class="section-detail-title">GRABACIÓN DE RUTAS</h2>

        <div class="settings-card">
          <div class="setting-item">
            <div class="setting-text">
              <div class="setting-title">Intervalo de lectura</div>
              <div class="setting-desc">Frecuencia de guardado de datos durante la ruta</div>
            </div>
          </div>
          <div class="settings-slider-row">
            <input type="range" id="slider-route-polling" min="200" max="2000" step="100" value="${s.routePollingMs}" class="settings-slider" />
            <span class="settings-slider-value" id="val-route-polling">${s.routePollingMs}ms</span>
          </div>
          <p class="setting-warning">⚠️ Intervalos cortos generan más datos. Una ruta de 30min a 500ms = ~3600 lecturas</p>
        </div>

        <button class="btn-reset-section" data-section="route">RESTABLECER SECCIÓN</button>
      `;
    }

    else if (section === 'data') {
      html += `
        <h2 class="section-detail-title">DATOS</h2>

        <div class="settings-card">
          <div class="setting-item">
            <div class="setting-text">
              <div class="setting-title">Formato de exportación</div>
              <div class="setting-desc">Formato por defecto al exportar rutas</div>
            </div>
          </div>
          <div class="settings-options-grid">
            ${optionBtn('exportFormat', 'json', 'JSON', s.exportFormat)}
            ${optionBtn('exportFormat', 'csv', 'CSV', s.exportFormat)}
          </div>
        </div>

        <div class="settings-card">
          <div class="setting-item">
            <div class="setting-text">
              <div class="setting-title">Exportar todas las rutas</div>
              <div class="setting-desc">Descargar todos los trayectos guardados</div>
            </div>
            <button class="settings-action-btn" id="btn-export-all-routes">📥</button>
          </div>
          <div class="setting-item">
            <div class="setting-text">
              <div class="setting-title">Eliminar TODOS los datos</div>
              <div class="setting-desc">Borrar todas las rutas, lecturas y eventos</div>
            </div>
            <button class="settings-action-btn danger" id="btn-delete-all-data">🗑️</button>
          </div>
        </div>

        <button class="btn-reset-section" data-section="data">RESTABLECER SECCIÓN</button>
      `;
    }

    content.innerHTML = html;
    bindSectionListeners(section);
  }

  function optionBtn(key, value, label, currentValue) {
    const isActive = currentValue === value;
    return `<button class="settings-option-btn ${isActive ? 'active' : ''}" data-key="${key}" data-value="${value}">${label}</button>`;
  }

  function bindListeners() {
    document.getElementById('btn-back-settings').addEventListener('click', () => App.navigateTo('dashboard'));

    // Toggles
    document.querySelectorAll('.toggle-switch').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        const newVal = !SettingsManager.get(key);
        SettingsManager.set(key, newVal);
        btn.classList.toggle('active', newVal);
        render(); // Re-render para actualizar descripciones
      });
    });

    // Clickable rows (chevron)
    document.querySelectorAll('.setting-clickable').forEach(row => {
      row.addEventListener('click', () => {
        const action = row.dataset.action;
        const sectionMap = {
          protocol: 'connection', pollingSpeed: 'connection', commandTimeout: 'connection',
          speedUnit: 'units', tempUnit: 'units', distanceUnit: 'units', fuelUnit: 'units',
          routePollingMs: 'route', exportFormat: 'data',
          racingMaxRPM: 'racing', racingShiftRPM: 'racing', racingGearMap: 'racing',
        };
        openSection(sectionMap[action] || action);
      });
    });

    // Section links
    document.querySelectorAll('.settings-link').forEach(link => {
      link.addEventListener('click', () => openSection(link.dataset.section));
    });

    // Export settings
    const exportBtn = document.getElementById('btn-export-settings');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const json = SettingsManager.exportSettings();
        const blob = new Blob([json], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'iknowmycar_settings.json';
        a.click();
      });
    }

    // Import settings
    const importBtn = document.getElementById('btn-import-settings');
    if (importBtn) {
      importBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => {
            const ok = SettingsManager.importSettings(ev.target.result);
            alert(ok ? 'Ajustes importados correctamente' : 'Error: archivo no válido');
            render();
          };
          reader.readAsText(file);
        });
        input.click();
      });
    }

    // Reset all
    const resetBtn = document.getElementById('btn-reset-all');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('¿Restablecer TODOS los ajustes a sus valores por defecto?')) {
          SettingsManager.resetAll();
          render();
        }
      });
    }
  }

  function bindSectionListeners(section) {
    document.getElementById('btn-back-section').addEventListener('click', () => {
      currentSection = null;
      render();
    });

    // Option buttons
    document.querySelectorAll('.settings-option-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        const value = btn.dataset.value;
        // Convertir a número si es necesario
        let finalValue = value;
        if (!isNaN(value) && value !== '') finalValue = Number(value);
        SettingsManager.set(key, finalValue);
        // Actualizar UI sin re-render completo
        document.querySelectorAll(`.settings-option-btn[data-key="${key}"]`).forEach(b => {
          b.classList.toggle('active', b.dataset.value === value);
        });
      });
    });

    // Toggles en sección
    document.querySelectorAll('.toggle-switch').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        const newVal = !SettingsManager.get(key);
        SettingsManager.set(key, newVal);
        btn.classList.toggle('active', newVal);
      });
    });

    // Sliders
    bindSlider('slider-timeout', 'val-timeout', v => {
      SettingsManager.set('commandTimeout', v);
      return (v / 1000) + 's';
    });
    bindSlider('slider-temp', 'val-temp', v => {
      SettingsManager.set('alertEngineTempThreshold', v);
      return v + '°C';
    });
    bindSlider('slider-battery', 'val-battery', v => {
      SettingsManager.set('alertBatteryThreshold', parseFloat(v));
      return parseFloat(v).toFixed(1) + 'V';
    });
    bindSlider('slider-rpm-alert', 'val-rpm-alert', v => {
      SettingsManager.set('alertHighRPMThreshold', v);
      return parseInt(v).toLocaleString() + ' RPM';
    });
    bindSlider('slider-speed', 'val-speed', v => {
      SettingsManager.set('alertMaxSpeedThreshold', v);
      return v + ' km/h';
    });
    bindSlider('slider-max-rpm', 'val-max-rpm', v => {
      SettingsManager.set('racingMaxRPM', v);
      return parseInt(v).toLocaleString() + ' RPM';
    });
    bindSlider('slider-shift-rpm', 'val-shift-rpm', v => {
      SettingsManager.set('racingShiftRPM', v);
      return parseInt(v).toLocaleString() + ' RPM';
    });
    bindSlider('slider-route-polling', 'val-route-polling', v => {
      SettingsManager.set('routePollingMs', v);
      return v + 'ms';
    });

    // Gear inputs
    document.querySelectorAll('.gear-input').forEach(input => {
      input.addEventListener('change', () => {
        const idx = parseInt(input.dataset.gearIdx);
        const gears = [...SettingsManager.get('racingGears')];
        gears[idx] = { ...gears[idx], max: parseInt(input.value) || 999 };
        SettingsManager.set('racingGears', gears);
      });
    });

    // Reset section
    const resetSectionBtn = document.querySelector('.btn-reset-section');
    if (resetSectionBtn) {
      resetSectionBtn.addEventListener('click', () => {
        const sec = resetSectionBtn.dataset.section;
        if (confirm(`¿Restablecer ajustes de "${sec}" a valores por defecto?`)) {
          SettingsManager.resetSection(sec);
          renderSection(document.getElementById('app-content'), sec);
        }
      });
    }

    // Export all routes
    const exportAllBtn = document.getElementById('btn-export-all-routes');
    if (exportAllBtn) {
      exportAllBtn.addEventListener('click', async () => {
        const trips = await TripStorage.listTrips();
        if (trips.length === 0) { alert('No hay rutas para exportar'); return; }
        const allData = [];
        for (const trip of trips) {
          const data = await TripStorage.exportTripJSON(trip.id);
          allData.push(data);
        }
        const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'iknowmycar_all_routes.json';
        a.click();
      });
    }

    // Delete all data
    const deleteAllBtn = document.getElementById('btn-delete-all-data');
    if (deleteAllBtn) {
      deleteAllBtn.addEventListener('click', async () => {
        if (confirm('¿Eliminar TODAS las rutas y datos? Esta acción NO se puede deshacer.')) {
          const trips = await TripStorage.listTrips();
          for (const trip of trips) {
            await TripStorage.deleteTrip(trip.id);
          }
          alert(`${trips.length} rutas eliminadas`);
        }
      });
    }
  }

  function bindSlider(sliderId, valueId, formatter) {
    const slider = document.getElementById(sliderId);
    const valEl = document.getElementById(valueId);
    if (!slider || !valEl) return;
    slider.addEventListener('input', () => {
      valEl.textContent = formatter(parseInt(slider.value));
    });
  }

  function openSection(section) {
    currentSection = section;
    render();
  }

  async function loadStorageInfo() {
    const el = document.getElementById('storage-info');
    if (!el) return;
    const info = await SettingsManager.getStorageSize();
    const trips = await TripStorage.listTrips();
    if (info) {
      el.textContent = `${info.usedFormatted} usados · ${trips.length} rutas guardadas`;
    } else {
      el.textContent = `${trips.length} rutas guardadas`;
    }
  }

  // Labels helpers
  function getProtocolLabel(p) {
    const map = { auto: 'Automático', can11: 'CAN 11-bit', can29: 'CAN 29-bit', iso9141: 'ISO 9141-2', kwp_slow: 'KWP Slow', kwp_fast: 'KWP Fast' };
    return map[p] || p;
  }

  function getPollingLabel(p) {
    const map = { slow: 'Lenta (2s)', normal: 'Normal (1s)', fast: 'Rápida (500ms)', racing: 'Racing (200ms)' };
    return map[p] || p;
  }

  function getFuelLabel(f) {
    const map = { l100km: 'L/100km', mpg_us: 'MPG (US)', mpg_uk: 'MPG (UK)' };
    return map[f] || f;
  }

  function destroy() {
    currentSection = null;
  }

  return { render, destroy };
})();
