document.addEventListener('DOMContentLoaded', () => {
  const chatWindow = document.getElementById('chat-window');
  const userInput = document.getElementById('user-input');
  const sendBtn = document.getElementById('send-btn');

  // Load chat history
  fetch('/api/chat-history')
    .then(response => response.json())
    .then(data => {
      data.messages.forEach(msg => {
        displayMessage(msg.sender, msg.content);
      });
      chatWindow.scrollTop = chatWindow.scrollHeight;
    });

  // Send message
  sendBtn.addEventListener('click', sendMessage);
  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    // Display user message
    displayMessage('You', message);
    userInput.value = '';

    // Send to backend
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      const data = await response.json();
      displayMessage('Bot', data.response);
    } catch (error) {
      displayMessage('Bot', 'Error: Could not reach the server.');
    }

    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  function displayMessage(sender, message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `p-2 ${sender === 'You' ? 'text-right' : 'text-left'}`;
    messageDiv.innerHTML = `<span class="font-bold">${sender}:</span> ${message.replace(/\n/g, '<br>')}`;
    chatWindow.appendChild(messageDiv);
  }
});