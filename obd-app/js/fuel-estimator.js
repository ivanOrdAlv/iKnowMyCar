/**
 * FuelEstimator - Estimación de consumo a partir del MAF.
 */

const FuelEstimator = (() => {
  const AFR_STOICH = 14.7;
  const FUEL_DENSITY = 730; // g/L gasolina

  function estimateFuelRateLH(maf) {
    if (!maf || maf <= 0) return 0;
    return (maf / AFR_STOICH / FUEL_DENSITY) * 3600;
  }

  function calculateTotalFuelUsed(readings) {
    let totalLiters = 0;
    for (let i = 1; i < readings.length; i++) {
      const prev = readings[i - 1];
      const curr = readings[i];
      const dt = (curr.timestamp - prev.timestamp) / 1000;
      if (dt <= 0 || dt > 5) continue;
      const avgRate = ((prev.fuel_rate || 0) + (curr.fuel_rate || 0)) / 2;
      totalLiters += (avgRate / 3600) * dt;
    }
    return totalLiters;
  }

  function calculateTotalDistanceKm(readings) {
    let totalKm = 0;
    for (let i = 1; i < readings.length; i++) {
      const prev = readings[i - 1];
      const curr = readings[i];
      const dt = (curr.timestamp - prev.timestamp) / 1000;
      if (dt <= 0 || dt > 5) continue;
      const avgSpeed = ((prev.speed || 0) + (curr.speed || 0)) / 2;
      totalKm += (avgSpeed / 3600) * dt;
    }
    return totalKm;
  }

  return { estimateFuelRateLH, calculateTotalFuelUsed, calculateTotalDistanceKm };
})();
