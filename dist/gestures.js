export const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,(a.z-b.z)*.4);

export function measureHands(hands){
  if(!hands?.length)return null;
  const h=hands[0];
  const palm=Math.max(.035,distance(h[0],h[9]));
  const pinch=distance(h[4],h[8])/palm;
  const rawOpenness=[8,12,16,20].reduce((sum,i)=>sum+distance(h[i],h[0])/palm,0)/4;
  const openness=clamp((rawOpenness-1.02)/.82,0,1);
  let x=1-(h[0].x+h[5].x+h[9].x+h[17].x)/4,y=(h[0].y+h[5].y+h[9].y+h[17].y)/4;
  let span=null;
  if(hands.length>1){const other=hands[1];const otherX=1-other[9].x;x=(x+otherX)/2;y=(y+other[9].y)/2;span=Math.abs((1-h[9].x)-otherX);}
  const roll=clamp(Math.atan2(h[9].x-h[0].x,h[0].y-h[9].y),-1.4,1.4);
  return{x,y,roll,yaw:(x-.5)*2.6,openness,isFist:openness<.16,isPinch:pinch<.32,span,hands:hands.length};
}

export class GestureAccumulator{
  constructor(expansion=.88){
    this.expansion=expansion;this.mode='none';this.lastOpenness=null;this.fastDirection=0;this.prepareUntil=0;
    this.doubleBase=expansion;this.doubleSpan=0;this.lastTime=0;
    this.pose={x:.5,y:.5,roll:0,yaw:0};
  }
  setExpansion(value){this.expansion=clamp(value,.25,9);this.doubleBase=this.expansion;this.lastOpenness=null;}
  update(hands,now=performance.now()){
    const measured=measureHands(hands),dt=this.lastTime?clamp((now-this.lastTime)/1000,.016,.35):0;this.lastTime=now;
    if(!measured){this.mode='none';this.lastOpenness=null;return{...this.pose,expansion:this.expansion,label:'等待手掌 · 保持大小',tracked:false};}
    this.pose={x:measured.x,y:measured.y,roll:measured.roll,yaw:measured.yaw};
    if(measured.hands>1){
      if(this.mode!=='double'){this.doubleBase=this.expansion;this.doubleSpan=measured.span;}
      this.mode='double';this.lastOpenness=null;
      this.expansion=clamp(this.doubleBase*Math.exp((measured.span-this.doubleSpan)*3.2),.25,9);
      return{...this.pose,expansion:this.expansion,label:'双手 · 相对拉伸',tracked:true};
    }
    if(this.mode!=='single'||this.lastOpenness===null){
      this.mode='single';this.lastOpenness=measured.openness;this.fastDirection=0;
      return{...this.pose,expansion:this.expansion,label:'手势就绪 · 慢动缩放',tracked:true};
    }
    const delta=measured.openness-this.lastOpenness;
    const direction=Math.sign(delta);
    const speed=dt?Math.abs(delta)/dt:0;
    this.lastOpenness=measured.openness;
    if(Math.abs(delta)>.075&&speed>1.55){
      this.fastDirection=direction;this.prepareUntil=now+180;
      return{...this.pose,expansion:this.expansion,label:direction>0?'快速张手 · 准备缩小':'快速收手 · 准备放大',tracked:true};
    }
    if(now<this.prepareUntil&&direction===this.fastDirection){
      return{...this.pose,expansion:this.expansion,label:'快速动作 · 保持当前大小',tracked:true};
    }
    if(Math.abs(delta)<.004||speed<.04){
      return{...this.pose,expansion:this.expansion,label:'保持手势 · 大小不变',tracked:true};
    }
    const slowDelta=clamp(delta,-.065,.065);
    this.expansion=clamp(this.expansion*Math.exp(slowDelta*1.2),.25,9);
    return{...this.pose,expansion:this.expansion,label:delta>0?'缓慢张手 · 放大':'缓慢收手 · 缩小',tracked:true};
  }
}

// 保留旧接口，供已有的轻量测试和外部引用使用。
export function interpretHands(hands){
  const measured=measureHands(hands);if(!measured)return null;
  return{...measured,expansion:measured.isPinch?.27:clamp(.6+measured.openness,.45,1.6),label:measured.hands>1?'双手 · 拉伸':measured.isFist?'握拳 · 保持':measured.isPinch?'捏合 · 聚拢':'张手 · 扩散'};
}
