# KAVACH.AI ⚡
> "Jab 911 toot jaaye, Kavach nahi." 
> When emergency systems fail, Kavach doesn't.

## What is this?
One paragraph — smart city emergency dispatch AI. 
Two agents. Real-time triage. Automatic deduplication.

## The Problem (2 lines)
During disasters, 911 gets overwhelmed. Human dispatchers 
can't process 500 calls at once. People die from delayed response.

## The Solution (3 lines)
Kavach.AI uses two Claude AI agents to process panicked 911 
calls in real time — extracting location, severity, and resource 
type, deduplicating same-incident reports, and dispatching the 
nearest available unit automatically.

## Key Features
- Situation Awareness: merges duplicate calls automatically
- Agent Thinking Feed: see AI reasoning in real time
- Chaos Mode: stress-test with mass casualty injection
- City Grid Map: animated vehicle dispatch
- Voice Input: speak a 911 call directly
- Resource Intelligence: smart pre-positioning
- Low Confidence Flagging: AI knows what it doesn't know

## Tech Stack
- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- AI: Anthropic Claude (claude-sonnet-4-20250514)
- Realtime: Server-Sent Events (SSE)

## Setup

### Prerequisites
- Node.js 18+
- Anthropic API key

### Installation

```bash
# Clone or unzip the project
cd kavach-ai

# Install server dependencies  
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Environment Setup
Create file: kavach-ai/server/.env
Content:
```
ANTHROPIC_API_KEY=your_anthropic_api_key_here
PORT=3001
```

### Running

Terminal 1 (server):
```bash
cd kavach-ai/server
npm run dev
```

Terminal 2 (client):
```bash
cd kavach-ai/client
npm run dev
```

Open: http://localhost:5173

## Demo Guide (for hackathon)

10-SECOND PITCH:
"Disaster strikes. 500 people call 911. 3 ambulances left.
Kavach.AI reads the chaos, merges duplicate calls, and dispatches
the right resource — automatically, in 3 seconds."

DEMO FLOW:
1. Open dashboard — system auto-starts processing calls
2. Point to CallFeed — "incoming 911 calls, live"
3. Point to Agent Feed — "AI thinking out loud, transparent"
4. Show a DUPLICATE being detected and merged
5. Show vehicle moving on city grid
6. Point to Human Cost bar — "18.7 min manual vs 3 sec AI"
7. Hit CHAOS MODE — let it run for 30 seconds
8. Show low-confidence flagging — "AI knows its limits"
9. Speak a custom 911 call via voice input

## Rubric Alignment
- Who's the user + pain: disaster operators, 911 overwhelmed ✓
- Got it in 10 seconds: tagline on screen always ✓
- Zero instructions: auto-starts, obvious UI ✓
- Technical execution: 2 Claude agents, SSE, dedup, pre-position ✓
- Demo quality: live AI, map movement, chaos mode, voice ✓
