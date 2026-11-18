import { js, Node } from 'cc';

declare const wx: any;

/**
 * 微信小游戏商业化广告位配置
 * 开通流量主后，填入真实 adunit 即可全自动启用真实视频/插屏广告。
 * 未配置真实 ID 时，游戏将全自动降级为福利体验，100% 杜绝“广告位未配置”与“无法复活”报错！
 */
export const WX_AD_CONFIG = {
  REWARDED_AD_UNIT_ID: '',      // 激励视频广告位 ID (从微信公众平台流量主获取)
  INTERSTITIAL_AD_UNIT_ID: '',  // 插屏广告位 ID
};

export class WeChatService {
  public static adUnitId: string = WX_AD_CONFIG.REWARDED_AD_UNIT_ID;
  public static interstitialAdUnitId: string = WX_AD_CONFIG.INTERSTITIAL_AD_UNIT_ID;

  private static safeDecodeQueryValue(value: string): string {
    try {
      return decodeURIComponent(value);
    } catch (_error) {
      return value;
    }
  }

  static isWeChatMiniGame(): boolean {
    return typeof wx !== 'undefined';
  }

  /**
   * 强制关闭微信调试模式与 vConsole，确保正式上线纯净无遮挡
   */
  static disableDebugMode(): void {
    if (typeof wx !== 'undefined' && wx.setEnableDebug) {
      try {
        wx.setEnableDebug({ enableDebug: false });
      } catch (_e) {
        // ignore
      }
    }
  }

  static hasInitialLaunchQuery(): boolean {
    if (typeof wx === 'undefined' || !wx.getLaunchOptionsSync) return false;
    try {
      const query = wx.getLaunchOptionsSync()?.query;
      return !!query && Object.keys(query).length > 0;
    } catch (_error) {
      return false;
    }
  }

  static showToast(title: string, icon: 'none' | 'success' | 'error' = 'none'): void {
    if (typeof wx !== 'undefined' && wx.showToast) {
      wx.showToast({ title, icon });
      return;
    }
    // eslint-disable-next-line no-console
    console.log('[Toast]', title, `(${icon})`);
  }

  static showModal(options: {
    title: string;
    content: string;
    confirmText?: string;
    cancelText?: string;
    success?: (res: { confirm: boolean; cancel: boolean }) => void;
  }): void {
    const confirm = (options.confirmText || '确定').substring(0, 4);
    const cancel = (options.cancelText || '取消').substring(0, 4);

    if (typeof wx !== 'undefined' && wx.showModal) {
      wx.showModal({
        title: options.title,
        content: options.content,
        confirmText: confirm,
        cancelText: cancel,
        success: options.success,
      });
    } else if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      const confirmed = window.confirm(`${options.title}\n\n${options.content}`);
      if (options.success) {
        options.success({ confirm: confirmed, cancel: !confirmed });
      }
    } else {
      console.log('[Modal]', options.title, options.content);
      if (options.success) {
        options.success({ confirm: true, cancel: false });
      }
    }
  }

  static showActionSheet(items: string[], onSelect: (index: number) => void): void {
    if (typeof wx !== 'undefined' && wx.showActionSheet) {
      wx.showActionSheet({
        itemList: items,
        success: (res: { tapIndex: number }) => {
          if (typeof res.tapIndex === 'number') {
            onSelect(res.tapIndex);
          }
        },
      });
      return;
    }

    WeChatService.showModal({
      title: '更多操作',
      content: items.map((item, index) => `${index + 1}. ${item}`).join('\n'),
      confirmText: '第1项',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          onSelect(0);
        }
      },
    });
  }

  static vibrateShort(type: 'light' | 'medium' | 'heavy' = 'light'): void {
    if (typeof wx !== 'undefined' && wx.vibrateShort) {
      wx.vibrateShort({ type });
    }
  }

  static vibrateLong(): void {
    if (typeof wx !== 'undefined' && wx.vibrateLong) {
      wx.vibrateLong();
    }
  }

  static initShareMenu(): void {
    if (typeof wx === 'undefined') return;

    if (wx.showShareMenu) {
      wx.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage', 'shareTimeline'],
      });
    }

    if (wx.onShareAppMessage) {
      wx.onShareAppMessage(() => ({
        title: '3秒上手的光路解谜：来《浮岛浮光》接上这束光！',
      }));
    }

    if (wx.onShareTimeline) {
      wx.onShareTimeline(() => ({
        title: '《浮岛浮光》梦幻极光益智解谜，看看你能几步通关',
      }));
    }
  }

  static checkLaunchQuery(
    onOpenLevel?: (levelId: number, challengeMoves?: number) => void,
    onOpenResidual?: (residualStr: string) => void,
    onResidualDone?: (assistId: string) => void,
    onOpenDaily?: () => void
  ): void {
    if (typeof wx === 'undefined') return;

    const handleQuery = (query: any) => {
      if (!query) return;
      if (query.assistDone && typeof query.assistDone === 'string' && onResidualDone) {
        onResidualDone(this.safeDecodeQueryValue(query.assistDone));
      } else if (query.daily && onOpenDaily) {
        onOpenDaily();
      } else if (query.residual && typeof query.residual === 'string' && onOpenResidual) {
        onOpenResidual(query.residual);
      } else if (query.level && onOpenLevel) {
        const lvlId = parseInt(query.level as string, 10);
        const moves = query.challengeMoves ? parseInt(query.challengeMoves as string, 10) : undefined;
        if (!isNaN(lvlId) && lvlId > 0) {
          onOpenLevel(lvlId, moves);
        }
      }
    };

    if (wx.getLaunchOptionsSync) {
      const options = wx.getLaunchOptionsSync();
      if (options && options.query) {
        handleQuery(options.query);
      }
    }

    if (wx.onShow) {
      wx.onShow((res: any) => {
        if (res && res.query) {
          handleQuery(res.query);
        }
      });
    }
  }

  static uploadUserScore(levelIndex: number, score: number): void {
    if (typeof wx === 'undefined' || !wx.setUserCloudStorage) {
      console.log('[WeChat Mock] Upload score:', { levelIndex, score });
      return;
    }

    wx.setUserCloudStorage({
      KVDataList: [
        {
          key: 'user_max_score',
          value: JSON.stringify({
            wxgame: {
              score: score,
              level: levelIndex,
              update_time: Date.now()
            }
          })
        }
      ],
      success: () => {
        console.log('[WeChat] Score upload success:', { levelIndex, score });
      },
      fail: (err: any) => {
        console.error('[WeChat] Score upload fail:', err);
      }
    });
  }

  static showFriendLeaderboard(containerNode: Node): void {
    if (typeof wx === 'undefined') {
      console.log('[WeChat Mock] Open Friend Leaderboard inside:', containerNode.name);
      return;
    }

    const SubContextViewClass = js.getClassByName('cc.SubContextView');
    if (SubContextViewClass) {
      let subView = containerNode.getComponent(SubContextViewClass as any);
      if (!subView) {
        subView = containerNode.addComponent(SubContextViewClass as any);
      }
      if (subView) {
        (subView as any).enabled = true;
      }
    }

    if (wx.getOpenDataContext) {
      wx.getOpenDataContext().postMessage({
        action: 'showLeaderboard'
      });
    }
  }

  static hideFriendLeaderboard(containerNode: Node): void {
    if (typeof wx === 'undefined') {
      return;
    }

    const SubContextViewClass = js.getClassByName('cc.SubContextView');
    if (SubContextViewClass) {
      const subView = containerNode.getComponent(SubContextViewClass as any);
      if (subView) {
        (subView as any).enabled = false;
      }
    }

    if (wx.getOpenDataContext) {
      wx.getOpenDataContext().postMessage({
        action: 'clear'
      });
    }
  }

  static checkUpdate(): void {
    if (typeof wx === 'undefined' || !wx.getUpdateManager) return;
    try {
      const updateManager = wx.getUpdateManager();
      updateManager.onUpdateReady(() => {
        wx.showModal({
          title: '更新提示',
          content: '新版本已经准备好，是否重启体验全新内容？',
          showCancel: false,
          confirmText: '立刻重启',
          success: (res: any) => {
            if (res.confirm) {
              updateManager.applyUpdate();
            }
          }
        });
      });
      updateManager.onUpdateFailed(() => {
        console.warn('[WeChatService] 新版本静默下载失败');
      });
    } catch (e) {
      console.warn('[WeChatService] checkUpdate failed:', e);
    }
  }

  static openMiniProgram(appId: string, path = '', fallbackToast = ''): void {
    if (typeof wx !== 'undefined' && wx.navigateToMiniProgram) {
      wx.navigateToMiniProgram({
        appId,
        path,
        fail: (err: any) => {
          console.warn('[WeChatService] navigateToMiniProgram failed:', err);
          this.showToast(fallbackToast || '联动即将开启，敬请期待！', 'none');
        }
      });
    } else {
      this.showToast(fallbackToast || '体验版环境，即将支持一键跳转！', 'none');
    }
  }
}
