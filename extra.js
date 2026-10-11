/*! © 2026 Sumi — Luyện thêm: ghi âm so sánh, nghe liên tục, hỏi – đáp, mẫu câu, góp ý (dùng chung cho Sumi English và Sumi Chinese) */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const SP = () => window.SESpeech, ST = () => window.SEStore, UI = () => window.SEUI, CL = () => window.SECloud;
  const ZH = window.SE_LANG === 'zh';
  const SITE = ZH ? 'zh' : 'en';
  const LANG_NAME = ZH ? 'tiếng Trung' : 'tiếng Anh';
  // Hiển thị một câu: tiếng Trung có pinyin (tokens), tiếng Anh là chữ thường
  const sent = (text, tk) => ZH && tk ? '<span class="zh">' + UI().zh(tk) + '</span>' : esc(text);
  const levels = () => window.SE_DATA || [];
  const lvName = id => (levels().find(L => L.id === id) || { name: String(id).toUpperCase() }).name;
  const lessonsAll = () => [].concat(...levels().map(L => L.lessons));

  // ================= 1. GHI ÂM ĐỂ SO VỚI GIỌNG MẪU =================
  const canRec = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  let recStop = null;            // dừng bản ghi đang chạy
  let myAudio = null;            // phát lại giọng mình
  const urls = [];
  function pickMime() {
    const c = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
    for (const m of c) try { if (MediaRecorder.isTypeSupported(m)) return m; } catch (e) { }
    return '';
  }
  function playUrl(u) {
    return new Promise(res => {
      try {
        myAudio = myAudio || new Audio();
        SP().stop();
        myAudio.onended = myAudio.onerror = () => res();
        myAudio.src = u; const p = myAudio.play(); if (p && p.catch) p.catch(() => res());
      } catch (e) { res(); }
    });
  }
  // recRow(host, playModel, {maxMs}) — thêm hàng: [Ghi âm để so] [Nghe mình] [So sánh]
  function recRow(host, playModel, o) {
    o = o || {};
    if (!canRec()) return;
    host.insertAdjacentHTML('beforeend', '<div class="rec-row"><button class="btn small rec-b" data-a="rec">Ghi âm để so</button><button class="btn small" data-a="me" disabled>Nghe mình</button><button class="btn small" data-a="cmp" disabled>So sánh</button><div class="rec-lbl">Ghi âm giọng bạn, rồi bấm So sánh: nghe giọng mẫu, ngay sau đó là giọng bạn.</div></div>');
    const row = host.lastElementChild, bRec = $('[data-a=rec]', row), bMe = $('[data-a=me]', row), bCmp = $('[data-a=cmp]', row), lbl = $('.rec-lbl', row);
    let url = null, mr = null, stream = null, tm = null;
    const stopRec = () => { clearTimeout(tm); try { mr && mr.state !== 'inactive' && mr.stop(); } catch (e) { } };
    bRec.onclick = async () => {
      if (mr && mr.state === 'recording') return stopRec();
      if (recStop) recStop();
      SP().stop(); SP().stopListening();
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
      catch (e) { lbl.textContent = 'Hãy cho phép dùng micro trong trình duyệt để ghi âm.'; return; }
      const mime = pickMime(), chunks = [];
      try { mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); } catch (e) { mr = new MediaRecorder(stream); }
      mr.ondataavailable = e => e.data && e.data.size && chunks.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        recStop = null;
        bRec.classList.remove('on'); bRec.textContent = 'Ghi lại';
        if (!chunks.length) { lbl.textContent = 'Chưa ghi được âm thanh, thử lại nhé.'; return; }
        if (url) URL.revokeObjectURL(url);
        url = URL.createObjectURL(new Blob(chunks, { type: mr.mimeType || mime || 'audio/webm' })); urls.push(url);
        bMe.disabled = bCmp.disabled = false;
        lbl.textContent = 'Đã ghi. Bấm So sánh để nghe giọng mẫu rồi tới giọng bạn.';
      };
      mr.start();
      recStop = stopRec;
      bRec.classList.add('on'); bRec.textContent = 'Dừng ghi';
      lbl.textContent = 'Đang ghi âm… nói xong bấm Dừng ghi.';
      tm = setTimeout(stopRec, o.maxMs || 20000);
    };
    bMe.onclick = () => url && playUrl(url);
    bCmp.onclick = async () => { if (!url) return; lbl.textContent = 'Giọng mẫu…'; await playModel(); await wait(350); lbl.textContent = 'Giọng bạn…'; await playUrl(url); lbl.textContent = 'Nghe ra chỗ khác nhau chưa? Ghi lại để thử tiếp.'; };
  }
  window.addEventListener('hashchange', () => { if (recStop) recStop(); try { myAudio && myAudio.pause(); } catch (e) { } while (urls.length > 4) URL.revokeObjectURL(urls.shift()); });

  // Gắn vào ô luyện nói (speakBox): hàng ghi âm + nút góp ý
  function decorate(say, o) {
    if (!say) return;
    const model = () => o.onListen ? o.onListen(false) : SP().speak(o.en, { who: o.who });
    recRow(say, model, { maxMs: o.long ? 150000 : 20000 });
    if (fbEnabled() && !o.long && o.en) {
      say.insertAdjacentHTML('beforeend', '<div class="fb-line"><button class="linkb" data-fb>Góp ý câu này</button></div>');
      $('[data-fb]', say).onclick = () => openFeedback({ s: o.en, v: o.vi, tk: o.tk });
    }
  }

  // ================= 5. GÓP Ý DẠNG BÌNH LUẬN =================
  const fbEnabled = () => !!(CL() && CL().enabled());
  const KINDS = ZH
    ? [['text', 'Câu tiếng Trung sai / không tự nhiên'], ['py', 'Pinyin sai'], ['vi', 'Dịch nghĩa chưa đúng'], ['audio', 'Giọng AI đọc sai'], ['other', 'Khác']]
    : [['text', 'Câu tiếng Anh sai / không tự nhiên'], ['vi', 'Dịch nghĩa chưa đúng'], ['audio', 'Giọng AI đọc sai'], ['other', 'Khác']];
  const kindName = k => (KINDS.find(x => x[0] === k) || [k, 'Khác'])[1];
  const fbKey = s => SP().keyOf('A', s);
  const when = t => { if (!t) return ''; const d = new Date(t); return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }); };
  function commentHtml(id, c, mine) {
    return '<div class="fb-c" data-id="' + esc(id) + '"><div class="fb-h"><b>' + esc(c.name || 'Người học') + '</b><span class="fb-k">' + esc(kindName(c.kind)) + '</span><small>' + when(c.at) + '</small></div><p>' + esc(c.msg) + '</p>' + (mine ? '<button class="linkb fb-del">Xoá</button>' : '') + '</div>';
  }
  function closeSheet() { const o = $('#fb-ov'); if (o) o.remove(); document.body.classList.remove('noscroll'); }
  async function openFeedback(it) {
    closeSheet();
    const u = CL().user();
    document.body.insertAdjacentHTML('beforeend', '<div class="fb-ov" id="fb-ov"><div class="fb-sheet" role="dialog" aria-label="Góp ý câu"><div class="fb-top"><b>Góp ý câu này</b><button class="btn small" id="fb-x">Đóng</button></div>' +
      '<div class="fb-s">' + sent(it.s, it.tk) + (it.v ? '<small>' + esc(it.v) + '</small>' : '') + '</div>' +
      '<div class="fb-list" id="fb-list"><p class="muted">Đang tải góp ý…</p></div>' +
      (u ? '<div class="fb-form"><div class="fb-kinds" id="fb-k">' + KINDS.map((k, i) => '<button class="chip' + (i ? '' : ' on') + '" data-k="' + k[0] + '">' + k[1] + '</button>').join('') + '</div>' +
        '<textarea id="fb-m" maxlength="500" rows="3" placeholder="Viết góp ý, ví dụ: nên nói … thay vì …"></textarea><div class="row"><button class="btn primary" id="fb-send">Gửi góp ý</button><span class="muted" id="fb-msg"></span></div></div>'
        : '<div class="fb-login"><p class="muted">Đăng nhập để viết góp ý. Ai cũng xem được các góp ý.</p><a class="btn small primary" href="#/account">Đăng nhập</a></div>') +
      '</div></div>');
    document.body.classList.add('noscroll');
    $('#fb-x').onclick = closeSheet;
    $('#fb-ov').onclick = e => { if (e.target.id === 'fb-ov') closeSheet(); };
    const db = await CL().db();
    const list = $('#fb-list');
    if (!db) { if (list) list.innerHTML = '<p class="muted">Chưa kết nối được máy chủ góp ý.</p>'; return; }
    const ref = db.ref('feedback/' + SITE + '/' + fbKey(it.s));
    const load = async () => {
      try {
        const snap = await ref.once('value'), v = snap.val() || {};
        const arr = Object.entries(v).sort((a, b) => (a[1].at || 0) - (b[1].at || 0));
        if (!$('#fb-list')) return;
        $('#fb-list').innerHTML = arr.length ? arr.map(([id, c]) => commentHtml(id, c, u && c.uid === u.uid)).join('') : '<p class="muted">Chưa có góp ý nào cho câu này.</p>';
        $$('.fb-del', $('#fb-list')).forEach(b => b.onclick = async () => { if (!confirm('Xoá góp ý này?')) return; await ref.child(b.closest('.fb-c').dataset.id).remove(); load(); });
      } catch (e) { if ($('#fb-list')) $('#fb-list').innerHTML = '<p class="muted">Không tải được góp ý (' + esc(e.code || e.message) + ').</p>'; }
    };
    load();
    if (!u) return;
    let kind = KINDS[0][0];
    $$('#fb-k .chip').forEach(b => b.onclick = () => { kind = b.dataset.k; $$('#fb-k .chip').forEach(x => x.classList.toggle('on', x === b)); });
    $('#fb-send').onclick = async () => {
      const msg = $('#fb-m').value.trim();
      if (!msg) { $('#fb-msg').textContent = 'Hãy viết nội dung góp ý.'; return; }
      $('#fb-send').disabled = true; $('#fb-msg').textContent = 'Đang gửi…';
      try {
        await ref.push({ uid: u.uid, name: (u.name || (u.email || '').split('@')[0] || 'Người học').slice(0, 40), kind, msg: msg.slice(0, 500), s: String(it.s).slice(0, 400), v: String(it.v || '').slice(0, 400), at: CL().ts() });
        $('#fb-m').value = ''; $('#fb-msg').textContent = 'Cảm ơn bạn đã góp ý!'; UI().toast('Đã gửi góp ý');
        load();
      } catch (e) { $('#fb-msg').textContent = 'Chưa gửi được: ' + (e.code === 'PERMISSION_DENIED' ? 'máy chủ chưa mở quyền góp ý.' : (e.message || 'lỗi')); }
      $('#fb-send').disabled = false;
    };
  }
  // Chế độ góp ý cho danh sách câu (bước Nghe của bài, Shadowing): bật chip → chạm câu để góp ý
  function fbChip() { return fbEnabled() ? '<button class="chip" data-fbmode>Góp ý</button>' : ''; }
  function bindFbMode(root, container, itemSel, getItem) {
    const chip = $('[data-fbmode]', root); if (!chip || !container) return;
    chip.onclick = () => { const on = container.classList.toggle('fb-mode'); chip.classList.toggle('on', on); if (on) UI().toast('Chạm vào câu muốn góp ý'); };
    container.addEventListener('click', e => {
      if (!container.classList.contains('fb-mode')) return;
      const el = e.target.closest(itemSel); if (!el || !container.contains(el)) return;
      e.preventDefault(); e.stopPropagation();
      const it = getItem(el); if (it) openFeedback(it);
    }, true);
  }
  // Trang tổng hợp góp ý
  async function viewFeedback(app) {
    app.innerHTML = '<a class="back" href="#/settings">← Cài đặt</a><section class="card panel pop"><div class="panel-h"><h2>Góp ý của người học</h2><p>Các góp ý mới nhất về câu ' + LANG_NAME + ', nghĩa tiếng Việt và giọng AI. Chạm vào một góp ý để xem cả cuộc trao đổi của câu đó.</p></div></section><div id="fba"><p class="muted">Đang tải…</p></div>';
    if (!fbEnabled()) { $('#fba').innerHTML = '<p class="muted">Trang này chưa bật đăng nhập nên chưa dùng được góp ý.</p>'; return; }
    const db = await CL().db(); if (!db) { $('#fba').innerHTML = '<p class="muted">Chưa kết nối được máy chủ.</p>'; return; }
    try {
      const v = (await db.ref('feedback/' + SITE).once('value')).val() || {};
      const all = [];
      for (const k in v) for (const id in v[k]) all.push(Object.assign({ k, id }, v[k][id]));
      all.sort((a, b) => (b.at || 0) - (a.at || 0));
      const el = $('#fba'); if (!el) return;
      el.innerHTML = all.length ? '<div class="fb-all">' + all.slice(0, 200).map((c, i) => '<button class="card fb-item" data-i="' + i + '"><span class="fb-s1">' + esc(c.s) + '</span><span class="fb-h"><b>' + esc(c.name || 'Người học') + '</b><span class="fb-k">' + esc(kindName(c.kind)) + '</span><small>' + when(c.at) + '</small></span><span class="fb-m">' + esc(c.msg) + '</span></button>').join('') + '</div>' : '<p class="muted">Chưa có góp ý nào.</p>';
      $$('.fb-item', el).forEach(b => b.onclick = () => { const c = all[+b.dataset.i]; openFeedback({ s: c.s, v: c.v, tk: ZH ? tokOf(c.s) : null }); });
    } catch (e) { $('#fba').innerHTML = '<p class="muted">Không tải được (' + esc(e.code || e.message) + '). Hãy kiểm tra luật Realtime Database.</p>'; }
  }
  // Tìm lại tokens pinyin của một câu tiếng Trung (để hiện pinyin trong trang góp ý)
  let TOKMAP = null;
  function tokOf(s) {
    if (!TOKMAP) {
      TOKMAP = new Map();
      levels().forEach(L => L.lessons.forEach(l => l.d.forEach(d => d[3] && TOKMAP.set(d[1], d[3]))));
      (window.SE_SHADOW || []).forEach(x => x.s.forEach(r => r[2] && TOKMAP.set(r[0], r[2])));
      (window.SE_QA || []).forEach(q => { q.qt && TOKMAP.set(q.q, q.qt); q.at && TOKMAP.set(q.a, q.at); });
    }
    return TOKMAP.get(s) || null;
  }

  // ================= 2. NGHE LIÊN TỤC =================
  // Nguồn: done (bài đã học) · lv:<cấp> · sh:<cấp> · qa:<cấp>
  function sourceList() {
    const S = ST().get(), out = [];
    const done = lessonsAll().filter(l => S.done[l.id]);
    out.push(['done', 'Các bài đã học (' + done.length + ' bài)']);
    levels().forEach(L => out.push(['lv:' + L.id, 'Hội thoại cấp ' + L.name + ' (' + L.lessons.length + ' bài)']));
    const sh = window.SE_SHADOW || [];
    [...new Set(sh.map(x => x.lv))].forEach(lv => out.push(['sh:' + lv, 'Shadowing cấp ' + lvName(lv) + ' (' + sh.filter(x => x.lv === lv).length + ' đoạn)']));
    const qa = window.SE_QA || [];
    [...new Set(qa.map(x => x.lv))].forEach(lv => out.push(['qa:' + lv, 'Hỏi – đáp cấp ' + lvName(lv)]));
    return out;
  }
  function buildGroups(src) {
    const S = ST().get();
    const fromLesson = l => ({ title: lvNameOfLesson(l) + ' · ' + l.t, lines: l.d.map(d => ({ t: d[1], who: d[0], vi: d[2], tk: d[3] })) });
    if (src === 'done') return lessonsAll().filter(l => S.done[l.id]).map(fromLesson);
    if (src.startsWith('lv:')) { const L = levels().find(x => x.id === src.slice(3)); return L ? L.lessons.map(fromLesson) : []; }
    if (src.startsWith('sh:')) return (window.SE_SHADOW || []).filter(x => x.lv === src.slice(3)).map(x => ({ title: 'Shadowing · ' + x.t, lines: x.s.map(r => ZH ? { t: r[0], who: 'A', vi: r[1], tk: r[2] } : { t: r[0], who: 'A', vi: r[1] }) }));
    if (src.startsWith('qa:')) return (window.SE_QA || []).filter(x => x.lv === src.slice(3)).map(x => ({ title: 'Hỏi – đáp · ' + x.qv, lines: [{ t: x.q, who: 'A', vi: x.qv, tk: x.qt }, { t: x.a, who: 'B', vi: x.av, tk: x.at }] }));
    return [];
  }
  function lvNameOfLesson(l) { return l.level ? l.level.name : ''; }
  let LP = null; // trình phát đang chạy
  function viewListen(app) {
    const cfg = Object.assign({ src: 'done', reps: 1, gap: 1500, rate: 1, shuf: false, loop: true, vi: true, sleep: 0 }, ST().cfg('lsn') || {});
    const save = () => ST().cfg('lsn', Object.assign({}, cfg, { sleep: 0 }));
    const srcs = sourceList();
    if (cfg.src === 'done' && !lessonsAll().some(l => ST().get().done[l.id])) cfg.src = 'lv:' + (levels()[0] || {}).id;
    const chips = (id, arr, cur) => '<div class="row ls-opt" id="' + id + '">' + arr.map(x => '<button class="chip' + (x[0] === cur ? ' on' : '') + '" data-v="' + x[0] + '">' + x[1] + '</button>').join('') + '</div>';
    app.innerHTML = '<a class="back" href="#/">← Trang chủ</a><section class="card panel pop"><div class="panel-h"><h2>Nghe liên tục</h2><p>Bật danh sách câu rồi để điện thoại nghe khi đang nấu ăn, đi tàu hay đi bộ. Tắt màn hình vẫn nghe được, điều khiển bằng nút trên màn hình khoá. Càng nhiều giờ nghe, tai càng quen.</p></div>' +
      '<label class="ls-l">Nghe gì</label><select class="sel" id="ls-src">' + srcs.map(s => '<option value="' + s[0] + '"' + (s[0] === cfg.src ? ' selected' : '') + '>' + esc(s[1]) + '</option>').join('') + '</select>' +
      '<label class="ls-l">Đọc mỗi câu</label>' + chips('ls-reps', [[1, '1 lần'], [2, '2 lần'], [3, '3 lần']], cfg.reps) +
      '<label class="ls-l">Nghỉ giữa các câu (để nói theo)</label>' + chips('ls-gap', [[400, 'Ngắn'], [1500, 'Vừa'], [3500, 'Dài']], cfg.gap) +
      '<label class="ls-l">Tốc độ</label>' + chips('ls-rate', [[0.8, 'Chậm'], [1, 'Bình thường'], [1.15, 'Nhanh']], cfg.rate) +
      '<label class="ls-l">Tuỳ chọn</label><div class="row ls-opt"><button class="chip' + (cfg.shuf ? ' on' : '') + '" id="ls-shuf">Xáo trộn bài</button><button class="chip' + (cfg.loop ? ' on' : '') + '" id="ls-loop">Lặp lại danh sách</button><button class="chip' + (cfg.vi ? ' on' : '') + '" id="ls-vi">Hiện nghĩa</button></div>' +
      '<label class="ls-l">Hẹn giờ tắt</label>' + chips('ls-sleep', [[0, 'Không'], [15, '15 phút'], [30, '30 phút'], [60, '60 phút']], 0) +
      '<div class="voice-row">' + UI().voiceChips() + '</div></section>' +
      '<section class="card ls-now" id="ls-now"><div class="ls-title" id="ls-title">Chưa phát</div><div class="ls-text" id="ls-text"></div><div class="ls-vi" id="ls-vi"></div><div class="ls-cnt muted" id="ls-cnt"></div>' +
      '<div class="ls-ctrl"><button class="btn" id="ls-prev">← Câu trước</button><button class="btn primary ls-play" id="ls-play">Phát</button><button class="btn" id="ls-next">Câu sau →</button></div><div class="muted ls-sl" id="ls-sl"></div></section>' +
      '<h2 class="sec">Danh sách</h2><div class="ls-list" id="ls-list"></div>';
    UI().bindVoice(app);
    let groups = [], items = [], i = 0, rep = 0, playing = false, timer = null, sleepAt = 0, sleepTm = null;
    const A = new Audio(); A.preload = 'auto';
    const nowEl = $('#ls-now');
    function build() {
      groups = buildGroups(cfg.src);
      if (cfg.shuf) groups = shuffle(groups);
      items = [];
      groups.forEach((g, gi) => g.lines.forEach(ln => { const u = SP().urlOf(ln.t, ln.who); if (u) items.push(Object.assign({ g: gi, title: g.title, u }, ln)); }));
      i = 0; rep = 0;
      $('#ls-list').innerHTML = groups.length ? groups.map((g, gi) => '<button class="card ls-g" data-g="' + gi + '"><b>' + esc(g.title) + '</b><small class="muted">' + g.lines.length + ' câu</small></button>').join('') : '<p class="muted">Chưa có câu nào. Học xong một bài thì bài đó sẽ vào danh sách "Các bài đã học".</p>';
      $$('.ls-g').forEach(b => b.onclick = () => { const k = items.findIndex(x => x.g === +b.dataset.g); if (k >= 0) { i = k; rep = 0; play(); } });
      show();
    }
    function show() {
      const it = items[i];
      $('#ls-title').textContent = it ? it.title : (items.length ? 'Sẵn sàng' : 'Không có câu');
      $('#ls-text').innerHTML = it ? sent(it.t, it.tk) : '';
      $('#ls-vi').textContent = it && cfg.vi ? it.vi : '';
      $('#ls-cnt').textContent = items.length ? 'Câu ' + (i + 1) + ' / ' + items.length : '';
      $$('.ls-g').forEach(b => b.classList.toggle('cur', it && +b.dataset.g === it.g));
      $('#ls-play').textContent = playing ? 'Tạm dừng' : 'Phát';
      nowEl.classList.toggle('on', playing);
      if (it && 'mediaSession' in navigator) {
        try { navigator.mediaSession.metadata = new MediaMetadata({ title: it.t, artist: it.title, album: ZH ? 'Sumi Chinese' : 'Sumi English' }); } catch (e) { }
      }
    }
    function playCur() {
      const it = items[i]; if (!it) return stop();
      if (sleepAt && Date.now() >= sleepAt) { stop(); $('#ls-sl').textContent = 'Đã tắt theo hẹn giờ.'; return; }
      show();
      if (items[i + 1]) SP().prefetch(items[i + 1].t, items[i + 1].who);
      A.src = it.u;
      A.playbackRate = cfg.rate;
      try { A.preservesPitch = true; A.webkitPreservesPitch = true; } catch (e) { }
      const p = A.play(); if (p && p.catch) p.catch(() => { playing = false; show(); });
    }
    function advance() {
      if (!playing) return;
      if (rep + 1 < cfg.reps) rep++;
      else { rep = 0; i++; if (i >= items.length) { if (cfg.loop) i = 0; else { stop(); i = 0; show(); return; } } }
      const it = items[i], prev = items[i - 1];
      let gap = cfg.gap;
      if (rep === 0 && prev && it && prev.g !== it.g) gap += 1200;   // nghỉ dài hơn khi sang bài mới
      if (document.hidden) gap = Math.min(gap, 300);
      clearTimeout(timer); timer = setTimeout(playCur, gap);
    }
    A.onended = advance;
    A.onerror = () => { if (playing) { rep = cfg.reps; advance(); } };
    function play() {
      if (!items.length) return;
      SP().stop(); playing = true; LP = stop;
      clearTimeout(timer); playCur();
    }
    function stop() { playing = false; clearTimeout(timer); try { A.pause(); } catch (e) { } show(); }
    $('#ls-play').onclick = () => playing ? stop() : play();
    $('#ls-prev').onclick = () => { i = Math.max(0, i - 1); rep = 0; playing ? (clearTimeout(timer), playCur()) : show(); };
    $('#ls-next').onclick = () => { i = Math.min(items.length - 1, i + 1); rep = 0; playing ? (clearTimeout(timer), playCur()) : show(); };
    if ('mediaSession' in navigator) {
      const ms = navigator.mediaSession;
      try {
        ms.setActionHandler('play', () => play());
        ms.setActionHandler('pause', () => stop());
        ms.setActionHandler('previoustrack', () => $('#ls-prev') && $('#ls-prev').click());
        ms.setActionHandler('nexttrack', () => $('#ls-next') && $('#ls-next').click());
      } catch (e) { }
    }
    $('#ls-src').onchange = e => { cfg.src = e.target.value; save(); const was = playing; stop(); build(); if (was) play(); };
    const bindChips = (id, key, after) => $$('#' + id + ' .chip').forEach(b => b.onclick = () => { cfg[key] = +b.dataset.v; $$('#' + id + ' .chip').forEach(x => x.classList.toggle('on', x === b)); save(); after && after(); });
    bindChips('ls-reps', 'reps'); bindChips('ls-gap', 'gap'); bindChips('ls-rate', 'rate', () => { A.playbackRate = cfg.rate; });
    $$('#ls-sleep .chip').forEach(b => b.onclick = () => {
      $$('#ls-sleep .chip').forEach(x => x.classList.toggle('on', x === b));
      const m = +b.dataset.v; clearTimeout(sleepTm);
      sleepAt = m ? Date.now() + m * 60000 : 0;
      $('#ls-sl').textContent = m ? 'Sẽ tắt sau ' + m + ' phút.' : '';
      if (m) sleepTm = setTimeout(() => { if (playing) { stop(); if ($('#ls-sl')) $('#ls-sl').textContent = 'Đã tắt theo hẹn giờ.'; } }, m * 60000);
    });
    const tog = (id, key, after) => { $('#' + id).onclick = e => { cfg[key] = !cfg[key]; e.currentTarget.classList.toggle('on', cfg[key]); save(); after && after(); }; };
    tog('ls-shuf', 'shuf', () => { const was = playing; stop(); build(); if (was) play(); });
    tog('ls-loop', 'loop'); tog('ls-vi', 'vi', show);
    build();
    // Đếm thời gian nghe vào chuỗi ngày học
    let heard = 0; const tick = setInterval(() => { if (playing && !A.paused) { heard++; if (heard % 60 === 0) { ST().touch(1); UI().refreshTop(); } } }, 1000);
    return () => { stop(); clearInterval(tick); clearTimeout(sleepTm); LP = null; A.src = ''; };
  }

  // ================= 3. HỎI – ĐÁP PHẢN XẠ =================
  function viewQA(app) {
    const all = window.SE_QA || [];
    const lvs = [...new Set(all.map(x => x.lv))];
    let lv = lvs.includes(ST().cfg('qaLv')) ? ST().cfg('qaLv') : lvs[0];
    let queue = [], cur = null, run = 0;
    const hideQ = () => !!ST().cfg('qaHideQ');
    app.innerHTML = '<a class="back" href="#/shadow">← Shadowing</a><section class="card panel pop"><div class="panel-h"><h2>Hỏi – đáp phản xạ</h2><p>Nghe câu hỏi về bản thân bạn rồi trả lời ngay bằng ' + LANG_NAME + ', tự nói theo ý mình. Không có đúng sai: máy ghi lại những gì bạn nói, sau đó bạn xem câu trả lời mẫu để học thêm cách diễn đạt.</p></div>' +
      '<div class="row sd-filter" id="qa-lv">' + lvs.map(x => '<button class="chip' + (x === lv ? ' on' : '') + '" data-l="' + x + '">' + lvName(x) + '</button>').join('') + '</div></section>' +
      '<section class="card panel qa-card" id="qa"></section>';
    $$('#qa-lv .chip').forEach(b => b.onclick = () => { lv = b.dataset.l; ST().cfg('qaLv', lv); $$('#qa-lv .chip').forEach(x => x.classList.toggle('on', x === b)); queue = []; next(); });
    const P = $('#qa');
    function next() {
      run++; SP().stop(); SP().stopListening();
      if (!queue.length) queue = shuffle(all.filter(x => x.lv === lv));
      cur = queue.shift();
      const q = cur, can = SP().canListen();
      P.innerHTML = '<div class="qa-n muted">Câu hỏi · ' + lvName(lv) + '</div>' +
        '<div class="qa-q' + (hideQ() ? ' hid' : '') + '" id="qa-q">' + sent(q.q, q.qt) + '</div><div class="qa-qv muted" id="qa-qv">' + esc(q.qv) + '</div>' +
        '<div class="row center qa-tools"><button class="btn small" id="qa-rep">Nghe lại câu hỏi</button><button class="chip' + (hideQ() ? '' : ' on') + '" id="qa-hq">Hiện chữ câu hỏi</button></div>' +
        '<div class="qa-ans">' + (can ? '<button class="mic" id="qa-mic">Trả lời</button><div class="mic-lbl" id="qa-ml">Bấm Trả lời, nói tự nhiên 1–3 câu, xong bấm Dừng</div>' : '<div class="note">Trình duyệt này chưa nghe được giọng nói. Bạn vẫn có thể nói to câu trả lời, ghi âm để nghe lại, rồi xem câu trả lời mẫu.</div>') +
        '<div class="heard qa-heard" id="qa-hd"></div><div class="qa-fb" id="qa-fb"></div><div id="qa-rec"></div></div>' +
        '<div class="qa-sample" id="qa-s" hidden><div class="lbl">CÂU TRẢ LỜI MẪU</div><div class="qa-a">' + sent(q.a, q.at) + '</div><div class="muted">' + esc(q.av) + '</div><div class="row center"><button class="btn small" id="qa-sa">Nghe câu mẫu</button><button class="btn small" id="qa-ss">Nghe chậm</button>' + (fbEnabled() ? '<button class="linkb" id="qa-fbb">Góp ý câu mẫu</button>' : '') + '</div></div>' +
        '<div class="next-bar"><button class="btn" id="qa-show">Xem câu trả lời mẫu</button><button class="btn primary" id="qa-next">Câu khác →</button></div>';
      const sayQ = () => SP().speak(q.q, { who: 'A' });
      const sayA = slow => SP().speak(q.a, { who: 'B', slow });
      $('#qa-rep').onclick = sayQ;
      $('#qa-hq').onclick = e => { const h = !hideQ(); ST().cfg('qaHideQ', h); $('#qa-q').classList.toggle('hid', h); e.currentTarget.classList.toggle('on', !h); };
      $('#qa-q').onclick = () => { $('#qa-q').classList.remove('hid'); };
      $('#qa-show').onclick = () => { $('#qa-s').hidden = false; $('#qa-q').classList.remove('hid'); sayA(false); $('#qa-s').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
      $('#qa-sa').onclick = () => sayA(false); $('#qa-ss').onclick = () => sayA(true);
      if ($('#qa-fbb')) $('#qa-fbb').onclick = () => openFeedback({ s: q.a, v: q.av, tk: q.at });
      $('#qa-next').onclick = next;
      recRow($('#qa-rec'), () => sayA(false), { maxMs: 60000 });
      SP().prefetch(q.a, 'B');
      if (can) {
        const mic = $('#qa-mic'); let busy = false;
        mic.onclick = async () => {
          if (busy) { SP().stopListening(); return; }
          busy = true; run++; const my = run, t0 = Date.now();
          mic.classList.add('rec'); mic.textContent = 'Dừng'; $('#qa-ml').textContent = 'Đang nghe… nói xong bấm Dừng'; $('#qa-hd').textContent = ''; $('#qa-fb').innerHTML = '';
          const r = await SP().listen(ZH ? q.at : q.a, { continuous: true, maxMs: 60000, onInterim: t => { if ($('#qa-hd')) $('#qa-hd').textContent = '“' + t + '”'; } });
          busy = false; if (my !== run || !$('#qa-mic')) return;
          mic.classList.remove('rec'); mic.textContent = 'Trả lời lại';
          if (r.error) { $('#qa-ml').textContent = r.error === 'no-speech' ? 'Chưa nghe thấy gì, bấm Trả lời và nói to hơn nhé.' : r.error === 'not-allowed' ? 'Hãy cho phép dùng micro.' : 'Có lỗi micro, thử lại nhé.'; return; }
          const text = r.heard || '', secs = Math.round((Date.now() - t0) / 1000);
          const n = ZH ? (text.match(/[一-鿿]/g) || []).length : text.split(/\s+/).filter(Boolean).length;
          const unit = ZH ? 'chữ' : 'từ', few = ZH ? 8 : 6, ok = ZH ? 20 : 15;
          $('#qa-hd').textContent = 'Máy nghe được: “' + text + '”';
          $('#qa-ml').textContent = 'Bấm Trả lời lại để thử cách nói khác';
          const tip = n < few ? 'Thử nói dài hơn: thêm một lý do ("vì…") hoặc một ví dụ.' : n < ok ? 'Tốt! Thêm một câu nữa để câu trả lời đầy đủ và tự nhiên hơn.' : 'Rất tốt! Câu trả lời khá đầy đủ. Giờ so với câu mẫu để học thêm cách diễn đạt.';
          $('#qa-fb').innerHTML = '<div class="qa-stat"><b>' + n + '</b> ' + unit + ' · ' + secs + ' giây</div><div class="qa-tip">' + tip + '</div>';
          ST().cfg('qa_n', (ST().cfg('qa_n') || 0) + 1); ST().touch(2); UI().refreshTop(); UI().beep(true);
        };
      }
      setTimeout(() => { if (cur === q) sayQ(); }, 250);
    }
    next();
    return () => { run++; };
  }

  // ================= 4. MẪU CÂU =================
  let GIDX = null;
  const textOf = d => d[1];
  function gIndex() {
    if (GIDX) return GIDX;
    const G = window.SE_GRAMMAR || [], intro = {}, byLesson = {}, ex = {};
    lessonsAll().forEach(l => {
      const hits = G.filter(g => l.d.some(d => g.re.test(textOf(d))));
      const mine = [];
      hits.forEach(g => { if (!intro[g.id] && mine.length < 3) { intro[g.id] = l; mine.push(g); } });
      byLesson[l.id] = { intro: mine, all: hits };
    });
    // Ví dụ cho trang tổng hợp: câu đầu tiên khớp trong bài giới thiệu, hoặc trong Shadowing
    G.forEach(g => {
      const l = intro[g.id];
      const d = l && l.d.find(x => g.re.test(textOf(x)));
      if (d) ex[g.id] = { t: d[1], vi: d[2], tk: d[3] };
      else for (const x of (window.SE_SHADOW || [])) { const r = x.s.find(y => g.re.test(y[0])); if (r) { ex[g.id] = { t: r[0], vi: r[1], tk: ZH ? r[2] : null, sh: x }; break; } }
    });
    GIDX = { intro, byLesson, ex };
    return GIDX;
  }
  function gCard(g, exs) {
    return '<div class="gr-card"><div class="gr-t">' + esc(g.t) + '</div><div class="gr-f">' + esc(g.f) + '</div><p class="gr-n">' + esc(g.n) + '</p>' +
      exs.map(e => '<button class="gr-ex" data-t="' + esc(e.t) + '" data-w="' + (e.who || 'A') + '"><span class="gr-ex-t">' + sent(e.t, e.tk) + '</span><small>' + esc(e.vi) + '</small></button>').join('') + '</div>';
  }
  function bindEx(root) { $$('.gr-ex', root).forEach(b => b.onclick = () => SP().speak(b.dataset.t, { who: b.dataset.w })); }
  // Hộp "Mẫu câu trong bài" cho bước 1
  function lessonNotes(l) {
    const ix = gIndex().byLesson[l.id]; if (!ix) return '';
    let list = ix.intro.map(g => [g, false]);
    if (!list.length) list = ix.all.slice(-2).reverse().map(g => [g, true]);   // không có mẫu mới → ôn 2 mẫu khó nhất
    if (!list.length) return '';
    return '<details class="gr-box" open><summary>Mẫu câu trong bài <span class="muted">(' + list.length + ')</span></summary>' +
      list.map(([g, old]) => {
        const exs = l.d.filter(d => g.re.test(textOf(d))).slice(0, 2).map(d => ({ t: d[1], vi: d[2], tk: d[3], who: d[0] }));
        return (old ? '<div class="gr-old">Ôn lại</div>' : '') + gCard(g, exs);
      }).join('') + '<a class="linkb gr-all" href="#/grammar">Xem tất cả mẫu câu →</a></details>';
  }
  function viewGrammar(app) {
    const G = window.SE_GRAMMAR || [], ix = gIndex();
    const groups = levels().map(L => ({ L, gs: G.filter(g => ix.intro[g.id] && ix.intro[g.id].level === L) }));
    const rest = G.filter(g => !ix.intro[g.id] && ix.ex[g.id]);
    app.innerHTML = '<a class="back" href="#/">← Trang chủ</a><section class="card panel pop"><div class="panel-h"><h2>Mẫu câu</h2><p>' + G.length + ' cấu trúc hay gặp, giải thích ngắn bằng tiếng Việt. Mỗi mẫu có câu ví dụ lấy từ chính bài học, chạm để nghe. Không cần học thuộc: hiểu ý rồi gặp lại trong bài là đủ.</p></div></section>' +
      groups.filter(x => x.gs.length).map(x => '<h2 class="sec"><span class="lvl-badge sm" style="background:' + x.L.color + '">' + x.L.name + '</span> ' + esc(x.L.title || '') + '</h2><div class="gr-grid">' +
        x.gs.map(g => { const l = ix.intro[g.id], e = ix.ex[g.id]; return '<div class="card gr-wrap">' + gCard(g, e ? [e] : []) + '<a class="linkb" href="#/lesson/' + l.id + '/1">Gặp lần đầu ở bài: ' + esc(l.t) + ' →</a></div>'; }).join('') + '</div>').join('') +
      (rest.length ? '<h2 class="sec">Nâng cao (gặp trong Shadowing)</h2><div class="gr-grid">' + rest.map(g => { const e = ix.ex[g.id]; return '<div class="card gr-wrap">' + gCard(g, [e]) + '<a class="linkb" href="#/shadow/' + e.sh.id + '">Đoạn: ' + esc(e.sh.t) + ' →</a></div>'; }).join('') + '</div>' : '');
    bindEx(app);
  }

  // Thẻ "Luyện thêm" trên trang chủ
  function homeCards() {
    return '<h2 class="sec">Luyện thêm</h2><div class="more-grid">' +
      '<a class="card more" href="#/listen"><b>Nghe liên tục</b><small>Phát cả danh sách, tắt màn hình vẫn nghe</small></a>' +
      '<a class="card more" href="#/qa"><b>Hỏi – đáp phản xạ</b><small>Nghe câu hỏi, tự trả lời bằng giọng nói</small></a>' +
      '<a class="card more" href="#/grammar"><b>Mẫu câu</b><small>' + (window.SE_GRAMMAR || []).length + ' cấu trúc, ví dụ từ bài học</small></a></div>';
  }

  window.SEX = { recRow, decorate, openFeedback, fbChip, bindFbMode, viewFeedback, viewListen, viewQA, viewGrammar, lessonNotes, bindEx, homeCards, fbEnabled, closeSheet };
  window.addEventListener('hashchange', closeSheet);
})();
