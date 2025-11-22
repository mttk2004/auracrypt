
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
    if (e.type === 'login') {
        const count = passwordMap.get(e.password) || 0;
        passwordMap.set(e.password, count + 1);
    }
  });

  let totalScoreSum = 0;
  let breachedCount = 0;
  let reusedCount = 0;
  let weakCount = 0;
  let scorableItems = 0;

  // 2. Analyze each entry
  await Promise.all(entries.map(async (entry) => {
    // Skip non-login items from scoring usually, but let's keep them for basic checks if needed.
    // For now, we focus logic mainly on passwords.
    if (entry.type !== 'login') {
        results[entry.id] = {
            entryId: entry.id,
            isBreached: false,
            breachCount: 0,
            isWeak: false,
            isReused: false,
            score: 100,
            suggestions: []
        };
        return;
    }

    scorableItems++;
    const breachCount = await checkPwned(entry.password);
    const isBreached = breachCount > 0;
    
    const len = entry.password.length;
    const hasNum = /\d/.test(entry.password);
    const hasSym = /[!@#$%^&*(),.?":{}|<>]/.test(entry.password);
    const hasUpper = /[A-Z]/.test(entry.password);
    const isReused = (passwordMap.get(entry.password) || 0) > 1;

    const suggestions: string[] = [];

    // Scoring Logic
    let score = 0;
    
    // Base score on length (up to 60 points)
    // 8 chars = 32pts, 12 chars = 48pts, 15 chars = 60pts
    score += Math.min(60, len * 4);
    
    // Complexity bonus (up to 40 points)
    if (hasNum) score += 10;
    if (hasSym) score += 15;
    if (hasUpper) score += 10;
    if (len >= 16) score += 5; // Bonus for extra length

    // Penalties
    if (isReused) score -= 20; // Significant penalty but not zeroing
    if (isBreached) score = 0; // Immediate fail

    // Cap score
    score = Math.max(0, Math.min(100, score));

    // --- STRICT WEAKNESS DEFINITION ---
    // A password is "Weak" if it scores < 60.
    // 60-79 is "Fair" (Not weak, but not perfect).
    // 80+ is "Strong".
    let isWeak = score < 60;

    // Add suggestions based on analysis, regardless of final score, for UI tips
    if (len < 8) suggestions.push('suggShort');
    else if (len < 12 && (!hasNum || !hasSym)) suggestions.push('suggSimple');
    
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
    else {
        // Only count as reused if NOT breached (breached takes priority)
        if (isReused) reusedCount++;
        // Only count as weak if NOT breached and NOT reused (to avoid double counting in tabs)
        else if (isWeak) weakCount++;
    }
    
    totalScoreSum += score;
  }));

  const totalScore = scorableItems > 0 ? Math.round(totalScoreSum / scorableItems) : 100;

  return {
    totalScore,
    breachedCount,
    reusedCount,
    weakCount,
    results
  };
};
