const BACKEND_URL = 'https://huntley.onrender.com';
const chatWindow = document.getElementById('chat-window'); // Consistent ID

// Load chat history on page load
document.addEventListener('DOMContentLoaded', () => {
    fetch(`${BACKEND_URL}/api/chat-history`)
        .then(response => response.json())
        .then(history => {
            history.messages.forEach(msg => {
                const messageElement = document.createElement('p');
                messageElement.textContent = `${msg.sender}: ${msg.content}`;
                chatWindow.appendChild(messageElement);
            });
            chatWindow.scrollTop = chatWindow.scrollHeight; // Scroll to the latest messages
        })
        .catch(error => console.error('Cannot access backend server: Error loading chat history:', error));
});

const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// Send message function
function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    const userMessage = document.createElement('p');
    userMessage.textContent = `You: ${message}`;
    chatWindow.appendChild(userMessage);

    fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
    })
    .then(response => response.json())
    .then(data => {
        const botMessage = document.createElement('p');
        botMessage.textContent = `:>  ${data.response}`; //bot
        chatWindow.appendChild(botMessage);
        userInput.value = '';
        chatWindow.scrollTop = chatWindow.scrollHeight;
    })
    .catch(error => {
        console.error('Cannot access backend server: Error sending message:', error);
        const errorMessage = document.createElement('p');
        errorMessage.textContent = 'Error sending message. Please try again.';
        errorMessage.classList.add('text-red-500');
        chatWindow.appendChild(errorMessage);
    });
}

// Event listener for the Send button
sendBtn.addEventListener('click', sendMessage);

// Event listener for Enter key in the input field
userInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevent default Enter behavior (like adding a new line)
        sendMessage();
    }
});
