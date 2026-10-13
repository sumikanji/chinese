/*! © 2026 Sumi — Ghi âm so sánh và góp ý dạng bình luận (dùng chung cho Sumi English và Sumi Chinese) */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const SP = () => window.SESpeech, ST = () => window.SEStore, UI = () => window.SEUI, CL = () => window.SECloud;
  const ZH = window.SE_LANG === 'zh';
  const IC = n => (window.SEI ? window.SEI(n) : '');

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
      box.innerHTML = '<button class="rec-btn" data-a="rec">' + IC('rec') + 'Ghi âm giọng bạn</button>' + (msg ? '<span class="rec-msg">' + esc(msg) + '</span>' : '');
      $('[data-a=rec]', box).onclick = start;
    };
    const done = () => {
      box.className = 'rec done';
      box.innerHTML = '<span class="rec-len"><i class="rec-dot"></i>' + mmss(secs) + '</span><button class="rec-cmp" data-a="cmp">' + IC('compare') + '<span>So sánh</span></button><button class="rec-sm" data-a="me">' + IC('play') + 'Nghe lại</button><button class="rec-sm" data-a="again">' + IC('redo') + 'Ghi lại</button>';
      $('[data-a=cmp]', box).onclick = async e => { const b = e.currentTarget; b.classList.add('on'); const sp = $('span', b); sp.textContent = 'Giọng mẫu…'; await playModel(); await wait(300); sp.textContent = 'Giọng bạn…'; await playUrl(url); b.classList.remove('on'); sp.textContent = 'So sánh'; };
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
      box.innerHTML = '<button class="rec-btn" data-a="stop">' + IC('stop') + 'Đang ghi <b>0:00</b> · bấm để dừng</button>';
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
  const avatar = (n, av) => window.SEAV && av && window.SEAV.svg(av) ? '<span class="cmt-av img">' + window.SEAV.svg(av) + '</span>' : '<span class="cmt-av">' + esc((n || '?').trim().charAt(0).toUpperCase()) + '</span>';
  function cmtItem(id, c, mine) {
    return '<div class="cmt-i" data-id="' + esc(id) + '">' + avatar(c.name, c.av) + '<div class="cmt-b"><div class="cmt-h"><b>' + esc(c.name || 'Người học') + '</b><small>' + when(c.at) + '</small></div>' +
      '<div class="cmt-tags"><span class="cmt-k">' + esc(kindName(c.kind)) + '</span>' + (c.n >= 0 ? '<span class="cmt-n">Câu ' + (c.n + 1) + '</span>' : '') + '</div>' +
      (c.s ? '<div class="cmt-q">' + esc(c.s) + '</div>' : '') +
      '<p>' + esc(c.msg) + '</p>' + (mine ? '<button class="linkb cmt-del">Xoá</button>' : '') + '</div></div>';
  }
  // Lỗi dễ hiểu: PERMISSION_DENIED nghĩa là chưa dán luật "feedback" vào Firebase → Realtime Database → Rules
  const errText = e => /PERMISSION|permission/.test((e && (e.code || e.message)) || '')
    ? 'Máy chủ chưa mở quyền góp ý. Chủ trang cần dán luật trong database.rules.json vào Firebase → Realtime Database → Rules rồi bấm Publish.'
    : 'Chưa kết nối được máy chủ góp ý (' + esc((e && (e.code || e.message)) || 'lỗi') + ').';
  // comments(host, {key, title, lines: [{t, v}]})
  async function comments(host, it) {
    if (!host || !fbEnabled()) return;
    const u = CL().user();
    host.innerHTML = '<section class="cmt"><div class="cmt-top"><h3>' + IC('chat') + 'Góp ý <span class="cmt-cnt" id="cmt-n"></span></h3></div>' +
      '<div class="cmt-list" id="cmt-list"><p class="muted cmt-empty">Đang tải…</p></div>' +
      (u ? '<div class="cmt-form">' + avatar(u.name || u.email, ST().cfg('avMe')) + '<div class="cmt-fb"><textarea id="cmt-m" maxlength="500" rows="2" placeholder="Góp ý…"></textarea>' +
          '<div class="cmt-ctl">' +
          '<button class="cmt-send" id="cmt-send">' + IC('send') + 'Gửi</button></div><div class="muted cmt-msg" id="cmt-msg"></div></div></div>'
        : '<div class="cmt-login"><a class="cmt-send" href="#/account">' + IC('user') + 'Đăng nhập để bình luận</a></div>') + '</section>';
    const db = await CL().db();
    const list = () => $('#cmt-list', host);
    if (!db) { if (list()) list().innerHTML = '<p class="muted cmt-empty">Chưa kết nối được máy chủ góp ý.</p>'; return; }
    const ref = db.ref('feedback/' + SITE + '/' + it.key);
    const load = async () => {
      try {
        const v = (await ref.once('value')).val() || {};
        const arr = Object.entries(v).sort((a, b) => (a[1].at || 0) - (b[1].at || 0));
        if (!list()) return;
        $('#cmt-n', host).textContent = arr.length ? arr.length : '';
        list().innerHTML = arr.length ? arr.map(([id, c]) => cmtItem(id, c, u && c.uid === u.uid)).join('') : '';
        $$('.cmt-del', list()).forEach(b => b.onclick = async () => { if (!confirm('Xoá góp ý này?')) return; await ref.child(b.closest('.cmt-i').dataset.id).remove(); load(); });
      } catch (e) { if (list()) list().innerHTML = '<p class="cmt-err">' + errText(e) + '</p>'; }
    };
    load();
    if (!u) return;
    $('#cmt-send', host).onclick = async () => {
      const msg = $('#cmt-m', host).value.trim(), n = -1, line = null;
      if (!msg) { $('#cmt-msg', host).textContent = 'Hãy viết nội dung góp ý.'; return; }
      $('#cmt-send', host).disabled = true; $('#cmt-msg', host).textContent = 'Đang gửi…';
      try {
        await ref.push({ uid: u.uid, name: (u.name || (u.email || '').split('@')[0] || 'Người học').slice(0, 40), kind: 'other', msg: msg.slice(0, 500), n, s: line ? String(line.t).slice(0, 400) : '', v: line ? String(line.v || '').slice(0, 400) : '', t: String(it.title || '').slice(0, 100), av: String(ST().cfg('avMe') || '').slice(0, 20), at: CL().ts() });
        $('#cmt-m', host).value = ''; $('#cmt-msg', host).textContent = ''; UI().toast('Đã gửi góp ý, cảm ơn bạn!');
        load();
      } catch (e) { $('#cmt-msg', host).innerHTML = errText(e); }
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


  window.SEX = { recRow, decorate, comments, viewFeedback, fbEnabled };
})();
