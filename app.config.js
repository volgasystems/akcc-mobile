const {expo}=require('./app.json');
module.exports=()=>{
 const projectId=process.env.EXPO_PUBLIC_EXPO_PROJECT_ID;
 return {...expo,extra:{...expo.extra,...(projectId?{eas:{projectId}}:{})}};
};
