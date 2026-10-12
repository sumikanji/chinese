#!/usr/bin/env python3
"""Tạo giọng AI cho phần Từ vựng bằng Kokoro v1.1-zh (bản chuyên tiếng Trung, đọc thanh điệu chuẩn hơn).
Dùng pinyin đã sửa của Sumi (biến điệu 不/一/thanh 3, 儿 hoá). Mã file giữ nguyên.
  python3 tools/gen_vocab_audio_v11.py <items.json> <kokoro-v1.1-zh.onnx> <voices-v1.1-zh.bin> <config-v1.1-zh.json>
items.json: [{"w": "苹果", "py": "píng guǒ", "ex": "...", "tk": [[từ, pinyin], ...], "k": mã từ, "ke": mã câu ví dụ}, ...]
Tệp model: github.com/thewh1teagle/kokoro-onnx/releases (model-files-v1.1); config lấy từ gói pip kokorog2p (data/kokoro_config_v1.1_zh.json).
"""
import json, os, sys, subprocess
ITEMS, MODEL, VOICES, CFG = sys.argv[1:5]
SITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
# ---- Pinyin → âm vị cho Kokoro v1.1-zh ----
import re
from pypinyin.contrib.tone_convert import to_initials, to_finals_tone3
ZH_MAP = {"b":"ㄅ","p":"ㄆ","m":"ㄇ","f":"ㄈ","d":"ㄉ","t":"ㄊ","n":"ㄋ","l":"ㄌ","g":"ㄍ","k":"ㄎ","h":"ㄏ","j":"ㄐ","q":"ㄑ","x":"ㄒ","zh":"ㄓ","ch":"ㄔ","sh":"ㄕ","r":"ㄖ","z":"ㄗ","c":"ㄘ","s":"ㄙ","a":"ㄚ","o":"ㄛ","e":"ㄜ","ie":"ㄝ","ai":"ㄞ","ei":"ㄟ","ao":"ㄠ","ou":"ㄡ","an":"ㄢ","en":"ㄣ","ang":"ㄤ","eng":"ㄥ","er":"ㄦ","i":"ㄧ","u":"ㄨ","v":"ㄩ","ii":"ㄭ","iii":"十","ve":"月","ia":"压","ian":"言","iang":"阳","iao":"要","in":"阴","ing":"应","iong":"用","iou":"又","ong":"中","ua":"穵","uai":"外","uan":"万","uang":"王","uei":"为","uen":"文","ueng":"瓮","uo":"我","van":"元","vn":"云"}
for p in ';:,.!?/—…"()“” 12345R': ZH_MAP[p] = p
PUN = {'，': ', ', '、': ', ', '。': '. ', '！': '! ', '？': '? ', '：': ': ', '；': '; ', '“': ' “', '”': '” ', '（': ' (', '）': ') ', '…': '…'}
def syl(py):
    """'hǎo' → ['h','ao','3'] ; 'r' (儿化) xử lý ngoài"""
    ini = to_initials(py, strict=True) or ''
    fin = to_finals_tone3(py, strict=True, neutral_tone_with_five=True)
    if not re.search(r'\d$', fin): fin += '5'
    f, t = fin[:-1], fin[-1]
    f = f.replace('ü', 'v')
    if f == 'i' and ini in ('z', 'c', 's'): f = 'ii'
    elif f == 'i' and ini in ('zh', 'ch', 'sh', 'r'): f = 'iii'
    return [x for x in (ini, f, t) if x]
def phonemes(tk, sandhi=True):
    # tk: [[từ, 'pin yin'], ...] — áp dụng biến điệu 3+3 trong cụm liền nhau
    words = []
    for w, p in tk:
        if not p:
            words.append(('P', w)); continue
        sy = []
        for s in p.split(' '):
            if s == 'r' and sy: sy[-1].append('R'); continue
            if s: sy.append(syl(s))
        words.append(('W', sy))
    if sandhi:
        prev = None
        for kind, x in words:
            if kind == 'P': prev = None; continue
            for s in x:
                if prev is not None and prev[2 if len(prev) > 2 and prev[-1] != 'R' else -2 if prev[-1] == 'R' else -1] == '3' and (s[-1] == '3' or (s[-1] == 'R' and s[-2] == '3')):
                    i = len(prev) - (2 if prev[-1] == 'R' else 1); prev[i] = '2'
                prev = s
    out = ''
    for kind, x in words:
        if kind == 'P':
            out += ''.join(PUN.get(c, c) for c in x)
        else:
            ph = ''
            for s in x:
                ph += ''.join(ZH_MAP.get(p, '') for p in s)
            out += ('/' if out and not out.endswith((' ', '/')) else '') + ph
    return out.strip()
from kokoro_onnx import Kokoro
K = Kokoro(MODEL, VOICES, vocab_config=CFG)
VOICE = {'f': 'zf_001', 'm': 'zm_010'}
def write_mp3(a, sr, path):
    tmp = path + '.tmp.mp3'
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'f32le', '-ar', str(sr), '-ac', '1', '-i', '-',
                    '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,apad=pad_dur=0.08',
                    '-b:a', '40k', tmp], input=a.astype('float32').tobytes(), check=True)
    os.replace(tmp, path)
items = json.load(open(ITEMS))
for i, x in enumerate(items):
    jobs = [(x['k'], phonemes([[x['w'], x['py']], ['。', '']]), 0.9)]
    if x.get('ex') and x.get('ke'): jobs.append((x['ke'], phonemes(x['tk']), 0.95))
    for key, ph, sp in jobs:
        for g in 'fm':
            a, sr = K.create(ph, voice=VOICE[g], speed=sp, is_phonemes=True)
            write_mp3(a, sr, os.path.join(SITE, 'audio', g, key + '.mp3'))
    if i % 25 == 0: print(i, '/', len(items), flush=True)
print('XONG', len(items))
