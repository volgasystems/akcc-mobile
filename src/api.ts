import type {Feed,Player,AccountData} from './types';
const base = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/,'');
export async function request<T>(path:string,token?:string):Promise<T> {
  if(!base) throw new Error('The club connection is not configured. You can still open the website below.');
  const url=new URL(base);
  if(url.protocol!=='https:' && !(__DEV__ && url.protocol==='http:')) throw new Error('A secure HTTPS club connection is required.');
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),60000);
  try {
    const r=await fetch(`${base}${path}`,{headers:token?{Authorization:`Bearer ${token}`}:{},signal:controller.signal});
    const data=await r.json();if(!r.ok) throw new Error(data.error || 'Unable to load club information.');return data as T;
  } finally {clearTimeout(timer);}
}
export const getFeed=()=>request<Feed>('/v1/feed');
export const getPlayers=(slug:string)=>request<Player[]>(`/v1/tournaments/${encodeURIComponent(slug)}/players`);
export const getAccount=(token:string)=>request<AccountData>('/v1/account',token);
