const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const mammoth = require('mammoth');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Load bot background from .docx
let botBackground;
async function loadBotBackground() {
  try {
    const docxPath = path.join(__dirname, 'Soham.docx');
    const result = await mammoth.extractRawText({ path: docxPath });
    botBackground = result.value; // Extracted text from .docx
  } catch (error) {
    console.error('Error loading .docx file:', error);
    botBackground = 'Default bot background: Huntley is a friendly and helpful AI assistant.';
  }
}
loadBotBackground();

// Chat history file
const chatHistoryFile = path.join(__dirname, 'chat_history.json');
async function loadChatHistory() {
  try {
    const data = await fs.readFile(chatHistoryFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { messages: [] };
  }
}
async function saveChatHistory(history) {
  await fs.writeFile(chatHistoryFile, JSON.stringify(history, null, 2));
}

// API Routes
app.get('/api/chat-history', async (req, res) => {
  const history = await loadChatHistory();
  res.json(history);
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  // Load chat history
  const history = await loadChatHistory();

  // Add user message to history
  history.messages.push({ sender: 'You', content: message });

  // Prepare prompt with bot background and chat history
  const prompt = `
    You are Huntley, an AI assistant defined by the following background:
    ${botBackground}
    Previous conversation:
    ${history.messages.map(msg => `${msg.sender}: ${msg.content}`).join('\n')}
    User: ${message}
    Respond as Huntley:
  `;

  try {
    // Make HTTP request to Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 1024,
          }
        })
      }
    );

    // Check if the response is OK
    if (!response.ok) {
      throw new Error(`Gemini API request failed: ${response.statusText}`);
    }

    // Parse the response
    const data = await response.json();
    const botResponse = data.candidates[0].content.parts[0].text;

    // Add bot response to history
    history.messages.push({ sender: 'Bot', content: botResponse });
    await saveChatHistory(history);

    res.json({ response: botResponse });
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
