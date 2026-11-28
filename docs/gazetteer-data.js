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
