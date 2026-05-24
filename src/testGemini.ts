import { GoogleGenerativeAI } from "@google/generative-ai";

const key = process.env.GEMINI_API_KEY;
if (!key) { console.error("No GEMINI_API_KEY set"); process.exit(1); }

const genAI = new GoogleGenerativeAI(key);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

console.log("Testing Gemini connection...");
model.generateContent("Say hello in one word.").then((result) => {
  console.log("Gemini response:", result.response.text());
  console.log("Connection OK.");
}).catch((err) => {
  console.error("Gemini error:", err.message);
  process.exit(1);
});
