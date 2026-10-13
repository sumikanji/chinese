/*! © 2026 Sumi — Cộng đồng (hỏi đáp, chia sẻ học tập) và Góp ý (ý kiến cải thiện trang). Dùng chung cho Sumi English và Sumi Chinese. */
// Dữ liệu ở Firebase: boards/<en|zh>/<thread|ideas>/
//   posts/<pid>    {uid, name, av, cat, text, at}
//   likes/<pid>/<uid>: true
//   comments/<pid>/<cid> {uid, name, av, text, at}
//   reports/<pid>/<uid>: true   (≥ 3 báo cáo → bài tự ẩn)
// Quản trị viên: admins/<uid>: true (thêm bằng tay trong Firebase console)
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ST = () => window.SEStore, CL = () => window.SECloud, UI = () => window.SEUI;
  const IC = n => (window.SEI ? window.SEI(n) : '');
  const SITE = window.SE_LANG === 'zh' ? 'zh' : 'en';
  const LANG = SITE === 'zh' ? 'tiếng Trung' : 'tiếng Anh';
  const HIDE_AT = 3;
  const qs = {};
  // So khớp không dấu: "cam on" tìm được "cảm ơn"
  const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

  const BOARDS = {
    thread: {
      route: 'congdong', title: 'Cộng đồng', icon: 'users',
      sub: 'Hỏi đáp, chia sẻ cách học và tài liệu ' + LANG + ' cùng mọi người.',
      rule: 'Chỉ đăng nội dung về học tập. Bài quảng cáo, chuyện ngoài lề hoặc lời lẽ không hay sẽ bị ẩn và xoá.',
      ph: 'Hỏi hoặc chia sẻ về việc học…',
      cats: [['hoi', 'Hỏi đáp'], ['chiase', 'Chia sẻ'], ['meo', 'Mẹo học'], ['luyen', 'Luyện viết']],
      like: 'Thích', likeIc: 'heart', sortable: false, rep: 'Báo cáo bài không liên quan học tập'
    },
    ideas: {
      route: 'gopy', title: 'Góp ý', icon: 'bulb',
      sub: 'Trang cần cải thiện gì, nên thêm tính năng gì? Viết ý kiến ở đây, mọi người cùng bình luận và bình chọn.',
      rule: '',
      ph: 'Góp ý cho Sumi…',
      cats: [['caithien', 'Cải thiện'], ['tinhnang', 'Tính năng mới'], ['loi', 'Báo lỗi'], ['khac', 'Khác']],
      like: 'Đồng ý', likeIc: 'thumb', sortable: true, rep: 'Báo cáo nội dung không phù hợp'
    }
  };

  const when = t => {
    if (!t) return '';
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'vừa xong'; if (m < 60) return m + ' phút'; if (m < 1440) return Math.round(m / 60) + ' giờ'; if (m < 10080) return Math.round(m / 1440) + ' ngày';
    return new Date(t).toLocaleDateString('vi-VN');
  };
  const avatar = (n, av, cls) => (window.SEAV && av && window.SEAV.svg(av))
    ? '<span class="cm-av img ' + (cls || '') + '">' + window.SEAV.svg(av) + '</span>'
    : '<span class="cm-av ' + (cls || '') + '">' + esc((n || '?').trim().charAt(0).toUpperCase()) + '</span>';
  const nameOf = u => (u.name || (u.email || '').split('@')[0] || 'Người học').slice(0, 40);
  const fmtText = t => esc(t).replace(/\n{3,}/g, '\n\n').replace(/\n/g, '<br>');
  const errText = e => /PERMISSION|permission/.test((e && (e.code || e.message)) || '')
    ? 'Máy chủ chưa mở quyền. Chủ trang cần dán luật trong database.rules.json vào Firebase → Realtime Database → Rules rồi bấm Publish.'
    : 'Chưa kết nối được máy chủ (' + esc((e && (e.code || e.message)) || 'lỗi') + ').';
  const toast = t => UI() && UI().toast ? UI().toast(t) : alert(t);


  async function view(app, board, pid) {
    const B = BOARDS[board];
    const on = !!(CL() && CL().enabled());
    app.innerHTML = '<div class="cm' + (pid ? ' detail' : '') + '">' +
      (pid ? '<a class="cm-back" href="#/' + B.route + '" aria-label="Quay lại">' + IC('chevL') + '</a>' : '') +
      '<div id="cm-body"><div class="cm-load">Đang tải…</div></div></div>';
    const body = $('#cm-body');
    if (!on) { body.innerHTML = '<p class="muted cm-empty">Chưa bật đăng nhập.</p>'; return; }
    const db = await CL().db();
    if (!db) { body.innerHTML = '<p class="muted cm-empty">Chưa kết nối được máy chủ.</p>'; return; }
    const root = db.ref('boards/' + SITE + '/' + board);
    const u = CL().user();
    let admin = false;
    if (u) { try { admin = !!(await db.ref('admins/' + u.uid).once('value')).val(); } catch (e) { } }
    const cur = () => $('#cm-body') === body;

    async function loadAll() {
      const [p, l, c, r] = await Promise.all(['posts', 'likes', 'comments', 'reports'].map(k =>
        (k === 'posts' ? root.child(k).orderByKey().limitToLast(150) : root.child(k)).once('value').then(s => s.val() || {})));
      return { posts: p, likes: l, comments: c, reports: r };
    }
    const hidden = (D, id, p) => Object.keys(D.reports[id] || {}).length >= HIDE_AT && !admin && !(u && p.uid === u.uid);

    function postHtml(D, id, p, full) {
      const lk = D.likes[id] || {}, nl = Object.keys(lk).length, mine = !!(u && lk[u.uid]);
      const nc = Object.keys(D.comments[id] || {}).length;
      const own = u && p.uid === u.uid;
      return '<article class="cm-post' + (full ? ' full' : '') + '" data-id="' + esc(id) + '">' +
        avatar(p.name, p.av) +
        '<div class="cm-pb">' +
          '<div class="cm-ph"><b>' + esc(p.name || 'Người học') + '</b><span class="cm-time">' + when(p.at) + '</span>' +
            '<button class="cm-more" aria-label="Thêm">' + IC('more') + '</button></div>' +
          '<div class="cm-text">' + fmtText(p.text) + '</div>' +
          '<div class="cm-act">' +
            '<button class="cm-like' + (mine ? ' on' : '') + '" aria-label="' + B.like + '">' + IC(B.likeIc) + '<span>' + (nl || '') + '</span></button>' +
            (full ? '<span class="cm-cc">' + IC('chat') + '<span>' + (nc || '') + '</span></span>' : '<a class="cm-cmt" href="#/' + B.route + '/' + esc(id) + '" aria-label="Bình luận">' + IC('chat') + '<span>' + (nc || '') + '</span></a>') +
          '</div>' +
          '<div class="cm-menu" hidden>' + (own || admin ? '<button data-a="del">' + IC('trash') + 'Xoá</button>' : '') + (u && !own ? '<button data-a="rep">' + IC('flag') + 'Báo cáo</button>' : '') + (!u ? '<span class="muted">Đăng nhập để báo cáo</span>' : '') + '</div>' +
        '</div></article>';
    }

    // Ô nhập kiểu ứng dụng AI: gõ chữ và gửi
    function inputBar(ph) {
      return '<div class="cm-input' + (u ? '' : ' off') + '"><textarea id="cm-in" rows="1" maxlength="' + (pid ? 500 : 1000) + '" placeholder="' + esc(u ? ph : 'Đăng nhập để viết…') + '"' + (u ? '' : ' readonly') + '></textarea>' +
        '<button class="cm-send" id="cm-go" aria-label="Gửi"' + (u ? ' disabled' : '') + '>' + IC(u ? 'send' : 'user') + '</button></div>';
    }
    function bindInput(send) {
      const ta = $('#cm-in', body), go = $('#cm-go', body);
      if (!ta) return;
      if (!u) { ta.onclick = go.onclick = () => { location.hash = '#/account'; }; return; }
      const fit = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'; go.disabled = !ta.value.trim(); };
      ta.oninput = fit;
      const fire = async () => {
        const text = ta.value.trim(); if (!text || go.disabled) return;
        go.disabled = true;
        try { await send(text); ta.value = ''; fit(); render(); }
        catch (e) { toast(errText(e).replace(/<[^>]+>/g, '')); go.disabled = false; }
      };
      go.onclick = fire;
      ta.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) { e.preventDefault(); fire(); } };
    }

    async function render() {
      let D;
      try { D = await loadAll(); } catch (e) { if (cur()) body.innerHTML = '<p class="cm-err">' + errText(e) + '</p>'; return; }
      if (!cur()) return;
      if (pid) return renderPost(D);
      const ids = Object.keys(D.posts).filter(id => D.posts[id] && D.posts[id].text && !hidden(D, id, D.posts[id]))
        .sort((a, b) => (D.posts[b].at || 0) - (D.posts[a].at || 0));
      const q0 = qs[board] || '';
      body.innerHTML = '<div class="cm-search">' + IC('search') + '<input id="cm-q" type="search" placeholder="Tìm kiếm" value="' + esc(q0) + '" autocomplete="off"></div>' +
        '<div class="cm-feed" id="cm-feed"></div>' + inputBar(B.ph);
      const feed = $('#cm-feed', body);
      const drawFeed = q => {
        const k = norm(q);
        const list = k ? ids.filter(id => norm(D.posts[id].text + ' ' + (D.posts[id].name || '')).includes(k)) : ids;
        feed.innerHTML = list.length ? list.map(id => postHtml(D, id, D.posts[id], false)).join('') : (k ? '<p class="muted cm-empty">Không tìm thấy</p>' : '<div class="cm-hello">' + IC(B.icon) + '</div>');
        $$('.cm-post', feed).forEach(el => { el.querySelector('.cm-text').onclick = () => { location.hash = '#/' + B.route + '/' + el.dataset.id; }; });
        bindPosts(D);
      };
      $('#cm-q', body).oninput = e => { qs[board] = e.target.value; drawFeed(e.target.value); };
      drawFeed(q0);
      bindInput(text => root.child('posts').push({ uid: u.uid, name: nameOf(u), av: String(ST().cfg('avMe') || '').slice(0, 20), cat: B.cats[0][0], text: text.slice(0, 1000), at: CL().ts() }));
    }

    function bindPosts(D) {
      $$('.cm-post', body).forEach(el => {
        const id = el.dataset.id;
        el.querySelector('.cm-like').onclick = async e => {
          e.stopPropagation();
          if (!u) { location.hash = '#/account'; return; }
          const ref = root.child('likes/' + id + '/' + u.uid), on = !!(D.likes[id] || {})[u.uid];
          const b = e.currentTarget, n = b.querySelector('span');
          b.classList.toggle('on', !on); b.classList.add('bump'); setTimeout(() => b.classList.remove('bump'), 300);
          const cnt = Object.keys(D.likes[id] || {}).length + (on ? -1 : 1); n.textContent = cnt || '';
          D.likes[id] = D.likes[id] || {}; if (on) delete D.likes[id][u.uid]; else D.likes[id][u.uid] = true;
          try { on ? await ref.remove() : await ref.set(true); } catch (er) { toast(errText(er).replace(/<[^>]+>/g, '')); }
        };
        const menu = el.querySelector('.cm-menu');
        el.querySelector('.cm-more').onclick = e => { e.stopPropagation(); $$('.cm-menu', body).forEach(m => { if (m !== menu) m.hidden = true; }); menu.hidden = !menu.hidden; };
        $$('[data-a]', menu).forEach(b => b.onclick = async () => {
          menu.hidden = true;
          try {
            if (b.dataset.a === 'del') {
              if (!confirm('Xoá bài này?')) return;
              await root.child('posts/' + id).remove();
              toast('Đã xoá');
              if (pid) location.hash = '#/' + B.route; else render();
            } else {
              if (!confirm(B.rep + '?')) return;
              await root.child('reports/' + id + '/' + u.uid).set(true);
              toast('Đã báo cáo, cảm ơn bạn!');
            }
          } catch (er) { toast(errText(er).replace(/<[^>]+>/g, '')); }
        });
      });
    }

    function renderPost(D) {
      const p = D.posts[pid];
      if (!p || hidden(D, pid, p)) { body.innerHTML = '<p class="muted cm-empty">Bài viết không còn nữa.</p>'; return; }
      const cs = Object.entries(D.comments[pid] || {}).filter(([, c]) => c && c.text).sort((a, b) => (a[1].at || 0) - (b[1].at || 0));
      body.innerHTML = postHtml(D, pid, p, true) +
        '<div class="cm-cmts">' + cs.map(([cid, c]) => '<div class="cm-c" data-cid="' + esc(cid) + '">' + avatar(c.name, c.av, 'sm') +
          '<div class="cm-cbub"><div class="cm-ch"><b>' + esc(c.name || 'Người học') + '</b><span class="cm-time">' + when(c.at) + '</span>' +
          ((u && c.uid === u.uid) || admin ? '<button class="cm-cdel">Xoá</button>' : '') + '</div><div class="cm-ctext">' + fmtText(c.text) + '</div></div></div>').join('') + '</div>' +
        inputBar('Bình luận…');
      bindPosts(D);
      $$('.cm-cdel', body).forEach(b => b.onclick = async () => {
        if (!confirm('Xoá bình luận này?')) return;
        try { await root.child('comments/' + pid + '/' + b.closest('.cm-c').dataset.cid).remove(); render(); } catch (e) { toast(errText(e).replace(/<[^>]+>/g, '')); }
      });
      bindInput(text => root.child('comments/' + pid).push({ uid: u.uid, name: nameOf(u), av: String(ST().cfg('avMe') || '').slice(0, 20), text: text.slice(0, 500), at: CL().ts() }));
    }

    document.addEventListener('click', e => { if (!e.target.closest('.cm-more,.cm-menu')) $$('.cm-menu', body).forEach(m => { m.hidden = true; }); });
    render();
  }

  // Bài đã thích (hiện ở trang cá nhân)
  async function liked(host) {
    if (!host || !(CL() && CL().enabled())) return;
    const u = CL().user(); if (!u) { host.innerHTML = ''; return; }
    host.innerHTML = '<p class="muted cm-empty sm">Đang tải…</p>';
    try {
      const db = await CL().db(); if (!db) { host.innerHTML = ''; return; }
      const out = [];
      for (const bd of Object.keys(BOARDS)) {
        const root = db.ref('boards/' + SITE + '/' + bd);
        const [likes, posts] = await Promise.all([root.child('likes').once('value').then(x => x.val() || {}), root.child('posts').orderByKey().limitToLast(300).once('value').then(x => x.val() || {})]);
        for (const id in likes) if (likes[id] && likes[id][u.uid] && posts[id] && posts[id].text) out.push(Object.assign({ id, bd }, posts[id]));
      }
      out.sort((a, b) => (b.at || 0) - (a.at || 0));
      host.innerHTML = out.length ? out.map(p => '<a class="cm-lk" href="#/' + BOARDS[p.bd].route + '/' + esc(p.id) + '">' + avatar(p.name, p.av, 'sm') +
        '<span><b>' + esc(p.name || 'Người học') + '</b><small>' + when(p.at) + ' · ' + BOARDS[p.bd].title + '</small><em>' + esc(p.text.length > 140 ? p.text.slice(0, 138) + '…' : p.text) + '</em></span></a>').join('')
        : '<p class="muted cm-empty sm">Chưa thích bài nào.</p>';
    } catch (e) { host.innerHTML = '<p class="muted cm-empty sm">' + errText(e) + '</p>'; }
  }

  window.SECOM = { view, liked, BOARDS };
})();
