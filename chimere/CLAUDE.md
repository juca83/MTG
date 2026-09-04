# Tâche pour Claude Code

Objectif : produire **`chimere_tirage_enrichi.html`**, une application web
autonome de tirage de jeux de société, prête à l'emploi, avec les **images de
boîte** et les données réelles de chaque jeu.

## Ce qu'il faut faire

1. Vérifier que `python3` est disponible (`python3 --version`). Aucune
   dépendance à installer : le script n'utilise que la bibliothèque standard.
2. Depuis ce dossier, lancer :

   ```bash
   python3 enrichir_chimere.py
   ```

   Le script lit `chimere_tirage.html`, interroge l'API publique de
   BoardGameGeek pour les ~434 jeux, et écrit `chimere_tirage_enrichi.html`.
   Cela prend **~10 à 15 minutes** (il fait une pause de courtoisie entre les
   requêtes) et affiche sa progression jeu par jeu.

3. Le script est **reprenable**. S'il s'interrompt (coupure réseau, temps
   dépassé…), le relancer avec la même commande : il repart d'où il en était
   grâce au cache `bgg_cache.json`. À la fin, il indique combien de jeux ont
   été associés (ex. « 420/434 »).

4. Livrer le fichier **`chimere_tirage_enrichi.html`** à l'utilisatrice. Ce
   fichier est autonome : elle peut l'ouvrir par double-clic et le partager tel
   quel à son club.

## Vérifications de fin

- Ouvrir/inspecter `chimere_tirage_enrichi.html` et confirmer que les entrées
  de jeux contiennent bien des URL d'images (`"img": "https://..."`) et des
  identifiants (`"bggid"`).
- `enrichissement_rapport.csv` liste chaque correspondance trouvée. Signaler à
  l'utilisatrice les lignes sans identifiant (jeux non trouvés) ou aux
  correspondances manifestement fausses, pour qu'elle puisse au besoin corriger
  via `OVERRIDE_ID` en haut de `enrichir_chimere.py` puis relancer.

## Ne pas

- Ne pas modifier la logique de l'appli ni le fichier `chimere_tirage.html`
  d'origine ; le script s'en charge en écrivant une copie enrichie.
- Ne pas réduire fortement la pause entre requêtes BGG (rester poli avec l'API).
