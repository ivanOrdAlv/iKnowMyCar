/**
 * OBDParser - Funciones para convertir respuestas hex OBD-II a valores legibles.
 * Separado del OBDManager para mayor limpieza y reutilización.
 */

const OBDParser = (() => {

  function parseResponse(raw) {
    if (!raw) return [];
    const clean = raw.replace(/\s/g, '').replace(/>/g, '').trim();
    const bytes = [];
    for (let i = 0; i < clean.length; i += 2) {
      bytes.push(parseInt(clean.substr(i, 2), 16));
    }
    return bytes;
  }

  function parseRPM(raw) {
    const b = parseResponse(raw);
    if (b.length < 4) return 0;
    return ((b[2] * 256) + b[3]) / 4;
  }

  function parseSpeed(raw) {
    const b = parseResponse(raw);
    if (b.length < 3) return 0;
    return b[2];
  }

  function parseCoolantTemp(raw) {
    const b = parseResponse(raw);
    if (b.length < 3) return 0;
    return b[2] - 40;
  }

  function parseThrottle(raw) {
    const b = parseResponse(raw);
    if (b.length < 3) return 0;
    return b[2] / 2.55;
  }

  function parseMAF(raw) {
    const b = parseResponse(raw);
    if (b.length < 4) return 0;
    return ((b[2] * 256) + b[3]) / 100;
  }

  function parseEngineLoad(raw) {
    const b = parseResponse(raw);
    if (b.length < 3) return 0;
    return (b[2] * 100) / 255;
  }

  function parseIntakeTemp(raw) {
    const b = parseResponse(raw);
    if (b.length < 3) return 0;
    return b[2] - 40;
  }

  function parseVoltage(raw) {
    if (!raw) return 0;
    // AT RV devuelve algo como "12.6V" o "12.6"
    const match = raw.match(/[0-9.]+/);
    return match ? parseFloat(match[0]) : 0;
  }

  function parseAmbientTemp(raw) {
    const b = parseResponse(raw);
    if (b.length < 3) return 0;
    return b[2] - 40;
  }

  function parseFuelLevel(raw) {
    const b = parseResponse(raw);
    if (b.length < 3) return 0;
    return (b[2] * 100) / 255;
  }

  function parseTimingAdvance(raw) {
    const b = parseResponse(raw);
    if (b.length < 3) return 0;
    return (b[2] / 2) - 64;
  }

  function parseRuntime(raw) {
    const b = parseResponse(raw);
    if (b.length < 4) return 0;
    return (b[2] * 256) + b[3];
  }

  /**
   * Parsea códigos DTC de la respuesta del modo 03/07.
   */
  function parseDTCs(raw) {
    const b = parseResponse(raw);
    if (b.length < 3 || (b[0] !== 0x43 && b[0] !== 0x47)) return [];

    const codes = [];
    for (let i = 1; i < b.length - 1; i += 2) {
      const b1 = b[i];
      const b2 = b[i + 1];
      if (b1 === 0 && b2 === 0) continue;

      let type = '';
      const firstDigit = (b1 >> 6) & 0x03;
      switch (firstDigit) {
        case 0: type = 'P'; break;
        case 1: type = 'C'; break;
        case 2: type = 'B'; break;
        case 3: type = 'U'; break;
      }

      const code = type +
        ((b1 >> 4) & 0x03).toString() +
        (b1 & 0x0F).toString(16).toUpperCase() +
        ((b2 >> 4) & 0x0F).toString(16).toUpperCase() +
        (b2 & 0x0F).toString(16).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  return {
    parseResponse,
    parseRPM,
    parseSpeed,
    parseCoolantTemp,
    parseThrottle,
    parseMAF,
    parseEngineLoad,
    parseIntakeTemp,
    parseVoltage,
    parseAmbientTemp,
    parseFuelLevel,
    parseTimingAdvance,
    parseRuntime,
    parseDTCs,
  };
})();
