import type {NotificationResponse} from 'expo-notifications';
import Constants from 'expo-constants';
import {Platform}from'react-native';
import{getPushConfig,getPushEligibility,savePushDevice}from'./api';
import*as SecureStore from'expo-secure-store';
const key='akcc-push-subscription-v1';
export const nativePushBuild=()=>Platform.OS!=='web'&&Constants.executionEnvironment!=='storeClient';
export async function subscribePush(accessToken:string,topics:string[]){
 if(process.env.EXPO_PUBLIC_PUSH_ENABLED!=='true'||!nativePushBuild())throw new Error('Push requires a configured Android/iPhone development or production build. Expo Go is not used for this setup.');
 const config=await getPushConfig();if(!config.enabled||!config.project_id)throw new Error('Club push services are not configured yet.');
 if(Constants.easConfig?.projectId!==config.project_id)throw new Error('This build belongs to a different or unconfigured Expo project.');
 const allowed=await getPushEligibility(accessToken);if(!allowed.eligible)throw new Error('The club needs to verify your membership or player registration before enabling messages.');
 if(!topics.length)throw new Error('Choose new tournaments, news, or both.');
 // Import only after native build, service configuration and eligibility checks.
 const Notifications=await import('expo-notifications');
 if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('announcements',{name:'Club announcements',importance:Notifications.AndroidImportance.DEFAULT});
 let permission=await Notifications.getPermissionsAsync();if(permission.status!=='granted')permission=await Notifications.requestPermissionsAsync();
 if(permission.status!=='granted')throw new Error('Notifications were not enabled. You can change this in device settings.');
 const token=(await Notifications.getExpoPushTokenAsync({projectId:config.project_id})).data;
 await savePushDevice(accessToken,{token,topics,consent_version:config.consent_version});
 await SecureStore.setItemAsync(key,JSON.stringify({token,topics}));
 return topics;
}
export async function unsubscribePush(accessToken:string){
 const raw=await SecureStore.getItemAsync(key);if(!raw)return;
 const saved=JSON.parse(raw);await savePushDevice(accessToken,{token:saved.token,disabled:true});await SecureStore.deleteItemAsync(key);
}
export async function savedPushTopics(){const raw=await SecureStore.getItemAsync(key);return raw?JSON.parse(raw).topics as string[]:[];}
export async function listenForAnnouncements(callback:(kind:'news'|'tournament',slug:string)=>void){
 if(process.env.EXPO_PUBLIC_PUSH_ENABLED!=='true'||!nativePushBuild())return ()=>{};
 const Notifications=await import('expo-notifications');
 Notifications.setNotificationHandler({handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:false,shouldSetBadge:false})});
 const handle=(response:NotificationResponse)=>{const data=response.notification.request.content.data;if(data&&(data.kind==='news'||data.kind==='tournament')&&typeof data.slug==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(data.slug))callback(data.kind,data.slug);};
 const listener=Notifications.addNotificationResponseReceivedListener(handle);const last=await Notifications.getLastNotificationResponseAsync();if(last){handle(last);await Notifications.clearLastNotificationResponseAsync();}
 return ()=>listener.remove();
}
