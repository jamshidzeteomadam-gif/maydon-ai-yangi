// AI Maydon — provayderlar zanjiri. Bittasi ishlamasa, keyingisiga o‘tadi.
const PROVIDERS = {
  gemini:     { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", key: "GEMINI_API_KEY",     models: ["gemini-3-flash-preview", "gemini-3.1-flash-lite", "gemini-flash-latest"] },
  groq:       { url: "https://api.groq.com/openai/v1/chat/completions",                          key: "GROQ_API_KEY",       models: ["openai/gpt-oss-120b", "openai/gpt-oss-20b"] },
  cerebras:   { url: "https://api.cerebras.ai/v1/chat/completions",                              key: "CEREBRAS_API_KEY",   models: ["gpt-oss-120b"] },
  mistral:    { url: "https://api.mistral.ai/v1/chat/completions",                               key: "MISTRAL_API_KEY",    models: ["mistral-small-latest", "open-mistral-nemo"] },
  openrouter: { url: "https://openrouter.ai/api/v1/chat/completions",                            key: "OPENROUTER_API_KEY", models: ["openrouter/free", "openai/gpt-oss-120b:free"] },
};

// Rollar bo‘yicha tartib. Shu yerdan o‘zgartiring.
const ROLES = {
  generate: ["gemini", "mistral", "groq", "openrouter", "cerebras"],
  fix:      ["groq", "cerebras", "mistral", "gemini", "openrouter"],
};

const SYSTEM = {
  generate: "Sen web dasturchisan. Foydalanuvchi tavsifiga ko‘ra BITTA to‘liq HTML fayl yoz (CSS va JavaScript ichida, tashqi kutubxonasiz). Faqat kodni qaytar, tushuntirishsiz, markdown belgilarisiz.",
  fix: "Sen xato tuzatuvchisan. Berilgan HTML kodda xato bor. Xatoni tuzat va TO‘LIQ tuzatilgan HTML faylni qaytar. Faqat kod, tushuntirishsiz, markdown belgilarisiz.",
};

const clean = (t) => t.replace(/^```[a-z]*\n?/i, "").replace(/```\s*$/, "").trim();
const json = (status, body) => ({ statusCode: status, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Faqat POST." });
  let b; try { b = JSON.parse(event.body || "{}"); } catch { return json(400, { error: "Noto‘g‘ri so‘rov." }); }

  const need = process.env.AI_ACCESS_CODE;
  if (need && b.access !== need) return json(401, { error: "Kirish kodi noto‘g‘ri." });

  const mode = b.mode === "fix" ? "fix" : "generate";
  const prompt = String(b.prompt || "").slice(0, 1800);
  if (!prompt) return json(400, { error: "Tavsif bo‘sh." });

  const user = mode === "fix"
    ? `Tavsif: ${prompt}\n\nBrauzerdagi xato: ${String(b.error || "").slice(0, 500)}\n\nKod:\n${String(b.code || "").slice(0, 24000)}`
    : prompt;

  const tried = [];
  for (const name of ROLES[mode]) {
    const p = PROVIDERS[name];
    const key = process.env[p.key];
    if (!key) { tried.push(`${name}: kalit yo‘q`); continue; }
    const override = process.env[`MODEL_${name.toUpperCase()}`];
    const models = override ? [override, ...p.models] : p.models;
    for (const model of models) {
      try {
        const r = await fetch(p.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model,
            messages: [{ role: "system", content: SYSTEM[mode] }, { role: "user", content: user }],
            temperature: 0.4,
          }),
        });
        if (!r.ok) {
          const msg = (await r.text()).replace(/\s+/g, " ").slice(0, 100);
          tried.push(`${name}/${model}: ${r.status} ${msg}`);
          if (r.status === 429 || r.status === 401 || r.status === 403) break; // limit yoki kalit xatosi: keyingi provayderga
          continue; // 404/400: shu provayderning keyingi modelini sinab ko‘ramiz
        }
        const data = await r.json();
        const text = data.choices?.[0]?.message?.content;
        if (!text) { tried.push(`${name}/${model}: bo‘sh javob`); continue; }
        return json(200, { code: clean(text), provider: `${name}/${model}`, tried });
      } catch (e) { tried.push(`${name}/${model}: ${e.message}`); break; }
    }
  }
  return json(502, { error: "Hech bir AI javob bermadi.", tried });
};
