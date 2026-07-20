import { sys } from 'cc';

export interface UserProfile {
  diamonds: number;
  energy: number;
  levelProgress: number; // 0-indexed level progress index
  claimedSignins: number[]; // indices of days signed in, e.g., [0] if Day 1 is claimed
  lastSigninTimestamp: number; // timestamp of last signin
  unlockedAchievements: string[]; // achievement keys unlocked
}

const STORAGE_KEY = 'flow_land_light_profile';
const XOR_KEY = 77; // Obfuscation XOR key

export class ProfileManager {
  private static cachedProfile: UserProfile | null = null;

  private static defaultProfile(): UserProfile {
    return {
      diamonds: 1260,
      energy: 8,
      levelProgress: 55, // Default to level 56 (0-indexed 55)
      claimedSignins: [0], // Day 1 is already claimed by default
      lastSigninTimestamp: Date.now() - 24 * 60 * 60 * 1000, // signed in yesterday
      unlockedAchievements: ['first_start']
    };
  }

  // XOR encryption/decryption helper (safe on both Web and WeChat)
  private static xorObfuscate(str: string): string {
    let result = '';
    for (let i = 0; i < str.length; i++) {
      result += String.fromCharCode(str.charCodeAt(i) ^ XOR_KEY);
    }
    return result;
  }

  public static getProfile(): UserProfile {
    if (this.cachedProfile) {
      return this.cachedProfile;
    }

    try {
      const stored = sys.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const decrypted = this.xorObfuscate(stored);
        const profile = JSON.parse(decrypted) as UserProfile;
        
        // Ensure array safety in case schema changes
        profile.claimedSignins = profile.claimedSignins || [];
        profile.unlockedAchievements = profile.unlockedAchievements || [];
        
        this.cachedProfile = profile;
        return profile;
      }
    } catch (e) {
      console.error('[ProfileManager] Failed to load local profile:', e);
    }

    // Fallback to default and save it
    const def = this.defaultProfile();
    this.saveProfile(def);
    return def;
  }

  public static saveProfile(profile: UserProfile): void {
    this.cachedProfile = profile;
    try {
      const jsonStr = JSON.stringify(profile);
      const encrypted = this.xorObfuscate(jsonStr);
      sys.localStorage.setItem(STORAGE_KEY, encrypted);
    } catch (e) {
      console.error('[ProfileManager] Failed to save local profile:', e);
    }
  }

  public static addDiamonds(amount: number): void {
    const profile = this.getProfile();
    profile.diamonds += amount;
    this.saveProfile(profile);
  }

  public static addEnergy(amount: number): void {
    const profile = this.getProfile();
    profile.energy = Math.min(10, profile.energy + amount); // max 10
    this.saveProfile(profile);
  }

  public static setLevelProgress(levelIndex: number): void {
    const profile = this.getProfile();
    if (levelIndex > profile.levelProgress) {
      profile.levelProgress = levelIndex;
      this.saveProfile(profile);
    }
  }

  public static isTodaySignedin(): boolean {
    const profile = this.getProfile();
    if (!profile.lastSigninTimestamp) return false;
    const lastDate = new Date(profile.lastSigninTimestamp).toDateString();
    const todayDate = new Date().toDateString();
    return lastDate === todayDate;
  }

  public static claimDailySignin(dayIndex: number, diamondReward: number): boolean {
    if (this.isTodaySignedin()) {
      return false;
    }
    const profile = this.getProfile();
    profile.lastSigninTimestamp = Date.now();
    if (!profile.claimedSignins.includes(dayIndex)) {
      profile.claimedSignins.push(dayIndex);
    }
    profile.diamonds += diamondReward;
    this.saveProfile(profile);
    return true;
  }

  public static isAchievementClaimed(achievementId: string): boolean {
    const profile = this.getProfile();
    return (profile.unlockedAchievements || []).includes(achievementId);
  }

  public static claimAchievements(achievementItems: { id: string; reward: number }[]): number {
    const profile = this.getProfile();
    profile.unlockedAchievements = profile.unlockedAchievements || [];

    let totalClaimed = 0;
    for (const item of achievementItems) {
      if (!profile.unlockedAchievements.includes(item.id)) {
        profile.unlockedAchievements.push(item.id);
        totalClaimed += item.reward;
      }
    }

    if (totalClaimed > 0) {
      profile.diamonds += totalClaimed;
      this.saveProfile(profile);
    }
    return totalClaimed;
  }
}
