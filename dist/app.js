import {ParticleScene} from './particles.js';
import {GestureAccumulator,clamp} from './gestures.js';
const $=id=>document.getElementById(id);
const canvas=$('universe'),video=$('video'),skeleton=$('skeleton'),camera=$('camera'),status=$('status');
const ctx=skeleton.getContext('2d');
let scene;
function message(text,error=false){status.textContent=text;status.classList.toggle('error',error);}
try{scene=new ParticleScene(canvas);}catch(error){message(error.message,true);camera.disabled=true;}
const mouse={x:.5,y:.5,expansion:.88,yaw:0,roll:0};let hand=null,lastHand=0,pressed=false,paused=matchMedia('(prefers-reduced-motion: reduce)').matches;
const gesture=new GestureAccumulator(.88);
let stream=null,worker=null,starting=false,active=false,session=0,busy=false,lastVideo=-1,lastInfer=0,pendingTimer=null,initReject=null;
const edges=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[0,17],[17,18],[18,19],[19,20]];
function drawHands(hands){const w=skeleton.width=640,h=skeleton.height=480;ctx.clearRect(0,0,w,h);for(const pts of hands){ctx.strokeStyle='#b8b0ffbb';ctx.lineWidth=2;for(const [a,b] of edges){ctx.beginPath();ctx.moveTo((1-pts[a].x)*w,pts[a].y*h);ctx.lineTo((1-pts[b].x)*w,pts[b].y*h);ctx.stroke();}for(const p of pts){ctx.fillStyle='#a6ffe1';ctx.beginPath();ctx.arc((1-p.x)*w,p.y*h,3,0,Math.PI*2);ctx.fill();}}}
function resetInput(){mouse.expansion=gesture.expansion;hand=null;lastHand=0;pressed=false;mouse.x=.5;mouse.y=.5;mouse.yaw=0;mouse.roll=0;$('gesture-label').textContent='鼠标试玩';drawHands([]);}
function stopCamera(note='摄像头已关闭，可以继续使用鼠标试玩。'){
  session++;active=false;starting=false;clearTimeout(pendingTimer);pendingTimer=null;
  if(initReject){initReject(new Error('cancelled'));initReject=null;}
  if(worker){worker.terminate();worker=null;}
  if(stream){for(const track of stream.getTracks())track.stop();stream=null;}
  video.srcObject=null;busy=false;lastVideo=-1;resetInput();
  camera.querySelector('span').textContent='开启摄像头';$('camera-dot').classList.remove('active');$('camera-label').textContent='CAMERA OFF';$('video-placeholder').hidden=false;
  if(note)message(note);
}
function failCamera(error){const notes={NotAllowedError:'摄像头权限未获允许。请在地址栏的网站设置中允许摄像头，再试一次。',NotFoundError:'没有找到摄像头。你仍可以用鼠标试玩。',NotReadableError:'摄像头可能被其他软件占用，请关闭占用摄像头的软件再试。',SecurityError:'浏览器阻止了摄像头访问。请使用 Chrome 打开本机 localhost 地址。'};stopCamera('');message(notes[error.name]||error.message||'摄像头启动失败，请重试。',true);}
async function startCamera(){
  if(active||starting){stopCamera();return;}
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){message('请通过本机 http://localhost:8765 打开页面，或使用 HTTPS 地址。',true);return;}
  starting=true;const token=++session;camera.querySelector('span').textContent='取消开启';message('请允许浏览器使用摄像头，随后会加载本地手势模型…');
  // Cancelled or timed-out permission requests must stop late-arriving tracks.
  pendingTimer=setTimeout(()=>{if(token===session)failCamera(new Error('摄像头等待超时。请检查权限后重试。'));},60000);
  try{
    gesture.setExpansion(scene?.expansion||mouse.expansion);
    const obtained=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},facingMode:'user',frameRate:{ideal:30,max:30}},audio:false});
    if(token!==session){obtained.getTracks().forEach(t=>t.stop());return;}
    stream=obtained;video.srcObject=stream;await video.play();if(token!==session)return;
    clearTimeout(pendingTimer);message('摄像头已开启，正在初始化本地手势识别…');$('video-placeholder').hidden=true;
    worker=new Worker('./hand-worker.js');
    await new Promise((resolve,reject)=>{
      initReject=reject;pendingTimer=setTimeout(()=>reject(new Error('模型加载超时。请确认 vendor 文件夹完整，并通过本机启动器打开。')),45000);
      worker.onerror=e=>{if(starting)reject(new Error(e.message||'识别线程启动失败'));else failCamera(new Error('手势识别中断，请重新开启摄像头。'));};
      worker.onmessage=({data})=>{
        if(token!==session)return;
        if(data.type==='ready'){clearTimeout(pendingTimer);initReject=null;resolve();}
        else if(data.type==='error'){const err=new Error('手势识别失败：'+data.message);if(starting)reject(err);else failCamera(err);}
        else if(data.type==='result'){busy=false;hand=gesture.update(data.landmarks,performance.now());drawHands(data.landmarks);if(data.landmarks.length){lastHand=performance.now();$('gesture-label').textContent=hand.label;message('慢慢张手放大，慢慢收手缩小；快速动作只用于重新准备。');}else{$('gesture-label').textContent=hand.label;message('暂时未识别到手，星云会保持当前大小。');}}
      };
      worker.postMessage({type:'init'});
    });
    if(token!==session)return;
    starting=false;active=true;camera.querySelector('span').textContent='关闭摄像头';$('camera-dot').classList.add('active');$('camera-label').textContent='CAMERA LIVE';message('慢慢张手放大，慢慢收手缩小；快速张合不会改变大小。');
    stream.getVideoTracks()[0].addEventListener('ended',()=>{if(active)stopCamera('摄像头连接已结束，可重新开启。');});
  }catch(error){if(token===session)failCamera(error);}
}
async function infer(now){if(!active||busy||paused||document.hidden||video.readyState<2||video.currentTime===lastVideo||now-lastInfer<65)return;busy=true;lastVideo=video.currentTime;lastInfer=now;const token=session;try{const bitmap=await createImageBitmap(video);if(token!==session||!active){bitmap.close();return;}worker.postMessage({type:'frame',image:bitmap,timestamp:now},[bitmap]);}catch(error){if(token===session)failCamera(error);}}
camera.addEventListener('click',startCamera);
function move(event){if(event.target!==canvas)return;mouse.x=clamp(event.clientX/innerWidth,0,1);mouse.y=clamp(event.clientY/innerHeight,0,1);mouse.yaw=(mouse.x-.5)*2;mouse.roll=(mouse.x-.5)*.7;if(!pressed)mouse.expansion=.9+(mouse.y-.5)*.5;}
canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pressed=true;move(e);mouse.expansion=.27;});
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{pressed=false;mouse.expansion=.92;});
addEventListener('blur',()=>{pressed=false;mouse.expansion=.92;});
canvas.addEventListener('wheel',e=>{e.preventDefault();mouse.expansion=clamp(mouse.expansion+e.deltaY*.002,.25,9);},{passive:false});
document.querySelectorAll('[data-shape]').forEach(b=>b.addEventListener('click',()=>{scene?.setShape(b.dataset.shape);document.querySelectorAll('[data-shape]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));}));
document.querySelectorAll('[data-palette]').forEach(b=>b.addEventListener('click',()=>{scene?.setPalette(b.dataset.palette);document.querySelectorAll('[data-palette]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));}));
$('density').addEventListener('input',e=>{const count=Number(e.target.value);if(scene)scene.count=count;$('density-value').textContent=count.toLocaleString();$('particle-count').textContent=count.toLocaleString()+' PARTICLES';});
function updatePause(){$('pause').textContent=paused?'继续动画':'暂停动画';$('pause').setAttribute('aria-pressed',String(paused));}
$('pause').addEventListener('click',()=>{paused=!paused;updatePause();});updatePause();
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{message('当前浏览器不支持全屏，可以手动放大窗口。');}});
addEventListener('resize',()=>scene?.resize());addEventListener('pagehide',()=>stopCamera(''));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(active||starting))stopCamera('页面已切到后台，摄像头已自动关闭。回来后可重新开启。');});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();stopCamera('');message('图形渲染连接已中断，请刷新页面。',true);});
let last=performance.now(),fpsTime=last,frames=0,started=false;
function frame(now){const dt=Math.min(.05,(now-last)/1000);last=now;
  if(!document.hidden&&scene){if(!paused||!started){const control=active&&hand?hand:mouse;scene.draw(paused?0:dt,control);$('energy').style.width=(clamp((control.expansion-.25)/8.75,0,1)*100)+'%';started=true;}infer(now);frames++;if(now-fpsTime>1000){$('fps').textContent=(paused?'PAUSED':Math.round(frames*1000/(now-fpsTime))+' FPS');frames=0;fpsTime=now;}}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
