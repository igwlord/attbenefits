/**
 * nav.js — Top Navigation Bar Component
 * ATT Benefit Program Dashboard
 * Zero dependencies
 */
window.NavComponent = (() => {
  'use strict';

  const NAV_ITEMS = [
    { route: 'dashboard', icon: 'dashboard', labelKey: 'dashboard' },
    { route: 'comercios', icon: 'store',     labelKey: 'comercios' },
    { route: 'gastos',    icon: 'peso',       labelKey: 'gastos' },
    { route: 'config',    icon: 'settings',   labelKey: 'configuracion' }
  ];

  /** SVG icons (inline, no dependencies) */
  const ICONS = {
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    store: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    peso: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>'
  };

  /** Render the navigation bar */
  function render() {
    const nav = document.getElementById('top-nav');
    if (!nav) return;

    // Add the CSS class to the header element
    nav.classList.add('nav');

    const t = window.I18N ? window.I18N.t.bind(window.I18N) : (k) => k;
    const currentRoute = window.AppRouter ? window.AppRouter.getCurrentRoute() : 'dashboard';

    nav.innerHTML = `
      <div class="nav__brand">
        <div class="nav__logo">AT</div>
        <span class="nav__title">Benefits</span>
      </div>
      <nav class="nav__items" role="navigation" aria-label="Navegaci\u00f3n principal">
        ${NAV_ITEMS.map(item => `
          <a class="nav__item${currentRoute === item.route ? ' active' : ''}"
             href="#${item.route}"
             data-route="${item.route}"
             role="tab"
             aria-selected="${currentRoute === item.route}"
             aria-label="${t(item.labelKey)}">
            <span class="nav__item-icon">${ICONS[item.icon]}</span>
            <span class="nav__item-label">${t(item.labelKey)}</span>
          </a>
        `).join('')}
      </nav>
      <div class="nav__actions">
        <a href="#config" class="nav__avatar" aria-label="Configuración" title="Configuración">
          <span>U</span>
        </a>
      </div>
    `;

  }

  /** Update active state of nav items */
  function updateActive(route) {
    const items = document.querySelectorAll('.nav__item');
    items.forEach(item => {
      const isActive = item.dataset.route === route;
      item.classList.toggle('active', isActive);
      item.setAttribute('aria-selected', String(isActive));
    });
  }

  /** Re-render labels (for language change) */
  function updateLabels() {
    const t = window.I18N ? window.I18N.t.bind(window.I18N) : (k) => k;
    NAV_ITEMS.forEach(item => {
      const el = document.querySelector(`.nav__item[data-route="${item.route}"] .nav__item-label`);
      if (el) el.textContent = t(item.labelKey);
    });
  }

  return { render, updateActive, updateLabels };
})();
