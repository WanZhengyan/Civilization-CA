export const fishingGuide=['Fish and deliver a catch','Train a Fishing crew at a harbor. Build a fishery within two connected water steps at sea, or three on a charted river or lake. A working fishery supplies 2 food and 1 gold per turn. To carry fish, load a catch on a surveyed fish shoal or at your own fishery. Return to the berth of any harbor you own and land the catch for 3 food and 1 stored fish. Loading and landing each spend the remaining movement.'];
export const inlandGuide=['Sail inland','Build a harbor on visible sea, river or lake water beside your city or a connected shore district. Ships can follow contiguous water under a marked crossing, one movement point per hex. A lake cut off by land needs its own harbor. Ports launch fishing crews and armed cutters without a technology prerequisite.'];
export const freightGuide=['Carry coastal freight','A fishing crew at your harbor can load 4 city food once it has charted a water route to a second friendly harbor. Sail to another owned or allied berth to deliver the food and earn 2 gold plus the distance between berths, up to 8 gold. Loading and unloading spend the remaining movement. Returning the crate to its origin refunds the food.'];
export const maritimeCopy=`
${freightGuide[0]}|沿岸运送粮食
${freightGuide[1]}|渔船队在自己的港口装载 4 粮食，需要先探明通往另一友方港口的水路。驶入己方或盟友的另一泊位，可以卸下粮食并赚取 2 金币加两泊位间直线格数的运费，最多 8 金币。装卸会耗尽剩余移动力，原港退货只退还粮食。
Coastal freight|沿海货运
Crate aboard|已装货
Empty hold|空舱
Loaded at|装货港
Departure harbor|始发港
Chart a water route to a second friendly harbor.|先探明通往另一友方港口的水路。
The departure city needs 4 stored food.|始发城市需要储存 4 粮食。
Unload at another friendly berth for food and gold, or return the crate to its origin.|在另一友方泊位卸粮并赚取运费，或返回始发港退货。
Take 4 food from this city and carry it to another friendly berth.|从本城装载 4 粮食并运往另一友方泊位。
Load coastal freight|装载沿海货物
Deliver coastal freight|卸下沿海货物
Return cargo to origin|向始发港退货
Review the cargo and charted friendly harbors before giving this order.|请先核对货物及已探明的友方港口，再下达命令。
Loaded 4 food for coastal freight.|已为沿海货运装载 4 粮食。
Coastal freight delivered.|沿海货物已送达。
Cargo returned to its departure city.|货物已退回始发城市。
${fishingGuide[0]}|捕捞并运回渔获
${fishingGuide[1]}|在港口训练渔船队。海上渔场须沿水路距港口不超过两格，已探明的河流或湖泊则为三格。运营中的渔场每回合提供 2 粮食和 1 金币。可在已勘探的鱼群或己方渔场装载渔获。返回任一己方港口的泊位后卸货，为港口城市增加 3 粮食，并向库存存入 1 份鱼。装货与卸货都会消耗本回合剩余移动力。
${inlandGuide[0]}|驶入内陆
${inlandGuide[1]}|可在紧邻城市或相连岸区的可见海洋、河流或湖泊修建港口。船只可沿连通水道从标记的桥下穿过，每格消耗 1 移动力。被陆地隔开的湖泊需要独立港口。港口无需前置科技即可训练渔船队和巡逻舰。
Load a catch|装载渔获
Land the catch|渔获卸港
Catch aboard|船上渔获
1 stored fish and 3 city food|1 份库存鱼和 3 城市粮食
Return to an owned harbor berth to land this catch.|返回己方港口泊位卸下渔获。
Load a catch at a fish shoal or fishery, or build a fishery on suitable water.|可在鱼群或己方渔场装载渔获，也可在合适水域建设渔场。
Marked berth|已占用泊位
A harbor occupies or has reserved this water tile.|有一处港口已占用或预留此水域。
Fishing crew loaded a catch.|渔船队已装载渔获。
The harbor received 3 food and 1 stored fish.|港口城市获得 3 粮食，库存增加 1 份鱼。
Work a fish shoal or fishery, then land the catch at your own harbor.|先在鱼群或己方渔场装货，再驶入己方港口卸货。
Build a fishery within two connected sea steps or three charted inland water steps of your harbor.|渔场须在距己方港口两格海路或三格已探明内陆水路之内。
`;
