const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs').promises;
const path = require('path');
const mammoth = require('mammoth');
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Load bot background from .docx
let botBackground;
async function loadBotBackground() {
  try {
    const docxPath = path.join(__dirname, 'Soham_Huntley and Carr_.docx');
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
    // Call Gemini API
    const result = await model.generateContent(prompt);
    const botResponse = result.response.text();

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
