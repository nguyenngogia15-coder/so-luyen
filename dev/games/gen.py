import json, io, os, re, subprocess, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
k=Kokoro('/tmp/claude-0/-home-claude/79890b01-a234-56fc-972b-c62e336ee1c7/scratchpad/tts/kokoro-v1.0.onnx','/tmp/claude-0/-home-claude/79890b01-a234-56fc-972b-c62e336ee1c7/scratchpad/tts/voices-v1.0.bin')
G=json.load(open('gm.json')); os.makedirs('mp3',exist_ok=True)
V=[('bf_emma','en-gb'),('am_michael','en-us'),('bm_george','en-gb'),('af_heart','en-us'),('bf_isabella','en-gb'),('bm_lewis','en-gb')]
def fix(s):
    s=re.sub(r'\b([A-Z](?:-[A-Z])+)\b', lambda m: ', '.join(m.group(1).split('-')), s)
    return s.replace('Ms ','Miz ').replace('Mr ','Mister ').replace('Dr ','Doctor ')
jobs=[]
for i,n in enumerate(G['news']): jobs.append((n['id'], fix(n['say']), V[i%len(V)], {1:0.9,2:1.0,3:1.08}[n['lv']]))
for j,s in enumerate(G['spells']):
    for q,t in enumerate(s['s']): jobs.append((f"{s['id']}-{q}", t, V[(j+q)%len(V)], 0.95))
for key,text,(v,lang),sp in jobs:
    f=f'mp3/{key}.mp3'
    if os.path.exists(f): continue
    a,sr=k.create(text,voice=v,speed=sp,lang=lang); pad=np.zeros(int(sr*0.2),np.float32)
    b=io.BytesIO(); sf.write(b,np.concatenate([pad,a,pad]),sr,format='WAV')
    subprocess.run(['ffmpeg','-loglevel','quiet','-y','-f','wav','-i','-','-ac','1','-ar','24000','-b:a','48k',f],input=b.getvalue(),check=True)
print('done',len(jobs))
