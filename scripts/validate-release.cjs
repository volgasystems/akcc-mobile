const {isIP}=require('node:net');
function validateRelease(env){
 const errors=[];
 let url;
 try{url=new URL(env.EXPO_PUBLIC_API_URL);}catch{errors.push('Set EXPO_PUBLIC_API_URL to the deployed mobile HTTPS API.');}
 if(url){
  const host=url.hostname.replace(/^\[|\]$/g,'');
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||isIP(host)||!host.includes('.')||/^(localhost|.*\.(local|localhost|internal|test|invalid|example))$/i.test(host)) errors.push('Release API must use a public HTTPS hostname without credentials, query or fragment.');
 }
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(env.EXPO_PUBLIC_EXPO_PROJECT_ID||''))errors.push('Set the existing Expo project UUID in EXPO_PUBLIC_EXPO_PROJECT_ID.');
 if(!['true','false'].includes(env.EXPO_PUBLIC_ACCOUNTS_ENABLED))errors.push('Explicitly set EXPO_PUBLIC_ACCOUNTS_ENABLED=true or false.');
 if(!['true','false'].includes(env.EXPO_PUBLIC_PUSH_ENABLED))errors.push('Explicitly set EXPO_PUBLIC_PUSH_ENABLED=true or false.');
 for(const key of Object.keys(env))if(/^EXPO_PUBLIC_/.test(key)&&/(SERVICE_ROLE|SECRET|PRIVATE_KEY|PASSWORD|ACCESS_TOKEN)/.test(key))errors.push(`Remove secret-like public environment variable ${key}.`);
 return errors;
}
module.exports={validateRelease};
if(require.main===module){const errors=validateRelease(process.env);if(errors.length){console.error('Release configuration blocked:\n'+errors.map(x=>'- '+x).join('\n'));process.exitCode=1;}else console.log('Release configuration valid. This does not verify backend reachability, feature readiness or signing.');}
