/*! © 2026 Sumi Chinese. Hiyo character © Sumi Kanji. */
const HIYO = (function () {
  const INK = '#9A6A1F', EYE = '#3B2412', BEAK = '#FF922B', BLUSH = '#FF8FA3';
  const NAMES = ['Tama', 'Piyo', 'Hiyo', 'Hiyo đi học', 'Gà choai', 'Hiyo tốt nghiệp', 'Gà teen', 'Chim lửa', 'Phượng hoàng'];
  const JP = ['たま', 'ぴよ', 'ひよ', 'ひよ（小学生）', 'わかどり', 'ひよ（卒業）', 'ひよ（中学生）', 'ひのとり', 'ほうおう'];
  const BODY = 'M0 -40 C30 -40 46 -18 46 10 C46 36 28 50 0 50 C-28 50 -46 36 -46 10 C-46 -18 -30 -40 0 -40 Z';
  const body = (fill, stroke) => '<path d="' + BODY + '" fill="' + fill + '" stroke="' + (stroke || INK) + '" stroke-width="3"/>';
  const tuft = (fill) => '<path d="M-2 -40 C-6 -52 2 -56 4 -48 C6 -54 14 -52 8 -42" fill="' + fill + '" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>';
  const wings = (fill) => '<path d="M-44 14 Q-58 22 -48 34 Q-42 28 -40 22 Z" fill="' + fill + '" stroke="' + INK + '" stroke-width="2.5"/><path d="M44 14 Q58 22 48 34 Q42 28 40 22 Z" fill="' + fill + '" stroke="' + INK + '" stroke-width="2.5"/>';
  const feet = '<path d="M-14 50 l-4 6 M-14 50 l0 7 M-14 50 l4 6 M14 50 l-4 6 M14 50 l0 7 M14 50 l4 6" stroke="' + BEAK + '" stroke-width="3" stroke-linecap="round"/>';
  const star = (x, y, s, c) => '<path transform="translate(' + x + ' ' + y + ') scale(' + s + ')" d="M0 -8 L2.4 -2.4 L8 0 L2.4 2.4 L0 8 L-2.4 2.4 L-8 0 L-2.4 -2.4 Z" fill="' + (c || '#FFD43B') + '"/>';
  const beret = '<ellipse cx="-8" cy="-36" rx="24" ry="8.5" fill="#2E2A27" transform="rotate(-10 -8 -36)"/><circle cx="-10" cy="-45" r="3.5" fill="#2E2A27"/>';

  // ---- Biểu cảm (mắt, mỏ, má) – cùng tọa độ cho mọi dạng ----
  function eyesOpen() {
    return '<ellipse cx="-15" cy="4" rx="7.5" ry="9.5" fill="' + EYE + '"/><ellipse cx="15" cy="4" rx="7.5" ry="9.5" fill="' + EYE + '"/>' +
      '<circle cx="-12" cy="0" r="3" fill="#fff"/><circle cx="18" cy="0" r="3" fill="#fff"/><circle cx="-17" cy="9" r="1.4" fill="#fff"/><circle cx="13" cy="9" r="1.4" fill="#fff"/>';
  }
  const arc = (x, up) => '<path d="M' + (x - 7) + ' ' + (up ? 6 : 2) + ' Q' + x + ' ' + (up ? -3 : 10) + ' ' + (x + 7) + ' ' + (up ? 6 : 2) + '" stroke="' + EYE + '" stroke-width="3.5" fill="none" stroke-linecap="round"/>';
  const beakSmall = '<path d="M-5 14 Q0 20 5 14 Q0 11 -5 14 Z" fill="' + BEAK + '"/>';
  const beakOpen = '<path d="M-6 13 Q0 11 6 13 Q4 22 0 23 Q-4 22 -6 13 Z" fill="' + BEAK + '"/><path d="M-3 17 Q0 20 3 17" stroke="#E8590C" stroke-width="1.5" fill="none"/>';
  const blush = (o) => '<ellipse cx="-28" cy="16" rx="7" ry="4" fill="' + BLUSH + '" opacity="' + (o || 0.75) + '"/><ellipse cx="28" cy="16" rx="7" ry="4" fill="' + BLUSH + '" opacity="' + (o || 0.75) + '"/>';
  const MOODS = {
    happy: () => eyesOpen() + beakSmall + blush(),
    joy: () => arc(-15, true) + arc(15, true) + beakOpen + blush(),
    cheer: () => '<path d="M-15 -6 l2.6 5.6 6 0.8 -4.4 4.2 1.1 6 -5.3 -2.9 -5.3 2.9 1.1 -6 -4.4 -4.2 6 -0.8 Z" fill="' + EYE + '"/><path d="M15 -6 l2.6 5.6 6 0.8 -4.4 4.2 1.1 6 -5.3 -2.9 -5.3 2.9 1.1 -6 -4.4 -4.2 6 -0.8 Z" fill="' + EYE + '"/>' + beakOpen + blush() + star(-40, -30, 0.9) + star(42, -26, 0.7),
    sad: () => '<path d="M-22 -6 L-9 -2 M22 -6 L9 -2" stroke="' + EYE + '" stroke-width="2.5" stroke-linecap="round"/>' + eyesOpen() +
      '<path d="M-19 14 Q-21 22 -18 24 Q-15 22 -17 14 Z" fill="#74C0FC"/><path d="M-5 17 Q0 13 5 17 Q0 19 -5 17 Z" fill="' + BEAK + '"/>' + blush(0.45) +
      '<path d="M34 -22 Q38 -14 34 -10 Q30 -14 34 -22 Z" fill="#74C0FC"/>',
    think: () => '<ellipse cx="-15" cy="4" rx="7.5" ry="9.5" fill="' + EYE + '"/><circle cx="-12" cy="0" r="3" fill="#fff"/>' + '<path d="M8 4 L22 4" stroke="' + EYE + '" stroke-width="3.5" stroke-linecap="round"/>' +
      '<path d="M-4 15 L4 15" stroke="' + BEAK + '" stroke-width="4" stroke-linecap="round"/>' + blush(0.6) +
      '<text x="40" y="-24" font-size="24" font-weight="900" fill="#CA8A04" font-family="sans-serif">?</text>',
    wow: () => '<circle cx="-15" cy="4" r="6" fill="' + EYE + '"/><circle cx="15" cy="4" r="6" fill="' + EYE + '"/><circle cx="-13" cy="2" r="2" fill="#fff"/><circle cx="17" cy="2" r="2" fill="#fff"/>' +
      '<ellipse cx="0" cy="18" rx="4.5" ry="5.5" fill="' + BEAK + '"/>' + blush(),
    wink: () => '<ellipse cx="-15" cy="4" rx="7.5" ry="9.5" fill="' + EYE + '"/><circle cx="-12" cy="0" r="3" fill="#fff"/>' + arc(15, true) + beakSmall + blush(),
    cool: () => '<rect x="-27" y="-3" width="22" height="13" rx="5" fill="#1F2326"/><rect x="5" y="-3" width="22" height="13" rx="5" fill="#1F2326"/><path d="M-5 2 L5 2" stroke="#1F2326" stroke-width="2.5"/><path d="M-22 0 L-15 0" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".6"/>' + beakSmall + blush(0.6),
    calm: () => arc(-15, false) + arc(15, false) + beakSmall + blush(),
    sleep: () => arc(-15, false) + arc(15, false) + '<path d="M-3 17 Q0 20 3 17" stroke="' + EYE + '" stroke-width="2" fill="none" stroke-linecap="round"/>' + blush() +
      '<text x="30" y="-30" font-size="14" font-weight="900" fill="' + INK + '" opacity=".55" font-family="sans-serif">z</text><text x="40" y="-42" font-size="10" font-weight="900" fill="' + INK + '" opacity=".45" font-family="sans-serif">z</text>'
  };

  // ---- 9 dạng: [phía sau, thân, phía trước mặt] ----
  function form(n, tint) {
    const Y = tint || '#FFE066';
    switch (n) {
      case 0: return ['',
        '<path d="M0 -50 C26 -50 44 -12 44 16 C44 42 25 56 0 56 C-25 56 -44 42 -44 16 C-44 -12 -26 -50 0 -50 Z" fill="' + (tint || '#FFF7D6') + '" stroke="' + INK + '" stroke-width="3"/>' +
        '<ellipse cx="22" cy="-16" rx="5" ry="3.5" fill="#F4D58D"/><ellipse cx="-26" cy="34" rx="4" ry="3" fill="#F4D58D"/><ellipse cx="14" cy="42" rx="3" ry="2.5" fill="#F4D58D"/>',
        '<ellipse cx="-4" cy="-44" rx="17" ry="6.5" fill="#2E2A27" transform="rotate(-14 -4 -44)"/><circle cx="-6" cy="-51" r="3" fill="#2E2A27"/>'];
      case 1: return [tuft(tint || '#FFF3A3'), body(tint || '#FFF3A3'),
        '<path d="M-20 -32 L-13 -40 L-6 -33 L1 -41 L8 -33 L15 -40 L21 -32 C18 -50 -18 -50 -20 -32 Z" fill="#FFF7D6" stroke="' + INK + '" stroke-width="2.5" stroke-linejoin="round"/>' +
        '<path d="M-48 22 L-38 13 L-28 22 L-18 13 L-8 22 L2 13 L12 22 L22 13 L32 22 L42 13 L48 22 C48 46 28 58 0 58 C-28 58 -48 46 -48 22 Z" fill="#FFF7D6" stroke="' + INK + '" stroke-width="3" stroke-linejoin="round"/>'];
      case 2: return [tuft(Y), body(Y) + wings('#FFD43B') + feet, beret + star(46, -30, 1)];
      case 3: return ['<rect x="-52" y="-4" width="18" height="34" rx="6" fill="#E03131" stroke="#9A1B1B" stroke-width="2"/><rect x="34" y="-4" width="18" height="34" rx="6" fill="#E03131" stroke="#9A1B1B" stroke-width="2"/>',
        body(Y) + feet,
        '<path d="M-30 -24 C-30 -54 30 -54 30 -24 Z" fill="#FFD43B" stroke="' + INK + '" stroke-width="2.5"/><ellipse cx="0" cy="-24" rx="38" ry="7" fill="#FFD43B" stroke="' + INK + '" stroke-width="2.5"/>' +
        '<path d="M-30 18 L-27 40 M30 18 L27 40" stroke="#E03131" stroke-width="4" stroke-linecap="round"/>' +
        '<g transform="translate(40 34) rotate(-30)"><rect x="0" y="-3" width="24" height="7" rx="2" fill="#74C0FC" stroke="#1C5D99" stroke-width="1.5"/><path d="M24 -3 L31 0.5 L24 4 Z" fill="#3B2412"/></g>'];
      case 4: return ['<path d="M-12 -36 C-14 -50 -4 -52 -2 -42 C0 -54 10 -54 8 -42 C12 -52 20 -48 14 -36 Z" fill="#FF6B6B" stroke="#C92A2A" stroke-width="2"/>',
        body(tint || '#FFD43B') + wings('#FFC107') + feet,
        '<path d="M-40 28 Q0 46 40 28 L38 38 Q0 54 -38 38 Z" fill="#4DABF7" stroke="#1C5D99" stroke-width="2"/><path d="M24 38 L30 56 L18 52 Z" fill="#4DABF7" stroke="#1C5D99" stroke-width="2"/>'];
      case 5: return ['', body(Y) + feet,
        '<polygon points="-30,-36 0,-50 30,-36 0,-24" fill="#343A40" stroke="#1F2326" stroke-width="2" stroke-linejoin="round"/><rect x="-14" y="-34" width="28" height="8" rx="2" fill="#343A40"/>' +
        '<path d="M26 -34 L30 -14" stroke="#FFD43B" stroke-width="2.5"/><circle cx="30" cy="-12" r="3.5" fill="#FFD43B"/>' +
        '<g transform="translate(-60 26) rotate(-15)"><rect x="0" y="0" width="30" height="11" rx="5.5" fill="#FFF7D6" stroke="' + INK + '" stroke-width="2"/><rect x="13" y="0" width="5" height="11" fill="#E03131"/></g>' +
        '<g fill="#FFC9DE"><circle cx="46" cy="-26" r="4"/><circle cx="52" cy="-20" r="4"/><circle cx="46" cy="-14" r="4"/><circle cx="40" cy="-20" r="4"/></g><circle cx="46" cy="-20" r="2.2" fill="#F06595"/>'];
      case 6: return ['<path d="M-16 -38 C-20 -56 -6 -58 -4 -46 C-2 -60 12 -60 10 -46 C16 -58 26 -50 18 -38 Z" fill="#FF6B6B" stroke="#C92A2A" stroke-width="2"/>',
        body(Y),
        '<path d="M-44 22 C-30 32 30 32 44 22 C42 42 26 50 0 50 C-26 50 -42 42 -44 22 Z" fill="#283A5E" stroke="#16213A" stroke-width="2"/>' +
        '<path d="M-12 26 L0 34 L12 26" stroke="#16213A" stroke-width="2" fill="none"/><circle cx="0" cy="40" r="2.5" fill="#FFD43B"/><circle cx="0" cy="46" r="2" fill="#FFD43B"/>' +
        '<g transform="translate(44 12) rotate(-35)"><rect x="0" y="-3" width="30" height="6" rx="3" fill="#C8A26B" stroke="#7C5A2A" stroke-width="1.5"/><path d="M30 -4 Q42 0 30 4 Z" fill="#2E2A27"/></g>'];
      case 7: return ['<path d="M-40 4 Q-66 -6 -60 -30 Q-54 -18 -48 -14 Q-56 -32 -44 -42 Q-44 -22 -36 -12 Z" fill="#FF922B" stroke="#D9480F" stroke-width="2" stroke-linejoin="round"/>' +
        '<path d="M40 4 Q66 -6 60 -30 Q54 -18 48 -14 Q56 -32 44 -42 Q44 -22 36 -12 Z" fill="#FF922B" stroke="#D9480F" stroke-width="2" stroke-linejoin="round"/>' +
        '<path d="M-14 -36 Q-20 -54 -6 -50 Q-4 -66 6 -52 Q16 -62 16 -44 Q24 -50 18 -34 Z" fill="#FF6B35" stroke="#D9480F" stroke-width="2" stroke-linejoin="round"/><path d="M-6 -40 Q-4 -50 2 -44 Q8 -50 8 -40 Z" fill="#FFD43B"/>',
        body(tint || '#FFB347', '#B5530F') + '<ellipse cx="0" cy="30" rx="24" ry="16" fill="#FFE8A3"/>' + feet, ''];
      default: return ['<path d="M30 30 Q62 40 66 10 Q58 24 46 20 Z" fill="#FFD43B" stroke="#B08900" stroke-width="2"/><circle cx="62" cy="15" r="4.5" fill="#4DABF7" stroke="#B08900" stroke-width="1.5"/>' +
        '<path d="M26 40 Q54 62 68 42 Q56 50 44 42 Z" fill="#FFC9DE" stroke="#D6336C" stroke-width="2"/><circle cx="63" cy="45" r="4" fill="#4DABF7" stroke="#D6336C" stroke-width="1.5"/>' +
        '<path d="M-44 6 Q-68 -10 -62 -34 Q-56 -20 -48 -16 Q-58 -34 -48 -44 Q-48 -24 -38 -14 Z" fill="#FFF3A3" stroke="#B08900" stroke-width="2" stroke-linejoin="round"/>' +
        '<path d="M44 6 Q68 -10 62 -34 Q56 -20 48 -16 Q58 -34 48 -44 Q48 -24 38 -14 Z" fill="#FFF3A3" stroke="#B08900" stroke-width="2" stroke-linejoin="round"/>',
        body(tint || '#FFD43B', '#B08900') + feet,
        '<polygon points="-16,-34 -12,-52 -4,-40 0,-56 4,-40 12,-52 16,-34" fill="#FCC419" stroke="#B08900" stroke-width="2" stroke-linejoin="round"/><circle cx="0" cy="-42" r="3" fill="#F06595"/>' + star(-56, 40, 0.8) + star(54, -50, 0.6)];
    }
  }

  // Phụ kiện thêm cho avatar
  const ACC = {
    none: '',
    glasses: '<circle cx="-15" cy="4" r="11" fill="rgba(255,255,255,.25)" stroke="' + EYE + '" stroke-width="2.5"/><circle cx="15" cy="4" r="11" fill="rgba(255,255,255,.25)" stroke="' + EYE + '" stroke-width="2.5"/><path d="M-4 4 L4 4" stroke="' + EYE + '" stroke-width="2.5"/>',
    ribbon: '<g transform="translate(26 -32)"><path d="M0 0 L-12 -7 L-12 7 Z" fill="#F783AC" stroke="#C2255C" stroke-width="1.5"/><path d="M0 0 L12 -7 L12 7 Z" fill="#F783AC" stroke="#C2255C" stroke-width="1.5"/><circle r="3.5" fill="#C2255C"/></g>',
    sakura: '<g transform="translate(-30 -28)" fill="#FFC9DE"><circle cx="0" cy="-5" r="4.5"/><circle cx="5" cy="-1" r="4.5"/><circle cx="3" cy="5" r="4.5"/><circle cx="-3" cy="5" r="4.5"/><circle cx="-5" cy="-1" r="4.5"/><circle r="2.2" fill="#F06595"/></g>',
    leaf: '<path d="M4 -40 Q8 -56 22 -58 Q18 -44 4 -40 Z" fill="#69DB7C" stroke="#2B8A3E" stroke-width="1.8"/>',
    band: '<path d="M-40 -16 Q0 -30 40 -16 L40 -8 Q0 -22 -40 -8 Z" fill="#fff" stroke="#E03131" stroke-width="1.6"/><circle cx="0" cy="-16" r="4" fill="#E03131"/><path d="M40 -12 L52 -18 M40 -10 L52 -4" stroke="#E03131" stroke-width="2.5" stroke-linecap="round"/>',
    crown: '<polygon points="-14,-36 -11,-52 -4,-42 0,-56 4,-42 11,-52 14,-36" fill="#FCC419" stroke="#B08900" stroke-width="2" stroke-linejoin="round"/>',
    headphones: '<path d="M-38 0 C-38 -48 38 -48 38 0" stroke="#495057" stroke-width="5" fill="none"/><rect x="-46" y="-6" width="12" height="20" rx="5" fill="#F06595"/><rect x="34" y="-6" width="12" height="20" rx="5" fill="#F06595"/>',
    cap: '<path d="M-26 -38 Q0 -68 26 -38 Z" fill="#FCC419" stroke="#B08900" stroke-width="2"/><ellipse cx="0" cy="-38" rx="32" ry="6" fill="#FCC419" stroke="#B08900" stroke-width="2"/>',
    randoseru: '<rect x="30" y="-8" width="24" height="30" rx="7" fill="#E03131" stroke="#A61E4D" stroke-width="2"/><path d="M30 2 h24" stroke="#A61E4D" stroke-width="2"/><circle cx="42" cy="12" r="2.5" fill="#FCC419"/>',
    bowtie: '<path d="M0 34 L-13 26 L-13 42 Z M0 34 L13 26 L13 42 Z" fill="#4263EB" stroke="#364FC7" stroke-width="1.5"/><circle cx="0" cy="34" r="3.5" fill="#364FC7"/>',
    scarf: '<path d="M-34 24 Q0 38 34 24 L34 33 Q0 47 -34 33 Z" fill="#FA5252" stroke="#C92A2A" stroke-width="1.5"/><path d="M18 33 l5 18 l9 -2 l-5 -17 z" fill="#FA5252" stroke="#C92A2A" stroke-width="1.5"/>',
    star: '<polygon points="-26,-40 -23,-33 -16,-33 -21,-28 -19,-21 -26,-25 -33,-21 -31,-28 -36,-33 -29,-33" fill="#FFD43B" stroke="#F08C00" stroke-width="1.5" stroke-linejoin="round"/>',
    graduate: '<polygon points="0,-62 36,-50 0,-38 -36,-50" fill="#343A40" stroke="#212529" stroke-width="2" stroke-linejoin="round"/><path d="M-20 -45 v8 q20 8 40 0 v-8" fill="#343A40"/><path d="M30 -48 v18" stroke="#FCC419" stroke-width="2.5"/><circle cx="30" cy="-28" r="3" fill="#FCC419"/>'
  };
  const MOOD_ALIAS = { smile: 'happy', happy: 'happy' };

  // Vẽ: n = dạng (0–8), mood = biểu cảm, opt = {cls, tint, acc, bg}
  function svg(n, mood, opt) {
    opt = opt || {};
    n = Math.max(0, Math.min(8, n | 0));
    const f = form(n, opt.tint);
    const m = MOODS[mood] ? mood : (n === 0 && !mood ? 'sleep' : 'happy');
    const bg = opt.bg ? '<circle cx="0" cy="0" r="74" fill="' + opt.bg + '"/>' : '';
    const vb = opt.bg ? '-74 -74 148 148' : '-72 -66 144 132';
    return '<svg class="' + (opt.cls || 'hiyo') + '" viewBox="' + vb + '" fill="none" aria-hidden="true" data-c="© Sumi Kanji · Hiyo">' + bg +
      '<g' + (opt.bg ? ' transform="translate(0 4) scale(.9)"' : '') + '>' + f[0] + f[1] + MOODS[m]() + f[2] + (ACC[opt.acc] || '') + '</g></svg>';
  }
  return { svg, NAMES, JP, MOODS: Object.keys(MOODS), ACC: Object.keys(ACC), MOOD_ALIAS, COUNT: 9 };
})();

// Dạng tiến hóa hiện tại của người học (theo lộ trình)
window.HIYO = HIYO;
