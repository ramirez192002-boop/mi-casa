/* Mi Casa - control remoto para Alexa.
   JavaScript ES5 puro (sin librerías) para que corra en Safari de iOS 9. */
(function () {
  'use strict';

  var STORE_KEY = 'miCasa.v2';

  var ICONS = {
    fan: '<svg viewBox="0 0 24 24" fill="currentColor"><ellipse cx="12" cy="6.2" rx="3" ry="4.6"/><ellipse cx="12" cy="6.2" rx="3" ry="4.6" transform="rotate(120 12 12)"/><ellipse cx="12" cy="6.2" rx="3" ry="4.6" transform="rotate(240 12 12)"/><circle cx="12" cy="12" r="2.4"/></svg>',
    light: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 21h6v-1H9v1zm3-19a7 7 0 0 0-4 12.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3A7 7 0 0 0 12 2z"/></svg>',
    pc: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 2H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7v2H8v2h8v-2h-2v-2h7a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm0 14H3V4h18v12z"/></svg>',
    plug: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 7V3h-2v4h-4V3H8v4H6v7.5L9.5 18v3h5v-3l3.5-3.5V7h-2z"/></svg>',
    tv: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5v2h8v-2h5a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 14H3V5h18v12z"/></svg>'
  };
  ICONS.music = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>';
  ICONS.volup = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
  ICONS.voldown = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.5 12A4.5 4.5 0 0 0 16 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>';
  ICONS.moon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.39 5.39 0 0 1-4.4 2.26 5.4 5.4 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/></svg>';
  var TYPES = ['fan', 'light', 'pc', 'plug', 'tv', 'music', 'volup', 'voldown', 'moon'];

  // Versión de la lista de botones de fábrica. Al subirla, los botones nuevos
  // (campo "since") se añaden a quien ya tenía la app, sin tocar los suyos.
  var PRESETS = 2;

  // Los tres dispositivos iniciales apuntan a la "casa de prueba" del servidor
  // (/demo/...). Cuando existan los enlaces reales de Alexa se cambian en "•••".
  function defaults() {
    // Solo existe cuando la app se abre desde el servidor del PC (red local).
    var local = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(location.hostname);
    var base = local ? location.protocol + '//' + location.host + '/demo/' : '';
    function u(path) { return base ? base + path : ''; }
    return [
      { id: 'fan', name: 'Ventilador', type: 'fan', mode: 'toggle', on: false, urlOn: u('fan/on'), urlOff: u('fan/off'), bridge: false },
      { id: 'light', name: 'Luces', type: 'light', mode: 'toggle', on: false, urlOn: u('light/on'), urlOff: u('light/off'), bridge: false },
      { id: 'pc', name: 'Computador', type: 'pc', mode: 'push', on: false, urlOn: u('pc/on'), urlOff: '', bridge: false },
      { id: 'music', since: 2, name: 'Música', type: 'music', mode: 'toggle', on: false, urlOn: u('music/on'), urlOff: u('music/off'), bridge: false },
      { id: 'volup', since: 2, name: 'Volumen alto', type: 'volup', mode: 'push', on: false, urlOn: u('volup/on'), urlOff: '', bridge: false },
      { id: 'voldown', since: 2, name: 'Volumen bajo', type: 'voldown', mode: 'push', on: false, urlOn: u('voldown/on'), urlOff: '', bridge: false },
      // allOff: al activarse, marca como apagados los demás botones.
      { id: 'night', since: 2, name: 'Buenas noches', type: 'moon', mode: 'push', allOff: true, on: false, urlOn: u('night/on'), urlOff: '', bridge: false }
    ];
  }

  /* ---------- Datos ---------- */
  var devices = load();

  function load() {
    var list = null, have = 1, fresh, i, j, found;
    try {
      var raw = localStorage.getItem(STORE_KEY);
      list = raw ? JSON.parse(raw) : null;
      have = Number(localStorage.getItem(STORE_KEY + '.presets')) || 1;
    } catch (e) {}
    fresh = defaults();
    if (!list || list.length === undefined) {
      list = fresh;
    } else if (have < PRESETS) {
      for (i = 0; i < fresh.length; i++) {
        found = false;
        for (j = 0; j < list.length; j++) { if (list[j].id === fresh[i].id) { found = true; } }
        if (!found && fresh[i].since > have) { list.push(fresh[i]); }
      }
    }
    try {
      localStorage.setItem(STORE_KEY + '.presets', String(PRESETS));
      localStorage.setItem(STORE_KEY, JSON.stringify(list));
    } catch (e) {}
    return list;
  }

  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(devices)); } catch (e) {}
  }

  function find(id) {
    for (var i = 0; i < devices.length; i++) {
      if (devices[i].id === id) { return devices[i]; }
    }
    return null;
  }

  /* ---------- Utilidades ---------- */
  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Sube por el DOM hasta encontrar un elemento con el atributo dado.
  function up(el, attr, stop) {
    while (el && el !== stop && el.getAttribute) {
      if (el.getAttribute(attr) !== null) { return el; }
      el = el.parentNode;
    }
    return null;
  }

  // Toque rápido: evita la espera de 300 ms de Safari antiguo.
  function onTap(el, fn) {
    var sx = 0, sy = 0, moved = false, last = 0;
    el.addEventListener('touchstart', function (e) {
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; moved = false;
    }, false);
    el.addEventListener('touchmove', function (e) {
      if (Math.abs(e.touches[0].clientX - sx) > 10 || Math.abs(e.touches[0].clientY - sy) > 10) { moved = true; }
    }, false);
    el.addEventListener('touchend', function (e) {
      if (moved) { return; }
      last = Date.now();
      e.preventDefault();
      fn(e);
    }, false);
    el.addEventListener('click', function (e) {
      if (Date.now() - last < 700) { return; }
      fn(e);
    }, false);
  }

  var toastTimer = null;
  function toast(msg, isErr) {
    var t = $('toast');
    t.textContent = msg;
    t.className = 'toast show' + (isErr ? ' err' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = 'toast'; }, 2200);
  }

  /* ---------- Envío de órdenes ----------
     cb(resultado, mensaje): 'demo' | 'ok' | 'unknown' | 'error'
     - Directo (normal): el iPhone llama al enlace él mismo, sin servidor.
       Si el servicio permite leer la respuesta (Voice Monkey lo permite) se
       confirma con 'ok' o 'error'. Si no deja leerla o no hay conexión, el
       navegador no dice cuál de las dos fue: 'unknown'.
     - Puente (opcional): el servidor del PC hace la llamada y confirma. */
  var ERRORS = {
    UNAUTHORIZED: 'Al enlace le falta el token',
    INVALID_TOKEN: 'El token del enlace no es válido',
    DEVICE_NOT_FOUND: 'Ese disparador no existe en la cuenta',
    MISSING_DEVICE: 'Al enlace le falta el disparador',
    MONTHLY_QUOTA_EXCEEDED: 'Se acabaron las órdenes de este mes',
    THROTTLED: 'Demasiadas órdenes seguidas, espera un momento',
    ALEXA_TRIGGER_FAILED: 'Alexa no respondió, intenta de nuevo'
  };

  function explain(xhr) {
    var code = '';
    try { code = String(JSON.parse(xhr.responseText).error || ''); } catch (e) {}
    return ERRORS[code.split(':')[0]] || ('El servicio respondió con error ' + xhr.status);
  }

  function send(url, bridge, cb) {
    if (!url) { cb('demo'); return; }

    var viaBridge = bridge && location.protocol !== 'file:';
    var xhr = new XMLHttpRequest();
    if (viaBridge) {
      xhr.open('POST', '/api/send', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
    } else {
      xhr.open('GET', url + (url.indexOf('?') < 0 ? '?' : '&') + '_t=' + Date.now(), true);
    }
    xhr.timeout = 10000;
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) { return; }
      if (viaBridge) {
        var ok = false;
        try { ok = xhr.status === 200 && JSON.parse(xhr.responseText).ok; } catch (e) {}
        cb(ok ? 'ok' : 'error');
      } else if (xhr.status === 0) {
        cb('unknown');
      } else if (xhr.status >= 200 && xhr.status < 300) {
        cb('ok');
      } else {
        cb('error', explain(xhr));
      }
    };
    xhr.send(viaBridge ? JSON.stringify({ url: url }) : null);
  }

  /* ---------- Pantalla principal ---------- */
  function stateText(d) {
    if (d.mode === 'push') { return d.on ? 'Enviado' : 'Tocar para activar'; }
    return d.on ? 'Encendido' : 'Apagado';
  }

  function render() {
    var html = '', count = 0, i, d;
    for (i = 0; i < devices.length; i++) {
      d = devices[i];
      if (d.on && d.mode !== 'push') { count++; }
      html += '<div class="cell"><div class="tile c-' + d.type + (d.on ? ' on' : '') + '" data-id="' + esc(d.id) + '">' +
        '<div class="edit" data-edit="' + esc(d.id) + '">&bull;&bull;&bull;</div>' +
        '<div class="ico">' + (ICONS[d.type] || ICONS.plug) + '</div>' +
        '<div class="name">' + esc(d.name) + '</div>' +
        '<div class="state">' + stateText(d) + '</div>' +
        '</div></div>';
    }
    html += '<div class="cell"><div class="tile add" data-add="1"><div class="plus">+</div><div class="add-t">Agregar dispositivo</div></div></div>';
    $('grid').innerHTML = html;
    $('summary').textContent = count === 0 ? 'Todo apagado' : (count === 1 ? '1 encendido' : count + ' encendidos');
  }

  function activate(d) {
    if (d.busy) { return; }
    var push = d.mode === 'push';
    var target = push ? true : !d.on;
    var url = (push || target) ? d.urlOn : d.urlOff;
    var before = d.on;

    // Respuesta inmediata en pantalla; si falla, se revierte.
    d.on = target;
    d.busy = true;
    render();

    send(url, d.bridge, function (res, msg) {
      d.busy = false;
      if (res === 'error') {
        d.on = before;
        toast(msg || 'No se pudo enviar. Revisa el enlace y la red.', true);
      } else if (res === 'unknown') {
        toast('Sin confirmación: revisa la conexión o el enlace', true);
      } else if (res === 'demo') {
        toast('Modo demo: configura el enlace en •••');
      } else if (push) {
        toast(d.name + ': orden enviada');
      }
      if (d.allOff && (res === 'ok' || res === 'demo')) {
        for (var k = 0; k < devices.length; k++) {
          if (devices[k].mode !== 'push') { devices[k].on = false; }
        }
      }
      if (push && d.on) {
        setTimeout(function () { d.on = false; save(); render(); }, 1500);
      }
      save();
      render();
    });
  }

  onTap($('grid'), function (e) {
    var grid = $('grid');
    var ed = up(e.target, 'data-edit', grid);
    if (ed) { openEditor(find(ed.getAttribute('data-edit'))); return; }
    if (up(e.target, 'data-add', grid)) { openEditor(null); return; }
    var tile = up(e.target, 'data-id', grid);
    if (tile) {
      var d = find(tile.getAttribute('data-id'));
      if (d) { activate(d); }
    }
  });

  // Efecto de "presionado" en las tarjetas.
  $('grid').addEventListener('touchstart', function (e) {
    var tile = up(e.target, 'data-id', $('grid')) || up(e.target, 'data-add', $('grid'));
    if (!tile) { return; }
    tile.className += ' press';
    setTimeout(function () { tile.className = tile.className.replace(' press', ''); }, 150);
  }, false);

  /* ---------- Editor ---------- */
  var draft = null;   // copia de trabajo del dispositivo en edición
  var editingId = null;

  function openEditor(d) {
    editingId = d ? d.id : null;
    draft = d
      ? { name: d.name, type: d.type, mode: d.mode, urlOn: d.urlOn, urlOff: d.urlOff, bridge: !!d.bridge }
      : { name: '', type: 'plug', mode: 'toggle', urlOn: '', urlOff: '', bridge: false };
    $('editorTitle').textContent = d ? 'Editar' : 'Nuevo dispositivo';
    $('fName').value = draft.name;
    $('fOn').value = draft.urlOn;
    $('fOff').value = draft.urlOff;
    $('btnDelete').className = 'btn-del' + (d ? '' : ' hidden');
    paintEditor();
    $('editor').className = 'view';
  }

  function closeEditor() {
    $('fName').blur(); $('fOn').blur(); $('fOff').blur();
    $('editor').className = 'view hidden';
  }

  function paintEditor() {
    var html = '', i, items;
    for (i = 0; i < TYPES.length; i++) {
      html += '<div class="type' + (TYPES[i] === draft.type ? ' sel' : '') + '" data-type="' + TYPES[i] + '">' + ICONS[TYPES[i]] + '</div>';
    }
    $('fTypes').innerHTML = html;
    items = $('fMode').children;
    for (i = 0; i < items.length; i++) {
      items[i].className = 'seg-i' + (items[i].getAttribute('data-mode') === draft.mode ? ' sel' : '');
    }
    $('offWrap').className = draft.mode === 'push' ? 'hidden-el' : '';
    $('lblOn').textContent = draft.mode === 'push' ? 'Enlace de la acción' : 'Enlace para encender';
    $('fBridge').className = 'check' + (draft.bridge ? ' sel' : '');
  }

  onTap($('fTypes'), function (e) {
    var el = up(e.target, 'data-type', $('fTypes'));
    if (el) { draft.type = el.getAttribute('data-type'); paintEditor(); }
  });
  onTap($('fMode'), function (e) {
    var el = up(e.target, 'data-mode', $('fMode'));
    if (el) { draft.mode = el.getAttribute('data-mode'); paintEditor(); }
  });
  onTap($('fBridge'), function () { draft.bridge = !draft.bridge; paintEditor(); });
  onTap($('btnCancel'), closeEditor);

  function validUrl(u) { return u === '' || /^https?:\/\/\S+$/i.test(u); }

  onTap($('btnSave'), function () {
    var name = $('fName').value.replace(/^\s+|\s+$/g, '');
    var urlOn = $('fOn').value.replace(/^\s+|\s+$/g, '');
    var urlOff = draft.mode === 'push' ? '' : $('fOff').value.replace(/^\s+|\s+$/g, '');
    if (!name) { toast('Escribe un nombre', true); return; }
    if (!validUrl(urlOn) || !validUrl(urlOff)) { toast('El enlace debe empezar por http:// o https://', true); return; }

    var d = editingId ? find(editingId) : null;
    if (!d) {
      d = { id: 'd' + Date.now(), on: false };
      devices.push(d);
    }
    d.name = name;
    d.type = draft.type;
    if (d.mode !== draft.mode) { d.on = false; }
    d.mode = draft.mode;
    d.urlOn = urlOn;
    d.urlOff = urlOff;
    d.bridge = draft.bridge;
    save();
    render();
    closeEditor();
  });

  onTap($('btnDelete'), function () {
    var d = find(editingId);
    if (!d || !window.confirm('¿Eliminar "' + d.name + '"?')) { return; }
    devices.splice(devices.indexOf(d), 1);
    save();
    render();
    closeEditor();
  });

  /* ---------- Inicio ---------- */
  for (var i = 0; i < devices.length; i++) {
    devices[i].busy = false;
    if (devices[i].mode === 'push') { devices[i].on = false; }
  }
  render();

  // Copia sin conexión (iOS 9): si el servidor tiene una versión nueva de la
  // app, se descarga sola y se recarga para usarla.
  var ac = window.applicationCache;
  if (ac) {
    ac.addEventListener('updateready', function () {
      try { ac.swapCache(); } catch (e) {}
      location.reload();
    }, false);
  }
})();
