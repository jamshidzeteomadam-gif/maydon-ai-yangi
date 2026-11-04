// AI Maydon v3: suhbat, yaratish, o‘zgartirish, tuzatish. Provayderlar zanjiri.
const PROVIDERS = {
  gemini:     { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", key: "GEMINI_API_KEY",     models: ["gemini-3-flash-preview", "gemini-3.1-flash-lite", "gemini-flash-latest"] },
  groq:       { url: "https://api.groq.com/openai/v1/chat/completions",                          key: "GROQ_API_KEY",       models: ["openai/gpt-oss-120b", "openai/gpt-oss-20b"] },
  cerebras:   { url: "https://api.cerebras.ai/v1/chat/completions",                              key: "CEREBRAS_API_KEY",   models: ["gpt-oss-120b"] },
  mistral:    { url: "https://api.mistral.ai/v1/chat/completions",                               key: "MISTRAL_API_KEY",    models: ["mistral-small-latest", "open-mistral-nemo"] },
  openrouter: { url: "https://openrouter.ai/api/v1/chat/completions",                            key: "OPENROUTER_API_KEY", models: ["openrouter/free", "openai/gpt-oss-120b:free"] },
};
const ROLES = {
  chat:     ["groq", "gemini", "mistral", "openrouter", "cerebras"],
  generate: ["gemini", "mistral", "groq", "openrouter", "cerebras"],
  edit:     ["gemini", "mistral", "groq", "openrouter", "cerebras"],
  fix:      ["groq", "cerebras", "mistral", "gemini", "openrouter"],
};
const THREE = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
const RULES = "Faqat kodni qaytar, tushuntirishsiz, markdown belgilarisiz. Rasm kerak bo‘lsa SVG yoki CSS bilan o‘zing chiz (tashqi rasm havolasi ishlatma, mashhur o‘yin/film rasmlarini nusxalama, ilhomlangan original dizayn yoz). Tashqi kutubxona ishlatma; faqat 3D kerak bo‘lsa Three.js: <script src=\"" + THREE + "\"></script> (r128, OrbitControls va CapsuleGeometry yo‘q). O‘yin bo‘lsa menyu, ball, o‘yin tugashi va qayta boshlash bo‘lsin. Agar topshiriqda __RASM__ so‘zi bo‘lsa, bu foydalanuvchi yuklagan rasmning manzili: uni kodda aynan shunday, tirnoq ichida yoz (<img src='__RASM__'> yoki 3D'da new THREE.TextureLoader().load('__RASM__')), o‘zgartirma va o‘zing rasm manzili to‘qima.";
const SYSTEM = {
  chat: "Sen AI Maydon yordamchisisan, o‘zbek tilida do‘stona suhbatlash. Maqsad: foydalanuvchi bilan gaplashib loyihani aniqlash. Ma’lumot yetmasa, bitta-ikkita qisqa savol ber va o‘zing 3-4 ta variant taklif qil (masalan dizayn uslubi: futuristik, hikoyaviy, minimal, retro). Faqat foydalanuvchi aytganini takrorlama, o‘zing ham g‘oya ber. Biror narsa qanday ko‘rinishini bilish kerak bo‘lsa, 'search' ga qidiruv so‘zini inglizcha yoz. Yetarli bo‘lsa yoki foydalanuvchi 'tayyor' desa ready=true qil va 'brief' ga to‘liq texnik topshiriq yoz. Foydalanuvchi didi haqida yangi narsa bilsang, 'learn' ga bitta qisqa gap yoz. FAQAT JSON qaytar: {\"say\":\"\",\"options\":[],\"search\":\"\",\"ready\":false,\"brief\":\"\",\"learn\":\"\"}",
  generate: "Sen web dasturchisan. Topshiriq bo‘yicha BITTA to‘liq HTML fayl yoz (CSS va JS ichida). " + RULES,
  edit: "Sen web dasturchisan. Berilgan HTML loyihani so‘ralgan o‘zgarish bo‘yicha o‘zgartir, qolgan qismini saqla va TO‘LIQ faylni qaytar. " + RULES,
  fix: "Sen xato tuzatuvchisan. Kodda brauzer xatosi bor. Tuzat va TO‘LIQ HTML faylni qaytar. " + RULES,
};
const clean = (t) => t.replace(/^```[a-z]*\n?/i, "").replace(/```\s*$/, "").trim();
const parse = (t) => { try { return JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1)); } catch { return { say: t }; } };
const json = (status, body) => ({ statusCode: status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

async function callAI(role, system, messages, tried) {
  for (const name of ROLES[role]) {
    const p = PROVIDERS[name], key = process.env[p.key];
    if (!key) { tried.push(`${name}: kalit yo‘q`); continue; }
    const o = process.env[`MODEL_${name.toUpperCase()}`];
    for (const model of o ? [o, ...p.models] : p.models) {
      try {
        const r = await fetch(p.url, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({ model, messages: [{ role: "system", content: system }, ...messages], temperature: 0.5 }) });
        if (!r.ok) {
          tried.push(`${name}/${model}: ${r.status} ${(await r.text()).replace(/\s+/g, " ").slice(0, 80)}`);
          if ([401, 403, 429].includes(r.status)) break;
          continue;
        }
        const text = (await r.json()).choices?.[0]?.message?.content;
        if (text) return { text, provider: `${name}/${model}` };
        tried.push(`${name}/${model}: bo‘sh javob`);
      } catch (e) { tried.push(`${name}/${model}: ${e.message}`); break; }
    }
  }
  throw Object.assign(new Error("Hech bir AI javob bermadi."), { tried });
}

// Ochiq manba: Vikipediya (kalitsiz). Qidiruv so‘zi bo‘yicha qisqa ma’lumot.
async function research(q) {
  try {
    const api = "https://en.wikipedia.org/w/api.php?format=json&";
    const s = await (await fetch(api + "action=query&list=search&srlimit=1&srsearch=" + encodeURIComponent(q))).json();
    const t = s.query?.search?.[0]?.title; if (!t) return "";
    const e = await (await fetch(api + "action=query&prop=extracts&exintro=1&explaintext=1&titles=" + encodeURIComponent(t))).json();
    return t + ": " + Object.values(e.query.pages)[0].extract.slice(0, 1500);
  } catch { return ""; }
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Faqat POST." });
  let b; try { b = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Noto‘g‘ri so‘rov." }); }
  const need = process.env.AI_ACCESS_CODE;
  if (need && b.access !== need) return json(401, { error: "Kirish kodi noto‘g‘ri." });
  const tried = [];
  try {
    if (b.mode === "chat") {
      const msgs = (b.messages || []).filter(m => ["user", "assistant"].includes(m.role)).map(m => ({ role: m.role, content: String(m.content).slice(0, 2000) }));
      const notes = (b.notes || []).slice(-20).map(n => String(n).slice(0, 150));
      const sys = SYSTEM.chat + (notes.length ? "\nFoydalanuvchi haqida eslab qolingan: " + notes.join("; ") : "")
        + (b.hasCode ? "\nLoyiha allaqachon yaratilgan: o‘zgartirish so‘ralsa ready=true qil va brief’ga faqat o‘zgarishni yoz." : "")
        + (b.hasImage ? "\nFoydalanuvchi rasm yuklagan (sen uni ko‘rmaysan, faqat joylaysan): brief’da rasm manzili sifatida aynan __RASM__ so‘zini ishlatishni yoz." : "");
      let r = await callAI("chat", sys, msgs, tried), j = parse(r.text);
      if (j.search && !j.ready) {
        const info = await research(String(j.search).slice(0, 80));
        if (info) { r = await callAI("chat", sys, [...msgs, { role: "assistant", content: r.text }, { role: "user", content: "Qidiruv natijasi (Vikipediya): " + info + "\nEndi suhbatni davom ettir." }], tried); j = parse(r.text); }
      }
      return json(200, { say: j.say || "", options: j.options || [], ready: !!j.ready, brief: j.brief || "", learn: j.learn || "" });
    }
    const mode = ["edit", "fix"].includes(b.mode) ? b.mode : "generate";
    const prompt = String(b.prompt || "").slice(0, 3000);
    if (!prompt) return json(400, { error: "Topshiriq bo‘sh." });
    const code = String(b.code || "").slice(0, 30000);
    const user = mode === "generate" ? prompt
      : mode === "edit" ? `O‘zgartirish: ${prompt}\n\nHozirgi kod:\n${code}`
      : `Topshiriq: ${prompt}\n\nBrauzer xatosi: ${String(b.error || "").slice(0, 500)}\n\nKod:\n${code}`;
    const r = await callAI(mode, SYSTEM[mode], [{ role: "user", content: user }], tried);
    return json(200, { code: clean(r.text), provider: r.provider });
  } catch (e) { return json(502, { error: e.message, tried: e.tried || tried }); }
};
