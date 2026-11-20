import sys, io, json, time, numpy as np, torch, soundfile as sf, pyarrow.parquet as pq
from transformers import AutoModelForCTC, AutoFeatureExtractor
torch.set_num_threads(4)
B = sys.argv[1]; name = sys.argv[2]; N = int(sys.argv[3])
M = {"hubert": "Peacockery/hubert-base-phoneme-en", "xlsr": "facebook/wav2vec2-xlsr-53-espeak-cv-ft", "hbweb": "Peacockery/hubert-base-phoneme-en", "xl8": "facebook/wav2vec2-xlsr-53-espeak-cv-ft"}[name]
OX = {"hbweb": B + "/hb_web.onnx", "xl8": B + "/xl/onnx/model_quantized.onnx"}.get(name)
import onnxruntime as ort
model = AutoModelForCTC.from_pretrained(M).eval()
sess = ort.InferenceSession(OX, providers=["CPUExecutionProvider"]) if OX else None
fe = AutoFeatureExtractor.from_pretrained(M)
import glob
voc = json.load(open(glob.glob(f"{B}/hf/hub/models--{M.replace('/','--')}/snapshots/*/vocab.json")[0]))
if isinstance(next(iter(voc.values())), dict): voc = next(iter(voc.values()))
blank = model.config.pad_token_id
IPA = {"AA":["ɑː","ɑ"],"AE":["æ"],"AH":["ʌ","ə"],"AO":["ɔː","ɔ"],"AW":["aʊ"],"AY":["aɪ"],"B":["b"],"CH":["tʃ"],"D":["d"],"DH":["ð"],"EH":["ɛ"],"ER":["ɚ","ɜː","ɜ"],"EY":["eɪ"],"F":["f"],"G":["ɡ"],"HH":["h"],"IH":["ɪ","ᵻ"],"IY":["iː","i"],"JH":["dʒ"],"K":["k"],"L":["l","ɫ"],"M":["m"],"N":["n"],"NG":["ŋ"],"OW":["oʊ"],"OY":["ɔɪ"],"P":["p"],"R":["ɹ","r"],"S":["s"],"SH":["ʃ"],"T":["t"],"TH":["θ"],"UH":["ʊ"],"UW":["uː","u"],"V":["v"],"W":["w"],"Y":["j"],"Z":["z"],"ZH":["ʒ"]}
def ids(p):
    p = ''.join(c for c in p if not c.isdigit())
    if name in ("hubert", "hbweb"): return [voc[p]]
    return [voc[x] for x in IPA[p] if x in voc]
def align(lp, seq):  # lp: T x K (classes), CTC Viterbi forced alignment with blank col index K-1
    T = lp.shape[0]; S = 2 * len(seq) + 1; lab = [-1 if s % 2 == 0 else seq[s // 2] for s in range(S)]
    NEG = -1e9; D = np.full((T, S), NEG); bp = np.zeros((T, S), int)
    col = lambda s: lp[:, -1] if lab[s] < 0 else lp[:, lab[s]]
    E = np.stack([col(s) for s in range(S)], 1)
    D[0, 0] = E[0, 0]; D[0, 1] = E[0, 1]
    for t in range(1, T):
        for s in range(S):
            c = [(D[t-1, s], s)]
            if s >= 1: c.append((D[t-1, s-1], s-1))
            if s >= 2 and lab[s] >= 0 and lab[s] != lab[s-2]: c.append((D[t-1, s-2], s-2))
            v, b = max(c); D[t, s] = v + E[t, s]; bp[t, s] = b
    s = S - 1 if D[-1, S-1] >= D[-1, S-2] else S - 2; path = [s]
    for t in range(T - 1, 0, -1): s = bp[t, s]; path.append(s)
    return path[::-1]
t = pq.read_table(f"{B}/test.parquet").slice(0, N).to_pylist()
G1, G2, H = [], [], []; tsec = 0; asec = 0
for r in t:
    wav, sr = sf.read(io.BytesIO(r["audio"]["bytes"])); wav = wav.astype(np.float32)
    phones = [p for w in r["words"] for p in w["phones"]]; hum = [a for w in r["words"] for a in w["phones-accuracy"]]
    x = fe(wav, sampling_rate=16000, return_tensors="pt").input_values
    t0 = time.time()
    if sess: lg = sess.run(None, {sess.get_inputs()[0].name: x.numpy()})[0][0]; lp = (lg - np.logaddexp.reduce(lg, -1, keepdims=True))
    else:
        with torch.no_grad(): lp = torch.log_softmax(model(x).logits[0], -1).numpy()
    tsec += time.time() - t0; asec += len(wav) / 16000
    # gộp các ký hiệu thay thế của mỗi âm thành một lớp
    uniq = []; seq = []
    for p in phones:
        k = ''.join(c for c in p if not c.isdigit())
        if k not in uniq: uniq.append(k)
        seq.append(uniq.index(k))
    cls = np.stack([np.logaddexp.reduce(lp[:, ids(k)], 1) for k in uniq] + [lp[:, blank]], 1)
    nb = np.delete(lp, blank, 1).max(1)
    path = align(cls, seq)
    seg = {}
    for ti, s in enumerate(path):
        if s % 2: seg.setdefault(s // 2, []).append(ti)
    for i, p in enumerate(phones):
        fr = seg.get(i)
        if not fr: g1 = g2 = -20.0
        else:
            c = cls[fr, seq[i]]; g1 = float(c.mean()); g2 = float((c - nb[fr]).mean())
        G1.append(g1); G2.append(g2); H.append(hum[i])
np.save(f"{B}/res-{name}.npy", np.array([G1, G2, H]))
print(json.dumps({"model": name, "phones": len(H), "rtf": tsec / asec, "params_M": sum(p.numel() for p in model.parameters()) / 1e6}))
