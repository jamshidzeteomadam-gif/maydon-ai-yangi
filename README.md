# AI Maydon

## Netlify’ga joylash
1. Papkani GitHub’ga yuklang va Netlify’da "Import from Git" qiling (yoki Netlify CLI: `netlify deploy --prod`).
   Funksiyalar ishlashi uchun oddiy "drag & drop" emas, Git yoki CLI orqali joylang.
2. Site settings → Environment variables ga kalitlarni qo‘shing (kamida bittasi):
   GEMINI_API_KEY, GROQ_API_KEY, CEREBRAS_API_KEY, MISTRAL_API_KEY, OPENROUTER_API_KEY
3. Ixtiyoriy: AI_ACCESS_CODE — sayt ochiq qolmasligi uchun kirish kodi.
4. Model nomi o‘zgarsa, kodga tegmasdan MODEL_GROQ, MODEL_GEMINI va hokazo o‘zgaruvchilarni qo‘shing.
5. Env o‘zgartirgach, saytni qayta deploy qiling.

## Zanjirni o‘zgartirish
netlify/functions/ai.js ichidagi ROLES ob’ektida har rol uchun provayderlar tartibi turadi.
