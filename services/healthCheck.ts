
import { digestSHA1 } from './cryptoUtils';
import { DecryptedEntry } from '../types';

export interface HealthResult {
  entryId: string;
  isBreached: boolean;
  breachCount: number;
  isWeak: boolean;
  isReused: boolean;
  score: number; // 0-100 for individual entry
  suggestions: string[]; // New field for specific UI feedback
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
  await Promise.all(entries.map(async (entry) => {
    const breachCount = await checkPwned(entry.password);
    const isBreached = breachCount > 0;
    
    const len = entry.password.length;
    const hasNum = /\d/.test(entry.password);
    const hasSym = /[!@#$%^&*(),.?":{}|<>]/.test(entry.password);
    const hasUpper = /[A-Z]/.test(entry.password);
    const isReused = (passwordMap.get(entry.password) || 0) > 1;

    const suggestions: string[] = [];

    // --- REFINED WEAKNESS LOGIC ---
    // It is NOT weak if it is very long (>14 chars), even if it lacks numbers/symbols.
    // It IS weak if short (<8).
    // It IS weak if medium length (<12) AND lacks complexity.
    
    let isWeak = false;

    if (len < 8) {
        isWeak = true;
        suggestions.push('suggShort');
    } else if (len < 14) {
        // Medium length: Require some complexity
        if (!hasNum && !hasSym) {
            isWeak = true;
            suggestions.push('suggSimple');
        }
    }
    // Length >= 14 is generally considered strong against brute force even without symbols, 
    // unless it's a common dictionary word (which we can't check easily offline without a huge dict).
    // But we assume length is the primary factor for entropy here.

    // Scoring Logic
    let score = 0;
    
    // Base score on length (up to 60 points)
    score += Math.min(60, len * 4);
    
    // Complexity bonus (up to 40 points)
    if (hasNum) score += 10;
    if (hasSym) score += 15;
    if (hasUpper) score += 10;
    if (len > 14) score += 5; // Bonus for length

    // Penalties
    if (isReused) score -= 30;
    if (isBreached) score = 0; // Immediate fail

    // Cap score
    score = Math.max(0, Math.min(100, score));

    // Consistency check: If score is high, it shouldn't be marked 'Weak'
    if (score > 60 && isWeak) isWeak = false;
    if (score < 50 && !isWeak) isWeak = true;

    results[entry.id] = {
      entryId: entry.id,
      isBreached,
      breachCount,
      isWeak,
      isReused,
      score,
      suggestions
    };

    if (isBreached) breachedCount++;
    if (isReused && !isBreached) reusedCount++;
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
