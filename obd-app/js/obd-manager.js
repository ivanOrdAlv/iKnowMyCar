/**
 * OBDManager - Comunicación con ELM327 vía Web Bluetooth (BLE).
 * Adaptado para usar OBDParser como módulo separado.
 */

const OBDManager = (() => {
  let device = null;
  let server = null;
  let service = null;
  let txCharacteristic = null;
  let rxCharacteristic = null;

  let isConnected = false;
  let isInitialized = false;

  let commandQueue = [];
  let isProcessing = false;
  let currentResolve = null;
  let responseBuffer = '';

  const KNOWN_SERVICES = [
    {
      service: '0000fff0-0000-1000-8000-00805f9b34fb',
      tx: '0000fff1-0000-1000-8000-00805f9b34fb',
      rx: '0000fff2-0000-1000-8000-00805f9b34fb',
    },
    {
      service: '0000ffe0-0000-1000-8000-00805f9b34fb',
      tx: '0000ffe1-0000-1000-8000-00805f9b34fb',
      rx: '0000ffe1-0000-1000-8000-00805f9b34fb',
    },
  ];

  // Mapa de PIDs a funciones de parsing
  const PID_PARSERS = {
    '010C': OBDParser.parseRPM,
    '010D': OBDParser.parseSpeed,
    '0105': OBDParser.parseCoolantTemp,
    '0111': OBDParser.parseThrottle,
    '0110': OBDParser.parseMAF,
    '010F': OBDParser.parseIntakeTemp,
    '0104': OBDParser.parseEngineLoad,
    '012F': OBDParser.parseFuelLevel,
    '010E': OBDParser.parseTimingAdvance,
    '011F': OBDParser.parseRuntime,
    '0146': OBDParser.parseAmbientTemp,
  };

  function log(msg, cls = 'log-info') {
    const logEl = document.getElementById('connect-log');
    if (logEl) {
      const line = document.createElement('div');
      line.className = cls;
      line.textContent = cls === 'log-success' ? `✓ ${msg}` : cls === 'log-error' ? `✗ ${msg}` : `> ${msg}`;
      logEl.appendChild(line);
      logEl.scrollTop = logEl.scrollHeight;
    }
    console.log(`[OBD] ${msg}`);
  }

  function updateStatus(status) {
    const badge = document.getElementById('connection-status');
    if (!badge) return;
    badge.className = `status-badge ${status}`;
    const labels = {
      connected: '<span class="status-dot"></span> VINCULADO',
      disconnected: '<span class="status-dot"></span> OFFLINE',
      connecting: '<span class="status-dot"></span> BUSCANDO...',
    };
    badge.innerHTML = labels[status] || labels.disconnected;
  }

  async function connect() {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth no disponible. Usa Chrome/Edge.');
    }

    updateStatus('connecting');
    log('Buscando dispositivos BLE...');

    try {
      device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: KNOWN_SERVICES.map(s => s.service),
      });

      log(`Dispositivo: ${device.name || 'Sin nombre'}`);
      device.addEventListener('gattserverdisconnected', onDisconnected);

      log('Conectando GATT...');
      server = await device.gatt.connect();
      log('GATT conectado', 'log-success');

      await discoverService();
      await subscribeNotifications();
      await initializeELM();

      isConnected = true;
      isInitialized = true;
      updateStatus('connected');
      log('¡Conexión establecida!', 'log-success');
      return true;
    } catch (err) {
      log(err.message, 'log-error');
      updateStatus('disconnected');
      isConnected = false;
      throw err;
    }
  }

  async function discoverService() {
    const services = await server.getPrimaryServices();
    for (const svc of services) {
      for (const known of KNOWN_SERVICES) {
        if (svc.uuid === known.service) {
          service = svc;
          const chars = await service.getCharacteristics();
          for (const char of chars) {
            if (char.uuid === known.tx) txCharacteristic = char;
            if (char.uuid === known.rx && char.properties.notify) rxCharacteristic = char;
          }
          if (txCharacteristic && !rxCharacteristic && txCharacteristic.properties.notify) {
            rxCharacteristic = txCharacteristic;
          }
          if (!txCharacteristic || !rxCharacteristic) {
            for (const c of chars) {
              if (!txCharacteristic && (c.properties.write || c.properties.writeWithoutResponse)) txCharacteristic = c;
              if (!rxCharacteristic && c.properties.notify) rxCharacteristic = c;
            }
          }
          if (txCharacteristic && rxCharacteristic) {
            log('Servicio ELM327 encontrado', 'log-success');
            return;
          }
        }
      }
    }
    // Fallback genérico
    for (const svc of services) {
      const chars = await svc.getCharacteristics();
      let foundTx = null, foundRx = null;
      for (const c of chars) {
        if (!foundTx && (c.properties.write || c.properties.writeWithoutResponse)) foundTx = c;
        if (!foundRx && c.properties.notify) foundRx = c;
      }
      if (foundTx && foundRx) {
        service = svc;
        txCharacteristic = foundTx;
        rxCharacteristic = foundRx;
        log('Servicio genérico encontrado', 'log-success');
        return;
      }
    }
    throw new Error('Servicio ELM327 no encontrado');
  }

  async function subscribeNotifications() {
    await rxCharacteristic.startNotifications();
    rxCharacteristic.addEventListener('characteristicvaluechanged', onNotification);
  }

  function onNotification(event) {
    const decoder = new TextDecoder();
    responseBuffer += decoder.decode(event.target.value);
    if (responseBuffer.includes('>') || responseBuffer.includes('\r\r') || responseBuffer.endsWith('\r')) {
      const response = responseBuffer.replace(/>/g, '').replace(/\r/g, '').replace(/\n/g, '').trim();
      responseBuffer = '';
      if (currentResolve) {
        const resolve = currentResolve;
        currentResolve = null;
        resolve(response);
      }
    }
  }

  function sendCommand(cmd) {
    return new Promise((resolve, reject) => {
      commandQueue.push({ cmd, resolve, reject });
      processQueue();
    });
  }

  async function processQueue() {
    if (isProcessing || commandQueue.length === 0) return;
    isProcessing = true;
    const { cmd, resolve, reject } = commandQueue.shift();
    try {
      if (!txCharacteristic) throw new Error('Sin conexión');
      responseBuffer = '';
      currentResolve = resolve;
      const encoder = new TextEncoder();
      const data = encoder.encode(cmd + '\r');
      if (txCharacteristic.properties.write) {
        await txCharacteristic.writeValue(data);
      } else {
        await txCharacteristic.writeValueWithoutResponse(data);
      }
      setTimeout(() => {
        if (currentResolve === resolve) {
          currentResolve = null;
          resolve('');
        }
      }, 4000);
    } catch (err) { reject(err); }
    isProcessing = false;
    setTimeout(() => processQueue(), 30);
  }

  async function initializeELM() {
    const commands = [
      { cmd: 'ATZ', desc: 'Reset' },
      { cmd: 'ATE0', desc: 'Echo off' },
      { cmd: 'ATL0', desc: 'Linefeeds off' },
      { cmd: 'ATS0', desc: 'Spaces off' },
      { cmd: 'ATH0', desc: 'Headers off' },
      { cmd: 'ATSP0', desc: 'Auto protocol' },
    ];
    for (const { cmd, desc } of commands) {
      log(`${cmd} (${desc})`);
      const resp = await sendCommand(cmd);
      log(`  → ${resp}`);
      await new Promise(r => setTimeout(r, 200));
    }
    log('ELM327 inicializado', 'log-success');
  }

  function onDisconnected() {
    isConnected = false;
    isInitialized = false;
    txCharacteristic = null;
    rxCharacteristic = null;
    service = null;
    server = null;
    device = null;
    updateStatus('disconnected');
  }

  function disconnect() {
    if (device && device.gatt.connected) device.gatt.disconnect();
    onDisconnected();
  }

  /**
   * Solicita un PID y devuelve el valor parseado automáticamente.
   */
  async function requestPID(pid) {
    if (!isConnected || !isInitialized) return null;
    try {
      const raw = await sendCommand(pid);
      const parser = PID_PARSERS[pid];
      if (parser) return parser(raw);
      return raw; // Para comandos AT como "AT RV"
    } catch { return null; }
  }

  /**
   * Envía un comando AT genérico (ej: "AT RV") y devuelve la respuesta raw.
   */
  async function sendAT(command) {
    if (!isConnected) return null;
    try {
      return await sendCommand(command);
    } catch { return null; }
  }

  async function readDTCs(mode = '03') {
    if (!isConnected || !isInitialized) return [];
    try {
      const raw = await sendCommand(mode);
      return OBDParser.parseDTCs(raw);
    } catch { return []; }
  }

  async function clearDTCs() {
    if (!isConnected) return false;
    try { await sendCommand('04'); return true; } catch { return false; }
  }

  return {
    connect,
    disconnect,
    sendCommand,
    sendAT,
    requestPID,
    readDTCs,
    clearDTCs,
    get isConnected() { return isConnected; },
    get isInitialized() { return isInitialized; },
  };
})();