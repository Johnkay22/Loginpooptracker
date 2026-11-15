// Exercise the real scene builder with a minimal drawing context to obtain its collision geometry.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const noop=()=>{},ctx=new Proxy({measureText:s=>({width:s.length*6}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(t,k)=>t[k]||noop});
const canvas={getContext:()=>ctx,addEventListener:noop};
const sandbox={window:{},document:{getElementById:()=>canvas},Image:class{constructor(){this.complete=false;this.width=0;this.height=0;}},matchMedia:()=>({matches:true}),devicePixelRatio:1,innerWidth:1440,innerHeight:900,addEventListener:noop};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/office.js'),'utf8'),sandbox);
module.exports=sandbox.window.LMOffice.obstacles;
