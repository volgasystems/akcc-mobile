import React from 'react';
import {Alert,Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {openExternal} from './links';
import type {Player} from './types';
type Sort='name'|'fide_rating'|'nzcf_rating';
const headings=['SNO','Title','Name','Gender','FIDE ID','FIDE Rating','NZCF Rating','Club'];
export default function RegisteredPlayers({players,sort,onSort}:{players:Player[];sort:Sort;onSort:(value:Sort)=>void}){
  const openProfile=(id:string)=>void openExternal(`https://ratings.fide.com/profile/${id}`).catch(error=>Alert.alert('FIDE profile',error.message));
  return (
    <View style={s.section}>
      <Text style={s.heading}>Registered players</Text>
      <View style={s.sorts}>
        {(['name','fide_rating','nzcf_rating']as const).map(value=>(
          <Pressable key={value} accessibilityRole="button" accessibilityState={{selected:sort===value}} onPress={()=>onSort(value)} style={[s.button,sort===value?s.selected:null]}>
            <Text style={s.buttonText}>{value==='name'?'Name':value==='fide_rating'?'FIDE':'NZCF'}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView horizontal>
        <View>
          <View style={s.header}>
            {headings.map((label,index)=>(<Text key={label} style={[s.cell,index===2?s.name:null,s.bold]}>{label}</Text>))}
          </View>
          {players.map((player,index)=>{
            const fideId=String(player.fide_id||'').trim();
            const linked=/^[1-9]\d{0,11}$/.test(fideId);
            const cells=[index+1,player.title,player.name,player.gender,fideId,player.fide_rating,player.nzcf_rating,player.club];
            return (
              <View key={`${player.name}-${index}`} style={[s.row,index%2===1?s.shade:null]}>
                {cells.map((value,column)=>column===4&&linked?(
                  <Pressable key={column} accessibilityRole="link" accessibilityLabel={`FIDE profile for ${player.name}`} onPress={()=>openProfile(fideId)}>
                    <Text style={[s.cell,s.link]}>{fideId}</Text>
                  </Pressable>
                ):(
                  <Text key={column} style={[s.cell,column===2?s.name:null]}>{String(value??'')}</Text>
                ))}
              </View>
            );
          })}
        </View>
      </ScrollView>
      {players.length===0?(<Text style={s.note}>No paid and confirmed entries are currently displayed.</Text>):null}
    </View>
  );
}
const s=StyleSheet.create({section:{gap:12},heading:{fontSize:23,fontWeight:'800',color:'#20221b'},sorts:{flexDirection:'row',gap:8},button:{padding:14,borderRadius:12,backgroundColor:'#ece8dd'},selected:{backgroundColor:'#d0aa55'},buttonText:{fontSize:14,fontWeight:'700',color:'#181b15'},header:{flexDirection:'row',backgroundColor:'#d9d3c4'},row:{flexDirection:'row',backgroundColor:'#fff'},shade:{backgroundColor:'#e8e5de'},cell:{width:100,padding:12,fontSize:13,color:'#282a23'},name:{width:190},bold:{fontWeight:'700'},link:{color:'#70500b',textDecorationLine:'underline'},note:{fontSize:15,lineHeight:23,color:'#55574f'}});
