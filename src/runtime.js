export function mountDocs(bundle, config = {}) {
  const { docs, content } = bundle;
  const manifest = docs;
  const brand = config.brand || {};
  const repo = config.repo || {};
  const audienceConfig = config.audience || {};
  const storageKey = config.storageKey || "docs-kit";
  const defaultSlug = config.defaultSlug || "introduction";
  const INTERNAL_BUILD = docs.buildAudience === "internal";
  const showRepo = Boolean(
    repo.url && (INTERNAL_BUILD || repo.showInPublic === true),
  );
  const GITHUB_REPO = showRepo ? repo.url : "";
  const GITHUB_BLOB = showRepo
    ? repo.blobBase || `${GITHUB_REPO}/blob/main`
    : "";
  const GITHUB_RAW = showRepo
    ? repo.rawBase ||
      "https://raw.githubusercontent.com/" +
        GITHUB_REPO.replace(/^https?:\/\/github\.com\//, "") +
        "/main"
    : "";
  const GITHUB_LINK = showRepo
    ? `<a class="icon-button github-link" href="${GITHUB_REPO}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(brand.repoLabel || `${brand.name || manifest.name} on GitHub`)}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.71.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.35 1.12 2.92.85.09-.66.35-1.12.64-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.95c.85 0 1.7.12 2.5.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.94-2.35 4.8-4.58 5.06.36.32.68.95.68 1.92 0 1.38-.01 2.49-.01 2.83 0 .27.18.6.69.49A10.23 10.23 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z" /></svg>
      </a>`
    : "";

const availableAudiences =
  docs.buildAudience === "public" ? ["public"] : ["public", "internal"];
const savedAudience = localStorage.getItem(`${storageKey}-audience`);
let currentAudience = availableAudiences.includes(savedAudience)
  ? savedAudience
  : "public";
let visiblePages = [];
let pageBySlug = new Map();
let pageByFile = new Map();
let pageIndex = new Map();
let searchEntries = [];

function groupsForAudience(audience) {
  return manifest.navigation.filter(
    (group) => audience === "internal" || group.audience === "public",
  );
}

function rebuildAudience() {
  visiblePages = groupsForAudience(currentAudience).flatMap((group) =>
    group.pages.map((page) => ({ ...page, group: group.group })),
  );
  pageBySlug = new Map(visiblePages.map((page) => [page.slug, page]));
  pageByFile = new Map(
    visiblePages.map((page) => [normalizePath(page.file), page]),
  );
  pageIndex = new Map(visiblePages.map((page, index) => [page.slug, index]));
}

function rebuildSearch() {
  searchEntries = makeSearchEntries();
}

marked.setOptions({ gfm: true, breaks: false });

const app = document.querySelector("#app");
app.innerHTML = `
  <header class="topbar">
    <button class="icon-button menu-button" type="button" aria-label="Open navigation" aria-expanded="false">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
    </button>
    <a class="brand" href="#/${defaultSlug}" aria-label="${escapeHtml(brand.homeLabel || `${brand.name || manifest.name} documentation home`)}">
      <span class="brand-mark">${escapeHtml(brand.mark || (brand.name || manifest.name).slice(0, 1))}</span>
      <span class="brand-name">${escapeHtml(brand.name || manifest.name)}</span>
      <span class="brand-badge">${escapeHtml(brand.badge || "Docs")}</span>
    </a>
    <div class="audience-switch" role="group" aria-label="Documentation audience">
      <button class="audience-pill" type="button" data-audience="public">Public</button>
      <button class="audience-pill" type="button" data-audience="internal">Internal</button>
    </div>
    <div class="topbar-actions">
      <button class="search-trigger" type="button" aria-label="Search documentation">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
        <span>Search docs</span>
        <kbd>⌘K</kbd>
      </button>
      ${GITHUB_LINK}
      <button class="icon-button theme-toggle" type="button" aria-label="Toggle color theme"></button>
    </div>
  </header>
  <div class="nav-backdrop" data-close-nav></div>
  <div class="layout">
    <aside class="sidebar" aria-label="Documentation navigation">
      <div class="sidebar-inner">
        <nav class="sidebar-nav"></nav>
        <div class="sidebar-footer">
          <span class="status-dot"></span>
          <span class="sidebar-scope">Built from the repository</span>
        </div>
      </div>
    </aside>
    <main class="main">
      <div class="main-inner">
        <div class="breadcrumbs"></div>
        <article class="prose"></article>
        <nav class="pager" aria-label="Previous and next pages"></nav>
      </div>
    </main>
    <aside class="toc" aria-label="On this page">
      <div class="toc-inner">
        <p class="toc-title">On this page</p>
        <ul class="toc-list"></ul>
      </div>
    </aside>
  </div>
  <div class="search-modal" role="dialog" aria-modal="true" aria-label="Search documentation" hidden>
    <div class="search-backdrop" data-close-search></div>
    <div class="search-dialog">
      <div class="search-input-row">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
        <input class="search-input" type="search" placeholder="Search titles, components, concepts…" autocomplete="off" spellcheck="false" />
        <kbd>Esc</kbd>
      </div>
      <div class="search-results" role="listbox"></div>
      <div class="search-footer"><span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span><span><kbd>↵</kbd> to open</span></div>
    </div>
  </div>
`;

const sidebarNav = document.querySelector(".sidebar-nav");
const audienceSwitch = document.querySelector(".audience-switch");
const breadcrumbs = document.querySelector(".breadcrumbs");
const article = document.querySelector(".prose");
const pager = document.querySelector(".pager");
const toc = document.querySelector(".toc");
const tocList = document.querySelector(".toc-list");
const themeToggle = document.querySelector(".theme-toggle");
const menuButton = document.querySelector(".menu-button");
const searchModal = document.querySelector(".search-modal");
const searchInput = document.querySelector(".search-input");
const searchResults = document.querySelector(".search-results");
const searchTrigger = document.querySelector(".search-trigger");

let activeTocObserver = null;
let searchSelected = 0;
let searchMatches = [];

const ICON_SUN = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" /></svg>`;
const ICON_MOON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>`;
const ICON_COPY = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>`;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizePath(path) {
  const parts = [];
  for (const part of path.replaceAll("\\", "/").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return parts.join("/");
}

function dirname(path) {
  const normalized = normalizePath(path);
  const index = normalized.lastIndexOf("/");
  return index === -1 ? "" : normalized.slice(0, index);
}

function joinPath(base, path) {
  if (path.startsWith("/")) return normalizePath(path.slice(1));
  return normalizePath(`${base}/${path}`);
}

function slugify(text) {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-") || "section"
  );
}

function currentRoute() {
  const raw = location.hash.replace(/^#\/?/, "") || defaultSlug;
  const [slug, anchor] = raw.split("#");
  return { slug: slug || defaultSlug, anchor: anchor || "" };
}

function renderSidebar() {
  sidebarNav.innerHTML = groupsForAudience(currentAudience)
    .map(
      (group) => `
        <section class="nav-group">
          <p class="nav-group-title">${escapeHtml(group.group)}</p>
          <ul>
            ${group.pages
              .map(
                (page) => `
                  <li>
                    <a class="nav-link" href="#/${page.slug}" data-slug="${page.slug}">
                      <span>${escapeHtml(page.title)}</span>
                    </a>
                  </li>`,
              )
              .join("")}
          </ul>
        </section>`,
    )
    .join("");
}

function renderAudienceSwitch() {
  const labels = audienceConfig.labels || {
    public: "Public",
    internal: "Internal",
  };
  const scopes = audienceConfig.scopes || {
    public: "Public documentation",
    internal: "Internal documentation",
  };
  const showSwitch = availableAudiences.length > 1;
  audienceSwitch.hidden = !showSwitch;
  for (const button of audienceSwitch.querySelectorAll(".audience-pill")) {
    const audience = button.dataset.audience;
    const available = availableAudiences.includes(audience);
    button.hidden = !available;
    button.textContent = labels[audience] || audience;
    button.classList.toggle("active", audience === currentAudience);
    button.setAttribute("aria-pressed", String(audience === currentAudience));
    button.title = scopes[audience] || "";
  }
  document.querySelector(".sidebar-scope").textContent =
    scopes[currentAudience] || "";
}

function setAudience(next) {
  if (!availableAudiences.includes(next) || next === currentAudience) return;
  currentAudience = next;
  localStorage.setItem(`${storageKey}-audience`, next);
  rebuildAudience();
  rebuildSearch();
  renderAudienceSwitch();
  const { slug } = currentRoute();
  if (!pageBySlug.has(slug)) {
    location.hash = `#/${visiblePages[0]?.slug || defaultSlug}`;
    return;
  }
  renderPage();
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(`${storageKey}-theme`, theme);
  themeToggle.innerHTML = theme === "dark" ? ICON_SUN : ICON_MOON;
  themeToggle.setAttribute(
    "aria-label",
    theme === "dark" ? "Use light theme" : "Use dark theme",
  );
}

function initTheme() {
  const stored = localStorage.getItem(`${storageKey}-theme`);
  const preferred = matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
  applyTheme(stored || preferred);
  themeToggle.addEventListener("click", () => {
    applyTheme(
      document.documentElement.dataset.theme === "dark" ? "light" : "dark",
    );
  });
}

function rewriteLinks(container, page) {
  for (const link of container.querySelectorAll("a[href]")) {
    const href = link.getAttribute("href");
    if (!href) continue;
    if (href.startsWith("#/")) continue;
    if (href.startsWith("#")) {
      link.classList.add("anchor-link");
      continue;
    }
    if (/^(https?:|mailto:)/i.test(href)) {
      link.target = "_blank";
      link.rel = "noreferrer";
      continue;
    }
    const [pathPart, anchor] = href.split("#");
    if (!pathPart) continue;
    const resolved = joinPath(dirname(page.file), pathPart);
    const target = pageByFile.get(resolved);
    if (target) {
      link.href = `#/${target.slug}${anchor ? `#${anchor}` : ""}`;
    } else if (currentAudience === "public") {
      link.href = "#";
      link.title = "This source reference is not included in the public build";
    } else {
      link.href = `${GITHUB_BLOB}/${resolved}${anchor ? `#${anchor}` : ""}`;
      link.target = "_blank";
      link.rel = "noreferrer";
    }
  }

  for (const image of container.querySelectorAll("img[src]")) {
    const src = image.getAttribute("src");
    if (!src || /^(https?:|data:|\/)/i.test(src)) continue;
    image.src = `${GITHUB_RAW}/${joinPath(dirname(page.file), src)}`;
    image.loading = "lazy";
  }
}

function decorateHeadings(container) {
  const seen = new Map();
  for (const heading of container.querySelectorAll("h1, h2, h3, h4")) {
    let id = slugify(heading.textContent);
    const count = (seen.get(id) || 0) + 1;
    seen.set(id, count);
    if (count > 1) id = `${id}-${count}`;
    heading.id = id;
  }
}

function decorateCode(container) {
  for (const pre of container.querySelectorAll("pre")) {
    const code = pre.querySelector("code");
    const language =
      [...(code?.classList || [])]
        .find((name) => name.startsWith("language-"))
        ?.slice("language-".length) || "text";
    if (code && hljs.getLanguage(language)) {
      code.innerHTML = hljs.highlight(code.textContent, { language }).value;
      code.classList.add("hljs");
    }
    const wrapper = document.createElement("div");
    wrapper.className = "code-block";
    const header = document.createElement("div");
    header.className = "code-header";
    header.innerHTML = `<span>${escapeHtml(language)}</span><button class="copy-button" type="button" aria-label="Copy code">${ICON_COPY}<span>Copy</span></button>`;
    pre.parentNode.insertBefore(wrapper, pre);
    wrapper.append(header, pre);
    header
      .querySelector(".copy-button")
      .addEventListener("click", async (event) => {
        const button = event.currentTarget;
        await navigator.clipboard.writeText(
          code?.textContent || pre.textContent || "",
        );
        button.querySelector("span").textContent = "Copied";
        setTimeout(() => {
          button.querySelector("span").textContent = "Copy";
        }, 1400);
      });
  }
}

function decorateTables(container) {
  for (const table of container.querySelectorAll("table")) {
    const wrapper = document.createElement("div");
    wrapper.className = "table-wrap";
    table.parentNode.insertBefore(wrapper, table);
    wrapper.append(table);
  }
}

function buildToc(container) {
  const headings = [...container.querySelectorAll("h2, h3")];
  toc.hidden = headings.length === 0;
  tocList.innerHTML = headings
    .map(
      (heading) => `
        <li class="toc-item depth-${heading.tagName === "H3" ? 3 : 2}">
          <a href="#${currentRoute().slug}#${heading.id}" data-anchor="${heading.id}">${escapeHtml(heading.textContent)}</a>
        </li>`,
    )
    .join("");

  activeTocObserver?.disconnect();
  activeTocObserver = null;
  if (!headings.length) return;

  const links = new Map(
    [...tocList.querySelectorAll("a[data-anchor]")].map((link) => [
      link.dataset.anchor,
      link,
    ]),
  );
  activeTocObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const link of links.values()) link.classList.remove("active");
        links.get(entry.target.id)?.classList.add("active");
      }
    },
    { rootMargin: "-80px 0px -65% 0px", threshold: 0 },
  );
  for (const heading of headings) activeTocObserver.observe(heading);
}

function renderPager(page) {
  const index = pageIndex.get(page.slug);
  const previous = index > 0 ? visiblePages[index - 1] : null;
  const next = index < visiblePages.length - 1 ? visiblePages[index + 1] : null;
  pager.innerHTML = `
    ${previous ? `<a class="pager-link previous" href="#/${previous.slug}"><span>Previous</span><strong>${escapeHtml(previous.title)}</strong></a>` : "<span></span>"}
    ${next ? `<a class="pager-link next" href="#/${next.slug}"><span>Next</span><strong>${escapeHtml(next.title)}</strong></a>` : "<span></span>"}
  `;
}

function renderPage() {
  const { slug, anchor } = currentRoute();
  const page = pageBySlug.get(slug);
  document.body.classList.remove("nav-open");
  menuButton.setAttribute("aria-expanded", "false");

  if (!page) {
    const fallback = visiblePages[0];
    if (currentAudience === "public" && fallback) {
      location.hash = `#/${fallback.slug}`;
      return;
    }
    breadcrumbs.innerHTML = "<span>Docs</span>";
    article.innerHTML = `
      <h1>Page not found</h1>
      <p>The page <code>${escapeHtml(slug)}</code> is not in this documentation build.</p>
      <p><a href="#/${fallback?.slug || defaultSlug}">Return to the introduction</a>.</p>`;
    pager.innerHTML = "";
    toc.hidden = true;
    document.title = `Page not found · ${manifest.name}`;
    return;
  }

  document.title = `${page.title} · ${manifest.name}`;
  document
    .querySelector('meta[name="description"]')
    ?.setAttribute("content", page.description || manifest.description);
  breadcrumbs.innerHTML = `<span>${escapeHtml(page.group)}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg><strong>${escapeHtml(page.title)}</strong>`;

  for (const link of sidebarNav.querySelectorAll(".nav-link")) {
    link.classList.toggle("active", link.dataset.slug === page.slug);
  }
  sidebarNav
    .querySelector(".nav-link.active")
    ?.scrollIntoView({ block: "nearest" });

  article.innerHTML = marked.parse(content[page.slug] || "");
  rewriteLinks(article, page);
  decorateHeadings(article);
  decorateCode(article);
  decorateTables(article);
  buildToc(article);
  renderPager(page);

  if (anchor) {
    requestAnimationFrame(() =>
      document.getElementById(anchor)?.scrollIntoView(),
    );
  } else {
    window.scrollTo({ top: 0, behavior: "instant" });
  }
}

function makeSearchEntries() {
  return visiblePages.map((page) => {
    const text = (content[page.slug] || "")
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/[#*_`>[\]()]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return {
      page,
      text,
      lowerText: text.toLowerCase(),
      title: page.title.toLowerCase(),
    };
  });
}

function searchFor(query) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length)
    return visiblePages
      .slice(0, 8)
      .map((page) => ({ page, snippet: page.description || "" }));

  return searchEntries
    .map((entry) => {
      let score = 0;
      for (const term of terms) {
        if (entry.title.startsWith(term)) score += 40;
        else if (entry.title.includes(term)) score += 24;
        if ((entry.page.description || "").toLowerCase().includes(term))
          score += 8;
        if (entry.page.group.toLowerCase().includes(term)) score += 4;
        if (entry.lowerText.includes(term)) score += 2;
        else return null;
      }
      const index = entry.lowerText.indexOf(terms[0]);
      const snippet =
        index >= 0
          ? entry.text.slice(Math.max(0, index - 60), index + 120)
          : entry.page.description;
      return {
        page: entry.page,
        score,
        snippet: snippet ? `…${snippet}…` : entry.page.description,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}

function renderSearchResults(query) {
  searchMatches = searchFor(query);
  searchSelected = 0;
  if (!searchMatches.length) {
    searchResults.innerHTML = `<div class="search-empty">No results for “${escapeHtml(query)}”.</div>`;
    return;
  }
  searchResults.innerHTML = searchMatches
    .map(
      (match, index) => `
        <a class="search-result ${index === 0 ? "selected" : ""}" href="#/${match.page.slug}" data-index="${index}" role="option" aria-selected="${index === 0}">
          <span class="search-result-title">${escapeHtml(match.page.title)}</span>
          <span class="search-result-group">${escapeHtml(match.page.group)}</span>
          <span class="search-result-snippet">${escapeHtml(match.snippet || "")}</span>
        </a>`,
    )
    .join("");
}

function updateSearchSelection(next) {
  if (!searchMatches.length) return;
  searchSelected = (next + searchMatches.length) % searchMatches.length;
  for (const result of searchResults.querySelectorAll(".search-result")) {
    const selected = Number(result.dataset.index) === searchSelected;
    result.classList.toggle("selected", selected);
    result.setAttribute("aria-selected", String(selected));
  }
  searchResults
    .querySelector(".search-result.selected")
    ?.scrollIntoView({ block: "nearest" });
}

function openSearch() {
  searchModal.hidden = false;
  document.body.classList.add("search-open");
  searchInput.value = "";
  renderSearchResults("");
  searchInput.focus();
}

function closeSearch() {
  searchModal.hidden = true;
  document.body.classList.remove("search-open");
}

function initSearch() {
  searchTrigger.addEventListener("click", openSearch);
  searchModal
    .querySelector("[data-close-search]")
    .addEventListener("click", closeSearch);
  searchInput.addEventListener("input", () =>
    renderSearchResults(searchInput.value),
  );
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      updateSearchSelection(searchSelected + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      updateSearchSelection(searchSelected - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const match = searchMatches[searchSelected];
      if (match) {
        location.hash = `#/${match.page.slug}`;
        closeSearch();
      }
    } else if (event.key === "Escape") {
      closeSearch();
    }
  });
  searchResults.addEventListener("click", (event) => {
    if (event.target.closest(".search-result")) closeSearch();
  });
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      searchModal.hidden ? openSearch() : closeSearch();
    } else if (event.key === "Escape" && !searchModal.hidden) {
      closeSearch();
    }
  });
}

function initNavigation() {
  menuButton.addEventListener("click", () => {
    const open = document.body.classList.toggle("nav-open");
    menuButton.setAttribute("aria-expanded", String(open));
  });
  document.querySelector("[data-close-nav]").addEventListener("click", () => {
    document.body.classList.remove("nav-open");
    menuButton.setAttribute("aria-expanded", "false");
  });
  sidebarNav.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      document.body.classList.remove("nav-open");
      menuButton.setAttribute("aria-expanded", "false");
    }
  });
  window.addEventListener("hashchange", renderPage);
}

rebuildAudience();
rebuildSearch();
renderSidebar();
renderAudienceSwitch();
audienceSwitch.addEventListener("click", (event) => {
  const button = event.target.closest(".audience-pill");
  if (button) setAudience(button.dataset.audience);
});
initTheme();
initSearch();
initNavigation();
if (!location.hash) history.replaceState(null, "", `#/${defaultSlug}`);
renderPage();
}
