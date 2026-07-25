export interface VersionMilestone {
  version: string;
  title: string;
  shippedSystems: string[];
}

export const VERSION_MILESTONES: VersionMilestone[] = [
  { version: 'v1.0', title: '上线验证', shippedSystems: ['30+ mainline slots', 'core tiles', 'preview', 'revive'] },
  { version: 'v1.1', title: '轻构筑', shippedSystems: ['blessings', 'weighted draw', 'skill combo'] },
  { version: 'v1.2', title: '目标事件', shippedSystems: ['required goals', 'star cores', 'unstable cells'] },
  { version: 'v1.3', title: '高阶机制', shippedSystems: ['mirror', 'vine', 'jump', 'blackhole', 'splitter'] },
  { version: 'v1.4', title: '数据调优', shippedSystems: ['level funnel', 'failure reasons', 'pity draw'] },
  { version: 'v1.5', title: '运营活动', shippedSystems: ['daily challenge', 'event tags'] },
  { version: 'v1.6', title: '社交裂变', shippedSystems: ['residual help', 'friend challenge', 'relay share'] },
  { version: 'v1.7', title: '内容工具', shippedSystems: ['seeded generation', 'difficulty estimate'] },
  { version: 'v1.8', title: '商业化', shippedSystems: ['semantic ad placements', 'reward multiplier'] },
  { version: 'v1.9', title: '轻Meta', shippedSystems: ['mastery', 'collection', 'titles'] },
  { version: 'v2.0', title: '玩法扩展', shippedSystems: ['multi-goal', 'blackhole race', 'split light'] },
];

export function getLatestMilestone(): VersionMilestone {
  return VERSION_MILESTONES[VERSION_MILESTONES.length - 1];
}
