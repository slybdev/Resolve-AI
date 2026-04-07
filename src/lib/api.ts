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
    },
    getMe: async () => this.request('/auth/me'),
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
    members: (workspaceId: string, teamId?: string) => 
      this.request(`/team/${workspaceId}/members${teamId ? `?team_id=${teamId}` : ''}`),
    invites: (workspaceId: string) => this.request(`/team/${workspaceId}/invites`),
    invite: (workspaceId: string, data: { email: string, role: string, allowed_pages: string[], team_id?: string }) =>
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
    getFunctionalTeams: (workspaceId: string) =>
      this.request(`/team/${workspaceId}/functional`),
    createFunctionalTeam: (workspaceId: string, data: { name: string, description?: string, allowed_pages: string[] }) =>
      this.request(`/team/${workspaceId}/functional`, {
        method: 'POST',
        body: JSON.stringify({ ...data, workspace_id: workspaceId }),
      }),
    updateFunctionalTeam: (workspaceId: string, teamId: string, data: { name?: string, description?: string, allowed_pages?: string[] }) =>
      this.request(`/team/${workspaceId}/functional/${teamId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    deleteFunctionalTeam: (workspaceId: string, teamId: string) =>
      this.request(`/team/${workspaceId}/functional/${teamId}`, { method: 'DELETE' }),
  };

  // Tickets (Support)
  tickets = {
    list: (workspaceId: string, params?: { team_id?: string; status?: string; assigned_user_id?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.team_id) searchParams.append('team_id', params.team_id);
      if (params?.status) searchParams.append('status', params.status);
      if (params?.assigned_user_id) searchParams.append('assigned_user_id', params.assigned_user_id);
      const queryString = searchParams.toString();
      return this.request(`/tickets/${workspaceId}${queryString ? `?${queryString}` : ''}`);
    },
    get: (id: string) => this.request(`/tickets/detail/${id}`),
    create: (data: any) => this.request('/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: any) => this.request(`/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    addNote: (id: string, note: string) => this.request(`/tickets/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    }),
    analyze: (id: string) => this.request(`/tickets/${id}/analyze`, {
      method: 'POST',
    }),
    claim: (id: string) => this.request(`/tickets/${id}/claim`, {
      method: 'POST',
    }),
    getMacros: (workspaceId: string) => this.request(`/tickets/${workspaceId}/macros`),
    bulkUpdate: (workspaceId: string, data: { ticket_ids: string[], status?: string, priority?: string, assigned_team_id?: string }) => 
      this.request(`/tickets/${workspaceId}/bulk`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getByConversation: (conversationId: string) => 
      this.request(`/tickets/conversation/${conversationId}`),
    escalate: (id: string, data: { assigned_team_id: string, note?: string }) => 
      this.request(`/tickets/${id}/escalate`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    accept: (id: string) => this.request(`/tickets/${id}/accept`, { method: 'POST' }),
    reject: (id: string) => this.request(`/tickets/${id}/reject`, { method: 'POST' }),
    handoff: (id: string) => this.request(`/tickets/${id}/handoff`, { method: 'POST' }),
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
    update: (id: string, data: {
      name?: string;
      company_description?: string;
      industry?: string;
      ai_agent_name?: string;
      ai_tone?: string;
      ai_custom_instructions?: string;
      ai_settings?: any;
      is_ai_enabled?: boolean;
    }) => this.request(`/workspaces/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  };

  // Onboarding
  onboarding = {
    setup: (data: {
      workspace_name: string;
      company_description?: string;
      industry?: string;
      ai_agent_name?: string;
      ai_tone?: string;
      ai_custom_instructions?: string;
    }) => this.request('/onboarding/setup', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  };

  // Dashboard
  dashboard = {
    getWsToken: (workspaceId: string) => 
      this.request(`/dashboard/ws-token?workspace_id=${workspaceId}`),
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
    list: (workspace_id: string, params?: { status?: string; assigned_to_me?: boolean }) => {
      const searchParams = new URLSearchParams();
      searchParams.append('workspace_id', workspace_id);
      if (params?.status) searchParams.append('status', params.status);
      if (params?.assigned_to_me) searchParams.append('assigned_to_me', 'true');
      return this.request(`/conversations/?${searchParams.toString()}`);
    },
    get: (conversation_id: string) => 
      this.request(`/conversations/${conversation_id}`),
    getMessages: (conversation_id: string) => 
      this.request(`/conversations/${conversation_id}/messages`),
    sendMessage: (conversation_id: string, body: string, is_internal: boolean = false, message_type: string = "text") => 
      this.request(`/conversations/${conversation_id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body, is_internal, message_type }),
      }),
    update: (conversation_id: string, data: { status?: string, assigned_to?: string, priority?: string }) =>
      this.request(`/conversations/${conversation_id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    markAsRead: (conversation_id: string) => 
      this.request(`/conversations/${conversation_id}/read`, {
        method: 'POST',
      }),
    getSuggestedReplies: (workspace_id: string, conversation_id: string): Promise<string[]> =>
      this.request(`/conversations/${conversation_id}/suggest-replies?workspace_id=${workspace_id}`),
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
        formData.append('source_id', id);
        if (parentId) formData.append('folder_id', parentId);

        return this.request(`/workspaces/${workspaceId}/knowledge/documents/upload`, {
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
      scrapeWebsite: (workspaceId: string, data: { 
        url: string; 
        folder_id?: string; 
        name?: string;
        crawl_mode?: 'single' | 'subpages' | 'site';
        max_depth?: number;
        page_limit?: number;
        include_patterns?: string[];
        exclude_patterns?: string[];
        frequency?: 'once' | 'daily' | 'weekly';
        content_focus?: 'docs' | 'blog' | 'mixed';
        target_urls?: string[];
        respect_robots_txt?: boolean;
      }) =>
        this.request(`/workspaces/${workspaceId}/knowledge/sources/website/scrape`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
      previewWebsiteLinks: (workspaceId: string, data: {
        url: string;
        crawl_mode?: 'single' | 'subpages' | 'site';
        max_depth?: number;
        page_limit?: number;
        include_patterns?: string[];
        exclude_patterns?: string[];
        content_focus?: 'docs' | 'blog' | 'mixed';
        respect_robots_txt?: boolean;
      }) =>
        this.request(`/workspaces/${workspaceId}/knowledge/sources/website/preview`, {
          method: 'POST',
          body: JSON.stringify(data),
        }),
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
    confluence: {
      connect: (workspaceId: string, data: { base_url: string; email: string; api_token: string; name?: string }) =>
        this.request('/confluence/connect', {
          method: 'POST',
          body: JSON.stringify({ workspace_id: workspaceId, ...data }),
        }),
      spaces: (sourceId: string) =>
        this.request(`/confluence/spaces/${sourceId}`),
      updateSpaces: (sourceId: string, selectedSpaces: string[]) =>
        this.request(`/confluence/spaces/${sourceId}`, {
          method: 'PUT',
          body: JSON.stringify({ selected_spaces: selectedSpaces }),
        }),
      sync: (sourceId: string) =>
        this.request(`/confluence/sync/${sourceId}`, { method: 'POST' }),
    },
    guru: {
      connect: (workspaceId: string, data: { email: string; api_token: string; name?: string }) =>
        this.request('/guru/connect', {
          method: 'POST',
          body: JSON.stringify({ workspace_id: workspaceId, ...data }),
        }),
      collections: (sourceId: string) =>
        this.request(`/guru/collections/${sourceId}`),
      updateCollections: (sourceId: string, selectedCollections: string[]) =>
        this.request(`/guru/collections/${sourceId}`, {
          method: 'PUT',
          body: JSON.stringify({ selected_collections: selectedCollections }),
        }),
      sync: (sourceId: string) =>
        this.request(`/guru/sync/${sourceId}`, { method: 'POST' }),
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
    query: (workspaceId: string, query: string, folderId?: string, conversationId?: string) => 
      this.request('/ai/query', {
        method: 'POST',
        body: JSON.stringify({
          workspace_id: workspaceId,
          query: query,
          folder_id: folderId,
          conversation_id: conversationId,
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

  // Automations
  automations = {
    simulate: (workspaceId: string, data: any) => this.request(`/automations/simulate?workspace_id=${workspaceId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    rules: {
      list: (workspaceId: string) => this.request(`/automations/rules?workspace_id=${workspaceId}`),
      create: (workspaceId: string, data: any) => this.request(`/automations/rules?workspace_id=${workspaceId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      update: (ruleId: string, data: any) => this.request(`/automations/rules/${ruleId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
      toggle: (ruleId: string) => this.request(`/automations/rules/${ruleId}/toggle`, {
        method: 'POST',
      }),
      delete: (ruleId: string) => this.request(`/automations/rules/${ruleId}`, {
        method: 'DELETE',
      }),
    },
    macros: {
      list: (workspaceId: string) => this.request(`/automations/macros?workspace_id=${workspaceId}`),
      create: (workspaceId: string, data: any) => this.request(`/automations/macros?workspace_id=${workspaceId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      update: (macroId: string, data: any) => this.request(`/automations/macros/${macroId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
      suggest: (workspaceId: string, conversationId: string) => 
        this.request(`/automations/macros/suggest?workspace_id=${workspaceId}&conversation_id=${conversationId}`),
      delete: (macroId: string) => this.request(`/automations/macros/${macroId}`, {
        method: 'DELETE',
      }),
    },
    workflows: {
      list: (workspaceId: string) => this.request(`/automations/workflows?workspace_id=${workspaceId}`),
      create: (workspaceId: string, data: any) => this.request(`/automations/workflows?workspace_id=${workspaceId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      update: (id: string, data: any) => this.request(`/automations/workflows/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    },
    escalations: {
      list: (workspaceId: string) => this.request(`/automations/escalations/rules?workspace_id=${workspaceId}`),
      create: (workspaceId: string, data: any) => this.request(`/automations/escalations/rules?workspace_id=${workspaceId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
      delete: (id: string) => this.request(`/automations/escalations/rules/${id}`, {
        method: 'DELETE',
      }),
      update: (id: string, data: any) => this.request(`/automations/escalations/rules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    },
    campaigns: {
      list: (workspaceId: string) => this.request(`/automations/campaigns?workspace_id=${workspaceId}`),
      create: (workspaceId: string, data: any) => this.request(`/automations/campaigns?workspace_id=${workspaceId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    },
    logs: {
      list: (workspaceId: string, ruleId?: string) => 
        this.request(`/automations/logs?workspace_id=${workspaceId}${ruleId ? `&rule_id=${ruleId}` : ''}`),
    },
  };
}

export const api = new APIClient();
