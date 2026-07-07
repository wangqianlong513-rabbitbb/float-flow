System.register(["__unresolved_0", "cc"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, ShareService, _crd;

  function _reportPossibleCrUseOfLevelConfig(extras) {
    _reporterNs.report("LevelConfig", "../core/GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfRunnerState(extras) {
    _reporterNs.report("RunnerState", "../core/GameTypes", _context.meta, extras);
  }

  function _reportPossibleCrUseOfTileType(extras) {
    _reporterNs.report("TileType", "../core/GameTypes", _context.meta, extras);
  }

  _export("ShareService", void 0);

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "dce0crlJNhBn4QMa6eB3QBn", "ShareService", undefined);

      _export("ShareService", ShareService = class ShareService {
        static encodeResidual(payload) {
          var json = JSON.stringify(payload);
          return encodeURIComponent(json);
        }

        static decodeResidual(value) {
          try {
            return JSON.parse(decodeURIComponent(value));
          } catch (_error) {
            return null;
          }
        }

        static shareResidual(level, payload) {
          var query = "residual=" + this.encodeResidual(payload);
          var title = "\u6211\u5728\u300A\u6D6E\u5C9B\u6D6E\u5149\u300B\u7B2C " + level.id + " \u5173\u53EA\u5DEE\u4E00\u6B65\uFF0C\u5E2E\u6211\u63A5\u4E0A\u8FD9\u675F\u5149\uFF01";
          this.share(title, query);
        }

        static sharePoster(level, scoreText) {
          var title = "\u6211\u5728\u300A\u6D6E\u5C9B\u6D6E\u5149\u300B\u7B2C " + level.id + " \u5173\u6253\u51FA\u4E86 " + scoreText + "\uFF0C\u6765\u6311\u6218\u6211\u7684\u5149\u8F68\uFF01";
          this.share(title, "level=" + level.id);
        }

        static share(title, query) {
          if (typeof wx === 'undefined' || !wx.shareAppMessage) {
            // eslint-disable-next-line no-console
            console.log('[ShareService]', title, query);
            return;
          }

          wx.shareAppMessage({
            title,
            query
          });
        }

      });

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=b0044c2d6c9fa31cce9654864bb6f9e6bb0066f3.js.map