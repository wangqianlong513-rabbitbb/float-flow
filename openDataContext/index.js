/* 微信小游戏开放数据域脚手架：用于真实好友排行榜渲染。
 * Cocos 主域通过 wx.getOpenDataContext().postMessage({ action: 'showLeaderboard' }) 触发。
 */
const sharedCanvas = wx.getSharedCanvas && wx.getSharedCanvas();
const ctx = sharedCanvas && sharedCanvas.getContext && sharedCanvas.getContext('2d');

function clear() {
  if (!ctx || !sharedCanvas) return;
  ctx.clearRect(0, 0, sharedCanvas.width, sharedCanvas.height);
}

function drawFallbackLeaderboard(list) {
  if (!ctx || !sharedCanvas) return;
  clear();
  ctx.fillStyle = 'rgba(7,18,37,0.92)';
  roundRect(ctx, 12, 12, sharedCanvas.width - 24, sharedCanvas.height - 24, 20);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('好友光路榜', sharedCanvas.width / 2, 52);

  list.slice(0, 6).forEach((item, index) => {
    const y = 92 + index * 48;
    ctx.fillStyle = index < 3 ? '#FDE047' : '#93C5FD';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${index + 1}. ${item.nickname || '微信好友'}`, 36, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#34D399';
    ctx.fillText(`${item.score || 0}`, sharedCanvas.width - 36, y);
  });
}

function showLeaderboard() {
  if (!wx.getFriendCloudStorage) {
    drawFallbackLeaderboard([{ nickname: '等待微信好友数据', score: 0 }]);
    return;
  }
  wx.getFriendCloudStorage({
    keyList: ['user_max_score'],
    success: (res) => {
      const list = (res.data || []).map((user) => {
        let score = 0;
        try {
          const kv = (user.KVDataList || []).find((item) => item.key === 'user_max_score');
          score = kv ? JSON.parse(kv.value).wxgame.score : 0;
        } catch (_error) {}
        return { nickname: user.nickname, avatarUrl: user.avatarUrl, score };
      }).sort((a, b) => b.score - a.score);
      drawFallbackLeaderboard(list);
    },
    fail: () => drawFallbackLeaderboard([{ nickname: '好友榜加载失败', score: 0 }]),
  });
}

function roundRect(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + w - r, y);
  context.quadraticCurveTo(x + w, y, x + w, y + r);
  context.lineTo(x + w, y + h - r);
  context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  context.lineTo(x + r, y + h);
  context.quadraticCurveTo(x, y + h, x, y + h - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

wx.onMessage((message) => {
  if (!message || !message.action) return;
  if (message.action === 'clear') clear();
  if (message.action === 'showLeaderboard' || message.action === 'showDailyLeaderboard') showLeaderboard();
});
