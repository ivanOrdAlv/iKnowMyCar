/**
 * App - Controlador principal de la SPA.
 * 5 tabs: LIVE, TRACK, RACE, HISTORY, ECU + Settings.
 */

const App = (() => {
  let currentPage = 'dashboard';
  const views = {
    dashboard: DashboardView,
    route: RouteView,
    racing: RacingView,
    history: HistoryView,
    dtc: DTCView,
  };

  function init() {
    // Navegación
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => navigateTo(item.dataset.page));
    });

    // Botón Bluetooth
    document.getElementById('btn-connect').addEventListener('click', openConnectModal);
    document.getElementById('btn-modal-close').addEventListener('click', closeConnectModal);
    document.getElementById('btn-scan').addEventListener('click', handleConnect);

    // Botón Settings
    document.getElementById('btn-settings').addEventListener('click', () => SettingsView.render());

    // Botón Vehículo
    document.getElementById('btn-vehicle').addEventListener('click', () => VehicleView.render());

    // Botón Performance
    document.getElementById('btn-performance').addEventListener('click', () => PerformanceView.render());

    // Botón HUD
    document.getElementById('btn-hud').addEventListener('click', () => HUDView.render());

    // Cerrar modal
    document.getElementById('modal-connect').addEventListener('click', (e) => {
      if (e.target.id === 'modal-connect') closeConnectModal();
    });

    navigateTo('dashboard');
  }

  function navigateTo(page) {
    if (views[currentPage] && views[currentPage].destroy) {
      views[currentPage].destroy();
    }
    currentPage = page;
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });
    // Show bottom nav and header again
    document.getElementById('bottom-nav').style.display = 'flex';
    document.getElementById('app-header').style.display = 'flex';
    if (views[page]) views[page].render();
  }

  function openConnectModal() {
    const modal = document.getElementById('modal-connect');
    const log = document.getElementById('connect-log');
    log.innerHTML = '';
    modal.classList.remove('hidden');

    // Actualizar texto del botón según estado
    const btn = document.getElementById('btn-scan');
    btn.textContent = OBDManager.isConnected ? 'DESCONECTAR' : 'BUSCAR DISPOSITIVO';
  }

  function closeConnectModal() {
    document.getElementById('modal-connect').classList.add('hidden');
  }

  async function handleConnect() {
    const btn = document.getElementById('btn-scan');

    if (OBDManager.isConnected) {
      OBDManager.disconnect();
      btn.textContent = 'BUSCAR DISPOSITIVO';
      closeConnectModal();
      if (currentPage === 'dashboard') views.dashboard.render();
      else if (currentPage === 'racing') views.racing.render();
      else if (currentPage === 'route') views.route.render();
      return;
    }

    btn.disabled = true;
    btn.textContent = 'BUSCANDO...';

    try {
      await OBDManager.connect();
      closeConnectModal();
      if (currentPage === 'dashboard' && views.dashboard.onConnect) views.dashboard.onConnect();
      else if (currentPage === 'racing' && views.racing.onConnect) views.racing.onConnect();
      else if (currentPage === 'dtc') views.dtc.render();
      else if (currentPage === 'route') views.route.render();
    } catch (err) {
      console.error('Connection error:', err);
    }

    btn.textContent = OBDManager.isConnected ? 'DESCONECTAR' : 'BUSCAR DISPOSITIVO';
    btn.disabled = false;
  }

  document.addEventListener('DOMContentLoaded', init);

  return { init, navigateTo };
})();
