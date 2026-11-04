exports.handler = async () => ({
  statusCode: 200,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(Object.fromEntries(
    ["GEMINI_API_KEY","GROQ_API_KEY","MISTRAL_API_KEY","OPENROUTER_API_KEY","CEREBRAS_API_KEY"]
      .map(k => [k, !!process.env[k]])
  )),
});
