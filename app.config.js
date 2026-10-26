const {expo}=require('./app.json');
const {validateRelease}=require('./scripts/validate-release.cjs');
module.exports=()=>{
 const projectId=expo.extra.eas.projectId;
 const override=process.env.EXPO_PUBLIC_EXPO_PROJECT_ID;
 if(override&&override!==projectId)throw new Error('EXPO_PUBLIC_EXPO_PROJECT_ID does not match the existing AKCC Expo project.');
 if(['preview','production'].includes(process.env.EAS_BUILD_PROFILE)){
  const errors=validateRelease({...process.env,EXPO_PUBLIC_EXPO_PROJECT_ID:projectId});
  if(errors.length)throw new Error('Release configuration blocked:\n'+errors.join('\n'));
 }
 return {...expo,extra:{...expo.extra,eas:{...expo.extra.eas,projectId}}};
};
