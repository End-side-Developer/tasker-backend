/**
 * Card Formatter Utility
 * Formats data into Zoho Cliq card format for rich UI responses
 */

/**
 * Format Task Card
 */
exports.formatTaskCard = (task, action = 'created') => {
  const priorityEmoji = {
    low: '🟢',
    medium: '🟡',
    high: '🟠',
    urgent: '🔴'
  };

  const statusEmoji = {
    pending: '⏳',
    in_progress: '🔄',
    completed: '✅',
    cancelled: '❌'
  };

  let title = '';
  let theme = 'modern-inline';

  switch (action) {
    case 'created':
      title = '✅ Task Created';
      break;
    case 'assigned':
      title = '👤 Task Assigned';
      break;
    case 'completed':
      title = '🎉 Task Completed';
      theme = 'modern';
      break;
    default:
      title = '📋 Task Details';
  }

  const card = {
    theme,
    title,
    thumbnail: priorityEmoji[task.priority] || '📋',
    data: {
      'Task': task.title,
      'Status': `${statusEmoji[task.status]} ${task.status}`,
      'Priority': `${priorityEmoji[task.priority]} ${task.priority}`,
    }
  };

  if (task.assignedToName) {
    card.data['Assigned To'] = task.assignedToName;
  }

  if (task.dueDate) {
    const dueDate = new Date(task.dueDate);
    card.data['Due Date'] = dueDate.toLocaleDateString();
  }

  if (task.projectId) {
    card.data['Project'] = task.projectId;
  }

  // Add buttons
  card.buttons = [
    {
      label: 'View Details',
      type: '+',
      action: {
        type: 'open.url',
        data: {
          web: `https://tasker.app/tasks/${task.taskId}`
        }
      }
    }
  ];

  if (task.status !== 'completed') {
    card.buttons.push({
      label: 'Mark Complete',
      type: '+',
      action: {
        type: 'invoke.function',
        data: {
          name: 'completeTask',
          id: task.taskId
        }
      }
    });
  }

  return card;
};

/**
 * Format Project Card
 */
exports.formatProjectCard = (project, action = 'created') => {
  const title = action === 'created' ? '✅ Project Created' : '📁 Project Details';

  const card = {
    theme: 'modern-inline',
    title,
    thumbnail: project.icon || '📁',
    data: {
      'Project': project.name,
      'Owner': project.ownerName || 'Unknown',
      'Members': `${project.members?.length || 0} member(s)`
    }
  };

  if (project.description) {
    card.data['Description'] = project.description;
  }

  card.buttons = [
    {
      label: 'View Project',
      type: '+',
      action: {
        type: 'open.url',
        data: {
          web: `https://tasker.app/projects/${project.projectId}`
        }
      }
    },
    {
      label: 'Add Task',
      type: '+',
      action: {
        type: 'invoke.function',
        data: {
          name: 'addTask',
          projectId: project.projectId
        }
      }
    }
  ];

  return card;
};

/**
 * Format List Card (for multiple items)
 */
exports.formatListCard = (items, type = 'tasks', filters = {}) => {
  const typeConfig = {
    tasks: {
      icon: '📋',
      title: 'Tasks',
      emptyMessage: 'No tasks found'
    },
    projects: {
      icon: '📁',
      title: 'Projects',
      emptyMessage: 'No projects found'
    },
    search: {
      icon: '🔍',
      title: 'Search Results',
      emptyMessage: 'No results found'
    }
  };

  const config = typeConfig[type] || typeConfig.tasks;
  const count = items.length;

  if (count === 0) {
    return {
      theme: 'modern-inline',
      title: `${config.icon} ${config.emptyMessage}`,
      data: {
        'Result': config.emptyMessage
      }
    };
  }

  const card = {
    theme: 'modern',
    title: `${config.icon} ${config.title} (${count})`,
    data: {}
  };

  // Add filter info if present
  if (filters.status) card.data['Filter: Status'] = filters.status;
  if (filters.priority) card.data['Filter: Priority'] = filters.priority;
  if (filters.query) card.data['Search Query'] = filters.query;

  // Show first 5 items
  const displayItems = items.slice(0, 5);
  
  displayItems.forEach((item, index) => {
    const key = `${index + 1}. ${item.title || item.name}`;
    let value = '';

    if (type === 'tasks') {
      const priorityEmoji = {
        low: '🟢',
        medium: '🟡',
        high: '🟠',
        urgent: '🔴'
      };
      value = `${priorityEmoji[item.priority]} ${item.status}`;
      if (item.assignedToName) {
        value += ` → ${item.assignedToName}`;
      }
    } else if (type === 'projects') {
      value = `${item.icon || '📁'} ${item.members?.length || 0} members`;
    }

    card.data[key] = value;
  });

  if (count > 5) {
    card.data[''] = `... and ${count - 5} more`;
  }

  // Add view all button
  card.buttons = [
    {
      label: 'View All',
      type: '+',
      action: {
        type: 'open.url',
        data: {
          web: `https://tasker.app/${type}`
        }
      }
    }
  ];

  return card;
};

/**
 * Format Error Card
 */
exports.formatErrorCard = (message, details = null) => {
  const card = {
    theme: 'modern-inline',
    title: '❌ Error',
    data: {
      'Message': message
    }
  };

  if (details) {
    card.data['Details'] = details;
  }

  return card;
};

/**
 * Format Success Card
 */
exports.formatSuccessCard = (message, data = {}) => {
  return {
    theme: 'modern-inline',
    title: '✅ Success',
    data: {
      'Message': message,
      ...data
    }
  };
};
