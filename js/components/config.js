/**
 * config.js - Settings / Configuration Section Component (Premium Edition)
 * ATT Benefit Program Dashboard
 * Depends on: window.DOM, window.AppStore, window.I18N, window.NavComponent
 */
window.ConfigComponent = (() => {
  'use strict';

  /* ── SVG Icons ────────────────────────────────────────── */

  var ICONS = {
    palette: '<svg viewBox="0 0 24 24"><path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10a2 2 0 0 0 2-2c0-.5-.18-.96-.5-1.33-.3-.35-.5-.81-.5-1.33A2.33 2.33 0 0 1 15.33 15H17a5 5 0 0 0 5-5c0-4.42-4.03-8-10-8z"/><circle cx="7.5" cy="11.5" r="1.5"/><circle cx="10.5" cy="7.5" r="1.5"/><circle cx="14.5" cy="7.5" r="1.5"/><circle cx="17.5" cy="11.5" r="1.5"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
    headset: '<svg viewBox="0 0 24 24"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>',
    download: '<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
    upload: '<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    star: '<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    receipt: '<svg viewBox="0 0 24 24"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/></svg>',
    alertTriangle: '<svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    mail: '<svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
    hash: '<svg viewBox="0 0 24 24"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>',
    messageSquare: '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    users: '<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    tool: '<svg viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
    check: '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    externalLink: '<svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>'
  };

  /* ── Constants ─────────────────────────────────────────── */

  var SUBSECTIONS = [
    { id: 'interfaz', icon: 'palette', labelKey: 'interfaz' },
    { id: 'perfil',   icon: 'shield',  labelKey: 'perfil' },
    { id: 'idioma',   icon: 'globe',   labelKey: 'idioma' },
    { id: 'contacto', icon: 'headset', labelKey: 'contacto' }
  ];

  var CONTACTS = [
    {
      initials: 'PC',
      avatarIcon: 'users',
      name: 'People & Culture Team',
      role: 'HR Distribution List \u2014 AT&T Argentina',
      email: 'hr-argentina@att.com',
      teamsPin: 'hr-att-arg',
      teamsLink: 'msteams://l/chat/0/0?users=hr-argentina@att.com'
    },
    {
      initials: 'TS',
      avatarIcon: 'tool',
      name: 'Soporte TSI \u2014 Benefits App',
      role: 'Technical Support \u2014 AT&T TSI',
      email: 'tsi-support@att.com',
      teamsPin: 'tsi-benefits-support',
      teamsLink: 'msteams://l/chat/0/0?users=tsi-support@att.com'
    }
  ];

  /* ── Internal State ────────────────────────────────────── */

  var _activeTab = 'interfaz';
  var _cleanupFns = [];

  /* ── Helpers ───────────────────────────────────────────── */

  function t(key) {
    return window.I18N ? window.I18N.t(key) : key;
  }

  function getSettings() {
    return window.AppStore.get('settings') || { theme: 'dark', language: 'es' };
  }

  function currentTheme() {
    return document.documentElement.dataset.theme || 'dark';
  }

  function currentLang() {
    return window.I18N ? window.I18N.getLanguage() : 'es';
  }

  function icon(name) {
    return ICONS[name] || '';
  }

  /* ── Renderers ─────────────────────────────────────────── */

  function render() {
    var container = document.getElementById('config-content');
    if (!container) return;

    container.innerHTML = buildHTML();
    bindEvents(container);
  }

  function buildHTML() {
    return '<div class="cfg">' +
      buildSidebar() +
      '<div class="cfg__content">' +
        buildPanel('interfaz', buildInterfaz) +
        buildPanel('perfil', buildPerfil) +
        buildPanel('idioma', buildIdioma) +
        buildPanel('contacto', buildContacto) +
      '</div>' +
    '</div>';
  }

  /* -- Sidebar -- */

  function buildSidebar() {
    var html = '<div class="cfg__sidebar">';
    for (var i = 0; i < SUBSECTIONS.length; i++) {
      var s = SUBSECTIONS[i];
      var cls = 'cfg__sidebar-link' + (s.id === _activeTab ? ' active' : '');
      html += '<a class="' + cls + '" data-tab="' + s.id + '" href="#">' +
        '<span class="cfg__sidebar-icon">' + icon(s.icon) + '</span>' +
        '<span>' + t(s.labelKey) + '</span>' +
      '</a>';
    }
    html += '</div>';
    return html;
  }

  function buildPanel(id, builderFn) {
    var cls = 'cfg__panel' + (id === _activeTab ? ' active' : '');
    return '<div class="' + cls + '" data-panel="' + id + '">' + builderFn() + '</div>';
  }

  /* -- Interfaz (Theme) -- */

  function buildInterfaz() {
    var theme = currentTheme();
    var darkActive = theme !== 'light' ? ' active' : '';
    var lightActive = theme === 'light' ? ' active' : '';

    return '<h2 class="cfg__title">' + t('interfaz') + '</h2>' +
      '<p class="cfg__desc">Personaliza la apariencia visual del dashboard. El tema se guarda autom\u00e1ticamente.</p>' +
      '<div class="cfg__theme-cards">' +

        /* ── Dark card ── */
        '<div class="cfg__theme-card' + darkActive + '" data-action="set-theme" data-theme="dark">' +
          '<div class="cfg__theme-swatch" style="background:#07111B;padding:0;display:flex;flex-direction:row;align-items:stretch;overflow:hidden">' +
            '<div class="cfg__tm-nav" style="background:#0F1724;border-right:1px solid rgba(255,255,255,0.06)">' +
              '<div class="cfg__tm-logo" style="background:#1992FF"></div>' +
              '<div class="cfg__tm-navitem cfg__tm-navitem--active" style="background:rgba(25,146,255,0.12)">' +
                '<div class="cfg__tm-ni-dot" style="background:#1992FF"></div>' +
                '<div class="cfg__tm-ni-bar" style="background:#1992FF;opacity:0.7"></div>' +
              '</div>' +
              '<div class="cfg__tm-navitem">' +
                '<div class="cfg__tm-ni-dot" style="background:rgba(255,255,255,0.18)"></div>' +
                '<div class="cfg__tm-ni-bar" style="background:rgba(255,255,255,0.10)"></div>' +
              '</div>' +
              '<div class="cfg__tm-navitem">' +
                '<div class="cfg__tm-ni-dot" style="background:rgba(255,255,255,0.18)"></div>' +
                '<div class="cfg__tm-ni-bar" style="background:rgba(255,255,255,0.10)"></div>' +
              '</div>' +
            '</div>' +
            '<div class="cfg__tm-body">' +
              '<div class="cfg__tm-hdr" style="background:rgba(255,255,255,0.08)"></div>' +
              '<div class="cfg__tm-card" style="background:#0F1724;border:1px solid rgba(255,255,255,0.07)">' +
                '<div class="cfg__tm-bar" style="background:rgba(255,255,255,0.10);width:55%"></div>' +
                '<div class="cfg__tm-progress-wrap" style="background:rgba(255,255,255,0.05)">' +
                  '<div class="cfg__tm-progress-fill" style="background:#1992FF;width:30%"></div>' +
                '</div>' +
              '</div>' +
              '<div class="cfg__tm-stats">' +
                '<div class="cfg__tm-stat" style="background:#0F1724;border:1px solid rgba(255,255,255,0.07)"></div>' +
                '<div class="cfg__tm-stat" style="background:#0F1724;border:1px solid rgba(255,255,255,0.07)"></div>' +
                '<div class="cfg__tm-stat" style="background:#0F1724;border:1px solid rgba(255,255,255,0.07)"></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="cfg__theme-label">Oscuro</div>' +
        '</div>' +

        /* ── Light card ── */
        '<div class="cfg__theme-card' + lightActive + '" data-action="set-theme" data-theme="light">' +
          '<div class="cfg__theme-swatch" style="background:#e8edf4;padding:0;display:flex;flex-direction:row;align-items:stretch;overflow:hidden">' +
            '<div class="cfg__tm-nav" style="background:#ffffff;border-right:1px solid rgba(0,0,0,0.09)">' +
              '<div class="cfg__tm-logo" style="background:#1992FF"></div>' +
              '<div class="cfg__tm-navitem cfg__tm-navitem--active" style="background:rgba(25,146,255,0.10)">' +
                '<div class="cfg__tm-ni-dot" style="background:#1992FF"></div>' +
                '<div class="cfg__tm-ni-bar" style="background:#1992FF;opacity:0.6"></div>' +
              '</div>' +
              '<div class="cfg__tm-navitem">' +
                '<div class="cfg__tm-ni-dot" style="background:rgba(0,0,0,0.15)"></div>' +
                '<div class="cfg__tm-ni-bar" style="background:rgba(0,0,0,0.09)"></div>' +
              '</div>' +
              '<div class="cfg__tm-navitem">' +
                '<div class="cfg__tm-ni-dot" style="background:rgba(0,0,0,0.15)"></div>' +
                '<div class="cfg__tm-ni-bar" style="background:rgba(0,0,0,0.09)"></div>' +
              '</div>' +
            '</div>' +
            '<div class="cfg__tm-body">' +
              '<div class="cfg__tm-hdr" style="background:rgba(0,0,0,0.09)"></div>' +
              '<div class="cfg__tm-card" style="background:#ffffff;border:1px solid rgba(0,0,0,0.10)">' +
                '<div class="cfg__tm-bar" style="background:rgba(0,0,0,0.09);width:55%"></div>' +
                '<div class="cfg__tm-progress-wrap" style="background:rgba(0,0,0,0.07)">' +
                  '<div class="cfg__tm-progress-fill" style="background:#1992FF;width:30%"></div>' +
                '</div>' +
              '</div>' +
              '<div class="cfg__tm-stats">' +
                '<div class="cfg__tm-stat" style="background:#ffffff;border:1px solid rgba(0,0,0,0.10)"></div>' +
                '<div class="cfg__tm-stat" style="background:#ffffff;border:1px solid rgba(0,0,0,0.10)"></div>' +
                '<div class="cfg__tm-stat" style="background:#ffffff;border:1px solid rgba(0,0,0,0.10)"></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="cfg__theme-label">Claro</div>' +
        '</div>' +

      '</div>';
  }

  /* -- Perfil (Data Management) -- */

  function buildPerfil() {
    var settings = getSettings();
    var favCount = (window.AppStore.get('favorites') || []).length;
    var expCount = (window.AppStore.get('expenses') || []).length;
    var lastExport = settings.lastExport || '';

    var html = '<h2 class="cfg__title">' + escH('Gesti\u00f3n de Datos') + '</h2>' +
      '<p class="cfg__desc">Exporta e importa tu perfil completo: favoritos, gastos, configuraci\u00f3n visual e idioma.</p>' +

      /* Stats */
      '<div class="cfg__stats">' +
        '<div class="cfg__stat">' +
          '<div class="cfg__stat-icon">' + icon('star') + '</div>' +
          '<span class="cfg__stat-num">' + favCount + '</span>' +
          '<span class="cfg__stat-label">Favoritos guardados</span>' +
        '</div>' +
        '<div class="cfg__stat">' +
          '<div class="cfg__stat-icon">' + icon('receipt') + '</div>' +
          '<span class="cfg__stat-num">' + expCount + '</span>' +
          '<span class="cfg__stat-label">Gastos registrados</span>' +
        '</div>' +
      '</div>' +

      /* Buttons */
      '<div class="cfg__btn-row">' +
        '<button class="cfg__btn cfg__btn--accent" data-action="export">' +
          '<span class="cfg__btn-icon">' + icon('download') + '</span>' +
          t('exportar') + ' (JSON)' +
        '</button>' +
        '<button class="cfg__btn" data-action="import-trigger">' +
          '<span class="cfg__btn-icon">' + icon('upload') + '</span>' +
          t('importar') + ' (JSON)' +
        '</button>' +
      '</div>' +
      '<input type="file" accept=".json" class="cfg__file-input" data-ref="import-file" />';

    if (lastExport) {
      html += '<div class="cfg__last-export">' +
        '<span class="cfg__btn-icon">' + icon('clock') + '</span>' +
        '\u00DAltima exportaci\u00f3n: ' + escH(lastExport) +
      '</div>';
    }

    /* Danger zone */
    html += '<div class="cfg__danger-zone">' +
      '<div class="cfg__danger-zone-header">' +
        '<span class="cfg__danger-zone-icon">' + icon('alertTriangle') + '</span>' +
        '<div class="cfg__danger-zone-title">Zona de peligro</div>' +
      '</div>' +
      '<p class="cfg__danger-zone-desc">Esta acci\u00f3n eliminar\u00e1 todos tus datos guardados de forma permanente. No se puede deshacer.</p>' +
      '<button class="cfg__btn cfg__btn--danger" data-action="clear-all">' +
        '<span class="cfg__btn-icon">' + icon('trash') + '</span>' +
        'Borrar todos los datos' +
      '</button>' +
    '</div>';

    return html;
  }

  /* -- Idioma (Language) -- */

  function buildIdioma() {
    var lang = currentLang();
    var esActive = lang === 'es' ? ' active' : '';
    var enActive = lang === 'en' ? ' active' : '';

    return '<h2 class="cfg__title">Idioma de la interfaz</h2>' +
      '<p class="cfg__desc">Selecciona el idioma para la interfaz del dashboard. Los nombres de comercios se mantienen en su idioma original.</p>' +
      '<div class="cfg__lang-options">' +
        '<button class="cfg__lang-btn' + esActive + '" data-action="set-lang" data-lang="es">' +
          '<span class="cfg__lang-flag">\uD83C\uDDE6\uD83C\uDDF7</span>' +
          '<div class="cfg__lang-info">' +
            '<span class="cfg__lang-name">Espa\u00f1ol</span>' +
            '<span class="cfg__lang-detail">Interfaz en castellano rioplatense</span>' +
          '</div>' +
          '<span class="cfg__lang-radio"></span>' +
        '</button>' +
        '<button class="cfg__lang-btn' + enActive + '" data-action="set-lang" data-lang="en">' +
          '<span class="cfg__lang-flag">\uD83C\uDDFA\uD83C\uDDF8</span>' +
          '<div class="cfg__lang-info">' +
            '<span class="cfg__lang-name">English</span>' +
            '<span class="cfg__lang-detail">Interface in American English</span>' +
          '</div>' +
          '<span class="cfg__lang-radio"></span>' +
        '</button>' +
      '</div>' +
      '<div class="cfg__lang-note">' +
        '<span class="cfg__btn-icon">' + icon('info') + '</span>' +
        '<span>Algunos contenidos como nombres de comercios se mantienen en su idioma original.</span>' +
      '</div>';
  }

  /* -- Contacto -- */

  function buildContacto() {
    var html = '<h2 class="cfg__title">Soporte y Contacto</h2>' +
      '<p class="cfg__desc">Contacta al equipo de soporte para consultas sobre beneficios o problemas t\u00e9cnicos.</p>' +
      '<div class="cfg__contact-cards">';

    for (var i = 0; i < CONTACTS.length; i++) {
      var c = CONTACTS[i];
      html += '<div class="cfg__contact-card">' +
        '<div class="cfg__contact-avatar">' + icon(c.avatarIcon) + '</div>' +
        '<div class="cfg__contact-body">' +
          '<div class="cfg__contact-name">' + escH(c.name) + '</div>' +
          '<div class="cfg__contact-role">' + escH(c.role) + '</div>' +
          '<div class="cfg__contact-rows">' +
            '<div class="cfg__contact-row">' +
              '<span class="cfg__contact-row-icon">' + icon('mail') + '</span>' +
              '<span class="cfg__contact-row-label">' + t('email') + '</span>' +
              '<a href="mailto:' + escH(c.email) + '">' + escH(c.email) + '</a>' +
            '</div>' +
            '<div class="cfg__contact-row">' +
              '<span class="cfg__contact-row-icon">' + icon('hash') + '</span>' +
              '<span class="cfg__contact-row-label">' + t('pin_teams') + '</span>' +
              '<span>' + escH(c.teamsPin) + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="cfg__contact-actions">' +
            '<a class="cfg__contact-link cfg__contact-link--teams" href="' + escH(c.teamsLink) + '" target="_blank" rel="noopener">' +
              '<span class="cfg__contact-link-icon">' + icon('messageSquare') + '</span>' +
              t('abrir_teams') +
            '</a>' +
            '<a class="cfg__contact-link cfg__contact-link--email" href="mailto:' + escH(c.email) + '">' +
              '<span class="cfg__contact-link-icon">' + icon('mail') + '</span>' +
              'Email' +
            '</a>' +
          '</div>' +
        '</div>' +
      '</div>';
    }

    html += '</div>';
    return html;
  }

  /* ── Escape shorthand ──────────────────────────────────── */

  function escH(s) {
    return window.DOM.escapeHtml(s);
  }

  /* ── Event Binding ─────────────────────────────────────── */

  function bindEvents(root) {
    // Clean up previous listeners
    for (var i = 0; i < _cleanupFns.length; i++) {
      _cleanupFns[i]();
    }
    _cleanupFns = [];

    // Tab switching
    _cleanupFns.push(
      window.DOM.delegate(root, '[data-tab]', 'click', function (e, el) {
        e.preventDefault();
        var tab = el.dataset.tab;
        if (tab && tab !== _activeTab) {
          _activeTab = tab;
          activateTab(root);
        }
      })
    );

    // Theme selection
    _cleanupFns.push(
      window.DOM.delegate(root, '[data-action="set-theme"]', 'click', function (e, el) {
        var theme = el.dataset.theme;
        if (!theme) return;
        applyTheme(theme);
        updateThemeCards(root, theme);
      })
    );

    // Language selection
    _cleanupFns.push(
      window.DOM.delegate(root, '[data-action="set-lang"]', 'click', function (e, el) {
        var lang = el.dataset.lang;
        if (!lang) return;
        applyLanguage(lang);
      })
    );

    // Export
    _cleanupFns.push(
      window.DOM.delegate(root, '[data-action="export"]', 'click', function () {
        doExport();
      })
    );

    // Import trigger
    _cleanupFns.push(
      window.DOM.delegate(root, '[data-action="import-trigger"]', 'click', function () {
        var fileInput = window.DOM.qs('[data-ref="import-file"]', root);
        if (fileInput) fileInput.click();
      })
    );

    // File selected
    var fileInput = window.DOM.qs('[data-ref="import-file"]', root);
    if (fileInput) {
      var onFile = function () { doImport(fileInput); };
      fileInput.addEventListener('change', onFile);
      _cleanupFns.push(function () {
        fileInput.removeEventListener('change', onFile);
      });
    }

    // Clear all data
    _cleanupFns.push(
      window.DOM.delegate(root, '[data-action="clear-all"]', 'click', function (e, el) {
        if (el.dataset.confirmed !== 'true') {
          el.innerHTML = '<span class="cfg__btn-icon">' + icon('alertTriangle') + '</span> \u00BFConfirmar? Haz clic de nuevo';
          el.dataset.confirmed = 'true';
          setTimeout(function () {
            el.innerHTML = '<span class="cfg__btn-icon">' + icon('trash') + '</span> Borrar todos los datos';
            delete el.dataset.confirmed;
          }, 3000);
          return;
        }
        doClearAll();
      })
    );
  }

  /* ── Actions ───────────────────────────────────────────── */

  function activateTab(root) {
    // Update sidebar links
    var links = window.DOM.qsa('.cfg__sidebar-link', root);
    for (var i = 0; i < links.length; i++) {
      links[i].classList.toggle('active', links[i].dataset.tab === _activeTab);
    }
    // Update panels
    var panels = window.DOM.qsa('.cfg__panel', root);
    for (var j = 0; j < panels.length; j++) {
      var isActive = panels[j].dataset.panel === _activeTab;
      panels[j].classList.toggle('active', isActive);
      // Re-trigger animation
      if (isActive) {
        panels[j].style.animation = 'none';
        panels[j].offsetHeight; // reflow
        panels[j].style.animation = '';
      }
    }
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    var settings = getSettings();
    settings.theme = theme;
    window.AppStore.set('settings', settings);
    // Nav no longer has theme toggle
  }

  function updateThemeCards(root, theme) {
    var cards = window.DOM.qsa('.cfg__theme-card', root);
    for (var i = 0; i < cards.length; i++) {
      cards[i].classList.toggle('active', cards[i].dataset.theme === theme);
    }
  }

  function applyLanguage(lang) {
    if (window.I18N) window.I18N.setLanguage(lang);
    var settings = getSettings();
    settings.language = lang;
    window.AppStore.set('settings', settings);
    if (window.NavComponent && window.NavComponent.updateLabels) {
      window.NavComponent.updateLabels();
    }
    // Re-render config to reflect language change
    render();
  }

  function doExport() {
    try {
      var json = window.AppStore.exportAll();
      var blob = new Blob([json], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      var dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = 'att-benefits-backup-' + dateStr + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Store last export date
      var settings = getSettings();
      settings.lastExport = dateStr;
      window.AppStore.set('settings', settings);

      window.DOM.toast(t('datos_exportados'), 'success');
    } catch (err) {
      window.DOM.toast(t('error') + ': ' + err.message, 'error');
    }
  }

  function doImport(fileInput) {
    var file = fileInput.files && fileInput.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function (e) {
      var text = e.target.result;
      try {
        // Validate JSON first
        JSON.parse(text);
      } catch (parseErr) {
        window.DOM.toast(t('error_importar') + ': JSON inv\u00e1lido', 'error');
        fileInput.value = '';
        return;
      }

      var result = window.AppStore.importAll(text);
      if (result.success) {
        window.DOM.toast(t('datos_importados'), 'success');
        // Apply imported settings
        var settings = getSettings();
        if (settings.theme) {
          document.documentElement.dataset.theme = settings.theme;
        }
        if (settings.language && window.I18N) {
          window.I18N.setLanguage(settings.language);
        }
        if (window.NavComponent) {
          if (window.NavComponent.updateLabels) window.NavComponent.updateLabels();
        }
        // Re-render
        render();
      } else {
        window.DOM.toast(t('error_importar') + ': ' + (result.error || ''), 'error');
      }
      fileInput.value = '';
    };
    reader.onerror = function () {
      window.DOM.toast(t('error_importar'), 'error');
      fileInput.value = '';
    };
    reader.readAsText(file);
  }

  function doClearAll() {
    // Reset persisted keys to defaults
    window.AppStore.set('favorites', []);
    window.AppStore.set('expenses', []);
    window.AppStore.set('recentSearches', []);
    window.AppStore.set('visitedLocations', {});
    window.AppStore.set('settings', { theme: 'dark', language: 'es', view: 'normal' });
    window.AppStore.set('monthlyBudget', 210000);

    // Apply defaults
    document.documentElement.dataset.theme = 'dark';
    if (window.I18N) window.I18N.setLanguage('es');
    if (window.NavComponent) {
      if (window.NavComponent.updateLabels) window.NavComponent.updateLabels();
      if (window.NavComponent.render) window.NavComponent.render();
    }

    window.DOM.toast('Datos borrados correctamente', 'success');
    render();
  }

  /* ── Public API ────────────────────────────────────────── */

  function init() {
    render();
  }

  function refresh() {
    render();
  }

  return {
    init: init,
    refresh: refresh
  };
})();
