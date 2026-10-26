import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import React from 'react';
import Renderer,{act} from 'react-test-renderer';
import ts from 'typescript';
const require=createRequire(import.meta.url);
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
function loadApp(players){
 const fixture={slug:'test',title:'Test tournament',date:'7 Nov',venue:'Test venue',address:'Test address',description:'',fee:'$20',rounds:'7',time_control:'15+5',rating:'Rapid',image:null,club_event:false,registration_url:null,entries_url:'https://www.aucklandknights.co.nz/tournaments/test/entries',absence_url:'https://www.aucklandknights.co.nz/absence'};
 const host=name=>props=>React.createElement(name,props,props.children);
 const native=Object.fromEntries(['ActivityIndicator','Image','Pressable','RefreshControl','ScrollView','Text','TextInput','View'].map(name=>[name,host(name)]));
 Object.assign(native,{StyleSheet:{create:x=>x},Alert:{alert:()=>{}},AppState:{addEventListener:()=>({remove(){}})},Linking:{openURL:async()=>{}}});
 const overrides={'react':React,'react-native':native,'react-native-safe-area-context':{SafeAreaProvider:host('SafeAreaProvider'),SafeAreaView:host('SafeAreaView')},'expo-status-bar':{StatusBar:()=>null},'./src/api':{getFeed:async()=>({tournaments:[fixture],news:[],contact:{},fetched_at:new Date().toISOString()}),getPlayers:async()=>players,getAccount:async()=>({memberships:[],payments:[]}),getMembershipOptions:async()=>({options:[{key:'test',name:'Test membership',fee_cents:2000,description:'Test option',joining_period:'2026'}],terms:['Test terms'],terms_version:'test',writes_enabled:false}),getPushConfig:async()=>({enabled:false,project_id:null}),getTournament:async()=>fixture},'./src/auth':{auth:null},'./src/pushClient':{listenForAnnouncements:async()=>()=>{},nativePushBuild:()=>false},'./src/links':{openExternal:async()=>{},openSite:async()=>{}},'./src/ClubFeatures':{CalendarResults:host('CalendarResults'),ClubForm:host('ClubForm'),NewsReader:host('NewsReader')},'./assets/icon.png':1};
 function compile(file){const code=ts.transpileModule(readFileSync(new URL('../'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};vm.runInNewContext(code,{exports:module.exports,module,require:name=>name==='./src/RegisteredPlayers'?compile('src/RegisteredPlayers.tsx'):name==='./src/MembershipScreen'?compile('src/MembershipScreen.tsx'):name==='./src/PushPreferences'?compile('src/PushPreferences.tsx'):name==='./pushClient'?overrides['./src/pushClient']:name==='./api'?overrides['./src/api']:name==='./links'?overrides['./src/links']:overrides[name]??require(name),console,URL,Intl,Date,process},{filename:'App.test.js'});
 return module.exports;}
 return compile('App.tsx').default;
}
function assertNativeText(tree,parent='root'){
 if(tree===null)return;
 if(Array.isArray(tree)){for(const child of tree)assertNativeText(child,parent);return;}
 if(typeof tree==='string'||typeof tree==='number'){assert.equal(parent,'Text',`Raw ${JSON.stringify(tree)} inside ${parent}`);return;}
 for(const child of tree.children||[])assertNativeText(child,tree.type);
}
function button(root,label){return root.findAllByType('Pressable').find(node=>node.findAllByType('Text').some(text=>text.children.join('')===label));}
for(const players of [[],[{name:'Test Unrated',title:'',gender:'',fide_id:'',fide_rating:null,nzcf_rating:null,club:''}],[{name:'Test Rated',title:'CM',gender:'M',fide_id:'110033474',fide_rating:2000,nzcf_rating:0,club:'AKCC'}]]){
 test(`render Home, Membership and player table with ${players.length} ${players[0]?.name||'players'}`,async()=>{
   const App=loadApp(players);let screen;
   try{
     await act(async()=>{screen=Renderer.create(React.createElement(App));});assertNativeText(screen.toJSON());
     await act(async()=>{screen.root.findAllByType('Pressable').find(n=>n.props.accessibilityRole==='tab'&&n.findAllByType('Text').some(t=>t.children.join('')==='Membership')).props.onPress();});assertNativeText(screen.toJSON());
     assert.ok(screen.root.findAllByType('Text').some(n=>n.children.join('')==='Club membership'),'Membership renders its native screen');
     assert.equal(button(screen.root,'Submit membership').props.disabled,true,'Unvalidated writes stay disabled');
     assert.equal(button(screen.root,'Join / renew membership ↗'),undefined,'No membership website redirect');
     await act(async()=>{screen.root.findAllByType('Pressable').find(n=>n.props.accessibilityRole==='tab'&&n.findAllByType('Text').some(t=>t.children.join('')==='Play')).props.onPress();});
     await act(async()=>{button(screen.root,'Test tournament').props.onPress();});assertNativeText(screen.toJSON());
     await act(async()=>{button(screen.root,'Registered players').props.onPress();});assertNativeText(screen.toJSON());
   }finally{if(screen)await act(async()=>screen.unmount());}
 });
}
