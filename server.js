require("dotenv").config();
const express = require("express");
const { OpenAI } = require("openai");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");

const app = express();

// 靜態頁面與 JSON 處理
app.use(bodyParser.json());
app.use(express.static(__dirname));

const port = 3000;

// 首頁
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 初始化 OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 內積相似度比對
function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (normA * normB);
}

// Q&A 查詢 API（從文字檔讀取）
app.post("/ask", async (req, res) => {
  const userQuestion = req.body.question;
  const text = fs.readFileSync("qanda.txt", "utf-8");
  const lines = text.split("\n").filter(line => line.trim());

  const qaPairs = [];
  let question = "", answer = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("Q")) {
      question = line.replace(/^Q\d*：/, "").trim();
    } else if (line.startsWith("A：")) {
      answer = line.replace(/^A：/, "").trim();
      while (i + 1 < lines.length && !lines[i + 1].startsWith("Q")) {
        i++;
        answer += "\n" + lines[i].trim();
      }
      qaPairs.push({ question, answer });
    }
  }

  const userEmbeddingRes = await openai.embeddings.create({
    input: userQuestion,
    model: "text-embedding-3-small",
  });
  const userVector = userEmbeddingRes.data[0].embedding;

  let bestMatch = null;
  let bestScore = -1;

  for (let qa of qaPairs) {
    const embedRes = await openai.embeddings.create({
      input: qa.question,
      model: "text-embedding-3-small",
    });
    const qaVector = embedRes.data[0].embedding;
    const score = cosineSimilarity(userVector, qaVector);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = qa;
    }
  }

  res.json({
    answer: bestMatch ? bestMatch.answer : "很抱歉，找不到相關答案。",
  });
});

// 啟動 HTTP 伺服器
app.listen(port, () => {
  console.log(`✅ HTTP 伺服器已啟動：http://localhost:${port}`);
});
