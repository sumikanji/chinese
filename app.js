/*! © 2026 Sumi Chinese — ứng dụng chính: học tiếng Trung hoàn toàn qua câu */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = a => a[Math.random() * a.length | 0];
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const fmt = n => n.toLocaleString('vi-VN');
  const app = $('#app');
  const SP = window.SESpeech, ST = window.SEStore;

  // ---------- Chỉ mục dữ liệu ----------
  const LEVELS = window.SE_DATA;
  const LES = {}, ORDER = [];
  LEVELS.forEach(L => L.lessons.forEach((l, i) => { l.level = L; l.idx = i; LES[l.id] = l; ORDER.push(l.id); }));
  const sentCount = L => L.lessons.reduce((a, l) => a + l.d.length, 0);
  // Thẻ ôn tập: s:<bài>:<số câu>
  function card(id) {
    const m = /^s:([^:]+):(\d+)$/.exec(id); if (!m) return null;
    const l = LES[m[1]]; const d = l && l.d[+m[2]];
    return d && { id, en: d[1], vi: d[2], tk: d[3], l, i: +m[2] };
  }
  // Dọn dữ liệu của phiên bản cũ (thẻ từ vựng)
  (function migrate() {
    const S = ST.get(); let ch = false;
    for (const id in S.cards) if (!card(id)) { delete S.cards[id]; ch = true; }
    for (const id in S.done) if (!LES[id]) { delete S.done[id]; ch = true; }
    if (ch) ST.save();
  })();
  const totalDone = () => Object.keys(ST.get().done).length;
  const hiyoForm = () => Math.min(8, 1 + Math.floor(totalDone() / 20));
  const hiyo = (mood, f) => window.HIYO.svg(f == null ? hiyoForm() : f, mood || 'happy');
  const initial = n => esc((n || '?').trim()[0].toUpperCase());
  // ---------- Chữ Hán + pinyin ----------
  const HAN = /[\u4e00-\u9fff]/;
  // tokens [[từ,'pin yin'],…] → HTML: mỗi chữ Hán là <ruby> có pinyin; mỗi từ gói trong .wd; chữ Hán đánh số .w (để tô màu khi chấm)
  function zh(tk) {
    let k = 0;
    return tk.map(([w, p]) => {
      const ps = p ? p.split(' ') : [];
      const inner = Array.from(w).map((c, i) => HAN.test(c) ? '<ruby class="w" data-k="' + (k++) + '">' + esc(c) + '<rt>' + esc(ps[i] || '') + '</rt></ruby>' : '<span class="pu">' + esc(c) + '</span>').join('');
      return '<span class="wd">' + inner + '</span>';
    }).join('');
  }
  // pinyin cả câu dạng chuẩn (các âm tiết trong một từ viết liền)
  const pyLine = tk => tk.map(([w, p]) => p ? p.split(' ').join('') : w).join(' ').replace(/ ([，。！？、；：”）…])/g, '$1').replace(/[，]/g, ', ').replace(/[。]/g, '. ').replace(/[！]/g, '! ').replace(/[？]/g, '? ').replace(/\s+/g, ' ').trim();
  const setPy = on => document.body.classList.toggle('hide-py', !on);

  // ---------- Âm báo ----------
  let AC = null;
  function beep(ok) {
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      if (AC.state === 'suspended') AC.resume();
      const t = AC.currentTime;
      (ok ? [660, 880, 1175] : [300, 220]).forEach((f, i) => {
        const o = AC.createOscillator(), g = AC.createGain();
        o.type = ok ? 'triangle' : 'sawtooth'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + i * 0.09); g.gain.exponentialRampToValueAtTime(ok ? 0.12 : 0.05, t + i * 0.09 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.22);
        o.connect(g).connect(AC.destination); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.25);
      });
    } catch (e) { }
  }
  function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toast.tm); toast.tm = setTimeout(() => el.classList.remove('show'), 2400); }

  function refreshTop() {
    const S = ST.get();
    $('#st-streak').textContent = ST.streak() + ' ngày';
    $('#st-xp').textContent = fmt(S.xp) + ' XP';
    const due = ST.dueIds().length;
    const b = $('#tab-due'); b.hidden = !due; b.textContent = due > 99 ? '99+' : due;
    $('#brand-hiyo').innerHTML = hiyo('happy');
    const CL = window.SECloud, acc = $('#st-acc');
    if (acc) {
      if (!CL || !CL.enabled()) acc.hidden = true;
      else {
        const u = CL.user(), st = CL.status();
        acc.hidden = false;
        acc.className = 'pill acc' + (u ? ' in' : '') + (st === 'error' ? ' err' : '');
        acc.textContent = u ? ((u.name || u.email || '?').trim()[0].toUpperCase()) : 'Đăng nhập';
        acc.title = u ? 'Tài khoản: ' + (u.name || u.email) + ' · ' + SYNC_TXT[st] : 'Đăng nhập để lưu tiến độ lên tài khoản';
      }
    }
  }
  const SYNC_TXT = { off: 'Chưa đồng bộ', syncing: 'Đang đồng bộ…', pending: 'Đang lưu…', ok: 'Đã đồng bộ', error: 'Lỗi đồng bộ' };

  // ---------- Điều hướng ----------
  let cleanup = null;
  function route() {
    SP.stop(); SP.stopListening();
    if (cleanup) { cleanup(); cleanup = null; }
    const parts = (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean);
    const tab = { review: 'review', sounds: 'sounds', sound: 'sounds', guide: 'guide', vocab: 'vocab', scene: 'vocab' }[parts[0]] || 'home';
    $$('.tabs a').forEach(a => a.classList.toggle('on', a.dataset.tab === tab));
    refreshTop();
    window.scrollTo(0, 0);
    if (parts[0] === 'level' && parts[1]) return viewLevel(parts[1]);
    if (parts[0] === 'lesson' && LES[parts[1]]) return viewLesson(parts[1], parts[2] || '1');
    if (parts[0] === 'review') return viewReview();
    if (parts[0] === 'sounds') return viewSounds();
    if (parts[0] === 'sound' && parts[1]) return viewSound(parts[1]);
    if (parts[0] === 'guide') return viewGuide();
    if (parts[0] === 'account') return viewAccount();
    if (parts[0] === 'scene' && window.SEScenes) return window.SEScenes.view(app, parts[1], parts[2]);
    if (parts[0] === 'vocab' && window.SEVocab) return window.SEVocab.view(app, parts[1], parts[2]);
    viewHome();
  }
  window.addEventListener('hashchange', route);

  const starsHtml = n => '<span class="stars" aria-label="' + n + ' sao">' + [1, 2, 3].map(i => '<i class="' + (i <= n ? 'on' : '') + '"></i>').join('') + '</span>';
  const nextLessonId = () => ORDER.find(id => !ST.get().done[id]) || ORDER[0];

  // ================= TRANG CHỦ =================
  const REPEAT_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 2l3 3-3 3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 11V9a4 4 0 0 1 4-4h12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M7 22l-3-3 3-3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 13v2a4 4 0 0 1-4 4H4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
  function viewHome() {
    const S = ST.get();
    const fc = ST.forecast(7);
    const due = ST.dueIds().length;
    const mx = Math.max(1, ...fc);
    const WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const lbl = i => i === 0 ? 'Nay' : i === 1 ? 'Mai' : WD[new Date(Date.now() + i * 864e5).getDay()];
    const nl = LES[nextLessonId()];
    const started = totalDone() > 0;
    const learn = '<a class="btn' + (due ? '' : ' rvh-go') + '" href="#/lesson/' + nl.id + '">' + (started ? 'Học tiếp' : 'Bắt đầu') + ': ' + esc(nl.t) + ' →</a>';
    app.innerHTML =
      '<section class="card rvh pop">' +
        '<div class="rvh-top"><span class="rvh-ico">' + REPEAT_SVG + '</span><div class="rvh-t"><h2>Ôn tập hôm nay</h2><small>Spaced repetition · Ôn đúng lúc sắp quên</small></div>' +
        '<button class="rvh-help" id="rvh-help">? Cách hoạt động</button></div>' +
        '<div class="rvh-body"><div class="rvh-main"><span class="rvh-hiyo">' + hiyo(due ? 'think' : 'joy') + '</span><div>' +
          '<b class="rvh-num">' + fmt(due) + '</b><p class="rvh-cap">câu đến hạn ôn hôm nay</p>' +
          '<div class="rvh-btns">' + (due ? '<a class="btn rvh-go" href="#/review">Bắt đầu ôn ' + fmt(due) + ' câu →</a>' : '') + learn + '</div>' +
        '</div></div>' +
        '<div class="rvh-chart"><small>7 NGÀY TỚI</small><div class="rvh-bars">' + fc.map((n, i) =>
          '<div class="rvh-col' + (i === 0 ? ' now' : '') + '"><span class="v">' + (n || '') + '</span><i style="height:' + (n ? Math.max(8, 100 * n / mx) : 4) + '%"></i><span class="d">' + lbl(i) + '</span></div>').join('') + '</div></div></div>' +
        '<div class="rvh-stats">' +
          '<div><b>' + ST.streak() + '</b><small>ngày học</small></div>' +
          '<div><b>' + totalDone() + '</b><small>bài đã học</small></div>' +
          '<div><b>' + fmt(Object.keys(S.cards).length) + '</b><small>câu đã gặp</small></div>' +
          '<div><b>' + fmt(ST.mastered()) + '</b><small>câu đã thuộc</small></div>' +
        '</div>' +
        '<div class="rvh-explain" id="rvh-explain" hidden>Sumi không dạy từ vựng rời rạc: bạn học ' + fmt(LEVELS.reduce((x, L) => x + sentCount(L), 0)) + ' câu hội thoại thật, từ vựng tự đến qua câu. Mỗi câu đã học có một ngày ôn. Nhớ đúng thì lần ôn sau cách xa hơn: 1 → 2 → 4 → 7 → 14 → 30 → 60 → 120 ngày. Quên thì câu quay lại gần đầu và được hỏi lại vào ngày mai. Biểu đồ cho biết mỗi ngày tới có bao nhiêu câu đến hạn.</div>' +
      '</section>' +
      '<h2 class="sec">Lộ trình HSK 1 → HSK 6</h2>' +
      '<div class="levels">' + LEVELS.map(L => {
        const n = L.lessons.filter(l => S.done[l.id]).length;
        const voc = (window.SE_VOCAB || {})[L.id];
        return '<a class="card lvl" href="#/level/' + L.id + '">' +
          '<span class="lvl-badge hsk" style="background:' + L.color + '"><small>HSK</small>' + L.name.replace(/\D/g, '') + '</span>' +
          '<div><h3>' + esc(L.title) + '</h3><p>' + esc(L.sub) + '</p>' +
          '<p class="lvl-meta">' + L.lessons.length + ' bài · ' + fmt(sentCount(L)) + ' câu' + (voc ? ' · ' + fmt(voc) + ' từ vựng' : '') + '</p>' +
          '<div class="bar"><i style="width:' + (100 * n / L.lessons.length) + '%"></i></div></div>' +
          '<span class="lvl-n' + (n === L.lessons.length ? ' full' : '') + '">' + n + '/' + L.lessons.length + '</span></a>';
      }).join('') + '</div>';
    $('#rvh-help').onclick = () => { const e = $('#rvh-explain'); e.hidden = !e.hidden; };
  }

  // Chọn giọng đọc nam / nữ (dùng chung)
  function voiceChips(cls) {
    const g = SP.getGender();
    return '<span class="seg ' + (cls || '') + '" role="group" aria-label="Giọng đọc"><span class="seg-l">Giọng</span>' +
      [['f', 'Nữ'], ['m', 'Nam'], ['mix', 'Nam – Nữ']].map(x => '<button class="seg-b' + (g === x[0] ? ' on' : '') + '" data-g="' + x[0] + '">' + x[1] + '</button>').join('') + '</span>';
  }
  function bindVoice(root, after) {
    $$('.seg-b[data-g]', root).forEach(b => b.onclick = () => {
      SP.setGender(b.dataset.g); ST.cfg('gender', b.dataset.g);
      $$('.seg-b[data-g]', root).forEach(x => x.classList.toggle('on', x.dataset.g === b.dataset.g));
      SP.speak(b.dataset.g === 'f' ? '你好！我是女声。' : '你好！我是男声。', { who: b.dataset.g === 'mix' ? 'A' : 'A' });
      after && after();
    });
  }

  // ================= CẤP ĐỘ =================
  function viewLevel(id) {
    const L = LEVELS.find(x => x.id === id); if (!L) return viewHome();
    const S = ST.get();
    const voc = (window.SE_VOCAB || {})[L.id];
    app.innerHTML = '<a class="back" href="#/">← Lộ trình</a>' +
      '<div class="card lvl-head pop"><span class="lvl-badge hsk" style="background:' + L.color + '"><small>HSK</small>' + L.name.replace(/\D/g, '') + '</span><div><h1>' + esc(L.title) + '</h1><p class="muted">' + esc(L.sub) + '</p>' +
      '<p class="lvl-meta">' + L.lessons.length + ' bài · ' + fmt(sentCount(L)) + ' câu' + (voc ? ' · ' + fmt(voc) + ' từ vựng' : '') + '</p></div></div>' +
      '<div class="lessons">' + L.lessons.map((l, i) => {
        const d = S.done[l.id];
        return '<a class="card les" href="#/lesson/' + l.id + '"><span class="les-n" style="color:' + L.color + '">' + (i + 1) + '</span>' +
          '<div><h3>' + esc(l.t) + '</h3><div class="en zh-t">' + esc(l.en) + '</div><small class="muted">' + esc(l.s) + ' · ' + l.d.length + ' câu</small></div>' +
          (d ? starsHtml(d.stars) : '<span class="tag-new">MỚI</span>') + '</a>';
      }).join('') + '</div>';
  }

  // ================= BÀI HỌC =================
  const STEPS = [['1', 'Nghe'], ['2', 'Ghép câu'], ['3', 'Nói theo'], ['4', 'Nhập vai']];
  const LS = {};
  function viewLesson(id, step) {
    const l = LES[id];
    const sc = LS[id] || (LS[id] = { s3: {}, s4: {} });
    app.innerHTML = '<div class="les-top"><a class="back" href="#/level/' + l.level.id + '">←</a><h1>' + esc(l.t) + ' <span class="muted" style="font-weight:700">· ' + l.level.name + ' · Bài ' + (l.idx + 1) + '</span></h1></div>' +
      (step === 'done' ? '' : '<nav class="steps">' + STEPS.map(s => '<a class="step' + (s[0] === step ? ' on' : '') + (sc['ok' + s[0]] ? ' ok' : '') + '" href="#/lesson/' + id + '/' + s[0] + '"><b>' + s[0] + '</b>' + s[1] + '</a>').join('') + '</nav>') +
      '<section class="card panel pop" id="panel"></section>';
    const P = $('#panel');
    const goNext = () => { sc['ok' + step] = 1; location.hash = '#/lesson/' + id + '/' + (step === '4' ? 'done' : (+step + 1)); };
    if (step === '1') return stepListen(P, l, sc, goNext);
    if (step === '2') return stepOrder(P, l, sc, goNext);
    if (step === '3') return stepShadow(P, l, sc, goNext);
    if (step === '4') return stepRole(P, l, sc, goNext);
    if (step === 'done') return stepDone(P, l, sc);
  }
  const head = (title, text) => '<div class="panel-h"><h2>' + title + '</h2><p>' + text + '</p></div>';
  function msgHtml(l, d, i, extra, side, name) {
    side = side || d[0];
    name = name || (d[0] === 'B' ? 'Bạn' : l.a);
    return '<div class="msg ' + side + '"><span class="ava">' + (name === 'Bạn' ? 'Bạn' : initial(name)) + '</span><button class="bub' + (extra || '') + '" data-i="' + i + '"><div class="who">' + esc(name) + '</div><div class="en zh">' + zh(d[3]) + '</div><div class="vi">' + esc(d[2]) + '</div></button></div>';
  }

  // ----- Bước 1: Nghe hội thoại -----
  function stepListen(P, l, sc, next) {
    const hideEn = ST.cfg('hideEn') !== false, hideVi = !!ST.cfg('hideVi'), showPy = ST.cfg('hidePy') !== true;
    P.innerHTML = head('Bước 1 · Nghe hội thoại', 'Lần đầu chỉ nghe, chữ Hán đang được làm mờ. Nghe 2–3 lần rồi mới bật chữ. Chạm vào một câu để nghe lại câu đó.') +
      '<div class="scene">' + esc(l.s) + '</div>' +
      '<div class="toolbar"><button class="chip play" id="play">Phát cả bài</button><button class="chip" id="slow">Đọc chậm</button>' +
      '<button class="chip' + (hideEn ? '' : ' on') + '" id="ten">Hiện chữ Hán</button><button class="chip' + (showPy ? ' on' : '') + '" id="tpy">Pinyin</button><button class="chip' + (hideVi ? '' : ' on') + '" id="tvi">Hiện nghĩa</button></div>' +
      '<div class="voice-row">' + voiceChips() + '</div>' +
      '<div class="chat' + (hideEn ? ' hide-en' : '') + (hideVi ? ' hide-vi' : '') + '" id="chat">' + l.d.map((d, i) => msgHtml(l, d, i)).join('') + '</div>' +
      '<div class="tip">Trẻ em nghe hàng nghìn giờ trước khi nói. Hãy bật lại hội thoại này nhiều lần trong ngày, kể cả khi đang làm việc khác.</div>' +
      '<div class="next-bar"><button class="btn primary" id="nx">Tiếp: Ghép câu →</button></div>';
    const chat = $('#chat', P);
    bindVoice(P);
    let slow = false, run = 0, plays = 0;
    $('#slow', P).onclick = e => { slow = !slow; e.currentTarget.classList.toggle('on', slow); };
    $('#ten', P).onclick = e => { const on = chat.classList.toggle('hide-en'); e.currentTarget.classList.toggle('on', !on); ST.cfg('hideEn', on); };
    $('#tvi', P).onclick = e => { const on = chat.classList.toggle('hide-vi'); e.currentTarget.classList.toggle('on', !on); ST.cfg('hideVi', on); };
    $('#tpy', P).onclick = e => { const on = e.currentTarget.classList.toggle('on'); ST.cfg('hidePy', !on); setPy(on); };
    const line = async i => {
      const b = $$('.bub', chat)[i];
      $$('.bub', chat).forEach(x => x.classList.remove('speaking'));
      b.classList.add('speaking');
      b.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      await SP.speak(l.d[i][1], { who: l.d[i][0], slow });
      b.classList.remove('speaking');
    };
    $$('.bub', chat).forEach((b, i) => b.onclick = () => { run++; b.classList.add('shown'); line(i); });
    $('#play', P).onclick = async e => {
      const my = ++run; plays++;
      e.currentTarget.textContent = 'Đang phát…';
      for (let i = 0; i < l.d.length && my === run; i++) { await line(i); await wait(450); }
      if (my === run) { e.currentTarget.textContent = 'Phát lại (' + plays + ')'; ST.touch(1); refreshTop(); }
    };
    $('#nx', P).onclick = next;
    cleanup = () => { run++; };
  }

  // ----- Ô ghép câu dùng chung -----
  // Mảnh ghép = các từ (đã tách sẵn); dấu câu dính vào từ đứng trước
  function tilesOf(tk) {
    const w = [];
    tk.forEach(t => { if (!t[1] && w.length && !HAN.test(t[0])) { const L = w[w.length - 1]; w[w.length - 1] = [L[0] + t[0], L[1] + (L[1] ? ' ' : '') + Array.from(t[0]).map(() => '').join(' ')]; } else w.push([t[0], t[1]]); });
    if (w.length <= 9) return w;
    const size = Math.ceil(w.length / 8), out = [];
    for (let i = 0; i < w.length; i += size) { const g = w.slice(i, i + size); out.push([g.map(x => x[0]).join(''), g.map(x => x[1]).join(' ')]); }
    return out;
  }
  const tileHtml = t => zh([t]);
  // orderBox(el, {en, vi, who, onDone(firstTry)})
  function orderBox(el, o) {
    const parts = tilesOf(o.tk);
    let tiles = shuffle(parts.map((w, i) => ({ w, i })));
    if (tiles.length > 1 && tiles.every((t, k) => t.w[0] === parts[k][0])) tiles = tiles.reverse();
    let tried = false;
    el.innerHTML = '<div class="game-q"><div class="row center"><button class="btn small primary" id="pl">Nghe câu</button><button class="btn small" id="sl">Nghe chậm</button></div>' +
      '<div class="q-vi">' + esc(o.vi) + '</div></div>' +
      '<div class="build" id="bd"><span class="ph">Chạm vào các mảnh bên dưới theo đúng thứ tự</span></div><div class="pool" id="po">' + tiles.map((t, j) => '<button class="tilew zh" data-j="' + j + '">' + tileHtml(t.w) + '</button>').join('') + '</div>' +
      '<div class="next-bar"><button class="btn" id="clr">Xếp lại</button><button class="btn primary" id="chk" disabled>Kiểm tra</button></div><div class="reveal" id="rv"></div>';
    const built = [];
    const bd = $('#bd', el);
    const say = slow => SP.speak(o.en, { who: o.who, slow });
    const draw = () => {
      bd.innerHTML = built.length ? built.map((j, n) => '<button class="tilew zh" data-n="' + n + '">' + tileHtml(tiles[j].w) + '</button>').join('') : '<span class="ph">Chạm vào các mảnh bên dưới theo đúng thứ tự</span>';
      $$('#po .tilew', el).forEach(b => b.classList.toggle('used', built.includes(+b.dataset.j)));
      $$('.tilew', bd).forEach(b => b.onclick = () => { built.splice(+b.dataset.n, 1); bd.classList.remove('ok', 'bad'); draw(); });
      $('#chk', el).disabled = built.length !== tiles.length;
    };
    $$('#po .tilew', el).forEach(b => b.onclick = () => { if (!built.includes(+b.dataset.j)) { built.push(+b.dataset.j); draw(); } });
    $('#clr', el).onclick = () => { built.length = 0; bd.classList.remove('ok', 'bad'); draw(); };
    $('#pl', el).onclick = () => say(false);
    $('#sl', el).onclick = () => say(true);
    $('#chk', el).onclick = () => {
      const s = built.map(j => tiles[j].w[0]).join('');
      if (s === parts.map(p => p[0]).join('')) {
        bd.classList.add('ok'); beep(true);
        $('#chk', el).disabled = true; $('#clr', el).disabled = true;
        $$('.tilew', el).forEach(b => b.disabled = true);
        say().then(() => o.onDone && o.onDone(!tried));
      } else {
        tried = true; bd.classList.add('bad'); beep(false);
        toast('Chưa đúng, nghe lại và thử nhé');
        setTimeout(() => { bd.classList.remove('bad'); say(true); }, 500);
        if (o.onWrong) o.onWrong();
      }
    };
    say();
  }

  // ----- Bước 2: Ghép câu -----
  function stepOrder(P, l, sc, next) {
    const idx = shuffle(l.d.map((_, i) => i)).slice(0, Math.min(8, l.d.length));
    let k = 0, right = 0;
    const res = [];
    function show() {
      if (k >= idx.length) {
        sc.s2 = Math.round(100 * right / idx.length);
        P.innerHTML = '<div class="result"><div class="hy">' + hiyo(right >= idx.length - 1 ? 'cheer' : 'joy') + '</div>' + head('Ghép đúng ngay ' + right + '/' + idx.length + ' câu', 'Mỗi lần nghe và ghép, não bạn tự học cách sắp xếp từ trong câu tiếng Trung, không cần học ngữ pháp.') + '</div>' +
          '<div class="next-bar"><button class="btn" id="again">Làm thêm 8 câu</button><button class="btn primary" id="nx">Tiếp: Nói theo →</button></div>';
        $('#again', P).onclick = () => stepOrder(P, l, sc, next);
        $('#nx', P).onclick = next;
        return;
      }
      const d = l.d[idx[k]];
      P.innerHTML = head('Bước 2 · Nghe và ghép câu', 'Nghe câu rồi chạm vào các mảnh theo đúng thứ tự.') +
        '<div class="progress-dots">' + idx.map((_, j) => '<i class="' + (j < k ? res[j] : j === k ? 'cur' : '') + '"></i>').join('') + '</div><div id="ob"></div>';
      orderBox($('#ob', P), { en: d[1], tk: d[3], vi: d[2], who: d[0], onDone: first => { if (first) right++; res[k] = first ? 'ok' : 'bad'; setTimeout(() => { k++; show(); }, 400); } });
    }
    show();
  }

  // ----- Ô luyện nói dùng chung -----
  function speakBox(el, o) {
    const can = SP.canListen();
    el.innerHTML = '<div class="say">' +
      '<div class="say-en zh" id="se">' + zh(o.tk) + '</div>' +
      (o.vi ? '<div class="say-vi">' + esc(o.vi) + '</div>' : '') +
      '<div class="say-ctrl"><button class="btn small" id="li">Nghe mẫu</button>' +
      (can ? '<button class="mic" id="mc">Nói</button>' : '') +
      '<button class="btn small" id="sl">Nghe chậm</button></div>' +
      '<div class="mic-lbl" id="ml">' + (can ? 'Nghe mẫu, rồi bấm Nói và đọc to cả câu' : '') + '</div>' +
      '<div class="heard" id="hd"></div><div class="score" id="sc"></div>' +
      (can ? '' : '<div class="note">Trình duyệt này chưa hỗ trợ chấm phát âm (hãy dùng Chrome, Edge hoặc Safari mới). Bạn vẫn có thể nghe, nói theo và tự đánh giá:</div><div class="self-rate"><button class="btn small" data-s="40">Chưa giống</button><button class="btn small" data-s="70">Khá giống</button><button class="btn small" data-s="95">Giống rồi</button></div>') +
      '</div>';
    $('#li', el).onclick = () => o.onListen ? o.onListen(false) : SP.speak(o.en, { who: o.who });
    $('#sl', el).onclick = () => o.onListen ? o.onListen(true) : SP.speak(o.en, { who: o.who, slow: true });
    const showScore = s => {
      const c = s >= 85 ? 'var(--ok)' : s >= 60 ? 'var(--mid)' : 'var(--bad)';
      const msg = s >= 85 ? ['Tuyệt vời!', 'Nghe rất tự nhiên.'] : s >= 60 ? ['Khá lắm!', 'Luyện thêm các từ màu cam và đỏ.'] : ['Thử lại nhé', 'Nghe chậm rồi nói từng cụm.'];
      $('#sc', el).innerHTML = '<div class="ring pop" style="--p:' + s + ';--c:' + c + '"><b>' + s + '</b></div><div class="score-msg">' + msg[0] + '<small>' + msg[1] + '</small></div>';
      o.onScore && o.onScore(s);
    };
    $$('.self-rate .btn', el).forEach(b => b.onclick = () => { const s = +b.dataset.s; beep(s >= 70); showScore(s); });
    if (!can) return;
    const mic = $('#mc', el);
    let busy = false;
    mic.onclick = async () => {
      if (busy) { SP.stopListening(); return; }
      busy = true; mic.classList.add('rec'); mic.textContent = 'Dừng'; $('#ml', el).textContent = 'Đang nghe… hãy nói to và rõ'; $('#hd', el).textContent = '';
      const r = await SP.listen(o.tk, { strict: o.strict, onInterim: t => { $('#hd', el).textContent = '“' + t + '”'; } });
      busy = false; mic.classList.remove('rec'); mic.textContent = 'Nói';
      if (r.error) {
        const m = { 'not-allowed': 'Hãy cho phép dùng micro trong trình duyệt nhé.', 'service-not-allowed': 'Hãy cho phép dùng micro trong trình duyệt nhé.', 'no-speech': 'Chưa nghe thấy gì, bấm Nói và đọc to hơn nhé.', 'network': 'Chấm phát âm cần có mạng Internet.', 'audio-capture': 'Không tìm thấy micro.', 'aborted': 'Đã dừng.' }[r.error] || 'Có lỗi micro, thử lại nhé.';
        $('#ml', el).textContent = m;
        return;
      }
      $('#ml', el).textContent = 'Bấm Nói để thử lại';
      $('#hd', el).textContent = 'Máy nghe được: “' + r.heard + '”';
      const marks = SP.markWords(o.tk, r);
      $$('#se .w', el).forEach((w, i) => { const m = marks[i]; w.className = 'w ' + (!m ? '' : m.ok >= 0.99 ? 'g' : m.ok > 0 ? 'm' : 'r'); });
      if (marks.some(m => m.ok > 0 && m.ok < 0.99)) $('#ml', el).textContent = 'Chữ màu cam: đúng âm nhưng sai thanh điệu. Bấm Nói để thử lại';
      beep(r.score >= 70);
      showScore(r.score);
    };
  }

  // ----- Bước 3: Nói theo từng câu -----
  function stepShadow(P, l, sc, next) {
    let k = 0;
    function show() {
      const d = l.d[k];
      P.innerHTML = head('Bước 3 · Nói theo', 'Nghe mẫu rồi nói ngay, bắt chước cả giai điệu. Chữ xanh là chuẩn, cam là đúng âm nhưng sai thanh, đỏ là cần luyện lại.') +
        '<div class="progress-dots">' + l.d.map((_, j) => '<i data-j="' + j + '" class="' + (sc.s3[j] != null ? (sc.s3[j] >= 70 ? 'ok' : 'bad') : '') + (j === k ? ' cur' : '') + '"></i>').join('') + '</div>' +
        '<div class="who-line">' + (d[0] === 'B' ? 'Bạn nói' : esc(l.a) + ' nói') + '</div><div id="box"></div>' +
        '<div class="pager"><button class="btn" id="pv"' + (k ? '' : ' disabled') + '>← Trước</button><span class="cnt">' + (k + 1) + '/' + l.d.length + '</span>' +
        (k < l.d.length - 1 ? '<button class="btn primary" id="nx">Câu tiếp →</button>' : '<button class="btn primary" id="nx">Tiếp: Nhập vai →</button>') + '</div>';
      speakBox($('#box', P), { en: d[1], tk: d[3], vi: d[2], who: d[0], onScore: s => { sc.s3[k] = Math.max(sc.s3[k] || 0, s); const dot = $$('.progress-dots i', P)[k]; dot.className = 'cur ' + (sc.s3[k] >= 70 ? 'ok' : 'bad'); } });
      $$('.progress-dots i', P).forEach(i => i.onclick = () => { k = +i.dataset.j; show(); });
      $('#pv', P).onclick = () => { k--; show(); };
      $('#nx', P).onclick = () => { if (k < l.d.length - 1) { k++; show(); } else next(); };
      SP.speak(d[1], { who: d[0] });
    }
    show();
  }

  // ----- Bước 4: Nhập vai -----
  function stepRole(P, l, sc, next) {
    let me = sc.role || (l.d.some(d => d[0] === 'B') ? 'B' : 'A');
    let run = 0;
    function start() {
      const my = ++run;
      sc.s4 = {};
      const pName = me === 'B' ? l.a : 'Bạn đồng hành';
      const mName = me === 'B' ? 'Bạn' : 'Bạn (vai ' + l.a + ')';
      P.innerHTML = head('Bước 4 · Nhập vai', 'Bạn trò chuyện thật với ' + esc(l.a) + '. Đến lượt bạn: nhìn nghĩa tiếng Việt và tự nói câu tiếng Trung. Bí thì bấm Gợi ý.') +
        '<div class="role-pick"><button class="chip' + (me === 'B' ? ' on' : '') + '" data-r="B">Tôi đóng vai: Bạn</button><button class="chip' + (me === 'A' ? ' on' : '') + '" data-r="A">Tôi đóng vai: ' + esc(l.a) + '</button></div>' +
        '<div class="chat" id="chat"></div><div id="turn"></div><div id="end"></div>';
      $$('.role-pick .chip', P).forEach(b => b.onclick = () => { me = sc.role = b.dataset.r; start(); });
      const chat = $('#chat', P);
      (async () => {
        for (let i = 0; i < l.d.length; i++) {
          if (my !== run) return;
          const d = l.d[i];
          if (d[0] !== me) {
            chat.insertAdjacentHTML('beforeend', msgHtml(l, d, i, ' speaking', 'A pop', pName));
            const b = chat.lastElementChild.querySelector('.bub');
            b.onclick = () => SP.speak(d[1], { who: d[0] });
            b.scrollIntoView({ block: 'center', behavior: 'smooth' });
            await SP.speak(d[1], { who: d[0] });
            b.classList.remove('speaking');
            await wait(300);
          } else {
            const s = await myTurn(d, my);
            if (my !== run) return;
            chat.insertAdjacentHTML('beforeend', msgHtml(l, d, i, '', 'B pop', mName));
            sc.s4[i] = s;
          }
        }
        if (my !== run) return;
        $('#turn', P).innerHTML = '';
        const arr = Object.values(sc.s4);
        const avg = arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
        $('#end', P).innerHTML = '<div class="tip pop" style="text-align:center"><b>Bạn đã hoàn thành cuộc hội thoại!</b><br>Điểm nói trung bình: <b>' + avg + '</b>/100</div>' +
          '<div class="next-bar"><button class="btn" id="again">Diễn lại</button><button class="btn primary" id="fin">Hoàn thành bài</button></div>';
        $('#again', P).onclick = start;
        $('#fin', P).onclick = next;
        $('#end', P).scrollIntoView({ block: 'center', behavior: 'smooth' });
      })();
    }
    function myTurn(d, my) {
      return new Promise(resolve => {
        const T = $('#turn', P);
        let best = null, hint = 0;
        T.innerHTML = '<div class="turn pop"><div class="lbl">LƯỢT CỦA BẠN</div><div class="vi">“' + esc(d[2]) + '”</div><div class="hint-en" id="he"></div><div id="sb"></div>' +
          '<div class="row center" style="margin-top:12px"><button class="btn small" id="hn">Gợi ý</button><button class="btn small primary" id="go" disabled>Tiếp →</button></div></div>';
        const words = d[3];
        const box = $('#sb', T);
        speakBox(box, { en: d[1], tk: d[3], who: me, onScore: s => { best = Math.max(best || 0, s); $('#go', T).disabled = false; $('#he', T).textContent = ''; } });
        const se = $('#se', box); se.style.display = 'none';
        const obs = new MutationObserver(() => { if ($('#sc', box).innerHTML) se.style.display = ''; });
        obs.observe($('#sc', box), { childList: true });
        $('#hn', T).onclick = () => {
          hint++;
          if (hint === 1) { const g = words.slice(0, Math.max(1, Math.ceil(words.length / 3))); $('#he', T).textContent = g.map(x => x[0]).join('') + ' … (' + pyLine(g) + ' …)'; }
          else { $('#he', T).textContent = ''; se.style.display = ''; SP.speak(d[1], { who: me }); }
        };
        $('#go', T).onclick = () => { obs.disconnect(); T.innerHTML = ''; resolve(Math.max(0, (best || 0) - (hint > 1 ? 10 : 0))); };
        T.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
    }
    cleanup = () => { run++; };
    start();
  }

  // ----- Hoàn thành -----
  function stepDone(P, l, sc) {
    const parts = [];
    if (sc.s2 != null) parts.push(sc.s2);
    const v3 = Object.values(sc.s3 || {}); if (v3.length) parts.push(v3.reduce((a, b) => a + b, 0) / v3.length);
    const v4 = Object.values(sc.s4 || {}); if (v4.length) parts.push(v4.reduce((a, b) => a + b, 0) / v4.length);
    const score = parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : 60;
    const stars = score >= 85 ? 3 : score >= 65 ? 2 : 1;
    const isNew = !ST.get().done[l.id];
    if (!sc.saved) {
      sc.saved = true;
      ST.finishLesson(l.id, stars, score);
      sc.added = ST.addCards(l.d.map((_, i) => 's:' + l.id + ':' + i));
      sc.xp = 10 + stars * 5;
      ST.touch(sc.xp);
      refreshTop();
    }
    const nl = LES[ORDER[ORDER.indexOf(l.id) + 1]];
    P.className = 'card done pop';
    P.innerHTML = '<div class="hy">' + hiyo(stars === 3 ? 'cheer' : 'joy') + '</div><h2>' + (stars === 3 ? 'Xuất sắc!' : stars === 2 ? 'Làm tốt lắm!' : 'Hoàn thành!') + '</h2>' +
      '<div class="big-stars">' + starsHtml(stars) + '</div>' +
      '<p class="muted">' + esc(l.t) + ' · ' + esc(l.en) + '</p>' +
      '<div class="done-grid"><div><b>' + score + '</b><small>điểm tổng</small></div><div><b>+' + sc.xp + '</b><small>XP</small></div>' +
      '<div><b>' + (sc.added || 0) + '</b><small>câu mới vào ôn tập</small></div><div><b>' + ST.streak() + '</b><small>ngày liên tiếp</small></div></div>' +
      '<p class="muted" style="font-size:.9rem;margin-bottom:14px">Ngày mai Sumi sẽ nhắc bạn ôn lại các câu này bằng bài ghép câu và nói câu. Ôn đúng lúc là bí quyết để nhớ lâu và nói được.</p>' +
      '<div class="row">' + (nl ? '<a class="btn primary" href="#/lesson/' + nl.id + '">Bài tiếp: ' + esc(nl.t) + ' →</a>' : '') +
      '<a class="btn" href="#/lesson/' + l.id + '/1">Học lại</a><a class="btn" href="#/level/' + l.level.id + '">Về cấp ' + l.level.name + '</a></div>';
    if (isNew && totalDone() % 20 === 0) setTimeout(() => toast('Hiyo đã lớn thêm: ' + window.HIYO.NAMES[hiyoForm()] + '!'), 600);
  }

  // ================= ÔN TẬP =================
  function viewReview() {
    const all = ST.dueIds();
    const ids = all.slice(0, 20);
    if (!ids.length) {
      const nd = ST.nextDue();
      const has = Object.keys(ST.get().cards).length;
      app.innerHTML = '<section class="card empty pop"><div class="hy">' + hiyo(has ? 'sleep' : 'think') + '</div>' +
        '<h2>' + (has ? 'Hôm nay đã ôn xong!' : 'Chưa có câu nào để ôn') + '</h2>' +
        '<p class="muted">' + (has ? 'Lần ôn tiếp theo: <b>' + new Date(nd).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' }) + '</b>. Ôn đúng lúc sắp quên là cách nhớ lâu nhất.' : 'Học xong một bài, các câu sẽ tự vào đây. Hôm sau Sumi nhắc bạn ôn.') + '</p>' +
        '<div class="row center" style="margin-top:16px"><a class="btn primary" href="#/lesson/' + nextLessonId() + '">Học bài mới</a></div></section>' +
        (has ? reviewStats() : '');
      return;
    }
    const queue = shuffle(ids).map(id => ({ id, retry: false }));
    const total = queue.length;
    let done = 0, good = 0;
    const can = SP.canListen();
    function show() {
      if (!queue.length) {
        ST.touch(good * 2); refreshTop();
        const left = ST.dueIds().length;
        app.innerHTML = '<section class="card empty pop"><div class="hy">' + hiyo('cheer') + '</div><h2>Ôn xong ' + total + ' câu!</h2><p class="muted">Nhớ ngay: <b>' + good + '</b> · Cần ôn lại: <b>' + (total - good) + '</b>. Câu sai sẽ quay lại vào ngày mai.</p>' +
          '<div class="row center" style="margin-top:16px">' + (left ? '<a class="btn primary" href="#/review" id="more">Ôn tiếp ' + left + ' câu</a>' : '<a class="btn primary" href="#/">Về trang chủ</a>') + '<a class="btn" href="#/lesson/' + nextLessonId() + '">Học bài mới</a></div></section>';
        const m = $('#more'); if (m) m.onclick = e => { e.preventDefault(); viewReview(); };
        return;
      }
      const q = queue[0];
      const c = card(q.id);
      if (!c) { queue.shift(); return show(); }
      const mode = can ? pick(['order', 'say', 'say']) : pick(['order', 'recall']);
      app.innerHTML = '<div class="rv-top"><span>Ôn tập ngắt quãng</span><span>' + Math.min(done + 1, total) + '/' + total + (all.length > total ? ' · còn ' + (all.length - total) : '') + '</span></div><div class="bar" style="margin:-4px 0 12px"><i style="width:' + (100 * done / total) + '%"></i></div>' +
        '<section class="card rv-card pop" id="rc"></section>';
      const R = $('#rc');
      const finish = ok => {
        if (!q.retry) { ST.grade(q.id, ok); done++; if (ok) good++; }
        queue.shift();
        if (!ok && !q.retry) queue.push({ id: q.id, retry: true });
        refreshTop();
      };
      const nextBtn = ok => {
        if ($('#nx', R)) { $('#nx', R).onclick = () => { finish(ok); show(); }; return; }
        R.insertAdjacentHTML('beforeend', '<div class="next-bar"><button class="btn primary" id="nx">Tiếp →</button></div>');
        $('#nx', R).onclick = () => { finish(ok); show(); };
      };
      const kind = '<span class="rv-kind">' + (c.l ? c.l.level.name + ' · ' + esc(c.l.t) : '') + '</span>';
      if (mode === 'order') {
        R.innerHTML = kind + '<div class="rv-title">Nghe và ghép câu</div><div id="ob"></div>';
        let wrong = false;
        orderBox($('#ob', R), { en: c.en, tk: c.tk, vi: c.vi, onWrong: () => { wrong = true; }, onDone: first => nextBtn(first && !wrong) });
      } else if (mode === 'say') {
        R.innerHTML = kind + '<div class="rv-title">Nói câu này bằng tiếng Trung</div><div class="rv-prompt">“' + esc(c.vi) + '”</div><div id="sb"></div>' +
          '<div class="row center" style="margin-top:10px"><button class="btn small" id="sh">Xem đáp án</button></div>';
        let best = -1, peek = false;
        speakBox($('#sb', R), { en: c.en, tk: c.tk, onScore: s => { best = Math.max(best, s); nextBtn(best >= 70 && !peek); } });
        const se = $('#se', R); se.style.display = 'none';
        new MutationObserver(() => { se.style.display = ''; }).observe($('#sc', R), { childList: true });
        $('#sh', R).onclick = () => { peek = true; se.style.display = ''; SP.speak(c.en); nextBtn(false); };
      } else {
        R.innerHTML = kind + '<div class="rv-title">Nhớ lại câu tiếng Trung, nói to, rồi lật thẻ</div><div class="rv-prompt">“' + esc(c.vi) + '”</div>' +
          '<div class="say-en zh" id="ans" style="visibility:hidden">' + zh(c.tk) + '</div><div class="row center" id="ac"><button class="btn primary" id="flip">Lật thẻ</button></div>';
        $('#flip', R).onclick = () => {
          $('#ans', R).style.visibility = 'visible'; SP.speak(c.en);
          $('#ac', R).innerHTML = '<button class="btn" id="no">Quên</button><button class="btn green" id="yes">Nhớ</button>';
          $('#no', R).onclick = () => { beep(false); finish(false); show(); };
          $('#yes', R).onclick = () => { beep(true); finish(true); show(); };
        };
      }
    }
    show();
  }
  function reviewStats() {
    const S = ST.get();
    const box = new Array(ST.IV.length).fill(0);
    for (const id in S.cards) box[S.cards[id].b]++;
    const names = ['Mới', '1 ngày', '2 ngày', '4 ngày', '1 tuần', '2 tuần', '1 tháng', '2 tháng', '4 tháng'];
    const mx = Math.max(1, ...box);
    return '<h2 class="sec">Trí nhớ của bạn</h2><section class="card panel"><p class="muted" style="font-size:.88rem;margin-bottom:10px">Mỗi lần nhớ đúng, câu chuyển sang ngăn ôn thưa hơn. Quên thì quay lại gần đầu.</p>' +
      box.map((n, i) => '<div class="mem-row"><span class="muted">' + names[i] + '</span><div class="bar" style="margin:0"><i style="width:' + (100 * n / mx) + '%"></i></div><span>' + n + '</span></div>').join('') + '</section>';
  }

  // ================= PHÁT ÂM =================
  function viewSounds() {
    app.innerHTML = '<section class="card panel pop">' + head('Luyện âm khó cho người Việt', 'Bốn thanh điệu, zh/ch/sh với z/c/s, j/q/x, âm ü, đuôi -n/-ng… Mỗi nhóm luyện bằng 6 câu chứa nhiều âm cần sửa. Nói cả câu để máy chấm từng chữ và thanh điệu.') +
      (SP.canListen() ? '' : '<div class="note">Trình duyệt này chưa hỗ trợ nhận dạng giọng nói. Hãy mở bằng Chrome/Edge (máy tính, Android) hoặc Safari (iPhone) để được chấm phát âm.</div>') + '</section>' +
      '<h2 class="sec">' + window.SE_SOUNDS.length + ' nhóm âm</h2><div class="sounds">' + window.SE_SOUNDS.map((s, i) => {
        const d = ST.get().cfg['snd_' + s.id];
        return '<a class="card snd" href="#/sound/' + s.id + '"><span class="num">' + (i + 1) + '</span><b>' + esc(s.t) + '</b><small>' + (d != null ? 'Đã luyện · ' + d + ' điểm' : s.say.length + ' câu') + '</small></a>';
      }).join('') + '</div>';
  }
  function viewSound(id) {
    const s = window.SE_SOUNDS.find(x => x.id === id); if (!s) return viewSounds();
    const scores = {};
    let k = 0;
    app.innerHTML = '<a class="back" href="#/sounds">← Các nhóm âm</a>' +
      '<section class="card panel pop"><h2 style="font-size:1.3rem;margin-bottom:10px">' + esc(s.t) + '</h2><div class="tipbox">' + esc(s.tip) + '</div><div id="sent"></div></section>';
    const draw = () => {
      const t = s.say[k];
      $('#sent').innerHTML = '<div class="progress-dots">' + s.say.map((_, j) => '<i class="' + (scores[j] != null ? (scores[j] >= 70 ? 'ok' : 'bad') : '') + (j === k ? ' cur' : '') + '"></i>').join('') + '</div><div id="sb"></div>' +
        '<div class="pager"><button class="btn" id="spv"' + (k ? '' : ' disabled') + '>← Trước</button><span class="cnt">' + (k + 1) + '/' + s.say.length + '</span><button class="btn primary" id="snx">' + (k < s.say.length - 1 ? 'Câu tiếp →' : 'Xong') + '</button></div>';
      speakBox($('#sb'), { en: t[0], tk: t[2], vi: t[1], onScore: v => { scores[k] = Math.max(scores[k] || 0, v); } });
      $('#spv').onclick = () => { k--; draw(); };
      $('#snx').onclick = () => {
        if (k < s.say.length - 1) { k++; draw(); return; }
        const v = Object.values(scores);
        if (v.length) { const avg = Math.round(v.reduce((a, b) => a + b, 0) / v.length); ST.cfg('snd_' + s.id, avg); ST.touch(v.length); refreshTop(); toast('Điểm trung bình: ' + avg); }
        location.hash = '#/sounds';
      };
      SP.speak(t[0], { rate: 0.85 });
    };
    draw();
  }

  // ================= CÁCH HỌC =================
  function viewGuide() {
    const noVoice = SP.canSpeak() && !SP.hasVoice();
    app.innerHTML = '<div class="guide">' +
      '<section class="card panel pop">' + head('Học như một đứa trẻ', 'Trẻ em Trung Quốc không học bảng từ hay ngữ pháp trước, chúng nghe và nói cả câu trong tình huống thật. Sumi Chinese đi đúng con đường đó: toàn bộ bài học là câu hội thoại có chữ Hán, pinyin và nghĩa tiếng Việt.') + '</section>' +
      (noVoice ? '<div class="note">Máy của bạn chưa có giọng đọc tiếng Trung. Hãy cài thêm: iPhone/iPad: Cài đặt → Trợ năng → Nội dung được đọc → Giọng nói → Tiếng Trung (Trung Quốc đại lục). Android: Cài đặt → Chuyển văn bản thành giọng nói → Công cụ của Google → cài dữ liệu "Tiếng Trung (Quan thoại)". Windows: Cài đặt → Thời gian và ngôn ngữ → Giọng nói → Thêm giọng → 中文(简体).</div>' : '') +
      '<div class="card"><h2>1. Học câu, không học từ rời</h2><p>Mỗi cấp HSK có hàng trăm câu hội thoại đời thường. Bạn không cần học thuộc danh sách từ: gặp đi gặp lại trong câu, từ và chữ Hán sẽ tự ở lại trong đầu, kèm luôn cách dùng.</p></div>' +
      '<div class="card"><h2>2. Tai trước, chữ sau</h2><p>Bật hội thoại nhiều lần với chữ Hán đang mờ. Thanh điệu là linh hồn của tiếng Trung: nghe đủ nhiều thì tai tự phân biệt được mā – má – mǎ – mà. Pinyin hiện trên đầu mỗi chữ; khi đã quen, hãy tắt pinyin để mắt nhớ mặt chữ.</p></div>' +
      '<div class="card"><h2>3. Ghép câu để quen trật tự từ</h2><p>Nghe câu và xếp lại các từ: não tự rút ra quy luật sắp xếp từ trong câu tiếng Trung (thời gian đứng trước, địa điểm đứng trước động từ…), không cần học ngữ pháp.</p></div>' +
      '<div class="card"><h2>4. Nói theo và nhập vai</h2><p>Nghe mẫu, nói theo ngay. Máy chấm từng chữ: <b style="color:var(--ok)">xanh</b> là chuẩn, <b style="color:var(--mid)">cam</b> là đúng âm nhưng sai thanh điệu, <b style="color:var(--bad)">đỏ</b> là cần luyện lại. Sau đó nhập vai: chỉ nhìn nghĩa tiếng Việt và tự nói câu tiếng Trung.</p></div>' +
      '<div class="card"><h2>5. Ôn đúng lúc sắp quên</h2><p>Mọi câu đã học vào hộp ôn tập ngắt quãng. Mỗi lần ôn, bạn ghép lại câu hoặc nói lại câu từ nghĩa tiếng Việt. Nhớ đúng thì lần sau cách xa hơn (1 → 2 → 4 → 7 → 14 → 30 ngày…), quên thì quay lại gần đầu.</p></div>' +
      '<div class="card"><h2>Lợi thế của người Việt</h2><p>Khoảng 60% từ vựng tiếng Việt là từ Hán Việt. Nhiều từ tiếng Trung nghe rất quen: 学生 xuésheng (học sinh), 注意 zhùyì (chú ý), 经济 jīngjì (kinh tế). Hãy đoán nghĩa theo âm Hán Việt, bạn sẽ nhớ nhanh hơn người học ở nước khác.</p></div>' +
      '<div class="card"><h2>Gợi ý lịch học mỗi ngày (20–30 phút)</h2><ul><li>10 phút: ôn câu trong mục <b>Ôn tập</b>.</li><li>15 phút: học 1 bài mới đủ 4 bước.</li><li>5 phút: luyện thanh điệu hoặc 1 nhóm âm trong mục <b>Phát âm</b>.</li><li>Lúc rảnh: bật lại hội thoại của bài hôm qua để nghe thụ động.</li></ul></div>' +
      '<div class="card"><h2>Về micro và giọng đọc</h2><ul><li>Chấm phát âm dùng tính năng nhận dạng giọng nói có sẵn của trình duyệt: Chrome, Edge (máy tính, Android) hoặc Safari (iPhone, iPad). Firefox chưa hỗ trợ.</li><li>Lần đầu bấm Nói, hãy chọn <b>Cho phép</b> dùng micro. Trang cần chạy qua https.</li><li>Giọng đọc tiếng Trung lấy từ máy của bạn. Nếu không nghe thấy gì, hãy cài giọng tiếng Trung (giản thể) trong phần cài đặt giọng nói của máy.</li></ul></div>' +
      '<div class="card"><h2>Hiển thị</h2><div class="row"><button class="chip' + (ST.cfg('hidePy') !== true ? ' on' : '') + '" id="gpy">Hiện pinyin trên chữ Hán</button></div></div>' +
      '<div class="card"><h2>Giọng đọc</h2><div class="row" id="vmode">' + voiceChips() + '</div><p class="muted" style="font-size:.82rem;margin:8px 0 12px">Các câu bài học, từ vựng và phát âm dùng giọng AI thu sẵn (' + SP.audioCount() + ' câu). Chọn Nam – Nữ: người nói chuyện là giọng nam, bạn là giọng nữ. Câu nào chưa có giọng AI thì dùng giọng của máy, chọn bên dưới.</p><div class="row"><select id="vsel" class="sel"></select><button class="btn small" id="vtest">Nghe thử</button></div><p class="muted" style="font-size:.82rem;margin-top:8px">Sumi dùng giọng nữ tiếng Trung (phổ thông) rõ nhất có trong máy của bạn. Bạn có thể chọn giọng khác trong danh sách.</p></div>' +
      '<div class="card"><h2>Tốc độ giọng đọc</h2><div class="row" id="rates">' + [[0.7, 'Chậm'], [0.9, 'Vừa'], [1.05, 'Tự nhiên']].map(r => '<button class="chip' + (Math.abs(SP.getRate() - r[0]) < .01 ? ' on' : '') + '" data-r="' + r[0] + '">' + r[1] + '</button>').join('') + '</div>' +
      '<p class="muted" style="font-size:.82rem;margin-top:12px">' + (window.SECloud && window.SECloud.enabled() ? (window.SECloud.user() ? 'Tiến độ đang được đồng bộ lên tài khoản. <a href="#/account">Xem tài khoản</a>' : 'Tiến độ đang lưu trên máy này. <a href="#/account">Đăng nhập</a> để lưu lên tài khoản và học trên nhiều thiết bị.') : 'Tiến độ được lưu trên trình duyệt của máy này.') + '</p><div class="row" style="margin-top:8px"><button class="btn small ghost" id="reset">Xoá toàn bộ tiến độ</button></div></div>' +
      '<p class="muted" style="text-align:center;font-size:.78rem;margin:18px 0">© 2026 Sumi Chinese · Hiyo © Sumi Kanji · Miễn phí</p></div>';
    $('#gpy').onclick = e => { const on = e.currentTarget.classList.toggle('on'); ST.cfg('hidePy', !on); setPy(on); };
    $$('#rates .chip').forEach(b => b.onclick = () => { SP.setRate(+b.dataset.r); ST.cfg('rate', +b.dataset.r); $$('#rates .chip').forEach(x => x.classList.toggle('on', x === b)); SP.speak('这是我说话的速度。'); });
    const fillVoices = () => {
      const sel = $('#vsel'); if (!sel) return;
      const list = SP.voiceList().filter(v => v.g !== 'm');
      sel.innerHTML = '<option value="">Tự chọn giọng nữ tốt nhất</option>' +
        list.map(v => '<option value="' + esc(v.name) + '"' + (SP.getVoice() === v.name ? ' selected' : '') + '>' + esc(v.name) + ' (' + v.lang + (v.g === 'f' ? ', nữ' : '') + ')</option>').join('');
    };
    fillVoices(); SP.onVoices(fillVoices);
    bindVoice($('#vmode'));
    $('#vsel').onchange = e => { SP.setVoice(e.target.value); ST.cfg('voice', e.target.value); SP.speak('你好！这是我的声音。'); };
    $('#vtest').onclick = () => SP.speak('你好！很高兴认识你。你今天怎么样？');
    $('#reset').onclick = () => { if (confirm('Xoá toàn bộ tiến độ học và câu ôn tập?')) { ST.reset(); toast('Đã xoá tiến độ'); route(); } };
  }
  // ================= TÀI KHOẢN =================
  function viewAccount() {
    const CL = window.SECloud;
    if (!CL || !CL.enabled()) {
      app.innerHTML = '<section class="card panel pop"><div class="panel-h"><h2>Tài khoản</h2><p>Trang này chưa bật đăng nhập. Tiến độ học đang được lưu trên trình duyệt của máy này.</p></div></section>';
      return;
    }
    const u = CL.user();
    if (u) {
      const S = ST.get();
      app.innerHTML = '<section class="card panel pop acc-card"><div class="acc-av">' + esc((u.name || u.email || '?').trim()[0].toUpperCase()) + '</div>' +
        '<h2>' + esc(u.name || 'Người học') + '</h2><p class="muted">' + esc(u.email) + ' · đăng nhập bằng ' + (u.provider === 'google.com' ? 'Google' : 'Email') + '</p>' +
        '<div class="acc-sync" id="acc-sync">' + SYNC_TXT[CL.status()] + '</div>' +
        '<div class="rvh-stats"><div><b>' + totalDone() + '</b><small>bài đã học</small></div><div><b>' + fmt(Object.keys(S.cards).length) + '</b><small>câu ôn tập</small></div><div><b>' + fmt(S.xp) + '</b><small>XP</small></div><div><b>' + ST.streak() + '</b><small>ngày học</small></div></div>' +
        '<p class="muted" style="font-size:.88rem;margin:14px 0">Tiến độ được tự động lưu lên tài khoản sau mỗi lần học. Đăng nhập cùng tài khoản trên máy khác là học tiếp được ngay.</p>' +
        '<div class="row center"><button class="btn" id="acc-now">Đồng bộ ngay</button><button class="btn ghost" id="acc-out">Đăng xuất</button></div></section>';
      $('#acc-now').onclick = async () => { await CL.syncNow(); toast('Đã đồng bộ'); };
      $('#acc-out').onclick = async () => { if (!confirm('Đăng xuất? Tiến độ vẫn còn trên tài khoản và trên máy này.')) return; await CL.signOut(); route(); };
      return;
    }
    let mode = 'in';
    const draw = () => {
      app.innerHTML = '<section class="card panel pop acc-card"><div class="panel-h"><h2>' + (mode === 'in' ? 'Đăng nhập' : 'Tạo tài khoản') + '</h2><p>Đăng nhập để lưu tiến độ lên tài khoản và học tiếp trên mọi thiết bị. Tiến độ đang có trên máy này sẽ được gộp vào tài khoản.</p></div>' +
        (CL.providers.google ? '<button class="btn block acc-google" id="g">Tiếp tục với Google</button><div class="acc-or">hoặc dùng email</div>' : '') +
        (CL.providers.email ? '<form class="acc-form" id="f">' + (mode === 'up' ? '<input id="nm" placeholder="Tên của bạn" autocomplete="name">' : '') +
          '<input id="em" type="email" placeholder="Email" autocomplete="email" required><input id="pw" type="password" placeholder="Mật khẩu (ít nhất 6 ký tự)" autocomplete="' + (mode === 'in' ? 'current-password' : 'new-password') + '" required minlength="6">' +
          '<button class="btn primary block" type="submit">' + (mode === 'in' ? 'Đăng nhập' : 'Tạo tài khoản') + '</button></form>' +
          '<div class="row center acc-links"><button class="btn small ghost" id="sw">' + (mode === 'in' ? 'Chưa có tài khoản? Tạo mới' : 'Đã có tài khoản? Đăng nhập') + '</button>' + (mode === 'in' ? '<button class="btn small ghost" id="fg">Quên mật khẩu</button>' : '') + '</div>' : '') +
        '<div class="acc-msg" id="msg"></div></section>';
      const msg = (t, bad) => { $('#msg').innerHTML = '<span class="' + (bad ? 'bad' : '') + '">' + esc(t) + '</span>'; };
      const go = async fn => { try { msg('Đang xử lý…'); await fn(); } catch (e) { msg(CL.errMsg(e), true); } };
      if ($('#g')) $('#g').onclick = () => go(() => CL.google());
      if ($('#f')) $('#f').onsubmit = e => { e.preventDefault(); go(() => mode === 'in' ? CL.signIn($('#em').value, $('#pw').value) : CL.signUp($('#nm').value, $('#em').value, $('#pw').value)); };
      if ($('#sw')) $('#sw').onclick = () => { mode = mode === 'in' ? 'up' : 'in'; draw(); };
      if ($('#fg')) $('#fg').onclick = () => { const em = $('#em').value; if (!em) return msg('Nhập email trước, rồi bấm Quên mật khẩu.', true); go(async () => { await CL.reset(em); msg('Đã gửi email đặt lại mật khẩu tới ' + em + '.'); }); };
    };
    draw();
  }
  if (window.SECloud) {
    window.SECloud.on(() => {
      refreshTop();
      const s = $('#acc-sync'); if (s) s.textContent = SYNC_TXT[window.SECloud.status()];
      if (/^#\/account/.test(location.hash)) { const u = window.SECloud.user(), h = $('.acc-card h2'); if (!!u !== !!$('#acc-out')) route(); else if (u && h && h.textContent !== (u.name || 'Người học')) h.textContent = u.name || 'Người học'; }
    });
    window.addEventListener('sumi:synced', () => { if (!/lesson|review|vocab\/.+\/./.test(location.hash)) route(); else refreshTop(); });
  }

  // ---------- Khởi động ----------
  if (ST.cfg('rate')) SP.setRate(ST.cfg('rate'));
  if (ST.cfg('voice')) SP.setVoice(ST.cfg('voice'));
  SP.setGender(ST.cfg('gender') === 'm' || ST.cfg('gender') === 'mix' ? ST.cfg('gender') : 'f');
  setPy(ST.cfg('hidePy') !== true);
  window.SEUI = { speakBox, toast, beep, esc, refreshTop, hiyo, voiceChips, bindVoice, zh, pyLine, setPy };
  route();
  // Âm báo đúng/sai: mở khoá AudioContext ở lần chạm đầu tiên
  const unlockAC = () => { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { } };
  ['pointerdown', 'touchend'].forEach(ev => document.addEventListener(ev, unlockAC, { capture: true, passive: true }));
})();
