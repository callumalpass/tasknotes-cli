const fetch = require('node-fetch');
const config = require('./config');

function createCondition({ property, operator, value }) {
  return {
    type: 'condition',
    id: `cond_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    property,
    operator,
    value
  };
}

function normalizeDateOnly(value) {
  if (typeof value !== 'string') return value;
  const tIndex = value.indexOf('T');
  if (tIndex === -1) return value;
  return value.slice(0, tIndex);
}

function parseBooleanLike(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1';
  return false;
}

function legacyListFiltersToFilterQuery(filters = {}) {
  const query = {
    type: 'group',
    id: `root_${Date.now()}`,
    conjunction: 'and',
    children: []
  };

  // Legacy GET /api/tasks query params are no longer supported for filtering.
  // Convert common CLI filters to POST /api/tasks/query FilterQuery objects.
  if (filters.completed !== undefined) {
    const isCompleted = parseBooleanLike(filters.completed);
    query.children.push(
      createCondition({
        property: 'status.isCompleted',
        operator: isCompleted ? 'is-checked' : 'is-not-checked',
        value: null
      })
    );
  }

  if (filters.archived !== undefined) {
    const isArchived = parseBooleanLike(filters.archived);
    query.children.push(
      createCondition({
        property: 'archived',
        operator: isArchived ? 'is-checked' : 'is-not-checked',
        value: null
      })
    );
  }

  if (filters.project !== undefined && filters.project !== null && String(filters.project).trim()) {
    query.children.push(
      createCondition({
        property: 'projects',
        operator: 'contains',
        value: String(filters.project)
      })
    );
  }

  if (filters.scheduled_after !== undefined && filters.scheduled_after !== null && String(filters.scheduled_after).trim()) {
    query.children.push(
      createCondition({
        property: 'scheduled',
        operator: 'is-on-or-after',
        value: normalizeDateOnly(String(filters.scheduled_after))
      })
    );
  }

  if (filters.scheduled_before !== undefined && filters.scheduled_before !== null && String(filters.scheduled_before).trim()) {
    query.children.push(
      createCondition({
        property: 'scheduled',
        operator: 'is-on-or-before',
        value: normalizeDateOnly(String(filters.scheduled_before))
      })
    );
  }

  if (filters.due_before !== undefined && filters.due_before !== null && String(filters.due_before).trim()) {
    query.children.push(
      createCondition({
        property: 'due',
        operator: 'is-before',
        value: String(filters.due_before)
      })
    );
  }

  return query;
}

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
    const { limit, ...legacyFilters } = filters || {};
    const filterQuery = legacyListFiltersToFilterQuery(legacyFilters);
    const result = await this.queryTasks(filterQuery);

    if (limit !== undefined && limit !== null) {
      const parsedLimit = parseInt(limit, 10);
      if (!Number.isNaN(parsedLimit) && parsedLimit >= 0 && Array.isArray(result.tasks)) {
        return { ...result, tasks: result.tasks.slice(0, parsedLimit) };
      }
    }

    return result;
  }

  async queryTasks(filterQuery) {
    return this.request('/api/tasks/query', {
      method: 'POST',
      body: JSON.stringify(filterQuery)
    });
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
    return this.listTasks({ 
      limit: 50,
      // Add search functionality when API supports it
    });
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
