// const BASE_URL = 'http://localhost:8000/api';
const BASE_URL = process.env.REACT_APP_API_URL;

const getHeaders = () => {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  // Authentication
  register: async (username, email, password) => {
    const response = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ username, email, password }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.detail || 'Registration failed');
    }
    return response.json();
  },

  login: async (username, password) => {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.detail || 'Login failed');
    }
    const data = await response.json();
    localStorage.setItem('token', data.access_token);
    return data;
  },

  logout: () => {
    localStorage.removeItem('token');
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  // Programs API
  createProgram: async (language, prompt) => {
    const response = await fetch(`${BASE_URL}/programs`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ language, prompt }),
    });
    if (!response.ok) throw new Error('Failed to generate program');
    return response.json();
  },

  getPrograms: async () => {
    const response = await fetch(`${BASE_URL}/programs`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to load programs list');
    return response.json();
  },

  // Bugs API
  fixBug: async (language, buggyCode, errorLogs = '') => {
    const response = await fetch(`${BASE_URL}/bugs`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ language, buggy_code: buggyCode, error_logs: errorLogs }),
    });
    if (!response.ok) throw new Error('Failed to resolve bug fix');
    return response.json();
  },

  submitBugIntervention: async (bugId, fixedCode, status = 'success') => {
    const response = await fetch(`${BASE_URL}/bugs/${bugId}/intervention`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ fixed_code: fixedCode, status }),
    });
    if (!response.ok) throw new Error('Failed to submit manual intervention');
    return response.json();
  },

  getBugs: async () => {
    const response = await fetch(`${BASE_URL}/bugs`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to retrieve bug fix log');
    return response.json();
  },

  // Projects API
  createProject: async (name, description, stack, buildOnly = true) => {
    const response = await fetch(`${BASE_URL}/projects`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, description, stack, build_only: buildOnly }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to initialize project build');
    }
    return response.json();
  },

  getProjects: async () => {
    const response = await fetch(`${BASE_URL}/projects`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch projects');
    return response.json();
  },

  getProject: async (projectId) => {
    const response = await fetch(`${BASE_URL}/projects/${projectId}`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to retrieve project details');
    return response.json();
  },

  getProjectGraph: async (projectId) => {
    const response = await fetch(`${BASE_URL}/projects/${projectId}/graph`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to retrieve active workflow state');
    return response.json();
  },

  submitProjectIntervention: async (projectId, action) => {
    const response = await fetch(`${BASE_URL}/projects/${projectId}/intervention?action=${action}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to process project intervention');
    return response.json();
  },

  redeployProject: async (projectId) => {
    const response = await fetch(`${BASE_URL}/projects/${projectId}/redeploy`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to trigger redeployment');
    return response.json();
  },

  queryProjectRAG: async (projectId, query) => {
    const response = await fetch(`${BASE_URL}/projects/${projectId}/query`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ query }),
    });
    if (!response.ok) throw new Error('Failed to execute vector search query');
    return response.json();
  },

  getProjectMonitoring: async (projectId) => {
    const response = await fetch(`${BASE_URL}/projects/${projectId}/monitoring`, {
      headers: getHeaders(),
    });
    if (!response.ok) throw new Error('Failed to retrieve monitoring telemetry');
    return response.json();
  }
};
