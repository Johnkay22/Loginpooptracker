// Build 27: game analytics. Sends a few plain events to the same Google Analytics property as the rest of
// poopprofit.com, through the gtag function set up in index.html. If analytics is blocked or missing, every call
// here quietly does nothing. Nothing sent identifies a player.
export function track(name,params={}){
 try{if(typeof window!=='undefined'&&typeof window.gtag==='function')window.gtag('event',name,params);}catch{}
}
// The privacy page promises that anything about time is sent as a range, never the exact figure.
export function timeBand(seconds){
 const m=Math.max(0,Number(seconds)||0)/60;
 return m<1?'under_1m':m<3?'1_3m':m<6?'3_6m':m<9?'6_9m':m<12?'9_12m':m<20?'12_20m':'20m_plus';
}
export const modeName=stage=>stage.endless?'survival':'stage_'+stage.id;
