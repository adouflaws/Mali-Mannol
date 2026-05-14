# Design

## Theme

Dark industrial — fond bleu-nuit profond (#08152B), sections claires sur blanc pur. Ambiance : salle de contrôle qualité allemande, 14h, lumière naturelle rasante sur métal brossé. Le fond sombre domine (70%), le blanc est réservé aux zones de contenu dense.

## Colors

| Role | Token | Value | Usage |
|---|---|---|---|
| Primary | `--bleu` | `oklch(42% 0.18 255)` → `#0057B8` | Boutons primaires, liens actifs, icônes |
| Primary Dark | `--bleu-fonce` | `oklch(33% 0.16 255)` → `#00429A` | Hover boutons, bordures actives |
| Accent | `--jaune` | `oklch(82% 0.18 85)` → `#F5C200` | CTAs prioritaires, highlights, finder |
| Background Dark | `--nuit` | `oklch(14% 0.04 255)` → `#08152B` | Hero, footer, sections sombres |
| Background Mid | `--nuit-2` | `oklch(18% 0.05 255)` → `#0E1E3B` | Cards sombres, testimonials |
| Background Light | `--fond` | `oklch(97.5% 0.005 255)` → `#F4F9FF` | Body, sections claires |
| Surface | `--surface` | `oklch(100% 0 0)` → `#FFFFFF` | Cards, formulaires |
| Text Primary | `--texte` | `oklch(14% 0.04 255)` → `#08152B` | Corps de texte sur fond clair |
| Text Muted | `--gris` | `oklch(62% 0.04 255)` → `#7A95B0` | Textes secondaires |
| Border | `--bordure` | `oklch(88% 0.02 255)` → `#DDEAF5` | Bordures légères |

## Typography

**Display**: Montserrat 800/900. Titres H1–H2, nav brand.
**Body**: Inter 400/500/600. Corps de texte, labels, descriptions.
**Mono**: JetBrains Mono 400/500. Eyebrows, tags techniques, spécifications.

| Step | Size | Weight | Line-height | Usage |
|---|---|---|---|---|
| H1 | clamp(2.4rem, 5.6vw, 4.4rem) | 800 | 1.04 | Hero title |
| H2 | clamp(1.8rem, 3.2vw, 2.6rem) | 800 | 1.08 | Section titles |
| H3 | clamp(1.15rem, 1.6vw, 1.35rem) | 700 | 1.2 | Card titles |
| Body | 1rem (16px) | 400 | 1.55 | Paragraphes |
| Small | 0.875rem | 500 | 1.5 | Labels, tags |
| Mono | 0.72–0.78rem | 500 | 1.4 | Eyebrows, specs |

Max body line length: 68ch.

## Spacing

Base unit: 4px. Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 120px.
Section vertical padding: clamp(60px, 8vw, 100px).
Container max-width: 1240px, padding-inline: clamp(20px, 4vw, 40px).

## Elevation

| Level | Shadow | Usage |
|---|---|---|
| 1 | `0 1px 3px oklch(42% 0.18 255 / 8%)` | Cards au repos |
| 2 | `0 8px 28px oklch(42% 0.18 255 / 13%)` | Cards au survol |
| 3 | `0 12px 36px oklch(42% 0.18 255 / 22%)` | Hover fort, modals |

## Components

**Nav**: sticky, fond `--nuit`, height 72px, brand text-only (sans carré MM), active underline 3px bleu.
**Bouton primaire**: fond `--bleu`, texte blanc, radius 8px, ombre bleue, hover translateY(-2px).
**Bouton accent (Finder)**: fond `--jaune`, texte `--nuit`, icône ronde noire, radius 8px.
**Cards catégories**: fond blanc, border 1px `--bordure`, radius 14px, hover ombre bleue + translateY(-5px).
**Cards produits**: fond blanc, border 1px, pseudo-flacon sombre, badge grade en mono.
**Témoignages**: fond `--nuit-2`, border 1px bleu semi-transparent, guillemet décoratif.
**CTA Band**: dégradé `--bleu` → `--bleu-fonce`, texte blanc, cercles décoratifs.
**Footer**: fond `--nuit`, border-top 3px `--bleu`, liens hover or.
**FAB WhatsApp**: vert #25D366, pulse animation 2.2s, position fixed bottom-right.

## Motion

Durée standard: 200ms. Courbe: `cubic-bezier(0.4, 0, 0.2, 1)`.
Hover élévation: `translateY(-2px)` à `-5px` selon la taille de l'élément.
Pas de bounce, pas d'elastic. Transitions sur color, background, box-shadow, transform uniquement.
