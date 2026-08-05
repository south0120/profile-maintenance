/* ColaSite — インタラクション（Design.md §3.1, §3.3, §5.3） */
(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- ヒーローカルーセル ---------- */
  const track = document.getElementById("hero-track");
  const slides = Array.from(track.querySelectorAll(".hero-slide"));
  const dotsWrap = document.getElementById("hero-dots");
  const pauseBtn = document.getElementById("hero-pause");
  const AUTOPLAY_MS = 6000;
  let current = 0;
  let timer = null;
  let playing = !prefersReducedMotion;

  slides.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.className = "hero-dot";
    dot.setAttribute("role", "tab");
    dot.setAttribute("aria-label", `スライド ${i + 1}`);
    dot.setAttribute("aria-selected", i === 0 ? "true" : "false");
    dot.addEventListener("click", () => goTo(i, true));
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.children);

  function goTo(index, byUser) {
    current = (index + slides.length) % slides.length;
    track.scrollTo({
      left: track.clientWidth * current,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
    dots.forEach((d, i) => d.setAttribute("aria-selected", i === current ? "true" : "false"));
    if (byUser) restartTimer();
  }

  function startTimer() {
    if (!playing) return;
    timer = setInterval(() => goTo(current + 1, false), AUTOPLAY_MS);
  }
  function stopTimer() {
    clearInterval(timer);
    timer = null;
  }
  function restartTimer() {
    stopTimer();
    startTimer();
  }

  pauseBtn.addEventListener("click", () => {
    playing = !playing;
    pauseBtn.textContent = playing ? "❚❚" : "▶";
    pauseBtn.setAttribute("aria-label", playing ? "自動再生を一時停止" : "自動再生を再開");
    playing ? startTimer() : stopTimer();
  });

  document.getElementById("hero-prev").addEventListener("click", () => goTo(current - 1, true));
  document.getElementById("hero-next").addEventListener("click", () => goTo(current + 1, true));

  // スワイプ・手動スクロール時にドットを同期
  let scrollDebounce = null;
  track.addEventListener("scroll", () => {
    clearTimeout(scrollDebounce);
    scrollDebounce = setTimeout(() => {
      const i = Math.round(track.scrollLeft / track.clientWidth);
      if (i !== current) {
        current = i;
        dots.forEach((d, j) => d.setAttribute("aria-selected", j === current ? "true" : "false"));
      }
    }, 100);
  });

  startTimer();

  /* ---------- ブランドカルーセル ---------- */
  const brandTrack = document.getElementById("brand-carousel");
  const scrollBrands = (dir) => {
    brandTrack.scrollBy({
      left: dir * brandTrack.clientWidth * 0.8,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };
  document.getElementById("brand-prev").addEventListener("click", () => scrollBrands(-1));
  document.getElementById("brand-next").addEventListener("click", () => scrollBrands(1));

  /* ---------- 検索バー ---------- */
  const searchToggle = document.getElementById("search-toggle");
  const searchBar = document.getElementById("search-bar");
  searchToggle.addEventListener("click", () => {
    const open = searchBar.hidden;
    searchBar.hidden = !open;
    searchToggle.setAttribute("aria-expanded", String(open));
    searchToggle.setAttribute("aria-label", open ? "検索を閉じる" : "検索を開く");
    if (open) searchBar.querySelector("input").focus();
  });

  /* ---------- モバイルドロワー ---------- */
  const drawer = document.getElementById("drawer");
  const overlay = document.getElementById("drawer-overlay");
  const hamburger = document.getElementById("hamburger");
  const drawerClose = document.getElementById("drawer-close");
  let lastFocused = null;

  function openDrawer() {
    lastFocused = document.activeElement;
    drawer.hidden = false;
    overlay.hidden = false;
    hamburger.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    drawerClose.focus();
  }
  function closeDrawer() {
    drawer.hidden = true;
    overlay.hidden = true;
    hamburger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    if (lastFocused) lastFocused.focus();
  }

  hamburger.addEventListener("click", openDrawer);
  drawerClose.addEventListener("click", closeDrawer);
  overlay.addEventListener("click", closeDrawer);
  drawer.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeDrawer));

  // フォーカストラップ + Esc
  document.addEventListener("keydown", (e) => {
    if (drawer.hidden) return;
    if (e.key === "Escape") {
      closeDrawer();
      return;
    }
    if (e.key === "Tab") {
      const focusables = drawer.querySelectorAll("button, a, input");
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // ドロワー内アコーディオン
  drawer.querySelectorAll(".drawer-acc").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sub = btn.nextElementSibling;
      const open = sub.hidden;
      sub.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      btn.querySelector(".acc-icon").textContent = open ? "−" : "＋";
    });
  });

  /* ---------- フッターアコーディオン（SPのみ有効） ---------- */
  document.querySelectorAll(".footer-acc").forEach((btn) => {
    btn.addEventListener("click", () => {
      const col = btn.closest(".footer-col");
      const open = col.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
      btn.querySelector(".acc-icon").textContent = open ? "−" : "＋";
    });
  });

  /* ---------- Cookieバナー ---------- */
  const banner = document.getElementById("cookie-banner");
  const CONSENT_KEY = "colasite-cookie-consent";
  if (!localStorage.getItem(CONSENT_KEY)) {
    banner.hidden = false;
  }
  document.getElementById("cookie-accept").addEventListener("click", () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    banner.hidden = true;
  });
  document.getElementById("cookie-config").addEventListener("click", () => {
    localStorage.setItem(CONSENT_KEY, "configured");
    banner.hidden = true;
  });
  document.getElementById("cookie-settings").addEventListener("click", (e) => {
    e.preventDefault();
    localStorage.removeItem(CONSENT_KEY);
    banner.hidden = false;
  });
})();
