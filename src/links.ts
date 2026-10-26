import * as WebBrowser from 'expo-web-browser';
export const SITE='https://www.aucklandknights.co.nz';
export async function openSite(path:string) {
  const url=new URL(path,SITE);
  if(url.origin!==SITE || !/^\/(tournaments(?:\/[^/]+(?:\/(register|entries))?)?|news(?:\/[^/]+)?|join|calendar|results|contact|absence|agm|coaching|privacy|terms)?$/.test(url.pathname)) throw new Error('This club link is unavailable.');
  await WebBrowser.openBrowserAsync(url.href);
}
export async function openExternal(value:string) {
  const url=new URL(value);
  if(url.protocol!=='https:' || url.username || url.password)throw new Error('Invalid link.');
  await WebBrowser.openBrowserAsync(url.href);
}
