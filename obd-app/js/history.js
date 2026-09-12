/**
 * HistoryView - Historial con detalle, gráficas, mapa SVG y comparador avanzado.
 * 
 * Vistas: list → detail | compare
 * Comparador: radar chart, score conducción, veredicto, timeline, exportar.
 */

const HistoryView = (() => {
  let currentView = 'list';
  let selectedTripId = null;
  let chartInstances = {};
  let mapInstance = null;

  let compareMode = false;
  let selectedCompareIds = new Set();

  function render() {
    if (currentView === 'list') renderList();
    else if (currentView === 'detail') renderDetail();
    else if (currentView === 'compare') renderCompare();
  }

  // ================================================================
  //  LISTA
  // ================================================================

  async function renderList() {
    const content = document.getElementById('app-content');
    const trips = await TripStorage.listTrips();

    let totalKm = 0;
    const tripCards = await Promise.all(trips.map(async (trip) => {
      const stats = await TripStorage.getTripStats(trip.id);
      const durationHrs = trip.ended_at ? (trip.ended_at - trip.started_at) / 3600000 : 0;
      const distance = stats?.avgSpeed ? (stats.avgSpeed * durationHrs).toFixed(1) : '0.0';
      totalKm += parseFloat(distance) || 0;

      const date = new Date(trip.started_at);
      const dateStr = date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
      const timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const isSelected = selectedCompareIds.has(trip.id);

      return `
        <div class="trip-card ${compareMode ? 'compare-mode' : ''} ${isSelected ? 'compare-selected' : ''}" data-trip-id="${trip.id}">
          ${compareMode ? `<div class="compare-checkbox ${isSelected ? 'checked' : ''}">${isSelected ? '✓' : ''}</div>` : ''}
          <div style="flex:1;">
            <div class="trip-card-date">${dateStr} @ ${timeStr}</div>
            <div class="trip-card-title">${trip.name || `SESIÓN #${trip.id}`}</div>
            <div class="trip-card-stats">
              <div><div class="trip-card-stat-label">DISTANCIA</div><div class="trip-card-stat-value">${distance} km</div></div>
              <div><div class="trip-card-stat-label">V. MÁX</div><div class="trip-card-stat-value">${stats ? Math.round(stats.maxSpeed) : 0} km/h</div></div>
              <div><div class="trip-card-stat-label">LECTURAS</div><div class="trip-card-stat-value">${stats?.readingCount || 0}</div></div>
            </div>
          </div>
          ${!compareMode ? `<div class="trip-card-actions">
            <button class="btn-rename" data-trip-id="${trip.id}" title="Renombrar">✎</button>
            <button class="btn-small btn-danger btn-delete-trip" data-trip-id="${trip.id}" title="Eliminar">🗑</button>
          </div>` : ''}
        </div>
      `;
    }));

    const canCompare = trips.length >= 2;

    content.innerHTML = `
      <div class="history-top-stats">
        <div class="history-top-stat"><div class="history-top-stat-val">${trips.length}</div><div class="history-top-stat-label">SESIONES</div></div>
        <div class="history-top-stat"><div class="history-top-stat-val">${totalKm.toFixed(1)}</div><div class="history-top-stat-label">KM TOTALES</div></div>
      </div>
      ${canCompare ? `<div class="compare-bar">
        <button class="btn-compare-toggle ${compareMode ? 'active' : ''}" id="btn-compare-toggle">${compareMode ? '✕ CANCELAR' : '⚡ COMPARAR'}</button>
        ${compareMode ? '<span class="compare-hint">Selecciona 2 sesiones</span>' : ''}
      </div>` : ''}
      ${tripCards.length > 0 ? tripCards.join('') : '<div class="empty-state"><div class="empty-state-text">NO HAY DATOS</div></div>'}
    `;

    if (compareMode && selectedCompareIds.size === 2) {
      const fab = document.createElement('button');
      fab.className = 'compare-fab';
      fab.id = 'compare-fab';
      fab.innerHTML = '⚡ COMPARAR';
      document.body.appendChild(fab);
      fab.addEventListener('click', () => { currentView = 'compare'; render(); });
    }

    document.querySelectorAll('.trip-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-rename') || e.target.closest('.btn-delete-trip')) return;
        if (compareMode) {
          toggleCompareSelection(parseInt(card.dataset.tripId));
        } else {
          selectedTripId = parseInt(card.dataset.tripId);
          currentView = 'detail';
          render();
        }
      });
    });

    if (!compareMode) {
      document.querySelectorAll('.btn-rename').forEach(btn => {
        btn.addEventListener('click', (e) => { e.stopPropagation(); showRenameModal(parseInt(btn.dataset.tripId)); });
      });
      document.querySelectorAll('.btn-delete-trip').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          showConfirm('BORRAR', '¿Eliminar sesión?', async () => {
            await TripStorage.deleteTrip(parseInt(btn.dataset.tripId));
            render();
          });
        });
      });
    }

    const toggle = document.getElementById('btn-compare-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        compareMode = !compareMode;
        if (!compareMode) { selectedCompareIds.clear(); removeCompareFAB(); }
        render();
      });
    }
  }

  function toggleCompareSelection(tripId) {
    if (selectedCompareIds.has(tripId)) {
      selectedCompareIds.delete(tripId);
    } else {
      if (selectedCompareIds.size >= 2) {
        const first = [...selectedCompareIds][0];
        selectedCompareIds.delete(first);
      }
      selectedCompareIds.add(tripId);
    }
    removeCompareFAB();
    render();
  }

  function removeCompareFAB() {
    const el = document.getElementById('compare-fab');
    if (el) el.remove();
  }

  // ================================================================
  //  DETALLE
  // ================================================================

  async function renderDetail() {
    const content = document.getElementById('app-content');
    destroyCharts();

    const trip = await TripStorage.getTrip(selectedTripId);
    const readings = await TripStorage.getReadingsForTrip(selectedTripId);
    const events = await TripStorage.getEventsForTrip(selectedTripId);
    const stats = await TripStorage.getTripStats(selectedTripId);

    if (!trip || readings.length === 0) {
      content.innerHTML = '<div class="empty-state"><div class="empty-state-text">NO HAY DATOS</div></div>';
      return;
    }

    const sampled = downsample(readings, 100);
    const labels = sampled.map((r, i) =>
      i % Math.ceil(sampled.length / 6) === 0
        ? new Date(r.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : ''
    );

    const totalFuel = FuelEstimator.calculateTotalFuelUsed(readings);
    const totalDistance = FuelEstimator.calculateTotalDistanceKm(readings);
    const consumption = totalDistance > 0 ? ((totalFuel / totalDistance) * 100).toFixed(1) : '--';
    const duration = trip.ended_at ? Math.round((trip.ended_at - trip.started_at) / 60000) : 0;
    const ec = EventDetector.summarizeEvents(events);

    content.innerHTML = `
      <button class="btn-back" id="btn-back">← VOLVER</button>
      <h2 style="font-size:18px; font-weight:900; margin-bottom:4px;">${new Date(trip.started_at).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
      <p style="color:#333; font-size:10px; font-weight:900; letter-spacing:2px; margin-bottom:20px;">${new Date(trip.started_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
      <div class="detail-stats">
        <div class="detail-stat"><div class="detail-stat-value">${duration}</div><div class="detail-stat-label">MIN</div></div>
        <div class="detail-stat"><div class="detail-stat-value">${totalDistance.toFixed(1)}</div><div class="detail-stat-label">KM</div></div>
        <div class="detail-stat"><div class="detail-stat-value">${totalFuel.toFixed(2)}</div><div class="detail-stat-label">LITROS</div></div>
        <div class="detail-stat"><div class="detail-stat-value">${consumption}</div><div class="detail-stat-label">L/100KM</div></div>
        <div class="detail-stat"><div class="detail-stat-value">${stats ? Math.round(stats.maxSpeed) : 0}</div><div class="detail-stat-label">KM/H MÁX</div></div>
        <div class="detail-stat"><div class="detail-stat-value">${stats ? Math.round(stats.maxRpm) : 0}</div><div class="detail-stat-label">RPM MÁX</div></div>
      </div>
      ${events.length > 0 ? `<div class="card"><div class="card-title">EVENTOS DETECTADOS</div><div class="event-counts">
        <div class="event-count"><div class="event-count-num" style="color:#FF3B30">${ec.hardBrakes}</div><div style="font-size:10px;color:#666;">Frenazos</div></div>
        <div class="event-count"><div class="event-count-num" style="color:#00FF41">${ec.hardAccels}</div><div style="font-size:10px;color:#666;">Acelerones</div></div>
        <div class="event-count"><div class="event-count-num" style="color:#FF9500">${ec.highThrottleMoments}</div><div style="font-size:10px;color:#666;">A fondo</div></div>
      </div></div>` : ''}
      <div class="map-container"><div class="card-title" style="align-self:flex-start; margin-bottom:16px;">TRAZADO DE LA RUTA</div>
        <div id="map-leaflet" style="height:280px; border-radius:8px; overflow:hidden;"></div>
        <div class="map-legend">
          <div class="map-legend-item"><div class="map-legend-dot" style="background:#007AFF"></div><span class="map-legend-text">INICIO</span></div>
          <div class="map-legend-item"><div class="map-legend-dot" style="background:#FF3B30"></div><span class="map-legend-text">FIN</span></div>
          <div class="map-legend-item"><div class="map-legend-dot" style="background:#00FF41"></div><span class="map-legend-text">LENTO</span></div>
          <div class="map-legend-item"><div class="map-legend-dot" style="background:#FFD700"></div><span class="map-legend-text">RÁPIDO</span></div>
        </div>
      </div>
      <div class="chart-container"><div class="chart-title">VELOCIDAD (KM/H)</div><canvas id="chart-speed"></canvas></div>
      <div class="chart-container"><div class="chart-title">RPM</div><canvas id="chart-rpm"></canvas></div>
      <div class="chart-container"><div class="chart-title">ACELERADOR (%)</div><canvas id="chart-throttle"></canvas></div>
      <div class="chart-container"><div class="chart-title">TEMP. REFRIGERANTE (°C)</div><canvas id="chart-temp"></canvas></div>
    `;

    document.getElementById('btn-back').addEventListener('click', () => { currentView = 'list'; selectedTripId = null; destroyCharts(); destroyMap(); render(); });

    const opts = getChartOpts();
    createChart('chart-speed', labels, sampled.map(r => r.speed ?? 0), '#FFF', opts);
    createChart('chart-rpm', labels, sampled.map(r => r.rpm ?? 0), '#FF3B30', opts);
    createChart('chart-throttle', labels, sampled.map(r => r.throttle ?? 0), '#00FF41', opts);
    createChart('chart-temp', labels, sampled.map(r => r.coolant_temp ?? 0), '#FF9500', opts);
    renderRouteMap(readings, events);
  }

  // ================================================================
  //  COMPARADOR AVANZADO
  // ================================================================

  async function renderCompare() {
    removeCompareFAB();
    const content = document.getElementById('app-content');
    destroyCharts(); destroyMap();

    const ids = [...selectedCompareIds];
    if (ids.length !== 2) { currentView = 'list'; render(); return; }

    const [tripA, tripB] = await Promise.all(ids.map(id => TripStorage.getTrip(id)));
    const [readingsA, readingsB] = await Promise.all(ids.map(id => TripStorage.getReadingsForTrip(id)));
    const [eventsA, eventsB] = await Promise.all(ids.map(id => TripStorage.getEventsForTrip(id)));
    const [statsA, statsB] = await Promise.all(ids.map(id => TripStorage.getTripStats(id)));

    if (!tripA || !tripB || readingsA.length === 0 || readingsB.length === 0) {
      content.innerHTML = '<div class="empty-state"><div class="empty-state-text">DATOS INSUFICIENTES</div></div>';
      return;
    }

    const dataA = calcTripSummary(tripA, readingsA, eventsA, statsA);
    const dataB = calcTripSummary(tripB, readingsB, eventsB, statsB);
    const colorA = '#00FF41';
    const colorB = '#007AFF';
    const nameA = tripA.name || `SESIÓN #${tripA.id}`;
    const nameB = tripB.name || `SESIÓN #${tripB.id}`;
    const dateA = new Date(tripA.started_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    const dateB = new Date(tripB.started_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });

    // Calcular scores
    const scoreA = calculateDrivingScore(dataA);
    const scoreB = calculateDrivingScore(dataB);

    // Veredicto
    const verdict = calculateVerdict(dataA, dataB);

    // Normalizar datos para gráficas
    const maxPts = 100;
    const sampledA = downsample(readingsA, maxPts);
    const sampledB = downsample(readingsB, maxPts);
    const maxLen = Math.max(sampledA.length, sampledB.length);
    const labels = Array.from({ length: maxLen }, (_, i) => i % Math.ceil(maxLen / 6) === 0 ? `${Math.round((i / maxLen) * 100)}%` : '');
    const pad = (arr, len) => { while (arr.length < len) arr.push(null); return arr; };

    const speedA = pad(sampledA.map(r => r.speed ?? 0), maxLen);
    const speedB = pad(sampledB.map(r => r.speed ?? 0), maxLen);
    const rpmA = pad(sampledA.map(r => r.rpm ?? 0), maxLen);
    const rpmB = pad(sampledB.map(r => r.rpm ?? 0), maxLen);
    const throttleA = pad(sampledA.map(r => r.throttle ?? 0), maxLen);
    const throttleB = pad(sampledB.map(r => r.throttle ?? 0), maxLen);
    const tempA = pad(sampledA.map(r => r.coolant_temp ?? 0), maxLen);
    const tempB = pad(sampledB.map(r => r.coolant_temp ?? 0), maxLen);
    const fuelA = pad(sampledA.map(r => r.fuel_rate ?? 0), maxLen);
    const fuelB = pad(sampledB.map(r => r.fuel_rate ?? 0), maxLen);

    // Radar chart data (normalizado 0-100)
    const radarLabels = ['Velocidad', 'Eficiencia', 'Suavidad', 'Potencia', 'Temperatura', 'Carga'];
    const radarA = buildRadarData(dataA, readingsA, statsA);
    const radarB = buildRadarData(dataB, readingsB, statsB);

    content.innerHTML = `
      <button class="btn-back" id="btn-back-compare">← VOLVER AL HISTORIAL</button>

      <div class="compare-header"><div class="compare-header-title">COMPARATIVA</div></div>

      <!-- Leyenda -->
      <div class="compare-legend">
        <div class="compare-legend-item"><div class="compare-legend-color" style="background:${colorA}"></div><div><div class="compare-legend-name">${nameA}</div><div class="compare-legend-date">${dateA}</div></div></div>
        <div class="compare-legend-item"><div class="compare-legend-color" style="background:${colorB}"></div><div><div class="compare-legend-name">${nameB}</div><div class="compare-legend-date">${dateB}</div></div></div>
      </div>

      <!-- 🏆 VEREDICTO -->
      <div class="verdict-card">
        <div class="verdict-crown">🏆</div>
        <div class="verdict-text">${verdict.text}</div>
        <div class="verdict-detail">${verdict.detail}</div>
      </div>

      <!-- SCORES -->
      <div class="scores-row">
        <div class="score-card" style="border-color:${colorA}">
          <div class="score-label">RUTA A</div>
          <div class="score-ring-container">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="#111" stroke-width="6"/>
              <circle cx="40" cy="40" r="34" fill="none" stroke="${colorA}" stroke-width="6" stroke-linecap="round"
                stroke-dasharray="${2 * Math.PI * 34}" stroke-dashoffset="${2 * Math.PI * 34 * (1 - scoreA.total / 100)}"
                transform="rotate(-90 40 40)"/>
            </svg>
            <div class="score-value" style="color:${colorA}">${scoreA.total}</div>
          </div>
          <div class="score-breakdown">
            <span>Efic: ${scoreA.efficiency}</span>
            <span>Suav: ${scoreA.smoothness}</span>
          </div>
        </div>
        <div class="score-card" style="border-color:${colorB}">
          <div class="score-label">RUTA B</div>
          <div class="score-ring-container">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="#111" stroke-width="6"/>
              <circle cx="40" cy="40" r="34" fill="none" stroke="${colorB}" stroke-width="6" stroke-linecap="round"
                stroke-dasharray="${2 * Math.PI * 34}" stroke-dashoffset="${2 * Math.PI * 34 * (1 - scoreB.total / 100)}"
                transform="rotate(-90 40 40)"/>
            </svg>
            <div class="score-value" style="color:${colorB}">${scoreB.total}</div>
          </div>
          <div class="score-breakdown">
            <span>Efic: ${scoreB.efficiency}</span>
            <span>Suav: ${scoreB.smoothness}</span>
          </div>
        </div>
      </div>

      <!-- 🕸️ RADAR CHART -->
      <div class="chart-container">
        <div class="chart-title">PERFIL DE CONDUCCIÓN</div>
        <canvas id="cmp-radar"></canvas>
      </div>

      <!-- TABLA -->
      <div class="compare-table">
        <div class="compare-table-header"><span>MÉTRICA</span><span style="color:${colorA}">A</span><span style="color:${colorB}">B</span><span>GANADOR</span></div>
        ${compareRow('Duración', dataA.duration + ' min', dataB.duration + ' min', winner(dataA.duration, dataB.duration, 'lower'), colorA, colorB)}
        ${compareRow('Distancia', dataA.distance + ' km', dataB.distance + ' km', winner(dataA.distance, dataB.distance, 'higher'), colorA, colorB)}
        ${compareRow('Vel. máxima', dataA.maxSpeed + ' km/h', dataB.maxSpeed + ' km/h', winner(dataA.maxSpeed, dataB.maxSpeed, 'higher'), colorA, colorB)}
        ${compareRow('Vel. media', dataA.avgSpeed + ' km/h', dataB.avgSpeed + ' km/h', winner(dataA.avgSpeed, dataB.avgSpeed, 'higher'), colorA, colorB)}
        ${compareRow('Consumo', dataA.fuel + ' L', dataB.fuel + ' L', winner(parseFloat(dataA.fuel), parseFloat(dataB.fuel), 'lower'), colorA, colorB)}
        ${compareRow('L/100km', dataA.consumption, dataB.consumption, winner(dataA.consumptionL100, dataB.consumptionL100, 'lower'), colorA, colorB)}
        ${compareRow('RPM máx', dataA.maxRpm + '', dataB.maxRpm + '', winner(dataA.maxRpm, dataB.maxRpm, 'higher'), colorA, colorB)}
        ${compareRow('Frenazos', dataA.ec.hardBrakes + '', dataB.ec.hardBrakes + '', winner(dataA.ec.hardBrakes, dataB.ec.hardBrakes, 'lower'), colorA, colorB)}
        ${compareRow('Acelerones', dataA.ec.hardAccels + '', dataB.ec.hardAccels + '', winner(dataA.ec.hardAccels, dataB.ec.hardAccels, 'lower'), colorA, colorB)}
      </div>

      <!-- TIMELINE DE EVENTOS -->
      <div class="card">
        <div class="card-title">TIMELINE DE EVENTOS</div>
        <div class="timeline-container">
          <div class="timeline-column">
            <div class="timeline-header" style="color:${colorA}">${nameA}</div>
            ${renderTimeline(eventsA, tripA.started_at, colorA)}
          </div>
          <div class="timeline-divider"></div>
          <div class="timeline-column">
            <div class="timeline-header" style="color:${colorB}">${nameB}</div>
            ${renderTimeline(eventsB, tripB.started_at, colorB)}
          </div>
        </div>
      </div>

      <!-- MAPA -->
      <div class="map-container">
        <div class="card-title" style="align-self:flex-start; margin-bottom:16px;">TRAZADOS COMPARADOS</div>
        <div id="map-compare-leaflet" style="height:280px; border-radius:8px; overflow:hidden;"></div>
        <div class="map-legend">
          <div class="map-legend-item"><div class="map-legend-dot" style="background:${colorA}"></div><span class="map-legend-text">${nameA}</span></div>
          <div class="map-legend-item"><div class="map-legend-dot" style="background:${colorB}"></div><span class="map-legend-text">${nameB}</span></div>
        </div>
      </div>

      <!-- GRÁFICAS -->
      <div class="chart-container"><div class="chart-title">VELOCIDAD (KM/H)</div><canvas id="cmp-speed"></canvas></div>
      <div class="chart-container"><div class="chart-title">RPM</div><canvas id="cmp-rpm"></canvas></div>
      <div class="chart-container"><div class="chart-title">ACELERADOR (%)</div><canvas id="cmp-throttle"></canvas></div>
      <div class="chart-container"><div class="chart-title">CONSUMO INSTANTÁNEO (L/H)</div><canvas id="cmp-fuel"></canvas></div>
      <div class="chart-container"><div class="chart-title">TEMP. REFRIGERANTE (°C)</div><canvas id="cmp-temp"></canvas></div>

      <!-- EXPORTAR -->
      <button class="btn-export-compare" id="btn-export-compare">📥 EXPORTAR COMPARATIVA (JSON)</button>
    `;

    document.getElementById('btn-back-compare').addEventListener('click', () => {
      currentView = 'list'; selectedCompareIds.clear(); compareMode = false; destroyCharts(); destroyMap(); render();
    });

    document.getElementById('btn-export-compare').addEventListener('click', () => {
      const exportData = {
        comparedAt: new Date().toISOString(),
        routeA: { name: nameA, date: dateA, summary: dataA, score: scoreA, readings: readingsA.length, events: eventsA },
        routeB: { name: nameB, date: dateB, summary: dataB, score: scoreB, readings: readingsB.length, events: eventsB },
        verdict: verdict.text,
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `comparativa_${ids[0]}_vs_${ids[1]}.json`;
      a.click();
    });

    // Radar chart
    createRadarChart('cmp-radar', radarLabels, radarA, radarB, colorA, colorB, nameA, nameB);

    // Line charts
    createCompareChart('cmp-speed', labels, speedA, speedB, colorA, colorB, nameA, nameB);
    createCompareChart('cmp-rpm', labels, rpmA, rpmB, colorA, colorB, nameA, nameB);
    createCompareChart('cmp-throttle', labels, throttleA, throttleB, colorA, colorB, nameA, nameB);
    createCompareChart('cmp-fuel', labels, fuelA, fuelB, colorA, colorB, nameA, nameB);
    createCompareChart('cmp-temp', labels, tempA, tempB, colorA, colorB, nameA, nameB);

    // Mapa
    renderCompareRouteMap(readingsA, readingsB, colorA, colorB, nameA, nameB);
  }

  // ================================================================
  //  DRIVING SCORE (0-100)
  // ================================================================

  function calculateDrivingScore(data) {
    const durationMin = data.duration || 1;

    // Eficiencia (0-50): mejor cuanto menor L/100km (rango 4-15 es típico)
    let efficiency = 50;
    if (data.consumptionL100 > 0) {
      if (data.consumptionL100 <= 5) efficiency = 50;
      else if (data.consumptionL100 <= 7) efficiency = 45;
      else if (data.consumptionL100 <= 9) efficiency = 38;
      else if (data.consumptionL100 <= 12) efficiency = 28;
      else efficiency = Math.max(5, 50 - data.consumptionL100 * 3);
    }

    // Suavidad (0-50): penalizar eventos por minuto
    const totalEvents = data.ec.hardBrakes + data.ec.hardAccels + data.ec.highThrottleMoments;
    const eventsPerMin = totalEvents / durationMin;
    let smoothness = 50;
    if (eventsPerMin <= 0.1) smoothness = 50;
    else if (eventsPerMin <= 0.3) smoothness = 42;
    else if (eventsPerMin <= 0.6) smoothness = 34;
    else if (eventsPerMin <= 1.0) smoothness = 24;
    else smoothness = Math.max(5, 50 - eventsPerMin * 25);

    const total = Math.round(efficiency + smoothness);
    return { total, efficiency: Math.round(efficiency), smoothness: Math.round(smoothness) };
  }

  // ================================================================
  //  RADAR DATA (6 ejes, 0-100)
  // ================================================================

  function buildRadarData(summary, readings, stats) {
    // Velocidad: normalizar vel. media (0-130 km/h → 0-100)
    const velocidad = Math.min(100, Math.round((summary.avgSpeed / 130) * 100));

    // Eficiencia: inversa al consumo (5 L/100km = 100, 15 = 0)
    let eficiencia = 100;
    if (summary.consumptionL100 > 0) {
      eficiencia = Math.max(0, Math.min(100, Math.round(100 - ((summary.consumptionL100 - 5) / 10) * 100)));
    }

    // Suavidad: inversa a eventos/min
    const durationMin = summary.duration || 1;
    const totalEvents = summary.ec.hardBrakes + summary.ec.hardAccels + summary.ec.highThrottleMoments;
    const eventsPerMin = totalEvents / durationMin;
    const suavidad = Math.max(0, Math.min(100, Math.round(100 - eventsPerMin * 100)));

    // Potencia: RPM máx normalizado (0-8000 → 0-100)
    const potencia = Math.min(100, Math.round((summary.maxRpm / 8000) * 100));

    // Temperatura: estabilidad (mejor si está 85-95°C)
    const avgTemps = readings.filter(r => r.coolant_temp != null).map(r => r.coolant_temp);
    let temperatura = 50;
    if (avgTemps.length > 0) {
      const avgTemp = avgTemps.reduce((a, b) => a + b, 0) / avgTemps.length;
      if (avgTemp >= 85 && avgTemp <= 95) temperatura = 100;
      else if (avgTemp >= 80 && avgTemp <= 100) temperatura = 80;
      else if (avgTemp >= 75 && avgTemp <= 105) temperatura = 60;
      else temperatura = 30;
    }

    // Carga: carga media del motor
    const throttleReadings = readings.filter(r => r.throttle != null);
    let carga = 50;
    if (throttleReadings.length > 0) {
      const avgThrottle = throttleReadings.reduce((a, b) => a + b.throttle, 0) / throttleReadings.length;
      carga = Math.min(100, Math.round(avgThrottle));
    }

    return [velocidad, eficiencia, suavidad, potencia, temperatura, carga];
  }

  // ================================================================
  //  VEREDICTO
  // ================================================================

  function calculateVerdict(a, b) {
    const categories = [
      { label: 'Velocidad máxima', valA: a.maxSpeed, valB: b.maxSpeed, better: 'higher' },
      { label: 'Velocidad media', valA: a.avgSpeed, valB: b.avgSpeed, better: 'higher' },
      { label: 'Distancia', valA: parseFloat(a.distance), valB: parseFloat(b.distance), better: 'higher' },
      { label: 'Eficiencia (L/100km)', valA: a.consumptionL100, valB: b.consumptionL100, better: 'lower' },
      { label: 'Consumo total', valA: parseFloat(a.fuel), valB: parseFloat(b.fuel), better: 'lower' },
      { label: 'RPM máximas', valA: a.maxRpm, valB: b.maxRpm, better: 'higher' },
      { label: 'Frenazos', valA: a.ec.hardBrakes, valB: b.ec.hardBrakes, better: 'lower' },
      { label: 'Acelerones', valA: a.ec.hardAccels, valB: b.ec.hardAccels, better: 'lower' },
      { label: 'Acelerador a fondo', valA: a.ec.highThrottleMoments, valB: b.ec.highThrottleMoments, better: 'lower' },
    ];

    let winsA = 0, winsB = 0, ties = 0;
    for (const cat of categories) {
      const w = winner(cat.valA, cat.valB, cat.better);
      if (w === 'A') winsA++;
      else if (w === 'B') winsB++;
      else ties++;
    }

    const total = categories.length;
    let text, detail;

    if (winsA > winsB) {
      text = `RUTA A GANA EN ${winsA}/${total} CATEGORÍAS`;
      detail = winsA >= total - 1 ? '🔥 DOMINACIÓN TOTAL' : '🏆 VICTORIA CLARA';
    } else if (winsB > winsA) {
      text = `RUTA B GANA EN ${winsB}/${total} CATEGORÍAS`;
      detail = winsB >= total - 1 ? '🔥 DOMINACIÓN TOTAL' : '🏆 VICTORIA CLARA';
    } else {
      text = 'EMPATE TÉCNICO';
      detail = '⚖️ AMBAS RUTAS SON MUY SIMILARES';
    }

    if (ties > 0) detail += ` · ${ties} empate${ties > 1 ? 's' : ''}`;

    return { text, detail, winsA, winsB, ties };
  }

  // ================================================================
  //  TIMELINE DE EVENTOS
  // ================================================================

  function renderTimeline(events, tripStartTs, color) {
    if (events.length === 0) {
      return '<div class="timeline-empty">Sin eventos — conducción limpia ✓</div>';
    }

    return events.map(ev => {
      const meta = EventDetector.EVENT_LABELS[ev.type];
      const elapsed = Math.round((ev.timestamp - tripStartTs) / 1000);
      const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
      const ss = String(elapsed % 60).padStart(2, '0');
      return `
        <div class="timeline-event">
          <div class="timeline-dot" style="background:${ev.type === 'hardBrake' ? '#FF3B30' : ev.type === 'hardAccel' ? '#00FF41' : '#FF9500'}"></div>
          <div class="timeline-event-info">
            <span class="timeline-event-name">${meta.icon} ${meta.label}</span>
            <span class="timeline-event-time">${mm}:${ss}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // ================================================================
  //  HELPERS
  // ================================================================

  function winner(a, b, mode) {
    if (a == null || b == null || isNaN(a) || isNaN(b)) return '=';
    if (a === b) return '=';
    if (mode === 'higher') return a > b ? 'A' : 'B';
    return a < b ? 'A' : 'B'; // lower
  }

  function calcTripSummary(trip, readings, events, stats) {
    const duration = trip.ended_at ? Math.round((trip.ended_at - trip.started_at) / 60000) : 0;
    const totalFuel = FuelEstimator.calculateTotalFuelUsed(readings);
    const totalDistance = FuelEstimator.calculateTotalDistanceKm(readings);
    const consumptionL100 = totalDistance > 0 ? parseFloat(((totalFuel / totalDistance) * 100).toFixed(1)) : 0;

    return {
      duration,
      distance: totalDistance.toFixed(1),
      fuel: totalFuel.toFixed(2),
      consumption: consumptionL100 > 0 ? consumptionL100.toFixed(1) : '--',
      consumptionL100,
      maxSpeed: stats ? Math.round(stats.maxSpeed) : 0,
      avgSpeed: stats ? Math.round(stats.avgSpeed) : 0,
      maxRpm: stats ? Math.round(stats.maxRpm) : 0,
      ec: EventDetector.summarizeEvents(events),
    };
  }

  function compareRow(label, valA, valB, w, colorA, colorB) {
    let badge = '';
    if (w === 'A') badge = `<span style="color:${colorA}; font-weight:900;">A ▲</span>`;
    else if (w === 'B') badge = `<span style="color:${colorB}; font-weight:900;">B ▲</span>`;
    else badge = '<span style="color:#666;">=</span>';
    return `<div class="compare-table-row"><span class="compare-label">${label}</span><span>${valA}</span><span>${valB}</span><span class="compare-winner">${badge}</span></div>`;
  }

  function createRadarChart(id, labels, dataA, dataB, colorA, colorB, nameA, nameB) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    chartInstances[id] = new Chart(canvas.getContext('2d'), {
      type: 'radar',
      data: {
        labels,
        datasets: [
          { label: nameA, data: dataA, borderColor: colorA, backgroundColor: colorA + '20', borderWidth: 2, pointBackgroundColor: colorA, pointRadius: 4 },
          { label: nameB, data: dataB, borderColor: colorB, backgroundColor: colorB + '20', borderWidth: 2, pointBackgroundColor: colorB, pointRadius: 4 },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { display: true, labels: { color: '#666', font: { size: 10, weight: 'bold' }, boxWidth: 12 } } },
        scales: {
          r: {
            beginAtZero: true, max: 100, min: 0,
            ticks: { display: false, stepSize: 20 },
            grid: { color: '#222' },
            angleLines: { color: '#222' },
            pointLabels: { color: '#666', font: { size: 10, weight: 'bold' } },
          },
        },
      },
    });
  }

  function createCompareChart(id, labels, dataA, dataB, colorA, colorB, nameA, nameB) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    chartInstances[id] = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: nameA, data: dataA, borderColor: colorA, backgroundColor: colorA + '10', borderWidth: 2, fill: false, tension: 0.3, pointRadius: 0, pointHitRadius: 8 },
          { label: nameB, data: dataB, borderColor: colorB, backgroundColor: colorB + '10', borderWidth: 2, fill: false, tension: 0.3, pointRadius: 0, pointHitRadius: 8 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: true, aspectRatio: 2.2,
        interaction: { intersect: false, mode: 'index' },
        plugins: { legend: { display: true, labels: { color: '#666', font: { size: 10, weight: 'bold' }, boxWidth: 12, padding: 10 } }, tooltip: { backgroundColor: '#080808', titleColor: '#FFF', bodyColor: '#FFF', borderColor: '#111', borderWidth: 1 } },
        scales: {
          x: { ticks: { color: '#333', maxRotation: 0, maxTicksLimit: 6 }, grid: { color: '#111' } },
          y: { ticks: { color: '#333' }, grid: { color: '#111' }, beginAtZero: true },
        },
      },
    });
  }

  function renderCompareRouteMap(readingsA, readingsB, colorA, colorB, nameA, nameB) {
    destroyMap();

    const container = document.getElementById('map-compare-leaflet');
    if (!container) return;

    const gpsA = readingsA.filter(r => r.latitude != null && r.longitude != null);
    const gpsB = readingsB.filter(r => r.latitude != null && r.longitude != null);
    if (gpsA.length < 2 && gpsB.length < 2) {
      container.innerHTML = '<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#333;text-align:center;font-weight:900;letter-spacing:2px;font-size:11px;">SIN DATOS GPS</div>';
      return;
    }

    mapInstance = L.map('map-compare-leaflet', { zoomControl: true, attributionControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(mapInstance);

    const drawRoute = (gps, color, label) => {
      if (gps.length < 2) return [];
      L.polyline(gps.map(p => [p.latitude, p.longitude]), {
        color, weight: 5, opacity: 0.85, lineCap: 'round',
      }).addTo(mapInstance);

      // Inicio: círculo. Fin: cuadrado (mismo criterio visual que ya usabas en el SVG)
      const start = gps[0], end = gps[gps.length - 1];
      L.circleMarker([start.latitude, start.longitude], {
        radius: 7, color: '#fff', weight: 2, fillColor: color, fillOpacity: 1,
      }).addTo(mapInstance).bindPopup(`Inicio — ${label}`);
      L.marker([end.latitude, end.longitude], {
        icon: L.divIcon({
          className: '',
          html: `<div style="width:14px;height:14px;background:${color};border:2px solid #fff;border-radius:3px;"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        }),
      }).addTo(mapInstance).bindPopup(`Fin — ${label}`);

      return gps.map(p => [p.latitude, p.longitude]);
    };

    const allPoints = [
      ...drawRoute(gpsA, colorA, nameA),
      ...drawRoute(gpsB, colorB, nameB),
    ];

    if (allPoints.length > 0) {
      mapInstance.fitBounds(L.latLngBounds(allPoints), { padding: [20, 20] });
    }
  }

  function renderRouteMap(readings, events) {
    // Si ya había un mapa pintado en un render anterior, hay que destruirlo,
    // o Leaflet se queja de "Map container is already initialized".
    destroyMap();

    const container = document.getElementById('map-leaflet');
    if (!container) return;

    const gps = readings.filter(r => r.latitude != null && r.longitude != null);
    if (gps.length < 2) {
      container.innerHTML = '<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#333;text-align:center;font-weight:900;letter-spacing:2px;font-size:11px;">SIN DATOS GPS</div>';
      return;
    }

    // Mapa base (OpenStreetMap, sin API key ni facturación)
    mapInstance = L.map('map-leaflet', { zoomControl: true, attributionControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(mapInstance);

    // Trazado coloreado por velocidad: un segmento de línea por cada par de
    // puntos consecutivos, con color interpolado según lo rápido que ibas.
    const maxSpeed = Math.max(...gps.map(p => p.speed || 0), 1);
    for (let i = 1; i < gps.length; i++) {
      const a = gps[i - 1], b = gps[i];
      const speed = ((a.speed || 0) + (b.speed || 0)) / 2;
      L.polyline(
        [[a.latitude, a.longitude], [b.latitude, b.longitude]],
        { color: speedToColor(speed, maxSpeed), weight: 5, opacity: 0.85, lineCap: 'round' }
      ).addTo(mapInstance);
    }

    // Marcadores de inicio y fin
    const start = gps[0], end = gps[gps.length - 1];
    L.circleMarker([start.latitude, start.longitude], {
      radius: 8, color: '#fff', weight: 2, fillColor: '#007AFF', fillOpacity: 1,
    }).addTo(mapInstance).bindPopup('Inicio');
    L.circleMarker([end.latitude, end.longitude], {
      radius: 8, color: '#fff', weight: 2, fillColor: '#FF3B30', fillOpacity: 1,
    }).addTo(mapInstance).bindPopup('Fin');

    // Marcadores de eventos (frenazos, acelerones, acelerador a fondo),
    // colocados en la posición GPS más cercana en el tiempo a cada evento
    const eventColors = { hardBrake: '#FF3B30', hardAccel: '#00FF41', highThrottle: '#FF9500' };
    for (const ev of events) {
      const closest = gps.reduce((best, r) =>
        Math.abs(r.timestamp - ev.timestamp) < Math.abs(best.timestamp - ev.timestamp) ? r : best, gps[0]);
      const meta = EventDetector.EVENT_LABELS[ev.type];
      L.circleMarker([closest.latitude, closest.longitude], {
        radius: 6, color: '#fff', weight: 1.5, fillColor: eventColors[ev.type] || '#888', fillOpacity: 0.95,
      }).addTo(mapInstance).bindPopup(`${meta ? meta.icon + ' ' + meta.label : ev.type}`);
    }

    // Encuadre automático para que se vea toda la ruta
    const bounds = L.latLngBounds(gps.map(p => [p.latitude, p.longitude]));
    mapInstance.fitBounds(bounds, { padding: [20, 20] });
  }

  /**
   * Interpola un color verde→amarillo→rojo según la velocidad,
   * relativa a la velocidad máxima alcanzada en el trayecto.
   */
  function speedToColor(speed, maxSpeed) {
    const ratio = Math.min(Math.max(speed / maxSpeed, 0), 1);
    if (ratio < 0.5) {
      // Verde → Amarillo
      const t = ratio / 0.5;
      return interpolateHex('#00FF41', '#FFD700', t);
    }
    // Amarillo → Rojo
    const t = (ratio - 0.5) / 0.5;
    return interpolateHex('#FFD700', '#FF3B30', t);
  }

  function interpolateHex(hexA, hexB, t) {
    const a = hexToRgb(hexA), b = hexToRgb(hexB);
    const r = Math.round(a.r + (b.r - a.r) * t);
    const g = Math.round(a.g + (b.g - a.g) * t);
    const bl = Math.round(a.b + (b.b - a.b) * t);
    return `rgb(${r},${g},${bl})`;
  }

  function hexToRgb(hex) {
    const n = parseInt(hex.replace('#', ''), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function destroyMap() {
    if (mapInstance) {
      mapInstance.remove();
      mapInstance = null;
    }
  }

  function getChartOpts() {
    return { responsive: true, maintainAspectRatio: true, aspectRatio: 2.2, interaction: { intersect: false, mode: 'index' }, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#080808', titleColor: '#FFF', bodyColor: '#FFF', borderColor: '#111', borderWidth: 1 } }, scales: { x: { ticks: { color: '#333', maxRotation: 0, maxTicksLimit: 6 }, grid: { color: '#111' } }, y: { ticks: { color: '#333' }, grid: { color: '#111' }, beginAtZero: true } } };
  }

  function createChart(id, labels, data, color, opts) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    chartInstances[id] = new Chart(canvas.getContext('2d'), { type: 'line', data: { labels, datasets: [{ data, borderColor: color, backgroundColor: color + '15', borderWidth: 2, fill: true, tension: 0.3, pointRadius: 0, pointHitRadius: 8 }] }, options: opts });
  }

  function showRenameModal(tripId) {
    const modal = document.getElementById('modal-rename');
    const input = document.getElementById('rename-input');
    modal.classList.remove('hidden');
    input.value = '';
    input.focus();
    const cleanup = () => { modal.classList.add('hidden'); document.getElementById('btn-rename-confirm').replaceWith(document.getElementById('btn-rename-confirm').cloneNode(true)); document.getElementById('btn-rename-cancel').replaceWith(document.getElementById('btn-rename-cancel').cloneNode(true)); };
    document.getElementById('btn-rename-confirm').addEventListener('click', async () => { const n = input.value.trim(); if (n) await TripStorage.updateTripName(tripId, n); cleanup(); render(); });
    document.getElementById('btn-rename-cancel').addEventListener('click', cleanup);
  }

  function showConfirm(title, msg, onConfirm) {
    const modal = document.getElementById('modal-confirm');
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = msg;
    modal.classList.remove('hidden');
    const cleanup = () => { modal.classList.add('hidden'); document.getElementById('btn-confirm-ok').replaceWith(document.getElementById('btn-confirm-ok').cloneNode(true)); document.getElementById('btn-confirm-cancel').replaceWith(document.getElementById('btn-confirm-cancel').cloneNode(true)); };
    document.getElementById('btn-confirm-ok').addEventListener('click', () => { cleanup(); onConfirm(); });
    document.getElementById('btn-confirm-cancel').addEventListener('click', cleanup);
  }

  function downsample(readings, max = 100) {
    if (readings.length <= max) return readings;
    const step = Math.ceil(readings.length / max);
    return readings.filter((_, i) => i % step === 0);
  }

  function destroyCharts() {
    for (const k of Object.keys(chartInstances)) { if (chartInstances[k]) { chartInstances[k].destroy(); delete chartInstances[k]; } }
  }

  function destroy() { destroyCharts(); destroyMap(); removeCompareFAB(); compareMode = false; selectedCompareIds.clear(); }

  return { render, destroy };
})();