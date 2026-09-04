import json, re, unicodedata
from apparier import charger, norm, score

# Correspondances établies à la main (nom Excel -> nom dans l'appli)
MANUEL = {
 "great western devenez le m,eilleur éleveur de l'ouest": "Great Western Trail",
 "yom kipur": "Yom Kippour (guerre du Kippour)",
 "the castle of burgundy": "Les Châteaux de Bourgogne",
 "confluence sidérale": "Sidereal Confluence",
 "glory un jeu de chevalier": "Glory: A Game of Knights",
 "res publica romana": "La République de Rome",
 "circadiens premières lueurs": "Circadians: First Light",
 "supremacie le jeu des superpuissances": "Suprématie",
 "51ème état": "51st State",
 "queen domino": "Kingdomino / Queendomino",
 "micro macro": "MicroMacro: Crime City",
 "glen more 2 highland games": "Glen More II: Chronicles",
 "brass (original)": "Brass: Lancashire",
 "shafausa": "Schaffhausen (Schäferstündchen?)",
 "death angel jeu de cartes": "Death Angel (Space Hulk)",
 "a la gloire d'odin extension": "À la Gloire d'Odin (A Feast for Odin)",
 "les pionners": "Les Pionniers (Pioneers)",
 "the war of mine le jeu de plateau": "This War of Mine",
 "colonial": "Colonial: Europe's Empires Overseas",
 "le havre port fluviale": "Le Havre: Le Port Fluvial",
 "dc deck building game": "DC Comics Deck-Building Game",
 "7 wonders dice": "7 Wonders: Duel? (7 Wonders Dice)",
}
# Lignes Excel sans équivalent dans l'appli : fiche à compléter
SANS_FICHE = {"chicago express extension", "york town", "association 10 dés"}

MAN = {norm(k): v for k, v in MANUEL.items()}
INDISPO = ("disparu", "manque le jeu")

def construire():
    rows, games, html, m = charger()
    par_nom = {g["name"]: g for g in games}
    sortie, alertes = [], []
    for r in rows:
        nn = norm(r["nom"])
        if nn in {norm(x) for x in SANS_FICHE}:
            base, conf = None, "sans fiche"
        elif nn in MAN:
            base, conf = par_nom[MAN[nn]], "manuel"
        else:
            best = max(games, key=lambda g: score(r["nom"], g["name"]))
            sc = score(r["nom"], best["name"])
            base, conf = (best, "auto") if sc >= 0.86 else (None, f"douteux {sc:.2f}")
            if conf.startswith("douteux"): alertes.append((r["nom"], best["name"], sc))
        info = r["info"]
        dispo = not any(k in info.lower() for k in INDISPO)
        if base:
            e = dict(base)
            e.pop("id", None); e.pop("owners", None)
        else:
            e = {"name": r["nom"].strip().capitalize(), "pmin": None, "pmax": None, "time": None,
                 "weight": None, "theme": None, "mech": None, "img": "", "bggid": None}
            e["nofiche"] = True
        e["verify"] = bool(base["verify"]) if base else True
        e["owner"] = r["owner"]
        if info: e["info"] = info
        if not dispo: e["dispo"] = False
        sortie.append(e)
    return sortie, games, html, m, alertes

if __name__ == "__main__":
    out, games, html, m, alertes = construire()
    print(f"entrées produites : {len(out)}")
    print(f"titres distincts  : {len({e['name'] for e in out})}")
    print(f"sans fiche        : {sum(1 for e in out if e.get('nofiche'))}")
    print(f"indisponibles     : {sum(1 for e in out if e.get('dispo') is False)}")
    print(f"avec extra info   : {sum(1 for e in out if e.get('info'))}")
    print(f"avec propriétaire : {sum(1 for e in out if e.get('owner'))}")
    print("\nappariements encore douteux :", len(alertes))
    for a in alertes: print("   ", a)
    couverts = {e["name"] for e in out}
    manq = [g["name"] for g in games if g["name"] not in couverts]
    print(f"\njeux de l'appli que personne ne possède : {len(manq)}")
    for n in manq: print("   ", n)
