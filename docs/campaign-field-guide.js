// Each chapter opens with an order a player can try on the map.
const chapters = {
  start: [
    ['Finish a turn', '完成一个回合',
      'Use the lower-right button to open each pending decision. After founding, choose research, a civic and production for each idle city. For a unit with movement left, move it or choose Skip this turn in Field command. Skipping keeps its movement. You can select it again on the map or in the roster to give another order. When all prompts are resolved, choose End turn.',
      '点右下角的按钮，会直接打开下一项待办。建都后，依次选科技、市政，再给空闲城市安排生产。还有移动力的单位可以行动，也可以在「战场指挥」中选「跳过本回合」。跳过会保留移动力，如需改主意，可在地图或名册中重新选中它。待办处理完后，点「结束回合」。'],
    ['Move a unit', '移动单位',
      'Select your unit on the map or in the roster. Choose a highlighted hex within its movement range. On touchscreens, tap the destination to preview the route, then confirm the move. The unit can move again if it has movement left.',
      '在地图或名册中选中己方单位，再选移动范围内高亮的地块。在触屏上，轻点目的地可先预览路线，确认后单位才出发。还有移动力时，可以继续移动。'],
    ['Travel with a scout', '派侦察兵出行',
      'Train a scout and select it at a trading post, field archive or trail lodge to choose an exchange. The same scout can also record three different terrains at least three hexes apart. Bring the notebook within one hex of one of your cities to publish your regional atlas.',
      '训练侦察兵，抵达商贸驿站、田野档案馆或山径驿舍后可以选择一次交换。也可以让同一名侦察兵在三个不同类型的地形做记录，各点之间至少相隔三格。带着记录返回己方城市一格以内，即可出版地区图志。']
  ],
  influence: [
    ['Use your first 6 influence', '开局的 6 点影响力怎么花',
      'Found your capital, then click Influence at the top of the map. If the city lists a neutral parcel for expansion, spend 6 influence to add that parcel to your territory immediately. For example, a capital in Pasadena can list Altadena as its next parcel. With 6 influence and 12 gold, you can take Altadena now and keep all 12 gold and both district orders. Each city can do this once per round. Its progress toward the next parcel starts at zero.',
      '建立首都后，点地图顶部的「影响力」。如果首都有可扩张的中立地块，花 6 点影响力就能立刻把预览中的那一格纳入领土。例如，在帕萨迪纳建都时，下一格可能是阿尔塔迪纳。如果你有 6 点影响力和 12 金币，现在就能取得这块地，12 金币和两次地区指令都能留下。每座城市每轮可提前扩张一次，之后重新积累扩地进度。'],
    ['Decide whether to spend now', '现在花，还是再等一轮',
      'If the city is one turn from claiming the same parcel through population growth, you can wait and keep all 6 influence. To choose a different eligible neutral parcel on your border, claim it for 4 gold and one district order. Save influence for diplomacy if you want to learn a contacted rival’s era and city count. A delegation costs 6 influence and reports for three rounds, including the round you send it.',
      '如果城市再过一回合就能靠居民自动取得同一格地，可以等一等，省下这 6 点影响力。如果更想要另一格符合条件的中立边境地块，可用 4 金币和 1 次地区指令直接认领。接触其他文明后，可用这 6 点派遣使团，查看对方的时代和城市总数。报告从派遣当轮起持续三轮。'],
    ['Take a rival district or change policy', '争夺边境或更换政策',
      'To take an eligible rival district next to your land, spend one district order, 4 gold and 5 influence. Your first government policy is free. Switching to another unlocked policy later costs 3 influence.',
      '要夺取紧邻己方领土、符合争夺条件的敌方地块，需花 1 次地区指令、4 金币和 5 点影响力。首次颁布政府政策免费，以后改用其他已解锁政策需 3 点影响力。'],
    ['Read your income', '看懂收入',
      'Influence accumulates at the end of your turn. Territory contributes to income, and a monument adds 3 influence per turn. Treasury gold pays for purchases and upgrades. Culture advances the civic you are researching.',
      '影响力在你的回合结束时到账。领土会带来影响力收入，一座纪念碑每回合再增加 3 点。金库里的金币用来购买项目和升级单位。文化用来推进正在研究的市政。']
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
      '移动力全满时，武装陆地单位可以构筑工事。保持防守时，开阔地额外减伤 4 点，林地 8 点，丘陵 10 点。积累 3 点战斗经验后，可选择永久的突击或防护训练，并消耗本回合剩余移动力。']
  ],
  coast: [
    ['Carry freight between harbors', '在港口之间运粮',
      'At your harbor, a fishing crew can load 4 stored food once it knows a water route to another friendly port. Sail to the destination berth and unload for food and gold. For a longer voyage, provision a ship at your berth for 6 gold. Its next sailing turn gains two movement points.',
      '己方港口与另一座友方港口之间的水路探明后，渔船队可在本港装载 4 储粮，驶到另一港的泊位卸货并获得金币。需要远航时，可在本港花 6 金币补给；船只在下一个航行回合多出 2 点移动力。']
  ],
  research: [
    ['Invest while a council is working', '在研究期间投资',
      'Choose a goal in either council. Open the investment comparison to see how a research building such as an Academy, or a cultural building such as a Printing house, would change your income and time to the goal. Review the building site and cost before placing the order.',
      '在科技或市政议会选定目标，展开投资比较，查看可建的学院等科研建筑或印刷所等文化建筑能增加多少收入，以及目标能提早几回合完成。选址并核对成本后，再确认建造。']
  ]
};

export function fieldGuideOrders(chapter, language) {
  return (chapters[chapter] || []).map(([enTitle, zhTitle, enText, zhText]) =>
    language === 'zh-CN' ? [zhTitle, zhText] : [enTitle, enText]);
}
