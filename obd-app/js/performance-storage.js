/**
 * PerformanceStorage - Almacenamiento de mejores tiempos de rendimiento.
 */

const PerformanceStorage = (() => {
  const STORAGE_KEY = 'telemdrive_performance';

  function load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : { records: [] };
    } catch { return { records: [] }; }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function addRecord(record) {
    const data = load();
    data.records.push({
      ...record,
      id: Date.now(),
      createdAt: new Date().toISOString(),
    });
    // Mantener solo los 50 mejores
    data.records.sort((a, b) => a.time - b.time);
    if (data.records.length > 50) data.records = data.records.slice(0, 50);
    save(data);
    return data.records;
  }

  function getRecords(type = null) {
    const data = load();
    if (type) return data.records.filter(r => r.type === type);
    return data.records;
  }

  function getBest(type) {
    const records = getRecords(type);
    return records.length > 0 ? records[0] : null;
  }

  function deleteRecord(id) {
    const data = load();
    data.records = data.records.filter(r => r.id !== id);
    save(data);
  }

  function clearAll() {
    save({ records: [] });
  }

  return { addRecord, getRecords, getBest, deleteRecord, clearAll };
})();
