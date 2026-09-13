
'use client';
import {useState} from 'react';
import {useAuth} from './auth-provider';
import {adminFetch} from '../lib/admin-api';
import {importGuestLibrary,useLibraryStatus} from '../features/viewing/library';
export function AccountClient(){const{user,logout}=useAuth();const status=useLibraryStatus();const[message,setMessage]=useState('');return <section className="card"><h2>{user?.displayName||user?.email}</h2><p>{user?.email}</p><p>{status==='synced'?'Your account library is synced.':'Your changes are saved on this device and will sync when connected.'}</p><p>Guest and account lists are separate on shared devices.</p><div className="view-actions"><button onClick={()=>{try{importGuestLibrary();setMessage('Guest titles queued for your account.');}catch{setMessage('Browser storage is unavailable.');}}}>Import this browser’s guest list</button><button onClick={()=>void logout()}>Sign out</button><button onClick={async()=>{const r=await adminFetch('/auth/logout-all',{method:'POST'});if(r.ok)await logout();else setMessage('Could not end all sessions. Please retry.');}}>Sign out all devices</button></div><p role="status">{message}</p></section>;}
