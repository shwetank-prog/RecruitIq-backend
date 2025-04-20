const express = require("express");
const pdfParse = require("pdf-parse");
const cors = require("cors");
require("dotenv").config();

const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(cors());
const port = 3000;

app.use("/api/check", express.raw({ type: "application/pdf", limit: "10mb" }));

// ✅ Gemini setup - specify API version
console.log('API Key:', process.env.GEMINI_API_KEY); // Check if the key is being loaded correctly

const genAI = new GoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
  apiVersion: "v1",
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

    // ✅ Correct model name
    const model = genAI.getGenerativeModel({ model: "models/gemini-pro" });

    const result = await model.generateContent(prompt);
    const output = result.response.text();

    console.log("Raw GPT response:", output);

    try {
      const parsed = JSON.parse(output);
      res.json(parsed);
    } catch {
      res.status(500).json({ error: "Invalid JSON from Gemini", raw: output });
    }
  } catch (err) {
    console.error("❌ Server error:", err);
    res.status(500).json({ error: "Something went wrong", details: err.message });
  }
});

app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
