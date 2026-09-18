const palettes = {
  violet: [[.43,.73,1],[.68,.39,1],[1,.64,.84]],
  aqua: [[.18,.77,1],[.29,1,.77],[.86,1,.87]],
  amber: [[1,.35,.23],[1,.69,.25],[1,.94,.72]],
};
const TAU = Math.PI * 2;
export class ParticleScene {
  constructor(canvas) {
    this.canvas=canvas;
    this.gl=canvas.getContext('webgl',{alpha:true,antialias:false,powerPreference:'high-performance'});
    if(!this.gl) throw new Error('当前浏览器未启用 WebGL，请在 Chrome 中开启硬件加速后重试。');
    const gl=this.gl;
    const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
    this.program=gl.createProgram();
    gl.attachShader(this.program,shader(gl.VERTEX_SHADER,`attribute vec2 a_position;attribute float a_size;attribute vec4 a_color;varying vec4 v_color;void main(){gl_Position=vec4(a_position,0.,1.);gl_PointSize=a_size;v_color=a_color;}`));
    gl.attachShader(this.program,shader(gl.FRAGMENT_SHADER,`precision mediump float;varying vec4 v_color;void main(){float d=length(gl_PointCoord-vec2(.5))*2.;if(d>1.)discard;float glow=exp(-4.8*d*d);float core=exp(-32.*d*d);gl_FragColor=vec4(v_color.rgb, v_color.a*(glow*.65+core*.8));}`));
    gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error('粒子渲染器初始化失败');
    gl.useProgram(this.program);this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    for(const [name,size,offset] of [['a_position',2,0],['a_size',1,2],['a_color',4,3]]){const loc=gl.getAttribLocation(this.program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,28,offset*4);}
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.clearColor(0,0,0,0);
    this.count=6000;this.shape='galaxy';this.palette='violet';this.time=0;this.expansion=.85;this.center=[.64,.49];this.yaw=0;this.roll=0;this.max=12000;this.stars=180;
    this.data=new Float32Array((this.max+this.stars)*7);this.current=new Float32Array(this.max*3);this.target=new Float32Array(this.max*3);this.random=new Float32Array(this.max*4);this.colors=new Float32Array(this.max*3);
    for(let i=0;i<this.random.length;i++)this.random[i]=Math.random();
    this.starData=Array.from({length:this.stars},()=>[Math.random()*2-1,Math.random()*2-1,Math.random()]);
    this.setShape('galaxy');this.current.set(this.target);this.setPalette('violet');this.resize();
  }
  resize(){this.width=innerWidth;this.height=innerHeight;this.dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(this.width*this.dpr);this.canvas.height=Math.round(this.height*this.dpr);this.gl.viewport(0,0,this.canvas.width,this.canvas.height);}
  setPalette(key){this.palette=key;const p=palettes[key];for(let i=0;i<this.max;i++){const r=this.random[i*4],s=r*2,j=Math.min(1,Math.floor(s)),t=s-j;for(let c=0;c<3;c++)this.colors[i*3+c]=p[j][c]*(1-t)+p[j+1][c]*t;}}
  setShape(key){this.shape=key;for(let i=0;i<this.max;i++){const k=i*4,a=this.random[k],b=this.random[k+1],c=this.random[k+2],d=this.random[k+3];let x,y,z;
    if(key==='galaxy'){const radius=Math.pow(a,.68)*1.25;const angle=(i%4)*TAU/4+radius*4.6+(b-.5)*(.45+radius*.6);x=Math.cos(angle)*radius;y=(c-.5)*.16*(1.3-radius);z=Math.sin(angle)*radius;if(d<.17){x=(a-.5)*.8;y=(b-.5)*.5;z=(c-.5)*.8;}}
    else if(key==='sphere'){const angle=a*TAU,v=2*b-1,r=.85*(.75+.25*c),s=Math.sqrt(1-v*v);x=r*s*Math.cos(angle);y=r*v;z=r*s*Math.sin(angle);}
    else{const angle=a*TAU,r=.95+(b-.5)*.25;x=Math.cos(angle)*r;z=Math.sin(angle)*r;y=(c-.5)*.14;if(d<.23){const r2=.33*Math.cbrt(b);x=r2*Math.cos(angle)*Math.sqrt(1-(2*c-1)**2);z=r2*Math.sin(angle)*Math.sqrt(1-(2*c-1)**2);y=r2*(2*c-1);}}
    this.target.set([x,y,z],i*3);
  }}
  draw(dt,control){const gl=this.gl;this.time+=dt;const s=1-Math.exp(-dt*5);this.expansion+=(control.expansion-this.expansion)*s;this.yaw+=(control.yaw-this.yaw)*s;this.roll+=(control.roll-this.roll)*s;
    const mobile=this.width<700,baseX=mobile?.5:.64,baseY=mobile?.59:.47;
    const targetX=baseX+(control.x-.5)*(mobile?.25:.28),targetY=baseY+(control.y-.5)*.24;
    this.center[0]+=(targetX-this.center[0])*s;this.center[1]+=(targetY-this.center[1])*s;
    const radius=Math.min(this.width*(mobile?.43:.30),this.height*(mobile?.23:.33));
    const cy=Math.cos(this.time*.12+this.yaw),sy=Math.sin(this.time*.12+this.yaw),tilt=.47+this.roll*.45,cx=Math.cos(tilt),sx=Math.sin(tilt),spin=this.roll*.28,cr=Math.cos(spin),sr=Math.sin(spin);
    const morph=1-Math.exp(-dt*2.5),data=this.data;
    for(let i=0;i<this.count;i++){const j=i*3,k=i*7;this.current[j]+=(this.target[j]-this.current[j])*morph;this.current[j+1]+=(this.target[j+1]-this.current[j+1])*morph;this.current[j+2]+=(this.target[j+2]-this.current[j+2])*morph;
      let x=this.current[j],y=this.current[j+1],z=this.current[j+2];const drift=Math.sin(this.time*.6+this.random[i*4+3]*TAU)*.017;const rx=x*cy+z*sy,rz=-x*sy+z*cy;const ry=y*cx-rz*sx,depth=y*sx+rz*cx;const lens=Math.min(1.8,Math.max(.55,3.8/(3.8+depth)));x=(rx*cr-ry*sr)*this.expansion;y=(rx*sr+ry*cr+drift)*this.expansion;
      data[k]=((this.center[0]*this.width+x*radius*lens)/this.width)*2-1;data[k+1]=1-((this.center[1]*this.height+y*radius*lens)/this.height)*2;
      data[k+2]=(2.4+this.random[i*4+2]*4.2)*this.dpr*lens;
      data[k+3]=this.colors[j];data[k+4]=this.colors[j+1];data[k+5]=this.colors[j+2];data[k+6]=(.38+this.random[i*4+1]*.38)*(1+.12*Math.sin(this.time+this.random[i*4]*30));
    }
    for(let i=0;i<this.stars;i++){const k=(this.count+i)*7,star=this.starData[i];data.set([star[0],star[1],(1.3+star[2]*1.8)*this.dpr,.55,.64,.88,.16+star[2]*.2],k);}
    gl.clear(gl.COLOR_BUFFER_BIT);gl.bufferData(gl.ARRAY_BUFFER,data.subarray(0,(this.count+this.stars)*7),gl.DYNAMIC_DRAW);gl.drawArrays(gl.POINTS,0,this.count+this.stars);
  }
}
