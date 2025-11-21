
import { DecryptedEntry, CreateEntryPayload } from '../types';

/**
 * Escapes a string for CSV format (wraps in quotes if contains comma, newline, or double quotes)
 */
const escapeCSV = (str: string | null): string => {
  if (!str) return '';
  const stringVal = String(str);
  if (stringVal.includes(',') || stringVal.includes('\n') || stringVal.includes('"')) {
    return `"${stringVal.replace(/"/g, '""')}"`;
  }
  return stringVal;
};

/**
 * Generates a CSV string from decrypted entries
 */
export const generateCSV = (entries: DecryptedEntry[]): string => {
  const headers = ['name', 'url', 'username', 'password', 'category', 'notes'];
  const rows = entries.map(e => [
    escapeCSV(e.service_name),
    escapeCSV(e.url),
    escapeCSV(e.username),
    escapeCSV(e.password),
    escapeCSV(e.category),
    escapeCSV(e.notes)
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
};

/**
 * Simple CSV Parser that handles quoted fields
 */
const parseCSVLine = (text: string): string[][] => {
  const result: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuote = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuote) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuote = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuote = true;
      } else if (char === ',') {
        row.push(current);
        current = '';
      } else if (char === '\n' || char === '\r') {
        if (current || row.length > 0) row.push(current);
        if (row.length > 0) result.push(row);
        row = [];
        current = '';
        // Handle \r\n
        if (char === '\r' && nextChar === '\n') i++;
      } else {
        current += char;
      }
    }
  }
  // Push last
  if (current || row.length > 0) row.push(current);
  if (row.length > 0) result.push(row);

  return result;
};

/**
 * Smart Map CSV headers to our data structure
 * Supports Chrome, Bitwarden, LastPass formats loosely
 */
export const parseImportCSV = async (file: File): Promise<CreateEntryPayload[]> => {
  const text = await file.text();
  const rows = parseCSVLine(text);

  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.toLowerCase().trim());
  const dataRows = rows.slice(1);

  // Map common header names to our keys
  const mapIndex = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));

  const idxName = mapIndex(['name', 'title', 'service', 'app', 'account']);
  const idxUrl = mapIndex(['url', 'uri', 'website', 'link', 'login_uri']);
  const idxUser = mapIndex(['username', 'user', 'email', 'login', 'login_username']);
  const idxPass = mapIndex(['password', 'pass', 'login_password']);
  const idxNote = mapIndex(['note', 'comment', 'extra']);
  const idxCat = mapIndex(['category', 'folder', 'group']);

  const results: CreateEntryPayload[] = [];

  for (const row of dataRows) {
    if (row.length < 2) continue; // Skip empty lines

    // Get values or empty string
    const service_name = idxName > -1 ? row[idxName] : (idxUrl > -1 ? row[idxUrl] : 'Imported Entry');
    const username = idxUser > -1 ? row[idxUser] : '';
    const password = idxPass > -1 ? row[idxPass] : '';
    const url = idxUrl > -1 ? row[idxUrl] : '';
    const notes = idxNote > -1 ? row[idxNote] : '';
    const category = idxCat > -1 ? row[idxCat] : 'Other';

    // Require at least a service name or url, and a password
    if ((service_name || url) && password) {
      results.push({
        type: 'login',
        service_name: service_name || url || 'Unknown',
        username: username || '',
        url: url || '',
        password: password,
        notes: notes || '',
        category: category || 'Imported'
      });
    }
  }

  return results;
};
