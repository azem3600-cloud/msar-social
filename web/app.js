"use strict";
const C = window.MSAR_SOCIAL;
const sb = supabase.createClient(C.url, C.anon);
const $ = (s) => document.querySelector(s);
const PL = { instagram: "إنستغرام", tiktok: "تيك توك", linkedin: "لينكدإن", x: "إكس", threads: "Threads", facebook: "فيسبوك", youtube: "يوتيوب" };
const ST = { scheduled: "مجدول", publishing: "ينشر الآن", published: "منشور", needs_manual: "ينتظر نشر يدوي", failed: "فشل", cancelled: "ملغي" };
const API_NOTES = {
  x: "Bearer token بصلاحية tweet.write (API مدفوع)", linkedin: "Access token + author_urn (urn:li:person:…)",
  threads: "Threads access token + user_id", facebook: "Page access token + page_id",
  instagram: "Page access token + ig_user_id + page_id (الصور فقط)", tiktok: "غير مدعوم بعد (فيديو): نشر يدوي", youtube: "غير مدعوم بعد (فيديو): نشر يدوي",
};
let tab = "sched";

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v; else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else if (v !== undefined && v !== null) e.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
}
const fmt = (d) => new Date(d).toLocaleString("ar-SA", { timeZone: "Asia/Riyadh", dateStyle: "medium", timeStyle: "short" });
const dayKey = (d) => new Date(d).toLocaleDateString("ar-SA", { timeZone: "Asia/Riyadh", weekday: "long", day: "numeric", month: "long" });

async function boot() {
  const { data } = await sb.auth.getSession();
  if (data.session) { $("#login").hidden = true; $("#app").hidden = false; render(); } else { $("#login").hidden = false; $("#app").hidden = true; }
}
$("#go").onclick = async () => {
  const { error } = await sb.auth.signInWithPassword({ email: $("#em").value.trim(), password: $("#pw").value });
  if (error) $("#lerr").textContent = "فشل الدخول: " + error.message; else boot();
};
$("#out").onclick = async () => { await sb.auth.signOut(); boot(); };
$("#tabs").onclick = (e) => {
  const b = e.target.closest("button[data-t]"); if (!b) return;
  tab = b.dataset.t; document.querySelectorAll("#tabs button").forEach((x) => x.classList.toggle("on", x === b)); render();
};

async function render() {
  const v = $("#view"); v.replaceChildren();
  refreshUnread();
  if (tab === "sched") return viewSched(v);
  if (tab === "new") return viewNew(v);
  if (tab === "inbox") return viewInbox(v);
  return viewAccts(v);
}

async function refreshUnread() {
  const { count } = await sb.from("inbox").select("id", { count: "exact", head: true }).eq("direction", "in").eq("is_read", false);
  $("#unread").textContent = count ? `(${count})` : "";
}

async function viewSched(v) {
  v.append(el("p", { class: "muted" }, "كل المنشورات المجدولة والمنشورة على كل المنصات (بتوقيت الرياض)."));
  const { data, error } = await sb.from("posts").select("id,title,body_ar,scheduled_at,post_targets(id,platform,status,external_url,error)").order("scheduled_at", { ascending: true });
  if (error) return v.append(el("p", {}, "خطأ: " + error.message));
  if (!data.length) return v.append(el("p", {}, "ما فيه منشورات بعد. أضف أول منشور من تبويب «منشور جديد»."));
  let last = "";
  for (const p of data) {
    const k = dayKey(p.scheduled_at);
    if (k !== last) { v.append(el("div", { class: "day" }, k)); last = k; }
    const tg = el("div", { class: "row" });
    for (const t of p.post_targets) {
      const tag = el("span", { class: "tag " + t.status, title: t.error || "" }, `${PL[t.platform]}: ${ST[t.status]}`);
      tg.append(t.external_url ? el("a", { href: t.external_url, target: "_blank", rel: "noopener" }, tag) : tag);
      if (t.status === "needs_manual") tg.append(el("button", { class: "s", onclick: async () => { await sb.from("post_targets").update({ status: "published", published_at: new Date().toISOString() }).eq("id", t.id); render(); } }, "تم النشر يدوياً"));
    }
    v.append(el("div", { class: "card" }, el("b", {}, p.title), el("div", { class: "muted" }, fmt(p.scheduled_at)), el("div", {}, p.body_ar.slice(0, 160) + (p.body_ar.length > 160 ? "…" : "")), tg,
      el("button", { class: "s", onclick: async () => { if (confirm("حذف المنشور؟")) { await sb.from("posts").delete().eq("id", p.id); render(); } } }, "حذف")));
  }
}

function viewNew(v) {
  const f = el("div", { class: "card" });
  const plats = el("div", { class: "plats" }, Object.entries(PL).map(([k, n]) => el("label", {}, el("input", { type: "checkbox", value: k }), n)));
  const now = new Date(Date.now() + 3600e3); now.setMinutes(0, 0, 0);
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  f.append(
    el("label", {}, "عنوان داخلي"), el("input", { id: "n_title" }),
    el("label", {}, "النص (عربي)"), el("textarea", { id: "n_ar" }),
    el("label", {}, "النص (إنجليزي، اختياري)"), el("textarea", { id: "n_en" }),
    el("label", {}, "رابط (اختياري)"), el("input", { id: "n_link", value: "https://msarpro.com" }),
    el("label", {}, "رابط صورة (لإنستغرام)"), el("input", { id: "n_media", placeholder: "https://…" }),
    el("label", {}, "وقت النشر (حسب توقيت جهازك)"), el("input", { id: "n_when", type: "datetime-local", value: local }),
    el("label", {}, "المنصات"), plats,
    el("p", {}, el("button", { class: "p", onclick: savePost }, "جدولة")), el("p", { class: "muted", id: "n_msg" }),
  );
  v.append(f);
}
async function savePost() {
  const targets = [...document.querySelectorAll(".plats input:checked")].map((i) => i.value);
  const title = $("#n_title").value.trim(), ar = $("#n_ar").value.trim(), when = $("#n_when").value;
  if (!title || !ar || !when || !targets.length) return ($("#n_msg").textContent = "عبّ العنوان والنص والوقت واختر منصة.");
  const { data, error } = await sb.from("posts").insert({ title, body_ar: ar, body_en: $("#n_en").value.trim() || null, link_url: $("#n_link").value.trim() || null, media_url: $("#n_media").value.trim() || null, scheduled_at: new Date(when).toISOString() }).select("id").single();
  if (error) return ($("#n_msg").textContent = error.message);
  const r = await sb.from("post_targets").insert(targets.map((platform) => ({ post_id: data.id, platform })));
  if (r.error) return ($("#n_msg").textContent = r.error.message);
  tab = "sched"; document.querySelectorAll("#tabs button").forEach((x) => x.classList.toggle("on", x.dataset.t === "sched")); render();
}

async function viewInbox(v) {
  v.append(el("div", { class: "row" }, el("button", { class: "s", onclick: async () => { await call("inbox"); render(); } }, "تحديث الرسائل"),
    el("span", { class: "muted" }, "فيسبوك وإنستغرام فقط يدعمون الرسائل عبر API. باقي المنصات سجّل ردك يدوياً أو أدخل لها مباشرة.")));
  const { data, error } = await sb.from("inbox").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) return v.append(el("p", {}, error.message));
  if (!data.length) return v.append(el("p", {}, "ما فيه رسائل."));
  const threads = {};
  for (const m of data) (threads[m.platform + "|" + m.thread_id] ||= []).push(m);
  for (const list of Object.values(threads)) {
    list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const inc = list.filter((m) => m.direction === "in").pop();
    const box = el("div", { class: "card" }, el("b", {}, `${PL[list[0].platform]} — ${inc?.sender || "؟"}`));
    for (const m of list) box.append(el("div", { class: "msg " + m.direction }, m.body, m.status === "failed" ? el("div", { class: "muted" }, "فشل الإرسال: " + (m.error || "")) : null));
    const ta = el("textarea", { placeholder: "اكتب ردك…", style: "min-height:60px" });
    box.append(ta, el("button", { class: "p", onclick: async () => {
      if (!ta.value.trim() || !inc) return;
      await sb.from("inbox").insert({ platform: inc.platform, thread_id: inc.thread_id, sender: "مسار", recipient_id: inc.recipient_id, body: ta.value.trim(), direction: "out", status: "pending_send", is_read: true });
      await sb.from("inbox").update({ is_read: true }).eq("platform", inc.platform).eq("thread_id", inc.thread_id);
      await call("inbox"); render();
    } }, "إرسال الرد"));
    v.append(box);
    sb.from("inbox").update({ is_read: true }).eq("platform", list[0].platform).eq("thread_id", list[0].thread_id).eq("direction", "in").then(() => {});
  }
}

async function viewAccts(v) {
  const { data } = await sb.from("accounts").select("*").order("platform");
  v.append(el("p", { class: "muted" }, "اربط المنصة بـ API لينشر التطبيق تلقائياً. غير المربوطة تظهر لك «ينتظر نشر يدوي». التوكن يُحفظ في جدول سري لا يقرأه المتصفح."));
  for (const a of data) {
    const tok = el("input", { type: "password", placeholder: "Access token", autocomplete: "off" });
    const ex = el("input", { placeholder: 'extra JSON مثل {"page_id":"123"}', dir: "ltr" });
    v.append(el("div", { class: "card" }, el("b", {}, PL[a.platform] + (a.handle ? " — " + a.handle : "")), " ", el("span", { class: "tag" }, a.status + " (" + (a.mode === "api" ? "API" : "يدوي") + ")"),
      el("div", { class: "muted" }, API_NOTES[a.platform]), tok, ex,
      el("button", { class: "s", onclick: async () => {
        let extra = {}; try { extra = ex.value ? JSON.parse(ex.value) : {}; } catch { return alert("JSON غير صحيح"); }
        const { error } = await sb.rpc("save_secret", { p_platform: a.platform, p_token: tok.value, p_extra: extra });
        if (error) alert(error.message); else { tok.value = ""; render(); }
      } }, "حفظ الربط"),
      a.mode === "api" ? el("button", { class: "s", onclick: async () => { await sb.from("accounts").update({ mode: "manual", status: "غير مربوط" }).eq("platform", a.platform); render(); } }, "فصل") : null));
  }
}

async function call(fn) {
  const { data } = await sb.auth.getSession();
  try { await fetch(`${C.functionsUrl}/${fn}`, { method: "POST", headers: { Authorization: `Bearer ${data.session.access_token}`, apikey: C.anon } }); } catch (e) { console.warn(e); }
}

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
sb.auth.onAuthStateChange(() => {});
boot();
