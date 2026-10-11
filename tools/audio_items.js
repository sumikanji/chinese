// Liệt kê mọi câu cố định cần thu giọng AI → JSON lines {key, role, text, tk}
// Chạy: node tools/audio_items.js > tools/audio_items.jsonl
const fs = require('fs'), vm = require('vm'), path = require('path');
const R = path.join(__dirname, '..');
const ctx = { console }; ctx.window = ctx; vm.createContext(ctx);
const html = fs.readFileSync(path.join(R, 'index.html'), 'utf8');
for (const m of html.matchAll(/<script src="(data\/[^"]+)"/g)) vm.runInContext(fs.readFileSync(path.join(R, m[1]), 'utf8'), ctx);
ctx.SE_LANG = 'zh';
function hashKey(s) { let h1 = 0xdeadbeef, h2 = 0x41c6ce57; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36); }
const seen = new Set(), out = [];
const add = (role, text, tk) => { if (!text) return; role = role === 'B' ? 'B' : 'A'; const key = hashKey(role + '|' + text); if (seen.has(key)) return; seen.add(key); const o = { key, role, text }; if (tk) o.tk = tk; out.push(o); };
ctx.SE_DATA.forEach(L => L.lessons.forEach(l => l.d.forEach(d => add(d[0], d[1], d[3]))));
(ctx.SE_SOUNDS || []).forEach(g => g.say.forEach(s => add('A', s[0], s[2])));
(ctx.SE_VOCAB_TOPICS || []).forEach(t => t.items.forEach(w => { add('A', w.w, [[w.w, w.py]]); add('A', w.ex, w.tk); }));
(ctx.SE_SHADOW || []).forEach(x => x.s.forEach(s => add('A', s[0], s[2])));
(ctx.SE_QA || []).forEach(q => { add('A', q.q, q.qt); add('B', q.a, q.at); });
['这是我说话的速度。', '你好！这是我的声音。', '你好！很高兴认识你。你今天怎么样？', '你好！我是女声。', '你好！我是男声。'].forEach(t => add('A', t));
process.stdout.write(out.map(o => JSON.stringify(o)).join('\n') + '\n');
console.error(out.length + ' câu');
