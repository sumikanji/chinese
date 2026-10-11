/*! © 2026 Sumi Chinese — Từ vựng theo chủ đề: học và kiểm tra */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = a => a[Math.random() * a.length | 0];
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const SP = () => window.SESpeech, ST = () => window.SEStore, UI = () => window.SEUI;
  const T = () => window.SE_VOCAB_TOPICS || [];
  const best = (id, m) => ST().cfg('voc_' + id + '_' + m);
  const setBest = (id, m, v) => { if (v > (best(id, m) || 0)) ST().cfg('voc_' + id + '_' + m, v); };
  const QN = 10;
  const pyJoin = p => String(p).split(' ').join('');

  // ---------- Các chế độ luyện của từng loại chủ đề ----------
  const MODES = {
    tone: [['learn', 'Học 4 thanh điệu'], ['tone', 'Nghe, chọn thanh điệu'], ['say', 'Nhìn pinyin, đọc to']],
    init: [['learn', 'Học các âm'], ['pyhear', 'Nghe, chọn pinyin'], ['say', 'Nhìn pinyin, đọc to']],
    num: [['learn', 'Học các số'], ['listen', 'Nghe số, gõ chữ số'], ['read', 'Nhìn số, đọc to']],
    time: [['learn', 'Học từ'], ['mean', 'Nghe chọn nghĩa'], ['clock', 'Nghe giờ, chọn đồng hồ'], ['date', 'Nghe ngày tháng'], ['say', 'Nói từ']],
    word: [['learn', 'Học từ'], ['mean', 'Nghe chọn nghĩa'], ['hanzi', 'Nghe chọn chữ Hán'], ['say', 'Nói từ']]
  };
  const say = (t, o) => SP().speak(t, o || {});
  const unit = it => it.kind === 'num' ? ' số' : ' từ';

  // ================= Danh sách chủ đề =================
  function viewList(app) {
    const basic = T().filter(t => t.kind !== 'word').length;
    app.innerHTML = '<section class="card panel pop"><div class="panel-h"><h2>Từ vựng theo chủ đề</h2><p>Thanh điệu, pinyin, chữ số, ngày giờ và ' + (T().length - basic) + ' chủ đề đời thường. Mỗi từ có chữ Hán, pinyin, nghĩa và một câu ví dụ. Chạm vào từ để nghe từ, chạm vào câu ví dụ để nghe câu.</p></div></section>' +
      (window.SEScenes ? window.SEScenes.cardsHtml() + '<h2 class="sec">Học theo chủ đề</h2>' : '') +
      '<div class="voc-grid">' + T().map((t, i) => {
        const done = (MODES[t.kind] || MODES.word).slice(1).map(m => best(t.id, m[0])).filter(v => v != null);
        return '<a class="card voc-card" href="#/vocab/' + t.id + '"><span class="num">' + (i + 1) + '</span><b>' + esc(t.t) + '</b><small class="en zh-t">' + esc(t.en) + '</small><small class="muted">' + t.items.length + (t.kind === 'num' ? ' số' : t.kind === 'tone' || t.kind === 'init' ? ' âm' : ' từ') + (done.length ? ' · cao nhất ' + Math.max(...done) + '/' + QN : '') + '</small></a>';
      }).join('') + '</div>';
  }

  // ================= Trang chủ đề =================
  function viewTopic(app, t, mode) {
    const modes = MODES[t.kind] || MODES.word;
    mode = modes.some(m => m[0] === mode) ? mode : 'learn';
    app.innerHTML = '<a class="back" href="#/vocab">← Các chủ đề</a>' +
      '<div class="voc-head"><h1>' + esc(t.t) + '</h1><span class="muted zh-t">' + esc(t.en) + '</span></div>' +
      '<nav class="voc-modes">' + modes.map(m => '<a class="chip' + (m[0] === mode ? ' on' : '') + '" href="#/vocab/' + t.id + '/' + m[0] + '">' + m[1] + (m[0] !== 'learn' && best(t.id, m[0]) != null ? ' · ' + best(t.id, m[0]) + '/' + QN : '') + '</a>').join('') + '</nav>' +
      '<section class="card panel pop" id="vp"></section>';
    const P = $('#vp');
    const fn = { learn, mean: quizMean, hanzi: quizHanzi, say: quizSay, tone: quizTone, pyhear: quizPy, listen: quizNumListen, read: quizNumRead, clock: quizClock, date: quizDate }[mode] || learn;
    return fn(P, t);
  }

  // ----- Học: danh sách thẻ. Chạm từ: chỉ đọc từ. Chạm câu ví dụ: đọc câu -----
  function learn(P, t) {
    const intro = t.kind === 'tone' ? '<div class="tipbox">Tiếng Trung có 4 thanh và 1 thanh nhẹ. Thanh 1 (ā) ngang, cao, giữ đều. Thanh 2 (á) đi lên như hỏi lại "hả?". Thanh 3 (ǎ) xuống thấp rồi lên, nói nhanh thì chỉ còn phần thấp. Thanh 4 (à) rơi mạnh từ cao xuống như ra lệnh. Thanh nhẹ (a) đọc ngắn, nhẹ, không dấu.</div>'
      : t.kind === 'init' ? '<div class="tipbox">Người Việt hay nhầm các âm này. zh/ch/sh/r: cong đầu lưỡi lên. z/c/s: đầu lưỡi đặt sau răng cửa. j/q/x: mặt lưỡi áp vào ngạc, môi kéo dẹt như cười. ü: môi tròn như "u" nhưng lưỡi đặt như "i".</div>' : '';
    P.innerHTML = intro + '<div class="row" style="margin-bottom:12px"><button class="chip play" id="all">Nghe tất cả</button><button class="chip" id="slow">Đọc chậm</button><button class="chip" id="hvi">Ẩn nghĩa</button></div>' +
      '<div class="voc-list" id="vl">' + t.items.map((w, i) => '<div class="voc-item" data-i="' + i + '"><button class="voc-w"><span class="w zhw">' + esc(w.w) + '<small> · ' + esc(pyJoin(w.py)) + '</small></span><span class="m">' + esc(w.vi) + '</span></button>' +
        '<button class="voc-ex"><span class="ex zh">' + UI().zh(w.tk) + '</span><span class="exv">' + esc(w.exvi) + '</span></button></div>').join('') + '</div>';
    let slow = false, run = 0;
    $('#slow', P).onclick = e => { slow = !slow; e.currentTarget.classList.toggle('on', slow); };
    $('#hvi', P).onclick = e => { const on = P.classList.toggle('hide-vi'); e.currentTarget.classList.toggle('on', on); };
    const items = $$('.voc-item', P);
    const here = location.hash;
    const alive = () => location.hash === here;
    const play = async i => {
      if (!alive()) return;
      items.forEach(b => b.classList.toggle('play', +b.dataset.i === i));
      await say(t.items[i].w, { slow, rate: 0.8 });
      const b = items[i]; b && b.classList.remove('play');
    };
    items.forEach(b => {
      const i = +b.dataset.i;
      b.querySelector('.voc-w').onclick = () => { run++; play(i); };
      b.querySelector('.voc-ex').onclick = async () => { run++; items.forEach(x => x.classList.remove('play', 'play-ex')); b.classList.add('play-ex'); await say(t.items[i].ex, { slow }); b.classList.remove('play-ex'); };
    });
    $('#all', P).onclick = async () => { const my = ++run; for (let i = 0; i < t.items.length && my === run && alive(); i++) { items[i].scrollIntoView({ block: 'nearest', behavior: 'smooth' }); await play(i); await wait(350); } };
  }

  // ----- Khung bài kiểm tra 10 câu -----
  function runQuiz(P, t, mode, makeQ) {
    let k = 0, right = 0;
    const res = [];
    const next = () => {
      if (k >= QN) {
        setBest(t.id, mode, right); ST().touch(right); UI().refreshTop();
        P.innerHTML = '<div class="result"><div class="hy">' + UI().hiyo(right >= 8 ? 'cheer' : right >= 5 ? 'joy' : 'think') + '</div><div class="panel-h"><h2>Đúng ' + right + '/' + QN + '</h2><p>' + (right >= 8 ? 'Tuyệt vời! Bạn đã nắm chắc chủ đề này.' : right >= 5 ? 'Khá lắm! Làm thêm một lượt nữa sẽ nhớ hơn.' : 'Quay lại phần Học, nghe thêm vài lần rồi thử lại nhé.') + '</p></div></div>' +
          '<div class="next-bar"><a class="btn" href="#/vocab/' + t.id + '/learn">Xem lại từ</a><button class="btn primary" id="again">Làm lượt mới</button></div>';
        $('#again', P).onclick = () => runQuiz(P, t, mode, makeQ);
        return;
      }
      P.innerHTML = '<div class="progress-dots">' + Array.from({ length: QN }, (_, j) => '<i class="' + (j < k ? res[j] : j === k ? 'cur' : '') + '"></i>').join('') + '</div><div id="qb"></div>';
      makeQ($('#qb', P), ok => { res[k] = ok ? 'ok' : 'bad'; if (ok) right++; k++; setTimeout(next, 900); });
    };
    next();
  }
  // Câu hỏi chọn đáp án. opts: chuỗi; label(x) → HTML hiển thị (mặc định esc)
  function choiceQ(el, o) {
    let tried = false;
    const lab = o.label || esc;
    el.innerHTML = '<div class="game-q"><div class="row center"><button class="btn small primary" id="pl">Nghe lại</button>' + (o.slow !== false ? '<button class="btn small" id="sl">Nghe chậm</button>' : '') + '</div><b>' + o.ask + '</b></div>' +
      '<div class="opts' + (o.big ? ' big' : '') + (o.list ? ' list' : '') + (o.cls ? ' ' + o.cls : '') + '">' + o.opts.map(x => '<button class="opt" data-v="' + esc(x) + '">' + lab(x) + '</button>').join('') + '</div><div class="reveal" id="rv"></div>';
    $('#pl', el).onclick = () => o.play(false);
    if ($('#sl', el)) $('#sl', el).onclick = () => o.play(true);
    $$('.opt', el).forEach(b => b.onclick = () => {
      const ok = b.dataset.v === o.answer;
      if (!ok) { tried = true; b.classList.add('bad'); UI().beep(false); setTimeout(() => o.play(false), 300); return; }
      b.classList.add('ok'); UI().beep(true);
      $$('.opt', el).forEach(x => x.disabled = true);
      $('#rv', el).innerHTML = o.reveal || '';
      o.done(!tried);
    });
    o.play(false);
  }
  // Câu hỏi gõ đáp án (chỉ dùng cho chữ số)
  function typeQ(el, o) {
    let tries = 0;
    el.innerHTML = '<div class="game-q"><div class="row center"><button class="btn small primary" id="pl">Nghe lại</button><button class="btn small" id="sl">Nghe chậm</button></div><b>' + o.ask + '</b></div>' +
      '<form class="type-q" id="tf"><input id="ti" autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="numeric" placeholder="Gõ chữ số…"><button class="btn primary" type="submit">Kiểm tra</button></form>' +
      '<div class="row center" style="margin-top:8px"><button class="btn small ghost" id="giveup">Xem đáp án</button></div><div class="reveal" id="rv"></div>';
    const inp = $('#ti', el);
    setTimeout(() => inp.focus(), 50);
    $('#pl', el).onclick = () => o.play(false);
    $('#sl', el).onclick = () => o.play(true);
    const finish = ok => { inp.disabled = true; $$('button', el).forEach(b => { if (b.id !== 'pl' && b.id !== 'sl') b.disabled = true; }); $('#rv', el).innerHTML = o.reveal; o.done(ok); };
    $('#tf', el).onsubmit = e => {
      e.preventDefault();
      if (o.check(inp.value)) { inp.classList.add('ok'); UI().beep(true); finish(tries === 0); }
      else { tries++; inp.classList.add('bad'); UI().beep(false); setTimeout(() => inp.classList.remove('bad'), 500); UI().toast('Chưa đúng, nghe lại nhé'); o.play(true); if (tries >= 3) finish(false); }
    };
    $('#giveup', el).onclick = () => { UI().beep(false); finish(false); };
    o.play(false);
  }
  const reveal = w => '<span class="zh-t">' + esc(w.w) + '</span> · ' + esc(pyJoin(w.py)) + '<small>' + esc(w.vi) + '</small>';

  // ----- Nghe từ, chọn nghĩa -----
  function quizMean(P, t) {
    const pool = shuffle(t.items);
    let n = 0;
    runQuiz(P, t, 'mean', (el, done) => {
      const w = pool[n++ % pool.length];
      const opts = shuffle([w.vi].concat(shuffle(t.items.filter(x => x.vi !== w.vi).map(x => x.vi)).slice(0, 3)));
      choiceQ(el, { ask: 'Từ này nghĩa là gì?', opts, answer: w.vi, list: true, play: s => say(w.w, { slow: s, rate: 0.8 }), reveal: reveal(w), done: ok => { say(w.w); done(ok); } });
    });
  }
  // ----- Nghe từ, chọn chữ Hán -----
  function quizHanzi(P, t) {
    const pool = shuffle(t.items);
    let n = 0;
    runQuiz(P, t, 'hanzi', (el, done) => {
      const w = pool[n++ % pool.length];
      const opts = shuffle([w.w].concat(shuffle(t.items.filter(x => x.w !== w.w).map(x => x.w)).slice(0, 3)));
      const byW = {}; t.items.forEach(x => byW[x.w] = x);
      choiceQ(el, { ask: 'Bạn nghe thấy từ nào?', opts, answer: w.w, cls: 'zh-opts', label: x => '<span class="zh-t" style="font-size:1.5rem">' + esc(x) + '</span>', play: s => say(w.w, { slow: s, rate: 0.8 }), reveal: reveal(w), done: ok => { say(w.w); done(ok); } });
    });
  }
  // ----- Nhìn nghĩa (hoặc pinyin), nói từ -----
  function quizSay(P, t) {
    const pool = shuffle(t.items);
    const pyMode = t.kind === 'tone' || t.kind === 'init';
    let n = 0;
    runQuiz(P, t, 'say', (el, done) => {
      const w = pool[n++ % pool.length];
      let fin = false;
      el.innerHTML = '<div class="game-q"><b>' + (pyMode ? 'Đọc to âm tiết này:' : 'Nói bằng tiếng Trung:') + '</b><div class="q-vi big">' + esc(pyMode ? pyJoin(w.py) : w.vi) + '</div></div><div id="sb"></div><div class="row center" style="margin-top:10px"><button class="btn small" id="sh">Xem đáp án</button><button class="btn small primary" id="nx" disabled>Tiếp →</button></div>';
      let bestS = 0, peek = false;
      UI().speakBox($('#sb', el), { en: w.w, tk: [[w.w, w.py]], onScore: s => { bestS = Math.max(bestS, s); $('#nx', el).disabled = false; } });
      const se = $('#se', el); se.style.display = 'none';
      new MutationObserver(() => { se.style.display = ''; }).observe($('#sc', el), { childList: true });
      $('#sh', el).onclick = () => { peek = true; se.style.display = ''; say(w.w); $('#nx', el).disabled = false; };
      $('#nx', el).onclick = () => { if (fin) return; fin = true; done(bestS >= 80 && !peek); };
    });
  }

  // ----- Thanh điệu: nghe chữ, chọn pinyin có thanh đúng -----
  const MARKS = { a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', 'ü': 'ǖǘǚǜ' };
  // Đặt dấu thanh lên âm tiết không dấu (quy tắc: a/e trước, rồi o trong "ou", nếu không thì nguyên âm cuối)
  function addTone(base, tone) {
    if (tone < 1 || tone > 4) return base;
    let i = base.search(/[ae]/);
    if (i < 0) i = base.indexOf('ou');
    if (i < 0) { for (let k = base.length - 1; k >= 0; k--) if (MARKS[base[k]]) { i = k; break; } }
    if (i < 0) return base;
    return base.slice(0, i) + MARKS[base[i]][tone - 1] + base.slice(i + 1);
  }
  const plain = p => SP().tone3(p).slice(0, -1);
  const toneOf = p => +SP().tone3(p).slice(-1);
  const CURVE = ['', 'M4 6 H40', 'M4 22 L40 6', 'M4 12 L18 24 L40 4', 'M4 4 L40 24'];
  function quizTone(P, t) {
    const pool = shuffle(t.items.filter(w => w.w.length === 1));
    let n = 0;
    runQuiz(P, t, 'tone', (el, done) => {
      const w = pool[n++ % pool.length];
      const b = plain(w.py), ans = w.py;
      const opts = [1, 2, 3, 4].map(k => addTone(b, k));
      choiceQ(el, { ask: 'Chữ này đọc thanh mấy?', opts, answer: ans, cls: 'tone-grid', label: x => '<svg class="tone-curve" viewBox="0 0 44 28"><path d="' + CURVE[toneOf(x)] + '" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>' + esc(x), play: s => say(w.w, { slow: s, rate: 0.75 }), reveal: '<span class="zh-t">' + esc(w.w) + '</span> · ' + esc(w.py) + ' · thanh ' + toneOf(w.py) + '<small>' + esc(w.vi) + '</small>', done });
    });
  }
  // ----- Âm đầu dễ nhầm: nghe chữ, chọn pinyin -----
  const CONF = [['zh', 'z', 'j'], ['ch', 'c', 'q'], ['sh', 's', 'x'], ['r', 'l', 'y'], ['b', 'p'], ['d', 't'], ['g', 'k', 'h'], ['f', 'h']];
  function quizPy(P, t) {
    const pool = shuffle(t.items.filter(w => w.w.length === 1));
    let n = 0;
    runQuiz(P, t, 'pyhear', (el, done) => {
      const w = pool[n++ % pool.length];
      const ans = w.py;
      // Đáp án nhiễu: lấy các âm tiết khác trong chủ đề có âm đầu dễ nhầm, hoặc cùng vần
      const ini = s => (s.match(/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])/) || [''])[0];
      const grp = CONF.find(g => g.includes(ini(plain(ans)))) || [];
      let cand = t.items.filter(x => x.py !== ans && x.w.length === 1).map(x => x.py);
      const close = cand.filter(p => grp.includes(ini(plain(p))) || plain(p).slice(ini(plain(p)).length) === plain(ans).slice(ini(plain(ans)).length));
      const opts = shuffle([ans].concat(shuffle(close).concat(shuffle(cand)).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3)));
      choiceQ(el, { ask: 'Bạn nghe thấy âm nào?', opts, answer: ans, big: true, play: s => say(w.w, { slow: s, rate: 0.75 }), reveal: '<span class="zh-t">' + esc(w.w) + '</span> · ' + esc(ans) + '<small>' + esc(w.vi) + '</small>', done });
    });
  }

  // ----- Số: nghe số, gõ chữ số -----
  const numRange = k => k < 3 ? rnd(0, 20) : k < 6 ? rnd(21, 100) : k < 8 ? rnd(101, 999) : rnd(1000, 99999);
  const han = n => SP().numVal(n);
  function quizNumListen(P, t) {
    let k = 0;
    runQuiz(P, t, 'listen', (el, done) => {
      const n = numRange(k++);
      typeQ(el, { ask: 'Nghe số và gõ lại bằng chữ số', play: s => say(han(n), { slow: s }), check: v => v.replace(/[^\d]/g, '') === String(n), reveal: n.toLocaleString('vi-VN') + '<small class="zh-t">' + esc(han(n)) + ' · ' + esc(pyOf(han(n))) + '</small>', done });
    });
  }
  const pyOf = s => Array.from(s).map(c => { const p = SP().charPy(c); return p ? addTone(p.slice(0, -1), +p.slice(-1)) : c; }).join(' ');
  function quizNumRead(P, t) {
    let k = 0;
    runQuiz(P, t, 'read', (el, done) => {
      const n = numRange(k++);
      const h = han(n);
      let fin = false, bestS = 0;
      el.innerHTML = '<div class="game-q"><b>Đọc to số này bằng tiếng Trung:</b><div class="big-num">' + n.toLocaleString('vi-VN') + '</div></div><div id="sb"></div><div class="row center" style="margin-top:10px"><button class="btn small primary" id="nx" disabled>Tiếp →</button></div>';
      UI().speakBox($('#sb', el), { en: h, tk: [[h, pyOf(h)]], onScore: s => { bestS = Math.max(bestS, s); $('#nx', el).disabled = false; } });
      const se = $('#se', el); se.style.display = 'none';
      new MutationObserver(() => { se.style.display = ''; }).observe($('#sc', el), { childList: true });
      $('#nx', el).onclick = () => { if (fin) return; fin = true; done(bestS >= 80); };
    });
  }
  // ----- Giờ: nghe giờ, chọn đồng hồ -----
  function timePhrase(h, m) {
    const H = h === 2 ? '两' : han(h);
    if (m === 0) return '现在' + H + '点。';
    if (m === 30) return '现在' + H + '点半。';
    if (m === 15) return '现在' + H + '点一刻。';
    if (m === 45) return '现在' + H + '点三刻。';
    if (m === 55) return '现在差五分' + (h % 12 + 1 === 2 ? '两' : han(h % 12 + 1)) + '点。';
    return '现在' + H + '点' + (m < 10 ? '零' : '') + han(m) + '分。';
  }
  const tstr = (h, m) => ((h - 1 + 12) % 12 + 1) + ':' + String(m).padStart(2, '0');
  function quizClock(P, t) {
    runQuiz(P, t, 'clock', (el, done) => {
      const h = rnd(1, 12), m = pick([0, 15, 30, 45, 0, 30, 5, 10, 20, 25, 40, 50, 55]);
      const ans = tstr(h, m);
      const set = new Set([ans]);
      const cand = [tstr(h, (m + 30) % 60), tstr(h + 1, m), tstr(h - 1, m), tstr(h, (m + 15) % 60), tstr(h, (m + 10) % 60)];
      for (const c of shuffle(cand)) { if (set.size >= 4) break; set.add(c); }
      const ph = timePhrase(h, m);
      choiceQ(el, { ask: 'Mấy giờ?', opts: shuffle([...set]), answer: ans, big: true, play: s => say(ph, { slow: s }), reveal: '<span class="zh-t">' + esc(ph) + '</span><small>' + esc(pyOf(ph.replace(/[。]/g, ''))) + '</small>', done });
    });
  }
  // ----- Ngày tháng: nghe, chọn -----
  const DAYS = [['星期一', 'Thứ Hai'], ['星期二', 'Thứ Ba'], ['星期三', 'Thứ Tư'], ['星期四', 'Thứ Năm'], ['星期五', 'Thứ Sáu'], ['星期六', 'Thứ Bảy'], ['星期天', 'Chủ nhật']];
  function quizDate(P, t) {
    runQuiz(P, t, 'date', (el, done) => {
      const di = rnd(0, 6), mi = rnd(0, 11), d = rnd(1, 28);
      const lab = (a, b, c) => DAYS[a][1] + ', ' + c + '/' + (b + 1);
      const ans = lab(di, mi, d);
      const set = new Set([ans]);
      const cand = [lab((di + 1) % 7, mi, d), lab(di, (mi + 1) % 12, d), lab(di, mi, d % 28 + 1), lab((di + 6) % 7, mi, d), lab(di, (mi + 11) % 12, d), lab(di, mi, (d + 9) % 28 + 1)];
      for (const c of shuffle(cand)) { if (set.size >= 4) break; set.add(c); }
      const ph = han(mi + 1) + '月' + han(d) + '号，' + DAYS[di][0] + '。';
      choiceQ(el, { ask: 'Bạn nghe thấy ngày nào? (ngày/tháng)', opts: shuffle([...set]), answer: ans, list: true, play: s => say(ph, { slow: s }), reveal: '<span class="zh-t">' + esc(ph) + '</span>', done });
    });
  }

  window.SEVocab = {
    view: (app, id, mode) => {
      const t = id && T().find(x => x.id === id);
      return t ? viewTopic(app, t, mode) : viewList(app);
    },
    addTone
  };
})();
