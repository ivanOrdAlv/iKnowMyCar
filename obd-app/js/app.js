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

  // Instancia del modal de conexión de Bootstrap (se crea una vez, se reutiliza)
  let connectModal = null;

  function init() {
    // Navegación
    document.querySelectorAll('.td-bottom-nav .nav-link').forEach(item => {
      item.addEventListener('click', () => navigateTo(item.dataset.page));
    });

    connectModal = new bootstrap.Modal(document.getElementById('modal-connect'));

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

    navigateTo('dashboard');
  }

  function navigateTo(page) {
    if (views[currentPage] && views[currentPage].destroy) {
      views[currentPage].destroy();
    }
    currentPage = page;
    document.querySelectorAll('.td-bottom-nav .nav-link').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });
    document.getElementById('bottom-nav').classList.remove('d-none');
    document.getElementById('bottom-nav').classList.add('d-flex');
    document.getElementById('app-header').classList.remove('d-none');
    document.getElementById('app-header').classList.add('d-flex');
    if (views[page]) views[page].render();
  }

  function openConnectModal() {
    document.getElementById('connect-log').innerHTML = '';
    const btn = document.getElementById('btn-scan');
    btn.textContent = OBDManager.isConnected ? 'DESCONECTAR' : 'BUSCAR DISPOSITIVO';
    connectModal.show();
  }

  function closeConnectModal() {
    connectModal.hide();
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
