const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const DAILY = 'daily_challenge_scores';
const ASSISTS = 'residual_assists';

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const action = event && event.action;

  switch (action) {
    case 'submitDailyChallenge':
      return submitDailyChallenge(openid, event);
    case 'getDailyLeaderboard':
      return getDailyLeaderboard(event);
    case 'registerResidualAssist':
      return registerResidualAssist(openid, event);
    case 'completeResidualAssist':
      return completeResidualAssist(openid, event);
    case 'claimResidualRequesterReward':
      return claimResidualRequesterReward(openid, event);
    default:
      return { ok: false, code: 'UNKNOWN_ACTION', action };
  }
};

async function submitDailyChallenge(openid, event) {
  const dateKey = String(event.dateKey || '');
  const score = Math.max(0, Math.floor(Number(event.score) || 0));
  const moves = Math.max(0, Math.floor(Number(event.moves) || 0));
  if (!dateKey || score <= 0) return { ok: false, code: 'BAD_DAILY_SCORE' };

  const id = `${dateKey}_${openid}`;
  const now = Date.now();
  const existed = await db.collection(DAILY).doc(id).get().catch(() => null);
  const old = existed && existed.data;
  if (!old || score > old.score || (score === old.score && moves < old.moves)) {
    await db.collection(DAILY).doc(id).set({
      data: { _id: id, openid, dateKey, score, moves, updatedAt: now }
    });
  }
  return getDailyLeaderboard({ dateKey, selfOpenid: openid });
}

async function getDailyLeaderboard(event) {
  const dateKey = String(event.dateKey || '');
  if (!dateKey) return { ok: false, code: 'BAD_DATE' };
  const result = await db.collection(DAILY)
    .where({ dateKey })
    .orderBy('score', 'desc')
    .orderBy('moves', 'asc')
    .limit(50)
    .get();
  const entries = (result.data || []).map((item, idx) => ({
    rank: idx + 1,
    openid: item.openid,
    score: item.score,
    moves: item.moves,
    isSelf: item.openid === event.selfOpenid,
  }));
  return { ok: true, dateKey, entries };
}

async function registerResidualAssist(openid, event) {
  const assistId = String(event.assistId || '');
  const levelId = Number(event.levelId) || 0;
  if (!assistId || !levelId) return { ok: false, code: 'BAD_ASSIST' };
  await db.collection(ASSISTS).doc(assistId).set({
    data: { _id: assistId, requesterOpenid: openid, levelId, createdAt: Date.now(), completedAt: 0, helperOpenid: '', requesterClaimed: false }
  });
  return { ok: true, assistId };
}

async function completeResidualAssist(openid, event) {
  const assistId = String(event.assistId || '');
  if (!assistId) return { ok: false, code: 'BAD_ASSIST' };
  const record = await db.collection(ASSISTS).doc(assistId).get().catch(() => null);
  if (!record || !record.data) return { ok: false, code: 'ASSIST_NOT_FOUND' };
  if (record.data.helperOpenid && record.data.helperOpenid !== openid) return { ok: true, alreadyCompleted: true };
  await db.collection(ASSISTS).doc(assistId).update({ data: { helperOpenid: openid, completedAt: Date.now() } });
  return { ok: true, assistId };
}

async function claimResidualRequesterReward(openid, event) {
  const assistId = String(event.assistId || '');
  if (!assistId) return { ok: false, code: 'BAD_ASSIST' };
  const record = await db.collection(ASSISTS).doc(assistId).get().catch(() => null);
  if (!record || !record.data) return { ok: false, code: 'ASSIST_NOT_FOUND' };
  if (record.data.requesterOpenid !== openid) return { ok: false, code: 'NOT_REQUESTER' };
  if (!record.data.completedAt) return { ok: false, code: 'NOT_COMPLETED' };
  if (record.data.requesterClaimed) return { ok: false, code: 'ALREADY_CLAIMED' };
  await db.collection(ASSISTS).doc(assistId).update({ data: { requesterClaimed: true, claimedAt: Date.now() } });
  return { ok: true, assistId, reward: 60 };
}
