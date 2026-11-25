import json, re
from wordfreq import zipf_frequency as Z
R = '/home/claude/so-luyen/vr/'; OLD = '/home/claude/so-luyen/dev/vr-v1/'
KEEP = {"cefr-a1": 600, "cefr-a2": 600, "cefr-b1": 600, "cefr-b2": 800, "cefr-c1": 300, "cefr-c2": 150}
TOPIC_N = 60
def score(w):
    w = re.sub(r"\(.*?\)", "", w).strip().lower()
    s = Z(w, 'en'); return s - 0.8 if ' ' in w else s
def ramp(n, a=12, b=27):
    L = max(1, round(n / ((a + b) / 2))); s = [round(a + (b - a) * k / max(1, L - 1)) for k in range(L)]
    d = n - sum(s); k = len(s) - 1
    while d: st = 1 if d > 0 else -1; s[k] += st; d -= st; k = (k - 1) % len(s)
    return s
def tsizes(n):
    base = [10, 12, 14, 16, 18, 20, 22, 24, 28, 36]
    s = [max(4, round(x * n / 200)) for x in base]; d = n - sum(s); k = 9
    while d: st = 1 if d > 0 else -1; s[k] += st; d -= st; k = (k - 1) % 10
    return s
ix = json.load(open(OLD + 'index.json')); migr = {}; tot = 0; cefrKept = set()
for grp in ('cefr', 'topic'):
    for p in ix[grp]:
        data = json.load(open(OLD + p['id'] + '.json'))
        migr[p['id']] = {"sizes": p['sizes'], "w": [o['w'] for o in data]}
        n = KEEP.get(p['id'], TOPIC_N)
        cand = [o for o in data if grp == 'cefr' or o['w'].lower() not in cefrKept]
        keep = set(o['w'] for o in sorted(cand, key=lambda o: -score(o['w']))[:n])
        if grp == 'cefr': cefrKept |= {w.lower() for w in keep}
        new = [o for o in data if o['w'] in keep]   # giữ thứ tự cũ
        json.dump(new, open(R + p['id'] + '.json', 'w'), ensure_ascii=False, separators=(',', ':'))
        p['n'] = len(new); p['sizes'] = ramp(len(new)) if grp == 'cefr' else tsizes(len(new)); p['lessons'] = len(p['sizes']); tot += len(new)
        print(p['id'], len(data), '->', len(new), p['lessons'], 'bài', 'min score kept', round(min(score(w) for w in keep), 2))
ix['ver'] = 2
json.dump(ix, open(R + 'index.json', 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump(migr, open(R + 'migr-v1.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('total', tot)
