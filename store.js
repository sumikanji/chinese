/*! © 2026 Sumi Chinese — tiến độ học và ôn tập ngắt quãng (lưu trên máy) */
(function () {
  const KEY = 'sumiChinese.v1';
  const DAY = 864e5;
  // Hộp Leitner: số ngày tới lần ôn kế tiếp
  const IV = [0, 1, 2, 4, 7, 14, 30, 60, 120];
  let S;
  try { S = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { S = null; }
  S = Object.assign({ done: {}, cards: {}, xp: 0, streak: { last: '', n: 0 }, days: {}, cfg: {}, custom: {}, videos: [] }, S || {});
  const listeners = [];
  function save() { S.updatedAt = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } listeners.forEach(f => { try { f(S); } catch (e) { } }); }
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const startOfDay = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };

  function touch(xp) {
    const t = today();
    if (S.streak.last !== t) {
      const y = new Date(Date.now() - DAY);
      const ys = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
      S.streak.n = S.streak.last === ys ? S.streak.n + 1 : 1;
      S.streak.last = t;
    }
    S.xp += xp || 0;
    S.days[t] = (S.days[t] || 0) + (xp || 0);
    save();
  }
  function streak() {
    const t = today();
    const y = new Date(Date.now() - DAY);
    const ys = y.getFullYear() + '-' + (y.getMonth() + 1) + '-' + y.getDate();
    return (S.streak.last === t || S.streak.last === ys) ? S.streak.n : 0;
  }

  // Thêm thẻ của bài học vào bộ ôn
  function addCards(ids) {
    let n = 0;
    ids.forEach(id => { if (!S.cards[id]) { S.cards[id] = { b: 0, due: startOfDay() + DAY, r: 0, w: 0 }; n++; } });
    save();
    return n;
  }
  // Ghi kết quả ôn: good = nhớ / phát âm đạt
  function grade(id, good) {
    const c = S.cards[id] || (S.cards[id] = { b: 0, due: 0, r: 0, w: 0 });
    if (good) { c.b = Math.min(IV.length - 1, c.b + 1); c.r++; }
    else { c.b = Math.max(0, c.b - 2); c.w++; }
    c.due = startOfDay() + Math.max(1, IV[c.b]) * DAY;
    if (!good) c.due = startOfDay() + DAY;
    save();
    return c;
  }
  function dueIds() {
    const now = Date.now();
    return Object.keys(S.cards).filter(id => S.cards[id].due <= now).sort((a, b) => S.cards[a].due - S.cards[b].due);
  }
  function nextDue() {
    let m = Infinity;
    for (const id in S.cards) m = Math.min(m, S.cards[id].due);
    return m;
  }
  function finishLesson(id, stars, score) {
    const old = S.done[id] || { stars: 0, best: 0, n: 0 };
    S.done[id] = { stars: Math.max(old.stars, stars), best: Math.max(old.best, score), n: old.n + 1, at: Date.now() };
    save();
  }
  function mastered() { let n = 0; for (const id in S.cards) if (S.cards[id].b >= 4) n++; return n; }

  window.SEStore = {
    get: () => S, save, touch,
    onSave: f => listeners.push(f),
    // Thay toàn bộ dữ liệu (dùng khi đồng bộ từ tài khoản), không kích hoạt onSave
    replace: n => { S = Object.assign({ done: {}, cards: {}, xp: 0, streak: { last: '', n: 0 }, days: {}, cfg: {}, custom: {}, videos: [] }, n || {}); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } }, streak, addCards, grade, dueIds, nextDue, finishLesson, mastered,
    cfg: (k, v) => { if (v === undefined) return S.cfg[k]; S.cfg[k] = v; save(); },
    reset: () => { S = { done: {}, cards: {}, xp: 0, streak: { last: '', n: 0 }, days: {}, cfg: {}, custom: {}, videos: [] }; save(); },
    // Câu tự lưu (từ Shadowing): id dạng y:<mã>
    addCustom: (en, vi, src) => {
      let h = 0; for (const c of en) h = (h * 31 + c.charCodeAt(0)) | 0;
      const id = 'y:' + (h >>> 0).toString(36);
      if (!S.custom[id]) S.custom[id] = { en, vi, src: src || '' };
      if (!S.cards[id]) S.cards[id] = { b: 0, due: startOfDay() + DAY, r: 0, w: 0 };
      save(); return id;
    },
    // Số câu đến hạn trong n ngày tới (ngày 0 gồm cả câu quá hạn)
    forecast: n => {
      const out = new Array(n).fill(0), t0 = startOfDay();
      for (const id in S.cards) { const d = Math.floor((S.cards[id].due - t0) / DAY); out[Math.max(0, d)] !== undefined && d < n ? out[Math.max(0, d)]++ : 0; }
      return out;
    },
    IV
  };
})();
