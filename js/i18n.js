/**
 * @file i18n.js
 * @description Internationalization module for the AT&T Benefits Dashboard.
 * Supports Spanish (es) and English (en).
 * Exposes window.I18N as a global module.
 * Zero dependencies - loaded via script tag.
 */

window.I18N = (() => {
  'use strict';

  /** @type {string} Current active language code */
  var _currentLang = 'es';

  /**
   * Translation dictionaries keyed by language code.
   * Each language maps flat dot-free keys to translated strings.
   * @type {Object.<string, Object.<string, string>>}
   */
  var _translations = {

    // ── Spanish ──────────────────────────────────────────────
    es: {
      // Navigation
      dashboard:          'Dashboard',
      comercios:          'Comercios',
      gastos:             'Gastos',
      configuracion:      'Configuraci\u00f3n',

      // Dashboard
      presupuesto:        'Presupuesto',
      favoritos:          'Favoritos',
      busquedas_recientes:'B\u00fasquedas recientes',
      lugares_visitados:  'Lugares visitados',
      gastado:            'Gastado',
      restante:           'Restante',
      sin_favoritos:      'No tienes favoritos a\u00fan',
      sin_busquedas:      'No hay b\u00fasquedas recientes',

      // Comercios
      buscar_placeholder: 'Buscar comercios...',
      rubro:              'Rubro',
      todos:              'Todos',
      gastronomia:        'Gastronom\u00eda',
      compras:            'Compras',
      ciudades:           'Ciudades',
      categorias:         'Categor\u00edas',
      resultados:         'resultados',
      mostrando:          'Mostrando',
      ver_mapa:           'Ver mapa',
      agregar_favorito:   'Agregar a favoritos',
      quitar_favorito:    'Quitar de favoritos',
      sin_resultados:     'No se encontraron resultados',
      filtros_activos:    'Filtros activos',
      solo_favoritos:     'Solo favoritos',

      // Gastos
      nuevo_gasto:        'Nuevo gasto',
      comercio:           'Comercio',
      monto:              'Monto',
      fecha:              'Fecha',
      registrar:          'Registrar',
      historial:          'Historial',
      total_mes:          'Total del mes',
      promedio_dia:       'Promedio por d\u00eda',
      presupuesto_mensual:'Presupuesto mensual',
      eliminar:           'Eliminar',
      confirmar_eliminar: '\u00bfConfirmar eliminaci\u00f3n?',
      sin_gastos:         'No hay gastos registrados',

      // Config
      interfaz:           'Interfaz',
      perfil:             'Perfil',
      idioma:             'Idioma',
      contacto:           'Contacto',
      tema_oscuro:        'Tema oscuro',
      tema_claro:         'Tema claro',
      exportar:           'Exportar datos',
      importar:           'Importar datos',
      datos_exportados:   'Datos exportados correctamente',
      datos_importados:   'Datos importados correctamente',
      error_importar:     'Error al importar datos',
      espanol:            'Espa\u00f1ol',
      ingles:             'Ingl\u00e9s',
      nombre:             'Nombre',
      email:              'Correo electr\u00f3nico',
      pin_teams:          'PIN de Teams',
      abrir_teams:        'Abrir Teams',

      // Common
      guardar:            'Guardar',
      cancelar:           'Cancelar',
      limpiar:            'Limpiar',
      cerrar:             'Cerrar',
      error:              'Error',
      exito:              '\u00c9xito',
      cargando:           'Cargando...'
    },

    // ── English ──────────────────────────────────────────────
    en: {
      // Navigation
      dashboard:          'Dashboard',
      comercios:          'Stores',
      gastos:             'Expenses',
      configuracion:      'Settings',

      // Dashboard
      presupuesto:        'Budget',
      favoritos:          'Favorites',
      busquedas_recientes:'Recent searches',
      lugares_visitados:  'Visited locations',
      gastado:            'Spent',
      restante:           'Remaining',
      sin_favoritos:      'No favorites yet',
      sin_busquedas:      'No recent searches',

      // Comercios
      buscar_placeholder: 'Search stores...',
      rubro:              'Category',
      todos:              'All',
      gastronomia:        'Food & Drink',
      compras:            'Shopping',
      ciudades:           'Cities',
      categorias:         'Categories',
      resultados:         'results',
      mostrando:          'Showing',
      ver_mapa:           'View map',
      agregar_favorito:   'Add to favorites',
      quitar_favorito:    'Remove from favorites',
      sin_resultados:     'No results found',
      filtros_activos:    'Active filters',
      solo_favoritos:     'Favorites only',

      // Gastos
      nuevo_gasto:        'New expense',
      comercio:           'Store',
      monto:              'Amount',
      fecha:              'Date',
      registrar:          'Record',
      historial:          'History',
      total_mes:          'Monthly total',
      promedio_dia:       'Daily average',
      presupuesto_mensual:'Monthly budget',
      eliminar:           'Delete',
      confirmar_eliminar: 'Confirm deletion?',
      sin_gastos:         'No expenses recorded',

      // Config
      interfaz:           'Interface',
      perfil:             'Profile',
      idioma:             'Language',
      contacto:           'Contact',
      tema_oscuro:        'Dark theme',
      tema_claro:         'Light theme',
      exportar:           'Export data',
      importar:           'Import data',
      datos_exportados:   'Data exported successfully',
      datos_importados:   'Data imported successfully',
      error_importar:     'Error importing data',
      espanol:            'Spanish',
      ingles:             'English',
      nombre:             'Name',
      email:              'Email',
      pin_teams:          'Teams PIN',
      abrir_teams:        'Open Teams',

      // Common
      guardar:            'Save',
      cancelar:           'Cancel',
      limpiar:            'Clear',
      cerrar:             'Close',
      error:              'Error',
      exito:              'Success',
      cargando:           'Loading...'
    }
  };

  /**
   * Get the translated string for a given key in the current language.
   * Returns the key itself if no translation is found (aids debugging).
   * @param {string} key - Translation key
   * @returns {string} Translated string or the key if not found
   */
  function t(key) {
    var dict = _translations[_currentLang];
    if (dict && dict.hasOwnProperty(key)) {
      return dict[key];
    }
    // Fallback to Spanish, then return the key itself
    if (_currentLang !== 'es' && _translations.es && _translations.es.hasOwnProperty(key)) {
      return _translations.es[key];
    }
    return key;
  }

  /**
   * Set the active language.
   * @param {string} lang - Language code ('es' or 'en')
   */
  function setLanguage(lang) {
    if (_translations.hasOwnProperty(lang)) {
      _currentLang = lang;
    }
  }

  /**
   * Get the current active language code.
   * @returns {string} Current language code
   */
  function getLanguage() {
    return _currentLang;
  }

  // Public API
  return {
    t: t,
    setLanguage: setLanguage,
    getLanguage: getLanguage
  };
})();
