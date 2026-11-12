import {spawn} from 'node:child_process';
import {mkdir,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const artifacts=new URL('./artifacts/',import.meta.url);
await mkdir(artifacts,{recursive:true});
const captureName=(process.argv[3]||'agentic-workspace-current').replace(/[^a-z0-9-]/gi,'-');
const screenshot=fileURLToPath(new URL(`${captureName}.png`,artifacts));
const profile=fileURLToPath(new URL(`${captureName}-profile/`,artifacts));
const url=process.argv[2]||'http://127.0.0.1:4179/tests/preview.html?stage=guest&lang=en&width=1440';
const virtualTime=Number(process.argv[4])||5000;
const exitCode=await new Promise((resolve,reject)=>{
 const browser=spawn(process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--disable-gpu','--disable-cache','--no-first-run','--no-default-browser-check','--disable-background-networking',`--user-data-dir=${profile}`,`--screenshot=${screenshot}`,`--virtual-time-budget=${virtualTime}`,'--window-size=1440,960',url],{windowsHide:true,stdio:['ignore','ignore','pipe']});
 let errors='';browser.stderr.on('data',data=>errors+=data);browser.on('error',reject);browser.on('close',code=>{if(code)reject(Error(errors||`Chrome exited ${code}`));else resolve(code);});
});
const image=await stat(screenshot);
console.log(`Captured ${url}: ${image.size} bytes`);
process.exitCode=exitCode;
