/**
 * VehicleProfile - Gestión del perfil del vehículo
 */

const VehicleProfile = (() => {
  const STORAGE_KEY = 'vehicle_profile';

  const DEFAULT_PROFILE = {
    brand: '',
    model: '',
    year: '',
    engine: '',
    fuelType: 'gasolina', // gasolina, diesel, hibrido, electrico
    horsepower: '',
    currentKm: 0,
    licensePlate: '',
    vin: '',
    purchaseDate: '',
    notes: ''
  };

  function load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? { ...DEFAULT_PROFILE, ...JSON.parse(data) } : { ...DEFAULT_PROFILE };
    } catch (e) {
      console.error('Error cargando perfil:', e);
      return { ...DEFAULT_PROFILE };
    }
  }

  function save(profile) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      return true;
    } catch (e) {
      console.error('Error guardando perfil:', e);
      return false;
    }
  }

  function update(updates) {
    const current = load();
    const updated = { ...current, ...updates };
    return save(updated);
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function hasProfile() {
    const profile = load();
    return profile.brand || profile.model;
  }

  function getDisplayName() {
    const profile = load();
    if (profile.brand && profile.model) {
      return `${profile.brand} ${profile.model}${profile.year ? ` (${profile.year})` : ''}`;
    }
    return null;
  }

  function updateKm(newKm) {
    if (newKm && newKm > 0) {
      update({ currentKm: newKm });
    }
  }

  return {
    load,
    save,
    update,
    clear,
    hasProfile,
    getDisplayName,
    updateKm,
    DEFAULT_PROFILE
  };
})();
