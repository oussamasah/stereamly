const {loadEnvFile}=require('node:process');
const {existsSync}=require('node:fs');
const {resolve}=require('node:path');
(async()=>{
 const file=resolve('.env.production');
 if(!existsSync(file))throw new Error('.env.production is missing. Populate deploy/production.env.example for the target deployment.');
 loadEnvFile(file);
 const required=['PUBLIC_DOMAIN','POSTGRES_PASSWORD','JWT_SECRET','TOKEN_PEPPER','SOURCE_ENCRYPTION_KEY','SMTP_HOST','SMTP_USER','SMTP_PASSWORD','EMAIL_FROM','NEXT_PUBLIC_TMDB_API_KEY'];
 const missing=required.filter(key=>!process.env[key]);if(missing.length)throw new Error('Missing production settings: '+missing.join(', '));
 if(!/^[a-zA-Z0-9_-]+$/.test(process.env.POSTGRES_PASSWORD))throw new Error('POSTGRES_PASSWORD must use URL-safe letters, digits, underscores or hyphens for this Compose profile.');
 const {validateEnv}=require('../apps/api/dist/config/env');
 validateEnv({...process.env,NODE_ENV:'production',WEB_ORIGIN:'https://'+process.env.PUBLIC_DOMAIN,DATABASE_URL:'postgresql://stream:'+process.env.POSTGRES_PASSWORD+'@postgres:5432/stream_platform',REDIS_URL:'redis://redis:6379'});
 console.log('PASS: required production configuration is present and structurally valid.');
 if(process.argv.includes('--live')){
  const base='https://'+process.env.PUBLIC_DOMAIN;
  const health=await fetch(base+'/api/v1/health/ready',{signal:AbortSignal.timeout(10000)});if(!health.ok)throw new Error('Live API readiness failed');
  const r=await fetch(base+'/api/v1/platform/snapshot',{signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error('Live public snapshot failed');
  const snapshot=await r.json();
  if(!snapshot.bindings?.length)throw new Error('No approved viewing sources are published.');
  const metadata=await fetch('https://api.themoviedb.org/3/configuration?api_key='+encodeURIComponent(process.env.NEXT_PUBLIC_TMDB_API_KEY),{signal:AbortSignal.timeout(10000)});if(!metadata.ok)throw new Error('TMDB metadata credential verification failed');
  console.log('PASS: live HTTPS API and metadata checks. Real playback, distribution permission and backup restoration still need operator verification.');
 }
})().catch(error=>{console.error('NOT READY: '+error.message);process.exitCode=1;});
