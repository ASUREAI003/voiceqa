const fs = require("fs");
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const stringSimilarity = require("string-similarity");

const app = express();
app.use(bodyParser.json());
app.use(express.static(__dirname));

const port = 3000;

// ✅ 常見關鍵字清單（可自行擴充）
const keywordList = ["客服", "聯絡", "QR Code", "協助", "LINE", "諮詢"];

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

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

    // ✅ 是否啟用關鍵字過濾
    const hasKeyword = keywordList.some(kw => userQuestion.includes(kw));
    const filteredPairs = hasKeyword
      ? qaPairs.filter(qa =>
          keywordList.some(kw => qa.question.includes(kw) || qa.answer.includes(kw))
        )
      : qaPairs;

    let bestMatch = null;
    let bestScore = 0;

    for (let qa of filteredPairs) {
      const qScore = stringSimilarity.compareTwoStrings(userQuestion, qa.question);
      const aScore = stringSimilarity.compareTwoStrings(userQuestion, qa.answer);
      const similarity = qScore * 0.7 + aScore * 0.3;

      if (similarity > bestScore) {
        bestScore = similarity;
        bestMatch = {
          question: qa.question,
          answer: qa.answer,
          qScore,
          aScore
        };
      }
    }

    res.json({
      answer: bestScore >= 0.3 ? bestMatch.answer : "很抱歉，找不到相關答案。",
      matchedQuestion: bestScore >= 0.3 ? bestMatch.question : null,
      similarity: (bestScore * 100).toFixed(1) + "%",
      debug: bestMatch ? {
        qScore: (bestMatch.qScore * 100).toFixed(1) + "%",
        aScore: (bestMatch.aScore * 100).toFixed(1) + "%"
      } : null
    });

  } catch (err) {
    console.error("❌ 查詢錯誤：", err.message);
    res.status(500).json({ answer: "伺服器錯誤，請稍後再試。" });
  }
});

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
    console.error("❌ /list 錯誤：", err.message);
    res.status(500).json({ error: "讀取失敗" });
  }
});

app.listen(port, () => {
  console.log(`✅ HTTP 伺服器啟動中：http://localhost:${port}`);
});
