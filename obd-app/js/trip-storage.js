/**
 * TripStorage - Almacenamiento de trayectos usando IndexedDB.
 * 
 * Reemplaza SQLite de la versión React Native.
 * IndexedDB es ideal para grandes volúmenes de datos (miles de lecturas por trayecto).
 */

const TripStorage = (() => {
  const DB_NAME = 'obd_trips';
  const DB_VERSION = 1;
  let dbInstance = null;

  function openDB() {
    return new Promise((resolve, reject) => {
      if (dbInstance) {
        resolve(dbInstance);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Object store para trayectos
        if (!db.objectStoreNames.contains('trips')) {
          const tripStore = db.createObjectStore('trips', { keyPath: 'id', autoIncrement: true });
          tripStore.createIndex('started_at', 'started_at', { unique: false });
        }

        // Object store para lecturas
        if (!db.objectStoreNames.contains('readings')) {
          const readStore = db.createObjectStore('readings', { keyPath: 'id', autoIncrement: true });
          readStore.createIndex('trip_id', 'trip_id', { unique: false });
          readStore.createIndex('trip_timestamp', ['trip_id', 'timestamp'], { unique: false });
        }

        // Object store para eventos
        if (!db.objectStoreNames.contains('events')) {
          const eventStore = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
          eventStore.createIndex('trip_id', 'trip_id', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        dbInstance = event.target.result;
        resolve(dbInstance);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  // ---- Trayectos ----

  async function startTrip(name = null) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('trips', 'readwrite');
      const store = tx.objectStore('trips');
      const trip = {
        started_at: Date.now(),
        ended_at: null,
        name: name,
      };
      const request = store.add(trip);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function endTrip(tripId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('trips', 'readwrite');
      const store = tx.objectStore('trips');
      const getReq = store.get(tripId);
      getReq.onsuccess = () => {
        const trip = getReq.result;
        if (trip) {
          trip.ended_at = Date.now();
          store.put(trip);
        }
        resolve();
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  async function listTrips() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('trips', 'readonly');
      const store = tx.objectStore('trips');
      const request = store.getAll();
      request.onsuccess = () => {
        // Ordenar por fecha descendente
        const trips = request.result.sort((a, b) => b.started_at - a.started_at);
        resolve(trips);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function getTrip(tripId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('trips', 'readonly');
      const store = tx.objectStore('trips');
      const request = store.get(tripId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function deleteTrip(tripId) {
    const db = await openDB();
    
    // Borrar lecturas del trayecto
    await new Promise((resolve, reject) => {
      const tx = db.transaction('readings', 'readwrite');
      const store = tx.objectStore('readings');
      const index = store.index('trip_id');
      const request = index.openCursor(IDBKeyRange.only(tripId));
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });

    // Borrar eventos del trayecto
    await new Promise((resolve, reject) => {
      const tx = db.transaction('events', 'readwrite');
      const store = tx.objectStore('events');
      const index = store.index('trip_id');
      const request = index.openCursor(IDBKeyRange.only(tripId));
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });

    // Borrar el trayecto
    await new Promise((resolve, reject) => {
      const tx = db.transaction('trips', 'readwrite');
      const store = tx.objectStore('trips');
      const request = store.delete(tripId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function updateTripName(tripId, name) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('trips', 'readwrite');
      const store = tx.objectStore('trips');
      const getReq = store.get(tripId);
      getReq.onsuccess = () => {
        const trip = getReq.result;
        if (trip) {
          trip.name = name;
          store.put(trip);
        }
        resolve();
      };
      getReq.onerror = () => reject(getReq.error);
    });
  }

  // ---- Lecturas ----

  async function saveReading(tripId, data) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('readings', 'readwrite');
      const store = tx.objectStore('readings');
      const reading = {
        trip_id: tripId,
        timestamp: Date.now(),
        rpm: data.rpm ?? null,
        speed: data.speed ?? null,
        coolant_temp: data.coolantTemp ?? null,
        throttle: data.throttle ?? null,
        maf: data.maf ?? null,
        fuel_rate: data.fuelRate ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
      };
      const request = store.add(reading);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function getReadingsForTrip(tripId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('readings', 'readonly');
      const store = tx.objectStore('readings');
      const index = store.index('trip_id');
      const request = index.getAll(IDBKeyRange.only(tripId));
      request.onsuccess = () => {
        // Ordenar por timestamp ascendente
        const readings = request.result.sort((a, b) => a.timestamp - b.timestamp);
        resolve(readings);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function getTripStats(tripId) {
    const readings = await getReadingsForTrip(tripId);
    if (readings.length === 0) return null;

    let maxSpeed = 0, sumSpeed = 0, countSpeed = 0;
    let maxRpm = 0;
    let sumFuelRate = 0, countFuelRate = 0;

    for (const r of readings) {
      if (r.speed != null) {
        maxSpeed = Math.max(maxSpeed, r.speed);
        sumSpeed += r.speed;
        countSpeed++;
      }
      if (r.rpm != null) {
        maxRpm = Math.max(maxRpm, r.rpm);
      }
      if (r.fuel_rate != null) {
        sumFuelRate += r.fuel_rate;
        countFuelRate++;
      }
    }

    return {
      maxSpeed,
      avgSpeed: countSpeed > 0 ? sumSpeed / countSpeed : 0,
      maxRpm,
      avgFuelRate: countFuelRate > 0 ? sumFuelRate / countFuelRate : 0,
      readingCount: readings.length,
    };
  }

  // ---- Eventos ----

  async function saveEvents(tripId, events) {
    const db = await openDB();
    const tx = db.transaction('events', 'readwrite');
    const store = tx.objectStore('events');

    for (const event of events) {
      store.add({
        trip_id: tripId,
        timestamp: event.timestamp,
        type: event.type,
        value: event.value,
      });
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getEventsForTrip(tripId) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('events', 'readonly');
      const store = tx.objectStore('events');
      const index = store.index('trip_id');
      const request = index.getAll(IDBKeyRange.only(tripId));
      request.onsuccess = () => {
        const events = request.result.sort((a, b) => a.timestamp - b.timestamp);
        resolve(events);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ---- Exportación ----

  /**
   * Exporta un trayecto completo como objeto JSON.
   */
  async function exportTripJSON(tripId) {
    const trip = await getTrip(tripId);
    const readings = await getReadingsForTrip(tripId);
    const events = await getEventsForTrip(tripId);
    return { trip, readings, events };
  }

  /**
   * Exporta las lecturas de un trayecto como CSV.
   */
  async function exportTripCSV(tripId) {
    const readings = await getReadingsForTrip(tripId);
    const headers = ['timestamp', 'datetime', 'rpm', 'speed', 'coolant_temp', 'throttle', 'maf', 'fuel_rate', 'latitude', 'longitude'];
    const rows = readings.map(r => [
      r.timestamp,
      new Date(r.timestamp).toISOString(),
      r.rpm ?? '',
      r.speed ?? '',
      r.coolant_temp ?? '',
      r.throttle ?? '',
      r.maf ?? '',
      r.fuel_rate ?? '',
      r.latitude ?? '',
      r.longitude ?? '',
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  return {
    startTrip,
    endTrip,
    listTrips,
    getTrip,
    deleteTrip,
    updateTripName,
    saveReading,
    getReadingsForTrip,
    getTripStats,
    saveEvents,
    getEventsForTrip,
    exportTripJSON,
    exportTripCSV,
  };
})();
