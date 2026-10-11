#!/usr/bin/env python3
"""Tạo giọng AI (Kokoro, mã nguồn mở, miễn phí) cho mọi câu cố định của trang.

  node tools/audio_items.js > tools/audio_items.jsonl
  python3 tools/gen_audio.py <thư mục trang> <en|zh> <model.onnx> <voices.bin>

Ghi audio/f/<mã>.mp3 (giọng nữ), audio/m/<mã>.mp3 (giọng nam) và data/audio.js (danh sách mã đã có).
Chạy lại bao nhiêu lần cũng được: file đã có sẽ được bỏ qua.
"""
import json, os, sys, subprocess, time, re

SITE, LANG, MODEL, VOICES = sys.argv[1:5]
VOICE = {
    'en': {'f': {'A': 'af_heart', 'B': 'af_bella'}, 'm': {'A': 'am_michael', 'B': 'am_adam'}},
    'zh': {'f': {'A': 'zf_xiaobei', 'B': 'zf_xiaoyi'}, 'm': {'A': 'zm_yunjian', 'B': 'zm_yunxi'}},
}[LANG]
SPEED = 1.0 if LANG == 'en' else 0.92

from kokoro_onnx import Kokoro
K = Kokoro(MODEL, VOICES)

if LANG == 'zh':
    sys.path.insert(0, os.path.join(SITE, 'tools'))
    from misaki.zh import ZHG2P
    import build as B   # tách từ + pinyin đã sửa của Sumi Chinese
    TONE = {'ā': 1, 'á': 2, 'ǎ': 3, 'à': 4, 'ē': 1, 'é': 2, 'ě': 3, 'è': 4, 'ī': 1, 'í': 2, 'ǐ': 3, 'ì': 4, 'ō': 1, 'ó': 2, 'ǒ': 3, 'ò': 4,
            'ū': 1, 'ú': 2, 'ǔ': 3, 'ù': 4, 'ǖ': 1, 'ǘ': 2, 'ǚ': 3, 'ǜ': 4, 'ń': 2, 'ň': 3, 'ǹ': 4}
    PLAIN = {'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a', 'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e', 'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i', 'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o',
             'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u', 'ǖ': 'ü', 'ǘ': 'ü', 'ǚ': 'ü', 'ǜ': 'ü', 'ń': 'n', 'ň': 'n', 'ǹ': 'n'}

    def t3(p):
        t = 5
        s = ''
        for c in p:
            if c in TONE:
                t = TONE[c]
            s += PLAIN.get(c, c)
        return s, t

    def ipa(base, tone):
        try:
            return ZHG2P.py2ipa(base + str(tone)).replace(chr(815), '')
        except Exception:
            return ''

    def phonemes(tk):
        # danh sách âm tiết theo từ, áp dụng biến điệu thanh 3 (3+3 → 2+3) trong cùng cụm không có dấu câu
        words = []
        for w, p in tk:
            if not p:
                words.append(('P', w))
                continue
            sy = []
            for s in p.split(' '):
                if s == 'r' and sy:
                    sy[-1][2] = True          # 儿 cuộn lưỡi gộp vào âm trước
                elif s:
                    b, t = t3(s)
                    sy.append([b, t, False])
            words.append(('W', sy))
        flat = [s for kind, x in words if kind == 'W' for s in x] if False else None
        # biến điệu: duyệt theo thứ tự, ngắt ở dấu câu
        seq = []
        for kind, x in words:
            if kind == 'P':
                seq.append(None)
            else:
                seq.extend(x)
                seq.append('|')
        prev = None
        for i, s in enumerate(seq):
            if s is None:
                prev = None
                continue
            if s == '|':
                continue
            if prev is not None and prev[1] == 3 and s[1] == 3:
                prev[1] = 2
            prev = s
        out = ''
        for kind, x in words:
            if kind == 'P':
                out += x
            else:
                ph = ''
                for b, t, r in x:
                    q = ipa(b, t)
                    if r:
                        m = re.search(r'[→↗↓↘]$', q)
                        q = (q[:m.start()] + 'ɻ' + q[m.start():]) if m else q + 'ɻ'
                    ph += q
                out += (' ' if out and not out.endswith(' ') else '') + ph
        return out.strip()

def synth(text, voice, item):
    if LANG == 'zh':
        tk = item.get('tk') or B.toks(text)
        ph = phonemes(tk)
        a, sr = K.create(ph, voice=voice, speed=SPEED, is_phonemes=True)
    else:
        a, sr = K.create(text.replace('…', '...'), voice=voice, speed=SPEED, lang='en-us')
    return a, sr

def write_mp3(a, sr, path):
    tmp = path + '.tmp.mp3'
    p = subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'f32le', '-ar', str(sr), '-ac', '1', '-i', '-',
                        '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,apad=pad_dur=0.08',
                        '-b:a', '40k', tmp], input=a.astype('float32').tobytes())
    if p.returncode == 0:
        os.replace(tmp, path)

items = [json.loads(l) for l in open(os.path.join(SITE, 'tools', 'audio_items.jsonl'), encoding='utf-8') if l.strip()]
items = items[:int(os.environ.get('LIMIT', len(items)))]
for g in 'fm':
    os.makedirs(os.path.join(SITE, 'audio', g), exist_ok=True)
done_keys = []
t0 = time.time(); n = 0
for i, it in enumerate(items):
    ok = True
    for g in 'fm':
        path = os.path.join(SITE, 'audio', g, it['key'] + '.mp3')
        if os.path.exists(path):
            continue
        try:
            a, sr = synth(it['text'], VOICE[g][it['role']], it)
            write_mp3(a, sr, path)
            n += 1
        except Exception as e:
            print('LỖI', it['text'][:40], e, flush=True)
            ok = False
    if ok and all(os.path.exists(os.path.join(SITE, 'audio', g, it['key'] + '.mp3')) for g in 'fm'):
        done_keys.append(it['key'])
    if i % 50 == 0:
        el = time.time() - t0
        print(f'{i}/{len(items)} · {n} file mới · {el/60:.1f} phút', flush=True)
        with open(os.path.join(SITE, 'data', 'audio.js'), 'w') as o:
            o.write('window.SE_AUDIO="' + ' '.join(done_keys) + '";\n')
with open(os.path.join(SITE, 'data', 'audio.js'), 'w') as o:
    o.write('/*! danh sách câu có giọng AI (tự sinh bởi tools/gen_audio.py) */\nwindow.SE_AUDIO="' + ' '.join(done_keys) + '";\n')
print('XONG', len(done_keys), 'câu', f'{(time.time()-t0)/60:.1f} phút', flush=True)
