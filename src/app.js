const root = document.documentElement;
const themeButtons = document.querySelectorAll("[data-theme-toggle]");

function applyTheme(theme) {
  root.dataset.theme = theme;
  localStorage.setItem("replay-theme", theme);
}

themeButtons.forEach((button) => button.addEventListener("click", () => {
  applyTheme(root.dataset.theme === "night" ? "paper" : "night");
}));

const novel = document.querySelector("[data-novel]");
const progress = document.querySelector("[data-progress]");
if (novel && progress) {
  const savedSize = Number(localStorage.getItem("replay-font-size")) || 19;
  root.style.setProperty("--reader-size", savedSize + "px");
  document.querySelectorAll("[data-font]").forEach((button) => button.addEventListener("click", () => {
    const current = Number.parseFloat(getComputedStyle(root).getPropertyValue("--reader-size")) || 19;
    const next = Math.min(25, Math.max(15, current + (button.dataset.font === "up" ? 1 : -1)));
    root.style.setProperty("--reader-size", next + "px");
    localStorage.setItem("replay-font-size", next);
  }));
  const updateProgress = () => {
    const start = novel.offsetTop;
    const distance = novel.offsetHeight - innerHeight;
    const value = distance > 0 ? Math.min(1, Math.max(0, (scrollY - start) / distance)) : 1;
    progress.style.transform = "scaleX(" + value + ")";
  };
  addEventListener("scroll", updateProgress, { passive: true });
  addEventListener("resize", updateProgress);
  updateProgress();
}

const tocButton = document.querySelector("[data-toc-toggle]");
const toc = document.querySelector("#reader-toc");
if (tocButton && toc) {
  tocButton.addEventListener("click", () => {
    const open = toc.classList.toggle("is-open");
    tocButton.setAttribute("aria-expanded", String(open));
  });
  toc.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
    toc.classList.remove("is-open");
    tocButton.setAttribute("aria-expanded", "false");
  }));
}

const sections = [...document.querySelectorAll(".novel h2[id], .novel h3[id]")];
const tocLinks = new Map([...document.querySelectorAll(".reader-toc a[href^='#']")]
  .map((link) => [link.getAttribute("href").slice(1), link]));
if (sections.length && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      tocLinks.forEach((link) => link.removeAttribute("aria-current"));
      const active = tocLinks.get(entry.target.id);
      if (active) active.setAttribute("aria-current", "true");
    }
  }, { rootMargin: "-12% 0px -76% 0px" });
  sections.forEach((section) => observer.observe(section));
}
