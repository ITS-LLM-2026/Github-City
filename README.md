# 🌆 GitHub City AI

### **Where every commit becomes a building.**

> Transform your GitHub contribution history into an interactive 3D city you can explore, drive through, and understand with AI.

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge\&logo=react\&logoColor=white)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-black?style=for-the-badge\&logo=three.js\&logoColor=white)](https://threejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge\&logo=typescript\&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge\&logo=vite\&logoColor=white)](https://vite.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge\&logo=node.js\&logoColor=white)](https://nodejs.org/)

---

## 💡 The Idea

GitHub contains valuable information about a developer's activity, but it is mostly presented through graphs, lists, and statistics.

**GitHub City AI makes that data visual.**

Your GitHub activity is transformed into a procedurally generated 3D city that you can explore and drive through.

| GitHub Data   | City Representation |
| ------------- | ------------------- |
| Contributions | 🏢 Buildings        |
| Repositories  | 🏙️ Districts       |
| Languages     | 🌐 District themes  |
| Stars         | ⭐ Landmarks         |
| Streaks       | 🔥 Monuments        |
| Activity      | 📈 Building height  |

More activity → **larger and more impressive city structures.**

---

## ✨ Key Features

### 🏙️ Procedural 3D City

Generate a unique city from real GitHub contribution data.

### 🚗 Drive Through Your Code

Explore your developer journey using a low-poly vehicle with physics, steering, collisions, and mobile controls.

### 🤖 AI City Guide

Analyze GitHub activity and generate natural-language insights about contribution patterns, projects, languages, and development activity.

### ⏳ Time-Based Visualization

Watch your city grow as your GitHub activity changes over time.

### 🌙 Dynamic Environment

Day/night cycles, glowing buildings, clouds, stars, and atmospheric effects create an immersive experience.

### 📸 Cinematic Mode

Fly through the city and capture high-quality screenshots of your coding journey.

---

## 🧠 AI-Powered Insights

The AI layer turns GitHub-derived statistics into meaningful natural-language insights.

Example:

> **"Your activity is concentrated around TypeScript projects, with your strongest contribution period occurring during your recent development cycle."**

AI insights are grounded in observable GitHub activity rather than attempting to judge a developer's actual skill.

---

## 🛠️ Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- Three.js
- React Three Fiber

### Backend

- Node.js
- Express
- GitHub GraphQL API

### AI

- AI-powered GitHub activity analysis
- Natural-language developer insights

---

## 🏗️ Architecture

```text
              GitHub API
                   │
                   ▼
          ┌─────────────────┐
          │ Data Processing │
          └────────┬────────┘
                   │
          ┌────────┴────────┐
          ▼                 ▼
   3D City Engine       AI Analysis
          │                 │
          ▼                 ▼
       🌆 City        🤖 Insights
          │                 │
          └────────┬────────┘
                   ▼
              User Experience
              🚗 Explore
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm
- GitHub Personal Access Token
- AI API credentials *(if AI features are enabled)*

### Clone

```bash
git clone https://github.com/ranjeet22/github-city.git
cd github-city
```

### Install

```bash
npm install
```

### Environment Variables

Create a `.env` file:

```env
GITHUB_TOKEN=your_github_token
AI_API_KEY=your_ai_api_key
```

> ⚠️ Never commit `.env` or expose API keys on the client.

### Run

```bash
npm run dev
```

### Build

```bash
npm run build
npm start
```

---

## 🎮 Controls

| Input | Action |
|---|---|
| `W / ↑` | Accelerate |
| `S / ↓` | Reverse |
| `A / ←` | Steer Left |
| `D / →` | Steer Right |
| `Space` | Handbrake |
| Mouse | Camera |
| Mobile Joystick | Drive |

---

## 🏆 Why GitHub City AI?

Traditional GitHub analytics tells you:

> **"You made 327 contributions."**

GitHub City AI shows you:

> **"This is what your coding journey looks like."**

It combines **GitHub data + 3D visualization + AI + interactive gameplay** to create a completely different way of experiencing developer activity.

---

## 🔮 Future Scope

- Team GitHub cities
- Repository-level exploration
- Developer-to-developer city comparison
- Shareable city profiles
- More advanced AI insights
- GitHub organization visualization

---

## 🙌 Acknowledgements

Special thanks to **GitHub, Three.js, React, and the open-source community.**

---

### 🌆 GitHub City AI

**Don't just look at your GitHub journey.**

**Drive through it.**
