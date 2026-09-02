// ============================================================
// fcitx5-bridge.js — LexPilot 集成 fcitx5-js 拼音引擎(Web/移动端)
//
// 职责:
//   1. 延迟加载引擎(Fcitx5.js + wasm + data + 3 个 .so,约 18MB)
//   2. 安装拼音专用插件(chinese-addons-slim.zip,约 36MB;经 IDBFS 持久化,装过则跳过)
//   3. 焦点守卫:排除输入框(密码 / apiKeyInput / redeemCodeInput / .mat-viewer 内)
//      不被 fcitx5 接管,保持原生键盘
//   4. change→input 桥:fcitx5 的 commit()/键盘 updateInput() 只派发非冒泡 change,
//      这里补派冒泡 input,保证 oninput 过滤/自适应/保存管线正常
//   5. 回车特判:userInput/todoInput 被 fcitx5 在末尾追加 \n 时,剥离并触发
//      现有 sendMsg / addTodo 逻辑(与内置 imeEnter 分支一致)
//   6. 模式开关:内置键盘 ↔ fcitx5(FCITX5.configure('builtin'|'fcitx'))
//
// 宿主全局(运行时访问,无需在加载时存在):sendMsg / streaming / IME
// 使用方式见 law.html(Phase 3)。
// ============================================================
(function () {
  'use strict';

  var PLUGIN_URL = './fcitx5/chinese-addons-slim.zip';

  var _state = 'idle';        // idle | loading | ready | failed
  var _mode = 'fcitx';        // fcitx | builtin
  var _fcitx = null;          // window.fcitx
  var _snap = {};             // 输入框 id -> 上次值(fcitx 写入后),用于回车特判
  var _listeners = [];

  // ---------- 受管输入框判定(与 law.html 内置 focusin 的排除集一致) ----------
  function isManaged(el) {
    if (!el || !el.tagName) return false;
    var tag = el.tagName;
    if (tag !== 'TEXTAREA' && tag !== 'INPUT') return false;
    if (tag === 'INPUT') {
      var t = (el.type || 'text').toLowerCase();
      if (t !== 'text' && t !== 'search') return false; // password/number/... 保持原生
    }
    if (el.id === 'apiKeyInput' || el.id === 'redeemCodeInput') return false;
    if (el.closest && el.closest('.mat-viewer')) return false;
    return true;
  }

  function isActive() { return _state === 'ready' && _mode === 'fcitx'; }

  // ---------- 只读状态 ----------
  // fcitx 模式:受管输入框只读(交 fcitx 键盘/引擎),排除输入框可编辑(原生键盘)
  // 内置模式:全部可编辑(内置 focusin/touchstart 会自行置只读)
  function sweepReadonly(on) {
    var els = document.querySelectorAll('input, textarea');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      el.readOnly = on ? !!isManaged(el) : false;
    }
  }

  function hideBuiltinIme() {
    try {
      var ime = document.getElementById('ime');
      if (ime) ime.classList.remove('show');
    } catch (e) {}
    try {
      if (window.IME) { window.IME.open = false; window.IME.target = null; window.IME.py = ''; }
    } catch (e) {}
  }

  // ---------- fcitx5 键盘改版(移动端简化:iOS 式) ----------
  // 结构(实测):#fcitx-virtual-keyboard > .fcitx-keyboard-container > 子元素
  //   .fcitx-keyboard-toolbar   顶部一排按钮(撤销/编辑/剪贴板…)
  //   .fcitx-keyboard > .fcitx-keyboard-row > .fcitx-keyboard-key-container
  //     > .fcitx-keyboard-key(字母键带 .fcitx-keyboard-sub-label 数字/符号角标)
  //   底部行:.fcitx-keyboard-symbol(#+=) / "," / .fcitx-keyboard-globe /
  //     .fcitx-keyboard-space(标签即当前输入法"拼音",flex:4) / "." / .fcitx-keyboard-enter
  // 键盘按层重建(shift/符号):.fcitx-keyboard.innerHTML 被清空重画 → 需 MutationObserver 重应用。
  var _kbdStyled = false;
  var _kbdObs = null;
  var _symObs = null;

  function installKbdStyle() {
    if (_kbdStyled) return;
    _kbdStyled = true;
    if (document.getElementById('lexpilot-fcitx-kbd-style')) return;
    var s = document.createElement('style');
    s.id = 'lexpilot-fcitx-kbd-style';
    s.textContent = [
      '/* LexPilot 简化:去掉顶部一排按钮 */',
      '.fcitx-keyboard-toolbar{display:none!important}',
      '/* 字母键只显示字母,隐藏数字/符号角标 */',
      '.fcitx-keyboard-key .fcitx-keyboard-sub-label{display:none!important}',
      '/* 空格键(原"拼音"键)标为"空格",固定字号(压过库的 inline cqw 字号) */',
      '.fcitx-keyboard-space{font-size:clamp(16px,5vw,22px)!important;font-weight:500;letter-spacing:.5px}',
      '/* iOS 式按下反馈:缩放 + 加深(库已加 .fcitx-keyboard-pressed 类) */',
      '.fcitx-keyboard-key-container.fcitx-keyboard-pressed .fcitx-keyboard-key{transform:scale(.92)!important;filter:brightness(.88)}',
      '.fcitx-keyboard-key{transition:transform .05s ease,filter .05s ease,background-color .05s ease}',
      '/* 符号面板:常用符号网格(替换库自带拼音声调/希腊字母) */',
      '.fcitx-keyboard-symbol-panel{display:grid!important;grid-template-columns:repeat(5,1fr);gap:6px;padding:10px 12px;max-height:190px;overflow-y:auto}',
      '.fcitx-keyboard-symbol-item{display:flex!important;align-items:center;justify-content:center;height:42px;border-radius:10px;background:rgba(127,127,127,.14);color:var(--text,#111);font-size:20px;cursor:pointer;user-select:none;-webkit-user-select:none}',
      '.fcitx-keyboard-symbol-item:active{background:rgba(26,82,118,.25)}',
      '.fcitx-keyboard-symbol-categories{display:flex!important;gap:6px;padding:8px 12px 0;flex-wrap:wrap}',
      '.fcitx-keyboard-symbol-category{padding:6px 14px;border-radius:14px;font-size:13px;background:rgba(127,127,127,.16);color:var(--text,#111);cursor:pointer}',
      '.fcitx-keyboard-symbol-category.fcitx-keyboard-pressed{background:#1a5276;color:#fff;font-weight:600}',
    ].join('\n');
    document.head.appendChild(s);
  }

  function styleFcitxKbd() {
    if (!isActive()) return;
    var root = document.getElementById('fcitx-virtual-keyboard');
    if (!root) return;
    installKbdStyle();
    var r = root.shadowRoot || root;
    // 底部"拼音"键(即空格键)→ 固定显示"空格"(库在 IM 切换时回写"拼音"/"EN")
    var space = r.querySelector('.fcitx-keyboard-space');
    if (space && space.textContent.trim() !== '空格') {
      space.textContent = '空格';
    }
  }

  function watchKbdRebuild() {
    if (_kbdObs) return;
    var root = document.getElementById('fcitx-virtual-keyboard');
    if (!root || !window.MutationObserver) return;
    var kbd = (root.shadowRoot || root).querySelector('.fcitx-keyboard');
    if (!kbd) return;
    var timer = null;
    _kbdObs = new MutationObserver(function () {
      if (timer) clearTimeout(timer);
      timer = setTimeout(styleFcitxKbd, 0); // 层切换/空格标签回写后重应用
    });
    _kbdObs.observe(kbd, { childList: true, subtree: true });
    styleFcitxKbd();
  }

  // ---------- 符号面板:常用符号(替换库自带拼音声调/希腊字母) ----------
  var LEX_SYMBOL_CATS = [
    { key: "常用", symbols: ["，","。","、","；","：","？","！","…","—","·","～","“","”","‘","’","（","）","《","》","【","】","〈","〉"] },
    { key: "标点", symbols: [".",",",";",":","?","!","'","\"","-","_","/","\\","|","[","]","{","}","<",">","^","~","`"] },
    { key: "数学", symbols: ["＋","－","×","÷","＝","≠","≈","±","≤","≥","√","∞","％","‰","∑","℃","§"] },
    { key: "序号", symbols: ["①","②","③","④","⑤","⑥","⑦","⑧","⑨","⑩","⑪","⑫","⑬","⑭","⑮","⑯","⑰"] },
    { key: "特殊", symbols: ["＃","＠","＆","＊","＄","￥","€","£","©","®","™","→","←","↑","↓","▲","▼","♥"] }
  ];

  function styleFcitxSymbols() {
    if (!isActive()) return;
    var root = document.getElementById('fcitx-virtual-keyboard');
    if (!root) return;
    var r = root.shadowRoot || root;
    var sel = r.querySelector('.fcitx-keyboard-symbol-selector') || document.querySelector('.fcitx-keyboard-symbol-selector');
    if (!sel) return;
    var cats = sel.querySelector('.fcitx-keyboard-symbol-categories');
    var panel = sel.querySelector('.fcitx-keyboard-symbol-panel');
    if (!cats || !panel) return;
    if (panel.querySelector('.lex-sym-item')) return; // 已重建,避免自触发循环
    installKbdStyle();
    cats.innerHTML = '';
    panel.innerHTML = '';
    function mkItem(sym) {
      var it = document.createElement('div');
      it.className = 'fcitx-keyboard-symbol-item lex-sym-item';
      it.textContent = sym;
      it.addEventListener('click', function () { lexFcitxCommit(sym); });
      return it;
    }
    function fill(i) {
      panel.innerHTML = '';
      var cat = LEX_SYMBOL_CATS[i];
      for (var j = 0; j < cat.symbols.length; j++) panel.appendChild(mkItem(cat.symbols[j]));
      var cbs = cats.querySelectorAll('.fcitx-keyboard-symbol-category');
      for (var k = 0; k < cbs.length; k++) cbs[k].classList.toggle('fcitx-keyboard-pressed', k === i);
    }
    LEX_SYMBOL_CATS.forEach(function (cat, i) {
      var cb = document.createElement('div');
      cb.className = 'fcitx-keyboard-symbol-category' + (i === 0 ? ' fcitx-keyboard-pressed' : '');
      cb.textContent = cat.key;
      cb.addEventListener('click', function () { fill(i); });
      cats.appendChild(cb);
    });
    fill(0);
  }

  // 向 fcitx 提交符号:优先库的 commit(若暴露),否则仿 changeInput 直接写值
  function lexFcitxCommit(sym) {
    try { if (typeof window.fcitx.commit === 'function') { window.fcitx.commit(sym); return; } } catch (e) {}
    var input = document.activeElement;
    if (!input || (input.tagName !== 'TEXTAREA' && input.tagName !== 'INPUT')) return;
    var start = input.selectionStart || 0;
    var end = input.selectionEnd || 0;
    input.value = input.value.slice(0, start) + sym + input.value.slice(end);
    input.selectionStart = input.selectionEnd = start + sym.length;
    try { input.dispatchEvent(new Event('change')); } catch (e) {}
  }

  function watchFcitxSymbols() {
    if (_symObs) return;
    var root = document.getElementById('fcitx-virtual-keyboard');
    if (!root || !window.MutationObserver) return;
    var r = root.shadowRoot || root;
    var timer = null;
    _symObs = new MutationObserver(function () {
      if (timer) clearTimeout(timer);
      timer = setTimeout(styleFcitxSymbols, 0);
    });
    _symObs.observe(r, { childList: true, subtree: true });
    styleFcitxSymbols();
  }

  function installKbdHaptics() {
    if (window._lexKbdHaptics) return;
    window._lexKbdHaptics = true;
    // 触屏输入由 .fcitx-keyboard-mask 统一分发,touch 的 target 是 mask 而非按键,
    // 库内部按坐标命中按键容器。这里同样按坐标判定:命中任一按键容器即触发短震动,
    // 与按下时刻(视觉反馈)同步。时间戳去重避免 touch+mouse 双震。
    var _lastBuzz = 0;
    function buzz() {
      var now = Date.now();
      if (now - _lastBuzz < 40) return; // 40ms 内忽略重复触发
      _lastBuzz = now;
      try { if (navigator.vibrate) navigator.vibrate(15); } catch (err) {}
    }
    function hitKey(e) {
      if (!isActive()) return;
      var root = document.getElementById('fcitx-virtual-keyboard');
      if (!root) return;
      var r = root.shadowRoot || root;
      var containers = r.querySelectorAll('.fcitx-keyboard-key-container');
      for (var i = 0; i < containers.length; i++) {
        var box = containers[i].getBoundingClientRect();
        if (e.clientX >= box.left && e.clientX <= box.right && e.clientY >= box.top && e.clientY <= box.bottom) {
          buzz();
          return;
        }
      }
    }
    // touchstart 用 capture:先于键盘容器的 preventDefault,保证触屏也触发
    document.addEventListener('touchstart', function (e) {
      var t = e.changedTouches && e.changedTouches[0];
      if (!t) return;
      hitKey(t);
    }, { capture: true, passive: true });
    // 混合设备/桌面鼠标兜底
    document.addEventListener('mousedown', hitKey, { capture: true, passive: true });
  }

  function initKbdRestyle() {
    if (_state !== 'ready') return;
    try {
      watchKbdRebuild();
      installKbdHaptics();
      watchFcitxSymbols();
      styleFcitxKbd();
    } catch (e) {}
  }

  // ---------- 状态通知 ----------
  function fireState() {
    for (var i = 0; i < _listeners.length; i++) {
      try { _listeners[i](_state, _mode); } catch (e) {}
    }
  }

  // ---------- 回车特判(复用内置 imeEnter 的 userInput / todoInput 分支) ----------
  function handleFcitxEnter(el, v) {
    var id = el.id;
    el.value = v.slice(0, -1); // 剥离 fcitx5 插入的尾部换行
    try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) {}
    _snap[id] = el.value;

    if (id === 'userInput') {
      var t = el.value.trim();
      if (t && !window.streaming) {
        el.value = ''; el.style.height = 'auto';
        _snap[id] = '';
        try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
        if (typeof window.sendMsg === 'function') window.sendMsg(t);
      } else {
        // 空内容或 streaming 中:保留去换行后的文本,仍派发 input 让业务感知
        try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
      }
      return;
    }
    if (id === 'todoInput') {
      try {
        el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      } catch (e) {}
      return;
    }
  }

  function onFcitxChange(el) {
    var id = el.id;
    var v = el.value;
    // 仅 userInput/todoInput:恰好在末尾被 fcitx5 追加一个 \n → 视为"回车"
    var isEnter = (id === 'userInput' || id === 'todoInput') &&
                  _snap[id] != null && v === _snap[id] + '\n';
    if (isEnter) {
      handleFcitxEnter(el, v);
    } else {
      _snap[id] = v;
      try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
    }
  }

  // ---------- 事件监听(桥加载时立即注册,内部按状态自检) ----------

  // 焦点守卫(capture)。fcitx.enable() 会把输入框置只读并在 focus 时接管;
  // 该监听注册在 enable() 之前,先于 fcitx 的 focus 监听执行,对排除输入框
  // 阻断 fcitx 处理并确保可编辑,使其继续走原生键盘。
  document.addEventListener('focus', function (e) {
    var el = e.target;
    if (!isActive()) return;
    if (!isManaged(el)) {
      try { e.stopImmediatePropagation(); } catch (err) {}
      try { el.readOnly = false; } catch (err) {}
      return;
    }
    if (el.id) _snap[el.id] = el.value; // 记录快照供回车特判
  }, true);

  // 触屏点按提前放行排除输入框:fcitx.enable() 的置只读在 touchstart 时仍生效,
  // iOS 按 readonly 决定是否弹原生键盘,这里在取焦前先取消只读。
  document.addEventListener('touchstart', function (e) {
    if (!isActive()) return;
    var el = e.target;
    if (el && el.tagName && !isManaged(el)) {
      try { el.readOnly = false; } catch (err) {}
    }
  }, { passive: true, capture: true });

  // change→input 桥:fcitx5 的 commit()/updateInput() 只派发非冒泡 change,
  // 这里补派冒泡 input,保证 oninput 过滤/输入框自适应/笔记保存正常。
  document.addEventListener('change', function (e) {
    if (!isActive()) return;
    var el = e.target;
    if (!isManaged(el)) return;
    onFcitxChange(el);
  }, true);

  // ---------- 引擎加载 ----------
  function load() {
    (async function () {
      try {
        var mod = await import('./fcitx5/Fcitx5.js');
        await mod.fcitxReady;
        var fcitx = window.fcitx;
        if (!fcitx) throw new Error('fcitx 未定义');
        _fcitx = fcitx;

        fcitx.useWorker = true;              // 拼音不触发 RIME worker,置位对齐官方用法
        try { fcitx.createPanel(); } catch (e) {} // 桌面端候选窗
        fcitx.setInputMethodsCallback(function () {});
        fcitx.setStatusAreaCallback(function () {});

        // 安装拼音插件(IDBFS 持久化,装过则跳过,避免每次重下 36MB)
        var installed = [];
        try { installed = fcitx.getInstalledPlugins() || []; } catch (e) {}
        if (installed.indexOf('chinese-addons') < 0) {
          var resp = await fetch(PLUGIN_URL);
          if (!resp.ok) throw new Error('插件下载失败 ' + resp.status);
          var ab = await resp.arrayBuffer();
          fcitx.installPlugin(ab); // installPlugin 内部已 reload()
        }
        // 已装插件经 IDBFS 恢复后,插件的 addon 尚未加载,getInputMethods() 为空;
        // 这里总是再 reload() 一次:新装时是幂等冗余,恢复时是必需的。
        fcitx.reload();
        fcitx.updateInputMethods();

        fcitx.enable();      // 只调一次:建键盘、装焦点/按键监听、触屏置只读
        sweepReadonly(true); // 桌面也统一只读 + 排除输入框放行

        // 切换到拼音输入法
        try {
          var ims = fcitx.getInputMethods() || [];
          var target = 'pinyin', hit = false;
          for (var i = 0; i < ims.length; i++) {
            if (ims[i] && ims[i].name === target) { hit = true; break; }
          }
          if (!hit) {
            for (var j = 0; j < ims.length; j++) {
              if (ims[j] && ims[j].name && ims[j].name.indexOf('pinyin') === 0) {
                target = ims[j].name; hit = true; break;
              }
            }
          }
          if (hit) fcitx.setCurrentInputMethod(target);
        } catch (e) {}

        _state = 'ready';
        fireState();
        configure(_mode); // 应用当前模式(含键盘切换与只读)
        initKbdRestyle(); // 键盘简化 + 触感(幂等)
      } catch (err) {
        console.error('[fcitx5] 加载失败,回退内置键盘:', err);
        _state = 'failed';
        fireState();
      }
    })();
  }

  // ---------- 模式切换 ----------
  function configure(mode) {
    var prev = _mode;
    _mode = (mode === 'builtin') ? 'builtin' : 'fcitx';
    if (_state === 'ready' && prev !== _mode) {
      if (_mode === 'builtin') {
        sweepReadonly(false);              // 交还内置键盘接管
        try {
          var ae = document.activeElement;
          if (ae && isManaged(ae)) ae.blur(); // 收起 fcitx 键盘
        } catch (e) {}
      } else {
        hideBuiltinIme();                  // 收起内置键盘
        sweepReadonly(true);
        initKbdRestyle();                  // 键盘简化 + 触感
        // 若正聚焦受管输入框,blur+refocus 让 fcitx 立即接管
        try {
          var ae2 = document.activeElement;
          if (ae2 && isManaged(ae2)) {
            ae2.blur();
            setTimeout(function () { try { ae2.focus(); } catch (e) {} }, 50);
          }
        } catch (e) {}
      }
    }
    fireState();
  }

  function prelaunch() {
    if (_state !== 'idle') return;
    _state = 'loading';
    fireState();
    load();
  }

  window.FCITX5 = {
    get state() { return _state; },
    get mode() { return _mode; },
    get ready() { return _state === 'ready'; },
    isActive: isActive,
    prelaunch: prelaunch,
    configure: configure,
    onState: function (fn) {
      if (typeof fn === 'function') { _listeners.push(fn); fireState(); }
      return window.FCITX5;
    }
  };

  // 页面交互就绪后空闲预载(延迟加载,首载期间内置键盘照常可用)
  if (document.readyState === 'complete') {
    setTimeout(prelaunch, 600);
  } else {
    window.addEventListener('load', function () { setTimeout(prelaunch, 600); });
  }
})();
