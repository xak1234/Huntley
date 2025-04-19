const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // ← serves your index.html, styles, etc

// GEMINI CHAT ENDPOINT
app.post('/api/chat', async (req, res) => {
  // Gemini API handling logic here
});

// fallback to index.html for unmatched routes (SPA style)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(PORT, () => console.log(`✅ Server listening on port ${PORT}`));
