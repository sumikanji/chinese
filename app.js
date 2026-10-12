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
  const I = n => window.SEI ? window.SEI(n) : '';

  // ---------- Chỉ mục dữ liệu ----------
  const LEVELS = window.SE_DATA;
  const LES = {}, ORDER = [];
  LEVELS.forEach(L => L.lessons.forEach((l, i) => { l.level = L; l.idx = i; LES[l.id] = l; ORDER.push(l.id); }));
  const sentCount = L => L.lessons.reduce((a, l) => a + l.d.length, 0);
  // Thẻ ôn tập: s:<bài>:<số câu>
  function card(id) {
    const h = /^h:([^:]+):(\d+)$/.exec(id);
    if (h) { const x = (window.SE_SHADOW || []).find(y => y.id === h[1]); const r = x && x.s[+h[2]]; return r && { id, en: r[0], vi: r[1], tk: r[2], l: null, src: x.t }; }
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
  // Mỗi cấp một màu + một dạng Hiyo: cấp 1 Piyo → cấp 6 Phượng hoàng
  const LV_COLOR = ['#f59e0b', '#10b981', '#0ea5e9', '#6366f1', '#a855f7', '#e11d48'];
  const LV_FORM = [1, 2, 3, 4, 7, 8];
  LEVELS.forEach((L, i) => { L.color = LV_COLOR[i] || L.color; L.form = LV_FORM[i] == null ? 8 : LV_FORM[i]; L.i = i; });
  // Cấp cao nhất đã học ít nhất 1 bài (-1 = chưa học gì → Hiyo còn là trứng)
  const lvReached = () => { const D = ST.get().done; let r = -1; LEVELS.forEach((L, i) => { if (L.lessons.some(l => D[l.id])) r = i; }); return r; };
  const hiyoForm = () => { const r = lvReached(); return r < 0 ? 0 : LEVELS[r].form; };
  const lvBadge = (L, reached) => '<span class="lvl-badge hy-b' + (reached ? '' : ' lock') + '" style="--lc:' + L.color + '">' + window.HIYO.svg(L.form, reached ? 'happy' : 'sleep') + '<em>' + esc(L.name) + '</em></span>';
  const hiyo = (mood, f) => window.HIYO.svg(f == null ? hiyoForm() : f, mood || 'happy');
  const initial = n => esc((n || '?').trim()[0].toUpperCase());
  // ---------- Chữ Hán + pinyin ----------
  const HAN = /[\u4e00-\u9fff]/;
  // tokens [[từ,'pin yin'],…] → HTML: mỗi chữ Hán là <ruby> có pinyin; mỗi từ gói trong .wd; chữ Hán đánh số .w (để tô màu khi chấm)
  function zh(tk) {
    let k = 0;
    const out = [];
    tk.forEach(([w, p]) => {
      const ps = p ? p.split(' ') : [];
      const inner = Array.from(w).map((c, i) => HAN.test(c) ? '<ruby class="w" data-k="' + (k++) + '">' + esc(c) + '<rt>' + esc(ps[i] || '') + '</rt></ruby>' : '<span class="pu">' + esc(c) + '</span>').join('');
      // Dấu câu dính vào từ đứng trước để không bị rơi xuống dòng riêng
      if (!p && out.length && !HAN.test(w) && !/^[“（《]/.test(w)) out[out.length - 1] = out[out.length - 1].slice(0, -7) + inner + '</span>';
      else out.push('<span class="wd">' + inner + '</span>');
    });
    return out.join('');
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
    const tab = { review: 'review', shadow: 'shadow', settings: 'settings', guide: 'settings', account: 'settings', feedback: 'settings' }[parts[0]] || 'home';
    $$('.tabs a').forEach(a => a.classList.toggle('on', a.dataset.tab === tab));
    refreshTop();
    window.scrollTo(0, 0);
    if (parts[0] === 'level' && parts[1]) return viewLevel(parts[1]);
    if (parts[0] === 'lesson' && LES[parts[1]]) return viewLesson(parts[1], parts[2] || '1');
    if (parts[0] === 'review') return viewReview();
    if (parts[0] === 'settings' || parts[0] === 'guide') return viewSettings();
    if (parts[0] === 'account') return viewAccount();
    const X = window.SEX;
    if (X && parts[0] === 'feedback') return X.viewFeedback(app);
    if (parts[0] === 'shadow' && window.SEShadow) { const c = window.SEShadow.view(app, parts[1], parts[2]); if (typeof c === 'function') cleanup = c; return; }
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
      '<section class="card rv2 pop">' +
        '<div class="rv2-top"><span class="rv2-hiyo">' + hiyo(due ? 'think' : 'joy') + '</span>' +
          '<div class="rv2-t"><h2>Ôn tập hôm nay</h2><p><b class="rv2-num">' + fmt(due) + '</b> câu đến hạn</p></div>' +
          '<button class="rv2-help" id="rvh-help" aria-label="Cách hoạt động">?</button></div>' +
        '<div class="rv2-btns">' + (due ? '<a class="btn rvh-go" href="#/review">Ôn ' + fmt(due) + ' câu →</a>' : '') + learn + '</div>' +
        '<div class="rvh-chart rv2-chart"><small>7 NGÀY TỚI</small><div class="rvh-bars">' + fc.map((n, i) =>
          '<div class="rvh-col' + (i === 0 ? ' now' : '') + '"><span class="v">' + (n || '') + '</span><i style="height:' + (n ? Math.max(8, 100 * n / mx) : 4) + '%"></i><span class="d">' + lbl(i) + '</span></div>').join('') + '</div></div>' +
        '<div class="rv2-stats"><div><b>' + ST.streak() + '</b><small>ngày học</small></div><div><b>' + totalDone() + '</b><small>bài đã học</small></div><div><b>' + fmt(Object.keys(S.cards).length) + '</b><small>câu đã gặp</small></div><div><b>' + fmt(ST.mastered()) + '</b><small>câu đã thuộc</small></div></div>' +
        '<div class="rvh-explain rv2-ex" id="rvh-explain" hidden>Sumi không dạy từ vựng rời rạc: bạn học ' + fmt(LEVELS.reduce((x, L) => x + sentCount(L), 0)) + ' câu hội thoại thật, từ vựng tự đến qua câu. Mỗi câu đã học có một ngày ôn. Nhớ đúng thì lần ôn sau cách xa hơn: 1 → 2 → 4 → 7 → 14 → 30 → 60 → 120 ngày. Quên thì câu quay lại gần đầu và được hỏi lại vào ngày mai. Biểu đồ cho biết mỗi ngày tới có bao nhiêu câu đến hạn.</div>' +
      '</section>' +
      '<h2 class="sec">Lộ trình HSK 1 → HSK 6</h2>' +
      '<div class="levels">' + LEVELS.map(L => {
        const rch = lvReached();
        const n = L.lessons.filter(l => S.done[l.id]).length;
        const voc = (window.SE_VOCAB || {})[L.id];
        return '<a class="card lvl" style="--lc:' + L.color + '" href="#/level/' + L.id + '">' +
          lvBadge(L, L.i <= rch) +
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
      '<div class="card lvl-head pop" style="--lc:' + L.color + '">' + lvBadge(L, L.i <= lvReached()) + '<div><h1>' + esc(L.title) + '</h1><p class="muted">' + esc(L.sub) + '</p>' +
      '<p class="lvl-meta">' + L.lessons.length + ' bài · ' + fmt(sentCount(L)) + ' câu' + (voc ? ' · ' + fmt(voc) + ' từ vựng' : '') + '</p>' +
        '<p class="hy-note">Hiyo ở cấp này: <b>' + window.HIYO.NAMES[L.form] + '</b></p></div></div>' +
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
  // Ảnh đại diện trong hội thoại: avMe (của bạn), avThem ('letter' chữ cái · 'auto' mỗi người một con vật · id cố định)
  function avaHtml(name, me) {
    const A = window.SEAV;
    if (me) { const id = ST.cfg('avMe'); return id && A && A.svg(id) ? '<span class="ava img">' + A.svg(id) + '</span>' : '<span class="ava">Bạn</span>'; }
    const m = ST.cfg('avThem') || 'auto';
    const id = !A || m === 'letter' ? '' : m === 'auto' ? A.pick(name) : m;
    return id && A.svg(id) ? '<span class="ava img">' + A.svg(id) + '</span>' : '<span class="ava">' + initial(name) + '</span>';
  }
  function msgHtml(l, d, i, extra, side, name) {
    side = side || d[0];
    name = name || (d[0] === 'B' ? 'Bạn' : l.a);
    return '<div class="msg ' + side + '">' + avaHtml(name, String(side).charAt(0) === 'B') + '<button class="bub' + (extra || '') + '" data-i="' + i + '"><div class="who">' + esc(name) + '</div><div class="en zh">' + zh(d[3]) + '</div><div class="vi">' + esc(d[2]) + '</div></button></div>';
  }

  // ----- Bước 1: Nghe hội thoại -----
  function stepListen(P, l, sc, next) {
    const hideEn = ST.cfg('hideEn') !== false, hideVi = !!ST.cfg('hideVi'), showPy = ST.cfg('hidePy') !== true;
    P.innerHTML = '<div class="intro">' + head('Bước 1 · Nghe hội thoại', 'Lần đầu chỉ nghe, chữ Hán đang được làm mờ. Nghe 2–3 lần rồi mới bật chữ. Chạm vào một câu để nghe lại câu đó.') +
      '<div class="scene">' + esc(l.s) + '</div>' +
      '<div class="pbar"><button class="pbar-play" id="play">' + I('play') + 'Phát cả bài</button><div class="tg"><button class="tg-b" id="slow">' + I('slow') + 'Đọc chậm</button></div>' +
      '<div class="pbar-r2"><span class="tg-l">' + I('eye') + 'Hiện</span><div class="tg"><button class="tg-b' + (hideEn ? '' : ' on') + '" id="ten">Chữ Hán</button><button class="tg-b' + (showPy ? ' on' : '') + '" id="tpy">Pinyin</button><button class="tg-b' + (hideVi ? '' : ' on') + '" id="tvi">Nghĩa</button></div></div></div>' + '</div>' +
      '<div class="chat' + (hideEn ? ' hide-en' : '') + (hideVi ? ' hide-vi' : '') + '" id="chat">' + l.d.map((d, i) => msgHtml(l, d, i)).join('') + '</div>' +
      '<div class="tip">Trẻ em nghe hàng nghìn giờ trước khi nói. Hãy bật lại hội thoại này nhiều lần trong ngày, kể cả khi đang làm việc khác.</div>' +
      '<div class="next-bar"><button class="btn primary" id="nx">Tiếp: Ghép câu →</button></div>';
    const chat = $('#chat', P);
    bindVoice(P);
    if (window.SEX) {
      const cm = document.createElement('div'); P.after(cm);
      window.SEX.comments(cm, { key: l.id, title: l.level.name + ' · ' + l.t, lines: l.d.map(d => ({ t: d[1], v: d[2] })) });
    }
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
      e.currentTarget.innerHTML = I('speak') + 'Đang phát…';
      for (let i = 0; i < l.d.length && my === run; i++) { await line(i); await wait(450); }
      if (my === run) { e.currentTarget.innerHTML = I('repeat') + 'Phát lại'; ST.touch(1); refreshTop(); }
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
    el.innerHTML = '<div class="say fix' + (o.long ? ' long' : '') + '">' +
      '<div class="say-en zh" id="se">' + zh(o.tk) + '</div>' +
      (o.vi ? '<div class="say-vi">' + esc(o.vi) + '</div>' : '') +
      '<div class="say-ctrl"><button class="sbtn" id="li">' + I('speak') + '<span>Nghe mẫu</span></button>' +
      (can ? '<button class="mic" id="mc">' + I('mic') + '<span>Nói</span></button>' : '') +
      '<button class="sbtn" id="sl">' + I('slow') + '<span>Nghe chậm</span></button></div>' +
      '<div class="mic-lbl" id="ml">' + (can ? (o.continuous ? 'Bấm Nói, kể hết cả đoạn, nói xong bấm Dừng' : 'Nghe mẫu, rồi bấm Nói và đọc to cả câu') : '') + '</div>' +
      '<div class="heard" id="hd"></div><div class="score" id="sc"></div>' +
      (can ? '' : '<div class="note">Trình duyệt này chưa hỗ trợ chấm phát âm (hãy dùng Chrome, Edge hoặc Safari mới). Bạn vẫn có thể nghe, nói theo và tự đánh giá:</div><div class="self-rate"><button class="btn small" data-s="40">Chưa giống</button><button class="btn small" data-s="70">Khá giống</button><button class="btn small" data-s="95">Giống rồi</button></div>') +
      '</div>';
    if (window.SEX) window.SEX.decorate($('.say', el), o);
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
      busy = true; mic.classList.add('rec'); mic.innerHTML = I('stop') + '<span>Dừng</span>'; $('#ml', el).textContent = 'Đang nghe… hãy nói to và rõ'; $('#hd', el).textContent = '';
      const r = await SP.listen(o.tk, { strict: o.strict, continuous: o.continuous, maxMs: o.maxMs, onInterim: t => { $('#hd', el).textContent = '“' + (o.continuous && t.length > 80 ? '…' + t.slice(-80) : t) + '”'; } });
      busy = false; mic.classList.remove('rec'); mic.innerHTML = I('mic') + '<span>Nói</span>';
      if (r.error) {
        const m = { 'not-allowed': 'Hãy cho phép dùng micro trong trình duyệt nhé.', 'service-not-allowed': 'Hãy cho phép dùng micro trong trình duyệt nhé.', 'no-speech': 'Chưa nghe thấy gì, bấm Nói và đọc to hơn nhé.', 'network': 'Chấm phát âm cần có mạng Internet.', 'audio-capture': 'Không tìm thấy micro.', 'aborted': 'Đã dừng.' }[r.error] || 'Có lỗi micro, thử lại nhé.';
        $('#ml', el).textContent = m;
        return;
      }
      $('#ml', el).textContent = 'Bấm Nói để thử lại';
      $('#hd', el).textContent = 'Máy nghe được: “' + r.heard + '”';
      o.onResult && o.onResult(r);
      const marks = SP.markWords(o.tk, r);
      $$('#se .w', el).forEach((w, i) => { const m = marks[i]; w.className = 'w ' + (!m ? '' : m.ok >= 0.99 ? 'g' : m.ok > 0 ? 'm' : 'r'); });
      if (marks.some(m => m.ok > 0 && m.ok < 0.99)) $('#ml', el).textContent = 'Chữ màu cam: đúng âm nhưng sai thanh điệu. Bấm Nói để thử lại';
      beep(r.score >= 70);
      showScore(r.score);
    };
  }

  // ----- Bước 3: Nói theo từng câu -----
  // Khung cố định, mỗi câu chỉ thay phần bên trong để trang không bị giật
  function stepShadow(P, l, sc, next) {
    let k = 0;
    P.innerHTML = head('Bước 3 · Nói theo', 'Nghe mẫu rồi nói ngay, bắt chước cả giai điệu. Chữ xanh là chuẩn, cam là đúng âm nhưng sai thanh, đỏ là cần luyện lại.') +
      '<div class="progress-dots">' + l.d.map((_, j) => '<i data-j="' + j + '"></i>').join('') + '</div>' +
      '<div class="who-line" id="wl"></div><div id="box" class="box-fix"></div>' +
      '<div class="pager"><button class="btn" id="pv">← Trước</button><span class="cnt" id="cn"></span><button class="btn primary" id="nx"></button></div>';
    const dots = $$('.progress-dots i', P);
    const paint = () => dots.forEach((i, j) => { i.className = (sc.s3[j] != null ? (sc.s3[j] >= 70 ? 'ok' : 'bad') : '') + (j === k ? ' cur' : ''); });
    function show() {
      const d = l.d[k];
      paint();
      $('#wl', P).textContent = d[0] === 'B' ? 'Bạn nói' : l.a + ' nói';
      $('#cn', P).textContent = (k + 1) + '/' + l.d.length;
      $('#pv', P).disabled = !k;
      $('#nx', P).textContent = k < l.d.length - 1 ? 'Câu tiếp →' : 'Tiếp: Nhập vai →';
      speakBox($('#box', P), { en: d[1], tk: d[3], vi: d[2], who: d[0], onScore: s => { sc.s3[k] = Math.max(sc.s3[k] || 0, s); paint(); } });
      SP.speak(d[1], { who: d[0] });
      const nd = l.d[k + 1]; if (nd) SP.prefetch(nd[1], nd[0]);
    }
    dots.forEach(i => i.onclick = () => { k = +i.dataset.j; show(); });
    $('#pv', P).onclick = () => { if (k) { k--; show(); } };
    $('#nx', P).onclick = () => { if (k < l.d.length - 1) { k++; show(); } else next(); };
    show();
  }

  // ----- Bước 4: Nhập vai -----
  // Khung chat cuộn bên trong, ô lượt nói giữ nguyên chiều cao → không nhảy trang
  function stepRole(P, l, sc, next) {
    let me = sc.role || (l.d.some(d => d[0] === 'B') ? 'B' : 'A');
    let run = 0;
    const toBottom = el => { el.scrollTo ? el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }) : (el.scrollTop = el.scrollHeight); };
    function start() {
      const my = ++run;
      SP.stop(); SP.stopListening();
      sc.s4 = {};
      const pName = me === 'B' ? l.a : 'Bạn đồng hành';
      const mName = me === 'B' ? 'Bạn' : 'Bạn (vai ' + l.a + ')';
      P.innerHTML = head('Bước 4 · Nhập vai', 'Bạn trò chuyện thật với ' + esc(l.a) + '. Đến lượt bạn: nhìn nghĩa tiếng Việt và tự nói câu tiếng Trung. Bí thì bấm Gợi ý.') +
        '<div class="role-pick"><button class="chip' + (me === 'B' ? ' on' : '') + '" data-r="B">Tôi đóng vai: Bạn</button><button class="chip' + (me === 'A' ? ' on' : '') + '" data-r="A">Tôi đóng vai: ' + esc(l.a) + '</button></div>' +
        '<div class="chat role-chat" id="chat"></div><div id="turn" class="turn-slot"></div><div id="end"></div>';
      $$('.role-pick .chip', P).forEach(b => b.onclick = () => { me = sc.role = b.dataset.r; start(); });
      const chat = $('#chat', P), T = $('#turn', P);
      const waitBox = () => { T.innerHTML = '<div class="turn wait"><div class="lbl">' + esc(pName) + ' đang nói…</div><div class="wait-dots"><i></i><i></i><i></i></div></div>'; };
      const r0 = chat.getBoundingClientRect();
      if (r0.top > window.innerHeight * 0.5) window.scrollTo({ top: window.scrollY + r0.top - 80, behavior: 'smooth' });
      (async () => {
        for (let i = 0; i < l.d.length; i++) {
          if (my !== run) return;
          const d = l.d[i];
          for (let j = i + 1; j < l.d.length; j++) if (l.d[j][0] !== me) { SP.prefetch(l.d[j][1], l.d[j][0]); break; }
          if (d[0] !== me) {
            waitBox();
            chat.insertAdjacentHTML('beforeend', msgHtml(l, d, i, ' speaking', 'A in', pName));
            const b = chat.lastElementChild.querySelector('.bub');
            b.onclick = () => SP.speak(d[1], { who: d[0] });
            toBottom(chat);
            await SP.speak(d[1], { who: d[0] });
            b.classList.remove('speaking');
            await wait(250);
          } else {
            const s = await myTurn(d, my);
            if (my !== run) return;
            chat.insertAdjacentHTML('beforeend', msgHtml(l, d, i, '', 'B in', mName));
            toBottom(chat);
            sc.s4[i] = s;
          }
        }
        if (my !== run) return;
        T.innerHTML = '';
        T.classList.add('done');
        const arr = Object.values(sc.s4);
        const avg = arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
        $('#end', P).innerHTML = '<div class="tip" style="text-align:center"><b>Bạn đã hoàn thành cuộc hội thoại!</b><br>Điểm nói trung bình: <b>' + avg + '</b>/100</div>' +
          '<div class="next-bar"><button class="btn" id="again">Diễn lại</button><button class="btn primary" id="fin">Hoàn thành bài</button></div>';
        $('#again', P).onclick = start;
        $('#fin', P).onclick = next;
      })();
    }
    function myTurn(d, my) {
      return new Promise(resolve => {
        const T = $('#turn', P);
        let best = null, hint = 0;
        T.innerHTML = '<div class="turn"><div class="lbl">LƯỢT CỦA BẠN</div><div class="vi">“' + esc(d[2]) + '”</div><div class="hint-en" id="he"></div><div id="sb"></div>' +
          '<div class="row center" style="margin-top:12px"><button class="btn small" id="hn">Gợi ý</button><button class="btn small primary" id="go" disabled>Tiếp →</button></div></div>';
        const words = d[3];
        const box = $('#sb', T);
        speakBox(box, { en: d[1], tk: d[3], who: me, onScore: s => { best = Math.max(best || 0, s); $('#go', T).disabled = false; $('#he', T).textContent = ''; $('#se', box).style.visibility = ''; } });
        const se = $('#se', box); se.style.visibility = 'hidden';
        $('#hn', T).onclick = () => {
          hint++;
          if (hint === 1) { const g = words.slice(0, Math.max(1, Math.ceil(words.length / 3))); $('#he', T).textContent = g.map(x => x[0]).join('') + ' … (' + pyLine(g) + ' …)'; }
          else { $('#he', T).textContent = ''; se.style.visibility = ''; SP.speak(d[1], { who: me }); }
        };
        $('#go', T).onclick = () => { if (my !== run) return; resolve(Math.max(0, (best || 0) - (hint > 1 ? 10 : 0))); };
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
    const f0 = hiyoForm();
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
    const f1 = hiyoForm();
    if (isNew && f1 !== f0) { const ev = document.createElement('div'); ev.className = 'hy-evo pop'; ev.style.setProperty('--lc', l.level.color); ev.innerHTML = '<div class="hy-evo-i">' + window.HIYO.svg(f1, 'cheer') + '</div><div><b>Hiyo đã tiến hóa!</b><span>Chào ' + window.HIYO.NAMES[f1] + ' · cấp ' + esc(l.level.name) + '</span></div>'; P.prepend(ev); refreshTop(); }
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
      const kind = '<span class="rv-kind">' + (c.l ? c.l.level.name + ' · ' + esc(c.l.t) : 'Shadowing · ' + esc(c.src || '')) + '</span>';
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

  // ================= CÀI ĐẶT =================
  function applyTheme() {
    const t = ST.cfg('theme');
    const root = document.documentElement;
    if (t === 'light' || t === 'dark') root.dataset.theme = t; else delete root.dataset.theme;
    const dark = t === 'dark' || (t !== 'light' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = dark ? '#1c1917' : '#fbf9f4';
  }
  function viewSettings() {
    const th = ST.cfg('theme') || 'auto';
    const CL = window.SECloud, A = window.SEAV;
    const u = CL && CL.enabled() ? CL.user() : null;
    // Một dòng cài đặt: ô icon màu + tên + mô tả + phần điều khiển
    const row = (ic, color, title, desc, ctl) => '<div class="set-row"><span class="set-ico" style="background:' + color + '">' + I(ic) + '</span><div class="set-main"><div class="set-t">' + title + '</div>' + (desc ? '<div class="set-d">' + desc + '</div>' : '') + (ctl ? '<div class="set-c">' + ctl + '</div>' : '') + '</div></div>';
    const sec = (title, rows) => '<section class="set-sec"><h3>' + title + '</h3><div class="set-grp">' + rows + '</div></section>';
    const avGrid = (id, cur, extra) => '<div class="av-grid" id="' + id + '">' + (extra || '') + (A ? A.list.map(a => '<button class="av-b' + (cur === a.id ? ' on' : '') + '" data-a="' + a.id + '" title="' + a.name + '" aria-label="' + a.name + '">' + A.svg(a.id) + '</button>').join('') : '') + '</div>';
    const me = ST.cfg('avMe') || '', them = ST.cfg('avThem') || 'auto';
    const preview = () => '<div class="av-prev"><span class="av-prev-i">' + avaHtml('Emma', false) + '<small>Người nói chuyện</small></span><span class="av-prev-i">' + avaHtml('Bạn', true) + '<small>Bạn</small></span></div>';
    app.innerHTML = '<div class="settings">' +
      '<div class="set-head">' + I('settings') + '<div><h1>Cài đặt</h1><p class="muted">Tuỳ chỉnh Sumi Chinese theo cách bạn thích.</p></div></div>' +
      sec('Ảnh đại diện', '<div id="avprev">' + preview() + '</div>' +
        row('user', '#f59e0b', 'Ảnh của bạn', 'Hiện bên cạnh câu bạn nói trong hội thoại và trong bình luận.', avGrid('avme', me, '<button class="av-b txt' + (me ? '' : ' on') + '" data-a="">Bạn</button>')) +
        row('chat', '#0ea5e9', 'Người nói chuyện', 'Chữ cái đầu tên, mỗi người một con vật, hoặc chọn một ảnh cho tất cả.',
          '<div class="seg" id="avmode"><button class="seg-b' + (them === 'letter' ? ' on' : '') + '" data-m="letter">Chữ cái</button><button class="seg-b' + (them === 'auto' ? ' on' : '') + '" data-m="auto">Mỗi người một con vật</button></div>' + avGrid('avthem', them))) +
      sec('Giao diện',
        row('theme', '#6366f1', 'Chế độ sáng / tối', 'Theo máy: tự đổi giống cài đặt của điện thoại.', '<div class="seg" id="theme">' + [['auto', 'Theo máy'], ['light', 'Sáng'], ['dark', 'Tối']].map(x => '<button class="seg-b' + (th === x[0] ? ' on' : '') + '" data-t="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>') +
      row('text', '#8b5cf6', 'Pinyin', 'Tắt pinyin khi đã quen mặt chữ Hán.', '<div class="seg" id="gpy"><button class="seg-b' + (ST.cfg('hidePy') !== true ? ' on' : '') + '" data-p="1">Hiện</button><button class="seg-b' + (ST.cfg('hidePy') === true ? ' on' : '') + '" data-p="0">Ẩn</button></div>') +
        '') +
      sec('Giọng đọc',
        row('speak', '#10b981', 'Giọng AI', 'Nam – Nữ: người nói chuyện giọng nam, bạn giọng nữ. Có ' + fmt(SP.audioCount()) + ' câu thu sẵn.', '<div id="vmode">' + voiceChips() + '</div>') +
        row('gauge', '#f97316', 'Tốc độ đọc', '', '<div class="seg" id="rates">' + [[0.7, 'Chậm'], [0.9, 'Vừa'], [1.05, 'Nhanh']].map(r => '<button class="seg-b' + (Math.abs(SP.getRate() - r[0]) < .01 ? ' on' : '') + '" data-r="' + r[0] + '">' + r[1] + '</button>').join('') + '</div>') +
        row('mic', '#64748b', 'Giọng dự phòng của máy', 'Dùng cho câu chưa có giọng AI.', '<div class="row"><select id="vsel" class="sel"></select><button class="btn small" id="vtest">' + I('play') + 'Nghe thử</button></div>' + (SP.canSpeak() && !SP.hasVoice() ? '<div class="note">Máy chưa có giọng đọc tiếng Trung. iPhone: Cài đặt → Trợ năng → Nội dung được đọc → Giọng nói → Tiếng Trung. Android: Chuyển văn bản thành giọng nói → Google → cài "Tiếng Trung (Quan thoại)". Windows: Giọng nói → Thêm giọng → 中文(简体).</div>' : ''))) +
      sec('Tài khoản',
        (CL && CL.enabled() ? row('user', '#0ea5e9', u ? esc(u.name || u.email) : 'Chưa đăng nhập', u ? 'Tiến độ tự đồng bộ lên tài khoản.' : 'Đăng nhập để lưu tiến độ và học trên nhiều thiết bị.', '<a class="btn small" href="#/account">' + (u ? 'Xem tài khoản' : 'Đăng nhập') + '</a>') : row('user', '#0ea5e9', 'Lưu trên máy này', 'Tiến độ được lưu trên trình duyệt của máy này.', '')) +
        (window.SEX && window.SEX.fbEnabled() ? row('chat', '#0284c7', 'Góp ý', 'Bình luận ở cuối bước Nghe của mỗi bài và cuối mỗi đoạn Shadowing.', '<a class="btn small" href="#/feedback">Xem góp ý của mọi người</a>') : '') +
        row('trash', '#ef4444', 'Xoá tiến độ', 'Xoá toàn bộ bài đã học và câu ôn tập trên máy này.', '<button class="btn small ghost" id="reset">Xoá toàn bộ tiến độ</button>')) +
      sec('Trợ giúp', row('mic', '#a855f7', 'Micro và chấm phát âm', 'Dùng Chrome, Edge (máy tính, Android) hoặc Safari (iPhone). Lần đầu bấm Nói, chọn Cho phép dùng micro.', '')) +
      '<p class="muted" style="text-align:center;font-size:.78rem;margin:18px 0">© 2026 Sumi Chinese · Hiyo © Sumi Kanji · Miễn phí</p></div>';
    const refreshAv = () => { $('#avprev').innerHTML = preview(); };
    $$('#avme .av-b').forEach(b => b.onclick = () => { ST.cfg('avMe', b.dataset.a); $$('#avme .av-b').forEach(x => x.classList.toggle('on', x === b)); refreshAv(); });
    const markThem = () => { const t = ST.cfg('avThem') || 'auto'; $$('#avmode .seg-b').forEach(x => x.classList.toggle('on', x.dataset.m === t)); $$('#avthem .av-b').forEach(x => x.classList.toggle('on', x.dataset.a === t)); refreshAv(); };
    $$('#avmode .seg-b').forEach(b => b.onclick = () => { ST.cfg('avThem', b.dataset.m); markThem(); });
    $$('#avthem .av-b').forEach(b => b.onclick = () => { ST.cfg('avThem', b.dataset.a); markThem(); });
    $$('#theme .seg-b').forEach(b => b.onclick = () => {
      ST.cfg('theme', b.dataset.t === 'auto' ? '' : b.dataset.t); applyTheme();
      $$('#theme .seg-b').forEach(x => x.classList.toggle('on', x === b));
    });
    $$('#gpy .seg-b').forEach(b => b.onclick = () => { const on = b.dataset.p === '1'; ST.cfg('hidePy', !on); setPy(on); $$('#gpy .seg-b').forEach(x => x.classList.toggle('on', x === b)); });
    $$('#rates .seg-b').forEach(b => b.onclick = () => { SP.setRate(+b.dataset.r); ST.cfg('rate', +b.dataset.r); $$('#rates .seg-b').forEach(x => x.classList.toggle('on', x === b)); SP.speak('这是我说话的速度。'); });
    const fillVoices = () => {
      const sel = $('#vsel'); if (!sel) return;
      const list = SP.voiceList();
      sel.innerHTML = '<option value="">Tự chọn giọng tốt nhất</option>' +
        list.map(v => '<option value="' + esc(v.name) + '"' + (SP.getVoice() === v.name ? ' selected' : '') + '>' + esc(v.name) + ' (' + v.lang + (v.g === 'f' ? ', nữ' : v.g === 'm' ? ', nam' : '') + ')</option>').join('');
    };
    fillVoices(); SP.onVoices(fillVoices);
    bindVoice($('#vmode'));
    $('#vsel').onchange = e => { SP.setVoice(e.target.value); ST.cfg('voice', e.target.value); SP.speak('你好！这是我的声音。'); };
    $('#vtest').onclick = () => SP.speak('你好！很高兴认识你。你今天怎么样？');
    $('#reset').onclick = () => { if (confirm('Xoá toàn bộ tiến độ học và câu ôn tập?')) { const t = ST.cfg('theme'), am = ST.cfg('avMe'), at = ST.cfg('avThem'), hp = ST.cfg('hidePy'); ST.reset(); if (t) ST.cfg('theme', t); if (am) ST.cfg('avMe', am); if (at) ST.cfg('avThem', at); if (hp) ST.cfg('hidePy', hp); toast('Đã xoá tiến độ'); route(); } };
  }

  // ================= TÀI KHOẢN =================
  function viewAccount() {
    const CL = window.SECloud;
    if (!CL || !CL.enabled()) {
      app.innerHTML = '<a class="back" href="#/settings">← Cài đặt</a><section class="card panel pop"><div class="panel-h"><h2>Tài khoản</h2><p>Trang này chưa bật đăng nhập. Tiến độ học đang được lưu trên trình duyệt của máy này.</p></div></section>';
      return;
    }
    const u = CL.user();
    if (u) {
      const S = ST.get();
      app.innerHTML = '<a class="back" href="#/settings">← Cài đặt</a><section class="card panel pop acc-card"><div class="acc-av">' + esc((u.name || u.email || '?').trim()[0].toUpperCase()) + '</div>' +
        '<h2>' + esc(u.name || 'Người học') + '</h2><p class="muted">' + esc(u.email) + ' · đăng nhập bằng ' + (u.provider === 'google.com' ? 'Google' : 'Email') + '</p>' +
        '<div class="acc-sync" id="acc-sync">' + SYNC_TXT[CL.status()] + '</div>' +
        '<div class="rvh-stats"><div><b>' + totalDone() + '</b><small>bài đã học</small></div><div><b>' + fmt(Object.keys(S.cards).length) + '</b><small>câu ôn tập</small></div><div><b>' + fmt(S.xp) + '</b><small>XP</small></div><div><b>' + ST.streak() + '</b><small>ngày học</small></div></div>' +
        '<p class="muted" style="font-size:.88rem;margin:14px 0">Tiến độ được tự động lưu lên tài khoản sau mỗi lần học. Đăng nhập cùng tài khoản trên máy khác là học tiếp được ngay.</p>' +
        '<div class="row center"><button class="btn" id="acc-now">Đồng bộ ngay</button><button class="btn ghost" id="acc-out">Đăng xuất</button></div></section>';
      $('#acc-now').onclick = async () => { await CL.syncNow(); toast('Đã đồng bộ'); };
      $('#acc-out').onclick = async () => { if (!confirm('Đăng xuất? Tiến độ đã được lưu trên tài khoản, đăng nhập lại là có ngay. Máy này sẽ trở về trạng thái chưa đăng nhập.')) return; await CL.signOut(); route(); };
      return;
    }
    let mode = 'in';
    const draw = () => {
      app.innerHTML = '<a class="back" href="#/settings">← Cài đặt</a><section class="card panel pop acc-card"><div class="panel-h"><h2>' + (mode === 'in' ? 'Đăng nhập' : 'Tạo tài khoản') + '</h2><p>Đăng nhập để lưu tiến độ lên tài khoản và học tiếp trên mọi thiết bị. Tiến độ đang có trên máy này sẽ được gộp vào tài khoản.</p></div>' +
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
    window.addEventListener('sumi:synced', () => { applyTheme(); setPy(ST.cfg('hidePy') !== true); if (!/lesson|review|shadow\/./.test(location.hash)) route(); else refreshTop(); });
  }

  // ---------- Khởi động ----------
  if (ST.cfg('rate')) SP.setRate(ST.cfg('rate'));
  if (ST.cfg('voice')) SP.setVoice(ST.cfg('voice'));
  SP.setGender(ST.cfg('gender') === 'm' || ST.cfg('gender') === 'mix' ? ST.cfg('gender') : 'f');
  setPy(ST.cfg('hidePy') !== true);
  applyTheme();
  if (window.matchMedia) try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme); } catch (e) { }
  window.SEUI = { speakBox, toast, beep, esc, refreshTop, hiyo, voiceChips, bindVoice, zh, pyLine, setPy, head, wait };
  route();
  // Âm báo đúng/sai: mở khoá AudioContext ở lần chạm đầu tiên
  const unlockAC = () => { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { } };
  ['pointerdown', 'touchend'].forEach(ev => document.addEventListener(ev, unlockAC, { capture: true, passive: true }));
})();
