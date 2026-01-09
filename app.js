// Notes App Script (clean + $ warning pulse + new note pop + auto-scroll)

/* ========= DOM ========= */
const els = {
  grid: document.getElementById("notesGrid"),
  search: document.getElementById("search"),
  showForm: document.getElementById("showForm"),
  form: document.getElementById("noteForm"),
  title: document.getElementById("noteTitle"),
  cc: document.getElementById("noteCC"),
  content: document.getElementById("noteContent"),
  datalist: document.getElementById("presetTitles"),
};

/* ========= Storage ========= */
const STORAGE_KEY = "notes_v1";
let notes = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

// IDs to animate once (new note pop + scroll)
let flashNewNoteIds = new Set();

/* ========= Presets ========= */
const PRESETS = [
  { title: "Internet Down", color: "#ffe5e5", cls: "p-internet-down" },
  { title: "Internet Quality", color: "#fff2e5", cls: "p-internet-quality" },
  { title: "Wifi", color: "#fffde5", cls: "p-wifi" },
  { title: "TV Down", color: "#f0e5ff", cls: "p-tv-down" },
  { title: "TV Quality", color: "#f5e5d6", cls: "p-tv-quality" },
  { title: "Orange TV Plus App", color: "#e5ffe5", cls: "p-orange-tv-plus-app" },
  { title: "Repair", color: "#e5f0ff", cls: "p-repair" },
  { title: "Ingress", color: "#e5e5e5", cls: "p-ingress" },
  { title: "Drop quotation", color: "#f9f9f9", cls: "p-drop-quotation-marks" },
];

const COLOR_MAP = Object.fromEntries(PRESETS.map((p) => [p.title.toLowerCase(), p.color]));
const CLASS_MAP = Object.fromEntries(PRESETS.map((p) => [p.title.toLowerCase(), p.cls]));

const colorFor = (title = "") => COLOR_MAP[title.toLowerCase()] || "#f9f9f9";
const pastelClassFor = (title = "") => CLASS_MAP[title.toLowerCase()] || "";

/* ========= Utils ========= */
function saveNotes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function autoCapitalize(text) {
  return (text || "").replace(/(^\s*\w|[.!?]\s*\w)/g, (m) => m.toUpperCase());
}

function ensureCreatedDate(note) {
  if (!note.created) note.created = new Date().toLocaleString();
}

function htmlFromRaw(raw) {
  return (raw || "")
    .split("\n")
    .map((line) => `<p>${line}</p>`)
    .join("");
}

// Detect "$" in content (raw or html)
function hasDollarSign(note) {
  const t = `${note.rawContent || ""} ${note.content || ""}`;
  return t.includes("$");
}

function scrollIntoViewSmooth(el) {
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ========= Seed presets if empty ========= */
if (notes.length === 0) {
  notes = PRESETS.map((p, i) => ({
    id: Date.now() + i,
    title: p.title,
    cc: "",
    rawContent: "",
    content: "",
    color: p.color,
    cls: p.cls,
    created: new Date().toLocaleString(),
  }));
  saveNotes();
}

/* ========= Clipboard + Toast ========= */
function copyToClipboard(text) {
  if (!text) return;

  const done = () => showToast("Copied!");

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => {
      fallbackCopy(text);
      done();
    });
  } else {
    fallbackCopy(text);
    done();
  }
}

function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } catch (err) {
    console.error("Fallback copy failed", err);
  }
  ta.remove();
}

function showToast(msgText) {
  const msg = document.createElement("div");
  msg.textContent = msgText;
  Object.assign(msg.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    background: "#238636",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: "10px",
    boxShadow: "0 4px 12px rgba(0,0,0,.3)",
    zIndex: 9999,
    fontSize: "14px",
    transition: "opacity .3s ease",
  });
  document.body.appendChild(msg);

  requestAnimationFrame(() => {
    setTimeout(() => (msg.style.opacity = "0"), 800);
    setTimeout(() => msg.remove(), 1200);
  });
}

/* ========= UI Helpers ========= */
function makeButton(icon, title, handler) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "iconbtn";
  btn.title = title;
  btn.textContent = icon;
  btn.addEventListener("click", handler);
  return btn;
}

/* ========= Render ========= */
function renderNotes(filter = "") {
  if (!els.grid) return;

  els.grid.innerHTML = "";
  const q = (filter || "").trim().toLowerCase();

  const visibleNotes = notes.filter((n) => {
    if (!q) return true;
    return (
      (n.title || "").toLowerCase().includes(q) ||
      (n.rawContent || "").toLowerCase().includes(q)
    );
  });

  visibleNotes.forEach((note) => {
    ensureCreatedDate(note);

    const card = document.createElement("article");
    card.className = `card ${note.cls || pastelClassFor(note.title)}`;
    card.style.setProperty("--pastel", (note.color || colorFor(note.title)) + "99");

    // pop-in + auto-scroll for newly created notes (once)
    if (flashNewNoteIds.has(String(note.id))) {
      card.classList.add("is-new");
      requestAnimationFrame(() => scrollIntoViewSmooth(card));
      setTimeout(() => flashNewNoteIds.delete(String(note.id)), 700);
    }

    // pulse warning if "$" detected
    if (hasDollarSign(note)) card.classList.add("has-dollar");

    const head = document.createElement("div");
    head.className = "head";

    const title = Object.assign(document.createElement("div"), {
      className: "title",
      textContent: `Case : ${note.title}`,
      spellcheck: false,
    });

    const actions = document.createElement("div");
    actions.className = "actions";

    const copyBtn = makeButton("📋", "Copy note", () => {
      const textToCopy = `Case : ${note.title}\nCC: ${note.cc || "-"}\n\n${note.rawContent || ""}`;
      copyToClipboard(textToCopy);
    });

    const dupBtn = makeButton("📄", "Duplicate", () => duplicateNote(note.id));
    const delBtn = makeButton("🗑️", "Delete", () => {
      if (!confirm("Delete this note?")) return;
      notes = notes.filter((n) => n.id !== note.id);
      saveNotes();
      renderNotes(els.search ? els.search.value : "");
    });

    actions.append(copyBtn, dupBtn, delBtn);
    head.append(title, actions);

    const content = Object.assign(document.createElement("textarea"), {
      className: "content",
      spellcheck: false,
      value: note.rawContent || "",
    });

    // live save + live "$" warning
    content.addEventListener("input", () => {
      note.rawContent = autoCapitalize(content.value);
      note.content = htmlFromRaw(note.rawContent);

      // toggle warning class live
      if (hasDollarSign(note)) card.classList.add("has-dollar");
      else card.classList.remove("has-dollar");

      saveNotes();
    });

    const meta = document.createElement("div");
    meta.className = "meta";

    const ccDiv = document.createElement("div");
    ccDiv.className = "cc";

    const ccLabel = Object.assign(document.createElement("span"), {
      className: "muted",
      textContent: "CC:",
    });

    const ccVal = Object.assign(document.createElement("span"), {
      contentEditable: true,
      textContent: note.cc || "",
    });

    ccVal.addEventListener("input", () => {
      note.cc = (ccVal.textContent || "").trim();
      saveNotes();
    });

    const dateSpan = Object.assign(document.createElement("span"), {
      className: "muted",
      textContent: note.created,
    });

    ccDiv.append(ccLabel, ccVal);
    meta.append(ccDiv, dateSpan);

    card.append(head, content, meta);
    els.grid.appendChild(card);
  });
}

/* ========= Actions ========= */
function duplicateNote(id) {
  const orig = notes.find((n) => n.id === id);
  if (!orig) return;

  const copy = {
    ...orig,
    id: Date.now(),
    created: new Date().toLocaleString(),
  };

  notes.unshift(copy);
  flashNewNoteIds.add(String(copy.id));

  saveNotes();
  renderNotes(els.search ? els.search.value : "");
}

/* ========= Form toggle ========= */
if (els.showForm && els.form) {
  els.showForm.addEventListener("click", () => {
    const visible = els.form.style.display === "flex";
    els.form.style.display = visible ? "none" : "flex";
    if (!visible && els.title) els.title.focus();
  });
}

/* ========= Form submit (save + auto-copy) ========= */
if (els.form) {
  els.form.addEventListener("submit", (e) => {
    e.preventDefault();

    const title = ((els.title && els.title.value) || "").trim();
    if (!title) return;

    const raw = autoCapitalize((els.content && els.content.value) || "");

    const noteObj = {
      id: Date.now(),
      title,
      cc: ((els.cc && els.cc.value) || "").trim(),
      rawContent: raw,
      content: htmlFromRaw(raw),
      color: colorFor(title),
      cls: pastelClassFor(title),
      created: new Date().toLocaleString(),
    };

    notes.unshift(noteObj);
    flashNewNoteIds.add(String(noteObj.id));

    // Auto-copy newly created note
    copyToClipboard(`Case : ${title}\nCC: ${noteObj.cc || "-"}\n\n${raw}`);

    saveNotes();
    renderNotes(els.search ? els.search.value : "");

    els.form.reset();
    els.form.style.display = "none";
  });
}

/* ========= Search ========= */
if (els.search) {
  els.search.addEventListener("input", (e) => renderNotes(e.target.value));
}

/* ========= Datalist ========= */
if (els.datalist) {
  PRESETS.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.title;
    els.datalist.appendChild(opt);
  });
}

/* ========= Export / Import ========= */
function exportNotes() {
  try {
    const data = JSON.stringify(notes, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "notes_export.json";
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    alert("Export failed: " + (err && err.message));
  }
}

function importNotes(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) {
        alert("Invalid JSON format (expected array of notes).");
        return;
      }

      notes = imported.map((n) => ({
        id: n.id || Date.now() + Math.floor(Math.random() * 10000),
        title: n.title || "Untitled",
        cc: n.cc || "",
        rawContent: n.rawContent || n.content || "",
        content:
          n.content ||
          (n.rawContent ? htmlFromRaw(n.rawContent) : ""),
        color: n.color || colorFor(n.title || ""),
        cls: n.cls || pastelClassFor(n.title || ""),
        created: n.created || new Date().toLocaleString(),
      }));

      // animate imported notes once
      flashNewNoteIds = new Set(notes.map((n) => String(n.id)));

      saveNotes();
      renderNotes(els.search ? els.search.value : "");
      alert("Notes imported successfully!");
    } catch (err) {
      console.error(err);
      alert("Error reading JSON file.");
    }
  };

  reader.readAsText(file);
}

(function wireImportExport() {
  const exportBtn = document.getElementById("exportBtn");
  const importBtn = document.getElementById("importBtn");
  const importFile = document.getElementById("importFile");

  if (exportBtn) exportBtn.addEventListener("click", exportNotes);

  if (importBtn && importFile) {
    importBtn.addEventListener("click", () => importFile.click());
    importFile.addEventListener("change", (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) importNotes(f);
      importFile.value = "";
    });
  }
})();

/* ========= Expose (optional) ========= */
window.exportNotes = exportNotes;
window.importNotes = importNotes;

/* ========= Init ========= */
renderNotes();
