'use strict';
/* LPU Library Seat Booking System - frontend demo (LocalStorage only).
   All data access goes through load()/save()/DB so a backend API can replace them later. */
const K='lpu_lib_v1',SK='lpu_lib_session',$=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const ds=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today=()=>ds(new Date());
const addDays=(s,n)=>{const d=new Date(s+'T00:00');d.setDate(d.getDate()+n);return ds(d)};
const fmt=m=>`${Math.floor(m/60)%24%12||12}:${pad(m%60)} ${Math.floor(m/60)%24<12?'AM':'PM'}`;
const dur=m=>`${Math.floor(m/60)}h${m%60?' '+m%60+'m':''}`;
const nice=s=>new Date(s+'T00:00').toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
const nowMin=()=>{const d=new Date();return d.getHours()*60+d.getMinutes()};
const tsOf=(b,m)=>new Date(b.date+'T00:00').getTime()+m*60000;
const stars=n=>'★'.repeat(Math.round(n))+'☆'.repeat(5-Math.round(n));
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
const genId=(p,list)=>{let id;do id=p+Math.random().toString(36).slice(2,8).toUpperCase();while(list.some(b=>b.id===id));return id};

/* ---------- data ---------- */
function seed(){
 const cats=[
  {id:'reading',name:'Reading Hall',type:'seat',pre:'RH',count:60,cols:10,img:'reading-hall.jpg',on:true,off:['RH-07'],desc:'Long shared tables for focused individual reading.'},
  {id:'digital',name:'Digital Library',type:'seat',pre:'DL',count:40,cols:8,img:'digital-library.jpg',on:true,off:[],desc:'Computer workstations with e-resource access.'},
  {id:'quiet',name:'Quiet Study Area',type:'seat',pre:'QS',count:30,cols:10,img:'quiet-study.jpg',on:true,off:[],desc:'Partitioned desks with power sockets. Strict silence.'},
  {id:'group',name:'Group Discussion Area',type:'table',pre:'GD',count:8,cols:4,img:'group-discussion.jpg',on:true,off:[],desc:'Each table is booked whole for exactly 4 students.'}];
 const mkU=(id,name,course)=>({id,name,course,email:name.split(' ')[0].toLowerCase()+'@lpu.demo',pass:'student123',blocked:false,joined:today()});
 const users=[mkU('12345678','Aman Verma','B.Tech CSE'),mkU('12345679','Simran Kaur','B.Tech ECE'),mkU('12345680','Rohit Sharma','BCA'),mkU('12345681','Neha Gupta','B.Tech CSE')];
 const t=today(),bookings=[],A=(uid,cat,unit,d,s,e,st)=>{const g=cat==='group';bookings.push({id:genId(g?'GRP-':'LPU-',bookings),uid,cat,unit,seats:g?[1,2,3,4].map(i=>unit+'-S'+i):[unit],date:d,start:s*60,end:e*60,status:st||'confirmed',created:Date.now()})};
 A('12345679','reading','RH-03',t,10,13);A('12345680','digital','DL-05',t,15,18);A('12345681','group','GD-T02',t,18,21);bookings[bookings.length-1].members=[3,0,1,2].map(i=>({name:users[i].name,id:users[i].id,course:users[i].course}));
 A('12345679','quiet','QS-04',addDays(t,1),9,12);A('12345678','reading','RH-20',addDays(t,1),14,16);
 A('12345678','reading','RH-12',addDays(t,-1),10,13);A('12345678','digital','DL-02',addDays(t,-2),14,17);
 A('12345678','quiet','QS-09',addDays(t,-3),18,22);A('12345678','reading','RH-15',addDays(t,-4),9,11,'cancelled');
 A('12345680','reading','RH-30',addDays(t,-2),11,14);A('12345681','digital','DL-11',addDays(t,-5),16,20);
 const fb=(uid,r,text,o)=>({id:genId('FB-',[]),uid,date:addDays(t,o),r,text});
 return{v:1,admin:{user:'admin',pass:'admin123'},hours:{open:540,close:1440},cats,users,bookings,
  feedback:[fb('12345678',{overall:5,clean:4,comfort:4,net:3,noise:5},'Quiet study area is great. Wi-Fi is slow near the Reading Hall.',-2),
   fb('12345681',{overall:4,clean:5,comfort:5,net:4,noise:3},'Group rooms are useful. Please add more whiteboards.',-4)]};
}
function load(){try{const d=JSON.parse(localStorage.getItem(K));if(d&&d.v===1)return d}catch(e){}const d=seed();try{localStorage.setItem(K,JSON.stringify(d))}catch(e){}return d}
let DB=load();
function save(){try{localStorage.setItem(K,JSON.stringify(DB))}catch(e){toast('Could not save: browser storage is full or blocked.','err')}if(window.FB)window.FB.push(DB)}
/* Firebase hooks (see firebase.js): optional cloud sync of the whole DB */
window.getLocalDB=()=>DB;
window.onRemoteDB=d=>{if(!d||d.v!==1)return;DB=d;try{localStorage.setItem(K,JSON.stringify(d))}catch(e){}if(!/INPUT|TEXTAREA|SELECT/.test((document.activeElement||{}).tagName||''))route()};
let ses=null;try{ses=JSON.parse(localStorage.getItem(SK))}catch(e){}
const cat=id=>DB.cats.find(c=>c.id===id),me=()=>DB.users.find(u=>u.id===ses.id);
const unitsOf=c=>[...Array(c.count)].map((_,i)=>c.type==='table'?`${c.pre}-T${pad(i+1)}`:`${c.pre}-${pad(i+1)}`);
const mins=b=>b.end-b.start,live=b=>b.status==='confirmed',done=b=>live(b)&&tsOf(b,b.end)<=Date.now();
const upcoming=b=>live(b)&&tsOf(b,b.end)>Date.now(),byStart=(a,b)=>tsOf(a,a.start)-tsOf(b,b.start);
const label=b=>b.status==='cancelled'?'<span class="tag x">Cancelled</span>':done(b)?'<span class="tag d">Completed</span>':'<span class="tag">Confirmed</span>';

/* ---------- ui helpers ---------- */
let tt;function toast(m,t='ok'){const e=$('#toast');e.textContent=m;e.className='show '+t;clearTimeout(tt);tt=setTimeout(()=>e.className='',3800)}
const modal=h=>{$('#modal').innerHTML=h?`<div class="box" role="dialog" aria-modal="true">${h}</div>`:''};
const go=h=>{if(location.hash===h)route();else location.hash=h};
const NAV={s:[['dash','Dashboard'],['book','Book a seat'],['mine','My bookings'],['hist','Booking history'],['stats','Study hours'],['fb','Feedback']],
 a:[['dash','Overview'],['students','Students'],['cats','Categories & seats'],['bookings','Bookings'],['hours','Library timings'],['fb','Feedback'],['reports','Reports']]};
function shell(role,page,body){
 return `<div class="lay"><aside class="side"><div class="brand"><b>LPU</b><span>Library Seat Booking</span></div><nav>${NAV[role].map(([k,l])=>`<a href="#/${role}/${k}" class="${k===page?'on':''}">${l}</a>`).join('')}</nav><button class="btn out ghost" data-act="logout">Log out</button></aside><main><header class="top"><h1>${NAV[role].find(n=>n[0]===page)[1]}</h1><span class="who">${role==='s'?esc(me().name)+' · '+me().id:'Administrator'}</span></header>${body}</main></div>`}
const stat=(n,l)=>`<div class="stat"><b>${n}</b><span>${l}</span></div>`;
const bars=(rows,max,unit='')=>rows.map(([l,v])=>`<div class="br"><span>${esc(l)}</span><div class="bar"><i style="width:${max?Math.round(v/max*100):0}%"></i></div><b>${Math.round(v*10)/10}${unit}</b></div>`).join('');
const options=(arr,sel)=>arr.map(([v,l])=>`<option value="${v}" ${v==sel?'selected':''}>${l}</option>`).join('');
const slots=(a,b)=>{const r=[];for(let m=a;m<=b;m+=30)r.push([m,fmt(m)]);return r};

/* ---------- booking state ---------- */
let B=null;
function initB(){const o=DB.hours.open,c=DB.hours.close;let d=today(),s=Math.max(o,Math.ceil((nowMin()+1)/30)*30);if(s>c-30){d=addDays(d,1);s=o}
 B={date:d,cat:(DB.cats.find(x=>x.on)||DB.cats[0]).id,s,e:Math.min(s+120,c),sel:null,err:[]}}
function normB(){const o=DB.hours.open,c=DB.hours.close;if(B.s<o)B.s=o;if(B.s>c-30)B.s=c-30;if(B.e<=B.s)B.e=Math.min(B.s+60,c);if(B.e>c)B.e=c}
const clash=(c,u)=>DB.bookings.find(b=>live(b)&&b.cat===c.id&&b.unit===u&&b.date===B.date&&b.start<B.e&&B.s<b.end);
function mapHtml(c,admin){
 return `<div class="map" style="grid-template-columns:repeat(${c.cols},minmax(0,1fr))">${unitsOf(c).map(u=>{
  const off=c.off.includes(u),k=admin?null:clash(c,u);
  const st=off?'off':admin?'free':k?(k.uid===ses.id?'mine':'busy'):B.sel===u?'sel':'free';
  const tip=off?'Out of service':k?'Booked for this time':'Available';
  const dis=!admin&&(off||k)?'disabled':'';
  const num=u.split('-').pop();
  return c.type==='table'?`<button class="tbl ${st}" ${dis} data-act="${admin?'toggle':'sel'}" data-u="${u}" title="${tip}"><b>Table ${num.slice(1)}</b><span class="ch"><u></u><u></u><u></u><u></u></span><small>4 seats</small></button>`
  :`<button class="seat ${st}" ${dis} data-act="${admin?'toggle':'sel'}" data-u="${u}" title="${u}: ${tip}">${num}</button>`}).join('')}</div>`}
const legend=a=>`<div class="legend">${a?'':'<span><i class="i-free"></i>Available</span><span><i class="i-sel"></i>Selected</span><span><i class="i-mine"></i>Your booking</span><span><i class="i-busy"></i>Booked</span>'}<span><i class="i-off"></i>Out of service${a?' (click a seat or table to toggle)':''}</span></div>`;

/* ---------- booking actions ---------- */
function confirmBook(){
 const c=cat(B.cat),u=me(),er=[],H=DB.hours;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(B.date)||isNaN(new Date(B.date+'T00:00')))er.push('Choose a valid booking date.');
 else{if(B.date<today())er.push('Past dates cannot be booked.');
  else if(B.date>addDays(today(),30))er.push('Bookings open up to 30 days ahead.');
  else if(B.date===today()&&B.s<=nowMin())er.push('The start time has already passed. Pick a later start.')}
 if(B.s<H.open||B.e>H.close)er.push(`The library is open ${fmt(H.open)} to ${fmt(H.close)}. Pick a time inside those hours.`);
 if(B.e<=B.s)er.push('End time must be after the start time.');
 if(!c.on)er.push('This category is closed for booking.');
 if(!B.sel)er.push(c.type==='table'?'Select a table on the map.':'Select a seat on the map.');
 else{if(c.off.includes(B.sel))er.push('That unit is out of service.');
  if(clash(c,B.sel))er.push('That unit was just booked for an overlapping time. Choose another.')}
 const busy=id=>DB.bookings.some(b=>live(b)&&b.date===B.date&&b.start<B.e&&B.s<b.end&&(b.uid===id||(b.members||[]).some(x=>x.id===id)));
 if(busy(u.id))er.push('You already have a booking that overlaps this time.');
 if(c.type==='table'){const M=B.mem||[],seen=[];
  M.forEach((m,i)=>{const n=i+1,id=(m.id||'').trim(),nm=(m.name||'').trim();
   if(!/^\d{8}$/.test(id))return er.push(`Member ${n}: registration number must be 8 digits.`);
   if(seen.includes(id))er.push(`Member ${n}: registration number ${id} is repeated. Each member must be different.`);seen.push(id);
   const r=DB.users.find(x=>x.id===id);
   if(!r)er.push(`Member ${n}: ${id} is not a registered student.`);else if(r.blocked)er.push(`Member ${n}: ${id} is blocked from booking.`);
   if(nm.length<3)er.push(`Member ${n}: enter the full name.`);
   if(i&&busy(id))er.push(`Member ${n} (${id}) already has a booking at this time.`)});
  if(M.length!==4)er.push('A group booking needs exactly 4 members.')}
 B.err=er;if(er.length){route();return}
 const g=c.type==='table',b={id:genId(g?'GRP-':'LPU-',DB.bookings),uid:u.id,cat:c.id,unit:B.sel,seats:g?[1,2,3,4].map(i=>B.sel+'-S'+i):[B.sel],date:B.date,start:B.s,end:B.e,status:'confirmed',created:Date.now()};
 if(g)b.members=B.mem.map(m=>({name:m.name.trim(),id:m.id.trim(),course:(m.course||'').trim()}));
 DB.bookings.push(b);save();B.sel=null;B.mem=null;toast('Booking confirmed: '+b.id);route();modal(receipt(b))}
function cancelBook(id,admin){const b=DB.bookings.find(x=>x.id===id);if(!b||!upcoming(b))return;
 if(!confirm(`Cancel booking ${id}?`))return;b.status='cancelled';b.by=admin?'admin':'student';save();toast('Booking '+id+' cancelled.');route()}
function receipt(b){const c=cat(b.cat),u=DB.users.find(x=>x.id===b.uid)||{name:'?',id:b.uid};
 return `<h2>Booking receipt</h2><div class="rc"><div class="id">${b.id}</div><dl><dt>Student</dt><dd>${esc(u.name)} (${u.id})</dd><dt>Category</dt><dd>${esc(c.name)}</dd><dt>${c.type==='table'?'Table':'Seat'}</dt><dd>${b.unit}</dd>${c.type==='table'?`<dt>Reserved seats</dt><dd>${b.seats.join(', ')}</dd><dt>Group members</dt><dd>${(b.members||[]).map((m,i)=>`${i+1}. ${esc(m.name)} (${m.id})`).join('<br>')||'Not recorded'}</dd>`:''}<dt>Date</dt><dd>${nice(b.date)}</dd><dt>Time</dt><dd>${fmt(b.start)} – ${fmt(b.end)}</dd><dt>Duration</dt><dd>${dur(mins(b))}</dd><dt>Status</dt><dd>${b.status}</dd><dt>Booked on</dt><dd>${new Date(b.created).toLocaleString('en-IN')}</dd></dl></div><p class="err" style="color:var(--mute)">Demo receipt from a frontend project. Show your booking ID at the library desk.</p><div class="acts noprint"><button class="btn" data-act="print">Print receipt</button><button class="btn ghost" data-act="close">Close</button></div>`}
const bkCard=(b,admin)=>{const c=cat(b.cat),u=DB.users.find(x=>x.id===b.uid);
 return `<div class="bk"><div><h3>${esc(c.name)} · ${b.unit} ${label(b)}</h3><p>${nice(b.date)} · ${fmt(b.start)} – ${fmt(b.end)} (${dur(mins(b))})</p><p>ID ${b.id}${admin&&u?' · '+esc(u.name):''}${c.type==='table'?' · seats '+b.seats.map(s=>s.split('-').pop()).join(', '):''}</p>${b.members?`<p>Members: ${b.members.map(m=>esc(m.name)+' ('+m.id+')').join(', ')}</p>`:''}</div><div class="acts"><button class="btn ghost sm" data-act="receipt" data-id="${b.id}">Receipt</button>${upcoming(b)?`<button class="btn danger sm" data-act="cancel" data-id="${b.id}">Cancel</button>`:''}</div></div>`};

/* ---------- views ---------- */
const V={s:{},a:{}},myB=()=>DB.bookings.filter(b=>b.uid===ses.id||(b.members||[]).some(m=>m.id===ses.id));
V.s.dash=()=>{const m=myB(),up=m.filter(upcoming).sort(byStart),hrs=m.filter(live).reduce((s,b)=>s+mins(b),0)/60;
 return `<div class="grid">${stat(up.length,'Upcoming bookings')}${stat(Math.round(hrs*10)/10+' h','Total hours booked')}${stat(up[0]?nice(up[0].date).split(',')[0]+', '+fmt(up[0].start):'None','Next booking')}${stat(fmt(DB.hours.open)+' – '+fmt(DB.hours.close),'Library hours today')}</div>
 <h2>Choose where to study</h2><div class="grid">${DB.cats.map(c=>`<div class="cc ${c.on?'':'off'}"><img src="${c.img}" alt="${esc(c.name)}"><div><h3>${esc(c.name)}</h3><p>${esc(c.desc)}</p>${c.on?`<button class="btn" data-act="pick" data-c="${c.id}">Book now</button>`:'<span class="tag x">Closed</span>'}</div></div>`).join('')}</div>`};
const memPanel=()=>{if(!B.mem)B.mem=[{name:me().name,id:me().id,course:me().course},{name:'',id:'',course:''},{name:'',id:'',course:''},{name:'',id:'',course:''}];
 return `<section class="panel"><h2>Group members (exactly 4 students)</h2><p style="margin-top:0;color:var(--mute)">Member 1 is you. The other three must be registered students; their name fills in from the registration number.</p>${B.mem.map((m,i)=>`<div class="row"><div class="fld"><label for="mi${i}">Member ${i+1} registration number</label><input id="mi${i}" data-m="${i}" data-k="id" value="${esc(m.id)}" ${i?'':'readonly'} inputmode="numeric" maxlength="8"></div><div class="fld"><label for="mn${i}">Name</label><input id="mn${i}" data-m="${i}" data-k="name" value="${esc(m.name)}" ${i?'':'readonly'} maxlength="40"></div><div class="fld"><label for="mc${i}">Course</label><input id="mc${i}" data-m="${i}" data-k="course" value="${esc(m.course||'')}" ${i?'':'readonly'} maxlength="40"></div></div>`).join('')}</section>`};
V.s.book=()=>{if(!B)initB();normB();const c=cat(B.cat),H=DB.hours,g=c.type==='table';
 const sum=B.sel?`${g?'Table':'Seat'} <b>${B.sel}</b> · ${nice(B.date)} · ${fmt(B.s)} – ${fmt(B.e)} · ${dur(B.e-B.s)}${g?' · all 4 seats reserved together':''}`:`Pick a ${g?'table':'seat'} below. Duration: <b>${dur(B.e-B.s)}</b>`;
 return `<section class="panel">${B.err.length?`<div class="errs" role="alert">${B.err.map(e=>`<p>${esc(e)}</p>`).join('')}</div>`:''}
 <div class="tabs">${DB.cats.filter(x=>x.on).map(x=>`<button class="tab ${x.id===B.cat?'on':''}" data-act="cat" data-c="${x.id}">${esc(x.name)}</button>`).join('')}</div>
 <div class="row"><div class="fld"><label for="bd">Date</label><input id="bd" type="date" data-b="date" value="${B.date}" min="${today()}" max="${addDays(today(),30)}"></div>
 <div class="fld"><label for="bs">Start time</label><select id="bs" data-b="s">${options(slots(H.open,H.close-30),B.s)}</select></div>
 <div class="fld"><label for="be">End time</label><select id="be" data-b="e">${options(slots(B.s+30,H.close),B.e)}</select></div></div></section>
 <section class="panel"><h2>${esc(c.name)}</h2>${legend(false)}${mapHtml(c,false)}</section>${g?memPanel():''}
 <div class="sticky"><span>${sum}</span><button class="btn" data-act="confirm">Confirm booking</button></div>`};
V.s.mine=()=>{const l=myB().filter(upcoming).sort(byStart);return l.length?l.map(b=>bkCard(b)).join(''):`<div class="empty panel">No upcoming bookings. <a href="#/s/book">Book a seat</a>.</div>`};
V.s.hist=()=>{const l=myB().filter(b=>!upcoming(b)).sort((a,b)=>byStart(b,a));return l.length?l.map(b=>bkCard(b)).join(''):`<div class="empty panel">No past bookings yet.</div>`};
V.s.stats=()=>{const m=myB().filter(live),hr=l=>l.reduce((s,b)=>s+mins(b),0)/60,d=m.filter(done),wk=addDays(today(),-6);
 const days=[...Array(7)].map((_,i)=>{const x=addDays(wk,i);return[nice(x).split(',')[0]+' '+x.slice(8),hr(m.filter(b=>b.date===x))]});
 return `<div class="grid">${stat(m.length,'Active bookings')}${stat(Math.round(hr(d)*10)/10+' h','Hours studied (completed)')}${stat(Math.round(hr(m.filter(b=>b.date>=wk&&b.date<=today()))*10)/10+' h','Last 7 days')}${stat(m.length?dur(Math.max(...m.map(mins))):'—','Longest session')}</div>
 <section class="panel"><h2>Hours booked, last 7 days</h2>${bars(days,Math.max(1,...days.map(x=>x[1])),' h')}</section>
 <section class="panel"><h2>By category</h2>${bars(DB.cats.map(c=>[c.name,hr(m.filter(b=>b.cat===c.id))]),Math.max(1,...DB.cats.map(c=>hr(m.filter(b=>b.cat===c.id)))),' h')}</section>`};
const CR=[['overall','Overall experience'],['clean','Cleanliness'],['comfort','Seating comfort'],['net','Internet facilities'],['noise','Noise level (5 = very quiet)']];
let F={};
V.s.fb=()=>{const mine=DB.feedback.filter(f=>f.uid===ses.id).reverse();
 return `<section class="panel"><form data-form="fb" novalidate>${CR.map(([k,l])=>`<div class="fld"><label>${l}</label><div class="rate">${[1,2,3,4,5].map(n=>`<button type="button" class="${F[k]===n?'on':''}" data-act="rate" data-k="${k}" data-v="${n}">${n}</button>`).join('')}</div></div>`).join('')}
 <div class="fld"><label for="ft">Written feedback and suggestions</label><textarea id="ft" name="text" maxlength="500" placeholder="What worked? What should we improve?"></textarea></div><p class="err" id="fe"></p><button class="btn">Submit feedback</button></form></section>
 ${mine.length?`<h2>Your previous feedback</h2>${mine.map(f=>`<div class="bk"><div><p>${nice(f.date)} · <span class="star">${stars(f.r.overall)}</span></p><p>${esc(f.text||'(no comment)')}</p></div></div>`).join('')}`:''}`};

/* admin */
const rangeB=(f,t)=>DB.bookings.filter(b=>live(b)&&b.date>=f&&b.date<=t);
V.a.dash=()=>{const t=today(),l=DB.bookings.filter(live),fb=DB.feedback.map(f=>f.r.overall);
 const td=DB.bookings.filter(b=>b.date===t&&live(b)).sort(byStart);
 return `<div class="grid">${stat(DB.users.length,'Registered students')}${stat(l.length,'Active bookings')}${stat(td.length,'Bookings today')}${stat(DB.bookings.length-l.length,'Cancelled')}${stat(Math.round(l.reduce((s,b)=>s+mins(b),0)/6)/10+' h','Hours booked')}${stat(fb.length?avg(fb).toFixed(1)+' / 5':'—','Average rating')}</div>
 <section class="panel"><h2>Bookings by category</h2>${bars(DB.cats.map(c=>[c.name,l.filter(b=>b.cat===c.id).length]),Math.max(1,...DB.cats.map(c=>l.filter(b=>b.cat===c.id).length)))}</section>
 <section class="panel"><h2>Today's bookings</h2>${td.length?bTable(td):'<div class="empty">No bookings today.</div>'}</section>`};
const bTable=(l,act)=>`<div class="tw"><table><tr><th>ID</th><th>Student</th><th>Category</th><th>Unit</th><th>Date</th><th>Time</th><th>Status</th>${act?'<th></th>':''}</tr>${l.map(b=>{const u=DB.users.find(x=>x.id===b.uid);return `<tr><td>${b.id}</td><td>${u?esc(u.name):b.uid}</td><td>${esc(cat(b.cat).name)}</td><td>${b.unit}${b.members?'<br><small>'+b.members.map(m=>esc(m.name)).join(', ')+'</small>':''}</td><td>${nice(b.date)}</td><td>${fmt(b.start)}–${fmt(b.end)}</td><td>${label(b)}</td>${act?`<td>${upcoming(b)?`<button class="btn danger sm" data-act="acancel" data-id="${b.id}">Cancel</button>`:''}</td>`:''}</tr>`}).join('')}</table></div>`;
let AF={q:'',st:'all',cat:'all',date:'',ac:'reading'};
V.a.students=()=>{const q=AF.q.toLowerCase(),l=DB.users.filter(u=>!q||(u.name+u.id+u.email).toLowerCase().includes(q));
 return `<section class="panel"><div class="fld"><label for="sq">Search by name, registration number or email</label><input id="sq" data-f="q" value="${esc(AF.q)}" placeholder="Type and press Enter"></div><div class="tw"><table><tr><th>Reg. no.</th><th>Name</th><th>Course</th><th>Email</th><th>Bookings</th><th>Status</th><th></th></tr>${l.map(u=>`<tr><td>${u.id}</td><td>${esc(u.name)}</td><td>${esc(u.course)}</td><td>${esc(u.email)}</td><td>${DB.bookings.filter(b=>b.uid===u.id&&live(b)).length}</td><td>${u.blocked?'<span class="tag x">Blocked</span>':'<span class="tag">Active</span>'}</td><td class="acts"><button class="btn ghost sm" data-act="block" data-id="${u.id}">${u.blocked?'Unblock':'Block'}</button><button class="btn danger sm" data-act="deluser" data-id="${u.id}">Delete</button></td></tr>`).join('')||'<tr><td colspan="7" class="empty">No students found.</td></tr>'}</table></div></section>`};
V.a.cats=()=>{const c=cat(AF.ac),n=DB.bookings.filter(b=>live(b)&&b.cat===c.id&&upcoming(b)).length;
 return `<section class="panel"><div class="tabs">${DB.cats.map(x=>`<button class="tab ${x.id===c.id?'on':''}" data-act="acat" data-c="${x.id}">${esc(x.name)}</button>`).join('')}</div>
 <form data-form="cat" novalidate><div class="row"><div class="fld"><label for="cn">Category name</label><input id="cn" name="name" value="${esc(c.name)}" maxlength="40"></div><div class="fld"><label for="cc">Number of ${c.type==='table'?'tables (4 seats each)':'seats'}</label><input id="cc" name="count" type="number" min="1" max="120" value="${c.count}"></div></div>
 <div class="fld"><label for="cd">Description</label><input id="cd" name="desc" value="${esc(c.desc)}" maxlength="90"></div><div class="fld"><label><input type="checkbox" name="on" ${c.on?'checked':''} style="width:auto"> Open for booking</label></div><p class="err" id="ce"></p><button class="btn">Save category</button></form></section>
 <section class="panel"><h2>${c.type==='table'?'Table':'Seat'} management</h2><p>${n} upcoming booking(s) in this category.</p>${legend(true)}${mapHtml(c,true)}</section>`};
V.a.bookings=()=>{let l=[...DB.bookings].sort((a,b)=>byStart(b,a));
 if(AF.st==='confirmed')l=l.filter(upcoming);else if(AF.st==='done')l=l.filter(done);else if(AF.st==='cancelled')l=l.filter(b=>b.status==='cancelled');
 if(AF.cat!=='all')l=l.filter(b=>b.cat===AF.cat);if(AF.date)l=l.filter(b=>b.date===AF.date);
 return `<section class="panel"><div class="row"><div class="fld"><label for="fs">Status</label><select id="fs" data-f="st">${options([['all','All'],['confirmed','Upcoming'],['done','Completed'],['cancelled','Cancelled']],AF.st)}</select></div><div class="fld"><label for="fc">Category</label><select id="fc" data-f="cat">${options([['all','All'],...DB.cats.map(c=>[c.id,c.name])],AF.cat)}</select></div><div class="fld"><label for="fd">Date</label><input id="fd" type="date" data-f="date" value="${AF.date}"></div></div>${l.length?bTable(l,true):'<div class="empty">No bookings match.</div>'}</section>`};
V.a.hours=()=>{const H=DB.hours,out=DB.bookings.filter(b=>upcoming(b)&&(b.start<H.open||b.end>H.close)).length;
 return `<section class="panel"><form data-form="hours" novalidate><div class="row"><div class="fld"><label for="ho">Opening time</label><select id="ho" name="o">${options(slots(0,1410),H.open)}</select></div><div class="fld"><label for="hc">Closing time</label><select id="hc" name="c">${options(slots(30,1440),H.close)}</select></div></div><p>Currently open ${fmt(H.open)} – ${fmt(H.close)} (${dur(H.close-H.open)}).${out?` ${out} upcoming booking(s) fall outside these hours.`:''}</p><p class="err" id="he"></p><button class="btn">Save timings</button></form></section>`};
V.a.fb=()=>{const f=DB.feedback;return `<section class="panel"><h2>Average ratings (${f.length} responses)</h2>${CR.map(([k,l])=>`<div class="br"><span>${l.split(' (')[0]}</span><div class="bar"><i style="width:${avg(f.map(x=>x.r[k]))*20}%"></i></div><b>${f.length?avg(f.map(x=>x.r[k])).toFixed(1):'—'}</b></div>`).join('')}</section>
 ${[...f].reverse().map(x=>{const u=DB.users.find(y=>y.id===x.uid);return `<div class="bk"><div><h3>${u?esc(u.name):x.uid} <span class="star">${stars(x.r.overall)}</span></h3><p>${nice(x.date)} · Clean ${x.r.clean} · Comfort ${x.r.comfort} · Internet ${x.r.net} · Quiet ${x.r.noise}</p><p>${esc(x.text||'(no comment)')}</p></div><button class="btn danger sm" data-act="delfb" data-id="${x.id}">Delete</button></div>`}).join('')||'<div class="empty panel">No feedback yet.</div>'}`};
V.a.reports=()=>{const d=AF.date||today(),H=DB.hours,total=H.close-H.open;
 const rep=(l)=>[l.length,l.reduce((s,b)=>s+mins(b),0)/60];
 const util=(l,days)=>{const cap=DB.cats.reduce((s,c)=>s+c.count*(c.type==='table'?4:1),0)*total*days;return cap?Math.round(l.reduce((s,b)=>s+mins(b)*b.seats.length,0)/cap*1000)/10:0};
 const day=DB.bookings.filter(b=>live(b)&&b.date===d),wk=rangeB(addDays(d,-6),d),[dc,dh]=rep(day),[wc,wh]=rep(wk);
 const rows=[...Array(7)].map((_,i)=>{const x=addDays(d,-6+i),l=DB.bookings.filter(b=>live(b)&&b.date===x),[c,h]=rep(l);return `<tr><td>${nice(x)}</td><td>${c}</td><td>${Math.round(h*10)/10} h</td><td>${util(l,1)}%</td></tr>`}).join('');
 return `<section class="panel noprint"><div class="row"><div class="fld"><label for="rd">Report date (week ends on this day)</label><input id="rd" type="date" data-f="date" value="${d}"></div><div class="fld"><label>&nbsp;</label><button class="btn ghost" onclick="window.print()">Print report</button></div></div></section>
 <div class="grid">${stat(dc,'Bookings on '+nice(d))}${stat(Math.round(dh*10)/10+' h','Hours booked that day')}${stat(wc,'Bookings in the 7 days')}${stat(util(wk,7)+'%','Weekly seat utilisation')}</div>
 <section class="panel"><h2>Daily report: ${nice(d)}</h2>${bars(DB.cats.map(c=>[c.name,day.filter(b=>b.cat===c.id).length]),Math.max(1,...DB.cats.map(c=>day.filter(b=>b.cat===c.id).length)))}</section>
 <section class="panel"><h2>Weekly report (${Math.round(wh*10)/10} h booked)</h2><div class="tw"><table><tr><th>Date</th><th>Bookings</th><th>Hours</th><th>Utilisation</th></tr>${rows}</table></div></section>`};

/* auth views */
const authWrap=h=>`<div class="auth"><div class="hero"><h1>Your seat is waiting at the LPU Library.</h1><p>Pick a seat or a group table, choose your hours, and walk in knowing it is yours.</p></div><div class="authbox">${h}</div></div>`;
const field=(l,n,t='text',x='')=>`<div class="fld"><label for="${n}">${l}</label><input id="${n}" name="${n}" type="${t}" ${x}></div>`;
const AUTH={
 login:()=>authWrap(`<h2 style="font-size:1.8rem">Student login</h2><form data-form="login" novalidate>${field('Registration number','id','text','inputmode="numeric" autocomplete="username"')}${field('Password','pass','password','autocomplete="current-password"')}<p class="err" id="fe"></p><button class="btn">Log in</button></form><p>New here? <a href="#/register">Create an account</a> · <a href="#/admin">Admin login</a>`),
 register:()=>authWrap(`<h2 style="font-size:1.8rem">Create student account</h2><form data-form="register" novalidate>${field('Registration number (8 digits)','id','text','inputmode="numeric" maxlength="8"')}${field('Full name','name')}${field('Email','email','email')}${field('Course (e.g. B.Tech CSE)','course')}<div class="row">${field('Password (min 6 characters)','pass','password')}${field('Confirm password','pass2','password')}</div><p class="err" id="fe"></p><button class="btn">Register</button></form><p>Already registered? <a href="#/login">Log in</a></p>`),
 admin:()=>authWrap(`<h2 style="font-size:1.8rem">Admin login</h2><form data-form="admin" novalidate>${field('Username','user')}${field('Password','pass','password')}<p class="err" id="fe"></p><button class="btn">Log in as admin</button></form><p><a href="#/login">Student login</a></p>`)};

/* ---------- router ---------- */
function route(){
 const h=location.hash||'#/login',[a,b]=h.slice(2).split('/'),app=$('#app');modal('');app.classList.toggle('enter',h!==route.last);route.last=h;
 if(a==='s'||a==='a'){
  if(!ses||ses.role!==a){go('#/'+(a==='a'?'admin':'login'));return}
  if(a==='s'&&!me()){logout();return}
  const pg=V[a][b]?b:'dash';app.innerHTML=shell(a,pg,V[a][pg]());window.scrollTo(0,0);return}
 if(ses){go(ses.role==='a'?'#/a/dash':'#/s/dash');return}
 app.innerHTML=(AUTH[a]||AUTH.login)();
}
function logout(){ses=null;localStorage.removeItem(SK);B=null;F={};go('#/login')}
window.addEventListener('hashchange',route);

/* ---------- events ---------- */
document.addEventListener('click',e=>{
 const t=e.target.closest('[data-act]');if(!t)return;const d=t.dataset;
 switch(d.act){
  case'logout':logout();break;
  case'close':modal('');break;
  case'print':window.print();break;
  case'pick':initB();B.cat=d.c;go('#/s/book');break;
  case'cat':B.cat=d.c;B.sel=null;B.err=[];route();break;
  case'sel':B.sel=B.sel===d.u?null:d.u;B.err=[];route();break;
  case'confirm':confirmBook();break;
  case'cancel':cancelBook(d.id,false);break;
  case'acancel':cancelBook(d.id,true);break;
  case'receipt':modal(receipt(DB.bookings.find(b=>b.id===d.id)));break;
  case'rate':F[d.k]=+d.v;route();break;
  case'acat':AF.ac=d.c;route();break;
  case'toggle':{const c=cat(AF.ac),i=c.off.indexOf(d.u);
   if(i<0&&DB.bookings.some(b=>live(b)&&upcoming(b)&&b.cat===c.id&&b.unit===d.u)){toast('That unit has upcoming bookings. Cancel them first.','err');break}
   i<0?c.off.push(d.u):c.off.splice(i,1);save();route();break}
  case'block':{const u=DB.users.find(x=>x.id===d.id);u.blocked=!u.blocked;save();toast(u.name+(u.blocked?' blocked.':' unblocked.'));route();break}
  case'deluser':{const u=DB.users.find(x=>x.id===d.id);if(!confirm(`Delete ${u.name}? Their upcoming bookings will be cancelled.`))break;
   DB.bookings.forEach(b=>{if(b.uid===u.id&&upcoming(b)){b.status='cancelled';b.by='admin'}});DB.users=DB.users.filter(x=>x!==u);save();toast('Student deleted.');route();break}
  case'delfb':if(confirm('Delete this feedback?')){DB.feedback=DB.feedback.filter(f=>f.id!==d.id);save();route()}break;
 }});
document.addEventListener('input',e=>{const t=e.target;if(t.dataset.m!==undefined&&B&&B.mem)B.mem[+t.dataset.m][t.dataset.k]=t.value});
document.addEventListener('change',e=>{
 const t=e.target;
 if(t.dataset.m!==undefined&&B&&B.mem&&t.dataset.k==='id'){const m=B.mem[+t.dataset.m],r=DB.users.find(x=>x.id===t.value.trim());if(r&&!m.name.trim()){m.name=r.name;m.course=r.course;route()}}
 if(t.dataset.b){B[t.dataset.b]=t.dataset.b==='date'?t.value:+t.value;if(t.dataset.b==='s'&&B.e<=B.s)B.e=Math.min(B.s+60,DB.hours.close);B.sel=null;B.err=[];route()}
 if(t.dataset.f){AF[t.dataset.f]=t.value;route()}});
document.addEventListener('submit',e=>{
 const f=e.target.closest('form[data-form]');if(!f)return;e.preventDefault();
 const v=Object.fromEntries(new FormData(f)),fail=m=>{const p=$('#'+(f.dataset.form==='cat'?'ce':f.dataset.form==='hours'?'he':'fe'));p.textContent=m;return false};
 switch(f.dataset.form){
  case'login':{const u=DB.users.find(x=>x.id===v.id.trim());
   if(!u||u.pass!==v.pass)return fail('Registration number or password is incorrect.');
   if(u.blocked)return fail('This account is blocked. Contact the library admin.');
   ses={role:'s',id:u.id};localStorage.setItem(SK,JSON.stringify(ses));initB();go('#/s/dash');break}
  case'admin':if(v.user.trim()!==DB.admin.user||v.pass!==DB.admin.pass)return fail('Admin username or password is incorrect.');
   ses={role:'a'};localStorage.setItem(SK,JSON.stringify(ses));go('#/a/dash');break;
  case'register':{
   if(!/^\d{8}$/.test(v.id.trim()))return fail('Registration number must be exactly 8 digits.');
   if(DB.users.some(u=>u.id===v.id.trim()))return fail('That registration number is already registered.');
   if(v.name.trim().length<3)return fail('Enter your full name.');
   if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email))return fail('Enter a valid email address.');
   if(!v.course.trim())return fail('Enter your course.');
   if(v.pass.length<6)return fail('Password needs at least 6 characters.');
   if(v.pass!==v.pass2)return fail('Passwords do not match.');
   DB.users.push({id:v.id.trim(),name:v.name.trim(),email:v.email.trim(),course:v.course.trim(),pass:v.pass,blocked:false,joined:today()});save();
   ses={role:'s',id:v.id.trim()};localStorage.setItem(SK,JSON.stringify(ses));initB();toast('Account created. Welcome!');go('#/s/dash');break}
  case'fb':if(CR.some(([k])=>!F[k]))return fail('Rate all five items before submitting.');
   DB.feedback.push({id:genId('FB-',DB.feedback),uid:ses.id,date:today(),r:{...F},text:v.text.trim()});save();F={};toast('Thanks! Feedback submitted.');route();break;
  case'cat':{const c=cat(AF.ac),n=+v.count;
   if(v.name.trim().length<3)return fail('Category name is too short.');
   if(!Number.isInteger(n)||n<1||n>120)return fail('Enter a whole number between 1 and 120.');
   const gone=unitsOf({...c,count:c.count}).slice(n);
   if(DB.bookings.some(b=>upcoming(b)&&b.cat===c.id&&gone.includes(b.unit)))return fail('Upcoming bookings exist on units that would be removed. Cancel them first.');
   Object.assign(c,{name:v.name.trim(),desc:v.desc.trim(),count:n,on:!!v.on});c.off=c.off.filter(u=>!gone.includes(u));save();toast('Category saved.');route();break}
  case'hours':{const o=+v.o,c=+v.c;if(c<=o)return fail('Closing time must be after opening time.');if(c-o<60)return fail('The library must be open at least 1 hour.');
   DB.hours={open:o,close:c};save();toast('Library timings updated.');route();break}
 }});
route();
