require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const { OpenAI } = require("openai");

const app = express();
const port = process.env.PORT || 3000;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 提供 index.html
app.use(express.static(__dirname));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 模擬問答資料（你可改為連接資料庫）
const qaList = [
  {
    question: "怎麼點餐？",
    answer: "您可以在現場的自助機台或線上系統點餐。",
  },
  {
    question: "有哪些付款方式？",
    answer: "支援信用卡、LINE Pay、Apple Pay。",
  },
  {
    question: "營業時間是幾點？",
    answer: "每日 11:00 到晚上 10:00。",
  },
];

// 語意比對函式
function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (normA * normB);
}

app.post("/ask", async (req, res) => {
  const userQuestion = req.body.question;

  // 使用者問句轉向量
  const userEmbeddingRes = await openai.embeddings.create({
    input: userQuestion,
    model: "text-embedding-3-small",
  });
  const userVector = userEmbeddingRes.data[0].embedding;

  // 比對本地資料
  let bestMatch = null;
  let bestScore = -1;

  for (let qa of qaList) {
    const dbEmbeddingRes = await openai.embeddings.create({
      input: qa.question,
      model: "text-embedding-3-small",
    });
    const dbVector = dbEmbeddingRes.data[0].embedding;

    const score = cosineSimilarity(userVector, dbVector);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = qa;
    }
  }

  res.json({
    answer: bestMatch ? bestMatch.answer : "很抱歉，找不到相關答案。",
  });
});

app.listen(port, () => {
  console.log(`伺服器已啟動：http://localhost:${port}`);
});
