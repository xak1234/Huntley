const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const mammoth = require('mammoth');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// CORS for frontend
app.use(cors({
  origin: 'https://huntley.onrender.com',
  methods: ['POST'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

// Check keys
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY missing!');
  process.exit(1);
}

// Load background
let botBackground = 'Default Huntley AI background.';
(async () => {
  try {
    const docxPath = path.join(__dirname, 'Soham.docx');
    const result = await mammoth.extractRawText({ path: docxPath });
    botBackground = result.value.trim();
    console.log('✅ Bot background loaded');
  } catch (err) {
    console.error('Error loading background:', err);
  }
})();

// Chat history
const chatFile = path.join(__dirname, 'chat_history.json');
const loadHistory = async () => {
  try {
    const data = await fs.readFile(chatFile, 'utf8');
    return JSON.parse(data);
  } catch {
    return { messages: [] };
  }
};
const saveHistory = async (history) => {
  await fs.writeFile(chatFile, JSON.stringify(history, null, 2));
};

// Gemini POST endpoint

app.post('/api/chat', async (req, res) => {
  ...
});


  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  const history = await loadHistory();
  history.messages.push({ sender: 'You', content: message });

  const prompt = `
You are Huntley. Stay in character at all times.
Background:
${botBackground}

Conversation:
${history.messages.map(m => `${m.sender}: ${m.content}`).join('\n')}
Respond as Huntley:
`;

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error('❌ Gemini API Error:', errText);
      return res.status(500).json({ error: 'Gemini API failed' });
    }

    const data = await geminiResponse.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '[No response]';
    history.messages.push({ sender: 'Bot', content: reply });
    await saveHistory(history);
    res.json({ response: reply });
  } catch (err) {
    console.error('❌ Error generating response:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Huntley server is running' });
});

app.listen(port, () => {
  console.log(`✅ Server live on http://localhost:${port}`);
});
