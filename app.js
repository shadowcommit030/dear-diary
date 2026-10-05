/* ========== SUPABASE SETTINGS (paste your own two values) ========== */
const SUPABASE_URL = "PASTE_YOUR_SUPABASE_URL_HERE";
const SUPABASE_KEY = "PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY_HERE";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = (id) => document.getElementById(id);

let currentId = null;
let entries = [];

/* ========== HELPERS ========== */
function today() {
  // local date (toISOString alone would give the UTC date)
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function esc(v) {
  return String(v)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function show(screen) {
  $("loginScreen").classList.toggle("hidden", screen !== "login");
  $("diaryScreen").classList.toggle("hidden", screen !== "diary");
}

function setMsg(text) { $("saveMessage").textContent = text; }

/* ========== LOGIN / LOCK ========== */
$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("loginMessage").textContent = "";
  const { error } = await db.auth.signInWithPassword({
    email: $("email").value.trim(),
    password: $("password").value,
  });
  if (error) {
    $("loginMessage").textContent = "Login failed: " + error.message;
    return;
  }
  $("password").value = "";
  show("diary");
  loadEntries();
});

$("lockBtn").addEventListener("click", async () => {
  await db.auth.signOut();
  entries = [];
  currentId = null;
  $("entryList").innerHTML = "";
  $("search").value = "";
  clearEditor();
  show("login");
});

/* ========== LOAD / LIST ========== */
async function loadEntries(selectId) {
  const { data, error } = await db
    .from("diary_entries")
    .select("*")
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    setMsg("Could not load entries: " + error.message);
    return;
  }

  entries = data || [];
  const pick = selectId ? entries.find((x) => x.id === selectId) : entries[0];
  if (pick) openEntry(pick);
  else newEntry();
}

function renderList() {
  const q = $("search").value.toLowerCase().trim();
  const shown = entries.filter(
    (x) => !q || [x.title, x.content, x.mood].some((v) => (v || "").toLowerCase().includes(q))
  );

  const list = $("entryList");
  list.innerHTML = "";
  shown.forEach((x) => {
    const div = document.createElement("div");
    div.className = "entry-item" + (x.id === currentId ? " active" : "");
    div.innerHTML =
      `<strong>${esc(x.title || "Untitled Entry")}</strong>` +
      `<div class="entry-date">${esc(x.entry_date)}${x.mood ? " · " + esc(x.mood) : ""}</div>`;
    div.onclick = () => openEntry(x);
    list.appendChild(div);
  });
}

$("search").addEventListener("input", renderList);

/* ========== EDITOR ========== */
function clearEditor() {
  $("entryTitle").value = "";
  $("entryDate").value = today();
  $("mood").value = "";
  $("entryContent").value = "";
  setMsg("");
}

function newEntry() {
  currentId = null;
  clearEditor();
  renderList();
  updatePager();
  $("sidebar").classList.remove("open");
}

/* ========== FLIP BETWEEN PAGES ========== */
function currentIndex() {
  return entries.findIndex((x) => x.id === currentId);
}

function updatePager() {
  const i = currentIndex();
  $("pageNum").textContent = i >= 0 ? `Page ${entries.length - i} of ${entries.length}` : "New page";
  $("prevBtn").disabled = entries.length === 0 || i === entries.length - 1;
  $("nextBtn").disabled = i <= 0;
}

$("prevBtn").addEventListener("click", () => {
  const i = currentIndex();
  const target = entries[i < 0 ? 0 : i + 1];
  if (target) openEntry(target);
});

$("nextBtn").addEventListener("click", () => {
  const i = currentIndex();
  if (i > 0) openEntry(entries[i - 1]);
});

$("menuBtn").addEventListener("click", () => $("sidebar").classList.toggle("open"));

function openEntry(x) {
  currentId = x.id;
  $("entryTitle").value = x.title || "";
  $("entryDate").value = x.entry_date;
  $("mood").value = x.mood || "";
  $("entryContent").value = x.content || "";
  setMsg("");
  renderList();
  updatePager();
  $("sidebar").classList.remove("open");
}

/* ========== SAVE / DELETE ========== */
async function saveEntry() {
  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    alert("Please log in again.");
    show("login");
    return;
  }
  if (!$("entryDate").value) {
    alert("Please choose a date.");
    return;
  }

  const row = {
    title: $("entryTitle").value.trim(),
    content: $("entryContent").value,
    mood: $("mood").value,
    entry_date: $("entryDate").value,
    updated_at: new Date().toISOString(),
  };

  const res = currentId
    ? await db.from("diary_entries").update(row).eq("id", currentId).select().single()
    : await db.from("diary_entries").insert({ ...row, user_id: user.id }).select().single();

  if (res.error) {
    console.error(res.error);
    alert("Could not save entry: " + res.error.message);
    return;
  }

  await loadEntries(res.data.id);
  setMsg("✓ Saved privately");
}

async function deleteEntry() {
  if (!currentId) return;
  if (!confirm("Delete this diary entry permanently?")) return;

  const { error } = await db.from("diary_entries").delete().eq("id", currentId);
  if (error) {
    alert("Could not delete entry: " + error.message);
    return;
  }
  await loadEntries();
}

$("newBtn").addEventListener("click", newEntry);
$("saveBtn").addEventListener("click", saveEntry);
$("deleteBtn").addEventListener("click", deleteEntry);

/* ========== START: stay logged in if a session exists ========== */
(async () => {
  const { data: { session } } = await db.auth.getSession();
  if (session) {
    show("diary");
    loadEntries();
  } else {
    show("login");
  }
})();
