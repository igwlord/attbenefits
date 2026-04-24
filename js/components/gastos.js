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
  var CUSTOM_CATEGORY_VALUE = 'other';
  var CUSTOM_CATEGORY_LABEL = 'Otro';

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
  var _editingExpenseId = null;
  var _lastFormDate = todayStr();
  var _lastCategorySelectionByRubro = { 0: '', 1: '' };
  var _lastCustomCategoryByRubro = { 0: '', 1: '' };
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

  function buildCategoryOptions(formCategories, selectedValue) {
    var html = '<option value="">-- Seleccionar --</option>';
    for (var c = 0; c < formCategories.length; c++) {
      var optionValue = String(formCategories[c].idx);
      var selectedAttr = selectedValue === optionValue ? ' selected' : '';
      html += '<option value="' + optionValue + '"' + selectedAttr + '>' + esc(formCategories[c].name) + '</option>';
    }
    html += '<option value="' + CUSTOM_CATEGORY_VALUE + '"' +
      (selectedValue === CUSTOM_CATEGORY_VALUE ? ' selected' : '') + '>' + CUSTOM_CATEGORY_LABEL + '</option>';
    return html;
  }

  function syncCustomCategoryField() {
    var categoryEl = window.DOM.qs('#gastos-category', _container);
    var customWrapEl = window.DOM.qs('#gastos-custom-category-wrap', _container);
    var customInputEl = window.DOM.qs('#gastos-custom-category', _container);
    if (!categoryEl || !customWrapEl || !customInputEl) return;

    var isOtherSelected = categoryEl.value === CUSTOM_CATEGORY_VALUE;
    customWrapEl.hidden = !isOtherSelected;
    customInputEl.required = isOtherSelected;

    if (!isOtherSelected) {
      customInputEl.value = '';
    }
  }

  function getRememberedCategoryValue(rubroIdx) {
    return _lastCategorySelectionByRubro[rubroIdx] || '';
  }

  function getRememberedCustomCategory(rubroIdx) {
    return _lastCustomCategoryByRubro[rubroIdx] || '';
  }

  function rememberFormSelection(rubroIdx, categoryValue, customCategory, dateValue) {
    _lastCategorySelectionByRubro[rubroIdx] = categoryValue || '';
    _lastCustomCategoryByRubro[rubroIdx] = customCategory || '';
    _lastFormDate = dateValue || todayStr();
  }

  function applyRememberedCategorySelection() {
    if (_editingExpenseId) {
      syncCustomCategoryField();
      return;
    }

    var categoryEl = window.DOM.qs('#gastos-category', _container);
    var customCategoryEl = window.DOM.qs('#gastos-custom-category', _container);
    var dateEl = window.DOM.qs('#gastos-date', _container);
    var rememberedCategory = getRememberedCategoryValue(_selectedFormRubro);

    if (categoryEl && rememberedCategory) {
      categoryEl.value = rememberedCategory;
    }

    syncCustomCategoryField();

    if (customCategoryEl) {
      customCategoryEl.value = getRememberedCustomCategory(_selectedFormRubro);
    }

    if (dateEl && _lastFormDate) {
      dateEl.value = _lastFormDate;
    }
  }

  function openDrawer() {
    var drawer  = window.DOM.qs('#gastos-drawer');
    var overlay = window.DOM.qs('#gastos-overlay');
    if (drawer)  drawer.classList.add('open');
    if (overlay) overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    applyRememberedCategorySelection();

    var commerceEl = window.DOM.qs('#gastos-commerce', _container);
    if (commerceEl) commerceEl.focus();
  }

  function getExpenseCategoryLabel(expense) {
    if (expense && expense.categoryLabel) return expense.categoryLabel;
    if (expense && expense.customCategory) return expense.customCategory;
    if (window.RAW && window.RAW.c && typeof expense.category === 'number') {
      return window.RAW.c[expense.category] || '';
    }
    return '';
  }

  function formatAmountInputValue(amount) {
    if (typeof amount !== 'number' || !isFinite(amount) || amount <= 0) return '';
    return String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function getExpenseById(id) {
    var expenses = window.AppStore ? (window.AppStore.get('expenses') || []) : [];
    for (var i = 0; i < expenses.length; i++) {
      if (expenses[i].id === id) return expenses[i];
    }
    return null;
  }

  function getEditingExpense() {
    return _editingExpenseId ? getExpenseById(_editingExpenseId) : null;
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

  // ── Historial Chart ──────────────────────────────────────

  function renderHistorialChart() {
    // Mostrar los 12 meses fijos para mantener la grilla consistente
    var months = [];
    for (var hi = 1; hi <= 12; hi++) {
      months.push({ year: _currentYear, month: hi });
    }

    // Aggregate gastro/compras totals per month
    var data = months.map(function(mo) {
      var exps = window.AppStore.getMonthExpenses(mo.year, mo.month);
      var gastro = 0, compras = 0;
      for (var xi = 0; xi < exps.length; xi++) {
        if (exps[xi].rubro === 0) gastro += exps[xi].amount || 0;
        else compras += exps[xi].amount || 0;
      }
      return { year: mo.year, month: mo.month, gastro: gastro, compras: compras, total: gastro + compras };
    });

    var maxVal = 0;
    for (var di = 0; di < data.length; di++) {
      if (data[di].total > maxVal) maxVal = data[di].total;
    }
    if (maxVal === 0) maxVal = 1;

    var BAR_H = 180; // px — fixed bar area height

    // Build CSS bar columns
    var barsHtml = '';
    for (var bi = 0; bi < data.length; bi++) {
      var d = data[bi];
      var isCurrent = (d.year === _currentYear && d.month === _currentMonth);

      var gastroH  = d.gastro  > 0 ? Math.max(3, Math.round((d.gastro  / maxVal) * BAR_H)) : 0;
      var comprasH = d.compras > 0 ? Math.max(3, Math.round((d.compras / maxVal) * BAR_H)) : 0;

      var mLabel   = MONTH_NAMES_ES[d.month - 1].substring(0, 3);
      var showYear = (bi === 0) || (d.year !== data[bi - 1].year);

      var totalLabel = '';
      if (isCurrent && d.total > 0) {
        totalLabel = d.total >= 1000000
          ? (d.total / 1000000).toFixed(1) + 'M'
          : Math.round(d.total / 1000) + 'k';
      }

      barsHtml += '<div class="gastos__chart-col' + (isCurrent ? ' active' : '') + '">';
      if (totalLabel) {
        barsHtml += '<span class="gastos__chart-col-total">' + totalLabel + '</span>';
      } else {
        barsHtml += '<span class="gastos__chart-col-total" aria-hidden="true"></span>';
      }
      barsHtml += '<div class="gastos__chart-col-inner" style="height:' + BAR_H + 'px">';
      if (d.total === 0) {
        barsHtml += '<div class="gastos__chart-col-empty"></div>';
      } else {
        if (gastroH > 0) {
          barsHtml += '<div class="gastos__chart-col-gastro" style="height:' + gastroH + 'px"></div>';
        }
        if (comprasH > 0) {
          var yOffset = gastroH > 0 ? (gastroH + 2) : 0;
          barsHtml += '<div class="gastos__chart-col-compras" style="height:' + comprasH + 'px;bottom:' + yOffset + 'px"></div>';
        }
      }
      barsHtml += '</div>'; // end chart-col-inner
      barsHtml += '<span class="gastos__chart-col-label">' + mLabel + '</span>';
      if (showYear) {
        barsHtml += '<span class="gastos__chart-col-year">' + d.year + '</span>';
      } else {
        barsHtml += '<span class="gastos__chart-col-year" aria-hidden="true"></span>';
      }
      barsHtml += '</div>'; // end chart-col
    }

    // Grid lines (3 reference lines at 25%, 50%, 75% of bar height)
    var gridHtml = '<div class="gastos__chart-grid" aria-hidden="true">'
      + '<div class="gastos__chart-gridline" style="bottom:75%"></div>'
      + '<div class="gastos__chart-gridline" style="bottom:50%"></div>'
      + '<div class="gastos__chart-gridline" style="bottom:25%"></div>'
      + '</div>';

    var html = '<div class="gastos__card gastos__historial">';
    html += '<div class="gastos__card-title">Historial mensual</div>';
    html += '<div class="gastos__chart-wrap">';
    html += gridHtml;
    html += '<div class="gastos__chart-bars">' + barsHtml + '</div>';
    html += '</div>'; // end chart-wrap
    html += '<div class="gastos__chart-legend">';
    html += '<span class="gastos__chart-legend-dot gastro-dot"></span><span>Gastronom\u00eda</span>';
    html += '<span class="gastos__chart-legend-dot compras-dot"></span><span>Compras</span>';
    html += '</div>';
    html += '</div>'; // end gastos__card
    return html;
  }

  function renderTopLocales(year, month) {
    var thisExps = window.AppStore.getMonthExpenses(year, month);
    var locMap = {};
    for (var li = 0; li < thisExps.length; li++) {
      var le = thisExps[li];
      var ln = ((le.commerce || 'Sin nombre') + '').trim();
      locMap[ln] = (locMap[ln] || 0) + (le.amount || 0);
    }
    var topLocales = [];
    var lKeys = Object.keys(locMap);
    for (var lk = 0; lk < lKeys.length; lk++) {
      topLocales.push({ name: lKeys[lk], total: locMap[lKeys[lk]] });
    }
    topLocales.sort(function(a, b) { return b.total - a.total; });
    if (topLocales.length > 5) topLocales = topLocales.slice(0, 5);

    var html = '<div class="gastos__card">';
    html += '<div class="gastos__card-title">Top locales &mdash; ' + esc(MONTH_NAMES_ES[month - 1]) + '</div>';
    if (topLocales.length > 0) {
      html += '<div class="gastos__locales-list">';
      for (var tl = 0; tl < topLocales.length; tl++) {
        html += '<div class="gastos__locale-row">';
        html += '<span class="gastos__locale-name">' + esc(topLocales[tl].name) + '</span>';
        html += '<span class="gastos__locale-amount">' + fmt(topLocales[tl].total) + '</span>';
        html += '</div>';
      }
      html += '</div>';
    } else {
      html += '<p class="gastos__chart-empty">Sin gastos en ' + esc(MONTH_NAMES_ES[month - 1]) + '</p>';
    }
    html += '</div>';
    return html;
  }

  function renderDesglose(gastroTotal, comprasTotal, gastroPct, comprasPct, totalAll) {
    var html = '<div class="gastos__card">';
    html += '<div class="gastos__card-title">Desglose por rubro</div>';
    html += '<div class="gastos__totals">';

    html += '<div class="gastos__totals-row">';
    html += '  <span class="gastos__totals-label">' + t('gastronomia') + '</span>';
    html += '  <div class="gastos__totals-bar-wrap">';
    html += '    <div class="gastos__totals-bar gastos__totals-bar--gastro"';
    html += '         style="width:' + (totalAll > 0 ? gastroPct.toFixed(1) : 0) + '%"></div></div>';
    html += '  <span class="gastos__totals-amount">' + fmt(gastroTotal) + '</span>';
    html += '  <span class="gastos__totals-pct">' + Math.round(gastroPct) + '%</span>';
    html += '</div>';

    html += '<div class="gastos__totals-row">';
    html += '  <span class="gastos__totals-label">' + t('compras') + '</span>';
    html += '  <div class="gastos__totals-bar-wrap">';
    html += '    <div class="gastos__totals-bar gastos__totals-bar--compras"';
    html += '         style="width:' + (totalAll > 0 ? comprasPct.toFixed(1) : 0) + '%"></div></div>';
    html += '  <span class="gastos__totals-amount">' + fmt(comprasTotal) + '</span>';
    html += '  <span class="gastos__totals-pct">' + Math.round(comprasPct) + '%</span>';
    html += '</div>';

    html += '</div></div>';
    return html;
  }

  function renderDrawer(formCategories) {
    var editingExpense = getEditingExpense();
    var isEditing = !!editingExpense;
    var selectedCategory = isEditing
      ? (editingExpense.customCategory ? CUSTOM_CATEGORY_VALUE : String(editingExpense.category))
      : getRememberedCategoryValue(_selectedFormRubro);
    var selectedCustomCategory = isEditing
      ? (editingExpense.customCategory || '')
      : getRememberedCustomCategory(_selectedFormRubro);
    var commerceValue = isEditing ? (editingExpense.commerce || '') : '';
    var amountValue = isEditing ? formatAmountInputValue(editingExpense.amount) : '';
    var dateValue = isEditing ? (editingExpense.date || todayStr()) : (_lastFormDate || todayStr());
    var html = '<div class="gastos__drawer-overlay" id="gastos-overlay"></div>';
    html += '<div class="gastos__drawer" id="gastos-drawer">';
    html += '<div class="gastos__drawer-header">';
    html += '  <span class="gastos__drawer-title">' + (isEditing ? 'Editar gasto' : 'Nuevo Gasto') + '</span>';
    html += '  <button class="gastos__drawer-close" id="gastos-drawer-close" aria-label="Cerrar">';
    html += '    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">';
    html += '      <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
    html += '    </svg>';
    html += '  </button>';
    html += '</div>';
    html += '<div class="gastos__drawer-body">';
    html += '<form class="gastos__form" id="gastos-form" autocomplete="off">';

    html += '<div class="gastos__form-row">';
    html += '<div class="gastos__field">';
    html += '  <label class="gastos__label" for="gastos-commerce">' + t('comercio') + '</label>';
    html += '  <div class="gastos__ac-wrap">';
    html += '    <input class="gastos__input" type="text" id="gastos-commerce"';
    html += '           placeholder="Nombre del comercio" autocomplete="off" required value="' + esc(commerceValue) + '">';
    html += '    <div class="gastos__ac-panel" id="gastos-ac-panel" hidden></div>';
    html += '  </div>';
    html += '</div>';
    html += '<div class="gastos__field">';
    html += '  <label class="gastos__label" for="gastos-amount">' + t('monto') + '</label>';
    html += '  <div class="gastos__input-group">';
    html += '    <span class="gastos__input-prefix">$</span>';
    html += '    <input class="gastos__input" type="text" inputmode="numeric" id="gastos-amount"';
    html += '           placeholder="0" required value="' + esc(amountValue) + '">';
    html += '  </div>';
    html += '</div>';
    html += '</div>';

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

    html += '<div class="gastos__form-row">';
    html += '<div class="gastos__field">';
    html += '  <label class="gastos__label" for="gastos-category">' + t('categorias') + '</label>';
    html += '  <select class="gastos__select" id="gastos-category" required>';
    html += buildCategoryOptions(formCategories, selectedCategory);
    html += '  </select>';
    html += '  <span class="gastos__field-hint">Si no aparece en la lista, elegi Otro.</span>';
    html += '</div>';
    html += '<div class="gastos__field gastos__field--conditional" id="gastos-custom-category-wrap"' + (selectedCategory === CUSTOM_CATEGORY_VALUE ? '' : ' hidden') + '>';
    html += '  <label class="gastos__label" for="gastos-custom-category">Categoria personalizada</label>';
    html += '  <input class="gastos__input" type="text" id="gastos-custom-category" placeholder="Ej: Estacionamiento" maxlength="40" value="' + esc(selectedCustomCategory) + '">';
    html += '  <span class="gastos__field-hint">Se guardara tal como la escribas.</span>';
    html += '</div>';
    html += '<div class="gastos__field">';
    html += '  <label class="gastos__label" for="gastos-date">' + t('fecha') + '</label>';
    html += '  <input class="gastos__input" type="date" id="gastos-date" value="' + esc(dateValue) + '" required>';
    html += '</div>';
    html += '</div>';

    html += '<div class="gastos__form-actions">';
    if (!isEditing) {
      html += '  <button type="submit" class="gastos__submit gastos__submit--secondary" data-submit-mode="continue">Guardar y cargar otro</button>';
      html += '  <button type="submit" class="gastos__submit" data-submit-mode="close">Registrar Gasto</button>';
    } else {
      html += '  <button type="submit" class="gastos__submit gastos__submit--single" data-submit-mode="close">Guardar cambios</button>';
    }
    html += '</div>';
    html += '</form>';
    html += '</div>'; // end drawer-body
    html += '</div>'; // end drawer
    return html;
  }

  function renderTransactionTable(filtered, filteredTotal) {
    var RUBRO_NAMES = ['Gastronom\u00eda', 'Compras'];
    var RUBRO_ICONS = ['\uD83C\uDF7D\uFE0F', '\uD83D\uDECD\uFE0F'];

    var html = '<div class="gastos__card-title">';
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
      html += '  <div class="gastos__empty-icon">\uD83D\uDCCB</div>';
      html += '  <div class="gastos__empty-text">No hay gastos registrados este mes.</div>';
      html += '</div>';
      return html;
    }

    html += '<div style="overflow-x:auto">';
    html += '<table class="gastos__tx-table"><thead><tr>';
    html += '<th></th>';
    html += '<th>Comercio</th>';
    html += '<th class="gastos__tx-col-rubro">Rubro</th>';
    html += '<th class="gastos__tx-col-fecha">Fecha</th>';
    html += '<th class="gastos__tx-th-amount">Monto</th>';
    html += '<th></th>';
    html += '</tr></thead><tbody>';

    for (var j = 0; j < filtered.length; j++) {
      var e = filtered[j];
      var rc = e.rubro === 0 ? 'gastro' : 'compras';
      var isConfirm = (_confirmDeleteId === e.id);

      html += '<tr class="gastos__tx-row" data-id="' + esc(e.id) + '">';

      // Icon
      html += '<td><div class="gastos__tx-icon gastos__tx-icon--' + rc + '">';
      html += RUBRO_ICONS[e.rubro] + '</div></td>';

      // Commerce
      html += '<td><div class="gastos__tx-commerce">' + esc(e.commerce || 'Sin nombre') + '</div></td>';

      // Rubro badge
      html += '<td class="gastos__tx-col-rubro">';
      html += '<span class="gastos__tx-rubro-badge gastos__tx-rubro-badge--' + rc + '">';
      html += RUBRO_NAMES[e.rubro] + '</span></td>';

      // Date
      html += '<td class="gastos__tx-col-fecha">';
      html += '<span class="gastos__tx-date">' + esc(e.date || '') + '</span></td>';

      // Amount
      html += '<td><span class="gastos__tx-amount">' + fmt(e.amount) + '</span></td>';

      // Actions
      html += '<td>';
      if (isConfirm) {
        html += '<div class="gastos__tx-confirm">';
        html += '<button class="gastos__tx-confirm-yes" data-confirm-delete="' + esc(e.id) + '">Eliminar</button>';
        html += '<button class="gastos__tx-confirm-no" data-cancel-delete="1">Cancelar</button>';
        html += '</div>';
      } else {
        html += '<div class="gastos__tx-actions">';
        html += '<button class="gastos__tx-edit" data-edit-id="' + esc(e.id) + '" aria-label="Editar">Editar</button>';
        html += '<button class="gastos__tx-delete" data-delete-id="' + esc(e.id) + '" aria-label="Eliminar">';
        html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
        html += '<polyline points="3 6 5 6 21 6"/>';
        html += '<path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>';
        html += '</svg></button>';
        html += '</div>';
      }
      html += '</td>';

      html += '</tr>';
    }

    html += '</tbody></table></div>';
    return html;
  }

  // ── Render ───────────────────────────────────────────────

  function render() {
    if (!_container) return;

    var spent = getSpent();
    var budget = getBudget();
    var remaining = budget - spent;
    var pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
    var daysElapsed = getDaysElapsed(_currentYear, _currentMonth);
    var avgPerDay = daysElapsed > 0 ? spent / daysElapsed : 0;

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

    // ── Row 1: Budget Tracker + action buttons ──
    html += '<div class="gastos__card gastos__budget">';
    html += '<div class="gastos__budget-header">';
    html += '<a class="gastos__header-btn gastos__header-btn--saldo" href="https://edenred.com.ar/tarjeta/consulta-de-saldo/" target="_blank" rel="noopener noreferrer">Consultar saldo</a>';
    html += renderMonthSelector();
    html += '<button class="gastos__header-btn gastos__nuevo-btn" id="gastos-nuevo-btn">';
    html += '<svg width="14" height="14" viewBox="0 0 14 14" fill="none">';
    html += '<path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
    html += '</svg> Nuevo Gasto</button>';
    html += '</div>';
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
    html += '</div>';
    html += '</div>'; // end budget card

    // ── Row 2: Analytics (3fr chart | 2fr desglose + top locales) ──
    html += '<div class="gastos__analytics-row">';
    html += renderHistorialChart();
    html += '<div class="gastos__analytics-right">';
    html += renderDesglose(gastroTotal, comprasTotal, gastroPct, comprasPct, totalAll);
    html += renderTopLocales(_currentYear, _currentMonth);
    html += '</div>';
    html += '</div>'; // end analytics row

    // ── Row 3: Transaction table (full width) ──
    html += '<div class="gastos__card">';
    html += renderTransactionTable(filtered, filteredTotal);
    html += '</div>';

    // ── Drawer: Nuevo Gasto form (fixed, off-screen) ──
    html += renderDrawer(formCategories);

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
    syncCustomCategoryField();

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
    var catName = getExpenseCategoryLabel(expense);
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
      html += '<button class="gastos__item-edit" data-edit-id="' + esc(expense.id) + '" aria-label="Editar">Editar</button>';
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

  function closeDrawer() {
    var drawer  = window.DOM.qs('#gastos-drawer');
    var overlay = window.DOM.qs('#gastos-overlay');
    if (drawer)  drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function bindEvents() {
    if (!_container) return;

    // Drawer: open
    _cleanups.push(
      window.DOM.delegate(_container, '#gastos-nuevo-btn', 'click', function () {
        _editingExpenseId = null;
        _confirmDeleteId = null;
        render();
        openDrawer();
      })
    );

    // Drawer: close via X button
    _cleanups.push(
      window.DOM.delegate(_container, '#gastos-drawer-close', 'click', closeDrawer)
    );

    // Drawer: close via overlay click
    _cleanups.push(
      window.DOM.delegate(_container, '#gastos-overlay', 'click', closeDrawer)
    );

    // Drawer: close via Escape key
    var _escHandler = function (e) { if (e.key === 'Escape') closeDrawer(); };
    document.addEventListener('keydown', _escHandler);
    _cleanups.push(function () { document.removeEventListener('keydown', _escHandler); });

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
        
        // Update pills
        var pills = el.parentElement.querySelectorAll('.gastos__pill');
        for (var i = 0; i < pills.length; i++) {
          pills[i].classList.remove('gastos__pill--active');
        }
        el.classList.add('gastos__pill--active');
        
        // Update dropdown
        var formCategories = getCategoriesForRubro(_selectedFormRubro);
        var selectEl = window.DOM.qs('#gastos-category', _container);
        if (selectEl) {
          selectEl.innerHTML = buildCategoryOptions(formCategories, getRememberedCategoryValue(_selectedFormRubro));
        }
        applyRememberedCategorySelection();
      })
    );

    // Category select change
    _cleanups.push(
      window.DOM.delegate(_container, '#gastos-category', 'change', function (_e, el) {
        _lastCategorySelectionByRubro[_selectedFormRubro] = el.value || '';
        syncCustomCategoryField();
      })
    );

    _cleanups.push(
      window.DOM.delegate(_container, '#gastos-custom-category', 'input', function (_e, el) {
        _lastCustomCategoryByRubro[_selectedFormRubro] = el.value.trim();
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

    // Edit expense
    _cleanups.push(
      window.DOM.delegate(_container, '[data-edit-id]', 'click', function (_e, el) {
        var expense = getExpenseById(el.getAttribute('data-edit-id'));
        if (!expense) return;

        _editingExpenseId = expense.id;
        _selectedFormRubro = typeof expense.rubro === 'number' ? expense.rubro : 0;
        _confirmDeleteId = null;
        rememberFormSelection(
          _selectedFormRubro,
          expense.customCategory ? CUSTOM_CATEGORY_VALUE : String(expense.category),
          expense.customCategory || '',
          expense.date || todayStr()
        );
        render();
        openDrawer();
      })
    );

    // Delete expense - step 1: show confirm
    _cleanups.push(
      window.DOM.delegate(_container, '[data-delete-id]', 'click', function (_e, el) {
        _editingExpenseId = null;
        _confirmDeleteId = el.getAttribute('data-delete-id');
        render();
      })
    );

    // Delete expense - step 2: confirm yes
    _cleanups.push(
      window.DOM.delegate(_container, '[data-confirm-delete]', 'click', function (_e, el) {
        var id = el.getAttribute('data-confirm-delete');
        window.AppStore.removeExpense(id);
        if (_editingExpenseId === id) {
          _editingExpenseId = null;
        }
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
        handleFormSubmit(e.submitter && e.submitter.getAttribute('data-submit-mode') === 'continue');
      })
    );

  }

  function handleFormSubmit(keepOpen) {
    var commerceEl = window.DOM.qs('#gastos-commerce', _container);
    var amountEl = window.DOM.qs('#gastos-amount', _container);
    var categoryEl = window.DOM.qs('#gastos-category', _container);
    var customCategoryEl = window.DOM.qs('#gastos-custom-category', _container);
    var dateEl = window.DOM.qs('#gastos-date', _container);

    if (!commerceEl || !amountEl || !categoryEl || !customCategoryEl || !dateEl) return;

    var commerce = commerceEl.value.trim();
    var amount = parseFloat(amountEl.value.replace(/\./g, ''));
    var category = parseInt(categoryEl.value, 10);
    var customCategory = customCategoryEl.value.trim();
    var isCustomCategory = categoryEl.value === CUSTOM_CATEGORY_VALUE;
    var date = dateEl.value;
    var editingExpense = getEditingExpense();

    // Validation
    if (!commerce) {
      window.DOM.toast('Ingresa el comercio.', 'warning');
      commerceEl.focus();
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      window.DOM.toast('Ingresa un monto valido mayor a cero.', 'warning');
      amountEl.focus();
      return;
    }
    if (categoryEl.value === '' || (!isCustomCategory && isNaN(category))) {
      window.DOM.toast('Selecciona una categoria.', 'warning');
      categoryEl.focus();
      return;
    }
    if (isCustomCategory && !customCategory) {
      window.DOM.toast('Especifica la categoria personalizada.', 'warning');
      customCategoryEl.focus();
      return;
    }
    if (!date) {
      window.DOM.toast('Selecciona una fecha.', 'warning');
      dateEl.focus();
      return;
    }

    rememberFormSelection(
      _selectedFormRubro,
      isCustomCategory ? CUSTOM_CATEGORY_VALUE : String(category),
      isCustomCategory ? customCategory : '',
      date
    );

    var expense = {
      commerce: commerce,
      amount: amount,
      rubro: _selectedFormRubro,
      category: isCustomCategory ? null : category,
      categoryLabel: isCustomCategory ? customCategory : getExpenseCategoryLabel({ category: category }),
      customCategory: isCustomCategory ? customCategory : '',
      date: date,
      createdAt: Date.now()
    };

    if (editingExpense) {
      expense.createdAt = editingExpense.createdAt || Date.now();
      window.AppStore.updateExpense(editingExpense.id, expense);
      _editingExpenseId = null;
      window.DOM.toast('Gasto actualizado: ' + fmt(amount), 'success');
      closeDrawer();
      render();
      return;
    }

    expense.id = 'exp_' + Date.now();
    window.AppStore.addExpense(expense);
    window.DOM.toast('Gasto registrado: ' + fmt(amount), 'success');
    if (keepOpen) {
      render();
      openDrawer();
      var nextAmountEl = window.DOM.qs('#gastos-amount', _container);
      if (nextAmountEl) nextAmountEl.value = '';
      var nextCommerceEl = window.DOM.qs('#gastos-commerce', _container);
      if (nextCommerceEl) {
        nextCommerceEl.value = '';
        nextCommerceEl.focus();
      }
      return;
    }
    closeDrawer();
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
    document.body.style.overflow = '';
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
