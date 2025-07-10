const fs = require("fs");
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());
app.use(express.static(__dirname));

const port = 3000;

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ✅ 簡單文字比對查詢
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

    // 關鍵字比對（先找到第一個 Q 包含使用者提問的）
    const match = qaPairs.find(qa =>
      userQuestion.includes(qa.question.slice(0, 6)) // 取前幾字比對關鍵字
    );

    res.json({
      answer: match ? match.answer : "很抱歉，暫時找不到相關的答案。",
    });
  } catch (err) {
    console.error("❌ 查詢錯誤：", err.message);
    res.status(500).json({ answer: "伺服器錯誤，請稍後再試。" });
  }
});

app.listen(port, () => {
  console.log(`✅ HTTP 伺服器啟動中：http://localhost:${port}`);
});
