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

  const BOARDS = {
    thread: {
      route: 'congdong', title: 'Cộng đồng', icon: 'users',
      sub: 'Hỏi đáp, chia sẻ cách học và tài liệu ' + LANG + ' cùng mọi người.',
      rule: 'Chỉ đăng nội dung về học tập. Bài quảng cáo, chuyện ngoài lề hoặc lời lẽ không hay sẽ bị ẩn và xoá.',
      ph: 'Bạn muốn hỏi hay chia sẻ gì về việc học ' + LANG + '?',
      cats: [['hoi', 'Hỏi đáp'], ['chiase', 'Chia sẻ'], ['meo', 'Mẹo học'], ['luyen', 'Luyện viết']],
      like: 'Thích', likeIc: 'heart', sortable: false, rep: 'Báo cáo: không liên quan học tập'
    },
    ideas: {
      route: 'gopy', title: 'Góp ý', icon: 'bulb',
      sub: 'Trang cần cải thiện gì, nên thêm tính năng gì? Viết ý kiến ở đây, mọi người cùng bình luận và bình chọn.',
      rule: '',
      ph: 'Bạn muốn Sumi cải thiện hoặc thêm gì?',
      cats: [['caithien', 'Cải thiện'], ['tinhnang', 'Tính năng mới'], ['loi', 'Báo lỗi'], ['khac', 'Khác']],
      like: 'Đồng ý', likeIc: 'thumb', sortable: true, rep: 'Báo cáo: nội dung không phù hợp'
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

  // Trạng thái lọc giữ trong phiên
  const filt = { thread: { cat: 'all', sort: 'new' }, ideas: { cat: 'all', sort: 'new' } };

  async function view(app, board, pid) {
    const B = BOARDS[board];
    const on = !!(CL() && CL().enabled());
    app.innerHTML = '<div class="cm">' +
      (pid ? '<a class="back" href="#/' + B.route + '">← ' + B.title + '</a>' :
        '<div class="cm-head"><span class="cm-hic">' + IC(B.icon) + '</span><div><h1>' + B.title + '</h1><p>' + esc(B.sub) + '</p></div></div>') +
      '<div id="cm-body"><div class="cm-load">Đang tải…</div></div></div>';
    const body = $('#cm-body');
    if (!on) { body.innerHTML = '<p class="muted cm-empty">Trang này chưa bật đăng nhập nên chưa dùng được ' + B.title.toLowerCase() + '.</p>'; return; }
    const db = await CL().db();
    if (!db) { body.innerHTML = '<p class="muted cm-empty">Chưa kết nối được máy chủ. Kiểm tra mạng rồi thử lại.</p>'; return; }
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
    const catName = k => (B.cats.find(c => c[0] === k) || [k, ''])[1];

    function postHtml(D, id, p, full) {
      const lk = D.likes[id] || {}, nl = Object.keys(lk).length, mine = !!(u && lk[u.uid]);
      const nc = Object.keys(D.comments[id] || {}).length;
      const nr = Object.keys(D.reports[id] || {}).length;
      const own = u && p.uid === u.uid;
      return '<article class="cm-post' + (full ? ' full' : '') + '" data-id="' + esc(id) + '">' +
        avatar(p.name, p.av) +
        '<div class="cm-pb">' +
          '<div class="cm-ph"><b>' + esc(p.name || 'Người học') + '</b><span class="cm-time">' + when(p.at) + '</span>' + (p.cat ? '<span class="cm-cat">' + esc(catName(p.cat)) + '</span>' : '') +
            '<button class="cm-more" aria-label="Thêm">' + IC('more') + '</button></div>' +
          (nr >= HIDE_AT ? '<div class="cm-flag">Bài đang bị ẩn vì có ' + nr + ' báo cáo</div>' : '') +
          '<div class="cm-text">' + fmtText(p.text) + '</div>' +
          '<div class="cm-act">' +
            '<button class="cm-like' + (mine ? ' on' : '') + '">' + IC(B.likeIc) + '<span>' + (nl || '') + '</span><em>' + B.like + '</em></button>' +
            (full ? '<span class="cm-cc">' + IC('chat') + '<span>' + (nc ? nc + ' bình luận' : 'Bình luận') + '</span></span>' : '<a class="cm-cmt" href="#/' + B.route + '/' + esc(id) + '">' + IC('chat') + '<span>' + (nc || '') + '</span><em>Bình luận</em></a>') +
          '</div>' +
          '<div class="cm-menu" hidden>' + (own || admin ? '<button data-a="del">' + IC('trash') + 'Xoá bài</button>' : '') + (u && !own ? '<button data-a="rep">' + IC('flag') + B.rep + '</button>' : '') + (!u ? '<span class="muted">Đăng nhập để báo cáo</span>' : '') + '</div>' +
        '</div></article>';
    }

    function composer(kind) {
      if (!u) return '<div class="cm-login"><a class="btn primary" href="#/account">' + IC('user') + 'Đăng nhập để ' + (kind === 'c' ? 'bình luận' : 'đăng bài') + '</a></div>';
      if (kind === 'c') return '<div class="cm-cbox">' + avatar(nameOf(u), ST().cfg('avMe')) + '<textarea id="cm-ct" rows="1" maxlength="500" placeholder="Viết bình luận…"></textarea><button class="cm-send" id="cm-cs" aria-label="Gửi">' + IC('send') + '</button></div>';
      return '<div class="cm-comp" id="cm-comp">' + avatar(nameOf(u), ST().cfg('avMe')) +
        '<div class="cm-cb"><b>' + esc(nameOf(u)) + '</b><textarea id="cm-pt" rows="2" maxlength="1000" placeholder="' + esc(B.ph) + '"></textarea>' +
        '<div class="cm-cats" id="cm-pc">' + B.cats.map((c, i) => '<button class="cm-chip' + (i ? '' : ' on') + '" data-c="' + c[0] + '">' + c[1] + '</button>').join('') + '</div>' +
        '<div class="cm-cf"><small class="muted">' + esc(B.rule || 'Viết rõ ràng để mọi người dễ hiểu và bình chọn.') + '</small><button class="cm-pbtn" id="cm-pp">Đăng</button></div></div></div>';
    }

    async function render() {
      let D;
      try { D = await loadAll(); } catch (e) { if (cur()) body.innerHTML = '<p class="cm-err">' + errText(e) + '</p>'; return; }
      if (!cur()) return;
      if (pid) return renderPost(D);
      const F = filt[board];
      let ids = Object.keys(D.posts).filter(id => D.posts[id] && D.posts[id].text && !hidden(D, id, D.posts[id]));
      if (F.cat !== 'all') ids = ids.filter(id => D.posts[id].cat === F.cat);
      ids.sort((a, b) => F.sort === 'top'
        ? (Object.keys(D.likes[b] || {}).length - Object.keys(D.likes[a] || {}).length) || ((D.posts[b].at || 0) - (D.posts[a].at || 0))
        : (D.posts[b].at || 0) - (D.posts[a].at || 0));
      body.innerHTML = composer('p') +
        '<div class="cm-filter"><button class="cm-chip' + (F.cat === 'all' ? ' on' : '') + '" data-f="all">Tất cả</button>' + B.cats.map(c => '<button class="cm-chip' + (F.cat === c[0] ? ' on' : '') + '" data-f="' + c[0] + '">' + c[1] + '</button>').join('') +
          (B.sortable ? '<span class="cm-sort"><button class="' + (F.sort === 'new' ? 'on' : '') + '" data-s="new">Mới nhất</button><button class="' + (F.sort === 'top' ? 'on' : '') + '" data-s="top">Nhiều ' + B.like.toLowerCase() + '</button></span>' : '') + '</div>' +
        '<div class="cm-feed">' + (ids.length ? ids.map(id => postHtml(D, id, D.posts[id], false)).join('') : '<p class="muted cm-empty">' + (F.cat === 'all' ? 'Chưa có bài nào. Hãy là người đầu tiên!' : 'Chưa có bài nào trong mục này.') + '</p>') + '</div>';
      $$('.cm-filter [data-f]', body).forEach(b => b.onclick = () => { F.cat = b.dataset.f; render(); });
      $$('.cm-sort [data-s]', body).forEach(b => b.onclick = () => { F.sort = b.dataset.s; render(); });
      $$('.cm-post', body).forEach(el => {
        el.querySelector('.cm-text').onclick = () => { location.hash = '#/' + B.route + '/' + el.dataset.id; };
      });
      bindPosts(D);
      bindComposer();
    }

    function bindComposer() {
      const pp = $('#cm-pp', body); if (!pp) return;
      const ta = $('#cm-pt', body);
      ta.oninput = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 240) + 'px'; };
      $$('#cm-pc .cm-chip', body).forEach(b => b.onclick = () => $$('#cm-pc .cm-chip', body).forEach(x => x.classList.toggle('on', x === b)));
      pp.onclick = async () => {
        const text = ta.value.trim();
        if (text.length < 5) { toast('Hãy viết rõ hơn một chút nhé.'); ta.focus(); return; }
        const cat = ($('#cm-pc .cm-chip.on', body) || {}).dataset.c || B.cats[0][0];
        pp.disabled = true;
        try {
          await root.child('posts').push({ uid: u.uid, name: nameOf(u), av: String(ST().cfg('avMe') || '').slice(0, 20), cat, text: text.slice(0, 1000), at: CL().ts() });
          ta.value = ''; toast('Đã đăng bài!'); render();
        } catch (e) { toast(errText(e).replace(/<[^>]+>/g, '')); }
        pp.disabled = false;
      };
    }

    function bindPosts(D) {
      $$('.cm-post', body).forEach(el => {
        const id = el.dataset.id, p = D.posts[id];
        el.querySelector('.cm-like').onclick = async e => {
          e.stopPropagation();
          if (!u) { toast('Đăng nhập để ' + B.like.toLowerCase() + ' nhé.'); return; }
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
              toast('Đã xoá bài');
              if (pid) location.hash = '#/' + B.route; else render();
            } else {
              if (!confirm(B.rep + '?')) return;
              await root.child('reports/' + id + '/' + u.uid).set(true);
              toast('Cảm ơn bạn! Bài có từ ' + HIDE_AT + ' báo cáo sẽ tự ẩn.');
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
        '<div class="cm-cmts">' + (cs.length ? cs.map(([cid, c]) => '<div class="cm-c" data-cid="' + esc(cid) + '">' + avatar(c.name, c.av, 'sm') +
          '<div class="cm-cbub"><div class="cm-ch"><b>' + esc(c.name || 'Người học') + '</b><span class="cm-time">' + when(c.at) + '</span>' +
          ((u && c.uid === u.uid) || admin ? '<button class="cm-cdel">Xoá</button>' : '') + '</div><div class="cm-ctext">' + fmtText(c.text) + '</div></div></div>').join('')
          : '<p class="muted cm-empty sm">Chưa có bình luận. Hãy là người đầu tiên!</p>') + '</div>' +
        composer('c');
      bindPosts(D);
      $$('.cm-cdel', body).forEach(b => b.onclick = async () => {
        if (!confirm('Xoá bình luận này?')) return;
        try { await root.child('comments/' + pid + '/' + b.closest('.cm-c').dataset.cid).remove(); render(); } catch (e) { toast(errText(e).replace(/<[^>]+>/g, '')); }
      });
      const cs_ = $('#cm-cs', body); if (!cs_) return;
      const ta = $('#cm-ct', body);
      ta.oninput = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'; };
      cs_.onclick = async () => {
        const text = ta.value.trim(); if (!text) { ta.focus(); return; }
        cs_.disabled = true;
        try {
          await root.child('comments/' + pid).push({ uid: u.uid, name: nameOf(u), av: String(ST().cfg('avMe') || '').slice(0, 20), text: text.slice(0, 500), at: CL().ts() });
          render();
        } catch (e) { toast(errText(e).replace(/<[^>]+>/g, '')); cs_.disabled = false; }
      };
    }

    document.addEventListener('click', e => { if (!e.target.closest('.cm-more,.cm-menu')) $$('.cm-menu', body).forEach(m => { m.hidden = true; }); });
    render();
  }

  window.SECOM = { view, BOARDS };
})();
