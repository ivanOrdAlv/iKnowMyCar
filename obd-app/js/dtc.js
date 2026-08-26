/**
 * DTCView - Diagnóstico de ECU con búsqueda en Google.
 */

const DTCView = (() => {
  let codes = [];
  let scanning = false;
  let lastScan = null;

  async function render() {
    const content = document.getElementById('app-content');

    if (!OBDManager.isConnected) {
      content.innerHTML = `
        <div style="text-align:center; padding:40px 0;">
          <h2 style="font-size:22px; font-weight:900; margin-bottom:8px;">DIAGNÓSTICO</h2>
          <div class="empty-state">
            <div class="empty-state-icon">🔌</div>
            <p class="empty-state-text" style="font-size:14px; letter-spacing:1px; color:#444;">OBD OFFLINE</p>
          </div>
        </div>
      `;
      return;
    }

    if (scanning) {
      content.innerHTML = `
        <div class="dtc-center">
          <div class="spinner"></div>
          <p style="color:#00FF41; font-weight:900; letter-spacing:2px; font-size:11px; margin-top:16px;">ESCANEANDO CENTRALITA...</p>
        </div>
      `;
      return;
    }

    if (codes.length > 0) {
      content.innerHTML = `
        <div style="padding:0 4px;">
          <div class="dtc-list-header">ANOMALÍAS DETECTADAS (${codes.length})</div>
          ${codes.map(code => {
            const info = DTCData.getDTCDescription(code);
            return `
              <div class="dtc-card">
                <div class="dtc-card-header">
                  <span class="dtc-code">${code}</span>
                  <a class="dtc-info-link" href="https://www.google.com/search?q=obd+code+${code}" target="_blank" rel="noopener">MÁS INFO ›</a>
                </div>
                <div class="dtc-card-title">${info.title}</div>
                <div class="dtc-card-desc">${info.desc}</div>
              </div>
            `;
          }).join('')}
        </div>
        <div class="dtc-footer">
          <button class="btn-danger" id="btn-clear-dtc">BORRAR CÓDIGOS</button>
          <button class="btn-secondary" id="btn-rescan" style="margin-top:10px; width:100%; text-align:center;">REESCANEAR</button>
        </div>
      `;
    } else {
      content.innerHTML = `
        <div class="dtc-center">
          <div class="dtc-status-glow ${lastScan ? 'ok' : ''}"></div>
          <div class="dtc-main-msg">${lastScan ? 'MOTOR EN ESTADO ÓPTIMO' : 'DIAGNÓSTICO LISTO'}</div>
          ${lastScan ? `<div class="dtc-sub-msg">CHEQUEO REALIZADO A LAS ${lastScan}</div>` : ''}
        </div>
        <div class="dtc-footer">
          <button class="btn-primary" id="btn-scan-dtc">ESCANEAR VEHÍCULO</button>
        </div>
      `;
    }

    // Listeners
    const scanBtn = document.getElementById('btn-scan-dtc') || document.getElementById('btn-rescan');
    if (scanBtn) scanBtn.addEventListener('click', scanDTCs);
    const clearBtn = document.getElementById('btn-clear-dtc');
    if (clearBtn) clearBtn.addEventListener('click', clearDTCs);
    if (document.getElementById('btn-rescan')) {
      document.getElementById('btn-rescan').addEventListener('click', scanDTCs);
    }
  }

  async function scanDTCs() {
    scanning = true;
    render();
    try {
      const raw = await OBDManager.sendCommand('03');
      codes = (!raw || raw.includes('NO DATA')) ? [] : OBDParser.parseDTCs(raw);
      lastScan = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      console.error('Error scanning DTCs:', e);
      codes = [];
    }
    scanning = false;
    render();
  }

  async function clearDTCs() {
    const modalEl = document.getElementById('modal-confirm');
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    document.getElementById('confirm-title').textContent = 'BORRAR ECU';
    document.getElementById('confirm-message').textContent = '¿Limpiar todos los códigos de error?';
    modal.show();

    const cleanup = () => {
      modal.hide();
      document.getElementById('btn-confirm-ok').replaceWith(document.getElementById('btn-confirm-ok').cloneNode(true));
      document.getElementById('btn-confirm-cancel').replaceWith(document.getElementById('btn-confirm-cancel').cloneNode(true));
    };

    document.getElementById('btn-confirm-ok').addEventListener('click', async () => {
      cleanup();
      await OBDManager.sendCommand('04');
      codes = [];
      render();
    });
    document.getElementById('btn-confirm-cancel').addEventListener('click', cleanup);
  }

  function destroy() {}

  return { render, destroy };
})();
