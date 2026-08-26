/**
 * EventDetector - Detecta eventos de conducción.
 * Tipos: hardBrake, hardAccel, highThrottle
 */

const EventDetector = (() => {
  const HARD_BRAKE_THRESHOLD = 15;
  const HARD_ACCEL_THRESHOLD = 15;
  const HIGH_THROTTLE_PERCENT = 85;
  const HIGH_THROTTLE_DURATION = 2;

  const EVENT_LABELS = {
    hardBrake: { icon: '🔴', label: 'Frenazo brusco' },
    hardAccel: { icon: '🟢', label: 'Acelerón fuerte' },
    highThrottle: { icon: '🟠', label: 'A fondo' },
  };

  function detectEvents(readings) {
    if (readings.length < 2) return [];
    const events = [];
    let highThrottleStart = null;

    for (let i = 1; i < readings.length; i++) {
      const prev = readings[i - 1];
      const curr = readings[i];

      if (prev.speed != null && curr.speed != null) {
        const speedDrop = prev.speed - curr.speed;
        if (speedDrop >= HARD_BRAKE_THRESHOLD) {
          events.push({ timestamp: curr.timestamp, type: 'hardBrake', value: speedDrop });
        }
        const speedRise = curr.speed - prev.speed;
        if (speedRise >= HARD_ACCEL_THRESHOLD) {
          events.push({ timestamp: curr.timestamp, type: 'hardAccel', value: speedRise });
        }
      }

      if (curr.throttle != null) {
        if (curr.throttle >= HIGH_THROTTLE_PERCENT) {
          if (!highThrottleStart) highThrottleStart = curr;
        } else {
          if (highThrottleStart) {
            const duration = (curr.timestamp - highThrottleStart.timestamp) / 1000;
            if (duration >= HIGH_THROTTLE_DURATION) {
              events.push({ timestamp: highThrottleStart.timestamp, type: 'highThrottle', value: Math.round(duration) });
            }
            highThrottleStart = null;
          }
        }
      }
    }

    if (highThrottleStart && readings.length > 0) {
      const last = readings[readings.length - 1];
      const duration = (last.timestamp - highThrottleStart.timestamp) / 1000;
      if (duration >= HIGH_THROTTLE_DURATION) {
        events.push({ timestamp: highThrottleStart.timestamp, type: 'highThrottle', value: Math.round(duration) });
      }
    }

    return events;
  }

  function summarizeEvents(events) {
    return {
      hardBrakes: events.filter(e => e.type === 'hardBrake').length,
      hardAccels: events.filter(e => e.type === 'hardAccel').length,
      highThrottleMoments: events.filter(e => e.type === 'highThrottle').length,
    };
  }

  return { detectEvents, summarizeEvents, EVENT_LABELS };
})();
