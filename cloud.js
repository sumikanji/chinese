/*! © 2026 Sumi Chinese — tài khoản và đồng bộ tiến độ qua Firebase
 * Khi firebase-config.js để trống: trang chạy như cũ, tiến độ chỉ lưu trên máy, không hiện phần đăng nhập.
 * Khi đã điền cấu hình: đăng nhập Google / Email, tiến độ lưu ở users/<uid>/chinese và đồng bộ mọi thiết bị.
 */
(function () {
  const FB_VER = '10.12.2';
  const OWNER_KEY = (window.SE_LANG === 'zh' ? 'sumiChinese' : 'sumiEnglish') + '.owner';   // tài khoản đang giữ tiến độ trên máy này
  const SESSION_KEY = 'sumiChinese.session';
  const cfg = window.SUMI_FIREBASE;
  const providers = Object.assign({ google: true, email: true }, window.SUMI_AUTH_PROVIDERS || {});
  let fb = null, user = null, status = 'off', pushTimer = null, applying = false;
  const listeners = [];
  const emit = () => listeners.forEach(f => { try { f(); } catch (e) { } });
  const ST = () => window.SEStore;

  function loadScript(src) {
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Không tải được ' + src)); document.head.appendChild(s); });
  }

  // ---------- Gộp tiến độ máy này với tài khoản (giữ phần học nhiều hơn) ----------
  function merge(a, b) {
    if (!a) return b; if (!b) return a;
    // Đã xoá toàn bộ tiến độ ở một máy → bỏ dữ liệu cũ hơn lần xoá đó ở máy/tài khoản kia
    const ra = a.resetAt || 0, rb = b.resetAt || 0;
    const nbOnly = c => { const o = {}; for (const k in (c || {})) if (k.startsWith('w:')) o[k] = c[k]; return o; };   // Sổ tay không bị xoá cùng tiến độ
    const wipe = x => Object.assign({}, x, { cards: {}, done: {}, custom: nbOnly(x.custom), days: {}, xp: 0, streak: { last: '', n: 0 } });
    if (ra > rb) b = wipe(b); else if (rb > ra) a = wipe(a);
    const out = Object.assign({}, a, b);
    out.cards = Object.assign({}, a.cards);
    for (const id in (b.cards || {})) {
      const x = out.cards[id], y = b.cards[id];
      if (!x) { out.cards[id] = y; continue; }
      const nx = (x.r || 0) + (x.w || 0), ny = (y.r || 0) + (y.w || 0);
      out.cards[id] = ny > nx || (ny === nx && y.due > x.due) ? y : x;
    }
    out.done = Object.assign({}, a.done);
    for (const id in (b.done || {})) {
      const x = out.done[id], y = b.done[id];
      out.done[id] = !x ? y : { stars: Math.max(x.stars || 0, y.stars || 0), best: Math.max(x.best || 0, y.best || 0), n: Math.max(x.n || 0, y.n || 0), at: Math.max(x.at || 0, y.at || 0) };
    }
    out.days = Object.assign({}, a.days);
    for (const d in (b.days || {})) out.days[d] = Math.max(out.days[d] || 0, b.days[d]);
    out.custom = Object.assign({}, a.custom, b.custom);
    for (const id in (a.custom || {})) { const x = a.custom[id], y = (b.custom || {})[id]; if (y && (x.t || 0) > (y.t || 0)) out.custom[id] = x; }   // bản sửa mới hơn (Chưa thuộc) thắng
    out.xp = Math.max(a.xp || 0, b.xp || 0);
    const sa = a.streak || {}, sb = b.streak || {};
    out.streak = (sb.last || '') > (sa.last || '') ? sb : (sa.last || '') > (sb.last || '') ? sa : { last: sa.last || '', n: Math.max(sa.n || 0, sb.n || 0) };
    // Cài đặt: lấy bản mới hơn, riêng điểm cao nhất (voc_, snd_) lấy số lớn hơn
    const newer = (a.updatedAt || 0) >= (b.updatedAt || 0) ? a : b, older = newer === a ? b : a;
    out.cfg = Object.assign({}, older.cfg, newer.cfg);
    for (const k in (older.cfg || {})) if (/^(voc_|snd_)/.test(k) && typeof older.cfg[k] === 'number') out.cfg[k] = Math.max(older.cfg[k], (newer.cfg || {})[k] || 0);
    out.updatedAt = Math.max(a.updatedAt || 0, b.updatedAt || 0);
    out.resetAt = Math.max(ra, rb);
    // Từ đã bỏ khỏi Sổ tay: không để bản ở máy khác làm nó hiện lại
    out.gone = Object.assign({}, a.gone);
    for (const id in (b.gone || {})) out.gone[id] = Math.max(out.gone[id] || 0, b.gone[id]);
    for (const id in out.gone) {
      const c = out.custom[id];
      if (c && (c.at || 0) > out.gone[id]) { delete out.gone[id]; continue; }
      delete out.custom[id]; delete out.cards[id];
    }
    return out;
  }
  // Cài đặt của máy (giao diện, giọng, ảnh đại diện…) giữ lại khi đổi tài khoản; tiến độ học thì không
  const DEVICE_CFG = ['theme', 'gender', 'rate', 'voice', 'hidePy', 'avMe', 'avThem', 'hideEn', 'hideVi', 'shGap', 'shHideEn', 'shHideVi', 'shLv'];
  function keepCfg() { const c = (ST().get().cfg) || {}, o = {}; DEVICE_CFG.forEach(k => { if (c[k] !== undefined) o[k] = c[k]; }); return o; }
  // Firebase không lưu được khoá có dấu . # $ [ ] / — mã hoá khoá trước khi gửi
  const encKey = k => k.replace(/[.#$\[\]\/%]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  const decKey = k => k.replace(/%([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  const mapKeys = (o, f) => { if (!o || typeof o !== 'object' || Array.isArray(o)) return o; const r = {}; for (const k in o) r[f(k)] = mapKeys(o[k], f); return r; };

  const ref = () => fb && user ? fb.database().ref('users/' + user.uid + '/chinese') : null;
  async function pull() {
    const r = ref(); if (!r) return;
    status = 'syncing'; emit();
    try {
      const snap = await r.once('value');
      const remote = mapKeys(snap.val(), decKey);
      // Tiến độ trên máy thuộc tài khoản khác → không gộp, chỉ lấy tiến độ của tài khoản vừa đăng nhập
      let owner = null; try { owner = localStorage.getItem(OWNER_KEY); } catch (e) { }
      const local = owner && owner !== user.uid ? { cfg: keepCfg() } : ST().get();
      const merged = merge(local, remote) || { cfg: keepCfg() };
      try { localStorage.setItem(OWNER_KEY, user.uid); } catch (e) { }
      applying = true; ST().replace(merged); applying = false;
      if (remote || Object.keys(merged.done || {}).length || Object.keys(merged.cards || {}).length) await r.set(mapKeys(JSON.parse(JSON.stringify(merged)), encKey));
      status = 'ok';
      window.dispatchEvent(new CustomEvent('sumi:synced'));
    } catch (e) { status = 'error'; console.warn('Đồng bộ:', e.message); }
    emit();
  }
  function schedulePush() {
    if (applying || !ref()) return;
    clearTimeout(pushTimer);
    status = 'pending'; emit();
    pushTimer = setTimeout(async () => {
      try { await ref().set(mapKeys(JSON.parse(JSON.stringify(ST().get())), encKey)); status = 'ok'; }
      catch (e) { status = 'error'; }
      emit();
    }, 2000);
  }

  // ---------- Khởi động Firebase ----------
  const ready = (function () {
    if (!cfg || !/^https?:/.test(location.protocol)) return Promise.resolve(null);
    const base = 'https://www.gstatic.com/firebasejs/' + FB_VER + '/';
    return loadScript(base + 'firebase-app-compat.js')
      .then(() => Promise.all([loadScript(base + 'firebase-auth-compat.js'), loadScript(base + 'firebase-database-compat.js')]))
      .then(() => {
        fb = window.firebase;
        if (!fb.apps || !fb.apps.length) fb.initializeApp(cfg);
        return new Promise(resolve => {
          let first = true;
          fb.auth().onAuthStateChanged(u => {
            user = u ? { uid: u.uid, name: u.displayName || '', email: u.email || '', provider: (u.providerData && u.providerData[0] && u.providerData[0].providerId) || 'password' } : null;
            try { u ? localStorage.setItem(SESSION_KEY, JSON.stringify(user)) : localStorage.removeItem(SESSION_KEY); } catch (e) { }
            status = u ? 'syncing' : 'off';
            emit();
            if (u) pull();
            if (first) { first = false; resolve(fb); }
          });
        });
      })
      .catch(e => { console.warn('Firebase:', e.message); status = 'error'; emit(); return null; });
  })();
  if (window.SEStore) ST().onSave(schedulePush);
  else document.addEventListener('DOMContentLoaded', () => ST() && ST().onSave(schedulePush));

  const ERR = {
    'auth/email-already-in-use': 'Email này đã được đăng ký. Hãy đăng nhập.',
    'auth/invalid-email': 'Email chưa đúng định dạng.',
    'auth/weak-password': 'Mật khẩu cần ít nhất 6 ký tự.',
    'auth/wrong-password': 'Mật khẩu không đúng.',
    'auth/invalid-credential': 'Email hoặc mật khẩu không đúng.',
    'auth/user-not-found': 'Chưa có tài khoản với email này.',
    'auth/popup-closed-by-user': 'Bạn đã đóng cửa sổ đăng nhập.',
    'auth/unauthorized-domain': 'Tên miền này chưa được thêm vào Firebase (Authentication → Settings → Authorized domains).',
    'auth/operation-not-allowed': 'Cách đăng nhập này chưa được bật trong Firebase Console.',
    'auth/network-request-failed': 'Không có kết nối mạng.',
    'auth/too-many-requests': 'Thử quá nhiều lần, hãy đợi một lát.'
  };
  const errMsg = e => (e && ERR[e.code]) || (e && e.message) || 'Có lỗi xảy ra.';

  window.SECloud = {
    enabled: () => !!cfg,
    ready,
    user: () => user,
    status: () => status,
    providers,
    on: f => listeners.push(f),
    errMsg,
    async google() {
      await ready; const p = new fb.auth.GoogleAuthProvider();
      p.setCustomParameters({ prompt: 'select_account' });   // luôn hỏi chọn tài khoản Google, không tự vào tài khoản cũ
      try { await fb.auth().signInWithPopup(p); }
      catch (e) { if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) await fb.auth().signInWithRedirect(p); else throw e; }
    },
    async signUp(name, email, pw) { await ready; const c = await fb.auth().createUserWithEmailAndPassword(email.trim(), pw); if (name) await c.user.updateProfile({ displayName: name.trim() }); user && (user.name = name.trim()); emit(); },
    async signIn(email, pw) { await ready; await fb.auth().signInWithEmailAndPassword(email.trim(), pw); },
    async reset(email) { await ready; await fb.auth().sendPasswordResetEmail(email.trim()); },
    async signOut() {
      await ready;
      // Lưu nốt thay đổi lên tài khoản rồi mới đăng xuất
      clearTimeout(pushTimer);
      try { const r = ref(); if (r) await r.set(mapKeys(JSON.parse(JSON.stringify(ST().get())), encKey)); } catch (e) { }
      await fb.auth().signOut();
      // Xoá tiến độ của tài khoản vừa đăng xuất khỏi máy (đã lưu trên tài khoản), giữ cài đặt của máy
      applying = true; ST().replace({ cfg: keepCfg() }); applying = false;
      try { localStorage.removeItem(OWNER_KEY); } catch (e) { }
      window.dispatchEvent(new CustomEvent('sumi:synced'));
    },
    syncNow: pull,
    // Dùng cho góp ý: cơ sở dữ liệu và dấu thời gian của máy chủ
    async db() { const f = await ready; return f ? f.database() : null; },
    ts: () => fb ? fb.database.ServerValue.TIMESTAMP : Date.now(),
    _merge: merge
  };
})();
