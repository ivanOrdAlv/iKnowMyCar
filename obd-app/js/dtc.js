/**
 * DTCView - Diagnóstico de ECU con búsqueda en Google.
 * Estructura con componentes nativos de Bootstrap (spinner, list-group,
 * botones btn-primary/btn-danger, que ya heredan el verde/rojo racing
 * porque theme.css redefine --bs-primary y --bs-danger).
 */

const DTCView = (() => {
  let codes = [];
  let scanning = false;
  let lastScan = null;

  async function render() {
    const content = document.getElementById('app-content');
    const centered = 'd-flex flex-column align-items-center justify-content-center text-center';
    const minH = 'style="min-height: calc(100vh - var(--td-header-height) - var(--td-nav-height) - 2rem);"';

    if (!OBDManager.isConnected) {
      content.innerHTML = `
        <div class="${centered}" ${minH}>
          <h2 class="fw-bold td-mono mb-3" style="font-size:1.3rem; letter-spacing:1px;">DIAGNÓSTICO</h2>
          <div class="fs-1 mb-2">🔌</div>
          <p class="text-secondary fw-bold small" style="letter-spacing:1px;">OBD OFFLINE</p>
        </div>
      `;
      return;
    }

    if (scanning) {
      content.innerHTML = `
        <div class="${centered}" ${minH}>
          <div class="spinner-border text-success mb-3" role="status"></div>
          <p class="text-success fw-bold td-mono small mb-0" style="letter-spacing:2px;">ESCANEANDO CENTRALITA...</p>
        </div>
      `;
      return;
    }

    if (codes.length > 0) {
      content.innerHTML = `
        <div class="fw-bold td-mono mb-3" style="letter-spacing:1px;">ANOMALÍAS DETECTADAS (${codes.length})</div>
        <div class="d-flex flex-column gap-2 mb-3">
          ${codes.map(code => {
            const info = DTCData.getDTCDescription(code);
            return `
              <div class="card">
                <div class="card-body">
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="badge fs-6 td-mono" style="background:var(--td-red);">${code}</span>
                    <a class="small fw-bold link-light" href="https://www.google.com/search?q=obd+code+${code}" target="_blank" rel="noopener">MÁS INFO ›</a>
                  </div>
                  <div class="fw-bold mb-1">${info.title}</div>
                  <div class="text-secondary small">${info.desc}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <button class="btn btn-danger w-100 fw-bold mb-2" id="btn-clear-dtc">BORRAR CÓDIGOS</button>
        <button class="btn btn-outline-light w-100 fw-bold" id="btn-rescan">REESCANEAR</button>
      `;
    } else {
      content.innerHTML = `
        <div class="${centered}" ${minH}>
          <div class="td-status-glow ${lastScan ? 'ok' : ''}">${lastScan ? '✅' : '🔍'}</div>
          <div class="fw-bold td-mono mb-1" style="letter-spacing:1px;">${lastScan ? 'MOTOR EN ESTADO ÓPTIMO' : 'DIAGNÓSTICO LISTO'}</div>
          ${lastScan ? `<div class="text-secondary small fw-bold mb-4" style="letter-spacing:1px;">CHEQUEO REALIZADO A LAS ${lastScan}</div>` : '<div class="mb-4"></div>'}
          <button class="btn btn-primary fw-bold px-4" id="btn-scan-dtc">ESCANEAR VEHÍCULO</button>
        </div>
      `;
    }

    const scanBtn = document.getElementById('btn-scan-dtc') || document.getElementById('btn-rescan');
    if (scanBtn) scanBtn.addEventListener('click', scanDTCs);
    const clearBtn = document.getElementById('btn-clear-dtc');
    if (clearBtn) clearBtn.addEventListener('click', clearDTCs);
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