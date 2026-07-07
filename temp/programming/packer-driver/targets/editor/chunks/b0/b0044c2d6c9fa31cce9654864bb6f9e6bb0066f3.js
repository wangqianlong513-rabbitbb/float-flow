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
          const json = JSON.stringify(payload);
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
          const query = `residual=${this.encodeResidual(payload)}`;
          const title = `我在《浮岛浮光》第 ${level.id} 关只差一步，帮我接上这束光！`;
          this.share(title, query);
        }

        static sharePoster(level, scoreText) {
          const title = `我在《浮岛浮光》第 ${level.id} 关打出了 ${scoreText}，来挑战我的光轨！`;
          this.share(title, `level=${level.id}`);
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