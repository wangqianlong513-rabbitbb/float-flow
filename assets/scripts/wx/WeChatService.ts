import { js, Node } from 'cc';

declare const wx: any;

export class WeChatService {
  public static adUnitId: string = '';
  public static interstitialAdUnitId: string = '';

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
