
export type EntryType = 'login' | 'card' | 'identity';

export interface DatabaseEntry {
  id: string;
  user_id: string;
  type: EntryType;
  service_name: string;
  username: string | null;
  category: string;
  url: string | null; 
  encrypted_password: string; // Base64 (Contains JSON string for 'card'/'identity')
  encrypted_notes: string | null; // Base64
  iv: string; // Base64
  created_at: string;
}

export interface DecryptedEntry extends Omit<DatabaseEntry, 'encrypted_password' | 'encrypted_notes' | 'iv'> {
  password: string; // Decrypted plain text (or JSON string)
  notes: string;
}

export interface CreateEntryPayload {
  type: EntryType;
  service_name: string;
  username: string;
  url: string;
  category: string;
  password: string; // Will contain JSON string for non-login types
  notes: string;
}

// Specific Data Structures for JSON payloads
export interface CardData {
  cardholder: string;
  number: string;
  expiry: string;
  cvv: string;
  pin?: string;
}

export interface IdentityData {
  fullName: string;
  license?: string;
  passport?: string;
  address?: string;
  phone?: string;
  dob?: string;
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
