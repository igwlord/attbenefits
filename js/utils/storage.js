/**
 * @file storage.js
 * @description localStorage abstraction with schema versioning and migration support.
 * Exposes window.Storage as a global module.
 * Zero dependencies - loaded via script tag.
 */

window.Storage = (() => {
  'use strict';

  /** @constant {string} PREFIX - Key prefix for all app data in localStorage */
  const PREFIX = 'att_benefits_';

  /** @constant {number} SCHEMA_VERSION - Current schema version for migration support */
  const SCHEMA_VERSION = 1;

  /**
   * List of known keys stored under the prefix.
   * @constant {string[]}
   */
  const KNOWN_KEYS = [
    'favorites',
    'recentSearches',
    'visitedLocations',
    'expenses',
    'settings',
    'monthlyBudget',
    '_version'
  ];

  /**
   * Default values returned when storage is empty or corrupt.
   * @constant {Object}
   */
  const DEFAULTS = {
    favorites: [],
    recentSearches: [],
    visitedLocations: {},
    expenses: [],
    settings: { theme: 'dark', language: 'es', view: 'normal' },
    monthlyBudget: 210000,
    _version: SCHEMA_VERSION
  };

  /**
   * Build the full localStorage key from a short key name.
   * @param {string} key - Short key name
   * @returns {string} Prefixed key
   */
  function _prefixKey(key) {
    return PREFIX + key;
  }

  /**
   * Safely parse a JSON string, returning null on failure.
   * @param {string} str - JSON string to parse
   * @returns {*|null} Parsed value or null
   */
  function _safeParse(str) {
    try {
      return JSON.parse(str);
    } catch (_e) {
      return null;
    }
  }

  /**
   * Run migrations from an older schema version to the current one.
   * @param {Object} data - The loaded data object
   * @param {number} fromVersion - The version found in storage
   * @returns {Object} Migrated data
   */
  function _migrate(data, fromVersion) {
    var migrated = Object.assign({}, data);

    // Future migrations go here:
    // if (fromVersion < 2) { /* migrate v1 -> v2 */ }

    migrated._version = SCHEMA_VERSION;
    return migrated;
  }

  /**
   * Validate that data has the expected shape. Fills in missing keys with defaults.
   * @param {Object} data - Data object to validate
   * @returns {Object} Validated data with all required keys
   */
  function _validate(data) {
    if (!data || typeof data !== 'object') {
      return Object.assign({}, DEFAULTS);
    }

    var validated = {};
    for (var i = 0; i < KNOWN_KEYS.length; i++) {
      var key = KNOWN_KEYS[i];
      validated[key] = data.hasOwnProperty(key) ? data[key] : DEFAULTS[key];
    }
    return validated;
  }

  /**
   * Load all persisted data from localStorage.
   * Handles corrupt data gracefully by returning defaults.
   * @returns {Object} The loaded (or default) state data
   */
  function load() {
    try {
      var data = {};
      var hasAnyData = false;

      for (var i = 0; i < KNOWN_KEYS.length; i++) {
        var key = KNOWN_KEYS[i];
        var raw = localStorage.getItem(_prefixKey(key));
        if (raw !== null) {
          hasAnyData = true;
          var parsed = _safeParse(raw);
          data[key] = parsed !== null ? parsed : DEFAULTS[key];
        } else {
          data[key] = DEFAULTS[key];
        }
      }

      if (!hasAnyData) {
        return Object.assign({}, DEFAULTS);
      }

      // Check schema version and migrate if needed
      var storedVersion = typeof data._version === 'number' ? data._version : 0;
      if (storedVersion < SCHEMA_VERSION) {
        data = _migrate(data, storedVersion);
        saveAll(data);
      }

      return _validate(data);
    } catch (_e) {
      return Object.assign({}, DEFAULTS);
    }
  }

  /**
   * Save a single key-value pair to localStorage.
   * @param {string} key - The key name (without prefix)
   * @param {*} value - The value to store (will be JSON-serialized)
   * @returns {boolean} True if save succeeded, false otherwise
   */
  function save(key, value) {
    try {
      localStorage.setItem(_prefixKey(key), JSON.stringify(value));
      return true;
    } catch (_e) {
      return false;
    }
  }

  /**
   * Save the entire state object to localStorage.
   * Each key is stored individually under the prefix.
   * @param {Object} data - Full state object to persist
   * @returns {boolean} True if all saves succeeded
   */
  function saveAll(data) {
    try {
      if (!data || typeof data !== 'object') {
        return false;
      }

      var keys = Object.keys(data);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (KNOWN_KEYS.indexOf(key) !== -1) {
          localStorage.setItem(_prefixKey(key), JSON.stringify(data[key]));
        }
      }

      // Always store the version
      localStorage.setItem(_prefixKey('_version'), JSON.stringify(SCHEMA_VERSION));
      return true;
    } catch (_e) {
      return false;
    }
  }

  /**
   * Clear all app data from localStorage.
   * Only removes keys under the app prefix.
   */
  function clear() {
    try {
      for (var i = 0; i < KNOWN_KEYS.length; i++) {
        localStorage.removeItem(_prefixKey(KNOWN_KEYS[i]));
      }
    } catch (_e) {
      // Silent fail
    }
  }

  /**
   * Export all stored data as a JSON string.
   * Includes the schema version for future import compatibility.
   * @returns {string} JSON string of all stored data
   */
  function exportData() {
    var data = load();
    data._version = SCHEMA_VERSION;
    data._exportedAt = new Date().toISOString();
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import data from a JSON string.
   * Validates the schema version and migrates if needed.
   * @param {string} jsonStr - JSON string to import
   * @returns {{ success: boolean, error?: string }} Result of the import operation
   */
  function importData(jsonStr) {
    try {
      if (!jsonStr || typeof jsonStr !== 'string') {
        return { success: false, error: 'Invalid input: expected a JSON string' };
      }

      var data = JSON.parse(jsonStr);

      if (!data || typeof data !== 'object') {
        return { success: false, error: 'Invalid data format' };
      }

      // Check version compatibility
      var version = typeof data._version === 'number' ? data._version : 0;
      if (version > SCHEMA_VERSION) {
        return { success: false, error: 'Data version (' + version + ') is newer than supported (' + SCHEMA_VERSION + ')' };
      }

      // Migrate if needed
      if (version < SCHEMA_VERSION) {
        data = _migrate(data, version);
      }

      // Remove export metadata before saving
      delete data._exportedAt;

      var validated = _validate(data);
      saveAll(validated);

      return { success: true };
    } catch (e) {
      return { success: false, error: 'Failed to parse JSON: ' + e.message };
    }
  }

  // Public API
  return {
    load: load,
    save: save,
    saveAll: saveAll,
    clear: clear,
    export: exportData,
    import: importData
  };
})();
