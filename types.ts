
export interface DatabaseEntry {
  id: string;
  user_id: string;
  service_name: string;
  username: string | null;
  category: string;
  url: string | null; 
  encrypted_password: string; // Base64
  encrypted_notes: string | null; // Base64
  iv: string; // Base64
  created_at: string;
}

export interface DecryptedEntry extends Omit<DatabaseEntry, 'encrypted_password' | 'encrypted_notes' | 'iv'> {
  password: string;
  notes: string;
}

export interface CreateEntryPayload {
  service_name: string;
  username: string;
  url: string;
  category: string;
  password: string;
  notes: string;
}

export interface CategoryItem {
  id: string;
  user_id: string;
  name: string;
  created_at?: string;
}

export interface ShareConfig {
  views: number; // 1 means burn after read
  hours: number; // 1, 24, 72, etc.
}

export interface SharedDataPayload {
  service_name: string;
  username: string;
  password: string;
  url: string;
  notes: string;
}

// Category is now just a string alias as it is dynamic
export type Category = string; 

export const DEFAULT_CATEGORIES = ['Social', 'Work', 'Finance', 'Shopping', 'Other'];
