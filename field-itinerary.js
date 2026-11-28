import {hexDistance} from './rules.js';

const prefix='civitas.field-itinerary.v1.';
function chart(view){
  return new Set(view?.state?.intel && view.state.intel.seat===view.seat?view.state.intel.explored:[]);
}
function permitted(ids,known){
  return Array.isArray(ids)?[...new Set(ids.filter(id=>typeof id==='string' && known.has(id)))]:[];
}

// Store only ordered coordinates. Reconstruct every visible name and civic detail from today's seat projection.
export function createFieldItinerary(getView,storage){
  const memory=new Map();
  let key='',ids=[];
  function sync(scope){
    const view=getView(),next=scope && view?.state?.intel?.seat===view.seat?prefix+JSON.stringify([scope,view.seat]):'';
    if(next!==key){
      key=next;ids=memory.get(key)||[];
      if(key && !memory.has(key)){
        try{ids=JSON.parse(storage?.getItem(key)||'[]');}catch{ids=[];}
      }
    }
    ids=permitted(ids,chart(view));
  }
  function edit(action,id){
    const known=chart(getView());
    if(!key || !known.has(id))return false;
    const order=permitted(ids,known),at=order.indexOf(id);
    if(action==='add' && at===-1)order.push(id);
    else if(action==='remove' && at>=0)order.splice(at,1);
    else if(action==='up' && at>0)[order[at-1],order[at]]=[order[at],order[at-1]];
    else if(action==='down' && at>=0 && at<order.length-1)[order[at],order[at+1]]=[order[at+1],order[at]];
    else return false;
    ids=order;memory.set(key,[...ids]);
    try{storage?.setItem(key,JSON.stringify(ids));}catch{/* Edits remain available in this tab. */}
    return true;
  }
  return {sync,edit,stops:()=>permitted(ids,chart(getView()))};
}

export function itineraryLegs(stops,places){
  const byId=new Map(places.map(row=>[row.id,row]));
  const order=permitted(stops,new Set(byId.keys()));
  let total=0;
  return order.map((id,i)=>{
    const previous=i?order[i-1]:null,leg=previous?hexDistance(previous,id):0;
    total+=leg;
    return {...byId.get(id),previous,number:i+1,leg,total};
  });
}
