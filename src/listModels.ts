const key = process.env.GEMINI_API_KEY;
if (!key) { console.error("No GEMINI_API_KEY set"); process.exit(1); }

fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
  .then(r => r.json())
  .then((data: any) => {
    if (data.error) {
      console.error("API error:", JSON.stringify(data.error, null, 2));
    } else {
      const models = (data.models || []).map((m: any) => m.name);
      console.log("Available models:", models.join("\n"));
    }
  })
  .catch(err => console.error("Fetch error:", err.message));
