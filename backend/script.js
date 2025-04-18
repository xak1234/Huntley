const BACKEND_URL = 'https://huntley.onrender.com';

// Load chat history on page load
document.addEventListener('DOMContentLoaded', () => {
  fetch(`${BACKEND_URL}/api/chat-history`)
    .then(response => response.json())
    .then(history => {
      const chatBox = document.getElementById('chat-box');
      history.messages.forEach(msg => {
        const messageElement = document.createElement('p');
        messageElement.textContent = `${msg.sender}: ${msg.content}`;
        chatBox.appendChild(messageElement);
      });
    })
    .catch(error => console.error('Cannot access backend server: Error loading chat history:', error));
});

// Send message when form is submitted
document.getElementById('chat-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const messageInput = document.getElementById('message-input');
  const message = messageInput.value.trim();
  if (!message) return;

  fetch(`${BACKEND_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  })
    .then(response => response.json())
    .then(data => {
      const chatBox = document.getElementById('chat-box');
      const userMessage = document.createElement('p');
      userMessage.textContent = `You: ${message}`;
      chatBox.appendChild(userMessage);

      const botMessage = document.createElement('p');
      botMessage.textContent = `Bot: ${data.response}`;
      chatBox.appendChild(botMessage);

      messageInput.value = '';
      chatBox.scrollTop = chatBox.scrollHeight;
    })
    .catch(error => console.error('Cannot access backend server: Error sending message:', error));
});
