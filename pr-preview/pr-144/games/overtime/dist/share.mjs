// Build 26: what the SHARE button on the end screen sends. Pure, so the tests can check the words.
// `time` is already formatted (for example "07:42").
export const GAME_URL='https://www.poopprofit.com/overtime';
export function shareMessage({endless=false,won=false,time='',stageName=''}={}){
 const text=endless?`I lasted ${time} in Survival of the Shittest. Think you can outlast me?`
  :won?`I cleared ${stageName} in Poop Profit: Overtime. Your turn.`
  :`${stageName} clocked me out at ${time} in Poop Profit: Overtime. Think you can do better?`;
 return {title:'Poop Profit: Overtime',text,url:GAME_URL};
}
// Sends it with the phone's own share sheet when there is one, otherwise copies it. Resolves to what happened:
// 'shared', 'copied', 'cancelled' or 'failed'. `nav` is the browser's navigator (passed in so tests can stand in).
export async function sendShare(message,nav){
 if(nav&&typeof nav.share==='function'){
  try{await nav.share(message);return 'shared';}
  catch(e){if(e&&e.name==='AbortError')return 'cancelled';}
 }
 try{await nav.clipboard.writeText(message.text+' '+message.url);return 'copied';}catch{return 'failed';}
}
