#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Enrichissement BoardGameGeek pour « Chimère · tirage de soirée ».

Lit chimere_tirage.html, interroge l'API publique BoardGameGeek pour chaque
jeu, et écrit chimere_tirage_enrichi.html en y injectant l'image de la boîte,
le nombre de joueurs, la durée, la complexité, le thème, la mécanique et le
lien BGG réels.

USAGE :  python3 enrichir_chimere.py

- Aucune installation requise (Python 3 standard uniquement).
- Reprenable : un cache (bgg_cache.json) est sauvegardé au fil de l'eau, et
  l'HTML est réécrit tous les 20 jeux. Si le script est interrompu, relance-le :
  il repart d'où il en était. Sur ~434 jeux, compter ~10 à 15 minutes.
- enrichissement_rapport.csv liste les correspondances trouvées (pour repérer
  un mauvais appariement de nom).
"""

import sys, re, json, time, csv, os, urllib.parse, urllib.request, urllib.error
import xml.etree.ElementTree as ET

API       = "https://boardgamegeek.com/xmlapi2"
HTML_IN   = sys.argv[1] if len(sys.argv) > 1 else "chimere_tirage.html"
HTML_OUT  = "chimere_tirage_enrichi.html"
CACHE     = "bgg_cache.json"
REPORT    = "enrichissement_rapport.csv"
PAUSE     = 0.7          # pause entre appels (courtoisie envers BGG)
SAVE_EVERY = 20          # réécrit l'HTML tous les N jeux traités

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

def fetch(url):
    for attempt in range(6):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Chimere/1.0"})
            with urllib.request.urlopen(req, timeout=30) as r:
                if getattr(r, "status", 200) == 202:
                    time.sleep(2.5); continue
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (202, 429, 503):
                time.sleep(3 + attempt*2); continue
            raise
        except Exception:
            time.sleep(2 + attempt); continue
    return None

def search_id(name):
    q = OVERRIDE_QUERY.get(name, name)
    data = fetch(f"{API}/search?type=boardgame&query={urllib.parse.quote(q)}")
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
    data = fetch(f"{API}/thing?id={gid}&stats=1"); time.sleep(PAUSE)
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

def main():
    if not os.path.exists(HTML_IN):
        print(f"Fichier introuvable : {HTML_IN}"); sys.exit(1)
    html = open(HTML_IN, encoding="utf-8").read()
    m = re.search(r"const GAMES = (\[.*?\]);", html, re.S)
    if not m:
        print("Liste des jeux introuvable dans le HTML."); sys.exit(1)
    games = json.loads(m.group(1))
    cache = load_cache()
    print(f"{len(games)} jeux. Déjà en cache : {len(cache)}. Enrichissement BGG…\n")

    processed = 0
    for i, g in enumerate(games, 1):
        name = g["name"]
        if name in cache and cache[name].get("bggid"):
            g.update(cache[name]["patch"]); 
            continue
        patch, matched, gid = enrich_fields(name, g)
        if patch:
            g.update(patch)
            cache[name] = {"bggid": patch["bggid"], "matched": matched, "patch": patch}
        else:
            cache[name] = {"bggid": None, "matched": matched, "patch": {}}
        processed += 1
        print(f"[{i:3d}/{len(games)}] {name[:40]:40s} -> {str(matched)[:38]}")
        if processed % SAVE_EVERY == 0:
            json.dump(cache, open(CACHE, "w", encoding="utf-8"), ensure_ascii=False)
            write_html(html, m, games)

    # sauvegardes finales
    json.dump(cache, open(CACHE, "w", encoding="utf-8"), ensure_ascii=False)
    write_html(html, m, games)
    with open(REPORT, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f); w.writerow(["nom appli", "correspondance BGG", "bggid"])
        for g in games:
            c = cache.get(g["name"], {})
            w.writerow([g["name"], c.get("matched", ""), c.get("bggid", "") or ""])

    ok = sum(1 for g in games if g.get("bggid"))
    print(f"\nTerminé : {ok}/{len(games)} jeux associés à BGG.")
    print(f"→ {HTML_OUT}  (prêt à l'emploi — ouvre-le, les images apparaissent)")
    print(f"→ {REPORT}   (vérifie les correspondances douteuses)")
    if ok < len(games):
        print("Relance le script pour retenter les jeux non trouvés (il reprend via le cache).")

if __name__ == "__main__":
    main()
