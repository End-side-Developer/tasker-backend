/**
 * NLP Service - Parse natural language into intents
 * Handles TaskerBot message understanding
 */

const logger = require('../config/logger');
const chrono = require('chrono-node');
const Fuse = require('fuse.js');

class NLPService {
  constructor() {
    // Intent patterns - ordered by specificity (most specific first)
    this.patterns = {
      // Help patterns
      help: [
        /^help$/i,
        /what can you do/i,
        /how (do|can) (i|you)/i,
        /commands?$/i,
        /\?$/,
      ],

      // Greeting patterns  
      greeting: [
        /^(hi|hello|hey|yo|sup)(\s|!|$)/i,
        /^good (morning|afternoon|evening)/i,
        /^howdy/i,
      ],

      // Daily briefing patterns
      get_briefing: [
        /briefing/i,
        /what('s| is| are) (happening|up|new|on my plate)/i,
        /summary/i,
        /daily (update|report|status)/i,
        /morning report/i,
        /today('s)? (tasks?|agenda|schedule)/i,
      ],

      // List tasks patterns
      list_tasks: [
        /show (me )?(my |all )?tasks?/i,
        /list (my |all )?tasks?/i,
        /my tasks?/i,
        /what (do i|should i) (do|work on)/i,
        /pending (tasks?|work)/i,
        /tasks? (for )?(today|tomorrow|this week)/i,
        /what('s| is) (left|remaining|pending)/i,
      ],

      // Complete task patterns
      complete_task: [
        /^(done|completed?|finished?) (with )?(.+)/i,
        /i('m| am|'ve| have) (done|completed?|finished?) (with )?(.+)/i,
        /mark ['"]?(.+?)['"]? (as )?(done|complete|finished)/i,
        /check off ['"]?(.+?)['"]?/i,
        /^✅\s*(.+)/i,
      ],

      // Create task patterns
      create_task: [
        /^(create|add|new) (a )?(task|todo)(:?\s*)(.+)/i,
        /remind me to (.+)/i,
        /i need to (.+)/i,
        /don't (let me )?forget (to )?(.+)/i,
        /^todo:?\s*(.+)/i,
        /^task:?\s*(.+)/i,
      ],

      // Assign task patterns
      assign_task: [
        /assign ['"]?(.+?)['"]? to @?(\w+)/i,
        /give ['"]?(.+?)['"]? to @?(\w+)/i,
        /@(\w+) (should|needs to|can you) (.+)/i,
      ],

      // Project-related patterns
      list_projects: [
        /show (me )?(my |all )?projects?/i,
        /list (my |all )?projects?/i,
        /my projects?/i,
        /what projects?/i,
      ],

      // Stats patterns
      get_stats: [
        /my stats?/i,
        /statistics/i,
        /how (am i|'m i) doing/i,
        /productivity/i,
        /progress/i,
      ],
    };

    // Response templates
    this.responses = {
      help: this.getHelpResponse(),
      greeting: this.getGreetingResponse(),
      unknown: this.getUnknownResponse(),
      not_linked: this.getNotLinkedResponse(),
    };
  }

  /**
   * Parse message and extract intent
   * @param {string} message - Raw message text
   * @returns {object} - Intent object with action and params
   */
  parseIntent(message) {
    if (!message || typeof message !== 'string') {
      return { action: 'unknown', confidence: 0, params: {} };
    }

    const cleanMessage = message.trim();
    
    // Extract entities first (dates, priorities)
    const entities = this.extractEntities(cleanMessage);

    // Check each pattern category
    for (const [action, patterns] of Object.entries(this.patterns)) {
      for (const pattern of patterns) {
        const match = cleanMessage.match(pattern);
        if (match) {
          const params = this.extractParams(action, match, cleanMessage);
          
          // Merge extracted entities with regex params
          const finalParams = { ...params, ...entities };
          
          // Clean up task title if date was extracted from it
          if (finalParams.taskTitle && entities.dateText) {
            finalParams.taskTitle = finalParams.taskTitle.replace(entities.dateText, '').trim();
            // Remove trailing prepositions like "on", "at", "by"
            finalParams.taskTitle = finalParams.taskTitle.replace(/\s+(on|at|by|due)\s*$/i, '');
          }

          logger.debug(`NLP matched: ${action}`, { message: cleanMessage, params: finalParams });
          return {
            action,
            confidence: 0.8,
            match: match[0],
            params: finalParams,
            originalMessage: cleanMessage,
          };
        }
      }
    }

    // No pattern matched
    logger.debug('NLP no match', { message: cleanMessage });
    return {
      action: 'unknown',
      confidence: 0,
      params: {},
      originalMessage: cleanMessage,
    };
  }

  /**
   * Extract entities (dates, priorities) from message
   */
  extractEntities(message) {
    const entities = {};

    // 1. Extract Date/Time using chrono-node
    const parsedDate = chrono.parse(message, new Date(), { forwardDate: true });
    if (parsedDate.length > 0) {
      const dateResult = parsedDate[0];
      entities.dueDate = dateResult.start.date();
      entities.dateText = dateResult.text; // The text that matched the date
      entities.hasTime = dateResult.start.isCertain('hour');
    }

    // 2. Extract Priority
    if (/\b(urgent|asap|high priority|important)\b/i.test(message)) {
      entities.priority = 'high';
    } else if (/\b(low priority|whenever)\b/i.test(message)) {
      entities.priority = 'low';
    }

    return entities;
  }

  /**
   * Extract parameters from regex match based on action type
   */
  extractParams(action, match, fullMessage) {
    switch (action) {
      case 'complete_task':
        // Try different capture groups
        const taskName = match[4] || match[3] || match[1];
        return {
          taskName: taskName ? taskName.trim() : null,
        };

      case 'create_task':
        // Extract task title from various patterns
        const title = match[5] || match[3] || match[1];
        return {
          taskTitle: title ? title.trim() : null,
        };

      case 'assign_task':
        return {
          taskName: match[1] ? match[1].trim() : (match[3] ? match[3].trim() : null),
          assignee: match[2] ? match[2].trim() : null,
        };

      case 'list_tasks':
        // Check for time qualifiers
        const timeMatch = fullMessage.match(/(today|tomorrow|this week)/i);
        return {
          timeFilter: timeMatch ? timeMatch[1].toLowerCase() : null,
        };

      default:
        return {};
    }
  }

  /**
   * Get help response
   */
  getHelpResponse() {
    return {
      text: `🤖 **TaskerBot Commands**\n\n` +
        `📋 **View Tasks**\n` +
        `• "What's on my plate?"\n` +
        `• "Show my tasks"\n` +
        `• "Tasks for today"\n\n` +
        `✅ **Complete Tasks**\n` +
        `• "I'm done with [task name]"\n` +
        `• "Mark [task] as complete"\n` +
        `• "Finished [task name]"\n\n` +
        `📝 **Create Tasks**\n` +
        `• "Create a task [title]"\n` +
        `• "Remind me to [action] tomorrow at 5pm"\n` +
        `• "I need to [action] urgent"\n\n` +
        `📊 **Other**\n` +
        `• "Good morning" - Daily briefing\n` +
        `• "My stats" - View productivity\n` +
        `• "Show projects" - List projects\n\n` +
        `💡 _Just chat naturally - I'll understand!_`,
      buttons: [
        {
          label: '📋 My Tasks',
          type: '+',
          action: { type: 'invoke.function', data: { name: 'botListTasks' } },
        },
        {
          label: '➕ New Task',
          type: '+',
          action: { type: 'invoke.function', data: { name: 'showCreateTaskForm' } },
        },
      ],
    };
  }

  /**
   * Get greeting response
   */
  getGreetingResponse() {
    const greetings = [
      "👋 Hey there! How can I help you today?",
      "Hello! 🙌 Ready to crush some tasks?",
      "Hi! What would you like to work on?",
      "Hey! 👋 Need help with your tasks?",
    ];
    return {
      text: greetings[Math.floor(Math.random() * greetings.length)] +
        "\n\nType **help** to see what I can do!",
    };
  }

  /**
   * Get unknown intent response
   */
  getUnknownResponse() {
    const responses = [
      "🤔 I'm not sure what you mean. Try **help** to see what I can do!",
      "Hmm, I didn't quite get that. Type **help** for available commands!",
      "Sorry, I don't understand. Try asking differently or type **help**!",
    ];
    return {
      text: responses[Math.floor(Math.random() * responses.length)],
      buttons: [
        {
          label: '❓ Help',
          type: '+',
          action: { type: 'invoke.function', data: { name: 'botShowHelp' } },
        },
      ],
    };
  }

  /**
   * Get not linked response
   */
  getNotLinkedResponse() {
    return {
      text: "🔗 I don't recognize you yet!\n\n" +
        "Please link your Tasker account first using `/tasker link`\n\n" +
        "Once linked, I'll be able to help you manage your tasks!",
      buttons: [
        {
          label: '🔗 Link Account',
          type: '+',
          action: { type: 'invoke.function', data: { name: 'showLinkForm' } },
        },
      ],
    };
  }

  /**
   * Format task list for display
   */
  formatTaskList(tasks, context = {}) {
    if (!tasks || tasks.length === 0) {
      return {
        text: "📭 You have no pending tasks!\n\n" +
          "Enjoy the peace, or create a new task to stay productive! 🎉",
        buttons: [
          {
            label: '➕ Create Task',
            type: '+',
            action: { type: 'invoke.function', data: { name: 'showCreateTaskForm' } },
          },
        ],
      };
    }

    const priorityEmoji = {
      urgent: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢',
    };

    const statusEmoji = {
      pending: '⬜',
      in_progress: '🔄',
      completed: '✅',
    };

    let text = `📋 **Your Tasks** (${tasks.length})\n\n`;

    // Group tasks by project
    const personalTasks = tasks.filter(t => !t.projectName);
    const projectTasks = tasks.filter(t => t.projectName);
    
    // Group project tasks by project name
    const tasksByProject = {};
    projectTasks.forEach(task => {
      const projectName = task.projectName;
      if (!tasksByProject[projectName]) {
        tasksByProject[projectName] = [];
      }
      tasksByProject[projectName].push(task);
    });

    // Show personal tasks first
    if (personalTasks.length > 0) {
      text += `**📁 Personal**\n`;
      personalTasks.slice(0, 5).forEach(task => {
        const emoji = priorityEmoji[task.priority] || '📋';
        const status = statusEmoji[task.status] || '⬜';
        const dueText = task.dueDate ? ` • ${this.formatDate(task.dueDate)}` : '';
        text += `${status} ${emoji} ${task.title}${dueText}\n`;
      });
      if (personalTasks.length > 5) {
        text += `   _...+${personalTasks.length - 5} more_\n`;
      }
      text += '\n';
    }

    // Show project tasks grouped by project
    Object.keys(tasksByProject).slice(0, 3).forEach(projectName => {
      const projectTaskList = tasksByProject[projectName];
      text += `**📂 ${projectName}**\n`;
      projectTaskList.slice(0, 3).forEach(task => {
        const emoji = priorityEmoji[task.priority] || '📋';
        const status = statusEmoji[task.status] || '⬜';
        const dueText = task.dueDate ? ` • ${this.formatDate(task.dueDate)}` : '';
        text += `${status} ${emoji} ${task.title}${dueText}\n`;
      });
      if (projectTaskList.length > 3) {
        text += `   _...+${projectTaskList.length - 3} more_\n`;
      }
      text += '\n';
    });

    if (Object.keys(tasksByProject).length > 3) {
      text += `_...and ${Object.keys(tasksByProject).length - 3} more projects_\n`;
    }

    text += `\n\n💡 _Say "done with [task name]" to complete a task_`;

    // Build task buttons for quick actions
    // Note: Zoho Cliq invoke.function only allows "data.name", no custom params
    // So we can't pass taskId via buttons - user can complete via chat instead
    const buttons = [
      {
        label: '➕ New Task',
        type: '+',
        action: { type: 'invoke.function', data: { name: 'showCreateTaskForm' } },
      },
      {
        label: '🔄 Refresh',
        type: '+',
        action: { type: 'invoke.function', data: { name: 'botListTasks' } },
      },
    ];

    return { text, buttons };
  }

  /**
   * Format daily briefing
   */
  formatBriefing(data) {
    const { dueToday = [], overdue = [], totalPending = 0 } = data;

    let text = "☀️ **Good Morning! Here's your briefing:**\n\n";

    // Overdue tasks
    if (overdue.length > 0) {
      text += `⚠️ **Overdue** (${overdue.length})\n`;
      overdue.slice(0, 3).forEach(task => {
        text += `   🔴 ${task.title}\n`;
      });
      if (overdue.length > 3) {
        text += `   _...and ${overdue.length - 3} more_\n`;
      }
      text += '\n';
    }

    // Due today
    if (dueToday.length > 0) {
      text += `📅 **Due Today** (${dueToday.length})\n`;
      dueToday.forEach(task => {
        const emoji = task.priority === 'high' ? '🔥' : '📋';
        text += `   ${emoji} ${task.title}\n`;
      });
      text += '\n';
    } else {
      text += "📅 **Due Today**: Nothing due! 🎉\n\n";
    }

    // Summary
    text += `📊 **Total Pending**: ${totalPending} tasks\n\n`;

    if (overdue.length > 0) {
      text += "💪 _Let's tackle those overdue tasks first!_";
    } else if (dueToday.length > 0) {
      text += "💪 _You've got this! Focus on today's tasks._";
    } else {
      text += "🌟 _All caught up! Great job staying on top of things!_";
    }

    return {
      text,
      buttons: [
        {
          label: '📋 All Tasks',
          type: '+',
          action: { type: 'invoke.function', data: { name: 'botListTasks' } },
        },
        {
          label: '➕ New Task',
          type: '+',
          action: { type: 'invoke.function', data: { name: 'showCreateTaskForm' } },
        },
      ],
    };
  }

  /**
   * Format date for display
   */
  formatDate(timestamp) {
    if (!timestamp) return '';

    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp._seconds) {
      date = new Date(timestamp._seconds * 1000);
    } else {
      date = new Date(timestamp);
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const diffTime = taskDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < -1) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays <= 7) return `In ${diffDays} days`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  /**
   * Find best matching task by name using Fuzzy Search
   */
  findMatchingTask(tasks, searchName) {
    if (!searchName || !tasks || tasks.length === 0) return null;

    const search = searchName.toLowerCase().trim();

    // 1. Exact match (fastest)
    let match = tasks.find(t => t.title.toLowerCase() === search);
    if (match) return match;

    // 2. Fuzzy match using Fuse.js
    const options = {
      keys: ['title'],
      threshold: 0.4, // 0.0 is perfect match, 1.0 is match anything
      includeScore: true
    };

    const fuse = new Fuse(tasks, options);
    const result = fuse.search(search);

    if (result.length > 0) {
      logger.debug(`Fuzzy match found: "${search}" -> "${result[0].item.title}" (score: ${result[0].score})`);
      return result[0].item;
    }

    return null;
  }
}

module.exports = new NLPService();
