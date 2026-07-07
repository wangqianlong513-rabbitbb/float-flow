declare const wx: any;

export class WeChatService {
  static isWeChatMiniGame(): boolean {
    return typeof wx !== 'undefined';
  }

  static showToast(title: string): void {
    if (typeof wx !== 'undefined' && wx.showToast) {
      wx.showToast({ title, icon: 'none' });
      return;
    }
    // eslint-disable-next-line no-console
    console.log('[Toast]', title);
  }

  static vibrateShort(): void {
    if (typeof wx !== 'undefined' && wx.vibrateShort) {
      wx.vibrateShort({ type: 'light' });
    }
  }
}
