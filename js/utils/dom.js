/**
 * @file dom.js
 * @description DOM helper utilities for the AT&T Benefits Dashboard.
 * Exposes window.DOM as a global module.
 * Zero dependencies - loaded via script tag.
 */

window.DOM = (() => {
  'use strict';

  /** @type {number|null} Active toast timeout reference */
  var _toastTimeout = null;

  /**
   * querySelector shorthand.
   * @param {string} selector - CSS selector
   * @param {Element} [parent=document] - Parent element to search within
   * @returns {Element|null} First matching element or null
   */
  function qs(selector, parent) {
    return (parent || document).querySelector(selector);
  }

  /**
   * querySelectorAll shorthand, returns a real Array.
   * @param {string} selector - CSS selector
   * @param {Element} [parent=document] - Parent element to search within
   * @returns {Element[]} Array of matching elements
   */
  function qsa(selector, parent) {
    return Array.prototype.slice.call((parent || document).querySelectorAll(selector));
  }

  /**
   * Create a DOM element with attributes and children.
   * @param {string} tag - HTML tag name
   * @param {Object} [attrs={}] - Attributes to set. Special keys:
   *   - className: sets the class attribute
   *   - textContent: sets text content
   *   - innerHTML: sets inner HTML (use with caution)
   *   - style: object of CSS properties
   *   - on*: event listeners (e.g., onclick)
   *   - dataset: object of data-* attributes
   * @param {(Element|string)[]} [children=[]] - Child elements or text strings
   * @returns {Element} The created element
   */
  function create(tag, attrs, children) {
    var el = document.createElement(tag);
    attrs = attrs || {};
    children = children || [];

    var keys = Object.keys(attrs);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var val = attrs[key];

      if (key === 'className') {
        el.className = val;
      } else if (key === 'textContent') {
        el.textContent = val;
      } else if (key === 'innerHTML') {
        el.innerHTML = val;
      } else if (key === 'style' && typeof val === 'object') {
        var styleKeys = Object.keys(val);
        for (var s = 0; s < styleKeys.length; s++) {
          el.style[styleKeys[s]] = val[styleKeys[s]];
        }
      } else if (key === 'dataset' && typeof val === 'object') {
        var dataKeys = Object.keys(val);
        for (var d = 0; d < dataKeys.length; d++) {
          el.dataset[dataKeys[d]] = val[dataKeys[d]];
        }
      } else if (key.indexOf('on') === 0 && typeof val === 'function') {
        el.addEventListener(key.substring(2).toLowerCase(), val);
      } else {
        el.setAttribute(key, val);
      }
    }

    for (var c = 0; c < children.length; c++) {
      var child = children[c];
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else if (child instanceof Element) {
        el.appendChild(child);
      }
    }

    return el;
  }

  /**
   * Event delegation helper. Attaches a single event listener on a container
   * and filters events by a CSS selector.
   * @param {Element|string} container - Container element or CSS selector for it
   * @param {string} selector - CSS selector to match delegated targets
   * @param {string} event - Event type (e.g., 'click', 'input')
   * @param {function(Event, Element): void} handler - Callback receiving the event
   *   and the matched element
   * @returns {function(): void} Function to remove the event listener
   */
  function delegate(container, selector, event, handler) {
    var containerEl = typeof container === 'string' ? qs(container) : container;

    if (!containerEl) {
      return function () {};
    }

    function listener(e) {
      var target = e.target;
      while (target && target !== containerEl) {
        if (target.matches && target.matches(selector)) {
          handler(e, target);
          return;
        }
        target = target.parentElement;
      }
    }

    containerEl.addEventListener(event, listener);

    return function () {
      containerEl.removeEventListener(event, listener);
    };
  }

  /**
   * Escape HTML special characters to prevent XSS.
   * @param {string} str - Raw string to escape
   * @returns {string} HTML-safe string
   */
  function escapeHtml(str) {
    if (typeof str !== 'string') {
      return '';
    }
    var map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return str.replace(/[&<>"']/g, function (ch) {
      return map[ch];
    });
  }

  /**
   * Format a number as Argentine Pesos.
   * Uses dot as thousands separator (e.g., $ 5.200).
   * @param {number} number - Amount to format
   * @returns {string} Formatted currency string
   */
  function formatARS(number) {
    if (typeof number !== 'number' || isNaN(number)) {
      return '$ 0';
    }

    var isNegative = number < 0;
    var abs = Math.abs(Math.round(number));
    var str = String(abs);
    var formatted = '';

    for (var i = str.length - 1, count = 0; i >= 0; i--, count++) {
      if (count > 0 && count % 3 === 0) {
        formatted = '.' + formatted;
      }
      formatted = str[i] + formatted;
    }

    return (isNegative ? '-$ ' : '$ ') + formatted;
  }

  /**
   * Create a debounced version of a function.
   * The function will only execute after it stops being called for `ms` milliseconds.
   * @param {function} fn - Function to debounce
   * @param {number} ms - Delay in milliseconds
   * @returns {function} Debounced function
   */
  function debounce(fn, ms) {
    var timer = null;
    return function () {
      var context = this;
      var args = arguments;
      if (timer !== null) {
        clearTimeout(timer);
      }
      timer = setTimeout(function () {
        timer = null;
        fn.apply(context, args);
      }, ms);
    };
  }

  /**
   * Show a toast notification.
   * Creates or reuses a toast container fixed at the top of the viewport.
   * @param {string} message - Message to display
   * @param {('success'|'error'|'info'|'warning')} [type='info'] - Toast type for styling
   * @param {number} [duration=3000] - Duration in milliseconds before auto-dismiss
   */
  function toast(message, type, duration) {
    type = type || 'info';
    duration = typeof duration === 'number' ? duration : 3000;

    // Find or create the toast container
    var container = qs('#toast-container');
    if (!container) {
      container = create('div', {
        id: 'toast-container',
        style: {
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: '10000',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none'
        }
      });
      document.body.appendChild(container);
    }

    // Color map for toast types
    var colors = {
      success: { bg: '#10b981', text: '#ffffff', icon: '\u2713' },
      error:   { bg: '#ef4444', text: '#ffffff', icon: '\u2717' },
      warning: { bg: '#f59e0b', text: '#000000', icon: '\u26A0' },
      info:    { bg: '#3b82f6', text: '#ffffff', icon: '\u2139' }
    };

    var color = colors[type] || colors.info;

    var toastEl = create('div', {
      className: 'toast toast-' + type,
      style: {
        background: color.bg,
        color: color.text,
        padding: '12px 20px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        opacity: '0',
        transform: 'translateX(40px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        pointerEvents: 'auto',
        maxWidth: '360px',
        wordBreak: 'break-word'
      }
    }, [
      create('span', { style: { fontSize: '16px' } }, [color.icon]),
      create('span', {}, [escapeHtml(message)])
    ]);

    container.appendChild(toastEl);

    // Trigger enter animation
    requestAnimationFrame(function () {
      toastEl.style.opacity = '1';
      toastEl.style.transform = 'translateX(0)';
    });

    // Auto-dismiss
    var dismissTimer = setTimeout(function () {
      _dismissToast(toastEl);
    }, duration);

    // Click to dismiss early
    toastEl.addEventListener('click', function () {
      clearTimeout(dismissTimer);
      _dismissToast(toastEl);
    });
  }

  /**
   * Dismiss a toast element with exit animation.
   * @param {Element} toastEl - The toast element to remove
   * @private
   */
  function _dismissToast(toastEl) {
    toastEl.style.opacity = '0';
    toastEl.style.transform = 'translateX(40px)';
    setTimeout(function () {
      if (toastEl.parentElement) {
        toastEl.parentElement.removeChild(toastEl);
      }
    }, 300);
  }

  // Public API
  return {
    qs: qs,
    qsa: qsa,
    create: create,
    delegate: delegate,
    escapeHtml: escapeHtml,
    formatARS: formatARS,
    debounce: debounce,
    toast: toast
  };
})();
