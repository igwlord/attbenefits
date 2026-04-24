/**
 * @file comercios.js
 * @description Comercios explorer — AT&T Benefits Dashboard.
 * Pattern: Header → Search → Filter Bar (tabs + dropdowns) → Active Chips → Results Table → Pagination.
 * Depends on: window.RAW, window.AppStore, window.DOM, window.I18N
 * Exposes window.ComerciosComponent with init() and refresh().
 */
window.ComerciosComponent = (() => {
  'use strict';

  // ── Constants ──────────────────────────────────────────────

  const DEFAULT_PAGE_SIZE = 20;
  const PAGE_SIZE_OPTIONS = [20, 50, 100];
  const CAT_ICONS = ['\uD83D\uDED2','\uD83C\uDF7D\uFE0F','\uD83E\uDD50','\uD83C\uDFEA','\uD83E\uDD69','\uD83C\uDF71','\uD83C\uDF7A','\uD83D\uDCE6','\uD83C\uDF77','\uD83C\uDFEC','\uD83C\uDFDB\uFE0F','\uD83D\uDCB0','\uD83D\uDCCB'];
  const CAT_COLORS = ['var(--cat0)','var(--cat1)','var(--cat2)','var(--cat3)','var(--cat4)','var(--cat5)','var(--cat6)','var(--cat7)','var(--cat8)','var(--cat9)','var(--cat10)','var(--cat11)','var(--cat12)'];
  const RUBRO_NAMES = ['Gastronom\u00eda', 'Compras'];
  const SEARCH_DEBOUNCE_MS = 150;
  const SEARCH_SAVE_MS = 1000;
  const SORT_LABELS = { 'relevance': 'Relevancia', 'name-asc': 'Nombre A\u2192Z', 'name-desc': 'Nombre Z\u2192A' };
  const ADDRESS_HINT_RE = /(\d|\bav\.?\b|\bavenida\b|\bcalle\b|\bruta\b|\bkm\b|\besq\.?\b|\besquina\b|\bboulevard\b|\bblvd\b|\bpasaje\b|\bpje\b|\bautopista\b|\bshopping\b|\bterminal\b|\baeropuerto\b)/i;

  // ── Module state ──────────────────────────────────────────

  var _container = null;
  var _searchIndex = null;
  var _filtered = [];
  var _cleanups = [];
  var _searchSaveTimer = null;

  // Dropdown open states (transient UI, not persisted)
  var _locDdOpen = false;
  var _catDdOpen = false;
  var _sortDdOpen = false;

  // Cached total location count
  var _totalLocs = 0;

  // ── Search Index ──────────────────────────────────────────

  function _getPageSize() {
    var value = parseInt(AppStore.get('pageSize'), 10);
    return PAGE_SIZE_OPTIONS.indexOf(value) !== -1 ? value : DEFAULT_PAGE_SIZE;
  }

  function _parseCommerceRecord(rec) {
    var rawName = (rec && rec[0]) || '';
    var name = rawName;
    var address = '';
    var separators = [' - ', ' – ', ' — '];

    for (var i = 0; i < separators.length; i++) {
      var sep = separators[i];
      var splitAt = rawName.lastIndexOf(sep);
      if (splitAt <= 0) continue;

      var possibleName = rawName.slice(0, splitAt).trim();
      var possibleAddress = rawName.slice(splitAt + sep.length).trim();
      if (!possibleName || !possibleAddress) continue;
      if (!ADDRESS_HINT_RE.test(possibleAddress)) continue;

      name = possibleName;
      address = possibleAddress;
      break;
    }

    return {
      rawName: rawName,
      name: name,
      address: address,
      locId: rec[1],
      catIdx: rec[2]
    };
  }

  function _buildAddressPreview(address) {
    if (!address) return 'Sin direccion';
    return address.length > 36 ? address.slice(0, 33).trim() + '...' : address;
  }

  function _buildSearchIndex() {
    var data = RAW.d, locs = RAW.l, cats = RAW.c;
    _searchIndex = new Array(data.length);
    for (var i = 0; i < data.length; i++) {
      var rec = data[i];
      var commerce = _parseCommerceRecord(rec);
      _searchIndex[i] = commerce.name.toLowerCase() + '|' +
                        commerce.address.toLowerCase() + '|' +
                        (locs[rec[1]] || '').toLowerCase() + '|' +
                        (cats[rec[2]] || '').toLowerCase();
    }
  }

  // ── Filtering ────────────────────────────────────────────

  function _applyFilters() {
    var data = RAW.d;
    var searchTerm = (AppStore.get('search') || '').toLowerCase().trim();
    var rubro = AppStore.get('rubro');
    var locId = AppStore.get('loc');
    var catIdx = AppStore.get('cat');
    var favsOnly = AppStore.get('showFavoritesOnly');
    var favs = AppStore.get('favorites') || [];

    var hasSearch = searchTerm.length > 0;
    var hasRubro = rubro !== -1;
    var hasLoc = locId !== -1;
    var hasCat = catIdx !== -1;
    var hasFavs = favsOnly && favs.length > 0;
    if (favsOnly && favs.length === 0) return [];

    var favSet = null;
    if (hasFavs) {
      favSet = {};
      for (var f = 0; f < favs.length; f++) favSet[favs[f]] = true;
    }

    var result = [];
    for (var i = 0; i < data.length; i++) {
      var rec = data[i];
      if (hasFavs && !favSet[i]) continue;
      if (hasRubro && RAW.r[rec[2]] !== rubro) continue;
      if (hasLoc && rec[1] !== locId) continue;
      if (hasCat && rec[2] !== catIdx) continue;
      if (hasSearch && _searchIndex[i].indexOf(searchTerm) === -1) continue;
      result.push(i);
    }
    return result;
  }

  // ── Count helpers ────────────────────────────────────────

  function _countByCategoryFiltered() {
    var data = RAW.d;
    var searchTerm = (AppStore.get('search') || '').toLowerCase().trim();
    var rubro = AppStore.get('rubro');
    var locId = AppStore.get('loc');
    var favsOnly = AppStore.get('showFavoritesOnly');
    var favs = AppStore.get('favorites') || [];
    var hasSearch = searchTerm.length > 0;
    var hasRubro = rubro !== -1;
    var hasLoc = locId !== -1;
    var hasFavs = favsOnly && favs.length > 0;

    var favSet = null;
    if (hasFavs) {
      favSet = {};
      for (var f = 0; f < favs.length; f++) favSet[favs[f]] = true;
    }

    var counts = new Array(RAW.c.length).fill(0);
    for (var i = 0; i < data.length; i++) {
      var rec = data[i];
      if (hasFavs && !favSet[i]) continue;
      if (hasRubro && RAW.r[rec[2]] !== rubro) continue;
      if (hasLoc && rec[1] !== locId) continue;
      if (hasSearch && _searchIndex[i].indexOf(searchTerm) === -1) continue;
      counts[rec[2]]++;
    }
    return counts;
  }

  // ── Helpers ──────────────────────────────────────────────

  function _fmtNum(n) { return n.toLocaleString('es-AR'); }

  function _hasActiveFilters() {
    return AppStore.get('rubro') !== -1 ||
           AppStore.get('loc') !== -1 ||
           AppStore.get('cat') !== -1 ||
           AppStore.get('showFavoritesOnly') ||
           (AppStore.get('search') || '').length > 0;
  }

  function _sortFiltered(arr) {
    var sort = AppStore.get('sort') || 'relevance';
    if (sort === 'name-asc') {
      return arr.slice().sort(function (a, b) {
        return RAW.d[a][0].localeCompare(RAW.d[b][0], 'es');
      });
    }
    if (sort === 'name-desc') {
      return arr.slice().sort(function (a, b) {
        return RAW.d[b][0].localeCompare(RAW.d[a][0], 'es');
      });
    }
    return arr;
  }

  // ── Render: Header ───────────────────────────────────────

  function _renderHeader() {
    var favsCount = (AppStore.get('favorites') || []).length;
    return '<div class="com-hdr">' +
      '<div class="com-hdr__text">' +
        '<h1 class="com-hdr__title">Comercios adheridos</h1>' +
        '<p class="com-hdr__sub">Encontr\u00e1 locales y beneficios disponibles para la tarjeta corporativa.</p>' +
      '</div>' +
      '<div class="com-hdr__stats">' +
        '<span class="com-hdr__stat"><strong>' + _fmtNum(RAW.d.length) + '</strong> comercios</span>' +
        '<span class="com-hdr__sep">\u00B7</span>' +
        '<span class="com-hdr__stat"><strong>' + _fmtNum(_totalLocs) + '</strong> localidades</span>' +
        '<span class="com-hdr__sep">\u00B7</span>' +
        '<span class="com-hdr__stat"><strong>' + _fmtNum(favsCount) + '</strong> favoritos</span>' +
      '</div>' +
    '</div>';
  }

  // ── Render: Search Bar ───────────────────────────────────

  function _renderSearchBar() {
    var currentSearch = AppStore.get('search') || '';
    return '<div class="com-searchbar">' +
      '<div class="com-searchbar__wrap">' +
        '<svg class="com-searchbar__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>' +
        '<input type="text" class="com-searchbar__input" id="com-search-input"' +
          ' placeholder="Buscar por comercio, localidad o categor\u00eda..."' +
          ' value="' + DOM.escapeHtml(currentSearch) + '" autocomplete="off">' +
        (currentSearch ? '<button class="com-searchbar__clear" data-action="clear-search" aria-label="Limpiar">\u00D7</button>' : '') +
      '</div>' +
    '</div>';
  }

  // ── Render: Filter Bar ───────────────────────────────────

  function _renderFilterBar() {
    var activeRubro = AppStore.get('rubro');
    var activeLoc = AppStore.get('loc');
    var activeCat = AppStore.get('cat');
    var favsOnly = AppStore.get('showFavoritesOnly');
    var sort = AppStore.get('sort') || 'relevance';

    var locLabel = activeLoc !== -1 ? (RAW.l[activeLoc] || 'Localidad') : 'Localidad';
    var catLabel = activeCat !== -1 ? (RAW.c[activeCat] || 'Categor\u00eda') : 'Categor\u00eda';

    // ── Loc dropdown panel ──
    var locPanelHtml = '';
    if (_locDdOpen) {
      var topLocs = (RAW.t || []).slice(0, 12);
      var locItems = activeLoc !== -1
        ? '<button class="com-dd__item com-dd__item--reset" data-action="set-loc" data-value="-1">Todas las localidades</button>'
        : '';
      for (var t = 0; t < topLocs.length; t++) {
        var tl = topLocs[t];
        locItems += '<button class="com-dd__item' + (tl[1] === activeLoc ? ' com-dd__item--active' : '') + '" ' +
          'data-action="set-loc" data-value="' + tl[1] + '">' +
          '<span class="com-dd__item-name">' + DOM.escapeHtml(tl[0]) + '</span>' +
        '</button>';
      }
      locPanelHtml = '<div class="com-dd__panel">' +
        '<div class="com-dd__search-row">' +
          '<input type="text" class="com-dd__search" id="com-loc-search" placeholder="Buscar localidad..." autocomplete="off">' +
        '</div>' +
        '<div class="com-dd__list" id="com-loc-list">' + locItems + '</div>' +
      '</div>';
    }

    // ── Cat dropdown panel ──
    var catPanelHtml = '';
    if (_catDdOpen) {
      var catCounts = _countByCategoryFiltered();
      var catItems = activeCat !== -1
        ? '<button class="com-dd__item com-dd__item--reset" data-action="set-cat" data-value="-1">Todas las categor\u00edas</button>'
        : '';
      for (var ci = 0; ci < RAW.c.length; ci++) {
        if (!RAW.c[ci]) continue;
        var cIsActive = ci === activeCat;
        var isRubroMismatch = (activeRubro !== -1 && RAW.r[ci] !== activeRubro);
        if (isRubroMismatch && catCounts[ci] === 0 && !cIsActive) continue;
        catItems += '<button class="com-dd__item' + (cIsActive ? ' com-dd__item--active' : '') +
          (isRubroMismatch && !cIsActive ? ' com-dd__item--dim' : '') + '" ' +
          'data-action="set-cat" data-value="' + ci + '">' +
          '<span class="com-dd__item-icon">' + CAT_ICONS[ci] + '</span>' +
          '<span class="com-dd__item-name">' + DOM.escapeHtml(RAW.c[ci]) + '</span>' +
        '</button>';
      }
      catPanelHtml = '<div class="com-dd__panel">' +
        '<div class="com-dd__list">' + catItems + '</div>' +
      '</div>';
    }

    // ── Sort dropdown panel ──
    var sortPanelHtml = '';
    if (_sortDdOpen) {
      var sortOpts = [
        { value: 'relevance', label: 'Relevancia' },
        { value: 'name-asc', label: 'Nombre A\u2192Z' },
        { value: 'name-desc', label: 'Nombre Z\u2192A' }
      ];
      var sortItems = sortOpts.map(function (o) {
        return '<button class="com-dd__item' + (sort === o.value ? ' com-dd__item--active' : '') + '" ' +
          'data-action="set-sort" data-value="' + o.value + '">' + o.label + '</button>';
      }).join('');
      sortPanelHtml = '<div class="com-dd__panel com-dd__panel--sm">' +
        '<div class="com-dd__list">' + sortItems + '</div>' +
      '</div>';
    }

    var arrowSvg = '<svg class="com-dd__arrow" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>';

    return '<div class="com-filterbar">' +
      // Rubro tabs
      '<div class="com-rubro-tabs">' +
        '<button class="com-rubro-tab' + (activeRubro === -1 && !favsOnly ? ' com-rubro-tab--active' : '') +
          '" data-action="set-rubro" data-value="-1">Todos</button>' +
        '<button class="com-rubro-tab' + (activeRubro === 0 ? ' com-rubro-tab--active' : '') +
          '" data-action="set-rubro" data-value="0">\uD83C\uDF7D\uFE0F ' + RUBRO_NAMES[0] + '</button>' +
        '<button class="com-rubro-tab' + (activeRubro === 1 ? ' com-rubro-tab--active' : '') +
          '" data-action="set-rubro" data-value="1">\uD83D\uDED2 ' + RUBRO_NAMES[1] + '</button>' +
        '<button class="com-rubro-tab com-rubro-tab--fav' + (favsOnly ? ' com-rubro-tab--active' : '') +
          '" data-action="toggle-favs">\u2665 Favoritos</button>' +
      '</div>' +
      // Right dropdowns
      '<div class="com-filterbar__right">' +
        '<div class="com-dd' + (_locDdOpen ? ' com-dd--open' : '') + '" id="com-dd-loc">' +
          '<button class="com-dd__trigger' + (activeLoc !== -1 ? ' com-dd__trigger--on' : '') + '" data-action="toggle-loc-dd">' +
            DOM.escapeHtml(locLabel) + arrowSvg +
          '</button>' +
          locPanelHtml +
        '</div>' +
        '<div class="com-dd' + (_catDdOpen ? ' com-dd--open' : '') + '" id="com-dd-cat">' +
          '<button class="com-dd__trigger' + (activeCat !== -1 ? ' com-dd__trigger--on' : '') + '" data-action="toggle-cat-dd">' +
            DOM.escapeHtml(catLabel) + arrowSvg +
          '</button>' +
          catPanelHtml +
        '</div>' +
        '<div class="com-dd' + (_sortDdOpen ? ' com-dd--open' : '') + '" id="com-dd-sort">' +
          '<button class="com-dd__trigger" data-action="toggle-sort-dd">' +
            'Ordenar por' + arrowSvg +
          '</button>' +
          sortPanelHtml +
        '</div>' +
        (_hasActiveFilters() ? '<button class="com-filterbar__clear" data-action="clear-all">Limpiar filtros</button>' : '') +
      '</div>' +
    '</div>';
  }

  // ── Render: Active Filter Chips ──────────────────────────

  function _renderActiveFilters() {
    var chips = [];
    var search = AppStore.get('search') || '';
    var activeRubro = AppStore.get('rubro');
    var activeLoc = AppStore.get('loc');
    var activeCat = AppStore.get('cat');
    var favsOnly = AppStore.get('showFavoritesOnly');

    if (search) chips.push(
      '<button class="com-chip" data-action="clear-search">' +
        '\u201C' + DOM.escapeHtml(search) + '\u201D <span class="com-chip__x">\u00D7</span>' +
      '</button>'
    );
    if (activeRubro !== -1) chips.push(
      '<button class="com-chip" data-action="set-rubro" data-value="-1">' +
        RUBRO_NAMES[activeRubro] + ' <span class="com-chip__x">\u00D7</span>' +
      '</button>'
    );
    if (activeLoc !== -1) chips.push(
      '<button class="com-chip" data-action="set-loc" data-value="-1">' +
        DOM.escapeHtml(RAW.l[activeLoc] || '') + ' <span class="com-chip__x">\u00D7</span>' +
      '</button>'
    );
    if (activeCat !== -1) chips.push(
      '<button class="com-chip" data-action="set-cat" data-value="-1">' +
        DOM.escapeHtml(RAW.c[activeCat] || '') + ' <span class="com-chip__x">\u00D7</span>' +
      '</button>'
    );
    if (favsOnly) chips.push(
      '<button class="com-chip" data-action="toggle-favs">' +
        'Solo favoritos <span class="com-chip__x">\u00D7</span>' +
      '</button>'
    );

    if (!chips.length) return '';
    return '<div class="com-active-filters">' + chips.join('') + '</div>';
  }

  // ── Render: Results Bar ──────────────────────────────────

  function _renderResultsBar() {
    var sort = AppStore.get('sort') || 'relevance';
    var sortSubLabels = { 'relevance': 'relevancia', 'name-asc': 'nombre A\u2192Z', 'name-desc': 'nombre Z\u2192A' };
    var total = _filtered.length;
    var pageSize = _getPageSize();
    var optionsHtml = '';

    for (var i = 0; i < PAGE_SIZE_OPTIONS.length; i++) {
      var option = PAGE_SIZE_OPTIONS[i];
      optionsHtml += '<option value="' + option + '"' + (option === pageSize ? ' selected' : '') + '>' + option + '</option>';
    }

    return '<div class="com-results-bar">' +
      '<div class="com-results-bar__summary">' +
        '<span class="com-results-bar__count"><strong>' + _fmtNum(total) + '</strong> resultado' + (total !== 1 ? 's' : '') + '</span>' +
        '<span class="com-results-bar__order">\u00B7 Ordenado por ' + sortSubLabels[sort] + '</span>' +
      '</div>' +
      '<label class="com-results-bar__page-size">' +
        '<span>Mostrar</span>' +
        '<select class="com-results-bar__select" data-action="set-page-size" aria-label="Cantidad de comercios por pagina">' + optionsHtml + '</select>' +
      '</label>' +
    '</div>';
  }

  // ── Render: Table ────────────────────────────────────────

  function _renderTable() {
    var page = AppStore.get('page');
    var pageSize = _getPageSize();
    var sorted = _sortFiltered(_filtered);
    var start = page * pageSize;
    var end = Math.min(start + pageSize, sorted.length);

    if (sorted.length === 0) return _renderEmptyState();

    var html = '<div class="com-table">' +
      '<div class="com-table__head">' +
        '<div class="com-table__th com-table__th--icon"></div>' +
        '<div class="com-table__th">COMERCIO</div>' +
        '<div class="com-table__th com-table__th--loc">LOCALIDAD</div>' +
        '<div class="com-table__th com-table__th--address">DIRECCION</div>' +
        '<div class="com-table__th com-table__th--cat">CATEGOR\u00cdA</div>' +
        '<div class="com-table__th com-table__th--actions"></div>' +
      '</div>';

    for (var i = start; i < end; i++) {
      var idx = sorted[i];
      var rec = RAW.d[idx];
      var commerce = _parseCommerceRecord(rec);
      var name = commerce.name;
      var locId = commerce.locId;
      var catIdx = commerce.catIdx;
      var address = commerce.address;
      var addressPreview = _buildAddressPreview(address);
      var locName = RAW.l[locId] || '';
      var catName = RAW.c[catIdx] || '';
      var catIcon = CAT_ICONS[catIdx] || '';
      var catColor = CAT_COLORS[catIdx] || 'var(--cat0)';
      var rubroIdx = RAW.r[catIdx];
      var rubroName = RUBRO_NAMES[rubroIdx] || '';
      var isFav = AppStore.isFavorite(idx);
      var mapsQuery = encodeURIComponent((address ? address + ' ' : name + ' ') + locName + ' Argentina');

      html += '<div class="com-row' + (isFav ? ' com-row--fav' : '') + '" data-idx="' + idx + '">' +
        '<div class="com-row__icon" style="background:' + catColor + '1A;color:' + catColor + '">' + catIcon + '</div>' +
        '<div class="com-row__main">' +
          '<div class="com-row__name">' + DOM.escapeHtml(name) + '</div>' +
          (address ? '<div class="com-row__address-mobile">' + DOM.escapeHtml(address) + '</div>' : '') +
          '<div class="com-row__meta-mobile">' +
            '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
            DOM.escapeHtml(locName) +
            '<span class="com-row__rubro com-row__rubro--' + rubroIdx + '">' + rubroName + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="com-row__loc">' +
          '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
          '<span>' + DOM.escapeHtml(locName) + '</span>' +
        '</div>' +
        '<div class="com-row__address' + (address ? ' com-row__address--has-value' : ' com-row__address--empty') + '"' + (address ? ' data-full-address="' + DOM.escapeHtml(address) + '" tabindex="0"' : '') + '>' +
          '<span class="com-row__address-preview">' + DOM.escapeHtml(addressPreview) + '</span>' +
        '</div>' +
        '<div class="com-row__cat">' +
          '<span class="com-row__rubro-badge com-row__rubro-badge--' + rubroIdx + '">' + rubroName + '</span>' +
          '<span class="com-row__cat-name">' + DOM.escapeHtml(catName) + '</span>' +
        '</div>' +
        '<div class="com-row__actions">' +
          '<button class="com-row__fav' + (isFav ? ' com-row__fav--on' : '') + '" ' +
            'data-action="toggle-fav" data-value="' + idx + '" title="' + (isFav ? 'Quitar favorito' : 'Agregar favorito') + '">' +
            (isFav ? '\u2665' : '\u2661') +
          '</button>' +
          '<a class="com-row__map" href="https://www.google.com/maps/search/' + mapsQuery + '" ' +
            'target="_blank" rel="noopener noreferrer" data-action="maps-link" data-loc="' + locId + '" title="Ver en Google Maps">' +
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
          '</a>' +
        '</div>' +
      '</div>';
    }

    html += '</div>';
    return html;
  }

  // ── Render: Pagination ───────────────────────────────────

  function _renderPagination() {
    var page = AppStore.get('page');
    var pageSize = _getPageSize();
    var total = _filtered.length;
    var totalPages = Math.max(1, Math.ceil(total / pageSize));

    if (total <= pageSize) return '';

    var start = page * pageSize + 1;
    var end = Math.min((page + 1) * pageSize, total);

    var maxVisible = 5;
    var startPage = Math.max(0, Math.min(page - 2, totalPages - maxVisible));
    var endPage = Math.min(totalPages - 1, startPage + maxVisible - 1);

    var chevL = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>';
    var chevR = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>';

    var html = '<div class="com-pager">' +
      '<span class="com-pager__info">' + _fmtNum(start) + ' \u2013 ' + _fmtNum(end) + ' de ' + _fmtNum(total) + '</span>' +
      '<div class="com-pager__btns">' +
        '<button class="com-pager__btn" data-action="page-prev" ' + (page === 0 ? 'disabled' : '') + ' aria-label="Anterior">' + chevL + '</button>';

    if (startPage > 0) {
      html += '<button class="com-pager__btn" data-action="page-go" data-value="0">1</button>';
      if (startPage > 1) html += '<span class="com-pager__ellipsis">\u2026</span>';
    }
    for (var p = startPage; p <= endPage; p++) {
      html += '<button class="com-pager__btn' + (p === page ? ' com-pager__btn--active' : '') + '" ' +
        'data-action="page-go" data-value="' + p + '">' + (p + 1) + '</button>';
    }
    if (endPage < totalPages - 1) {
      if (endPage < totalPages - 2) html += '<span class="com-pager__ellipsis">\u2026</span>';
      html += '<button class="com-pager__btn" data-action="page-go" data-value="' + (totalPages - 1) + '">' + totalPages + '</button>';
    }

    html += '<button class="com-pager__btn" data-action="page-next" ' + (page >= totalPages - 1 ? 'disabled' : '') + ' aria-label="Siguiente">' + chevR + '</button>' +
      '</div>' +
    '</div>';

    return html;
  }

  // ── Render: Empty State ──────────────────────────────────

  function _renderEmptyState() {
    var search = AppStore.get('search') || '';
    var rubro = AppStore.get('rubro');
    var locId = AppStore.get('loc');
    var catIdx = AppStore.get('cat');
    var favsOnly = AppStore.get('showFavoritesOnly');

    var reasons = [];
    if (search) reasons.push('b\u00fasqueda \u201C' + DOM.escapeHtml(search) + '\u201D');
    if (rubro !== -1) reasons.push('rubro ' + RUBRO_NAMES[rubro]);
    if (locId !== -1) reasons.push(RAW.l[locId] || 'localidad');
    if (catIdx !== -1) reasons.push(RAW.c[catIdx] || 'categor\u00eda');
    if (favsOnly) reasons.push('solo favoritos');

    var msg = 'No hay resultados' + (reasons.length ? ' para: ' + reasons.join(', ') + '.' : '.');

    return '<div class="com-empty">' +
      '<div class="com-empty__icon">\uD83D\uDD0D</div>' +
      '<div class="com-empty__msg">' + msg + '</div>' +
      '<button class="com-empty__reset" data-action="clear-all">Limpiar todos los filtros</button>' +
    '</div>';
  }

  // ── Full Render ──────────────────────────────────────────

  function _renderAll() {
    if (!_container) return;

    _filtered = _applyFilters();
    AppStore.set('filtered', _filtered);

    var totalPages = Math.max(1, Math.ceil(_filtered.length / _getPageSize()));
    var page = AppStore.get('page');
    if (page >= totalPages) { AppStore.set('page', 0); page = 0; }

    _container.innerHTML =
      _renderHeader() +
      _renderSearchBar() +
      _renderFilterBar() +
      _renderActiveFilters() +
      _renderResultsBar() +
      _renderTable() +
      _renderPagination();
  }

  // ── Location Dropdown Live Search ────────────────────────

  function _updateLocList(query) {
    var listEl = DOM.qs('#com-loc-list', _container);
    if (!listEl) return;

    query = (query || '').toLowerCase().trim();
    var activeLoc = AppStore.get('loc');

    if (!query) {
      var topLocs = (RAW.t || []).slice(0, 12);
      var html = activeLoc !== -1
        ? '<button class="com-dd__item com-dd__item--reset" data-action="set-loc" data-value="-1">Todas las localidades</button>'
        : '';
      for (var t = 0; t < topLocs.length; t++) {
        var tl = topLocs[t];
        html += '<button class="com-dd__item' + (tl[1] === activeLoc ? ' com-dd__item--active' : '') + '" ' +
          'data-action="set-loc" data-value="' + tl[1] + '">' +
          '<span class="com-dd__item-name">' + DOM.escapeHtml(tl[0]) + '</span>' +
        '</button>';
      }
      listEl.innerHTML = html;
      return;
    }

    // Compute loc counts once to skip empty localities
    var locCounts2 = {};
    for (var d2 = 0; d2 < RAW.d.length; d2++) {
      var lid2 = RAW.d[d2][1];
      locCounts2[lid2] = (locCounts2[lid2] || 0) + 1;
    }

    var matches = [];
    for (var i = 0; i < RAW.l.length; i++) {
      var locStr = RAW.l[i] || '';
      if (!locStr) continue;
      // Skip garbage entries: too short, starts with dash/digit-noise, excessive spaces, no businesses
      if (locStr.length < 3) continue;
      if (locStr.charAt(0) === '-' || locStr.charAt(0) === '_') continue;
      if (/\s{3,}/.test(locStr)) continue;
      if (!locCounts2[i]) continue;
      var lower = locStr.toLowerCase();
      if (lower.indexOf(query) !== -1) {
        matches.push({ idx: i, name: locStr, starts: lower.indexOf(query) === 0 });
        if (matches.length > 60) break;
      }
    }
    matches.sort(function (a, b) {
      if (a.starts !== b.starts) return a.starts ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    matches = matches.slice(0, 12);

    if (!matches.length) {
      listEl.innerHTML = '<div class="com-dd__empty">Sin resultados para \u201C' + DOM.escapeHtml(query) + '\u201D</div>';
      return;
    }

    var resultHtml = '';
    for (var m = 0; m < matches.length; m++) {
      var match = matches[m];
      resultHtml += '<button class="com-dd__item' + (match.idx === activeLoc ? ' com-dd__item--active' : '') + '" ' +
        'data-action="set-loc" data-value="' + match.idx + '">' +
        '<span class="com-dd__item-name">' + DOM.escapeHtml(match.name) + '</span>' +
      '</button>';
    }
    listEl.innerHTML = resultHtml;
  }

  // ── Event Binding ────────────────────────────────────────

  function _bindEvents() {
    _unbindEvents();

    // Main search input
    var searchInput = DOM.qs('#com-search-input', _container);
    if (searchInput) {
      var debouncedSearch = DOM.debounce(function () {
        AppStore.set('search', searchInput.value);
        AppStore.set('page', 0);
        _renderAll();
        _bindEvents();
        _refocusSearch();
      }, SEARCH_DEBOUNCE_MS);

      searchInput.addEventListener('input', function () {
        debouncedSearch();
        if (_searchSaveTimer) clearTimeout(_searchSaveTimer);
        _searchSaveTimer = setTimeout(function () {
          var term = searchInput.value.trim();
          if (term) AppStore.addRecentSearch(term);
        }, SEARCH_SAVE_MS);
      });

      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          AppStore.set('search', '');
          AppStore.set('page', 0);
          _renderAll(); _bindEvents(); _refocusSearch();
        }
        if (e.key === 'Enter') {
          var term = searchInput.value.trim();
          if (term) AppStore.addRecentSearch(term);
        }
      });
    }

    // Loc search input (inside dropdown)
    var locSearch = DOM.qs('#com-loc-search', _container);
    if (locSearch) {
      var debouncedLoc = DOM.debounce(function () {
        _updateLocList(locSearch.value);
      }, SEARCH_DEBOUNCE_MS);
      locSearch.addEventListener('input', debouncedLoc);
      locSearch.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { _locDdOpen = false; _renderAll(); _bindEvents(); }
      });
      // Auto-focus loc search when dropdown opens
      setTimeout(function () { locSearch.focus(); }, 0);
    }

    // Click outside → close all dropdowns
    var _docClick = function (e) {
      var changed = false;
      if (_locDdOpen && !DOM.qs('#com-dd-loc', _container).contains(e.target)) { _locDdOpen = false; changed = true; }
      if (_catDdOpen && !DOM.qs('#com-dd-cat', _container).contains(e.target)) { _catDdOpen = false; changed = true; }
      if (_sortDdOpen && !DOM.qs('#com-dd-sort', _container).contains(e.target)) { _sortDdOpen = false; changed = true; }
      if (changed) { _renderAll(); _bindEvents(); }
    };
    document.addEventListener('click', _docClick);
    _cleanups.push(function () { document.removeEventListener('click', _docClick); });

    // Delegated actions
    var unsub = DOM.delegate(_container, '[data-action]', 'click', function (e, el) {
      var action = el.dataset.action;
      var value = el.dataset.value;

      switch (action) {

        case 'clear-search':
          AppStore.set('search', ''); AppStore.set('page', 0);
          _renderAll(); _bindEvents(); _refocusSearch();
          break;

        case 'set-rubro':
          var newRubro = parseInt(value, 10);
          var curRubro = AppStore.get('rubro');
          if (newRubro === curRubro && newRubro !== -1) newRubro = -1;
          AppStore.set('rubro', newRubro);
          if (newRubro === -1) AppStore.set('showFavoritesOnly', false);
          var curCat = AppStore.get('cat');
          if (newRubro !== -1 && curCat !== -1 && RAW.r[curCat] !== newRubro) {
            AppStore.set('cat', -1);
            DOM.toast(RAW.c[curCat] + ' no pertenece a ese rubro. Se deseleccion\u00f3.', 'info');
          }
          AppStore.set('page', 0);
          _renderAll(); _bindEvents();
          break;

        case 'toggle-favs':
          AppStore.set('showFavoritesOnly', !AppStore.get('showFavoritesOnly'));
          AppStore.set('page', 0);
          _renderAll(); _bindEvents();
          break;

        case 'toggle-loc-dd':
          e.stopPropagation();
          _locDdOpen = !_locDdOpen;
          _catDdOpen = false; _sortDdOpen = false;
          _renderAll(); _bindEvents();
          break;

        case 'toggle-cat-dd':
          e.stopPropagation();
          _catDdOpen = !_catDdOpen;
          _locDdOpen = false; _sortDdOpen = false;
          _renderAll(); _bindEvents();
          break;

        case 'toggle-sort-dd':
          e.stopPropagation();
          _sortDdOpen = !_sortDdOpen;
          _locDdOpen = false; _catDdOpen = false;
          _renderAll(); _bindEvents();
          break;

        case 'set-loc':
          var newLoc = parseInt(value, 10);
          var curLoc = AppStore.get('loc');
          if (newLoc === curLoc && newLoc !== -1) newLoc = -1;
          AppStore.set('loc', newLoc);
          AppStore.set('page', 0);
          if (newLoc !== -1) AppStore.incrementVisited(newLoc);
          _locDdOpen = false;
          _renderAll(); _bindEvents();
          break;

        case 'set-cat':
          var newCat = parseInt(value, 10);
          var curCat2 = AppStore.get('cat');
          if (newCat === curCat2) newCat = -1;
          var curRubro2 = AppStore.get('rubro');
          if (newCat !== -1 && curRubro2 !== -1 && RAW.r[newCat] !== curRubro2) {
            DOM.toast(RAW.c[newCat] + ' pertenece al rubro ' + RUBRO_NAMES[RAW.r[newCat]] + '.', 'warning');
            break;
          }
          AppStore.set('cat', newCat);
          AppStore.set('page', 0);
          _catDdOpen = false;
          _renderAll(); _bindEvents();
          break;

        case 'set-sort':
          AppStore.set('sort', value || 'relevance');
          AppStore.set('page', 0);
          _sortDdOpen = false;
          _renderAll(); _bindEvents();
          break;

        case 'set-page-size':
          var newPageSize = parseInt(value, 10);
          if (PAGE_SIZE_OPTIONS.indexOf(newPageSize) === -1) break;
          AppStore.set('pageSize', newPageSize);
          AppStore.set('page', 0);
          _renderAll(); _bindEvents(); _scrollToResults();
          break;

        case 'clear-all':
          AppStore.set('search', ''); AppStore.set('rubro', -1);
          AppStore.set('loc', -1); AppStore.set('cat', -1);
          AppStore.set('showFavoritesOnly', false);
          AppStore.set('sort', 'relevance'); AppStore.set('page', 0);
          _locDdOpen = false; _catDdOpen = false; _sortDdOpen = false;
          _renderAll(); _bindEvents();
          break;

        case 'toggle-fav':
          var favIdx = parseInt(value, 10);
          if (AppStore.isFavorite(favIdx)) {
            AppStore.removeFavorite(favIdx);
          } else {
            AppStore.addFavorite(favIdx);
            DOM.toast('Agregado a favoritos', 'success', 1500);
          }
          var isFavNow = AppStore.isFavorite(favIdx);
          el.className = 'com-row__fav' + (isFavNow ? ' com-row__fav--on' : '');
          el.textContent = isFavNow ? '\u2665' : '\u2661';
          el.title = isFavNow ? 'Quitar favorito' : 'Agregar favorito';
          // Update row border (com-row--fav) without full re-render
          var rowEl = el.closest ? el.closest('.com-row') : null;
          if (rowEl) rowEl.classList.toggle('com-row--fav', isFavNow);
          // Update header fav count without full re-render
          var hdrFavStrongs = DOM.qsa('.com-hdr__stat strong', _container);
          if (hdrFavStrongs.length) {
            hdrFavStrongs[hdrFavStrongs.length - 1].textContent = _fmtNum((AppStore.get('favorites') || []).length);
          }
          if (AppStore.get('showFavoritesOnly')) { _filtered = _applyFilters(); _renderAll(); _bindEvents(); }
          break;

        case 'maps-link':
          var mapLoc = el.dataset.loc;
          if (mapLoc) AppStore.incrementVisited(parseInt(mapLoc, 10));
          break;

        case 'page-prev':
          AppStore.set('page', Math.max(0, AppStore.get('page') - 1));
          _renderAll(); _bindEvents(); _scrollToResults();
          break;

        case 'page-next':
          var maxPg = Math.ceil(_filtered.length / _getPageSize()) - 1;
          AppStore.set('page', Math.min(maxPg, AppStore.get('page') + 1));
          _renderAll(); _bindEvents(); _scrollToResults();
          break;

        case 'page-go':
          AppStore.set('page', parseInt(value, 10));
          _renderAll(); _bindEvents(); _scrollToResults();
          break;
      }

      if (el.tagName !== 'A') e.preventDefault();
    });
    _cleanups.push(unsub);

    var unsubChange = DOM.delegate(_container, '[data-action="set-page-size"]', 'change', function (_e, el) {
      var newPageSize = parseInt(el.value, 10);
      if (PAGE_SIZE_OPTIONS.indexOf(newPageSize) === -1) return;
      AppStore.set('pageSize', newPageSize);
      AppStore.set('page', 0);
      _renderAll(); _bindEvents(); _scrollToResults();
    });
    _cleanups.push(unsubChange);
  }

  function _unbindEvents() {
    for (var i = 0; i < _cleanups.length; i++) {
      if (typeof _cleanups[i] === 'function') _cleanups[i]();
    }
    _cleanups = [];
  }

  function _refocusSearch() {
    var si = DOM.qs('#com-search-input', _container);
    if (si) { si.focus(); si.setSelectionRange(si.value.length, si.value.length); }
  }

  function _scrollToResults() {
    var el = DOM.qs('.com-results-bar', _container);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Public API ───────────────────────────────────────────

  function _checkHighlight() {
    var hl = AppStore.get('highlightCommerce');
    if (hl === undefined || hl === null) return;
    AppStore.set('highlightCommerce', null);

    // Find which page this commerce is on in current filtered results
    var page = -1;
    var pageSize = _getPageSize();
    for (var i = 0; i < _filtered.length; i++) {
      if (_filtered[i] === hl) { page = Math.floor(i / pageSize); break; }
    }
    if (page !== -1 && page !== AppStore.get('page')) {
      AppStore.set('page', page);
      _renderAll(); _bindEvents();
    }

    // After DOM settles, scroll + flash the row
    setTimeout(function() {
      var el = DOM.qs('[data-idx="' + hl + '"]', _container);
      if (el) {
        el.classList.add('com-row--highlight');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(function() { el.classList.remove('com-row--highlight'); }, 2500);
      }
    }, 60);
  }

  function init() {
    _container = DOM.qs('#comercios-content');
    if (!_container) return;

    _buildSearchIndex();

    // Count meaningful locations: must have ≥5 businesses and a clean name
    var _locCountsInit = {};
    for (var ii = 0; ii < RAW.d.length; ii++) {
      var _lid = RAW.d[ii][1];
      _locCountsInit[_lid] = (_locCountsInit[_lid] || 0) + 1;
    }
    _totalLocs = 0;
    for (var ji = 0; ji < RAW.l.length; ji++) {
      var _ln = RAW.l[ji] || '';
      if (!_ln || _ln.length < 3) continue;
      if (_ln.charAt(0) === '-' || _ln.charAt(0) === '_') continue;
      if (/\s{3,}/.test(_ln)) continue;
      if ((_locCountsInit[ji] || 0) >= 5) _totalLocs++;
    }

    // Preserve pending highlight navigation from dashboard (before reset)
    var _pendingHL = AppStore.get('highlightCommerce');
    var _pendingLoc = (_pendingHL != null) ? AppStore.get('loc') : -1;

    // Reset state
    AppStore.set('search', '');
    AppStore.set('rubro', -1);
    AppStore.set('loc', _pendingLoc !== -1 ? _pendingLoc : -1);
    AppStore.set('cat', -1);
    AppStore.set('page', 0);
    if (PAGE_SIZE_OPTIONS.indexOf(AppStore.get('pageSize')) === -1) {
      AppStore.set('pageSize', DEFAULT_PAGE_SIZE);
    }
    AppStore.set('showFavoritesOnly', false);
    AppStore.set('sort', 'relevance');
    _locDdOpen = false; _catDdOpen = false; _sortDdOpen = false;

    _renderAll();
    _bindEvents();
    _checkHighlight();

    // React to external favorite changes
    var unsubFavs = AppStore.subscribe('favorites', function () {
      if (AppStore.get('showFavoritesOnly')) {
        _filtered = _applyFilters();
        _renderAll(); _bindEvents();
      }
    });
    _cleanups.push(unsubFavs);
  }

  function refresh() {
    if (!_container) return;
    _buildSearchIndex();
    _renderAll();
    _bindEvents();
    _checkHighlight();
  }

  return { init: init, refresh: refresh };
})();
