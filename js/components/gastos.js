/**
 * @file gastos.js
 * @description Gastos (Expenses) section component for the AT&T Benefits Dashboard.
 * Provides budget tracking, expense registration, history, and totals.
 * Depends on: window.DOM, window.AppStore, window.I18N, window.RAW
 * Exposes window.GastosComponent as a global module.
 * Zero external dependencies - loaded via script tag.
 */

window.GastosComponent = (() => {
  'use strict';

  // ── Constants ────────────────────────────────────────────

  var MONTH_NAMES_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  var MONTH_NAMES_EN = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  var RUBRO_NAMES = ['Gastronomia', 'Compras'];
  var RUBRO_ICONS = ['\uD83C\uDF54', '\uD83D\uDED2']; // burger, cart
  var RUBRO_CLASSES = ['gastro', 'compras'];

  /**
   * Categories from RAW.c mapped to rubros via RAW.r
   * RAW.r[i] = 0 means Gastronomia, 1 means Compras
   */

  // ── State ────────────────────────────────────────────────

  var _container = null;
  var _currentYear = new Date().getFullYear();
  var _currentMonth = new Date().getMonth() + 1; // 1-12
  var _selectedFormRubro = 0; // 0=Gastro, 1=Compras
  var _filterRubro = -1; // -1=all, 0=gastro, 1=compras
  var _confirmDeleteId = null;
  var _cleanups = [];
  var _acTimer = null;

  // ── Helpers ──────────────────────────────────────────────

  function t(key) {
    return window.I18N ? window.I18N.t(key) : key;
  }

  function fmt(n) {
    return window.DOM ? window.DOM.formatARS(n) : '$ ' + n;
  }

  function esc(s) {
    return window.DOM ? window.DOM.escapeHtml(s) : s;
  }

  function getMonthName(month) {
    var lang = window.I18N ? window.I18N.getLanguage() : 'es';
    var names = lang === 'en' ? MONTH_NAMES_EN : MONTH_NAMES_ES;
    return names[month - 1] || '';
  }

  function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }

  function getDaysElapsed(year, month) {
    var now = new Date();
    if (now.getFullYear() === year && now.getMonth() + 1 === month) {
      return now.getDate();
    }
    if (now.getFullYear() > year || (now.getFullYear() === year && now.getMonth() + 1 > month)) {
      return getDaysInMonth(year, month);
    }
    return 0;
  }

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    var parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  /**
   * Get categories filtered by rubro index.
   * RAW.r is an array where index = category index, value = 0 (gastro) or 1 (compras)
   */
  function getCategoriesForRubro(rubroIdx) {
    if (!window.RAW || !window.RAW.c || !window.RAW.r) return [];
    var result = [];
    for (var i = 0; i < window.RAW.c.length; i++) {
      if (window.RAW.r[i] === rubroIdx) {
        result.push({ idx: i, name: window.RAW.c[i] });
      }
    }
    return result;
  }

  /**
   * Get the rubro index (0 or 1) for a category index.
   */
  function getRubroForCategory(catIdx) {
    if (!window.RAW || !window.RAW.r) return 0;
    return window.RAW.r[catIdx] || 0;
  }

  function searchCommerces(query) {
    var q = query.toLowerCase();
    var results = [];
    var seen = {};
    // Custom commerces first (user-added)
    var custom = window.AppStore.get('customCommerces') || [];
    for (var k = 0; k < custom.length && results.length < 8; k++) {
      if (!seen[custom[k]] && custom[k].toLowerCase().indexOf(q) >= 0) {
        seen[custom[k]] = true;
        results.push(custom[k]);
      }
    }
    var d = window.RAW ? window.RAW.d : [];
    // Starts-with pass
    for (var i = 0; i < d.length && results.length < 8; i++) {
      var n = d[i][0];
      if (!seen[n] && n.toLowerCase().indexOf(q) === 0) {
        seen[n] = true;
        results.push(n);
      }
    }
    // Contains pass
    if (results.length < 8) {
      for (var j = 0; j < d.length && results.length < 8; j++) {
        var n2 = d[j][0];
        if (!seen[n2] && n2.toLowerCase().indexOf(q) > 0) {
          seen[n2] = true;
          results.push(n2);
        }
      }
    }
    return results;
  }

  function openAddCommerceModal(prefill) {
    closeAddCommerceModal();
    var overlay = document.createElement('div');
    overlay.className = 'gastos__modal-overlay';
    overlay.id = 'gastos-modal-overlay';
    overlay.innerHTML =
      '<div class="gastos__modal">' +
        '<div class="gastos__modal-title">Agregar Comercio</div>' +
        '<div class="gastos__field">' +
          '<label class="gastos__label" for="gastos-modal-name">Nombre del comercio</label>' +
          '<input class="gastos__input" type="text" id="gastos-modal-name" value="' + esc(prefill || '') + '" placeholder="Ej: McDonald\'s" autocomplete="off">' +
        '</div>' +
        '<div class="gastos__modal-actions">' +
          '<button type="button" class="gastos__modal-cancel" id="gastos-modal-cancel">Cancelar</button>' +
          '<button type="button" class="gastos__modal-save" id="gastos-modal-save">Guardar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    var nameEl = document.getElementById('gastos-modal-name');
    if (nameEl) { nameEl.focus(); nameEl.select(); }
    document.getElementById('gastos-modal-cancel').addEventListener('click', closeAddCommerceModal);
    document.getElementById('gastos-modal-save').addEventListener('click', function () {
      var name = (document.getElementById('gastos-modal-name').value || '').trim();
      if (!name) { document.getElementById('gastos-modal-name').focus(); return; }
      var custom = window.AppStore.get('customCommerces') || [];
      if (custom.indexOf(name) === -1) { custom.unshift(name); window.AppStore.set('customCommerces', custom); }
      var commerceEl = window.DOM.qs('#gastos-commerce', _container);
      if (commerceEl) { commerceEl.value = name; }
      closeAddCommerceModal();
      window.DOM.toast('\u2713 ' + name + ' guardado', 'success');
    });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeAddCommerceModal(); });
    var _mk = function (e) { if (e.key === 'Escape') closeAddCommerceModal(); };
    document.addEventListener('keydown', _mk);
    overlay._mk = _mk;
    if (nameEl) {
      nameEl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); document.getElementById('gastos-modal-save').click(); }
      });
    }
  }

  function closeAddCommerceModal() {
    var overlay = document.getElementById('gastos-modal-overlay');
    if (overlay) {
      if (overlay._mk) document.removeEventListener('keydown', overlay._mk);
      overlay.parentNode.removeChild(overlay);
    }
  }

  // ── Data Access ──────────────────────────────────────────

  function getExpenses() {
    return window.AppStore.getMonthExpenses(_currentYear, _currentMonth);
  }

  function getSpent() {
    return window.AppStore.getMonthlySpent(_currentYear, _currentMonth);
  }

  function getBudget() {
    return window.AppStore.get('monthlyBudget') || 210000;
  }

  function getRemaining() {
    return window.AppStore.getRemainingBudget(_currentYear, _currentMonth);
  }

  // ── Render ───────────────────────────────────────────────

  function render() {
    if (!_container) return;

    var spent = getSpent();
    var budget = getBudget();
    var remaining = budget - spent;
    var pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
    var daysElapsed = getDaysElapsed(_currentYear, _currentMonth);
    var daysInMonth = getDaysInMonth(_currentYear, _currentMonth);
    var avgPerDay = daysElapsed > 0 ? spent / daysElapsed : 0;
    var projection = daysElapsed > 0 ? (spent / daysElapsed) * daysInMonth : 0;

    var barClass = pct < 70 ? 'green' : (pct < 90 ? 'yellow' : 'red');

    var expenses = getExpenses();
    var filtered = _filterRubro === -1
      ? expenses
      : expenses.filter(function (e) { return e.rubro === _filterRubro; });

    // Sort newest first
    filtered.sort(function (a, b) {
      if (a.date !== b.date) return a.date > b.date ? -1 : 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    // Rubro totals
    var gastroTotal = 0;
    var comprasTotal = 0;
    for (var i = 0; i < expenses.length; i++) {
      if (expenses[i].rubro === 0) gastroTotal += expenses[i].amount || 0;
      else comprasTotal += expenses[i].amount || 0;
    }
    var totalAll = gastroTotal + comprasTotal;
    var gastroPct = totalAll > 0 ? (gastroTotal / totalAll) * 100 : 0;
    var comprasPct = totalAll > 0 ? (comprasTotal / totalAll) * 100 : 0;

    // Filter totals for display
    var filteredTotal = 0;
    for (var f = 0; f < filtered.length; f++) {
      filteredTotal += filtered[f].amount || 0;
    }

    // Build categories for form
    var formCategories = getCategoriesForRubro(_selectedFormRubro);

    var html = '<div class="gastos">';

    // ── 1. Budget Tracker ──────────────────────────
    html += '<div class="gastos__card gastos__budget">';
    html += renderMonthSelector();
    html += '<div class="gastos__progress-wrap">';
    html += '  <div class="gastos__progress-labels">';
    html += '    <span class="gastos__progress-spent">' + fmt(spent) + '</span>';
    html += '    <span class="gastos__progress-total">de ' + fmt(budget) + '</span>';
    html += '  </div>';
    html += '  <div class="gastos__progress-bar">';
    html += '    <div class="gastos__progress-fill gastos__progress-fill--' + barClass + '"';
    html += '         style="width:' + pct.toFixed(1) + '%"></div>';
    html += '  </div>';
    html += '</div>';

    html += '<div class="gastos__stats-row">';
    html += renderStat(fmt(spent), t('gastado'));
    html += renderStat(fmt(remaining), t('restante'));
    html += renderStat(fmt(Math.round(avgPerDay)), t('promedio_dia'));
    html += renderStat(fmt(Math.round(projection)), 'Proy. mes');
    html += '</div>';
    html += '</div>'; // end budget card

    // ── 2. Expense Form ────────────────────────────
    html += '<div class="gastos__card">';
    html += '<div class="gastos__card-title">' + esc('Registrar Gasto') + '</div>';
    html += '<form class="gastos__form" id="gastos-form" autocomplete="off">';

    html += '<div class="gastos__form-row">';
    // Comercio
    html += '<div class="gastos__field">';
    html += '  <label class="gastos__label" for="gastos-commerce">' + t('comercio') + '</label>';
    html += '  <div class="gastos__ac-wrap">';
    html += '    <input class="gastos__input" type="text" id="gastos-commerce"';
    html += '           placeholder="Nombre del comercio" autocomplete="off" required>';
    html += '    <div class="gastos__ac-panel" id="gastos-ac-panel" hidden></div>';
    html += '  </div>';
    html += '</div>';
    // Monto
    html += '<div class="gastos__field">';
    html += '  <label class="gastos__label" for="gastos-amount">' + t('monto') + '</label>';
    html += '  <div class="gastos__input-group">';
    html += '    <span class="gastos__input-prefix">$</span>';
    html += '    <input class="gastos__input" type="text" inputmode="numeric" id="gastos-amount"';
    html += '           placeholder="0" required>';
    html += '  </div>';
    html += '</div>';
    html += '</div>';

    // Rubro pills
    html += '<div class="gastos__field">';
    html += '  <label class="gastos__label">' + t('rubro') + '</label>';
    html += '  <div class="gastos__pills">';
    html += '    <button type="button" class="gastos__pill gastos__pill--gastro' +
      (_selectedFormRubro === 0 ? ' gastos__pill--active' : '') +
      '" data-form-rubro="0">' + t('gastronomia') + '</button>';
    html += '    <button type="button" class="gastos__pill gastos__pill--compras' +
      (_selectedFormRubro === 1 ? ' gastos__pill--active' : '') +
      '" data-form-rubro="1">' + t('compras') + '</button>';
    html += '  </div>';
    html += '</div>';

    // Categoria dropdown
    html += '<div class="gastos__form-row">';
    html += '<div class="gastos__field">';
    html += '  <label class="gastos__label" for="gastos-category">' + t('categorias') + '</label>';
    html += '  <select class="gastos__select" id="gastos-category" required>';
    html += '    <option value="">-- Seleccionar --</option>';
    for (var c = 0; c < formCategories.length; c++) {
      html += '<option value="' + formCategories[c].idx + '">' + esc(formCategories[c].name) + '</option>';
    }
    html += '  </select>';
    html += '</div>';
    // Fecha
    html += '<div class="gastos__field">';
    html += '  <label class="gastos__label" for="gastos-date">' + t('fecha') + '</label>';
    html += '  <input class="gastos__input" type="date" id="gastos-date" value="' + todayStr() + '" required>';
    html += '</div>';
    html += '</div>';

    html += '<button type="submit" class="gastos__submit">Registrar Gasto</button>';
    html += '</form>';
    html += '</div>'; // end form card

    // ── 3+4. Expense History (with integrated filter pills) ──
    html += '<div class="gastos__card">';
    html += '<div class="gastos__card-title">';
    html += esc(t('historial'));
    html += '<div class="gastos__filter-pills">';
    html += '<button class="gastos__pill gastos__pill--todos' +
      (_filterRubro === -1 ? ' gastos__pill--active' : '') +
      '" data-filter-rubro="-1">' + t('todos') + '</button>';
    html += '<button class="gastos__pill gastos__pill--gastro' +
      (_filterRubro === 0 ? ' gastos__pill--active' : '') +
      '" data-filter-rubro="0">' + t('gastronomia') + '</button>';
    html += '<button class="gastos__pill gastos__pill--compras' +
      (_filterRubro === 1 ? ' gastos__pill--active' : '') +
      '" data-filter-rubro="1">' + t('compras') + '</button>';
    html += '</div>';
    html += '<span class="gastos__filter-total">' + fmt(filteredTotal) + '</span>';
    html += '<span class="gastos__count">' + filtered.length + ' ' + t('resultados') + '</span>';
    html += '</div>';

    if (filtered.length === 0) {
      html += '<div class="gastos__empty">';
      html += '  <div class="gastos__empty-icon">\uD83D\uDCCB</div>'; // clipboard
      html += '  <div class="gastos__empty-text">';
      html += 'No hay gastos registrados este mes. Usa el formulario para agregar uno.';
      html += '  </div>';
      html += '</div>';
    } else {
      html += '<div class="gastos__list">';
      for (var j = 0; j < filtered.length; j++) {
        html += renderExpenseItem(filtered[j]);
      }
      html += '</div>';
    }
    html += '</div>'; // end history card

    // ── 5. Totals Summary ──────────────────────────
    html += '<div class="gastos__card">';
    html += '<div class="gastos__card-title">Desglose por rubro</div>';
    html += '<div class="gastos__totals">';

    // Gastro bar
    html += '<div class="gastos__totals-row">';
    html += '  <span class="gastos__totals-label">' + t('gastronomia') + '</span>';
    html += '  <div class="gastos__totals-bar-wrap">';
    html += '    <div class="gastos__totals-bar gastos__totals-bar--gastro"';
    html += '         style="width:' + (totalAll > 0 ? gastroPct.toFixed(1) : 0) + '%">';
    if (gastroPct > 15) {
      html += '      <span class="gastos__totals-bar-text">' + Math.round(gastroPct) + '%</span>';
    }
    html += '    </div>';
    html += '  </div>';
    html += '  <span class="gastos__totals-amount">' + fmt(gastroTotal) + '</span>';
    html += '  <span class="gastos__totals-pct">' + Math.round(gastroPct) + '%</span>';
    html += '</div>';

    // Compras bar
    html += '<div class="gastos__totals-row">';
    html += '  <span class="gastos__totals-label">' + t('compras') + '</span>';
    html += '  <div class="gastos__totals-bar-wrap">';
    html += '    <div class="gastos__totals-bar gastos__totals-bar--compras"';
    html += '         style="width:' + (totalAll > 0 ? comprasPct.toFixed(1) : 0) + '%">';
    if (comprasPct > 15) {
      html += '      <span class="gastos__totals-bar-text">' + Math.round(comprasPct) + '%</span>';
    }
    html += '    </div>';
    html += '  </div>';
    html += '  <span class="gastos__totals-amount">' + fmt(comprasTotal) + '</span>';
    html += '  <span class="gastos__totals-pct">' + Math.round(comprasPct) + '%</span>';
    html += '</div>';

    // Extra stats removed — already shown in budget card KPIs

    html += '</div>'; // end totals
    html += '</div>'; // end totals card

    html += '</div>'; // end gastos wrapper

    _container.innerHTML = html;
    _bindInputHandlers();
  }

  function _bindInputHandlers() {
    // Amount formatter — re-attached after every render
    var amountEl = window.DOM.qs('#gastos-amount', _container);
    if (amountEl) {
      amountEl.addEventListener('input', function (e) {
        var raw = e.target.value.replace(/\./g, '').replace(/\D/g, '');
        e.target.value = raw ? raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
      });
    }
    // Commerce autocomplete — re-attached after every render
    var commerceEl = window.DOM.qs('#gastos-commerce', _container);
    var acPanel = window.DOM.qs('#gastos-ac-panel', _container);
    if (!commerceEl || !acPanel) return;

    var showPanel = function (names) {
      if (!names.length) { acPanel.hidden = true; return; }
      var h = '';
      for (var i = 0; i < names.length; i++) {
        h += '<button type="button" class="gastos__ac-item" data-ac-name="' + esc(names[i]) + '">' + esc(names[i]) + '</button>';
      }
      h += '<button type="button" class="gastos__ac-item gastos__ac-item--add" data-ac-add="1">+ Agregar nuevo comercio</button>';
      acPanel.innerHTML = h;
      acPanel.hidden = false;
    };

    commerceEl.addEventListener('input', function (e) {
      clearTimeout(_acTimer);
      var q = e.target.value.trim();
      if (q.length < 2) { acPanel.hidden = true; return; }
      _acTimer = setTimeout(function () { showPanel(searchCommerces(q)); }, 150);
    });

    commerceEl.addEventListener('blur', function () {
      setTimeout(function () { acPanel.hidden = true; }, 200);
    });

    commerceEl.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') acPanel.hidden = true;
    });

    acPanel.addEventListener('mousedown', function (e) { e.preventDefault(); });

    acPanel.addEventListener('click', function (e) {
      var item = e.target.closest('[data-ac-name]');
      if (item) { commerceEl.value = item.getAttribute('data-ac-name'); acPanel.hidden = true; return; }
      if (e.target.closest('[data-ac-add]')) {
        acPanel.hidden = true;
        openAddCommerceModal(commerceEl.value.trim());
      }
    });
  }

  function renderMonthSelector() {
    var label = getMonthName(_currentMonth) + ' ' + _currentYear;
    var html = '<div class="gastos__month-selector">';
    html += '<button class="gastos__month-btn" data-month-nav="prev" aria-label="Mes anterior">';
    html += '\u2039'; // left angle
    html += '</button>';
    html += '<span class="gastos__month-label">' + esc(label) + '</span>';
    html += '<button class="gastos__month-btn" data-month-nav="next" aria-label="Mes siguiente">';
    html += '\u203A'; // right angle
    html += '</button>';
    html += '</div>';
    return html;
  }

  function renderStat(value, label) {
    var html = '<div class="gastos__stat">';
    html += '<span class="gastos__stat-value">' + value + '</span>';
    html += '<span class="gastos__stat-label">' + esc(label) + '</span>';
    html += '</div>';
    return html;
  }

  function renderExpenseItem(expense) {
    var rubroIdx = typeof expense.rubro === 'number' ? expense.rubro : 0;
    var rubroClass = RUBRO_CLASSES[rubroIdx] || 'gastro';
    var icon = RUBRO_ICONS[rubroIdx] || '\uD83C\uDF54';
    var catName = '';
    if (window.RAW && window.RAW.c && typeof expense.category === 'number') {
      catName = window.RAW.c[expense.category] || '';
    }
    var isConfirm = _confirmDeleteId === expense.id;

    var html = '<div class="gastos__item' + (isConfirm ? ' gastos__item--confirm' : '') +
      '" data-expense-id="' + esc(expense.id) + '">';

    html += '<div class="gastos__item-icon gastos__item-icon--' + rubroClass + '">' + icon + '</div>';

    html += '<div class="gastos__item-info">';
    html += '  <div class="gastos__item-name">' + esc(expense.commerce || '') + '</div>';
    html += '  <div class="gastos__item-meta">';
    html += '    <span class="gastos__item-tag gastos__item-tag--' + rubroClass + '">';
    html += (rubroIdx === 0 ? t('gastronomia') : t('compras'));
    html += '    </span>';
    if (catName) {
      html += '  <span class="gastos__item-category">' + esc(catName) + '</span>';
    }
    html += '    <span class="gastos__item-date">' + formatDateDisplay(expense.date) + '</span>';
    html += '  </div>';
    html += '</div>';

    html += '<span class="gastos__item-amount">' + fmt(expense.amount || 0) + '</span>';

    if (isConfirm) {
      html += '<span class="gastos__item-confirm-text">\u00bfEliminar?</span>';
      html += '<button class="gastos__item-confirm-yes" data-confirm-delete="' + esc(expense.id) + '">S\u00ed</button>';
      html += '<button class="gastos__item-confirm-no" data-cancel-delete="1">No</button>';
    } else {
      html += '<button class="gastos__item-delete" data-delete-id="' + esc(expense.id) + '" aria-label="' + t('eliminar') + '">';
      html += '  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
      html += '    <polyline points="3 6 5 6 21 6"/>';
      html += '    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>';
      html += '  </svg>';
      html += '</button>';
    }

    html += '</div>';
    return html;
  }

  // ── Event Handlers ───────────────────────────────────────

  function bindEvents() {
    if (!_container) return;

    // Month navigation
    _cleanups.push(
      window.DOM.delegate(_container, '[data-month-nav]', 'click', function (_e, el) {
        var dir = el.getAttribute('data-month-nav');
        if (dir === 'prev') {
          _currentMonth--;
          if (_currentMonth < 1) { _currentMonth = 12; _currentYear--; }
        } else {
          _currentMonth++;
          if (_currentMonth > 12) { _currentMonth = 1; _currentYear++; }
        }
        _confirmDeleteId = null;
        render();
      })
    );

    // Form rubro toggle
    _cleanups.push(
      window.DOM.delegate(_container, '[data-form-rubro]', 'click', function (_e, el) {
        _selectedFormRubro = parseInt(el.getAttribute('data-form-rubro'), 10);
        render();
      })
    );

    // Filter rubro
    _cleanups.push(
      window.DOM.delegate(_container, '[data-filter-rubro]', 'click', function (_e, el) {
        _filterRubro = parseInt(el.getAttribute('data-filter-rubro'), 10);
        _confirmDeleteId = null;
        render();
      })
    );

    // Delete expense - step 1: show confirm
    _cleanups.push(
      window.DOM.delegate(_container, '[data-delete-id]', 'click', function (_e, el) {
        _confirmDeleteId = el.getAttribute('data-delete-id');
        render();
      })
    );

    // Delete expense - step 2: confirm yes
    _cleanups.push(
      window.DOM.delegate(_container, '[data-confirm-delete]', 'click', function (_e, el) {
        var id = el.getAttribute('data-confirm-delete');
        window.AppStore.removeExpense(id);
        _confirmDeleteId = null;
        window.DOM.toast('Gasto eliminado', 'success');
        // render will be triggered by store subscription
      })
    );

    // Delete expense - cancel
    _cleanups.push(
      window.DOM.delegate(_container, '[data-cancel-delete]', 'click', function () {
        _confirmDeleteId = null;
        render();
      })
    );

    // Form submit
    _cleanups.push(
      window.DOM.delegate(_container, '#gastos-form', 'submit', function (e) {
        e.preventDefault();
        handleFormSubmit();
      })
    );

  }

  function handleFormSubmit() {
    var commerceEl = window.DOM.qs('#gastos-commerce', _container);
    var amountEl = window.DOM.qs('#gastos-amount', _container);
    var categoryEl = window.DOM.qs('#gastos-category', _container);
    var dateEl = window.DOM.qs('#gastos-date', _container);

    if (!commerceEl || !amountEl || !categoryEl || !dateEl) return;

    var commerce = commerceEl.value.trim();
    var amount = parseFloat(amountEl.value.replace(/\./g, ''));
    var category = parseInt(categoryEl.value, 10);
    var date = dateEl.value;

    // Validation
    if (!commerce) {
      commerceEl.focus();
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      amountEl.focus();
      return;
    }
    if (isNaN(category) || categoryEl.value === '') {
      categoryEl.focus();
      return;
    }
    if (!date) {
      dateEl.focus();
      return;
    }

    var expense = {
      id: 'exp_' + Date.now(),
      commerce: commerce,
      amount: amount,
      rubro: _selectedFormRubro,
      category: category,
      date: date,
      createdAt: Date.now()
    };

    window.AppStore.addExpense(expense);
    window.DOM.toast('Gasto registrado: ' + fmt(amount), 'success');

    // Clear form - re-render will handle it, but also reset values
    // so the next render shows clean form
    render();
  }

  // ── Lifecycle ────────────────────────────────────────────

  function init() {
    _container = document.getElementById('gastos-content');
    if (!_container) return;

    render();
    bindEvents();

    // Subscribe to expense changes for reactive updates
    var unsub = window.AppStore.subscribe('expenses', function () {
      render();
    });
    _cleanups.push(unsub);
  }

  function refresh() {
    _confirmDeleteId = null;
    render();
  }

  function destroy() {
    clearTimeout(_acTimer);
    closeAddCommerceModal();
    for (var i = 0; i < _cleanups.length; i++) {
      if (typeof _cleanups[i] === 'function') {
        _cleanups[i]();
      }
    }
    _cleanups = [];
    if (_container) _container.innerHTML = '';
  }

  // ── Public API ───────────────────────────────────────────

  return {
    init: init,
    refresh: refresh,
    destroy: destroy
  };
})();
