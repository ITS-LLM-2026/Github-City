import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());

// In-memory cache for GitHub API responses to prevent rate limiting
// Cache keys: username (lowercase), value: { timestamp, data }
const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache TTL

// GraphQL Query to fetch user contribution calendar
const graphqlQuery = `
  query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              contributionCount
              date
            }
          }
        }
      }
    }
  }
`;

// Live GitHub Data retrieval endpoint
app.get('/api/github/:username', async (req, res) => {
  const username = req.params.username.trim();

  if (!username) {
    return res.status(400).json({ error: 'GitHub username is required.' });
  }

  // Check cache first
  const cached = cache.get(username.toLowerCase());
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return res.json(cached.data);
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('Missing GITHUB_TOKEN environment variable on backend.');
    return res.status(500).json({ error: 'GitHub token missing' });
  }

  try {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'GitHub-City-Proxy'
      },
      body: JSON.stringify({
        query: graphqlQuery,
        variables: { login: username }
      })
    });

    if (!response.ok) {
      if (response.status === 401) {
        return res.status(401).json({ error: 'GitHub token invalid' });
      }
      if (response.status === 403 || response.status === 429) {
        return res.status(response.status).json({ error: 'Rate limit exceeded' });
      }
      return res.status(response.status).json({ error: 'GitHub API request failed' });
    }

    const result = await response.json();

    // Handle GraphQL Specific errors (e.g. user not found)
    if (result.errors) {
      const firstMsg = result.errors[0]?.message || '';
      if (firstMsg.includes('Could not resolve to a User')) {
        return res.status(404).json({ error: 'GitHub user not found' });
      }
      if (firstMsg.includes('bad credentials') || firstMsg.includes('token') || firstMsg.includes('unauthorized') || firstMsg.includes('Authorization')) {
        return res.status(401).json({ error: 'GitHub token invalid' });
      }
      return res.status(400).json({ error: 'GitHub API request failed' });
    }

    const user = result.data?.user;
    if (!user) {
      return res.status(404).json({ error: 'GitHub user not found' });
    }

    const calendar = user.contributionsCollection?.contributionCalendar;
    if (!calendar) {
      return res.status(500).json({ error: 'Contribution data unavailable' });
    }

    const totalContributions = calendar.totalContributions;
    const days = [];

    calendar.weeks.forEach(week => {
      week.contributionDays.forEach(day => {
        days.push({
          date: day.date,
          count: day.contributionCount
        });
      });
    });

    // Ensure contributions are sorted chronologically
    days.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Grid fits exactly 371 days (53 weeks * 7 days). Pad or slice as needed.
    const targetLength = 371;
    let finalDays = days;

    if (days.length > targetLength) {
      finalDays = days.slice(-targetLength);
    } else if (days.length < targetLength) {
      const padCount = targetLength - days.length;
      const padDays = [];
      const firstDate = new Date(days[0].date);
      for (let i = padCount; i > 0; i--) {
        const d = new Date(firstDate);
        d.setDate(firstDate.getDate() - i);
        padDays.push({
          date: d.toISOString().split('T')[0],
          count: 0
        });
      }
      finalDays = [...padDays, ...days];
    }

    // Calculate streaks
    let longestStreak = 0;
    let tempStreak = 0;
    for (let i = 0; i < finalDays.length; i++) {
      if (finalDays[i].count > 0) {
        tempStreak++;
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
      }
    }

    let currentStreak = 0;
    const hasCommitRecently = finalDays.slice(-2).some(d => d.count > 0);
    if (hasCommitRecently) {
      for (let i = finalDays.length - 1; i >= 0; i--) {
        if (finalDays[i].count > 0) {
          currentStreak++;
        } else if (currentStreak > 0) {
          break;
        }
      }
    }

    // Map to 2D coordinates for the grid generator (x = week, z = day-of-week)
    const grid = finalDays.map((d, i) => ({
      x: Math.floor(i / 7),
      z: i % 7,
      commits: d.count,
      date: d.date
    }));

    const responseData = {
      username,
      totalContributions,
      currentStreak,
      longestStreak,
      grid,
      isMock: false
    };

    // Cache the response
    cache.set(username.toLowerCase(), {
      timestamp: Date.now(),
      data: responseData
    });

    return res.json(responseData);
  } catch (error) {
    console.error('API Server Proxy fetch error:', error);
    return res.status(500).json({ error: 'GitHub API request failed' });
  }
});

// Production: Serve static client assets if they exist
const distPath = path.resolve(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*any', (req, res) => {
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});
