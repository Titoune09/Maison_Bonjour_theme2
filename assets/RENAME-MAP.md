# Convention de nommage des assets — Maison Bonjour

Tous les fichiers sont en **kebab-case ASCII** (pas d'espaces, pas d'accents, pas d'IDs aléatoires).
Chaque fichier est **préfixé par son dossier** (singularisé) pour faciliter l'autocomplétion et le grep.

## Préfixes par dossier

| Dossier | Préfixe | Exemple |
|---|---|---|
| `box/` | `box-` | `box-provence-01.png` |
| `logos/` | `logo-` | `logo-carte-de-visite.svg` |
| `produits/` | `produit-` | `produit-tapenade-lou-pais.webp` |
| `paysages-esthetiques/` | `paysage-esthetique-` | `paysage-esthetique-gordes-01.png` |
| `paysages-regions/<region>/` | `paysage-region-<region>-` | `paysage-region-bretagne-01.jpeg` |

## Arborescence finale

### Racine `assets/` (16 fichiers + RENAME-MAP)
Inchangée : `404.jpg`, `404.svg`, `apple-touch.png`, `artisan.jpg`, `base.css`, `current-box.jpg`, `current-box@2x.jpg`, `favicon-16.png`, `favicon.png`, `favicon.svg`, `hero.jpg`, `hero-mobile.jpg`, `logo-mark.svg`, `og-image.jpg`, `og-image-sq.jpg`, `theme.js`.

### `box/` (4)
- `box-interieur.png`
- `box-provence-01.png`
- `box-provence-02.png`
- `box-provence-mise-en-scene.png`

### `logos/` (4)
- `logo-carte-de-visite.pdf`
- `logo-carte-de-visite.png`
- `logo-carte-de-visite.svg`
- `logo-maison-bonjour-dark.png`

### `produits/` (9)
- `produit-boite-9-mini-calissons.webp`
- `produit-calissons-mise-en-scene.png`
- `produit-cigale-louis-sicard-1895-30cm.jpg`
- `produit-cigale-louis-sicard-mise-en-scene.png`
- `produit-lot-5-sachets-lavande-provence.jpg`
- `produit-savon-100g-lavande-provence.jpg`
- `produit-savon-lavande-mise-en-scene.png`
- `produit-tapenade-lou-pais-mise-en-scene.png`
- `produit-tapenade-lou-pais.webp`

### `paysages-regions/` (23 — répartis en 12 sous-dossiers)

| Région | Fichiers |
|---|---|
| `alsace/` | `paysage-region-alsace-01.jpeg` à `…-03.jpeg` |
| `auvergne/` | `paysage-region-auvergne-01.jpeg` |
| `bourgogne/` | `paysage-region-bourgogne-01.jpeg` |
| `bretagne/` | `paysage-region-bretagne-01.jpeg` à `…-03.jpeg` |
| `champagne/` | `paysage-region-champagne-01.jpeg` |
| `corse/` | `paysage-region-corse-01.jpeg` |
| `cote-d-azur/` | `paysage-region-cote-d-azur-01.jpeg` |
| `normandie/` | `paysage-region-normandie-01.jpeg` à `…-03.jpeg` |
| `pays-basque/` | `paysage-region-pays-basque-01.jpeg` à `…-02.jpeg` |
| `perigord/` | `paysage-region-perigord-01.jpeg` à `…-02.jpeg` |
| `provence/` | `paysage-region-provence-01.jpeg` à `…-04.jpeg` |
| `val-de-loire/` | `paysage-region-val-de-loire-01.jpeg` |

### `paysages-esthetiques/` (88) — visuels AI + photos + doublons régions

**Villages & lieux**
- `paysage-esthetique-abbaye-de-senanque-01.png`
- `paysage-esthetique-gordes-01.png` à `…-04.png`
- `paysage-esthetique-ruelles-gordes-01.png` à `…-03.png`
- `paysage-esthetique-les-baux-de-provence-01.png` à `…-02.png`
- `paysage-esthetique-lourmarin-01.png` à `…-04.png`
- `paysage-esthetique-moustiers-sainte-marie-01.png` à `…-02.png`
- `paysage-esthetique-roussillon-01.png` à `…-04.png`
- `paysage-esthetique-sentier-des-ocres-01.png` à `…-02.png`
- `paysage-esthetique-alpilles-01.png` à `…-03.png`
- `paysage-esthetique-camargue-abrivado-01.png`

**Scènes & ambiances**
- `paysage-esthetique-aperitif-exterieur-01.png` à `…-02.png`
- `paysage-esthetique-aperitif-golden-hour-01.png` à `…-02.png`
- `paysage-esthetique-petit-dejeuner-terrasse-01.png` à `…-02.png`
- `paysage-esthetique-terrasse-pergola-01.png` à `…-02.png`
- `paysage-esthetique-piscine-luberon-01.png`

**Détails & objets**
- `paysage-esthetique-flat-lay-provence-01.png` à `…-02.png`
- `paysage-esthetique-interieur-mas-provencal-01.png` à `…-02.png`
- `paysage-esthetique-marche-provencal-01.png` à `…-02.png`
- `paysage-esthetique-epicerie-fine-01.png`
- `paysage-esthetique-texture-poterie-01.png` à `…-07.png`

**Photos brutes Provence (jpg)** — 16
- `paysage-esthetique-provence-photo-01.jpg` à `…-16.jpg`

**Doublons photos régions (à dédupliquer manuellement)** — 23
- `paysage-esthetique-photo-region-01.jpeg` à `…-23.jpeg`
- Ces images sont des copies des photos désormais classées dans `paysages-regions/<region>/`. Tu peux les supprimer manuellement quand tu veux.

### `custom/` (9) — fichiers de doc, inchangés
`01-favicon.txt` … `08-404-illustration.txt` + `ARBORESCENCE.txt`.

## Utiliser depuis le code

Vu la convention, en HTML/CSS/JS tu peux retrouver n'importe quel asset en tapant son préfixe :

```html
<img src="assets/produits/produit-tapenade-lou-pais.webp" alt="Tapenade Lou Pais">
<img src="assets/paysages-esthetiques/paysage-esthetique-gordes-01.png" alt="Gordes">
<img src="assets/paysages-regions/bretagne/paysage-region-bretagne-01.jpeg" alt="Bretagne">
<img src="assets/logos/logo-maison-bonjour-dark.png" alt="Maison Bonjour">
```

Pour récupérer toutes les photos d'une région : grep `paysage-region-<nom>-`.
Pour toutes les régions : grep `paysage-region-`.
Pour toutes les images esthétiques : grep `paysage-esthetique-`.

## Récap des opérations

- **122 fichiers renommés au total** : 99 via le script + 5 fixes manuels (filesystem case-insensitive) + 23 régions (en sous-dossiers)
- **1 dossier renommé** : `paysages-régions/` → `paysages-regions/`
- **0 suppression** (l'utilisateur n'a pas autorisé) → les 23 doublons WhatsApp dans `paysages-esthetiques` ont été renommés `paysage-esthetique-photo-region-NN.jpeg` au lieu d'être effacés
