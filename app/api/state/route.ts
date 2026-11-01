import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { apply, seed } from '../../../lib/domain';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function read(owner:string){const db=env.DB!;let row=await db.prepare('SELECT revision, data FROM workspaces WHERE owner = ?').bind(owner).first<{revision:number;data:string}>();if(!row){await db.prepare('INSERT OR IGNORE INTO workspaces (owner, revision, data) VALUES (?, 0, ?)').bind(owner,JSON.stringify(seed())).run();row=await db.prepare('SELECT revision, data FROM workspaces WHERE owner = ?').bind(owner).first<{revision:number;data:string}>();}return {revision:row!.revision,state:JSON.parse(row!.data)};}
export async function GET(){const user=await getChatGPTUser();if(!user)return json({error:'로그인이 필요합니다.'},401);try{return json(await read(user.userId));}catch{return json({error:'데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'},503);}}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return json({error:'로그인이 필요합니다.'},401);
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'허용되지 않은 요청입니다.'},403);
 let body;try{const raw=await request.text();if(raw.length>16000)return json({error:'입력 내용이 너무 큽니다.'},413);body=JSON.parse(raw);}catch{return json({error:'잘못된 요청입니다.'},400);}
 try{const current=await read(user.userId);if(body.revision!==current.revision)return json({error:'다른 화면에서 변경되었습니다. 최신 내용을 불러왔습니다. 확인 후 다시 시도해 주세요.',...current},409);const state=apply(current.state,body.action,user.displayName);const result=await env.DB!.prepare('UPDATE workspaces SET data = ?, revision = revision + 1 WHERE owner = ? AND revision = ?').bind(JSON.stringify(state),user.userId,current.revision).run();if(result.meta.changes!==1)return json({error:'동시 변경이 감지되었습니다. 최신 내용을 확인 후 다시 시도해 주세요.',...await read(user.userId)},409);return json({state,revision:current.revision+1});}catch(e){return json({error:e instanceof Error?e.message:'저장에 실패했습니다.'},400);}
}
