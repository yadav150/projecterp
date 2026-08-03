// UI components: toast, modal, confirm dialog, spinner, empty state, table renderer
import { el, ICON, paginate, sortBy, textIncludes, $, $$ } from "./utils.js";

// ---------- Toast ----------
export function toast({ title = "", message = "", type = "info", duration = 3500 } = {}) {
  const root = document.getElementById("toast-root");
  const icon = type === "success" ? ICON.check : type === "error" ? ICON.warn : ICON.check;
  const t = el("div", { class: `toast ${type}`, "data-testid": `toast-${type}` }, [
    el("div", { html: icon }),
    el("div", { class: "t-body", style: "flex:1" }, [
      el("div", { class: "t-title", text: title }),
      message ? el("div", { class: "t-msg", text: message }) : null
    ])
  ]);
  root.appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity 0.2s"; }, duration - 200);
  setTimeout(() => t.remove(), duration);
}

// ---------- Modal ----------
export function openModal({ title = "", body, footer = null, size = "" } = {}) {
  const root = document.getElementById("modal-root");
  const backdrop = el("div", { class: "modal-backdrop" });
  const modal = el("div", { class: `modal ${size}`, "data-testid": "modal" });
  const head = el("div", { class: "modal-head" }, [
    el("div", { class: "modal-title", text: title }),
    el("button", { class: "modal-close", "data-testid": "modal-close", onclick: close, "aria-label": "Close" }, [
      el("span", { html: ICON.close })
    ])
  ]);
  const bodyWrap = el("div", { class: "modal-body" });
  if (typeof body === "string") bodyWrap.innerHTML = body;
  else if (body instanceof Node) bodyWrap.appendChild(body);
  modal.appendChild(head);
  modal.appendChild(bodyWrap);
  if (footer) {
    const foot = el("div", { class: "modal-foot" });
    if (Array.isArray(footer)) footer.forEach(n => foot.appendChild(n));
    else foot.appendChild(footer);
    modal.appendChild(foot);
  }
  backdrop.appendChild(modal);
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) close(); });
  root.appendChild(backdrop);
  function close() { backdrop.remove(); }
  return { close, modal, body: bodyWrap };
}

// ---------- Confirm Dialog ----------
export function confirmDialog({ title = "Are you sure?", message = "", confirmText = "Confirm", danger = true } = {}) {
  return new Promise((resolve) => {
    const body = el("div", { style: "text-align:center; padding:8px 4px 4px;" }, [
      el("div", { class: "confirm-icon", html: ICON.warn }),
      el("div", { style: "font-weight:700; font-size:15px; margin-bottom:6px;", text: title }),
      el("div", { style: "color:var(--muted); font-size:13.5px;", text: message })
    ]);
    const cancelBtn = el("button", { class: "btn btn-outline", "data-testid": "confirm-cancel", text: "Cancel" });
    const okBtn = el("button", { class: `btn ${danger ? "btn-danger" : "btn-primary"}`, "data-testid": "confirm-ok", text: confirmText });
    const m = openModal({ title: "", body, footer: [cancelBtn, okBtn] });
    cancelBtn.onclick = () => { m.close(); resolve(false); };
    okBtn.onclick = () => { m.close(); resolve(true); };
  });
}

// ---------- States ----------
export function emptyState({ title = "No data yet", sub = "Nothing to show here.", icon = ICON.inbox } = {}) {
  return el("div", { class: "state" }, [
    el("div", { html: icon }),
    el("div", { class: "state-title", text: title }),
    el("div", { class: "state-sub", text: sub })
  ]);
}
export function loadingState(msg = "Loading data…") {
  return el("div", { class: "state" }, [
    el("div", { class: "spinner" }),
    el("div", { class: "state-sub", text: msg })
  ]);
}
export function errorState(msg = "Something went wrong") {
  return el("div", { class: "state" }, [
    el("div", { html: ICON.warn }),
    el("div", { class: "state-title", text: "Error" }),
    el("div", { class: "state-sub", text: msg })
  ]);
}

// ---------- Breadcrumbs ----------
export function setCrumbs(items) {
  const c = document.getElementById("crumbs");
  c.innerHTML = "";
  items.forEach((it, i) => {
    const isLast = i === items.length - 1;
    const node = isLast
      ? el("span", { class: "crumb-current", text: it.label })
      : el("a", { href: it.href || "#", text: it.label });
    c.appendChild(node);
    if (!isLast) c.appendChild(el("span", { class: "sep", text: "›" }));
  });
}

// ---------- Data Table ----------
export function DataTable({
  columns,          // [{ key, label, sortable, render(row) }]
  rows,             // data array
  searchFields = [], // fields to search across
  pageSize = 10,
  emptyTitle = "No records",
  emptySub = "Records will appear here once added.",
  toolbar = null,
  testId = "data-table"
} = {}) {
  const state = { q: "", sortKey: null, sortDir: "asc", page: 1, pageSize };

  const wrap = el("div", { "data-testid": testId });

  // toolbar (search + filters)
  const bar = el("div", { class: "filter-bar" });
  const searchWrap = el("div", { class: "search-input" }, [
    el("span", { html: ICON.search }),
    el("input", { type: "text", placeholder: "Search records…", "data-testid": `${testId}-search` })
  ]);
  const input = searchWrap.querySelector("input");
  input.addEventListener("input", () => { state.q = input.value; state.page = 1; render(); });
  bar.appendChild(searchWrap);
  if (toolbar) {
    if (Array.isArray(toolbar)) toolbar.forEach(t => bar.appendChild(t));
    else bar.appendChild(toolbar);
  }
  wrap.appendChild(bar);

  const box = el("div", { class: "table-wrap" });
  wrap.appendChild(box);

  function render() {
    box.innerHTML = "";
    // filter
    let list = rows;
    if (state.q && searchFields.length) {
      list = list.filter(r => searchFields.some(f => textIncludes(getField(r, f), state.q)));
    }
    // sort
    if (state.sortKey) list = sortBy(list, state.sortKey, state.sortDir);
    // paginate
    const { rows: pageRows, page, totalPages, total, start, end } = paginate(list, state.page, state.pageSize);

    if (!list.length) {
      box.appendChild(emptyState({ title: emptyTitle, sub: emptySub }));
      return;
    }

    const scroll = el("div", { class: "table-scroll" });
    const table = el("table", { class: "data-table" });
    const thead = el("thead");
    const trh = el("tr");
    columns.forEach(c => {
      const th = el("th", { class: c.sortable ? "sortable" : "" });
      const active = state.sortKey === c.key;
      const inner = el("span", { class: `th-inner ${active ? "active" : ""}` }, [
        document.createTextNode(c.label),
        c.sortable ? el("span", { class: "sort-ind", html: active && state.sortDir === "desc" ? ICON.sortDn : ICON.sortUp }) : null
      ]);
      th.appendChild(inner);
      if (c.sortable) th.addEventListener("click", () => {
        if (state.sortKey === c.key) state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
        else { state.sortKey = c.key; state.sortDir = "asc"; }
        render();
      });
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    table.appendChild(thead);

    const tbody = el("tbody");
    pageRows.forEach(r => {
      const tr = el("tr");
      columns.forEach(c => {
        const td = el("td");
        const v = c.render ? c.render(r) : getField(r, c.key);
        if (v == null) td.textContent = "—";
        else if (v instanceof Node) td.appendChild(v);
        else td.innerHTML = String(v);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    scroll.appendChild(table);
    box.appendChild(scroll);

    // pagination
    const pag = el("div", { class: "pagination" });
    pag.appendChild(el("div", { text: `Showing ${start + 1}–${end} of ${total}` }));
    const ctrl = el("div", { class: "pagination-controls" });
    const prevBtn = el("button", { html: ICON.chevL, "data-testid": `${testId}-prev` });
    prevBtn.disabled = page <= 1;
    prevBtn.onclick = () => { state.page = page - 1; render(); };
    ctrl.appendChild(prevBtn);
    const maxBtn = 5;
    let s = Math.max(1, page - Math.floor(maxBtn / 2));
    let e = Math.min(totalPages, s + maxBtn - 1);
    s = Math.max(1, e - maxBtn + 1);
    for (let i = s; i <= e; i++) {
      const b = el("button", { text: String(i), class: i === page ? "active" : "" });
      b.onclick = () => { state.page = i; render(); };
      ctrl.appendChild(b);
    }
    const nextBtn = el("button", { html: ICON.chevR, "data-testid": `${testId}-next` });
    nextBtn.disabled = page >= totalPages;
    nextBtn.onclick = () => { state.page = page + 1; render(); };
    ctrl.appendChild(nextBtn);
    pag.appendChild(ctrl);
    box.appendChild(pag);
  }

  render();

  return {
    node: wrap,
    setRows(newRows) { rows = newRows; state.page = 1; render(); },
    rerender: render
  };
}

function getField(o, k) { return k.split(".").reduce((x, p) => x?.[p], o); }
