// ============================================================
//  Supabase bağlantısı
// ============================================================
const SUPABASE_URL = "https://ywbbozrsdidburulqygn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3YmJvenJzZGlkYnVydWxxeWduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NzI3ODcsImV4cCI6MjA5NjA0ODc4N30.uCM_VTaxciHhayLuq7fE-HgX4xKMD8sglFLiuKxQzSA";

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================
//  Ekran elemanları
// ============================================================
const loadingEl = document.getElementById("loading");
const authView = document.getElementById("auth-view");
const appView = document.getElementById("app-view");

// Auth ekranı
const tabs = document.querySelectorAll(".tab");
const authForm = document.getElementById("auth-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const authSubmit = document.getElementById("auth-submit");
const authMessage = document.getElementById("auth-message");

// Uygulama ekranı
const userEmailEl = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");
const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const list = document.getElementById("todo-list");
const countEl = document.getElementById("count");
const clearDoneBtn = document.getElementById("clear-done");
const filterBtns = document.querySelectorAll(".filter");

let mode = "login"; // "login" | "signup"
let todos = [];
let currentFilter = "all";

// ============================================================
//  KİMLİK DOĞRULAMA (AUTH)
// ============================================================

// Sekme değiştir (Giriş <-> Kayıt)
tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    mode = tab.dataset.tab;
    authSubmit.textContent = mode === "login" ? "Giriş Yap" : "Kayıt Ol";
    passwordInput.autocomplete = mode === "login" ? "current-password" : "new-password";
    showMessage("");
  });
});

function showMessage(text, type = "info") {
  authMessage.textContent = text;
  authMessage.className = "message " + type;
}

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  authSubmit.disabled = true;

  if (mode === "signup") {
    const { error } = await db.auth.signUp({ email, password });
    if (error) {
      showMessage("Kayıt başarısız: " + error.message, "error");
    } else {
      showMessage(
        "📧 " + email + " adresine bir doğrulama e-postası gönderdik. " +
        "E-postandaki bağlantıya tıkla — hesabın onaylanınca otomatik giriş yapacaksın.",
        "success"
      );
    }
  } else {
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = error.message.includes("Email not confirmed")
        ? "E-postan henüz doğrulanmamış. Gelen kutundaki bağlantıya tıkla."
        : "Giriş başarısız: " + error.message;
      showMessage(msg, "error");
    }
    // Başarılıysa onAuthStateChange tetiklenip uygulamayı açar.
  }
  authSubmit.disabled = false;
});

logoutBtn.addEventListener("click", async () => {
  await db.auth.signOut();
});

// Oturum durumu değişince ekranı güncelle (giriş/çıkış/doğrulama dönüşü)
db.auth.onAuthStateChange((_event, session) => {
  updateView(session);
});

function updateView(session) {
  loadingEl.hidden = true;
  if (session && session.user) {
    authView.hidden = true;
    appView.hidden = false;
    userEmailEl.textContent = session.user.email;
    loadTodos();
  } else {
    appView.hidden = true;
    authView.hidden = false;
    todos = [];
  }
}

// ============================================================
//  GÖREVLER (her kullanıcı yalnızca kendininkini görür)
// ============================================================

async function loadTodos() {
  const { data, error } = await db
    .from("todos")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    alert("Görevler yüklenemedi: " + error.message);
    return;
  }
  todos = data;
  render();
}

async function addTodo(text) {
  // user_id veritabanında otomatik auth.uid() ile doluyor
  const { error } = await db.from("todos").insert({ text });
  if (error) return alert("Eklenemedi: " + error.message);
  await loadTodos();
}

async function toggleTodo(id, done) {
  const { error } = await db.from("todos").update({ done }).eq("id", id);
  if (error) return alert("Güncellenemedi: " + error.message);
  await loadTodos();
}

async function deleteTodo(id) {
  const { error } = await db.from("todos").delete().eq("id", id);
  if (error) return alert("Silinemedi: " + error.message);
  await loadTodos();
}

async function clearDone() {
  const { error } = await db.from("todos").delete().eq("done", true);
  if (error) return alert("Temizlenemedi: " + error.message);
  await loadTodos();
}

function getVisibleTodos() {
  if (currentFilter === "active") return todos.filter((t) => !t.done);
  if (currentFilter === "done") return todos.filter((t) => t.done);
  return todos;
}

function render() {
  list.innerHTML = "";
  const visible = getVisibleTodos();

  if (visible.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "Henüz görev yok 🎉";
    list.appendChild(li);
  }

  visible.forEach((todo) => {
    const li = document.createElement("li");
    li.className = "todo-item" + (todo.done ? " done" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.done;
    checkbox.addEventListener("change", () => toggleTodo(todo.id, checkbox.checked));

    const span = document.createElement("span");
    span.className = "text";
    span.textContent = todo.text;

    const del = document.createElement("button");
    del.className = "delete";
    del.textContent = "✕";
    del.title = "Sil";
    del.addEventListener("click", () => deleteTodo(todo.id));

    li.append(checkbox, span, del);
    list.appendChild(li);
  });

  const remaining = todos.filter((t) => !t.done).length;
  countEl.textContent = `${remaining} görev kaldı`;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  addTodo(text);
  input.value = "";
  input.focus();
});

clearDoneBtn.addEventListener("click", clearDone);

filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    render();
  });
});

// ============================================================
//  AÇILIŞ — mevcut oturumu kontrol et
// ============================================================
(async () => {
  const { data } = await db.auth.getSession();
  updateView(data.session);
})();
