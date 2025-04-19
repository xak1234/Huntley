const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const mammoth = require('mammoth');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Serve frontend

// Load .docx bot background
let botBackground = 'Default bot background';
(async () => {
  try {
    const result = await mammoth.extractRawText({ path: path.join(__dirname, 'Soham.docx') });
    botBackground = result.value.trim();
    console.log('✅ Loaded Huntley persona');
  } catch (err) {
    console.error('❌ Failed to load Soham.docx:', err.message);
  }
})();

// Chat history (optional persistence)
const historyPath = path.join(__dirname, 'chat_history.json');
const loadHistory = async () => {
  try {
    const data = await fs.readFile(historyPath, 'utf8');
    return JSON.parse(data);
  } catch {
    return { messages: [] };
  }
};
const saveHistory = async (data) => {
  await fs.writeFile(historyPath, JSON.stringify(data, null, 2));
};

// POST /api/chat
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'No message received' });

  const history = await loadHistory();
  history.messages.push({ sender: 'User', content: message });

  const prompt = `
You are Huntley. Stay in character always.
Background:
${botBackground}

Conversation:
${history.messages.map(m => `${m.sender}: ${m.content}`).join('\n')}

Respond as Huntley:
`;

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            topP: 0.95,
            maxOutputTokens: 1024
          }
        })
      }
    );

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text();
      console.error(`Gemini API failed: ${geminiRes.status}`, errorText);
      return res.status(500).json({ error: 'Gemini API failed' });
    }

    const data = await geminiRes.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[No response]';
    history.messages.push({ sender: 'Bot', content: reply });
    await saveHistory(history);
    res.json({ response: reply });
  } catch (err) {
    console.error('Server error:', err.message);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
