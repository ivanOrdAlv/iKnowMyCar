# 🚗 iKnowMyCar

<p align="center">
  <img src="logo.png" alt="iKnowMyCar Logo" width="250">
</p>

<p align="center">
  <strong>Conecta. Monitoriza. Conoce tu coche.</strong>
</p>

<p align="center">
  Aplicación para monitorizar, analizar y registrar los datos de tu vehículo mediante un adaptador <strong>ELM327 OBD-II</strong> conectado por Bluetooth.
</p>

---

## 📖 Sobre el proyecto

**iKnowMyCar** es una aplicación diseñada para convertir tu móvil en una auténtica herramienta de diagnóstico, monitorización y telemetría para tu coche.

La aplicación se conecta mediante **Bluetooth a un adaptador ELM327 conectado al puerto OBD-II del vehículo**, permitiendo consultar una gran cantidad de información proporcionada por la centralita del coche.

Además de la monitorización en tiempo real, iKnowMyCar incorpora diferentes herramientas para analizar tus trayectos, medir prestaciones del vehículo y consultar el estado y mantenimiento del coche.

---

## ✨ Funcionalidades

### 🔌 Conexión OBD-II

Conecta tu smartphone con el vehículo mediante un adaptador **ELM327 Bluetooth**.

Para comenzar la conexión:

1. Conecta el adaptador ELM327 al puerto **OBD-II** del vehículo.
2. Activa el Bluetooth del móvil.
3. Abre **iKnowMyCar**.
4. Pulsa el botón **"Conectar"**.
5. Una vez establecida la conexión, la aplicación comenzará a recibir los datos disponibles del vehículo.

> ℹ️ La información disponible puede variar dependiendo del vehículo, su centralita y los datos que soporte el adaptador ELM327.

---

### 📊 Monitorización de datos

Consulta en tiempo real diferentes parámetros de tu vehículo.

La aplicación permite consultar una amplia variedad de datos proporcionados por la ECU, pudiendo utilizar esta información para conocer el comportamiento del coche durante la conducción.

---

### 📡 Telemetría

El sistema de **Telemetría** permite visualizar y analizar los datos del vehículo mientras está conectado al ELM327.

Esta sección está pensada para obtener una visión detallada del comportamiento del coche durante la conducción.

---

### 🏎️ Dashboard

El **Dashboard** transforma el móvil en un cuadro de instrumentos inspirado en los volantes de los monoplazas de **Fórmula 1**.

Permite visualizar de forma rápida y clara diferentes parámetros del vehículo mientras conduces.

Diseñado para ofrecer una experiencia más deportiva y centrada en la información importante del vehículo.

---

### 🛣️ Registro de rutas

Puedes **registrar las rutas que realizas con tu vehículo**.

Durante una ruta, la aplicación puede almacenar información relacionada con el trayecto y los datos obtenidos del vehículo.

Posteriormente puedes consultar tus rutas desde el apartado de **Historial**.

---

### 📚 Historial

El apartado **Historial** permite consultar las rutas y registros realizados anteriormente.

De esta manera puedes conservar un registro de tus desplazamientos y consultar la información recopilada en cada sesión.

---

### 🌀 Sensor de fuerzas G

iKnowMyCar incorpora un **sensor de fuerzas G** para visualizar las fuerzas que experimenta el vehículo durante la conducción.

Esta función puede utilizarse para analizar:

* Aceleraciones.
* Frenadas.
* Curvas.
* Cambios de dirección.
* Comportamiento dinámico del vehículo.

---

### ⏱️ Cronómetro de aceleración

Mide el tiempo necesario para alcanzar determinadas velocidades.

Esta herramienta está pensada para realizar mediciones de aceleración y comparar diferentes pruebas realizadas con el vehículo.

---

### 🏁 Modo 1/4 de Milla

El **modo 1/4 de Milla** está diseñado para realizar pruebas de aceleración sobre una distancia de **402 metros aproximadamente**.

Permite registrar los resultados de las pruebas y utilizar los datos obtenidos para comparar diferentes lanzamientos.

> ⚠️ Las pruebas de aceleración deben realizarse únicamente en lugares cerrados al tráfico y destinados a este tipo de actividades.

---

### 🚘 Registro de vehículos

Puedes **registrar tu coche dentro de la aplicación**.

Esto permite asociar la información y los registros obtenidos al vehículo correspondiente.

La aplicación está pensada para poder gestionar la información del vehículo de una manera sencilla y organizada.

---

### 🔧 Mantenimiento

Consulta y registra información relacionada con el **mantenimiento de tu vehículo**.

Este apartado permite tener controlados diferentes elementos y tareas de mantenimiento para ayudarte a mantener tu coche al día.

---

### 🛠️ Diagnóstico y borrado de errores

iKnowMyCar dispone de un apartado específico para consultar los **errores registrados por la centralita del vehículo**.

Desde esta sección puedes:

* Consultar códigos de error.
* Revisar información relacionada con los errores detectados.
* Borrar los errores almacenados cuando sea apropiado.

> ⚠️ Borrar un código de error no soluciona necesariamente la avería que lo provoca. Si el problema persiste, el código puede volver a aparecer. Para problemas mecánicos o de seguridad, consulta a un profesional.

---

### 📱 HUD — Head-Up Display

La aplicación incluye un **modo HUD** que permite utilizar el teléfono como una pantalla de información proyectada.

Este modo está pensado para mostrar información esencial del vehículo de forma sencilla mientras conduces.

El objetivo es poder consultar determinados datos sin tener que mirar constantemente el cuadro de instrumentos convencional.

> ⚠️ El teléfono debe colocarse de forma segura y sin bloquear la visibilidad de la carretera.

---

## 🧩 Estructura de la aplicación

La aplicación se divide en diferentes apartados:

| Sección               | Función                               |
| --------------------- | ------------------------------------- |
| 🔌 **Conectar**       | Conexión con el adaptador ELM327      |
| 📊 **Monitorización** | Consulta de datos del vehículo        |
| 📡 **Telemetría**     | Visualización de datos en tiempo real |
| 🏎️ **Dashboard**     | Cuadro de instrumentos estilo F1      |
| 🛣️ **Rutas**         | Registro de trayectos                 |
| 📚 **Historial**      | Consulta de rutas anteriores          |
| 🌀 **Fuerzas G**      | Monitorización de fuerzas G           |
| ⏱️ **Aceleración**    | Cronómetro de aceleración             |
| 🏁 **1/4 de Milla**   | Pruebas de aceleración de 402 m       |
| 🚘 **Mi coche**       | Registro del vehículo                 |
| 🔧 **Mantenimiento**  | Control del mantenimiento             |
| 🛠️ **Diagnóstico**   | Consulta y borrado de errores         |
| 📱 **HUD**            | Modo Head-Up Display                  |

---

## 🔄 Flujo de conexión

```text
┌─────────────────────┐
│      iKnowMyCar     │
│      📱 Móvil       │
└──────────┬──────────┘
           │
        Bluetooth
           │
           ▼
┌─────────────────────┐
│       ELM327        │
│    Adaptador OBD-II │
└──────────┬──────────┘
           │
         OBD-II
           │
           ▼
┌─────────────────────┐
│       ECU / PCM     │
│    Centralita coche │
└─────────────────────┘
```

---

## 🚗 ¿Cómo utilizar iKnowMyCar?

### 1. Conecta el ELM327

Introduce el adaptador ELM327 en el puerto **OBD-II** de tu vehículo.

### 2. Activa Bluetooth

Activa Bluetooth en tu smartphone y asegúrate de que el adaptador está disponible.

### 3. Abre iKnowMyCar

Inicia la aplicación.

### 4. Pulsa "Conectar"

Desde la aplicación, pulsa el botón:

**🔵 CONECTAR**

La aplicación intentará establecer comunicación con el ELM327.

### 5. Comprueba la conexión

Cuando la conexión se haya establecido, podrás comenzar a consultar los datos disponibles de tu vehículo.

### 6. Utiliza las herramientas

Una vez conectado podrás acceder a funciones como:

**Telemetría · Dashboard · Fuerzas G · Rutas · Aceleración · 1/4 de Milla · Diagnóstico · HUD**

---

## 🏗️ Concepto de la aplicación

iKnowMyCar busca reunir en una única aplicación diferentes herramientas relacionadas con el automóvil:

```text
                    iKnowMyCar
                         │
        ┌────────────────┼────────────────┐
        │                │                │
     CONDUCCIÓN       TELEMETRÍA      DIAGNÓSTICO
        │                │                │
   ┌────┴────┐      ┌────┴────┐      ┌────┴────┐
   │         │      │         │      │         │
 Rutas     HUD   Dashboard  Datos  Errores  Mantenimiento
   │
   ├── Fuerzas G
   ├── Aceleración
   └── 1/4 Milla
```

---

## 🎯 Objetivo

El objetivo de **iKnowMyCar** es ofrecer una experiencia completa para los usuarios que quieren conocer mejor su vehículo y aprovechar los datos disponibles a través de la conexión OBD-II.

La aplicación combina:

* 📊 Monitorización.
* 🏎️ Telemetría.
* 🔧 Diagnóstico.
* 🛣️ Registro de rutas.
* 📈 Análisis de conducción.
* ⏱️ Pruebas de aceleración.
* 🚘 Gestión del vehículo.
* 📱 Herramientas de visualización.

Todo ello desde un único lugar.

---

## ⚠️ Aviso

iKnowMyCar es una herramienta de monitorización y diagnóstico.

La información disponible depende del vehículo, de su ECU y de las capacidades del adaptador ELM327 utilizado.

**No utilices las funciones de la aplicación de forma que puedan distraerte durante la conducción.** Las pruebas de aceleración y 1/4 de milla deben realizarse exclusivamente en zonas privadas o circuitos habilitados y nunca en vías públicas.

---

## 📌 Estado del proyecto

🚧 **En desarrollo**

iKnowMyCar continúa evolucionando con nuevas funciones, mejoras de interfaz, compatibilidad con vehículos y herramientas de análisis.

---

## 👨‍💻 Autor

**Iván Ordóñez Álvarez**

Proyecto desarrollado como una aplicación de monitorización y telemetría para vehículos mediante OBD-II y Bluetooth.

---

## 📄 Licencia

Este proyecto puede incluir componentes y dependencias de terceros sujetos a sus respectivas licencias.

Consulta la documentación del proyecto para obtener información sobre las licencias utilizadas.

---

<p align="center">
  <strong>iKnowMyCar</strong>
  <br>
  <em>Conecta. Monitoriza. Conoce tu coche.</em>
</p>
