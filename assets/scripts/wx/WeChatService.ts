import { js, Node } from 'cc';

declare const wx: any;

export class WeChatService {
  public static adUnitId: string = 'adunit-demo-id'; // 默认测试 ID，可通过 WeChatService.adUnitId = '...' 动态赋值

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

  static showVideoAd(onSuccess: () => void, onFail?: () => void): void {
    if (typeof wx !== 'undefined' && wx.createRewardedVideoAd && WeChatService.adUnitId && WeChatService.adUnitId.indexOf('demo') < 0) {
      try {
        let videoAd: any = (WeChatService as any)._videoAd;
        if (!videoAd) {
          videoAd = wx.createRewardedVideoAd({ adUnitId: WeChatService.adUnitId });
          (WeChatService as any)._videoAd = videoAd;
        }
        videoAd.offClose();
        videoAd.onClose((res: any) => {
          if (res && res.isEnded || res === undefined) {
            onSuccess();
          } else {
            WeChatService.showToast('广告中途退出，未获得补给说明。', 'none');
            if (onFail) onFail();
          }
        });
        videoAd.offError();
        videoAd.onError((err: any) => {
          console.log('[VideoAd Error]', err);
          // 调试及未配置广告位ID时自动发放奖励（模拟测试时注释掉此行）
          // onSuccess();
          WeChatService.showToast(`广告拉取失败: ${err.errMsg || err.errCode}`, 'none');
          if (onFail) onFail();
        });
        videoAd.show().catch((err: any) => {
          videoAd.load().then(() => videoAd.show()).catch((loadErr: any) => {
            // 调试及未配置广告位ID时自动发放奖励（模拟测试时注释掉此行）
            // onSuccess();
            WeChatService.showToast('广告加载异常，请稍后再试', 'none');
            if (onFail) onFail();
          });
        });
        return;
      } catch (e) {
        // 调试及未配置广告位ID时自动发放奖励（模拟测试时注释掉此行）
        // onSuccess();
        WeChatService.showToast('广告组件拉起异常', 'none');
        if (onFail) onFail();
        return;
      }
    }
    // 非微信环境或开发环境下，直接发放补给奖励
    onSuccess();
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
        title: '3秒上手的光路解谜：来《浮岛流光》接上这束光！',
      }));
    }

    if (wx.onShareTimeline) {
      wx.onShareTimeline(() => ({
        title: '《浮岛流光》休闲光路解谜，看看你能几步通关',
      }));
    }
  }

  static checkLaunchQuery(
    onOpenLevel?: (levelId: number) => void,
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
        if (!isNaN(lvlId) && lvlId > 0) {
          onOpenLevel(lvlId);
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
}
