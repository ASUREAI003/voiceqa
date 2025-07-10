const fs = require("fs");
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const stringSimilarity = require("string-similarity");

const app = express();
app.use(bodyParser.json());
app.use(express.static(__dirname));

const port = 3000;

// 首頁
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ✅ 語音查詢（模糊比對）
app.post("/ask", async (req, res) => {
  try {
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

    let bestMatch = null;
    let bestScore = 0;

    for (let qa of qaPairs) {
      const similarity = stringSimilarity.compareTwoStrings(userQuestion, qa.question);
      if (similarity > bestScore) {
        bestScore = similarity;
        bestMatch = qa;
      }
    }

    res.json({
      answer: bestScore >= 0.3 ? bestMatch.answer : "很抱歉，找不到相關答案。",
    });

  } catch (err) {
    console.error("❌ 查詢錯誤：", err.message);
    res.status(500).json({ answer: "伺服器錯誤，請稍後再試。" });
  }
});

// ✅ 顯示所有 Q&A（文字檔讀取）
app.get("/list", (req, res) => {
  try {
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

    res.json(qaPairs);
  } catch (err) {
    console.error("❌ /list 讀取錯誤：", err.message);
    res.status(500).json({ error: "讀取失敗" });
  }
});

// 啟動
app.listen(port, () => {
  console.log(`✅ HTTP 伺服器啟動中：http://localhost:${port}`);
});
