import React,{useEffect,useState}from'react';
import{ActivityIndicator,Pressable,StyleSheet,Text,View}from'react-native';
import type{Session}from'@supabase/supabase-js';
import{getPushConfig}from'./api';
import{nativePushBuild,savedPushTopics,subscribePush,unsubscribePush}from'./pushClient';
export default function PushPreferences({session}:{session:Session|null}){
 const[configured,setConfigured]=useState(false),[loaded,setLoaded]=useState(false),[topics,setTopics]=useState<string[]>(['tournament','news']),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;getPushConfig().then(c=>{if(active){setConfigured(c.enabled);setLoaded(true);}}).catch(()=>{if(active)setLoaded(true);});if(nativePushBuild())void savedPushTopics().then(t=>{if(active&&t.length)setTopics(t);}).catch(()=>{});return()=>{active=false;};},[]);
 async function save(disable=false){if(!session||busy)return;setBusy(true);setMessage('');try{if(disable){await unsubscribePush(session.access_token);setMessage('Announcements disabled on this device.');}else{await subscribePush(session.access_token,topics);setMessage('Your announcement choices have been saved.');}}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
 const enabled=configured&&!!session&&nativePushBuild()&&process.env.EXPO_PUBLIC_PUSH_ENABLED==='true';
 return <View style={s.card}>
  <Text style={s.title}>Club announcements</Text>
  <Text style={s.body}>Opt in to push messages about new tournaments and news. Only people with a club-verified membership or confirmed player registration can subscribe.</Text>
  {!loaded?<ActivityIndicator/>:null}
  {loaded&&!configured?<Text style={s.notice}>Push delivery is awaiting Expo credentials, verified account links and server setup. No notification permission will be requested yet.</Text>:null}
  {!nativePushBuild()?<Text style={s.notice}>Use an AKCC development or production build to test remote push. This feature is not enabled in Expo Go.</Text>:null}
  {!session?<Text style={s.body}>A verified member account is required. Expo login is separate from your club account.</Text>:null}
  {(['tournament','news']as const).map(topic=><Pressable key={topic}accessibilityRole="checkbox"accessibilityState={{checked:topics.includes(topic),disabled:busy||!enabled}}disabled={busy||!enabled}onPress={()=>setTopics(t=>t.includes(topic)?t.filter(x=>x!==topic):[...t,topic])}style={s.choice}><Text style={s.body}>{topics.includes(topic)?'☑':'☐'} {topic==='news'?'News updates':'New tournaments and registration announcements'}</Text></Pressable>)}
  <Text style={s.small}>Messages contain public club information. You can turn them off here or in phone settings. Signing out alone does not unsubscribe this device.</Text>
  <Pressable accessibilityRole="button"accessibilityState={{disabled:!enabled||busy||!topics.length}}disabled={!enabled||busy||!topics.length}onPress={()=>void save()}style={[s.button,!enabled||busy||!topics.length?{opacity:.5}:null]}><Text style={s.buttonText}>{busy?'Please wait…':'Enable / save announcements'}</Text></Pressable>
  <Pressable accessibilityRole="button"accessibilityState={{disabled:!enabled||busy}}disabled={!enabled||busy}onPress={()=>void save(true)}style={s.choice}><Text style={s.body}>Disable on this device</Text></Pressable>
  {!!message?<Text accessibilityRole="alert"style={s.notice}>{message}</Text>:null}
 </View>;
}
const s=StyleSheet.create({card:{backgroundColor:'#fff',borderWidth:1,borderColor:'#e3ded2',borderRadius:16,padding:16,gap:12},title:{fontSize:21,fontWeight:'800',color:'#20221b'},body:{fontSize:15,lineHeight:23,color:'#55574f'},small:{fontSize:12,lineHeight:19,color:'#74756c'},notice:{fontSize:14,lineHeight:21,color:'#765614'},choice:{padding:12,borderWidth:1,borderColor:'#e3ded2',borderRadius:10},button:{backgroundColor:'#d0aa55',padding:14,borderRadius:10},buttonText:{fontSize:14,fontWeight:'700',color:'#181b15'}});
