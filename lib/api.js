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
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value);
      }
    });

    const queryString = params.toString();
    const endpoint = `/api/tasks${queryString ? `?${queryString}` : ''}`;
    
    return this.request(endpoint);
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