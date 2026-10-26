import type {Feed,Player,AccountData,CalendarData,Result,NewsDetail,FormReply,MembershipOptions,MembershipReply,PushConfig,Tournament} from './types';
const base = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/,'');
export class ApiError extends Error { constructor(message:string,public status:number){super(message);} }
export async function request<T>(path:string,token?:string,init?:RequestInit):Promise<T> {
  if(!base) throw new Error('The club connection is not configured. You can still open the website below.');
  const url=new URL(base);
  if(url.protocol!=='https:' && !(__DEV__ && url.protocol==='http:')) throw new Error('A secure HTTPS club connection is required.');
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),60000);
  try {
    const r=await fetch(`${base}${path}`,{...init,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...init?.headers},signal:controller.signal});
    const data=await r.json();if(!r.ok) throw new ApiError(data.error || 'Unable to load club information.',r.status);return data as T;
  } finally {clearTimeout(timer);}
}
export const getFeed=()=>request<Feed>('/v1/feed');
export const getPlayers=(slug:string)=>request<Player[]>(`/v1/tournaments/${encodeURIComponent(slug)}/players`);
export const getAccount=(token:string)=>request<AccountData>('/v1/account',token);

export const getCalendar=()=>request<CalendarData>('/v1/calendar');
export const getResults=()=>request<Result[]>('/v1/results');
export const getNews=(slug:string)=>request<NewsDetail>(`/v1/news/${encodeURIComponent(slug)}`);
export const sendClubForm=(kind:'enquiry'|'absence',data:Record<string,string|boolean>,key:string)=>request<FormReply>(kind==='enquiry'?'/v1/enquiries':'/v1/absences',undefined,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(data)});

export const getMembershipOptions=()=>request<MembershipOptions>('/v1/membership/options');
export const sendMembership=(kind:'join'|'renew'|'recovery',data:Record<string,unknown>,key:string)=>request<MembershipReply>(`/v1/membership/${kind}`,undefined,{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(data)});
export const getPushConfig=()=>request<PushConfig>('/v1/push/config');
export const savePushDevice=(token:string,data:Record<string,unknown>)=>request<{enabled:boolean;topics?:string[]}>('/v1/push/device',token,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
export const getTournament=(slug:string)=>request<Tournament>(`/v1/tournaments/${encodeURIComponent(slug)}`);

export const getPushEligibility=(token:string)=>request<{eligible:boolean}>('/v1/push/eligibility',token);
