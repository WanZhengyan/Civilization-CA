// Source values are for Census Bureau geographies. The game board is schematic.
export const regions = {la:['Los Angeles','洛杉矶'],sf:['San Francisco Bay','旧金山湾'],sd:['San Diego','圣迭戈']};
export const counties = [
  {id:'la-county',region:'la',name:['Los Angeles County','洛杉矶县'],pop:10014009,slug:'losangelescountycalifornia',scope:['County of Los Angeles','洛杉矶县全境']},
  {id:'sf-county',region:'sf',name:['San Francisco County','旧金山县'],pop:873965,slug:'sanfranciscocountycalifornia',scope:['City and County of San Francisco. Oakland and the East Bay are outside its boundary.','旧金山市县范围。奥克兰与东湾位于县界外。']},
  {id:'sd-county',region:'sd',name:['San Diego County','圣迭戈县'],pop:3298634,slug:'sandiegocountycalifornia',scope:['County of San Diego, including its inland communities','圣迭戈县全境，包括内陆社区']}
];
export const sourceOf = place => 'https://www.census.gov/quickfacts/'+place.slug;

export const cities=[
  ['los-angeles','la','Los Angeles','洛杉矶',3898747,'Downtown LA'],
  ['pasadena','la','Pasadena','帕萨迪纳',138699,'Pasadena'],
  ['santa-monica','la','Santa Monica','圣莫尼卡',93076,'Santa Monica'],
  ['san-francisco','sf','San Francisco','旧金山',873965,'San Francisco'],
  ['oakland','sf','Oakland','奥克兰',440646,'Oakland'],
  ['berkeley','sf','Berkeley','伯克利',124321,'Berkeley'],
  ['san-diego','sd','San Diego','圣迭戈',1386932,'Downtown San Diego'],
  ['coronado','sd','Coronado','科罗纳多',20192,'Coronado'],
  ['chula-vista','sd','Chula Vista','丘拉维斯塔',275487,'Chula Vista']
].map(([id,region,en,zh,pop,anchor])=>({
  id,region,name:[en,zh],pop,anchor,slug:id.replaceAll('-','')+'citycalifornia',
  scope:['Incorporated city boundary','建制市行政范围']
}));
export const places=[...counties,...cities];

// April 1 counts from the 2010 decennial census, keyed to the same named geographies.
export const census2010={
  'la-county':9818605,'sf-county':805235,'sd-county':3095313,'los-angeles':3792621,pasadena:137122,
  'santa-monica':89736,'san-francisco':805235,oakland:390724,berkeley:112580,'san-diego':1307402,
  coronado:18912,'chula-vista':243916
};

// Square miles of land in the 2020 Census QuickFacts geography table.
export const landArea={
  'la-county':4059.28,'sf-county':46.91,'sd-county':4210.23,'los-angeles':469.49,pasadena:22.96,
  'santa-monica':8.41,'san-francisco':46.91,oakland:55.93,berkeley:10.43,'san-diego':325.88,
  coronado:7.81,'chula-vista':49.64
};

export const landmarks=[
  {id:'topanga',region:'la',anchor:'Topanga Canyon',name:['Topanga State Park','托潘加州立公园'],
    measure:['36 miles of trails','36 英里步道'],context:['California State Parks reports the trail network for the whole park. A single campaign district represents the canyon area.','加州州立公园公布的是全园步道总长。战役地块代表峡谷一带。'],
    date:['Park facilities inventory · undated','公园设施资料 · 未标注年份'],publisher:['California State Parks','加州州立公园'],url:'https://parks.ca.gov/AccessibleFeatures/Details/629'},
  {id:'fort-point',region:'sf',anchor:'Presidio',name:['Fort Point','堡垒角要塞'],measure:['1853–1861','1853–1861 年'],
    context:['The fort was built at the entrance to San Francisco Bay. The campaign anchor is the surrounding Presidio district.','要塞建在旧金山湾的入口。战役中的对应地区是普雷西迪奥。'],
    date:['Construction period','建造时期'],publisher:['National Park Service','美国国家公园管理局'],url:'https://www.nps.gov/places/fort-point.htm'},
  {id:'lighthouse',region:'sd',anchor:'Cabrillo Point',name:['Old Point Loma Lighthouse','洛马角旧灯塔'],measure:['1855–1891','1855–1891 年'],
    context:['The original light guided ships approaching San Diego. Its campaign anchor is the Cabrillo headland.','这座旧灯塔曾为驶近圣迭戈的船只导航。在战役中对应卡布里约岬角。'],
    date:['Original light in service','原灯塔服役时期'],publisher:['National Park Service','美国国家公园管理局'],url:'https://www.nps.gov/articles/cabrillo.htm'}
];

export const coastalWorks=[
  {id:'municipal-pier',region:'la',anchor:'Santa Monica',name:['Santa Monica Municipal Pier','圣莫尼卡市政码头'],year:1909,
    context:['The city records construction in 1908–1909. The adjacent pleasure pier followed in 1916.','市政府记录的建造期为 1908–1909 年。毗邻的游乐码头于 1916 年建成。'],
    publisher:['City of Santa Monica · environmental impact report','圣莫尼卡市政府 · 环境影响报告'],url:'https://www.santamonica.gov/media/Housing-Element-Update-2021-to-2029/Housing%20Element%20EIR%20FINAL%20%28Reduced%29.pdf'},
  {id:'golden-gate',region:'sf',anchor:'Golden Gate Bridge',name:['Golden Gate Bridge','金门大桥'],year:1937,
    context:['Pedestrians crossed on May 27. Vehicle traffic began on May 28.','5 月 27 日先向行人开放，5 月 28 日开始通车。'],
    publisher:['Golden Gate Bridge, Highway and Transportation District','金门大桥公路与交通管理区'],url:'https://www.goldengate.org/bridge/history-research/statistics-data/faqs/'},
  {id:'coronado-bridge',region:'sd',anchor:'Coronado',name:['San Diego–Coronado Bridge','圣迭戈–科罗纳多大桥'],year:1969,
    context:['The 2.12-mile bridge opened on August 3. The corresponding campaign district is the Coronado end of the crossing.','这座 2.12 英里的桥梁于 8 月 3 日通车。在战役中对应科罗纳多一侧。'],
    publisher:['City of San Diego · Digital Archives','圣迭戈市政府 · 数字档案'],url:'https://www.sandiego.gov/digitalarchives/new-discoveries/bridging-the-Gap'}
];

// Columns follow the county array; reporting periods and units are part of each measure.
export const regionalEconomy={
  income:{label:['Median household income · 2020–2024 (2024 USD)','家庭收入中位数 · 2020–2024（2024 年美元）'],values:{'la-county':90112,'sf-county':140970,'sd-county':106268}},
  commute:{label:['Mean commute · workers aged 16+ · 2020–2024 (minutes)','平均通勤时间 · 16 岁及以上就业者 · 2020–2024（分钟）'],values:{'la-county':30.4,'sf-county':30.4,'sd-county':25.5}},
  jobs:{label:['Total employment · 2023 (jobs)','就业岗位总数 · 2023（个）'],values:{'la-county':3987736,'sf-county':740362,'sd-county':1391721}},
  retail:{label:['Retail sales per capita · 2022 (USD)','人均零售额 · 2022（美元）'],values:{'la-county':22010,'sf-county':36554,'sd-county':18777}}
};
