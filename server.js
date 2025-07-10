require("dotenv").config();
const express = require("express");
const mysql = require("mysql2/promise");
const { OpenAI } = require("openai");
const bodyParser = require("body-parser");
const path = require("path");  // ← 加這行

const app = express();
app.use(bodyParser.json());
app.use(express.static(__dirname));  // ← 讓 HTML 靜態頁面能用
const port = 3000;

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));  // ← 回傳首頁
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const dbConfig = {
  host: "localhost",
  user: "root",
  password: "", // ← 改為你的 MySQL 密碼
  database: "qa_db",
};

function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  return dot / (normA * normB);
}

app.post("/ask", async (req, res) => {
  const userQuestion = req.body.question;

  const userEmbeddingRes = await openai.embeddings.create({
    input: userQuestion,
    model: "text-embedding-3-small",
  });

  const userVector = userEmbeddingRes.data[0].embedding;

  const conn = await mysql.createConnection(dbConfig);
  const [rows] = await conn.execute("SELECT * FROM qa WHERE embedding IS NOT NULL");
  conn.end();

  let bestMatch = null;
  let bestScore = -1;

  for (let row of rows) {
    const dbVector = JSON.parse(row.embedding);
    const score = cosineSimilarity(userVector, dbVector);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = row;
    }
  }

  res.json({
    answer: bestMatch ? bestMatch.answer : "很抱歉，找不到相關答案。",
  });
});

app.listen(port, () => {
  console.log(`伺服器已啟動：http://localhost:${port}`);
});
