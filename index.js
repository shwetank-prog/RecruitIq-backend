const express = require("express");
const pdfParse = require("pdf-parse");
const cors = require("cors");
require("dotenv").config();

const { GoogleGenAI } = require("@google/genai"); // Updated import

const app = express();
app.use(cors());
const port = 3000;

app.use("/api/check", express.raw({ type: "application/pdf", limit: "10mb" }));

// ✅ Gemini setup
console.log('API Key:', process.env.GEMINI_API_KEY);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

app.post("/api/check", async (req, res) => {
  const jobDescription = req.query.jobDescription;

  if (!jobDescription) {
    return res.status(400).json({ error: "Missing jobDescription in query" });
  }

  try {
    const pdfData = await pdfParse(req.body);
    const resumeText = pdfData.text;

    const prompt = `
You are a hiring expert. Given the job description and resume below, provide a JSON with:
- a compatibility score (0-100)
- a one-paragraph summary of strengths and gaps

Job Description:
${jobDescription}

Resume:
${resumeText}

Return JSON like:
{
  "score": 85,
  "summary": "..."
}
`;

    // ✅ Use ai.models.generateContent
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash", // You were using "gemini-pro" earlier, updating to flash model as per your working code
      contents: prompt,
    });

    console.log("Raw GPT response:", response.text);

    try {
      const parsed = JSON.parse(response.text);
      res.json(parsed);
    } catch {
      res.status(500).json({ error: "Invalid JSON from Gemini", raw: response.text });
    }
  } catch (err) {
    console.error("❌ Server error:", err);
    res.status(500).json({ error: "Something went wrong", details: err.message });
  }
});

app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
