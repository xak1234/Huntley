const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const mammoth = require('mammoth');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args)); // node-fetch

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Load personality from docx
let botBackground = 'Default Huntley persona';
(async () => {
  try {
    const result = await mammoth.extractRawText({ path: path.join(__dirname, 'Soham.docx') });
    botBackground = result.value.trim();
    console.log('✅ Soham.docx loaded');
  } catch (err) {
    console.error('❌ Could not load Soham.docx:', err.message);
  }
})();

// Local chat history
const historyFile = path.join(__dirname, 'chat_history.json');
const loadHistory = async () => {
  try {
    const data = await fs.readFile(historyFile, 'utf8');
    return JSON.parse(data);
  } catch {
    return { messages: [] };
  }
};
const saveHistory = async (data) => {
  await fs.writeFile(historyFile, JSON.stringify(data, null, 2));
};

// Gemini chat endpoint
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  const history = await loadHistory();
  history.messages.push({ sender: 'User', content: message });

  const prompt = `
You are Huntley. Stay in character.
Background:
${botBackground}

Chat:
${history.messages.map(m => `${m.sender}: ${m.content}`).join('\n')}
Respond as Huntley:
`;

  try {
    const gemini = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024
        }
      })
    });

    if (!gemini.ok) {
      const errText = await gemini.text();
      throw new Error(`Gemini API failed (${gemini.status}): ${errText}`);
    }

    const data = await gemini.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[No reply]';

    history.messages.push({ sender: 'Bot', content: reply });
    await saveHistory(history);

    res.json({ response: reply });
  } catch (err) {
    console.error('❌ Gemini error:', err.message);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Huntley backend is alive' });
});

// Fallback index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Huntley server running at http://localhost:${PORT}`);
});
