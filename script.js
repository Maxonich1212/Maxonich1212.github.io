// При обновлении страницы всегда открываем сверху (с главной), а не там, где была прокрутка
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
if (location.hash) history.replaceState(null, "", location.pathname + location.search);
window.scrollTo(0, 0);

// Текущий год в подвале — обновляется автоматически
document.getElementById("year").textContent = new Date().getFullYear();

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ====================================================================
   1. ПОЯВЛЕНИЕ БЛОКОВ ПРИ ПРОКРУТКЕ
   ==================================================================== */
const revealEls = document.querySelectorAll("[data-reveal], [data-scroll-scale]");
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        const counter = entry.target.querySelector("[data-count]");
        if (counter) animateCount(counter);
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
);
revealEls.forEach((el) => revealObserver.observe(el));

/* ====================================================================
   2. ПЛАВНЫЙ ПАРАЛЛАКС
   ==================================================================== */
const parallaxEls = document.querySelectorAll("[data-parallax]");
let ticking = false;

function applyParallax() {
  const vh = window.innerHeight;
  parallaxEls.forEach((el) => {
    const speed = parseFloat(el.dataset.parallax);
    const rect = el.getBoundingClientRect();
    const offset = (rect.top + rect.height / 2 - vh / 2) * speed;
    el.style.transform = `translate3d(0, ${(-offset).toFixed(1)}px, 0)`;
  });
  ticking = false;
}

/* ====================================================================
   3. ШАПКА + ПОЛОСКА ПРОГРЕССА + КНОПКА «НАВЕРХ»
   ==================================================================== */
const header = document.getElementById("header");
const progress = document.getElementById("scrollProgress");
const toTop = document.getElementById("toTop");

// Подсветка активного пункта меню — на каком блоке мы сейчас
const navLinks = Array.from(document.querySelectorAll(".nav a"));
const spySections = Array.from(document.querySelectorAll("main section[id]"));
function updateActiveNav() {
  const line = window.scrollY + (header ? header.getBoundingClientRect().height : 0) + 110;
  let currentId = spySections.length ? spySections[0].id : "";
  for (const s of spySections) {
    if (s.offsetTop <= line) currentId = s.id;
  }
  navLinks.forEach((l) =>
    l.classList.toggle("is-active", l.getAttribute("href") === "#" + currentId)
  );
}

function onScroll() {
  const scrollTop = window.scrollY;

  header.classList.toggle("is-scrolled", scrollTop > 40);
  toTop.classList.toggle("is-visible", scrollTop > 600);
  updateActiveNav();

  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  progress.style.width = pct + "%";

  if (!ticking && !reduceMotion) {
    requestAnimationFrame(applyParallax);
    ticking = true;
  }
}

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", () => { if (!reduceMotion) applyParallax(); updateActiveNav(); });
onScroll();
if (!reduceMotion) applyParallax();

toTop.addEventListener("click", () => smoothScrollTo(0));

/* ====================================================================
   4. ПЛАВНЫЙ СЧЁТ ЦИФР
   ==================================================================== */
function animateCount(el) {
  if (el.dataset.done) return;
  el.dataset.done = "1";
  const target = parseInt(el.dataset.count, 10);
  const suffix = el.dataset.suffix || "";
  const duration = 1400;
  let startTime = null;

  function step(now) {
    if (!startTime) startTime = now;
    const p = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * eased) + suffix;
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ====================================================================
   5. МЕНЮ ДЛЯ ТЕЛЕФОНА (бургер)
   ==================================================================== */
const burger = document.getElementById("burger");
const nav = document.getElementById("nav");

function setMenu(open) {
  nav.classList.toggle("is-open", open);
  burger.classList.toggle("is-open", open);
  burger.setAttribute("aria-expanded", String(open));
  document.body.style.overflow = open ? "hidden" : "";
}
burger.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
// Закрываем меню при клике по пункту
nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setMenu(false)));

/* ====================================================================
   6. ФИЛЬТР ГАЛЕРЕИ (Все / Детская / Взрослая)
   ==================================================================== */
const cards = Array.from(document.querySelectorAll(".card"));
const filter = document.getElementById("filter");
const filterPill = document.getElementById("filterPill");
const filterBtns = document.querySelectorAll(".filter__btn");

// Перемещаем «капельку» под активную кнопку
function movePill() {
  const active = filter.querySelector(".filter__btn.is-active");
  if (!active || !filterPill) return;
  filterPill.style.width = active.offsetWidth + "px";
  filterPill.style.transform = "translateX(" + active.offsetLeft + "px)";
}

// Сколько работ показывать в свёрнутом виде (остальные — под кнопкой «Показать все»)
const GALLERY_LIMIT = 4;
let galleryExpanded = false;
let currentFilter = "all";
const galleryMore = document.getElementById("galleryMore");

function applyGallery() {
  let matchIndex = 0;
  cards.forEach((card) => {
    const match = currentFilter === "all" || card.dataset.category === currentFilter;
    if (!match) {
      card.classList.add("is-hidden");
      card.classList.remove("is-clipped");
      return;
    }
    card.classList.remove("is-hidden");
    // в свёрнутом виде прячем всё, что после лимита
    const clip = !galleryExpanded && matchIndex >= GALLERY_LIMIT;
    card.classList.toggle("is-clipped", clip);
    matchIndex++;
  });
  // показываем кнопку, только если работ больше лимита
  if (galleryMore) {
    if (matchIndex > GALLERY_LIMIT) {
      galleryMore.parentElement.style.display = "";
      galleryMore.textContent = galleryExpanded ? "Свернуть" : "Показать все (" + matchIndex + ")";
    } else {
      galleryMore.parentElement.style.display = "none";
    }
  }
}

filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterBtns.forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    currentFilter = btn.dataset.filter;
    galleryExpanded = false; // при смене категории сворачиваем обратно
    movePill();
    applyGallery();
  });
});

if (galleryMore) {
  galleryMore.addEventListener("click", () => {
    galleryExpanded = !galleryExpanded;
    applyGallery();
    if (!galleryExpanded) scrollToTarget("#works"); // при сворачивании вернуться к началу работ
  });
}

// Ставим капельку на место при загрузке и пересчитываем при изменении размера
movePill();
applyGallery();
window.addEventListener("load", movePill);
window.addEventListener("resize", movePill);

/* ====================================================================
   УСЛУГИ — аккордеон (плавное раскрытие описания по клику)
   ==================================================================== */
document.querySelectorAll(".service__head").forEach((head) => {
  head.addEventListener("click", () => {
    const item = head.closest(".service");
    const open = item.classList.toggle("is-open");
    head.setAttribute("aria-expanded", String(open));
  });
});

/* ====================================================================
   ПЛАВНЫЙ ПЕРЕХОД ПО ЯКОРНЫМ ССЫЛКАМ (мягко, с замедлением)
   ==================================================================== */
function smoothScrollTo(targetY, duration) {
  if (reduceMotion) { window.scrollTo(0, targetY); return; }
  const startY = window.scrollY;
  const diff = targetY - startY;
  if (Math.abs(diff) < 2) return;
  // длительность зависит от расстояния: короткие переходы быстрее, дальние — плавнее
  if (duration == null) duration = Math.min(1300, Math.max(700, Math.abs(diff) * 0.5));
  let start = null;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2); // easeInOutCubic
  function step(now) {
    if (start === null) start = now;
    const p = Math.min((now - start) / duration, 1);
    window.scrollTo(0, startY + diff * ease(p));
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function scrollToTarget(hash) {
  const id = hash.slice(1);
  if (id === "top" || id === "") { smoothScrollTo(0); return; }
  const el = document.getElementById(id);
  if (!el) return;
  const headerH = header ? header.getBoundingClientRect().height : 0;
  const y = window.scrollY + el.getBoundingClientRect().top - headerH - 18;
  smoothScrollTo(Math.max(0, y));
}

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const href = a.getAttribute("href");
    if (!href || href.length < 2) return;
    const id = href.slice(1);
    if (id !== "top" && !document.getElementById(id)) return;
    e.preventDefault();
    setMenu(false); // закрыть мобильное меню, если открыто
    scrollToTarget(href);
    // намеренно НЕ меняем адрес (#...), чтобы при обновлении страница открывалась с главной
  });
});

/* ====================================================================
   7. ПРОСМОТР РАБОТ КРУПНО + ЛИСТАНИЕ (стрелки / клавиши)
   ==================================================================== */
const lightbox = document.getElementById("lightbox");
const lightboxContent = document.getElementById("lightboxContent");
const lightboxCaption = document.getElementById("lightboxCaption");
const lightboxClose = document.getElementById("lightboxClose");
const lightboxPrev = document.getElementById("lightboxPrev");
const lightboxNext = document.getElementById("lightboxNext");

// Листаем ФОТО ОДНОГО изделия (из data-photos карточки)
let currentPhotos = [];
let currentTitle = "";
let currentIndex = 0;

function renderLightbox() {
  const src = currentPhotos[currentIndex];
  if (!src) return;
  lightboxContent.innerHTML =
    '<img src="' + src + '" alt="' + currentTitle.replace(/"/g, "") + '" />';
  const multi = currentPhotos.length > 1;
  lightboxCaption.textContent =
    currentTitle + (multi ? "  ·  " + (currentIndex + 1) + " / " + currentPhotos.length : "");
  lightboxPrev.style.display = multi ? "" : "none";
  lightboxNext.style.display = multi ? "" : "none";
}

function openLightbox(card) {
  currentPhotos = (card.dataset.photos || "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  // запасной вариант: если data-photos не задан — берём картинку из карточки
  if (!currentPhotos.length) {
    const img = card.querySelector("img");
    if (img) currentPhotos = [img.getAttribute("src")];
  }
  if (!currentPhotos.length) return;
  const cap = card.querySelector("figcaption");
  currentTitle = card.dataset.title || (cap ? cap.textContent : "");
  currentIndex = 0;
  renderLightbox();
  lightbox.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  lightbox.hidden = true;
  lightboxContent.innerHTML = "";
  document.body.style.overflow = "";
}

function move(dir) {
  if (currentPhotos.length < 2) return;
  currentIndex = (currentIndex + dir + currentPhotos.length) % currentPhotos.length;
  renderLightbox();
}

cards.forEach((card) => card.addEventListener("click", () => openLightbox(card)));
lightboxClose.addEventListener("click", closeLightbox);
lightboxPrev.addEventListener("click", () => move(-1));
lightboxNext.addEventListener("click", () => move(1));
lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeLightbox(); });

document.addEventListener("keydown", (e) => {
  if (lightbox.hidden) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft") move(-1);
  if (e.key === "ArrowRight") move(1);
});
