'use client';

import { useEffect, useRef, useState } from 'react';
const api=process.env.NEXT_PUBLIC_API_URL;
type TargetType='MEDIA'|'EPISODE'|'CHANNEL';
type StreamType='mpegts'|'hls'|'dash'|'file'|'manifest';

export function SecurePlayer({targetType,targetId}:{targetType:TargetType;targetId:string}){
 const video=useRef<HTMLVideoElement>(null),[status,setStatus]=useState('Préparation…');
 useEffect(()=>{
  let cleanup:(()=>void|Promise<void>)|undefined,heartbeat:ReturnType<typeof setInterval>|undefined,sessionId:string|undefined,cancelled=false;
  const authorization=`Bearer ${sessionStorage.getItem('accessToken')??''}`,deviceId=localStorage.getItem('streamlyDeviceId')??crypto.randomUUID();localStorage.setItem('streamlyDeviceId',deviceId);
  void(async()=>{try{
   const response=await fetch(`${api}/playback/sessions`,{method:'POST',headers:{authorization,'content-type':'application/json'},body:JSON.stringify({targetType,targetId,deviceId})});
   if(!response.ok){if(!cancelled)setStatus(response.status===401?'Connexion requise':'Lecture indisponible');return;}
   const value=await response.json() as{sessionId:string;manifestUrl:string;streamType?:StreamType};sessionId=value.sessionId;
   if(cancelled||!video.current)return;const media=video.current,url=new URL(value.manifestUrl,new URL(api!).origin).toString();
   const playing=()=>{if(!cancelled)setStatus('');};media.addEventListener('playing',playing);
   if(value.streamType==='mpegts'){
    const mpegts=await import('mpegts.js');if(!mpegts.default.isSupported()){setStatus('MPEG-TS non compatible avec ce navigateur.');return;}
    const created=mpegts.default.createPlayer({type:'mpegts',isLive:true,url},{enableWorker:true,enableStashBuffer:false,liveBufferLatencyChasing:true,liveBufferLatencyMaxLatency:5,liveBufferLatencyMinRemain:1}),onError=()=>{if(!cancelled){setStatus('Reconnexion au flux…');void qoe(value.sessionId,'error',authorization);}};
    created.on(mpegts.default.Events.ERROR,onError);cleanup=()=>{media.removeEventListener('playing',playing);created.off(mpegts.default.Events.ERROR,onError);created.pause();created.unload();created.detachMediaElement();created.destroy();};created.attachMediaElement(media);created.load();await created.play();
   }else if(value.streamType==='hls'){
    if(media.canPlayType('application/vnd.apple.mpegurl')){media.src=url;cleanup=()=>{media.removeEventListener('playing',playing);media.pause();media.removeAttribute('src');media.load();};await media.play();}
    else{const Hls=(await import('hls.js')).default;if(!Hls.isSupported()){setStatus('HLS non compatible avec ce navigateur.');return;}let recoveries=0;const created=new Hls({lowLatencyMode:true,maxBufferLength:15,maxMaxBufferLength:30,backBufferLength:10,manifestLoadingTimeOut:8_000,fragLoadingTimeOut:10_000,manifestLoadingMaxRetry:2,fragLoadingMaxRetry:2,startFragPrefetch:true}),onError=(_event:string,data:{fatal:boolean;type:string})=>{if(!data.fatal)return;void qoe(value.sessionId,'error',authorization);if(recoveries++<1&&data.type===Hls.ErrorTypes.NETWORK_ERROR){setStatus('Reconnexion…');created.startLoad();return;}if(recoveries<2&&data.type===Hls.ErrorTypes.MEDIA_ERROR){setStatus('Récupération du lecteur…');created.recoverMediaError();return;}setStatus('Le flux HLS est indisponible.');};created.on(Hls.Events.ERROR,onError);cleanup=()=>{media.removeEventListener('playing',playing);created.off(Hls.Events.ERROR,onError);created.destroy();};created.loadSource(url);created.attachMedia(media);await media.play().catch(()=>undefined);}
   }else if(value.streamType==='file'){
    media.src=url;cleanup=()=>{media.removeEventListener('playing',playing);media.pause();media.removeAttribute('src');media.load();};await media.play();
   }else{
    const shaka=await import('shaka-player'),created=new shaka.default.Player();cleanup=()=>{media.removeEventListener('playing',playing);return created.destroy();};await created.attach(media);created.configure({streaming:{bufferingGoal:12,rebufferingGoal:2,bufferBehind:20,retryParameters:{maxAttempts:3,baseDelay:500,backoffFactor:2,fuzzFactor:.2,timeout:10_000,stallTimeout:5_000,connectionTimeout:8_000}}});created.addEventListener('buffering',()=>void qoe(value.sessionId,'buffering',authorization));created.addEventListener('error',()=>{if(!cancelled)setStatus('Reconnexion…');void qoe(value.sessionId,'error',authorization);});await created.load(url);await media.play();
   }
   heartbeat=setInterval(()=>{void fetch(`${api}/playback/sessions/${value.sessionId}/heartbeat`,{method:'POST',headers:{authorization}}).catch(()=>undefined);},30_000);
  }catch{if(!cancelled)setStatus('Le flux est temporairement indisponible.');}})();
  return()=>{cancelled=true;if(heartbeat)clearInterval(heartbeat);if(sessionId)void fetch(`${api}/playback/sessions/${sessionId}/end`,{method:'POST',headers:{authorization,'content-type':'application/json'},body:'{}'}).catch(()=>undefined);void cleanup?.();};
 },[targetId,targetType]);
 return <div className="player-shell"><video ref={video} controls playsInline/><p aria-live="polite">{status}</p></div>;
}
async function qoe(id:string,type:string,authorization:string){try{await fetch(`${api}/playback/sessions/${id}/qoe`,{method:'POST',headers:{authorization,'content-type':'application/json'},body:JSON.stringify({type})});}catch{/* Playback continues when telemetry is unavailable. */}}
