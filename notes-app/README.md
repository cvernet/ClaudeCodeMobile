# Notes Board — prise de notes + tableau blanc

Application web progressive (PWA) inspirée de **Google Keep** (notes rapides en grille) et de
**Miro** (tableau blanc infini). Installable sur mobile et ordinateur, fonctionne hors ligne,
données stockées **localement** dans le navigateur.

## Fonctionnalités

**Vue Grille (style Keep)**
- Barre « Créer une note… » qui se déplie ; enregistrement automatique au clic extérieur.
- Notes texte ou **listes à cocher** (Entrée = nouvel élément, Retour arrière sur ligne vide =
  suppression, collage multi-lignes = plusieurs éléments, éléments cochés regroupés en bas).
- 12 couleurs, **épinglage**, **libellés** (création à la volée), archives, corbeille.
- Grille « maçonnerie » responsive, recherche instantanée (titre, texte, éléments, libellés).

**Vue Tableau (style Miro)**
- Espace infini : glisser le fond pour se déplacer, molette / pincement pour zoomer,
  bouton « Tout afficher ».
- Double-clic sur le fond : nouvelle note à cet endroit.
- Glisser-déposer, redimensionnement (coin inférieur droit), premier plan automatique.
- **Liens fléchés** : tirer une poignée ● vers une autre note. Relâcher dans le vide crée une
  nouvelle note déjà reliée.
- Sélection multiple (Maj + clic, Maj + glisser), déplacement groupé, couleur, duplication,
  suppression. Les flèches du clavier déplacent la sélection.
- La recherche estompe les notes qui ne correspondent pas.

**Ergonomie**
- **Annuler / Rétablir** global (Ctrl+Z / Ctrl+Maj+Z). Une session d'édition = une étape.
- Toasts « Annuler » après suppression ou archivage.
- Thème clair / sombre, mobile (tiroir latéral, bouton +, éditeur plein écran, gestes tactiles).
- Export / import JSON.

| Raccourci | Action |
|---|---|
| `N` | Nouvelle note |
| `/` | Rechercher |
| `G` / `T` | Vue grille / tableau |
| `Ctrl+Z`, `Ctrl+Maj+Z` | Annuler / rétablir |
| `Suppr` | Supprimer la sélection (tableau) |
| `Ctrl+A`, `Ctrl+D` | Tout sélectionner, dupliquer (tableau) |
| `+` / `-` / `F` | Zoom avant / arrière / tout afficher |
| `Entrée` / `Échap` | Modifier la note sélectionnée / fermer |

## Développement

```bash
cd notes-app
npm install
npm run dev       # serveur de développement
npm test          # tests unitaires du store (Vitest)
npm run build     # build de production dans dist/ (chemins relatifs, hébergeable partout)
```

## Architecture

```
src/
├── types.ts            modèle (Note, Label, Connector, couleurs)
├── store.ts            reducer + historique annuler/rétablir, persistance localStorage, données de démo
├── context.tsx         API partagée (dispatch, éditeur, toasts…)
├── App.tsx             navigation, filtres, raccourcis globaux
└── components/
    ├── GridView.tsx    barre de création + grille maçonnerie
    ├── BoardView.tsx   tableau infini : caméra, gestes, liens, sélection
    ├── NoteEditor.tsx  éditeur modal (brouillon créé seulement s'il n'est pas vide)
    ├── NoteBody.tsx    édition du titre / texte / liste à cocher
    ├── NoteCard.tsx    carte et aperçu d'une note
    ├── NoteToolbar.tsx actions (couleur, libellés, archiver, dupliquer, supprimer)
    ├── Pickers.tsx     popover, sélecteurs de couleur et de libellés
    └── Shell.tsx       barre du haut, barre latérale, dialogue des libellés, toast
```
