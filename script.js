// ============================================================
//  AYARLAR — Buraya kendi Supabase bilgilerini yapıştır!
//  (Aşağıda nereden alacağını anlatan adımlar var)
// ============================================================
const SUPABASE_URL = "https://ywbbozrsdidburulqygn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3YmJvenJzZGlkYnVydWxxeWduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0NzI3ODcsImV4cCI6MjA5NjA0ODc4N30.uCM_VTaxciHhayLuq7fE-HgX4xKMD8sglFLiuKxQzSA";

// Supabase'e bağlanıyoruz
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ============================================================

let todos = [];
let currentFilter = "all";

const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const list = document.getElementById("todo-list");
const countEl = document.getElementById("count");
const clearDoneBtn = document.getElementById("clear-done");
const filterBtns = document.querySelectorAll(".filter");

// Veritabanından tüm görevleri çek
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

// Yeni görev ekle
async function addTodo(text) {
  const { error } = await db.from("todos").insert({ text, done: false });
  if (error) {
    alert("Eklenemedi: " + error.message);
    return;
  }
  await loadTodos();
}

// Görevi tamamlandı/tamamlanmadı yap
async function toggleTodo(id, done) {
  const { error } = await db.from("todos").update({ done }).eq("id", id);
  if (error) {
    alert("Güncellenemedi: " + error.message);
    return;
  }
  await loadTodos();
}

// Görevi sil
async function deleteTodo(id) {
  const { error } = await db.from("todos").delete().eq("id", id);
  if (error) {
    alert("Silinemedi: " + error.message);
    return;
  }
  await loadTodos();
}

// Tamamlanan görevleri sil
async function clearDone() {
  const { error } = await db.from("todos").delete().eq("done", true);
  if (error) {
    alert("Temizlenemedi: " + error.message);
    return;
  }
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

// Sayfa açılınca görevleri yükle
loadTodos();
