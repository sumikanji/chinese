/*! © 2026 Sumi — Cảnh 2.5D: chạm vào đồ vật để xem tên và nghe đọc. Dùng chung cho Sumi English và Sumi Chinese. */
(function () {
  'use strict';
  const LANG = window.SE_LANG || 'en';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ================= Bộ vẽ isometric =================
  const C = Math.cos(Math.PI / 6), S = 14;
  const P = (x, y, z) => [(x - y) * C * S, (x + y) * 0.5 * S - z * S];
  function hex2rgb(h) { if (h[0] !== '#') { const m = h.match(/\d+/g); return [+m[0], +m[1], +m[2]]; } h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function shade(h, f) { const [r, g, b] = hex2rgb(h); const m = v => Math.max(0, Math.min(255, Math.round(f > 1 ? v + (255 - v) * (f - 1) : v * f))); return '#' + [m(r), m(g), m(b)].map(v => v.toString(16).padStart(2, '0')).join(''); }
  const pts = a => a.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');

  // Một "bản vẽ" gom các hình, tự sắp xếp xa trước – gần sau
  function Drawing() {
    const items = [];
    const bb = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
    const grow = p => { bb.x0 = Math.min(bb.x0, p[0]); bb.y0 = Math.min(bb.y0, p[1]); bb.x1 = Math.max(bb.x1, p[0]); bb.y1 = Math.max(bb.y1, p[1]); };
    const D = {
      bb, items,
      // hộp: x,y,z góc gần gốc; w (trục x), d (trục y), h (cao)
      box(x, y, z, w, d, h, c, o) {
        o = o || {};
        const t = [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)];
        const r = [P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)];
        const l = [P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)];
        [...t, ...r, ...l].forEach(grow);
        const st = o.edge === false ? '' : ' stroke="' + shade(c, 0.62) + '" stroke-width="0.5" stroke-linejoin="round"';
        let s = '';
        if (!o.noLeft) s += '<polygon points="' + pts(l) + '" fill="' + shade(c, 0.86) + '"' + st + '/>';
        if (!o.noRight) s += '<polygon points="' + pts(r) + '" fill="' + shade(c, 0.72) + '"' + st + '/>';
        if (!o.noTop) s += '<polygon points="' + pts(t) + '" fill="' + shade(c, o.topLight || 1.08) + '"' + st + '/>';
        items.push({ d: o.depth != null ? o.depth : (x + w / 2) + (y + d / 2) + (z + h / 2) * 0.9, s });
        return D;
      },
      // hình chữ nhật dán lên một mặt hộp: face 'x' (mặt phải, x cố định), 'y' (mặt trái, y cố định), 'z' (mặt trên)
      quad(face, k, a0, b0, a1, b1, c, o) {
        o = o || {};
        let q;
        if (face === 'x') q = [P(k, a0, b0), P(k, a1, b0), P(k, a1, b1), P(k, a0, b1)];
        else if (face === 'y') q = [P(a0, k, b0), P(a1, k, b0), P(a1, k, b1), P(a0, k, b1)];
        else q = [P(a0, b0, k), P(a1, b0, k), P(a1, b1, k), P(a0, b1, k)];
        q.forEach(grow);
        const f = face === 'x' ? 0.72 : face === 'y' ? 0.86 : 1.08;
        items.push({ d: o.depth != null ? o.depth : (face === 'x' ? k + (a0 + a1) / 2 : face === 'y' ? (a0 + a1) / 2 + k : (a0 + a1) / 2 + (b0 + b1) / 2) + (face === 'z' ? k * 0.9 : (b0 + b1) / 2 * 0.9) + 0.02, s: '<polygon points="' + pts(q) + '" fill="' + (o.raw ? c : shade(c, f)) + '"' + (o.stroke ? ' stroke="' + o.stroke + '" stroke-width="0.6"' : '') + '/>' });
        return D;
      },
      // trụ tròn đứng
      cyl(x, y, z, r, h, c, o) {
        o = o || {};
        const [cx, cyB] = P(x, y, z), cyT = P(x, y, z + h)[1];
        const rx = r * Math.SQRT2 * C * S, ry = r * Math.SQRT2 * 0.5 * S;
        grow([cx - rx, cyT - ry]); grow([cx + rx, cyB + ry]);
        const gid = 'g' + Math.abs(hashStr(c)).toString(36);
        D.grad(gid, c);
        let s = '<path d="M' + (cx - rx).toFixed(1) + ',' + cyT.toFixed(1) + ' L' + (cx - rx).toFixed(1) + ',' + cyB.toFixed(1) + ' A' + rx.toFixed(1) + ',' + ry.toFixed(1) + ' 0 0 0 ' + (cx + rx).toFixed(1) + ',' + cyB.toFixed(1) + ' L' + (cx + rx).toFixed(1) + ',' + cyT.toFixed(1) + ' Z" fill="url(#' + gid + ')" stroke="' + shade(c, 0.62) + '" stroke-width="0.5"/>';
        if (!o.open) s += '<ellipse cx="' + cx.toFixed(1) + '" cy="' + cyT.toFixed(1) + '" rx="' + rx.toFixed(1) + '" ry="' + ry.toFixed(1) + '" fill="' + shade(o.top || c, 1.1) + '" stroke="' + shade(c, 0.62) + '" stroke-width="0.5"/>';
        else s += '<ellipse cx="' + cx.toFixed(1) + '" cy="' + cyT.toFixed(1) + '" rx="' + rx.toFixed(1) + '" ry="' + ry.toFixed(1) + '" fill="' + shade(c, 0.55) + '" stroke="' + shade(c, 0.62) + '" stroke-width="0.5"/>' + (o.fill ? '<ellipse cx="' + cx.toFixed(1) + '" cy="' + (cyT + ry * 0.25).toFixed(1) + '" rx="' + (rx * 0.85).toFixed(1) + '" ry="' + (ry * 0.75).toFixed(1) + '" fill="' + o.fill + '"/>' : '');
        items.push({ d: o.depth != null ? o.depth : x + y + (z + h / 2) * 0.9, s });
        return D;
      },
      // đĩa phẳng (hình elip nằm)
      disc(x, y, z, r, c, o) {
        o = o || {};
        const [cx, cy] = P(x, y, z);
        const rx = r * Math.SQRT2 * C * S, ry = r * Math.SQRT2 * 0.5 * S;
        grow([cx - rx, cy - ry]); grow([cx + rx, cy + ry]);
        items.push({ d: o.depth != null ? o.depth : x + y + z * 0.9 - (o.under ? 0.5 : -0.01), s: '<ellipse cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" rx="' + rx.toFixed(1) + '" ry="' + ry.toFixed(1) + '" fill="' + (o.raw ? c : shade(c, 1.05)) + '"' + (o.stroke !== false ? ' stroke="' + shade(c, 0.65) + '" stroke-width="0.5"' : '') + '/>' });
        return D;
      },
      // quả cầu
      ball(x, y, z, r, c, o) {
        o = o || {};
        const [cx, cy] = P(x, y, z + r);
        const R = r * S * 1.05;
        grow([cx - R, cy - R]); grow([cx + R, cy + R]);
        const gid = 'b' + Math.abs(hashStr(c)).toString(36);
        D.bgrad(gid, c);
        items.push({ d: o.depth != null ? o.depth : x + y + (z + r) * 0.9, s: '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + R.toFixed(1) + '" fill="url(#' + gid + ')" stroke="' + shade(c, 0.6) + '" stroke-width="0.5"/>' });
        return D;
      },
      // nón (cây thông, mũ…)
      cone(x, y, z, r, h, c, o) {
        o = o || {};
        const [cx, cy] = P(x, y, z), top = P(x, y, z + h);
        const rx = r * Math.SQRT2 * C * S, ry = r * Math.SQRT2 * 0.5 * S;
        grow([cx - rx, top[1]]); grow([cx + rx, cy + ry]);
        const gid = 'g' + Math.abs(hashStr(c)).toString(36);
        D.grad(gid, c);
        items.push({ d: o.depth != null ? o.depth : x + y + (z + h / 3) * 0.9, s: '<path d="M' + (cx - rx).toFixed(1) + ',' + cy.toFixed(1) + ' A' + rx.toFixed(1) + ',' + ry.toFixed(1) + ' 0 0 0 ' + (cx + rx).toFixed(1) + ',' + cy.toFixed(1) + ' L' + top[0].toFixed(1) + ',' + top[1].toFixed(1) + ' Z" fill="url(#' + gid + ')" stroke="' + shade(c, 0.6) + '" stroke-width="0.5" stroke-linejoin="round"/>' });
        return D;
      },
      // đường / hình tự do theo toạ độ 3D
      path(points3, c, o) {
        o = o || {};
        const p2 = points3.map(p => P(p[0], p[1], p[2])); p2.forEach(grow);
        const avg = points3.reduce((a, p) => a + p[0] + p[1] + p[2] * 0.9, 0) / points3.length;
        items.push({ d: o.depth != null ? o.depth : avg + (o.bias || 0), s: o.line ? '<polyline points="' + pts(p2) + '" fill="none" stroke="' + c + '" stroke-width="' + (o.w || 1.2) + '" stroke-linecap="round" stroke-linejoin="round"/>' : '<polygon points="' + pts(p2) + '" fill="' + c + '"' + (o.stroke ? ' stroke="' + o.stroke + '" stroke-width="0.5"' : '') + ' stroke-linejoin="round"/>' });
        return D;
      },
      dot(x, y, z, r, c, o) { // chấm tròn 2D (mắt, nút…)
        o = o || {};
        const [cx, cy] = P(x, y, z); grow([cx - r, cy - r]); grow([cx + r, cy + r]);
        items.push({ d: o.depth != null ? o.depth : x + y + z * 0.9 + 0.05, s: '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + r + '" fill="' + c + '"/>' });
        return D;
      },
      defs: {},
      grad(id, c) { if (!D.defs[id]) D.defs[id] = '<linearGradient id="' + id + '" x1="0" x2="1"><stop offset="0" stop-color="' + shade(c, 0.95) + '"/><stop offset="0.55" stop-color="' + shade(c, 0.82) + '"/><stop offset="1" stop-color="' + shade(c, 0.66) + '"/></linearGradient>'; },
      bgrad(id, c) { if (!D.defs[id]) D.defs[id] = '<radialGradient id="' + id + '" cx="0.35" cy="0.32" r="0.75"><stop offset="0" stop-color="' + shade(c, 1.35) + '"/><stop offset="0.45" stop-color="' + c + '"/><stop offset="1" stop-color="' + shade(c, 0.66) + '"/></radialGradient>'; },
      out() { return items.sort((a, b) => a.d - b.d).map(i => i.s).join(''); }
    };
    return D;
  }
  // Bản vẽ soi gương qua đường x = y: đồ vật quay mặt sang tường trái (mặt trước hướng +x)
  function Mirror(D) {
    const sw = p => [p[1], p[0], p[2]];
    let M_ = null;
    M_ = {
      box: (x, y, z, w, d, h, c, o) => (D.box(y, x, z, d, w, h, c, o), M_),
      quad: (f, k, a0, b0, a1, b1, c, o) => (D.quad(f === 'x' ? 'y' : f === 'y' ? 'x' : 'z', k, f === 'z' ? b0 : a0, f === 'z' ? a0 : b0, f === 'z' ? b1 : a1, f === 'z' ? a1 : b1, c, o), M_),
      cyl: (x, y, z, r, h, c, o) => (D.cyl(y, x, z, r, h, c, o), M_),
      disc: (x, y, z, r, c, o) => (D.disc(y, x, z, r, c, o), M_),
      ball: (x, y, z, r, c, o) => (D.ball(y, x, z, r, c, o), M_),
      cone: (x, y, z, r, h, c, o) => (D.cone(y, x, z, r, h, c, o), M_),
      path: (pp, c, o) => (D.path(pp.map(sw), c, o), M_),
      dot: (x, y, z, r, c, o) => (D.dot(y, x, z, r, c, o), M_),
      defs: D.defs, bb: D.bb, items: D.items
    };
    return M_;
  }
  // Phóng to / thu nhỏ một đồ vật quanh điểm gốc (ox, oy, oz)
  function Scaled(D, ox, oy, oz, k) {
    const X = x => ox + (x - ox) * k, Y = y => oy + (y - oy) * k, Z = z => oz + (z - oz) * k;
    let S_ = null;
    S_ = {
      box: (x, y, z, w, d, h, c, o) => (D.box(X(x), Y(y), Z(z), w * k, d * k, h * k, c, o), S_),
      quad: (f, kk, a0, b0, a1, b1, c, o) => (f === 'x' ? D.quad('x', X(kk), Y(a0), Z(b0), Y(a1), Z(b1), c, o) : f === 'y' ? D.quad('y', Y(kk), X(a0), Z(b0), X(a1), Z(b1), c, o) : D.quad('z', Z(kk), X(a0), Y(b0), X(a1), Y(b1), c, o), S_),
      cyl: (x, y, z, r, h, c, o) => (D.cyl(X(x), Y(y), Z(z), r * k, h * k, c, o), S_),
      disc: (x, y, z, r, c, o) => (D.disc(X(x), Y(y), Z(z), r * k, c, o), S_),
      ball: (x, y, z, r, c, o) => (D.ball(X(x), Y(y), Z(z), r * k, c, o), S_),
      cone: (x, y, z, r, h, c, o) => (D.cone(X(x), Y(y), Z(z), r * k, h * k, c, o), S_),
      path: (pp, c, o) => (D.path(pp.map(p => [X(p[0]), Y(p[1]), Z(p[2])]), c, Object.assign({}, o, o && o.w ? { w: o.w * k } : {})), S_),
      dot: (x, y, z, r, c, o) => (D.dot(X(x), Y(y), Z(z), r * k, c, o), S_),
      defs: D.defs, bb: D.bb, items: D.items
    };
    return S_;
  }
  function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = Math.imul(31, h) + s.charCodeAt(i) | 0; return h; }

  // ================= Bảng màu =================
  const K = {
    wood: '#d9a066', woodL: '#e8c08a', woodD: '#a8693a', floor: '#e6c89a', floorB: '#d8b67f',
    wallA: '#f6ead6', wallB: '#efdcc0', white: '#f7f5f0', grey: '#b8bcc4', steel: '#9aa3ad', dark: '#3b3f47', black: '#2b2b30',
    red: '#e5534b', orange: '#f59e42', yellow: '#f7c948', green: '#5fb85c', leaf: '#4f9d4a', teal: '#3fb5a8', blue: '#4f8fe0', sky: '#8cc8f0', navy: '#34509a',
    pink: '#f29cb7', purple: '#9b7ad8', brown: '#8b5a3c', cream: '#fff3d6', skin: '#f5c9a0', grass: '#7cc46a', grassD: '#5ea94f', water: '#5fb6e6', sand: '#ecd59a', stone: '#a6a39b', road: '#6b6f78', tile: '#dfeef2'
  };

  // ================= Mô hình đồ vật (gốc toạ độ tại góc gần gốc của vật) =================
  // Mỗi hàm nhận (D, x, y, z) và vẽ vật tại đó.
  const M = {
    // ---- nhà bếp ----
    fridge(D, x, y, z) { D.box(x, y, z, 2, 2, 5.2, K.white); D.quad('y', y + 2, x + 0.15, z + 3.2, x + 1.85, z + 3.24, K.grey); D.box(x + 1.55, y + 2, z + 3.6, 0.15, 0.12, 1, K.steel); D.box(x + 1.55, y + 2, z + 1.6, 0.15, 0.12, 1.2, K.steel); },
    stove(D, x, y, z) { D.box(x, y, z, 2.2, 2, 3, K.white); D.quad('y', y + 2, x + 0.3, z + 0.4, x + 1.9, z + 2, K.dark); D.box(x, y, z + 3, 2.2, 2, 0.15, K.dark); D.disc(x + 0.6, y + 0.6, z + 3.16, 0.35, '#555'); D.disc(x + 1.6, y + 1.4, z + 3.16, 0.35, '#555'); },
    pot(D, x, y, z) { D.cyl(x, y, z, 0.55, 0.8, K.red, { open: true, fill: '#f0a65a' }); D.box(x - 0.85, y - 0.1, z + 0.6, 0.3, 0.2, 0.1, K.dark, { edge: false }); D.box(x + 0.55, y - 0.1, z + 0.6, 0.3, 0.2, 0.1, K.dark, { edge: false }); },
    pan(D, x, y, z) { D.cyl(x, y, z, 0.55, 0.22, K.black, { open: true }); D.box(x + 0.5, y - 0.08, z + 0.12, 1.2, 0.16, 0.12, K.woodD); },
    sink(D, x, y, z) { D.box(x, y, z, 2.6, 2, 3, K.woodL); D.box(x, y, z + 3, 2.6, 2, 0.15, K.grey); D.quad('z', z + 3.16, x + 0.4, y + 0.35, x + 2.2, y + 1.65, '#7e8794', { raw: true }); D.box(x + 1.2, y + 0.1, z + 3.15, 0.2, 0.2, 0.9, K.steel); D.box(x + 1.2, y + 0.1, z + 4, 0.2, 0.7, 0.15, K.steel); },
    counter(D, x, y, z, len) { len = len || 4; D.box(x, y, z, len, 2.2, 3, K.woodL); for (let i = 0; i + 1.2 <= len; i += 1.3) D.quad('y', y + 2.2, x + 0.12 + i, z + 0.2, x + 1.22 + i, z + 2.7, K.wood); D.box(x, y, z + 3, len, 2.35, 0.15, '#cfc6b8'); },
    cabinet(D, x, y, z) { D.box(x, y, z, 2.6, 1.2, 1.8, K.woodL); D.quad('y', y + 1.2, x + 0.1, z + 0.12, x + 1.25, z + 1.68, K.wood); D.quad('y', y + 1.2, x + 1.35, z + 0.12, x + 2.5, z + 1.68, K.wood); },
    microwave(D, x, y, z) { D.box(x, y, z, 1.5, 1, 0.9, K.white); D.quad('y', y + 1, x + 0.12, z + 0.15, x + 1.05, z + 0.75, K.dark); D.dot(x + 1.28, y + 1, z + 0.55, 1.1, K.steel); },
    kettle(D, x, y, z) { D.cyl(x, y, z, 0.35, 0.7, K.teal); D.cone(x, y, z + 0.7, 0.3, 0.25, K.teal); D.box(x + 0.3, y - 0.05, z + 0.25, 0.3, 0.1, 0.4, K.dark, { edge: false }); },
    ricecooker(D, x, y, z) { D.cyl(x, y, z, 0.5, 0.7, K.white); D.ball(x, y, z + 0.5, 0.42, K.white); D.dot(x + 0.3, y + 0.5, z + 0.3, 1.3, K.red); },
    board(D, x, y, z) { D.box(x, y, z, 1.4, 0.9, 0.12, K.woodL); D.box(x + 0.2, y + 0.3, z + 0.12, 0.9, 0.18, 0.04, K.steel, { edge: false }); D.box(x + 1.1, y + 0.3, z + 0.12, 0.35, 0.18, 0.08, K.dark, { edge: false }); },
    bowl(D, x, y, z) { D.cyl(x, y, z, 0.35, 0.25, K.white, { open: true, fill: '#f3f0e6' }); D.disc(x - 0.02, y - 0.02, z + 0.27, 0.22, K.blue, { stroke: false }); },
    plate(D, x, y, z) { D.cyl(x, y, z, 0.45, 0.06, K.white); D.disc(x, y, z + 0.07, 0.3, '#eae5d8', { stroke: false }); },
    cup(D, x, y, z) { D.cyl(x, y, z, 0.2, 0.42, K.yellow, { open: true }); },
    chopsticks(D, x, y, z) { D.box(x, y, z, 1.4, 0.06, 0.06, K.woodD, { edge: false }); D.box(x, y + 0.15, z, 1.4, 0.06, 0.06, K.woodD, { edge: false }); },
    spoon(D, x, y, z) { D.box(x, y, z, 0.9, 0.08, 0.05, K.steel, { edge: false }); D.disc(x + 1.05, y + 0.04, z + 0.05, 0.16, K.steel); },
    table(D, x, y, z, w, d, c) { w = w || 3; d = d || 2.4; c = c || K.wood; D.box(x, y, z, 0.25, 0.25, 2.3, c); D.box(x + w - 0.25, y, z, 0.25, 0.25, 2.3, c); D.box(x, y + d - 0.25, z, 0.25, 0.25, 2.3, c); D.box(x + w - 0.25, y + d - 0.25, z, 0.25, 0.25, 2.3, c); D.box(x - 0.1, y - 0.1, z + 2.3, w + 0.2, d + 0.2, 0.25, shade(c, 1.05) && c); },
    chair(D, x, y, z, c) { c = c || K.woodD; D.box(x, y, z, 0.18, 0.18, 1.4, c); D.box(x + 1, y, z, 0.18, 0.18, 1.4, c); D.box(x, y + 1, z, 0.18, 0.18, 1.4, c); D.box(x + 1, y + 1, z, 0.18, 0.18, 1.4, c); D.box(x - 0.05, y - 0.05, z + 1.4, 1.28, 1.28, 0.18, c); D.box(x - 0.05, y - 0.05, z + 1.58, 1.28, 0.18, 1.5, c); },
    trash(D, x, y, z) { D.cyl(x, y, z, 0.45, 1.1, K.green); D.cyl(x, y, z + 1.1, 0.5, 0.12, shade(K.green, 0.8)); },
    window(D, x, y, z, face) { // cửa sổ trên tường (face 'y': tường sau trái; 'x': tường sau phải)
      if (face === 'x') { D.quad('x', x, y, z, y + 3, z + 2.6, '#ffffff', { raw: true, stroke: K.woodD }); D.quad('x', x + 0.01, y + 0.15, z + 0.15, y + 2.85, z + 2.45, K.sky, { raw: true }); D.path([[x + 0.02, y + 1.5, z + 0.15], [x + 0.02, y + 1.5, z + 2.45]], '#fff', { line: true, w: 1.2 }); D.path([[x + 0.02, y + 0.15, z + 1.3], [x + 0.02, y + 2.85, z + 1.3]], '#fff', { line: true, w: 1.2 }); }
      else { D.quad('y', y, x, z, x + 3, z + 2.6, '#ffffff', { raw: true, stroke: K.woodD }); D.quad('y', y + 0.01, x + 0.15, z + 0.15, x + 2.85, z + 2.45, K.sky, { raw: true }); D.path([[x + 1.5, y + 0.02, z + 0.15], [x + 1.5, y + 0.02, z + 2.45]], '#fff', { line: true, w: 1.2 }); D.path([[x + 0.15, y + 0.02, z + 1.3], [x + 2.85, y + 0.02, z + 1.3]], '#fff', { line: true, w: 1.2 }); }
    },
    // ---- phòng tắm ----
    bathtub(D, x, y, z) { D.box(x, y, z, 4, 2.2, 1.8, K.white); D.quad('z', z + 1.81, x + 0.25, y + 0.25, x + 3.75, y + 1.95, '#bfe4f2', { raw: true }); D.box(x + 3.4, y + 0.9, z + 1.8, 0.15, 0.4, 0.6, K.steel); },
    shower(D, x, y, z) { D.box(x, y, z, 0.12, 0.12, 5.5, K.steel); D.box(x, y, z + 5.4, 0.12, 0.9, 0.1, K.steel); D.cyl(x + 0.05, y + 0.95, z + 5.1, 0.3, 0.3, K.steel); },
    toilet(D, x, y, z) { D.box(x, y, z, 1.4, 0.6, 2.6, K.white); D.cyl(x + 0.7, y + 1.3, z, 0.4, 1.2, K.white); D.cyl(x + 0.7, y + 1.4, z + 1.2, 0.62, 0.15, K.white); },
    shelf(D, x, y, z) { D.box(x, y, z, 1.6, 0.9, 0.12, K.white); D.box(x + 0.1, y, z - 0.5, 0.1, 0.5, 0.5, K.steel); D.box(x + 1.4, y, z - 0.5, 0.1, 0.5, 0.5, K.steel); },
    basin(D, x, y, z) { D.box(x, y, z, 2, 1.4, 2.6, K.woodL); D.cyl(x + 1, y + 0.75, z + 2.6, 0.6, 0.3, K.white, { open: true }); D.box(x + 0.92, y + 0.05, z + 2.6, 0.15, 0.2, 0.6, K.steel); },
    mirror(D, x, y, z, face) { if (face === 'x') { D.quad('x', x, y, z, y + 1.8, z + 2.2, K.woodL, { raw: true, stroke: K.woodD }); D.quad('x', x + 0.01, y + 0.15, z + 0.15, y + 1.65, z + 2.05, '#d6eef7', { raw: true }); } else { D.quad('y', y, x, z, x + 1.8, z + 2.2, K.woodL, { raw: true, stroke: K.woodD }); D.quad('y', y + 0.01, x + 0.15, z + 0.15, x + 1.65, z + 2.05, '#d6eef7', { raw: true }); } },
    towel(D, x, y, z, face) { D.box(x, y, z, 0.15, 1.6, 0.12, K.steel); D.box(x + 0.15, y + 0.1, z - 1.4, 0.12, 1.4, 1.45, K.pink); D.quad('x', x + 0.28, y + 0.1, z - 1.1, y + 1.5, z - 0.95, K.white, { raw: true }); },
    toothbrush(D, x, y, z) { D.cyl(x, y, z, 0.2, 0.45, K.teal, { open: true }); D.box(x - 0.05, y, z + 0.3, 0.08, 0.08, 0.75, K.orange, { edge: false }); D.box(x + 0.05, y - 0.08, z + 0.3, 0.08, 0.08, 0.7, K.blue, { edge: false }); },
    toothpaste(D, x, y, z) { D.box(x, y, z, 1, 0.3, 0.25, K.white); D.quad('y', y + 0.3, x + 0.1, z + 0.03, x + 0.6, z + 0.22, K.blue); D.box(x + 1, y + 0.07, z + 0.05, 0.18, 0.16, 0.15, K.red, { edge: false }); },
    soap(D, x, y, z) { D.box(x, y, z, 0.7, 0.45, 0.25, K.pink); D.ball(x + 0.15, y + 0.6, z + 0.25, 0.12, '#ffffff'); D.ball(x + 0.5, y + 0.5, z + 0.3, 0.09, '#ffffff'); },
    shampoo(D, x, y, z) { D.box(x, y, z, 0.5, 0.4, 1.0, K.purple); D.box(x + 0.15, y + 0.12, z + 1, 0.2, 0.16, 0.3, K.white); D.box(x + 0.15, y + 0.12, z + 1.3, 0.35, 0.16, 0.1, K.white); },
    comb(D, x, y, z) { D.box(x, y, z, 1.1, 0.12, 0.12, K.orange); for (let i = 0; i < 7; i++) D.box(x + 0.08 + i * 0.15, y + 0.12, z, 0.06, 0.25, 0.06, K.orange, { edge: false }); },
    hairdryer(D, x, y, z) { D.cyl(x + 0.3, y + 0.3, z + 0.9, 0.32, 0.3, K.navy); D.box(x + 0.6, y + 0.15, z + 0.95, 0.7, 0.3, 0.3, K.navy); D.box(x + 0.15, y + 0.15, z, 0.3, 0.3, 1, K.navy); },
    washer(D, x, y, z) { D.box(x, y, z, 2.2, 2, 2.8, K.white); D.cyl(x + 1.1, y + 2.0, z + 1.2, 0.01, 0.01, K.white); D.quad('y', y + 2, x + 0.2, z + 2.3, x + 2, z + 2.6, K.grey); D.dot(x + 1.1, y + 2, z + 1.25, 9, '#cfd6dd'); D.dot(x + 1.1, y + 2, z + 1.25, 6.5, '#7aa7c7'); },
    tissue(D, x, y, z) { D.cyl(x, y, z, 0.35, 0.6, '#ffffff'); D.disc(x, y, z + 0.61, 0.12, '#d9d4c8'); },
    slippers(D, x, y, z) { D.box(x, y, z, 1, 0.42, 0.12, K.teal); D.box(x, y + 0.55, z, 1, 0.42, 0.12, K.teal); D.box(x + 0.15, y, z + 0.12, 0.3, 0.42, 0.12, shade(K.teal, 0.9)); D.box(x + 0.15, y + 0.55, z + 0.12, 0.3, 0.42, 0.12, shade(K.teal, 0.9)); },
    // ---- phòng khách / phòng ngủ ----
    sofa(D, x, y, z, c) { c = c || '#e08a6a'; D.box(x, y, z, 1.2, 4.4, 2.6, c); D.box(x + 1.2, y, z, 1.6, 4.4, 1.2, c); D.box(x + 1.2, y, z, 1.6, 0.6, 1.9, c); D.box(x + 1.2, y + 3.8, z, 1.6, 0.6, 1.9, c); D.box(x + 1.25, y + 0.65, z + 1.2, 1.4, 1.5, 0.3, shade(c, 1.12)); D.box(x + 1.25, y + 2.25, z + 1.2, 1.4, 1.5, 0.3, shade(c, 1.12)); },
    cushion(D, x, y, z) { D.box(x, y, z, 0.45, 1, 0.9, K.yellow); },
    tv(D, x, y, z) { D.box(x, y, z, 3.6, 1.5, 1.1, K.woodD); D.box(x + 0.4, y + 0.45, z + 1.1, 2.8, 0.3, 1.8, K.black); D.quad('y', y + 0.75, x + 0.55, z + 1.25, x + 3.05, z + 2.75, '#3a6fb0', { raw: true }); D.quad('y', y + 0.76, x + 0.75, z + 2.0, x + 1.7, z + 2.6, '#7fb8ec', { raw: true }); D.quad('y', y + 1.5, x + 0.2, z + 0.15, x + 1.7, z + 0.95, shade(K.woodD, 1.15)); D.quad('y', y + 1.5, x + 1.9, z + 0.15, x + 3.4, z + 0.95, shade(K.woodD, 1.15)); },
    coffeetable(D, x, y, z) { D.box(x, y, z, 1.8, 2.4, 0.9, K.woodL); D.box(x + 0.1, y + 0.1, z, 1.6, 2.2, 0.75, K.wood); },
    lamp(D, x, y, z) { D.cyl(x, y, z, 0.4, 0.12, K.dark); D.box(x - 0.06, y - 0.06, z + 0.12, 0.12, 0.12, 3.2, K.dark); D.cone(x, y, z + 3, 0.7, 1.1, K.yellow); },
    clock(D, x, y, z, face) { if (face === 'x') { D.dot(x, y, z, 11, K.woodD); D.dot(x, y, z, 9, K.white); D.path([[x, y, z], [x, y, z + 0.5]], K.dark, { line: true, w: 1.2 }); D.path([[x, y, z], [x, y + 0.35, z]], K.dark, { line: true, w: 1.2 }); } else { D.dot(x, y, z, 11, K.woodD); D.dot(x, y, z, 9, K.white); D.path([[x, y, z], [x, y, z + 0.5]], K.dark, { line: true, w: 1.2 }); D.path([[x, y, z], [x + 0.35, y, z]], K.dark, { line: true, w: 1.2 }); } },
    picture(D, x, y, z) { D.quad('y', y, x, z, x + 2.4, z + 1.7, K.woodD, { raw: true }); D.quad('y', y + 0.01, x + 0.15, z + 0.15, x + 2.25, z + 1.55, '#bfe3f5', { raw: true }); D.path([[x + 0.2, y + 0.02, z + 0.2], [x + 1.0, y + 0.02, z + 1.2], [x + 1.6, y + 0.02, z + 0.55], [x + 2.2, y + 0.02, z + 0.2]], K.green); D.dot(x + 1.8, y + 0.02, z + 1.2, 2.5, K.orange); },
    plant(D, x, y, z) { D.cyl(x, y, z, 0.5, 0.9, '#c96f4a'); D.ball(x, y, z + 0.9, 0.55, K.leaf); D.ball(x - 0.3, y + 0.2, z + 1.3, 0.4, K.green); D.ball(x + 0.25, y - 0.2, z + 1.5, 0.38, K.leaf); },
    rug(D, x, y, z) { D.box(x, y, z, 4, 4.4, 0.06, '#c9a3d6', { edge: false }); D.quad('z', z + 0.07, x + 0.35, y + 0.35, x + 3.65, y + 4.05, '#dcc0e6', { raw: true }); },
    bookshelf(D, x, y, z) { D.box(x, y, z, 1.2, 2.8, 5, K.wood); [0.9, 2.3, 3.7].forEach((h, i) => { D.box(x + 1.2, y + 0.1, z + h, 0.01, 2.6, 0.01, K.woodD, { edge: false }); [K.red, K.blue, K.yellow, K.green, K.purple, K.orange].forEach((c, j) => { if ((i + j) % 4 === 3) return; D.quad('x', x + 1.21, y + 0.2 + j * 0.42, z + h + 0.05, y + 0.5 + j * 0.42, z + h + 1.05 - (j % 2) * 0.2, c); }); }); },
    book(D, x, y, z) { D.box(x, y, z, 1.1, 0.8, 0.2, K.red); D.box(x + 0.05, y + 0.05, z + 0.2, 1, 0.7, 0.18, K.blue); },
    aircon(D, x, y, z) { D.box(x, y, z, 0.8, 3, 0.9, K.white); D.quad('x', x + 0.8, y + 0.2, z + 0.15, y + 2.8, z + 0.3, K.grey); },
    phone(D, x, y, z) { D.box(x, y, z, 0.5, 0.9, 0.08, K.black); D.quad('z', z + 0.09, x + 0.06, y + 0.08, x + 0.44, y + 0.82, '#4c86d6', { raw: true }); },
    door(D, x, y, z, face) { if (face === 'x') { D.quad('x', x, y, z, y + 2.2, z + 4.8, K.wood, { stroke: K.woodD }); D.dot(x + 0.01, y + 1.9, z + 2.4, 1.6, K.yellow); } else { D.quad('y', y, x, z, x + 2.2, z + 4.8, K.wood, { stroke: K.woodD }); D.dot(x + 1.9, y + 0.01, z + 2.4, 1.6, K.yellow); } },
    bed(D, x, y, z) { D.box(x, y, z, 3.4, 5, 1, K.wood); D.box(x, y, z, 3.4, 0.4, 2.6, K.woodD); D.box(x + 0.1, y + 0.4, z + 1, 3.2, 4.5, 0.5, K.white); D.box(x + 0.1, y + 2, z + 1.5, 3.2, 2.9, 0.25, K.blue); D.box(x + 0.4, y + 0.6, z + 1.5, 1.2, 1, 0.45, '#fff8ea'); D.box(x + 1.8, y + 0.6, z + 1.5, 1.2, 1, 0.45, '#fff8ea'); },
    nightstand(D, x, y, z) { D.box(x, y, z, 1.3, 1.3, 1.6, K.woodL); D.quad('y', y + 1.3, x + 0.12, z + 0.9, x + 1.18, z + 1.45, K.wood); D.quad('y', y + 1.3, x + 0.12, z + 0.15, x + 1.18, z + 0.75, K.wood); },
    pillow(D, x, y, z) { D.box(x, y, z, 1.2, 1, 0.45, '#fff8ea'); },
    blanket(D, x, y, z) { D.box(x, y, z, 3.2, 2.9, 0.25, K.blue); },
    wardrobe(D, x, y, z) { D.box(x, y, z, 1.6, 3.2, 5.6, K.woodL); D.quad('x', x + 1.6, y + 0.15, z + 0.2, y + 1.55, z + 5.4, K.wood); D.quad('x', x + 1.6, y + 1.65, z + 0.2, y + 3.05, z + 5.4, K.wood); D.dot(x + 1.61, y + 1.45, z + 2.8, 1.3, K.yellow); D.dot(x + 1.61, y + 1.75, z + 2.8, 1.3, K.yellow); },
    desk(D, x, y, z) { D.box(x, y, z, 2.6, 1.6, 2.4, K.woodL); D.quad('y', y + 1.6, x + 0.15, z + 1.5, x + 1.2, z + 2.2, K.wood); D.quad('y', y + 1.6, x + 0.15, z + 0.2, x + 1.2, z + 1.35, K.wood); },
    computer(D, x, y, z) { D.box(x + 0.5, y + 0.3, z, 0.4, 0.4, 0.5, K.dark); D.box(x + 0.2, y, z + 0.5, 1.8, 0.15, 1.1, K.dark); D.quad('y', y + 0.15, x + 0.3, z + 0.6, x + 1.9, z + 1.5, '#3b82c4', { raw: true }); D.box(x + 0.1, y + 0.6, z, 1.6, 0.5, 0.06, K.dark, { edge: false }); },
    alarm(D, x, y, z) { D.box(x, y, z, 0.6, 0.35, 0.55, K.red); D.dot(x + 0.3, y + 0.35, z + 0.28, 3.2, K.white); D.ball(x + 0.1, y + 0.17, z + 0.55, 0.1, K.yellow); D.ball(x + 0.5, y + 0.17, z + 0.55, 0.1, K.yellow); },
    curtain(D, x, y, z) { D.quad('x', x, y, z, y + 0.8, z + 3, K.pink, { stroke: shade(K.pink, 0.7) }); D.quad('x', x, y + 2.4, z, y + 3.2, z + 3, K.pink, { stroke: shade(K.pink, 0.7) }); },
    bag(D, x, y, z) { D.box(x, y, z, 1, 0.5, 1, K.orange); D.path([[x + 0.2, y + 0.25, z + 1], [x + 0.5, y + 0.25, z + 1.5], [x + 0.8, y + 0.25, z + 1]], K.dark, { line: true, w: 1.3 }); },
    shoes(D, x, y, z) { D.box(x, y, z, 1, 0.4, 0.3, K.red); D.box(x, y, z + 0.3, 0.45, 0.4, 0.3, K.red); D.box(x, y + 0.55, z, 1, 0.4, 0.3, K.red); D.box(x, y + 0.55, z + 0.3, 0.45, 0.4, 0.3, K.red); },
    hat(D, x, y, z) { D.cyl(x, y, z, 0.7, 0.08, K.yellow); D.cyl(x, y, z + 0.08, 0.42, 0.45, K.yellow); D.cyl(x, y, z + 0.1, 0.43, 0.12, K.red); },
    tshirt(D, x, y, z) { D.box(x, y, z, 0.1, 1.2, 1.4, K.teal); D.box(x, y - 0.4, z + 0.9, 0.1, 0.4, 0.5, K.teal); D.box(x, y + 1.2, z + 0.9, 0.1, 0.4, 0.5, K.teal); },
    // ---- lớp học ----
    blackboard(D, x, y, z) { D.quad('y', y, x, z, x + 6, z + 3, K.woodD, { raw: true }); D.quad('y', y + 0.01, x + 0.15, z + 0.15, x + 5.85, z + 2.85, '#2f5d4a', { raw: true }); D.path([[x + 0.8, y + 0.02, z + 2], [x + 2.4, y + 0.02, z + 2]], '#fff', { line: true, w: 1 }); D.path([[x + 0.8, y + 0.02, z + 1.4], [x + 3.2, y + 0.02, z + 1.4]], '#fff', { line: true, w: 1 }); },
    schooldesk(D, x, y, z) { D.box(x, y, z, 0.18, 0.18, 2, K.steel); D.box(x + 1.8, y, z, 0.18, 0.18, 2, K.steel); D.box(x, y + 1.1, z, 0.18, 0.18, 2, K.steel); D.box(x + 1.8, y + 1.1, z, 0.18, 0.18, 2, K.steel); D.box(x - 0.05, y - 0.05, z + 2, 2.1, 1.4, 0.18, K.woodL); },
    pencil(D, x, y, z) { D.box(x, y, z, 1.1, 0.12, 0.12, K.yellow, { edge: false }); D.box(x + 1.1, y, z, 0.15, 0.12, 0.12, K.pink, { edge: false }); D.path([[x, y, z], [x - 0.25, y + 0.06, z + 0.06], [x, y + 0.12, z + 0.12]], K.woodL); },
    pen(D, x, y, z) { D.box(x, y, z, 1.2, 0.1, 0.1, K.blue, { edge: false }); D.box(x + 0.85, y, z + 0.1, 0.3, 0.1, 0.03, K.navy, { edge: false }); },
    eraser(D, x, y, z) { D.box(x, y, z, 0.6, 0.35, 0.2, K.pink); D.box(x + 0.35, y, z, 0.25, 0.35, 0.2, K.blue); },
    ruler(D, x, y, z) { D.box(x, y, z, 2, 0.35, 0.05, '#bfe3a6'); for (let i = 1; i < 10; i++) D.path([[x + i * 0.2, y, z + 0.06], [x + i * 0.2, y + (i % 5 ? 0.12 : 0.2), z + 0.06]], K.dark, { line: true, w: 0.5 }); },
    schoolbag(D, x, y, z) { D.box(x, y, z, 1.4, 0.8, 1.6, K.red); D.box(x + 0.2, y + 0.8, z + 0.2, 1, 0.2, 0.7, shade(K.red, 1.1)); D.box(x + 0.1, y, z + 1.6, 1.2, 0.8, 0.15, shade(K.red, 0.9)); },
    globe(D, x, y, z) { D.cyl(x, y, z, 0.35, 0.12, K.woodD); D.box(x - 0.04, y - 0.04, z + 0.12, 0.08, 0.08, 0.4, K.woodD); D.ball(x, y, z + 0.4, 0.55, K.blue); D.dot(x - 0.15, y + 0.1, z + 1.0, 3, K.green); D.dot(x + 0.15, y + 0.2, z + 0.75, 2.2, K.green); },
    map(D, x, y, z) { D.quad('x', x, y, z, y + 3, z + 2, '#f5ecd2', { raw: true, stroke: K.woodD }); D.path([[x + 0.01, y + 0.4, z + 0.5], [x + 0.01, y + 1.2, z + 1.6], [x + 0.01, y + 1.6, z + 0.6]], K.green); D.path([[x + 0.01, y + 1.9, z + 1.2], [x + 0.01, y + 2.6, z + 1.7], [x + 0.01, y + 2.7, z + 0.4]], K.orange); },
    // ---- động vật (khối vuông dễ thương) ----
    eyes(D, x, y, z, gap) { D.dot(x, y, z, 1.4, K.black); D.dot(x + (gap || 0.35), y, z, 1.4, K.black); },
    tiger(D, x, y, z) { const o = K.orange; D.box(x, y, z + 0.6, 2.2, 1.1, 1.0, o); [0.4, 1, 1.6].forEach(s => D.quad('y', y + 1.1, x + s, z + 0.65, x + s + 0.18, z + 1.55, K.black)); D.box(x + 2.0, y + 0.05, z + 1.0, 1, 1, 1, o); D.quad('y', y + 1.05, x + 2.15, z + 1.05, x + 2.95, z + 1.4, K.white); D.box(x + 2.1, y + 0.1, z + 2, 0.25, 0.25, 0.25, o); D.box(x + 2.1, y + 0.7, z + 2, 0.25, 0.25, 0.25, o); M.eyes(D, x + 2.3, y + 1.06, z + 1.65); D.dot(x + 2.48, y + 1.06, z + 1.4, 1.5, K.black); [[0.1, 0.1], [1.7, 0.1], [0.1, 0.75], [1.7, 0.75]].forEach(p => D.box(x + p[0], y + p[1], z, 0.3, 0.3, 0.6, o)); D.box(x - 0.7, y + 0.45, z + 1.4, 0.8, 0.2, 0.2, o); },
    monkey(D, x, y, z) { const b = '#9a6b45'; D.box(x, y, z + 0.8, 0.9, 0.9, 1.1, b); D.box(x - 0.05, y - 0.05, z + 1.9, 1, 1, 0.9, b); D.quad('y', y + 0.95, x + 0.15, z + 1.95, x + 0.85, z + 2.55, K.skin); M.eyes(D, x + 0.3, y + 0.96, z + 2.4); D.box(x - 0.25, y + 0.35, z + 2.3, 0.2, 0.3, 0.3, K.skin); D.box(x + 0.95, y + 0.35, z + 2.3, 0.2, 0.3, 0.3, K.skin); D.box(x + 0.1, y + 0.1, z, 0.25, 0.25, 0.8, b); D.box(x + 0.55, y + 0.1, z, 0.25, 0.25, 0.8, b); D.box(x + 0.9, y + 0.35, z + 1.5, 0.9, 0.2, 0.2, b); D.path([[x + 0.3, y + 0.5, z + 1.0], [x - 0.6, y + 0.5, z + 1.2], [x - 0.8, y + 0.5, z + 1.8]], b, { line: true, w: 2.2 }); },
    elephant(D, x, y, z) { const g = '#9ea4ae'; [[0.2, 0.2], [2.0, 0.2], [0.2, 1.3], [2.0, 1.3]].forEach(p => D.box(x + p[0], y + p[1], z, 0.5, 0.5, 1.1, g)); D.box(x, y, z + 1.1, 2.7, 2, 1.7, g); D.box(x + 2.5, y + 0.3, z + 1.6, 1.3, 1.4, 1.4, g); D.box(x + 2.55, y - 0.25, z + 1.8, 0.3, 0.55, 1.1, shade(g, 0.95)); D.box(x + 2.55, y + 1.7, z + 1.8, 0.3, 0.55, 1.1, shade(g, 0.95)); D.box(x + 3.55, y + 0.85, z + 0.4, 0.35, 0.35, 1.4, g); M.eyes(D, x + 2.75, y + 1.71, z + 2.6, 0.6); D.box(x + 3.6, y + 0.45, z + 1.6, 0.4, 0.12, 0.12, K.white, { edge: false }); D.box(x + 3.6, y + 1.3, z + 1.6, 0.4, 0.12, 0.12, K.white, { edge: false }); },
    bear(D, x, y, z) { const b = '#7a4f33'; D.box(x, y, z + 0.5, 1.8, 1.3, 1.3, b); D.box(x + 1.4, y + 0.1, z + 1.2, 1.1, 1.1, 1.1, b); D.box(x + 2.5, y + 0.4, z + 1.35, 0.3, 0.5, 0.4, '#c49a6c'); D.box(x + 1.5, y + 0.1, z + 2.3, 0.3, 0.3, 0.3, b); D.box(x + 1.5, y + 0.9, z + 2.3, 0.3, 0.3, 0.3, b); M.eyes(D, x + 1.75, y + 1.21, z + 1.95); [[0.1, 0.1], [1.3, 0.1], [0.1, 0.9], [1.3, 0.9]].forEach(p => D.box(x + p[0], y + p[1], z, 0.35, 0.35, 0.5, b)); },
    panda(D, x, y, z) { const w = '#f7f7f2', k = K.black; D.box(x, y, z + 0.5, 1.8, 1.4, 1.2, w); D.box(x + 0.7, y, z + 0.5, 0.45, 1.4, 1.2, k); D.box(x + 1.5, y + 0.15, z + 1.0, 1.1, 1.1, 1.1, w); D.box(x + 1.6, y + 0.15, z + 2.1, 0.3, 0.3, 0.3, k); D.box(x + 1.6, y + 0.95, z + 2.1, 0.3, 0.3, 0.3, k); D.quad('y', y + 1.26, x + 1.7, z + 1.45, x + 1.95, z + 1.75, k); D.quad('y', y + 1.26, x + 2.15, z + 1.45, x + 2.4, z + 1.75, k); D.dot(x + 1.83, y + 1.27, z + 1.62, 0.8, '#fff'); D.dot(x + 2.28, y + 1.27, z + 1.62, 0.8, '#fff'); [[0.1, 0.1], [1.3, 0.1], [0.1, 1.0], [1.3, 1.0]].forEach(p => D.box(x + p[0], y + p[1], z, 0.35, 0.35, 0.5, k)); },
    deer(D, x, y, z) { const b = '#c48a52'; [[0.1, 0.1], [1.5, 0.1], [0.1, 0.7], [1.5, 0.7]].forEach(p => D.box(x + p[0], y + p[1], z, 0.22, 0.22, 1.3, b)); D.box(x, y, z + 1.3, 1.9, 1, 0.9, b); [[0.4, 0.2], [1.1, 0.6], [0.6, 0.7]].forEach(p => D.quad('z', z + 2.21, x + p[0], y + p[1], x + p[0] + 0.2, y + p[1] + 0.2, K.white)); D.box(x + 1.6, y + 0.3, z + 2.0, 0.4, 0.4, 0.9, b); D.box(x + 1.6, y + 0.25, z + 2.8, 0.85, 0.5, 0.5, b); M.eyes(D, x + 1.95, y + 0.76, z + 3.1, 0.25); D.path([[x + 1.75, y + 0.3, z + 3.3], [x + 1.6, y + 0.1, z + 4.0], [x + 1.4, y - 0.1, z + 4.2]], '#6b4a2a', { line: true, w: 1.4 }); D.path([[x + 1.75, y + 0.7, z + 3.3], [x + 1.6, y + 0.9, z + 4.0], [x + 1.4, y + 1.1, z + 4.2]], '#6b4a2a', { line: true, w: 1.4 }); },
    rabbit(D, x, y, z) { const w = '#f4f1ea'; D.box(x, y, z, 0.9, 0.7, 0.7, w); D.box(x + 0.6, y + 0.05, z + 0.5, 0.6, 0.6, 0.6, w); D.box(x + 0.7, y + 0.1, z + 1.1, 0.15, 0.15, 0.7, w); D.box(x + 0.7, y + 0.42, z + 1.1, 0.15, 0.15, 0.7, w); D.quad('y', y + 0.58, x + 0.71, z + 1.2, x + 0.84, z + 1.7, K.pink); M.eyes(D, x + 0.8, y + 0.66, z + 0.85, 0.2); D.ball(x - 0.15, y + 0.35, z + 0.3, 0.18, '#ffffff'); },
    snake(D, x, y, z) { const g = '#6cbf4e'; D.path([[x, y, z + 0.1], [x + 0.8, y + 0.6, z + 0.1], [x + 0.2, y + 1.3, z + 0.1], [x + 1.0, y + 1.9, z + 0.1], [x + 1.8, y + 1.5, z + 0.1]], g, { line: true, w: 5 }); D.box(x + 1.7, y + 1.3, z, 0.55, 0.45, 0.35, g); M.eyes(D, x + 2.1, y + 1.76, z + 0.27, 0.0); D.path([[x + 2.25, y + 1.52, z + 0.1], [x + 2.6, y + 1.55, z + 0.1]], K.red, { line: true, w: 0.8 }); },
    bird(D, x, y, z, c) { c = c || K.blue; D.box(x, y, z, 0.7, 0.5, 0.5, c); D.box(x + 0.5, y + 0.05, z + 0.4, 0.4, 0.4, 0.4, c); D.path([[x + 0.9, y + 0.2, z + 0.6], [x + 1.15, y + 0.25, z + 0.55], [x + 0.9, y + 0.3, z + 0.5]], K.orange); D.dot(x + 0.75, y + 0.46, z + 0.67, 1, K.black); D.path([[x + 0.1, y + 0.5, z + 0.45], [x + 0.45, y + 0.9, z + 0.6], [x + 0.55, y + 0.5, z + 0.45]], shade(c, 0.8)); },
    fox(D, x, y, z) { const o = '#e8792f'; D.box(x, y, z + 0.5, 1.5, 0.8, 0.7, o); D.box(x + 1.3, y + 0.05, z + 0.8, 0.75, 0.7, 0.7, o); D.box(x + 2.05, y + 0.25, z + 0.85, 0.35, 0.3, 0.3, K.white); D.path([[x + 1.4, y + 0.1, z + 1.5], [x + 1.55, y + 0.25, z + 2.0], [x + 1.7, y + 0.35, z + 1.5]], o, { stroke: shade(o, 0.6) }); D.path([[x + 1.4, y + 0.45, z + 1.5], [x + 1.55, y + 0.6, z + 2.0], [x + 1.7, y + 0.75, z + 1.5]], o, { stroke: shade(o, 0.6) }); M.eyes(D, x + 1.55, y + 0.76, z + 1.25, 0.3); D.box(x - 0.9, y + 0.25, z + 0.8, 1, 0.35, 0.35, o); D.box(x - 1.2, y + 0.25, z + 0.8, 0.3, 0.35, 0.35, K.white); [[0.1, 0.1], [1.1, 0.1], [0.1, 0.5], [1.1, 0.5]].forEach(p => D.box(x + p[0], y + p[1], z, 0.2, 0.2, 0.5, K.black)); },
    squirrel(D, x, y, z) { const b = '#b0703a'; D.box(x, y, z, 0.7, 0.55, 0.9, b); D.box(x + 0.4, y + 0.02, z + 0.7, 0.55, 0.5, 0.5, b); M.eyes(D, x + 0.6, y + 0.53, z + 1.0, 0.2); D.box(x + 0.5, y + 0.05, z + 1.2, 0.12, 0.12, 0.2, b); D.box(x - 0.55, y + 0.05, z + 0.2, 0.5, 0.45, 1.5, '#c98a4f'); D.box(x - 0.45, y + 0.05, z + 1.7, 0.6, 0.45, 0.35, '#c98a4f'); D.ball(x + 1.0, y + 0.3, z + 0.35, 0.18, '#7a4a25'); },
    owl(D, x, y, z) { const b = '#9b7653'; D.box(x, y, z, 0.8, 0.7, 1.2, b); D.quad('y', y + 0.7, x + 0.1, z + 0.1, x + 0.7, z + 0.7, '#e8d5b5'); D.dot(x + 0.22, y + 0.71, z + 0.95, 3, '#fff'); D.dot(x + 0.58, y + 0.71, z + 0.95, 3, '#fff'); D.dot(x + 0.22, y + 0.72, z + 0.95, 1.6, K.black); D.dot(x + 0.58, y + 0.72, z + 0.95, 1.6, K.black); D.path([[x + 0.35, y + 0.72, z + 0.82], [x + 0.4, y + 0.72, z + 0.7], [x + 0.45, y + 0.72, z + 0.82]], K.orange); D.box(x, y, z + 1.2, 0.2, 0.2, 0.25, b); D.box(x + 0.6, y, z + 1.2, 0.2, 0.2, 0.25, b); },
    // ---- trang trại ----
    cow(D, x, y, z) { const w = '#f7f5ee'; [[0.1, 0.1], [1.8, 0.1], [0.1, 0.9], [1.8, 0.9]].forEach(p => D.box(x + p[0], y + p[1], z, 0.3, 0.3, 1, w)); D.box(x, y, z + 1, 2.3, 1.3, 1.2, w); D.quad('y', y + 1.3, x + 0.3, z + 1.3, x + 1.0, z + 1.9, K.black); D.quad('z', z + 2.21, x + 1.2, y + 0.2, x + 1.8, y + 0.8, K.black); D.box(x + 2.1, y + 0.2, z + 1.6, 0.9, 0.9, 0.9, w); D.box(x + 2.8, y + 0.3, z + 1.6, 0.35, 0.7, 0.4, K.pink); D.box(x + 2.3, y + 0.05, z + 2.5, 0.15, 0.2, 0.3, '#e9dcc0'); D.box(x + 2.3, y + 0.85, z + 2.5, 0.15, 0.2, 0.3, '#e9dcc0'); M.eyes(D, x + 2.35, y + 1.11, z + 2.25, 0.4); },
    pig(D, x, y, z) { const p = '#f4a7b9'; [[0.1, 0.1], [1.2, 0.1], [0.1, 0.7], [1.2, 0.7]].forEach(q => D.box(x + q[0], y + q[1], z, 0.3, 0.3, 0.4, p)); D.box(x, y, z + 0.4, 1.6, 1.1, 1, p); D.box(x + 1.5, y + 0.15, z + 0.6, 0.7, 0.8, 0.8, p); D.box(x + 2.2, y + 0.35, z + 0.75, 0.2, 0.4, 0.3, shade(p, 0.85)); D.dot(x + 2.41, y + 0.48, z + 0.9, 0.9, '#a35b6c'); D.dot(x + 2.41, y + 0.64, z + 0.9, 0.9, '#a35b6c'); M.eyes(D, x + 1.75, y + 0.96, z + 1.2, 0.3); },
    chicken(D, x, y, z) { const w = '#fbfaf5'; D.box(x, y, z + 0.3, 0.8, 0.6, 0.6, w); D.box(x + 0.55, y + 0.1, z + 0.8, 0.4, 0.4, 0.45, w); D.box(x + 0.62, y + 0.17, z + 1.25, 0.25, 0.25, 0.15, K.red); D.path([[x + 0.95, y + 0.25, z + 1.05], [x + 1.15, y + 0.3, z + 1.0], [x + 0.95, y + 0.35, z + 0.95]], K.orange); D.dot(x + 0.8, y + 0.51, z + 1.08, 1, K.black); D.box(x + 0.3, y + 0.2, z, 0.08, 0.08, 0.3, K.orange, { edge: false }); D.box(x + 0.5, y + 0.3, z, 0.08, 0.08, 0.3, K.orange, { edge: false }); D.box(x - 0.15, y + 0.15, z + 0.7, 0.2, 0.3, 0.35, w); },
    duck(D, x, y, z) { const y1 = K.yellow; D.box(x, y, z, 0.9, 0.6, 0.5, y1); D.box(x + 0.6, y + 0.1, z + 0.45, 0.4, 0.4, 0.45, y1); D.box(x + 1.0, y + 0.2, z + 0.55, 0.3, 0.2, 0.12, K.orange); D.dot(x + 0.85, y + 0.51, z + 0.75, 1, K.black); },
    horse(D, x, y, z) { const b = '#8a5a3b'; [[0.1, 0.1], [1.9, 0.1], [0.1, 0.7], [1.9, 0.7]].forEach(p => D.box(x + p[0], y + p[1], z, 0.25, 0.25, 1.5, b)); D.box(x, y, z + 1.5, 2.3, 1, 1, b); D.box(x + 1.9, y + 0.25, z + 2.2, 0.5, 0.5, 1.2, b); D.box(x + 2.0, y + 0.25, z + 3.0, 0.95, 0.5, 0.5, b); D.box(x + 1.75, y + 0.35, z + 2.4, 0.2, 0.3, 1.3, K.black); D.box(x - 0.2, y + 0.4, z + 1.6, 0.25, 0.2, 0.9, K.black); M.eyes(D, x + 2.4, y + 0.76, z + 3.3, 0.0); },
    sheep(D, x, y, z) { const w = '#f2efe6'; [[0.1, 0.1], [1.1, 0.1], [0.1, 0.7], [1.1, 0.7]].forEach(p => D.box(x + p[0], y + p[1], z, 0.2, 0.2, 0.5, K.dark)); D.ball(x + 0.3, y + 0.5, z + 0.4, 0.55, w); D.ball(x + 0.9, y + 0.5, z + 0.45, 0.55, w); D.ball(x + 0.6, y + 0.3, z + 0.7, 0.5, w); D.box(x + 1.35, y + 0.3, z + 0.8, 0.5, 0.45, 0.5, K.dark); M.eyes(D, x + 1.55, y + 0.76, z + 1.1, 0.15); },
    dog(D, x, y, z) { const b = '#d8a25e'; [[0.1, 0.1], [1.0, 0.1], [0.1, 0.55], [1.0, 0.55]].forEach(p => D.box(x + p[0], y + p[1], z, 0.22, 0.22, 0.5, b)); D.box(x, y, z + 0.5, 1.4, 0.8, 0.6, b); D.box(x + 1.15, y + 0.05, z + 0.8, 0.7, 0.7, 0.65, b); D.box(x + 1.85, y + 0.2, z + 0.85, 0.3, 0.4, 0.3, '#f3dcb5'); D.dot(x + 2.16, y + 0.4, z + 1.08, 1.4, K.black); D.box(x + 1.25, y - 0.1, z + 1.0, 0.25, 0.15, 0.5, '#8a5a30'); D.box(x + 1.25, y + 0.75, z + 1.0, 0.25, 0.15, 0.5, '#8a5a30'); M.eyes(D, x + 1.55, y + 0.76, z + 1.25, 0.25); D.box(x - 0.35, y + 0.3, z + 1.0, 0.4, 0.15, 0.15, b); },
    cat(D, x, y, z) { const g = '#9aa0a8'; D.box(x, y, z, 1.1, 0.65, 0.65, g); D.box(x + 0.8, y + 0.03, z + 0.45, 0.6, 0.6, 0.55, g); D.path([[x + 0.85, y + 0.08, z + 1.0], [x + 0.95, y + 0.15, z + 1.3], [x + 1.05, y + 0.25, z + 1.0]], g); D.path([[x + 0.85, y + 0.4, z + 1.0], [x + 0.95, y + 0.5, z + 1.3], [x + 1.05, y + 0.6, z + 1.0]], g); M.eyes(D, x + 1.0, y + 0.64, z + 0.8, 0.25); D.path([[x, y + 0.3, z + 0.4], [x - 0.4, y + 0.3, z + 0.7], [x - 0.5, y + 0.3, z + 1.2]], g, { line: true, w: 2.4 }); },
    barn(D, x, y, z) { const r = '#c94a3c', base = x + y + 6; D.box(x, y, z, 4, 3.4, 3, r, { depth: base }); D.quad('y', y + 3.4, x + 1.3, z, x + 2.7, z + 2.2, '#f2e3c8', { depth: base + 0.1 }); D.path([[x + 1.3, y + 3.41, z], [x + 2.7, y + 3.41, z + 2.2]], r, { line: true, w: 1.5, depth: base + 0.2 }); D.path([[x + 2.7, y + 3.41, z], [x + 1.3, y + 3.41, z + 2.2]], r, { line: true, w: 1.5, depth: base + 0.2 });
      D.path([[x - 0.2, y - 0.2, z + 3], [x - 0.2, y + 3.6, z + 3], [x + 2, y + 3.6, z + 4.7], [x + 2, y - 0.2, z + 4.7]], '#6e4f40', { depth: base + 0.3, stroke: '#4a3329' }); D.path([[x + 4.2, y - 0.2, z + 3], [x + 4.2, y + 3.6, z + 3], [x + 2, y + 3.6, z + 4.7], [x + 2, y - 0.2, z + 4.7]], '#8a6553', { depth: base + 0.4, stroke: '#4a3329' }); D.path([[x, y + 3.4, z + 3], [x + 4, y + 3.4, z + 3], [x + 2, y + 3.4, z + 4.55]], shade(r, 0.86), { depth: base + 0.5, stroke: shade(r, 0.62) }); D.dot(x + 2, y + 3.41, z + 3.6, 3, '#f2e3c8', { depth: base + 0.6 }); },
    fence(D, x, y, z, n) { n = n || 6; for (let i = 0; i < n; i++) D.box(x + i * 0.7, y, z, 0.2, 0.2, 1.2, '#e9d3a8'); D.box(x, y + 0.02, z + 0.8, (n - 1) * 0.7 + 0.2, 0.12, 0.18, '#e9d3a8'); D.box(x, y + 0.02, z + 0.3, (n - 1) * 0.7 + 0.2, 0.12, 0.18, '#e9d3a8'); },
    hay(D, x, y, z) { D.cyl(x, y, z, 0.8, 1.1, '#e6c255'); D.disc(x, y, z + 1.11, 0.5, '#d9b03d', { stroke: false }); },
    tractor(D, x, y, z) { D.box(x, y + 0.3, z + 0.6, 2.2, 1.4, 0.9, K.green); D.box(x + 0.2, y + 0.4, z + 1.5, 1, 1.2, 1.1, K.green); D.quad('y', y + 1.6, x + 0.3, z + 1.7, x + 1.1, z + 2.4, K.sky, { raw: true }); D.dot(x + 0.5, y + 1.75, z + 0.8, 11, K.dark); D.dot(x + 0.5, y + 1.75, z + 0.8, 4, K.yellow); D.dot(x + 1.9, y + 1.75, z + 0.5, 7, K.dark); D.dot(x + 1.9, y + 1.75, z + 0.5, 2.5, K.yellow); D.box(x + 1.7, y + 0.6, z + 1.5, 0.15, 0.15, 0.7, K.dark); },
    // ---- dưới biển ----
    fish(D, x, y, z, c) { c = c || K.orange; D.box(x, y, z, 1.4, 0.5, 0.85, c); D.quad('y', y + 0.5, x + 0.5, z + 0.05, x + 0.7, z + 0.8, '#ffffff'); D.path([[x, y + 0.25, z + 0.42], [x - 0.6, y + 0.25, z + 0.95], [x - 0.6, y + 0.25, z - 0.1]], shade(c, 0.85), { stroke: shade(c, 0.6) }); D.path([[x + 0.5, y + 0.25, z + 0.85], [x + 0.8, y + 0.25, z + 1.2], [x + 1.0, y + 0.25, z + 0.85]], shade(c, 0.85)); D.dot(x + 1.15, y + 0.51, z + 0.6, 1.6, K.black); },
    coral(D, x, y, z) { const c = '#f27a8a'; [[0, 0, 1.6], [0.4, 0.2, 1.1], [-0.3, 0.3, 1.2]].forEach(p => { D.cyl(x + p[0], y + p[1], z, 0.12, p[2], c); D.ball(x + p[0], y + p[1], z + p[2] - 0.1, 0.18, shade(c, 1.1)); }); D.path([[x, y, z + 0.9], [x + 0.5, y - 0.1, z + 1.4]], c, { line: true, w: 2.6 }); },
    shark(D, x, y, z) { const g = '#7f95a8'; D.box(x, y, z, 2.6, 0.8, 0.8, g); D.box(x + 2.5, y + 0.1, z + 0.1, 0.6, 0.6, 0.6, g); D.quad('y', y + 0.8, x + 0.3, z + 0.05, x + 2.9, z + 0.3, '#e9eef2'); D.path([[x + 1.1, y + 0.4, z + 0.8], [x + 1.5, y + 0.4, z + 1.5], [x + 1.8, y + 0.4, z + 0.8]], g, { stroke: shade(g, 0.6) }); D.path([[x, y + 0.4, z + 0.4], [x - 0.6, y + 0.4, z + 1.0], [x - 0.5, y + 0.4, z - 0.2]], g, { stroke: shade(g, 0.6) }); D.dot(x + 2.85, y + 0.71, z + 0.55, 1.2, K.black); },
    dolphin(D, x, y, z) { const b = '#6aa7d6'; D.box(x, y, z, 2, 0.6, 0.65, b); D.box(x + 1.9, y + 0.1, z + 0.1, 0.5, 0.4, 0.45, b); D.box(x + 2.4, y + 0.2, z + 0.15, 0.35, 0.2, 0.18, b); D.path([[x + 0.8, y + 0.3, z + 0.65], [x + 1.0, y + 0.3, z + 1.1], [x + 1.3, y + 0.3, z + 0.65]], b, { stroke: shade(b, 0.6) }); D.path([[x, y + 0.3, z + 0.3], [x - 0.45, y + 0.3, z + 0.75], [x - 0.45, y + 0.3, z - 0.1]], b, { stroke: shade(b, 0.6) }); D.quad('y', y + 0.6, x + 0.3, z + 0.02, x + 2.2, z + 0.25, '#e3f1fa'); D.dot(x + 2.2, y + 0.51, z + 0.4, 1.1, K.black); },
    octopus(D, x, y, z) { const p = '#c86cc9'; D.ball(x, y, z + 0.6, 0.6, p); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; D.path([[x + Math.cos(a) * 0.3, y + Math.sin(a) * 0.3, z + 0.6], [x + Math.cos(a) * 0.9, y + Math.sin(a) * 0.9, z + 0.15], [x + Math.cos(a + 0.4) * 1.2, y + Math.sin(a + 0.4) * 1.2, z + 0.2]], p, { line: true, w: 2.4 }); } M.eyes(D, x + 0.15, y + 0.55, z + 1.35, 0.3); },
    crab(D, x, y, z) { const r = '#e2513d'; D.box(x, y, z + 0.2, 1, 0.8, 0.4, r); D.box(x + 1.05, y - 0.35, z + 0.35, 0.4, 0.35, 0.3, r); D.box(x + 1.05, y + 0.8, z + 0.35, 0.4, 0.35, 0.3, r); [0.15, 0.45, 0.75].forEach(s => { D.box(x + s, y - 0.25, z, 0.1, 0.25, 0.25, r, { edge: false }); D.box(x + s, y + 0.8, z, 0.1, 0.25, 0.25, r, { edge: false }); }); D.box(x + 0.75, y + 0.2, z + 0.6, 0.1, 0.1, 0.25, r); D.box(x + 0.75, y + 0.5, z + 0.6, 0.1, 0.1, 0.25, r); D.ball(x + 0.8, y + 0.25, z + 0.8, 0.08, '#fff'); D.ball(x + 0.8, y + 0.55, z + 0.8, 0.08, '#fff'); },
    turtle(D, x, y, z) { const g = '#5a9e5a'; D.cyl(x, y, z + 0.15, 0.85, 0.3, '#8bbf6a'); D.ball(x, y, z + 0.1, 0.62, g); D.box(x + 0.75, y - 0.15, z + 0.15, 0.55, 0.35, 0.3, '#a8d18a'); D.dot(x + 1.2, y + 0.2, z + 0.4, 1, K.black); [[0.4, 0.6], [0.4, -0.75], [-0.6, 0.6], [-0.6, -0.75]].forEach(p => D.box(x + p[0], y + p[1], z, 0.3, 0.2, 0.15, '#a8d18a', { edge: false })); },
    starfish(D, x, y, z) { const o = '#f59a5a'; const p = []; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 0.28 : 0.7; p.push([x + Math.cos(a) * r, y + Math.sin(a) * r, z + 0.05]); } D.path(p, o, { stroke: shade(o, 0.6) }); },
    whale(D, x, y, z) { const b = '#4a6fa5'; D.box(x, y, z, 3.6, 1.4, 1.3, b); D.box(x + 3.4, y + 0.1, z + 0.1, 0.6, 1.2, 0.9, b); D.quad('y', y + 1.4, x + 0.5, z + 0.02, x + 3.8, z + 0.45, '#cfe0f0'); D.path([[x, y + 0.7, z + 0.6], [x - 0.9, y + 0.7, z + 1.4], [x - 0.9, y + 0.7, z - 0.1]], b, { stroke: shade(b, 0.6) }); D.dot(x + 3.3, y + 1.41, z + 0.8, 1.5, K.black); D.path([[x + 2.5, y + 0.7, z + 1.3], [x + 2.3, y + 0.7, z + 2.0], [x + 2.6, y + 0.7, z + 2.3]], '#bfe3f7', { line: true, w: 1.6 }); D.path([[x + 2.5, y + 0.7, z + 1.3], [x + 2.8, y + 0.7, z + 2.0], [x + 2.6, y + 0.7, z + 2.3]], '#bfe3f7', { line: true, w: 1.6 }); },
    shell(D, x, y, z) { D.cone(x, y, z, 0.45, 0.4, '#f2c6a8'); D.ball(x - 0.05, y + 0.05, z, 0.2, '#f7dcc8'); },
    jellyfish(D, x, y, z) { const p = '#f2a3d1'; D.ball(x, y, z, 0.5, p); for (let i = 0; i < 4; i++) D.path([[x - 0.3 + i * 0.2, y, z + 0.2], [x - 0.35 + i * 0.2, y, z - 0.4], [x - 0.25 + i * 0.2, y, z - 0.9]], p, { line: true, w: 1.2 }); },
    seaweed(D, x, y, z) { [[0, 0, 2.6], [0.4, 0.2, 1.9], [-0.4, 0.3, 2.2], [0.2, 0.6, 1.5]].forEach(p => D.path([[x + p[0], y + p[1], z], [x + p[0] + 0.2, y + p[1], z + p[2] * 0.33], [x + p[0] - 0.15, y + p[1], z + p[2] * 0.66], [x + p[0] + 0.1, y + p[1], z + p[2]]], '#3f9a5a', { line: true, w: 3.2 })); },
    boat(D, x, y, z) { D.path([[x, y, z + 0.6], [x + 3, y, z + 0.6], [x + 3.6, y + 0.6, z + 0.6], [x + 3, y + 1.2, z + 0.6], [x, y + 1.2, z + 0.6]], '#f0ece0', { stroke: '#8a7c64' }); D.box(x + 0.2, y + 0.15, z, 2.6, 0.9, 0.6, K.red); D.box(x + 1.3, y + 0.55, z + 0.6, 0.12, 0.12, 2.6, K.woodD); D.path([[x + 1.4, y + 0.6, z + 3.1], [x + 1.4, y + 0.6, z + 0.9], [x + 2.9, y + 0.6, z + 1.0]], '#fffaf0', { stroke: '#bbb' }); },
    // ---- đường phố ----
    car(D, x, y, z, c) { c = c || K.red; D.box(x, y, z + 0.3, 3, 1.5, 0.8, c); D.box(x + 0.7, y + 0.1, z + 1.1, 1.6, 1.3, 0.7, c); D.quad('y', y + 1.4, x + 0.8, z + 1.15, x + 2.2, z + 1.7, '#bfe3f5', { raw: true }); D.quad('x', x + 2.3, y + 0.2, z + 1.15, y + 1.3, z + 1.7, '#9dd0ee', { raw: true }); [[0.6, 1.5], [2.4, 1.5]].forEach(p => { D.dot(x + p[0], y + p[1], z + 0.3, 6, K.black); D.dot(x + p[0], y + p[1], z + 0.3, 2.4, K.grey); }); D.quad('x', x + 3, y + 0.15, z + 0.75, y + 0.45, z + 0.95, K.yellow, { raw: true }); D.quad('x', x + 3, y + 1.05, z + 0.75, y + 1.35, z + 0.95, K.yellow, { raw: true }); },
    taxi(D, x, y, z) { M.car(D, x, y, z, K.yellow); D.box(x + 1.3, y + 0.55, z + 1.8, 0.4, 0.4, 0.25, K.white); },
    bus(D, x, y, z) { const c = '#3f8fd8'; D.box(x, y, z + 0.35, 5.6, 1.9, 2.2, c); D.box(x, y, z + 2.55, 5.6, 1.9, 0.15, K.white); for (let i = 0; i < 4; i++) D.quad('y', y + 1.9, x + 0.3 + i * 1.3, z + 1.4, x + 1.4 + i * 1.3, z + 2.3, '#cdeaf9', { raw: true }); D.quad('x', x + 5.6, y + 0.2, z + 1.2, y + 1.7, z + 2.3, '#9dd0ee', { raw: true }); [[0.9, 1.9], [4.5, 1.9]].forEach(p => { D.dot(x + p[0], y + p[1], z + 0.35, 6.5, K.black); D.dot(x + p[0], y + p[1], z + 0.35, 2.6, K.grey); }); },
    bicycle(D, x, y, z) { const c = K.teal; [[0, 0.6], [1.6, 0.6]].forEach(p => { D.dot(x + p[0], y + p[1], z + 0.6, 7.5, K.dark); D.dot(x + p[0], y + p[1], z + 0.6, 6, '#f5f2ea'); }); D.path([[x, y + 0.6, z + 0.6], [x + 0.6, y + 0.6, z + 1.3], [x + 1.4, y + 0.6, z + 1.3], [x + 1.6, y + 0.6, z + 0.6], [x + 0.8, y + 0.6, z + 0.6], [x + 0.6, y + 0.6, z + 1.3]], c, { line: true, w: 1.6 }); D.path([[x + 1.4, y + 0.6, z + 1.3], [x + 1.5, y + 0.6, z + 1.7]], c, { line: true, w: 1.6 }); D.path([[x + 1.4, y + 0.4, z + 1.75], [x + 1.6, y + 0.8, z + 1.75]], K.dark, { line: true, w: 1.6 }); D.box(x + 0.45, y + 0.5, z + 1.35, 0.4, 0.2, 0.1, K.dark, { edge: false }); },
    motorbike(D, x, y, z) { [[0, 0.5], [1.8, 0.5]].forEach(p => { D.dot(x + p[0], y + p[1], z + 0.55, 7, K.black); D.dot(x + p[0], y + p[1], z + 0.55, 2.8, K.grey); }); D.box(x + 0.3, y + 0.3, z + 0.6, 1.3, 0.4, 0.6, K.red); D.box(x + 0.2, y + 0.3, z + 1.2, 0.9, 0.4, 0.2, K.dark); D.path([[x + 1.6, y + 0.5, z + 0.6], [x + 1.7, y + 0.5, z + 1.6]], K.dark, { line: true, w: 1.6 }); D.path([[x + 1.7, y + 0.2, z + 1.65], [x + 1.7, y + 0.8, z + 1.65]], K.dark, { line: true, w: 1.6 }); },
    truck(D, x, y, z) { D.box(x, y, z + 0.4, 3.6, 1.8, 2.4, '#e8eaee'); D.box(x + 3.7, y + 0.1, z + 0.4, 1.4, 1.6, 1.8, K.orange); D.quad('x', x + 5.1, y + 0.25, z + 1.3, y + 1.55, z + 2.0, '#9dd0ee', { raw: true }); [[0.7, 1.8], [2.6, 1.8], [4.4, 1.7]].forEach(p => { D.dot(x + p[0], y + p[1], z + 0.4, 6.5, K.black); D.dot(x + p[0], y + p[1], z + 0.4, 2.6, K.grey); }); },
    ambulance(D, x, y, z) { D.box(x, y, z + 0.35, 3.8, 1.7, 1.9, K.white); D.quad('y', y + 1.7, x + 1.3, z + 0.9, x + 1.9, z + 1.9, K.red); D.quad('y', y + 1.7, x + 1.05, z + 1.15, x + 2.15, z + 1.65, K.red); D.box(x + 1.6, y + 0.65, z + 2.25, 0.5, 0.4, 0.25, K.blue); D.quad('x', x + 3.8, y + 0.2, z + 1.2, y + 1.5, z + 2.0, '#9dd0ee', { raw: true }); [[0.7, 1.7], [3.0, 1.7]].forEach(p => { D.dot(x + p[0], y + p[1], z + 0.35, 6, K.black); D.dot(x + p[0], y + p[1], z + 0.35, 2.4, K.grey); }); },
    trafficlight(D, x, y, z) { D.box(x, y, z, 0.2, 0.2, 3.6, K.dark); D.box(x - 0.1, y - 0.15, z + 3.6, 0.4, 0.5, 1.5, K.black); [[K.red, 4.75], [K.yellow, 4.35], [K.green, 3.95]].forEach(l => D.dot(x + 0.1, y + 0.35, z + l[1], 2.6, l[0])); },
    busstop(D, x, y, z) { D.box(x, y, z, 0.15, 0.15, 3.4, K.steel); D.box(x + 2.6, y, z, 0.15, 0.15, 3.4, K.steel); D.box(x - 0.2, y - 0.3, z + 3.4, 3.15, 1.2, 0.15, K.blue); D.box(x + 0.3, y + 0.1, z + 1.0, 2.1, 0.5, 0.15, K.woodL); D.quad('y', y + 0.15, x + 0.1, z + 1.5, x + 2.6, z + 3.2, '#d7eef8', { raw: true }); },
    building(D, x, y, z, h, c) { h = h || 8; c = c || '#d7c4a8'; D.box(x, y, z, 3, 3, h, c); for (let f = 1; f < h - 0.5; f += 1.5) for (let i = 0; i < 2; i++) { D.quad('y', y + 3, x + 0.4 + i * 1.4, z + f, x + 1.2 + i * 1.4, z + f + 0.9, '#9fd0ef', { raw: true }); D.quad('x', x + 3, y + 0.4 + i * 1.4, z + f, y + 1.2 + i * 1.4, z + f + 0.9, '#7fb6d9', { raw: true }); } },
    zebra(D, x, y, z) { for (let i = 0; i < 5; i++) D.box(x + i * 0.7, y, z, 0.4, 2.6, 0.03, K.white, { edge: false, depth: -50 }); },
    // ---- chợ trái cây & rau ----
    crate(D, x, y, z) { D.box(x, y, z, 1.6, 1.4, 0.7, '#d9a86a'); D.quad('y', y + 1.4, x + 0.1, z + 0.32, x + 1.5, z + 0.4, '#b98450'); },
    apples(D, x, y, z) { M.crate(D, x, y, z); [[0.35, 0.35], [0.85, 0.35], [1.3, 0.4], [0.5, 0.9], [1.0, 1.0]].forEach(p => D.ball(x + p[0], y + p[1], z + 0.55, 0.28, K.red)); },
    oranges(D, x, y, z) { M.crate(D, x, y, z); [[0.35, 0.35], [0.85, 0.35], [1.3, 0.4], [0.5, 0.9], [1.0, 1.0]].forEach(p => D.ball(x + p[0], y + p[1], z + 0.55, 0.28, K.orange)); },
    bananas(D, x, y, z) { [0, 0.25, 0.5].forEach(o => D.path([[x, y + o, z + 0.3], [x + 0.5, y + o + 0.1, z + 0.1], [x + 1.2, y + o, z + 0.15], [x + 1.5, y + o - 0.1, z + 0.45]], K.yellow, { line: true, w: 4.5 })); D.box(x - 0.15, y, z + 0.25, 0.2, 0.6, 0.15, '#8a6a30', { edge: false }); },
    watermelon(D, x, y, z) { D.ball(x, y, z, 0.75, '#3f8f3a'); D.path([[x + 0.6, y - 0.3, z + 0.3], [x + 1.4, y - 0.3, z + 0.3], [x + 1.0, y - 0.3, z + 0.9]], '#e94b55', { stroke: '#3f8f3a' }); },
    grapes(D, x, y, z) { [[0, 0, 0.6], [0.25, 0, 0.6], [0.12, 0.15, 0.4], [-0.1, 0.1, 0.4], [0.35, 0.1, 0.4], [0.12, 0.05, 0.2]].forEach(p => D.ball(x + p[0], y + p[1], z + p[2], 0.17, K.purple)); D.box(x + 0.1, y, z + 0.95, 0.06, 0.06, 0.25, K.leaf, { edge: false }); },
    mango(D, x, y, z) { D.ball(x, y, z, 0.38, '#f6b93b'); D.ball(x + 0.55, y + 0.2, z, 0.35, '#f0a030'); },
    pineapple(D, x, y, z) { D.cyl(x, y, z, 0.42, 1.0, '#e0a53a'); D.cone(x, y, z + 1.0, 0.35, 0.8, K.leaf); },
    carrot(D, x, y, z) { [0, 0.35].forEach(o => { D.path([[x, y + o, z + 0.15], [x + 1.1, y + o + 0.06, z + 0.08], [x, y + o + 0.12, z + 0.0]], K.orange, { stroke: shade(K.orange, 0.7) }); D.path([[x, y + o + 0.06, z + 0.1], [x - 0.4, y + o + 0.06, z + 0.4]], K.leaf, { line: true, w: 2 }); }); },
    tomato(D, x, y, z) { D.ball(x, y, z, 0.32, '#e8473f'); D.ball(x + 0.55, y + 0.15, z, 0.3, '#e8473f'); D.dot(x, y, z + 0.66, 1.6, K.leaf); },
    cabbage(D, x, y, z) { D.ball(x, y, z, 0.6, '#a6d36a'); D.ball(x - 0.1, y - 0.1, z + 0.25, 0.42, '#c4e48e'); },
    potato(D, x, y, z) { D.ball(x, y, z, 0.3, '#c99a5b'); D.ball(x + 0.45, y + 0.25, z, 0.26, '#c49050'); D.ball(x + 0.15, y + 0.5, z, 0.24, '#cfa266'); },
    corn(D, x, y, z) { D.path([[x, y, z + 0.2], [x + 1.2, y, z + 0.2]], '#f3cf4a', { line: true, w: 6 }); D.path([[x - 0.1, y, z + 0.2], [x + 0.5, y + 0.25, z + 0.1]], K.green, { line: true, w: 3 }); },
    eggplant(D, x, y, z) { D.path([[x, y, z + 0.2], [x + 1.0, y + 0.1, z + 0.25]], '#6b3f8f', { line: true, w: 7 }); D.box(x - 0.2, y - 0.05, z + 0.15, 0.25, 0.15, 0.12, K.leaf, { edge: false }); },
    chili(D, x, y, z) { [0, 0.25, 0.5].forEach(o => D.path([[x, y + o, z + 0.1], [x + 0.5, y + o, z + 0.15], [x + 0.75, y + o + 0.1, z + 0.05]], '#d63a2f', { line: true, w: 3 })); },
    stall(D, x, y, z) { D.box(x, y, z, 6, 2.2, 1.6, K.woodL); D.box(x, y, z, 0.2, 0.2, 4.2, K.woodD); D.box(x + 5.8, y, z, 0.2, 0.2, 4.2, K.woodD); D.path([[x - 0.3, y - 0.4, z + 4.2], [x + 6.3, y - 0.4, z + 4.2], [x + 6.3, y + 1.4, z + 3.6], [x - 0.3, y + 1.4, z + 3.6]], '#f1e5c9', { depth: x + y + 1 + 9, stroke: '#d7c6a0' }); for (let i = 0; i < 6; i++) D.path([[x - 0.3 + i * 1.1, y - 0.4, z + 4.2], [x + 0.25 + i * 1.1, y - 0.4, z + 4.2], [x + 0.25 + i * 1.1, y + 1.4, z + 3.6], [x - 0.3 + i * 1.1, y + 1.4, z + 3.6]], K.red, { depth: x + y + 1 + 9.01 }); },
    // ---- vườn / công viên ----
    tree(D, x, y, z) { D.box(x - 0.2, y - 0.2, z, 0.4, 0.4, 2.2, '#8a5a35'); D.ball(x, y, z + 1.8, 1.2, K.leaf); D.ball(x - 0.6, y + 0.4, z + 2.2, 0.8, K.green); D.ball(x + 0.5, y - 0.3, z + 2.6, 0.8, K.green); },
    pine(D, x, y, z) { D.box(x - 0.15, y - 0.15, z, 0.3, 0.3, 1, '#7a4f2e'); D.cone(x, y, z + 0.8, 1.1, 1.8, '#3f8a4f'); D.cone(x, y, z + 1.9, 0.8, 1.6, '#4a9a58'); },
    bamboo(D, x, y, z) { [[0, 0, 4.2], [0.5, 0.3, 3.6], [-0.3, 0.5, 3.2]].forEach(p => { D.box(x + p[0], y + p[1], z, 0.18, 0.18, p[2], '#8cc65a'); for (let k = 1; k < p[2]; k += 1) D.box(x + p[0] - 0.02, y + p[1] - 0.02, z + k, 0.22, 0.22, 0.06, '#6aa640', { edge: false }); D.path([[x + p[0], y + p[1], z + p[2] - 0.3], [x + p[0] + 0.6, y + p[1], z + p[2] + 0.1]], '#5fae4a', { line: true, w: 2.2 }); }); },
    flower(D, x, y, z, c) { c = c || K.pink; D.box(x - 0.04, y - 0.04, z, 0.08, 0.08, 0.8, K.leaf, { edge: false }); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; D.ball(x + Math.cos(a) * 0.18, y + Math.sin(a) * 0.18, z + 0.75, 0.13, c); } D.ball(x, y, z + 0.8, 0.1, K.yellow); },
    rose(D, x, y, z) { M.flower(D, x, y, z, '#e0364d'); M.flower(D, x + 0.5, y + 0.3, z, '#e0364d'); D.ball(x + 0.2, y + 0.1, z, 0.35, K.leaf); },
    sunflower(D, x, y, z) { D.box(x - 0.06, y - 0.06, z, 0.12, 0.12, 2.2, K.leaf, { edge: false }); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; D.dot(x + Math.cos(a) * 0.32, y, z + 2.3 + Math.sin(a) * 0.32, 3.2, K.yellow); } D.dot(x, y, z + 2.3, 4, '#7a4a20'); },
    pond(D, x, y, z) { D.disc(x, y, z + 0.02, 1.8, K.water, { under: true, raw: true }); D.disc(x - 0.5, y + 0.3, z + 0.04, 0.4, '#5fae4a', { raw: true }); D.disc(x + 0.6, y - 0.4, z + 0.04, 0.35, '#5fae4a', { raw: true }); },
    lotus(D, x, y, z) { D.disc(x, y, z, 0.5, '#5fae4a', { raw: true }); D.ball(x + 0.05, y, z + 0.05, 0.25, '#f5a3c0'); D.ball(x + 0.05, y, z + 0.22, 0.15, '#fbd0e0'); },
    bench(D, x, y, z) { D.box(x, y, z, 0.2, 0.2, 1, K.dark); D.box(x + 2.4, y, z, 0.2, 0.2, 1, K.dark); D.box(x - 0.1, y - 0.1, z + 1, 2.8, 0.9, 0.15, K.wood); D.box(x - 0.1, y - 0.1, z + 1.15, 2.8, 0.15, 0.9, K.wood); },
    butterfly(D, x, y, z) { D.path([[x, y, z], [x - 0.35, y, z + 0.4], [x - 0.4, y, z - 0.1]], '#f08c3a', { stroke: '#7a3a10' }); D.path([[x, y, z], [x + 0.35, y, z + 0.4], [x + 0.4, y, z - 0.1]], '#f08c3a', { stroke: '#7a3a10' }); D.path([[x, y, z - 0.2], [x, y, z + 0.25]], K.black, { line: true, w: 1.2 }); },
    bee(D, x, y, z) { D.ball(x, y, z, 0.22, K.yellow); D.quad('y', y + 0.22, x - 0.05, z + 0.05, x + 0.03, z + 0.38, K.black, { raw: true }); D.ball(x - 0.05, y - 0.1, z + 0.35, 0.13, '#e6f3fb'); D.dot(x + 0.2, y + 0.16, z + 0.25, 0.9, K.black); },
    mushroom(D, x, y, z) { D.cyl(x, y, z, 0.15, 0.45, '#f3ead8'); D.ball(x, y, z + 0.35, 0.35, '#e0473d'); D.dot(x - 0.1, y + 0.2, z + 0.85, 1.3, '#fff'); D.dot(x + 0.15, y + 0.25, z + 0.7, 1.1, '#fff'); },
    sun(D, x, y, z) { D.dot(x, y, z, 16, '#ffd54a'); D.dot(x, y, z, 12, '#ffe27a'); },
    cloud(D, x, y, z) { [[0, 0, 12], [0.7, -0.7, 10], [-0.7, 0.7, 10], [1.4, -1.4, 7], [-1.4, 1.4, 7]].forEach(p => D.dot(x + p[0], y + p[1], z, p[2] + 1, '#d4e4ee')); [[0, 0, 12], [0.7, -0.7, 10], [-0.7, 0.7, 10], [1.4, -1.4, 7], [-1.4, 1.4, 7]].forEach(p => D.dot(x + p[0], y + p[1], z + 0.02, p[2], '#ffffff')); },
    grass(D, x, y, z) { for (let i = 0; i < 5; i++) D.path([[x + i * 0.15, y, z], [x + i * 0.15 + 0.05, y, z + 0.4 + (i % 2) * 0.15]], '#4f9d4a', { line: true, w: 1.4 }); },
    rock(D, x, y, z) { D.ball(x, y, z - 0.2, 0.55, K.stone); },
    river(D, x, y, z, len) { D.box(x, y, z - 0.02, 1.8, len || 12, 0.06, K.water, { edge: false, depth: -40 }); }
  };

  // ================= Cảnh =================
  // it(id, model, x, y, z, nhãn {vi, en, zh}, tham số thêm)
  const it = (id, m, x, y, z, vi, en, zh, a, f, k) => ({ id, m, x, y, z: z || 0, vi, en, zh, a: a || [], f: !!f, k: k || 1 });
  const big = (o, k) => (o.k = k, o);
  const itF = (id, m, x, y, z, vi, en, zh, a) => it(id, m, x, y, z, vi, en, zh, a, true);
  function room(D, w, d, floorC, wallA, wallB) {
    D.box(0, 0, -0.6, w, d, 0.6, floorC, { depth: -100 });
    for (let i = 1; i < w; i += 2) D.path([[i, 0, 0.001], [i, d, 0.001]], shade(floorC, 0.88), { line: true, w: 0.6, depth: -99 });
    D.box(-0.35, 0, -0.6, 0.35, d, 7.6, wallA, { depth: -98, noLeft: true });
    D.box(-0.35, -0.35, -0.6, w + 0.35, 0.35, 7.6, wallB, { depth: -98, noRight: true });
  }
  function ground(D, w, d, c, edge) {
    D.box(0, 0, -1.2, w, d, 1.2, edge || '#a7794f', { depth: -100, noTop: true });
    D.quad('z', 0, 0, 0, w, d, c, { raw: true, depth: -99 });
  }
  const SCENES = [
    { id: 'kitchen', vi: 'Nhà bếp', en: 'Kitchen', zh: '厨房', w: 12, d: 10, bg: '#fff4e2',
      base: D => { room(D, 12, 10, K.floor, K.wallA, K.wallB); },
      items: [
        it('window', 'window', 6.2, 0, 3.4, 'cửa sổ', 'window', '窗户', ['y']),
        itF('fridge', 'fridge', 0.2, 0.3, 0, 'tủ lạnh', 'fridge', '冰箱'),
        itF('counter', 'counter', 0, 2.6, 0, 'quầy bếp', 'counter', '灶台', [4]),
        itF('cabinet', 'cabinet', 0, 2.9, 4.6, 'tủ bếp', 'cupboard', '柜子'),
        itF('microwave', 'microwave', 0.2, 2.8, 3.15, 'lò vi sóng', 'microwave', '微波炉'),
        it('ricecooker', 'ricecooker', 1.0, 4.95, 3.15, 'nồi cơm điện', 'rice cooker', '电饭锅'),
        itF('stove', 'stove', 0.1, 6.8, 0, 'bếp', 'stove', '炉子'),
        it('pot', 'pot', 0.8, 7.4, 3.15, 'nồi', 'pot', '锅'),
        it('pan', 'pan', 1.4, 8.5, 3.15, 'chảo', 'frying pan', '平底锅'),
        it('sink', 'sink', 2.8, 0.2, 0, 'bồn rửa', 'sink', '水池'),
        it('kettle', 'kettle', 1.0, 6.1, 3.15, 'ấm đun nước', 'kettle', '水壶'),
        it('table', 'table', 5.5, 4.8, 0, 'bàn', 'table', '桌子', [3.6, 2.6]),
        it('chair', 'chair', 9.8, 5.4, 0, 'ghế', 'chair', '椅子'),
        it('board', 'board', 5.8, 5.2, 2.55, 'thớt', 'cutting board', '菜板'),
        it('bowl', 'bowl', 7.8, 5.6, 2.55, 'bát', 'bowl', '碗'),
        it('plate', 'plate', 8.4, 6.6, 2.55, 'đĩa', 'plate', '盘子'),
        big(it('cup', 'cup', 6.6, 6.9, 2.55, 'cốc', 'cup', '杯子'), 1.3),
        big(it('chopsticks', 'chopsticks', 7.2, 7.0, 2.56, 'đũa', 'chopsticks', '筷子'), 1.3),
        big(it('spoon', 'spoon', 5.9, 6.6, 2.56, 'thìa', 'spoon', '勺子'), 1.3),
        it('trash', 'trash', 10.6, 1.4, 0, 'thùng rác', 'trash can', '垃圾桶')
      ] },
    { id: 'bathroom', vi: 'Phòng tắm', en: 'Bathroom', zh: '浴室', w: 11, d: 9, bg: '#eef8fb',
      base: D => { room(D, 11, 9, K.tile, '#e7f3f6', '#d5ebf0'); for (let i = 1; i < 9; i += 1.5) D.path([[0, i, 0.002], [11, i, 0.002]], '#c4dde3', { line: true, w: 0.5, depth: -99 }); },
      items: [
        it('bathtub', 'bathtub', 0.1, 4.6, 0, 'bồn tắm', 'bathtub', '浴缸'),
        it('shower', 'shower', 0.05, 7.2, 0, 'vòi hoa sen', 'shower', '淋浴'),
        it('toilet', 'toilet', 6.5, 0.1, 0, 'bồn cầu', 'toilet', '马桶'),
        it('basin', 'basin', 1.8, 0.1, 0, 'bồn rửa mặt', 'washbasin', '洗手池'),
        it('shelf', 'shelf', 4.0, 0, 3.2, 'cái kệ', 'shelf', '架子'),
        it('mirror', 'mirror', 1.9, 0, 3.6, 'gương', 'mirror', '镜子', ['y']),
        it('towel', 'towel', 0.01, 1.6, 4.5, 'khăn tắm', 'towel', '毛巾'),
        big(it('toothbrush', 'toothbrush', 3.3, 0.6, 2.6, 'bàn chải đánh răng', 'toothbrush', '牙刷'), 1.4),
        big(it('toothpaste', 'toothpaste', 4.1, 0.3, 3.32, 'kem đánh răng', 'toothpaste', '牙膏'), 1.4),
        big(it('soap', 'soap', 2.1, 0.3, 2.6, 'xà phòng', 'soap', '香皂'), 1.4),
        it('shampoo', 'shampoo', 3.4, 4.75, 1.8, 'dầu gội', 'shampoo', '洗发水'),
        big(it('comb', 'comb', 4.9, 0.6, 3.32, 'lược', 'comb', '梳子'), 1.4),
        it('hairdryer', 'hairdryer', 8.9, 0.5, 2.8, 'máy sấy tóc', 'hair dryer', '吹风机'),
        it('washer', 'washer', 8.4, 0.2, 0, 'máy giặt', 'washing machine', '洗衣机'),
        it('tissue', 'tissue', 5.5, 1.2, 0, 'giấy vệ sinh', 'toilet paper', '卫生纸'),
        it('slippers', 'slippers', 6.2, 4.6, 0, 'dép', 'slippers', '拖鞋')
      ] },
    { id: 'living', vi: 'Phòng khách', en: 'Living room', zh: '客厅', w: 13, d: 11, bg: '#fdf3e7',
      base: D => { room(D, 13, 11, '#d9b688', '#f7e7cf', '#efd8b8'); },
      items: [
        it('rug', 'rug', 4.2, 3.4, 0, 'thảm', 'carpet', '地毯'),
        it('sofa', 'sofa', 0.2, 3.6, 0, 'ghế sofa', 'sofa', '沙发'),
        it('cushion', 'cushion', 0.8, 4.4, 1.5, 'gối tựa', 'cushion', '靠垫'),
        it('coffeetable', 'coffeetable', 4.8, 4.4, 0, 'bàn trà', 'coffee table', '茶几'),
        it('book', 'book', 5.1, 5.1, 0.9, 'quyển sách', 'book', '书'),
        big(it('phone', 'phone', 5.6, 6.2, 0.9, 'điện thoại', 'phone', '手机'), 1.4),
        it('tv', 'tv', 4.6, 0.2, 0, 'ti vi', 'TV', '电视'),
        it('lamp', 'lamp', 1.4, 9.4, 0, 'đèn', 'lamp', '台灯'),
        it('plant', 'plant', 11.6, 9.6, 0, 'chậu cây', 'plant', '盆栽'),
        it('picture', 'picture', 0, 4.0, 3.3, 'bức tranh', 'picture', '画', [], true),
        it('clock', 'clock', 3.0, 0, 6.2, 'đồng hồ', 'clock', '钟', ['y']),
        it('window', 'window', 9.0, 0, 3.2, 'cửa sổ', 'window', '窗户', ['y']),
        it('bookshelf', 'bookshelf', 0.1, 0.2, 0, 'giá sách', 'bookshelf', '书架'),
        it('aircon', 'aircon', 0, 6.9, 6.1, 'điều hoà', 'air conditioner', '空调'),
        it('door', 'door', 0, 8.3, 0, 'cửa ra vào', 'door', '门', ['x'])
      ] },
    { id: 'bedroom', vi: 'Phòng ngủ', en: 'Bedroom', zh: '卧室', w: 12, d: 10, bg: '#f4f0fb',
      base: D => { room(D, 12, 10, '#d4b48a', '#ece6f6', '#e0d7ef'); },
      items: [
        it('bed', 'bed', 0.2, 0.2, 0, 'giường', 'bed', '床'),
        it('pillow', 'pillow', 0.6, 0.8, 1.52, 'gối', 'pillow', '枕头'),
        it('blanket', 'blanket', 0.3, 2.2, 1.52, 'chăn', 'blanket', '被子'),
        it('wardrobe', 'wardrobe', 0.1, 6.4, 0, 'tủ quần áo', 'wardrobe', '衣柜'),
        it('desk', 'desk', 6.6, 0.2, 0, 'bàn học', 'desk', '书桌'),
        it('computer', 'computer', 7.0, 0.4, 2.4, 'máy tính', 'computer', '电脑'),
        it('nightstand', 'nightstand', 3.9, 0.2, 0, 'tủ đầu giường', 'nightstand', '床头柜'),
        big(it('alarm', 'alarm', 4.2, 0.5, 1.6, 'đồng hồ báo thức', 'alarm clock', '闹钟'), 1.3),
        it('chair', 'chair', 7.4, 2.4, 0, 'ghế', 'chair', '椅子', [K.blue]),
        it('curtain', 'curtain', 0, 3.4, 3.3, 'rèm cửa', 'curtain', '窗帘'),
        it('window', 'window', 0, 3.5, 3.4, 'cửa sổ', 'window', '窗户', ['x']),
        it('bag', 'bag', 10.2, 2.0, 0, 'túi xách', 'bag', '包'),
        it('shoes', 'shoes', 9.0, 7.6, 0, 'giày', 'shoes', '鞋'),
        it('hat', 'hat', 5.4, 7.8, 0, 'mũ', 'hat', '帽子'),
        it('mirror', 'mirror', 9.5, 0, 2.6, 'gương', 'mirror', '镜子', ['y'])
      ] },
    { id: 'classroom', vi: 'Lớp học', en: 'Classroom', zh: '教室', w: 13, d: 11, bg: '#f1f7ec',
      base: D => { room(D, 13, 11, '#cfb48a', '#eef4e6', '#e1ead6'); },
      props: [['table', 9.8, 0.3, 0, [2.6, 1.8, K.woodL]]],
      items: [
        it('blackboard', 'blackboard', 3.0, 0, 2.6, 'bảng đen', 'blackboard', '黑板'),
        it('teacherdesk', 'desk', 4.6, 1.4, 0, 'bàn giáo viên', "teacher's desk", '讲台'),
        it('globe', 'globe', 6.6, 1.9, 2.4, 'quả địa cầu', 'globe', '地球仪'),
        it('map', 'map', 0, 2.0, 3.0, 'bản đồ', 'map', '地图'),
        it('clock', 'clock', 0, 7.2, 6.0, 'đồng hồ', 'clock', '钟', ['x']),
        it('schooldesk', 'schooldesk', 3.4, 5.0, 0, 'bàn học sinh', 'school desk', '课桌'),
        it('schooldesk2', 'schooldesk', 7.6, 5.0, 0, 'bàn học sinh', 'school desk', '课桌'),
        it('chair', 'chair', 4.1, 7.0, 0, 'ghế', 'chair', '椅子', [K.blue]),
        it('book', 'book', 3.6, 5.2, 2.18, 'sách', 'book', '书'),
        big(it('pencil', 'pencil', 4.9, 5.5, 2.18, 'bút chì', 'pencil', '铅笔'), 1.5),
        big(it('pen', 'pen', 8.0, 5.3, 2.18, 'bút bi', 'pen', '笔'), 1.5),
        big(it('eraser', 'eraser', 9.0, 5.9, 2.18, 'cục tẩy', 'eraser', '橡皮'), 1.5),
        big(it('ruler', 'ruler', 7.8, 6.0, 2.18, 'thước kẻ', 'ruler', '尺子'), 1.3),
        it('schoolbag', 'schoolbag', 10.6, 8.2, 0, 'cặp sách', 'schoolbag', '书包'),
        it('computer', 'computer', 10.2, 0.5, 2.55, 'máy tính', 'computer', '电脑')
      ] },
    { id: 'forest', vi: 'Khu rừng', en: 'Forest', zh: '森林', w: 15, d: 13, bg: '#eaf6e3', outdoor: true,
      base: D => { ground(D, 15, 13, '#8fd17a'); },
      props: [['pine', 1, 0.8], ['pine', 5.0, 0.4], ['pine', 13.6, 2.2], ['pine', 13.9, 7.6], ['pine', 8.2, 0.4], ['rock', 9.3, 11.6], ['grass', 4, 12], ['grass', 3.4, 6.8], ['mushroom', 3.4, 10.6], ['rock', 14, 11.8]],
      items: [
        it('tiger', 'tiger', 1.2, 8.0, 0, 'con hổ', 'tiger', '老虎'),
        it('monkey', 'monkey', 9.6, 1.4, 0, 'con khỉ', 'monkey', '猴子'),
        it('elephant', 'elephant', 5.6, 1.4, 0, 'con voi', 'elephant', '大象'),
        it('bear', 'bear', 5.0, 9.6, 0, 'con gấu', 'bear', '熊'),
        it('panda', 'panda', 1.2, 3.8, 0, 'gấu trúc', 'panda', '熊猫'),
        it('bamboo', 'bamboo', 0.5, 2.0, 0, 'cây tre', 'bamboo', '竹子'),
        it('deer', 'deer', 7.6, 5.8, 0, 'con hươu', 'deer', '鹿'),
        it('rabbit', 'rabbit', 1.6, 11.2, 0, 'con thỏ', 'rabbit', '兔子'),
        it('snake', 'snake', 8.4, 10.0, 0, 'con rắn', 'snake', '蛇'),
        it('fox', 'fox', 4.6, 6.0, 0, 'con cáo', 'fox', '狐狸'),
        it('squirrel', 'squirrel', 10.0, 8.2, 0, 'con sóc', 'squirrel', '松鼠'),
        it('owl', 'owl', 3.2, 0.6, 3.3, 'con cú', 'owl', '猫头鹰'),
        it('bird', 'bird', 6.6, 6.0, 6.0, 'con chim', 'bird', '鸟'),
        it('tree', 'tree', 3.2, 0.9, 0, 'cái cây', 'tree', '树'),
        it('river', 'river', 11.2, 0, 0, 'dòng sông', 'river', '河', [13]),
        it('mushroom', 'mushroom', 13.9, 10.4, 0, 'cây nấm', 'mushroom', '蘑菇')
      ] },
    { id: 'farm', vi: 'Nông trại', en: 'Farm', zh: '农场', w: 15, d: 13, bg: '#f7f3dd', outdoor: true,
      base: D => { ground(D, 15, 13, '#a9d77c'); },
      props: [['fence', 6.2, 5.6, 0, [6]]],
      items: [
        it('barn', 'barn', 0.6, 0.6, 0, 'chuồng trại', 'barn', '谷仓'),
        it('cow', 'cow', 6.6, 1.4, 0, 'con bò', 'cow', '牛'),
        it('pig', 'pig', 1.0, 6.6, 0, 'con lợn', 'pig', '猪'),
        it('chicken', 'chicken', 4.6, 8.6, 0, 'con gà', 'chicken', '鸡'),
        it('duck', 'duck', 11.4, 5.8, 0.05, 'con vịt', 'duck', '鸭子'),
        it('horse', 'horse', 10.4, 1.6, 0, 'con ngựa', 'horse', '马'),
        it('sheep', 'sheep', 7.8, 8.0, 0, 'con cừu', 'sheep', '羊'),
        it('dog', 'dog', 2.4, 10.4, 0, 'con chó', 'dog', '狗'),
        it('cat', 'cat', 5.6, 4.6, 0, 'con mèo', 'cat', '猫'),
        it('hay', 'hay', 5.4, 11.2, 0, 'đống rơm', 'haystack', '草堆'),
        it('tractor', 'tractor', 11.0, 9.6, 0, 'máy cày', 'tractor', '拖拉机'),
        it('fence', 'fence', 6.2, 12.4, 0, 'hàng rào', 'fence', '篱笆', [0]),
        it('pond', 'pond', 12.0, 6.0, 0, 'cái ao', 'pond', '池塘')
      ] },
    { id: 'sea', vi: 'Dưới biển', en: 'Under the sea', zh: '海底', w: 15, d: 13, bg: '#e3f3fb', outdoor: true,
      base: D => { ground(D, 15, 13, K.sand, '#c9a865'); D.box(0, 0, 0, 0.02, 13, 7, '#7fc4e8', { depth: -97, noLeft: true, noTop: true }); D.box(0, 0, 0, 15, 0.02, 7, '#9bd2ee', { depth: -97, noRight: true, noTop: true }); M.rock(D, 6, 12, 0); M.rock(D, 13.5, 3, 0); },
      items: [
        it('fish', 'fish', 4.2, 4.0, 3.0, 'con cá', 'fish', '鱼'),
        it('shark', 'shark', 9.4, 1.6, 4.4, 'cá mập', 'shark', '鲨鱼'),
        it('dolphin', 'dolphin', 2.6, 8.2, 4.6, 'cá heo', 'dolphin', '海豚'),
        it('octopus', 'octopus', 9.0, 7.6, 0, 'bạch tuộc', 'octopus', '章鱼'),
        it('crab', 'crab', 4.6, 10.6, 0, 'con cua', 'crab', '螃蟹'),
        it('turtle', 'turtle', 12.4, 9.8, 0, 'con rùa', 'turtle', '乌龟'),
        big(it('starfish', 'starfish', 7.0, 11.0, 0, 'sao biển', 'starfish', '海星'), 1.7),
        it('whale', 'whale', 1.4, 1.6, 4.2, 'cá voi', 'whale', '鲸鱼'),
        big(it('shell', 'shell', 11.2, 12.0, 0, 'vỏ sò', 'shell', '贝壳'), 2),
        it('jellyfish', 'jellyfish', 12.6, 5.4, 4.0, 'con sứa', 'jellyfish', '水母'),
        it('seaweed', 'seaweed', 1.6, 5.4, 0, 'rong biển', 'seaweed', '海草'),
        it('coral', 'coral', 6.0, 1.4, 0, 'san hô', 'coral', '珊瑚'),
        it('fish2', 'fish', 10.2, 10.2, 2.4, 'con cá', 'fish', '鱼', [K.blue])
      ] },
    { id: 'street', vi: 'Đường phố', en: 'Street', zh: '街道', w: 20, d: 14, bg: '#eef0f4', outdoor: true,
      base: D => { ground(D, 20, 14, '#c9ccd2', '#8f939b'); D.quad('z', 0.01, 0, 4.2, 20, 9.6, K.road, { raw: true, depth: -98 }); for (let i = 0.5; i < 20; i += 2.2) D.quad('z', 0.02, i, 6.8, i + 1.2, 7.0, '#f2f2f2', { raw: true, depth: -97 }); },
      items: [
        it('building', 'building', 0.4, 0.4, 0, 'toà nhà', 'building', '大楼', [9, '#e2c7a6']),
        it('building2', 'building', 14.6, 0.4, 0, 'toà nhà', 'building', '大楼', [6, '#c7d6e6']),
        it('busstop', 'busstop', 6.0, 2.0, 0, 'bến xe buýt', 'bus stop', '车站'),
        it('trafficlight', 'trafficlight', 18.8, 3.2, 0, 'đèn giao thông', 'traffic light', '红绿灯'),
        it('bus', 'bus', 0.8, 4.6, 0, 'xe buýt', 'bus', '公共汽车'),
        it('car', 'car', 13.6, 4.9, 0, 'ô tô', 'car', '汽车'),
        it('taxi', 'taxi', 1.2, 7.5, 0, 'taxi', 'taxi', '出租车'),
        it('truck', 'truck', 6.6, 7.3, 0, 'xe tải', 'truck', '卡车'),
        it('ambulance', 'ambulance', 14.4, 7.5, 0, 'xe cứu thương', 'ambulance', '救护车'),
        it('bicycle', 'bicycle', 3.0, 11.2, 0, 'xe đạp', 'bicycle', '自行车'),
        it('motorbike', 'motorbike', 9.0, 11.0, 0, 'xe máy', 'motorbike', '摩托车'),
        it('zebra', 'zebra', 9.8, 4.2, 0, 'vạch qua đường', 'crosswalk', '斑马线'),
        it('tree', 'tree', 11.8, 2.2, 0, 'cây', 'tree', '树')
      ] },
    { id: 'market', vi: 'Chợ rau quả', en: 'Market', zh: '菜市场', w: 15, d: 12, bg: '#fdf1e2', outdoor: true,
      base: D => { ground(D, 15, 12, '#e8d8bc', '#b99a6e'); },
      props: [['stall', 0.6, 0.6], ['stall', 8.2, 0.6], ['crate', 1, 5.6], ['crate', 3.2, 5.6], ['crate', 5.6, 5.6], ['crate', 8.0, 5.6], ['crate', 10.2, 5.6], ['crate', 12.2, 5.6], ['crate', 3.4, 9.0]],
      items: [
        it('apples', 'apples', 0.9, 1.0, 1.6, 'táo', 'apples', '苹果'),
        it('oranges', 'oranges', 2.7, 1.0, 1.6, 'cam', 'oranges', '橙子'),
        it('bananas', 'bananas', 4.7, 1.2, 1.6, 'chuối', 'bananas', '香蕉'),
        it('grapes', 'grapes', 6.0, 1.6, 1.6, 'nho', 'grapes', '葡萄'),
        it('mango', 'mango', 8.8, 1.4, 1.6, 'xoài', 'mangoes', '芒果'),
        it('pineapple', 'pineapple', 10.4, 1.4, 1.6, 'dứa', 'pineapple', '菠萝'),
        it('watermelon', 'watermelon', 12.4, 1.6, 1.6, 'dưa hấu', 'watermelon', '西瓜'),
        it('carrot', 'carrot', 1.4, 6.0, 0.7, 'cà rốt', 'carrots', '胡萝卜'),
        it('tomato', 'tomato', 3.6, 6.4, 0.7, 'cà chua', 'tomatoes', '西红柿'),
        it('cabbage', 'cabbage', 6.2, 6.4, 0.7, 'bắp cải', 'cabbage', '白菜'),
        it('potato', 'potato', 8.6, 6.2, 0.7, 'khoai tây', 'potatoes', '土豆'),
        it('corn', 'corn', 10.6, 6.2, 0.7, 'ngô', 'corn', '玉米'),
        it('eggplant', 'eggplant', 12.6, 6.4, 0.7, 'cà tím', 'eggplant', '茄子'),
        it('chili', 'chili', 4.0, 9.6, 0.7, 'ớt', 'chili peppers', '辣椒')
      ] },
    { id: 'park', vi: 'Công viên', en: 'Park', zh: '公园', w: 15, d: 13, bg: '#eaf6ef', outdoor: true,
      base: D => { ground(D, 15, 13, '#93d27e'); D.quad('z', 0.01, 6, 0, 8, 13, '#e9dcbf', { raw: true, depth: -98 }); },
      items: [
        it('tree', 'tree', 2.2, 2.2, 0, 'cái cây', 'tree', '树'),
        it('pine', 'pine', 12.6, 1.8, 0, 'cây thông', 'pine tree', '松树'),
        big(it('flower', 'flower', 3.4, 7.0, 0, 'bông hoa', 'flower', '花', [K.purple]), 2),
        big(it('rose', 'rose', 1.4, 9.6, 0, 'hoa hồng', 'rose', '玫瑰'), 1.8),
        big(it('sunflower', 'sunflower', 4.6, 10.6, 0, 'hoa hướng dương', 'sunflower', '向日葵'), 1.5),
        it('pond', 'pond', 11.2, 9.0, 0, 'hồ nước', 'pond', '池塘'),
        big(it('lotus', 'lotus', 11.0, 9.4, 0.05, 'hoa sen', 'lotus', '荷花'), 1.6),
        it('bench', 'bench', 8.6, 4.8, 0, 'ghế đá', 'bench', '长椅'),
        big(it('butterfly', 'butterfly', 5.0, 4.0, 2.4, 'con bướm', 'butterfly', '蝴蝶'), 2.4),
        big(it('bee', 'bee', 0.8, 7.2, 2.4, 'con ong', 'bee', '蜜蜂'), 2.2),
        big(it('grass', 'grass', 9.6, 11.6, 0, 'cỏ', 'grass', '草'), 2.2),
        it('sun', 'sun', 0.5, 0.5, 7.5, 'mặt trời', 'sun', '太阳'),
        it('cloud', 'cloud', 9, -1, 6.5, 'đám mây', 'cloud', '云'),
        it('dog', 'dog', 6.4, 8.0, 0, 'con chó', 'dog', '狗'),
        it('bird', 'bird', 2.5, 1.6, 4.0, 'con chim', 'bird', '鸟', [K.red])
      ] }
  ];

  // ================= Dựng SVG cho một cảnh =================
  function render(sc, opts) {
    opts = opts || {};
    const D = Drawing();
    sc.base(D);
    if (sc.extra) sc.extra(D);
    const baseSvg = D.out(); D.items.length = 0;
    const all = sc.items.concat((sc.props || []).map(p => ({ prop: true, m: p[0], x: p[1], y: p[2], z: p[3] || 0, a: p[4] || [], f: !!p[5] })));
    const objs = all.map(o => {
      const E = Drawing();
      const fn = M[o.m];
      const E2 = o.k && o.k !== 1 ? Scaled(E, o.x, o.y, o.z, o.k) : E;
      if (fn) { if (o.f) fn.apply(null, [Mirror(E2), o.y, o.x, o.z].concat(o.a)); else fn.apply(null, [E2, o.x, o.y, o.z].concat(o.a)); }
      const dep = o.x + o.y + o.z * 0.2 + (o.m === 'rug' || o.m === 'zebra' || o.m === 'river' || o.m === 'pond' ? -60 : 0) + (o.m === 'window' || o.m === 'picture' || o.m === 'blackboard' || o.m === 'map' || o.m === 'mirror' || o.m === 'clock' || o.m === 'curtain' || o.m === 'door' ? -30 : 0);
      Object.assign(D.defs, E.defs);
      ['x0', 'y0', 'x1', 'y1'].forEach(k => { D.bb[k] = k[1] === '0' ? Math.min(D.bb[k], E.bb[k]) : Math.max(D.bb[k], E.bb[k]); });
      return { o, dep, svg: E.out(), bb: Object.assign({}, E.bb) };
    }).sort((a, b) => a.dep - b.dep);
    const pad = 10, bb = D.bb;
    const vb = [bb.x0 - pad, bb.y0 - pad - 12, bb.x1 - bb.x0 + pad * 2, bb.y1 - bb.y0 + pad * 2 + 12];
    const defs = '<defs>' + Object.values(D.defs).join('') + '</defs>';
    const body = objs.map(r => r.o.prop ? '<g class="sc-prop">' + r.svg + '</g>' : '<g class="sc-obj" data-id="' + r.o.id + '" tabindex="0" role="button" aria-label="' + esc(label(r.o).name) + '">' + r.svg + '</g>').join('');
    return { svg: '<svg class="sc-svg" viewBox="' + vb.map(v => v.toFixed(1)).join(' ') + '" preserveAspectRatio="xMidYMid meet">' + defs + '<g class="sc-base">' + baseSvg + '</g>' + body + '<g class="sc-tags"></g></svg>', objs };
  }

  // ================= Nhãn theo ngôn ngữ =================
  const PYS = () => window.SE_SCENE_PY || {};
  function label(o) {
    if (LANG === 'zh') return { name: o.zh, sub: PYS()[o.zh] || '', vi: o.vi, say: o.zh };
    return { name: o.en, sub: '', vi: o.vi, say: o.en };
  }
  const SP = () => window.SESpeech, UI = () => window.SEUI, ST = () => window.SEStore;

  // ================= Danh sách cảnh (đầu trang Từ vựng) =================
  const thumbs = {};
  function cardsHtml() {
    return '<h2 class="sec">Khám phá bằng hình</h2><div class="sc-cards">' + SCENES.map(sc => {
      if (!thumbs[sc.id]) thumbs[sc.id] = render(sc).svg.replace('class="sc-svg"', 'class="sc-thumb" aria-hidden="true"');
      const best = ST() && ST().cfg('scn_' + sc.id);
      return '<a class="card sc-card" href="#/scene/' + sc.id + '" style="--bg:' + sc.bg + '"><span class="sc-pic">' + thumbs[sc.id] + '</span><b>' + esc(sc.vi) + '</b><small>' + (LANG === 'zh' ? esc(sc.zh) + ' · ' : esc(sc.en) + ' · ') + sc.items.length + ' đồ vật' + (best != null ? ' · tìm đúng ' + best + '/10' : '') + '</small></a>';
    }).join('') + '</div>';
  }

  // ================= Trang một cảnh =================
  function view(app, id, mode) {
    const sc = SCENES.find(s => s.id === id);
    if (!sc) { location.hash = '#/vocab'; return; }
    mode = mode === 'find' ? 'find' : 'explore';
    let tags = !!(ST() && ST().cfg('scTags'));
    app.innerHTML = '<a class="back" href="#/vocab">← Từ vựng</a>' +
      '<div class="voc-head"><h1>' + esc(sc.vi) + '</h1><span class="muted' + (LANG === 'zh' ? ' zh-t' : '') + '">' + esc(LANG === 'zh' ? sc.zh : sc.en) + '</span></div>' +
      '<nav class="voc-modes"><a class="chip' + (mode === 'explore' ? ' on' : '') + '" href="#/scene/' + sc.id + '">Khám phá</a><a class="chip' + (mode === 'find' ? ' on' : '') + '" href="#/scene/' + sc.id + '/find">Tìm đồ vật</a>' +
      (mode === 'explore' ? '<button class="chip' + (tags ? ' on' : '') + '" id="sc-tg">Hiện tên tất cả</button><button class="chip" id="sc-all">Nghe tất cả</button>' : '') + '<button class="chip sc-zoomb" id="sc-zoom">Phóng to</button></nav>' +
      '<section class="sc-stage" style="--bg:' + sc.bg + '"><div class="sc-wrap" id="sc-wrap">' + render(sc).svg + '</div><div class="sc-hint" id="sc-hint">' + (mode === 'explore' ? 'Chạm vào một đồ vật để xem tên và nghe đọc' : '') + '</div></section>' +
      '<section class="card sc-info" id="sc-info" aria-live="polite"></section>';
    const W = $('#sc-wrap', app), svg = $('svg', W), info = $('#sc-info', app);
    $('#sc-zoom', app).onclick = e => { const on = W.classList.toggle('zoom'); e.currentTarget.classList.toggle('on', on); if (on) W.scrollLeft = (W.scrollWidth - W.clientWidth) / 2; };
    const byId = {}; sc.items.forEach(o => byId[o.id] = o);
    const here = location.hash, alive = () => location.hash === here;
    const FLAT = { river: 1, rug: 1, zebra: 1, pond: 1, fence: 1, grass: 1 };
    const svgPt = (g) => { const b = g.getBBox(), o = byId[g.dataset.id]; return FLAT[o.m] ? [b.x + b.width / 2, b.y + b.height / 2 + 6] : [b.x + b.width / 2, b.y]; };
    function drawTags(on) {
      const T = $('.sc-tags', svg); T.innerHTML = '';
      if (!on) return;
      $$('.sc-obj', svg).forEach(g => {
        const o = byId[g.dataset.id], L = label(o), [x, y] = svgPt(g);
        const txt = L.name, w = Math.max(18, txt.length * (LANG === 'zh' ? 7.4 : 4.3) + 8);
        T.insertAdjacentHTML('beforeend', '<g class="sc-tag" transform="translate(' + x.toFixed(1) + ',' + (y - 3).toFixed(1) + ')"><rect x="' + (-w / 2).toFixed(1) + '" y="-11" width="' + w.toFixed(1) + '" height="10" rx="5"/><text y="-3.6" text-anchor="middle"' + (LANG === 'zh' ? ' class="zh"' : '') + '>' + esc(txt) + '</text></g>');
      });
    }
    function show(o, speak) {
      const L = label(o);
      $$('.sc-obj', svg).forEach(g => g.classList.toggle('on', g.dataset.id === o.id));
      info.innerHTML = '<div class="sc-word"><b class="' + (LANG === 'zh' ? 'zh' : '') + '">' + esc(L.name) + '</b>' + (L.sub ? '<span class="sc-py">' + esc(L.sub) + '</span>' : '') + '<span class="sc-vi">' + esc(L.vi) + '</span></div><button class="btn small" id="sc-say">Nghe lại</button><button class="btn small" id="sc-slow">Nghe chậm</button>';
      $('#sc-say', info).onclick = () => SP().speak(L.say, { rate: 0.85 });
      $('#sc-slow', info).onclick = () => SP().speak(L.say, { slow: true });
      if (speak) return SP().speak(L.say, { rate: 0.85 });
    }
    if (mode === 'explore') {
      info.innerHTML = '<p class="muted">Cảnh này có ' + sc.items.length + ' đồ vật. Bật "Hiện tên tất cả" để thấy tên trên hình.</p>';
      $$('.sc-obj', svg).forEach(g => {
        const go = () => show(byId[g.dataset.id], true);
        g.addEventListener('click', go);
        g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      });
      drawTags(tags);
      $('#sc-tg', app).onclick = e => { tags = !tags; e.currentTarget.classList.toggle('on', tags); ST() && ST().cfg('scTags', tags); drawTags(tags); };
      let run = 0;
      $('#sc-all', app).onclick = async () => {
        const my = ++run;
        for (const o of sc.items) { if (my !== run || !alive()) return; await show(o, true); await new Promise(r => setTimeout(r, 450)); }
      };
      return;
    }
    // ----- Tìm đồ vật: nghe tên, chạm đúng đồ vật -----
    const QN = 10;
    let k = 0, right = 0, tried = false, cur = null;
    const pool = shuffle(sc.items.filter((o, i, a) => a.findIndex(x => label(x).name === label(o).name) === i));
    const queue = Array.from({ length: QN }, (_, i) => pool[i % pool.length]);
    const hint = $('#sc-hint', app);
    function ask() {
      if (k >= QN) {
        const prev = ST() && ST().cfg('scn_' + sc.id);
        if (ST() && (prev == null || right > prev)) ST().cfg('scn_' + sc.id, right);
        ST() && ST().touch(right); UI() && UI().refreshTop();
        hint.textContent = '';
        info.innerHTML = '<div class="sc-done"><span class="hy">' + (UI() ? UI().hiyo(right >= 8 ? 'cheer' : right >= 5 ? 'joy' : 'think') : '') + '</span><div><b>Tìm đúng ngay ' + right + '/' + QN + '</b><p class="muted">' + (right >= 8 ? 'Tuyệt vời, bạn nhớ hết đồ vật trong cảnh này!' : 'Quay lại Khám phá, chạm và nghe thêm vài lần nhé.') + '</p></div></div><div class="row"><button class="btn primary" id="sc-again">Chơi lại</button><a class="btn" href="#/scene/' + sc.id + '">Khám phá</a></div>';
        $('#sc-again', info).onclick = () => view(app, id, 'find');
        return;
      }
      cur = queue[k]; tried = false;
      $$('.sc-obj', svg).forEach(g => g.classList.remove('on', 'bad'));
      info.innerHTML = '<div class="sc-q"><div class="progress-dots">' + Array.from({ length: QN }, (_, j) => '<i class="' + (j < k ? 'ok' : j === k ? 'cur' : '') + '"></i>').join('') + '</div><p>Nghe tên rồi chạm vào đồ vật đó trong hình</p><div class="row center"><button class="btn small primary" id="sc-say">Nghe lại</button><button class="btn small" id="sc-hintb">Gợi ý</button></div><div class="sc-reveal" id="sc-rv"></div></div>';
      hint.textContent = 'Câu ' + (k + 1) + '/' + QN;
      const L = label(cur);
      $('#sc-say', info).onclick = () => SP().speak(L.say, { rate: 0.85 });
      $('#sc-hintb', info).onclick = () => { tried = true; $('#sc-rv', info).innerHTML = '<span class="muted">Nghĩa: ' + esc(L.vi) + '</span>'; };
      SP().speak(L.say, { rate: 0.85 });
    }
    $$('.sc-obj', svg).forEach(g => {
      const pick = () => {
        if (!cur || k >= QN) return;
        const o = byId[g.dataset.id];
        if (label(o).name === label(cur).name) {
          g.classList.add('on'); UI() && UI().beep(true); if (!tried) right++;
          const L = label(cur);
          $('#sc-rv', info).innerHTML = '<b class="' + (LANG === 'zh' ? 'zh' : '') + '">' + esc(L.name) + '</b>' + (L.sub ? ' <span class="sc-py">' + esc(L.sub) + '</span>' : '') + ' · ' + esc(L.vi);
          const q = cur; cur = null;
          SP().speak(label(q).say, { rate: 0.85 }).then(() => setTimeout(() => { k++; ask(); }, 350));
        } else {
          tried = true; UI() && UI().beep(false);
          g.classList.add('bad'); setTimeout(() => g.classList.remove('bad'), 600);
          $('#sc-rv', info).innerHTML = '<span class="muted">Đó là ' + esc(label(o).name) + (label(o).sub ? ' (' + esc(label(o).sub) + ')' : '') + ' – ' + esc(o.vi) + '. Thử lại nhé!</span>';
        }
      };
      g.addEventListener('click', pick);
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    });
    ask();
  }

  window.SEScenes = { SCENES, view, cardsHtml, render, label, M, Drawing };
})();
