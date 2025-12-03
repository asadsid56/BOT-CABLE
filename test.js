// Rewritten JS with auto-copy on save

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

let notes = JSON.parse(localStorage.getItem("notes_v1")) || [];

const PRESETS = [
  { title: "Internet Down", color: "#ffe5e5", cls: "p-internet-down" },
  { title: "Internet Quality", color: "#fff2e5", cls: "p-internet-quality" },
  { title: "Wifi", color: "#fffde5", cls: "p-wifi" },
  { title: "TV Down", color: "#f0e5ff", cls: "p-tv-down" },
  { title: "TV Quality", color: "#f5e5d6", cls: "p-tv-quality" },
  { title: "Orange TV Plus App", color: "#e5ffe5", cls: "p-orange-tv-plus-app" },
  { title: "Repair", color: "#e5f0ff", cls: "p-repair" },
  { title: "Ingress", color: "#e5e5e5", cls: "p-ingress" },
  { title: "Drop quotation", color: "#f9f9f9", cls: "p-drop-quotation-marks" }
];

const COLOR_MAP = Object.fromEntries(PRESETS.map(p => [p.title.toLowerCase(), p.color]));
const CLASS_MAP = Object.fromEntries(PRESETS.map(p => [p.title.toLowerCase(), p.cls]));

const saveNotes = () => localStorage.setItem("notes_v1", JSON.stringify(notes));

const colorFor = (title = "") => COLOR_MAP[title.toLowerCase()] || "#f9f9f9";
const pastelClassFor = (title = "") => CLASS_MAP[title.toLowerCase()] || "";

function autoCapitalize(text) {
  return text.replace(/(^\s*\w|[.!?]\s*\w)/g, m => m.toUpperCase());
}

function ensureCreatedDate(note) {
  if (!note.created) note.created = new Date().toLocaleString();
}

if (notes.length === 0) {
  notes = PRESETS.map((p, i) => ({
    id: Date.now() + i,
    title: p.title,
    cc: "",
    content: "",
    rawContent: "",
    color: p.color,
    cls: p.cls,
    created: new Date().toLocaleString()
  }));
  saveNotes();
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    const msg = document.createElement("div");
    msg.textContent = "Copied!";
    Object.assign(msg.style, {
      position: "fixed", bottom: "20px", right: "20px",
      background: "#238636", color: "#fff",
      padding: "8px 14px", borderRadius: "10px",
      boxShadow: "0 4px 12px rgba(0,0,0,.3)",
      zIndex: 9999, fontSize: "14px", transition: "opacity .3s ease"
    });
    document.body.appendChild(msg);
    setTimeout(() => (msg.style.opacity = "0"), 800);
    setTimeout(() => msg.remove(), 1200);
  });
}

function renderNotes(filter = "") {
  els.grid.innerHTML = "";
  const q = filter.trim().toLowerCase();

  notes
    .filter(n => !q || n.title.toLowerCase().includes(q) || (n.rawContent || "").toLowerCase().includes(q))
    .forEach(note => {
      ensureCreatedDate(note);

      const card = document.createElement("article");
      card.className = `card ${note.cls || pastelClassFor(note.title)}`;
      card.style.setProperty("--pastel", (note.color || colorFor(note.title)) + "99");

      const head = document.createElement("div");
      head.className = "head";

      const title = Object.assign(document.createElement("div"), {
        className: "title",
        textContent: `Case : ${note.title}`,
        spellcheck: false
      });

      const actions = document.createElement("div");
      actions.className = "actions";

      const copyBtn = makeButton("📋", "Copy note", () => {
        const textToCopy = `Case : ${note.title}\nCC: ${note.cc || "-"}\n\n${note.rawContent || ""}`;
        copyToClipboard(textToCopy);
      });

      const dup = makeButton("📄", "Duplicate", () => duplicateNote(note.id));

      const del = makeButton("🗑️", "Delete", () => {
        if (confirm("Delete this note?")) {
          notes = notes.filter(n => n.id !== note.id);
          saveNotes();
          renderNotes(q);
        }
      });

      actions.append(copyBtn, dup, del);
      head.append(title, actions);

      const content = Object.assign(document.createElement("textarea"), {
        className: "content",
        spellcheck: false,
        value: note.rawContent,
        oninput: () => {
          note.rawContent = autoCapitalize(content.value);
          note.content = note.rawContent
            .split("\n")
            .map(line => line === "" ? "<br>" : `<p>${line}</p>`)
            .join("");
          saveNotes();
        }
      });

      const meta = document.createElement("div");
      meta.className = "meta";

      const cc = document.createElement("div");
      cc.className = "cc";

      const ccLabel = Object.assign(document.createElement("span"), {
        className: "muted",
        textContent: "CC:"
      });

      const ccVal = Object.assign(document.createElement("span"), {
        contentEditable: true,
        textContent: note.cc,
        oninput: () => {
          note.cc = ccVal.textContent.trim();
          saveNotes();
        }
      });

      const dateSpan = Object.assign(document.createElement("span"), {
        className: "muted",
        textContent: note.created
      });

      cc.append(ccLabel, ccVal);
      meta.append(cc, dateSpan);

      card.append(head, content, meta);
      els.grid.appendChild(card);
    });
}

function makeButton(icon, title, handler) {
  const btn = document.createElement("button");
  btn.className = "iconbtn";
  btn.title = title;
  btn.textContent = icon;
  btn.onclick = handler;
  return btn;
}

function duplicateNote(id) {
  const orig = notes.find(n => n.id === id);
  if (!orig) return;

  const copy = {
    ...orig,
    id: Date.now(),
    created: new Date().toLocaleString()
  };

  notes.unshift(copy);
  saveNotes();
  renderNotes(els.search.value);
}

els.showForm.addEventListener("click", () => {
  const visible = els.form.style.display === "flex";
  els.form.style.display = visible ? "none" : "flex";
  if (!visible) els.title.focus();
});

els.form.addEventListener("submit", e => {
  e.preventDefault();
  const title = els.title.value.trim();
  if (!title) return;

  const raw = autoCapitalize(els.content.value);

  const htmlContent = raw
    .split("\n")
    .map(line => `<p>${line}</p>`)
    .join("");

  notes.unshift({
    id: Date.now(),
    title,
    cc: els.cc.value.trim(),
    rawContent: raw,
    content: htmlContent,
    color: colorFor(title),
    cls: pastelClassFor(title),
    created: new Date().toLocaleString()
  });

  copyToClipboard(`Case : ${title}\nCC: ${els.cc.value.trim() || "-"}\n\n${raw}`);

  saveNotes();
  renderNotes(els.search.value);
  els.form.reset();
  els.form.style.display = "none";
});

els.search.addEventListener("input", e => renderNotes(e.target.value));

PRESETS.forEach(p => {
  const opt = document.createElement("option");
  opt.value = p.title;
  els.datalist.appendChild(opt);
});

renderNotes();

/* ========= Export JSON ========= */
function exportNotes() {
  const data = JSON.stringify(notes, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "notes_export.json";
  a.click();
  URL.revokeObjectURL(url);
}

/* ========= Import JSON ========= */
function importNotes(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) return alert("Invalid JSON format");

      notes = imported;
      saveNotes();
      renderNotes();
      alert("Notes imported successfully!");
    } catch {
      alert("Error reading JSON file");
    }
  };
  reader.readAsText(file);
}

/* ========= Export/Import Triggers ========= */
window.exportNotes = exportNotes;
window.importNotes = importNotes;
