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
  if(type==='signals'){
    // Portable radio with a mast above the operator’s shoulder.
    b.line([[-5,-17],[-7,-38],[-6.3,-42]],'#445452',1.1);
    b.line([[-8.1,-35.5],[-4.6,-36.2]],'#dcbd86',.7);
    b.polygon([[-7.9,-24],[-3.8,-24.6],[-2.3,-12],[-5.7,-10.4],[-8.2,-12.6]],'#4c5b51','#2a3a37',.75);
    b.line([[-7,-21.8],[-4.7,-22.2]],'#ceb88c',1);
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
  }else if(type==='signals'){
    b.polygon([[-3.7,y-8],[-4,y-9.6],[-1,y-11.7],[2,y-11.5],[4.2,y-8.4],[1.9,y-8.1]],'#627965','#35443a',.7);
    b.oval(-2.6,y-7.1,1.1,1.35,'#363f39','#d9cfa7',.45);
    b.curve([-2.8,y-6],[-5.4,y-4],[-5.6,y+1],[-7.2,y-2],'#2f3633',.6);
    b.line([[2.3,y-2],[4.9,y],[4,y-5.7]],p.lit,2);
    b.line([[4,y-6],[4.9,y-4]],'#373e37',1.1);
    b.polygon([[0,y-4],[1.4,y-3.2],[-2.5,y+6],[-4,y+6]],'#b3a480',null);
  }else if(type==='sappers'){
    b.oval(-1,y-9,3.3,2.8,'#938571','#383634',.62);
    b.line([[-4.8,y-7.7],[4.9,y-8.4]],'#c5b28b',1.4);
    b.line([[-6.9,y+5.7],[10.6,y-7.1]],'#75583d',1.5);
    b.polygon([[8.8,y-7.5],[12,y-9.5],[14,y-6.6],[13.2,y-4.6],[10.5,y-5]],'#a2aa9e','#3c4744',.65);
    b.line([[2.5,y-2],[4.6,y+.6],[5.5,y-3.2]],p.lit,2.1);
    b.polygon([[-7.4,y+1],[-3.8,y+.6],[-1.7,y+5],[-3.1,y+8.3],[-6.5,y+8.7],[-8.4,y+4.3]],'#99724f','#4d493c',.65);
    b.line([[-7.6,y+2.4],[-5.4,y+7.6]],'#d8bb7c',1.5);
  }else{
    b.polygon([[-3.8,y-7.8],[-3.1,y-10],[0,y-11.8],[3.4,y-10],[4,y-8],[1,y-8.6]],'#939b96','#34383a',.65);
    b.polygon([[-5.5,y-2],[-1.8,y-3],[1.1,y-.8],[0,y+6],[-2.8,y+8.3],[-5.5,y+5]],p.deep,'#d9b578',.85);
    b.line([[-2.6,y-1],[-2.8,y+5.9]],p.lit,.9);
    b.line([[2,y-2],[4.1,y+.5],[5.4,y-2]],p.lit,2);
  }
  g.restore();
}
