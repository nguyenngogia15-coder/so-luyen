import sys,json
out=open(sys.argv[2],'a',encoding='utf8')
for ln in open(sys.argv[1],encoding='utf8'):
    ln=ln.strip()
    if not ln: continue
    f=ln.split('|')
    assert len(f)==9,(len(f),ln)
    w,p,lv,vi,d,a,b,c,e=f
    out.write(json.dumps({"w":w,"p":p,"lv":lv,"vi":vi,"d":d,"e":[[a,b],[c,e]]},ensure_ascii=False)+"\n")
