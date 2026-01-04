export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v);
  }
  for (const ch of children) {
    if (typeof ch === "string") node.appendChild(document.createTextNode(ch));
    else if (ch) node.appendChild(ch);
  }
  return node;
}

export function card({ title, subtitle, rightEl, onClick } = {}) {
  const c = el("div", { class: `card ${onClick ? "clickable" : ""}` }, [
    el("div", { style: "display:flex;gap:12px;align-items:flex-start" }, [
      el("div", { style: "flex:1" }, [
        el("div", { class: "cardTitle", text: title || "" }),
        subtitle ? el("div", { class: "cardSub", text: subtitle }) : null
      ]),
      rightEl || null
    ])
  ]);
  if (onClick) c.addEventListener("click", onClick);
  return c;
}

export function carouselRow(title, itemsEls = []) {
  return el("section", { class: "row" }, [
    el("div", { class: "rowTitle", text: title }),
    el("div", { class: "carousel" }, itemsEls.map((it) => el("div", { class: "snap" }, [it])))
  ]);
}

export function setActiveNav() {
  const h = window.location.hash || "#/";
  const path = h.replace(/^#/, "");
  const links = document.querySelectorAll("a.navLink, a.bottomBtn");
  links.forEach((a) => {
    const href = a.getAttribute("href") || "";
    const active = href === `#${path}` || (path === "/" && href === "#/");
    a.classList.toggle("active", active);
  });
}