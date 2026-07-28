import { sys } from 'cc';

export interface UserProfile {
  profileVersion?: number;
  diamonds: number;
  energy: number;
  lastEnergyTimestamp?: number;
  levelProgress: number; // next playable journey level index, also equals completed count
  claimedSignins: number[]; // indices of days signed in, e.g., [0] if Day 1 is claimed
  lastSigninTimestamp: number; // timestamp of last signin
  signinStreak?: number;
  lastSigninDateKey?: string;
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
  rewardedAdClaims?: Record<string, number>;
  blessings?: Record<string, number>;
  tileMastery?: Record<string, number>;
  collectedTiles?: string[];
  titles?: string[];
  levelAttempts?: Record<string, { starts: number; wins: number; fails: number; bestMoves: number; lastReason?: string }>;
  unlockedCosmetics?: string[];
  selectedTrail?: string;
  selectedRunnerSkin?: string;
  islandDecor?: string[];
  commuteDate?: string;
  commuteCompletedStages?: number[];
  commuteRewardClaimedDate?: string;
  hintTiers?: Record<string, number>;
  beautifulRouteBest?: number;
  totalStars?: number;
  levelBestStars?: Record<string, number>;
  bulletTimeUses?: number;
  endlessBestStage?: number;
  endlessBestScore?: number;
  grantedAdTransactions?: string[];
}

export interface ResidualHelpRecord {
  assistId: string;
  levelId: number;
  createdAt: number;
}

const STORAGE_KEY = 'flow_land_light_profile';
const XOR_KEY = 77; // Obfuscation XOR key
const PROFILE_VERSION = 4;

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
      signinStreak: 0,
      lastSigninDateKey: '',
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
      rewardedAdClaims: {},
      blessings: {},
      tileMastery: {},
      collectedTiles: [],
      titles: [],
      levelAttempts: {},
      unlockedCosmetics: ['trail_default', 'runner_default'],
      selectedTrail: 'trail_default',
      selectedRunnerSkin: 'runner_default',
      islandDecor: [],
      commuteDate: '',
      commuteCompletedStages: [],
      commuteRewardClaimedDate: '',
      hintTiers: {},
      beautifulRouteBest: 0,
      totalStars: 0,
      levelBestStars: {},
      bulletTimeUses: 0,
      endlessBestStage: 0,
      endlessBestScore: 0,
      grantedAdTransactions: []
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
    return profile.lastSigninDateKey === this.localDateKey(new Date());
  }

  public static getSigninDayIndex(): number {
    const profile = this.getProfile();
    if (this.refreshSigninCycle(profile)) {
      this.saveProfile(profile);
    }
    return Math.max(0, Math.min(6, profile.signinStreak || 0));
  }

  public static claimDailySignin(dayIndex: number, diamondReward: number, fillEnergy = false, decorId = ''): boolean {
    if (this.isTodaySignedin()) {
      return false;
    }
    const profile = this.getProfile();
    this.refreshSigninCycle(profile);
    const expectedDay = Math.max(0, Math.min(6, profile.signinStreak || 0));
    if (dayIndex !== expectedDay) {
      return false;
    }
    profile.lastSigninTimestamp = Date.now();
    profile.lastSigninDateKey = this.localDateKey(new Date());
    profile.claimedSignins = Array.from({ length: expectedDay + 1 }, (_, index) => index);
    profile.signinStreak = expectedDay + 1;
    profile.diamonds += diamondReward;
    if (fillEnergy) {
      profile.energy = 10;
      profile.lastEnergyTimestamp = Date.now();
    }
    if (decorId && !(profile.islandDecor || []).includes(decorId)) {
      profile.islandDecor = profile.islandDecor || [];
      profile.islandDecor.push(decorId);
    }
    this.saveProfile(profile);
    return true;
  }

  public static recordJourneyStars(levelId: number, stars: number): number {
    const profile = this.getProfile();
    const key = String(levelId);
    const safeStars = Math.max(0, Math.min(3, Math.floor(stars)));
    profile.levelBestStars = profile.levelBestStars || {};
    const previous = Math.max(0, Math.floor(profile.levelBestStars[key] || 0));
    if (safeStars <= previous) {
      return 0;
    }
    const gained = safeStars - previous;
    profile.levelBestStars[key] = safeStars;
    profile.totalStars = Math.max(0, Math.floor(profile.totalStars || 0)) + gained;
    this.saveProfile(profile);
    return gained;
  }

  public static recordBulletTimeUse(): number {
    const profile = this.getProfile();
    profile.bulletTimeUses = Math.max(0, Math.floor(profile.bulletTimeUses || 0)) + 1;
    this.saveProfile(profile);
    return profile.bulletTimeUses;
  }

  public static updateEndlessBest(stage: number, score: number): boolean {
    const profile = this.getProfile();
    const safeStage = Math.max(0, Math.floor(stage));
    const safeScore = Math.max(0, Math.floor(score));
    const improved = safeStage > (profile.endlessBestStage || 0) || safeScore > (profile.endlessBestScore || 0);
    if (!improved) {
      return false;
    }
    profile.endlessBestStage = Math.max(profile.endlessBestStage || 0, safeStage);
    profile.endlessBestScore = Math.max(profile.endlessBestScore || 0, safeScore);
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

  public static claimRewardedAdBonus(key: string, reward: number, dailyLimit = 1): boolean {
    const profile = this.getProfile();
    const today = new Date().toDateString();
    const claimKey = `${today}:${key}`;
    profile.rewardedAdClaims = profile.rewardedAdClaims || {};
    const count = Math.max(0, Math.floor(profile.rewardedAdClaims[claimKey] || 0));
    if (count >= dailyLimit) {
      this.saveProfile(profile);
      return false;
    }
    profile.rewardedAdClaims[claimKey] = count + 1;
    profile.diamonds += reward;

    // Keep only today's ad-claim counters to avoid unbounded local storage growth.
    Object.keys(profile.rewardedAdClaims).forEach((storedKey) => {
      if (!storedKey.startsWith(`${today}:`)) {
        delete profile.rewardedAdClaims![storedKey];
      }
    });
    this.saveProfile(profile);
    return true;
  }

  public static grantRewardedAdDiamonds(transactionId: string, key: string, reward: number, dailyLimit = 1): boolean {
    if (!transactionId || reward <= 0) {
      return false;
    }
    const profile = this.getProfile();
    profile.grantedAdTransactions = profile.grantedAdTransactions || [];
    if (profile.grantedAdTransactions.includes(transactionId)) {
      return false;
    }
    const today = new Date().toDateString();
    const claimKey = `${today}:${key}`;
    profile.rewardedAdClaims = profile.rewardedAdClaims || {};
    const count = Math.max(0, Math.floor(profile.rewardedAdClaims[claimKey] || 0));
    if (count >= dailyLimit) {
      return false;
    }
    profile.grantedAdTransactions.push(transactionId);
    profile.grantedAdTransactions = profile.grantedAdTransactions.slice(-100);
    profile.rewardedAdClaims[claimKey] = count + 1;
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

  public static recordLevelStart(levelId: number): void {
    const profile = this.getProfile();
    const key = String(levelId);
    profile.levelAttempts = profile.levelAttempts || {};
    const item = profile.levelAttempts[key] || { starts: 0, wins: 0, fails: 0, bestMoves: 0 };
    item.starts++;
    profile.levelAttempts[key] = item;
    this.saveProfile(profile);
  }

  public static recordLevelResult(levelId: number, won: boolean, moves: number, reason = ''): void {
    const profile = this.getProfile();
    const key = String(levelId);
    profile.levelAttempts = profile.levelAttempts || {};
    const item = profile.levelAttempts[key] || { starts: 0, wins: 0, fails: 0, bestMoves: 0 };
    if (won) {
      item.wins++;
      item.bestMoves = item.bestMoves <= 0 ? moves : Math.min(item.bestMoves, moves);
    } else {
      item.fails++;
      item.lastReason = reason;
    }
    profile.levelAttempts[key] = item;
    this.saveProfile(profile);
  }

  public static addTileMastery(tileType: string, amount = 1): number {
    const profile = this.getProfile();
    profile.tileMastery = profile.tileMastery || {};
    profile.collectedTiles = profile.collectedTiles || [];
    profile.tileMastery[tileType] = Math.max(0, Math.floor(profile.tileMastery[tileType] || 0)) + amount;
    if (!profile.collectedTiles.includes(tileType)) {
      profile.collectedTiles.push(tileType);
    }
    this.saveProfile(profile);
    return profile.tileMastery[tileType];
  }

  public static unlockTitle(title: string): boolean {
    const profile = this.getProfile();
    profile.titles = profile.titles || [];
    if (profile.titles.includes(title)) {
      return false;
    }
    profile.titles.push(title);
    this.saveProfile(profile);
    return true;
  }

  public static unlockCosmetic(cosmeticId: string): boolean {
    if (!cosmeticId) return false;
    const profile = this.getProfile();
    profile.unlockedCosmetics = profile.unlockedCosmetics || ['trail_default', 'runner_default'];
    if (profile.unlockedCosmetics.includes(cosmeticId)) {
      return false;
    }
    profile.unlockedCosmetics.push(cosmeticId);
    if (cosmeticId.indexOf('trail_') === 0 && (!profile.selectedTrail || profile.selectedTrail === 'trail_default')) {
      profile.selectedTrail = cosmeticId;
    }
    if (cosmeticId.indexOf('runner_') === 0 && (!profile.selectedRunnerSkin || profile.selectedRunnerSkin === 'runner_default')) {
      profile.selectedRunnerSkin = cosmeticId;
    }
    this.saveProfile(profile);
    return true;
  }

  public static addIslandDecor(decorId: string): boolean {
    if (!decorId) return false;
    const profile = this.getProfile();
    profile.islandDecor = profile.islandDecor || [];
    if (profile.islandDecor.includes(decorId)) {
      return false;
    }
    profile.islandDecor.push(decorId);
    this.saveProfile(profile);
    return true;
  }

  public static recordCommuteStage(dateKey: string, stage: number): number {
    const profile = this.getProfile();
    if (profile.commuteDate !== dateKey) {
      profile.commuteDate = dateKey;
      profile.commuteCompletedStages = [];
    }
    profile.commuteCompletedStages = profile.commuteCompletedStages || [];
    if (!profile.commuteCompletedStages.includes(stage)) {
      profile.commuteCompletedStages.push(stage);
    }
    this.saveProfile(profile);
    return profile.commuteCompletedStages.length;
  }

  public static claimCommuteReward(dateKey: string, reward: number): boolean {
    const profile = this.getProfile();
    if (profile.commuteRewardClaimedDate === dateKey) {
      return false;
    }
    profile.commuteRewardClaimedDate = dateKey;
    profile.diamonds += Math.max(0, reward);
    this.saveProfile(profile);
    return true;
  }

  public static nextHintTier(levelId: number): number {
    const profile = this.getProfile();
    profile.hintTiers = profile.hintTiers || {};
    const key = String(levelId);
    profile.hintTiers[key] = Math.min(3, (profile.hintTiers[key] || 0) + 1);
    this.saveProfile(profile);
    return profile.hintTiers[key];
  }

  public static updateBeautifulRouteBest(score: number): boolean {
    const profile = this.getProfile();
    const current = profile.beautifulRouteBest || 0;
    if (score <= current) {
      return false;
    }
    profile.beautifulRouteBest = score;
    this.saveProfile(profile);
    return true;
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
    profile.lastSigninDateKey = typeof profile.lastSigninDateKey === 'string'
      ? profile.lastSigninDateKey
      : (profile.lastSigninTimestamp ? this.localDateKey(new Date(profile.lastSigninTimestamp)) : '');
    profile.signinStreak = Number.isFinite(profile.signinStreak)
      ? Math.max(0, Math.min(7, Math.floor(profile.signinStreak || 0)))
      : Math.max(0, Math.min(7, profile.claimedSignins.length));
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
    profile.rewardedAdClaims = profile.rewardedAdClaims && typeof profile.rewardedAdClaims === 'object' ? profile.rewardedAdClaims : {};
    profile.blessings = profile.blessings && typeof profile.blessings === 'object' ? profile.blessings : {};
    profile.tileMastery = profile.tileMastery && typeof profile.tileMastery === 'object' ? profile.tileMastery : {};
    profile.collectedTiles = Array.isArray(profile.collectedTiles) ? profile.collectedTiles : [];
    profile.titles = Array.isArray(profile.titles) ? profile.titles : [];
    profile.levelAttempts = profile.levelAttempts && typeof profile.levelAttempts === 'object' ? profile.levelAttempts : {};
    profile.unlockedCosmetics = Array.isArray(profile.unlockedCosmetics) ? profile.unlockedCosmetics : ['trail_default', 'runner_default'];
    if (!profile.unlockedCosmetics.includes('trail_default')) profile.unlockedCosmetics.push('trail_default');
    if (!profile.unlockedCosmetics.includes('runner_default')) profile.unlockedCosmetics.push('runner_default');
    profile.selectedTrail = typeof profile.selectedTrail === 'string' ? profile.selectedTrail : 'trail_default';
    profile.selectedRunnerSkin = typeof profile.selectedRunnerSkin === 'string' ? profile.selectedRunnerSkin : 'runner_default';
    profile.islandDecor = Array.isArray(profile.islandDecor) ? profile.islandDecor : [];
    profile.commuteDate = typeof profile.commuteDate === 'string' ? profile.commuteDate : '';
    profile.commuteCompletedStages = Array.isArray(profile.commuteCompletedStages) ? profile.commuteCompletedStages : [];
    profile.commuteRewardClaimedDate = typeof profile.commuteRewardClaimedDate === 'string' ? profile.commuteRewardClaimedDate : '';
    profile.hintTiers = profile.hintTiers && typeof profile.hintTiers === 'object' ? profile.hintTiers : {};
    profile.beautifulRouteBest = Number.isFinite(profile.beautifulRouteBest) ? profile.beautifulRouteBest : 0;
    profile.levelBestStars = profile.levelBestStars && typeof profile.levelBestStars === 'object' ? profile.levelBestStars : {};
    profile.totalStars = Number.isFinite(profile.totalStars)
      ? Math.max(0, Math.floor(profile.totalStars || 0))
      : Object.values(profile.levelBestStars).reduce((sum, stars) => sum + Math.max(0, Math.min(3, Math.floor(stars || 0))), 0);
    profile.bulletTimeUses = Number.isFinite(profile.bulletTimeUses) ? Math.max(0, Math.floor(profile.bulletTimeUses || 0)) : 0;
    profile.endlessBestStage = Number.isFinite(profile.endlessBestStage) ? Math.max(0, Math.floor(profile.endlessBestStage || 0)) : 0;
    profile.endlessBestScore = Number.isFinite(profile.endlessBestScore) ? Math.max(0, Math.floor(profile.endlessBestScore || 0)) : 0;
    profile.grantedAdTransactions = Array.isArray(profile.grantedAdTransactions) ? profile.grantedAdTransactions.slice(-100) : [];
    this.refreshSigninCycle(profile);
    return profile;
  }

  private static refreshSigninCycle(profile: UserProfile): boolean {
    const today = this.localDateKey(new Date());
    if (!profile.lastSigninDateKey || profile.lastSigninDateKey === today) {
      return false;
    }
    const gap = this.dayGap(profile.lastSigninDateKey, today);
    if (gap > 1 || (profile.signinStreak || 0) >= 7) {
      profile.signinStreak = 0;
      profile.claimedSignins = [];
      return true;
    }
    return false;
  }

  private static localDateKey(date: Date): string {
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${date.getFullYear()}${month}${day}`;
  }

  private static dayGap(fromKey: string, toKey: string): number {
    const parse = (key: string): number => {
      if (!/^\d{8}$/.test(key)) return 0;
      return Date.UTC(Number(key.slice(0, 4)), Number(key.slice(4, 6)) - 1, Number(key.slice(6, 8)));
    };
    const from = parse(fromKey);
    const to = parse(toKey);
    return from > 0 && to > 0 ? Math.round((to - from) / 86400000) : Number.POSITIVE_INFINITY;
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
