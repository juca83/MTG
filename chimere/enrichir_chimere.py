#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Enrichissement BoardGameGeek pour « Chimère · tirage de soirée ».

Lit chimere_tirage.html, interroge l'API publique BoardGameGeek pour chaque
jeu, et écrit chimere_tirage_enrichi.html en y injectant l'image de la boîte,
le nombre de joueurs, la durée, la complexité, le thème, la mécanique et le
lien BGG réels.

USAGE :  python3 enrichir_chimere.py      (Windows : python enrichir_chimere.py)

- Aucune installation requise (Python 3 standard uniquement).
- Reprenable : un cache (bgg_cache.json) est sauvegardé au fil de l'eau, et
  l'HTML est réécrit tous les 20 jeux. Si le script est interrompu, relance-le :
  il repart d'où il en était. Sur ~434 jeux, compter ~10 à 15 minutes.
- enrichissement_rapport.csv liste les correspondances trouvées (pour repérer
  un mauvais appariement de nom).

IMPORTANT — depuis fin 2025, BoardGameGeek exige une inscription et un jeton
d'accès personnel : sans jeton, l'API répond « HTTP 401 Unauthorized ».
Inscription (gratuite pour un usage privé) : https://boardgamegeek.com/using_the_xml_api
Place ensuite ton jeton, seul sur la première ligne, dans un fichier
bgg_token.txt placé à côté de ce script.

Au démarrage, le script teste plusieurs accès (avec puis sans jeton) et retient
le premier qui répond. En cours de route, aucune erreur réseau n'interrompt le
travail : le jeu concerné est simplement noté comme non trouvé et sera retenté
à la prochaine exécution.
"""

import sys, re, json, time, csv, os, urllib.parse, urllib.request, urllib.error
import http.cookiejar
import xml.etree.ElementTree as ET

HTML_IN   = sys.argv[1] if len(sys.argv) > 1 else "chimere_tirage.html"
HTML_OUT  = "chimere_tirage_enrichi.html"
CACHE     = "bgg_cache.json"
REPORT    = "enrichissement_rapport.csv"
PAUSE     = 0.7          # pause entre appels (courtoisie envers BGG)
SAVE_EVERY = 20          # réécrit l'HTML tous les N jeux traités

# --- Accès à l'API ----------------------------------------------------------
# Depuis fin 2025, BoardGameGeek exige une inscription et un jeton d'accès :
# sans jeton, l'API répond « HTTP 401 Unauthorized » à tout le monde.
# Voir https://boardgamegeek.com/using_the_xml_api
#
# Colle ton jeton dans un fichier bgg_token.txt placé à côté de ce script
# (ou définis la variable d'environnement BGG_TOKEN).
TOKEN_FILE = "bgg_token.txt"

UA_NAVIGATEUR = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                 "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
UA_SIMPLE     = "Chimere/1.0 (enrichissement de collection personnelle)"

HOTES = [
    ("boardgamegeek.com",     "https://boardgamegeek.com/xmlapi2"),
    ("api.geekdo.com",        "https://api.geekdo.com/xmlapi2"),
    ("www.boardgamegeek.com", "https://www.boardgamegeek.com/xmlapi2"),
]

ACTIF = {"api": None, "ua": None, "nom": None, "erreur": "",
         "token": "", "auth": "", "401": False}

def lire_token():
    """Jeton BGG depuis bgg_token.txt ou la variable d'environnement BGG_TOKEN."""
    brut = os.environ.get("BGG_TOKEN", "")
    if not brut and os.path.exists(TOKEN_FILE):
        try:
            for ligne in open(TOKEN_FILE, encoding="utf-8-sig"):
                ligne = ligne.strip()
                if ligne and not ligne.startswith("#"):
                    brut = ligne
                    break
        except Exception:
            pass
    brut = brut.strip().strip('"').strip("'")
    if brut.lower().startswith("bearer "):
        brut = brut[7:].strip()
    return brut

def strategies():
    """Combinaisons d'accès à essayer, avec ou sans jeton."""
    tok = ACTIF["token"]
    out = []
    if tok:
        for nom, api in HOTES:
            out.append((f"{nom}, avec jeton", api, UA_NAVIGATEUR, tok))
    for nom, api in HOTES:
        out.append((f"{nom}, sans jeton", api, UA_NAVIGATEUR, ""))
    out.append((f"{HOTES[0][0]}, sans jeton, mode simple", HOTES[0][1], UA_SIMPLE, ""))
    return out

# Certaines protections posent un cookie à la première visite : on le conserve.
_opener = urllib.request.build_opener(
    urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))

# --- Associations manuelles : bon identifiant BGG si un nom tombe à côté ---
OVERRIDE_ID = {
    # "Recall": 123456,
}
# --- Requête améliorée quand le titre FR ne matche pas bien le titre BGG ---
OVERRIDE_QUERY = {
    "Les Aventuriers du Rail Europe": "Ticket to Ride Europe",
    "Les Châteaux de Bourgogne": "The Castles of Burgundy",
    "Mégawatts (Funkenschlag)": "Power Grid",
    "L'Âge de Pierre": "Stone Age",
    "Rencontre Cosmique": "Cosmic Encounter",
    "Genoa (Les Marchands de Gênes)": "Traders of Genoa",
    "Naissance et Apogée des Empires (Nations)": "Nations",
    "Kingdomino / Queendomino": "Kingdomino",
    "La Route du Verre (Glass Road)": "Glass Road",
    "À la Gloire d'Odin (A Feast for Odin)": "A Feast for Odin",
    "Les Petites Bourgades (Tiny Towns)": "Tiny Towns",
    "Complots (Coup)": "Coup",
    "Les Montagnes Hallucinées": "Mountains of Madness",
    "Disque-Monde: Ankh-Morpork": "Discworld Ankh-Morpork",
    "L'Île Interdite": "Forbidden Island",
    "Projet Gaia (Gaia Project)": "Gaia Project",
    "Death Angel (Space Hulk)": "Space Hulk Death Angel",
    "La Communauté de l'Anneau: Le Jeu de Pli Coopératif": "Lord of the Rings Trick Taking",
    "Bang! The Dice Game / Dodge City": "Bang The Dice Game",
    "Les Demeures de l'Épouvante": "Mansions of Madness",
    "Les Ruines Perdues de Narak": "Lost Ruins of Arnak",
    "Les Piliers de la Terre": "Pillars of the Earth",
    "Un Monde sans Fin": "World Without End",
}

CAT2THEME = [
    (["Economic","Industry / Manufacturing","Farming","Transportation","Trains","City Building"], "eco"),
    (["Civilization"], "civ"),
    (["Ancient","Medieval","Renaissance","Age of Reason","Political","Territory Building","Nautical"], "hist"),
    (["Science Fiction","Space Exploration"], "sf"),
    (["Fantasy","Mythology","Adventure"], "fantasy"),
    (["Animals","Environmental","Prehistoric"], "nature"),
    (["Horror","Zombies"], "horror"),
    (["Wargame","Fighting","World War II","Napoleonic","American Civil War","Modern Warfare","Miniatures"], "war"),
    (["Party Game","Humor","Children's Game"], "party"),
    (["Abstract Strategy"], "abstract"),
    (["Deduction","Murder/Mystery","Spies/Secret Agents"], "enquete"),
]
MECH2FAM = [
    ("worker",   ["Worker Placement","Worker Placement, Different Worker Types","Worker Placement with Dice Workers"]),
    ("deckbuild",["Deck, Bag, and Pool Building","Deck Construction"]),
    ("rollwrite",["Paper-and-Pencil","Roll / Spin and Write"]),
    ("trick",    ["Trick-taking"]),
    ("push",     ["Push Your Luck"]),
    ("draft",    ["Open Drafting","Closed Drafting"]),
    ("tile",     ["Tile Placement","Pattern Building"]),
    ("engine",   ["Engine Building"]),
    ("nego",     ["Negotiation","Trading"]),
    ("bluff",    ["Hidden Roles","Bluffing","Betting and Bluffing","Deduction","Traitor Game"]),
    ("coop",     ["Cooperative Game"]),
    ("area",     ["Area Majority / Influence","Area Movement","Area-Impulse"]),
    ("setcol",   ["Set Collection"]),
    ("race",     ["Race"]),
    ("dice",     ["Dice Rolling"]),
    ("cards",    ["Hand Management","Card Play Conflict Resolution"]),
    ("rapidite", ["Speed Matching","Real-Time","Pattern Recognition","Memory"]),
    ("combat",   ["Grid Movement","Modular Board","Line of Sight"]),
]

def dire(msg=""):
    """print qui ne plante jamais sur un accent (console Windows)."""
    try:
        print(msg)
    except UnicodeEncodeError:
        enc = sys.stdout.encoding or "ascii"
        print(str(msg).encode(enc, "replace").decode(enc, "replace"))
    sys.stdout.flush()

def http_get(url, ua, token="", timeout=30):
    """Retourne (code, contenu). Lève l'exception d'origine en cas d'échec."""
    entetes = {
        "User-Agent": ua,
        "Accept": "application/xml, text/xml, */*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        "Referer": "https://boardgamegeek.com/",
        "Connection": "keep-alive",
    }
    if token:
        entetes["Authorization"] = "Bearer " + token
    req = urllib.request.Request(url, headers=entetes)
    with _opener.open(req, timeout=timeout) as r:
        return getattr(r, "status", 200), r.read()

def _xml_utilisable(data):
    if not data:
        return False
    try:
        return ET.fromstring(data).find("item") is not None
    except ET.ParseError:
        return False

def choisir_strategie(silencieux=False):
    """Teste les accès possibles et retient le premier qui répond vraiment."""
    if not silencieux:
        dire("Recherche d'un accès à BoardGameGeek…")
    ACTIF["401"] = False
    for nom, api, ua, tok in strategies():
        # visite d'accueil : récupère un éventuel cookie de protection
        racine = api.rsplit("/xmlapi2", 1)[0] + "/"
        try:
            http_get(racine, ua, timeout=20)
        except Exception:
            pass
        time.sleep(0.5)
        url = f"{api}/search?type=boardgame&query=Catan"
        try:
            code, data = http_get(url, ua, tok)
            if code == 202:                       # file d'attente : on patiente
                time.sleep(3)
                code, data = http_get(url, ua, tok)
            if _xml_utilisable(data):
                ACTIF.update({"api": api, "ua": ua, "nom": nom, "erreur": "", "auth": tok})
                if not silencieux:
                    dire(f"  OK via {nom}\n")
                return True
            detail = f"réponse inattendue (HTTP {code})"
        except urllib.error.HTTPError as e:
            detail = f"HTTP {e.code} {e.reason}"
            if e.code in (401, 403):
                ACTIF["401"] = True
        except urllib.error.URLError as e:
            detail = f"pas de connexion ({e.reason})"
        except Exception as e:
            detail = f"{type(e).__name__}: {e}"
        if not silencieux:
            dire(f"  {nom} : {detail}")
        ACTIF["erreur"] = detail
        time.sleep(1)
    return False

def expliquer_401():
    """Message d'aide quand BGG refuse l'accès faute de jeton valable."""
    if ACTIF["token"]:
        dire("BoardGameGeek refuse le jeton fourni.")
        dire("")
        dire(f"Le jeton lu fait {len(ACTIF['token'])} caractères et commence par "
             f"« {ACTIF['token'][:6]}… ».")
        dire("Vérifie dans bgg_token.txt que tu as bien collé le jeton entier,")
        dire("sur une seule ligne, sans espace ni guillemet autour. Un jeton")
        dire("tout juste créé peut aussi mettre quelques minutes à être actif.")
    else:
        dire("BoardGameGeek n'accepte plus les accès anonymes à son catalogue.")
        dire("")
        dire("Depuis fin 2025, le site exige une inscription et un jeton")
        dire("personnel. C'est gratuit pour un usage privé comme le tien.")
        dire("")
        dire("  1. Va sur https://boardgamegeek.com/using_the_xml_api")
        dire("     (crée un compte BGG si tu n'en as pas) et suis la procédure")
        dire("     d'inscription à l'API pour obtenir ton jeton.")
        dire("  2. Crée dans CE dossier un fichier texte nommé  bgg_token.txt")
        dire("  3. Colle le jeton dedans, seul, sur la première ligne. Enregistre.")
        dire("  4. Relance ce script : il repartira tout seul.")

def fetch(chemin):
    """Appelle l'API. Ne lève jamais : retourne None si ça n'a pas marché."""
    url = ACTIF["api"] + chemin
    for tentative in range(5):
        try:
            code, data = http_get(url, ACTIF["ua"], ACTIF["auth"])
            if code == 202:                       # requête mise en file par BGG
                time.sleep(2.5); continue
            return data
        except urllib.error.HTTPError as e:
            if e.code in (202, 429, 503):         # trop rapide / site occupé
                time.sleep(4 + tentative * 3); continue
            if e.code in (401, 403):              # accès refusé : on ralentit
                time.sleep(5 + tentative * 4); continue
            time.sleep(2 + tentative); continue
        except Exception:
            time.sleep(2 + tentative); continue
    return None

def search_id(name):
    q = OVERRIDE_QUERY.get(name, name)
    data = fetch(f"/search?type=boardgame&query={urllib.parse.quote(q)}")
    if not data: return None, None
    try: root = ET.fromstring(data)
    except ET.ParseError: return None, None
    items = root.findall("item")
    if not items: return None, None
    ql = q.lower(); best = None
    for it in items:
        nm = (it.find("name").get("value") if it.find("name") is not None else "").lower()
        if nm == ql: best = it; break
    if best is None: best = items[0]
    nm = best.find("name").get("value") if best.find("name") is not None else ""
    return best.get("id"), nm

def weight_bucket(avg):
    if not avg or avg <= 0: return None
    return 1 if avg < 2 else 2 if avg < 3 else 3 if avg < 4 else 4

def map_theme(cats):
    for keys, t in CAT2THEME:
        if any(c in cats for c in keys): return t
    return None

def map_mech(mechs):
    for fam, keys in MECH2FAM:
        if any(m in mechs for m in keys): return fam
    return None

def enrich_fields(name, base):
    """Retourne (patch_dict, matched_name, bggid) ou (None, motif, '')."""
    gid = OVERRIDE_ID.get(name)
    matched = None
    if not gid:
        gid, matched = search_id(name); time.sleep(PAUSE)
    if not gid:
        return None, "AUCUN MATCH", ""
    data = fetch(f"/thing?id={gid}&stats=1"); time.sleep(PAUSE)
    if not data: return None, "erreur thing", str(gid)
    try: it = ET.fromstring(data).find("item")
    except ET.ParseError: return None, "xml invalide", str(gid)
    if it is None: return None, "item vide", str(gid)
    def gv(tag):
        e = it.find(tag)
        return int(e.get("value")) if e is not None and (e.get("value") or "").isdigit() else None
    pmin, pmax = gv("minplayers"), gv("maxplayers")
    ptime = gv("playingtime") or gv("maxplaytime") or gv("minplaytime")
    img = it.find("thumbnail"); img = img.text.strip() if img is not None and img.text else ""
    if img.startswith("//"): img = "https:" + img
    cats  = [l.get("value") for l in it.findall("link") if l.get("type")=="boardgamecategory"]
    mechs = [l.get("value") for l in it.findall("link") if l.get("type")=="boardgamemechanic"]
    avg = it.find("statistics/ratings/averageweight")
    avg = float(avg.get("value")) if avg is not None and avg.get("value") else None
    disp = it.find("name[@type='primary']")
    matched = matched or (disp.get("value") if disp is not None else "")
    patch = {}
    if pmin: patch["pmin"] = pmin
    if pmax and pmax >= (patch.get("pmin", base["pmin"])): patch["pmax"] = pmax
    if ptime and ptime > 0: patch["time"] = ptime
    wb = weight_bucket(avg)
    if wb: patch["weight"] = wb
    th = map_theme(cats); patch["theme"] = th or base["theme"]
    mc = map_mech(mechs); patch["mech"]  = mc or base["mech"]
    if img: patch["img"] = img
    patch["bggid"] = int(gid); patch["verify"] = False
    return patch, matched, str(gid)

def load_cache():
    if os.path.exists(CACHE):
        try: return json.load(open(CACHE, encoding="utf-8"))
        except Exception: return {}
    return {}

def write_html(html, m, games):
    out = html[:m.start(1)] + json.dumps(games, ensure_ascii=False) + html[m.end(1):]
    open(HTML_OUT, "w", encoding="utf-8").write(out)

def sauver(cache, html, m, games):
    json.dump(cache, open(CACHE, "w", encoding="utf-8"), ensure_ascii=False)
    write_html(html, m, games)

def ecrire_rapport(games, cache):
    with open(REPORT, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f); w.writerow(["nom appli", "correspondance BGG", "bggid"])
        for g in games:
            c = cache.get(g["name"], {})
            w.writerow([g["name"], c.get("matched", ""), c.get("bggid", "") or ""])

def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

    if not os.path.exists(HTML_IN):
        dire(f"Fichier introuvable : {HTML_IN}")
        dire("Place ce script dans le même dossier que chimere_tirage.html.")
        sys.exit(1)
    html = open(HTML_IN, encoding="utf-8").read()
    m = re.search(r"const GAMES = (\[.*?\]);", html, re.S)
    if not m:
        dire("Liste des jeux introuvable dans le HTML."); sys.exit(1)
    games = json.loads(m.group(1))
    cache = load_cache()

    ACTIF["token"] = lire_token()
    if ACTIF["token"]:
        dire(f"Jeton BGG trouvé ({len(ACTIF['token'])} caractères).")
    else:
        if os.path.exists(TOKEN_FILE):
            dire(f"Le fichier {TOKEN_FILE} ne contient pas encore de jeton.")
        else:
            dire(f"Pas de fichier {TOKEN_FILE} : essai en accès libre.")

    if not choisir_strategie():
        dire("")
        if ACTIF["401"]:
            expliquer_401()
        else:
            dire("Impossible de joindre BoardGameGeek pour l'instant.")
            dire(f"Dernier motif : {ACTIF['erreur']}")
            dire("")
            dire("Pistes, dans l'ordre :")
            dire("  1. Ouvre https://boardgamegeek.com dans ton navigateur. Si le")
            dire("     site ne s'affiche pas non plus, il est en panne : réessaie")
            dire("     plus tard.")
            dire("  2. Si tu es derrière un VPN ou un réseau filtré, il peut")
            dire("     bloquer le site : essaie depuis une autre connexion.")
        dire("")
        dire("Aucun jeu n'a été perdu : rien n'a encore été modifié.")
        sys.exit(2)

    dire(f"{len(games)} jeux. Déjà en cache : {len(cache)}. Enrichissement BGG…\n")

    processed = 0
    echecs_consecutifs = 0
    interrompu = False
    for i, g in enumerate(games, 1):
        name = g["name"]
        if name in cache and cache[name].get("bggid"):
            g.update(cache[name]["patch"])
            continue
        patch, matched, gid = enrich_fields(name, g)
        if patch:
            g.update(patch)
            cache[name] = {"bggid": patch["bggid"], "matched": matched, "patch": patch}
            echecs_consecutifs = 0
        else:
            cache[name] = {"bggid": None, "matched": matched, "patch": {}}
            echecs_consecutifs += 1
        processed += 1
        dire(f"[{i:3d}/{len(games)}] {name[:40]:40s} -> {str(matched)[:38]}")
        if processed % SAVE_EVERY == 0:
            sauver(cache, html, m, games)

        # Série noire : le site nous a probablement coupé l'accès.
        if echecs_consecutifs >= 12:
            dire("\nBoardGameGeek ne répond plus. Nouvelle tentative d'accès…")
            time.sleep(20)
            if choisir_strategie(silencieux=True):
                dire("Accès rétabli, on continue.\n")
                echecs_consecutifs = 0
            else:
                dire("Toujours refusé : arrêt propre, le travail déjà fait est conservé.")
                interrompu = True
                break

    sauver(cache, html, m, games)
    ecrire_rapport(games, cache)

    ok = sum(1 for g in games if g.get("bggid"))
    dire(f"\nTerminé : {ok}/{len(games)} jeux associés à BGG.")
    dire(f"→ {HTML_OUT}  (prêt à l'emploi — ouvre-le, les images apparaissent)")
    dire(f"→ {REPORT}   (vérifie les correspondances douteuses)")
    if interrompu:
        dire("\nL'accès a été coupé en cours de route. Relance le script dans")
        dire("un moment : il reprendra exactement où il s'est arrêté.")
    elif ok < len(games):
        dire("Relance le script pour retenter les jeux non trouvés (il reprend via le cache).")

if __name__ == "__main__":
    main()
