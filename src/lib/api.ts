/// <reference types="vite/client" />
/**
 * XentralDesk API Client
 * Centralized communication layer with the backend.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL;

class APIClient {
  private accessToken: string | null = localStorage.getItem('xentraldesk_token');

  setToken(token: string | null) {
    this.accessToken = token;
    if (token) {
      localStorage.setItem('xentraldesk_token', token);
    } else {
      localStorage.removeItem('xentraldesk_token');
    }
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  private getHeaders(isFormData: boolean = false) {
    return {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(this.accessToken ? { 'Authorization': `Bearer ${this.accessToken}` } : {}),
    };
  }

  async request(endpoint: string, options: RequestInit = {}) {
    // Normalize URL to avoid double slashes
    const url = `${API_BASE_URL}${endpoint}`.replace(/([^:]\/)\/+/g, "$1");
    
    const isFormData = options.body instanceof FormData;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(isFormData),
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 401 && !endpoint.includes('/auth/')) {
        this.auth.logout();
        window.location.href = '/login';
        return null;
      }

      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || response.statusText);
    }

    if (response.status === 204) return null;
    return response.json();
  }

  // Auth
  auth = {
    login: async (data: any) => {
      const res = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (res.tokens?.access_token) {
        this.setToken(res.tokens.access_token);
      }
      return res;
    },
    register: async (data: any) => {
      const res = await this.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (res.tokens?.access_token) {
        this.setToken(res.tokens.access_token);
      }
      return res;
    },
    logout: () => {
      this.setToken(null);
    }
  };

  // CRM: Contacts
  contacts = {
    list: (workspaceId: string, page = 1, size = 20) => 
      this.request(`/contacts/?workspace_id=${workspaceId}&page=${page}&size=${size}`),
    get: (id: string) => this.request(`/contacts/${id}`),
    create: (workspaceId: string, data: any) => 
      this.request(`/contacts/?workspace_id=${workspaceId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) => 
      this.request(`/contacts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) => this.request(`/contacts/${id}`, { method: 'DELETE' }),
  };

  // CRM: Companies
  companies = {
    list: (workspaceId: string, page = 1, size = 20) => 
      this.request(`/companies/?workspace_id=${workspaceId}&page=${page}&size=${size}`),
    create: (workspaceId: string, data: any) => 
      this.request(`/companies/?workspace_id=${workspaceId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  };

  // Team
  team = {
    members: (workspaceId: string) => this.request(`/team/${workspaceId}/members`),
    invites: (workspaceId: string) => this.request(`/team/${workspaceId}/invites`),
    invite: (workspaceId: string, data: any) =>
      this.request(`/team/${workspaceId}/invite`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateRole: (workspaceId: string, userId: string, role: string) => 
      this.request(`/team/${workspaceId}/members/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    removeMember: (workspaceId: string, userId: string) =>
      this.request(`/team/${workspaceId}/members/${userId}`, { method: 'DELETE' }),
    revokeInvite: (workspaceId: string, inviteId: string) =>
      this.request(`/team/${workspaceId}/invites/${inviteId}`, { method: 'DELETE' }),
    currentMember: (workspaceId: string) =>
      this.request(`/team/${workspaceId}/me`),
  };

  // Settings
  settings = {
    getBusinessHours: (workspaceId: string) => this.request(`/settings/business-hours/${workspaceId}`),
    updateBusinessHours: (workspace_id: string, data: any[]) => 
      this.request(`/settings/business-hours/${workspace_id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
  };
  
  // Workspaces
  workspaces = {
    list: () => this.request('/workspaces'),
    get: (id: string) => this.request(`/workspaces/${id}`),
    create: (data: any) => this.request('/workspaces', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    getInvite: (token: string) => this.request(`/workspaces/invites/${token}`),
    acceptInvite: (token: string) => this.request(`/workspaces/invites/accept?token=${token}`, {
      method: 'POST',
    }),
  };

  // Onboarding
  onboarding = {
    setup: (data: {
      workspace_name: string;
      industry?: string;
      ai_agent_name?: string;
      ai_tone?: string;
    }) => this.request('/onboarding/setup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  };

  // API Keys
  apiKeys = {
    list: (workspaceId: string) => this.request(`/api-keys/${workspaceId}`),
    create: (workspaceId: string, name: string) => 
      this.request(`/api-keys/${workspaceId}`, {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    delete: (id: string) => this.request(`/api-keys/${id}`, { method: 'DELETE' }),
  };

  // Channels
  channels = {
    list: (workspaceId: string) => this.request(`/channels/?workspace_id=${workspaceId}`),
    get: (id: string) => this.request(`/channels/${id}`),
    create: (workspaceId: string, data: any) => 
      this.request(`/channels/?workspace_id=${workspaceId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: any) => 
      this.request(`/channels/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) => this.request(`/channels/${id}`, { method: 'DELETE' }),
    stats: (id: string) => this.request(`/channels/${id}/stats`),
    verify: (id: string) => this.request(`/channels/${id}/verify`, { method: 'POST' }),
    sync: (id: string) => this.request(`/channels/${id}/sync`, { method: 'POST' }),
  };

  // Widget
  widget = {
    getConfig: (workspaceId: string) => this.request(`/widget/${workspaceId}/config`),
    saveConfig: (workspaceId: string, data: any) => 
      this.request(`/widget/${workspaceId}/config`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  };

  // Uploads
  uploads = {
    file: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${API_BASE_URL}/uploads`, {
        method: 'POST',
        headers: {
          ...(this.accessToken ? { 'Authorization': `Bearer ${this.accessToken}` } : {}),
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
        throw new Error(error.detail || response.statusText);
      }

      return response.json();
    }
  };

  // Conversations
  conversations = {
    list: (workspace_id: string, status?: string) => 
      this.request(`/conversations/?workspace_id=${workspace_id}${status ? `&status=${status}` : ''}`),
    getMessages: (conversation_id: string) => 
      this.request(`/conversations/${conversation_id}/messages`),
    sendMessage: (conversation_id: string, body: string, is_internal: boolean = false, message_type: string = "text") => 
      this.request(`/conversations/${conversation_id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body, is_internal, message_type }),
      }),
    markAsRead: (conversation_id: string) => 
      this.request(`/conversations/${conversation_id}/read`, {
        method: 'POST',
      }),
  };

  // Knowledge
  knowledge = {
    sources: {
      list: (workspaceId: string) => this.request(`/workspaces/${workspaceId}/knowledge/sources`),
      get: (workspaceId: string, id: string) => this.request(`/workspaces/${workspaceId}/knowledge/sources/${id}`),
      create: (workspaceId: string, data: any) => this.request(`/workspaces/${workspaceId}/knowledge/sources`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      update: (workspaceId: string, id: string, data: any) => this.request(`/workspaces/${workspaceId}/knowledge/sources/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
      delete: (workspaceId: string, id: string) => this.request(`/workspaces/${workspaceId}/knowledge/sources/${id}`, {
        method: 'DELETE',
      }),
      sync: (workspaceId: string, id: string) => this.request(`/workspaces/${workspaceId}/knowledge/sources/${id}/sync`, {
        method: 'POST',
      }),
      // Legacy upload endpoint (kept for backward compat)
      uploadFile: (workspaceId: string, id: string, file: File, parentId?: string) => {
        const formData = new FormData();
        formData.append('file', file);
        if (parentId) formData.append('parent_id', parentId);
        
        return this.request(`/workspaces/${workspaceId}/knowledge/sources/${id}/upload`, {
          method: 'POST',
          body: formData,
        });
      },
    },
    documents: {
      list: (workspaceId: string, params?: { source_id?: string; folder_id?: string; status_filter?: string }) => {
        const searchParams = new URLSearchParams();
        if (params?.source_id) searchParams.append('source_id', params.source_id);
        if (params?.folder_id) searchParams.append('folder_id', params.folder_id);
        if (params?.status_filter) searchParams.append('status_filter', params.status_filter);
        
        const queryString = searchParams.toString();
        return this.request(`/workspaces/${workspaceId}/knowledge/documents${queryString ? `?${queryString}` : ''}`);
      },
      get: (workspaceId: string, id: string) => this.request(`/workspaces/${workspaceId}/knowledge/documents/${id}`),
      delete: (workspaceId: string, id: string) => this.request(`/workspaces/${workspaceId}/knowledge/documents/${id}`, {
        method: 'DELETE',
      }),
      upload: (workspaceId: string, file: File, sourceId?: string, folderId?: string) => {
        const formData = new FormData();
        formData.append('file', file);
        if (sourceId) formData.append('source_id', sourceId);
        if (folderId) formData.append('folder_id', folderId);

        return this.request(`/workspaces/${workspaceId}/knowledge/documents/upload`, {
          method: 'POST',
          body: formData,
        });
      },
      update: (workspaceId: string, id: string, data: { title?: string; usage_agent?: boolean; usage_copilot?: boolean; usage_help_center?: boolean }) => 
        this.request(`/workspaces/${workspaceId}/knowledge/documents/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),
    },
    folders: {
      list: (workspaceId: string, parentId?: string) => {
        const searchParams = new URLSearchParams();
        if (parentId) searchParams.append('parent_id', parentId);
        const queryString = searchParams.toString();
        return this.request(`/workspaces/${workspaceId}/knowledge/folders${queryString ? `?${queryString}` : ''}`);
      },
      create: (workspaceId: string, data: { name: string; parent_id?: string }) => this.request(`/workspaces/${workspaceId}/knowledge/folders`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      update: (workspaceId: string, id: string, data: { name?: string; parent_id?: string; usage_agent?: boolean; usage_copilot?: boolean; usage_help_center?: boolean }) => 
        this.request(`/workspaces/${workspaceId}/knowledge/folders/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        }),
      delete: (workspaceId: string, id: string) => this.request(`/workspaces/${workspaceId}/knowledge/folders/${id}`, {
        method: 'DELETE',
      }),
      assignDocument: (workspaceId: string, folderId: string, documentId: string) => this.request(`/workspaces/${workspaceId}/knowledge/folders/${folderId}/documents`, {
        method: 'POST',
        body: JSON.stringify({ document_id: documentId }),
      }),
      removeDocument: (workspaceId: string, folderId: string, documentId: string) => this.request(`/workspaces/${workspaceId}/knowledge/folders/${folderId}/documents/${documentId}`, {
        method: 'DELETE',
      }),
    },
    notion: {
      authorizeUrl: (workspaceId: string) => `${API_BASE_URL}/notion/authorize?workspace_id=${workspaceId}`.replace(/([^:]\/)\/+/g, "$1"),
      sync: (sourceId: string) => this.request(`/notion/sync/${sourceId}`, { method: 'POST' }),
    },
    search: {
      semantic: (workspaceId: string, query: string, topK: number = 5) => 
        this.request(`/search/knowledge?workspace_id=${workspaceId}&query=${encodeURIComponent(query)}&top_k=${topK}`, {
          method: 'POST',
        }),
    }
  };

  // AI
  ai = {
    query: (workspaceId: string, query: string, folderId?: string) => 
      this.request('/ai/query', {
        method: 'POST',
        body: JSON.stringify({
          workspace_id: workspaceId,
          query: query,
          folder_id: folderId
        }),
      }),
  };

  // WhatsApp QR Bridge
  whatsappQr = {
    getQr: () => this.request('/whatsapp-qr/qr'),
    getStatus: () => this.request('/whatsapp-qr/status'),
    logout: () => this.request('/whatsapp-qr/logout', { method: 'POST' }),
    clearSession: () => this.request('/whatsapp-qr/clear', { method: 'POST' }),
  };
}

export const api = new APIClient();
