const {expo}=require('./app.json');
const {validateRelease}=require('./scripts/validate-release.cjs');
module.exports=()=>{
 if(['preview','production'].includes(process.env.EAS_BUILD_PROFILE)){
  const errors=validateRelease(process.env);
  if(errors.length)throw new Error('Release configuration blocked:\n'+errors.join('\n'));
 }
 const projectId=process.env.EXPO_PUBLIC_EXPO_PROJECT_ID;
 return {...expo,extra:{...expo.extra,...(projectId?{eas:{projectId}}:{})}};
};
