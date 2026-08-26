/**
 * LocationTracker - GPS usando la API nativa del navegador.
 * 
 * Reemplaza react-native-geolocation-service de la versión React Native.
 * En web, navigator.geolocation.watchPosition es estándar y funciona
 * en todos los navegadores modernos (requiere HTTPS).
 */

const LocationTracker = (() => {
  let watchId = null;
  let lastPosition = null;

  /**
   * Solicita permiso de ubicación y devuelve si se concedió.
   */
  async function requestPermission() {
    try {
      if (!navigator.geolocation) {
        console.warn('Geolocation no disponible');
        return false;
      }

      // navigator.geolocation no tiene un método explícito de permisos,
      // pero getCurrentPosition dispara el prompt del navegador
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            lastPosition = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            };
            resolve(true);
          },
          (err) => {
            console.warn('Permiso GPS denegado:', err.message);
            resolve(false);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
    } catch {
      return false;
    }
  }

  /**
   * Empieza a rastrear la posición GPS en tiempo real.
   * @param {Function} onUpdate - Callback con {latitude, longitude}
   */
  function startWatching(onUpdate) {
    if (!navigator.geolocation) return;

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        lastPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        if (onUpdate) onUpdate(lastPosition);
      },
      (error) => {
        console.warn('Error GPS:', error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );
  }

  /**
   * Detiene el rastreo GPS.
   */
  function stopWatching() {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    lastPosition = null;
  }

  /**
   * Devuelve la última posición conocida (síncrono).
   */
  function getLastPosition() {
    return lastPosition;
  }

  return {
    requestPermission,
    startWatching,
    stopWatching,
    getLastPosition,
  };
})();
