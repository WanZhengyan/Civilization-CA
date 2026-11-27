// Local coordinates are anchored at the unit’s feet, like the other miniatures.
export function drawRegiment(g,b,type,p,phase,strike) {
  const wave=Math.sin(phase), step=wave*2.4, lift=Math.abs(wave)*.65;
  g.save();
  g.translate(strike*.9,-lift);
  if(type==='pikes'){
    // Two pennoned pikes give the guard a recognizable profile at map scale.
    for(const [x,y] of [[-6,-1],[1,0]]) {
      b.line([[x-2,1],[x+8,-35]],'#a08053',1.45);
      b.polygon([[x+6.4,-34],[x+9.8,-40],[x+9.1,-32.5]],'#dbe1d4','#35434a',.55);
      b.polygon([[x+6.8,-31.9],[x+.3,-31.6+y],[x+2.8,-29],[x+5.8,-28.6]],p.lit,'#4c493f',.4);
    }
  }
  const y=-17, hood=type==='skirmisher';
  b.line([[-2,y+8],[-3-step,-4],[-4-step,0]],'#4b4c4a',3.2);
  b.line([[1,y+8],[2+step,-5],[3+step,-.3]],'#57493a',3.5);
  b.polygon([[-4,y-3],[-1,y-5],[3,y-4],[5,y+9],[-5,y+8]],p.base,'#35323a',.8);
  b.polygon([[-4,y-2],[-1,y-4],[.1,y-1],[-3,y+7],[-6,y+7]],p.shade,'#39393b',.4);
  b.oval(0,y-7.1,2.9,3.5,'#d8ad82','#493a34',.6);
  if(hood){
    b.polygon([[-4,y-6],[-2.8,y-10],[.7,y-11],[2.8,y-9.8],[4.2,y-8.1],[.2,y-8.6],[-2,y-4.3]],'#638175','#363f3e',.65);
    b.curve([6,y-2],[11,y-3],[11,y-9],[7.5,y-12],'#af8966',1.05);
    b.line([[7.5,y-12],[7,y-2]],'#d9c49b',.65);
    b.line([[-1,y-1.6],[3,y+.5],[7,y-2]],p.lit,2.1);
    b.line([[-5,y+3],[-9,y-6]],'#885e44',2.3);
    b.polygon([[-8,y-5],[-11,y-9],[-8.2,y-8.5]],'#b6ab82','#463b33',.3);
  }else{
    b.polygon([[-3.8,y-7.8],[-3.1,y-10],[0,y-11.8],[3.4,y-10],[4,y-8],[1,y-8.6]],'#939b96','#34383a',.65);
    b.polygon([[-5.5,y-2],[-1.8,y-3],[1.1,y-.8],[0,y+6],[-2.8,y+8.3],[-5.5,y+5]],p.deep,'#d9b578',.85);
    b.line([[-2.6,y-1],[-2.8,y+5.9]],p.lit,.9);
    b.line([[2,y-2],[4.1,y+.5],[5.4,y-2]],p.lit,2);
  }
  g.restore();
}
