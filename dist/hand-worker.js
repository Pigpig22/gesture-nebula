// A classic worker can load the module with import(), while allowing MediaPipe's importScripts.
let detector;
self.onmessage=async ({data})=>{
  if(data.type==='init'){
    try{
      const {FilesetResolver,HandLandmarker}=await import('./vendor/vision_bundle.mjs');
      const files=await FilesetResolver.forVisionTasks(new URL('./vendor/wasm',self.location.href).href);
      detector=await HandLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:new URL('./vendor/hand_landmarker.task',self.location.href).href,delegate:'CPU'},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.55,minHandPresenceConfidence:.55,minTrackingConfidence:.55});
      self.postMessage({type:'ready'});
    }catch(error){self.postMessage({type:'error',message:error.message});}
  }else if(data.type==='frame'){
    try{const result=detector.detectForVideo(data.image,data.timestamp);self.postMessage({type:'result',landmarks:result.landmarks});}
    catch(error){self.postMessage({type:'error',message:error.message});}
    finally{data.image.close();}
  }
};
