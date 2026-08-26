/**
 * MaintenanceManager - Gestión de mantenimientos del vehículo
 * Usa IndexedDB para almacenar el historial de mantenimientos.
 */

const MaintenanceManager = (() => {
  const DB_NAME = 'telemdrive_maintenance';
  const DB_VERSION = 1;
  const STORE_NAME = 'maintenance';
  let dbInstance = null;

  // Tipos de mantenimiento con iconos
  const TYPES = {
    oil: { label: 'Cambio de aceite', icon: '🛢️', color: '#FFD700' },
    oil_filter: { label: 'Filtro de aceite', icon: '🔧', color: '#FFD700' },
    air_filter: { label: 'Filtro de aire', icon: '💨', color: '#87CEEB' },
    fuel_filter: { label: 'Filtro de combustible', icon: '⛽', color: '#FF6347' },
    cabin_filter: { label: 'Filtro de habitáculo', icon: '🌬️', color: '#98FB98' },
    brake_fluid: { label: 'Líquido de frenos', icon: '🔴', color: '#DC143C' },
    brake_pads_front: { label: 'Pastillas freno delanteras', icon: '🛑', color: '#FF4500' },
    brake_pads_rear: { label: 'Pastillas freno traseras', icon: '🛑', color: '#FF6347' },
    brake_discs: { label: 'Discos de freno', icon: '⚙️', color: '#808080' },
    tires: { label: 'Neumáticos', icon: '🔘', color: '#333' },
    timing_belt: { label: 'Correa de distribución', icon: '⛓️', color: '#4682B4' },
    spark_plugs: { label: 'Bujías', icon: '⚡', color: '#FFD700' },
    battery: { label: 'Batería', icon: '🔋', color: '#32CD32' },
    itv: { label: 'ITV', icon: '✅', color: '#00FF41' },
    inspection: { label: 'Revisión general', icon: '🔍', color: '#007AFF' },
    coolant: { label: 'Líquido refrigerante', icon: '❄️', color: '#00BFFF' },
    transmission: { label: 'Aceite de transmisión', icon: '⚙️', color: '#8B4513' },
    other: { label: 'Otro', icon: '📝', color: '#888' },
  };

  function openDB() {
    return new Promise((resolve, reject) => {
      if (dbInstance) { resolve(dbInstance); return; }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('km', 'km', { unique: false });
          store.createIndex('nextKm', 'nextKm', { unique: false });
          store.createIndex('nextDate', 'nextDate', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        dbInstance = event.target.result;
        resolve(dbInstance);
      };

      request.onerror = (event) => reject(event.target.error);
    });
  }

  async function add(record) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const entry = {
        type: record.type || 'other',
        date: record.date || Date.now(),
        km: record.km || 0,
        cost: record.cost || 0,
        notes: record.notes || '',
        workshop: record.workshop || '',
        nextKm: record.nextKm || null,      // km al que toca el próximo
        nextDate: record.nextDate || null,   // timestamp del próximo
        nextMonths: record.nextMonths || null,
        createdAt: Date.now(),
      };
      const request = store.add(entry);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function update(id, updates) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const record = getReq.result;
        if (record) {
          Object.assign(record, updates);
          store.put(record);
        }
        resolve();
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  async function remove(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function listAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const records = request.result.sort((a, b) => b.date - a.date);
        resolve(records);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function getByType(type) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('type');
      const request = index.getAll(IDBKeyRange.only(type));
      request.onsuccess = () => resolve(request.result.sort((a, b) => b.date - a.date));
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Devuelve los mantenimientos próximos (por km o por fecha).
   * @param {number} currentKm - Kilómetros actuales del vehículo
   * @param {number} kmWarning - Umbral de km para avisar (ej: 1000 km antes)
   * @param {number} daysWarning - Días de antelación para avisar por fecha
   */
  async function getUpcoming(currentKm, kmWarning = 1000, daysWarning = 30) {
    const all = await listAll();
    const now = Date.now();
    const warningMs = daysWarning * 24 * 60 * 60 * 1000;
    const upcoming = [];

    // Para cada tipo, tomar el último registro que tenga próximo programado
    const lastByType = {};
    for (const record of all) {
      if (!lastByType[record.type] || record.date > lastByType[record.type].date) {
        lastByType[record.type] = record;
      }
    }

    for (const [type, record] of Object.entries(lastByType)) {
      let status = 'ok'; // ok, warning, overdue
      let remainingKm = null;
      let remainingDays = null;

      // Por km
      if (record.nextKm && currentKm) {
        remainingKm = record.nextKm - currentKm;
        if (remainingKm <= 0) status = 'overdue';
        else if (remainingKm <= kmWarning) status = 'warning';
      }

      // Por fecha
      if (record.nextDate) {
        remainingDays = Math.ceil((record.nextDate - now) / (24 * 60 * 60 * 1000));
        if (remainingDays <= 0) status = 'overdue';
        else if (remainingDays <= daysWarning && status !== 'overdue') status = 'warning';
      }

      if (status !== 'ok' || record.nextKm || record.nextDate) {
        upcoming.push({
          id: record.id,
          type,
          typeInfo: TYPES[type] || TYPES.other,
          lastDate: record.date,
          lastKm: record.km,
          nextKm: record.nextKm,
          nextDate: record.nextDate,
          remainingKm,
          remainingDays,
          status,
        });
      }
    }

    // Ordenar: overdue primero, luego warning, luego ok
    const priority = { overdue: 0, warning: 1, ok: 2 };
    upcoming.sort((a, b) => priority[a.status] - priority[b.status]);

    return upcoming;
  }

  async function getStats() {
    const all = await listAll();
    let totalCost = 0;
    let thisYearCost = 0;
    const currentYear = new Date().getFullYear();
    const typeCounts = {};

    for (const r of all) {
      totalCost += r.cost || 0;
      if (new Date(r.date).getFullYear() === currentYear) {
        thisYearCost += r.cost || 0;
      }
      typeCounts[r.type] = (typeCounts[r.type] || 0) + 1;
    }

    return {
      totalRecords: all.length,
      totalCost: totalCost.toFixed(2),
      thisYearCost: thisYearCost.toFixed(2),
      typeCounts,
      lastMaintenance: all.length > 0 ? all[0] : null,
    };
  }

  async function exportAll() {
    const all = await listAll();
    return JSON.stringify({ vehicle: VehicleProfile.load(), maintenance: all }, null, 2);
  }

  return {
    TYPES,
    add, update, remove,
    listAll, getByType,
    getUpcoming, getStats,
    exportAll,
  };
})();
