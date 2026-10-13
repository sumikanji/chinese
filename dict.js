/*! © 2026 Sumi — chạm vào từ để tra nghĩa, ⭐ lưu vào Sổ tay để ôn tập (dùng chung cho Sumi English và Sumi Chinese) */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ST = () => window.SEStore, SP = () => window.SESpeech, UI = () => window.SEUI;
  const IC = n => (window.SEI ? window.SEI(n) : '');
  const ZH = window.SE_LANG === 'zh';
  const POS = { n: 'danh từ', v: 'động từ', adj: 'tính từ', adv: 'trạng từ', pron: 'đại từ', prep: 'giới từ', conj: 'liên từ', det: 'từ hạn định', num: 'số từ', int: 'thán từ', phr: 'cụm từ', name: 'tên riêng' };
  // Vùng có chữ học được tra (bong bóng hội thoại, thẻ nói theo, dòng Shadowing, thẻ ôn tập)
  const AREAS = '.chat, .tk, .sd-lines, .rv-card, .nb';
  // Chữ đang bị làm mờ/ẩn thì chạm để hiện, không tra
  const HIDDEN = '.tk-card.hid .tk-peek, .tk-bub.blur, .tk-bub.ask:not(.peek), .chat.hide-en .bub:not(.shown), .sd-lines.hide-en .sd-line:not(.shown):not(.cur)';

  const D = () => window.SE_DICT || {};
  const keyOf = w => ZH ? w : w.replace(/[’]/g, "'").replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9'-]+$/g, '').replace(/[.]+$/, '').toLowerCase();
  function lookup(w) { const k = keyOf(w); const e = D()[k]; return e ? { k, pos: e[0], vi: e[1], ph: e[2] || '' } : { k, pos: '', vi: '', ph: '' }; }

  // ---------- Sổ tay ----------
  const nid = k => 'w:' + k;
  const saved = k => !!(ST().get().custom || {})[nid(k)];
  function save(it) {
    const S = ST().get(); S.custom = S.custom || {};
    if (S.gone) delete S.gone[nid(it.k)];
    S.custom[nid(it.k)] = { en: it.w, vi: it.vi || '', src: 'Sổ tay', ph: it.ph || '', word: 1, at: Date.now() };
    if (!S.cards[nid(it.k)]) S.cards[nid(it.k)] = { b: 0, due: Date.now(), r: 0, w: 0 };
    ST().save();
  }
  function unsave(k) { const S = ST().get(); if (S.custom) delete S.custom[nid(k)]; delete S.cards[nid(k)]; S.gone = S.gone || {}; S.gone[nid(k)] = Date.now(); ST().save(); }
  const list = () => Object.entries(ST().get().custom || {}).filter(([id, c]) => /^w:/.test(id) && c.word).map(([id, c]) => Object.assign({ id, k: id.slice(2) }, c)).sort((a, b) => (b.at || 0) - (a.at || 0));

  // ---------- Khung tra nghĩa ----------
  let open = null;
  function close() { if (!open) return; const o = open; open = null; o.sheet.classList.remove('in'); o.dim.classList.remove('in'); $$('.dict-on').forEach(x => x.classList.remove('dict-on')); setTimeout(() => { o.sheet.remove(); o.dim.remove(); }, 220); }
  function sheet(word, py, el) {
    close();
    const it = lookup(word); it.w = ZH ? word : (D()[it.k] ? it.k : word.replace(/[^A-Za-z0-9'’-]+$/g, ''));
    if (ZH && py) it.ph = it.ph || py;
    const ex = el && el.closest('.bub, .tk-bub, .tk-card, .sd-line, .rv-card');
    const exT = ex ? (ex.querySelector('.en, .tk-t, .say-en') || {}).innerText || '' : '';
    const exV = ex ? (ex.querySelector('.vi, .tk-vi') || {}).textContent || '' : '';
    const dim = document.createElement('div'); dim.className = 'dict-dim';
    const sh = document.createElement('div'); sh.className = 'dict-sheet'; sh.setAttribute('role', 'dialog');
    const hl = s => ZH ? esc(s.replace(/\n.*$/gm, '')).split(esc(it.w)).join('<b>' + esc(it.w) + '</b>') : esc(s).replace(new RegExp('\\b(' + it.w.replace(/[^\w']/g, '') + ')\\b', 'i'), '<b>$1</b>');
    sh.innerHTML = '<div class="dict-grab"></div><div class="dict-hd"><div class="dict-wt"><div class="dict-w">' + esc(it.w) + (it.pos ? '<span class="dict-pos">' + esc(POS[it.pos] || it.pos) + '</span>' : '') + '</div>' +
      (it.ph ? '<div class="dict-ph">' + esc(it.ph) + '</div>' : '') + '</div>' +
      '<div class="dict-ib"><button class="dict-say" aria-label="Nghe">' + IC('speak') + '</button><button class="dict-star' + (saved(it.k) ? ' on' : '') + '" aria-label="Lưu vào Sổ tay">' + IC('star') + '</button></div></div>' +
      '<div class="dict-vi">' + (it.vi ? esc(it.vi) : '<span class="muted">Đang cập nhật nghĩa</span>') + '</div>' +
      (exT && !ZH ? '<div class="dict-ex">' + hl(exT.trim()) + (exV ? '<small>' + esc(exV) + '</small>' : '') + '</div>' : '') +
      (exT && ZH ? '<div class="dict-ex">' + hl(Array.from(ex.querySelectorAll('ruby')).map(r => r.firstChild ? r.firstChild.textContent : '').join('') || exT) + (exV ? '<small>' + esc(exV) + '</small>' : '') + '</div>' : '');
    document.body.append(dim, sh);
    requestAnimationFrame(() => { dim.classList.add('in'); sh.classList.add('in'); });
    open = { sheet: sh, dim };
    dim.onclick = close;
    let y0 = null; sh.addEventListener('touchstart', e => { y0 = e.touches[0].clientY; }, { passive: true }); sh.addEventListener('touchend', e => { if (y0 != null && e.changedTouches[0].clientY - y0 > 60) close(); y0 = null; });
    $('.dict-say', sh).onclick = () => SP().speak(it.w, { who: 'A' });
    $('.dict-star', sh).onclick = e => {
      const b = e.currentTarget;
      if (saved(it.k)) { unsave(it.k); b.classList.remove('on'); UI() && UI().toast('Đã bỏ khỏi Sổ tay'); }
      else { save(it); b.classList.add('on'); UI() && UI().toast('Đã lưu vào Sổ tay để ôn tập'); }
      UI() && UI().refreshTop && UI().refreshTop();
    };
    SP().speak(it.w, { who: 'A' });
  }

  // Chạm vào từ: bắt ở pha capture để không kích hoạt nút phát câu bên dưới
  document.addEventListener('click', e => {
    const t = e.target;
    if (!t.closest || t.closest('.dict-sheet')) return;
    const area = t.closest(AREAS); if (!area) return;
    const wEl = ZH ? t.closest('.wd') : t.closest('.w');
    if (!wEl || !area.contains(wEl)) return;
    if (wEl.closest(HIDDEN)) return;
    let word, py = '';
    if (ZH) { const rs = $$('ruby', wEl); word = rs.map(r => r.firstChild ? r.firstChild.textContent : '').join(''); py = rs.map(r => (r.querySelector('rt') || {}).textContent || '').join(' '); }
    else word = wEl.textContent;
    if (!word || !/[A-Za-z\u4e00-\u9fff]/.test(word)) return;
    e.preventDefault(); e.stopPropagation();
    $$('.dict-on').forEach(x => x.classList.remove('dict-on')); wEl.classList.add('dict-on');
    sheet(word, py, wEl);
  }, true);
  window.addEventListener('hashchange', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  // ---------- Ôn tập Sổ tay bằng flashcard ----------
  const dueWords = () => { const C = ST().get().cards, now = Date.now(); return list().filter(c => !C[c.id] || C[c.id].due <= now); };
  function flash(app) {
    const due = dueWords();
    const deck = (due.length ? due : list().slice().sort(() => Math.random() - .5)).slice(0, 20);
    const graded = due.length > 0;
    let i = 0, good = 0, flipped = false;
    if (!deck.length) { location.hash = '#/sotay'; return; }
    const card = c => '<div class="fc-in"><div class="fc-face fc-front"><div class="fc-w' + (ZH ? ' zh' : '') + '">' + esc(c.en) + '</div>' + (c.ph && !ZH ? '<div class="fc-ph">' + esc(c.ph) + '</div>' : '') + '</div>' +
      '<div class="fc-face fc-back"><div class="fc-w sm' + (ZH ? ' zh' : '') + '">' + esc(c.en) + '</div>' + (c.ph ? '<div class="fc-ph">' + esc(c.ph) + '</div>' : '') +
      (lookup(c.en).pos ? '<div class="fc-pos">' + esc(POS[lookup(c.en).pos] || '') + '</div>' : '') + '<div class="fc-vi">' + esc(c.vi || lookup(c.en).vi || '') + '</div></div></div>';
    const show = () => {
      const c = deck[i]; flipped = false;
      app.innerHTML = '<div class="fc"><div class="fc-top"><a class="fc-x" href="#/sotay" aria-label="Đóng">' + IC('chevL') + '</a><div class="fc-bar"><i style="width:' + (i / deck.length * 100) + '%"></i></div><span class="fc-n">' + (i + 1) + '/' + deck.length + '</span></div>' +
        '<button class="fc-card" id="fc">' + card(c) + '</button>' +
        '<div class="fc-act"><button class="fc-say" id="fc-say" aria-label="Nghe">' + IC('speak') + '</button></div>' +
        '<div class="fc-btns" id="fc-btns"><button class="fc-b no" id="fc-no">Chưa nhớ</button><button class="fc-b ok" id="fc-ok">Nhớ rồi</button></div></div>';
      const el = $('#fc', app), btns = $('#fc-btns', app);
      const flip = () => { flipped = !flipped; el.classList.toggle('on', flipped); btns.classList.add('in'); };
      el.onclick = flip;
      $('#fc-say', app).onclick = () => SP().speak(c.en, { who: 'A' });
      const ans = ok => { if (graded) ST().grade(c.id, ok); if (ok) good++; el.classList.add(ok ? 'out-r' : 'out-l'); setTimeout(() => { i++; i < deck.length ? show() : end(); }, 260); };
      $('#fc-ok', app).onclick = () => ans(true);
      $('#fc-no', app).onclick = () => ans(false);
      let x0 = null, dx = 0;
      el.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; dx = 0; }, { passive: true });
      el.addEventListener('touchmove', e => { if (x0 == null) return; dx = e.touches[0].clientX - x0; if (flipped) el.style.transform = 'translateX(' + dx + 'px) rotate(' + dx / 20 + 'deg)'; }, { passive: true });
      el.addEventListener('touchend', () => { el.style.transform = ''; if (flipped && Math.abs(dx) > 80) { ans(dx > 0); } x0 = null; });
      SP().speak(c.en, { who: 'A' });
    };
    const end = () => {
      const left = dueWords().length;
      app.innerHTML = '<div class="fc fc-end"><div class="hy">' + (UI() && UI().hiyo ? UI().hiyo(good === deck.length ? 'cheer' : 'joy') : '') + '</div><h2>Ôn xong ' + deck.length + ' từ!</h2><p class="muted">Nhớ: <b>' + good + '</b> · Chưa nhớ: <b>' + (deck.length - good) + '</b></p>' +
        '<div class="fc-endb">' + (left ? '<button class="btn primary" id="fc-more">Ôn tiếp ' + left + ' từ</button>' : '<button class="btn primary" id="fc-more">Ôn lại</button>') + '<a class="btn" href="#/sotay">Về Sổ tay</a></div></div>';
      $('#fc-more', app).onclick = () => flash(app);
      UI() && UI().refreshTop && UI().refreshTop();
    };
    show();
  }

  // ---------- Trang Sổ tay ----------
  function view(app) {
    const L = list();
    app.innerHTML = '<div class="nb"><h1 class="sd-title">Sổ tay</h1>' +
      (L.length ? '<div class="nb-top"><span class="muted">' + L.length + ' từ</span><a class="btn primary small" href="#/sotay/the">' + IC('review') + (dueWords().length ? 'Ôn ' + dueWords().length + ' từ' : 'Ôn tập') + '</a></div><div class="nb-list">' +
        L.map(c => '<div class="nb-i" data-k="' + esc(c.k) + '"><button class="nb-say" aria-label="Nghe">' + IC('speak') + '</button><div class="nb-t"><b>' + esc(c.en) + '</b>' + (c.ph ? '<small>' + esc(c.ph) + '</small>' : '') + '<span>' + esc(c.vi || '') + '</span></div><button class="nb-del" aria-label="Bỏ khỏi sổ tay">' + IC('star') + '</button></div>').join('') + '</div>'
        : '<div class="nb-empty">' + IC('star') + '<p class="muted">Chạm vào một từ trong bài, bấm ⭐ để lưu vào đây.</p></div>') + '</div>';
    $$('.nb-i', app).forEach(r => {
      const c = L.find(x => x.k === r.dataset.k);
      $('.nb-say', r).onclick = () => SP().speak(c.en, { who: 'A' });
      $('.nb-del', r).onclick = () => { unsave(c.k); r.remove(); UI() && UI().toast('Đã bỏ khỏi Sổ tay'); if (!$('.nb-i', app)) view(app); };
    });
  }

  window.SEDICT = { lookup, sheet, close, view, flash, list, saved, dueWords };
})();
