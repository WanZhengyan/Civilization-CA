// The English UI copy is the catalog key. The rules and network protocol keep
// their canonical IDs in both languages.
export const catalog = new Map();
function section(pairs) {
  for (const line of pairs.trim().split('\n')) {
    const [key, value] = line.split('|');
    if (!key || value === undefined) throw new Error('Invalid translation: ' + line);
    catalog.set(key.toLowerCase(), value);
  }
}
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
A new city has room for three citizens. A granary adds two places and a residential quarter adds three. A full city keeps one growth reserve and can grow after more housing opens. Choose a housing investment in the citizen panel.|新城可容纳三名居民。粮仓增加两处住房，住宅区增加三处。住房满额时，城市可以储备下一次人口增长所需的粮食；扩建住房后即可继续增长。可在「管理居民」中启动住房项目。
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
A Scout is available as soon as you found a city. It has three movement points to a Militia unit’s two. Forests and hills still cost two points to enter.|建城后即可训练侦察兵。侦察兵每回合有三点移动力，民兵有两点。进入林地或丘陵需要两点。
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
Place names|地名
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
In progress|进行中
All research complete|所有科技已完成
Discovered|已发现
Discover now|立即研究
Attacker|进攻方
Defender|防守方
No retaliation|无反击伤害
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
Send out your settler|派出开拓者
Select the Settler on the map or in your roster. Point at a highlighted hex to preview the route. Click a reachable hex to move. You can also tap a highlighted destination on a touch screen.|在地图或名册中选择开拓者。指向高亮地块可预览路线，点击即可移动；触屏上直接轻点目的地。
Found a city|建立城市
A settler with movement left can found a city on friendly or neutral land at least three hexes from any city. Choose Found city. The settler becomes the city and nearby open land joins your faction.|开拓者仍有移动力时，可在己方或中立陆地上建城。新城与所有城市至少相距三格。选择「建造城市」后，开拓者会建立新城，附近空地随之并入领土。
Give your capital a project|安排首府生产
Open Cities in the Empire roster, select your capital and choose production. Your cities add food and production when you end your turn.|在名册中打开「城市」，选择首府并指定生产项目。结束回合时，城市会积累粮食与生产力。
Open the Research council and select a project. Your cities generate science each turn. Completed research gives the whole faction a lasting benefit.|打开科技议会并选择项目。城市每回合产出科研点；完成研究后，全阵营都会获得长期收益。
Plan your turn|规划回合
Each faction also gets two district actions to claim land, develop a district or contest a neighbor. Units use their own movement points. End turn collects income and passes play to the next faction.|每个阵营每回合有两次地区行动，可用于拓展、开发或争夺领土。单位独立消耗移动力。结束回合后结算收入，轮到下一个阵营行动。
City growth|城市发展
Food and production|粮食与生产
Food grows your population. Production completes the unit or building in a city’s queue. More residents contribute capital and can raise production.|粮食推动人口增长，生产力用于完成队列中的单位或建筑。更多居民能增加收入，也能提高生产力。
Improve nearby land|改良周边土地
Builders have three charges. Build a farm on a friendly coast, lowland or urban hex, or a mine in woodland or foothills. Within two hexes of a friendly city, farms add food and mines add production to the nearest city.|建设者可施工三次。在己方海岸、低地或城区修建农场，在林地或丘陵修建矿场。距己方城市两格以内的设施会惠及最近的城市：农场增加粮食，矿场增加生产力。
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
Fishery|海上渔场
Build fishery|建设渔场
Earns 2 capital per turn. A city may use its own shore or a connected coastal district within two hexes.|港口每回合提供 2 资金。可设于本城海岸，或与城市相连且不超过两格的己方海岸。
Adds 2 production per turn to this harbor city and equips it for larger vessels.|该港口城市每回合生产力增加 2，并能建造大型舰船。
Builds two offshore fisheries within two water hexes of a friendly port.|可在距己方港口两格水路内建设两座海上渔场。
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
Open Technology and Civics beside the map. Choose a project in each council. Your faction earns science and culture separately every turn.|打开地图旁的「科技」和「市政」，分别选定一项议程。你的阵营在每回合分别积累科研点和文化。
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
A harbor trains Revenue cutters. Add a Shipyard and research Steam Power to build Steam frigates. Ships bombard the shore; bring a land unit to occupy a city.|港口可建造海岸巡逻舰。增建船厂并研究蒸汽动力后，即可建造蒸汽护卫舰。舰船能炮击海岸，占领城市仍需地面部队。
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
hexes|格
`);

section(`
Activity spotted in view.|在视野内发现动静。
Uncharted territory. Move closer to explore.|尚未探索。派单位靠近以揭开迷雾。
Uncharted territory|未知区域
Outside current sight|目前没有视野
Only the city owner can inspect its economy.|只有城市所属文明可以查看其经济情况。
Explore the fog|探索迷雾
Dark tiles are uncharted. Move a Scout to see three hexes in every direction. The shaded terrain behind it stays on your map, but enemy positions disappear when your units lose sight.|深色地块尚未探索。侦察兵可以看见周围三格。走过的地形会留在地图上，离开视野的敌军位置将被隐藏。
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
`);
