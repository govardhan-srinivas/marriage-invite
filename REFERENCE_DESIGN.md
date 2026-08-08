# Reference Design Analysis — `reference.mp4`

Source: `assets/reference.mp4` (0:30, 720×1280 portrait, watermarked "Chic Invites" template).
This document breaks the reference video into its visual system and animation timeline, and maps each element to its implementation in this repo (`index.html`, `style.css`, `three-bg.js`, `script.js`).

---

## 1. Visual system

### 1.1 Palette
| Role | Color | Hex (approx) | Used for |
|---|---|---|---|
| Paper base | warm off-white | `#f7f2e9` → `#efe6d8` | background gradient |
| Ink / body text | deep olive-black | `#33361f` | quote, calendar days |
| Primary accent | olive green | `#4c5330` | monogram ring, names, headings |
| Secondary accent | maroon / wine | `#7c2528` | hearts, date-and, highlighted dates |
| Metallic accent | muted gold | `#c9a04e` | sparkle particles, dot leaders |
| Sky/water | soft blue-grey | `#cfe0e8` → `#a9c6d6` | river footer |

Palette is intentionally low-saturation and paper-toned — everything reads as "watercolor stationery," not flat digital color.

### 1.2 Typography
Three-font system, each with one job:
- **Serif display (Playfair Display)** — monogram letters, section titles, "AND", uppercase labels. Structural / formal voice.
- **Script (Great Vibes)** — city names, couple's first names. Romantic / personal voice.
- **Serif body (Cormorant Garamond)** — quote text, calendar numerals, paragraph copy. Readable / narrative voice.

Rule of thumb from the reference: **anything that is a proper noun spoken "by hand" is script; anything structural or declarative is serif caps.**

### 1.3 Motifs / decoration
- Wisteria / leaf vine draped from the top-left and top-right corners of every frame — a static "picture frame."
- Gold dust / sparkle flecks scattered across the paper, denser near hearts.
- A dashed hand-drawn path (`- - - -`) connecting story beats, terminating in or passing through a small maroon heart.
- A painted river with a rowboat sits fixed to the bottom ~15% of frame throughout — the one element that never leaves.
- Circular monogram frame: thin olive ring, broken at the top, with a small laurel sprig closing the gap — classic wedding-monogram convention.
- Landmark watercolor illustrations (Golden Gate Bridge, India Gate) anchor each "city" beat — the couple's two home cities.

### 1.3.1 Note on illustration vs. photography
The reference uses **hand-painted watercolor illustrations** for every scene (skyline, gate, boat, foliage) — a fully custom illustrated asset set. This build substitutes **real photographs** (`assets/mysore.webp`, `assets/netherlands.jpg`) for the two "place" beats instead of commissioning matching illustrations. That is a deliberate scope trade-off, not an oversight — it trades the illustrated cohesion of the original for authenticity (actual venue, actual homeland) and zero art-production cost. The paper texture, vines, monogram ring, and dashed heart path are kept as the illustrated/vector layer that ties the photos back into the same system.

### 1.4 Layout grammar
- Strict single-column, center-aligned composition — no left/right text blocks.
- Generous vertical whitespace between beats; each idea gets its own "breath" before the next enters.
- Fixed elements (vine top, river bottom) create a stable frame; everything else animates through the middle ~70% of the canvas.

---

## 2. Timeline (beat-by-beat)

The video is a single continuous take (no hard cuts) — elements accumulate and fade rather than replacing the whole frame. Approximate timestamps from the 15 sampled frames (1 every 2s):

| Time | Beat | Elements entering |
|---|---|---|
| 0:00–0:04 | **Monogram** | Circular ring draws in, "R•A" fades up, laurel settles |
| 0:04–0:08 | **City 1** | Golden Gate Bridge illustration + "San Francisco" script label |
| 0:08–0:14 | **Quote** | Dashed heart-path arcs across the frame while italic quote types/fades in two lines |
| 0:14–0:18 | **City 2** | Path continues down to India Gate + "Delhi" label |
| 0:18–0:22 | **Names reveal** | Wide shot pulls back; dashed path becomes a single decorative arc; "Rajat and Ayesha" fades in in script |
| 0:22–0:24 | **Tying the knot** | Same name block, "ARE TYING THE KNOT" caption drops in below |
| 0:24–0:30 | **Save the date** | Calendar grid builds in, two dates (14/15) get maroon heart badges with a subtle pulse, venue + hashtag fade in beneath |

Throughout: the rowboat drifts very slowly left-to-right at the bottom; gold flecks twinkle continuously; the watermark tiles are always present (ignored for our build).

### 2.1 Motion principles observed
1. **Draw-on, not cut-on.** Rings, dashed paths, and borders animate as if being drawn with a pen (stroke-dashoffset style), never just appear.
2. **One accent motion at a time.** Only one moving element (the traveling heart) competes for attention; text fades are static once settled.
3. **Persistent ambient layer.** Sparkles + boat never stop, giving the still frame a "living" feel between beats — this is the layer most easily lost if you build beat-by-beat instead of as one continuous scene.
4. **Anticipation via the dashed path.** The path is drawn *before* the payoff (name, date) it leads to — it functions as a visual "and then—" connector between beats.

---

## 3. Mapping to this build

| Reference element | Implementation |
|---|---|
| Continuous single take | fullPage.js scroll-snapped sections (`index.html`) — closest web equivalent without a fixed-length video; each section = one beat |
| Monogram ring draw-on | `.monogram-ring circle` stroke-dashoffset transition (`style.css`) |
| Dashed heart path + traveling heart | three.js `CubicBezierCurve3` + sprite in `three-bg.js`, active only during the two "city" sections |
| Ambient gold flecks | three.js `THREE.Points` particle field, always running (`three-bg.js`) |
| City illustrations | Replaced with photography — `assets/netherlands.jpg`, `assets/mysore.webp` as full-bleed section backgrounds (see §1.3.1) |
| Script city/name labels | `Great Vibes` font, `.city-label.script` / `.name-script` |
| Calendar with heart-badged dates | `#calendar` grid built in `script.js`, `.cal-day.highlight` pulse animation |
| Rowboat / river, always present | *Not yet ported* — open item, see §4 |
| Wisteria corner vines | Simplified to emoji-based `.vine` corner decoration — open item, see §4 |

---

## 4. Open gaps vs. reference

- **River + boat footer** existed in the original single-page build but was dropped when the site moved to fullPage.js (each section is now full-bleed, leaving no fixed footer strip). Reintroducing it would mean either a thin persistent overlay bar (breaks full-bleed photos) or a per-section decorative element.
- **Vine corners** are a plain emoji placeholder, not a painted illustration — lowest-fidelity part of the current build relative to reference.
- **Draw-on dashed path** is implemented in 3D (three.js) rather than as a visible dashed SVG line — it reads as "a heart flies past" rather than "a path gets traced," which is a slightly different motion signature than the reference.
- Watermark tiling is intentionally omitted (reference-only artifact, not a design element to reproduce).
