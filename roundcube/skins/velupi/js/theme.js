/*!
 * Velupi Mail — theme runtime
 * Injects the Velupi brand mark on the login screen and manages light/dark
 * mode with a persisted preference that synchronizes with Elastic's dark-mode.
 *
 * Exposes a global `VelupiTheme` namespace (init / setMode / toggle).
 * Performs no authentication or transport work.
 */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'velupi:mail-theme';
  var LOGO_SRC = '/skins/velupi/images/velupi-logo.png';

  function readStored() {
    try {
      return global.localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function persist(mode) {
    try {
      global.localStorage.setItem(STORAGE_KEY, mode);
    } catch (e) {
      /* storage unavailable; mode still applies for this session */
    }
    try {
      global.document.cookie = 'colorMode=' + mode + '; path=/; max-age=31536000; SameSite=Lax';
    } catch (e) {}
  }

  function systemPrefersDark() {
    return (
      global.matchMedia &&
      global.matchMedia('(prefers-color-scheme: dark)').matches
    );
  }

  function resolveMode() {
    var stored = readStored();
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }
    try {
      if (global.document.cookie.indexOf('colorMode=dark') > -1) {
        return 'dark';
      }
      if (global.document.cookie.indexOf('colorMode=light') > -1) {
        return 'light';
      }
    } catch (e) {}
    return systemPrefersDark() ? 'dark' : 'light';
  }

  function apply(mode) {
    var root = global.document.documentElement;
    if (mode === 'dark') {
      root.setAttribute('data-theme', 'dark');
      root.classList.add('dark-mode');
      root.classList.remove('light-mode');
    } else {
      root.setAttribute('data-theme', 'light');
      root.classList.remove('dark-mode');
      root.classList.add('light-mode');
    }
  }

  function setMode(mode) {
    if (mode !== 'dark' && mode !== 'light') {
      return;
    }
    persist(mode);
    apply(mode);
  }

  function toggle() {
    setMode(resolveMode() === 'dark' ? 'light' : 'dark');
  }

  function injectBrand() {
    var doc = global.document;
    if (doc.querySelector('#logo')) {
      return;
    }
    var form = doc.querySelector('#login-form');
    if (!form || form.querySelector('.velupi-brand')) {
      return;
    }
    var wrap = doc.createElement('div');
    wrap.className = 'velupi-brand';

    var img = doc.createElement('img');
    img.src = LOGO_SRC;
    img.alt = 'Velupi Mail';
    wrap.appendChild(img);

    form.insertBefore(wrap, form.firstChild);
  }

  function replaceRoundcubeBrand() {
    var doc = global.document;
    if (!doc) return;
    if (doc.title && /roundcube/i.test(doc.title)) {
      doc.title = doc.title.replace(/Roundcube(?:\s+Webmail)?/gi, 'Velupi');
    }
  }

  function setupBrandSanitizer() {
    replaceRoundcubeBrand();
    var doc = global.document;
    if (!doc) return;
    var titleEl = doc.querySelector('title');
    if (titleEl && global.MutationObserver) {
      try {
        var obs = new MutationObserver(function () {
          replaceRoundcubeBrand();
        });
        obs.observe(titleEl, { childList: true, characterData: true, subtree: true });
      } catch (e) {}
    }
  }

  function setupFavicon() {
    var doc = global.document;
    if (!doc) return;
    var links = doc.querySelectorAll("link[rel*='icon']");
    if (links && links.length > 0) {
      for (var i = 0; i < links.length; i++) {
        links[i].href = '/skins/velupi/images/favicon.ico';
      }
    } else {
      var link = doc.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      link.href = '/skins/velupi/images/favicon.ico';
      var head = doc.getElementsByTagName('head')[0] || doc.documentElement;
      head.appendChild(link);
    }
  }

  function init() {
    apply(resolveMode());
    setupBrandSanitizer();
    setupFavicon();
    if (global.document.readyState === 'loading') {
      global.document.addEventListener('DOMContentLoaded', function () {
        injectBrand();
        setupBrandSanitizer();
        setupFavicon();
      });
    } else {
      injectBrand();
    }
  }

  var api = {
    init: init,
    setMode: setMode,
    toggle: toggle,
    currentMode: resolveMode,
    storageKey: STORAGE_KEY,
  };

  global.VelupiTheme = api;

  if (global.document) {
    init();
  }
})(typeof window !== 'undefined' ? window : this);
