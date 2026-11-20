// Ten distinct low-poly illustrations using the existing world geometry and annulus patches.
import { GeoBuilder, M4, V3, m4mul, m4rotX, m4rotY, m4rotZ, m4scale } from '../geo';
import type { Ctx } from '../world';
import { patch, T } from './common';
import { IDENT as I, banner, personGeo } from './kit';
import { fitText, roundRect } from './text';

type NewId='puc'|'access'|'consent'|'groups'|'fog'|'flights'|'homestay'|'cancercost'|'air'|'parenting';
const LABELS: Record<NewId,[string,string]>={
 puc:['PUC: CHECK YOUR CATEGORY','ANNOUNCED CHANGES / START DATE NOT ESTABLISHED'],
 access:['VERIFICATION FOR EVERYONE','ACCESSIBILITY CASE / RESPONSES SOUGHT'],
 consent:['WHO CAN USE YOUR DATA?','CONSENT MANAGERS / SERVICE IN PREPARATION'],
 groups:['TRAVELLING TOGETHER','SOUTH WESTERN RAILWAY GROUP GUIDANCE'],
 fog:['WINTER TRAIN CHANGES','SELECTED NORTHERN ROUTES / DECEMBER ONWARD'],
 flights:['CHECK BEFORE YOU FLY','SPICEJET DISRUPTION / REGULATOR NOTICE'],
 homestay:['WORK CLOSER TO HOME','UTTARAKHAND HOMESTAYS / LIVELIHOODS FEATURE'],
 cancercost:['THE COST OF CANCER CARE','FAMILY BUDGETS / PUBLIC-INTEREST REPORT'],
 air:['INDOOR AIR HAS MANY SOURCES','PLANTS AND PURIFIERS HAVE LIMITS / EXPLAINER'],
 parenting:['A LITTLE TRUTH, A LITTLE LEARNING','CHILD DEVELOPMENT / PARENTING EXPLAINER'],
};
export function buildNewStory(ctx:Ctx, at:{x:number;z:number}, id:NewId){
 const colors:V3[]=[[.92,.87,.72],[.78,.88,.91],[.83,.81,.94],[.91,.85,.71],[.77,.84,.85],[.82,.87,.92],[.76,.86,.65],[.93,.83,.8],[.81,.88,.77],[.94,.84,.7]];
 const idx=Object.keys(LABELS).indexOf(id), base=colors[idx];
 const Y=patch(ctx,at.x,at.z,base,[base[0]*.8,base[1]*.8,base[2]*.8],5.6,5.4,90+idx);
 const X=(x:number,y:number,z:number):M4=>T(at.x+x,Y+y,at.z+z);
 const g=new GeoBuilder();
 const cream:V3=[.98,.95,.85], blue:V3=[.2,.45,.65], red:V3=[.82,.3,.25], wood:V3=[.55,.34,.21], dark:V3=[.2,.24,.29], green:V3=[.3,.58,.35];
 const box=(x:number,y:number,z:number,w:number,h:number,d:number,c:V3)=>g.box(w,h,d,c,X(x,y,z));
 const cyl=(x:number,y:number,z:number,r:number,h:number,c:V3)=>g.cyl(r,r,h,10,c,X(x,y,z));
 const sphere=(x:number,y:number,z:number,r:number,c:V3)=>g.sphere(r,10,6,c,X(x,y,z));
 const text=(x:number,y:number,z:number,title:string,sub='',w=3,h=1.5,bg='#fff9e9')=>{
  const t=ctx.makeTex(768,384,(c,W,H)=>{roundRect(c,8,8,W-16,H-16,28);c.fillStyle=bg;c.fill();c.strokeStyle='#365064';c.lineWidth=8;c.stroke();fitText(c,title,W/2,H*.4,W-60,95,900,'#203448');if(sub)fitText(c,sub,W/2,H*.77,W-60,55,800,'#536875');});
  ctx.addDecal({tex:t,model:X(x,y,z),w,h,billboard:true});
 };
 const person=(x:number,z:number,c:V3=blue,scale=1)=>ctx.addObj(personGeo([.76,.53,.37],c,{scale}),X(x,0,z),{anim:'bob',phase:x+z,amp:.018});
 const walker=(x:number,z:number,ex:number,ez:number,c:V3=blue)=>ctx.addObj(personGeo([.91,.69,.5],c),I,{anim:'walk',phase:.2,walkPath:{from:[at.x+x,Y,at.z+z],to:[at.x+ex,Y,at.z+ez],speed:.035}});
 const house=(x:number,z:number,s=1)=>{box(x,1.1*s,z,2.6*s,2.2*s,2.1*s,cream);g.box(3*s,.2*s,1.55*s,red,m4mul(X(x,2.45*s,z-.48*s),m4rotX(-.55)));g.box(3*s,.2*s,1.55*s,red,m4mul(X(x,2.45*s,z+.48*s),m4rotX(.55)));box(x,.7*s,z+1.07*s,.55*s,1.4*s,.08,wood);box(x-.8*s,1.4*s,z+1.08*s,.55*s,.6*s,.08,[.58,.8,.9]);};
 const plant=(x:number,z:number)=>{g.cyl(.35,.5,.7,9,[.64,.34,.22],X(x,0,z));cyl(x,.65,z,.055,1.2,green);for(let k=0;k<5;k++){const a=k*2.4;g.sphere(.45,8,5,green,m4mul(X(x+Math.cos(a)*.25,1+k*.12,z+Math.sin(a)*.25),m4scale(.7,.45,1.5)));}};
 const train=(x:number,z:number,c:V3)=>{box(x,.75,z,5.7,1.2,1.6,c);box(x,1.42,z,5.9,.16,1.7,cream);for(let k=0;k<5;k++)box(x-2.15+k*1.05,1,z+.82,.65,.45,.04,[.58,.81,.91]);for(const dx of [-1.85,1.85])for(const dz of [-.65,.65])sphere(x+dx,.23,z+dz,.25,dark);};
 if(id==='puc'){
  box(0,.1,-.5,7,.2,5.5,[.58,.61,.6]);for(const x of [-3.1,3.1])box(x,1.7,-1,.15,3.4,3,blue);box(0,3.5,-1,6.6,.3,3.4,blue);
  const car=new GeoBuilder();car.box(2.8,.6,1.4,[.88,.63,.2],T(0,.65,0));car.box(1.5,.6,1.2,[.63,.83,.9],T(0,1.18,0));for(const x of [-.9,.9])for(const z of [-.7,.7])car.sphere(.32,10,6,dark,T(x,.32,z));ctx.addObj(car,X(0,0,.1));
  box(-2.15,1,.1,.65,1.9,.65,cream);text(-2.1,1.75,.5,'PUC','TEST',1, .8);text(2.5,2.15,1.8,'CATEGORY','CHECK RULES',2.1,1.3);walker(-.7,3.4,-1.2,1.7);
 }else if(id==='access'){
  box(0,1.5,-1,4.5,3,1.3,cream);box(0,2.05,-.3,2.6,1.2,.08,blue);box(0,.7,-.05,4.9,1.4,1,wood);text(0,2.1,-.2,'VERIFY','ACCESS FOR ALL',2.5,1.15);person(-1.2,1.2,red);person(1.7,1.1,green);g.cyl(.035,.035,1.25,6,cream,m4mul(X(-.88,.1,1.5),m4rotZ(-.25)));box(-2.6,.12,2.4,1,.24,2,blue);text(0,3.8,-2.3,'BANK + LPG','BARRIERS UNDER REVIEW',4.3,1.25);
 }else if(id==='consent'){
  cyl(0,0,0,1.3,.4,blue);sphere(0,1.5,0,.8,[.5,.65,.8]);for(let k=0;k<4;k++){const a=k*Math.PI/2;const x=Math.cos(a)*3,z=Math.sin(a)*2.6;box(x,.7,z,1.3,1.4,.2,cream);text(x,1.1,z+.15,['APP','SHOP','BANK','MAIL'][k],'PERMISSION',1.5,.85);box(x/2,.25,z/2,Math.abs(x)+.1,.08,.1,blue);}text(0,3.5,-1,'CONSENT HUB','IN PREPARATION',3.7,1.5);
  const ring=new GeoBuilder();for(let k=0;k<8;k++)ring.sphere(.09,6,4,blue,T(Math.cos(k*Math.PI/4)*1.25,0,Math.sin(k*Math.PI/4)*1.25));ctx.addObj(ring,X(0,1.6,0),{anim:'spin',amp:.3});
 }else if(id==='groups'){
  box(0,.08,-1,9,.16,2.4,[.67,.65,.61]);train(0,-1,blue);box(-2.4,.8,2.4,2.2,1.6,1.3,cream);text(-2.4,2,2,'GROUPS','APPLY AT COUNTER',2.3,1);for(let k=0;k<5;k++)person(.1+k*.65,1.8+k%2*.8,k%2?red:green,.9);walker(3.6,3.4,1,2.1);text(0,3.6,-2.4,'SWR','GENUINE GROUP REQUESTS',3.8,1);
 }else if(id==='fog'){
  for(const z of [-1.6,-.5])box(0,.05,z,9,.1,.1,dark);for(let k=0;k<12;k++)box(-4.4+k*.8,.03,-1.05,.2,.06,1.5,wood);train(-.2,-1.05,[.33,.52,.54]);box(0,.18,2,8,.36,2,cream);text(1.2,2.2,1.5,'CHECK STATUS','DEC - EARLY MAR',3.6,1.5);person(-2,2,red);for(let k=0;k<3;k++)g.sphere(.6,10,5,[.86,.89,.87],m4mul(X(-3+k*2.7,2.3,-2.4),m4scale(1.8,.24,.7)));
 }else if(id==='flights'){
  box(0,.12,0,8,.24,6,[.69,.72,.73]);box(-2,1.3,-1,2,2.6,2.6,[.59,.75,.82]);text(1.6,2.3,-.4,'DEPARTURES','CHECK YOUR FLIGHT',3.5,2.2,'#e4edf3');text(1.6,1.4,-.35,'DELAYED / OPERATING','NOT LIVE',3.1,.75);walker(-.7,3,0,1);person(-2.8,2.4,red);box(-2.4,.35,2.8,.5,.7,.4,blue);
  const plane=new GeoBuilder();plane.cyl(.18,.06,2.7,9,cream,m4rotZ(Math.PI/2));plane.box(.6,.1,2.4,red,T(0,1.2,0));plane.box(.7,.6,.08,red,T(0,2.2,0));ctx.addObj(plane,m4mul(X(-1,3.4,1.3),m4rotZ(-Math.PI/2)),{anim:'bob',phase:0,amp:.06});
 }else if(id==='homestay'){
  g.sphere(2.5,12,7,[.45,.63,.38],m4mul(X(1.5,.3,-1),m4scale(1.3,.3,1)));house(-1.5,.2,.95);house(2.4,-1,.7);box(0,.2,2.8,5,.12,.6,wood);plant(3.6,2.5);walker(-3.2,3.1,-1,1.7,red);person(.4,2.8,green);box(.8,.6,2.6,.7,1.2,.6,[.76,.58,.35]);
 }else if(id==='cancercost'){
  box(-2,1.4,-1,2.7,2.8,2.4,cream);box(-2,2,.24,.28,1.2,.1,red);box(-2,2,.25,1.1,.28,.11,red);box(1.3,.9,1.1,3.8,.18,2,wood);for(let k=0;k<3;k++){box(.2+k*.8,1.02,1.2,.65,.03,1,cream);cyl(.3+k*.6,1.03,1.7,.16,.09,[.9,.71,.26]);}person(-.3,2.7,green);person(1.8,2.7,blue);text(1.8,2.9,-1.4,'CARE + COST','A FAMILY BUDGET',3.2,1.6);
 }else if(id==='air'){
  box(0,.1,0,8,.2,7,cream);box(-3.8,1.7,-1,.16,3.4,4,[.82,.75,.63]);box(0,1.7,-3.3,7.7,3.4,.16,[.9,.85,.72]);box(-2.6,2.1,-3.18,1.2,1.2,.08,[.62,.78,.84]);box(.2,.85,-.7,1.1,1.7,.9,[.94,.94,.91]);for(let k=0;k<6;k++)box(.2,.55+k*.15,-.22,.75,.035,.025,dark);plant(2.3,-1.7);plant(-2.6,1.5);person(2.3,2.5,blue);text(0,3.9,-2.7,'NO SINGLE FIX','PARTICLES AND GASES DIFFER',4.5,1.1);for(let k=0;k<7;k++){const q=new GeoBuilder();q.sphere(.06,6,4,[.54,.57,.56],I);ctx.addObj(q,X(-2.5+k*.7,1.4+k%3*.4,1),{anim:'bob',phase:k,amp:.13});}
 }else{
  house(-2.4,-1,.65);box(.7,.85,.5,3,.16,1.9,wood);cyl(.7,.95,.6,.5,.05,cream);for(let k=0;k<4;k++)cyl(.45+k%2*.38,1.02,.4+Math.floor(k/2)*.36,.12,.05,[.7,.43,.23]);person(-.8,1.6,green,.7);person(2.5,1.4,blue);text(.6,3,-.9,'LET US TALK','ENCOURAGING HONESTY',3.5,1.4);const bubble=new GeoBuilder();bubble.sphere(.3,9,6,cream,I);ctx.addObj(bubble,X(-.8,1.6,1.6),{anim:'bob',phase:1,amp:.08});
 }
 ctx.addObj(g,I);
 banner(ctx,at,Y,LABELS[id][0],LABELS[id][1],'#26474c','#407577','#e9e9cb','#dcecd3',5.1);
}
