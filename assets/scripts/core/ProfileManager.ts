import { sys } from 'cc';

export interface UserProfile {
  profileVersion?: number;
  diamonds: number;
  energy: number;
  lastEnergyTimestamp?: number;
  levelProgress: number; // next playable journey level index, also equals completed count
  claimedSignins: number[]; // indices of days signed in, e.g., [0] if Day 1 is claimed
  lastSigninTimestamp: number; // timestamp of last signin
  unlockedAchievements: string[]; // achievement keys unlocked
  assistedResiduals?: string[];
  sharedResidualHelps?: ResidualHelpRecord[];
  claimedResidualHelpRewards?: string[];
  dailyChallengeBest?: number;
  dailyChallengeBestMoves?: number;
  dailyChallengeDate?: string;
  powerSaveMode?: boolean;
  selectedTheme?: number;
  unlockedThemes?: number[];
  lastShareRewardDate?: string;
  shareRewardClaimCount?: number;
  blessings?: Record<string, number>;
}

export interface ResidualHelpRecord {
  assistId: string;
  levelId: number;
  createdAt: number;
}

const STORAGE_KEY = 'flow_land_light_profile';
const XOR_KEY = 77; // Obfuscation XOR key
const PROFILE_VERSION = 2;

export class ProfileManager {
  private static cachedProfile: UserProfile | null = null;

  private static defaultProfile(): UserProfile {
    return {
      profileVersion: PROFILE_VERSION,
      diamonds: 120,
      energy: 10,
      lastEnergyTimestamp: Date.now(),
      levelProgress: 0,
      claimedSignins: [],
      lastSigninTimestamp: 0,
      unlockedAchievements: [],
      assistedResiduals: [],
      sharedResidualHelps: [],
      claimedResidualHelpRewards: [],
      dailyChallengeBest: 0,
      dailyChallengeBestMoves: 0,
      dailyChallengeDate: '',
      powerSaveMode: false,
      selectedTheme: 0,
      unlockedThemes: [0],
      lastShareRewardDate: '',
      shareRewardClaimCount: 0,
      blessings: {}
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

        const beforeNormalize = JSON.stringify(profile);
        const migrated = this.normalizeProfile(profile);
        this.applyEnergyRecovery(migrated);
        this.cachedProfile = migrated;
        if (migrated !== profile || JSON.stringify(migrated) !== beforeNormalize) {
          this.saveProfile(migrated);
        }
        return migrated;
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
    profile.profileVersion = PROFILE_VERSION;
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
    profile.energy = Math.max(0, Math.min(10, profile.energy + amount)); // 0-10
    profile.lastEnergyTimestamp = Date.now();
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

  public static claimResidualAssist(assistId: string, reward: number): boolean {
    if (!assistId) return false;
    const profile = this.getProfile();
    profile.assistedResiduals = profile.assistedResiduals || [];
    if (profile.assistedResiduals.includes(assistId)) {
      return false;
    }
    profile.assistedResiduals.push(assistId);
    profile.diamonds += reward;
    this.saveProfile(profile);
    return true;
  }

  public static markResidualHelpShared(assistId: string, levelId: number): void {
    if (!assistId) return;
    const profile = this.getProfile();
    profile.sharedResidualHelps = profile.sharedResidualHelps || [];
    if (!profile.sharedResidualHelps.some((item) => item.assistId === assistId)) {
      profile.sharedResidualHelps.push({
        assistId,
        levelId,
        createdAt: Date.now()
      });
      // Keep the local queue compact; the authoritative version should live in cloud storage later.
      if (profile.sharedResidualHelps.length > 20) {
        profile.sharedResidualHelps = profile.sharedResidualHelps.slice(-20);
      }
      this.saveProfile(profile);
    }
  }

  public static claimResidualHelpReward(assistId: string, reward: number): boolean {
    if (!assistId) return false;
    const profile = this.getProfile();
    profile.sharedResidualHelps = profile.sharedResidualHelps || [];
    profile.claimedResidualHelpRewards = profile.claimedResidualHelpRewards || [];
    const hasShared = profile.sharedResidualHelps.some((item) => item.assistId === assistId);
    if (!hasShared || profile.claimedResidualHelpRewards.includes(assistId)) {
      return false;
    }

    profile.claimedResidualHelpRewards.push(assistId);
    profile.diamonds += reward;
    this.saveProfile(profile);
    return true;
  }

  public static updateDailyChallengeBest(dateKey: string, score: number, moves = 0): void {
    const profile = this.getProfile();
    if (profile.dailyChallengeDate !== dateKey) {
      profile.dailyChallengeDate = dateKey;
      profile.dailyChallengeBest = 0;
      profile.dailyChallengeBestMoves = 0;
    }
    if (score > (profile.dailyChallengeBest || 0)) {
      profile.dailyChallengeBest = score;
      profile.dailyChallengeBestMoves = moves;
      this.saveProfile(profile);
    }
  }

  public static setPowerSaveMode(enabled: boolean): void {
    const profile = this.getProfile();
    profile.powerSaveMode = enabled;
    this.saveProfile(profile);
  }

  public static isPowerSaveMode(): boolean {
    return !!this.getProfile().powerSaveMode;
  }

  public static isThemeUnlocked(themeIndex: number): boolean {
    const profile = this.getProfile();
    return (profile.unlockedThemes || [0]).includes(themeIndex);
  }

  public static unlockTheme(themeIndex: number, cost: number): boolean {
    const profile = this.getProfile();
    profile.unlockedThemes = profile.unlockedThemes || [0];
    if (profile.unlockedThemes.includes(themeIndex)) {
      return true;
    }
    if (profile.diamonds < cost) {
      return false;
    }
    profile.diamonds -= cost;
    profile.unlockedThemes.push(themeIndex);
    this.saveProfile(profile);
    return true;
  }

  public static setSelectedTheme(themeIndex: number): void {
    const profile = this.getProfile();
    profile.selectedTheme = themeIndex;
    this.saveProfile(profile);
  }

  public static claimShareReward(dateKey: string, reward: number, dailyLimit = 1): boolean {
    const profile = this.getProfile();
    if (profile.lastShareRewardDate !== dateKey) {
      profile.lastShareRewardDate = dateKey;
      profile.shareRewardClaimCount = 0;
    }
    if ((profile.shareRewardClaimCount || 0) >= dailyLimit) {
      this.saveProfile(profile);
      return false;
    }
    profile.shareRewardClaimCount = (profile.shareRewardClaimCount || 0) + 1;
    profile.diamonds += reward;
    this.saveProfile(profile);
    return true;
  }

  public static getBlessingLevel(blessingId: string): number {
    const profile = this.getProfile();
    return Math.max(0, Math.floor(profile.blessings?.[blessingId] || 0));
  }

  public static addBlessing(blessingId: string): number {
    const profile = this.getProfile();
    profile.blessings = profile.blessings || {};
    profile.blessings[blessingId] = Math.max(0, Math.floor(profile.blessings[blessingId] || 0)) + 1;
    this.saveProfile(profile);
    return profile.blessings[blessingId];
  }

  private static normalizeProfile(profile: UserProfile): UserProfile {
    // Reset the old prototype seed so a real first-time player starts from level 1.
    if (!profile.profileVersion && profile.levelProgress >= 50 && profile.diamonds >= 1000) {
      return this.defaultProfile();
    }

    profile.profileVersion = PROFILE_VERSION;
    profile.diamonds = Math.max(0, Number.isFinite(profile.diamonds) ? profile.diamonds : 0);
    profile.energy = Math.max(0, Math.min(10, Number.isFinite(profile.energy) ? profile.energy : 10));
    profile.lastEnergyTimestamp = Number.isFinite(profile.lastEnergyTimestamp) ? profile.lastEnergyTimestamp : Date.now();
    profile.levelProgress = Math.max(0, Number.isFinite(profile.levelProgress) ? Math.floor(profile.levelProgress) : 0);
    profile.claimedSignins = Array.isArray(profile.claimedSignins) ? profile.claimedSignins : [];
    profile.lastSigninTimestamp = Number.isFinite(profile.lastSigninTimestamp) ? profile.lastSigninTimestamp : 0;
    profile.unlockedAchievements = Array.isArray(profile.unlockedAchievements) ? profile.unlockedAchievements : [];
    profile.assistedResiduals = Array.isArray(profile.assistedResiduals) ? profile.assistedResiduals : [];
    profile.sharedResidualHelps = Array.isArray(profile.sharedResidualHelps) ? profile.sharedResidualHelps : [];
    profile.claimedResidualHelpRewards = Array.isArray(profile.claimedResidualHelpRewards) ? profile.claimedResidualHelpRewards : [];
    profile.dailyChallengeBest = Number.isFinite(profile.dailyChallengeBest) ? profile.dailyChallengeBest : 0;
    profile.dailyChallengeBestMoves = Number.isFinite(profile.dailyChallengeBestMoves) ? profile.dailyChallengeBestMoves : 0;
    profile.dailyChallengeDate = typeof profile.dailyChallengeDate === 'string' ? profile.dailyChallengeDate : '';
    profile.powerSaveMode = typeof profile.powerSaveMode === 'boolean' ? profile.powerSaveMode : false;
    profile.selectedTheme = Number.isFinite(profile.selectedTheme) ? Math.max(0, Math.floor(profile.selectedTheme)) : 0;
    profile.unlockedThemes = Array.isArray(profile.unlockedThemes) && profile.unlockedThemes.length > 0 ? profile.unlockedThemes : [0];
    if (!profile.unlockedThemes.includes(0)) profile.unlockedThemes.push(0);
    profile.lastShareRewardDate = typeof profile.lastShareRewardDate === 'string' ? profile.lastShareRewardDate : '';
    profile.shareRewardClaimCount = Number.isFinite(profile.shareRewardClaimCount) ? profile.shareRewardClaimCount : 0;
    profile.blessings = profile.blessings && typeof profile.blessings === 'object' ? profile.blessings : {};
    return profile;
  }

  private static applyEnergyRecovery(profile: UserProfile): void {
    const now = Date.now();
    const intervalMs = 10 * 60 * 1000;
    if (profile.energy >= 10) {
      profile.lastEnergyTimestamp = now;
      return;
    }

    const elapsed = now - (profile.lastEnergyTimestamp ?? now);
    if (elapsed < intervalMs) {
      return;
    }

    const recovered = Math.floor(elapsed / intervalMs);
    profile.energy = Math.min(10, profile.energy + recovered);
    profile.lastEnergyTimestamp = profile.energy >= 10 ? now : (profile.lastEnergyTimestamp ?? now) + recovered * intervalMs;
  }
}
