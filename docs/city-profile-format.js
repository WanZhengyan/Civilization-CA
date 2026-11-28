import {getLanguage,translate} from './i18n.js';

export const local=(english,chinese)=>getLanguage()==='zh-CN'?chinese:english;
export const safe=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const label=value=>translate(value);
export const signed=value=>value>0?'+'+value:String(value);
export const cityLabel=(city,map)=>city.name===map.byId[city.tile]?.name?label(city.name):city.name;

export function section(title,content,note=''){
  return '<section class="city-study"><h3>'+safe(title)+'</h3>'+content+
    (note?'<p class="city-study-note">'+safe(note)+'</p>':'')+'</section>';
}
export function table(columns,rows){
  return '<div class="city-study-scroll" tabindex="0"><table><thead><tr>'+
    columns.map(col=>'<th scope="col">'+safe(col)+'</th>').join('')+'</tr></thead><tbody>'+
    rows.map(row=>'<tr><th scope="row">'+safe(row[0])+'</th>'+row.slice(1).map(cell=>'<td>'+safe(cell)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}
export function action(command,text,value=''){
  return '<button type="button" data-study-command="'+safe(command)+'" data-study-value="'+safe(value)+'">'+safe(text)+'</button>';
}
