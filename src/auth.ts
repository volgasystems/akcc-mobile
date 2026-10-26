import {createClient} from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import {Platform} from 'react-native';
const url=process.env.EXPO_PUBLIC_SUPABASE_URL;
const key=process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
// Native secure storage; web preview sessions are deliberately memory-only.
const memory=new Map<string,string>();
const storage={
  getItem:async(k:string)=>Platform.OS==='web'?memory.get(k)||null:SecureStore.getItemAsync(k),
  setItem:async(k:string,v:string)=>{if(Platform.OS==='web')memory.set(k,v);else await SecureStore.setItemAsync(k,v);},
  removeItem:async(k:string)=>{if(Platform.OS==='web')memory.delete(k);else await SecureStore.deleteItemAsync(k);}
};
export const auth=process.env.EXPO_PUBLIC_ACCOUNTS_ENABLED==='true' && url && key
  ? createClient(url,key,{auth:{storage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}):null;
