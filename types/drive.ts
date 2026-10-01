export interface DriveConfig {
  clientEmail?: string;
  privateKey?: string;
  folderId?: string;
  apiKey?: string;
  webhookUrl?: string;
}

export type DriveMode = 'service_account' | 'webhook' | 'api_key' | 'local';

export interface DriveStatusResponse {
  connected: boolean;
  mode: DriveMode;
  memories: import('./memories').RemoteMemory[];
  message?: string;
  error?: string;
}
