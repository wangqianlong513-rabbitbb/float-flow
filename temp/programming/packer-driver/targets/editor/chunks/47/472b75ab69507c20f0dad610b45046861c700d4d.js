System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, WeChatService, _crd;

  _export("WeChatService", void 0);

  return {
    setters: [function (_cc) {
      _cclegacy = _cc.cclegacy;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "310eahTqTtFC7mK5OVNtlYW", "WeChatService", undefined);

      _export("WeChatService", WeChatService = class WeChatService {
        static isWeChatMiniGame() {
          return typeof wx !== 'undefined';
        }

        static showToast(title) {
          if (typeof wx !== 'undefined' && wx.showToast) {
            wx.showToast({
              title,
              icon: 'none'
            });
            return;
          } // eslint-disable-next-line no-console


          console.log('[Toast]', title);
        }

        static vibrateShort() {
          if (typeof wx !== 'undefined' && wx.vibrateShort) {
            wx.vibrateShort({
              type: 'light'
            });
          }
        }

      });

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=472b75ab69507c20f0dad610b45046861c700d4d.js.map