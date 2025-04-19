const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const mammoth = require('mammoth');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for the static site
app.use(cors({
  origin: 'https://huntleyonline.onrender.com',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));
console.log('✅ CORS enabled for https://huntleyonline.onrender.com');

// Middleware
app.use(express.json());

// Validate API keys at startup
if (!process.env.GEMINI_API_KEY) {
  console.error('FATAL ERROR: GEMINI_API_KEY environment variable is not set!');
  process.exit(1);
}
if (!process.env.OPENAI_API_KEY) {
  console.warn('WARNING: OPENAI_API_KEY environment variable is not set! OpenAI fallback will fail.');
}

// Load bot background from .docx
let botBackground;
async function loadBotBackground() {
  try {
    const docxPath = path.join(__dirname, 'Soham.docx');
    const result = await mammoth.extractRawText({ path: docxPath });
    botBackground = result.value; // Extracted text from .docx
    console.log('✅ Bot background loaded successfully');
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
  console.log('📩 Received request for /api/chat-history');
  const history = await loadChatHistory();
  res.json(history);
});

app.post('/api/chat', async (req, res) => {
  console.log('📩 Received request for /api/chat:', req.body);
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
    // First, try the Gemini API
    let botResponse;
    try {
      console.log('📞 Calling Gemini API...');
      const geminiResponse = await fetch(
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

      console.log(`📡 Gemini API Status Code: ${geminiResponse.status}`);
      if (!geminiResponse.ok) {
        const errorBody = await geminiResponse.text();
        console.error(`Cannot access Gemini API: Status ${geminiResponse.status}, Body: ${errorBody}`);
        throw new Error(`Gemini API request failed: ${geminiResponse.statusText}`);
      }

      const geminiData = await geminiResponse.json();
      botResponse = geminiData.candidates[0].content.parts[0].text;
      console.log('✅ Gemini API responded successfully');
    } catch (geminiError) {
      console.error('Cannot access Gemini API:', geminiError.message);

      // Fallback to OpenAI API if Gemini fails
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('Cannot access OpenAI API: OpenAI API key not provided, cannot fallback');
      }

      console.log('📞 Falling back to OpenAI API...');
      const openaiResponse = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: 'You are Huntley, an AI assistant.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 1024,
          })
        }
      );

      console.log(`📡 OpenAI API Status Code: ${openaiResponse.status}`);
      if (!openaiResponse.ok) {
        const errorBody = await openaiResponse.text();
        console.error(`Cannot access OpenAI API: Status ${openaiResponse.status}, Body: ${errorBody}`);
        throw new Error(`OpenAI API request failed: ${openaiResponse.statusText}`);
      }

      const openaiData = await openaiResponse.json();
      botResponse = openaiData.choices[0].message.content;
      console.log('✅ OpenAI API responded successfully');
    }

    // Add bot response to history
    history.messages.push({ sender: 'Bot', content: botResponse });
    await saveChatHistory(history);

    // Log the conversation
    const logEntry = {
      timestamp: new Date().toISOString(),
      userMessage: message,
      botResponse: botResponse,
    };
    console.log('💬 Conversation Log:', JSON.stringify(logEntry));

    res.json({ response: botResponse });
  } catch (error) {
    console.error('Error generating response:', error.message);
    res.status(500).json({ error: `Failed to generate response: ${error.message}` });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('📩 Received request for /health');
  res.status(200).json({ status: 'OK', message: 'Huntley server is running' });
});

// Basic root route
app.get('/', (req, res) => {
  console.log('📩 Received request for /');
  res.send('Huntley server is running...');
});

// Start server
app.listen(port, () => {
  console.log(`✅ Huntley server live at http://localhost:${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Render Hostname: ${process.env.RENDER_EXTERNAL_HOSTNAME || 'Not set'}`);
});
