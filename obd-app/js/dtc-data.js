/**
 * DTCData - Base de datos de códigos de error comunes con descripciones en español.
 */

const DTCData = (() => {
  const DTC_INFO = {
    // Tren motriz (Powertrain)
    'P0100': { title: 'Circuito del Sensor MAF', desc: 'Problema general en el circuito del sensor de flujo másico de aire. Puede causar pérdida de potencia.' },
    'P0101': { title: 'Flujo de Masa de Aire', desc: 'Problema de rendimiento del sensor MAF. Puede causar tirones o humo negro.' },
    'P0102': { title: 'Entrada Baja MAF', desc: 'Señal del sensor MAF por debajo del rango esperado. Posible cable dañado o sensor sucio.' },
    'P0103': { title: 'Entrada Alta MAF', desc: 'Señal del sensor MAF por encima del rango esperado.' },
    'P0110': { title: 'Circuito Sensor IAT', desc: 'Problema en el circuito del sensor de temperatura de aire de admisión.' },
    'P0113': { title: 'Temperatura Aire Admisión', desc: 'Entrada alta en el circuito IAT. El coche puede consumir más combustible.' },
    'P0115': { title: 'Circuito Sensor Refrigerante', desc: 'Fallo en el sensor de temperatura del refrigerante del motor.' },
    'P0117': { title: 'Entrada Baja Temp. Refrigerante', desc: 'Señal del sensor de refrigerante por debajo del rango. Posible sensor defectuoso.' },
    'P0118': { title: 'Entrada Alta Temp. Refrigerante', desc: 'Señal del sensor de refrigerante por encima del rango.' },
    'P0120': { title: 'Circuito TPS', desc: 'Fallo en el sensor de posición del cuerpo del acelerador.' },
    'P0121': { title: 'Rango TPS', desc: 'El rendimiento del sensor TPS está fuera del rango esperado.' },
    'P0125': { title: 'Temp. Insuficiente Lazo Cerrado', desc: 'El motor no alcanza la temperatura de trabajo para entrar en lazo cerrado.' },
    'P0128': { title: 'Termostato del Refrigerante', desc: 'La temperatura del refrigerante está por debajo del umbral del termostato. Posible termostato abierto.' },
    'P0130': { title: 'Sensor O2 (B1S1)', desc: 'Fallo en el circuito del sensor de oxígeno delantero, Banco 1.' },
    'P0131': { title: 'Sensor O2 Bajo (B1S1)', desc: 'Voltaje bajo en el sensor de oxígeno delantero. Mezcla pobre.' },
    'P0132': { title: 'Sensor O2 Alto (B1S1)', desc: 'Voltaje alto en el sensor de oxígeno delantero. Mezcla rica.' },
    'P0133': { title: 'Sensor de Oxígeno (O2)', desc: 'Respuesta lenta en el Banco 1 Sensor 1. Afecta a la mezcla aire-combustible.' },
    'P0134': { title: 'Sensor O2 Sin Actividad (B1S1)', desc: 'El sensor de oxígeno delantero no muestra actividad.' },
    'P0135': { title: 'Calentador Sensor O2 (B1S1)', desc: 'Fallo en el circuito del calentador del sensor de oxígeno delantero.' },
    'P0171': { title: 'Mezcla Pobre', desc: 'Demasiado aire y poco combustible en el Banco 1. Posible fuga de vacío o sensor MAF sucio.' },
    'P0172': { title: 'Mezcla Rica', desc: 'Demasiado combustible en el Banco 1. Posible inyector con fuga o regulador de presión.' },
    'P0174': { title: 'Mezcla Pobre (Banco 2)', desc: 'Demasiado aire en el Banco 2.' },
    'P0175': { title: 'Mezcla Rica (Banco 2)', desc: 'Demasiado combustible en el Banco 2.' },
    'P0200': { title: 'Circuito Inyector', desc: 'Fallo general en el circuito de los inyectores de combustible.' },
    'P0201': { title: 'Inyector Cilindro 1', desc: 'Fallo en el circuito del inyector del cilindro 1.' },
    'P0202': { title: 'Inyector Cilindro 2', desc: 'Fallo en el circuito del inyector del cilindro 2.' },
    'P0203': { title: 'Inyector Cilindro 3', desc: 'Fallo en el circuito del inyector del cilindro 3.' },
    'P0204': { title: 'Inyector Cilindro 4', desc: 'Fallo en el circuito del inyector del cilindro 4.' },
    'P0230': { title: 'Bomba de Combustible', desc: 'Fallo en el circuito primario de la bomba de combustible.' },
    'P0300': { title: 'Fallo de Encendido', desc: 'Fallo de encendido aleatorio detectado. Revisa bujías, bobinas y cables.' },
    'P0301': { title: 'Fallo Encendido Cil. 1', desc: 'Fallo de encendido específico en el cilindro 1.' },
    'P0302': { title: 'Fallo Encendido Cil. 2', desc: 'Fallo de encendido específico en el cilindro 2.' },
    'P0303': { title: 'Fallo Encendido Cil. 3', desc: 'Fallo de encendido específico en el cilindro 3.' },
    'P0304': { title: 'Fallo Encendido Cil. 4', desc: 'Fallo de encendido específico en el cilindro 4.' },
    'P0325': { title: 'Sensor de Detonación', desc: 'Fallo en el circuito del sensor de detonación (knock sensor).' },
    'P0335': { title: 'Sensor Posición Cigüeñal', desc: 'Fallo en el sensor de posición del cigüeñal. El motor podría no arrancar.' },
    'P0340': { title: 'Sensor Posición Árbol de Levas', desc: 'Fallo en el sensor de posición del árbol de levas.' },
    'P0351': { title: 'Bobina Encendido A', desc: 'Fallo en el circuito de la bobina de encendido del cilindro 1.' },
    'P0352': { title: 'Bobina Encendido B', desc: 'Fallo en el circuito de la bobina de encendido del cilindro 2.' },
    'P0400': { title: 'Flujo EGR', desc: 'Fallo general en el sistema de recirculación de gases de escape.' },
    'P0401': { title: 'Flujo Insuficiente EGR', desc: 'El flujo del sistema EGR es insuficiente. Posible válvula obstruida.' },
    'P0402': { title: 'Flujo Excesivo EGR', desc: 'El flujo del sistema EGR es excesivo.' },
    'P0420': { title: 'Sistema de Catalizador', desc: 'Eficiencia del catalizador por debajo del umbral. El catalizador podría estar obstruido o dañado.' },
    'P0430': { title: 'Catalizador (Banco 2)', desc: 'Eficiencia del catalizador del Banco 2 por debajo del umbral.' },
    'P0440': { title: 'Sistema EVAP', desc: 'Fallo general en el sistema de control de emisiones evaporativas.' },
    'P0442': { title: 'Fuga Pequeña EVAP', desc: 'Se ha detectado una fuga pequeña en el sistema EVAP. Revisa el tapón del depósito.' },
    'P0455': { title: 'Fuga Grande EVAP', desc: 'Se ha detectado una fuga grande en el sistema EVAP.' },
    'P0456': { title: 'Fuga Muy Pequeña EVAP', desc: 'Fuga muy pequeña en el sistema EVAP. Posible tapón del combustible flojo.' },
    'P0500': { title: 'Sensor de Velocidad', desc: 'Fallo en el sensor de velocidad del vehículo (VSS). El velocímetro podría no funcionar.' },
    'P0505': { title: 'Control de Ralentí', desc: 'Fallo en el sistema de control de ralentí del motor.' },
    'P0507': { title: 'Ralentí Alto', desc: 'Las RPM del ralentí son más altas de lo esperado.' },
    'P0562': { title: 'Voltaje Bajo del Sistema', desc: 'El voltaje del sistema eléctrico es demasiado bajo.' },
    'P0600': { title: 'Enlace de Comunicación', desc: 'Fallo en el enlace de comunicación serie con un módulo.' },
    'P0601': { title: 'Error de Memoria ECU', desc: 'Error de checksum de la memoria interna del ECM/PCM.' },
    'P0700': { title: 'Control de Transmisión', desc: 'Fallo general en el sistema de control de la transmisión.' },
    'P0715': { title: 'Sensor Velocidad Turbina', desc: 'Fallo en el sensor de velocidad de entrada de la transmisión.' },
    'P0720': { title: 'Sensor Velocidad Salida', desc: 'Fallo en el sensor de velocidad de salida de la transmisión.' },
    'P0740': { title: 'Solenoide Convertidor Par', desc: 'Fallo en el circuito del solenoide del convertidor de par.' },
    'P0750': { title: 'Solenoide Cambio A', desc: 'Fallo en el solenoide de cambio A de la transmisión.' },
    'P1101': { title: 'Rango MAF', desc: 'Rango/rendimiento del sensor MAF fuera de especificaciones.' },
    'P2004': { title: 'Colector Admisión Abierto', desc: 'El colector de admisión de longitud variable está atascado en posición abierta.' },
    'P2096': { title: 'Post-Catalizador Pobre', desc: 'La mezcla post-catalizador es demasiado pobre en el Banco 1.' },
    'P2097': { title: 'Post-Catalizador Rico', desc: 'La mezcla post-catalizador es demasiado rica en el Banco 1.' },
    'P2135': { title: 'Correlación TPS/Pedal', desc: 'La correlación entre el sensor TPS y el pedal del acelerador es incorrecta.' },

    // Chasis (Chassis)
    'C0035': { title: 'Sensor Velocidad Rueda', desc: 'Fallo en el sensor ABS delantero izquierdo.' },
    'C0040': { title: 'Sensor Velocidad Rueda DD', desc: 'Fallo en el sensor ABS delantero derecho.' },

    // Carrocería (Body)
    'B0001': { title: 'Airbag Conductor', desc: 'Problema en el circuito de control del airbag frontal del conductor.' },
    'B0020': { title: 'Airbag Lateral', desc: 'Fallo en el circuito del airbag lateral.' },

    // Red (Network)
    'U0100': { title: 'Comunicación Perdida con ECU', desc: 'Fallo en el bus de datos con el módulo de control del motor.' },
    'U0121': { title: 'Comunicación con ABS', desc: 'Pérdida de comunicación con el módulo ABS.' },
    'U0140': { title: 'Comunicación con BCM', desc: 'Pérdida de comunicación con el módulo de carrocería.' },
  };

  function getDTCDescription(code) {
    return DTC_INFO[code] || {
      title: 'Código Desconocido',
      desc: 'No tenemos una descripción específica para este código. Se recomienda consultar el manual técnico o buscar en internet para más detalles.'
    };
  }

  return { DTC_INFO, getDTCDescription };
})();
