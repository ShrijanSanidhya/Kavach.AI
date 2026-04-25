<div align="center">
  <img src="https://raw.githubusercontent.com/ShrijanSanidhya/Kavach.AI/main/client/public/favicon.ico" width="80" alt="Kavach Shield" />
  <h1>KAVACH</h1>
  <p><strong>Autonomous Agentic Emergency Dispatch System</strong></p>
  <p><em>Built to simplify chaos. Designed to save lives.</em></p>
</div>

---

## 🌍 The Problem
When disaster strikes, the 911/112 emergency dispatch system often becomes a bottleneck. Panicking callers struggle to explain their exact location and situation, while human operators get overwhelmed by high call volumes. Critical minutes are lost routing the call to the right department (Fire, Medical, Police, or NDRF).

## 🛡️ Our Solution: KAVACH
KAVACH replaces the traditional, manual call-center bottleneck with an **Autonomous AI Dispatcher**. 

We took the complex concept of "Agentic AI" and made it invisible to the user. To a non-techie person in distress, Kavach is just a button you hold to talk. You speak in your native language (e.g., Hindi/English), you point your camera, and you are immediately told: *"Help is on the way."*

Behind the scenes, the AI acts as a highly trained emergency operator:
1. It listens to the voice transcript.
2. It looks at the photos/videos.
3. It autonomously decides the severity (Low, Medium, High).
4. It instantly dispatches the exact right unit (Fire Brigade, NDRF, SWAT, Ambulance).
5. It gives the user immediate, life-saving survival instructions.

---

## 🧠 How We Use "Agentic AI" (Simply Explained)
Most AI today is just a chatbot—you ask a question, it answers. **Agentic AI** means the AI has the power to *take action*. 

In Kavach, the AI is an "Agent" because it doesn't just chat; it controls the emergency response grid.
* **No Complex Forms:** The user doesn't fill out a "Disaster Type" form. The AI deduces it from their panicked voice or camera feed.
* **Autonomous Decision Making:** The AI decides *who* to send. If it hears "gas leak", it automatically bypasses the police and alerts HAZMAT. If it hears "building collapsed", it alerts the NDRF (National Disaster Response Force).
* **Live Command Center:** The AI doesn't work in the dark. It feeds a live, military-grade dashboard for human commanders to oversee, allowing human-in-the-loop oversight without slowing down the initial dispatch.

---

## ⚡ Key Features
* **🎙️ Voice-First SOS:** Hold to speak. The AI understands mixed languages (Hinglish, English, Hindi) and parses the crisis naturally.
* **👁️ Vision Intelligence:** Upload a photo or video of the fire/accident. The AI "sees" the image and uses it to verify the emergency and assess severity.
* **⏱️ Zero-Latency Triage:** Instant protocol activation. The user gets a tactical dashboard showing ETA and live tracking within 6 seconds of reporting.
* **🚔 Smart Resource Allocation:** Automatically maps the crisis to the correct physical unit (e.g., Fire Brigade, Ambulance, NDRF, Police, HAZMAT).
* **🗺️ Command Center Dashboard:** A real-time God's-eye view for city administrators to see all active emergencies, AI confidence scores, and deployed units on a map.

---

## 💻 Tech Stack
* **Frontend:** React.js, Vite, Vanilla CSS (Military-grade UI design)
* **Backend:** Node.js, Express.js
* **AI Intelligence:** Groq (Llama 3) for ultra-fast reasoning, Google Gemini Vision for image analysis
* **Real-time Sync:** Server-Sent Events (SSE) for zero-refresh live tracking

---

## 🚀 How to Run Locally

If you are a judge or developer looking to test the system locally, follow these steps:

### 1. Clone the repository
```bash
git clone https://github.com/ShrijanSanidhya/Kavach.AI.git
cd Kavach.AI
```

### 2. Setup Environment Variables
Navigate to the `server/` directory and create a `.env` file:
```bash
cd server
touch .env
```
Add your API keys to the `.env` file:
```env
PORT=3001
GROQ_API_KEY="your_groq_api_key_here"
```

### 3. Install Dependencies
You need to install packages for both the server and the client.
```bash
# In the server folder:
npm install

# In the client folder:
cd ../client
npm install
```

### 4. Run the Application
Open two terminal windows.

**Terminal 1 (Backend):**
```bash
cd server
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd client
npm run dev
```

The application will now be running at `http://localhost:5173`. 
* Go to `/` to view the **Citizen SOS Portal**.
* Go to `/command` to view the **Administrator Command Center**.

---

<div align="center">
  <i>"Simplifying chaos. Empowering response."</i><br/>
  <b>Built for Hackathons. Built for the Future.</b>
</div>
