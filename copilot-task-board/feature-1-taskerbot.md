# 🤖 Feature 1: TaskerBot - AI Conversational Assistant

> **Goal**: Create an intelligent bot that understands natural language and acts as a helpful team member.

---

## 📋 Task Overview

| ID | Task | Priority | Status | Est. Hours |
|----|------|----------|--------|------------|
| 1.1 | Bot Registration & Setup | 🔴 High | ✅ DONE | 2h |
| 1.2 | Bot Handlers Structure | 🔴 High | ✅ DONE | 3h |
| 1.3 | Backend NLP Endpoints | 🔴 High | ✅ DONE | 6h |
| 1.4 | Message Handler | 🟡 Medium | ✅ DONE | 4h |
| 1.5 | Mention Handler | 🟡 Medium | ✅ DONE | 3h |
| 1.6 | Welcome/Onboarding Flow | 🟢 Low | ✅ DONE | 2h |
| 1.7 | Context-Aware Suggestions | 🟡 Medium | ⬜ TODO | 5h |
| 1.8 | Proactive Insights | 🟢 Low | ⬜ TODO | 4h |
| 1.9 | Testing & Refinement | 🔴 High | ⬜ TODO | 4h |

**Total Estimated: ~33 hours (1 week)**
**Progress: 6/9 tasks complete (67%)**

---

## 📝 Task Details

### 1.1 Bot Registration & Setup
**Priority**: 🔴 High | **Status**: ⬜ TODO | **Est**: 2h

**Description**: Register TaskerBot in Zoho Cliq Developer Console

**Steps**:
- [ ] Go to Zoho Cliq → Admin Settings → Bots
- [ ] Create new bot named "TaskerBot"
- [ ] Set bot icon (use Tasker logo)
- [ ] Configure bot description and welcome message
- [ ] Note down Bot Unique Name and Access Token
- [ ] Add bot to test channel for development

**Acceptance Criteria**:
- [ ] Bot appears in Cliq's bot list
- [ ] Bot can be added to channels
- [ ] Bot responds to direct messages

**Files to Create**:
```
cliq-scripts/bot/
├── tasker-bot.dg           # Main bot configuration
└── README.md               # Bot documentation
```

**Notes**:
- Bot name must be unique in organization
- Access token needed for webhook authentication

---

### 1.2 Bot Handlers Structure
**Priority**: 🔴 High | **Status**: ⬜ TODO | **Est**: 3h

**Description**: Create the Deluge handler files for all bot events

**Steps**:
- [ ] Create `bot-message-handler.dg` - handles DM conversations
- [ ] Create `bot-mention-handler.dg` - handles @TaskerBot mentions
- [ ] Create `bot-participant-handler.dg` - handles bot added/removed
- [ ] Create `bot-context-handler.dg` - handles contextual actions
- [ ] Create `bot-welcome-handler.dg` - handles first-time users

**Code Template** - `bot-message-handler.dg`:
```deluge
// Bot Message Handler
// Triggered when user sends DM to TaskerBot

response = Map();
messageText = message.get("text");
userId = user.get("id");
userEmail = user.get("email");
userName = user.get("name");

// Log incoming message
info "TaskerBot received message: " + messageText + " from " + userName;

// Call backend for NLP processing
apiUrl = "https://tasker-backend-b10p.onrender.com/api/cliq/bot/message";
headers = Map();
headers.put("Content-Type", "application/json");
headers.put("x-api-key", "YOUR_API_KEY");

payload = Map();
payload.put("message", messageText);
payload.put("userId", userId);
payload.put("userEmail", userEmail);
payload.put("userName", userName);
payload.put("context", "dm");

apiResponse = invokeurl
[
    url: apiUrl
    type: POST
    parameters: payload.toString()
    headers: headers
];

if(apiResponse.get("success"))
{
    response.put("text", apiResponse.get("response"));
    
    // Add buttons if suggested
    if(apiResponse.containsKey("buttons"))
    {
        response.put("buttons", apiResponse.get("buttons"));
    }
}
else
{
    response.put("text", "Sorry, I couldn't process that. Try asking differently!");
}

return response;
```

**Acceptance Criteria**:
- [ ] All handler files created
- [ ] Handlers properly connected to bot
- [ ] Basic echo response working

**Files to Create**:
```
cliq-scripts/bot/
├── bot-message-handler.dg
├── bot-mention-handler.dg
├── bot-participant-handler.dg
├── bot-context-handler.dg
└── bot-welcome-handler.dg
```

---

### 1.3 Backend NLP Endpoints
**Priority**: 🔴 High | **Status**: ⬜ TODO | **Est**: 6h

**Description**: Create backend endpoints for processing natural language

**Steps**:
- [ ] Create `src/controllers/botController.js`
- [ ] Implement `POST /api/cliq/bot/message` - main NLP processor
- [ ] Implement `POST /api/cliq/bot/context` - get conversation context
- [ ] Implement `GET /api/cliq/bot/briefing` - daily briefing data
- [ ] Implement `POST /api/cliq/bot/insights` - user insights
- [ ] Add routes to `src/routes/cliqRoutes.js`
- [ ] Create `src/services/nlpService.js` for NLP logic

**Code Template** - `botController.js`:
```javascript
const logger = require('../config/logger');
const nlpService = require('../services/nlpService');
const taskService = require('../services/taskService');
const cliqService = require('../services/cliqService');

/**
 * Process bot message with NLP
 */
exports.processMessage = async (req, res) => {
  try {
    const { message, userId, userEmail, userName, context } = req.body;
    
    // Map Cliq user to Tasker user
    const taskerId = await cliqService.mapCliqUserToTasker(userId, userEmail);
    
    if (!taskerId) {
      return res.json({
        success: true,
        response: "I don't recognize you yet! Please link your Tasker account first using /tasker link"
      });
    }
    
    // Parse intent from message
    const intent = nlpService.parseIntent(message);
    
    let response;
    switch(intent.action) {
      case 'list_tasks':
        response = await handleListTasks(taskerId, intent);
        break;
      case 'complete_task':
        response = await handleCompleteTask(taskerId, intent);
        break;
      case 'create_task':
        response = await handleCreateTask(taskerId, intent);
        break;
      case 'get_briefing':
        response = await handleBriefing(taskerId);
        break;
      default:
        response = await handleUnknown(message);
    }
    
    return res.json({ success: true, ...response });
    
  } catch (error) {
    logger.error('Bot message processing error:', error);
    return res.status(500).json({
      success: false,
      response: "Oops! Something went wrong. Please try again."
    });
  }
};

/**
 * Get daily briefing
 */
exports.getDailyBriefing = async (req, res) => {
  try {
    const { userId, userEmail } = req.query;
    const taskerId = await cliqService.mapCliqUserToTasker(userId, userEmail);
    
    if (!taskerId) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tasks = await taskService.listTasks({ 
      assignee: taskerId,
      dueBefore: new Date(today.getTime() + 24 * 60 * 60 * 1000)
    });
    
    const overdue = tasks.filter(t => new Date(t.dueDate) < today);
    const dueToday = tasks.filter(t => {
      const due = new Date(t.dueDate);
      return due >= today && due < new Date(today.getTime() + 24 * 60 * 60 * 1000);
    });
    
    return res.json({
      success: true,
      briefing: {
        dueToday: dueToday,
        overdue: overdue,
        totalPending: tasks.filter(t => t.status !== 'completed').length
      }
    });
    
  } catch (error) {
    logger.error('Briefing error:', error);
    return res.status(500).json({ error: 'Failed to get briefing' });
  }
};
```

**Code Template** - `nlpService.js`:
```javascript
/**
 * NLP Service - Parse natural language into intents
 */
class NLPService {
  
  constructor() {
    // Intent patterns
    this.patterns = {
      list_tasks: [
        /what('s| is) on my plate/i,
        /show (me )?my tasks/i,
        /list (my )?tasks/i,
        /what (do i|should i) (do|work on)/i,
        /my tasks/i,
        /tasks (for )?today/i
      ],
      complete_task: [
        /i('m| am) done with (.+)/i,
        /completed? (.+)/i,
        /finished (.+)/i,
        /mark (.+) (as )?(done|complete)/i
      ],
      create_task: [
        /create (a )?task (.+)/i,
        /add (a )?task (.+)/i,
        /remind me to (.+)/i,
        /i need to (.+)/i
      ],
      get_briefing: [
        /good morning/i,
        /briefing/i,
        /what('s| is) (happening|up)/i,
        /summary/i
      ],
      assign_task: [
        /assign (.+) to (.+)/i,
        /give (.+) to (.+)/i
      ]
    };
  }
  
  parseIntent(message) {
    for (const [action, patterns] of Object.entries(this.patterns)) {
      for (const pattern of patterns) {
        const match = message.match(pattern);
        if (match) {
          return {
            action,
            match,
            params: this.extractParams(action, match)
          };
        }
      }
    }
    
    return { action: 'unknown', params: {} };
  }
  
  extractParams(action, match) {
    switch(action) {
      case 'complete_task':
        return { taskName: match[2] || match[1] };
      case 'create_task':
        return { taskTitle: match[2] || match[1] };
      case 'assign_task':
        return { taskName: match[1], assignee: match[2] };
      default:
        return {};
    }
  }
}

module.exports = new NLPService();
```

**Acceptance Criteria**:
- [ ] All endpoints responding correctly
- [ ] Intent parsing working for common phrases
- [ ] User mapping integrated
- [ ] Error handling in place

**Files to Create**:
```
src/
├── controllers/botController.js
├── services/nlpService.js
└── routes/botRoutes.js (or add to cliqRoutes.js)
```

---

### 1.4 Message Handler Implementation
**Priority**: 🟡 Medium | **Status**: ⬜ TODO | **Est**: 4h

**Description**: Implement full DM conversation handling

**Steps**:
- [ ] Handle "list tasks" intent
- [ ] Handle "complete task" intent
- [ ] Handle "create task" intent (with follow-up questions)
- [ ] Handle "assign task" intent
- [ ] Handle unknown intents gracefully
- [ ] Add conversation memory (last 5 messages)
- [ ] Add typing indicator simulation

**Natural Language Examples**:
```
User: "What's on my plate today?"
Bot: "📋 You have 3 tasks due today:
      1. ⚡ Client presentation (11:00 AM)
      2. 🔵 Review PR #45 (2:00 PM)
      3. 🟢 Update docs (EOD)
      
      Which one do you want to focus on?"

User: "I'm done with the presentation"
Bot: "✅ Marked 'Client presentation' as complete! Great job! 🎉
      
      2 tasks remaining for today."

User: "remind me to call John tomorrow"
Bot: "📝 I'll create a task for you:
      Title: Call John
      Due: Tomorrow
      
      [Confirm] [Edit Details] [Cancel]"
```

**Acceptance Criteria**:
- [ ] Can handle 5+ different intents
- [ ] Graceful fallback for unknown messages
- [ ] Confirms actions before executing
- [ ] Shows task details in responses

---

### 1.5 Mention Handler Implementation
**Priority**: 🟡 Medium | **Status**: ⬜ TODO | **Est**: 3h

**Description**: Handle @TaskerBot mentions in channels

**Steps**:
- [ ] Parse @TaskerBot from channel messages
- [ ] Extract command from mention context
- [ ] Support channel-specific queries ("tasks in this project")
- [ ] Post response in thread or channel

**Code Template** - `bot-mention-handler.dg`:
```deluge
// Bot Mention Handler
// Triggered when user mentions @TaskerBot in a channel

response = Map();
mentionText = message.get("text");
channelId = message.get("chat").get("id");
channelName = message.get("chat").get("name");
userId = user.get("id");
userEmail = user.get("email");

// Remove bot mention from text
cleanText = mentionText.replaceAll("@TaskerBot", "").trim();

// Check if this channel is linked to a project
projectId = getProjectFromChannel(channelId);

// Call backend
apiUrl = "https://tasker-backend-b10p.onrender.com/api/cliq/bot/message";
headers = Map();
headers.put("Content-Type", "application/json");
headers.put("x-api-key", "YOUR_API_KEY");

payload = Map();
payload.put("message", cleanText);
payload.put("userId", userId);
payload.put("userEmail", userEmail);
payload.put("context", "channel");
payload.put("channelId", channelId);
payload.put("projectId", projectId);

apiResponse = invokeurl
[
    url: apiUrl
    type: POST
    parameters: payload.toString()
    headers: headers
];

// Format response for channel
if(apiResponse.get("success"))
{
    response.put("text", apiResponse.get("response"));
}
else
{
    response.put("text", "I couldn't process that. Try @TaskerBot help for commands!");
}

return response;
```

**Example Interactions**:
```
User in #marketing-project: "@TaskerBot show tasks"
Bot: "📋 Tasks in Marketing Campaign:
      - ⚡ Social media graphics (assigned: @priya)
      - 🔵 Blog post draft (unassigned)
      - 🟢 Schedule posts (assigned: @john)"

User: "@TaskerBot assign blog post to me"
Bot: "✅ Assigned 'Blog post draft' to @mantra"
```

**Acceptance Criteria**:
- [ ] Responds to @mentions in channels
- [ ] Uses channel context for project scope
- [ ] Supports help command
- [ ] Handles errors gracefully

---

### 1.6 Welcome/Onboarding Flow
**Priority**: 🟢 Low | **Status**: ⬜ TODO | **Est**: 2h

**Description**: Create onboarding experience for new bot users

**Steps**:
- [ ] Detect first-time user
- [ ] Show welcome message with capabilities
- [ ] Guide through account linking
- [ ] Offer quick tutorial

**Welcome Message**:
```
🤖 Hey there! I'm TaskerBot - your productivity assistant!

Here's what I can do:
📋 Show your tasks - "What's on my plate?"
✅ Complete tasks - "I'm done with [task]"
📝 Create tasks - "Remind me to [task]"
📊 Daily briefing - "Good morning!"

💡 Quick Start:
1. First, let's link your Tasker account: /tasker link
2. Then just chat with me naturally!

Type "help" anytime to see all commands.
```

**Acceptance Criteria**:
- [ ] New users see welcome message
- [ ] Clear instructions provided
- [ ] Account linking prompted if needed

---

### 1.7 Context-Aware Suggestions
**Priority**: 🟡 Medium | **Status**: ⬜ TODO | **Est**: 5h

**Description**: Detect task-related content in messages and offer actions

**Steps**:
- [ ] Monitor channel messages (with permission)
- [ ] Detect keywords: "deadline", "due", "by Friday", "urgent", etc.
- [ ] Detect action phrases: "someone needs to", "we should", "don't forget"
- [ ] Offer contextual buttons (Create Task, Set Reminder)
- [ ] Learn from user acceptance/dismissal

**Detection Patterns**:
```javascript
const contextPatterns = {
  deadline: /by (monday|tuesday|...|friday|tomorrow|next week)/i,
  urgent: /(urgent|asap|immediately|critical)/i,
  action: /(someone (should|needs to)|we (need to|should)|don't forget)/i,
  meeting: /(meeting|call|sync|standup) (at|on|tomorrow)/i
};
```

**Contextual Response**:
```
┌─────────────────────────────────────────────────────────────┐
│  John: Can someone review the mockups by Friday?           │
├─────────────────────────────────────────────────────────────┤
│  🤖 TaskerBot (contextual)                                 │
│  I noticed a potential task! Want me to:                   │
│                                                             │
│  [📝 Create Task] [⏰ Set Reminder] [❌ Dismiss]            │
└─────────────────────────────────────────────────────────────┘
```

**Acceptance Criteria**:
- [ ] Detects common task patterns
- [ ] Non-intrusive suggestions
- [ ] Can be dismissed permanently per channel
- [ ] Learns from user behavior

---

### 1.8 Proactive Insights
**Priority**: 🟢 Low | **Status**: ⬜ TODO | **Est**: 4h

**Description**: Bot proactively shares helpful insights

**Steps**:
- [ ] Morning greeting with briefing offer
- [ ] End-of-day summary prompt
- [ ] Overdue task reminders
- [ ] Weekly achievement celebration
- [ ] Idle project alerts

**Insight Types**:
```
Morning (9 AM):
"Good morning, Mantra! ☀️ You have 3 tasks due today. 
Want your daily briefing? [Yes] [Not now]"

Task Overdue:
"Hey! 👋 'Client proposal' is now 2 days overdue. 
[Complete] [Extend deadline] [Reassign]"

Weekly Achievement:
"🎉 Amazing week! You completed 15 tasks. 
That's 40% more than last week! Keep it up! 💪"

Idle Project:
"📦 'Website Redesign' hasn't had activity in 2 weeks.
Want me to show its pending tasks? [Yes] [Archive Project]"
```

**Acceptance Criteria**:
- [ ] Insights are helpful, not annoying
- [ ] Frequency settings available
- [ ] Can opt-out per insight type
- [ ] Insights are actionable

---

### 1.9 Testing & Refinement
**Priority**: 🔴 High | **Status**: ⬜ TODO | **Est**: 4h

**Description**: Test all bot functionality and refine responses

**Steps**:
- [ ] Test all intent patterns
- [ ] Test error handling
- [ ] Test with multiple users
- [ ] Gather feedback and iterate
- [ ] Update NLP patterns based on real usage
- [ ] Document known limitations

**Test Cases**:
| Input | Expected Output | Status |
|-------|-----------------|--------|
| "What's on my plate?" | List of tasks | ⬜ |
| "tasks for today" | Today's tasks | ⬜ |
| "I'm done with homepage" | Complete matching task | ⬜ |
| "remind me to call mom" | Create task prompt | ⬜ |
| "asdfghjkl" | Graceful fallback | ⬜ |
| "help" | Command list | ⬜ |

**Acceptance Criteria**:
- [ ] 90%+ intent recognition accuracy
- [ ] No crashes on malformed input
- [ ] Response time < 2 seconds
- [ ] User feedback incorporated

---

## 🔗 Dependencies

- **Requires**: Backend API running
- **Requires**: Cliq user mapping working
- **Requires**: Task/Project endpoints functional
- **Blocks**: Scheduled Automations (uses briefing logic)
- **Blocks**: Gamification (can use bot for celebrations)

---

## 📚 Resources

- [Zoho Cliq Bot Documentation](https://www.zoho.com/cliq/help/developer-guide/bots.html)
- [Deluge Bot Handlers](https://www.zoho.com/cliq/help/developer-guide/bot-handlers.html)
- [ZOHO_CLIQ_DEVELOPER_GUIDE.md](../docs/ZOHO_CLIQ_DEVELOPER_GUIDE.md)

---

## 📊 Progress Tracker

```
Overall Progress: [██████████░░░░░] 67%

1.1 Bot Setup       [██████████] 100% ✅
1.2 Handlers        [██████████] 100% ✅
1.3 Backend NLP     [██████████] 100% ✅
1.4 Message Handler [██████████] 100% ✅
1.5 Mention Handler [██████████] 100% ✅
1.6 Onboarding      [██████████] 100% ✅
1.7 Context-Aware   [░░░░░░░░░░] 0%
1.8 Proactive       [░░░░░░░░░░] 0%
1.9 Testing         [░░░░░░░░░░] 0%
```

---

## ✅ Implementation Complete

### Files Created:

**Cliq Bot Handlers** (`cliq-scripts/bot/`):
- `README.md` - Bot setup documentation
- `bot-message-handler.dg` - DM conversation handler
- `bot-mention-handler.dg` - @TaskerBot mention handler
- `bot-welcome-handler.dg` - First-time user onboarding
- `bot-participation-handler.dg` - Channel add/remove handler
- `bot-context-handler.dg` - Contextual menu actions

**Cliq Functions** (`cliq-scripts/functions/`):
- `botListTasks-function.dg` - List tasks function
- `botShowHelp-function.dg` - Help message function
- `botGetBriefing-function.dg` - Daily briefing function
- `botCompleteTask-function.dg` - Complete task function
- `botViewTask-function.dg` - View task details function

**Backend Services** (`src/`):
- `services/nlpService.js` - NLP intent parsing
- `controllers/botController.js` - Bot API handlers
- `routes/botRoutes.js` - Bot API routes
- Updated `server.js` to include bot routes

---

*Last Updated: November 2024*
*Feature Owner: TBD*
*Status: In Progress (67%)*
