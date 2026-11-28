// Opening discoveries keep their original cost. Later eras require more work,
// with a further premium for joining branches or building on a Modern project.
const premiums={
  research:{industrial:34,modern:83,branch:12,advanced:28},
  civic:{industrial:19,modern:44,branch:8,advanced:18},
};
export function councilProjectCost(state,track,item) {
  const project=track.tree[item];
  if(state.researchPace!==1)return project.cost;
  const prices=premiums[track.focus],prerequisites=project.requires;
  const eraPrice=prices[project.era] || 0;
  const branchPrice=Math.max(0,prerequisites.length-1)*prices.branch;
  const advancedPrice=prerequisites.some(key=>track.tree[key].era==='modern') ? prices.advanced : 0;
  const frontierBranch=project.era==='frontier' && prerequisites.length ? 3 : 0;
  return project.cost+eraPrice+branchPrice+advancedPrice+frontierBranch;
}
