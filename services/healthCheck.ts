import { digestSHA1 } from './cryptoUtils';
import { DecryptedEntry } from '../types';

export interface HealthResult {
  entryId: string;
  isBreached: boolean;
  breachCount: number;
  isWeak: boolean;
  isReused: boolean;
  score: number; // 0-100 for individual entry
}

export interface SecurityReport {
  totalScore: number;
  breachedCount: number;
  reusedCount: number;
  weakCount: number;
  results: Record<string, HealthResult>;
}

// Check Have I Been Pwned API (k-Anonymity)
const checkPwned = async (password: string): Promise<number> => {
  try {
    const hash = await digestSHA1(password);
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    if (!response.ok) return 0;

    const text = await response.text();
    const lines = text.split('\n');
    
    for (const line of lines) {
      const [hashSuffix, count] = line.split(':');
      if (hashSuffix.trim() === suffix) {
        return parseInt(count, 10);
      }
    }
    return 0;
  } catch (error) {
    console.error("HIBP Check Failed", error);
    return 0; // Fail safe
  }
};

export const runSecurityScan = async (entries: DecryptedEntry[]): Promise<SecurityReport> => {
  const results: Record<string, HealthResult> = {};
  const passwordMap = new Map<string, number>();

  // 1. Build frequency map for reuse detection
  entries.forEach(e => {
    const count = passwordMap.get(e.password) || 0;
    passwordMap.set(e.password, count + 1);
  });

  let totalScoreSum = 0;
  let breachedCount = 0;
  let reusedCount = 0;
  let weakCount = 0;

  // 2. Analyze each entry
  // We use Promise.all to parallelize HIBP requests (browser limits apply, but ok for small vaults)
  await Promise.all(entries.map(async (entry) => {
    const breachCount = await checkPwned(entry.password);
    const isBreached = breachCount > 0;
    
    // Weakness criteria
    const isWeak = entry.password.length < 8 || !/\d/.test(entry.password) || !/[!@#$%^&*]/.test(entry.password);
    
    const isReused = (passwordMap.get(entry.password) || 0) > 1;

    // Scoring Logic (Simple)
    let score = 100;
    if (isBreached) score = 0;
    else {
      if (isReused) score -= 30;
      if (isWeak) score -= 40;
      if (entry.password.length < 12) score -= 10;
    }
    if (score < 0) score = 0;

    results[entry.id] = {
      entryId: entry.id,
      isBreached,
      breachCount,
      isWeak,
      isReused,
      score
    };

    if (isBreached) breachedCount++;
    if (isReused && !isBreached) reusedCount++; // Don't double count for stats if already breached (severity hierarchy)
    if (isWeak && !isBreached && !isReused) weakCount++;
    
    totalScoreSum += score;
  }));

  const totalScore = entries.length > 0 ? Math.round(totalScoreSum / entries.length) : 100;

  return {
    totalScore,
    breachedCount,
    reusedCount,
    weakCount,
    results
  };
};