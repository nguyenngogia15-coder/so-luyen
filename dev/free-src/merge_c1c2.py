import json, re, os
R = '/home/claude/so-luyen/vr/'
ex = set(open('existing.txt').read().split('\n'))
cmu = json.load(open('/home/claude/so-luyen/sp/cmu.json'))
A = {"AA":"ɑː","AE":"æ","AH":"ʌ","AO":"ɔː","AW":"aʊ","AY":"aɪ","EH":"e","ER":"ɜːr","EY":"eɪ","IH":"ɪ","IY":"iː","OW":"oʊ","OY":"ɔɪ","UH":"ʊ","UW":"uː","B":"b","CH":"tʃ","D":"d","DH":"ð","F":"f","G":"ɡ","HH":"h","JH":"dʒ","K":"k","L":"l","M":"m","N":"n","NG":"ŋ","P":"p","R":"r","S":"s","SH":"ʃ","T":"t","TH":"θ","V":"v","W":"w","Y":"j","Z":"z","ZH":"ʒ"}
def arpa(ph):
    out = []; ps = ph.split()
    for p in ps:
        b = re.sub(r"\d", "", p); s = A.get(b, "")
        if p.endswith("0") and b == "AH": s = "ə"
        if p.endswith("0") and b == "ER": s = "ər"
        if p == "IY0": s = "i"
        if p.endswith("1") and sum(1 for q in ps if re.search(r"\d", q)) > 1:
            j = len(out); V = r"[ɑæʌɔaeɜɪioʊuə]"
            ON = {"pl","pr","bl","br","tr","dr","kl","kr","gl","gr","fl","fr","θr","ʃr","sp","st","sk","sm","sn","sl","sw","tw","kw","dw","spr","str","skr","spl","skw","pj","bj","kj","fj","mj","nj","hj","vj","tj","dj","lj","sj"}
            k = j
            while k > 0 and not re.search(V, out[k - 1]): k -= 1
            cons = out[k:j]
            m = 0
            for t in range(1, len(cons) + 1):
                if t == 1 or "".join(cons[-t:]) in ON: m = t
            if j > 0 and k < j: out.insert(j - m if k > 0 else k, "ˈ")
            else: out.insert(j, "ˈ")
        out.append(s)
    return "".join(out)
def ipa(w):
    got = []
    for x in [x for x in re.split(r"[\s-]+", re.sub(r"\(.*?\)", "", w.lower())) if x]:
        x2 = re.sub(r"[^a-z']", "", x)
        if x2 in cmu: got.append(arpa(cmu[x2] if isinstance(cmu[x2], str) else cmu[x2][0]))
        else: return ""
    return "/" + " ".join(got) + "/" if got else ""
P = {"noun","verb","adjective","adverb","phrase","phrasal verb","idiom","preposition","conjunction"}
def load(fs, skip):
    out = []
    for f in fs:
        if not os.path.exists(f): continue
        for ln in open(f, encoding='utf-8'):
            try: o = json.loads(ln)
            except Exception: continue
            w = str(o.get('w', '')).strip(); k = w.lower()
            if not w or k in ex or k in skip or o.get('p') not in P or not all(o.get(x) for x in ('vi', 'd', 'e')): continue
            e = o['e']
            if not (isinstance(e, list) and len(e) == 2 and all(isinstance(x, list) and len(x) == 2 and x[0] and x[1] for x in e)): continue
            skip.add(k); out.append({"w": w, "p": o['p'], "ipa": ipa(w), "vi": o['vi'].strip(), "d": o['d'].strip(), "e": [[x[0].strip(), x[1].strip()] for x in e]})
    return sorted(out, key=lambda o: o['w'].lower())
def ramp(n, a=12, b=27):
    L = max(1, round(n / ((a + b) / 2))); s = [round(a + (b - a) * k / max(1, L - 1)) for k in range(L)]
    d = n - sum(s); k = len(s) - 1
    while d: st = 1 if d > 0 else -1; s[k] += st; d -= st; k = (k - 1) % len(s)
    return s
seen = set()
c1 = load(['out-c1a.jsonl', 'out-c1b.jsonl'], seen); c2 = load(['out-c2a.jsonl', 'out-c2b.jsonl'], seen)
ix = json.load(open(R + 'index.json')); ix['cefr'] = [p for p in ix['cefr'] if p['id'] not in ('cefr-c1', 'cefr-c2')]
for lv, data, name in [('c1', c1, 'Từ vựng cao cấp C1'), ('c2', c2, 'Từ vựng thành thạo C2')]:
    if not data: continue
    json.dump(data, open(R + f'cefr-{lv}.json', 'w'), ensure_ascii=False, separators=(',', ':'))
    s = ramp(len(data)); ix['cefr'].append({"id": "cefr-" + lv, "title": name, "sub": "Chuẩn CEFR " + lv.upper(), "n": len(data), "lessons": len(s), "sizes": s})
json.dump(ix, open(R + 'index.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('C1', len(c1), 'C2', len(c2), 'noIPA', sum(1 for o in c1 + c2 if not o['ipa']))
