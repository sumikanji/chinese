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
  const MODES = [['listen', 'Nghe & nói đuổi', 'speak'], ['say', 'Nói từng câu', 'mic'], ['tell', 'Kể lại cả đoạn', 'chat']];
  const I = n => window.SEI ? window.SEI(n) : '';

  // ================= Danh sách =================
  function viewList(app) {
    const cur = ST().cfg('shLv') || 'all';
    const list = ALL();
    const lvs = LV.filter(l => list.some(x => x.lv === l));
    app.innerHTML = '<section class="card panel pop"><div class="panel-h"><h2>Shadowing · Tự kể chuyện</h2><p>' + list.length + ' đoạn văn ngắn, mỗi đoạn là một câu chuyện kể ở ngôi "tôi": giới thiệu bản thân, gia đình, nơi mình sống, công việc, kỷ niệm… từ HSK 1 đến HSK 6. Nghe giọng AI, nói đuổi theo từng câu, rồi tự kể lại cả đoạn.</p></div>' +
      '<ol class="sd-how"><li><b>Nghe & nói đuổi:</b> nghe từng câu, ngay sau đó nói lại y hệt, cả ngữ điệu.</li><li><b>Nói từng câu:</b> máy chấm từng chữ và thanh điệu.</li><li><b>Kể lại cả đoạn:</b> nhìn gợi ý tiếng Việt và tự kể, như đang giới thiệu về mình.</li></ol></section>' +
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
      '<div class="sd-foot"><button class="btn" id="addrv">Thêm ' + x.s.length + ' câu vào Ôn tập</button>' + (nx ? '<a class="btn" href="#/shadow/' + nx.id + '">Bài tiếp: ' + esc(nx.t) + ' →</a>' : '') + '</div>';
    $('#addrv').onclick = e => {
      ST().addCards(x.s.map((_, i) => 'h:' + x.id + ':' + i));
      UI().refreshTop(); UI().toast('Đã thêm ' + x.s.length + ' câu vào Ôn tập');
      e.currentTarget.disabled = true; e.currentTarget.textContent = 'Đã thêm vào Ôn tập';
    };
    const P = $('#sp');
    if (window.SEX) { app.insertAdjacentHTML('beforeend', '<div id="sd-cmt"></div>'); window.SEX.comments($('#sd-cmt'), { key: x.id, title: 'Shadowing · ' + x.t, lines: x.s.map(r => ({ t: r[0], v: r[1] })) }); }
    return { listen: modeListen, say: modeSay, tell: modeTell }[mode](P, x);
  }

  // ----- Nghe & nói đuổi -----
  function modeListen(P, x) {
    const hideEn = !!ST().cfg('shHideEn'), hideVi = !!ST().cfg('shHideVi'), showPy = ST().cfg('hidePy') !== true;
    let slow = false, loop = false, gap = ST().cfg('shGap') !== false, run = 0, cur = -1;
    P.innerHTML = '<div class="intro"><div class="panel-h"><h2>Nghe và nói đuổi</h2><p>Bấm Phát cả đoạn. Bật "Nói theo": sau mỗi câu có một khoảng lặng để bạn nói lại y hệt, bắt chước cả nhịp và ngữ điệu. Chạm vào một câu để nghe riêng câu đó.</p></div>' +
      '<div class="pbar"><button class="pbar-play" id="play">' + I('play') + 'Phát cả đoạn</button><div class="tg"><button class="tg-b" id="slow">' + I('slow') + 'Đọc chậm</button><button class="tg-b' + (gap ? ' on' : '') + '" id="gap">' + I('mic') + 'Nói theo</button></div>' +
      '<div class="pbar-r2"><span class="tg-l">' + I('eye') + 'Hiện</span><div class="tg"><button class="tg-b' + (hideEn ? '' : ' on') + '" id="ten">Chữ Hán</button><button class="tg-b' + (showPy ? ' on' : '') + '" id="tpy">Pinyin</button><button class="tg-b' + (hideVi ? '' : ' on') + '" id="tvi">Nghĩa</button></div></div></div>' + '</div>' +
      '<div class="sd-lines' + (hideEn ? ' hide-en' : '') + (hideVi ? ' hide-vi' : '') + '" id="ls">' + x.s.map((s, i) => '<button class="sd-line" data-i="' + i + '"><span class="n">' + (i + 1) + '</span><span class="tx"><span class="en zh">' + UI().zh(s[2]) + '</span><span class="vi">' + esc(s[1]) + '</span></span><span class="turnbar"><i></i></span></button>').join('') + '</div>';
    const ls = $('#ls', P), lines = $$('.sd-line', ls);
    UI().bindVoice(P);
    const tog = (id, f) => { $('#' + id, P).onclick = e => { const v = f(); e.currentTarget.classList.toggle('on', v); }; };
    tog('slow', () => (slow = !slow));
    tog('gap', () => { gap = !gap; ST().cfg('shGap', gap); return gap; });
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
        const ms = Math.min(9000, Math.max(1500, (Date.now() - t0) * 1.15 + 500));
        const b = lines[i]; b.classList.add('yours'); const bar = $('.turnbar i', b);
        bar.style.transition = 'none'; bar.style.width = '0%'; void bar.offsetWidth;
        bar.style.transition = 'width ' + ms + 'ms linear'; bar.style.width = '100%';
        await wait(ms);
        b.classList.remove('yours'); bar.style.transition = 'none'; bar.style.width = '0%';
      } else await wait(350);
    }
    const playBtn = $('#play', P);
    const stopAll = () => { run++; SP().stop(); playBtn.innerHTML = I('play') + 'Phát cả đoạn'; playBtn.classList.remove('on'); lines.forEach(b => b.classList.remove('yours')); };
    playBtn.onclick = async () => {
      if (playBtn.classList.contains('on')) return stopAll();
      const my = ++run;
      playBtn.innerHTML = I('stop') + 'Dừng'; playBtn.classList.add('on');
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

  // ----- Nói từng câu (chấm phát âm) -----
  function modeSay(P, x) {
    let k = 0;
    const sc = {};
    P.innerHTML = '<div class="panel-h"><h2>Nói từng câu</h2><p>Nghe mẫu rồi nói ngay. Chữ xanh là chuẩn, cam là đúng âm nhưng sai thanh, đỏ cần luyện lại.</p></div>' +
      '<div class="progress-dots">' + x.s.map((_, j) => '<i data-j="' + j + '"></i>').join('') + '</div>' +
      '<div id="box" class="box-fix"></div>' +
      '<div class="pager"><button class="btn" id="pv">← Trước</button><span class="cnt" id="cn"></span><button class="btn primary" id="nx"></button></div>';
    const dots = $$('.progress-dots i', P);
    const paint = () => dots.forEach((i, j) => { i.className = (sc[j] != null ? (sc[j] >= 70 ? 'ok' : 'bad') : '') + (j === k ? ' cur' : ''); });
    function show() {
      const s = x.s[k];
      paint();
      $('#cn', P).textContent = (k + 1) + '/' + x.s.length;
      $('#pv', P).disabled = !k;
      $('#nx', P).textContent = k < x.s.length - 1 ? 'Câu tiếp →' : 'Xong';
      UI().speakBox($('#box', P), { en: s[0], tk: s[2], vi: s[1], who: WHO, onScore: v => { sc[k] = Math.max(sc[k] || 0, v); paint(); } });
      SP().speak(s[0], { who: WHO });
      if (x.s[k + 1]) SP().prefetch(x.s[k + 1][0], WHO);
    }
    dots.forEach(i => i.onclick = () => { k = +i.dataset.j; show(); });
    $('#pv', P).onclick = () => { if (k) { k--; show(); } };
    $('#nx', P).onclick = () => {
      if (k < x.s.length - 1) { k++; show(); return; }
      const v = Object.values(sc);
      if (!v.length) { UI().toast('Hãy nói ít nhất một câu nhé'); return; }
      const avg = Math.round(v.reduce((a, b) => a + b, 0) / v.length);
      setBest(x.id, 'say', avg); ST().touch(v.length); UI().refreshTop();
      UI().beep(avg >= 70);
      P.innerHTML = '<div class="result"><div class="hy">' + UI().hiyo(avg >= 85 ? 'cheer' : 'joy') + '</div><div class="panel-h"><h2>Điểm trung bình: ' + avg + '</h2><p>Đã nói ' + v.length + '/' + x.s.length + ' câu. Bước tiếp theo: tự kể lại cả đoạn.</p></div></div>' +
        '<div class="next-bar"><button class="btn" id="ag">Luyện lại</button><a class="btn primary" href="#/shadow/' + x.id + '/tell">Kể lại cả đoạn →</a></div>';
      $('#ag', P).onclick = () => modeSay(P, x);
    };
    show();
  }

  // ----- Kể lại cả đoạn -----
  function modeTell(P, x) {
    const full = x.s.map(s => s[0]).join('');
    const ftk = [].concat(...x.s.map(s => s[2]));
    const nw = Array.from(full).length;
    let hint = 0, run = 0;
    P.innerHTML = '<div class="panel-h"><h2>Kể lại cả đoạn</h2><p>Nhìn dàn ý tiếng Việt và tự kể bằng tiếng Trung, như đang giới thiệu về mình. Bí thì bật gợi ý. Bấm Nói, kể hết rồi bấm Dừng để chấm.</p></div>' +
      '<ol class="sd-outline" id="ol">' + x.s.map(s => '<li><span class="vi">' + esc(s[1]) + '</span><span class="hint zh">' + UI().zh(s[2].slice(0, Math.min(3, Math.max(1, Math.ceil(s[2].length / 3))))) + ' …</span><span class="full zh">' + UI().zh(s[2]) + '</span></li>').join('') + '</ol>' +
      '<div class="row center" style="margin:6px 0 14px"><button class="chip" id="h1">Gợi ý vài từ đầu</button><button class="chip" id="h2">Hiện cả đoạn</button></div>' +
      '<div id="box" class="box-fix"></div>';
    const ol = $('#ol', P);
    $('#h1', P).onclick = e => { const on = ol.classList.toggle('show-hint'); e.currentTarget.classList.toggle('on', on); if (on) hint = Math.max(hint, 1); };
    $('#h2', P).onclick = e => { const on = ol.classList.toggle('show-full'); e.currentTarget.classList.toggle('on', on); if (on) hint = 2; };
    const playAll = async slow => {
      const my = ++run;
      for (let i = 0; i < x.s.length && my === run; i++) { if (x.s[i + 1]) SP().prefetch(x.s[i + 1][0], WHO); await SP().speak(x.s[i][0], { who: WHO, slow }); if (my === run) await wait(300); }
    };
    UI().speakBox($('#box', P), {
      en: full, tk: ftk, who: WHO, long: true, continuous: true, maxMs: Math.min(150000, 20000 + nw * 450),
      onListen: slow => playAll(slow),
      onScore: v => {
        const sc = Math.max(0, v - (hint > 1 ? 15 : hint ? 5 : 0));
        setBest(x.id, 'tell', sc); ST().touch(5); UI().refreshTop();
        $('#se', P).style.display = '';
      }
    });
    $('#se', P).style.display = 'none';
    $('#li', P).innerHTML = I('speak') + '<span>Nghe cả đoạn</span>';
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
