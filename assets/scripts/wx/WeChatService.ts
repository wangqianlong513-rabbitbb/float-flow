declare const wx: any;

export class WeChatService {
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
    if (typeof wx !== 'undefined' && wx.showModal) {
      wx.showModal(options);
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
        title: '我在《浮岛流光》深空光线解谜，快来挑战高阶立体光路偏转！',
        imageUrl: '',
      }));
    }

    if (wx.onShareTimeline) {
      wx.onShareTimeline(() => ({
        title: '《浮岛流光》休闲益智解谜小游戏，开启你的高光时刻！',
      }));
    }
  }

  static checkLaunchQuery(
    onOpenLevel?: (levelId: number) => void,
    onOpenResidual?: (residualStr: string) => void
  ): void {
    if (typeof wx === 'undefined') return;

    const handleQuery = (query: any) => {
      if (!query) return;
      if (query.residual && typeof query.residual === 'string' && onOpenResidual) {
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
}

