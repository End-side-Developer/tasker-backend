# Feature 7: Gamification System

> **Feature Goal**: Engage users with achievement badges, completion streaks, team leaderboards, and celebration animations to boost productivity and team morale.

---

## 📊 Feature Overview

| Aspect | Details |
|--------|---------|
| **Priority** | P2 - Enhancement |
| **Complexity** | Medium-High |
| **Est. Total Hours** | ~40 hours |
| **Dependencies** | Task completion tracking, User profiles |
| **Components** | Badge System, Streaks, Leaderboards, Celebrations |

---

## 🎯 Task Breakdown

### Phase 1: Badge System Foundation

| Task ID | Task | Priority | Status | Est. Hours |
|---------|------|----------|--------|------------|
| GAM-001 | Design badge schema in Firestore | P0 | Not Started | 2 |
| GAM-002 | Create badge definitions and criteria | P0 | Not Started | 3 |
| GAM-003 | Implement badge checking service | P0 | Not Started | 4 |
| GAM-004 | Create badge awarding endpoint | P0 | Not Started | 3 |
| GAM-005 | Build badge display in Cliq messages | P1 | Not Started | 3 |

### Phase 2: Streak Tracking

| Task ID | Task | Priority | Status | Est. Hours |
|---------|------|----------|--------|------------|
| GAM-006 | Design streak tracking schema | P0 | Not Started | 2 |
| GAM-007 | Implement daily streak calculation | P0 | Not Started | 4 |
| GAM-008 | Add streak recovery grace period | P1 | Not Started | 2 |
| GAM-009 | Create streak milestone badges | P1 | Not Started | 2 |
| GAM-010 | Build streak display widget section | P1 | Not Started | 3 |

### Phase 3: Leaderboards

| Task ID | Task | Priority | Status | Est. Hours |
|---------|------|----------|--------|------------|
| GAM-011 | Design leaderboard data structure | P0 | Not Started | 2 |
| GAM-012 | Create leaderboard calculation service | P0 | Not Started | 4 |
| GAM-013 | Implement weekly/monthly leaderboards | P1 | Not Started | 3 |
| GAM-014 | Build leaderboard Cliq widget | P1 | Not Started | 3 |
| GAM-015 | Add team vs individual rankings | P2 | Not Started | 2 |

### Phase 4: Celebrations & Notifications

| Task ID | Task | Priority | Status | Est. Hours |
|---------|------|----------|--------|------------|
| GAM-016 | Design celebration trigger system | P1 | Not Started | 2 |
| GAM-017 | Create milestone celebration messages | P1 | Not Started | 2 |
| GAM-018 | Implement team celebration broadcasts | P2 | Not Started | 2 |
| GAM-019 | Add achievement unlock animations | P2 | Not Started | 2 |

---

## 📐 Schema Designs

### GAM-001: Badge Schema

```javascript
// Firestore: badges/{badgeId}
{
  id: "first_task_complete",
  name: "First Steps",
  description: "Complete your first task",
  icon: "🎯",
  category: "milestone",        // milestone, streak, team, special
  tier: "bronze",               // bronze, silver, gold, platinum
  criteria: {
    type: "task_count",
    threshold: 1
  },
  points: 10,
  rarity: "common",             // common, rare, epic, legendary
  createdAt: timestamp
}

// Firestore: users/{userId}/badges/{badgeId}
{
  badgeId: "first_task_complete",
  earnedAt: timestamp,
  progress: 100,                // percentage toward badge
  notified: true
}

// Firestore: users/{userId}/gamification
{
  totalPoints: 150,
  level: 3,
  currentStreak: 7,
  longestStreak: 14,
  lastActivityDate: "2025-01-15",
  weeklyTaskCount: 12,
  monthlyTaskCount: 45,
  badgeCount: 8
}
```

### GAM-002: Badge Definitions

```javascript
// src/config/badges.js
const BADGE_DEFINITIONS = {
  // Milestone Badges
  milestones: [
    {
      id: "first_task",
      name: "First Steps",
      icon: "🎯",
      tier: "bronze",
      criteria: { type: "task_count", threshold: 1 },
      points: 10
    },
    {
      id: "task_master_10",
      name: "Getting Started",
      icon: "✅",
      tier: "bronze",
      criteria: { type: "task_count", threshold: 10 },
      points: 25
    },
    {
      id: "task_master_50",
      name: "Task Warrior",
      icon: "⚔️",
      tier: "silver",
      criteria: { type: "task_count", threshold: 50 },
      points: 50
    },
    {
      id: "task_master_100",
      name: "Productivity Pro",
      icon: "🏆",
      tier: "gold",
      criteria: { type: "task_count", threshold: 100 },
      points: 100
    },
    {
      id: "task_master_500",
      name: "Task Legend",
      icon: "👑",
      tier: "platinum",
      criteria: { type: "task_count", threshold: 500 },
      points: 500
    }
  ],

  // Streak Badges
  streaks: [
    {
      id: "streak_3",
      name: "Consistent",
      icon: "🔥",
      tier: "bronze",
      criteria: { type: "streak", threshold: 3 },
      points: 15
    },
    {
      id: "streak_7",
      name: "Week Warrior",
      icon: "🔥🔥",
      tier: "silver",
      criteria: { type: "streak", threshold: 7 },
      points: 35
    },
    {
      id: "streak_30",
      name: "Unstoppable",
      icon: "🔥🔥🔥",
      tier: "gold",
      criteria: { type: "streak", threshold: 30 },
      points: 100
    },
    {
      id: "streak_100",
      name: "Legendary Streak",
      icon: "💎🔥",
      tier: "platinum",
      criteria: { type: "streak", threshold: 100 },
      points: 300
    }
  ],

  // Team Badges
  team: [
    {
      id: "team_player",
      name: "Team Player",
      icon: "🤝",
      tier: "bronze",
      criteria: { type: "tasks_assigned", threshold: 5 },
      points: 20
    },
    {
      id: "mentor",
      name: "Mentor",
      icon: "🎓",
      tier: "silver",
      criteria: { type: "tasks_assigned", threshold: 25 },
      points: 50
    },
    {
      id: "collaborator",
      name: "Super Collaborator",
      icon: "🌟",
      tier: "gold",
      criteria: { type: "project_contributions", threshold: 10 },
      points: 75
    }
  ],

  // Special Badges
  special: [
    {
      id: "early_bird",
      name: "Early Bird",
      icon: "🌅",
      tier: "silver",
      criteria: { type: "tasks_before_9am", threshold: 10 },
      points: 40
    },
    {
      id: "night_owl",
      name: "Night Owl",
      icon: "🦉",
      tier: "silver",
      criteria: { type: "tasks_after_9pm", threshold: 10 },
      points: 40
    },
    {
      id: "speed_demon",
      name: "Speed Demon",
      icon: "⚡",
      tier: "gold",
      criteria: { type: "tasks_same_day", threshold: 20 },
      points: 60
    },
    {
      id: "perfect_week",
      name: "Perfect Week",
      icon: "💯",
      tier: "gold",
      criteria: { type: "all_tasks_week", threshold: 1 },
      points: 80
    }
  ]
};

module.exports = BADGE_DEFINITIONS;
```

---

## 🔧 Implementation Details

### GAM-003: Badge Checking Service

```javascript
// src/services/gamificationService.js
const { db } = require('../config/firebase');
const BADGE_DEFINITIONS = require('../config/badges');

class GamificationService {
  
  /**
   * Check and award badges for a user
   * @param {string} userId - The user ID
   * @param {string} triggerEvent - Event that triggered check (task_complete, streak_update, etc.)
   */
  async checkAndAwardBadges(userId, triggerEvent) {
    const userStats = await this.getUserStats(userId);
    const earnedBadges = await this.getEarnedBadges(userId);
    const newBadges = [];

    // Flatten all badge categories
    const allBadges = [
      ...BADGE_DEFINITIONS.milestones,
      ...BADGE_DEFINITIONS.streaks,
      ...BADGE_DEFINITIONS.team,
      ...BADGE_DEFINITIONS.special
    ];

    for (const badge of allBadges) {
      // Skip if already earned
      if (earnedBadges.includes(badge.id)) continue;

      // Check if criteria met
      const criteriamet = this.checkBadgeCriteria(badge, userStats);
      
      if (criteriaMet) {
        await this.awardBadge(userId, badge);
        newBadges.push(badge);
      }
    }

    return newBadges;
  }

  /**
   * Check if badge criteria is met
   */
  checkBadgeCriteria(badge, userStats) {
    const { type, threshold } = badge.criteria;

    switch (type) {
      case 'task_count':
        return userStats.totalTasksCompleted >= threshold;
      
      case 'streak':
        return userStats.currentStreak >= threshold || 
               userStats.longestStreak >= threshold;
      
      case 'tasks_assigned':
        return userStats.tasksAssignedToOthers >= threshold;
      
      case 'project_contributions':
        return userStats.projectsContributed >= threshold;
      
      case 'tasks_before_9am':
        return userStats.earlyTasks >= threshold;
      
      case 'tasks_after_9pm':
        return userStats.lateTasks >= threshold;
      
      case 'tasks_same_day':
        return userStats.sameDayCompletions >= threshold;
      
      case 'all_tasks_week':
        return userStats.perfectWeeks >= threshold;
      
      default:
        return false;
    }
  }

  /**
   * Award a badge to user
   */
  async awardBadge(userId, badge) {
    const badgeRef = db.collection('users').doc(userId)
      .collection('badges').doc(badge.id);
    
    await badgeRef.set({
      badgeId: badge.id,
      earnedAt: new Date(),
      progress: 100,
      notified: false
    });

    // Update user points
    const gamificationRef = db.collection('users').doc(userId)
      .collection('gamification').doc('stats');
    
    await gamificationRef.update({
      totalPoints: admin.firestore.FieldValue.increment(badge.points),
      badgeCount: admin.firestore.FieldValue.increment(1)
    });

    // Check for level up
    await this.checkLevelUp(userId);

    return badge;
  }

  /**
   * Get user gamification stats
   */
  async getUserStats(userId) {
    const statsDoc = await db.collection('users').doc(userId)
      .collection('gamification').doc('stats').get();
    
    if (!statsDoc.exists) {
      // Initialize stats for new user
      const initialStats = {
        totalPoints: 0,
        level: 1,
        currentStreak: 0,
        longestStreak: 0,
        totalTasksCompleted: 0,
        tasksAssignedToOthers: 0,
        projectsContributed: 0,
        earlyTasks: 0,
        lateTasks: 0,
        sameDayCompletions: 0,
        perfectWeeks: 0,
        weeklyTaskCount: 0,
        monthlyTaskCount: 0,
        badgeCount: 0,
        lastActivityDate: null
      };
      
      await db.collection('users').doc(userId)
        .collection('gamification').doc('stats').set(initialStats);
      
      return initialStats;
    }

    return statsDoc.data();
  }

  /**
   * Get list of earned badge IDs
   */
  async getEarnedBadges(userId) {
    const badgesSnapshot = await db.collection('users').doc(userId)
      .collection('badges').get();
    
    return badgesSnapshot.docs.map(doc => doc.id);
  }

  /**
   * Check and process level up
   */
  async checkLevelUp(userId) {
    const stats = await this.getUserStats(userId);
    const currentLevel = stats.level;
    const newLevel = this.calculateLevel(stats.totalPoints);

    if (newLevel > currentLevel) {
      await db.collection('users').doc(userId)
        .collection('gamification').doc('stats')
        .update({ level: newLevel });

      return { leveledUp: true, oldLevel: currentLevel, newLevel };
    }

    return { leveledUp: false };
  }

  /**
   * Calculate level from points
   */
  calculateLevel(points) {
    // Level thresholds: 0, 50, 150, 300, 500, 750, 1050, 1400, 1800, 2250...
    // Formula: threshold = 50 * (level * (level + 1) / 2)
    let level = 1;
    let threshold = 50;
    
    while (points >= threshold) {
      level++;
      threshold = 50 * (level * (level + 1) / 2);
    }
    
    return level;
  }
}

module.exports = new GamificationService();
```

### GAM-006 & GAM-007: Streak Tracking

```javascript
// src/services/streakService.js
const { db } = require('../config/firebase');

class StreakService {
  
  /**
   * Update streak when task is completed
   */
  async updateStreakOnTaskComplete(userId) {
    const statsRef = db.collection('users').doc(userId)
      .collection('gamification').doc('stats');
    
    const stats = await statsRef.get();
    const data = stats.data() || {};
    
    const today = this.getDateString(new Date());
    const lastActivity = data.lastActivityDate;
    const currentStreak = data.currentStreak || 0;
    const longestStreak = data.longestStreak || 0;

    let newStreak = currentStreak;
    let streakBroken = false;
    let streakExtended = false;

    if (!lastActivity) {
      // First task ever
      newStreak = 1;
      streakExtended = true;
    } else if (lastActivity === today) {
      // Already completed task today, no streak change
      newStreak = currentStreak;
    } else if (this.isYesterday(lastActivity)) {
      // Consecutive day - extend streak
      newStreak = currentStreak + 1;
      streakExtended = true;
    } else if (this.isWithinGracePeriod(lastActivity)) {
      // Within grace period (2 days) - recover streak with penalty
      newStreak = Math.max(1, currentStreak - 1);
      streakExtended = true;
    } else {
      // Streak broken
      newStreak = 1;
      streakBroken = true;
    }

    const newLongestStreak = Math.max(longestStreak, newStreak);

    await statsRef.set({
      ...data,
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      lastActivityDate: today,
      totalTasksCompleted: (data.totalTasksCompleted || 0) + 1
    }, { merge: true });

    return {
      previousStreak: currentStreak,
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      streakBroken,
      streakExtended,
      isNewRecord: newStreak > longestStreak
    };
  }

  /**
   * Get date string in YYYY-MM-DD format
   */
  getDateString(date) {
    return date.toISOString().split('T')[0];
  }

  /**
   * Check if date string is yesterday
   */
  isYesterday(dateString) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return dateString === this.getDateString(yesterday);
  }

  /**
   * Check if date is within grace period (2 days)
   */
  isWithinGracePeriod(dateString) {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const inputDate = new Date(dateString);
    return inputDate >= twoDaysAgo;
  }

  /**
   * Get streak status for display
   */
  async getStreakStatus(userId) {
    const statsDoc = await db.collection('users').doc(userId)
      .collection('gamification').doc('stats').get();
    
    const data = statsDoc.data() || {};
    const today = this.getDateString(new Date());
    
    let streakStatus = 'active';
    if (!data.lastActivityDate) {
      streakStatus = 'new';
    } else if (data.lastActivityDate === today) {
      streakStatus = 'completed_today';
    } else if (this.isYesterday(data.lastActivityDate)) {
      streakStatus = 'continue_today';
    } else if (this.isWithinGracePeriod(data.lastActivityDate)) {
      streakStatus = 'at_risk';
    } else {
      streakStatus = 'broken';
    }

    return {
      currentStreak: data.currentStreak || 0,
      longestStreak: data.longestStreak || 0,
      lastActivityDate: data.lastActivityDate,
      streakStatus,
      todayCompleted: data.lastActivityDate === today
    };
  }
}

module.exports = new StreakService();
```

### GAM-011 & GAM-012: Leaderboard Service

```javascript
// src/services/leaderboardService.js
const { db } = require('../config/firebase');

class LeaderboardService {
  
  /**
   * Get weekly leaderboard
   */
  async getWeeklyLeaderboard(projectId = null, limit = 10) {
    const startOfWeek = this.getStartOfWeek();
    
    let query = db.collectionGroup('gamification')
      .where('lastActivityDate', '>=', startOfWeek);
    
    // If projectId provided, filter by project members
    if (projectId) {
      const projectMembers = await this.getProjectMembers(projectId);
      // Note: Firestore doesn't support 'in' with collectionGroup efficiently
      // May need to restructure for large-scale
    }

    const snapshot = await query.get();
    
    const leaderboard = [];
    for (const doc of snapshot.docs) {
      const userId = doc.ref.parent.parent.id;
      const userData = await this.getUserDisplayInfo(userId);
      
      leaderboard.push({
        userId,
        userName: userData.name,
        avatar: userData.avatar,
        weeklyTasks: doc.data().weeklyTaskCount || 0,
        currentStreak: doc.data().currentStreak || 0,
        totalPoints: doc.data().totalPoints || 0,
        level: doc.data().level || 1
      });
    }

    // Sort by weekly tasks, then by total points
    leaderboard.sort((a, b) => {
      if (b.weeklyTasks !== a.weeklyTasks) {
        return b.weeklyTasks - a.weeklyTasks;
      }
      return b.totalPoints - a.totalPoints;
    });

    // Add rank
    return leaderboard.slice(0, limit).map((entry, index) => ({
      ...entry,
      rank: index + 1,
      medal: this.getMedal(index + 1)
    }));
  }

  /**
   * Get monthly leaderboard
   */
  async getMonthlyLeaderboard(projectId = null, limit = 10) {
    const startOfMonth = this.getStartOfMonth();
    
    const snapshot = await db.collectionGroup('gamification').get();
    
    const leaderboard = [];
    for (const doc of snapshot.docs) {
      const userId = doc.ref.parent.parent.id;
      const userData = await this.getUserDisplayInfo(userId);
      
      leaderboard.push({
        userId,
        userName: userData.name,
        avatar: userData.avatar,
        monthlyTasks: doc.data().monthlyTaskCount || 0,
        currentStreak: doc.data().currentStreak || 0,
        totalPoints: doc.data().totalPoints || 0,
        level: doc.data().level || 1,
        badgeCount: doc.data().badgeCount || 0
      });
    }

    leaderboard.sort((a, b) => {
      if (b.monthlyTasks !== a.monthlyTasks) {
        return b.monthlyTasks - a.monthlyTasks;
      }
      return b.totalPoints - a.totalPoints;
    });

    return leaderboard.slice(0, limit).map((entry, index) => ({
      ...entry,
      rank: index + 1,
      medal: this.getMedal(index + 1)
    }));
  }

  /**
   * Get all-time leaderboard
   */
  async getAllTimeLeaderboard(limit = 10) {
    const snapshot = await db.collectionGroup('gamification')
      .orderBy('totalPoints', 'desc')
      .limit(limit)
      .get();
    
    const leaderboard = [];
    let rank = 1;
    
    for (const doc of snapshot.docs) {
      const userId = doc.ref.parent.parent.id;
      const userData = await this.getUserDisplayInfo(userId);
      
      leaderboard.push({
        rank,
        medal: this.getMedal(rank),
        userId,
        userName: userData.name,
        avatar: userData.avatar,
        totalPoints: doc.data().totalPoints || 0,
        level: doc.data().level || 1,
        longestStreak: doc.data().longestStreak || 0,
        badgeCount: doc.data().badgeCount || 0
      });
      
      rank++;
    }

    return leaderboard;
  }

  /**
   * Get user's rank
   */
  async getUserRank(userId, period = 'weekly') {
    let leaderboard;
    
    switch (period) {
      case 'weekly':
        leaderboard = await this.getWeeklyLeaderboard(null, 100);
        break;
      case 'monthly':
        leaderboard = await this.getMonthlyLeaderboard(null, 100);
        break;
      case 'alltime':
        leaderboard = await this.getAllTimeLeaderboard(100);
        break;
    }

    const userEntry = leaderboard.find(e => e.userId === userId);
    return userEntry ? userEntry.rank : null;
  }

  /**
   * Get medal emoji for rank
   */
  getMedal(rank) {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  }

  /**
   * Get start of current week (Monday)
   */
  getStartOfWeek() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    return monday.toISOString().split('T')[0];
  }

  /**
   * Get start of current month
   */
  getStartOfMonth() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString().split('T')[0];
  }

  /**
   * Get user display info
   */
  async getUserDisplayInfo(userId) {
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      const data = userDoc.data() || {};
      return {
        name: data.displayName || data.email?.split('@')[0] || 'Anonymous',
        avatar: data.photoUrl || null
      };
    } catch {
      return { name: 'Unknown', avatar: null };
    }
  }

  /**
   * Get project members
   */
  async getProjectMembers(projectId) {
    const projectDoc = await db.collection('projects').doc(projectId).get();
    return projectDoc.data()?.members || [];
  }
}

module.exports = new LeaderboardService();
```

### GAM-014: Leaderboard Cliq Widget

```deluge
// Cliq Widget: Leaderboard Tab
// widgets/leaderboard-tab.dg

response = Map();

// Get period from params or default to weekly
period = ifnull(params.get("period"), "weekly");

// Fetch leaderboard from backend
endpoint = "https://tasker-backend-b10p.onrender.com/api/gamification/leaderboard";
apiKey = "34a8176cd72297093e2b349a6fb9b2443dffb51d8291cfe6711063cb4b6eafb3";

headers = Map();
headers.put("x-api-key", apiKey);
headers.put("Content-Type", "application/json");

apiResponse = invokeurl
[
    url: endpoint + "?period=" + period
    type: GET
    headers: headers
];

leaderboard = apiResponse.get("leaderboard");
userRank = apiResponse.get("userRank");

// Build widget sections
sections = List();

// Period selector buttons
periodButtons = List();
periodButtons.add({
    "type": "button",
    "label": "Weekly",
    "action": {
        "type": "invoke.function",
        "name": "refreshLeaderboard",
        "params": {"period": "weekly"}
    },
    "style": if(period == "weekly", "primary", "secondary")
});
periodButtons.add({
    "type": "button",
    "label": "Monthly",
    "action": {
        "type": "invoke.function",
        "name": "refreshLeaderboard",
        "params": {"period": "monthly"}
    },
    "style": if(period == "monthly", "primary", "secondary")
});
periodButtons.add({
    "type": "button",
    "label": "All Time",
    "action": {
        "type": "invoke.function",
        "name": "refreshLeaderboard",
        "params": {"period": "alltime"}
    },
    "style": if(period == "alltime", "primary", "secondary")
});

sections.add({
    "type": "section",
    "elements": periodButtons
});

// Your rank card
if(userRank != null)
{
    sections.add({
        "type": "section",
        "elements": [
            {
                "type": "title",
                "text": "Your Rank: " + userRank.get("medal") + " #" + userRank.get("rank")
            },
            {
                "type": "text",
                "text": "Points: " + userRank.get("totalPoints") + " | Level " + userRank.get("level")
            }
        ]
    });
}

// Leaderboard list
leaderboardElements = List();
leaderboardElements.add({
    "type": "divider"
});
leaderboardElements.add({
    "type": "title",
    "text": "🏆 " + period.proper() + " Leaderboard"
});

for each entry in leaderboard
{
    rankDisplay = entry.get("medal");
    nameDisplay = entry.get("userName");
    statsDisplay = "";
    
    if(period == "weekly")
    {
        statsDisplay = entry.get("weeklyTasks") + " tasks | 🔥" + entry.get("currentStreak");
    }
    else if(period == "monthly")
    {
        statsDisplay = entry.get("monthlyTasks") + " tasks | " + entry.get("badgeCount") + " badges";
    }
    else
    {
        statsDisplay = entry.get("totalPoints") + " pts | Level " + entry.get("level");
    }
    
    leaderboardElements.add({
        "type": "text",
        "text": rankDisplay + " **" + nameDisplay + "** - " + statsDisplay
    });
}

sections.add({
    "type": "section",
    "elements": leaderboardElements
});

response.put("type", "applet");
response.put("tabs", [
    {
        "label": "Leaderboard",
        "id": "leaderboard"
    }
]);
response.put("active_tab", "leaderboard");
response.put("sections", sections);

return response;
```

### GAM-016 & GAM-017: Celebration System

```javascript
// src/services/celebrationService.js
const cliqService = require('./cliqService');

class CelebrationService {
  
  /**
   * Send celebration message for achievement
   */
  async celebrateAchievement(userId, achievement) {
    const message = this.buildCelebrationMessage(achievement);
    
    // Send to user
    await cliqService.sendDirectMessage(userId, message);
    
    // If team achievement, broadcast to project
    if (achievement.broadcastToTeam && achievement.projectId) {
      await this.broadcastToProject(achievement.projectId, message);
    }

    return { sent: true };
  }

  /**
   * Build celebration message based on achievement type
   */
  buildCelebrationMessage(achievement) {
    const templates = {
      badge_earned: {
        title: "🎉 Badge Unlocked!",
        getBody: (a) => `Congratulations! You've earned the **${a.badge.name}** badge ${a.badge.icon}!\n\n_${a.badge.description}_\n\n+${a.badge.points} points`
      },
      level_up: {
        title: "⬆️ Level Up!",
        getBody: (a) => `Amazing! You've reached **Level ${a.newLevel}**! 🎊\n\nKeep up the great work!`
      },
      streak_milestone: {
        title: "🔥 Streak Milestone!",
        getBody: (a) => `Incredible! You've hit a **${a.streak} day streak**! 🔥\n\nYou're on fire!`
      },
      new_record: {
        title: "🏆 New Personal Record!",
        getBody: (a) => `You've set a new personal record!\n\n**${a.recordType}**: ${a.newValue}\n\nPrevious best: ${a.oldValue}`
      },
      leaderboard_rank: {
        title: "📊 Leaderboard Achievement!",
        getBody: (a) => `You've reached **#${a.rank}** on the ${a.period} leaderboard! ${a.medal}`
      },
      perfect_week: {
        title: "💯 Perfect Week!",
        getBody: (a) => `You completed ALL your tasks this week!\n\nTotal: ${a.taskCount} tasks completed 🎉`
      }
    };

    const template = templates[achievement.type];
    if (!template) {
      return {
        text: `Achievement unlocked: ${achievement.description}`
      };
    }

    return {
      text: template.title,
      card: {
        title: template.title,
        theme: "modern-inline"
      },
      slides: [
        {
          type: "text",
          data: template.getBody(achievement)
        }
      ],
      buttons: [
        {
          label: "View Profile",
          action: {
            type: "invoke.function",
            name: "viewGamificationProfile"
          }
        }
      ]
    };
  }

  /**
   * Check for celebration triggers after task completion
   */
  async checkCelebrationTriggers(userId, taskCompleteResult, streakResult, newBadges) {
    const celebrations = [];

    // Badge celebrations
    for (const badge of newBadges) {
      celebrations.push({
        type: 'badge_earned',
        badge,
        broadcastToTeam: badge.tier === 'gold' || badge.tier === 'platinum'
      });
    }

    // Streak milestones
    const streakMilestones = [3, 7, 14, 30, 50, 100];
    if (streakResult.streakExtended && 
        streakMilestones.includes(streakResult.currentStreak)) {
      celebrations.push({
        type: 'streak_milestone',
        streak: streakResult.currentStreak,
        broadcastToTeam: streakResult.currentStreak >= 30
      });
    }

    // New streak record
    if (streakResult.isNewRecord && streakResult.currentStreak > 7) {
      celebrations.push({
        type: 'new_record',
        recordType: 'Longest Streak',
        newValue: `${streakResult.currentStreak} days`,
        oldValue: `${streakResult.currentStreak - 1} days`
      });
    }

    // Send all celebrations
    for (const celebration of celebrations) {
      await this.celebrateAchievement(userId, celebration);
    }

    return celebrations;
  }

  /**
   * Broadcast celebration to project channel
   */
  async broadcastToProject(projectId, message) {
    const project = await db.collection('projects').doc(projectId).get();
    const channelId = project.data()?.cliqChannelId;
    
    if (channelId) {
      await cliqService.sendToChannel(channelId, {
        ...message,
        text: `📢 Team Achievement!\n\n${message.text}`
      });
    }
  }
}

module.exports = new CelebrationService();
```

---

## 🔌 API Endpoints

### Gamification Routes

```javascript
// src/routes/gamificationRoutes.js
const express = require('express');
const router = express.Router();
const gamificationService = require('../services/gamificationService');
const streakService = require('../services/streakService');
const leaderboardService = require('../services/leaderboardService');
const authMiddleware = require('../middleware/auth');

// Get user gamification profile
router.get('/profile/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const [stats, badges, streakStatus] = await Promise.all([
      gamificationService.getUserStats(userId),
      gamificationService.getEarnedBadges(userId),
      streakService.getStreakStatus(userId)
    ]);

    res.json({
      success: true,
      profile: {
        ...stats,
        badges,
        streakStatus
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all badges with progress
router.get('/badges/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const badges = await gamificationService.getAllBadgesWithProgress(userId);
    res.json({ success: true, badges });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get leaderboard
router.get('/leaderboard', authMiddleware, async (req, res) => {
  try {
    const { period = 'weekly', projectId, limit = 10 } = req.query;
    
    let leaderboard;
    switch (period) {
      case 'weekly':
        leaderboard = await leaderboardService.getWeeklyLeaderboard(projectId, limit);
        break;
      case 'monthly':
        leaderboard = await leaderboardService.getMonthlyLeaderboard(projectId, limit);
        break;
      case 'alltime':
        leaderboard = await leaderboardService.getAllTimeLeaderboard(limit);
        break;
    }

    // Get requesting user's rank
    const userRank = await leaderboardService.getUserRank(req.user.uid, period);

    res.json({
      success: true,
      period,
      leaderboard,
      userRank
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get streak status
router.get('/streak/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const streakStatus = await streakService.getStreakStatus(userId);
    res.json({ success: true, streak: streakStatus });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manual badge check (admin)
router.post('/check-badges/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const newBadges = await gamificationService.checkAndAwardBadges(userId, 'manual');
    res.json({ success: true, newBadges });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

---

## ✅ Acceptance Criteria

### GAM-001: Badge Schema
- [ ] Firestore collections created for badges and user badges
- [ ] Badge document structure supports all required fields
- [ ] User gamification stats document tracks all metrics
- [ ] Indexes created for common queries

### GAM-002: Badge Definitions
- [ ] At least 15 badges defined across 4 categories
- [ ] Each badge has unique ID, name, icon, tier, criteria
- [ ] Point values are balanced (bronze: 10-25, silver: 30-50, gold: 60-100, platinum: 100+)
- [ ] Criteria types cover all tracked metrics

### GAM-003: Badge Checking Service
- [ ] Service checks all badges on task completion
- [ ] Already earned badges are skipped
- [ ] New badges are correctly awarded
- [ ] Points are added to user total
- [ ] Level calculation works correctly

### GAM-006 & GAM-007: Streak Tracking
- [ ] Streak increments on consecutive day completion
- [ ] Streak resets after missed day (outside grace period)
- [ ] Grace period (2 days) allows recovery with penalty
- [ ] Longest streak is tracked separately
- [ ] Date handling accounts for timezones

### GAM-011-014: Leaderboards
- [ ] Weekly leaderboard resets every Monday
- [ ] Monthly leaderboard resets on 1st
- [ ] All-time leaderboard shows top performers
- [ ] User's rank is correctly calculated
- [ ] Cliq widget displays leaderboard with pagination

### GAM-016-019: Celebrations
- [ ] Badge unlock sends celebratory message
- [ ] Level up triggers celebration
- [ ] Streak milestones (7, 30, 100) are celebrated
- [ ] Team achievements broadcast to project channel
- [ ] Celebrations include action buttons

---

## 🧪 Testing Scenarios

### Unit Tests

```javascript
// tests/gamification.test.js
describe('GamificationService', () => {
  describe('calculateLevel', () => {
    it('should return level 1 for 0-49 points', () => {
      expect(service.calculateLevel(0)).toBe(1);
      expect(service.calculateLevel(49)).toBe(1);
    });

    it('should return level 2 for 50-149 points', () => {
      expect(service.calculateLevel(50)).toBe(2);
      expect(service.calculateLevel(149)).toBe(2);
    });

    it('should return level 5 for 500-749 points', () => {
      expect(service.calculateLevel(500)).toBe(5);
      expect(service.calculateLevel(749)).toBe(5);
    });
  });

  describe('checkBadgeCriteria', () => {
    it('should award first_task badge after 1 task', () => {
      const badge = { criteria: { type: 'task_count', threshold: 1 } };
      const stats = { totalTasksCompleted: 1 };
      expect(service.checkBadgeCriteria(badge, stats)).toBe(true);
    });

    it('should not award streak_7 badge with 5 day streak', () => {
      const badge = { criteria: { type: 'streak', threshold: 7 } };
      const stats = { currentStreak: 5 };
      expect(service.checkBadgeCriteria(badge, stats)).toBe(false);
    });
  });
});

describe('StreakService', () => {
  describe('isYesterday', () => {
    it('should return true for yesterday date', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];
      expect(service.isYesterday(dateStr)).toBe(true);
    });
  });

  describe('updateStreakOnTaskComplete', () => {
    it('should extend streak on consecutive day', async () => {
      // Setup: user completed task yesterday with streak of 5
      mockUserStats({ currentStreak: 5, lastActivityDate: 'yesterday' });
      
      const result = await service.updateStreakOnTaskComplete('user123');
      
      expect(result.currentStreak).toBe(6);
      expect(result.streakExtended).toBe(true);
    });

    it('should reset streak after missed days', async () => {
      // Setup: user last active 5 days ago
      mockUserStats({ currentStreak: 10, lastActivityDate: '5-days-ago' });
      
      const result = await service.updateStreakOnTaskComplete('user123');
      
      expect(result.currentStreak).toBe(1);
      expect(result.streakBroken).toBe(true);
    });
  });
});
```

### Integration Tests

```javascript
describe('Gamification Integration', () => {
  it('should award badge and update points on task completion', async () => {
    // Create user with 0 tasks
    const userId = await createTestUser({ totalTasksCompleted: 0 });
    
    // Complete first task
    await taskService.completeTask(testTaskId, userId);
    
    // Check badge awarded
    const badges = await gamificationService.getEarnedBadges(userId);
    expect(badges).toContain('first_task');
    
    // Check points updated
    const stats = await gamificationService.getUserStats(userId);
    expect(stats.totalPoints).toBe(10);
  });

  it('should trigger celebration on level up', async () => {
    // Create user at 45 points (level 1, needs 50 for level 2)
    const userId = await createTestUser({ totalPoints: 45 });
    
    // Award badge worth 10 points
    await gamificationService.awardBadge(userId, { id: 'test', points: 10 });
    
    // Verify level up
    const stats = await gamificationService.getUserStats(userId);
    expect(stats.level).toBe(2);
    
    // Verify celebration sent
    expect(mockCliqService.sendDirectMessage).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({ text: expect.stringContaining('Level Up') })
    );
  });
});
```

---

## ⚠️ Edge Cases

### Streak Edge Cases
1. **Timezone differences**: User in different timezone completes task at 11 PM their time
   - Solution: Store dates in user's timezone or use UTC consistently
   
2. **Multiple tasks same day**: Don't increment streak multiple times
   - Solution: Check if `lastActivityDate === today` before incrementing

3. **Grace period abuse**: User only completes task every 2 days
   - Solution: Grace period applies penalty (streak - 1)

4. **Streak during app downtime**: Server down for maintenance
   - Solution: Admin tool to grant grace period to all users

### Badge Edge Cases
1. **Race condition**: Two tasks complete simultaneously, both check badges
   - Solution: Use Firestore transactions for badge awarding

2. **Badge criteria change**: Existing users may now qualify
   - Solution: Run migration script to check all users

3. **Retroactive badges**: User completed 100 tasks before badges existed
   - Solution: One-time recalculation based on historical data

### Leaderboard Edge Cases
1. **Tie breaker**: Two users with same weekly tasks
   - Solution: Secondary sort by total points, then by streak

2. **New user on leaderboard**: User with 1 task appears above inactive users
   - Solution: Minimum threshold (e.g., 3 tasks) to appear on leaderboard

3. **Week/month boundary**: Task completed at 11:59 PM Sunday
   - Solution: Use consistent timezone (UTC) for all calculations

---

## 📁 File Structure

```
src/
├── config/
│   └── badges.js              # Badge definitions
├── services/
│   ├── gamificationService.js # Badge checking and awarding
│   ├── streakService.js       # Streak tracking
│   ├── leaderboardService.js  # Leaderboard calculations
│   └── celebrationService.js  # Achievement celebrations
├── routes/
│   └── gamificationRoutes.js  # API endpoints
└── middleware/
    └── gamificationMiddleware.js # Hook into task completion

cliq-scripts/
├── widgets/
│   └── leaderboard-tab.dg     # Leaderboard widget
├── functions/
│   ├── refreshLeaderboard.dg  # Leaderboard refresh handler
│   └── viewGamificationProfile.dg # Profile viewer
└── handlers/
    └── badge-notification.dg  # Badge unlock notifications
```

---

## 🚀 Implementation Order

1. **Week 1**: GAM-001 to GAM-004 (Badge foundation)
2. **Week 2**: GAM-005 to GAM-009 (Badge display + Streaks)
3. **Week 3**: GAM-010 to GAM-014 (Leaderboards)
4. **Week 4**: GAM-015 to GAM-019 (Celebrations + Polish)

---

## 📚 Related Documents

- [CLIQ_NEXT_FEATURES.md](../docs/CLIQ_NEXT_FEATURES.md) - Feature overview
- [Feature 3: Notifications](./feature-3-notifications.md) - Webhook integration for celebrations
- [Feature 2: Home Widget](./feature-2-home-widget.md) - Widget integration for stats display
