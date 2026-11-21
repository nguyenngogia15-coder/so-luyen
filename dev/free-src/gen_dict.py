import json, glob, os, re
src = "/home/claude/so-luyen/vr"; out = os.path.join(src, "dict"); os.makedirs(out, exist_ok=True)
D = {}
for f in sorted(glob.glob(src + "/*.json")):
    name = os.path.basename(f)
    if name == "index.json": continue
    topic = name[6:-5] if name.startswith("topic-") else ""
    data = json.load(open(f))
    items = data if isinstance(data, list) else [x for v in data.values() for x in (v if isinstance(v, list) else [])]
    for e in items:
        if not isinstance(e, dict) or not e.get("w"): continue
        k = e["w"].strip().lower(); ex = (e.get("e") or [[""]])[0][0] if e.get("e") else ""
        old = D.get(k)
        row = [e.get("p", ""), e.get("ipa", ""), e.get("vi", ""), ex, topic]
        if not old: D[k] = row
        elif topic and not old[4]: old[4] = topic
shards = {}
for k, v in D.items():
    c = k[0] if re.match(r"[a-z]", k) else "_"; shards.setdefault(c, {})[k] = v
for c, d in shards.items(): json.dump(d, open(os.path.join(out, c + ".json"), "w"), ensure_ascii=False, separators=(",", ":"))
print(len(D), "words", len(shards), "shards", sum(os.path.getsize(os.path.join(out, c + ".json")) for c in shards) // 1024, "KB")
