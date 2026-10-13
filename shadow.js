/*! © 2026 Sumi Chinese — Shadowing: nghe và nói đuổi theo đoạn văn tự kể chuyện */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const SP = () => window.SESpeech, ST = () => window.SEStore, UI = () => window.SEUI;
  const ALL = () => window.SE_SHADOW || [];
  const LV = ['hsk1', 'hsk2', 'hsk3', 'hsk4', 'hsk5', 'hsk6'];
  const lvInfo = id => (window.SE_DATA || []).find(L => L.id === id) || { name: id.toUpperCase(), color: '#a16207', title: '' };
  const best = (id, m) => ST().cfg('sh_' + id + '_' + m);
  const setBest = (id, m, v) => { if (v > (best(id, m) || 0)) ST().cfg('sh_' + id + '_' + m, v); };
  const WHO = 'A';
  const MODES = [['listen', 'Nghe', 'speak'], ['say', 'Nói từng câu', 'mic'], ['tell', 'Kể lại cả đoạn', 'chat']];
  const I = n => window.SEI ? window.SEI(n) : '';

  // ================= Danh sách =================
  function viewList(app) {
    const cur = ST().cfg('shLv') || 'all';
    const list = ALL();
    const lvs = LV.filter(l => list.some(x => x.lv === l));
    app.innerHTML = '<h1 class="sd-title">Shadowing</h1>' +
      '<div class="sd-filter" id="flt">' + [['all', 'Tất cả']].concat(lvs.map(l => [l, lvInfo(l).name])).map(x => '<button class="chip' + (cur === x[0] ? ' on' : '') + '" data-l="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>' +
      '<div id="sdl"></div>';
    const draw = l => {
      $('#sdl').innerHTML = lvs.filter(x => l === 'all' || x === l).map(lv => {
        const L = lvInfo(lv), items = list.filter(x => x.lv === lv);
        return '<h2 class="sec"><span class="lvl-badge sm" style="background:' + L.color + '">' + L.name + '</span> ' + esc(L.title || '') + '</h2><div class="sd-grid">' + items.map((x, i) => {
          const sc = [best(x.id, 'say'), best(x.id, 'tell')].filter(v => v != null);
          return '<a class="card sd-card" href="#/shadow/' + x.id + '"><span class="num" style="color:' + L.color + '">' + (i + 1) + '</span><span class="sd-tt"><b>' + esc(x.t) + '</b><small class="en zh-t">' + esc(x.en) + '</small><small class="muted">' + x.s.length + ' câu' + (sc.length ? ' · cao nhất ' + Math.max(...sc) + ' điểm' : '') + '</small></span></a>';
        }).join('') + '</div>';
      }).join('');
    };
    draw(cur);
    $$('#flt .chip').forEach(b => b.onclick = () => { ST().cfg('shLv', b.dataset.l); $$('#flt .chip').forEach(x => x.classList.toggle('on', x === b)); draw(b.dataset.l); });
  }

  // ================= Một đoạn văn =================
  function viewItem(app, x, mode) {
    mode = MODES.some(m => m[0] === mode) ? mode : 'listen';
    const L = lvInfo(x.lv);
    const list = ALL().filter(y => y.lv === x.lv), idx = list.indexOf(x);
    const nx = ALL()[ALL().indexOf(x) + 1];
    app.innerHTML = '<a class="back" href="#/shadow">← Shadowing</a>' +
      '<div class="sd-head"><span class="lvl-badge sm" style="background:' + L.color + '">' + L.name + '</span><div><h1>' + esc(x.t) + '</h1><span class="muted"><span class="zh-t">' + esc(x.en) + '</span> · Bài ' + (idx + 1) + '/' + list.length + '</span></div></div>' +
      '<nav class="voc-modes">' + MODES.map(m => '<a class="chip' + (m[0] === mode ? ' on' : '') + '" href="#/shadow/' + x.id + '/' + m[0] + '">' + I(m[2]) + m[1] + (best(x.id, m[0]) != null ? ' · ' + best(x.id, m[0]) : '') + '</a>').join('') + '</nav>' +
      '<section class="card panel" id="sp"></section>' +
      '<div class="sd-foot"><button class="btn primary sd-done" id="addrv">' + I('check') + (ST().cfg('sh_' + x.id + '_done') ? 'Đã học xong ✓' : 'Đã học xong') + '</button>' + (nx ? '<a class="btn" href="#/shadow/' + nx.id + '">Bài tiếp: ' + esc(nx.t) + ' →</a>' : '') + '</div>';
    $('#addrv').onclick = e => {
      ST().addCards(x.s.map((_, i) => 'h:' + x.id + ':' + i));
      ST().cfg('sh_' + x.id + '_done', 1); ST().touch(5);
      UI().refreshTop(); UI().toast('Đã học xong! ' + x.s.length + ' câu đã vào Ôn tập.');
      location.hash = nx ? '#/shadow/' + nx.id : '#/shadow';
    };
    const P = $('#sp');
    if (window.SEX) { app.insertAdjacentHTML('beforeend', '<div id="sd-cmt"></div>'); window.SEX.comments($('#sd-cmt'), { key: x.id, title: 'Shadowing · ' + x.t, lines: x.s.map(r => ({ t: r[0], v: r[1] })) }); }
    return { listen: modeListen, say: modeSay, tell: modeTell }[mode](P, x);
  }

  // ----- Nghe & nói đuổi -----
  function modeListen(P, x) {
    const hideEn = !!ST().cfg('shHideEn'), hideVi = !!ST().cfg('shHideVi'), showPy = ST().cfg('hidePy') !== true;
    let slow = false, loop = false, gap = false, run = 0, cur = -1;
    P.innerHTML = '<div class="sd-ctl">' +
      '<div class="pbar"><button class="pbar-play" id="play">' + I('play') + 'Phát cả đoạn</button><div class="tg"><button class="tg-b" id="slow">' + I('slow') + 'Đọc chậm</button></div>' +
      '<div class="pbar-r2"><span class="tg-l">' + I('eye') + 'Hiện</span><div class="tg"><button class="tg-b' + (hideEn ? '' : ' on') + '" id="ten">Chữ Hán</button><button class="tg-b' + (showPy ? ' on' : '') + '" id="tpy">Pinyin</button><button class="tg-b' + (hideVi ? '' : ' on') + '" id="tvi">Nghĩa</button></div></div></div>' + '</div>' +
      '<div class="sd-lines' + (gap ? ' gapmode' : '') + (hideEn ? ' hide-en' : '') + (hideVi ? ' hide-vi' : '') + '" id="ls">' + x.s.map((s, i) => '<button class="sd-line" data-i="' + i + '"><span class="n">' + (i + 1) + '</span><span class="tx"><span class="en zh">' + UI().zh(s[2]) + '</span><span class="vi">' + esc(s[1]) + '</span></span><span class="turnbar"><i></i></span></button>').join('') + '</div>';
    const ls = $('#ls', P), lines = $$('.sd-line', ls);
    UI().bindVoice(P);
    const tog = (id, f) => { $('#' + id, P).onclick = e => { const v = f(); e.currentTarget.classList.toggle('on', v); }; };
    tog('slow', () => (slow = !slow));
    tog('ten', () => { const h = ls.classList.toggle('hide-en'); ST().cfg('shHideEn', h); return !h; });
    tog('tvi', () => { const h = ls.classList.toggle('hide-vi'); ST().cfg('shHideVi', h); return !h; });
    tog('tpy', () => { const on = ST().cfg('hidePy') === true; ST().cfg('hidePy', !on); UI().setPy(on); return on; });
    const keepInView = el => {
      const r = el.getBoundingClientRect(), top = 70, bot = window.innerHeight - 90;
      if (r.top < top || r.bottom > bot) window.scrollTo({ top: window.scrollY + r.top - window.innerHeight * 0.35, behavior: 'smooth' });
    };
    const mark = i => { cur = i; lines.forEach((b, j) => b.classList.toggle('cur', j === i)); if (i >= 0) keepInView(lines[i]); };
    async function line(i, my, withGap) {
      mark(i);
      const nxt = x.s[i + 1]; if (nxt) SP().prefetch(nxt[0], WHO);
      const t0 = Date.now();
      await SP().speak(x.s[i][0], { who: WHO, slow });
      if (my !== run) return;
      if (withGap) {
        const b = lines[i];
        if (SP().canListen()) {
          b.classList.add('yours');
          b.insertAdjacentHTML('beforeend', '<span class="sd-you"><i></i><b></b></span>');
          const you = b.lastElementChild;
          const ms = Math.min(12000, Math.max(3000, (Date.now() - t0) * 1.6 + 1500));
          const tgt = window.SE_LANG === 'zh' ? x.s[i][2] : x.s[i][0];
          const r = await SP().listen(tgt, { maxMs: ms, onInterim: t => { $('b', you).textContent = t; } });
          b.classList.remove('yours'); b.classList.add('shown');
          if (my !== run) { you.remove(); return; }
          if (r && !r.error) {
            $('b', you).textContent = r.heard || '…';
            const marks = SP().markWords(tgt, r);
            $$('.en .w', b).forEach((w, j) => { const m = marks[j]; w.classList.remove('g', 'm', 'r'); if (m) w.classList.add(m.ok >= 0.99 ? 'g' : m.ok > 0 ? 'm' : 'r'); });
            $('i', you).textContent = r.score; $('i', you).className = r.score >= 85 ? 'g' : r.score >= 60 ? 'm' : 'r';
          } else you.remove();
          await wait(600);
        } else {
          const ms = Math.min(9000, Math.max(1500, (Date.now() - t0) * 1.15 + 500));
          const bar = $('.turnbar i', b); b.classList.add('yours');
          bar.style.transition = 'none'; bar.style.width = '0%'; void bar.offsetWidth;
          bar.style.transition = 'width ' + ms + 'ms linear'; bar.style.width = '100%';
          await wait(ms);
          b.classList.remove('yours'); bar.style.transition = 'none'; bar.style.width = '0%';
          b.classList.add('shown');
        }
      } else await wait(350);
    }
    const playBtn = $('#play', P);
    const stopAll = () => { run++; SP().stop(); SP().stopListening(); playBtn.innerHTML = I('play') + 'Phát cả đoạn'; playBtn.classList.remove('on'); lines.forEach(b => b.classList.remove('yours')); };
    playBtn.onclick = async () => {
      if (playBtn.classList.contains('on')) return stopAll();
      const my = ++run;
      playBtn.innerHTML = I('stop') + 'Dừng'; playBtn.classList.add('on');
      if (gap) lines.forEach(b => { b.classList.remove('shown'); $$('.sd-you', b).forEach(e => e.remove()); $$('.w', b).forEach(w => w.classList.remove('g', 'm', 'r')); });
      SP().prefetch(x.s[0][0], WHO);
      do {
        for (let i = 0; i < x.s.length && my === run; i++) await line(i, my, gap);
        if (my === run) { ST().touch(2); UI().refreshTop(); }
      } while (loop && my === run);
      if (my === run) { stopAll(); mark(-1); }
    };
    lines.forEach((b, i) => b.onclick = async () => {
      stopAll(); const my = ++run;
      b.classList.add('shown');
      await line(i, my, false);
      if (my === run) mark(i);
    });
    return () => { run++; };
  }

  // ----- Nói từng câu (giống phần Nói theo của bài học) -----
  function modeSay(P, x) {
    const sc = {};
    const list = x.s.map(s => [WHO, s[0], s[1], s[2]]);
    const end = () => {
      const v = Object.values(sc);
      if (!v.length) { UI().toast('Hãy nói ít nhất một câu nhé'); return; }
      const avg = Math.round(v.reduce((a, b) => a + b, 0) / v.length);
      setBest(x.id, 'say', avg); ST().touch(v.length); UI().refreshTop();
      UI().beep(avg >= 70);
      P.className = 'card panel pop';
      P.innerHTML = '<div class="result"><div class="hy">' + UI().hiyo(avg >= 85 ? 'cheer' : 'joy') + '</div><h2 class="res-t">Điểm trung bình: ' + avg + '</h2></div>' +
        '<div class="next-bar"><button class="btn" id="ag">Luyện lại</button><a class="btn primary" href="#/shadow/' + x.id + '/tell">Kể lại cả đoạn →</a></div>';
      $('#ag', P).onclick = () => modeSay(P, x);
    };
    return UI().tkOne(P, list, { onScore: (k, v) => { sc[k] = Math.max(sc[k] || 0, v); }, onEnd: end, endLabel: 'Xong' });
  }

  // ----- Kể lại cả đoạn (cùng kiểu giao diện) -----
  function modeTell(P, x) {
    const ZH = window.SE_LANG === 'zh';
    const full = x.s.map(s => s[0]).join(ZH ? '' : ' ');
    const d = [WHO, full, '', ZH ? [].concat(...x.s.map(s => s[2] || [])) : null];
    const nw = ZH ? Array.from(full).length : full.split(/\s+/).length;
    let run = 0, peek = false;
    P.className = 'tk-panel pop';
    P.innerHTML = '<div class="tk one tell"><div class="tk-stage" id="tkC">' +
      '<div class="tk-card hid" id="tkCard"><ol class="tk-ol">' + x.s.map(s => '<li>' + esc(s[1]) + '</li>').join('') + '</ol>' +
      '<button class="tk-peek" id="tkK"><span class="tk-t">' + UI().tkText(d) + '</span><em>' + I('eye') + 'Chạm để xem cả đoạn</em></button><span class="tk-sc"></span></div>' +
      '<div class="tk-rec" id="tkR"></div></div><div class="tk-stat" id="tkS"></div>' +
      UI().tkDock(['tkL', 'speak', 'Nghe'], ['tkW', 'slow', 'Chậm']) + '</div>';
    const C = $('#tkC', P), S = $('#tkS', P), M = $('#tkM', P), card = $('#tkCard', P);
    const playAll = async slow => {
      const my = ++run;
      for (let i = 0; i < x.s.length && my === run; i++) { if (x.s[i + 1]) SP().prefetch(x.s[i + 1][0], WHO); await SP().speak(x.s[i][0], { who: WHO, slow }); if (my === run) await wait(300); }
    };
    $('#tkK', P).onclick = () => { if (!card.classList.toggle('hid') && !card.classList.contains('done')) peek = true; };
    $('#tkL', P).onclick = () => playAll(false);
    $('#tkW', P).onclick = () => playAll(true);
    M.onclick = async () => {
      run++;
      const r = await UI().tkSay(M, S, d, { continuous: true, maxMs: Math.min(150000, 20000 + nw * (ZH ? 450 : 700)) });
      if (!r) return;
      const first = !card.classList.contains('done');
      card.classList.remove('hid'); card.classList.add('done');
      if (r.heard != null) UI().tkMark(card, d, r);
      const sc = Math.max(0, r.score - (peek ? 15 : 0));
      UI().tkScore(card, sc);
      setBest(x.id, 'tell', sc); ST().touch(5); UI().refreshTop();
      if (first && window.SEX && window.SEX.recRow) window.SEX.recRow($('#tkR', C), () => playAll(false), { maxMs: 150000 });
    };
    return () => { run++; };
  }

  window.SEShadow = {
    view(app, id, mode) {
      const x = id && ALL().find(y => y.id === id);
      if (!x) return viewList(app);
      return viewItem(app, x, mode);
    },
    count: () => ALL().length
  };
})();
