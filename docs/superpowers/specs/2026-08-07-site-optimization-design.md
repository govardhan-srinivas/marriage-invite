# Wedding Site Optimization — Design

## Context

Static single-page wedding "save the date" site (`index.html` + `style.css` + `script.js` + `three-bg.js` + `monogram-fx.js`), built on fullpage.js scroll sections with a Three.js background effect and a canvas monogram animation. Palette: paper/olive/maroon/gold (`style.css:15-22`). Wedding date: 26 Aug 2026.

Goal: one combined pass covering performance, mobile responsiveness, code cleanliness, new Gen-Z-appeal content, and livelier animation.

**Explicit constraint: no image files are recompressed, resized, or format-converted.** `temple1.jpg` (6.9MB), `temple.png` (2.5MB), `netherlands.jpg` (1.25MB), and other image assets stay exactly as they are. All perf work routes around this constraint rather than through it.

## 1. Performance

- **Lazy-load below-the-fold section backgrounds.** Currently `index.html:144-171` preloads every `data-bg` image before revealing the page — with the images at their current size, this is the single biggest load-time cost. Change: preload only section 1 (monogram, no image) synchronously; for sections 2+, swap `background-image` onto the `.bg-image` element only when the section is about to enter view (fullpage.js `onLeave`/`afterLoad` gives us the next destination index — preload one section ahead of scroll position). Preloader hides as soon as the first visible section is ready, not after all images.
- **Defer non-critical JS.** `fullpage.min.js`, `three.min.js`, `three-bg.js`, `monogram-fx.js`, `script.js` currently load render-blocking in `<head>`-adjacent position at end of body without `defer` (`index.html:127-131`). Add `defer` to all five so HTML/CSS parsing and first paint aren't gated on script download.
- **Font loading.** Add `font-display: swap` to both `@font-face` rules (`style.css:1-13`) so text is visible in a fallback font while `Samantha`/`Gabriela` (~140KB combined) download, instead of invisible text.
- **No changes to image binaries themselves** — this is the explicit constraint above.

## 2. Mobile / responsiveness

- Extend the existing breakpoint system (`768px`, `520px`, `400px` in `style.css:475-530`) to cover the four new sections (countdown, gallery/timeline, RSVP, share).
- New sections use flex/grid layouts from the start rather than the fragile `padding-left: 57%` absolute-percent hack used in `#slide-names .fp-inner` (`style.css:180-184`) — that existing hack is left as-is (out of scope, working, low-risk to touch), but not repeated in new code.
- Manual check pass across breakpoints for touch scroll feel (`touchSensitivity: 5` in `script.js:47`) once section count grows from 6 to ~10.

## 3. Code cleanliness

- Verify whether `border.png`/`bottom-left.png` are actually dead: the HTML corner divs are commented out (`index.html:25,27`) but `.border-corner` CSS (`style.css:53-89`) still references `bottom-left.png`, and two corner divs (`corner-tl`, `corner-br`) remain active in HTML (`index.html:26,28`). **Conclusion: `bottom-left.png` is live, `border.png` is likely dead** — confirm via grep during implementation before deleting anything.
- Split `style.css` (currently 530 lines, will grow with 4 new sections) into clearly delimited `/* ==== SECTION NAME ==== */` blocks per section, keeping single-file simplicity but improving navigability. No build step / CSS framework introduced.
- Light cleanup of touched JS files only (no drive-by refactors of untouched code).

## 4. New sections

All new sections follow the existing pattern: a `.section` div with `.fp-inner`, using the existing palette variables and the `.reveal` scroll-in animation convention (`style.css:187-196`).

- **Countdown timer** — new section, JS computes days/hours/min/sec to 2026-08-26T00:00:00 client-side (no dependency), styled as a card matching `.calendar`'s look. Placed adjacent to the calendar section.
- **Photo gallery / love-story timeline** — new section with placeholder images at `assets/images/placeholder-1.jpg` … `placeholder-N.jpg` (clearly named so they're obviously swappable), simple horizontal-scroll or stacked-card timeline layout, captions editable in a config object at the top of the relevant JS (same pattern as `CONFIG` in `script.js:1-7`).
- **Shareable moment** — upgrades the existing `#GovardhanWedsMeghana` hashtag (`index.html:120`) into its own small section with a "Share" button using `navigator.share()` where supported, falling back to copy-link-to-clipboard. No QR code library added (kept dependency-free).
- **RSVP section** — styled form-like UI (name, attending yes/no, guest count, dietary notes) that submits to a Google Form action URL. Since I cannot create a live Google Form in this session (no Google account access), the URL is a placeholder constant (e.g. `RSVP_FORM_URL` in `script.js`), and a `RSVP_SETUP.md` file is added with exact instructions: which fields to create in Google Forms and in what order, so the placeholder can be swapped for the real "prefilled URL" or embed iframe src with zero code changes beyond that one constant.

## 5. Animation

- Playful, Gen-Z-leaning but layered onto the existing `.reveal` convention rather than replacing it:
  - New `.reveal-pop` variant (scale 0.92→1 + fade, vs. today's translateY-only) used on the new sections' key elements.
  - Hover/tap micro-animation (small heart/petal burst, CSS-only using a pseudo-element + keyframe, no canvas/library) on the RSVP submit button and Share button.
  - Subtle scroll-linked parallax tilt on gallery photos (CSS `transform` driven by existing scroll/`afterLoad` hook in `script.js:51-78`, no new library).
- No new animation dependency is introduced — everything extends the current hand-rolled CSS/JS approach (`three-bg.js`, `monogram-fx.js`, `.reveal`).

## Testing

No test framework exists in this static-site project. Verification is manual:
- Open in browser at each breakpoint (desktop, 768px, 520px, 400px) and scroll through all sections.
- Confirm preloader no longer waits on later sections' images (check network waterfall / visually confirm first section appears before later images finish downloading).
- Confirm RSVP/Share/Countdown/Gallery sections render and behave correctly, RSVP placeholder clearly marked for swap-in.
- Confirm no image files were modified (`git status`/`git diff` on `assets/images/`).
