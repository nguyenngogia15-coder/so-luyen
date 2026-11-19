"""Ghép dữ liệu lộ trình từ vựng: vocab/cefr/out-*.jsonl và vocab/topic/*.jsonl → vr/index.json + vr/<phần>.json"""
import json, glob, os, re, sys
V = sys.argv[1] if len(sys.argv) > 1 else "/tmp/claude-0/-home-claude/79890b01-a234-56fc-972b-c62e336ee1c7/scratchpad/vocab"
OUT = sys.argv[2] if len(sys.argv) > 2 else "/home/claude/ielts/vr"
os.makedirs(OUT, exist_ok=True)
allw = json.load(open(V + "/cefr/all.json")) if os.path.exists(V + "/cefr/all.json") else json.load(open("/home/claude/ielts/vdata/all.json"))
IPA = {(x["w"], x["p"]): x["ipa"] for x in allw if x.get("ipa")}; LV = {(x["w"], x["p"]): x["lv"] for x in allw}; IPAW = {}
for x in allw:
    if x.get("ipa"): IPAW.setdefault(x["w"].lower(), x["ipa"])
cmu = json.load(open("/home/claude/ielts/free/site/sp/cmu.json"))
A = {"AA":"ɑː","AE":"æ","AH":"ʌ","AO":"ɔː","AW":"aʊ","AY":"aɪ","EH":"e","ER":"ɜːr","EY":"eɪ","IH":"ɪ","IY":"iː","OW":"oʊ","OY":"ɔɪ","UH":"ʊ","UW":"uː","B":"b","CH":"tʃ","D":"d","DH":"ð","F":"f","G":"ɡ","HH":"h","JH":"dʒ","K":"k","L":"l","M":"m","N":"n","NG":"ŋ","P":"p","R":"r","S":"s","SH":"ʃ","T":"t","TH":"θ","V":"v","W":"w","Y":"j","Z":"z","ZH":"ʒ"}
def arpa(ph):
    out = []; ps = ph.split()
    for i, p in enumerate(ps):
        b = re.sub(r"\d", "", p); s = A.get(b, "")
        if p.endswith("0") and b == "AH": s = "ə"
        if p.endswith("0") and b == "ER": s = "ər"
        if p.endswith("1") and sum(1 for q in ps if re.search(r"\d", q)) > 1:
            j = len(out)
            if j and not re.search(r"[ɑæʌɔaeɜɪioʊuə]", out[-1]) : j -= 1
            out.insert(j, "ˈ")
        out.append(s)
    return "".join(out)
def ipa_of(w, p=None):
    if (w, p) in IPA: return IPA[(w, p)]
    if w.lower() in IPAW: return IPAW[w.lower()]
    parts = [x for x in re.split(r"[\s-]+", re.sub(r"\(.*?\)", "", w.lower())) if x]
    got = []
    for x in parts:
        x2 = re.sub(r"[^a-z']", "", x)
        if x2 in IPAW: got.append(IPAW[x2].strip("/"))
        elif x2 in cmu: got.append(arpa(cmu[x2] if isinstance(cmu[x2], str) else cmu[x2][0]))
        else: return ""
    return "/" + " ".join(got) + "/"
def load(f):
    rows = []
    for ln in open(f, encoding="utf-8"):
        ln = ln.strip()
        if not ln: continue
        try: o = json.loads(ln)
        except Exception: continue
        if not all(o.get(k) for k in ("w", "p", "vi", "d", "e")): continue
        rows.append(o)
    return rows
def ramp(n, a=12, b=27):
    L = max(1, round(n / ((a + b) / 2)))
    s = [round(a + (b - a) * k / max(1, L - 1)) for k in range(L)]
    d = n - sum(s); k = len(s) - 1
    while d: step = 1 if d > 0 else -1; s[k] += step; d -= step; k = (k - 1) % len(s)
    return s
idx = {"cefr": [], "topic": []}
cefr = []
for f in sorted(glob.glob(V + "/cefr/out-*.jsonl")): cefr += load(f)
seen = set(); byLv = {}
for o in cefr:
    k = (o["w"], o["p"])
    if k in seen: continue
    seen.add(k); byLv.setdefault(LV.get(k) or o.get("lv", "A1"), []).append(o)
NAMES = {"A1": "Từ vựng cơ bản A1", "A2": "Từ vựng cơ bản A2", "B1": "Từ vựng trung cấp B1", "B2": "Từ vựng trung cao cấp B2"}
for lv in ["A1", "A2", "B1", "B2"]:
    rows = sorted(byLv.get(lv, []), key=lambda o: o["w"].lower())
    if not rows: continue
    data = [{"w": o["w"], "p": o["p"], "ipa": ipa_of(o["w"], o["p"]), "vi": o["vi"], "d": o["d"], "e": o["e"]} for o in rows]
    pid = "cefr-" + lv.lower(); json.dump(data, open(f"{OUT}/{pid}.json", "w"), ensure_ascii=False, separators=(",", ":"))
    s = ramp(len(data)); idx["cefr"].append({"id": pid, "title": NAMES[lv], "sub": "Chuẩn CEFR " + lv, "n": len(data), "lessons": len(s), "sizes": s})
TOP = json.load(open(V + "/topics.json"))
for slug, en, vi in TOP:
    f = f"{V}/topic/{slug}.jsonl"
    if not os.path.exists(f): continue
    rows = load(f); out = []; ks = set()
    for o in rows:
        k = o["w"].lower()
        if k in ks: continue
        ks.add(k); out.append({"w": o["w"], "p": o["p"], "ipa": ipa_of(o["w"], o["p"]), "vi": o["vi"], "d": o["d"], "e": o["e"]})
    if len(out) < 60: continue
    base = [10, 12, 14, 16, 18, 20, 22, 24, 28, 36]
    s = [max(4, round(x * len(out) / 200)) for x in base]; d = len(out) - sum(s); k = 9
    while d: step = 1 if d > 0 else -1; s[k] += step; d -= step; k = (k - 1) % 10
    pid = "topic-" + slug; json.dump(out, open(f"{OUT}/{pid}.json", "w"), ensure_ascii=False, separators=(",", ":"))
    idx["topic"].append({"id": pid, "title": en, "sub": vi, "n": len(out), "lessons": 10, "sizes": s})
json.dump(idx, open(OUT + "/index.json", "w"), ensure_ascii=False, separators=(",", ":"))
print("cefr", [(p["id"], p["n"], p["lessons"]) for p in idx["cefr"]]); print("topic", len(idx["topic"]), sum(p["n"] for p in idx["topic"]))
print("thiếu IPA:", sum(1 for f in glob.glob(OUT + "/*.json") if not f.endswith("index.json") for x in json.load(open(f)) if not x["ipa"]))
