/**
 * VehicleView - Vista de perfil del vehículo y mantenimientos.
 * 
 * Sub-vistas: profile (datos + próximos mantenimientos) | form (añadir mantenimiento)
 */

const VehicleView = (() => {
  let currentSubView = 'main'; // main | form | edit-profile
  let editingRecordId = null;

  async function render() {
    if (currentSubView === 'main') await renderMain();
    else if (currentSubView === 'form') await renderForm();
    else if (currentSubView === 'edit-profile') renderEditProfile();
  }

  // ================================================================
  //  VISTA PRINCIPAL
  // ================================================================

  async function renderMain() {
    const content = document.getElementById('app-content');
    const profile = VehicleProfile.load();
    const hasProfile = VehicleProfile.hasProfile();
    const stats = await MaintenanceManager.getStats();
    const upcoming = await MaintenanceManager.getUpcoming(profile.currentKm || 0);
    const allRecords = await MaintenanceManager.listAll();

    const overdueCount = upcoming.filter(u => u.status === 'overdue').length;
    const warningCount = upcoming.filter(u => u.status === 'warning').length;

    content.innerHTML = `
      <button class="btn-back" id="btn-back-vehicle">← VOLVER</button>

      <!-- PERFIL DEL VEHÍCULO -->
      <div class="vehicle-profile-card">
        ${hasProfile ? `
          <div class="vehicle-profile-header">
            <div class="vehicle-icon">🚗</div>
            <div class="vehicle-info">
              <div class="vehicle-name">${profile.brand} ${profile.model}</div>
              <div class="vehicle-subtitle">${[profile.year, profile.engine, profile.horsepower ? profile.horsepower + 'CV' : ''].filter(Boolean).join(' · ')}</div>
            </div>
            <button class="btn-edit-profile" id="btn-edit-profile">✎</button>
          </div>
          <div class="vehicle-stats-row">
            <div class="vehicle-stat">
              <div class="vehicle-stat-value">${(profile.currentKm || 0).toLocaleString()}</div>
              <div class="vehicle-stat-label">KM ACTUALES</div>
            </div>
            <div class="vehicle-stat">
              <div class="vehicle-stat-value">${profile.fuelType === 'diesel' ? 'DIÉSEL' : profile.fuelType === 'hibrido' ? 'HÍBRIDO' : profile.fuelType === 'electrico' ? 'ELÉCTRICO' : 'GASOLINA'}</div>
              <div class="vehicle-stat-label">COMBUSTIBLE</div>
            </div>
            ${profile.licensePlate ? `<div class="vehicle-stat"><div class="vehicle-stat-value">${profile.licensePlate}</div><div class="vehicle-stat-label">MATRÍCULA</div></div>` : ''}
          </div>
        ` : `
          <div class="vehicle-empty">
            <div class="vehicle-empty-icon">🚗</div>
            <div class="vehicle-empty-title">CONFIGURA TU VEHÍCULO</div>
            <div class="vehicle-empty-desc">Añade los datos de tu coche para registrar mantenimientos</div>
            <button class="btn-primary" id="btn-create-profile" style="margin-top:16px; width:auto; padding:12px 30px;">CONFIGURAR</button>
          </div>
        `}
      </div>

      <!-- ALERTA DE MANTENIMIENTOS PENDIENTES -->
      ${(overdueCount > 0 || warningCount > 0) ? `
        <div class="maintenance-alert ${overdueCount > 0 ? 'overdue' : 'warning'}">
          <span class="maintenance-alert-icon">${overdueCount > 0 ? '🔴' : '🟡'}</span>
          <span class="maintenance-alert-text">
            ${overdueCount > 0 ? `${overdueCount} mantenimiento${overdueCount > 1 ? 's' : ''} vencido${overdueCount > 1 ? 's' : ''}` : ''}
            ${overdueCount > 0 && warningCount > 0 ? ' · ' : ''}
            ${warningCount > 0 ? `${warningCount} próximo${warningCount > 1 ? 's' : ''}` : ''}
          </span>
        </div>
      ` : ''}

      <!-- PRÓXIMOS MANTENIMIENTOS -->
      ${upcoming.length > 0 ? `
        <div class="card">
          <div class="card-title">PRÓXIMOS MANTENIMIENTOS</div>
          ${upcoming.map(u => `
            <div class="upcoming-item ${u.status}">
              <div class="upcoming-icon">${u.typeInfo.icon}</div>
              <div class="upcoming-info">
                <div class="upcoming-name">${u.typeInfo.label}</div>
                <div class="upcoming-detail">
                  ${u.remainingKm != null ? `${u.remainingKm > 0 ? u.remainingKm.toLocaleString() + ' km restantes' : '⚠️ VENCIDO hace ' + Math.abs(u.remainingKm).toLocaleString() + ' km'}` : ''}
                  ${u.remainingKm != null && u.remainingDays != null ? ' · ' : ''}
                  ${u.remainingDays != null ? `${u.remainingDays > 0 ? u.remainingDays + ' días' : '⚠️ VENCIDO hace ' + Math.abs(u.remainingDays) + ' días'}` : ''}
                </div>
              </div>
              <div class="upcoming-status ${u.status}">
                ${u.status === 'overdue' ? 'VENCIDO' : u.status === 'warning' ? 'PRONTO' : 'OK'}
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <!-- ESTADÍSTICAS -->
      ${stats.totalRecords > 0 ? `
        <div class="maintenance-stats-row">
          <div class="maintenance-stat-card">
            <div class="maintenance-stat-value">${stats.totalRecords}</div>
            <div class="maintenance-stat-label">REGISTROS</div>
          </div>
          <div class="maintenance-stat-card">
            <div class="maintenance-stat-value">${stats.totalCost}€</div>
            <div class="maintenance-stat-label">GASTO TOTAL</div>
          </div>
          <div class="maintenance-stat-card">
            <div class="maintenance-stat-value">${stats.thisYearCost}€</div>
            <div class="maintenance-stat-label">ESTE AÑO</div>
          </div>
        </div>
      ` : ''}

      <!-- BOTÓN AÑADIR MANTENIMIENTO -->
      ${hasProfile ? `
        <button class="btn-add-maintenance" id="btn-add-maintenance">+ AÑADIR MANTENIMIENTO</button>
      ` : ''}

      <!-- HISTORIAL -->
      ${allRecords.length > 0 ? `
        <div class="card">
          <div class="card-title">HISTORIAL DE MANTENIMIENTO</div>
          ${allRecords.map(record => {
            const typeInfo = MaintenanceManager.TYPES[record.type] || MaintenanceManager.TYPES.other;
            const dateStr = new Date(record.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
            return `
              <div class="maintenance-record">
                <div class="maintenance-record-icon" style="color:${typeInfo.color}">${typeInfo.icon}</div>
                <div class="maintenance-record-info">
                  <div class="maintenance-record-title">${typeInfo.label}</div>
                  <div class="maintenance-record-meta">
                    ${dateStr}${record.km ? ' · ' + record.km.toLocaleString() + ' km' : ''}${record.cost ? ' · ' + record.cost + '€' : ''}
                  </div>
                  ${record.notes ? `<div class="maintenance-record-notes">${record.notes}</div>` : ''}
                  ${record.workshop ? `<div class="maintenance-record-workshop">🏪 ${record.workshop}</div>` : ''}
                </div>
                <button class="btn-delete-record" data-id="${record.id}" title="Eliminar">🗑</button>
              </div>
            `;
          }).join('')}
        </div>
      ` : (hasProfile ? '<div class="empty-state"><div class="empty-state-text" style="font-size:14px; letter-spacing:2px;">SIN REGISTROS</div></div>' : '')}

      <!-- Exportar -->
      ${allRecords.length > 0 ? `
        <button class="btn-export-compare" id="btn-export-maintenance">📥 EXPORTAR HISTORIAL (JSON)</button>
      ` : ''}
    `;

    // Listeners
    document.getElementById('btn-back-vehicle').addEventListener('click', () => App.navigateTo('dashboard'));

    const editProfileBtn = document.getElementById('btn-edit-profile');
    if (editProfileBtn) editProfileBtn.addEventListener('click', () => { currentSubView = 'edit-profile'; render(); });

    const createProfileBtn = document.getElementById('btn-create-profile');
    if (createProfileBtn) createProfileBtn.addEventListener('click', () => { currentSubView = 'edit-profile'; render(); });

    const addBtn = document.getElementById('btn-add-maintenance');
    if (addBtn) addBtn.addEventListener('click', () => { editingRecordId = null; currentSubView = 'form'; render(); });

    document.querySelectorAll('.btn-delete-record').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('¿Eliminar este registro de mantenimiento?')) {
          await MaintenanceManager.remove(parseInt(btn.dataset.id));
          render();
        }
      });
    });

    const exportBtn = document.getElementById('btn-export-maintenance');
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        const json = await MaintenanceManager.exportAll();
        const blob = new Blob([json], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'historial_mantenimiento.json';
        a.click();
      });
    }
  }

  // ================================================================
  //  EDITAR PERFIL
  // ================================================================

  function renderEditProfile() {
    const content = document.getElementById('app-content');
    const p = VehicleProfile.load();

    content.innerHTML = `
      <button class="btn-back" id="btn-back-edit">← VOLVER</button>
      <h2 class="section-detail-title">PERFIL DEL VEHÍCULO</h2>

      <div class="settings-card">
        <div class="form-group">
          <label class="form-label">MARCA</label>
          <input type="text" id="f-brand" class="form-input" value="${p.brand}" placeholder="Ej: Seat, BMW, Toyota..." />
        </div>
        <div class="form-group">
          <label class="form-label">MODELO</label>
          <input type="text" id="f-model" class="form-input" value="${p.model}" placeholder="Ej: León, Serie 3, Corolla..." />
        </div>
        <div class="form-row">
          <div class="form-group" style="flex:1;">
            <label class="form-label">AÑO</label>
            <input type="number" id="f-year" class="form-input" value="${p.year}" placeholder="2020" min="1980" max="2030" />
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">POTENCIA (CV)</label>
            <input type="number" id="f-hp" class="form-input" value="${p.horsepower}" placeholder="150" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">MOTOR</label>
          <input type="text" id="f-engine" class="form-input" value="${p.engine}" placeholder="Ej: 1.6 TDI, 2.0 TSI..." />
        </div>
        <div class="form-group">
          <label class="form-label">COMBUSTIBLE</label>
          <div class="settings-options-grid">
            ${fuelOption('gasolina', '⛽ Gasolina', p.fuelType)}
            ${fuelOption('diesel', '🛢️ Diésel', p.fuelType)}
            ${fuelOption('hibrido', '🔋 Híbrido', p.fuelType)}
            ${fuelOption('electrico', '⚡ Eléctrico', p.fuelType)}
          </div>
        </div>
        <div class="form-row">
          <div class="form-group" style="flex:1;">
            <label class="form-label">KM ACTUALES</label>
            <input type="number" id="f-km" class="form-input" value="${p.currentKm}" placeholder="85000" />
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">MATRÍCULA</label>
            <input type="text" id="f-plate" class="form-input" value="${p.licensePlate}" placeholder="1234 ABC" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">NOTAS</label>
          <textarea id="f-notes" class="form-input form-textarea" placeholder="Observaciones, extras, modificaciones...">${p.notes || ''}</textarea>
        </div>
      </div>

      <div style="display:flex; gap:10px; margin-top:16px;">
        <button class="btn-primary" id="btn-save-profile" style="flex:1;">GUARDAR</button>
        ${VehicleProfile.hasProfile() ? '<button class="btn-reset" id="btn-clear-profile" style="flex:0.5; margin-top:0;">BORRAR</button>' : ''}
      </div>
    `;

    document.getElementById('btn-back-edit').addEventListener('click', () => { currentSubView = 'main'; render(); });

    document.querySelectorAll('.settings-option-btn[data-key="fuelType"]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.settings-option-btn[data-key="fuelType"]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    document.getElementById('btn-save-profile').addEventListener('click', () => {
      const fuelBtn = document.querySelector('.settings-option-btn[data-key="fuelType"].active');
      const profile = {
        brand: document.getElementById('f-brand').value.trim(),
        model: document.getElementById('f-model').value.trim(),
        year: document.getElementById('f-year').value,
        engine: document.getElementById('f-engine').value.trim(),
        horsepower: document.getElementById('f-hp').value,
        fuelType: fuelBtn ? fuelBtn.dataset.value : 'gasolina',
        currentKm: parseInt(document.getElementById('f-km').value) || 0,
        licensePlate: document.getElementById('f-plate').value.trim().toUpperCase(),
        notes: document.getElementById('f-notes').value.trim(),
      };
      VehicleProfile.save(profile);
      currentSubView = 'main';
      render();
    });

    const clearBtn = document.getElementById('btn-clear-profile');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (confirm('¿Borrar todos los datos del vehículo?')) {
          VehicleProfile.clear();
          currentSubView = 'main';
          render();
        }
      });
    }
  }

  function fuelOption(value, label, current) {
    return `<button class="settings-option-btn ${current === value ? 'active' : ''}" data-key="fuelType" data-value="${value}">${label}</button>`;
  }

  // ================================================================
  //  FORMULARIO AÑADIR MANTENIMIENTO
  // ================================================================

  async function renderForm() {
    const content = document.getElementById('app-content');
    const profile = VehicleProfile.load();
    const types = MaintenanceManager.TYPES;

    content.innerHTML = `
      <button class="btn-back" id="btn-back-form">← VOLVER</button>
      <h2 class="section-detail-title">AÑADIR MANTENIMIENTO</h2>

      <div class="settings-card">
        <div class="form-group">
          <label class="form-label">TIPO</label>
          <div class="maintenance-type-grid">
            ${Object.entries(types).map(([key, info]) => `
              <button class="maintenance-type-btn" data-type="${key}">
                <span class="maintenance-type-icon">${info.icon}</span>
                <span class="maintenance-type-label">${info.label}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="form-row">
          <div class="form-group" style="flex:1;">
            <label class="form-label">FECHA</label>
            <input type="date" id="m-date" class="form-input" value="${new Date().toISOString().split('T')[0]}" />
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">KM</label>
            <input type="number" id="m-km" class="form-input" value="${profile.currentKm || ''}" placeholder="85000" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">COSTE (€)</label>
          <input type="number" id="m-cost" class="form-input" placeholder="0.00" step="0.01" />
        </div>

        <div class="form-group">
          <label class="form-label">TALLER</label>
          <input type="text" id="m-workshop" class="form-input" placeholder="Nombre del taller..." />
        </div>

        <div class="form-group">
          <label class="form-label">NOTAS</label>
          <textarea id="m-notes" class="form-input form-textarea" placeholder="Detalles, referencia de piezas, etc."></textarea>
        </div>
      </div>

      <div class="settings-card">
        <div class="card-title">PROGRAMAR PRÓXIMO</div>
        <p style="font-size:12px; color:#666; margin-bottom:12px;">Opcional: indica cuándo tocará el siguiente mantenimiento</p>
        <div class="form-row">
          <div class="form-group" style="flex:1;">
            <label class="form-label">KM PRÓXIMO</label>
            <input type="number" id="m-next-km" class="form-input" placeholder="${(profile.currentKm || 0) + 15000}" />
          </div>
          <div class="form-group" style="flex:1;">
            <label class="form-label">MESES</label>
            <input type="number" id="m-next-months" class="form-input" placeholder="12" />
          </div>
        </div>
      </div>

      <button class="btn-primary" id="btn-save-maintenance" style="margin-top:16px;">GUARDAR MANTENIMIENTO</button>
    `;

    document.getElementById('btn-back-form').addEventListener('click', () => { currentSubView = 'main'; render(); });

    let selectedType = 'oil';
    document.querySelectorAll('.maintenance-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.maintenance-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedType = btn.dataset.type;
      });
    });
    // Seleccionar primero por defecto
    document.querySelector('.maintenance-type-btn')?.classList.add('active');

    document.getElementById('btn-save-maintenance').addEventListener('click', async () => {
      const dateStr = document.getElementById('m-date').value;
      const date = dateStr ? new Date(dateStr).getTime() : Date.now();
      const km = parseInt(document.getElementById('m-km').value) || 0;
      const nextMonths = parseInt(document.getElementById('m-next-months').value) || null;

      const record = {
        type: selectedType,
        date,
        km,
        cost: parseFloat(document.getElementById('m-cost').value) || 0,
        workshop: document.getElementById('m-workshop').value.trim(),
        notes: document.getElementById('m-notes').value.trim(),
        nextKm: parseInt(document.getElementById('m-next-km').value) || null,
        nextMonths,
        nextDate: nextMonths ? date + (nextMonths * 30 * 24 * 60 * 60 * 1000) : null,
      };

      await MaintenanceManager.add(record);

      // Actualizar km del vehículo si es mayor
      if (km > (profile.currentKm || 0)) {
        VehicleProfile.updateKm(km);
      }

      currentSubView = 'main';
      render();
    });
  }

  function destroy() { currentSubView = 'main'; }

  return { render, destroy };
})();
