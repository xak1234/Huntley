const BACKEND_URL = 'https://huntley.onrender.com';

// Load chat history on page load
document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-window'); // Updated ID
    fetch(`${BACKEND_URL}/api/chat-history`)
        .then(response => response.json())
        .then(history => {
            history.messages.forEach(msg => {
                const messageElement = document.createElement('p');
                messageElement.textContent = `${msg.sender}: ${msg.content}`;
                chatBox.appendChild(messageElement);
            });
        })
        .catch(error => console.error('Cannot access backend server: Error loading chat history:', error));
});

// Send message when the send button is clicked
document.getElementById('send-btn').addEventListener('click', () => { // Changed to click event
    const messageInput = document.getElementById('user-input');
    const message = messageInput.value.trim();
    if (!message) return;

    const chatBox = document.getElementById('chat-window'); // Updated ID
    const userMessage = document.createElement('p');
    userMessage.textContent = `You: ${message}`;
    chatBox.appendChild(userMessage);

    fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
    })
    .then(response => response.json())
    .then(data => {
        const botMessage = document.createElement('p');
        botMessage.textContent = `Bot: ${data.response}`;
        chatBox.appendChild(botMessage);
        messageInput.value = '';
        chatBox.scrollTop = chatBox.scrollHeight;
    })
    .catch(error => {
        console.error('Cannot access backend server: Error sending message:', error);
        const errorMessage = document.createElement('p');
        errorMessage.textContent = 'Error sending message. Please try again.';
        errorMessage.classList.add('text-red-500');
        chatBox.appendChild(errorMessage);
    });
});
