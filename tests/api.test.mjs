import test from 'node:test';
import assert from 'node:assert/strict';
const origin='http://127.0.0.1:5173';
const auth={'Cookie':'__sites_local_auth=1','Content-Type':'application/json','Origin':origin};
const get=async()=>{const r=await fetch(origin+'/api/state',{headers:auth});assert.equal(r.status,200);return r.json();};
const post=async(action,revision,headers=auth)=>{const r=await fetch(origin+'/api/state',{method:'POST',headers,body:JSON.stringify({revision,action})});const raw=await r.text();let data;try{data=JSON.parse(raw);}catch{data={error:raw};}return {status:r.status,...data};};
test('API: 미인증 읽기·쓰기 차단',async()=>{assert.equal((await fetch(origin+'/api/state')).status,401);assert.equal((await post({type:'stock',materialId:'m1',qty:1},0,{'Content-Type':'application/json'})).status,401);});
test('API: 다른 출처의 변경 요청 차단',async()=>{const x=await get();const r=await post({type:'stock',materialId:'m1',qty:1},x.revision,{...auth,Origin:'https://invalid.example'});assert.equal(r.status,403);});
test('API: 미승인 추가 작업 완료 차단, 상태·버전 보존',async()=>{const x=await get();const r=await post({type:'complete',jobId:'PN-1024',notes:'검증'},x.revision);assert.equal(r.status,400);assert.match(r.error,/승인되지 않은/);assert.equal((await get()).revision,x.revision);});
test('API: 중복 자재 예약 차단',async()=>{const x=await get();const r=await post({type:'reserve',jobId:'PN-1025',materialId:'m1',qty:1},x.revision);assert.equal(r.status,400);assert.match(r.error,/이미 예약/);});
test('API: 일정 충돌 차단',async()=>{const x=await get();const r=await post({type:'assign',jobId:'PN-1025',team:'1팀 · 김반장',start:'2026-11-02T10:00',end:'2026-11-02T12:00'},x.revision);assert.equal(r.status,400);assert.match(r.error,/일정 충돌/);});
test('API: 청구 누락 정산 차단',async()=>{const x=await get();const r=await post({type:'payment',jobId:'PN-1026',amount:1200000},x.revision);assert.equal(r.status,400);assert.match(r.error,/청구 누락/);});
test('API: 동시 요청 2개 중 1개만 저장, 나머지 409',async()=>{const x=await get(),qty=x.state.materials[1].stock;const results=await Promise.all([post({type:'stock',materialId:'m2',qty:1},x.revision),post({type:'stock',materialId:'m2',qty:1},x.revision)]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);const next=await get();assert.equal(next.revision,x.revision+1);assert.equal(next.state.materials[1].stock,qty+1);});
test('API: 오래된 화면의 저장 차단 및 최신 데이터 반환',async()=>{const x=await get();const r=await post({type:'stock',materialId:'m2',qty:1},x.revision-1);assert.equal(r.status,409);assert.equal(r.revision,x.revision);assert.deepEqual(r.state,x.state);});
test('API: 저장된 전체 업무 흐름 재조회 검증',async()=>{
 let x=await get();const send=async(a)=>{const r=await post(a,x.revision);assert.equal(r.status,200,r.error);x=r;};
 await send({type:'create',customer:'API 검증 '+Date.now(),phone:'010-0000-0000',address:'가상 주소',title:'급수관 교체'});const jobId=x.state.jobs[0].id;
 await send({type:'survey',jobId,notes:'누수 확인'});await send({type:'quote',jobId,amount:100000});await send({type:'approve',jobId,name:'검증 고객',evidence:'테스트 승인'});
 await send({type:'assign',jobId,team:x.state.teams[2],start:'2026-11-15T09:00',end:'2026-11-15T12:00'});
 await send({type:'reserve',jobId,materialId:'m3',qty:4});await send({type:'start',jobId});await send({type:'extra',jobId,title:'밸브 추가',amount:30000});
 await send({type:'approveExtra',jobId,extraId:x.state.jobs[0].extras[0].id,name:'검증 고객',evidence:'테스트 추가 승인'});
 const reservationId=x.state.reservations.find(r=>r.jobId===jobId).id;await send({type:'consume',jobId,reservationId,qty:2});await send({type:'complete',jobId,notes:'통수 시험 및 고객 검수'});await send({type:'invoice',jobId});await send({type:'payment',jobId,amount:130000});
 const saved=await get(),j=saved.state.jobs.find(j=>j.id===jobId);assert.equal(j.stage,6);assert.equal(j.paid,130000);assert.equal(j.invoice.lines.length,2);assert.equal(saved.state.reservations.find(r=>r.id===reservationId).released,true);assert.equal(saved.state.log.filter(l=>l.jobId===jobId).length,13);
});

