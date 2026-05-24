const key = process.env.GROQ_API_KEY;
if (!key) { console.error("No GROQ_API_KEY set"); process.exit(1); }

const body = JSON.stringify({
  model: "llama-3.3-70b-versatile",
  messages: [{ role: "user", content: "Say hello in one word." }],
});

console.log("Testing Groq connection...");
fetch("https://api.groq.com/openai/v1/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
  body,
  signal: AbortSignal.timeout(15000),
})
  .then(r => r.json())
  .then((d: any) => {
    if (d.error) { console.error("Groq error:", d.error.message); process.exit(1); }
    console.log("Groq response:", d.choices?.[0]?.message?.content);
    console.log("Connection OK.");
  })
  .catch((err: Error) => { console.error("Fetch error:", err.message); process.exit(1); });
