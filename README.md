# 🌆 GitHub City AI

### **Where every commit becomes a building.**

> Transform your GitHub contribution history into an interactive 3D city you can explore, drive through, and understand with AI.

[![IBM SkillsBuild](https://img.shields.io/badge/IBM-SkillsBuild-052FAD?style=for-the-badge\&logo=ibm\&logoColor=white)](https://skillsbuild.org/)
[![IBM Bob](https://img.shields.io/badge/Built%20with-IBM%20Bob-0F62FE?style=for-the-badge\&logo=ibm\&logoColor=white)](https://www.ibm.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge\&logo=react\&logoColor=white)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-WebGL-black?style=for-the-badge\&logo=three.js\&logoColor=white)](https://threejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge\&logo=typescript\&logoColor=white)](https://www.typescriptlang.org/)

---

## 🏆 Built for the IBM SkillsBuild Hackathon

GitHub City AI is an interactive developer-analytics experience created for the SkillUp Hackathon in collaboration with IBM SkillsBuild.

The project combines:

- 🤖 IBM Bob for AI-assisted software development
- 🧠 IBM AI / Granite / watsonx capabilities for intelligent GitHub analysis
- 🐙 GitHub API for real developer activity
- 🌐 React + TypeScript for the application interface
- 🌆 Three.js / React Three Fiber for procedural 3D visualization
- 🚗 Real-time vehicle simulation for exploring the generated city

The goal is simple:
```text
GitHub gives you data. GitHub City AI gives that data a world.
```

## 💡 The Idea

GitHub contains valuable information about a developer's activity, but it is mostly presented through graphs, lists, and statistics.

**GitHub City AI makes that data visual.**

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

Use IBM AI capabilities to analyze GitHub activity and generate natural-language insights about contribution patterns, projects, and languages.

### ⏳ Time-Based Visualization

Watch your city grow as your GitHub activity changes over time.

### 🌙 Dynamic Environment

Day/night cycles, glowing buildings, clouds, stars, and atmospheric effects create an immersive experience.

### 📸 Cinematic Mode

Fly through the city and capture high-quality screenshots of your coding journey.

---

## 🤖 Built with IBM Bob

**IBM Bob was used throughout the development of the project as an AI-powered development companion.**

Bob assisted with:

* Project architecture
* React & TypeScript development
* Three.js / React Three Fiber implementation
* GitHub API integration
* Vehicle physics and collision systems
* UI development
* Debugging and refactoring
* Testing and documentation

### Development Workflow

```text
Idea → IBM Bob → Build → Test → Debug → Refine → Deploy
```

The developer reviews and validates AI-generated implementations before integration.

---

## 🧠 IBM AI

The AI layer can use **IBM watsonx / Granite** capabilities to turn GitHub-derived statistics into meaningful natural-language insights.

Example:

> **"Your activity is concentrated around TypeScript projects, with your strongest contribution period occurring during your recent development cycle."**

AI insights are grounded in observable GitHub activity rather than attempting to judge a developer's actual skill.

---

## 🛠️ Tech Stack

**Frontend**

* React
* TypeScript
* Vite
* Tailwind CSS
* Three.js
* React Three Fiber

**Backend**

* Node.js
* Express
* GitHub GraphQL API

**AI**

* IBM watsonx / Granite
* IBM Bob

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
   3D City Engine       IBM AI
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

* Node.js 18+
* npm
* GitHub Personal Access Token
* IBM AI credentials (if AI features are enabled)

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

Create `.env`:

```env
GITHUB_TOKEN=your_github_token

IBM_API_KEY=your_ibm_api_key
IBM_PROJECT_ID=your_ibm_project_id
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

| Input           | Action      |
| --------------- | ----------- |
| `W / ↑`         | Accelerate  |
| `S / ↓`         | Reverse     |
| `A / ←`         | Steer Left  |
| `D / →`         | Steer Right |
| `Space`         | Handbrake   |
| Mouse           | Camera      |
| Mobile Joystick | Drive       |

---

## 🏆 Why GitHub City AI?

Traditional GitHub analytics tells you:

> **"You made 327 contributions."**

GitHub City AI shows you:

> **"This is what your coding journey looks like."**

It combines **GitHub data + 3D visualization + AI + interactive gameplay** to create a completely different way of experiencing developer activity.

---

## 🔮 Future Scope

* Team GitHub cities
* Repository-level exploration
* Developer-to-developer city comparison
* Shareable city profiles
* More advanced AI insights
* GitHub organization visualization

---

## 🙌 Acknowledgements

Built for the **IBM SkillsBuild Hackathon**.

Special thanks to **IBM Bob**, GitHub, Three.js, React, and the open-source community.

---

### 🌆 GitHub City AI

**Don't just look at your GitHub journey.**

**Drive through it.**
