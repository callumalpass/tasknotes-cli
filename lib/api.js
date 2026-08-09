const fetch = require('node-fetch');
const config = require('./config');

class TaskNotesAPI {
  constructor() {
    this.config = config.get();
  }

  get baseURL() {
    const { host, port } = this.config;
    return `http://${host}:${port}`;
  }

  get headers() {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    }
    
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'API request failed');
      }

      return data.data;
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to TaskNotes API at ${this.baseURL}. Make sure TaskNotes is running with API enabled.`);
      }
      throw error;
    }
  }

  async health() {
    return this.request('/api/health');
  }

  async parseText(text) {
    return this.request('/api/nlp/parse', {
      method: 'POST',
      body: JSON.stringify({ text })
    });
  }

  async createTask(text) {
    return this.request('/api/nlp/create', {
      method: 'POST',
      body: JSON.stringify({ text })
    });
  }

  async createTaskFromData(taskData) {
    return this.request('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  }

  async listTasks(filters = {}) {
    // Use GET /api/tasks (no params) and filter client-side
    // POST /api/tasks/query has a bug in the current plugin version
    const result = await this.getAllTasks();
    let tasks = result.tasks || [];
    const total = tasks.length;
    
    // Apply client-side filters
    if (filters.completed === 'true') {
      tasks = tasks.filter(t => t.status === 'done');
    } else if (filters.completed === 'false') {
      tasks = tasks.filter(t => t.status !== 'done');
    }
    
    if (filters.scheduled_after) {
      const afterDate = filters.scheduled_after.split('T')[0];
      tasks = tasks.filter(t => t.scheduled && t.scheduled >= afterDate);
    }
    if (filters.scheduled_before) {
      const beforeDate = filters.scheduled_before.split('T')[0];
      tasks = tasks.filter(t => t.scheduled && t.scheduled <= beforeDate);
    }
    if (filters.due_before) {
      const beforeDate = filters.due_before.split('T')[0];
      tasks = tasks.filter(t => t.due && t.due < beforeDate);
    }
    
    // Apply limit
    const limit = filters.limit || 200;
    if (tasks.length > limit) {
      tasks = tasks.slice(0, limit);
    }
    
    return {
      tasks,
      total,
      filtered: tasks.length,
      vault: result.vault
    };
  }

  async getAllTasks() {
    // GET /api/tasks without parameters returns all tasks
    return this.request('/api/tasks');
  }

  async queryTasks(filterQuery) {
    // Use getAllTasks and filter client-side since POST /api/tasks/query is buggy
    const result = await this.getAllTasks();
    let tasks = result.tasks || [];
    const total = tasks.length;
    
    // Handle FilterParser AST format (type: 'group', children: [...])
    if (filterQuery.type === 'group' && filterQuery.children) {
      tasks = tasks.filter(task => this.evaluateGroup(task, filterQuery));
    }
    // Handle simple conditions array format
    else if (filterQuery.conditions && filterQuery.conditions.length > 0) {
      tasks = tasks.filter(task => {
        return filterQuery.conditions.every(condition => 
          this.evaluateCondition(task, condition)
        );
      });
    }
    
    // Apply limit
    const limit = filterQuery.limit || 200;
    if (tasks.length > limit) {
      tasks = tasks.slice(0, limit);
    }
    
    return {
      tasks,
      total,
      filtered: tasks.length,
      vault: result.vault
    };
  }

  evaluateGroup(task, group) {
    const { conjunction, children } = group;
    
    if (!children || children.length === 0) {
      return true;
    }
    
    if (conjunction === 'or') {
      return children.some(child => this.evaluateNode(task, child));
    } else {
      // Default to AND
      return children.every(child => this.evaluateNode(task, child));
    }
  }

  evaluateNode(task, node) {
    if (node.type === 'group') {
      return this.evaluateGroup(task, node);
    } else if (node.type === 'condition') {
      return this.evaluateCondition(task, node);
    }
    return true;
  }

  evaluateCondition(task, condition) {
    const { property, operator, value } = condition;
    const taskValue = task[property];
    
    switch (operator) {
      case 'is':
        if (Array.isArray(taskValue)) {
          return taskValue.some(v => v.toLowerCase() === value.toLowerCase());
        }
        return taskValue && taskValue.toLowerCase() === value.toLowerCase();
      case 'is-not':
        if (Array.isArray(taskValue)) {
          return !taskValue.some(v => v.toLowerCase() === value.toLowerCase());
        }
        return !taskValue || taskValue.toLowerCase() !== value.toLowerCase();
      case 'contains':
        if (Array.isArray(taskValue)) {
          return taskValue.some(v => v.toLowerCase().includes(value.toLowerCase()));
        }
        return taskValue && taskValue.toLowerCase().includes(value.toLowerCase());
      case 'does-not-contain':
        if (Array.isArray(taskValue)) {
          return !taskValue.some(v => v.toLowerCase().includes(value.toLowerCase()));
        }
        return !taskValue || !taskValue.toLowerCase().includes(value.toLowerCase());
      case 'is-before':
      case 'before':
        return taskValue && taskValue < value;
      case 'is-after':
      case 'after':
        return taskValue && taskValue > value;
      case 'is-on-or-before':
      case 'on-or-before':
        return taskValue && taskValue <= value;
      case 'is-on-or-after':
      case 'on-or-after':
        return taskValue && taskValue >= value;
      case 'is-empty':
      case 'empty':
        return !taskValue || (Array.isArray(taskValue) && taskValue.length === 0);
      case 'is-not-empty':
      case 'not-empty':
        return taskValue && (!Array.isArray(taskValue) || taskValue.length > 0);
      case 'is-greater-than':
      case 'greater-than':
        return taskValue && parseFloat(taskValue) > parseFloat(value);
      case 'is-less-than':
      case 'less-than':
        return taskValue && parseFloat(taskValue) < parseFloat(value);
      default:
        return true;
    }
  }

  async getTask(taskId) {
    return this.request(`/api/tasks/${encodeURIComponent(taskId)}`);
  }

  async updateTask(taskId, updates) {
    return this.request(`/api/tasks/${encodeURIComponent(taskId)}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteTask(taskId) {
    return this.request(`/api/tasks/${encodeURIComponent(taskId)}`, {
      method: 'DELETE'
    });
  }

  async toggleTaskStatus(taskId) {
    return this.request(`/api/tasks/${encodeURIComponent(taskId)}/toggle-status`, {
      method: 'POST'
    });
  }

  async toggleArchive(taskId) {
    return this.request(`/api/tasks/${encodeURIComponent(taskId)}/archive`, {
      method: 'POST'
    });
  }

  async completeRecurringInstance(taskId, instanceDate) {
    return this.request(`/api/tasks/${encodeURIComponent(taskId)}/complete-instance`, {
      method: 'POST',
      body: JSON.stringify({ instanceDate })
    });
  }

  async searchTasks(query) {
    // Search using title contains - client-side filtering
    const result = await this.getAllTasks();
    let tasks = result.tasks || [];
    const queryLower = query.toLowerCase();
    
    tasks = tasks.filter(t => 
      t.title && t.title.toLowerCase().includes(queryLower)
    );
    
    // Limit to 50 results
    if (tasks.length > 50) {
      tasks = tasks.slice(0, 50);
    }
    
    return {
      tasks,
      total: result.tasks.length,
      filtered: tasks.length,
      vault: result.vault
    };
  }

  async getFilterOptions() {
    return this.request('/api/filter-options');
  }

  async getStats() {
    return this.request('/api/stats');
  }

  // Time tracking methods
  async startTimer(taskId) {
    return this.request(`/api/tasks/${encodeURIComponent(taskId)}/time/start`, {
      method: 'POST'
    });
  }

  async stopTimer(taskId) {
    return this.request(`/api/tasks/${encodeURIComponent(taskId)}/time/stop`, {
      method: 'POST'
    });
  }

  async getTimerStatus() {
    return this.request('/api/time/active');
  }

  async getTimeLog(filters = {}) {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value);
      }
    });

    const queryString = params.toString();
    const endpoint = `/api/time/summary${queryString ? `?${queryString}` : ''}`;
    
    return this.request(endpoint);
  }

  async getTaskTimeData(taskId) {
    return this.request(`/api/tasks/${encodeURIComponent(taskId)}/time`);
  }

  // Pomodoro methods
  async startPomodoro(params = {}) {
    return this.request('/api/pomodoro/start', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  async stopPomodoro() {
    return this.request('/api/pomodoro/stop', {
      method: 'POST'
    });
  }

  async pausePomodoro() {
    return this.request('/api/pomodoro/pause', {
      method: 'POST'
    });
  }

  async resumePomodoro() {
    return this.request('/api/pomodoro/resume', {
      method: 'POST'
    });
  }

  async getPomodoroStatus() {
    return this.request('/api/pomodoro/status');
  }

  async getPomodoroStats(filters = {}) {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value);
      }
    });

    const queryString = params.toString();
    const endpoint = `/api/pomodoro/stats${queryString ? `?${queryString}` : ''}`;
    
    return this.request(endpoint);
  }

  async getPomodoroSessions(filters = {}) {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value);
      }
    });

    const queryString = params.toString();
    const endpoint = `/api/pomodoro/sessions${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  // Calendar methods
  async getCalendars() {
    return this.request('/api/calendars');
  }

  async getGoogleCalendars() {
    return this.request('/api/calendars/google');
  }

  async getMicrosoftCalendars() {
    return this.request('/api/calendars/microsoft');
  }

  async getCalendarSubscriptions() {
    return this.request('/api/calendars/subscriptions');
  }

  async getCalendarEvents(filters = {}) {
    const params = new URLSearchParams();

    if (filters.start) {
      params.append('start', filters.start);
    }
    if (filters.end) {
      params.append('end', filters.end);
    }

    const queryString = params.toString();
    const endpoint = `/api/calendars/events${queryString ? `?${queryString}` : ''}`;

    return this.request(endpoint);
  }

  // Test connection and auto-configure if needed
  async testConnection() {
    try {
      await this.health();
      return true;
    } catch (error) {
      return false;
    }
  }

  // Auto-discover TaskNotes API on local network
  async autoDiscover() {
    const commonPorts = [8080, 3000, 8000, 8081];
    const commonHosts = ['localhost', '127.0.0.1'];
    
    for (const host of commonHosts) {
      for (const port of commonPorts) {
        try {
          const tempAPI = new TaskNotesAPI();
          tempAPI.config = { ...this.config, host, port };
          
          await tempAPI.health();
          
          // Found working configuration
          config.set({ host, port });
          this.config = config.get();
          return { host, port };
        } catch (error) {
          // Continue trying
        }
      }
    }
    
    throw new Error('Could not auto-discover TaskNotes API');
  }
}

module.exports = TaskNotesAPI;