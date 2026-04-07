/**
 * dashboard.js — Dashboard Section Component
 * ATT Benefit Program Dashboard
 *
 * Budget summary, favorites, recent searches, most visited locations.
 * Depends on: window.DOM, window.AppStore, window.AppRouter, window.RAW
 * Exposes window.DashboardComponent with init() and refresh() methods.
 */
window.DashboardComponent = (() => {
  'use strict';

  // ── Constants ────────────────────────────────────────────

  /** Category emoji icons (indexed by catIdx) */
  var CAT_EMOJIS = [
    '\uD83D\uDCBC', // 0  General / default
    '\uD83C\uDF54', // 1  Gastronomy
    '\uD83C\uDFAC', // 2  Entertainment
    '\uD83D\uDCBB', // 3  Tech / services
    '\u2764\uFE0F',  // 4  Health
    '\uD83D\uDC85', // 5  Beauty
    '\uD83D\uDC57', // 6  Fashion
    '\uD83E\uDDD8', // 7  Wellness
    '\uD83D\uDE97', // 8  Automotive
    '\uD83C\uDF93', // 9  Education
    '\u26BD',        // 10 Sports
    '\uD83D\uDC76', // 11 Kids
    '\u2708\uFE0F'   // 12 Travel
  ];

  var MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  var MAX_FAVORITES = 10;
  var MAX_LOCATIONS = 5;

  /** @type {function[]} Store unsubscribe callbacks */
  var _unsubs = [];

  /** @type {Element|null} Container reference */
  var _container = null;

  // ── Helpers ──────────────────────────────────────────────

  /**
   * Get a greeting based on the current hour.
   * @returns {string} Greeting text
   */
  function _getGreeting() {
    var hour = new Date().getHours();
    if (hour < 12) return 'Buenos d\u00edas';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }

  /**
   * Get current year and month.
   * @returns {{ year: number, month: number }}
   */
  function _now() {
    var d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }

  /**
   * Look up a commerce entry from RAW.d by its stored index.
   * Each entry is [name, locId, catIdx].
   * @param {number} idx - Index into RAW.d
   * @returns {{ name: string, locId: number, catIdx: number }|null}
   */
  function _getCommerce(idx) {
    if (!window.RAW || !RAW.d || idx < 0 || idx >= RAW.d.length) return null;
    var entry = RAW.d[idx];
    return { name: entry[0], locId: entry[1], catIdx: entry[2] };
  }

  /**
   * Get a location name by its index in RAW.l.
   * @param {number} locId - Location index
   * @returns {string}
   */
  function _getLocationName(locId) {
    if (!window.RAW || !RAW.l) return '';
    return RAW.l[locId] || '';
  }

  /**
   * Get a category name by its index in RAW.c.
   * @param {number} catIdx - Category index
   * @returns {string}
   */
  function _getCategoryName(catIdx) {
    if (!window.RAW || !RAW.c) return '';
    return RAW.c[catIdx] || '';
  }

  /**
   * Count how many commerces exist at a given location.
   * @param {number} locId - Location index
   * @returns {number}
   */
  function _countCommercesAtLocation(locId) {
    if (!window.RAW || !RAW.d) return 0;
    var count = 0;
    for (var i = 0; i < RAW.d.length; i++) {
      if (RAW.d[i][1] === locId) count++;
    }
    return count;
  }

  // ── Render Functions ─────────────────────────────────────

  /**
   * Build the complete dashboard HTML.
   * @returns {string} HTML string
   */
  function _buildHTML() {
    var html = '';

    // Page header
    html += '<div class="dash-header">';
    html += '<h1 class="dash-header__title">Dashboard</h1>';
    var time = _now();
    var daysInMonth = new Date(time.year, time.month, 0).getDate();
    var daysLeft = daysInMonth - new Date().getDate();
    if (new Date().getFullYear() !== time.year || new Date().getMonth() + 1 !== time.month) daysLeft = daysInMonth;
    var monthName = MONTH_NAMES[time.month - 1];
    html += '<p class="dash-header__subtitle">' + DOM.escapeHtml(_getGreeting()) + ' \u2014 ' + daysLeft + ' d\u00edas restantes en ' + DOM.escapeHtml(monthName) + '</p>';
    html += '</div>';

    // Grid
    html += '<div class="dash-grid">';

    // 1. Budget card (full width)
    html += _buildBudgetCard();

    // 2. Favorites panel
    html += _buildFavoritesPanel();

    // 3. Recent searches
    html += _buildSearchesPanel();

    // 4. Most visited locations
    html += _buildLocationsPanel();

    html += '</div>'; // end grid

    return html;
  }

  /**
   * Build the budget summary card HTML.
   * @returns {string}
   */
  function _buildBudgetCard() {
    var time = _now();
    var budget = AppStore.get('monthlyBudget') || 210000;
    var spent = AppStore.getMonthlySpent(time.year, time.month);
    var remaining = budget - spent;
    var pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

    var barClass = 'dash-progress__bar';
    if (pct >= 90) {
      barClass += ' dash-progress__bar--red';
    } else if (pct >= 70) {
      barClass += ' dash-progress__bar--yellow';
    } else {
      barClass += ' dash-progress__bar--green';
    }

    var monthLabel = MONTH_NAMES[time.month - 1] + ' ' + time.year;

    var html = '<div class="dash-card dash-budget dash-grid__full dash-card--open" data-panel="budget">';
    html += '<div class="dash-card__header" data-action="toggle-card">';
    html += '<h2 class="dash-card__title">Presupuesto Mensual</h2>';
    html += '<span class="dash-card__toggle-arrow">\u25BE</span>';
    html += '</div>';
    html += '<div class="dash-card__body">';
    html += '<div class="dash-budget__month">' + DOM.escapeHtml(monthLabel) + '</div>';
    html += '<div class="dash-budget__amount" id="dash-remaining">' + DOM.formatARS(remaining) + '</div>';
    html += '<div class="dash-budget__sub">de ' + DOM.formatARS(budget) + ' disponibles</div>';
    html += '<div class="dash-progress"><div class="' + barClass + '" style="width:' + pct + '%" id="dash-progress-bar"></div></div>';
    html += '<div class="dash-budget__detail">';
    html += '<span>Gastado: <strong>' + DOM.formatARS(spent) + '</strong></span>';
    html += '<span class="dash-budget__detail-separator">|</span>';
    html += '<span>Restante: <strong>' + DOM.formatARS(remaining) + '</strong></span>';
    html += '</div>';

    // KPI stats row
    var daysInMonth = new Date(time.year, time.month, 0).getDate();
    var now = new Date();
    var daysElapsed = (now.getFullYear() === time.year && now.getMonth() + 1 === time.month) ? now.getDate() : daysInMonth;
    var daysLeft = daysInMonth - (now.getFullYear() === time.year && now.getMonth() + 1 === time.month ? now.getDate() : 0);
    var avgPerDay = daysElapsed > 0 ? Math.round(spent / daysElapsed) : 0;
    var projection = daysElapsed > 0 ? Math.round((spent / daysElapsed) * daysInMonth) : 0;
    var expenseCount = AppStore.getMonthExpenses(time.year, time.month).length;

    html += '<button class="dash-budget__stats-toggle" data-action="toggle-budget-stats" aria-expanded="false">';
    html += '<span class="dash-budget__stats-toggle-label">Ver KPIs</span>';
    html += '<span class="dash-budget__stats-toggle-arrow">\u25BE</span>';
    html += '</button>';
    html += '<div class="dash-budget__stats" id="dash-budget-stats">';
    html += '<div class="dash-budget__stat"><span class="dash-budget__stat-value">' + DOM.formatARS(avgPerDay) + '</span><span class="dash-budget__stat-label">Promedio/d\u00eda</span></div>';
    html += '<div class="dash-budget__stat"><span class="dash-budget__stat-value">' + DOM.formatARS(projection) + '</span><span class="dash-budget__stat-label">Proy. mes</span></div>';
    html += '<div class="dash-budget__stat"><span class="dash-budget__stat-value">' + daysLeft + '</span><span class="dash-budget__stat-label">D\u00edas restantes</span></div>';
    html += '<div class="dash-budget__stat"><span class="dash-budget__stat-value">' + expenseCount + '</span><span class="dash-budget__stat-label">Gastos registrados</span></div>';
    html += '</div>';

    html += '</div>'; // end dash-card__body
    html += '</div>';

    return html;
  }

  /**
   * Build the favorites panel HTML.
   * @returns {string}
   */
  function _buildFavoritesPanel() {
    var favs = AppStore.get('favorites') || [];
    var count = favs.length;

    var html = '<div class="dash-card" data-panel="favorites">';
    html += '<div class="dash-card__header" data-action="toggle-card">';
    html += '<h2 class="dash-card__title">';
    html += 'Mis Favoritos \u2665';
    if (count > 0) {
      html += ' <span class="dash-card__badge">' + count + '</span>';
    }
    html += '</h2>';
    html += '<span class="dash-card__toggle-arrow">\u25BE</span>';
    html += '</div>';
    html += '<div class="dash-card__body">';

    if (count === 0) {
      html += '<div class="dash-empty">';
      html += '<div class="dash-empty__icon">\u2665</div>';
      html += '<div class="dash-empty__text">Agrega favoritos desde Comercios tocando el \u2665</div>';
      html += '<button class="dash-empty__btn" data-action="go-comercios">Ir a Comercios</button>';
      html += '</div>';
    } else {
      html += '<div class="dash-fav-list fade-in-stagger">';
      var limit = Math.min(count, MAX_FAVORITES);
      for (var i = 0; i < limit; i++) {
        var idx = favs[i];
        var commerce = _getCommerce(idx);
        if (!commerce) continue;

        var catIdx = commerce.catIdx;
        var emoji = CAT_EMOJIS[catIdx] || CAT_EMOJIS[0];
        var locName = _getLocationName(commerce.locId);
        var catName = _getCategoryName(catIdx);

        html += '<div class="dash-fav-item" data-action="fav-click" data-loc="' + commerce.locId + '" data-idx="' + idx + '">';
        html += '<div class="dash-fav-icon dash-cat-icon--' + catIdx + '">' + emoji + '</div>';
        html += '<div class="dash-fav-info">';
        html += '<div class="dash-fav-name">' + DOM.escapeHtml(commerce.name) + '</div>';
        html += '<div class="dash-fav-meta">' + DOM.escapeHtml(locName) + ' \u00B7 ' + DOM.escapeHtml(catName) + '</div>';
        html += '</div>';
        html += '<button class="dash-fav-remove" data-action="remove-fav" data-idx="' + idx + '" title="Quitar favorito" aria-label="Quitar de favoritos">\u2715</button>';
        html += '</div>';
      }
      html += '</div>';
    }

    html += '</div>'; // end dash-card__body
    html += '</div>';
    return html;
  }

  /**
   * Build the recent searches panel HTML.
   * @returns {string}
   */
  function _buildSearchesPanel() {
    var searches = AppStore.get('recentSearches') || [];

    var html = '<div class="dash-card" data-panel="searches">';
    html += '<div class="dash-card__header" data-action="toggle-card">';
    html += '<h2 class="dash-card__title">';
    html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
    html += ' B\u00fasquedas Recientes';
    html += '</h2>';
    html += '<span class="dash-card__toggle-arrow">\u25BE</span>';
    html += '</div>';
    html += '<div class="dash-card__body">';

    if (searches.length === 0) {
      html += '<div class="dash-empty">';
      html += '<div class="dash-empty__icon">\uD83D\uDD0D</div>';
      html += '<div class="dash-empty__text">A\u00fan no has buscado nada</div>';
      html += '</div>';
    } else {
      html += '<div class="dash-search-list">';
      for (var i = 0; i < searches.length; i++) {
        html += '<button class="dash-search-chip" data-action="search-click" data-term="' + DOM.escapeHtml(searches[i]) + '">';
        html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
        html += DOM.escapeHtml(searches[i]);
        html += '</button>';
      }
      html += '</div>';
    }

    html += '</div>'; // end dash-card__body
    html += '</div>';
    return html;
  }

  /**
   * Build the most visited locations panel HTML.
   * @returns {string}
   */
  function _buildLocationsPanel() {
    var visited = AppStore.get('visitedLocations') || {};
    var entries = [];

    var keys = Object.keys(visited);
    for (var i = 0; i < keys.length; i++) {
      entries.push({ locId: parseInt(keys[i], 10), visits: visited[keys[i]] });
    }

    // Sort by visits descending
    entries.sort(function (a, b) { return b.visits - a.visits; });
    entries = entries.slice(0, MAX_LOCATIONS);

    var html = '<div class="dash-card" data-panel="locations">';
    html += '<div class="dash-card__header" data-action="toggle-card">';
    html += '<h2 class="dash-card__title">';
    html += '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>';
    html += ' Zonas M\u00e1s Visitadas';
    html += '</h2>';
    html += '<span class="dash-card__toggle-arrow">\u25BE</span>';
    html += '</div>';
    html += '<div class="dash-card__body">';

    if (entries.length === 0) {
      html += '<div class="dash-empty">';
      html += '<div class="dash-empty__icon">\uD83D\uDCCD</div>';
      html += '<div class="dash-empty__text">Explora comercios para ver tus zonas favoritas</div>';
      html += '</div>';
    } else {
      html += '<div class="dash-loc-list fade-in-stagger">';
      for (var j = 0; j < entries.length; j++) {
        var entry = entries[j];
        var locName = _getLocationName(entry.locId);
        var commerceCount = _countCommercesAtLocation(entry.locId);

        html += '<div class="dash-loc-item" data-action="loc-click" data-loc="' + entry.locId + '">';
        html += '<div class="dash-loc-rank">' + (j + 1) + '</div>';
        html += '<div class="dash-loc-info">';
        html += '<div class="dash-loc-name">' + DOM.escapeHtml(locName) + '</div>';
        html += '<div class="dash-loc-count">' + commerceCount + ' comercios en esta zona</div>';
        html += '</div>';
        html += '<div class="dash-loc-visits">' + entry.visits + ' visitas</div>';
        html += '</div>';
      }
      html += '</div>';
    }

    html += '</div>'; // end dash-card__body
    html += '</div>';
    return html;
  }

  // ── Event Handling ───────────────────────────────────────

  /**
   * Set up event delegation on the dashboard container.
   */
  function _bindEvents() {
    if (!_container) return;

    DOM.delegate(_container, '[data-action="go-comercios"]', 'click', function (e) {
      e.preventDefault();
      AppRouter.navigate('comercios');
    });

    DOM.delegate(_container, '[data-action="toggle-card"]', 'click', function (e, el) {
      var card = el.closest('.dash-card');
      if (!card) return;
      card.classList.toggle('dash-card--open');
    });

    DOM.delegate(_container, '[data-action="toggle-budget-stats"]', 'click', function (e, el) {
      var stats = DOM.qs('#dash-budget-stats', _container);
      if (!stats) return;
      var isOpen = stats.classList.contains('dash-budget__stats--open');
      stats.classList.toggle('dash-budget__stats--open', !isOpen);
      el.setAttribute('aria-expanded', String(!isOpen));
      var arrow = DOM.qs('.dash-budget__stats-toggle-arrow', el);
      if (arrow) arrow.style.transform = !isOpen ? 'rotate(180deg)' : '';
      var label = DOM.qs('.dash-budget__stats-toggle-label', el);
      if (label) label.textContent = !isOpen ? 'Ocultar KPIs' : 'Ver KPIs';
    });

    DOM.delegate(_container, '[data-action="fav-click"]', 'click', function (e, el) {
      // If the remove button was clicked, don't navigate
      if (e.target.closest('[data-action="remove-fav"]')) return;

      var locId = parseInt(el.dataset.loc, 10);
      var favIdx = parseInt(el.dataset.idx, 10);
      if (!isNaN(locId)) {
        AppStore.set('loc', locId);
        if (!isNaN(favIdx)) AppStore.set('highlightCommerce', favIdx);
        AppRouter.navigate('comercios');
      }
    });

    DOM.delegate(_container, '[data-action="remove-fav"]', 'click', function (e, el) {
      e.stopPropagation();
      var idx = parseInt(el.dataset.idx, 10);
      if (!isNaN(idx)) {
        AppStore.removeFavorite(idx);
        DOM.toast('Favorito eliminado', 'info');
      }
    });

    DOM.delegate(_container, '[data-action="search-click"]', 'click', function (e, el) {
      var term = el.dataset.term;
      if (term) {
        AppStore.set('search', term);
        AppRouter.navigate('comercios');
      }
    });

    DOM.delegate(_container, '[data-action="loc-click"]', 'click', function (e, el) {
      var locId = parseInt(el.dataset.loc, 10);
      if (!isNaN(locId)) {
        AppStore.set('loc', locId);
        AppRouter.navigate('comercios');
      }
    });
  }

  // ── Reactive Updates ─────────────────────────────────────

  /**
   * Subscribe to AppStore changes for reactive updates.
   */
  function _subscribe() {
    // Unsubscribe any previous listeners
    _unsubscribe();

    _unsubs.push(AppStore.subscribe('expenses', function () {
      _updateBudget();
    }));

    _unsubs.push(AppStore.subscribe('favorites', function () {
      _refreshPanel('favorites');
    }));

    _unsubs.push(AppStore.subscribe('recentSearches', function () {
      _refreshPanel('searches');
    }));

    _unsubs.push(AppStore.subscribe('visitedLocations', function () {
      _refreshPanel('locations');
    }));

    _unsubs.push(AppStore.subscribe('monthlyBudget', function () {
      _updateBudget();
    }));
  }

  /**
   * Remove all store subscriptions.
   */
  function _unsubscribe() {
    for (var i = 0; i < _unsubs.length; i++) {
      if (typeof _unsubs[i] === 'function') _unsubs[i]();
    }
    _unsubs = [];
  }

  /**
   * Update the budget card values without full re-render.
   */
  function _updateBudget() {
    var budgetCard = DOM.qs('[data-panel="budget"]', _container);
    if (!budgetCard) return;

    var time = _now();
    var budget = AppStore.get('monthlyBudget') || 210000;
    var spent = AppStore.getMonthlySpent(time.year, time.month);
    var remaining = budget - spent;
    var pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

    // Update remaining amount
    var amountEl = DOM.qs('#dash-remaining', budgetCard);
    if (amountEl) amountEl.textContent = DOM.formatARS(remaining);

    // Update progress bar
    var barEl = DOM.qs('#dash-progress-bar', budgetCard);
    if (barEl) {
      barEl.style.width = pct + '%';
      barEl.className = 'dash-progress__bar';
      if (pct >= 90) {
        barEl.classList.add('dash-progress__bar--red');
      } else if (pct >= 70) {
        barEl.classList.add('dash-progress__bar--yellow');
      } else {
        barEl.classList.add('dash-progress__bar--green');
      }
    }

    // Update detail text
    var detailEl = DOM.qs('.dash-budget__detail', budgetCard);
    if (detailEl) {
      detailEl.innerHTML =
        '<span>Gastado: <strong>' + DOM.formatARS(spent) + '</strong></span>' +
        '<span class="dash-budget__detail-separator">|</span>' +
        '<span>Restante: <strong>' + DOM.formatARS(remaining) + '</strong></span>';
    }

    // Update subtitle
    var subEl = DOM.qs('.dash-budget__sub', budgetCard);
    if (subEl) subEl.textContent = 'de ' + DOM.formatARS(budget) + ' disponibles';

    // Update KPI stats
    var statsEl = DOM.qs('#dash-budget-stats', budgetCard);
    if (statsEl) {
      var daysInMonth = new Date(time.year, time.month, 0).getDate();
      var now = new Date();
      var daysElapsed = (now.getFullYear() === time.year && now.getMonth() + 1 === time.month) ? now.getDate() : daysInMonth;
      var daysLeft = daysInMonth - (now.getFullYear() === time.year && now.getMonth() + 1 === time.month ? now.getDate() : 0);
      var avgPerDay = daysElapsed > 0 ? Math.round(spent / daysElapsed) : 0;
      var projection = daysElapsed > 0 ? Math.round((spent / daysElapsed) * daysInMonth) : 0;
      var expenseCount = AppStore.getMonthExpenses(time.year, time.month).length;

      statsEl.innerHTML =
        '<div class="dash-budget__stat"><span class="dash-budget__stat-value">' + DOM.formatARS(avgPerDay) + '</span><span class="dash-budget__stat-label">Promedio/d\u00eda</span></div>' +
        '<div class="dash-budget__stat"><span class="dash-budget__stat-value">' + DOM.formatARS(projection) + '</span><span class="dash-budget__stat-label">Proy. mes</span></div>' +
        '<div class="dash-budget__stat"><span class="dash-budget__stat-value">' + daysLeft + '</span><span class="dash-budget__stat-label">D\u00edas restantes</span></div>' +
        '<div class="dash-budget__stat"><span class="dash-budget__stat-value">' + expenseCount + '</span><span class="dash-budget__stat-label">Gastos registrados</span></div>';
    }
  }

  /**
   * Refresh a specific panel by re-rendering its card content.
   * @param {'favorites'|'searches'|'locations'} panel
   */
  function _refreshPanel(panel) {
    if (!_container) return;

    var cardEl = DOM.qs('[data-panel="' + panel + '"]', _container);
    if (!cardEl) return;

    var wasOpen = cardEl.classList.contains('dash-card--open');

    var newHTML = '';
    switch (panel) {
      case 'favorites':
        newHTML = _buildFavoritesPanel();
        break;
      case 'searches':
        newHTML = _buildSearchesPanel();
        break;
      case 'locations':
        newHTML = _buildLocationsPanel();
        break;
    }

    if (newHTML) {
      // Create a temp element to parse the new HTML
      var temp = document.createElement('div');
      temp.innerHTML = newHTML;
      var newCard = temp.firstElementChild;
      if (newCard) {
        if (wasOpen) newCard.classList.add('dash-card--open');
        cardEl.replaceWith(newCard);
      }
    }
  }

  // ── Public API ───────────────────────────────────────────

  /**
   * Initialize the dashboard component.
   * Renders the full dashboard and sets up event listeners.
   */
  function init() {
    _container = document.getElementById('dashboard-content');
    if (!_container) return;

    _container.innerHTML = _buildHTML();
    _bindEvents();
    _subscribe();
  }

  /**
   * Refresh the dashboard (called when navigating back to it).
   * Re-renders all panels with fresh data.
   */
  function refresh() {
    _container = document.getElementById('dashboard-content');
    if (!_container) return;

    _container.innerHTML = _buildHTML();
    _bindEvents();
  }

  return {
    init: init,
    refresh: refresh
  };
})();
