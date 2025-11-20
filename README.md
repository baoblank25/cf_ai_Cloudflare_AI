# cf_ai_intelligent-assistant

A fully-featured AI-powered chat assistant built on Cloudflare's edge computing platform. This application demonstrates the integration of Cloudflare Workers AI, Durable Objects, Workflows, and Pages to create a responsive, stateful conversational AI experience.

## 🌟 Features

### Core Components

1. **🧠 LLM Integration**
   - Uses **Llama 3.3 70B Instruct FP8** model via Cloudflare Workers AI
   - Fast, high-quality responses powered by edge computing
   - Context-aware conversations with conversation history

2. **⚙️ Workflow Orchestration**
   - Cloudflare Workflows for multi-step AI interactions
   - Coordinated task processing with step-by-step execution
   - Reliable state management across workflow steps

3. **💾 State Management**
   - Durable Objects for persistent conversation history
   - Session-based memory with unique session IDs
   - Reliable storage with automatic persistence

4. **💬 User Interface**
   - Interactive chat interface deployed on Cloudflare Pages
   - Real-time message updates
   - Clean, responsive design that works on all devices
   - Typing indicators and status updates

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloudflare Pages                        │
│                  (Frontend UI - HTML/CSS/JS)                │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ HTTPS API Calls
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                   Cloudflare Workers                        │
│                  (API Handler - src/index.ts)               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Routes:                                              │  │
│  │  • POST /api/chat - Direct AI chat (fast path)       │  │
│  │  • POST /api/chat/workflow - Workflow-based chat     │  │
│  │  • GET  /api/history - Get conversation history      │  │
│  │  • DELETE /api/history - Clear conversation          │  │
│  └───────────────────────────────────────────────────────┘  │
└───────┬─────────────────────────────┬───────────────────────┘
        │                             │
        │ Workers AI                  │ Session Management
        ↓                             ↓
┌──────────────────┐         ┌────────────────────────┐
│   Workers AI     │         │   Durable Objects      │
│  (Llama 3.3)     │         │   (ChatSession)        │
│                  │         │  • Store messages      │
│  • Generate      │         │  • Persist history     │
│    responses     │         │  • Session state       │
└──────────────────┘         └────────────────────────┘
        ↑
        │ Orchestration
┌───────┴──────────────────┐
│  Cloudflare Workflows    │
│   (ChatWorkflow)         │
│  • Multi-step coord.     │
│  • Error handling        │
│  • Complex flows         │
└──────────────────────────┘
```

## 📋 Requirements Met

✅ **LLM**: Llama 3.3 70B Instruct model via Workers AI  
✅ **Workflow/Coordination**: Cloudflare Workflows for orchestration  
✅ **User Input**: Interactive chat interface via Cloudflare Pages  
✅ **Memory/State**: Durable Objects for persistent conversation history  
✅ **Documentation**: Comprehensive README with setup instructions  
✅ **AI Prompts**: All prompts documented in PROMPTS.md  

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/baoblank25/Cloudflare_AI.git
   cd cloudflare
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Wrangler**
   
   Login to your Cloudflare account:
   ```bash
   npx wrangler login
   ```

4. **Update wrangler.toml**
   
   Edit `wrangler.toml` and update the KV namespace IDs after creating them:
   ```bash
   npx wrangler kv:namespace create KV
   npx wrangler kv:namespace create KV --preview
   ```
   
   Copy the generated IDs into `wrangler.toml`.

### Local Development

1. **Start the Worker in development mode (serves both API and frontend)**
   ```bash
   npm run dev
   ```
   
   This starts the Worker with static assets on `http://localhost:8787`

2. **Open your browser**
   
   Navigate to `http://localhost:8787` to use the chat interface
   
   The API endpoints are available at `/api/*`

**Note:** The `[site]` configuration in `wrangler.toml` automatically serves files from the `public/` directory.

### Deployment

1. **Deploy the Worker**
   ```bash
   npm run deploy
   ```

2. **Deploy the Pages frontend**
   ```bash
   npm run pages:deploy
   ```

3. **Update API URL**
   
   After deploying the Worker, update the `API_BASE_URL` in `public/app.js` to point to your deployed Worker URL.

## 📖 API Endpoints

### POST /api/chat
Send a message and get an AI response (direct path).

**Request:**
```json
{
  "message": "Hello, how are you?",
  "sessionId": "session_123"
}
```

**Response:**
```json
{
  "response": "I'm doing well, thank you! How can I help you today?",
  "sessionId": "session_123",
  "timestamp": 1700000000000
}
```

### POST /api/chat/workflow
Send a message using Workflow orchestration (for complex flows).

**Request:**
```json
{
  "message": "Explain quantum computing",
  "sessionId": "session_123",
  "userId": "user_456"
}
```

**Response:**
```json
{
  "workflowId": "workflow_abc123",
  "status": "processing"
}
```

### GET /api/history?sessionId=session_123
Retrieve conversation history for a session.

**Response:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Hello",
      "timestamp": 1700000000000
    },
    {
      "role": "assistant",
      "content": "Hi there!",
      "timestamp": 1700000001000
    }
  ]
}
```

### DELETE /api/history
Clear conversation history for a session.

**Request:**
```json
{
  "sessionId": "session_123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "History cleared"
}
```

## 🎯 Usage Examples

### Basic Chat
1. Open the application in your browser
2. Type a message in the input box
3. Press Enter or click Send
4. Watch as the AI responds in real-time

### Session Management
- Each browser session gets a unique session ID
- Click "New Session" to start fresh
- Click "Clear History" to delete current conversation
- History persists across page refreshes

### Example Prompts
- "Explain how Cloudflare Workers work"
- "Write a Python function to calculate fibonacci numbers"
- "What are the benefits of edge computing?"
- "Help me debug this JavaScript code: [paste code]"

## 🧪 Testing

### Test the Worker API
```bash
# Health check
curl http://localhost:8787/health

# Send a chat message
curl -X POST http://localhost:8787/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","sessionId":"test_123"}'

# Get history
curl "http://localhost:8787/api/history?sessionId=test_123"
```

## 📁 Project Structure

```
cloudflare/
├── src/
│   ├── index.ts                    # Main Worker entry point
│   ├── durable-objects/
│   │   └── ChatSession.ts          # Durable Object for state
│   └── workflows/
│       └── ChatWorkflow.ts         # Workflow orchestration
├── public/
│   ├── index.html                  # Frontend UI
│   ├── styles.css                  # Styling
│   └── app.js                      # Frontend logic
├── wrangler.toml                   # Cloudflare configuration
├── package.json                    # Dependencies
├── tsconfig.json                   # TypeScript config
├── README.md                       # This file
└── PROMPTS.md                      # AI prompts used
```

## 🔧 Technologies Used

- **Cloudflare Workers**: Serverless compute at the edge
- **Workers AI**: Access to Llama 3.3 and other models
- **Durable Objects**: Distributed state management
- **Cloudflare Workflows**: Multi-step task orchestration
- **Cloudflare Pages**: Static site hosting
- **TypeScript**: Type-safe development
- **HTML/CSS/JavaScript**: Modern web frontend

## 🌐 Links

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Workers AI Documentation](https://developers.cloudflare.com/workers-ai/)
- [Durable Objects Documentation](https://developers.cloudflare.com/durable-objects/)
- [Cloudflare Workflows Documentation](https://developers.cloudflare.com/workflows/)
- [Llama 3.3 Model Info](https://ai.meta.com/llama/)

## 🎓 Learning Resources

This project demonstrates:
- Serverless architecture patterns
- Edge computing best practices
- AI/LLM integration techniques
- State management in distributed systems
- Modern web development with Cloudflare

Perfect for developers looking to learn about:
- Building AI-powered applications
- Cloudflare platform capabilities
- Full-stack serverless development
- Real-time web applications
