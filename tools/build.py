#!/usr/bin/env python3
"""Sumi Chinese — biên dịch nội dung trong content/*.txt thành data/*.js

Chạy:  PYTHONPATH=<jieba> python3 tools/build.py
- Mỗi câu được tách từ (jieba) và gắn pinyin cho từng chữ (pypinyin).
- Ghi data/levels.js, data/hsk1.js … hsk6.js, data/stats.js, data/py.js,
  data/sounds.js, data/vocab.js
"""
import json, os, re, sys, collections
import jieba, logging
from pypinyin import lazy_pinyin, pinyin, Style, load_phrases_dict

jieba.setLogLevel(logging.WARNING)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
C = os.path.join(ROOT, 'content'); D = os.path.join(ROOT, 'data')

# Sửa cách đọc mà pypinyin hay nhầm (theo từ)
FIX = {
    '一共': 'yí gòng', '一起': 'yì qǐ', '一下': 'yí xià', '一点儿': 'yì diǎn r', '一点': 'yì diǎn', '一定': 'yí dìng',
    '一样': 'yí yàng', '一些': 'yì xiē', '一会儿': 'yí huì r', '一直': 'yì zhí', '一般': 'yì bān', '一边': 'yì biān',
    '一切': 'yí qiè', '一路平安': 'yí lù píng ān', '一遍': 'yí biàn', '一次': 'yí cì', '一个': 'yí gè', '一天': 'yì tiān',
    '一年': 'yì nián', '一张': 'yì zhāng', '一把': 'yì bǎ', '一杯': 'yì bēi', '一本': 'yì běn', '一件': 'yí jiàn',
    '一只': 'yì zhī', '一口': 'yì kǒu', '一半': 'yí bàn', '一种': 'yì zhǒng', '一句': 'yí jù', '一位': 'yí wèi',
    '一辈子': 'yí bèi zi', '一部分': 'yí bù fen', '一致': 'yí zhì', '一旦': 'yí dàn', '一向': 'yí xiàng', '一律': 'yí lǜ',
    '一再': 'yí zài', '一方面': 'yì fāng miàn', '一流': 'yì liú', '一模一样': 'yì mú yí yàng', '一举两得': 'yì jǔ liǎng dé',
    '不客气': 'bú kè qi', '不是': 'bú shì', '不要': 'bú yào', '不会': 'bú huì', '不过': 'bú guò', '不用': 'bú yòng',
    '不错': 'bú cuò', '不够': 'bú gòu', '不See': '', '不一定': 'bù yí dìng', '对不起': 'duì bu qǐ', '来得及': 'lái de jí',
    '来不及': 'lái bu jí', '看不见': 'kàn bu jiàn', '听不懂': 'tīng bu dǒng', '差不多': 'chà bu duō', '了不起': 'liǎo bu qǐ',
    '为了': 'wèi le', '因为': 'yīn wèi', '为什么': 'wèi shén me', '什么': 'shén me', '东西': 'dōng xi', '朋友': 'péng you',
    '谢谢': 'xiè xie', '喜欢': 'xǐ huan', '衣服': 'yī fu', '时候': 'shí hou', '认识': 'rèn shi', '漂亮': 'piào liang',
    '觉得': 'jué de', '休息': 'xiū xi', '舒服': 'shū fu', '知道': 'zhī dào', '意思': 'yì si', '客气': 'kè qi',
    '还是': 'hái shi', '还有': 'hái yǒu', '还要': 'hái yào', '还没': 'hái méi', '还可以': 'hái kě yǐ',
    '好好儿': 'hǎo hāo r', '一会儿': 'yí huì r', '哪儿': 'nǎ r', '这儿': 'zhè r', '那儿': 'nà r', '玩儿': 'wán r', '有点儿': 'yǒu diǎn r',
    '多少': 'duō shao', '先生': 'xiān sheng', '师傅': 'shī fu', '关系': 'guān xi', '明白': 'míng bai', '地方': 'dì fang',
    '事情': 'shì qing', '打算': 'dǎ suàn', '收拾': 'shōu shi', '麻烦': 'má fan', '告诉': 'gào su', '暖和': 'nuǎn huo',
    '便宜': 'pián yi', '行李': 'xíng li', '银行': 'yín háng', '音乐': 'yīn yuè', '长大': 'zhǎng dà', '头发': 'tóu fa',
    '多长时间': 'duō cháng shí jiān', '多长': 'duō cháng', '黑头发': 'hēi tóu fa', '数一数': 'shǔ yi shǔ', '睡不着': 'shuì bu zháo',
    '以史为镜': 'yǐ shǐ wéi jìng', '尤为重要': 'yóu wéi zhòng yào', '一场': 'yì chǎng', '下一场': 'xià yì chǎng', '我教': 'wǒ jiāo', '教得': 'jiāo de',
    '不好意思': 'bù hǎo yì si', '差点儿': 'chà diǎn r', '一是': 'yī shì', '一刻': 'yí kè', '照张': 'zhào zhāng', '名字': 'míng zi',
    '只长': 'zhī cháng', '长时间': 'cháng shí jiān', '更长': 'gèng cháng', '越长': 'yuè cháng', '地里': 'dì li', '营地': 'yíng dì',
    '还车': 'huán chē', '背上': 'bēi shàng', '你种': 'nǐ zhòng',
    '睡觉': 'shuì jiào', '早上': 'zǎo shang', '晚上': 'wǎn shang', '上班': 'shàng bān', '早上好': 'zǎo shang hǎo', '名字': 'míng zi', '妹妹': 'mèi mei', '哥哥': 'gē ge', '姐姐': 'jiě jie', '弟弟': 'dì di', '爸爸': 'bà ba', '妈妈': 'mā ma', '儿子': 'ér zi', '女儿': 'nǚ ér', '桌子': 'zhuō zi', '椅子': 'yǐ zi', '杯子': 'bēi zi', '个子': 'gè zi', '孩子': 'hái zi', '日子': 'rì zi', '房子': 'fáng zi', '饺子': 'jiǎo zi', '包子': 'bāo zi', '橘子': 'jú zi', '鼻子': 'bí zi', '眼睛': 'yǎn jing', '耳朵': 'ěr duo', '脑袋': 'nǎo dai', '舌头': 'shé tou', '石头': 'shí tou', '木头': 'mù tou', '馒头': 'mán tou', '枕头': 'zhěn tou', '他们': 'tā men', '我们': 'wǒ men', '你们': 'nǐ men', '咱们': 'zán men', '她们': 'tā men', '怎么': 'zěn me', '怎么样': 'zěn me yàng', '这么': 'zhè me', '那么': 'nà me', '看看': 'kàn kan', '试试': 'shì shi', '说说': 'shuō shuo', '想想': 'xiǎng xiang', '聊聊': 'liáo liao', '尝尝': 'cháng chang', '学生': 'xué sheng', '医生': 'yī shēng', '身体': 'shēn tǐ', '月亮': 'yuè liang', '太阳': 'tài yáng', '窗户': 'chuāng hu', '豆腐': 'dòu fu', '葡萄': 'pú tao', '萝卜': 'luó bo', '西瓜': 'xī guā', '玻璃': 'bō li', '清楚': 'qīng chu', '聪明': 'cōng ming', '热闹': 'rè nao', '高兴': 'gāo xìng', '漂亮': 'piào liang', '凉快': 'liáng kuai', '舒服': 'shū fu', '干净': 'gān jìng', '商量': 'shāng liang', '消息': 'xiāo xi', '生意': 'shēng yi', '名气': 'míng qi', '脾气': 'pí qi', '力气': 'lì qi', '精神': 'jīng shen', '答应': 'dā ying', '应该': 'yīng gāi', '大夫': 'dài fu', '丈夫': 'zhàng fu', '姑娘': 'gū niang', '老实': 'lǎo shi', '结实': 'jiē shi', '踏实': 'tā shi', '主意': 'zhǔ yi', '护士': 'hù shi', '这个': 'zhè ge', '那个': 'nà ge', '哪个': 'nǎ ge', '几个': 'jǐ ge', '两个': 'liǎng ge', '一个': 'yí gè', '觉': 'jiào', '得': 'de', '地': 'de', '了': 'le', '着': 'zhe', '的': 'de', '还': 'hái', '都': 'dōu',
}
FIX.pop('不See', None)
for k in ('好好儿', '一会儿', '哪儿', '这儿', '那儿', '玩儿', '有点儿', '一点儿'):
    pass
# Dạy pypinyin các từ trên (để nó dùng cả khi từ nằm trong cụm dài hơn)
load_phrases_dict({k: [[s] for s in v.split()] for k, v in FIX.items() if len(k) == len(v.split())})
HAN = lambda c: '\u4e00' <= c <= '\u9fff'
PUNCT = re.compile(r'^[\s，。！？、；：“”‘’（）《》…—\-,.!?;:\'"()0-9A-Za-z%]+$')

def toks(sent):
    out = []
    for w in jieba.cut(sent):
        if not w.strip():
            continue
        if PUNCT.match(w):
            out.append([w, ''])
            continue
        if w in FIX and len(FIX[w].split()) == len(w):
            py = FIX[w].split()
        else:
            py = []
            for ch in w:
                py.append(pinyin(ch, style=Style.TONE)[0][0] if HAN(ch) else '')
            # dùng cách đọc theo cả từ khi số chữ khớp (phân biệt chữ đa âm)
            pw = [p[0] for p in pinyin(w, style=Style.TONE)]
            if len(pw) == len(w):
                py = [pw[i] if HAN(ch) else '' for i, ch in enumerate(w)]
        out.append([w, ' '.join(py)])
    return fix_context(out)

TONES = {'ā':1,'á':2,'ǎ':3,'à':4,'ē':1,'é':2,'ě':3,'è':4,'ī':1,'í':2,'ǐ':3,'ì':4,'ō':1,'ó':2,'ǒ':3,'ò':4,'ū':1,'ú':2,'ǔ':3,'ù':4,'ǖ':1,'ǘ':2,'ǚ':3,'ǜ':4}
def tone_of(p):
    for c in p:
        if c in TONES:
            return TONES[c]
    return 5 if p else 0
NUMCH = set('零一二三四五六七八九十百千万亿第')
NUM_AFTER = set('零一二三四五六七八九十号月楼层')
NUM_BEFORE = set('零一二三四五六七八九十百千万亿第期周拜')
MEASURE = set('个步只张本件次位条天年遍口句点')
ER_KEEP = {'女儿', '婴儿', '幼儿', '孤儿', '儿子', '儿童', '健儿', '宠儿', '男儿', '孙儿', '侄儿'}

def fix_context(tk):
    """Sửa pinyin theo ngữ cảnh: 一 / 不 biến điệu, 儿 cuộn lưỡi, một số chữ đa âm."""
    words = [t[0] for t in tk]
    # chữ đa âm đứng riêng
    for i, (w, p) in enumerate(tk):
        prev = words[i - 1] if i else ''
        nxt = words[i + 1] if i + 1 < len(words) else ''
        if w == '得' and (prev == '如果' or nxt == '了'):
            tk[i][1] = 'dé'
        elif w == '得' and prev in ('还', '就', '都', '也', '又', '我们', '你们', '我', '你', '他', '她', '必须', '总'):
            tk[i][1] = 'děi'
        elif w == '还' and prev in ('还要', '要', '得'):
            tk[i][1] = 'huán'
        elif w == '种':
            tk[i][1] = 'zhǒng' if prev[-1:] in tuple('这那哪几一两三四五每各') else 'zhòng'
        elif w == '长':
            tk[i][1] = 'cháng'
        elif w == '盛':
            tk[i][1] = 'chéng'
        elif w == '教':
            tk[i][1] = 'jiāo'
        elif w == '相' and prev.startswith('照'):
            tk[i][1] = 'xiàng'
        elif w == '干' and prev[-1:] in ('鱼', '肉', '果'):
            tk[i][1] = 'gān'
        elif w == '假' and prev not in ('真', '是'):
            tk[i][1] = 'jià'
        elif len(w) > 1 and w.endswith('儿') and w not in ER_KEEP and not w.endswith('女儿'):
            ps = p.split(' ')
            if len(ps) == len(w):
                ps[-1] = 'r'; tk[i][1] = ' '.join(ps)
    # danh sách chữ phẳng để xét chữ đứng trước / sau (kể cả khác từ)
    flat = []
    for ti, (w, p) in enumerate(tk):
        ps = p.split(' ') if p else [''] * len(w)
        for ci, ch in enumerate(w):
            flat.append([ch, ps[ci] if ci < len(ps) else '', ti, ci])
    for k, (ch, py, ti, ci) in enumerate(flat):
        prevc = flat[k - 1][0] if k else ''
        nextc = flat[k + 1][0] if k + 1 < len(flat) else ''
        nextp = flat[k + 1][1] if k + 1 < len(flat) else ''
        if tk[ti][0] in FIX:
            continue
        if ch == '一' and py:
            if prevc and prevc == nextc and HAN(prevc) and prevc not in MEASURE:
                new = 'yi'
            elif prevc in NUM_BEFORE or nextc in NUM_AFTER or not HAN(nextc or 'x') or not nextp:
                new = 'yī'
            else:
                new = 'yí' if tone_of(nextp) in (4, 5) and nextp not in ('ge',) else 'yì'
                if nextp == 'ge': new = 'yí'
            flat[k][1] = new
        elif ch == '不' and py:
            if prevc and prevc == nextc and HAN(prevc):
                new = 'bu'
            elif py == 'bu':
                new = 'bu'
            elif tone_of(nextp) == 4:
                new = 'bú'
            else:
                new = 'bù'
            flat[k][1] = new
    # ghép lại
    for ti in range(len(tk)):
        if tk[ti][1]:
            tk[ti][1] = ' '.join(f[1] for f in flat if f[2] == ti)
    return tk

# Một số từ dễ bị cắt sai → thêm vào từ điển jieba
for w in ['不见不散', '来得及', '好好儿', '有点儿', '一点儿', '玩儿', '扫码', '微信', '支付宝', '高铁', '外卖', '快递',
          '欢欢', '李明', '阿兰', '王阿姨', '小张', '安娜', '小王', '小李', '小美', '小刘', '小高', '小周', '陈先生', '一路平安',
          '加油', '打车', '上网', '网购', '健身房', '地铁站', '火车站', '飞机场', '博物馆', '图书馆', '电影院', '洗手间']:
    jieba.add_word(w, 2000)

def enc(tk):
    return '|'.join(w + (':' + p if p else '') for w, p in tk)

def parse(fn):
    lv, lessons, cur = None, [], None
    for raw in open(fn, encoding='utf-8'):
        line = raw.strip()
        if not line or line.startswith('//'):
            continue
        if line.startswith('@'):
            a = line[1:].split('|')
            lv = dict(id=a[0], name=a[1], title=a[2], sub=a[3], color=a[4])
        elif line.startswith('#'):
            a = [x.strip() for x in line[1:].split('|')]
            cur = dict(id=a[0], t=a[1], en=a[2], s=a[3], a=a[4], d=[])
            lessons.append(cur)
        else:
            who, cn, vi = line.split('|')
            assert who in 'AB', line
            cur['d'].append([who, cn.strip(), vi.strip()])
    return lv, lessons

STOP_NAMES = set('李明 阿兰 王阿姨 小张 安娜 小王 小李 小美 小刘 小高 小周 陈先生 欢欢'.split())

def main():
    files = sorted(f for f in os.listdir(C) if re.match(r'hsk\d\.txt$', f))
    levels, stats, chars = [], {}, collections.Counter()
    seen_ids, words_seen = set(), set()
    allwords = {}
    for f in files:
        lv, lessons = parse(os.path.join(C, f))
        out = []
        vocab = set()
        for l in lessons:
            assert l['id'] not in seen_ids, l['id']
            seen_ids.add(l['id'])
            d = []
            for who, cn, vi in l['d']:
                tk = toks(cn)
                for w, p in tk:
                    if p:
                        chars.update(w)
                        if w not in STOP_NAMES:
                            vocab.add(w)
                d.append([who, cn, vi, enc(tk)])
            out.append(dict(id=l['id'], t=l['t'], en=l['en'], s=l['s'], a=l['a'], d=d))
        new = vocab - words_seen
        words_seen |= vocab
        stats[lv['id']] = dict(words=len(vocab), new=len(new))
        lv['n'] = len(lessons)
        levels.append(lv)
        with open(os.path.join(D, lv['id'] + '.js'), 'w', encoding='utf-8') as o:
            o.write('/*! © 2026 Sumi Chinese — %s (tự sinh từ content/%s, đừng sửa tay) */\n' % (lv['name'], f))
            o.write('SE_ADD(%s,%s);\n' % (json.dumps(lv['id']), json.dumps(out, ensure_ascii=False, separators=(',', ':'))))
        print(lv['id'], len(lessons), 'bài', sum(len(l['d']) for l in out), 'câu', len(vocab), 'từ', len(new), 'từ mới')
    with open(os.path.join(D, 'levels.js'), 'w', encoding='utf-8') as o:
        o.write('/*! © 2026 Sumi Chinese — khung cấp độ (tự sinh) */\n')
        o.write('window.SE_DATA=%s;\n' % json.dumps([dict(id=l['id'], name=l['name'], title=l['title'], sub=l['sub'], color=l['color'], lessons=[]) for l in levels], ensure_ascii=False))
        o.write('window.SE_ADD=function(lv,arr){var L=window.SE_DATA.find(function(x){return x.id===lv});arr.forEach(function(l){l.d=l.d.map(function(r){return [r[0],r[1],r[2],window.SE_TOK(r[3])]});L.lessons.push(l)})};\n')
        o.write("window.SE_TOK=function(s){return s.split('|').map(function(t){var i=t.indexOf(':');return i<0?[t,'']:[t.slice(0,i),t.slice(i+1)]})};\n")
    with open(os.path.join(D, 'stats.js'), 'w', encoding='utf-8') as o:
        o.write('window.SE_VOCAB=%s;\n' % json.dumps({k: v['words'] for k, v in stats.items()}))

    # Tên đồ vật trong các cảnh 2.5D (scenes.js) → pinyin
    sc = open(os.path.join(ROOT, 'scenes.js'), encoding='utf-8').read()
    words = sorted(set(re.findall(r"itF?\('[^']+', '[^']+', [^']*?, '[^']*', '[^']*', '([^']+)'", sc)))
    spy = {}
    for w in words:
        tk = toks(w)
        spy[w] = ' '.join(p.replace(' ', '') for _, p in tk if p)
        chars.update(w)
    with open(os.path.join(D, 'scene_py.js'), 'w', encoding='utf-8') as o:
        o.write('/*! © 2026 Sumi Chinese — pinyin tên đồ vật trong cảnh (tự sinh) */\nwindow.SE_SCENE_PY=%s;\n' % json.dumps(spy, ensure_ascii=False))
    print('scene words', len(spy))
    # Âm, từ vựng theo chủ đề
    extra_chars = build_extra()
    chars.update(extra_chars)
    build_pymap(chars)

def build_extra():
    chars = collections.Counter()
    # sounds.txt:  ## id | Tên nhóm | mẹo   rồi các dòng  中文|nghĩa
    fn = os.path.join(C, 'sounds.txt')
    if os.path.exists(fn):
        groups, cur = [], None
        for raw in open(fn, encoding='utf-8'):
            line = raw.strip()
            if not line or line.startswith('//'):
                continue
            if line.startswith('##'):
                a = [x.strip() for x in line[2:].split('|')]
                cur = dict(id=a[0], t=a[1], tip=a[2], say=[])
                groups.append(cur)
            else:
                cn, vi = line.split('|')
                tk = toks(cn.strip())
                chars.update(''.join(w for w, p in tk if p))
                cur['say'].append([cn.strip(), vi.strip(), enc(tk)])
        with open(os.path.join(D, 'sounds.js'), 'w', encoding='utf-8') as o:
            o.write('/*! © 2026 Sumi Chinese — nhóm âm khó (tự sinh) */\n')
            o.write('window.SE_SOUNDS=%s;\n' % json.dumps(groups, ensure_ascii=False, separators=(',', ':')))
            o.write('window.SE_SOUNDS.forEach(function(g){g.say=g.say.map(function(r){return [r[0],r[1],window.SE_TOK(r[2])]})});\n')
        print('sounds', len(groups), 'nhóm', sum(len(g['say']) for g in groups), 'câu')
    # vocab.txt:  ## id | Tên chủ đề | Tên tiếng Trung | kind   rồi các dòng  từ|nghĩa|câu ví dụ|nghĩa câu
    fn = os.path.join(C, 'vocab.txt')
    if os.path.exists(fn):
        topics, cur = [], None
        for raw in open(fn, encoding='utf-8'):
            line = raw.strip()
            if not line or line.startswith('//'):
                continue
            if line.startswith('##'):
                a = [x.strip() for x in line[2:].split('|')]
                cur = dict(id=a[0], t=a[1], en=a[2], kind=a[3], items=[])
                topics.append(cur)
            else:
                a = [x.strip() for x in line.split('|')]
                w, vi, ex, exvi = a
                wp = FIX.get(w) or ' '.join(p[0] for p in pinyin(w, style=Style.TONE))
                tk = toks(ex)
                chars.update(w); chars.update(''.join(x for x, p in tk if p))
                cur['items'].append([w, wp, vi, ex, exvi, enc(tk)])
        with open(os.path.join(D, 'vocab.js'), 'w', encoding='utf-8') as o:
            o.write('/*! © 2026 Sumi Chinese — từ vựng theo chủ đề (tự sinh) */\n')
            o.write('window.SE_VOCAB_TOPICS=%s;\n' % json.dumps(topics, ensure_ascii=False, separators=(',', ':')))
            o.write('window.SE_VOCAB_TOPICS.forEach(function(t){t.items=t.items.map(function(r){return {w:r[0],py:r[1],vi:r[2],ex:r[3],exvi:r[4],tk:window.SE_TOK(r[5])}})});\n')
        print('vocab', len(topics), 'chủ đề', sum(len(t['items']) for t in topics), 'từ')
    return chars

def build_pymap(chars):
    """Bảng chữ → pinyin (cách đọc chính) cho ~6000 chữ thường gặp + mọi chữ trong bài.
    Dùng khi chấm phát âm: máy nhận dạng có thể trả về chữ đồng âm (他/她/它), so theo pinyin."""
    jd = os.path.join(os.environ.get('PYTHONPATH', '').split(':')[0], 'jieba', 'dict.txt')
    freq = collections.Counter()
    if os.path.exists(jd):
        for line in open(jd, encoding='utf-8'):
            w, f = line.split()[:2]
            for ch in w:
                freq[ch] += int(f)
    pool = set(c for c, _ in freq.most_common(6500)) | set(chars)
    pool = {c for c in pool if '一' <= c <= '鿿'}
    by = collections.defaultdict(list)
    for c in sorted(pool):
        p = pinyin(c, style=Style.TONE3, neutral_tone_with_five=True)[0][0]
        if re.match(r'^[a-zü]+[1-5]$', p.replace('v', 'ü')):
            by[p.replace('v', 'ü')].append(c)
    with open(os.path.join(D, 'py.js'), 'w', encoding='utf-8') as o:
        o.write('/*! © 2026 Sumi Chinese — bảng chữ → pinyin để chấm phát âm (tự sinh) */\n')
        o.write('window.SE_PYMAP=%s;\n' % json.dumps({k: ''.join(v) for k, v in sorted(by.items())}, ensure_ascii=False, separators=(',', ':')))
    print('py map', len(pool), 'chữ')

if __name__ == '__main__':
    main()
