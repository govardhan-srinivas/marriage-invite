# Wedding Site Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve load performance, mobile responsiveness, and code organization of the existing static wedding site, and add four new sections (countdown, photo/timeline gallery, shareable-moment, RSVP) with livelier scroll animation — without touching any existing image binaries.

**Architecture:** Single-page fullpage.js scroll site stays single-page, no build step, no new dependencies. New sections are appended after the existing `#slide-calendar` section so they don't shift the section indices (`1` = Netherlands, `3` = Mysore) that `three-bg.js`'s heart-flight curves are keyed to. Config-driven content (countdown target date, gallery captions, RSVP form URL) lives in top-of-file `CONFIG`-style objects in `script.js`, matching the existing convention (`script.js:1-7`).

**Tech Stack:** Vanilla HTML/CSS/JS, fullpage.js v4 (CDN), Three.js v0.160.0 (CDN). No test framework exists in this project — verification is manual browser checks (see each task's "Verify" step) plus `git diff`/`git status` to confirm untouched files stay untouched.

## Global Constraints

- **No image files are recompressed, resized, or format-converted.** Do not modify any file under `assets/images/`. New gallery placeholders must NOT be new binary image files — use CSS-only placeholder boxes instead (gradient + caption text), so no image asset work is needed at all.
- No new npm/CDN dependencies. No QR code library. No animation library.
- Preserve existing palette variables (`--ink`, `--olive`, `--maroon`, `--gold`, `--paper`, `--paper2` in `style.css:15-22`) and the `.reveal` scroll-in convention (`style.css:187-196`) for all new content.
- New sections must be appended after `#slide-calendar` (the last existing section) so `three-bg.js`'s `curves[1]` / `curves[3]` keying (`three-bg.js:66-79`) stays correct.
- RSVP form has no real backend available this session — wire to a placeholder URL constant, documented separately, per spec.

---

### Task 1: Defer render-blocking scripts + font-display swap

**Files:**
- Modify: `index.html:127-131`
- Modify: `style.css:1-13`

**Interfaces:** None — this task has no dependents; it's a self-contained perf change.

- [ ] **Step 1: Add `defer` to all five script tags**

In `index.html`, change:
```html
  <script src="https://cdn.jsdelivr.net/npm/fullpage.js@4/dist/fullpage.min.js"></script>
  <script src="https://unpkg.com/three@0.160.0/build/three.min.js"></script>
  <script src="three-bg.js"></script>
  <script src="monogram-fx.js"></script>
  <script src="script.js"></script>
```
to:
```html
  <script defer src="https://cdn.jsdelivr.net/npm/fullpage.js@4/dist/fullpage.min.js"></script>
  <script defer src="https://unpkg.com/three@0.160.0/build/three.min.js"></script>
  <script defer src="three-bg.js"></script>
  <script defer src="monogram-fx.js"></script>
  <script defer src="script.js"></script>
```
Deferred scripts still execute in source order after the DOM parses, so `three-bg.js` still runs after `three.min.js` is available, etc. — order is preserved.

- [ ] **Step 2: Add `font-display: swap` to both `@font-face` rules**

In `style.css`, change both blocks:
```css
@font-face {
  font-family: 'Samantha';
  src: url('assets/fonts/font.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}

@font-face {
  font-family: 'Gabriela';
  src: url('assets/fonts/Gabriela-Regular.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}
```
to (add `font-display: swap;` to each):
```css
@font-face {
  font-family: 'Samantha';
  src: url('assets/fonts/font.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Gabriela';
  src: url('assets/fonts/Gabriela-Regular.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
```

- [ ] **Step 3: Verify**

Open `index.html` directly in a browser (or via a local static server). Confirm the page still loads, scrolls through all 6 existing sections, monogram animation plays, and background music still attempts to play. Open browser DevTools → Network tab, confirm script requests show as non-blocking (no change in visual behavior expected — this step only confirms nothing broke).

- [ ] **Step 4: Commit**

```bash
git add index.html style.css
git commit -m "perf: defer scripts and swap font-display to unblock first paint"
```

---

### Task 2: Lazy-load below-the-fold section background images

**Files:**
- Modify: `index.html:30-125` (remove inline `background-image` styles, keep `data-bg` attributes)
- Modify: `index.html:132-172` (rewrite the inline preloader script)

**Interfaces:**
- Produces: a `data-bg-loaded` attribute pattern other tasks' new sections should follow if they add their own background images (none of the new sections in this plan use full-bleed backgrounds, so no other task consumes this directly).

- [ ] **Step 1: Remove eager inline `background-image` styles, keep `data-bg`**

In `index.html`, for each of the 4 sections that currently have both `data-bg="..."` and an inline `style="background-image:url(...)"` on their `.bg-image` div (`slide-city1`, `slide-city2`, `slide-names`, `slide-calendar`), remove the inline `style` attribute so the `.bg-image` div starts with no background set. Example — change:
```html
    <div class="section"
         id="slide-city1"
         data-bg="assets/images/netherlands.jpg">
      <div class="bg-image"
           style="background-image:url('assets/images/netherlands.jpg')"></div>
```
to:
```html
    <div class="section"
         id="slide-city1"
         data-bg="assets/images/netherlands.jpg">
      <div class="bg-image"></div>
```
Apply the same removal to `slide-city2` (`mysore.webp`), `slide-names` (`temple1.jpg`), and `slide-calendar` (`temple.png`, note this one also has class `dim` — keep that class, only drop the `style` attribute).

- [ ] **Step 2: Rewrite the inline bootstrap script to load section 1's image immediately and lazy-load the rest**

Replace the entire inline `<script>` block at the end of `index.html` (currently handling music autoplay + preloader) with:
```html
  <script>
    (function () {
      var music = document.getElementById('bg-music');
      if (music) {
        music.volume = 0.15;
        var tryPlay = function () { music.play().catch(function () {}); };
        tryPlay();
        window.addEventListener('load', tryPlay, { once: true });
        ['click', 'touchstart', 'keydown', 'wheel', 'scroll'].forEach(function (evt) {
          document.addEventListener(evt, tryPlay, { once: true, passive: true });
        });
      }

      var sections = Array.from(document.querySelectorAll('.section[data-bg]'));

      function loadBg(section) {
        if (!section || section.dataset.bgLoaded) return;
        var url = section.getAttribute('data-bg');
        var bgEl = section.querySelector('.bg-image');
        var img = new Image();
        img.onload = img.onerror = function () {
          if (bgEl) bgEl.style.backgroundImage = "url('" + url + "')";
          section.dataset.bgLoaded = 'true';
        };
        img.src = url;
      }

      // Load the first section (if it has a bg) plus one section ahead of it now;
      // the fullpage.js afterLoad hook (see script.js) loads one section ahead as the user scrolls.
      loadBg(sections[0]);
      loadBg(sections[1]);
      window.loadSectionBg = loadBg;

      document.body.classList.remove('loading');
      var preloader = document.getElementById('preloader');
      if (preloader) {
        preloader.addEventListener('transitionend', function () { preloader.remove(); });
        preloader.classList.add('hidden');
      }
    })();
  </script>
```
This removes the old "wait for every image" logic entirely — the preloader now hides as soon as the DOM is ready, and each section's background loads just-in-time.

- [ ] **Step 3: Preload one section ahead as the user scrolls**

In `script.js`, inside the existing `afterLoad` callback (`script.js:51-72`), add a call to preload the *next* section's background. Change:
```javascript
  afterLoad: function (origin, destination) {
    const el = destination.item;
    el.querySelectorAll(".reveal").forEach((r) => {
      r.classList.remove("in-view");
      // restart animation on every visit
      void r.offsetWidth;
      requestAnimationFrame(() => r.classList.add("in-view"));
    });
```
to:
```javascript
  afterLoad: function (origin, destination) {
    const el = destination.item;
    el.querySelectorAll(".reveal").forEach((r) => {
      r.classList.remove("in-view");
      // restart animation on every visit
      void r.offsetWidth;
      requestAnimationFrame(() => r.classList.add("in-view"));
    });

    // preload the next section's background image before the user scrolls to it
    if (window.loadSectionBg) {
      const allSections = document.querySelectorAll(".section[data-bg]");
      const currentBgIndex = Array.from(allSections).indexOf(
        el.matches("[data-bg]") ? el : el.closest("[data-bg]")
      );
      const nextSection = allSections[currentBgIndex + 1];
      if (nextSection) window.loadSectionBg(nextSection);
      else window.loadSectionBg(allSections[0]); // loop case
    }
```

- [ ] **Step 4: Verify**

Open the page in a browser with DevTools Network tab open (throttle to "Fast 3G" for a clear effect). Reload. Confirm: page appears immediately without waiting on `temple1.jpg` (6.9MB) or `temple.png` (2.5MB); `netherlands.jpg` request fires immediately (section 2 preloaded); `mysore.webp`/`temple1.jpg`/`temple.png` requests fire only as you scroll toward those sections; scrolling all the way through and back (loop) still shows correct backgrounds with no missing images.

- [ ] **Step 5: Commit**

```bash
git add index.html script.js
git commit -m "perf: lazy-load section background images instead of blocking on all of them"
```

---

### Task 3: CSS section organization + confirm/remove dead `border.png`

**Files:**
- Modify: `style.css` (add section-delimiter comments; no rule changes except possible removal)
- Possibly delete: `assets/images/border.png`

**Interfaces:** None — organizational only, no behavior change expected.

- [ ] **Step 1: Grep for `border.png` usage**

Run: `grep -rn "border.png" --include="*.css" --include="*.html" --include="*.js" .`

Expected: only match should be inside a comment or nothing at all (since `.border-corner` in `style.css:60` references `bottom-left.png`, not `border.png`).

- [ ] **Step 2: If no live reference to `border.png` exists, delete it**

```bash
git rm assets/images/border.png
```
If Step 1 found a live (non-comment) reference, skip this step and note it — do not delete a file that's actually in use.

- [ ] **Step 3: Add section-delimiter comments to `style.css`**

Insert clearly-marked comment headers above each logical block that doesn't already have one, matching the existing style of the `/* CALENDAR */`-type comments already present (`style.css:313`). Add, in order, before their respective existing blocks:
```css
/* ==== ROOT / FONTS ==== */
```
above `@font-face` (line 1),
```css
/* ==== BORDER CORNERS ==== */
```
above `.border-corner` (line 53),
```css
/* ==== FULLPAGE SECTION BASE ==== */
```
above `.section` (line 92),
```css
/* ==== REVEAL ANIMATION ==== */
```
above `.reveal` (line 187, already has a lowercase comment — replace `/* reveal animation */` with the uppercase delimiter for consistency),
```css
/* ==== PRELOADER ==== */
```
above `#preloader` (line 425).
Leave all existing `/* MONOGRAM */`, `/* CITY BLOCKS */`, `/* QUOTE */`, `/* NAMES */`, `/* CALENDAR */` comments as-is — just uppercase-wrap them to `/* ==== MONOGRAM ==== */` style for consistency across the file.

- [ ] **Step 4: Verify**

Open the page in a browser, confirm visual appearance is byte-for-byte identical to before (comments have no runtime effect). Run `git diff style.css` and confirm the diff contains only comment-line changes plus the one deleted `@font-face` comment rewrite — no property/value lines changed.

- [ ] **Step 5: Commit**

```bash
git add style.css
git commit -m "chore: organize style.css with section delimiter comments"
# If border.png was removed in Step 2, it's already staged by git rm; include it in the same commit.
```

---

### Task 4: Countdown timer section

**Files:**
- Modify: `index.html` (add new `<div class="section" id="slide-countdown">` after `#slide-calendar`'s closing `</div>` at `index.html:123`, before the closing `</div>` of `#fullpage` at `index.html:125`)
- Modify: `style.css` (add `/* ==== COUNTDOWN ==== */` block)
- Modify: `script.js` (add countdown logic)

**Interfaces:**
- Consumes: `.calendar` card styling conventions (`style.css:322-333`) for visual consistency.
- Produces: `#countdown-days`, `#countdown-hours`, `#countdown-mins`, `#countdown-secs` element IDs, and a `WEDDING_DATE` constant in `script.js` — Task 5-7 don't need these, but keep the name if any future task references "the wedding date" to avoid drift.

- [ ] **Step 1: Add the countdown section markup**

In `index.html`, after the `</div>` that closes `#slide-calendar` (line 123) and before the `</div>` that closes `#fullpage` (line 125), insert:
```html
    <!-- SECTION 8 : Countdown -->
    <div class="section"
         id="slide-countdown">
      <div class="fp-inner">
        <h2 class="section-title reveal reveal-pop">Counting Down</h2>
        <div class="countdown reveal reveal-pop"
             id="countdown">
          <div class="countdown-unit">
            <span class="countdown-num"
                  id="countdown-days">00</span>
            <span class="countdown-label">Days</span>
          </div>
          <div class="countdown-unit">
            <span class="countdown-num"
                  id="countdown-hours">00</span>
            <span class="countdown-label">Hours</span>
          </div>
          <div class="countdown-unit">
            <span class="countdown-num"
                  id="countdown-mins">00</span>
            <span class="countdown-label">Minutes</span>
          </div>
          <div class="countdown-unit">
            <span class="countdown-num"
                  id="countdown-secs">00</span>
            <span class="countdown-label">Seconds</span>
          </div>
        </div>
      </div>
    </div>
```

- [ ] **Step 2: Add countdown styles**

In `style.css`, append at the end of the file:
```css
/* ==== COUNTDOWN ==== */
.countdown {
  background: rgba(255, 255, 255, .5);
  border: 1px solid rgba(76, 83, 48, .25);
  border-radius: 8px;
  padding: 20px 24px;
  display: flex;
  gap: 20px;
  max-width: 420px;
  width: 90vw;
  justify-content: center;
}

.countdown-unit {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 56px;
}

.countdown-num {
  font-size: clamp(28px, 5vw, 38px);
  color: var(--maroon);
  font-family: 'Gabriela';
}

.countdown-label {
  font-size: 12px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--olive);
}

@media (max-width:520px) {
  .countdown {
    gap: 10px;
    padding: 16px 12px;
  }

  .countdown-unit {
    min-width: 44px;
  }
}
```

- [ ] **Step 3: Add countdown logic**

In `script.js`, add to the `CONFIG` object (`script.js:1-7`) a new key, changing:
```javascript
const CONFIG = {
  initials: ["G", "M"],
  daysInMonth: 31,
  startWeekday: 6, // Aug 1 2026 is a Saturday (0 = Sun)
  highlightDays: [26]
};
```
to:
```javascript
const CONFIG = {
  initials: ["G", "M"],
  daysInMonth: 31,
  startWeekday: 6, // Aug 1 2026 is a Saturday (0 = Sun)
  highlightDays: [26],
  weddingDate: new Date("2026-08-26T00:00:00")
};
```
Then, after the existing `buildCalendar();` call (`script.js:36`), add:
```javascript
// ---- Countdown timer ----
function updateCountdown() {
  const daysEl = document.getElementById("countdown-days");
  const hoursEl = document.getElementById("countdown-hours");
  const minsEl = document.getElementById("countdown-mins");
  const secsEl = document.getElementById("countdown-secs");
  if (!daysEl) return;

  const diff = Math.max(0, CONFIG.weddingDate.getTime() - Date.now());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);

  daysEl.textContent = String(days).padStart(2, "0");
  hoursEl.textContent = String(hours).padStart(2, "0");
  minsEl.textContent = String(mins).padStart(2, "0");
  secsEl.textContent = String(secs).padStart(2, "0");
}
updateCountdown();
setInterval(updateCountdown, 1000);
```

- [ ] **Step 4: Verify**

Open the page, scroll to the new "Counting Down" section (now the 7th section, right after "Save the Date"). Confirm four numbers are displayed and the seconds value visibly ticks down once per second. Confirm the section matches the paper/olive/maroon palette and looks correct at 768px and 400px widths in DevTools responsive mode.

- [ ] **Step 5: Commit**

```bash
git add index.html style.css script.js
git commit -m "feat: add countdown timer section"
```

---

### Task 5: Photo gallery / love-story timeline section (CSS-only placeholders, no image files)

**Files:**
- Modify: `index.html` (add new `<div class="section" id="slide-gallery">` after `#slide-countdown`)
- Modify: `style.css` (add `/* ==== GALLERY ==== */` block)
- Modify: `script.js` (add gallery caption config)

**Interfaces:**
- Produces: a `GALLERY_ITEMS` array config in `script.js` (each item: `{ caption: string, photo: string|null }`) — when real photos are ready, set `photo` to an `assets/images/...` path per item; `null` keeps the CSS placeholder box.

- [ ] **Step 1: Add the gallery section markup**

In `index.html`, after the countdown section's closing `</div>` (added in Task 4) and before `#fullpage`'s closing `</div>`, insert:
```html
    <!-- SECTION 9 : Gallery / Love Story -->
    <div class="section"
         id="slide-gallery">
      <div class="fp-inner">
        <h2 class="section-title reveal reveal-pop">Our Story</h2>
        <div class="gallery reveal reveal-pop"
             id="gallery"></div>
      </div>
    </div>
```
Note: the gallery items themselves are generated by `script.js` from `GALLERY_ITEMS` (Step 3), not hand-written in HTML, so the config is the single place to add real photos later.

- [ ] **Step 2: Add gallery styles**

In `style.css`, append:
```css
/* ==== GALLERY ==== */
.gallery {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  max-width: 100%;
  padding: 8px 16px 16px;
  scroll-snap-type: x mandatory;
}

.gallery-item {
  flex: 0 0 220px;
  height: 280px;
  border-radius: 10px;
  scroll-snap-align: center;
  background-size: cover;
  background-position: center;
  background-color: var(--paper2);
  background-image: linear-gradient(160deg, rgba(76, 83, 48, .35), rgba(124, 37, 40, .35));
  border: 1px solid rgba(76, 83, 48, .25);
  display: flex;
  align-items: flex-end;
  padding: 14px;
  box-sizing: border-box;
  transition: transform 0.3s ease;
}

.gallery-item-caption {
  color: #fff;
  font-size: 15px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, .5);
  font-family: 'Gabriela';
}

@media (max-width:520px) {
  .gallery-item {
    flex: 0 0 170px;
    height: 220px;
  }
}
```

- [ ] **Step 3: Add gallery item config and render logic**

In `script.js`, near the top (after `CONFIG`), add:
```javascript
// Swap `photo` from null to an assets/images/... path once real photos are ready.
const GALLERY_ITEMS = [
  { caption: "Where it began", photo: null },
  { caption: "First trip together", photo: null },
  { caption: "Meeting the families", photo: null },
  { caption: "The proposal", photo: null }
];

function buildGallery() {
  const gallery = document.getElementById("gallery");
  if (!gallery) return;
  GALLERY_ITEMS.forEach((item) => {
    const el = document.createElement("div");
    el.className = "gallery-item";
    if (item.photo) el.style.backgroundImage = `url('${item.photo}')`;
    const caption = document.createElement("span");
    caption.className = "gallery-item-caption";
    caption.textContent = item.caption;
    el.appendChild(caption);
    gallery.appendChild(el);
  });
}
buildGallery();
```

- [ ] **Step 4: Verify**

Open the page, scroll to "Our Story" section. Confirm 4 horizontally-scrollable cards appear with gradient placeholder backgrounds and captions, scroll-snap feels smooth on both mouse-wheel and touch/trackpad swipe, and layout holds at 400px width (cards shrink, still horizontally scrollable).

- [ ] **Step 5: Commit**

```bash
git add index.html style.css script.js
git commit -m "feat: add photo gallery / love-story section with swappable placeholders"
```

---

### Task 6: Shareable moment section

**Files:**
- Modify: `index.html` (add new `<div class="section" id="slide-share">` after `#slide-gallery`)
- Modify: `style.css` (add `/* ==== SHARE ==== */` block)
- Modify: `script.js` (add share button logic)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `#share-btn` element ID and a `handleShare()` function — no later task consumes this.

- [ ] **Step 1: Add the share section markup**

In `index.html`, after the gallery section's closing `</div>` and before `#fullpage`'s closing `</div>`, insert:
```html
    <!-- SECTION 10 : Share -->
    <div class="section"
         id="slide-share">
      <div class="fp-inner">
        <h2 class="section-title reveal reveal-pop">Share the Joy</h2>
        <p class="hashtag reveal reveal-pop">#GovardhanWedsMeghana</p>
        <button class="share-btn reveal reveal-pop"
                id="share-btn"
                type="button">Share this page</button>
        <p class="share-feedback"
           id="share-feedback"
           aria-live="polite"></p>
      </div>
    </div>
```

- [ ] **Step 2: Add share button styles**

In `style.css`, append:
```css
/* ==== SHARE ==== */
.share-btn {
  margin-top: 18px;
  padding: 12px 28px;
  border-radius: 24px;
  border: 1px solid var(--maroon);
  background: transparent;
  color: var(--maroon);
  font-size: 16px;
  letter-spacing: 1px;
  cursor: pointer;
  position: relative;
  transition: background 0.25s ease, color 0.25s ease;
}

.share-btn:hover,
.share-btn:focus {
  background: var(--maroon);
  color: #fff;
}

.share-btn::after {
  content: "❤";
  position: absolute;
  top: -6px;
  right: -4px;
  font-size: 0;
  opacity: 0;
  pointer-events: none;
}

.share-btn.burst::after {
  animation: heartBurst 0.6s ease-out;
}

@keyframes heartBurst {
  0% {
    font-size: 14px;
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  100% {
    font-size: 20px;
    opacity: 0;
    transform: translateY(-24px) scale(1.3);
  }
}

.share-feedback {
  margin-top: 10px;
  font-size: 13px;
  color: var(--olive);
  min-height: 18px;
}
```

- [ ] **Step 3: Add share button logic**

In `script.js`, add:
```javascript
// ---- Share button ----
const shareBtn = document.getElementById("share-btn");
if (shareBtn) {
  shareBtn.addEventListener("click", async () => {
    shareBtn.classList.remove("burst");
    void shareBtn.offsetWidth;
    shareBtn.classList.add("burst");

    const feedback = document.getElementById("share-feedback");
    const shareData = {
      title: "Govardhan & Meghana's Wedding",
      text: "Join us to celebrate! #GovardhanWedsMeghana",
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // user cancelled or share failed silently — no feedback needed
      }
    } else if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareData.url);
        if (feedback) feedback.textContent = "Link copied to clipboard!";
      } catch (err) {
        if (feedback) feedback.textContent = shareData.url;
      }
    } else if (feedback) {
      feedback.textContent = shareData.url;
    }
  });
}
```

- [ ] **Step 4: Verify**

Open the page, scroll to "Share the Joy" section. Click "Share this page": on a browser/device supporting the Web Share API, the native share sheet should open; otherwise confirm "Link copied to clipboard!" appears and pasting elsewhere yields the page URL. Confirm the small heart-burst animation plays on click (top-right of button) and hover state (filled maroon background) works with mouse.

- [ ] **Step 5: Commit**

```bash
git add index.html style.css script.js
git commit -m "feat: add shareable-moment section with native share / clipboard fallback"
```

---

### Task 7: RSVP section + setup instructions

**Files:**
- Modify: `index.html` (add new `<div class="section" id="slide-rsvp">` after `#slide-share`)
- Modify: `style.css` (add `/* ==== RSVP ==== */` block)
- Modify: `script.js` (add `RSVP_FORM_URL` constant and submit handler)
- Create: `RSVP_SETUP.md`

**Interfaces:**
- Produces: `RSVP_FORM_URL` constant in `script.js` — the one line to change once a real Google Form exists. No other task consumes this.

- [ ] **Step 1: Add the RSVP section markup**

In `index.html`, after the share section's closing `</div>` and before `#fullpage`'s closing `</div>`, insert:
```html
    <!-- SECTION 11 : RSVP -->
    <div class="section"
         id="slide-rsvp">
      <div class="fp-inner">
        <h2 class="section-title reveal reveal-pop">RSVP</h2>
        <form class="rsvp-form reveal reveal-pop"
              id="rsvp-form">
          <input class="rsvp-input"
                 type="text"
                 name="name"
                 placeholder="Your name"
                 required>
          <select class="rsvp-input"
                  name="attending"
                  required>
            <option value=""
                    disabled
                    selected>Will you attend?</option>
            <option value="yes">Joyfully attending</option>
            <option value="no">Sadly can't make it</option>
          </select>
          <input class="rsvp-input"
                 type="number"
                 name="guests"
                 min="1"
                 max="10"
                 placeholder="Number of guests">
          <textarea class="rsvp-input"
                    name="notes"
                    placeholder="Dietary notes or a message for us"
                    rows="3"></textarea>
          <button class="rsvp-submit"
                  type="submit">Send RSVP</button>
        </form>
        <p class="share-feedback"
           id="rsvp-feedback"
           aria-live="polite"></p>
      </div>
    </div>
```

- [ ] **Step 2: Add RSVP form styles**

In `style.css`, append:
```css
/* ==== RSVP ==== */
.rsvp-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 90vw;
  max-width: 380px;
}

.rsvp-input {
  font-family: 'Gabriela';
  font-size: 15px;
  padding: 10px 14px;
  border-radius: 6px;
  border: 1px solid rgba(76, 83, 48, .35);
  background: rgba(255, 255, 255, .6);
  color: var(--ink);
}

.rsvp-submit {
  margin-top: 6px;
  padding: 12px 0;
  border-radius: 24px;
  border: 1px solid var(--maroon);
  background: var(--maroon);
  color: #fff;
  font-size: 16px;
  letter-spacing: 1px;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.rsvp-submit:hover,
.rsvp-submit:focus {
  transform: scale(1.03);
}
```

- [ ] **Step 3: Add RSVP submit handler with placeholder form URL**

In `script.js`, add near the top (after `GALLERY_ITEMS`):
```javascript
// Replace with the real Google Form "formResponse" URL once created — see RSVP_SETUP.md.
const RSVP_FORM_URL = "https://docs.google.com/forms/d/e/PLACEHOLDER_FORM_ID/formResponse";
```
Then add:
```javascript
// ---- RSVP form ----
const rsvpForm = document.getElementById("rsvp-form");
if (rsvpForm) {
  rsvpForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const feedback = document.getElementById("rsvp-feedback");
    const formData = new FormData(rsvpForm);

    if (RSVP_FORM_URL.includes("PLACEHOLDER_FORM_ID")) {
      if (feedback) feedback.textContent = "RSVP form isn't connected yet — see RSVP_SETUP.md.";
      return;
    }

    try {
      await fetch(RSVP_FORM_URL, {
        method: "POST",
        mode: "no-cors",
        body: formData
      });
      if (feedback) feedback.textContent = "Thank you! Your RSVP has been sent.";
      rsvpForm.reset();
    } catch (err) {
      if (feedback) feedback.textContent = "Something went wrong — please try again.";
    }
  });
}
```

- [ ] **Step 4: Create `RSVP_SETUP.md`**

Create `RSVP_SETUP.md` at the project root:
```markdown
# Connecting the RSVP form to a real Google Form

The RSVP section (`index.html`, `#slide-rsvp`) currently posts to a placeholder
URL in `script.js` (`RSVP_FORM_URL`). Until that's replaced, submitting shows
"RSVP form isn't connected yet."

## 1. Create the Google Form

Go to forms.google.com and create a new form with exactly these fields, in
this order (so the field names line up with what the site sends):

1. **Your name** — Short answer, required
2. **Will you attend?** — Short answer, required (matches values `"yes"` / `"no"` sent by the site, but any text works since Sheets just logs whatever arrives)
3. **Number of guests** — Short answer
4. **Dietary notes or a message for us** — Paragraph

## 2. Get the form's POST URL and field IDs

1. Open the form, click the three-dot menu → "Get pre-filled link".
2. Fill in dummy values for every field, click "Get link".
3. Copy the generated URL — it looks like:
   `https://docs.google.com/forms/d/e/<FORM_ID>/viewform?usp=pp_url&entry.111=x&entry.222=y&entry.333=z&entry.444=w`
4. From that URL, note:
   - The `<FORM_ID>` segment (between `/d/e/` and `/viewform`).
   - Each `entry.<number>=` — match them to the field order above (name → entry #1, attending → entry #2, guests → entry #3, notes → entry #4).

## 3. Update the site

In `script.js`, replace:
```javascript
const RSVP_FORM_URL = "https://docs.google.com/forms/d/e/PLACEHOLDER_FORM_ID/formResponse";
```
with:
```javascript
const RSVP_FORM_URL = "https://docs.google.com/forms/d/e/<FORM_ID>/formResponse";
```
using the real `<FORM_ID>` from step 2.

Then, in `index.html`, update each RSVP input's `name` attribute to the matching
`entry.<number>` value, e.g. change `name="name"` to `name="entry.111"`, using
the numbers you noted in step 2 for each field.

## 4. Verify

Submit the form once from the live site, then check the Google Form's
"Responses" tab (or its linked Sheet) — your test submission should appear
within a few seconds.
```

- [ ] **Step 5: Verify**

Open the page, scroll to "RSVP" section. Fill the form, submit — confirm the "isn't connected yet" message appears (since `RSVP_FORM_URL` is still the placeholder) and no console errors occur. Confirm form fields are usable and styled consistently at 400px width.

- [ ] **Step 6: Commit**

```bash
git add index.html style.css script.js RSVP_SETUP.md
git commit -m "feat: add RSVP section with placeholder Google Form wiring and setup docs"
```

---

### Task 8: Animation polish — reveal-pop variant + parallax tilt on gallery

**Files:**
- Modify: `style.css` (add `.reveal-pop` rule; add gallery parallax hover rule)
- Modify: `script.js` (add scroll-linked tilt for gallery items)

**Interfaces:**
- Consumes: `.gallery-item` elements produced by Task 5's `buildGallery()`; `.reveal-pop` class already referenced on elements added in Tasks 4-7 (those tasks already wrote `class="... reveal reveal-pop"` into their markup, so this task only needs to define the CSS rule — no HTML changes required here).

- [ ] **Step 1: Define the `.reveal-pop` variant**

In `style.css`, in the `/* ==== REVEAL ANIMATION ==== */` block (from Task 3), after the existing `.reveal` / `.reveal.in-view` rules, add:
```css
.reveal-pop {
  transform: translateY(30px) scale(0.92);
}

.reveal-pop.in-view {
  transform: translateY(0) scale(1);
}
```
Since `.reveal-pop` elements also carry the base `.reveal` class (written in Tasks 4-7's markup), they inherit the `opacity`/`transition` properties from `.reveal` and only override the `transform` shape — no JS change needed since `script.js`'s `afterLoad`/`onLeave` hooks already toggle `.in-view` on every element with the `.reveal` class (`script.js:53,74`), which `.reveal-pop` elements also have.

- [ ] **Step 2: Add hover/tilt parallax to gallery items**

In `style.css`, in the `/* ==== GALLERY ==== */` block, add after `.gallery-item`:
```css
.gallery-item {
  will-change: transform;
}

.gallery-item:hover {
  transform: translateY(-6px) rotate(var(--tilt, 0deg));
}
```

In `script.js`, inside `buildGallery()` (Task 5), add a small random tilt per card so the hover lift feels less mechanical. Change:
```javascript
  GALLERY_ITEMS.forEach((item) => {
    const el = document.createElement("div");
    el.className = "gallery-item";
    if (item.photo) el.style.backgroundImage = `url('${item.photo}')`;
```
to:
```javascript
  GALLERY_ITEMS.forEach((item, i) => {
    const el = document.createElement("div");
    el.className = "gallery-item";
    el.style.setProperty("--tilt", (i % 2 === 0 ? 1.5 : -1.5) + "deg");
    if (item.photo) el.style.backgroundImage = `url('${item.photo}')`;
```

- [ ] **Step 3: Verify**

Open the page. Scroll through "Counting Down", "Our Story", "Share the Joy", "RSVP" — confirm each section's title/card animates in with a combined scale+fade (visibly different from the plain fade-up on the original 6 sections) both on first scroll-in and on repeat visits (scroll away and back). Hover over gallery cards on desktop — confirm each lifts slightly with an alternating left/right tilt.

- [ ] **Step 4: Commit**

```bash
git add style.css script.js
git commit -m "feat: add reveal-pop animation variant and gallery hover tilt"
```

---

## Final full-site check

After all 8 tasks:
- [ ] Scroll the entire site top to bottom and back (11 sections total, up from 6), on desktop width and at 400px width in DevTools responsive mode.
- [ ] Run `git status` and confirm no file under `assets/images/` shows as modified (only possibly deleted, if `border.png` was confirmed dead in Task 3).
- [ ] Run `git log --oneline` and confirm 8 commits landed, one per task.
