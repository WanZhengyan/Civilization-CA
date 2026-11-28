import {maritimeCopy} from './maritime-guide.js';
// The English UI copy is the catalog key. The rules and network protocol keep
// their canonical IDs in both languages.
import {CIVILIZATIONS} from './civilizations.js';
import {positionTranslations} from './field-position.js';
import {serviceTranslations} from './unit-service-copy.js';
export const catalog = new Map();
section(serviceTranslations);
section(positionTranslations);
section(`
Applied Mechanics|应用力学
Each workshop supplies 1 additional production per turn.|每座工坊每回合额外提供 1 点产能。
Electrical Engineering|电气工程
Each workshop generates 2 additional science per turn.|每座工坊每回合额外提供 2 点科研。
Land Registry|土地登记
Each city earns 1 additional gold per turn.|每座城市每回合额外获得 1 金币。
Public Libraries|公共图书馆
Each monument generates 2 additional culture per turn.|每座纪念碑每回合额外提供 2 点文化。
Regional Planning|区域规划
Cities with at least 5 residents gain 1 production and 1 culture per turn.|人口达到 5 的城市每回合额外获得 1 点产能和 1 点文化。
`);
section(`
Estimated completion|预计完成
Immediately|立即完成
Production remaining|剩余所需生产力
`);
section(`
Choose a contacted rival.|请选择一个已经接触的对手文明。
This civilization has been eliminated.|该文明已被淘汰。
A delegation is already active.|使团仍在任期内。
You need 6 influence.|需要 6 点影响力。
Diplomatic delegation dispatched.|外交使团已派出。
An unmet civilization ended its turn.|一个尚未接触的文明结束了回合。
`);
section(`
The route has changed. Choose a destination again.|路线已改变，请重新选择目的地。
Cancel|取消
Movement preview|移动预览
Move cost|消耗移动力
Remaining movement|剩余移动力
Confirm move|确认移动
Tap a highlighted hex to preview movement.|轻点高亮地块，预览路线与移动力。
Naval patrol unit|海上巡逻单位
Naval artillery unit|海上炮击单位
Maritime engineering unit|海上工程单位
Campaign soundtrack|战役配乐
Pacific Light|太平洋晨光
The Trestle|栈桥
Night Observatory|夜间天文台
Mute music|静音
Enable music|开启音乐
Music volume|音乐音量
Silent|已静音
Ready to play|待播放
Loading music…|正在载入音乐…
Playing|播放中
Music unavailable|暂时无法播放音乐
`);
section(maritimeCopy);
for (const civ of CIVILIZATIONS) {
  catalog.set(('First contact with '+civ.name+'.').toLowerCase(),'首次接触'+civ.nameZh+'。');
  for(const [label,translation] of [[civ.name,civ.nameZh],[civ.traitName,civ.traitNameZh],[civ.description,civ.descriptionZh]]) {
    catalog.set(label.toLowerCase(),translation);
  }
}
section(`
Victory conditions|胜利条件
Standard victory|标准胜利
Conquest victory|征服胜利
Science victory|科技胜利
Win by conquest or launch the Orbital Survey.|通过征服获胜，或率先发射轨道勘测卫星。
Control every original capital or be the last surviving side.|控制所有初始首都，或成为唯一幸存的一方。
Research Rocketry, then complete the Orbital Survey in one city.|研究火箭技术，再在一座城市完成轨道勘测计划。
Conquest requires a rival.|征服模式至少需要一个对手。
Random civilization|随机文明
Civilization|文明
Compare civilization traits|比较文明特性
Each civilization is unique in a campaign. Random draws from the civilizations still available.|每场战役中，同一文明只会出现一次。选择随机将从剩余文明中抽取。
The invited player chooses their civilization.|受邀玩家自行选择文明。
Allies share sight, discoveries and victory. Each player commands their own units and treasury.|盟友共享视野、探索记录和胜利。每位玩家独立指挥部队、管理国库。
Teams are uneven. Each civilization controls its own cities and units.|队伍人数不均。每个文明独立指挥自己的城市与单位。
Legacy civic rules|旧版市政积分规则
Victory progress|胜利进度
Victory|胜利
Two paths|两种路线
Space race|太空竞赛
Production required|所需生产力
Conquest|征服
Victory project|胜利项目
Your civilization|你的文明
The winning side completed the Orbital Survey.|获胜方率先完成了轨道勘测计划。
The winning side controls every original capital.|获胜方控制了所有文明的初始首都。
The winning side is the last surviving side.|获胜方是场上唯一仍然存续的一方。
Campaign ended|战役结束
Original capitals confirmed under your control|已确认由己方控制的初始首都
The chart counts only capitals visible to your side.|仅统计己方视野内已确认的首都。
Pending|未完成
Launch city|发射城市
Paused project|暂停的发射项目
Plan Rocketry|规划火箭技术路线
Follow Steam Power with Industrial Metallurgy and Electrical Engineering to unlock Radio Networks. The other branch of Rocketry runs through District Railways and Motorization.|研究蒸汽动力后，依次研究工业冶金和电气工程，即可解锁无线电网络。通向火箭技术的另一条分支需要先研究地区铁路与机械化。
Land Registry leads to County Federation, then Teachers Colleges and Public Libraries. Libraries increase the culture produced by monuments. On another branch, Park Conservancies rewards cities with suitable land.|土地登记之后可依次推进郡县联邦、师范学院和公共图书馆。公共图书馆会提高纪念碑的文化产出。也可走公园保护区分支，让拥有林地或丘陵的城市获益。
Rocketry|火箭技术
Orbital Survey|轨道勘测计划
Launch a satellite to survey California from orbit. Completing this city project wins a science victory.|发射卫星，从轨道勘测加州。完成此城市项目即可取得科技胜利。
Unlocks the Orbital Survey city project for a science victory.|解锁城市项目「轨道勘测计划」，可取得科技胜利。
Open City production and choose Orbital Survey.|打开城市生产，选择「轨道勘测计划」。
Research Radio Networks and Motorization to unlock Rocketry.|研究无线电网络和机械化，即可解锁火箭技术。
Each region and size has its own solo save. Choose a victory condition, a civilization and up to three opponents. In multiplayer the host sets the map and the victory condition.|每种地区和地图大小分别保存单人进度。选择胜利条件、文明和最多三个对手。联机时由房主设置地图和胜利条件。
Your side wins by controlling every original capital or by being the last side with a surviving civilization.|己方控制所有初始首都，或成为唯一仍有文明存续的一方，即可获胜。
Research Radio Networks and Motorization, then Rocketry. In City production, choose Orbital Survey. Finish it in one city to win for your entire side.|先研究无线电网络和机械化，再研究火箭技术。打开城市生产，选择「轨道勘测计划」。在一座城市完成该项目即可为整个阵营赢得胜利。
In practice, neutral camps remain on the map. Complete the Orbital Survey to win.|练习模式保留中立营地。完成轨道勘测计划即可获胜。
Orbital Survey requires city production.|轨道勘测计划必须使用城市生产力。
Orbital Survey launches from the city.|轨道勘测计划从城市发射。
That civilization has already been chosen.|该文明已被选用。
Choose one civilization for the host.|请为房主选择一个文明。
Human players choose their own civilization.|人类玩家自行选择文明。
Choose a valid victory mode.|请选择有效的胜利模式。
Conquest requires a rival civilization.|征服模式至少需要一个对手文明。
Civilizations are locked after the campaign starts.|战役开始后，文明选择已锁定。
Choose a valid seat.|请选择有效的席位。
Only the seat owner can choose this civilization.|只有该席位的玩家可以选择此文明。
Choose a valid civilization.|请选择有效的文明。
Each civilization can be chosen only once. Choose an available civilization or Random.|每个文明只能被选择一次。请选择尚未被选的文明，或选择随机。
`);
section(`
Border expansion|领土扩张
Locate next district|在地图上查看候选地
Explore or clear neutral land within three steps.|探索或清除三步内无主土地上的障碍。
Next district|下一块土地
Border progress|扩地进度
Frontier blocked|暂无可扩展土地
Points per turn|每回合扩地点数
Grow city borders|扩大城市领土
Each resident adds one border point at the end of your turn. A city starts at eight points per district. Each new district raises the next cost by two, up to sixteen. Only visible, unclaimed land within three connected land steps qualifies. If the frontier is blocked, explore or secure a clear route. Progress pauses until a parcel opens.|每回合结束时，每名居民提供一点扩地进度。首块土地需要八点，每次扩地后增加两点，最高十六点。候选地必须是当前可见的无主陆地，从城市沿己方陆地最多走三步可达。若边界无法扩展，派人探索或打通通路。出现候选地后，扩地进度会继续累积。
The city incorporated a district.|城市将一块土地纳入领土。
Production changed. Review the current city order.|生产项目已变化，请重新查看城市的当前指令。
This city has no project to switch.|该城市没有可更换的生产项目。
University wonders require city production.|大学奇观必须使用城市生产力建造。
This project is ready for completion.|项目已准备完成。
Not enough gold.|金币不足。
Choose a purchasable project.|请选择可用金币购买的项目。
The purchase price changed. Review the new quote.|购买价格已经变化，请查看新报价。
No deployment tile is available. Move a unit before buying.|没有可部署的地块，请先移走一个单位再购买。
Choose an available construction tile.|请选择可用的建造地块。
Units deploy from the city.|单位从城市部署。
This project already has a construction tile.|这个项目已经选定建造地块。
Project purchased.|项目已用金币购入。
Buy with gold|金币购买
Gold cost|金币价格
Work saved if you switch|更换后保留的生产力
Stored production|已保留的生产力
Construction tile|建造地块
Confirm purchase|确认购买
Confirm project change|确认更换项目
Confirm production|确认生产
Choose a highlighted tile on the map.|请在地图上选择高亮地块。
Cancel placement|取消选址
Confirm site|确认选址
Choose a highlighted construction tile.|请选择高亮的建造地块。
Select this construction tile.|选择此地块建造。
Construction site selection|工程选址
Select a tile|选择地块
Municipal building|市政建筑
Construction site|施工地点
gold|金币
Specialty terrain|特色地形
Changing projects saves invested production in this city. A paused university releases its land and refunds the charter fee.|更换项目后，已投入的生产力仍保存在本城。暂停大学建设时会释放其用地并退还特许金。
Buy with treasury gold to finish immediately. One remaining production costs three gold.|用国库金币购买可立即完成项目。每点剩余生产力需要三枚金币。
Choose a construction tile|选择建造地块
Choose a building in City production, then select one of the outlined map tiles and confirm. Municipal buildings can share the city center. Campuses need their own empty parcel. A harbor reserves a shore berth.|在城市生产中选择建筑，再从地图上点选有边线标记的地块并确认。市政建筑可共用市中心，大学校园需要独立空地，港口则使用近岸泊位。
Change production or buy|更换项目或购买
You can change the current project. This city keeps its invested production until you resume the same item. Buying an ordinary project uses treasury gold and credits work already done. Universities must use city production.|可以随时更换当前生产项目。本城会保留已投入的生产力，恢复同一项目时继续使用。普通项目可用国库金币购买，已完成的工作抵扣价格。大学奇观必须靠城市生产力建造。
`);
section(`
E|东
W|西
NE|东北
NW|西北
SE|东南
SW|西南
`);
section(`
Civic projects|市政项目
Council agenda|可审议项目
Full civic tree|完整市政树
Unlocks policy|解锁方针
Unlocks unit|解锁单位
Unlocks building|解锁建筑
Fund a government program|推行施政方针
In Civics, open Government policy. Municipal Charter unlocks Public lectures. Public Works unlocks Public contracts. Compare the gain with the cost in each city, then ratify a program. Open Full civic tree to inspect future policies and universities.|在市政面板中打开施政方针。市政宪章解锁公众讲堂，公共工程解锁公共建设合同。比较各城市得到和付出的产出，再表决推行。打开完整市政树可查看后续方针和大学奇观。
Government policy|施政方针
Balanced budget|平衡预算
Standard city yields with no program funded.|维持城市的标准产出。
Public contracts|公共建设合同
Each city gains 2 production and loses 1 food.|每座城市增加 2 生产力，减少 1 粮食。
Public lectures|公众讲堂
Each city gains 1 culture and loses 1 science.|每座城市增加 1 文化，减少 1 科研点。
Food relief|粮食援助
Each city gains 2 food and loses 1 production.|每座城市增加 2 粮食，减少 1 生产力。
Port concessions|港口专营
Each harbor earns 3 capital. Every city loses 1 influence.|每个港口增加 3 资金。每座城市减少 1 影响力。
Research fellowships|科研资助
Each city gains 2 science and spends 2 capital per turn.|每座城市每回合增加 2 科研点，花费 2 资金。
In force|现行方针
Civic required|尚未解锁市政
The assembly has already voted this turn.|议会本回合已经表决。
Choose an available policy.|请选择可实施的方针。
Found a city first.|请先建立城市。
Fund one program at a time. The first vote is free. Later changes cost 3 influence, once per turn.|同一时间只能推行一项方针。首次表决免费，此后每次调整消耗 3 影响力，每回合最多一次。
Adopt Municipal Charter or Public Works to fund a government program.|通过市政宪章或公共工程后，可以推行施政方针。
Ratify for 3 influence|消耗 3 影响力推行
Ratify for free|免费推行
Ruling policy|现行施政方针
Irrigation Districts|灌溉合作区
A city with a working farm or orchard gains 2 food per turn.|有运行中的农场或果园的城市每回合额外获得 2 粮食。
Mutual Aid Pacts|互助公约
Damaged cities recover 6 additional health when their turn begins.|受损城市在己方回合开始时额外恢复 6 点生命值。
Harbor Commissions|港务委员会
Each city with a harbor earns 3 additional capital per turn.|每座建有港口的城市每回合额外获得 3 资金。
Teachers Colleges|师范学院
Cities with at least 3 residents generate 2 additional science per turn.|人口达到 3 的城市每回合额外获得 2 科研点。
Community Land Trusts|社区土地信托
Every city gains 2 housing spaces, including newly founded settlements.|每座城市额外获得 2 个住房名额，新建城市也能享受。
California Expositions|加州博览会
Each completed university generates 2 additional culture and 2 influence per turn.|每座已建成的大学每回合额外提供 2 文化和 2 影响力。
`);

function section(pairs) {
  for (const line of pairs.trim().split('\n')) {
    const [key, value] = line.split('|');
    if (!key || value === undefined) throw new Error('Invalid translation: ' + line);
    catalog.set(key.toLowerCase(), value);
  }
}
section(`
Room setup|房间设置
Open lobby for 2–4 people|开放房间（2–4 名真人）
You vs. computer|你对战电脑
Two friends vs. two computers|双人合作对战两名电脑
Four-way free-for-all|四方混战
Custom seats|自定义席位
Number of seats|席位数
Controller|席位类型
Human player|真人玩家
Computer|电脑
Team|队伍
Difficulty|难度
Computer difficulty|电脑难度
Compare computer difficulties|比较电脑难度
Easy|简单
Normal|一般
Hard|困难
Seat 1|席位 1
Seat 2|席位 2
Seat 3|席位 3
Seat 4|席位 4
Team A|A 队
Team B|B 队
Team C|C 队
Team D|D 队
Easy develops home districts first and patrols within three hexes of its cities.|简单电脑优先开发本土地块，在距己方城市三格以内巡逻。
Normal balances scouting, growth and production, and compares targets for each unit.|一般难度的电脑兼顾侦察、城市发展与生产，并为每支部队比较攻击目标。
Hard expands earlier and compares attacks across its units before committing one.|困难电脑会更早扩张，比较多支部队的进攻机会再选择出手的单位。
Invite up to three friends. The host can start once two people have joined.|最多可邀请三名好友。至少两名真人入座后，房主即可开局。
Teammates combine civic scores and share victory. Each player keeps their own units, treasury and vision.|队友的市政积分相加，全队共享胜利。部队、金库和地图视野由各自掌握。
The starting team is drawn at random.|开局随机抽取先手队伍。
Drew first turn|抽中先手
Teams are uneven. The larger team has more civilizations contributing points.|队伍人数不相等。人数较多的一队有更多文明可以贡献积分。
Computer playing…|电脑行动中…
Assign the seats to at least two different teams.|请将席位分到至少两支队伍。
Waiting for player|等待玩家加入
All required seats are ready.|所需席位均已就绪，可以开局。
Invite a friend to each open human seat before starting.|请邀请好友坐满空缺的真人席位后再开始。
Invite friends, face a computer opponent or form teams.|邀请好友、挑战电脑，或组队作战。
Enter a room code or invitation link. New players take the first open human seat. This device remembers your seat.|输入房间码或邀请链接。新玩家会进入第一个空缺的真人席位，当前设备会记住你的席位。
This room service supports open human lobbies only. Choose the open lobby to play here.|当前联机服务仅支持真人开放房间。请选择开放房间进行联机。
Your teammate commands this unit.|这支部队由你的队友指挥。
Allied city|盟友城市
Allied capital city|盟友首府
Your team|你的队伍
Team standings|队伍排名
Winning team|获胜队伍
Shared victory|并列获胜
All original capitals controlled|已控制全部初始首府
Last surviving team|最后存续的队伍
Team civic points|队伍市政积分
Team civic target|队伍积分目标
A team wins immediately when its members collectively hold every original capital.|只要全队合力控制所有初始首府，就会立即赢得统治胜利。
Living teammates combine their civic points. Compare team totals at the end of the round when a team reaches the target, or after round 30. Tied teams share victory.|队伍积分等于仍在场的队友市政积分之和。当任一队达到目标时，在该轮结束后比较各队总分；最迟在第 30 轮结束后结算。最高分并列的队伍共享胜利。
Choose two to four seats with a human host.|请选择 2–4 个席位，并由真人担任房主。
Choose a seat type and team for every player.|请为每个席位选择类型和队伍。
Choose a valid computer difficulty.|请选择有效的电脑难度。
Choose a valid AI difficulty.|请选择有效的电脑难度。
Choose at least two opposing teams.|至少设置两支互相对抗的队伍。
No human seats are open.|真人席位已满。
Wait for every human seat to join.|请等待所有真人入座。
Choose a team for every seat.|请为每个席位选择队伍。
A campaign needs at least two opposing teams.|对局需要至少两支互相对抗的队伍。
`);
section(`
Campaign controls|战役控制
Map size|地图尺寸
Standard|标准
Large|大型
playable hexes|块可玩地块
Computer opponents|电脑对手
0 rivals|0 名对手
Solo practice|单人练习
Solo game setup|单人游戏设置
In practice, neutral camps remain on the map and you can still earn civic points.|练习中仍会出现中立营地，你也可以赚取市政积分。
1 rival|1 名对手
2 rivals|2 名对手
3 rivals|3 名对手
2 civilizations total|共 2 个文明
3 civilizations total|共 3 个文明
4 civilizations total|共 4 个文明
Victory target|胜利分数
Short|短局
Long|长局
100 civic points|100 市政积分
125 civic points|125 市政积分
150 civic points|150 市政积分
Choose a valid civic victory target.|请选择有效的积分胜利目标。
Practice needs one human player.|练习模式需要一名真人玩家。
Practice complete|练习结束
Practice goal reached|已达成练习目标
Civic points|市政积分
Reach the civic target to complete practice. At round 30, practice ends with your final score.|达到胜利分数即可完成练习。第 30 轮结束时，系统会结算你的最终积分。
New campaign settings|新战役设置
Saved campaign|已保存的战役
Replace saved campaign?|替换已保存的战役？
Replace and start|替换并开始
Edit settings|返回设置
Choose a valid map size.|请选择有效的地图尺寸。
Choose a region and map size. Each combination has its own solo save. Choose one to three computer opponents for a new solo campaign. Online, the host sets the map for everyone.|选择地区和地图尺寸，每种组合都有独立的单人存档。开始新的单人战役时，可以选择一至三名电脑对手。联机地图由房主设定。
Choose a region and map size. Each combination has its own solo save. Set the civic victory target and choose practice or up to three computer opponents. Online, the host sets the map for everyone.|选择地区和地图尺寸，每种组合都有独立的单人存档。设定胜利所需的市政积分，再选择单人练习或与最多三名电脑对手交战。联机地图由房主设定。
In a campaign with rivals, control every participating civilization’s original capital to win immediately.|在有对手的战役中，占领所有参战文明的初始首府即可立即获胜。
Starting over replaces the solo save for this region and size.|重新开始会覆盖该地区在所选尺寸下的单人存档。
Official website|官方网站
This room server created a Standard map. Large maps are available in solo play.|当前联机服务器创建了标准地图。你可以在单人模式中选择大型地图。
Planning|规划
Roster|名册
Chronicle|战史
Command|指挥
Close panel|关闭面板
Claim edge|领地边界
Shared frontier|文明交界
`);

section(`
Research era|筛选时代
All eras|所有时代
Available research only|仅看可研究的科技
No discoveries match these filters.|没有符合条件的科技。
Trains|可训练
View prerequisites|查看前置路线
Leads to civics|后续市政
Leads to|后续科技
Hydrographic Charts|水道测绘
Ships and fishing crews gain 1 movement point when their next turn begins.|舰艇和渔船从下一回合起每回合增加 1 点移动力。
Field Medicine|战地医疗
Land combat units resting on friendly territory outside a city recover 6 health at the start of their turn.|位于己方领土且不在城内的地面战斗单位，回合开始时恢复 6 生命。
District Railways|地区铁路
Ground units spend only 1 movement between friendly districts, including bridge crossings.|地面单位在相邻己方地块间移动只消耗 1 点移动力，过桥同样适用。
Coastal Radar|海岸雷达
Each working harbor observes four hexes in every direction from its berth.|每座运作中的港口可观测以泊位为中心、半径四格的区域。
Topographic Mapping|地形测绘
Scouts and mounted scouts spend one movement point to enter foothills.|侦察兵和骑乘侦察兵进入丘陵只消耗一点移动力。
Crop Rotation|轮作制
Each working farm or orchard supplies 1 extra food to its city.|每块有产出的农田或果园为所属城市额外提供 1 粮食。
Industrial Metallurgy|工业冶金
Connected iron mines and stone quarries supply 2 extra production to the city they serve.|已连通的铁矿和石料采石场为所属城市额外提供 2 生产力。
Base sight radius|基础视野半径
`);
section(`
Manage citizens|管理居民
City planning|城市规划
Citizen focus|居民工作重心
Worked districts|居民工作地块
Food / production / science per worker|每名居民的粮食 / 生产力 / 科研点
Balanced|均衡发展
Food supply|粮食优先
Industry focus|工业优先
Science focus|科研优先
City garden|城市菜园
City workshop|城市工坊
Study hall|研习室
Assign citizens|分配居民
Select your city and open Manage citizens. Food, industry and science priorities change which controlled districts are worked. Each citizen works one district or a specialist job in town. The same district cannot support two cities.|选中城市后打开「管理居民」。粮食、工业或科研优先级会改变居民使用的领土地块。每名居民可工作一块土地或在城内担任专职工作。同一地块只能服务一座城市。
Choose a valid citizen focus.|请选择有效的居民工作重心。
Residents / housing|居民 / 住房
Completed|已建成
Housing full|住房已满
Residential quarter|住宅区
Housing investments|住房建设
Plan housing|规划住房
Under construction|正在建设
Provides housing for 3 more citizens.|为三名额外居民提供住房。
Provides 2 food and housing for 2 more citizens.|提供两份粮食和两名额外居民的住房。
A new city has room for three citizens. A granary adds two places. Public Works unlocks residential quarters, which add three. A full city keeps one growth reserve and can grow after more housing opens. Choose a housing investment in the citizen panel.|新城可容纳三名居民。粮仓增加两处住房。完成公共工程后可建造住宅区，再增加三处住房。住房满额时，城市可以储备下一次人口增长所需的粮食；扩建住房后即可继续增长。可在「管理居民」中启动住房项目。
Stored food|存粮
Harvest|粮食产量
Consumption|粮食消耗
Food balance|粮食结余
Population loss|人口减少
Next citizen|新增人口
Population stable|人口稳定
Each citizen eats two food every turn. Cities store surplus harvest for new citizens. A deficit uses the food reserve first. If it runs out, the city loses one citizen. Its founding household stays. Production advances the city queue.|每位居民每回合消耗两份粮食。盈余的粮食储存起来供人口增长。遇到短缺时先用存粮，存粮耗尽后失去一名居民，但始终保留第一户人家。生产力用于推进城市项目。
`);
section(`
Civitas LA · The Los Angeles Campaign|Civitas LA · 洛杉矶战役
Scout|侦察兵
Light reconnaissance infantry. Moves three points per turn, can skirmish with units, and cannot occupy cities.|轻装侦察步兵。每回合有三点移动力，可以与敌军交战，不能占领城市。
Train a scout|训练侦察兵
Train a Scout after founding a city. It has three movement points to a Militia unit’s two. Move again after revealing new ground. Topographic Mapping makes foothills cost only one point for scouts and mounted scouts.|建城后可以训练侦察兵。侦察兵每回合有三点移动力，民兵有两点。发现新地块后，还可使用剩余移动力继续前进。研究地形测绘后，侦察兵和骑乘侦察兵进入丘陵只需一点移动力。
Choose your first city site|选择首都的位置
Every civilization starts with one settler on a different shore or valley. Found your capital here, or explore first. Your cities begin earning income and training units after you settle.|每个文明都从一名开拓者起步。你可以就地建都，也可以先去探索。建城后可获得收入并训练单位。
Found capital|建立首都
Civilization drawn at start|开局随机分配文明
Los Angeles|洛杉矶
The Los Angeles Basin|洛杉矶盆地
Regional campaign|地区战役
Campaign map|战役地图
Game navigation|游戏导航
Map room|地图
Field guide|游戏指南
Chronicle|战史
Multiplayer|多人联机
Game menu|游戏菜单
Solo campaign|单人战役
Empire overview|势力概览
Treasury|金库
Capital|资金
Influence|影响力
Cities|城市
Units|单位
Score|得分
View faction standings|查看阵营排名
Tactical map of Los Angeles|洛杉矶战役地图
Drag to pan|拖动平移
Inspect hexes without moving|只查看地块，不移动单位
Inspect|查看
Layers|图层
Hex grid|六角格线
Map edge|地图边界
Territory border|领土边界
Fit region|查看全图
Map line key|地图线型图例
Map key|地图图例
Original capital|初始首府
Place names|地名
Geographic labels|地名与地标名称
Show or hide place and landmark names. City names stay enabled.|显示或隐藏地名和地标名称。城市名称不受此开关影响。
Territories|领土
Zoom out|缩小
Zoom in|放大
Reset map view|重置视图
Select a unit to issue orders.|选择单位后即可下达指令。
Settlement survey|建城选址
Found this turn|本回合可建城
Found next turn|下回合可建城
View sites|查看选址
Factions|阵营
Field command|战场指挥
Civilian unit|平民单位
Engineering unit|工程单位
Melee unit|近战单位
Ranged unit|远程单位
Military unit|军事单位
Naval unit|海军单位
Land unit|陆地单位
Inspect a unit, city or district on this hex|查看本地块的单位、城市或地区
Research council|科技议会
Choose research|选择科技
Your turn|你的回合
End turn|结束回合
Empire roster|部队与城市
Roster view|名册视图
Next ready unit|下个待命单位
Campaign chronicle|战役记录
View log|查看记录
Your campaign has begun.|战役开始。
The campaign has begun.|战役开始。
City production|城市生产
Close production|关闭生产面板
Research agenda|科技研究
Close research|关闭科研面板
Settler orders|开拓者指令
Close settlement survey|关闭选址面板
Battlefield|战场
Combat forecast|战斗预测
Cancel attack|取消攻击
Stand down|取消
Confirm attack|确认攻击
Current site|当前位置
Current hex|当前地块
Move here|移至此处
Wait here|在此等待
View sites (0)|查看选址（0）
No suitable sites are within this turn’s movement range.|本回合移动范围内没有合适的城址。
You can found a city here this turn.|本回合可在此建城。
Move here and found a city this turn.|移至此处，本回合即可建城。
End your turn to restore movement, then found a city here.|结束回合恢复移动力，下回合即可在此建城。
Move here and found a city next turn.|移至此处，下回合可在此建城。
Inspection mode. Click a hex to inspect it without moving.|查看模式下，点击地块可察看详情。
Select a unit, city or district to inspect it.|选择一个单位、城市或地块查看详情。
Click a red target to review the combat forecast.|点击红色目标查看战斗预测。
Click to preview attack|点击预览攻击
No suitable sites are within the settler’s current movement range.|开拓者当前移动范围内没有合适的城址。
Inspect mode|查看模式
City|城市
District|地区
Landmark|地标
Your city|己方城市
Rival city|敌方城市
This city is ready to produce.|这座城市可以开始生产。
Awaiting deployment|等待部署空间
Awaiting production|等待安排生产
Health|生命值
Movement|移动力
Charges|剩余次数
Terrain|地形
Move unit|移动单位
Show moves|显示可移动地块
Select|选择
Spent|已用尽
Found city|建造城市
Settle here|在此建城
Unavailable|不可用
Settle at least three hexes from every city, with movement remaining.|保留至少一点移动力，在距离所有城市至少三格的地块建城。
Build farm|修建农场
Build mine|修建矿场
Build on an unimproved, friendly district outside a city.|选择城市外尚未改良的己方地块施工。
Preview attack|预览攻击
Rangers can strike enemies up to two hexes away.|游骑兵能攻击两格以内的敌人。
Militia can engage adjacent enemies and capture a city.|民兵能攻击相邻敌人，也能占领城市。
Select a friendly unit to give orders.|选择己方单位下达指令。
Population|人口
Production|生产力
City HP|城市生命值
Buildings|建筑
Food|粮食
View production|查看生产
Choose production|选择生产项目
City orders|城市指令
Open water|水域
Open ocean|远洋
Coast|海岸
Lowlands|低地
Urban|城区
Woodland|林地
Foothills|丘陵
Mountains|山地
Unclaimed land|中立领土
Improvement|改良设施
None|无
Land units cannot cross open water.|陆地单位无法穿越海面。
Select a unit to give orders or a city to set production.|选择单位下达指令，或选择城市安排生产。
Select an enemy outlined in red to review the combat forecast.|选择红色边框的敌人查看战斗预测。
You have no units in the field.|战场上没有己方单位。
You have no cities.|你尚未拥有城市。
Train a unit|训练单位
Construct a building|建造建筑
Changing research keeps your banked science.|更换研究项目会保留已积累的科研点。
Changing debates keeps your banked culture.|更换市政议题会保留已积累的文化。
In progress|进行中
All research complete|所有科技已完成
Discovered|已发现
Discover now|立即研究
Attacker|进攻方
Defender|防守方
No retaliation|无反击伤害
Finish the capture with a ground unit such as Militia.|用民兵等可占城的地面部队完成占领。
The garrison takes this attack. City HP stays the same.|此次攻击由驻军承受，城市生命值保持不变。
This unit can weaken a city down to 1 HP.|此单位最多可将城市削弱至 1 点生命。
Ranged strike|远程攻击
Melee strike|近战攻击
Rangers, ranged infantry, artillery and armed ships deal damage without losing HP to retaliation, even against an adjacent target. Every attack spends the remaining movement. Melee attackers can take counterdamage. Defeat the garrison first. Shooting can reduce cities and camps to 1 HP. Send a surviving capture-capable land unit to take them.|游骑兵、远程步兵、火炮与武装舰船发动攻击时不会因反击损失生命，即便目标位于相邻地块。每次攻击都会用完剩余移动力。近战单位可能受到反击。先击败守军；射击可将城市或营地削弱至 1 点生命，再派有占领能力的陆军单位将其攻占。
Your militia will capture this city.|你的民兵将占领这座城市。
Both units will fall.|双方单位均会阵亡。
Your unit will fall in this attack.|你的单位会在这次进攻中阵亡。
The defending unit will fall.|防守单位会阵亡。
Both sides will hold their positions.|交战后双方均会留在原地。
Room lobby|房间大厅
Campaign over|战役结束
Open room|打开房间
Standings|排名
Rivals playing…|对手行动中…
Waiting…|等待中…
The game could not load. Refresh to try again.|游戏加载失败，请刷新重试。
Command center|指挥中心
Faction standings|阵营排名
Event log|事件记录
New solo campaign|新建单人战役
Return to solo|返回单人战役
Return to map|返回地图
Close dialog|关闭窗口
Play with friends|与好友联机
Multiplayer room|联机房间
Your room|你的房间
Room code|房间码
Copy invite link|复制邀请链接
Show link|显示链接
Hide link|隐藏链接
Invite link|邀请链接
Start when everyone has joined.|所有人加入后即可开始。
Send the invite link to a friend. Two players can start a campaign.|把邀请链接发给好友。两位玩家即可开局。
You have a seat. The host will start the campaign.|你已加入，请等待房主开始战役。
This site is unavailable for settlement.|此地无法建立城市。
This campaign has ended.|战役已结束。
Campaign in progress.|战役进行中。
Starting…|正在开始…
Start campaign|开始战役
Six-character code|六位房间码
Room options|房间选项
Create room|创建房间
Join room|加入房间
Enter a room code to join a friend or return to a saved seat.|输入房间码，加入好友或恢复已保存的席位。
Create a room for 2–4 players and share its invite link.|创建一个可容纳 2–4 人的房间，然后分享邀请链接。
Player name|玩家名称
Your name|你的名字
Connecting…|连接中…
Host|房主
You|你
How to play|游戏玩法
Field guide chapters|游戏指南章节
Campaign records|战役档案
No events yet.|暂无事件。
Campaign complete|战役结束
Holding every original capital wins immediately. Civic points are compared at the end of the round when a faction reaches 100, or after round 30.|占领所有初始首府即可立刻获胜。有阵营达到 100 分时，在本轮结束后比较积分；最迟于第 30 轮结算。
Start a new campaign?|开始新战役？
This replaces your saved solo campaign on this device.|这会替换本设备上保存的单人战役。
Start new campaign|开始新战役
Keep playing|继续当前战役
Checking order…|正在核对指令…
Reconnecting…|正在重连…
Your previous order was confirmed.|已确认上一条指令生效。
The room has moved on. Review the map before giving another order.|局势已变化，请先查看最新地图再下令。
The room has already received this order.|房间已收到这条指令。
Reconnected to the room.|已重新连接房间。
Connection lost. Reconnecting…|连接中断，正在重连…
Invite link copied.|已复制邀请链接。
Select and copy the invite link.|请选择并复制邀请链接。
Solo campaign resumed. Use the room code to return to your seat.|已返回单人战役。可使用房间码返回原席位。
New campaign started.|新战役已开始。
This turn could not be completed.|无法完成本回合。
This invitation has an invalid room code.|邀请中的房间码无效。
The room could not be reached.|无法连接房间。
The room did not load. Please try again.|房间加载失败，请重试。
Connection lost. Check your connection and try again.|连接中断，请检查网络后重试。
Language|语言
Los Angeles strategy map. Use arrow keys to preview a district. Press Enter or Space to select it. Use plus and minus to zoom, and Home to reset the view.|洛杉矶战役地图。用方向键预览地块，回车或空格选择。按加减键缩放，按 Home 重置视图。
`);
section(`
California Republic|加州共和国
Pacific Union|太平洋联盟
Valley Coalition|山谷联盟
Arroyo League|阿罗约同盟
Settler|开拓者
Builder|建设者
Militia|民兵
Rangers|游骑兵
Granary|粮仓
Workshop|工坊
Monument|纪念碑
City walls|城墙
Farm|农场
Mine|矿场
Agronomy|农学
Industrial Engineering|工业工程
Field Tactics|野战战术
Civic Administration|市政管理
Each city produces 2 more food per turn.|每座城市每回合粮食产量增加 2。
Each city produces 2 more production per turn.|每座城市每回合生产力增加 2。
Military units deal 7 more attack damage and 3 more retaliation damage.|军事单位的攻击伤害增加 7，反击伤害增加 3。
Each city earns 2 more capital and 1 more influence per turn.|每座城市每回合多获得 2 资金和 1 影响力。
Founds a new city at least three hexes from another city.|在距离其他城市至少三格的位置建立新城。
Builds farms and mines in your territory. Three charges.|在领土内修建农场或矿场，可使用三次。
Fights adjacent enemies and captures weakened cities.|攻击相邻敌人，占领防御薄弱的城市。
Strikes enemies up to two hexes away.|可攻击两格以内的敌人。
Adds 2 food per turn to help this city grow.|每回合增加 2 粮食，帮助城市发展。
Adds 2 production per turn in this city.|这座城市每回合增加 2 生产力。
Adds 3 influence per turn.|每回合增加 3 影响力。
Increases this city’s defenses.|提高城市防御能力。
Develop district|开发地区
District development|地区开发
District level|开发等级
Maximum district level|已达最高开发等级
Capital per turn|每回合资金收入
Influence per turn|每回合影响力收入
1 district order|1 次地区指令
Your capital city|己方首府
Rival capital city|敌方首府
Captured original capital|已易主的初始首府
Controlled by|当前控制方
Original capital of|建都阵营
District developed|地区已开发
Claim district|拓展领土
Contest district|争夺地区
The campaign has ended.|战役已结束。
Wait for your turn.|请等待你的回合。
You have used both civic actions this turn.|本回合的两次地区指令均已用尽。
Choose a district next to your territory.|请选择与己方领土相邻的地区。
Select a tile on the map.|请选择一个地图地块。
Select a settler to survey this tile.|请选择开拓者勘察这块地。
Wait for the settler’s turn.|请等待开拓者所属阵营的回合。
Cities need land. This tile is open water.|城市必须建在陆地上，这里是水域。
Mountain terrain is impassable.|山地无法通行。
Another unit occupies this tile.|这块地已被其他单位占据。
This tile is outside the settler’s remaining movement range.|开拓者剩余移动力不足以到达这块地。
Movement is spent. Found here next turn.|移动力已用完，下回合可在此建城。
Reaching this tile uses all movement. Found here next turn.|抵达此处将耗尽移动力，下回合可建城。
Found a city here this turn.|本回合可在此建城。
Wait for the city owner’s turn.|请等待城市所属阵营的回合。
This city already has a project in progress.|这座城市已有正在进行的生产项目。
This city already has that building.|这座城市已经有此建筑。
Your faction already knows this technology.|你的阵营已掌握这项科技。
This is your current research project.|这就是当前研究项目。
Choose an available technology.|请选择一项当前可研究的科技。
Choose an enemy unit or city within range.|请选择射程内的敌方单位或城市。
Choose one of your units.|请选择己方单位。
This unit has spent its movement for the turn.|该单位本回合移动力已耗尽。
Choose an unoccupied tile within movement range.|请选择移动范围内的空地块。
Found a city on friendly or neutral land at least three hexes from every other city.|在己方或中立陆地上建城，与其他城市至少相距三格。
Build a suitable improvement on one of your unimproved districts.|请在己方尚未改良的地区修建合适的设施。
Choose an action.|请选择行动。
Choose one of your cities.|请选择己方城市。
Choose an available production project.|请选择一个可用的生产项目。
Choose a district.|请选择地区。
That order is unavailable in this district.|该地区无法执行此指令。
Enter the six-character room code.|请输入六位房间码。
Choose a player name between 1 and 24 characters.|玩家名称长度应为 1 至 24 个字符。
Your seat could not be verified. Rejoin the room.|无法验证你的席位，请重新加入房间。
No room matches that code.|找不到与此房间码匹配的房间。
Join the room to continue.|请先加入房间。
The room could not be created. Please try again.|创建房间失败，请重试。
This campaign has already started.|本局战役已经开始。
All four seats are taken.|四个席位均已满。
The lobby changed while you were joining. Please try again.|大厅在你加入时发生变动，请重试。
The room has changed. Check the latest map before trying again.|对局已更新，请查看最新地图后重试。
Only the host can start the campaign.|仅房主可以开始战役。
At least two players are needed to start.|至少需要两名玩家才能开始。
The campaign has not started.|战役尚未开始。
Choose a valid order.|请选择有效的指令。
That order is unavailable.|无法执行该指令。
Unsupported request method.|请求方式不受支持。
The request is too large.|请求过大。
The request could not be read.|无法读取请求。
Unknown room operation.|未知的房间操作。
The room service is temporarily unavailable. Please try again.|联机服务暂时不可用，请稍后重试。
`);
section(`
First turn|第一回合
Use stored goods|使用库存物资
Each connected, improved deposit adds one good to your stockpile at the end of your turn. Open the Supply ledger to sell two matching goods for five capital or send them to one of your cities. You can make one shipment per turn.|每处已改良并连通城市的资源在回合结束时提供一份物资。打开「物资账簿」可将两份同类物资卖得五点资金，或运送到己方城市。每回合可发运一次。
Survey for deposits|寻找资源
Resources are hidden at the start. Choose Survey resources on your settler to spend one movement point and reveal deposits in sight. Founding your first city also unlocks surveying. Deposits you have seen remain marked as your units move on.|开局时资源尚未显现。选择开拓者的「勘探资源」，消耗一点移动力即可看见视野内的资源。建立首都也会自动开启勘探。单位离开后，已发现的资源仍会标在地图上。
Read city markers|辨认城市标记
City markers use the owner’s color. A crown marks the first capital and stays with that city after capture. The green hex beside your city name estimates turns to the next district at its current population. Select the city to see the target and expansion progress. Zoom in when names overlap.|城市标记使用当前城主的颜色。首都被占领后仍保留王冠。己方城名旁的绿色六边形显示按当前人口估算的扩地回合数。选中城市即可查看候选地和扩地进度。城名拥挤时可放大地图。
Send out your settler|派出开拓者
Select the Settler on the map or in your roster. Point at a highlighted hex to preview the route. Click a reachable hex to move. You can also tap a highlighted destination on a touch screen.|在地图或名册中选择开拓者。指向高亮地块可预览路线，点击即可移动；触屏上直接轻点目的地。
Found a city|建立城市
With movement remaining, a settler can found a city on friendly or neutral land at least three hexes from any city. Choose Found capital for your first city or Found city for a later settlement. Nearby open land joins your territory.|开拓者还有移动力时，可以在距任何城市至少三格的己方或中立陆地上建城。首座城市选择「建立首都」，之后选择「建造城市」。附近的空地会并入领土。
Give your capital a project|安排首府生产
Open Cities in the Empire roster, select your capital and choose production. Your cities add food and production when you end your turn.|在名册中打开「城市」，选择首府并指定生产项目。结束回合时，城市会积累粮食与生产力。
Open the Research council and select a project. Your cities generate science each turn. Completed research gives the whole faction a lasting benefit.|打开科技议会并选择项目。城市每回合产出科研点；完成研究后，全阵营都会获得长期收益。
Plan your turn|规划回合
Each faction also gets two district actions to claim land, develop a district or contest a neighbor. Units use their own movement points. End turn collects income and passes play to the next faction.|每个阵营每回合有两次地区行动，可用于拓展、开发或争夺领土。单位独立消耗移动力。结束回合后结算收入，轮到下一个阵营行动。
City growth|城市发展
Food and production|粮食与生产
Food grows your population. Production completes the unit or building in a city’s queue. More residents contribute capital and can raise production.|粮食推动人口增长，生产力用于完成队列中的单位或建筑。更多居民能增加收入，也能提高生产力。
Develop a district|开发己方地区
Select visible land you own. If a unit or city shares the hex, open District development in Field command. Each upgrade spends one district order and raises the level by one. Levels 1, 2 and 3 cost 5, 8 and 11 capital respectively. Level 3 is the maximum.|选中视野内的己方陆地。地块上若有单位或城市，可在战场指挥面板打开「地区开发」。每次升级消耗一次地区指令。升到 1、2、3 级分别花费 5、8、11 资金，最高为 3 级。
Compare development returns|比较开发收益
Each new level adds 1 civic point. Coast, lowland and urban districts also earn 1 more capital per turn. Woodland, foothills and mountains add 1 to base influence income. Check the preview for the change under your current policy.|每升一级增加 1 市政积分。海岸、低地和城区每回合额外获得 1 资金。林地、丘陵和山地则使每回合的基础影响力收入增加 1。升级前可预览当前施政方针下的实际变化。
Improve nearby land|改良周边土地
A builder has three charges. Work a land tile connected to a friendly city by at most two steps through your territory. Match the improvement to the deposit. Grain needs a farm, citrus an orchard, timber a lumber camp, stone a quarry, and iron a mine.|建设者可以施工三次。选择能经己方陆地在两步内连通己方城市的地块，并按资源选择设施。谷物需要农场，柑橘需要果园，木材需要伐木场，石料需要采石场，铁矿需要矿场。
Choose a building|选择建筑
A granary provides food, a workshop adds production, a monument earns influence and walls strengthen city defenses. Each city can build one of each.|粮仓提供粮食，工坊提高生产力，纪念碑增加影响力，城墙强化防御。每座城市可各建一座。
Make room for recruits|留出部署空间
A new unit deploys in the city or on an adjacent open, passable hex in friendly or neutral territory. If all those hexes are occupied, clear one and end the turn to deploy it.|新单位部署在城内或相邻的己方、中立可通行空地。如果地块已满，先腾出一个位置，再结束回合完成部署。
Field tactics|野战战术
Read the terrain|判读地形
Each unit starts its turn with two movement points. Coast, lowland and urban tiles cost one point. Woodland and foothills cost two. Mountains, open water and occupied hexes block movement.|每个单位起始有两点移动力。进入海岸、低地或城区消耗一点，林地与丘陵消耗两点。山地、水面和已有单位的地块无法通行。
Preview an attack|预览一次攻击
Select a military unit and click a highlighted enemy. The combat forecast shows the damage and possible losses. Choose Confirm attack to commit, or return to the map to reconsider. An attack spends the unit’s remaining movement.|选中军事单位，再点击高亮敌人。战斗预测会显示伤害和可能的损失。选择「确认攻击」执行进攻，或返回地图重新部署。攻击会消耗该单位的全部剩余移动力。
Take a city|占领城市
Melee units strike adjacent targets and can take counterdamage. Rangers can strike from two hexes away without a counterattack. Defeat the garrison first. A ranged attack can reduce a city to one health point. A surviving melee attacker can capture it.|近战单位攻击相邻目标，可能受到反击；游骑兵可以从两格外射击且不受反击。先击败驻军。远程攻击最多使城市剩一点生命值，存活的近战进攻单位才能占领城市。
Recover|恢复战力
Units regain movement at the start of their faction’s turn. A unit in a friendly city heals up to 12 health. Each friendly city recovers up to 6.|每当己方回合开始，单位恢复移动力。驻扎在己方城市的单位最多恢复 12 点生命值，每座己方城市最多恢复 6 点。
Research & victory|科技与胜利
Choose a specialization|选择研究方向
Agronomy adds 2 food per city. Industrial Engineering adds 2 production per city. Field Tactics adds 7 military attack damage and 3 retaliation damage. Civic Administration adds 2 capital and 1 influence per city.|农学使每座城市增加 2 粮食；工业工程增加 2 生产力；野战战术使军事单位的攻击伤害增加 7，反击伤害增加 3；市政管理使每座城市增加 2 资金和 1 影响力。
Build up science|积累科研点
At the end of your turn, gain 2 science, plus 1 per city and 1 for every 3 residents across your cities. You can switch projects and keep your accumulated science. Reaching the cost completes the discovery and leaves any surplus for the next project.|结束回合时获得 2 个基础科研点，每座城市再加 1 点，每 3 名居民再加 1 点。更换项目不会损失积累的科研点。达到成本即完成研究，余量可用于下一项目。
Win by domination|征服胜利
Control every participating faction’s original capital to win immediately.|控制所有参战阵营的初始首府即可立即获胜。
Win on civic points|积分胜利
If a faction reaches 100 civic points, finish the current round and compare scores. The same scoring applies after round 30. The highest score wins, and a tie shares victory.|当任一阵营达到 100 分，在当前轮结束后比较积分。第 30 轮结束后也按此规则结算。最高分获胜，同分者共享胜利。
Count civic points|积分计算
Score 2 per district, 1 per development level and 2 per landmark. Cities earn 3 each, plus 1 per resident, 2 per finished building and 1 per land improvement.|每块领土 2 分，每级开发 1 分，每个地标 2 分。每座城市 3 分，另加每名居民 1 分、每座建筑 2 分、每项土地改良 1 分。
`);

// The same place names are used in map labels, order hints and campaign history.
section(`
PACIFIC|太平
OCEAN|洋
Pacific Ocean|太平洋
Santa Monica Mtns|圣莫尼卡山脉
Malibu|马利布
Topanga|托潘加
Topanga Canyon|托潘加峡谷
Pacific Palisades|太平洋帕利塞兹
Palisades Park|帕利塞兹公园
Santa Monica|圣莫尼卡
Wilshire Montana|威尔希尔蒙大拿
Venice|威尼斯海滩
Marina del Rey|玛丽安德尔湾
Playa del Rey|普拉亚德尔雷
El Segundo|埃尔塞贡多
Manhattan Beach|曼哈顿海滩
Brentwood|布伦特伍德
Westwood|韦斯特伍德
Bel Air|贝莱尔
Century City|世纪城
Culver City|卡尔弗城
Beverly Hills|比佛利山庄
West Hollywood|西好莱坞
Pico-Robertson|皮科－罗伯逊
Baldwin Hills|鲍德温山
View Park|维尤公园
Playa Vista|普拉亚维斯塔
Westchester|韦斯特切斯特
Los Angeles International|洛杉矶国际机场
LAX|洛杉矶国际机场
Hawthorne|霍桑
Inglewood|英格尔伍德
West Adams|西亚当斯
Exposition Park|博览园
Fairfax|费尔法克斯
Koreatown|韩国城
Pico-Union|皮科－尤宁
Downtown LA|洛杉矶市中心
South Park|南园区
Boyle Heights|博伊尔高地
Arts District|艺术区
East Los Angeles|东洛杉矶
Echo Park|回声公园
Lincoln Heights|林肯高地
Silver Lake|银湖
Hollywood|好莱坞
Hollywood Hills|好莱坞山
Los Feliz|洛斯费利斯
Griffith Park|格里菲斯公园
Griffith Observatory|格里菲斯天文台
Verdugo Hills|韦尔杜戈山
Glendale|格伦代尔
Eagle Rock|鹰岩
Highland Park|高地公园
Mount Washington|华盛顿山
South Pasadena|南帕萨迪纳
Pasadena|帕萨迪纳
Rose Bowl|玫瑰碗球场
Arroyo Seco|阿罗约塞科
Altadena|阿尔塔迪纳
San Marino|圣马力诺
Alhambra|阿罕布拉
San Gabriel|圣盖博
North Hollywood|北好莱坞
Burbank|伯班克
Sun Valley|太阳谷
Studio City|影城
Sherman Oaks|谢尔曼奥克斯
Encino|恩西诺
Van Nuys|范奈斯
Woodland Hills|伍德兰希尔斯
Canoga Park|卡诺加公园
Calabasas|卡拉巴萨斯
Chatsworth|查茨沃思
La Cañada Flintridge|拉卡尼亚达弗林特里奇
Angeles National Forest|安吉利斯国家森林
Montebello|蒙特贝洛
Commerce|康默斯
Vernon|弗农
Huntington Park|亨廷顿公园
Downey|唐尼
Watts|沃茨
Gardena|加迪纳
Compton|康普顿
Lynwood|林伍德
California|加利福尼亚
San Francisco|旧金山
San Francisco Bay|旧金山湾
San Diego|圣迭戈
Frontier|拓荒时代
Industrial|工业时代
Modern|现代
Mounted Scouts|骑马侦察兵
Rifle Company|步枪连
Field Artillery|野战炮兵
Armored Column|装甲纵队
Tech tree|科技树
Civics tree|市政树
Civics|市政
Technology|科技
Technologies|科技
Science|科研点
Culture|文化
Navigation|航海术
Harbor|港口
Shipyard|船厂
`);
section(`
Online|联机
HP|生命值
Range|射程
Unit|单位
Frontier Era|拓荒时代
Industrial Era|工业时代
Modern Era|现代
Port and fleet|港口与舰队
City projects|城市项目
Tactical map|战役地图
Campaign atlas|战役地图集
Choose a civic|选择市政
All civics complete|所有市政均已完成
Complete|已完成
Locked|未解锁
Ready|就绪
Mounted unit|骑兵单位
Infantry unit|步兵单位
Siege unit|攻城单位
Armored unit|装甲单位
Naval crew|海上作业单位
Patrol ship|巡逻舰
Warship|战舰
Fishing crew|渔船队
Revenue cutter|海岸巡逻舰
Steam frigate|蒸汽护卫舰
Fishery|渔场
Build fishery|建设渔场
Earns 2 capital per turn. A city may use its own shore or a connected coastal district within two hexes.|港口每回合提供 2 资金。可设于本城海岸，或与城市相连且不超过两格的己方海岸。
Adds 2 production per turn to this harbor city and equips it for larger vessels.|该港口城市每回合生产力增加 2，并能建造大型舰船。
Builds two fisheries within two connected water steps at sea or three on a charted river or lake. Can bring a catch back to your harbor.|可建设两座渔场。海上须在港口两格连通水路内，已探明的河流或湖泊可达三格。也可将渔获运回己方港口。
A fast sailing vessel for fighting nearby ships and bombarding the shoreline.|快速帆船，适合迎击近处舰船和炮击海岸。
A shipyard warship that bombards targets up to two hexes away.|由造船厂建造的战舰，可炮击两格内的目标。
Settle on the shore or claim a shore district connected to this city within two hexes.|沿海建城，或取得与此城相连且距离不超过两格的海岸。
Build a harbor in this city first.|先在此城修建港口。
Build a shipyard in this city first.|先在此城建造船厂。
Research Steam Power first.|请先研究蒸汽动力。
Build a fishery on open water within two water hexes of a friendly harbor.|在距己方港口两格水路以内的空水域建设渔场。
Establish a fishery in coastal water for +2 food and +1 capital.|在沿岸水域建设渔场，提供 2 粮食和 1 资金。
Your unit will capture this city.|你的单位将占领这座城市。
Choose a valid civic.|请选择可用的市政。
Choose an available civic.|请选择可用的市政。
Your faction has already completed this project.|你的阵营已完成此项目。
This is your current project.|这就是当前项目。
You have used all district orders this turn.|本回合的地区指令已用尽。
Workshop Engineering|工坊工程
Land Surveying|土地测绘
Coastal Navigation|近海航行
Coastal cities earn 2 extra capital per turn.|沿海城市每回合额外获得 2 资金。
Steam Power|蒸汽动力
Workshops supply 2 extra production per turn.|工坊每回合额外提供 2 生产力。
Ballistics|弹道学
Ranged attacks deal 5 extra damage.|远程攻击额外造成 5 点伤害。
Radio Networks|无线电网络
Each city generates 2 more science per turn.|每座城市每回合额外获得 2 科研点。
Motorization|机械化
Municipal Charter|市政宪章
Each city generates 1 extra culture per turn.|每座城市每回合额外获得 1 文化。
Public Works|公共工程
Each city produces 1 more production per turn.|每座城市每回合额外获得 1 生产力。
Park Conservancies|公园保护区
Cities near an owned woodland or foothill gain 1 food and 1 culture per turn.|邻近己方林地或丘陵的城市每回合额外获得 1 粮食和 1 文化。
County Federation|郡县联邦
Gain a third district order at the start of each turn.|每回合开始时，多获得一次地区指令，共三次。
Public Broadcasting|公共广播
Civil Mobilization|全民动员
New military units enter service with 20 extra maximum health.|新训练的军事单位最大生命值增加 20。
Resume campaign|继续战役
An urban basin below the Santa Monica Mountains. Expand west to reach the Pacific.|圣莫尼卡山脚下的城市盆地。向西扩张，抵达太平洋沿岸。
Two shores face across a navigable bay. Build a port or expand around the southern wetlands.|两岸隔着可通航的海湾相望。可建港出海，也可绕过南方湿地扩张。
San Diego Bay|圣迭戈湾
Bay|湾
East Bay Hills|东湾丘陵
Peninsular Ranges|半岛山脉
San Pablo Bay|圣巴勃罗湾
San Rafael|圣拉斐尔
San Pedro|圣佩德罗
Mill Valley|米尔谷
Mount Tamalpais|塔玛尔派斯山
Sausalito|索萨利托
Marin Headlands|马林岬角
Golden Gate|金门
Presidio|普雷西迪奥
Ocean Beach|海洋海滩
Golden Gate Park|金门公园
Western Addition|西增区
Twin Peaks|双子峰
Mission District|教会区
Daly City|戴利城
Pacifica|帕西菲卡
South San Francisco|南旧金山
Burlingame|伯灵格姆
San Mateo|圣马特奥
Redwood City|红木城
Palo Alto|帕洛阿尔托
San Jose|圣何塞
Fremont|弗里蒙特
Hayward|海沃德
San Leandro|圣利安卓
Alameda|阿拉米达
Oakland|奥克兰
Fruitvale|弗鲁特韦尔
Emeryville|埃默里维尔
Berkeley|伯克利
Berkeley Hills|伯克利山
Albany|奥尔巴尼
Richmond|里士满
North Richmond|北里士满
El Cerrito|埃尔塞里托
Angel Island|天使岛
Angel Island ferry|天使岛渡轮
`);
section(`
Command the harbor from Point Loma to Chula Vista. The Silver Strand shelters the inner bay.|从洛马角到丘拉维斯塔，争夺港湾控制权。银色沙洲将内湾与太平洋隔开。
La Jolla Shores|拉霍亚海岸
La Jolla|拉霍亚
Mount Soledad|索莱达山
Pacific Beach|太平洋海滩
Crown Point|皇冠角
Mission Beach|米申海滩
Mission Bay Park|米申湾公园
Mission Bay|米申湾
Old Town|老城
Point Loma|洛马角
Loma Portal|洛马门户
Midway District|中途区
San Diego International|圣迭戈国际机场
Balboa Park|巴尔博亚公园
North Park|北园区
Little Italy|小意大利
Downtown San Diego|圣迭戈市中心
East Village|东村
Golden Hill|金丘
Barrio Logan|洛根街区
Cabrillo Point|卡布里约角
North Island|北岛
Coronado|科罗纳多
Glorietta Bay|格洛列塔湾
Silver Strand|银色沙洲
National City|纳雄耐尔城
Chula Vista Marina|丘拉维斯塔码头
Chula Vista|丘拉维斯塔
Otay Valley|奥泰谷
South Bay Salt Works|南湾盐场
Imperial Beach|帝国海滩
San Ysidro|圣伊西德罗
`);
section(`
Empire planning|势力规划
Council selection|选择议会
Close council|关闭议会
Change map|切换地图
California campaigns|加州战役
No campaign started on this map.|此地图尚未开始战役。
Starting over replaces the saved campaign on the selected map. Your other regions keep their progress.|重新开始会替换所选地图的单人存档。其他地区的进度会保留。
Recon unit|侦察单位
Fast riders move four hexes and can occupy a weakened city.|骑马侦察兵可移动四格，并能占领防御薄弱的城市。
Durable infantry fight at close range and capture weakened cities.|耐久的步兵擅长近战，可以攻占防御薄弱的城市。
Guns bombard targets up to three hexes away. A ground unit must occupy the city.|野战炮可炮击三格内的目标。占领城市需要地面部队。
Armored columns move three hexes, break defended positions and occupy cities.|装甲纵队可移动三格，突破防线并占领城市。
Move into your territory to upgrade.|进入己方领土后才能升级。
Your treasury cannot cover this upgrade.|金库中的资金不足以升级。
No field upgrade is available.|当前没有可用的战场升级。
Choose your map|选择地图
Open Change map for Los Angeles, San Francisco or San Diego. Each region has a separate solo save. For multiplayer, the host chooses the map when creating the room.|选择「切换地图」可前往洛杉矶、旧金山或圣迭戈。每个地区的单人进度独立保存。多人联机时由房主在建房时选择地图。
Open Technology and Civics beside the map. Choose a project in each council. Once you found your first city, your faction earns science and culture separately every turn.|打开地图旁的「科技」和「市政」，分别选择一项议程。建立首都后，你的文明每回合分别积累科研点和文化。
Start with two district orders per turn to claim, develop or contest land. County Federation adds a third. Units use their own movement points. End turn collects income and passes play to the next faction.|初始每回合有两次地区指令，可用于拓展、开发或争夺领土。通过「郡县联邦」后增加为三次。各单位单独消耗移动力。结束回合后结算收入，轮到下一个阵营行动。
Check the selected unit’s movement allowance. Land units spend one point on coast, lowlands or urban land and two in woodland or foothills. Ships travel on open water. Occupied hexes block movement.|先查看所选单位的移动力。陆地单位进入海岸、低地或城区耗一点，进入林地或丘陵耗两点。船只在水面航行。已被其他单位占据的地块无法通行。
Land units deploy in the city or an adjacent open, passable hex in friendly or neutral territory. Ships deploy at the harbor or in neighboring open water. Clear a deployment space before ending your turn.|陆地单位部署在城内或相邻的己方、中立可通行空地。舰船从港口或相邻空水域下水。结束回合前请留出部署空间。
Upgrade in the field|战场升级
After the required discovery, select a veteran in your territory and pay the displayed capital cost to upgrade it. The unit keeps its health proportion and spends the rest of its movement.|研究所需科技后，在己方领土内选中部队，支付显示的资金即可升级。部队保留当前生命值比例，并消耗本回合剩余移动力。
Workshop Engineering opens Steam Power and then Radio Networks. Field Tactics leads to Ballistics. Learn both Steam Power and Ballistics to unlock Motorization and train an Armored Column.|工坊工程解锁蒸汽动力，随后可研究无线电网络。野战战术解锁弹道学。掌握蒸汽动力和弹道学后可研究机械化，训练装甲纵队。
Cities, population and discoveries contribute science. Culture funds a separate civic project at the same time. Switch projects without losing saved points. Surplus science and culture carry over.|城市、人口和已有的发现都能贡献科研点。文化同时推进独立的市政项目。切换项目不会损失已累积的点数，结余也会保留。
Choose a civic path|选择市政路线
Municipal Charter leads to County Federation for another district order, or Park Conservancies for terrain bonuses. Completing a project from a later era advances your faction.|通过市政宪章后，可选郡县联邦，增加地区指令；也可选公园保护区，利用地形获得额外产出。完成较晚时代的项目即可进入该时代。
At sea|海上行动
Choose a harbor site|港口选址
Found on the shore or connect a city to your own coast within two hexes. Choose Harbor in city production. The harbor reserves an adjacent water hex and earns capital.|在海岸建城，或将城市与两格以内的己方海岸连接。打开城市生产，选择「港口」。港口会预留相邻水域，并带来资金收入。
Put a crew to work|派渔船出海
Train a Fishing crew at a harbor. Sail to open water within two water hexes of a friendly harbor and build a Fishery. Each crew has two charges.|在港口训练渔船队，驶入距己方港口两格水路内的空水域，再选择建设渔场。每支渔船队可施工两次。
Launch a fleet|组建舰队
A harbor trains Revenue cutters. Research Steam Power to unlock the Shipyard, then build one to train Steam frigates. Ships bombard the shore; bring a land unit to occupy a city.|港口可训练海岸巡逻舰。研究蒸汽动力可解锁船厂，在港口建好船厂即可训练蒸汽护卫舰。战舰可以炮击海岸，占领城市还需要陆军。
`);
section(`
Harbor district|港区
Port production|港口生产
Ships launch here and repair in nearby water.|舰船在这里下水，并可在附近水域维修。
Build a fishery within two water hexes of a friendly harbor for +2 food and +1 capital.|在距己方港口两格水路以内建设渔场，增加 2 粮食和 1 资金。
`);
section(`
Golden Gate Bridge|金门大桥
Bridge crossing|跨桥通行
Routed crossings|桥梁通道
Choose a valid campaign map.|请选择有效的战役地图。
Civic assembly|市政议会
Close civics|关闭市政
`);
section(`
Civitas LA · California Campaigns|Civitas LA · 加州战役
Civitas LA — California Campaigns|Civitas LA · 加州战役
N|北
`);
section(`
Bay Bridge|海湾大桥
Coronado Bridge|科罗纳多大桥
`);

section(`
Sight radius|视野半径
hex|格
hexes|格
Awaiting city income|建城后开始积累
`);

section(`
Activity spotted in view.|在视野内发现动静。
Uncharted territory. Move closer to explore.|尚未探索。派单位靠近以揭开迷雾。
Uncharted territory|未知区域
Outside current sight|目前没有视野
Only the city owner can inspect its economy.|只有城市所属文明可以查看其经济情况。
Explore the fog|探索迷雾
Each unit sees two hexes in every direction. Dark tiles are uncharted. Shaded tiles keep the terrain you explored, but enemies there are hidden.|每个单位都能看见周围两格。深色地块尚未探索。阴影内保留已探索的地形，其中的敌人会隐藏。
Grain|谷物
Citrus|柑橘
Timber|木材
Stone|石料
Iron ore|铁矿
Fish shoal|鱼群
Resource|资源
Survey resources|勘探资源
1 movement|1 点移动力
Resource survey completed.|资源勘探已开启。
This unit cannot start a resource survey.|此单位无法开始资源勘探。
`);

section(`
In sight|视野内
Choose a tile within your current sight.|请选择当前视野内的地块。
Orchard|果园
Lumber camp|伐木场
Quarry|采石场
Build orchard|建造果园
Build lumber camp|建造伐木场
Build quarry|建造采石场
Build to harvest|所需设施
Supplying city|供应城市
Work an owned site connected to a city within two land steps.|在与己方城市相连、两格以内的领土上施工。
Barbarian camp|野蛮人营地
Barbarian lookout|野蛮人哨探
Neutral forces|中立部队
Send a close-combat unit to clear the camp for 12 capital.|派近战单位清剿营地，可获得 12 资金。
This lookout belongs to a nearby barbarian camp.|这名哨探来自附近的野蛮人营地。
Clearing the camp adds 12 capital to your treasury.|清剿营地后，国库将增加 12 资金。
Camp cleared. Your treasury gains 12 capital.|营地已清剿，国库增加 12 资金。
A barbarian patrol was dispersed.|已击溃野蛮人巡逻队。
Your unit engaged the barbarians.|你的部队与野蛮人交战。
Clear a camp|清剿营地
Watch for tan tents with a red pennant. A lookout marks an active camp nearby. Select a military unit and preview the attack. Ranged units weaken a camp; a surviving close-combat unit can clear it and earn 12 capital.|带红旗的帐篷是营地，遇到哨探意味着附近可能有营地。选中部队可预览攻击。远程单位可以削弱营地，幸存的近战单位可以清剿营地并获得 12 资金。
`);

section(`
Economy|经济
Supply ledger|物资账簿
Stored goods|库存物资
Destination city|接收城市
Stored|库存
Harvest|每回合采集
Sell for 5 capital|出售得 5 资金
Supply 4 food|补给 4 粮食
Supply 4 production|补给 4 生产力
Each worked deposit adds one good at the end of your turn. Dispatch two of the same good once per turn.|每处已开发的资源在回合结束时收获 1 份物资。每回合可将 2 份相同物资出售或运送给城市一次。
Shipment dispatched this turn.|本回合已发货。
Resource shipment dispatched.|物资已发运。
This shipment requires two stored goods.|本次装运需要 2 份同类物资。
Your shipment for this turn has already left.|本回合的物资已发运。
Select a city with an unfinished production project.|请选择正在生产且尚未完工的城市。
Choose one of your cities to receive goods.|请选择一座己方城市以接收物资。
Barbarian raiders|野蛮人劫掠队
Guard the city with a military unit or city walls to repel these raiders.|在城内或相邻地块驻军，或修建城墙，可以击退劫掠队。
A lookout spotted your city. Intercept it before it returns to camp.|野蛮人哨探发现了你的城市。趁它返回营地之前拦截它。
A lookout returned to camp. A raiding party is preparing.|哨探已经返回营地。野蛮人正在集结劫掠队。
The city defenses repelled the raid.|城市守军击退了劫掠队。
Raiders struck the city and looted up to 3 capital.|劫掠队袭击城市，掠走最多 3 资金。
Barbarian raiders clashed with your military unit.|野蛮人劫掠队与你的部队交战。
Repel a raid|抵御劫掠
A lookout near an established city may return to its camp. Intercept it before it reports, or attack the camp before the party leaves two rounds later. A military defender within one hex of the city, or city walls, repels the raid. Raiders leave civilian units alone.|哨探在已建立一段时间的城市附近侦察后，会返回营地。可以中途拦截它，或在两轮集结期内清剿营地。城内或邻格有军事单位、或城市修有城墙时，可击退袭击。劫掠队不会主动攻击平民单位。
University wonders|大学奇观
Unlocks university|解锁大学
UCLA|加州大学洛杉矶分校
Stanford University|斯坦福大学
UC Berkeley|加州大学伯克利分校
Caltech|加州理工学院
A public arts campus generating 3 culture and 1 science per turn.|公共艺术校园，每回合提供 3 点文化和 1 点科研。
An engineering quad generating 2 production and 2 science per turn.|工程学院，每回合提供 2 点生产力和 2 点科研。
A public research campus generating 4 science per turn.|公立研究校园，每回合提供 4 点科研。
A research observatory generating 5 science per turn.|科研天文台，每回合提供 5 点科研。
`);

section(`
Site bonus|选址加成
Standard campus yield|标准校园产出
Commission campus|在此建造校园
Back to production|返回生产菜单
Choose a campus site in this city’s territory.|请选择这座城市领土内的一块校园用地。
Claim an empty land tile within two hexes of the city.|请先控制距该城市两格以内的空闲陆地。
Choose a surveyed campus site.|请选择一处可用的校园地块。
`);

section(`
Charter fee|筹建费
Available worldwide.|尚未被建成
Under construction|正在筹建
Already opened|已建成
A rival charter is underway.|已有其他阵营在筹建这所大学。
A competing campus opened first. The charter fee was returned.|对手抢先建成了这所大学，筹建费已全额退还。
This university has already opened.|这所大学已在本局建成。
One of your cities already holds this charter.|己方已有城市正在筹建这所大学。
`);

section(`
University wonder|大学奇观
University opened|大学建成
Dismiss campus notice|关闭大学建成通知
Universities|大学奇观
Charter a university|解锁大学
Municipal Charter unlocks UCLA. Workshop Engineering unlocks Stanford University, Park Conservancies unlocks UC Berkeley, and Steam Power unlocks Caltech. Choose a city and open University wonders in its production menu.|采用市政宪章解锁加州大学洛杉矶分校，研究工坊工程解锁斯坦福大学，通过“公园保护区”市政解锁加州大学伯克利分校，研究蒸汽动力解锁加州理工学院。在城市生产菜单中选择大学奇观。
Survey the campus|选择校园地块
Choose an empty land tile in your territory within two hexes of the host city. Deposits, improvements, city centers and reserved sites are protected. A matching terrain grants one additional point in the listed specialty every turn.|在建设城市两格内选择一块己方空地。资源地块、改良设施、市中心和已预留地块均不能选。地形适宜时，该校每回合额外提供一点特色产出。
Compete for a charter|竞争世界奇观
Pay the charter fee and assign city production. The first campus of its kind to open wins the charter for this world. A competing city stops work and recovers its fee. Its spent production is lost.|支付筹建费并投入城市生产力。第一座建成的同名大学成为本局唯一的该校。竞争失败的城市会停工并收回筹建费；已投入的生产力不会返还。
Read the opening report|查看大学落成
A completed campus appears on the map. Select the campus tile to inspect its effect. Capturing its host city transfers the campus with the city.|建成后可在地图上选择校园地块，查看其效果。占领大学所属城市也会接管该校。
`);

section(`
Play solo|开始单人战役
Title screen|返回开始界面
Rejoin room|重新进入房间
Keep saved campaign|保留已有存档
Room code or invite link|房间代码或邀请链接
Explore California, settle its coast and lead your civilization through the ages.|探索加州海岸，选址建城，带领你的文明走过不同的时代。
`);

section(`
Civilization CA · California Campaigns|Civilization CA · 加州战役
Founding expedition|建都远征
Choose a site for your first city. Surveying or founding can reveal local resources.|选择第一座城市的位置。勘探或建城后可发现附近的资源。
Locate settler|定位开拓者
`);

section(`
Trail Skirmishers|山径散兵
Pike Guard|长枪卫队
Light infantry unit|轻步兵
Defensive infantry unit|防御步兵
Light ranged infantry. Woodland and foothills cost only one movement point.|轻装远程步兵。进入林地或丘陵只消耗一点移动力。
Guards gain 14 attack damage against mounted scouts and cut their incoming charge damage by 14.|攻击骑马侦察兵时额外造成 14 点伤害，抵御其冲锋时少受 14 点伤害。
Pikes against cavalry · +14 damage|长枪克制骑兵 · 伤害 +14
Defending pike line · −14 damage|长枪卫队防守 · 伤害 −14
`);

section(`
Siege Engineers|攻城工兵
Signal Corps|通信队
Siege infantry unit|攻城步兵
Communications unit|通信部队
Assault engineers deal 18 extra damage to an ungarrisoned walled city and can capture it.|攻击没有驻军的城墙时，攻城工兵额外造成 18 点伤害，并可占领城市。
Supports adjacent friendly formations. They deal 8 more damage against rival civilizations. Multiple signal units do not stack.|支援相邻友军。其攻击其他文明时多造成 8 点伤害，多支通信队的效果不会叠加。
Siege engineers at the walls · +18 damage|工兵攻城 · 伤害 +18
Adjacent signal corps · +8 damage|邻近通信队 · 伤害 +8
`);

section(`
Harbor Ironclad|港防铁甲舰
Escort Destroyer|护航驱逐舰
Coastal siege unit|近岸攻城舰
Fleet escort unit|舰队护航单位
A slow armored ship that deals 14 extra damage to cities and their garrisons. Requires a shipyard.|低速装甲舰，对城市和城内驻军额外造成 14 点伤害。需要船厂。
A fast escort with four movement points. It deals 18 extra damage to armed ships. Requires a shipyard.|高速护航舰，拥有四点移动力，对武装舰船额外造成 18 点伤害。需要船厂。
Coastal bombardment · +14 damage|近岸炮击 · 伤害 +14
Escort against a warship · +18 damage|护航舰对敌舰 · 伤害 +18
`);

section(`
Choose a frontier formation|挑选边疆兵种
Trail skirmishers cross woods and hills for one movement point. Pike Guards make poor targets for cavalry and gain a bonus when attacking mounted scouts.|山径散兵穿过林地和丘陵只需一点移动力。长枪卫队能抵御骑兵冲锋，攻击骑马侦察兵时也有加成。
Support an assault|支援进攻
Siege Engineers can capture a walled city after its garrison falls. Keep a Signal Corps one hex from a friendly attacker to add 8 damage against rival civilizations. Check the forecast to see the active bonuses.|击败驻军后，攻城工兵可以夺取有城墙的城市。让通信队站在友军旁边一格，友军攻击其他文明时可多造成 8 点伤害。战斗预估会列出当前加成。
Choose a warship|选择作战舰船
An ironclad is slow and tough and excels at coastal sieges. An escort destroyer moves four hexes and deals extra damage to armed ships. Both launch from a shipyard.|港防铁甲舰速度较慢，耐久性高，擅长近岸攻城。护航驱逐舰可移动四格，攻击武装舰船时有额外伤害。两种船都需要船厂。
Unit handbook|兵种手册
Compare base movement, sight, attack range and production cost. Select a formation to see its role and requirements.|比较各兵种的基础移动力、视野、射程和生产成本。点开兵种可查看用途和训练条件。
Formation|兵种
Base unit statistics|兵种基础数值
Move|移动
Sight|视野
Range|射程
Cost|成本
Train with|训练条件
Upgrades to|可升级为
City center|城市中心
Founds a city on a legal settlement site.|在符合条件的地块建立城市。
Spends charges to improve land connected to a friendly city.|消耗建造次数，改良与己方城市相连的土地。
Captures a weakened city through an adjacent attack.|可从相邻地块进攻并占领被削弱的城市。
Can attack from two hexes away.|可以从两格外发动攻击。
`);

section(`
Natural wonder|自然奇观
Adjacent natural wonder|相邻自然奇观
La Brea Tar Pits|拉布雷亚沥青坑
South Bay Salt Marshes|南湾盐沼
Torrey Pines|托里松林
Cabrillo Tide Pools|卡布里洛潮池
Each adjacent worked district gains 2 science.|每块由市民工作的相邻地块增加 2 点科研。
Each adjacent worked district gains 1 production and 1 science.|每块由市民工作的相邻地块增加 1 点生产力和 1 点科研。
Each adjacent worked district gains 2 food.|每块由市民工作的相邻地块增加 2 点粮食。
Each adjacent worked district gains 1 food and 1 production.|每块由市民工作的相邻地块增加 1 点粮食和 1 点生产力。
Each adjacent worked district gains 1 food and 1 science.|每块由市民工作的相邻地块增加 1 点粮食和 1 点科研。
Dark asphalt seeps through the city floor, preserving the bones of Ice Age animals.|沥青从城市地下缓缓渗出，保存了冰河时代动物的骨骼。
Sandstone walls rise above a winding creek in the Santa Monica Mountains.|圣莫尼卡山脉中，蜿蜒的小溪穿行于砂岩峭壁之间。
From the summit in Marin, wooded ridges fall away toward the Pacific and the bay.|从马林县的山顶望去，林木覆盖的山脊一路蜿蜒向太平洋和海湾。
Tidal channels wind between salt-tolerant plants at the shallow southern end of the bay.|在海湾南端的浅滩，潮沟穿过成片的耐盐植物。
Wind-shaped pines cling to sandstone bluffs above the Pacific near La Jolla.|在拉霍亚附近，海风塑造的松树扎根于俯瞰太平洋的砂岩峭壁。
At the foot of Point Loma, receding water leaves small rock pools alive with intertidal creatures.|在洛马角的崖脚，潮水退去后，岩池中仍可看到丰富的潮间带生物。
This protected site cannot host a city, improvement or campus.|这里是受保护的自然奇观，无法建城、改良地块或建设大学。
Wonders|奇观
Show on map|在地图上查看
Start a new campaign to discover natural wonders. This save keeps its original terrain.|开始新战役即可探索自然奇观，这个存档保留了原来的地形。
Explore to record natural wonders here. Work a district next to a discovered site to gain its local bonus.|探索地图后，发现的自然奇观会记录在这里。让市民在奇观旁的地块工作，即可获得当地加成。
This save uses the original map. Start a new campaign here to play the regional coastline.|这个存档使用原来的地图。选择「开始新战役」即可体验本地区的新海岸线。
`);

section(`
Human seats to invite|需要邀请的真人席位
Only the host needs to join. Computer seats are filled automatically.|仅房主需入座。电脑席位会自动填满。
This server cannot create the requested roster. Reload the game and try again.|服务器无法创建所选席位。请刷新游戏后再试。
`);

section(`
Your team is playing|己方队伍行动中
Mark ready|完成我的行动
Ready for next team|已完成本轮行动
Waiting for allies…|等待队友…
`);

section(`
Spend gold to buy eligible city projects, upgrade units and develop owned land.|金币可用于购买符合条件的城市项目、升级部队和开发己方地块。
`);

section(`
Changing an enacted policy costs 3 influence. The first policy is free.|首次采用政策免费，之后每次更换需要 3 点影响力。
Contest an eligible rival border district for 4 gold and 5 influence, plus 2 influence per district level.|争夺符合条件的敌方边境地块需要 4 金币和 5 点影响力；该地块每升一级，费用再增加 2 点影响力。
`);

section(`
Income per turn|每回合收入
`);

section(`
Taking orders|可下达指令
Waiting for team turn|等待本队回合
Allies act together. Mark ready when you finish. The next team starts once every active ally is ready.|队友可同时行动。完成操作后点击「完成我的行动」。待本队所有行动中的成员完成后，轮到下一队。
`);

section(`
Connection interrupted. Your order will be checked on reconnect.|连接中断。重连后将核实你的指令，避免重复执行。
`);

section(`
Allies share sight, discoveries and civic victory. Each player commands their own units and treasury.|队友共享视野、地图发现和积分胜利。每位玩家独立指挥自己的单位并管理资金。
Choose the number of seats, then set a player and team for each.|先选择人数，再为每个席位指定玩家类型和队伍。
`);

section(`
The defender changed. Select the target again to review the new forecast.|防守目标已改变。请重新选择目标，查看最新战斗预测。
`);

section(`
Classic|经典
Grand|宏大
Epic|史诗
Classic campaign|经典地图战役
Resume classic map|继续经典地图
This room server opened a different chart size. Its map size is shown in the lobby.|此房间服务器创建了另一种尺寸的地图，实际尺寸显示在大厅中。
Westwood Hills|韦斯特伍德山丘
UCLA Hill|加大洛杉矶分校宿舍山
UCLA North Campus|加大洛杉矶分校北校区
UCLA South Campus|加大洛杉矶分校南校区
Westwood Village|韦斯特伍德村
Wilshire Corridor|威尔希尔走廊
Civic Center|市政中心
Bunker Hill|邦克山
Little Tokyo|小东京
Fashion District|时尚区
Ocean Avenue|海洋大道
Third Street Promenade|第三街步行街
Ocean Park|海洋公园区
Hollywood Bowl|好莱坞露天剧场
Hollywood Boulevard|好莱坞大道
Vine Street|藤街
Sunset Boulevard|日落大道
Northwest Pasadena|帕萨迪纳西北区
Old Pasadena|帕萨迪纳老城
Playhouse Village|剧院村
South Lake|南湖大道
Beverly Gardens|比佛利花园
Rodeo Drive|罗迪欧大道
City Hall|市政厅
Beverly Drive|比佛利大道
Venice Boardwalk|威尼斯海滩步道
Abbot Kinney Boulevard|阿博特金尼大道
Venice Canals|威尼斯运河
Chinatown|唐人街
Embarcadero|滨海大道
South of Market|市场街南区
Spreckels Lake|斯普雷克尔斯湖
Blue Heron Lake|蓝鹭湖
Music Concourse|音乐广场
Conservatory of Flowers|花卉温室
Jack London Square|杰克伦敦广场
Old Oakland|奥克兰老城
Uptown|上城区
Lake Merritt|梅里特湖
West Berkeley|伯克利西区
Downtown Berkeley|伯克利市中心
UC Berkeley|加州大学伯克利分校
Northside|伯克利北区
Baker Beach|贝克海滩
Fort Point|堡垒角
Crissy Field|克里西原野
Main Post|主军营
Alameda Point|阿拉米达角
Park Street|公园街
South Shore|南岸
San Diego Zoo|圣迭戈动物园
Spanish Village|西班牙村
El Prado|普拉多大道
The Palisades|帕利塞兹园区
Columbia|哥伦比亚区
Cortez Hill|科尔特斯山
Gaslamp Quarter|煤气灯街区
La Jolla Cove|拉霍亚海湾
Village of La Jolla|拉霍亚村
Windansea Beach|温丹西海滩
Ferry Landing|渡轮码头
Central Beach|中央海滩
Presidio Park|普雷西迪奥公园
San Diego Avenue|圣迭戈大道
Heritage Park|传统建筑公园
Bayfront|海湾前沿
Third Avenue|第三大道
Otay Ranch|奥泰牧场
`);

section(`
The combat target has changed. Review the new forecast.|战斗目标已改变，请重新查看战斗预测。
`);

section(`
Waterway chart|水道图
Waterway|水道
River channel|河道
Lake|湖泊
Sea or bay|海洋与海湾
Bridge|桥梁
Crossing|过河通道
Ships travel along connected water. Land units cross between bridgeheads.|舰船可沿连通的水域航行。陆地单位可从一侧桥头前往另一侧。
Explore inland water to chart its name and crossings.|探索内陆水域后，便可在这里查看水名与通道。
Locate on map|地图定位
Ships spend one movement per water hex.|舰船每航行一格水域消耗一点移动力。
Ballona Creek crossing|巴洛纳溪桥
Dominguez Channel crossing|多明格斯水道桥
Alameda Creek crossing|阿拉米达溪桥
Guadalupe River crossing|瓜达卢佩河桥
San Diego River crossing|圣迭戈河桥
Otay River crossing|奥泰河桥
Ballona Creek|巴洛纳溪
Ballona Basin Lake|巴洛纳盆地湖
Dominguez Channel|多明格斯水道
South Bay Lagoon|南湾潟湖
Alameda Creek|阿拉米达溪
Alameda Basin Lake|阿拉米达盆地湖
Guadalupe River|瓜达卢佩河
San Diego River|圣迭戈河
Mission Valley Lake|米申谷湖
Otay River|奥泰河
Otay Lake|奥泰湖
`);
