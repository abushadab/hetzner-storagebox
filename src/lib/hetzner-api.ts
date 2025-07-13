// Storage API client for managing storage spaces
import { getStorageApiToken } from './settings';

// New Hetzner Storage Box API types
export interface StorageBoxResponse {
  storage_box: StorageBox;
}

export interface StorageBoxesResponse {
  storage_boxes: StorageBox[];
  meta: {
    pagination: {
      page: number;
      per_page: number;
      previous_page: number | null;
      next_page: number | null;
      last_page: number;
      total_entries: number;
    };
  };
}

export interface StorageBox {
  id: number;
  username: string;
  status: 'active' | 'inactive' | 'deleting';
  name: string;
  storage_box_type: {
    name: string;
    description: string;
    snapshot_limit: number;
    automatic_snapshot_limit: number;
    subaccounts_limit: number;
    size: number;
    prices: Array<{
      location: string;
      price_hourly: { net: string; gross: string };
      price_monthly: { net: string; gross: string };
      setup_fee: { net: string; gross: string };
    }>;
  };
  location: {
    id: number;
    name: string;
    description: string;
    country: string;
    city: string;
    latitude: number;
    longitude: number;
    network_zone: string;
  };
  access_settings: {
    reachable_externally: boolean;
    samba_enabled: boolean;
    ssh_enabled: boolean;
    webdav_enabled: boolean;
    zfs_enabled: boolean;
  };
  server: string;
  system: string;
  stats: {
    size: number;
    size_data: number;
    size_snapshots: number;
  };
  labels: Record<string, string>;
  protection: {
    delete: boolean;
  };
  snapshot_plan: {
    max_snapshots: number;
    minute: number | null;
    hour: number | null;
    day_of_week: number | null;
    day_of_month: number | null;
  };
  created: string;
}

export interface SubAccount {
  id: number;
  username: string;
  server: string;
  home_directory: string;
  access_settings: {
    samba_enabled: boolean;
    ssh_enabled: boolean;
    webdav_enabled: boolean;
    reachable_externally: boolean;
    readonly: boolean;
  };
  description: string;
  created: string;
  labels: Record<string, string>;
  storage_box: number;
}

export interface SubAccountsResponse {
  subaccounts: SubAccount[];
}

export interface ActionResponse {
  action: {
    id: number;
    command: string;
    status: 'running' | 'success' | 'error';
    progress: number;
    started: string;
    finished: string | null;
    resources: Array<{ id: number; type: string }>;
    error?: {
      code: string;
      message: string;
    };
  };
}

export class HetznerAPI {
  private baseUrl = 'https://api.hetzner.com/v1';
  private apiToken: string | null = null;

  constructor(apiToken?: string) {
    // Use provided token if available
    this.apiToken = apiToken || null;
  }

  private async ensureToken(): Promise<void> {
    console.log('[HetznerAPI] Ensuring token...');
    if (!this.apiToken) {
      console.log('[HetznerAPI] No token set, fetching from settings/env...');
      const token = await getStorageApiToken();
      if (!token) {
        console.error('[HetznerAPI] No storage API token found!');
        throw new Error('Storage API token not configured. Please set it in admin settings.');
      }
      console.log('[HetznerAPI] Token retrieved successfully');
      this.apiToken = token;
    } else {
      console.log('[HetznerAPI] Token already set');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    await this.ensureToken();
    const url = `${this.baseUrl}${endpoint}`;
    
    console.log('[HetznerAPI] Making request:', {
      url,
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiToken?.substring(0, 10)}...`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body
    });

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    console.log('[HetznerAPI] Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Hetzner API error: ${response.status}`;
      
      console.error('[HetznerAPI] Error response text:', errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        console.error('[HetznerAPI] Parsed error response:', errorData);
        console.error('[HetznerAPI] Request was:', { url, method: options.method, body: options.body });
        
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
          
          // Include field-specific errors if available
          if (errorData.error.details?.fields) {
            const fieldErrors = errorData.error.details.fields
              .map((f: { name: string; messages: string[] }) => `${f.name}: ${f.messages.join(', ')}`)
              .join('; ');
            errorMessage += ` - ${fieldErrors}`;
          }
        }
      } catch {
        errorMessage += ` - ${errorText}`;
      }
      
      throw new Error(errorMessage);
    }

    const responseData = await response.json();
    console.log('[HetznerAPI] Success response:', JSON.stringify(responseData, null, 2));
    return responseData;
  }

  // Storage Box methods
  async listStorageBoxes(): Promise<StorageBox[]> {
    const data = await this.request<StorageBoxesResponse>('/storage_boxes');
    return data.storage_boxes;
  }

  async getStorageBox(id: number): Promise<StorageBox> {
    const data = await this.request<StorageBoxResponse>(`/storage_boxes/${id}`);
    return data.storage_box;
  }

  async updateStorageBox(id: number, updates: { name?: string; labels?: Record<string, string> }): Promise<StorageBox> {
    const data = await this.request<StorageBoxResponse>(`/storage_boxes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return data.storage_box;
  }

  // Subaccount methods
  async listSubAccounts(storageBoxId: number): Promise<SubAccount[]> {
    const data = await this.request<SubAccountsResponse>(
      `/storage_boxes/${storageBoxId}/subaccounts`
    );
    return data.subaccounts;
  }

  async createSubAccount(
    storageBoxId: number,
    params: {
      password: string;
      home_directory: string;
      access_settings?: {
        samba_enabled?: boolean;
        ssh_enabled?: boolean;
        webdav_enabled?: boolean;
        readonly?: boolean;
        reachable_externally?: boolean;
      };
      description?: string;
      labels?: Record<string, string>;
    }
  ): Promise<ActionResponse> {
    return await this.request<ActionResponse>(
      `/storage_boxes/${storageBoxId}/subaccounts`,
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    );
  }

  async updateSubAccount(
    storageBoxId: number,
    subAccountId: number,
    params: {
      labels: Record<string, string>;
      description: string;
    }
  ): Promise<SubAccount> {
    const data = await this.request<{ subaccount: SubAccount }>(
      `/storage_boxes/${storageBoxId}/subaccounts/${subAccountId}`,
      {
        method: 'PUT',
        body: JSON.stringify(params),
      }
    );
    return data.subaccount;
  }

  async deleteSubAccount(
    storageBoxId: number,
    subAccountId: number
  ): Promise<ActionResponse> {
    return await this.request<ActionResponse>(
      `/storage_boxes/${storageBoxId}/subaccounts/${subAccountId}`,
      { method: 'DELETE' }
    );
  }

  // Action methods
  async resetPassword(storageBoxId: number, password: string): Promise<ActionResponse> {
    return await this.request<ActionResponse>(
      `/storage_boxes/${storageBoxId}/actions/reset_password`,
      {
        method: 'POST',
        body: JSON.stringify({ password }),
      }
    );
  }

  async resetSubAccountPassword(
    storageBoxId: number,
    subAccountId: number,
    password: string
  ): Promise<ActionResponse> {
    return await this.request<ActionResponse>(
      `/storage_boxes/${storageBoxId}/subaccounts/${subAccountId}/actions/reset_subaccount_password`,
      {
        method: 'POST',
        body: JSON.stringify({ password }),
      }
    );
  }

  async updateAccessSettings(
    storageBoxId: number,
    settings: {
      samba_enabled?: boolean;
      ssh_enabled?: boolean;
      webdav_enabled?: boolean;
      zfs_enabled?: boolean;
      reachable_externally?: boolean;
    }
  ): Promise<ActionResponse> {
    return await this.request<ActionResponse>(
      `/storage_boxes/${storageBoxId}/actions/update_access_settings`,
      {
        method: 'POST',
        body: JSON.stringify(settings),
      }
    );
  }

  async updateSubAccountAccessSettings(
    storageBoxId: number,
    subAccountId: number,
    settings: {
      home_directory?: string;
      samba_enabled?: boolean;
      ssh_enabled?: boolean;
      webdav_enabled?: boolean;
      readonly?: boolean;
      reachable_externally?: boolean;
    }
  ): Promise<ActionResponse> {
    return await this.request<ActionResponse>(
      `/storage_boxes/${storageBoxId}/subaccounts/${subAccountId}/actions/update_access_settings`,
      {
        method: 'POST',
        body: JSON.stringify(settings),
      }
    );
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      await this.listStorageBoxes();
      return true;
    } catch {
      return false;
    }
  }
}