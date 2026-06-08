import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { supabase } from "./lib/supabase";

// Uygulama ön plana gelince oturum yenilemeyi sürdür (Supabase önerisi)
AppState.addEventListener("change", (state) => {
  if (state === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

export default function App() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      {session ? <TodoScreen session={session} /> : <AuthScreen />}
    </SafeAreaView>
  );
}

// ============================================================
//  GİRİŞ / KAYIT EKRANI
// ============================================================
function AuthScreen() {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // {text, type}

  async function submit() {
    if (!email.trim() || password.length < 6) {
      setMessage({ text: "E-posta gir ve en az 6 karakter şifre kullan.", type: "error" });
      return;
    }
    setBusy(true);
    setMessage(null);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) {
        setMessage({ text: "Kayıt başarısız: " + error.message, type: "error" });
      } else {
        setMessage({
          text:
            "📧 " + email.trim() + " adresine doğrulama e-postası gönderdik. " +
            "E-postandaki bağlantıya tıkla, sonra buradan giriş yap.",
          type: "success",
        });
        setMode("login");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        const text = error.message.includes("Email not confirmed")
          ? "E-postan henüz doğrulanmamış. Gelen kutundaki bağlantıya tıkla."
          : "Giriş başarısız: " + error.message;
        setMessage({ text, type: "error" });
      }
      // Başarılıysa onAuthStateChange uygulamayı açar.
    }
    setBusy(false);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.center}
    >
      <View style={styles.card}>
        <Text style={styles.title}>📝 Yapılacaklar</Text>

        <View style={styles.tabs}>
          {["login", "signup"].map((m) => (
            <Pressable
              key={m}
              onPress={() => {
                setMode(m);
                setMessage(null);
              }}
              style={[styles.tab, mode === m && styles.tabActive]}
            >
              <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
                {m === "login" ? "Giriş Yap" : "Kayıt Ol"}
              </Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          style={styles.input}
          placeholder="E-posta adresin"
          placeholderTextColor="#999"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Şifre (en az 6 karakter)"
          placeholderTextColor="#999"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Pressable
          style={[styles.primaryBtn, busy && styles.btnDisabled]}
          onPress={submit}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>
              {mode === "login" ? "Giriş Yap" : "Kayıt Ol"}
            </Text>
          )}
        </Pressable>

        {message && (
          <Text
            style={[
              styles.message,
              message.type === "error" && styles.messageError,
              message.type === "success" && styles.messageSuccess,
            ]}
          >
            {message.text}
          </Text>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// ============================================================
//  GÖREV EKRANI
// ============================================================
function TodoScreen({ session }) {
  const [todos, setTodos] = useState([]);
  const [text, setText] = useState("");
  const [filter, setFilter] = useState("all"); // all | active | done

  useEffect(() => {
    loadTodos();
  }, []);

  async function loadTodos() {
    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .order("created_at", { ascending: true });
    if (!error) setTodos(data);
  }

  async function addTodo() {
    const t = text.trim();
    if (!t) return;
    setText("");
    const { error } = await supabase.from("todos").insert({ text: t });
    if (!error) loadTodos();
  }

  async function toggleTodo(id, done) {
    const { error } = await supabase.from("todos").update({ done }).eq("id", id);
    if (!error) loadTodos();
  }

  async function deleteTodo(id) {
    const { error } = await supabase.from("todos").delete().eq("id", id);
    if (!error) loadTodos();
  }

  async function clearDone() {
    const { error } = await supabase.from("todos").delete().eq("done", true);
    if (!error) loadTodos();
  }

  const visible = todos.filter((t) =>
    filter === "active" ? !t.done : filter === "done" ? t.done : true
  );
  const remaining = todos.filter((t) => !t.done).length;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, width: "100%", alignItems: "center" }}
    >
      <View style={[styles.card, { flex: 1, marginTop: 12 }]}>
        <View style={styles.topbar}>
          <Text style={styles.titleSmall}>📝 Yapılacaklar</Text>
          <View style={styles.userBox}>
            <Text style={styles.userEmail} numberOfLines={1}>
              {session.user.email}
            </Text>
            <Pressable style={styles.logoutBtn} onPress={() => supabase.auth.signOut()}>
              <Text style={styles.logoutText}>Çıkış</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Yeni görev ekle..."
            placeholderTextColor="#999"
            value={text}
            onChangeText={setText}
            onSubmitEditing={addTodo}
            returnKeyType="done"
          />
          <Pressable style={styles.addBtn} onPress={addTodo}>
            <Text style={styles.primaryBtnText}>Ekle</Text>
          </Pressable>
        </View>

        <View style={styles.tabs}>
          {[
            ["all", "Tümü"],
            ["active", "Aktif"],
            ["done", "Tamamlanan"],
          ].map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setFilter(key)}
              style={[styles.tab, filter === key && styles.tabActive]}
            >
              <Text style={[styles.tabText, filter === key && styles.tabTextActive]}>
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <FlatList
          style={{ flex: 1 }}
          data={visible}
          keyExtractor={(item) => String(item.id)}
          ListEmptyComponent={<Text style={styles.empty}>Henüz görev yok 🎉</Text>}
          renderItem={({ item }) => (
            <View style={styles.todoItem}>
              <Pressable
                style={[styles.checkbox, item.done && styles.checkboxOn]}
                onPress={() => toggleTodo(item.id, !item.done)}
              >
                {item.done && <Text style={styles.checkMark}>✓</Text>}
              </Pressable>
              <Text style={[styles.todoText, item.done && styles.todoTextDone]}>
                {item.text}
              </Text>
              <Pressable onPress={() => deleteTodo(item.id)} hitSlop={10}>
                <Text style={styles.delete}>✕</Text>
              </Pressable>
            </View>
          )}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>{remaining} görev kaldı</Text>
          <Pressable onPress={clearDone}>
            <Text style={styles.clearText}>Tamamlananları temizle</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ============================================================
//  STİLLER
// ============================================================
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#764ba2" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 16 },
  card: {
    backgroundColor: "#fff",
    width: "100%",
    maxWidth: 460,
    borderRadius: 16,
    padding: 22,
  },
  title: { fontSize: 26, fontWeight: "700", textAlign: "center", marginBottom: 20, color: "#333" },
  titleSmall: { fontSize: 20, fontWeight: "700", color: "#333" },

  tabs: { flexDirection: "row", gap: 8, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 8, backgroundColor: "#f2f2f5", alignItems: "center" },
  tabActive: { backgroundColor: "#764ba2" },
  tabText: { color: "#555", fontWeight: "600", fontSize: 13 },
  tabTextActive: { color: "#fff" },

  input: {
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
    color: "#333",
  },
  primaryBtn: {
    backgroundColor: "#764ba2",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  btnDisabled: { opacity: 0.6 },

  message: { marginTop: 16, fontSize: 14, lineHeight: 20, textAlign: "center", color: "#555" },
  messageError: { color: "#c0392b" },
  messageSuccess: {
    color: "#1e7e4f",
    backgroundColor: "#eafaf1",
    padding: 12,
    borderRadius: 10,
    overflow: "hidden",
  },

  topbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  userBox: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1, maxWidth: "55%" },
  userEmail: { color: "#999", fontSize: 12, flexShrink: 1 },
  logoutBtn: { backgroundColor: "#f2f2f5", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  logoutText: { color: "#764ba2", fontWeight: "600", fontSize: 13 },

  inputRow: { flexDirection: "row", gap: 8, marginBottom: 16, alignItems: "center" },
  addBtn: { backgroundColor: "#764ba2", paddingHorizontal: 18, paddingVertical: 13, borderRadius: 10, justifyContent: "center" },

  todoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#764ba2",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { backgroundColor: "#764ba2" },
  checkMark: { color: "#fff", fontSize: 14, fontWeight: "700" },
  todoText: { flex: 1, fontSize: 16, color: "#333" },
  todoTextDone: { textDecorationLine: "line-through", color: "#aaa" },
  delete: { color: "#d33", fontSize: 18, paddingHorizontal: 6 },

  empty: { textAlign: "center", color: "#bbb", paddingVertical: 24 },

  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 4,
  },
  footerText: { color: "#888", fontSize: 13 },
  clearText: { color: "#764ba2", fontSize: 13, textDecorationLine: "underline" },
});
