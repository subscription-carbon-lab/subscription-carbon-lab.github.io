'use strict';
/* "View source" button: shows the files that build this dashboard.
   Works when the page is served over http(s) (fetch). When opened from a
   file:// URL, browsers block fetch, so direct file links are shown instead. */
(function () {
  var FILES = [
    ['index.html', 'HTML'],
    ['style.css', 'CSS'],
    ['model.js', 'Model — Eq. (5)'],
    ['app.js', 'App / UI'],
    ['source.js', 'Source viewer'],
    ['README.md', 'README']
  ];
  var cache = {};
  var overlay, tabsEl, viewEl, statusEl, activeName;

  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'text') el.textContent = attrs[k];
      else el.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { el.appendChild(c); });
    return el;
  }

  function build() {
    overlay = h('div', { id: 'source-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Dashboard source code', hidden: '' });
    var panel = h('div', { class: 'source-panel' });

    var head = h('div', { class: 'source-head' });
    head.appendChild(h('div', { class: 'source-title', text: 'Source code — the files that build this dashboard' }));
    var actions = h('div', { class: 'source-actions' });
    var copyBtn = h('button', { type: 'button', class: 'source-copy', text: 'Copy file' });
    copyBtn.addEventListener('click', copyActive);
    var downloadBtn = h('button', { type: 'button', class: 'source-download', text: 'Download file' });
    downloadBtn.addEventListener('click', function () {
      if (cache[activeName] === undefined) return;
      var url = URL.createObjectURL(new Blob([cache[activeName]], { type: 'text/plain;charset=utf-8' }));
      var a = h('a', { href: url, download: activeName });
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });
    var closeBtn = h('button', { type: 'button', class: 'source-close', 'aria-label': 'Close', text: '×' });
    closeBtn.addEventListener('click', close);
    actions.appendChild(copyBtn); actions.appendChild(downloadBtn); actions.appendChild(closeBtn);
    head.appendChild(actions);

    tabsEl = h('div', { class: 'source-tabs', role: 'group', 'aria-label': 'Source files' });
    FILES.forEach(function (f) {
      var b = h('button', { type: 'button', class: 'source-tab', 'data-name': f[0], text: f[0] });
      b.addEventListener('click', function () { show(f[0]); });
      tabsEl.appendChild(b);
    });

    statusEl = h('div', { class: 'source-status', role: 'status', 'aria-live': 'polite' });
    viewEl = h('pre', { class: 'source-view', tabindex: '0' });

    panel.appendChild(head);
    panel.appendChild(tabsEl);
    panel.appendChild(statusEl);
    panel.appendChild(viewEl);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function (e) { if (!overlay.hidden && e.key === 'Escape') close(); });
    overlay.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var items = Array.prototype.slice.call(overlay.querySelectorAll('button:not(:disabled), a[href], [tabindex="0"]'));
      var first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  function open() {
    if (!overlay) build();
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    document.querySelector('header').inert = true;
    document.querySelector('main').inert = true;
    show(activeName || FILES[0][0]);
    overlay.querySelector('.source-close').focus();
  }
  function close() {
    if (!overlay) return;
    overlay.hidden = true;
    document.body.style.overflow = '';
    document.querySelector('header').inert = false;
    document.querySelector('main').inert = false;
    var t = document.getElementById('view-source');
    if (t) t.focus();
  }

  function fetchFile(name) {
    if (cache[name] !== undefined) return Promise.resolve(cache[name]);
    return fetch(name, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(r.status + ' ' + r.statusText); return r.text(); })
      .then(function (txt) { cache[name] = txt; return txt; });
  }

  function show(name) {
    activeName = name;
    Array.prototype.forEach.call(tabsEl.children, function (b) {
      var on = b.dataset.name === name;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    statusEl.textContent = 'Loading ' + name + '…';
    viewEl.textContent = '';
    overlay.querySelector('.source-copy').disabled = true;
    overlay.querySelector('.source-download').disabled = true;
    fetchFile(name).then(function (txt) {
      if (activeName !== name) return;
      statusEl.textContent = name + '  ·  ' + txt.split('\n').length + ' lines  ·  ' + txt.length.toLocaleString() + ' chars';
      viewEl.textContent = txt;
      viewEl.scrollTop = 0;
      overlay.querySelector('.source-copy').disabled = false;
      overlay.querySelector('.source-download').disabled = false;
    }).catch(function (err) {
      if (activeName !== name) return;
      statusEl.textContent = 'Could not load ' + name + ' (' + err.message + ').';
      viewEl.innerHTML = '';
      var note = h('div', { class: 'source-fallback' });
      note.appendChild(h('p', { text: location.protocol === 'file:' ? 'Your browser blocks in-page source loading for local files. Use the dashboard through its local web address to read the source here.' : 'The source file could not be loaded. Check your connection, then select the file again to retry.' }));
      var list = h('ul', {});
      FILES.forEach(function (f) {
        var li = h('li', {});
        li.appendChild(h('a', { href: f[0], target: '_blank', rel: 'noopener', text: f[0] }));
        list.appendChild(li);
      });
      note.appendChild(list);
      viewEl.appendChild(note);
    });
  }

  function copyActive() {
    var txt = cache[activeName] || '';
    if (!txt) return;
    var done = function () {
      var b = overlay.querySelector('.source-copy');
      var old = b.textContent; b.textContent = 'Copied ✓';
      setTimeout(function () { b.textContent = old; }, 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(done, function () { statusEl.textContent = 'Clipboard access was denied. Use Download file or select the code to copy it.'; });
    } else {
      var ta = document.createElement('textarea');
      ta.value = txt; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  function init() {
    var btn = document.getElementById('view-source');
    if (!btn) {
      var actions = document.querySelector('.header-actions');
      if (!actions) return;
      btn = document.createElement('button');
      btn.id = 'view-source';
      btn.type = 'button';
      btn.textContent = '⟨ ∕ ⟩ View source';
      actions.insertBefore(btn, actions.firstChild);
    }
    btn.addEventListener('click', open);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
