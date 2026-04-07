/**
 * @file store.js
 * @description Centralized pub/sub state management for the AT&T Benefits Dashboard.
 * Provides reactive state with localStorage persistence.
 * Depends on: window.Storage (js/utils/storage.js)
 * Exposes window.AppStore as a global module.
 * Zero external dependencies - loaded via script tag.
 */

window.AppStore = (() => {
  'use strict';

  /**
   * Internal state object. Never exposed directly; accessed via get/set.
   * @type {Object}
   */
  var _state = {
    currentRoute: 'dashboard',

    // Comercios filters
    search: '',
    rubro: -1,
    loc: -1,
    cat: -1,
    page: 0,
    view: 'normal',
    filtered: [],
    showFavoritesOnly: false,

    // User data
    favorites: [],
    recentSearches: [],
    visitedLocations: {},

    // Expenses
    expenses: [],

    // Settings
    settings: { theme: 'dark', language: 'es', view: 'normal' },
    monthlyBudget: 210000
  };

  /**
   * Map of state keys to arrays of subscriber functions.
   * @type {Map<string, function[]>}
   */
  var _listeners = new Map();

  /**
   * Keys that are persisted to localStorage.
   * Volatile keys like search, filtered, page, etc. are NOT persisted.
   * @constant {string[]}
   */
  var PERSISTED_KEYS = [
    'favorites',
    'recentSearches',
    'visitedLocations',
    'expenses',
    'settings',
    'monthlyBudget'
  ];

  // ── Core API ──────────────────────────────────────────────

  /**
   * Get a state value by key.
   * @param {string} key - State key
   * @returns {*} The current value, or undefined if key does not exist
   */
  function get(key) {
    if (_state.hasOwnProperty(key)) {
      return _state[key];
    }
    return undefined;
  }

  /**
   * Set a state value and notify subscribers.
   * Persists to localStorage if the key is in PERSISTED_KEYS.
   * @param {string} key - State key
   * @param {*} value - New value
   */
  function set(key, value) {
    var oldValue = _state[key];
    _state[key] = value;
    _notify(key, value, oldValue);
    _persistIfNeeded(key, value);
  }

  /**
   * Get a shallow copy of the entire state.
   * @returns {Object} State snapshot
   */
  function getState() {
    return Object.assign({}, _state);
  }

  /**
   * Subscribe to changes on a specific state key.
   * The callback receives (newValue, oldValue, key).
   * @param {string} key - State key to observe
   * @param {function(*, *, string): void} fn - Subscriber callback
   * @returns {function(): void} Unsubscribe function
   */
  function subscribe(key, fn) {
    if (typeof fn !== 'function') {
      return function () {};
    }

    if (!_listeners.has(key)) {
      _listeners.set(key, []);
    }
    _listeners.get(key).push(fn);

    return function () {
      var arr = _listeners.get(key);
      if (arr) {
        var idx = arr.indexOf(fn);
        if (idx !== -1) {
          arr.splice(idx, 1);
        }
      }
    };
  }

  /**
   * Notify all subscribers of a key change.
   * @param {string} key - Changed key
   * @param {*} newValue - New value
   * @param {*} oldValue - Previous value
   * @private
   */
  function _notify(key, newValue, oldValue) {
    var arr = _listeners.get(key);
    if (!arr) return;
    for (var i = 0; i < arr.length; i++) {
      try {
        arr[i](newValue, oldValue, key);
      } catch (_e) {
        // Prevent one bad listener from breaking others
      }
    }
  }

  /**
   * Persist a key to localStorage if it is a persisted key.
   * @param {string} key - State key
   * @param {*} value - Value to persist
   * @private
   */
  function _persistIfNeeded(key, value) {
    if (PERSISTED_KEYS.indexOf(key) !== -1 && window.Storage) {
      window.Storage.save(key, value);
    }
  }

  // ── Favorites ─────────────────────────────────────────────

  /**
   * Add a commerce index to favorites.
   * @param {number} idx - Index into the RAW.d data array
   */
  function addFavorite(idx) {
    var favs = _state.favorites.slice();
    if (favs.indexOf(idx) === -1) {
      favs.push(idx);
      set('favorites', favs);
    }
  }

  /**
   * Remove a commerce index from favorites.
   * @param {number} idx - Index into the RAW.d data array
   */
  function removeFavorite(idx) {
    var favs = _state.favorites.slice();
    var pos = favs.indexOf(idx);
    if (pos !== -1) {
      favs.splice(pos, 1);
      set('favorites', favs);
    }
  }

  /**
   * Check if a commerce index is in favorites.
   * @param {number} idx - Index into the RAW.d data array
   * @returns {boolean} True if favorited
   */
  function isFavorite(idx) {
    return _state.favorites.indexOf(idx) !== -1;
  }

  // ── Expenses ──────────────────────────────────────────────

  /**
   * Add an expense record.
   * @param {{ name: string, amount: number, date: string, category?: string }} expense
   *   Expense object. An `id` will be generated automatically.
   */
  function addExpense(expense) {
    if (!expense || typeof expense.amount !== 'number') return;

    var record = Object.assign({}, expense, {
      id: Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      date: expense.date || new Date().toISOString().slice(0, 10)
    });

    var list = _state.expenses.slice();
    list.push(record);
    set('expenses', list);
  }

  /**
   * Remove an expense by its ID.
   * @param {string} id - Expense ID
   */
  function removeExpense(id) {
    var list = _state.expenses.filter(function (e) {
      return e.id !== id;
    });
    if (list.length !== _state.expenses.length) {
      set('expenses', list);
    }
  }

  /**
   * Get all expenses for a given year and month.
   * @param {number} year - Full year (e.g. 2026)
   * @param {number} month - Month 1-12
   * @returns {Object[]} Filtered expense records
   */
  function getMonthExpenses(year, month) {
    var prefix = year + '-' + String(month).padStart(2, '0');
    return _state.expenses.filter(function (e) {
      return e.date && e.date.indexOf(prefix) === 0;
    });
  }

  /**
   * Get total amount spent in a given month.
   * @param {number} year - Full year
   * @param {number} month - Month 1-12
   * @returns {number} Total spent
   */
  function getMonthlySpent(year, month) {
    var monthExpenses = getMonthExpenses(year, month);
    var total = 0;
    for (var i = 0; i < monthExpenses.length; i++) {
      total += monthExpenses[i].amount || 0;
    }
    return total;
  }

  /**
   * Get the remaining budget for a given month.
   * @param {number} year - Full year
   * @param {number} month - Month 1-12
   * @returns {number} Remaining budget (can be negative if overspent)
   */
  function getRemainingBudget(year, month) {
    return _state.monthlyBudget - getMonthlySpent(year, month);
  }

  // ── Recent Searches ───────────────────────────────────────

  /**
   * Add a search term to recent searches. Keeps only the last 3 unique terms.
   * @param {string} term - Search term
   */
  function addRecentSearch(term) {
    if (!term || typeof term !== 'string') return;
    var trimmed = term.trim();
    if (!trimmed) return;

    var searches = _state.recentSearches.slice();
    // Remove if already exists (will re-add at front)
    var existingIdx = searches.indexOf(trimmed);
    if (existingIdx !== -1) {
      searches.splice(existingIdx, 1);
    }
    searches.unshift(trimmed);
    // Keep only last 3
    if (searches.length > 3) {
      searches = searches.slice(0, 3);
    }
    set('recentSearches', searches);
  }

  // ── Visited Locations ─────────────────────────────────────

  /**
   * Increment the visit count for a location.
   * @param {number|string} locId - Location identifier
   */
  function incrementVisited(locId) {
    var visited = Object.assign({}, _state.visitedLocations);
    var key = String(locId);
    visited[key] = (visited[key] || 0) + 1;
    set('visitedLocations', visited);
  }

  // ── Persistence ───────────────────────────────────────────

  /**
   * Load persisted data from localStorage into state.
   * Merges loaded data with defaults (loaded values take priority).
   */
  function loadFromStorage() {
    if (!window.Storage) return;

    try {
      var data = window.Storage.load();
      for (var i = 0; i < PERSISTED_KEYS.length; i++) {
        var key = PERSISTED_KEYS[i];
        if (data.hasOwnProperty(key) && data[key] !== undefined) {
          _state[key] = data[key];
        }
      }
    } catch (_e) {
      // Use defaults on error
    }
  }

  /**
   * Save all persisted state keys to localStorage.
   */
  function saveToStorage() {
    if (!window.Storage) return;

    var data = {};
    for (var i = 0; i < PERSISTED_KEYS.length; i++) {
      var key = PERSISTED_KEYS[i];
      data[key] = _state[key];
    }
    window.Storage.saveAll(data);
  }

  /**
   * Export all persisted data as a JSON string.
   * Includes a version and timestamp for portability.
   * @returns {string} JSON string of exportable data
   */
  function exportAll() {
    var data = { _version: 1 };
    for (var i = 0; i < PERSISTED_KEYS.length; i++) {
      var key = PERSISTED_KEYS[i];
      data[key] = _state[key];
    }
    data._exportedAt = new Date().toISOString();
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import data from a JSON string. Validates and loads into state.
   * @param {string} jsonString - JSON string to import
   * @returns {{ success: boolean, error?: string }} Result of the import
   */
  function importAll(jsonString) {
    try {
      if (!jsonString || typeof jsonString !== 'string') {
        return { success: false, error: 'Invalid input' };
      }

      var data = JSON.parse(jsonString);

      if (!data || typeof data !== 'object') {
        return { success: false, error: 'Invalid data format' };
      }

      // Version check
      var version = typeof data._version === 'number' ? data._version : 0;
      if (version > 1) {
        return { success: false, error: 'Unsupported data version: ' + version };
      }

      // Load valid persisted keys into state
      for (var i = 0; i < PERSISTED_KEYS.length; i++) {
        var key = PERSISTED_KEYS[i];
        if (data.hasOwnProperty(key)) {
          _state[key] = data[key];
          _notify(key, _state[key], undefined);
        }
      }

      saveToStorage();
      return { success: true };
    } catch (e) {
      return { success: false, error: 'JSON parse error: ' + e.message };
    }
  }

  // ── Auto-initialize ───────────────────────────────────────
  // Load persisted data immediately on creation
  loadFromStorage();

  // Apply language setting if I18N is available
  if (_state.settings && _state.settings.language && window.I18N) {
    window.I18N.setLanguage(_state.settings.language);
  }

  // Public API
  return {
    get: get,
    set: set,
    getState: getState,
    subscribe: subscribe,

    addFavorite: addFavorite,
    removeFavorite: removeFavorite,
    isFavorite: isFavorite,

    addExpense: addExpense,
    removeExpense: removeExpense,
    getMonthExpenses: getMonthExpenses,
    getMonthlySpent: getMonthlySpent,
    getRemainingBudget: getRemainingBudget,

    addRecentSearch: addRecentSearch,
    incrementVisited: incrementVisited,

    loadFromStorage: loadFromStorage,
    saveToStorage: saveToStorage,
    exportAll: exportAll,
    importAll: importAll
  };
})();
