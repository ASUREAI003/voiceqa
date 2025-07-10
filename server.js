// 引入所需模組（如果前面沒寫 fs，要補上）
const fs = require("fs");
const { OpenAI } = require("openai");

// 初始化 OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 內積比對函數
function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (normA * normB);
}

// 問答 POST API（使用 qanda.txt）
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
