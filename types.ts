export interface DatabaseEntry {
  id: string;
  user_id: string;
  service_name: string;
  username: string | null;
  category: string;
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
  category: string;
  password: string;
  notes: string;
}

export type Category = 'All' | 'Social' | 'Work' | 'Finance' | 'Shopping' | 'Other';

export const CATEGORIES: Category[] = ['All', 'Social', 'Work', 'Finance', 'Shopping', 'Other'];
