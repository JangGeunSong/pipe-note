export type Approval={name:string;evidence:string;at:string;version:number};
export type Extra={id:string;title:string;amount:number;approval?:Approval};
export type Line={key:string;title:string;amount:number};
export type Job={id:string;customer:string;phone:string;address:string;title:string;priority:string;stage:number;survey:string;quote:number;quoteVersion:number;approval?:Approval;extras:Extra[];team?:string;start?:string;end?:string;completion?:string;invoice?:{number:string;lines:Line[];at:string};paid:number};
export type Material={id:string;name:string;spec:string;unit:string;stock:number;cost:number};
export type Reservation={id:string;jobId:string;materialId:string;qty:number;used:number;released:boolean};
export type State={jobs:Job[];materials:Material[];reservations:Reservation[];teams:string[];log:{at:string;jobId:string;text:string;actor:string}[];demo:boolean};
export type Action={type:string;jobId?:string;[key:string]:unknown};
export type Risk={key:string;type:string;title:string;detail:string;jobIds:string[];amount?:number};
export const stages=['문의 접수','현장 확인','견적 · 승인','작업 배정','작업 진행','완료 · 청구','정산 완료'];
export const money=(n:number)=>new Intl.NumberFormat('ko-KR').format(n)+'원';
const fail=(s:string):never=>{throw new Error(s);};
const text=(v:unknown,label:string,max=1000)=>typeof v==='string'&&v.trim()&&v.trim().length<=max?v.trim():fail(`${label}을(를) 입력해 주세요. (최대 ${max}자)`);
const number=(v:unknown,label:string,min=0)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=1000000000?v:fail(`${label}은(는) ${min} 이상의 정수여야 합니다.`);
export const overlap=(a:string,b:string,c:string,d:string)=>a<d&&c<b;
export const reserved=(s:State,mid:string)=>s.reservations.filter(r=>r.materialId===mid&&!r.released).reduce((n,r)=>n+r.qty-r.used,0);
export function billable(j:Job):Line[]{return [{key:'base',title:'기본 공사 · '+j.title,amount:j.quote},...j.extras.filter(x=>x.approval).map(x=>({key:x.id,title:x.title,amount:x.amount}))];}
export const total=(j:Job)=>billable(j).reduce((n,l)=>n+l.amount,0);
export function risks(s:State):Risk[]{
 const out:Risk[]=[];
 for(const j of s.jobs){
  const missing=j.extras.filter(x=>!x.approval);
  if(missing.length)out.push({key:'approval-'+j.id,type:'승인',title:'추가 작업 승인 누락',detail:`${j.customer} · ${missing.map(x=>x.title).join(', ')}`,jobIds:[j.id],amount:missing.reduce((n,x)=>n+x.amount,0)});
  if(j.stage>=3&&(!j.approval||j.approval.version!==j.quoteVersion))out.push({key:'quote-'+j.id,type:'승인',title:'최신 견적 승인 필요',detail:j.customer,jobIds:[j.id]});
  if(j.stage>=5){const lines=billable(j).filter(l=>!j.invoice?.lines.some(i=>i.key===l.key&&i.amount===l.amount));if(lines.length)out.push({key:'billing-'+j.id,type:'청구',title:j.invoice?'청구 항목 누락':'완료 현장 미청구',detail:`${j.customer} · ${lines.map(l=>l.title).join(', ')}`,jobIds:[j.id],amount:lines.reduce((n,l)=>n+l.amount,0)});}
 }
 for(const m of s.materials){const n=reserved(s,m.id);if(n>m.stock)out.push({key:'stock-'+m.id,type:'자재',title:'자재 중복 · 초과 예약',detail:`${m.name} · 재고 ${m.stock}${m.unit} / 예약 ${n}${m.unit}`,jobIds:[...new Set(s.reservations.filter(r=>r.materialId===m.id&&!r.released&&r.qty>r.used).map(r=>r.jobId))]});}
 for(let a=0;a<s.jobs.length;a++)for(let b=a+1;b<s.jobs.length;b++){const x=s.jobs[a],y=s.jobs[b];if(x.team&&x.team===y.team&&x.start&&x.end&&y.start&&y.end&&x.stage<5&&y.stage<5&&overlap(x.start,x.end,y.start,y.end))out.push({key:'schedule-'+x.id+y.id,type:'일정',title:'작업팀 일정 충돌',detail:`${x.team} · ${x.customer} ↔ ${y.customer}`,jobIds:[x.id,y.id]});}
 return out;
}
export function emptyState():State{return {jobs:[],materials:[{id:'m1',name:'PB 배관 15A',spec:'냉·온수용 / 1m',unit:'m',stock:30,cost:3500},{id:'m2',name:'황동 볼밸브 20A',spec:'나사식 / KS 규격',unit:'개',stock:12,cost:12000},{id:'m3',name:'PVC 엘보 50A',spec:'배수관 연결용',unit:'개',stock:40,cost:1800}],reservations:[],teams:['1팀 · 김반장','2팀 · 박기사','3팀 · 이기사'],log:[],demo:false};}
export function seed():State{
 const s=emptyState();s.demo=true;const ap:Approval={name:'고객 담당자 (예시)',evidence:'예시 데이터 · 전화 승인 기록',at:'2026-11-01T09:00:00+09:00',version:1};
 const make=(id:string,customer:string,title:string,stage:number,quote:number):Job=>({id,customer,title,stage,quote,quoteVersion:1,phone:'010-0000-0000',address:'서울시 마포구 · 예시 주소',priority:'일반',survey:stage>1?'누수 위치 확인 및 배관 상태 점검 완료':'',approval:stage>=3?{...ap}:undefined,extras:[],paid:0});
 s.jobs=[make('PN-1024','연남동 한빛빌라','공용 배관 누수 보수',4,850000),make('PN-1025','서교동 온유카페','주방 급수관 교체',3,640000),make('PN-1026','합정동 리버오피스','화장실 배수관 교체',5,1200000),make('PN-1027','망원동 정다운집','보일러 분배기 점검',2,320000),make('PN-1028','상암동 미소상가','세면대 수전 교체',1,0),make('PN-1029','성산동 푸른빌라','싱크대 배수 역류',0,0),make('PN-1023','공덕동 새봄학원','급수 밸브 교체',6,440000)];
 Object.assign(s.jobs[0],{priority:'긴급',team:s.teams[0],start:'2026-11-02T09:00',end:'2026-11-02T13:00',extras:[{id:'e1',title:'노후 연결관 추가 교체',amount:180000}]});
 Object.assign(s.jobs[1],{team:s.teams[0],start:'2026-11-02T11:00',end:'2026-11-02T15:00'});
 Object.assign(s.jobs[2],{team:s.teams[1],start:'2026-11-01T09:00',end:'2026-11-01T12:00',completion:'통수 및 누수 시험 완료',extras:[{id:'e2',title:'트랩 추가 교체',amount:90000,approval:{...ap}}],invoice:{number:'INV-1026',at:ap.at,lines:[{key:'base',title:'기본 공사',amount:1200000}]}});
 s.jobs[6].invoice={number:'INV-1023',at:ap.at,lines:billable(s.jobs[6])};s.jobs[6].paid=440000;s.jobs[6].completion='고객 검수 완료';s.materials[0].stock=10;
 s.reservations=[{id:'r1',jobId:'PN-1024',materialId:'m1',qty:8,used:0,released:false},{id:'r2',jobId:'PN-1025',materialId:'m1',qty:6,used:0,released:false}];
 s.log=[{at:ap.at,jobId:'SYSTEM',text:'가상 현장 7건을 불러왔습니다. 네 가지 위험을 점검해 보세요.',actor:'시스템'}];return s;
}
export function apply(state:State,a:Action,actor='관리자',at=new Date().toISOString()):State{
 const s:State=structuredClone(state);const id=()=>crypto.randomUUID();
 if(a.type==='create'){const j:Job={id:'PN-'+id().slice(0,8).toUpperCase(),customer:text(a.customer,'고객명',80),title:text(a.title,'작업 내용',120),phone:text(a.phone,'연락처',40),address:text(a.address,'현장 주소',200),priority:a.priority==='긴급'?'긴급':'일반',stage:0,survey:'',quote:0,quoteVersion:0,extras:[],paid:0};s.jobs.unshift(j);s.log.unshift({at,jobId:j.id,text:'새 문의 접수',actor});return s;}
 if(a.type==='stock'){const m=s.materials.find(m=>m.id===a.materialId)??fail('자재를 찾을 수 없습니다.');m.stock+=number(a.qty,'입고 수량',1);s.log.unshift({at,jobId:'STOCK',text:`${m.name} ${a.qty}${m.unit} 입고`,actor});return s;}
 const j=s.jobs.find(j=>j.id===a.jobId)??fail('현장을 찾을 수 없습니다.');if(j.stage===6)fail('정산 완료 현장은 변경할 수 없습니다.');let message='';
 const approved=()=>{if(!j.approval||j.approval.version!==j.quoteVersion)fail('최신 견적의 고객 승인을 먼저 기록해 주세요.');};
 const extraApproved=()=>{if(j.extras.some(x=>!x.approval))fail('승인되지 않은 추가 작업이 있습니다. 고객 승인 후 진행해 주세요.');};
 const approval=():Approval=>({name:text(a.name,'승인자',80),evidence:text(a.evidence,'승인 근거',500),at,version:j.quoteVersion});
 switch(a.type){
 case 'survey':if(j.stage>2)fail('작업 배정 전 현장에서만 현장 확인을 수정할 수 있습니다.');j.survey=text(a.notes,'현장 확인 내용');j.stage=Math.max(j.stage,1);message='현장 확인 기록';break;
 case 'quote':if(!j.survey)fail('현장 확인 내용을 먼저 기록해 주세요.');if(j.stage>2)fail('배정 이후 금액 변경은 추가 작업으로 등록해 주세요.');j.quote=number(a.amount,'견적 금액',1);j.quoteVersion++;delete j.approval;j.stage=2;message=`견적 v${j.quoteVersion} 저장 · 기존 승인 초기화`;break;
 case 'approve':if(j.stage!==2||!j.quote)fail('견적 저장 후 승인을 기록해 주세요.');j.approval=approval();message=`견적 v${j.quoteVersion} 고객 승인 기록`;break;
 case 'assign':{approved();if(j.stage>=5)fail('완료된 작업의 일정은 변경할 수 없습니다.');const start=text(a.start,'시작 시간'),end=text(a.end,'종료 시간'),team=text(a.team,'작업팀');if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(start)||!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(end)||Number.isNaN(Date.parse(start))||Number.isNaN(Date.parse(end))||start>=end)fail('올바른 시작·종료 시간을 입력해 주세요.');if(!s.teams.includes(team))fail('등록된 작업팀을 선택해 주세요.');const conflict=s.jobs.find(x=>x.id!==j.id&&x.team===team&&x.stage<5&&x.start&&x.end&&overlap(start,end,x.start,x.end));if(conflict)fail(`일정 충돌: ${team}은(는) ${conflict.customer}에 이미 배정되어 있습니다.`);Object.assign(j,{start,end,team,stage:Math.max(j.stage,3)});message='작업팀 · 일정 배정';break;}
 case 'start':approved();extraApproved();if(j.stage!==3)fail('작업 배정 후 시작할 수 있습니다.');if(risks(s).some(r=>r.jobIds.includes(j.id)&&['일정','자재'].includes(r.type)))fail('일정·자재 충돌을 해결한 뒤 작업을 시작해 주세요.');j.stage=4;message='현장 작업 시작';break;
 case 'extra':if(j.stage<2||j.stage>=5)fail('견적 이후부터 작업 완료 전까지 추가 작업을 등록할 수 있습니다.');j.extras.push({id:id(),title:text(a.title,'추가 작업명',120),amount:number(a.amount,'추가 금액',1)});message='추가 작업 등록 · 고객 승인 대기';break;
 case 'approveExtra':{const e=j.extras.find(x=>x.id===a.extraId)??fail('추가 작업을 찾을 수 없습니다.');if(e.approval)fail('이미 승인된 추가 작업입니다.');e.approval=approval();message=`추가 작업 승인 기록 · ${e.title}`;break;}
 case 'reserve':{approved();if(j.stage<3||j.stage>=5)fail('배정 또는 진행 중 현장에서 자재를 예약할 수 있습니다.');const m=s.materials.find(m=>m.id===a.materialId)??fail('자재를 찾을 수 없습니다.');const qty=number(a.qty,'예약 수량',1);if(s.reservations.some(r=>r.jobId===j.id&&r.materialId===m.id&&!r.released))fail('이 현장에 이미 예약된 자재입니다. 기존 예약을 해제하고 다시 예약해 주세요.');if(reserved(s,m.id)+qty>m.stock)fail(`재고 부족: 예약 가능한 ${m.name}은(는) ${Math.max(0,m.stock-reserved(s,m.id))}${m.unit}입니다.`);s.reservations.push({id:id(),jobId:j.id,materialId:m.id,qty,used:0,released:false});message=`${m.name} ${qty}${m.unit} 예약`;break;}
 case 'release':{const r=s.reservations.find(r=>r.id===a.reservationId&&r.jobId===j.id&&!r.released)??fail('유효한 예약을 찾을 수 없습니다.');r.released=true;message='미사용 자재 예약 해제';break;}
 case 'consume':{if(j.stage!==4)fail('작업 진행 중에 자재를 사용할 수 있습니다.');extraApproved();const r=s.reservations.find(r=>r.id===a.reservationId&&r.jobId===j.id&&!r.released)??fail('유효한 예약을 찾을 수 없습니다.');const qty=number(a.qty,'사용 수량',1);const m=s.materials.find(m=>m.id===r.materialId)!;if(reserved(s,m.id)>m.stock)fail('자재 초과 예약을 먼저 해결해 주세요.');if(qty>r.qty-r.used||qty>m.stock)fail('사용 수량이 예약 잔량 또는 재고를 초과합니다.');r.used+=qty;m.stock-=qty;message=`${m.name} ${qty}${m.unit} 사용`;break;}
 case 'complete':approved();extraApproved();if(j.stage!==4)fail('진행 중 작업만 완료할 수 있습니다.');if(risks(s).some(r=>r.jobIds.includes(j.id)&&['일정','자재'].includes(r.type)))fail('현장의 일정·자재 충돌을 먼저 해결해 주세요.');j.completion=text(a.notes,'완료 · 검수 내용');j.stage=5;s.reservations.filter(r=>r.jobId===j.id).forEach(r=>r.released=true);message='작업 완료 · 잔여 예약 해제 · 청구 대기';break;
 case 'invoice':approved();extraApproved();if(j.stage!==5)fail('작업 완료 후 청구서를 만들 수 있습니다.');j.invoice={number:j.invoice?.number??'INV-'+id().slice(0,8).toUpperCase(),lines:billable(j),at};message='기본 · 승인된 추가 작업을 포함한 청구서 저장';break;
 case 'payment':{if(j.stage!==5||!j.invoice)fail('청구서를 먼저 만들어 주세요.');if(risks(s).some(r=>r.jobIds.includes(j.id)&&['승인','청구'].includes(r.type)))fail('승인·청구 누락을 해결한 뒤 입금 및 정산을 처리해 주세요.');const n=number(a.amount,'입금액',1);if(n>total(j)-j.paid)fail('입금액이 미수 잔액을 초과합니다.');j.paid+=n;if(j.paid===total(j))j.stage=6;message=`${money(n)} 입금 기록${j.stage===6?' · 정산 완료':''}`;break;}
 default:fail('지원하지 않는 작업입니다.');
 }
 s.log.unshift({at,jobId:j.id,text:message,actor});return s;
}
