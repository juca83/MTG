import openpyxl, re, json, unicodedata, difflib

XLSX="/root/.claude/uploads/aa98a841-db51-5821-a2d7-2ad4c4f3a911/c68b4ae5-Chim_re_boardgame_collection.xlsx"
HTML="/home/user/MTG/chimere/chimere_tirage.html"

def norm(s):
    s=unicodedata.normalize('NFD',str(s).lower())
    s=''.join(c for c in s if unicodedata.category(c)!='Mn')
    s=re.sub(r"[’']"," ",s)
    s=re.sub(r"[^a-z0-9 ]"," ",s)
    return re.sub(r"\s+"," ",s).strip()

MOTS_VIDES={"le","la","les","de","du","des","the","of","a","l","d","et","and"}
def toks(s): return [t for t in norm(s).split() if t not in MOTS_VIDES]

def charger():
    ws=openpyxl.load_workbook(XLSX,data_only=True).active
    rows=[]
    for r in ws.iter_rows(min_row=2,values_only=True):
        if r[0] and str(r[0]).strip():
            rows.append({"nom":str(r[0]).strip(),
                         "owner":(str(r[1]).strip() if r[1] else ""),
                         "info":(str(r[2]).strip() if r[2] else "")})
    h=open(HTML,encoding='utf-8').read()
    m=re.search(r'const GAMES = (\[.*?\]);',h,re.S)
    return rows, json.loads(m.group(1)), h, m

def score(a,b):
    na,nb=norm(a),norm(b)
    if na==nb: return 1.0
    ta,tb=set(toks(a)),set(toks(b))
    s=difflib.SequenceMatcher(None,na,nb).ratio()
    if na and nb and (na.startswith(nb) or nb.startswith(na)): s=max(s,0.93)
    if ta and tb:
        jac=len(ta&tb)/len(ta|tb)
        if ta<=tb or tb<=ta: s=max(s,0.90)          # tous les mots de l'un sont dans l'autre
        s=max(s,0.55*s+0.45*jac)
    return s

if __name__=="__main__":
    rows,games,_,_=charger()
    noms=[g["name"] for g in games]
    res=[]
    for r in rows:
        best=max(range(len(noms)), key=lambda i: score(r["nom"],noms[i]))
        res.append((r,best,score(r["nom"],noms[best])))
    sûrs=[x for x in res if x[2]>=0.86]
    doutes=[x for x in res if x[2]<0.86]
    print(f"appariements sûrs : {len(sûrs)}/{len(rows)}")
    print(f"à vérifier        : {len(doutes)}\n")
    for r,i,s in sorted(doutes,key=lambda x:x[2]):
        print(f"  {s:.2f}  « {r['nom'][:44]:44s} »  ->  {noms[i]}")
    couverts={i for _,i,s in res if s>=0.86}
    manquants=[noms[i] for i in range(len(noms)) if i not in couverts]
    print(f"\njeux de l'appli sans ligne Excel : {len(manquants)}")
    for n in manquants[:40]: print("   ", n)
