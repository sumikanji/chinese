/*! © 2026 Sumi Chinese — giọng đọc (TTS) và chấm phát âm tiếng Trung (so theo pinyin và thanh điệu) */
(function () {
  const synth = window.speechSynthesis || null;
  let voices = [];
  // Đoán giới tính giọng theo tên (trình duyệt không cung cấp thông tin này)
  const FEMALE = /female|woman|ting-?ting|xiaoxiao|xiaoyi|xiaohan|xiaomo|xiaoxuan|xiaorui|xiaoshuang|xiaoqiu|xiaomeng|xiaozhen|xiaochen|xiaoyan|huihui|yaoyao|yu-?shu|mei-?jia|sin-?ji|shasha|lili|lingling|tian-?tian|google|普通话|國語|国语/i;
  const MALE = /\bmale\b|kangkang|yunxi|yunyang|yunjian|yunze|yunhao|yunfeng|yunye|li-?mu|\bliang\b|hanhan|danny|zhiwei/i;
  function genderOf(v) { const n = v.name; if (/female/i.test(n)) return 'f'; if (/\bmale\b/i.test(n)) return 'm'; return MALE.test(n) ? 'm' : FEMALE.test(n) ? 'f' : '?'; }
  const isZh = v => /^(zh|cmn)/i.test(v.lang) && !/yue|HK|MO/i.test(v.lang + ' ' + v.name);
  function loadVoices() {
    if (!synth) return;
    const all = synth.getVoices().filter(isZh);
    const score = v => (/CN|Hans/i.test(v.lang) ? 20 : /TW|Hant/i.test(v.lang) ? 6 : 10) +
      (/natural|neural|online|enhanced|premium|plus/i.test(v.name) ? 10 : 0) +
      (/xiaoxiao|google|ting-?ting|xiaoyi|huihui/i.test(v.name) ? 6 : 0) - (/compact|eloquence/i.test(v.name) ? 20 : 0) +
      (genderOf(v) === 'f' ? 4 : genderOf(v) === 'm' ? -50 : 0);
    voices = all.sort((a, b) => score(b) - score(a));
    listeners.forEach(f => { try { f(); } catch (e) { } });
  }
  const listeners = [];
  if (synth) { loadVoices(); synth.onvoiceschanged = loadVoices; }

  let rate = 0.9;
  const gender = 'f';    // chỉ dùng giọng nữ
  let voiceName = '';    // tên giọng cụ thể (nếu người dùng chọn)
  let token = 0;
  function pickVoice(who) {
    if (!voices.length) return { v: null, pitch: who === 'B' ? 1.2 : 1.05 };
    const ok = voices.filter(v => genderOf(v) !== 'm');
    let main = voiceName && ok.find(v => v.name === voiceName);
    if (!main) main = ok[0] || null;
    if (!main) return { v: null, pitch: 1.15 };
    if (who !== 'B') return { v: main, pitch: 1 };
    const other = ok.find(v => v !== main && /CN|Hans/i.test(v.lang));
    return other ? { v: other, pitch: 1 } : { v: main, pitch: 1.12 };
  }

  // speak(text, {who:'A'|'B', slow, rate}) → Promise khi đọc xong
  function speakTTS(text, o) {
    o = o || {};
    if (!synth) return Promise.resolve();
    const my = ++token;
    const busy = synth.speaking || synth.pending;
    if (busy) synth.cancel();
    if (synth.paused) synth.resume();
    return new Promise(res => {
      const u = new SpeechSynthesisUtterance(String(text).replace(/…/g, '，'));
      u.lang = 'zh-CN';
      const pv = pickVoice(o.who);
      if (pv.v) u.voice = pv.v;
      u.pitch = pv.pitch;
      u.rate = o.slow ? 0.55 : (o.rate || rate);
      let done = false;
      const fin = () => { if (done) return; done = true; clearTimeout(tm); res(my === token); };
      u.onend = fin; u.onerror = fin;
      const tm = setTimeout(fin, 1500 + String(text).length * 380 / u.rate);
      // iPhone/iPad: phải gọi speak() ngay trong lần chạm của người dùng, không được trì hoãn.
      if (busy) setTimeout(() => synth.speak(u), 60); else synth.speak(u);
    });
  }

  // ---------- Giọng AI thu sẵn (mp3) ----------
  // Mỗi câu cố định có 2 file: audio/f/<mã>.mp3 (giọng nữ) và audio/m/<mã>.mp3 (giọng nam).
  // Mã = băm(vai + '|' + câu). Danh sách mã có file nằm trong data/audio.js. Không có file → dùng giọng của máy.
  function hashKey(s) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }
  const AKEYS = new Set(String(window.SE_AUDIO || '').split(' ').filter(Boolean));
  const keyOf = (who, text) => hashKey((who === 'B' ? 'B' : 'A') + '|' + String(text));
  let mode = 'f';                 // 'f' nữ · 'm' nam · 'mix' người nói nam, người học nữ
  const genderFor = who => mode === 'mix' ? (who === 'B' ? 'f' : 'm') : mode;
  let audioEl = null;
  function player() {
    if (!audioEl) { audioEl = new Audio(); audioEl.preload = 'auto'; }
    return audioEl;
  }
  function speak(text, o) {
    o = o || {};
    const key = keyOf(o.who, text);
    if (!AKEYS.has(key)) return speakTTS(text, o);
    const my = ++token;
    if (synth && (synth.speaking || synth.pending)) synth.cancel();
    const a = player();
    return new Promise(res => {
      let done = false;
      const fin = ok => { if (done) return; done = true; clearTimeout(tm); a.onended = a.onerror = null; res(ok && my === token); };
      a.onended = () => fin(true);
      a.onerror = () => { if (done) return; done = true; clearTimeout(tm); a.onended = a.onerror = null; if (my === token) speakTTS(text, o).then(res); else res(false); };
      const tm = setTimeout(() => fin(true), 4000 + String(text).length * 400);
      a.src = 'audio/' + genderFor(o.who) + '/' + key + '.mp3';
      const r = o.slow ? 0.72 : (o.rate || rate) / 0.9;
      a.playbackRate = Math.max(0.5, Math.min(1.6, r));
      try { a.preservesPitch = true; a.webkitPreservesPitch = true; } catch (e) { }
      const p = a.play();
      if (p && p.catch) p.catch(() => { if (!done) { done = true; clearTimeout(tm); if (my === token) speakTTS(text, o).then(res); else res(false); } });
    });
  }
  // Tải trước file mp3 của câu sắp phát để không bị khựng
  const pre = new Set();
  function prefetch(text, who) {
    const key = keyOf(who, text); if (!AKEYS.has(key)) return;
    const url = 'audio/' + genderFor(who) + '/' + key + '.mp3';
    if (pre.has(url)) return; if (pre.size > 200) pre.clear(); pre.add(url);
    try { fetch(url).catch(() => { }); } catch (e) { }
  }
  function unlockAudio() { try { const a = player(); a.muted = true; a.src = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjE2LjEwMAAAAAAAAAAAAAAA//OEwAAAAAAAAAAAAEluZm8AAAAPAAAABwAAA2AAVVVVVVVVVVVVVVVVVVVxcXFxcXFxcXFxcXFxcY6Ojo6Ojo6Ojo6Ojo6Oqqqqqqqqqqqqqqqqqqqqx8fHx8fHx8fHx8fHx8fj4+Pj4+Pj4+Pj4+Pj4///////////////////AAAAAExhdmM2MC4zMQAAAAAAAAAAAAAAACQEIAAAAAAAAANgmVBi7QAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//NExAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExFMAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExKYAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExKwAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMu//NExKwAAANIAAAAADEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NExKwAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//NExKwAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV'; const p = a.play(); if (p && p.then) p.then(() => { a.pause(); a.muted = false; }).catch(() => { a.muted = false; }); } catch (e) { } }
  function stop() { token++; if (audioEl) { try { audioEl.pause(); } catch (e) { } } if (synth && (synth.speaking || synth.pending)) synth.cancel(); }
  let unlocked = false;
  function unlock() {
    if (unlocked || !synth) return;
    unlocked = true;
    try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; u.lang = 'zh-CN'; synth.speak(u); } catch (e) { }
    loadVoices();
    unlockAudio();
  }
  ['pointerdown', 'touchend', 'click', 'keydown'].forEach(ev => document.addEventListener(ev, unlock, { capture: true, passive: true }));
  if (synth) setInterval(() => { if (synth.speaking && synth.paused) synth.resume(); }, 1000);

  // ---------- Pinyin ----------
  const HAN = /[一-鿿]/;
  const TONEMARK = { 'ā': 'a1', 'á': 'a2', 'ǎ': 'a3', 'à': 'a4', 'ē': 'e1', 'é': 'e2', 'ě': 'e3', 'è': 'e4', 'ī': 'i1', 'í': 'i2', 'ǐ': 'i3', 'ì': 'i4', 'ō': 'o1', 'ó': 'o2', 'ǒ': 'o3', 'ò': 'o4', 'ū': 'u1', 'ú': 'u2', 'ǔ': 'u3', 'ù': 'u4', 'ǖ': 'ü1', 'ǘ': 'ü2', 'ǚ': 'ü3', 'ǜ': 'ü4', 'ń': 'n2', 'ň': 'n3', 'ǹ': 'n4', 'ḿ': 'm2' };
  // 'hǎo' → 'hao3', 'ma' → 'ma5'
  function tone3(p) {
    let t = 5, s = '';
    for (const ch of String(p).toLowerCase()) { const m = TONEMARK[ch]; if (m) { s += m[0]; t = +m[1]; } else s += ch; }
    s = s.replace(/v/g, 'ü').replace(/[^a-zü]/g, '');
    return s ? s + t : '';
  }
  const PY = {};   // chữ → 'hao3'
  (function () { const M = window.SE_PYMAP || {}; for (const k in M) for (const c of M[k]) PY[c] = k; })();
  const charPy = c => PY[c] || '';

  // Văn bản → mảng đơn vị [{c, p}] (chỉ chữ Hán). Nhận cả mảng token [[từ, 'pin yin'], …]
  function units(x) {
    const out = [];
    if (Array.isArray(x)) {
      x.forEach(([w, p]) => {
        const ps = p ? p.split(' ') : [];
        Array.from(w).forEach((c, i) => { if (HAN.test(c)) out.push({ c, p: tone3(ps[i] || '') || charPy(c) }); });
      });
    } else {
      Array.from(numToHan(String(x))).forEach(c => { if (HAN.test(c)) out.push({ c, p: charPy(c) }); });
    }
    return out;
  }
  // Chữ số → chữ Hán (đọc theo giá trị, ví dụ 25 → 二十五; số dài → đọc từng chữ số)
  const DG = '零一二三四五六七八九';
  function numVal(n) {
    n = +n;
    if (n < 10) return DG[n];
    if (n < 20) return '十' + (n % 10 ? DG[n % 10] : '');
    if (n < 100) return DG[Math.floor(n / 10)] + '十' + (n % 10 ? DG[n % 10] : '');
    if (n < 1000) return DG[Math.floor(n / 100)] + '百' + (n % 100 ? (n % 100 < 10 ? '零' : '') + (n % 100 < 20 && n % 100 >= 10 ? '一' : '') + numVal(n % 100) : '');
    if (n < 10000) return DG[Math.floor(n / 1000)] + '千' + (n % 1000 ? (n % 1000 < 100 ? '零' : '') + numVal(n % 1000) : '');
    if (n < 100000000) return numVal(Math.floor(n / 10000)) + '万' + (n % 10000 ? (n % 10000 < 1000 ? '零' : '') + numVal(n % 10000) : '');
    return String(n).split('').map(d => DG[+d]).join('');
  }
  function numToHan(s, digitwise) {
    return s.replace(/(\d+)\.(\d+)/g, (m, a, b) => numVal(a) + '点' + b.split('').map(d => DG[+d]).join(''))
      .replace(/\d+/g, m => (digitwise || m.length >= 5 || (m.length > 1 && m[0] === '0')) ? m.split('').map(d => DG[+d]).join('') : numVal(m))
      .replace(/%/g, '百分之');
  }
  // Mức giống của 1 chữ (0–1): đúng chữ hoặc đồng âm = 1; đúng âm sai thanh = 0,5
  const SAME = { '二': '两', '两': '二', '么': '吗' };
  function usim(t, h) {
    if (t.c === h.c || SAME[t.c] === h.c) return 1;
    if (!t.p || !h.p) return 0;
    if (t.p === h.p) return 1;
    const bt = t.p.slice(0, -1), bh = h.p.slice(0, -1);
    if (bt !== bh) return (t.c === '儿' || bt === 'r') ? 0 : 0;
    const tt = t.p.slice(-1), th = h.p.slice(-1);
    if (tt === '5' || th === '5') return 1;      // thanh nhẹ: không trừ điểm
    if ((bt === 'yi' || bt === 'bu')) return 1;  // 一 / 不 biến điệu
    return 0.5;
  }
  function align(T, H) {
    const m = T.length, n = H.length;
    const dp = Array.from({ length: m + 1 }, () => new Float32Array(n + 1));
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
      const s = usim(T[i - 1], H[j - 1]);
      dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1], s ? dp[i - 1][j - 1] + s : 0);
    }
    const ok = new Array(m).fill(0);
    let i = m, j = n;
    while (i > 0 && j > 0) {
      const s = usim(T[i - 1], H[j - 1]);
      if (s && Math.abs(dp[i][j] - (dp[i - 1][j - 1] + s)) < 1e-6) { ok[i - 1] = s; i--; j--; }
      else if (dp[i - 1][j] >= dp[i][j - 1]) i--; else j--;
    }
    // 儿 (âm cuộn lưỡi) không bắt buộc
    T.forEach((u, k) => { if (u.c === '儿' && /^r\d$/.test(u.p) && !ok[k]) ok[k] = 1; });
    const got = ok.reduce((a, b) => a + b, 0);
    const extra = Math.max(0, n - m);
    const score = m ? Math.max(0, Math.round(100 * got / m - extra * 3)) : 0;
    return { score, ok };
  }
  function compare(target, heard) {
    const T = units(target);
    let best = null;
    [numToHan(heard), numToHan(heard, true)].forEach(h => {
      const H = units(h);
      const r = align(T, H);
      if (!best || r.score > best.score) best = r;
    });
    best.heard = heard;
    return best;
  }
  // Điểm cho từng chữ Hán của câu (theo thứ tự)
  function markWords(target, res) { return units(target).map((u, i) => ({ c: u.c, ok: res.ok[i] || 0 })); }
  const norm = s => units(s).map(u => u.c);

  // ---------- Nhận dạng giọng nói ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null;
  function canListen() { return !!SR; }
  // listen(target, {onInterim}) → Promise<{score, ok, heard} | {error}>
  function listen(target, o) {
    o = o || {};
    stop();
    return new Promise(resolve => {
      if (!SR) return resolve({ error: 'unsupported' });
      try { if (rec) rec.abort(); } catch (e) { }
      const r = new SR();
      rec = r;
      r.lang = 'zh-CN'; r.interimResults = true; r.maxAlternatives = o.continuous ? 1 : 5; r.continuous = !!o.continuous;
      let best = null, finished = false, lastText = '';
      const done = (v) => { if (finished) return; finished = true; clearTimeout(cap); resolve(v); };
      r.onresult = e => {
        if (o.continuous) {
          // Kể cả đoạn: gộp mọi đoạn đã nhận dạng từ đầu phiên
          let all = '';
          for (let i = 0; i < e.results.length; i++) all += e.results[i][0].transcript;
          lastText = all.trim();
          if (lastText) o.onInterim && o.onInterim(lastText);
          return;
        }
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const R = e.results[i];
          if (R.isFinal) {
            for (let a = 0; a < R.length; a++) {
              const c = compare(target, R[a].transcript);
              if (!best || c.score > best.score) best = c;
            }
          } else interim += R[0].transcript;
        }
        if (interim) { lastText = interim; o.onInterim && o.onInterim(interim); }
      };
      r.onerror = e => done({ error: e.error || 'error' });
      r.onend = () => {
        if (o.continuous) return done(lastText ? compare(target, lastText) : { error: 'no-speech' });
        if (best) done(best);
        else if (lastText) done(compare(target, lastText));
        else done({ error: 'no-speech' });
      };
      const cap = setTimeout(() => { try { r.stop(); } catch (e) { } }, o.maxMs || 10000);
      try { r.start(); } catch (e) { done({ error: 'start' }); }
    });
  }
  function stopListening() { try { rec && rec.stop(); } catch (e) { } }

  window.SESpeech = {
    speak, stop, listen, stopListening, prefetch, urlOf: (text, who) => { const k = keyOf(who, text); return AKEYS.has(k) ? 'audio/' + genderFor(who) + '/' + k + '.mp3' : null; }, canListen, compare, markWords, norm, units, tone3, charPy, numToHan, numVal,
    canSpeak: () => !!synth,
    hasVoice: () => voices.length > 0,
    setRate: r => { rate = r; }, getRate: () => rate,
    setGender: g => { mode = g === 'm' || g === 'mix' ? g : 'f'; }, getGender: () => mode, hasAudio: (t, who) => AKEYS.has(keyOf(who, t)), keyOf, audioCount: () => AKEYS.size,
    setVoice: n => { voiceName = n || ''; }, getVoice: () => voiceName,
    voiceList: () => voices.map(v => ({ name: v.name, lang: v.lang, g: genderOf(v) })),
    onVoices: f => listeners.push(f)
  };
})();
