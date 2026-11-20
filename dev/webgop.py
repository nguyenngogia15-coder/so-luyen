# Mô phỏng đúng cách web chấm (nhiệt độ 2, chuẩn hóa trong 39 âm, căn CTC), so HuBERT web với XLSR int8 theo 2 cách gom ký hiệu
import sys, io, json, glob, numpy as np, soundfile as sf, pyarrow.parquet as pq, onnxruntime as ort
B, N = sys.argv[1], int(sys.argv[2])
ARPA = ["AA","AE","AH","AO","AW","AY","B","CH","D","DH","EH","ER","EY","F","G","HH","IH","IY","JH","K","L","M","N","NG","OW","OY","P","R","S","SH","T","TH","UH","UW","V","W","Y","Z","ZH"]
A2I = {a: i for i, a in enumerate(ARPA)}; NPH = 39
hv = json.load(open(glob.glob(f"{B}/hf/hub/models--Peacockery--hubert-base-phoneme-en/snapshots/*/vocab.json")[0]))
xv = json.load(open(glob.glob(f"{B}/hf/hub/models--facebook--wav2vec2-xlsr-53-espeak-cv-ft/snapshots/*/vocab.json")[0]))
IPA = {"AA":["ɑː","ɑ"],"AE":["æ"],"AH":["ʌ","ə"],"AO":["ɔː","ɔ"],"AW":["aʊ"],"AY":["aɪ"],"B":["b"],"CH":["tʃ"],"D":["d"],"DH":["ð"],"EH":["ɛ"],"ER":["ɚ","ɜː","ɜ"],"EY":["eɪ"],"F":["f"],"G":["ɡ"],"HH":["h"],"IH":["ɪ","ᵻ"],"IY":["iː","i"],"JH":["dʒ"],"K":["k"],"L":["l","ɫ"],"M":["m"],"N":["n"],"NG":["ŋ"],"OW":["oʊ"],"OY":["ɔɪ"],"P":["p"],"R":["ɹ","r"],"S":["s"],"SH":["ʃ"],"T":["t"],"TH":["θ"],"UH":["ʊ"],"UW":["uː","u"],"V":["v"],"W":["w"],"Y":["j"],"Z":["z"],"ZH":["ʒ"]}
BASE = dict(a="AA",ɑ="AA",ä="AA",æ="AE",ɐ="AH",ʌ="AH",ə="AH",ɚ="ER",ɜ="ER",ɛ="EH",e="EY",ɪ="IH",ᵻ="IH",i="IY",ɨ="IH",o="OW",ɔ="AO",ɒ="AA",ʊ="UH",u="UW",ʉ="UW",ɯ="UW",y="UW",ø="ER",œ="EH",ɵ="ER",b="B",d="D",ɖ="D",ɟ="JH",f="F",ɸ="F",ɡ="G",g="G",h="HH",ħ="HH",j="Y",ʝ="Y",k="K",c="K",q="K",l="L",ɫ="L",ɭ="L",ʎ="L",ɬ="L",m="M",n="N",ɲ="N",ɳ="N",ŋ="NG",ɴ="NG",p="P",r="R",ɹ="R",ɾ="D",ɻ="R",ʁ="R",ɽ="R",s="S",ʂ="SH",ɕ="SH",ʃ="SH",t="T",ʈ="T",v="V",ʋ="V",β="V",w="W",x="HH",χ="HH",ɣ="G",z="Z",ʐ="ZH",ʑ="ZH",ʒ="ZH",θ="TH",ð="DH",ç="SH")
DI = {"tʃ":"CH","dʒ":"JH","tɕ":"CH","dʑ":"JH","aɪ":"AY","aʊ":"AW","eɪ":"EY","oʊ":"OW","ɔɪ":"OY","ai":"AY","au":"AW","ei":"EY","ou":"OW","oi":"OY","əʊ":"OW","ɛɪ":"EY"}
exact = {t: A2I[a] for a, ts in IPA.items() for t in ts}
def near(tok):
    if tok in exact: return exact[tok]
    for k, a in DI.items():
        if tok.startswith(k): return A2I[a]
    return A2I[BASE[tok[0]]] if tok and tok[0] in BASE else None
XB = xv["<pad>"]
mapA = {i: exact.get(t) for t, i in xv.items()}
mapB = {i: (near(t) if i != XB else None) for t, i in xv.items()}
def rows(lg, mode):
    lg = lg / 2; lg = lg - lg.max(1, keepdims=True); e = np.exp(lg); e /= e.sum(1, keepdims=True)
    R = np.zeros((len(e), NPH + 1))
    if mode == "hb":
        for t, i in hv.items():
            if t in A2I: R[:, A2I[t]] += e[:, i]
            else: R[:, NPH] += e[:, i]
    else:
        m = mapA if mode == "A" else mapB
        for i in range(e.shape[1]):
            k = m.get(i); R[:, NPH if k is None else k] += e[:, i]
    return np.log(R + 1e-10)
def align(L, seq):
    S = [NPH]; [S.extend([p, NPH]) for p in seq]; n = len(S); F = len(L); NEG = -1e30
    D = np.full(n, NEG); D[0] = L[0, S[0]]; D[1] = L[0, S[1]]; bp = np.zeros((F, n), np.int8)
    skip = np.array([s >= 2 and S[s] != NPH and S[s] != S[s - 2] for s in range(n)]); Sx = np.array(S)
    for t in range(1, F):
        c0 = D; c1 = np.concatenate([[NEG], D[:-1]]); c2 = np.where(skip, np.concatenate([[NEG, NEG], D[:-2]]), NEG)
        st = np.stack([c0, c1, c2]); k = st.argmax(0); D = st.max(0) + L[t, Sx]; bp[t] = k
    s = n - 2 if D[n - 2] > D[n - 1] else n - 1; segs = [[] for _ in seq]
    for t in range(F - 1, -1, -1):
        if s % 2: segs[(s - 1) // 2].append(t)
        s -= bp[t, s]
    return segs
def gop(L, seq):
    segs = align(L, seq); out = []
    P = L[:, :NPH]; nb = np.logaddexp.reduce(P, 1)
    for i, p in enumerate(seq):
        fr = segs[i]; out.append(-12.0 if not fr else float((P[fr, p] - nb[fr]).mean()))
    return out
hs = ort.InferenceSession(f"{B}/hb_web.onnx"); xs = ort.InferenceSession(f"{B}/xl/onnx/model_quantized.onnx")
t = pq.read_table(f"{B}/test.parquet").slice(0, N).to_pylist(); R = {"hb": [], "A": [], "B": []}; H = []; PH = []
for r in t:
    w, _ = sf.read(io.BytesIO(r["audio"]["bytes"])); w = w.astype(np.float32); x = ((w - w.mean()) / (w.std() + 1e-7))[None]
    seq = [A2I[''.join(c for c in p if not c.isdigit())] for ww in r["words"] for p in ww["phones"]]
    H += [a for ww in r["words"] for a in ww["phones-accuracy"]]; PH += seq
    R["hb"] += gop(rows(hs.run(None, {"input_values": x})[0][0], "hb"), seq)
    lx = xs.run(None, {"input_values": x})[0][0]
    R["A"] += gop(rows(lx, "A"), seq); R["B"] += gop(rows(lx, "B"), seq)
np.savez(f"{B}/web.npz", H=np.array(H), PH=np.array(PH), **{k: np.array(v) for k, v in R.items()})
from sklearn.metrics import roc_auc_score
H = np.array(H); bad = H < 1.5
for k, v in R.items():
    v = np.array(v); f = 0
    for th in np.percentile(v, np.arange(1, 40)):
        p = v < th; tp = (p & bad).sum(); pr = tp / max(1, p.sum()); rc = tp / max(1, bad.sum()); f = max(f, 2 * pr * rc / max(1e-9, pr + rc))
    print(k, "PCC=%.3f AUC=%.3f F1=%.3f" % (np.corrcoef(v, H)[0, 1], roc_auc_score(bad, -v), f), "pct:", np.round(np.percentile(v, [5, 25, 50, 75, 95]), 2))
