// Each chapter opens with an order a player can try on the map.
const chapters = {
  start: [
    ['Travel with a scout', '派侦察兵出行',
      'Train a scout and select it at a trading post, field archive or trail lodge to choose an exchange. The same scout can also record three different terrains at least three hexes apart. Bring the notebook within one hex of one of your cities to publish your regional atlas.',
      '训练侦察兵，抵达贸易站、野外档案馆或山径驿站后可以选择一次交换。也可以让同一名侦察兵在三个不同类型的地形做记录，各点之间至少相隔三格。带着记录返回己方城市一格以内，即可出版地区图志。']
  ],
  city: [
    ['Give a city a specialty', '让城市发展专长',
      'Select your city and open City hall. A city with two residents can use its granary, workshop or monument to support one permanent charter for 18 gold. After Municipal Charter, the city can also spend 4 stored food and 8 gold on a three-harvest festival.',
      '选中己方城市，打开市政厅。至少有两位居民的城市可凭粮仓、工坊或纪念碑，花费 18 金币颁发一份永久特许状。解锁市政宪章后，还可花费本城的 4 储粮和 8 金币，举办持续三个收获回合的节庆。'],
    ['Compare your cities', '比较各座城市',
      'Open Cities in the Empire roster. Sort by production or filter for cities short of housing, then open production or citizen management for the city you want.',
      '从帝国名册打开城市总览。按生产力排序，或筛选住房受限的城市，再直接进入该城的生产或市民管理界面。']
  ],
  battle: [
    ['Hold a ridge or train a veteran', '坚守山脊或训练老兵',
      'With full movement, an armed land unit can fortify. While it holds, fieldworks absorb 4 additional damage in the open, 8 in woodland or 10 in foothills. At 3 combat XP, choose a permanent drill for extra attack damage or protection. Training spends the unit’s remaining movement.',
      '移动力全满时，武装陆地单位可以构筑工事。保持防守时，开阔地额外减伤 4 点，林地 8 点，山丘 10 点。积累 3 点战斗经验后，可选择永久的突击或防护训练，并消耗本回合剩余移动力。']
  ],
  coast: [
    ['Carry freight between harbors', '在港口之间运粮',
      'At your harbor, a fishing crew can load 4 stored food once it knows a water route to another friendly port. Sail to the destination berth and unload for food and gold. For a longer voyage, provision a ship at your berth for 6 gold. Its next sailing turn gains two movement points.',
      '己方港口与另一座友方港口之间的水路探明后，渔船可在本港装载 4 储粮，驶到另一港的泊位卸货并获得金币。需要远航时，可在本港花 6 金币补给；船只在下一个航行回合多出 2 点移动力。']
  ],
  research: [
    ['Invest while a council is working', '在研究期间投资',
      'Choose a goal in either council. Open the investment comparison to see how an available university or monument would change your income and the time to your goal. Review the building site and cost before placing the order.',
      '在科技或市政议会选定目标，展开投资比较，查看当前可建的大学或纪念碑将如何改变每回合收入与所需时间。选址并核对成本后，再确认建造。']
  ]
};

export function fieldGuideOrders(chapter, language) {
  return (chapters[chapter] || []).map(([enTitle, zhTitle, enText, zhText]) =>
    language === 'zh-CN' ? [zhTitle, zhText] : [enTitle, enText]);
}
