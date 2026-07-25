import { GoalConfig, GridPos, LevelConfig, PathNode, TileType } from './GameTypes';

export interface FailureInsight {
  grade: '差一格' | '差一秒' | '差一张牌' | '路线断裂' | '颜色不符' | '坠入虚空';
  rescueText: string;
  shareText: string;
  missingCell?: GridPos;
}

export interface CosmeticItem {
  id: string;
  name: string;
  kind: 'trail' | 'runner' | 'island_decor';
  unlockText: string;
}

export interface CommuteChallenge {
  title: string;
  subtitle: string;
  stages: number[];
  reward: number;
}

const TRAIL_ITEMS: CosmeticItem[] = [
  { id: 'trail_aurora', name: '极光光轨', kind: 'trail', unlockText: '完成每日通勤挑战解锁' },
  { id: 'trail_sakura', name: '樱花光轨', kind: 'trail', unlockText: '分享漂亮光轨解锁' },
  { id: 'trail_neon', name: '霓虹光轨', kind: 'trail', unlockText: '好友挑战胜利解锁' },
];

const RUNNER_ITEMS: CosmeticItem[] = [
  { id: 'runner_crystal_cat', name: '光猫', kind: 'runner', unlockText: '帮助好友接光后解锁' },
  { id: 'runner_paper_plane', name: '纸飞机', kind: 'runner', unlockText: '三分钟挑战达成三星解锁' },
];

const DECOR_ITEMS: CosmeticItem[] = [
  { id: 'decor_lighthouse', name: '迷你灯塔', kind: 'island_decor', unlockText: '点亮双灯塔解锁' },
  { id: 'decor_cafe', name: '浮岛咖啡馆', kind: 'island_decor', unlockText: '晚间治愈关奖励' },
  { id: 'decor_star_tree', name: '星核树', kind: 'island_decor', unlockText: '收集星核解锁' },
];

const LIGHT_MAILS = [
  '这束光，送给今天有点累但仍在前进的你。',
  '你刚刚修好的不是道路，是一座小岛和世界的联系。',
  '有些路不用一次走对，能回头改写也很了不起。',
  '今日光轨已送达，愿你下一个路口更亮一点。',
  '浮岛重新亮起时，城市的夜也没那么重了。',
];

export class EngagementService {
  static getLightMail(level: LevelConfig, moves: number): string {
    const seed = Math.abs(level.id * 31 + moves * 7 + (level.objective || '').length);
    return LIGHT_MAILS[seed % LIGHT_MAILS.length];
  }

  static analyzeFailure(reason: string, current: GridPos | null, goals: GoalConfig[], path: PathNode[] = []): FailureInsight {
    const last = path[path.length - 1] || current || null;
    const minGoalDistance = last && goals.length > 0
      ? Math.min(...goals.map((goal) => Math.abs(goal.row - last.row) + Math.abs(goal.col - last.col)))
      : 99;

    if (reason.indexOf('颜色') >= 0) {
      return {
        grade: '颜色不符',
        rescueText: '需要先经过染色水晶，或让好友帮你改一格颜色路线。',
        shareText: '这束光颜色不对，帮我改命！',
        missingCell: last || undefined,
      };
    }
    if (reason.indexOf('虚空') >= 0 || reason.indexOf('没有水晶路') >= 0) {
      return {
        grade: minGoalDistance <= 1 ? '差一格' : '坠入虚空',
        rescueText: minGoalDistance <= 1 ? '只差最后一格，最适合发给好友一格救援。' : '前方缺少承接道路，看广告可补一张命运牌。',
        shareText: minGoalDistance <= 1 ? '差一格就通关，帮我接上！' : '光要掉下去了，帮我补路！',
        missingCell: last || undefined,
      };
    }
    if (reason.indexOf('时间') >= 0) {
      return {
        grade: '差一秒',
        rescueText: '看广告可呼叫时空导师，倒回关键节点。',
        shareText: '差一秒点亮浮岛，谁来救一下？',
        missingCell: last || undefined,
      };
    }
    if (reason.indexOf('方向') >= 0 || reason.indexOf('连通') >= 0) {
      return {
        grade: '差一张牌',
        rescueText: '当前路线方向不对，好友进来只要换一块关键水晶。',
        shareText: '我这张牌转错了，帮我重接光路！',
        missingCell: last || undefined,
      };
    }
    return {
      grade: minGoalDistance <= 2 ? '差一格' : '路线断裂',
      rescueText: minGoalDistance <= 2 ? '离终点很近，分享求助转化更高。' : '路线中段断裂，建议使用分级提示。',
      shareText: minGoalDistance <= 2 ? '快到了，帮我补最后一下！' : '这局有点难，来一起修路。',
      missingCell: last || undefined,
    };
  }

  static getCommuteChallenge(now = new Date()): CommuteChallenge {
    const hour = now.getHours();
    if (hour >= 18 || hour < 1) {
      return { title: '下班治愈光路', subtitle: '不卷步数，只修好今天最后一座浮岛', stages: [0, 1, 2], reward: 60 };
    }
    if (hour >= 11 && hour <= 14) {
      return { title: '午休极速榜', subtitle: '三关轻挑战，看看谁能少一步', stages: [2, 3, 4], reward: 50 };
    }
    return { title: '通勤 3 分钟挑战', subtitle: '早高峰接通三束光，给今天开个好头', stages: [0, 2, 4], reward: 50 };
  }

  static scoreBeautifulRoute(moves: number, skillCombo: number, bonusCollected: boolean, stars: number): number {
    const base = 60 + stars * 8 + skillCombo * 6 + (bonusCollected ? 10 : 0);
    const penalty = Math.max(0, moves - 6) * 2;
    return Math.max(30, Math.min(100, base - penalty));
  }

  static pickCosmeticReward(skillCombo: number, bonusCollected: boolean, helpedFriend: boolean): CosmeticItem {
    if (helpedFriend) return RUNNER_ITEMS[0];
    if (bonusCollected) return DECOR_ITEMS[2];
    if (skillCombo >= 3) return TRAIL_ITEMS[2];
    return TRAIL_ITEMS[0];
  }

  static getAllCosmetics(): CosmeticItem[] {
    return [...TRAIL_ITEMS, ...RUNNER_ITEMS, ...DECOR_ITEMS];
  }

  static getHintTierText(tier: number): string {
    if (tier <= 1) return '一级提示：只标出大致区域，保留解谜乐趣。';
    if (tier === 2) return '二级提示：给出具体格子。';
    return '三级提示：给出格子、牌型和旋转角度。';
  }

  static getTileMoodName(tile: TileType): string {
    switch (tile) {
      case 'time_crystal': return '时光';
      case 'star_crystal': return '星核';
      case 'refresh_crystal': return '灵感';
      case 'mirror': return '镜像';
      case 'vine': return '生长';
      case 'jump': return '跃迁';
      case 'blackhole': return '黑洞';
      case 'splitter': return '分光';
      default: return '水晶';
    }
  }
}
