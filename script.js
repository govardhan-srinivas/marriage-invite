// ---- Editable config ----
const CONFIG = {
  initials: ["G", "M"],
  daysInMonth: 31,
  startWeekday: 6, // Aug 1 2026 is a Saturday (0 = Sun)
  highlightDays: [26],
  weddingDate: new Date("2026-08-26T00:00:00")
};

// Swap `photo` from null to an assets/images/... path once real photos are ready.
const GALLERY_ITEMS = [
  { caption: "Where it began", photo: "assets/images/gallery/start.jpeg" },
  { caption: "First trip together", photo: "assets/images/gallery/first_trip.jpeg" },
  { caption: "The proposal", photo: "assets/images/gallery/proposal.jpeg" },
  { caption: "The engagement", photo: "assets/images/gallery/enagagment_rings.jpeg" },
  { caption: "It's happening", photo: "assets/images/gallery/wedding.jpeg" },
  { caption: "Wedding invitation", photo: "assets/images/gallery/wedding_invitation.jpeg" }
];

// ---- Calendar build ----
function buildCalendar() {
  const cal = document.getElementById("calendar");
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  weekdayLabels.forEach((d) => {
    const el = document.createElement("div");
    el.className = "cal-head";
    el.textContent = d;
    cal.appendChild(el);
  });

  for (let i = 0; i < CONFIG.startWeekday; i++) {
    const el = document.createElement("div");
    el.className = "cal-day empty";
    cal.appendChild(el);
  }

  for (let d = 1; d <= CONFIG.daysInMonth; d++) {
    const el = document.createElement("div");
    el.className = "cal-day";
    el.textContent = d;
    if (CONFIG.highlightDays.includes(d)) {
      el.classList.add("highlight");
    }
    cal.appendChild(el);
  }
}
buildCalendar();

// ---- Countdown timer ----
let countdownFlipped = false;

function updateCountdown() {
  const daysEl = document.getElementById("countdown-days");
  const hoursEl = document.getElementById("countdown-hours");
  const minsEl = document.getElementById("countdown-mins");
  const secsEl = document.getElementById("countdown-secs");
  if (!daysEl) return;

  const now = Date.now();
  const weddingTime = CONFIG.weddingDate.getTime();
  const hasHappened = now >= weddingTime;

  if (hasHappened && !countdownFlipped) {
    countdownFlipped = true;
    const titleEl = document.querySelector("#slide-countdown .section-title");
    if (titleEl) titleEl.textContent = "Married Since";
  }

  const diff = Math.abs(weddingTime - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);

  setCountdownValue(daysEl, days);
  setCountdownValue(hoursEl, hours);
  setCountdownValue(minsEl, mins);
  setCountdownValue(secsEl, secs);
}

function setCountdownValue(el, value) {
  const text = String(value).padStart(2, "0");
  if (el.textContent === text) return;
  el.textContent = text;
  el.classList.remove("flip");
  // eslint-disable-next-line no-unused-expressions
  void el.offsetWidth; // restart animation
  el.classList.add("flip");
}
updateCountdown();
setInterval(updateCountdown, 1000);

// ---- Gallery / love story ----
function buildGallery() {
  const gallery = document.getElementById("gallery");
  if (!gallery) return;
  GALLERY_ITEMS.forEach((item, i) => {
    const el = document.createElement("div");
    el.className = "gallery-item";
    el.style.setProperty("--tilt", (i % 2 === 0 ? 1.5 : -1.5) + "deg");
    if (item.photo) el.style.backgroundImage = `url('${item.photo}')`;
    const caption = document.createElement("span");
    caption.className = "gallery-item-caption";
    caption.textContent = item.caption;
    el.appendChild(caption);
    gallery.appendChild(el);
  });
}
buildGallery();

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

// ---- fullPage.js init ----
new fullpage("#fullpage", {
  licenseKey: "gplv3-license", // free/non-commercial use
  autoScrolling: true,
  scrollHorizontally: false,
  navigation: true,
  navigationPosition: "right",
  scrollingSpeed: 900,
  keyboardScrolling: true,
  touchSensitivity: 5,
  normalScrollElements: "#gallery",
  loopBottom: true,
  loopTop: true,
  afterLoad: function (origin, destination) {
    if (window.unmuteBgMusic) window.unmuteBgMusic();

    const el = destination.item;
    const revealEls = el.querySelectorAll(".reveal");
    revealEls.forEach((r) => r.classList.remove("in-view"));
    // single forced reflow for the whole batch, not one per element
    void el.offsetWidth;
    revealEls.forEach((r, i) => {
      setTimeout(() => {
        requestAnimationFrame(() => r.classList.add("in-view"));
      }, 350 + i * 300);
    });

    // preload the next section's background image before the user scrolls to it
    if (window.loadSectionBg) {
      const allSections = document.querySelectorAll(".section[data-bg]");
      const currentSection = el.matches("[data-bg]") ? el : el.closest("[data-bg]");
      window.loadSectionBg(currentSection); // in case a jump (nav dot, loop, deep link) skipped preload

      const currentBgIndex = Array.from(allSections).indexOf(currentSection);
      const nextSection = allSections[currentBgIndex + 1];
      if (nextSection) window.loadSectionBg(nextSection);
      else window.loadSectionBg(allSections[0]); // loop case
    }

    // let three.js background know which scene is active
    if (window.WeddingBG) {
      window.WeddingBG.setScene(destination.index);
    }

    if (el.id === "slide-countdown") {
      fireConfetti();
    }
  },
  onLeave: function (origin) {
    origin.item.querySelectorAll(".reveal").forEach((r) => {
      r.classList.remove("in-view");
    });
  }
});

const scrollHint = document.getElementById("scroll-hint");
if (scrollHint) {
  scrollHint.addEventListener("click", () => {
    fullpage_api.moveSectionDown();
  });
}

// ---- Confetti burst ----
function fireConfetti() {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.id = "confetti-canvas";
  canvas.style.position = "fixed";
  canvas.style.inset = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.zIndex = "50";
  canvas.style.pointerEvents = "none";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const resize = () => {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener("resize", resize);

  const colors = ["#7c2528", "#c9a04e", "#4c5330", "#f7f2e9", "#ffd9d0"];
  const COUNT = 140;
  const gravity = 0.12;
  const drag = 0.995;

  const pieces = Array.from({ length: COUNT }, () => ({
    x: window.innerWidth / 2 + (Math.random() - 0.5) * 120,
    y: window.innerHeight * 0.25 + (Math.random() - 0.5) * 60,
    vx: (Math.random() - 0.5) * 12,
    vy: Math.random() * -12 - 4,
    size: Math.random() * 6 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.3,
    shape: Math.random() < 0.5 ? "rect" : "circle"
  }));

  const startTime = performance.now();
  const DURATION = 3200;

  function frame(now) {
    const elapsed = now - startTime;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    pieces.forEach((p) => {
      p.vy += gravity;
      p.vx *= drag;
      p.vy *= drag;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      if (p.shape === "rect") {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    if (elapsed < DURATION) {
      requestAnimationFrame(frame);
    } else {
      canvas.style.transition = "opacity .6s ease";
      canvas.style.opacity = "0";
      setTimeout(() => canvas.remove(), 600);
    }
  }
  requestAnimationFrame(frame);
}
fireConfetti();
