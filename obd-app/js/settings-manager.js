/**
 * SettingsManager - Gestión global de ajustes persistentes.
 * 
 * Todos los módulos de la app consultan este objeto para obtener
 * los valores de configuración del usuario. Los ajustes se guardan
 * en localStorage y persisten entre sesiones.
 */

const SettingsManager = (() => {
  const STORAGE_KEY = 'telemdrive_settings';

  // Valores por defecto de todos los ajustes
  const DEFAULTS = {
    // Conexión OBD
    autoConnect: false,
    protocol: 'auto',           // auto, can11, can29, iso9141, kwp_slow, kwp_fast
    pollingSpeed: 'normal',     // slow (2s), normal (1s), fast (500ms), racing (200ms)
    commandTimeout: 4000,       // ms

    // Unidades
    speedUnit: 'kmh',           // kmh, mph
    tempUnit: 'celsius',        // celsius, fahrenheit
    fuelUnit: 'l100km',         // l100km, mpg_us, mpg_uk
    distanceUnit: 'km',         // km, mi

    // Alertas
    alertEngineTemp: true,
    alertEngineTempThreshold: 105,  // °C
    alertBatteryLow: true,
    alertBatteryThreshold: 11.5,    // V
    alertMaxSpeed: false,
    alertMaxSpeedThreshold: 120,    // km/h
    alertHighRPM: true,
    alertHighRPMThreshold: 6500,    // RPM

    // Racing Dashboard
    racingMaxRPM: 7000,
    racingShiftRPM: 5500,
    racingGearMap: 'auto',         // auto, manual
    racingGears: [
      { max: 25, gear: '1' },
      { max: 45, gear: '2' },
      { max: 70, gear: '3' },
      { max: 100, gear: '4' },
      { max: 130, gear: '5' },
      { max: 999, gear: '6' },
    ],

    // Grabación de rutas
    routePollingMs: 500,            // ms entre lecturas
    routeGpsEnabled: true,
    routeAutoSave: true,            // guardar automáticamente al finalizar

    // Datos
    autoExportOnFinish: false,
    exportFormat: 'json',           // json, csv
  };

  let settings = null;
  let listeners = [];

  function load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        settings = { ...DEFAULTS, ...JSON.parse(saved) };
      } else {
        settings = { ...DEFAULTS };
      }
    } catch {
      settings = { ...DEFAULTS };
    }
    return settings;
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      notifyListeners();
    } catch (e) {
      console.error('Error guardando ajustes:', e);
    }
  }

  function get(key) {
    if (!settings) load();
    return settings[key] !== undefined ? settings[key] : DEFAULTS[key];
  }

  function set(key, value) {
    if (!settings) load();
    settings[key] = value;
    save();
  }

  function getAll() {
    if (!settings) load();
    return { ...settings };
  }

  function setMultiple(updates) {
    if (!settings) load();
    Object.assign(settings, updates);
    save();
  }

  function resetAll() {
    settings = { ...DEFAULTS };
    save();
  }

  function resetSection(section) {
    if (!settings) load();
    const sectionKeys = SECTION_KEYS[section];
    if (!sectionKeys) return;
    for (const key of sectionKeys) {
      settings[key] = DEFAULTS[key];
    }
    save();
  }

  // Cambiar listener para que otros módulos reaccionen a cambios
  function onChange(callback) {
    listeners.push(callback);
    return () => {
      listeners = listeners.filter(l => l !== callback);
    };
  }

  function notifyListeners() {
    for (const cb of listeners) {
      try { cb(settings); } catch (e) { console.warn('Settings listener error:', e); }
    }
  }

  // Conversión de unidades
  function convertSpeed(kmh) {
    if (!kmh && kmh !== 0) return 0;
    if (get('speedUnit') === 'mph') return kmh * 0.621371;
    return kmh;
  }

  function convertTemp(celsius) {
    if (!celsius && celsius !== 0) return 0;
    if (get('tempUnit') === 'fahrenheit') return (celsius * 9 / 5) + 32;
    return celsius;
  }

  function convertDistance(km) {
    if (!km && km !== 0) return 0;
    if (get('distanceUnit') === 'mi') return km * 0.621371;
    return km;
  }

  function speedUnitLabel() {
    return get('speedUnit') === 'mph' ? 'MPH' : 'KM/H';
  }

  function tempUnitLabel() {
    return get('tempUnit') === 'fahrenheit' ? '°F' : '°C';
  }

  function distanceUnitLabel() {
    return get('distanceUnit') === 'mi' ? 'MI' : 'KM';
  }

  // Polling speed en ms
  function getPollingMs() {
    const map = { slow: 2000, normal: 1000, fast: 500, racing: 200 };
    return map[get('pollingSpeed')] || 1000;
  }

  // Protocolo ELM327
  function getProtocolCommand() {
    const map = {
      auto: 'ATSP0',
      can11: 'ATSP6',
      can29: 'ATSP7',
      iso9141: 'ATSP3',
      kwp_slow: 'ATSP4',
      kwp_fast: 'ATSP5',
    };
    return map[get('protocol')] || 'ATSP0';
  }

  // Calcular marcha según velocidad y configuración
  function calculateGear(speed) {
    if (speed < 5) return 'N';
    const gears = get('racingGears');
    for (const g of gears) {
      if (speed < g.max) return g.gear;
    }
    return '6';
  }

  // Tamaño estimado de IndexedDB
  async function getStorageSize() {
    if (navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      return {
        used: est.usage || 0,
        quota: est.quota || 0,
        usedFormatted: formatBytes(est.usage || 0),
        quotaFormatted: formatBytes(est.quota || 0),
      };
    }
    return null;
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Exportar/Importar todos los ajustes
  function exportSettings() {
    return JSON.stringify(settings, null, 2);
  }

  function importSettings(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      settings = { ...DEFAULTS, ...imported };
      save();
      return true;
    } catch {
      return false;
    }
  }

  // Definición de secciones para reset parcial
  const SECTION_KEYS = {
    connection: ['autoConnect', 'protocol', 'pollingSpeed', 'commandTimeout'],
    units: ['speedUnit', 'tempUnit', 'fuelUnit', 'distanceUnit'],
    alerts: ['alertEngineTemp', 'alertEngineTempThreshold', 'alertBatteryLow', 'alertBatteryThreshold', 'alertMaxSpeed', 'alertMaxSpeedThreshold', 'alertHighRPM', 'alertHighRPMThreshold'],
    racing: ['racingMaxRPM', 'racingShiftRPM', 'racingGearMap', 'racingGears'],
    route: ['routePollingMs', 'routeGpsEnabled', 'routeAutoSave'],
    data: ['autoExportOnFinish', 'exportFormat'],
  };

  // Cargar al inicio
  load();

  return {
    get, set, getAll, setMultiple,
    resetAll, resetSection,
    onChange,
    convertSpeed, convertTemp, convertDistance,
    speedUnitLabel, tempUnitLabel, distanceUnitLabel,
    getPollingMs, getProtocolCommand, calculateGear,
    getStorageSize, formatBytes,
    exportSettings, importSettings,
    DEFAULTS,
    SECTION_KEYS,
  };
})();
