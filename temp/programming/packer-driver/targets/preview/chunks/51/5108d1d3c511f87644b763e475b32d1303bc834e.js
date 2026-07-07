System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, AdService, _crd;

  function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

  function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

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

        static showRewarded(placement) {
          var _this = this;

          return _asyncToGenerator(function* () {
            if (!_this.rewardedVideoAd) {
              return {
                completed: true,
                placement,
                error: '广告未接入，开发环境默认发放奖励'
              };
            }

            return new Promise(resolve => {
              var ad = _this.rewardedVideoAd;

              var onClose = res => {
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
          })();
        }

      });

      AdService.rewardedVideoAd = null;

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=5108d1d3c511f87644b763e475b32d1303bc834e.js.map