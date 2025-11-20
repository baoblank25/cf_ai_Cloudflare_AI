//Configuration
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:8787' 
    : window.location.origin;

//State
let sessionId = generateSessionId();
let messageCount = 0;
let isProcessing = false;

//DOM Elements
const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const clearBtn = document.getElementById('clear-btn');
const newSessionBtn = document.getElementById('new-session-btn');
const sessionIdDisplay = document.getElementById('session-id');
const statusText = document.getElementById('status-text');
const messageCountDisplay = document.getElementById('message-count');

//Initialize
function init() {
    sessionIdDisplay.textContent = sessionId;
    updateStatus('Ready');
    loadHistory();
    
    //Event listeners
    sendBtn.addEventListener('click', sendMessage);
    clearBtn.addEventListener('click', clearHistory);
    newSessionBtn.addEventListener('click', newSession);
    
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    userInput.focus();
}

//Generate session ID
function generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

//Update status bar
function updateStatus(status) {
    statusText.textContent = status;
}

function updateMessageCount() {
    messageCountDisplay.textContent = `${messageCount} messages`;
}

//Add message to chat
function addMessage(role, content, timestamp = Date.now()) {
    //Remove welcome message if exists
    const welcomeMessage = document.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'user' ? '👤' : '🤖';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    const time = new Date(timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = time;
    
    contentDiv.appendChild(timeDiv);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    messageCount++;
    updateMessageCount();
}

//Show typing indicator
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant';
    typingDiv.id = 'typing-indicator';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = '🤖';
    
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = '<span></span><span></span><span></span>';
    
    typingDiv.appendChild(avatar);
    typingDiv.appendChild(indicator);
    chatContainer.appendChild(typingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

//Remove typing indicator
function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

//Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = `Error: ${message}`;
    chatContainer.appendChild(errorDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

//Send message
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message || isProcessing) return;
    
    isProcessing = true;
    sendBtn.disabled = true;
    updateStatus('Sending...');
    
    //Add user message to UI
    addMessage('user', message);
    userInput.value = '';
    
    try {
        //Show typing indicator
        showTypingIndicator();
        updateStatus('AI is thinking...');
        
        //Send to API
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message,
                sessionId,
            }),
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        //Remove typing indicator
        removeTypingIndicator();
        
        //Add AI response to UI
        addMessage('assistant', data.response, data.timestamp);
        updateStatus('Ready');
        
    } catch (error) {
        console.error('Error sending message:', error);
        removeTypingIndicator();
        showError(error.message || 'Failed to send message');
        updateStatus('Error');
    } finally {
        isProcessing = false;
        sendBtn.disabled = false;
        userInput.focus();
    }
}

//Load conversation history
async function loadHistory() {
    try {
        updateStatus('Loading history...');
        
        const response = await fetch(`${API_BASE_URL}/api/history?sessionId=${sessionId}`);
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.messages && data.messages.length > 0) {
            //Remove welcome message
            const welcomeMessage = document.querySelector('.welcome-message');
            if (welcomeMessage) {
                welcomeMessage.remove();
            }
            
            //Add all messages
            data.messages.forEach(msg => {
                addMessage(msg.role, msg.content, msg.timestamp);
            });
        }
        
        updateStatus('Ready');
        
    } catch (error) {
        console.error('Error loading history:', error);
        updateStatus('Ready');
    }
}

//Clear conversation history
async function clearHistory() {
    if (!confirm('Are you sure you want to clear the conversation history?')) {
        return;
    }
    
    try {
        updateStatus('Clearing history...');
        
        const response = await fetch(`${API_BASE_URL}/api/history`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sessionId }),
        });
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        //Clear UI
        chatContainer.innerHTML = `
            <div class="welcome-message">
                <h2>Conversation Cleared</h2>
                <p>Start a new conversation by typing a message below!</p>
            </div>
        `;
        
        messageCount = 0;
        updateMessageCount();
        updateStatus('History cleared');
        userInput.focus();
        
    } catch (error) {
        console.error('Error clearing history:', error);
        showError(error.message || 'Failed to clear history');
        updateStatus('Error');
    }
}

//Start new session
function newSession() {
    if (messageCount > 0 && !confirm('Start a new session? Current conversation will remain saved under the old session ID.')) {
        return;
    }
    
    sessionId = generateSessionId();
    sessionIdDisplay.textContent = sessionId;
    
    chatContainer.innerHTML = `
        <div class="welcome-message">
            <h2>Welcome to Cloudflare AI Chat!</h2>
            <p>This application demonstrates:</p>
            <ul>
                <li>🧠 <strong>LLM Integration:</strong> Llama 3.3 via Workers AI</li>
                <li>⚙️ <strong>Workflow Orchestration:</strong> Cloudflare Workflows for complex task coordination</li>
                <li>💾 <strong>State Management:</strong> Durable Objects for persistent conversation history</li>
                <li>💬 <strong>Real-time Chat:</strong> Interactive user interface with instant responses</li>
            </ul>
            <p class="tip">Type a message below to start chatting!</p>
        </div>
    `;
    
    messageCount = 0;
    updateMessageCount();
    updateStatus('New session started');
    userInput.focus();
}

//Initialize app
init();
