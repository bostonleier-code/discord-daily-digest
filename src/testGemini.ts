const key = process.env.GEMINI_API_KEY;
if (!key) { console.error("No GEMINI_API_KEY set"); process.exit(1); }

const body = JSON.stringify({ contents: [{ parts: [{ text: "Say hello in one word." }] }] });

console.log("Testing Gemini connection...");
fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
  { method: "POST", headers: { "Content-Type": "application/json" }, body, signal: AbortSignal.timeout(15000) }
)
  .then(r => r.json())
  .then((d: any) => {
    if (d.error) { console.error("Gemini error:", d.error.message); process.exit(1); }
    console.log("Gemini response:", d.candidates?.[0]?.content?.parts?.[0]?.text);
    console.log("Connection OK.");
  })
  .catch((err: Error) => { console.error("Fetch error:", err.message); process.exit(1); });
