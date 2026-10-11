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
  const mmss = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  // recRow(host, playModel, {maxMs}) — một nút "Ghi âm giọng bạn"; ghi xong: So sánh với mẫu · Nghe lại · Ghi lại
  function recRow(host, playModel, o) {
    o = o || {};
    if (!canRec() || !host) return;
    host.insertAdjacentHTML('beforeend', '<div class="rec"></div>');
    const box = host.lastElementChild;
    let url = null, mr = null, stream = null, tm = null, tick = null, secs = 0;
    const idle = msg => {
      box.className = 'rec';
      box.innerHTML = '<button class="rec-btn" data-a="rec"><i class="rec-dot"></i>Ghi âm giọng bạn</button>' + (msg ? '<span class="rec-msg">' + esc(msg) + '</span>' : '');
      $('[data-a=rec]', box).onclick = start;
    };
    const done = () => {
      box.className = 'rec done';
      box.innerHTML = '<span class="rec-len"><i class="rec-dot"></i>' + mmss(secs) + '</span><button class="rec-cmp" data-a="cmp">So sánh</button><button class="rec-sm" data-a="me">Nghe lại</button><button class="rec-sm" data-a="again">Ghi lại</button>';
      $('[data-a=cmp]', box).onclick = async e => { const b = e.currentTarget; b.classList.add('on'); b.textContent = 'Giọng mẫu…'; await playModel(); await wait(300); b.textContent = 'Giọng bạn…'; await playUrl(url); b.classList.remove('on'); b.textContent = 'So sánh'; };
      $('[data-a=me]', box).onclick = () => playUrl(url);
      $('[data-a=again]', box).onclick = start;
    };
    const stopRec = () => { clearTimeout(tm); clearInterval(tick); try { mr && mr.state !== 'inactive' && mr.stop(); } catch (e) { } };
    async function start() {
      if (recStop) recStop();
      SP().stop(); SP().stopListening();
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
      catch (e) { idle('Hãy cho phép dùng micro để ghi âm.'); return; }
      const mime = pickMime(), chunks = [];
      try { mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); } catch (e) { mr = new MediaRecorder(stream); }
      mr.ondataavailable = e => e.data && e.data.size && chunks.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        recStop = null;
        if (!chunks.length) return idle('Chưa ghi được, thử lại nhé.');
        if (url) URL.revokeObjectURL(url);
        url = URL.createObjectURL(new Blob(chunks, { type: mr.mimeType || mime || 'audio/webm' })); urls.push(url);
        done();
      };
      mr.start();
      recStop = stopRec; secs = 0;
      box.className = 'rec on';
      box.innerHTML = '<button class="rec-btn" data-a="stop"><i class="rec-dot"></i>Đang ghi <b>0:00</b> · bấm để dừng</button>';
      $('[data-a=stop]', box).onclick = stopRec;
      tick = setInterval(() => { secs++; const t = $('b', box); if (t) t.textContent = mmss(secs); }, 1000);
      tm = setTimeout(stopRec, o.maxMs || 20000);
    }
    idle();
  }
  window.addEventListener('hashchange', () => { if (recStop) recStop(); try { myAudio && myAudio.pause(); } catch (e) { } while (urls.length > 4) URL.revokeObjectURL(urls.shift()); });

  // Gắn vào ô luyện nói (speakBox): nút ghi âm để so
  function decorate(say, o) {
    if (!say) return;
    const model = () => o.onListen ? o.onListen(false) : SP().speak(o.en, { who: o.who });
    recRow(say, model, { maxMs: o.long ? 150000 : 20000 });
  }

  // ================= 5. GÓP Ý DẠNG BÌNH LUẬN (cuối mỗi bài / đoạn) =================
  // Lưu ở feedback/<en|zh>/<mã bài>/<mã bình luận>: {uid, name, kind, msg, n (số câu, -1 = cả bài), s (câu), v, t (tên bài), at}
  const fbEnabled = () => !!(CL() && CL().enabled());
  const KINDS = ZH
    ? [['text', 'Câu tiếng Trung sai / không tự nhiên'], ['py', 'Pinyin sai'], ['vi', 'Dịch nghĩa chưa đúng'], ['audio', 'Giọng AI đọc sai'], ['other', 'Ý kiến khác']]
    : [['text', 'Câu tiếng Anh sai / không tự nhiên'], ['vi', 'Dịch nghĩa chưa đúng'], ['audio', 'Giọng AI đọc sai'], ['other', 'Ý kiến khác']];
  const kindName = k => (KINDS.find(x => x[0] === k) || [k, 'Ý kiến khác'])[1];
  const when = t => {
    if (!t) return '';
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'vừa xong'; if (m < 60) return m + ' phút trước'; if (m < 1440) return Math.round(m / 60) + ' giờ trước'; if (m < 10080) return Math.round(m / 1440) + ' ngày trước';
    return new Date(t).toLocaleDateString('vi-VN');
  };
  const avatar = n => '<span class="cmt-av">' + esc((n || '?').trim().charAt(0).toUpperCase()) + '</span>';
  function cmtItem(id, c, mine) {
    return '<div class="cmt-i" data-id="' + esc(id) + '">' + avatar(c.name) + '<div class="cmt-b"><div class="cmt-h"><b>' + esc(c.name || 'Người học') + '</b><small>' + when(c.at) + '</small></div>' +
      '<div class="cmt-tags"><span class="cmt-k">' + esc(kindName(c.kind)) + '</span>' + (c.n >= 0 ? '<span class="cmt-n">Câu ' + (c.n + 1) + '</span>' : '') + '</div>' +
      (c.s ? '<div class="cmt-q">' + esc(c.s) + '</div>' : '') +
      '<p>' + esc(c.msg) + '</p>' + (mine ? '<button class="linkb cmt-del">Xoá</button>' : '') + '</div></div>';
  }
  // comments(host, {key, title, lines: [{t, v}]})
  async function comments(host, it) {
    if (!host || !fbEnabled()) return;
    const u = CL().user();
    host.innerHTML = '<section class="cmt"><div class="cmt-top"><h3>Góp ý <span class="muted" id="cmt-n"></span></h3><p class="muted">Thấy câu sai, dịch chưa đúng hay giọng AI đọc sai? Bình luận để cùng sửa.</p></div>' +
      '<div class="cmt-list" id="cmt-list"><p class="muted cmt-empty">Đang tải…</p></div>' +
      (u ? '<div class="cmt-form">' + avatar(u.name || u.email) + '<div class="cmt-fb"><textarea id="cmt-m" maxlength="500" rows="2" placeholder="Viết góp ý…"></textarea>' +
          '<div class="cmt-ctl"><select class="sel" id="cmt-s"><option value="-1">Cả bài</option>' + it.lines.map((l, i) => '<option value="' + i + '">Câu ' + (i + 1) + ': ' + esc(l.t.length > 38 ? l.t.slice(0, 36) + '…' : l.t) + '</option>').join('') + '</select>' +
          '<select class="sel" id="cmt-k">' + KINDS.map(k => '<option value="' + k[0] + '">' + k[1] + '</option>').join('') + '</select>' +
          '<button class="btn small primary" id="cmt-send">Gửi</button></div><div class="muted cmt-msg" id="cmt-msg"></div></div></div>'
        : '<div class="cmt-login"><a class="btn small" href="#/account">Đăng nhập để bình luận</a></div>') + '</section>';
    const db = await CL().db();
    const list = () => $('#cmt-list', host);
    if (!db) { if (list()) list().innerHTML = '<p class="muted cmt-empty">Chưa kết nối được máy chủ góp ý.</p>'; return; }
    const ref = db.ref('feedback/' + SITE + '/' + it.key);
    const load = async () => {
      try {
        const v = (await ref.once('value')).val() || {};
        const arr = Object.entries(v).sort((a, b) => (a[1].at || 0) - (b[1].at || 0));
        if (!list()) return;
        $('#cmt-n', host).textContent = arr.length ? '(' + arr.length + ')' : '';
        list().innerHTML = arr.length ? arr.map(([id, c]) => cmtItem(id, c, u && c.uid === u.uid)).join('') : '<p class="muted cmt-empty">Chưa có góp ý nào. Hãy là người đầu tiên!</p>';
        $$('.cmt-del', list()).forEach(b => b.onclick = async () => { if (!confirm('Xoá góp ý này?')) return; await ref.child(b.closest('.cmt-i').dataset.id).remove(); load(); });
      } catch (e) { if (list()) list().innerHTML = '<p class="muted cmt-empty">Không tải được góp ý (' + esc(e.code || e.message) + ').</p>'; }
    };
    load();
    if (!u) return;
    $('#cmt-send', host).onclick = async () => {
      const msg = $('#cmt-m', host).value.trim(), n = +$('#cmt-s', host).value, line = it.lines[n];
      if (!msg) { $('#cmt-msg', host).textContent = 'Hãy viết nội dung góp ý.'; return; }
      $('#cmt-send', host).disabled = true; $('#cmt-msg', host).textContent = 'Đang gửi…';
      try {
        await ref.push({ uid: u.uid, name: (u.name || (u.email || '').split('@')[0] || 'Người học').slice(0, 40), kind: $('#cmt-k', host).value, msg: msg.slice(0, 500), n, s: line ? String(line.t).slice(0, 400) : '', v: line ? String(line.v || '').slice(0, 400) : '', t: String(it.title || '').slice(0, 100), at: CL().ts() });
        $('#cmt-m', host).value = ''; $('#cmt-msg', host).textContent = ''; UI().toast('Đã gửi góp ý, cảm ơn bạn!');
        load();
      } catch (e) { $('#cmt-msg', host).textContent = 'Chưa gửi được: ' + (e.code === 'PERMISSION_DENIED' ? 'máy chủ chưa mở quyền góp ý.' : (e.message || 'lỗi')); }
      $('#cmt-send', host).disabled = false;
    };
  }
  // Trang tổng hợp góp ý
  async function viewFeedback(app) {
    app.innerHTML = '<a class="back" href="#/settings">← Cài đặt</a><section class="card panel pop"><div class="panel-h"><h2>Góp ý của người học</h2><p>Các góp ý mới nhất ở cuối mỗi bài hội thoại và đoạn Shadowing. Chạm vào góp ý để mở bài đó.</p></div></section><div id="fba"><p class="muted">Đang tải…</p></div>';
    if (!fbEnabled()) { $('#fba').innerHTML = '<p class="muted">Trang này chưa bật đăng nhập nên chưa dùng được góp ý.</p>'; return; }
    const db = await CL().db(); if (!db) { if ($('#fba')) $('#fba').innerHTML = '<p class="muted">Chưa kết nối được máy chủ.</p>'; return; }
    try {
      const v = (await db.ref('feedback/' + SITE).once('value')).val() || {};
      const all = [];
      for (const k in v) for (const id in v[k]) if (v[k][id] && v[k][id].msg) all.push(Object.assign({ k, id }, v[k][id]));
      all.sort((a, b) => (b.at || 0) - (a.at || 0));
      const el = $('#fba'); if (!el) return;
      const href = k => /^sh-/.test(k) ? '#/shadow/' + k : '#/lesson/' + k + '/1';
      el.innerHTML = all.length ? '<div class="cmt cmt-all">' + all.slice(0, 200).map(c => '<a class="cmt-link" href="' + href(c.k) + '"><span class="cmt-where">' + esc(c.t || c.k) + '</span>' + cmtItem(c.id, c, false) + '</a>').join('') + '</div>' : '<p class="muted">Chưa có góp ý nào.</p>';
    } catch (e) { if ($('#fba')) $('#fba').innerHTML = '<p class="muted">Không tải được (' + esc(e.code || e.message) + '). Hãy kiểm tra luật Realtime Database.</p>'; }
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
        '<div class="qa-sample" id="qa-s" hidden><div class="lbl">CÂU TRẢ LỜI MẪU</div><div class="qa-a">' + sent(q.a, q.at) + '</div><div class="muted">' + esc(q.av) + '</div><div class="row center"><button class="btn small" id="qa-sa">Nghe câu mẫu</button><button class="btn small" id="qa-ss">Nghe chậm</button>' + '</div></div>' +
        '<div class="next-bar"><button class="btn" id="qa-show">Xem câu trả lời mẫu</button><button class="btn primary" id="qa-next">Câu khác →</button></div>';
      const sayQ = () => SP().speak(q.q, { who: 'A' });
      const sayA = slow => SP().speak(q.a, { who: 'B', slow });
      $('#qa-rep').onclick = sayQ;
      $('#qa-hq').onclick = e => { const h = !hideQ(); ST().cfg('qaHideQ', h); $('#qa-q').classList.toggle('hid', h); e.currentTarget.classList.toggle('on', !h); };
      $('#qa-q').onclick = () => { $('#qa-q').classList.remove('hid'); };
      $('#qa-show').onclick = () => { $('#qa-s').hidden = false; $('#qa-q').classList.remove('hid'); sayA(false); $('#qa-s').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); };
      $('#qa-sa').onclick = () => sayA(false); $('#qa-ss').onclick = () => sayA(true);
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
      '<a class="card more" href="#/qa"><b>Hỏi – đáp phản xạ</b><small>Nghe câu hỏi, tự trả lời bằng giọng nói</small></a>' +
      '<a class="card more" href="#/grammar"><b>Mẫu câu</b><small>' + (window.SE_GRAMMAR || []).length + ' cấu trúc, ví dụ từ bài học</small></a></div>';
  }

  window.SEX = { recRow, decorate, comments, viewFeedback, viewQA, viewGrammar, lessonNotes, bindEx, homeCards, fbEnabled };
})();
