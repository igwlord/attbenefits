/**
 * @file router.js
 * @description Hash-based SPA router for the AT&T Benefits Dashboard.
 * Manages navigation between sections: dashboard, comercios, gastos, config.
 * Exposes window.AppRouter as a global module.
 * Zero dependencies - loaded via script tag.
 */

window.AppRouter = (() => {
  'use strict';

  /**
   * Valid route names mapped to their section element IDs.
   * @constant {Object.<string, string>}
   */
  const ROUTES = {
    dashboard:  'section-dashboard',
    comercios:  'section-comercios',
    gastos:     'section-gastos',
    config:     'section-config'
  };

  /** @constant {string} DEFAULT_ROUTE - Fallback route when hash is empty or invalid */
  const DEFAULT_ROUTE = 'dashboard';

  /** @type {string} Currently active route */
  var _currentRoute = DEFAULT_ROUTE;

  /** @type {function[]} Registered route change callbacks */
  var _changeCallbacks = [];

  /**
   * Optional per-route onEnter callbacks.
   * @type {Object.<string, function[]>}
   */
  var _onEnterCallbacks = {
    dashboard: [],
    comercios: [],
    gastos: [],
    config: []
  };

  /**
   * Extract the route name from the current window hash.
   * @returns {string} Route name or DEFAULT_ROUTE
   */
  function _getRouteFromHash() {
    var hash = window.location.hash.replace(/^#\/?/, '').toLowerCase().trim();
    return ROUTES.hasOwnProperty(hash) ? hash : DEFAULT_ROUTE;
  }

  /**
   * Show the section for the given route and hide all others.
   * Also updates the active state on nav links.
   * @param {string} route - Route name to activate
   */
  function _activateRoute(route) {
    // Show/hide sections
    var routeNames = Object.keys(ROUTES);
    for (var i = 0; i < routeNames.length; i++) {
      var name = routeNames[i];
      var section = document.getElementById(ROUTES[name]);
      if (section) {
        if (name === route) {
          section.classList.remove('fade-hide');
          section.classList.add('fade-show');
        } else {
          section.classList.remove('fade-show');
          section.classList.add('fade-hide');
        }
      }
    }

    // Update nav active state
    var navLinks = document.querySelectorAll('[data-route]');
    for (var n = 0; n < navLinks.length; n++) {
      var link = navLinks[n];
      if (link.getAttribute('data-route') === route) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    }
  }

  /**
   * Fire onEnter callbacks for a route and general route change callbacks.
   * @param {string} route - The route being entered
   * @param {string} previousRoute - The route being left
   */
  function _fireCallbacks(route, previousRoute) {
    // Fire onEnter callbacks for the specific route
    var enters = _onEnterCallbacks[route];
    if (enters) {
      for (var i = 0; i < enters.length; i++) {
        try {
          enters[i](route, previousRoute);
        } catch (_e) {
          // Prevent one bad callback from breaking others
        }
      }
    }

    // Fire general route change callbacks
    for (var c = 0; c < _changeCallbacks.length; c++) {
      try {
        _changeCallbacks[c](route, previousRoute);
      } catch (_e) {
        // Prevent one bad callback from breaking others
      }
    }
  }

  /**
   * Handle a route change (from hashchange or programmatic navigation).
   */
  function _handleRouteChange() {
    var newRoute = _getRouteFromHash();
    var previousRoute = _currentRoute;

    if (newRoute === _currentRoute) {
      // Still activate the route (handles initial load)
      _activateRoute(newRoute);
      return;
    }

    _currentRoute = newRoute;
    _activateRoute(newRoute);
    _fireCallbacks(newRoute, previousRoute);

    // Sync with AppStore if available
    if (window.AppStore && typeof window.AppStore.set === 'function') {
      window.AppStore.set('currentRoute', newRoute);
    }
  }

  /**
   * Navigate to a specific route.
   * Updates the hash, which triggers the hashchange handler.
   * @param {string} route - Route name to navigate to
   */
  function navigate(route) {
    if (!ROUTES.hasOwnProperty(route)) {
      route = DEFAULT_ROUTE;
    }
    window.location.hash = '#/' + route;
  }

  /**
   * Get the currently active route name.
   * @returns {string} Current route name
   */
  function getCurrentRoute() {
    return _currentRoute;
  }

  /**
   * Register a callback to be called on any route change.
   * @param {function(string, string): void} callback - Receives (newRoute, previousRoute)
   * @returns {function(): void} Unsubscribe function
   */
  function onRouteChange(callback) {
    if (typeof callback !== 'function') {
      return function () {};
    }
    _changeCallbacks.push(callback);
    return function () {
      var idx = _changeCallbacks.indexOf(callback);
      if (idx !== -1) {
        _changeCallbacks.splice(idx, 1);
      }
    };
  }

  /**
   * Register an onEnter callback for a specific route.
   * Called every time the route is entered.
   * @param {string} route - Route name
   * @param {function(string, string): void} callback - Receives (route, previousRoute)
   * @returns {function(): void} Unsubscribe function
   */
  function onEnter(route, callback) {
    if (!_onEnterCallbacks.hasOwnProperty(route) || typeof callback !== 'function') {
      return function () {};
    }
    _onEnterCallbacks[route].push(callback);
    return function () {
      var idx = _onEnterCallbacks[route].indexOf(callback);
      if (idx !== -1) {
        _onEnterCallbacks[route].splice(idx, 1);
      }
    };
  }

  // ── Initialization ────────────────────────────────────────

  /** @type {boolean} Whether init() has been called */
  var _initialized = false;

  /**
   * Initialize the router. Must be called after registering callbacks.
   * Sets up hashchange listener and handles the initial route.
   */
  function init() {
    if (_initialized) return;
    _initialized = true;

    // Listen for hash changes
    window.addEventListener('hashchange', _handleRouteChange);

    // Handle initial route
    var initialRoute = _getRouteFromHash();
    _currentRoute = initialRoute;
    _activateRoute(initialRoute);
    _fireCallbacks(initialRoute, '');
  }

  // Public API
  return {
    init: init,
    navigate: navigate,
    getCurrentRoute: getCurrentRoute,
    onRouteChange: onRouteChange,
    onEnter: onEnter
  };
})();
