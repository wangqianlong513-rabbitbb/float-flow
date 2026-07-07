System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, AdService, _crd;

  _export("AdService", void 0);

  return {
    setters: [function (_cc) {
      _cclegacy = _cc.cclegacy;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "4f496gNGbpLBKVrVr8iei7g", "AdService", undefined);

      _export("AdService", AdService = class AdService {
        static init(adUnitId) {
          if (typeof wx === 'undefined' || !wx.createRewardedVideoAd || !adUnitId) {
            return;
          }

          this.rewardedVideoAd = wx.createRewardedVideoAd({
            adUnitId
          });
        }

        static async showRewarded(placement) {
          if (!this.rewardedVideoAd) {
            return {
              completed: true,
              placement,
              error: '广告未接入，开发环境默认发放奖励'
            };
          }

          return new Promise(resolve => {
            const ad = this.rewardedVideoAd;

            const onClose = res => {
              ad.offClose(onClose);
              resolve({
                completed: !!(res != null && res.isEnded),
                placement
              });
            };

            ad.onClose(onClose);
            ad.show().catch(() => {
              ad.load().then(() => ad.show()).catch(error => {
                ad.offClose(onClose);
                resolve({
                  completed: false,
                  placement,
                  error: error.message
                });
              });
            });
          });
        }

      });

      AdService.rewardedVideoAd = null;

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=5108d1d3c511f87644b763e475b32d1303bc834e.js.map