'use strict';
/* CHAOS ENGINE — state / settings / audio / simulation / effects / render / input */
const $=s=>document.querySelector(s),clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const TOP=[55,95,140,190,240,290],ACC=[1.5,1.25,1,.85,.72,.6];
const S={v:0,y:0,yaw:0,vlat:0,dist:0,brake:0,acc:0,kick:0,omega:0,wheel:0,rpm:900,idle:900,redline:8000,gear:1,speed:0,boost:0,charge:1,throttle:0,limT:0,shifting:false,shiftT:0,shiftTarget:0,to:1,cut:0,
  flash:0,shake:0,gearAnim:0,msg:'',msgT:0,popT:0,chaosT:0,state:'IDLE',started:false,steer:0,maxed:0,prevDrive:false};
const cfg={master:.8,engine:.8,fx:.9,mute:false,keyfx:true,shake:true,particles:true,reduced:false};
try{Object.assign(cfg,JSON.parse(localStorage.getItem('chaos-engine')||'{}'))}catch(e){}
const keys={};
const say=t=>{S.msg=t;S.msgT=1.2};

/* ---------- AUDIO (fully synthesized, no files) ---------- */
const A={ctx:null,
init(){const c=this.ctx=new AudioContext();
 this.master=c.createGain();const lim=c.createDynamicsCompressor();this.master.connect(lim);lim.connect(c.destination);
 this.eg=c.createGain();this.fxg=c.createGain();this.eg.connect(this.master);this.fxg.connect(this.master);
 const pn=(x,y,z)=>{const p=c.createPanner();p.panningModel='HRTF';p.distanceModel='inverse';p.refDistance=1.5;p.rolloffFactor=.5;p.maxDistance=200;p.positionX.value=x;p.positionY.value=y;p.positionZ.value=z;return p};
 this.pan={engine:pn(0,.5,.6),exhaust:pn(-.57,.3,2.35),turbo:pn(.35,.55,-.9),brake:pn(0,.3,1.3),hit:pn(0,.5,-2.2),siren:pn(0,1,0)};
 ['engine','turbo'].forEach(k=>this.pan[k].connect(this.eg));['exhaust','brake','hit','siren'].forEach(k=>this.pan[k].connect(this.fxg));
 this.sO=c.createOscillator();this.sG=c.createGain();this.sO.type='sawtooth';const sf=c.createBiquadFilter();sf.type='lowpass';sf.frequency.value=2200;this.sO.connect(sf);sf.connect(this.sG);this.sG.connect(this.pan.siren);this.sG.gain.value=0;this.sO.start();
 this.tvInit();
 const ws=c.createWaveShaper(),cv=new Float32Array(256);for(let i=0;i<256;i++)cv[i]=Math.tanh((i/128-1)*3);ws.curve=cv;
 this.filt=c.createBiquadFilter();this.filt.type='lowpass';this.filt.Q.value=2;ws.connect(this.filt);this.filt.connect(this.pan.engine);
 this.eng=c.createGain();this.eng.connect(ws);
 const osc=(t,dest)=>{const o=c.createOscillator(),g=c.createGain();o.type=t;o.connect(g);g.connect(dest);o.start();return[o,g]};
 [this.o1,this.g1]=osc('sawtooth',this.eng);[this.o2,this.g2]=osc('square',this.eng);[this.o3,this.g3]=osc('triangle',this.eng);
 [this.ot,this.gt]=osc('sine',this.pan.turbo);this.gt.gain.value=0;
 this.nb=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const d=this.nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
 this.apply()},
tvInit(){const c=this.ctx;this.tg=c.createGain();this.tg.gain.value=.55;this.tg.connect(this.fxg);this.tv=[];
 for(let i=0;i<4;i++){const p=c.createPanner();p.panningModel='HRTF';p.distanceModel='inverse';p.refDistance=6;p.rolloffFactor=1.2;p.maxDistance=300;
  const o=c.createOscillator(),o2=c.createOscillator(),f=c.createBiquadFilter(),g=c.createGain();o.type='sawtooth';o2.type='square';f.type='lowpass';f.frequency.value=600;g.gain.value=0;
  o.connect(f);o2.connect(f);f.connect(g);g.connect(p);p.connect(this.tg);o.start();o2.start();this.tv.push({p,o,o2,f,g})}},
tvSet(i,x,y,z,hz,gain,lp){const v=this.tv[i],t=this.ctx.currentTime;v.p.positionX.value=x;v.p.positionY.value=y;v.p.positionZ.value=z;
 v.o.frequency.setTargetAtTime(hz,t,.05);v.o2.frequency.setTargetAtTime(hz*.5,t,.05);v.g.gain.setTargetAtTime(gain,t,.08);v.f.frequency.setTargetAtTime(lp,t,.1)},
tvOff(i){const v=this.tv[i];v.g.gain.setTargetAtTime(0,this.ctx.currentTime,.1)},
apply(){if(!this.ctx)return;this.master.gain.value=cfg.mute?0:cfg.master;this.eg.gain.value=cfg.engine*2.2;this.fxg.gain.value=cfg.fx*2.2},
update(){const c=this.ctx,t=c.currentTime,r=S.rpm,f=r/60*2,th=S.throttle,k=.03;
 this.o1.frequency.setTargetAtTime(f,t,k);this.o2.frequency.setTargetAtTime(f*2.01,t,k);this.o3.frequency.setTargetAtTime(f*.5,t,k);
 this.g1.gain.setTargetAtTime(.5,t,k);this.g2.gain.setTargetAtTime(.08+.5*(r/8000)**2,t,k);this.g3.gain.setTargetAtTime(.6*(1-r/9000),t,k);
 this.filt.frequency.setTargetAtTime(300+r*.4+th*900+S.boost*400,t,.04);
 this.eng.gain.setTargetAtTime(S.shifting?.05:S.cut>0?.1:.14+.28*th+.15*r/8000,t,.02);
 this.ot.frequency.setTargetAtTime(900+S.boost*1800+r*.1,t,.05);this.gt.gain.setTargetAtTime(S.boost*.03,t,.05);this.sO.frequency.setTargetAtTime(700+450*Math.abs(Math.sin(t*3.2)),t,.03);this.sG.gain.setTargetAtTime(G.siren*6,t,.15)},
noise(d,type,f0,f1,v,delay=0,q=1,src='exhaust'){const c=this.ctx,t=c.currentTime+delay,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();
 s.buffer=this.nb;f.type=type;f.Q.value=q;f.frequency.setValueAtTime(f0,t);f.frequency.exponentialRampToValueAtTime(f1,t+d);
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.005);g.gain.exponentialRampToValueAtTime(.0001,t+d);
 s.connect(f);f.connect(g);g.connect(this.pan[src]);s.start(t,Math.random());s.stop(t+d+.05)},
tone(type,f0,f1,d,v,delay=0,src='exhaust'){const c=this.ctx,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;
 o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f1,t+d);
 g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+d);
 o.connect(g);g.connect(this.pan[src]);o.start(t);o.stop(t+d+.05)},
shift(){this.tone('square',140,60,.08,.5,0,'engine');this.noise(.06,'bandpass',2500,800,.5,0,2,'engine')},
blow(v=1){this.noise(.6,'bandpass',4200,1200,.7*v,0,.8,'turbo');this.noise(.5,'highpass',2500,6000,.25*v,0,1,'turbo')},
pop(v=1,d=0){this.noise(.09,'lowpass',2200,200,.9*v,d);this.tone('sine',160,45,.12,.8*v,d)},
crackle(n){for(let i=0;i<n;i++)this.pop(.35+Math.random()*.3,i*.06+Math.random()*.04)},
whoosh(){this.noise(.55,'bandpass',400,3200,.35,0,1.5,'turbo')},
shot(v){this.noise(.4,'lowpass',3500*v,150,1);this.tone('sine',130*v,28,.35,1);if(v<1)this.noise(.5,'lowpass',1500,100,.5,.14)},
heavy(){this.tone('sine',80,22,.9,1);this.noise(.7,'lowpass',500,60,.9)},
hshift(){this.tone('square',180,60,.07,.7);this.noise(.05,'lowpass',1200,200,.8);this.tone('square',130,45,.09,.8,.13);this.noise(.06,'lowpass',900,150,.9,.13);this.noise(.04,'highpass',3000,6000,.3,.2)},
flutter(){for(let i=0;i<8;i++){const d=i*.07+i*i*.005;this.noise(.07,'bandpass',3600-i*250,2000,.4,d,4);this.tone('sine',1900-i*70,1500,.05,.08,d)}},
purr(){for(let i=0;i<7;i++){const d=i*.09;this.noise(.12,'lowpass',520,120,.5,d);this.tone('sawtooth',75+(i%2)*12,45,.12,.3,d)}},
tease(){this.tone('triangle',110,430,1,.35);this.noise(1,'bandpass',300,1800,.18,0,1.2);this.tone('sine',430,250,.7,.2,.9);this.noise(.5,'lowpass',900,150,.3,.9)},
silk(){[660,880,1320].forEach((f,i)=>this.tone('sine',f,f*.92,.9,.13,i*.12));this.noise(.8,'highpass',2500,5000,.1);this.crackle(1)},
crash(sev=1,dir=1){const s=clamp(sev,.12,1),t0=this.ctx.currentTime;
 this.tone('sine',110,26,.45+.5*s,.55+.45*s,0,'hit');this.noise(.18+.12*s,'bandpass',2200,260,.5+.5*s,0,1.1,'hit');this.noise(.1,'highpass',3500,900,.1+.35*s,0,1,'hit');
 this.tone('square',300+120*s,140,.16,.18+.15*s,.01,'hit');this.tone('triangle',900,620,.4+.2*s,.1+.12*s,.02,'hit');
 if(s>.35){this.noise(.7,'bandpass',1100,320,.22+.2*s,.1,1.4,'hit');this.tone('sawtooth',210,90,.3,.18,.12,'hit')}
 if(s>.6){this.noise(.55,'highpass',5200,9500,.35*s,.05,.8,'hit');this.noise(.4,'bandpass',3000,6000,.2,.18,3,'hit')}
 if(sev>=1){this.tone('sine',60,16,1.3,1,0,'hit');this.noise(1.1,'lowpass',420,45,.9,.04,1,'hit');this.tone('sine',4300,4300,1.8,.05,.25,'hit');
  const g=this.eg.gain,k=cfg.engine*2.2;g.cancelScheduledValues(t0);g.setValueAtTime(g.value,t0);g.linearRampToValueAtTime(k*.12,t0+.05);g.linearRampToValueAtTime(k,t0+2.8)}},
horn(){this.tone('square',415,410,.55,.22,0,'hit');this.tone('square',523,520,.55,.2,0,'hit')},
reload(){[0,.16,.34].forEach((d,i)=>{this.tone('square',i==1?900:1800,500,.04,.35,d);this.noise(.05,'highpass',3000,6000,.5,d)})},
laser(){this.tone('sawtooth',2400,90,.5,.4)},
chaos(){[()=>this.shot(1),()=>this.shot(.7),()=>this.heavy(),()=>this.reload(),()=>this.laser(),()=>this.crackle(8)][Math.random()*6|0]()}};

/* ---------- EFFECTS ---------- */
const P=[];let EX=640,EY=600,EXO=30;
function emit(n,kind,spd=1){if(!cfg.particles)return;if(cfg.reduced)n=Math.ceil(n/3);
 for(let i=0;i<n&&P.length<400;i++){const f=kind!=='smoke';
  P.push({x:EX+(Math.random()<.5?-1:1)*EXO,y:EY+Math.random()*6,vx:(Math.random()-.5)*220*spd,vy:f?(30+Math.random()*160)*spd:-30-Math.random()*40,t:f?.3+Math.random()*.3:.8+Math.random()*.6,m:f?.6:1.4,k:kind,s:f?4+Math.random()*7:8+Math.random()*10})}}
const hit=(sh,fl)=>{S.shake=Math.max(S.shake,sh);S.flash=Math.max(S.flash,fl)};

/* ---------- ACTIONS ---------- */
function doShift(to,caps){if(S.shifting||to<1||to>6)return;if(to<S.gear&&S.v*RT[to-1]/K>S.redline+200){say('REV PROTECT');A.pop(.3);return}
 S.shifting=true;S.shiftT=0;S.to=to;S.gearSet=false;
 if(caps){A.shift();A.blow();say('SHIFT!');hit(1,.6);emit(14,'flame',1.3)}else A.shift()}
function once(k){if(G.paused&&k!=='escape')return;switch(k){
 case'escape':pause();break;
 case'shift':if(S.gear>1)doShift(S.gear-1,false);break;
 case'b':A.horn();say('HORN');hornTraffic();break;
 case'c':G.cam=(G.cam+1)%3;say(CAMS[G.cam].n);break;
 case'capslock':if(S.gear<6)doShift(S.gear+1,true);else{A.blow(.8);say('TOP GEAR');hit(.5,.3)}break;
 case' ':if(S.charge>.15){A.whoosh();say('BOOST');hit(.4,.2)}break;
 case'r':S.limT=1.2;say('LIMITER');hit(.6,.3);break;
 case'e':A.pop();A.crackle(2);S.popT=.25;say('EXHAUST');hit(.3,.35);emit(10,'flame',1.4);break;
 case'f':fSound();S.chaosT=.5;say('PURR');hit(.3,.25);emit(4,'flame',.8);emit(3,'smoke'); break;
 case'g':A.tease();S.chaosT=.9;say('TEASE');hit(.4,.3);emit(4,'smoke'); break;
 case'h':A.hshift();S.chaosT=.3;say('H-SHIFT');hit(.9,.4);emit(5,'flame',1.2); break;
 case'j':A.flutter();S.chaosT=.6;say('TURBO FLUTTER');hit(.4,.3);emit(6,'smoke'); break;
 case'k':A.silk();S.chaosT=.9;say('SILK');hit(.2,.25);emit(3,'smoke'); break;
 case's':if(S.speed>40){A.noise(.5,'bandpass',2200,1700,.2,0,8,'brake')}break;
 default:if(/^[1-6]$/.test(k)){if(+k!==S.gear)doShift(+k,false)}}}
function reset(){Object.assign(S,{rpm:900,gear:1,speed:0,v:0,y:0,yaw:0,vlat:0,dist:0,brake:0,acc:0,kick:0,omega:0,wheel:0,boost:0,charge:1,throttle:0,limT:0,shifting:false,cut:0,flash:0,shake:0,gearAnim:0,popT:0,chaosT:0});P.length=0;say('ENGINE RESET')}

/* ---------- SIMULATION ---------- */
/* ---------- ONE VEHICLE MODEL: input -> engine/gearbox -> force -> accel -> velocity -> steering/grip -> position -> world/camera/audio/HUD ---------- */
function sim(dt){const rev=keys.r||S.limT>0,cap=rev?7400:S.redline,dead=G.crashed;
 S.cut-=dt;S.limT-=dt;S.popT-=dt;S.chaosT-=dt;S.msgT-=dt;S.gearAnim=Math.max(0,S.gearAnim-dt*4);S.flash=Math.max(0,S.flash-dt*3);S.shake=Math.max(0,S.shake-dt*4);S.kick=Math.max(0,S.kick-dt*5);G.hitT-=dt;
 const boosting=keys[' ']&&S.charge>.02&&!dead&&!S.shifting;
 S.throttle+=(((keys.w||rev)&&!dead?1:0)-S.throttle)*Math.min(1,dt*9);S.brake+=((keys.s||dead?1:0)-S.brake)*Math.min(1,dt*14);
 {const si=((keys.d?1:0)-(keys.a?1:0))*(dead?0:1);S.steer+=(si-S.steer)*Math.min(1,dt*(si?9:14))}
 if(S.shifting){S.shiftT+=dt;if(!S.gearSet&&S.shiftT>.15){S.gear=S.to;S.gearSet=true;S.gearAnim=1;S.kick=1}if(S.shiftT>.4)S.shifting=false}
 S.boost+=((boosting?1.8:0)-S.boost)*Math.min(1,dt*(boosting?2.2:3));S.charge=clamp(S.charge+(boosting?-.22:.1)*dt,0,1);
 if(S.boost>1.7&&!S.maxed){S.maxed=1;say('MAX BOOST')}if(S.boost<1)S.maxed=0;
 /* engine RPM is derived from wheel speed x gear ratio (clutch slip only at launch) */
 const rt=RT[S.gear-1],coupled=S.v*rt/K,tgt=Math.max(coupled*(S.shifting&&!S.gearSet?.93:1),S.idle+S.throttle*3200*clamp(1-S.v/6,0,1));
 S.rpm+=(tgt-S.rpm)*Math.min(1,dt*(S.shifting?14:25));S.rpm=Math.min(S.rpm,S.redline+150);
 if(S.rpm>=cap&&S.throttle>.5&&S.cut<=0&&!S.shifting){S.cut=.08;A.pop(.7);A.tone('sawtooth',420,180,.05,.35);emit(3,'flame',1.2);S.flash=Math.max(S.flash,.3);S.shake=Math.max(S.shake,.3);if(S.msgT<.5)say('REDLINE')}
 /* forces */
 const xr=(S.rpm-5500)/5500,tq=340*Math.max(.5,1-xr*xr)*(1+S.boost*.12),clutch=!S.shifting&&S.cut<=0&&!dead;
 const Fb=boosting?S.boost/1.8*5000:0,Fd=Math.min((clutch?S.throttle*tq*rt*.85/WR:0)+Fb,8600);
 const bi=Math.floor(S.dist/SEGM),s0=seg[bi%N],s1=seg[(bi+1)%N],off=Math.abs(S.y)>6.2;
 const Fres=.30*S.v*S.v+.015*MASS*9.81*(off?8:1)+MASS*9.81*(s1.y-s0.y)/SEG;
 const Feb=S.shifting?0:(1-S.throttle)*60*rt/WR*S.rpm/8000,Fbr=S.brake*(11500*(1-.15*Math.abs(S.steer))+(dead?3000:0));
 S.acc=(Fd-Fres-Feb-(S.v>.05?Fbr:0))/MASS;S.v=Math.max(0,S.v+S.acc*dt);if(S.v<.15&&S.throttle<.1)S.v=0;
 /* speed-dependent steering + friction-limited grip (understeer / slide) */
 const V=S.v,kap=s0.c*.0008,maxd=Math.min(.5,60/(V*V+1)),gripF=clamp(1-.3*S.brake*Math.min(1,V/30)-(S.throttle>.8&&V>40?.12:0),.4,1)*(off?.6:1),aMax=11.5*gripF;
 const omD=V/2.6*Math.tan(S.steer*maxd),aReq=V*omD;let om=omD,ex=0;
 if(Math.abs(aReq)>aMax){om=Math.sign(omD)*aMax/Math.max(V,1);ex=Math.abs(aReq)-aMax;S.vlat-=Math.sign(omD)*ex*dt*.45}
 S.vlat-=S.vlat*Math.min(1,dt*(ex>0?2:6)*gripF);S.vlat=clamp(S.vlat,-.3*V-.5,.3*V+.5);
 S.omega=om;S.yaw=clamp(S.yaw+(om-kap*V-.6*S.yaw*Math.min(1,V/20))*dt,-.6,.6);S.y+=(V*Math.sin(S.yaw)+S.vlat*Math.cos(S.yaw))*dt;S.v=Math.max(0,S.v-Math.abs(S.vlat)*.8*dt);
 /* barrier collision: severity from actual velocity into the wall */
 if(!dead&&Math.abs(S.y)>7.4&&G.hitT<=0){const sd=Math.sign(S.y),sev=Math.max(0,sd*(S.v*Math.sin(S.yaw)+S.vlat))+S.v*.04;G.hitT=.5;
  if(sev>18)crash(sd,sev);else{S.v*=Math.max(.35,1-sev/36-.05);S.y=sd*7;S.yaw*=-.3;S.vlat=0;impact(sev,sd)}}
 S.dist+=S.v*dt;S.speed=S.v*3.6;S.wheel=S.dist/WR;
 world(dt);traffic(dt);
 /* engine-driven effects */
 if(S.throttle<.1&&S.rpm>5500&&!S.shifting&&Math.random()<dt*6*S.rpm/8000){A.pop(.4);emit(4,'flame')}
 if(G.pt>.6&&S.throttle<.3&&S.boost>.7&&!S.shifting){A.blow(.5);emit(5,'flame')}G.pt=S.throttle;
 if(S.throttle>.3&&Math.random()<dt*20*S.throttle)emit(1,'smoke');if(S.boost>.5&&Math.random()<dt*30)emit(2,'flame',1.2);
 S.state=dead?'CRASHED':S.shifting?'SHIFTING':S.chaosT>0?'CHAOS':S.popT>0?'EXHAUST_POP':S.boost>.3?'BOOST':S.rpm>=7600?'REDLINE':G.drift?'DRIFT':S.rpm>6200?'HIGH_RPM':S.throttle>.1?'ACCELERATING':S.speed>8?'DRIVING':'ENGINE READY';
 for(let i=P.length-1;i>=0;i--){const p=P[i];p.t-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.97;if(p.t<=0){P[i]=P[P.length-1];P.pop()}}}
/* ---------- RENDER ---------- */
const cv=$('#c'),x=cv.getContext('2d'),F='"Bahnschrift","Arial Narrow",Impact,sans-serif';
const col=p=>p<.7?'#e8f0ff':p<.875?'#ff9a2e':'#ff2e3a';
const txt=(s,px,py,sz,c,al='center',w='bold')=>{x.font=`italic ${w} ${sz}px ${F}`;x.fillStyle=c;x.textAlign=al;x.fillText(s,px,py)};
function tach(){const cx=430,cy=380,R=240,a0=.75*Math.PI,a1=2.25*Math.PI,p=S.rpm/S.redline,ang=a0+(a1-a0)*p;
 x.save();x.lineWidth=14;x.strokeStyle='#1b1d24';x.beginPath();x.arc(cx,cy,R,a0,a1);x.stroke();
 x.strokeStyle='#5a1219';x.beginPath();x.arc(cx,cy,R,a0+(a1-a0)*.875,a1);x.stroke();
 x.shadowColor=col(p);x.shadowBlur=10+p*35;x.strokeStyle=col(p);x.lineWidth=8;x.beginPath();x.arc(cx,cy,R,a0,ang);x.stroke();x.shadowBlur=0;
 for(let i=0;i<=16;i++){const a=a0+(a1-a0)*i/16,m=i%2===0,c=Math.cos(a),s=Math.sin(a),r2=R-(m?40:28);
  x.strokeStyle=i>=14?'#ff2e3a':'#8a90a0';x.lineWidth=m?3:1.5;x.beginPath();x.moveTo(cx+c*(R-14),cy+s*(R-14));x.lineTo(cx+c*r2,cy+s*r2);x.stroke();
  if(m)txt(i/2,cx+c*(R-66),cy+s*(R-66)+9,26,i>=14?'#ff2e3a':'#cfd5e4')}
 x.translate(cx,cy);x.rotate(ang+(S.cut>0?.02:0));x.shadowColor='#ff2e3a';x.shadowBlur=15;x.strokeStyle='#ff3b3b';x.lineWidth=5;
 x.beginPath();x.moveTo(-34,0);x.lineTo(R-30,0);x.stroke();x.fillStyle='#111';x.beginPath();x.arc(0,0,16,0,7);x.fill();x.stroke();x.restore();
 txt(Math.round(S.rpm),cx,cy+120,56,col(p));txt('RPM x1',cx,cy+150,16,'#8a90a0')}
function bar(label,v,y,c){txt(label,780,y,16,'#8a90a0','left');x.fillStyle='#1b1d24';x.fillRect(900,y-14,320,14);x.fillStyle=c;x.shadowColor=c;x.shadowBlur=v>.8?14:0;x.fillRect(900,y-14,320*clamp(v,0,1),14);x.shadowBlur=0}
function car(){x.save();x.translate(940,650);x.rotate(S.steer*.03);
 x.fillStyle='#14151b';x.strokeStyle=S.state==='BOOST'?'#ff9a2e':'#ff3b3b';x.lineWidth=2;x.shadowColor=x.strokeStyle;x.shadowBlur=8+S.throttle*14;
 x.beginPath();x.moveTo(-170,0);x.lineTo(-172,-30);x.lineTo(-120,-38);x.lineTo(-90,-62);x.lineTo(-20,-70);x.lineTo(10,-68);x.lineTo(60,-42);x.lineTo(160,-30);x.quadraticCurveTo(182,-26,178,0);x.closePath();x.fill();x.stroke();
 x.beginPath();x.moveTo(-186,-52);x.lineTo(-136,-50);x.moveTo(-170,-30);x.lineTo(-170,-50);x.stroke();
 x.fillStyle='#000';[-110,110].forEach(w=>{x.beginPath();x.arc(w,2,21,0,7);x.fill();x.stroke()});
 x.fillStyle='#ff2e3a';x.fillRect(-172,-27,8,6);x.restore()}
function radar(){const X0=36,Y0=150,RW=76,RH=250,AH=160,BH=60,sc=RH/(AH+BH),py=Y0+AH*sc,lx=y=>X0+RW/2+clamp(y,-6.2,6.2)/12*RW,fl=(Date.now()/130|0)%2;let warn=false;
 x.save();x.fillStyle='rgba(5,5,10,.6)';x.fillRect(X0,Y0,RW,RH);x.lineWidth=1;x.strokeStyle='#1b1d24';
 for(let i=1;i<4;i++){const l=X0+i*RW/4;x.beginPath();x.moveTo(l,Y0);x.lineTo(l,Y0+RH);x.stroke()}
 for(const t of T){if(!t.on)continue;const g=t.s-S.dist;if(g>AH||g<-BH)continue;const cx=lx(t.ly),cy=py-g*sc,w=Math.max(3,t.W/12*RW),h=Math.max(4,t.L*sc);
  x.fillStyle=t.ty===7?(fl?'#ff3b3b':'#3d8bff'):t.ty===2?'#ff9a2e':(t.ty===4||t.ty===5)?'#7a8090':'#cfd5e4';x.fillRect(cx-w/2,cy-h/2,w,h);
  if(g>0&&Math.abs(t.ly-S.y)<2.2){const cl=S.v-t.v;if(cl>2&&g/cl<2.5)warn=true}}
 x.fillStyle='#3dd6ff';x.shadowColor='#3dd6ff';x.shadowBlur=6;x.fillRect(lx(S.y)-3,py-3,6,8);x.shadowBlur=0;
 x.strokeStyle=warn&&fl?'#ff3b3b':'#2b2e38';x.lineWidth=warn?2:1;x.strokeRect(X0,Y0,RW,RH);txt('RADAR',X0+RW/2,Y0-6,11,'#8a90a0');
 if(warn){x.globalAlpha=fl?1:.35;txt('BRAKE!',X0+RW/2,Y0+RH+20,20,'#ff3b3b');x.globalAlpha=1}x.restore()}
function render(now){x.save();if(window.R3D&&R3D.on)x.clearRect(0,0,W,H);else{x.fillStyle='#050507';x.fillRect(0,0,W,H)}
 const sh=cfgShake()?(S.shake*10+(S.boost>.5?S.boost*.8:0)):0;x.translate((Math.random()-.5)*sh,(Math.random()-.5)*sh);
 drawWorld(now);
 txt('CHAOS ENGINE',40,50,30,'#fff','left');txt('SYSTEM ONLINE',44,72,13,'#3dff8a','left');
 txt(S.state,W-40,50,22,col(S.rpm/S.redline),'right');txt(CAMS[G.cam].n,W-40,74,13,'#8a90a0','right');
 txt('DISTANCE',W/2,38,13,'#8a90a0');txt(G.km.toFixed(2)+' KM',W/2,76,40,'#fff');txt('BEST '+Math.max(G.best,G.km).toFixed(2)+' KM',W/2,98,15,'#ff9a2e');x.fillStyle='#1b1d24';x.fillRect(W/2-80,108,160,6);x.fillStyle='#3dd6ff';x.fillRect(W/2+S.steer*76-3,104,6,14);txt(G.zn||'',W/2,142,13,'#8a90a0');
 txt('SCORE '+G.score,W-40,106,24,'#fff','right');txt('BEST '+Math.max(G.bestScore,G.score),W-40,126,13,'#8a90a0','right');
 if(G.cb>1){txt('x'+G.cb+' COMBO',W-40,152,22,'#ff9a2e','right');x.fillStyle='#ff9a2e';x.fillRect(W-160,160,120*clamp(G.cbT/4,0,1),4)}
 radar();
 x.fillStyle='rgba(5,5,10,.55)';x.beginPath();x.arc(170,560,150,0,7);x.fill();x.fillRect(950,462,290,246);
 x.save();x.translate(-88,332);x.scale(.6,.6);tach();x.restore();
 x.save();x.translate(466,377);x.scale(.62,.62);
 txt('GEAR',780,150,16,'#8a90a0','left');
 x.save();x.translate(1000,300);const sc=1+S.gearAnim*.9;x.scale(sc,sc);x.shadowColor='#ff9a2e';x.shadowBlur=S.gearAnim*40;txt(S.gear,0,0,170,S.gearAnim>0?'#ff9a2e':'#fff');x.restore();
 txt(Math.round(S.speed),1040,400,70,'#fff','right');txt('KM/H',1060,400,20,'#8a90a0','left');
 bar('BOOST '+S.boost.toFixed(1)+' BAR',S.boost/1.8,450,'#ff9a2e');bar('THROTTLE',S.throttle,485,'#e8f0ff');bar('CHARGE',S.charge,520,'#3dd6ff');x.restore();
 if(S.msgT>0){x.globalAlpha=clamp(S.msgT*2,0,1);txt(S.msg,W/2,250,48,'#ff9a2e');x.globalAlpha=1}
if(G.crashed&&!cfg.reduced){const a=clamp(G.crashT*1.5,0,1),gr=x.createRadialGradient(W/2,H/2,H*.25,W/2,H/2,H*.85);gr.addColorStop(0,'rgba(120,0,0,0)');gr.addColorStop(1,`rgba(120,0,10,${.55*a})`);x.fillStyle=gr;x.fillRect(0,0,W,H);
  if(G.crashT<2.6){const sc=1+Math.max(0,.5-G.crashT)*1.2;x.save();x.translate(W/2,H*.3);x.scale(sc,sc);x.globalAlpha=clamp(1.4-G.crashT*.45,0,1);txt('CRASH',0,0,96,'#ff3b3b');x.restore();x.globalAlpha=1}}
 if(S.flash>0&&!cfg.reduced){x.fillStyle=`rgba(255,90,60,${S.flash*.18})`;x.fillRect(-20,-20,W+40,H+40)}
 if(G.paused){x.fillStyle='rgba(0,0,0,.55)';x.fillRect(0,0,W,H);txt('PAUSED',W/2,H/2,64,'#fff')}
 x.restore()}
const W=1280,H=720,cfgShake=()=>cfg.shake&&!cfg.reduced;

/* ---------- ENDLESS WORLD (pooled segments, traffic, scenery) ---------- */
const N=160,D=84,SEG=200,ROADW=2000,SEGM=6;
const seg=Array.from({length:N},()=>({c:0,y:0,la:0,sb:0,ss:1,so:2,sh:0}));
const G={crashT:0,shown:false,slowT:0,cSev:0,tsc:1,pos:0,x:0,km:0,best:0,top:0,topRpm:0,gen:0,crashed:false,paused:false,cam:0,camH:1100,camS:1,bgx:0,gc:0,gy:0,gsl:0,tc:0,ts:0,rem:0,force:1,drift:false,car:0,hitT:0,cd:.84,pitch:0,pt:0,score:0,bestScore:0,cb:0,cbT:0,passed:0,siren:0,sirenT:null};
try{G.best=+localStorage.getItem('ce-best')||0;G.car=+localStorage.getItem('ce-car')||0;G.bestScore=+localStorage.getItem('ce-score')||0}catch(e){}
const CAMS=[{n:'CHASE',h:1100,s:1},{n:'CLOSE CHASE',h:780,s:1.3},{n:'HOOD',h:430,s:0}];
const CARC=['#ff3b3b','#3dd6ff','#ff9a2e','#e8f0ff'];
const PAL=[[[4,5,13],[14,16,34]],[[1,1,6],[6,6,16]],[[38,22,58],[255,120,64]]];
const hash=n=>{const v=Math.sin(n*127.1)*43758.5;return v-Math.floor(v)};
const mix=(a,b,f)=>a.map((v,i)=>v+(b[i]-v)*f),rgb=a=>`rgb(${a.map(Math.round)})`;
const T=Array.from({length:24},()=>({n:0,l:0,tl:0,ly:0,s:0,v:80,vt:80,c:0,k:0,ty:0,L:4.4,W:1.8,br:0,sig:0,pend:null,brk:0,pg:undefined,cd:0,dv:0,yo:0,sp:0,sl:0,on:false})),LANES=[-4.5,-1.5,1.5,4.5];
/* traffic types: w = spawn weight, lanes = lanes it uses (0 = fast lane .. 3 = slow lane) */
const TY=[{n:'sedan',L:4.4,W:1.8,w:30,lanes:[0,1,2,3]},{n:'suv',L:4.7,W:1.95,w:20,lanes:[0,1,2,3]},{n:'sports',L:4.3,W:1.9,w:10,lanes:[0,1]},{n:'van',L:5.2,W:2,w:12,lanes:[1,2,3]},
 {n:'truck',L:12,W:2.5,w:10,lanes:[2,3]},{n:'bus',L:10.5,W:2.55,w:6,lanes:[2,3]},{n:'bike',L:2.1,W:.7,w:7,lanes:[0,1,2,3]},{n:'police',L:4.4,W:1.8,w:5,lanes:[0,1,2,3]}];
const PR=Array.from({length:D+1},()=>({X:0,Y:0,w:0}));
const ST=Array.from({length:50},()=>({x:Math.random()*W,y:Math.random()*H*.35,a:Math.random()}));
const CL=Array.from({length:70},()=>({x:Math.random()*W,o:Math.random()*8,c:Math.random()<.5?'#ffd27a':'#7ad7ff'}));
const SL=Array.from({length:28},(_,i)=>({a:i/28*6.283+Math.random()*.2,p:Math.random()}));
function nk(e){return({ArrowUp:'w',ArrowDown:'s',ArrowLeft:'a',ArrowRight:'d',CapsLock:'capslock',Escape:'escape'})[e.key]||e.key.toLowerCase()}
function nextSection(){const hp=Math.min(.3,.08+G.km*.015),r=Math.random(),d=Math.random()<.5?-1:1;let c=0,len=30+Math.random()*50|0;
 if(G.force||r<.2){c=0;G.force=0}else if(r>1-hp){c=6*d;len=20+Math.random()*20|0;G.force=1}else if(r<.5)c=2*d;else{c=3.5*d;len+=30}
 G.tc=c;G.ts=[0,0,6,-6,3,-3][Math.random()*6|0];G.rem=len}
function genSeg(s,n){if(G.rem--<=0)nextSection();G.gc+=(G.tc-G.gc)*.1;G.gsl+=(G.ts-G.gsl)*.06-G.gy*.0006;G.gy+=G.gsl;
 s.c=G.gc;s.y=G.gy;s.la=n%9===0?(n%18===0?-1:1):0;s.sh=hash(n);s.sb=s.sh<.3?1:s.sh<.5?2:s.sh<.56?3:0;s.ss=hash(n+7)<.5?-1:1;s.so=2+hash(n+3)*4.5}
function resetGame(){reset();S.y=1.5;Object.assign(G,{crashT:0,shown:false,slowT:0,tsc:1,pos:0,x:0,km:0,top:0,topRpm:0,gen:0,crashed:false,paused:false,gc:0,gy:0,gsl:0,tc:0,ts:0,rem:0,force:1,hitT:0,drift:false,score:0,cb:0,cbT:0,passed:0,siren:0,sirenT:null});
 T.forEach(t=>{t.on=false;t.pend=null;t.sig=0;t.br=0});P.length=0;while(G.gen<D+40)genSeg(seg[G.gen%N],G.gen++);$('#crash').style.display='none';if(window.R3D&&R3D.reset)R3D.reset();say('ENGINE READY')}
function pause(){if(G.crashed||!S.started)return;G.paused=!G.paused;G.paused?A.ctx.suspend():A.ctx.resume()}
function crash(dir=1,sv=20){if(G.crashed)return;G.crashed=true;G.crashT=0;G.shown=false;G.cSev=clamp(sv/26,.5,1);A.crash(1,dir);hit(2.6,1);S.v*=.5;S.kick=1.5;say('CRASH!');
 if(window.R3D&&R3D.impact)R3D.impact(G.cSev,dir,true);else emit(20,'flame',2);G.best=Math.max(G.best,G.km);G.bestScore=Math.max(G.bestScore,G.score);try{localStorage.setItem('ce-score',G.bestScore)}catch(e){}
 try{localStorage.setItem('ce-best',G.best)}catch(e){}
 $('#cs').innerHTML=`DISTANCE ${G.km.toFixed(2)} KM<br>BEST ${G.best.toFixed(2)} KM<br>TOP SPEED ${Math.round(G.top)} KM/H<br>TOP RPM ${Math.round(G.topRpm)}<br>SCORE ${G.score} (BEST ${G.bestScore})<br>CARS PASSED ${G.passed}`}
const RT=[14.2,8.65,6.2,4.85,3.98,3.37],MASS=1250,WR=.33,K=.03455;
function impact(sv,dir=1){const sev=clamp(sv/14,.12,1);A.crash(sev,dir);hit(Math.min(2.2,.5+sv/6),Math.min(1,sv/10));S.kick=Math.max(S.kick,Math.min(1.5,sv/8));if(sv>7)G.slowT=.35;
 say(sv>9?'HARD HIT':sv>4?'COLLISION':'SCRAPE');if(window.R3D&&R3D.impact)R3D.impact(sev,dir,false);else emit(Math.min(14,sv|0),'flame',2)}
function knock(t,dir,rel){t.sl=dir*(1+rel*.18);t.sp=dir*(1.2+rel*.15);t.v*=Math.max(.45,1-rel*.03)}
function world(dt){G.pos=S.dist/SEGM;G.km=S.dist/1000;G.x=S.y/6;G.top=Math.max(G.top,S.speed);G.topRpm=Math.max(G.topRpm,S.rpm);
 while(G.gen<G.pos+D+30)genSeg(seg[G.gen%N],G.gen++);
 G.bgx+=seg[Math.floor(G.pos)%N].c/6*(S.speed/300)*90*dt;
 G.drift=Math.abs(S.vlat)>1.2&&S.v>20;if(G.drift&&cfg.particles&&P.length<400&&window.R3D&&R3D.rw){if(Math.random()<dt*40){const w=R3D.rw[Math.random()<.5?0:1];P.push({x:w[0],y:w[1],vx:(Math.random()-.5)*80,vy:-20-Math.random()*30,t:.9+Math.random()*.5,m:1.4,k:'smoke',s:10+Math.random()*10})}}else if(G.drift&&Math.random()<dt*25)emit(1,'smoke');
 G.cd+=((.84-clamp(S.v/80,0,1)*.1-S.boost/1.8*.05)-G.cd)*Math.min(1,dt*3);
 G.pitch+=(clamp(S.acc*.8,-10,6)-G.pitch)*Math.min(1,dt*6);
 if(((S.brake>.5&&S.v>16)||G.drift)&&Math.random()<dt*3)A.noise(.35,'bandpass',2200,1700,.15,0,8,'brake')}
function pickTy(){const n=(T.some(o=>o.on&&o.ty===7)||G.km<.4)?7:8;let tot=0;for(let i=0;i<n;i++)tot+=TY[i].w;let r=Math.random()*tot;for(let i=0;i<n;i++){r-=TY[i].w;if(r<=0)return i}return 0}
function spawnT(t,near){t.ty=pickTy();const d=TY[t.ty];t.L=d.L;t.W=d.W;let li=0;
 for(let k=0;k<10;k++){li=d.lanes[Math.random()*d.lanes.length|0];
  if(t.ty===7){const f=[0,1,2,3].filter(n=>Math.abs(LANES[n]-S.y)>2.4);li=f[Math.random()*f.length|0];t.s=S.dist-200-Math.random()*60}
  else t.s=S.dist+(near?100:250)+Math.random()*(near?500:450);
  t.tl=LANES[li];if(T.every(o=>o===t||!o.on||Math.abs(o.tl-t.tl)>1||Math.abs(o.s-t.s)>40+(o.L+t.L)/2))break}
 t.ly=t.tl;t.vt=[27-li*2.5+Math.random()*4,27-li*2.5+Math.random()*4,33+Math.random()*6,26-li*2+Math.random()*3,19+Math.random()*3,21+Math.random()*3,30+Math.random()*6,50+Math.random()*5][t.ty];
 t.v=t.vt;t.c=Math.random()*360|0;t.k=0;t.br=0;t.sig=0;t.pend=null;t.brk=0;t.pg=undefined;t.cd=0;t.dv=0;t.yo=0;t.sp=0;t.sl=0}
function laneClear(t,nl){const y=LANES[nl];if(Math.abs(S.dist-t.s)<14+t.L/2&&Math.abs(y-S.y)<2.4)return false;return T.every(o=>o===t||!o.on||Math.abs(o.tl-y)>1||Math.abs(o.s-t.s)>22+(o.L+t.L)/2)}
function want(t,li,urgent){const opts=[li-1,li+1].filter(n=>n>=0&&n<4&&(t.ty<4||t.ty>5||n>=2)&&laneClear(t,n));if(!opts.length)return;const nl=opts[Math.random()*opts.length|0];t.pend={nl,tm:urgent?.35:1.1};t.sig=nl>li?1:-1}
function nearMiss(edge){const pts=Math.round((40+S.v*1.8)*(edge<.5?2:1));G.cb=G.cbT>0?Math.min(8,G.cb+1):1;G.cbT=4;const g=pts*G.cb;G.score+=g;
 say((edge<.5?'SHAVED! +':'CLOSE CALL +')+g+(G.cb>1?'  x'+G.cb:''));A.noise(.35,'bandpass',500,2600,.3,0,2,'hit')}
function hornTraffic(){for(const t of T)if(t.on){const g=t.s-S.dist;if(g>0&&g<80&&Math.abs(t.ly-S.y)<2.4){t.vt=Math.min(40,t.vt+2.5);if(!t.pend)want(t,LANES.indexOf(t.tl),false)}}}
function traffic(dt){const cnt=Math.min(24,8+Math.floor(G.km/1));G.siren=0;G.sirenT=null;G.cbT-=dt;if(G.cbT<=0)G.cb=0;
 T.forEach((t,i)=>{if(i>=cnt){t.on=false;return}if(!t.on){spawnT(t,1);t.on=true}
  t.cd-=dt;t.brk-=dt;let a=null;for(const o of T)if(o!==t&&o.on&&Math.abs(o.ly-t.ly)<2&&o.s>t.s&&o.s-t.s<18+(o.L+t.L)/2&&(!a||o.s<a.s))a=o;
  const v0=t.v;if(t.brk>0)t.v=Math.max(t.vt*.45,t.v-9*dt);else if(a)t.v+=(a.v-t.v)*Math.min(1,dt*3);else t.v+=(t.vt-t.v)*Math.min(1,dt*.5);
  t.dv=(t.v-v0)/Math.max(dt,1e-3);t.br+=((t.dv<-1.2||t.brk>0?1:0)-t.br)*Math.min(1,dt*14);t.s+=t.v*dt;
  const li=LANES.indexOf(t.tl),gap=t.s-S.dist;
  if(t.ty===7){if(gap<0&&gap>-160&&Math.abs(t.tl-S.y)<2.4&&!t.pend)want(t,li,true)}
  else if(a&&a.v<t.vt-2&&!t.pend&&Math.random()<dt*.9)want(t,li);else if(!t.pend&&Math.random()<dt*.03)want(t,li);
  if(t.ty<4&&t.ty!==2&&G.km>1&&gap>70&&gap<220&&t.brk<=0&&Math.random()<dt*Math.min(.015,.003+G.km*.0008))t.brk=1.3;
  if(t.pend){t.pend.tm-=dt;if(t.pend.tm<=0){if(laneClear(t,t.pend.nl))t.tl=LANES[t.pend.nl];t.pend=null;t.sig=0}}
  t.ly+=(t.tl-t.ly)*Math.min(1,dt*1.2);
  if(t.sp||t.sl||t.yo){t.yo+=t.sp*dt;t.sp*=Math.pow(.25,dt);t.ly+=t.sl*dt;t.sl*=Math.pow(.3,dt);if(!t.sp)t.yo*=Math.pow(.4,dt);if(Math.abs(t.sp)<.02)t.sp=0;if(Math.abs(t.sl)<.02)t.sl=0;if(Math.abs(t.yo)<.005)t.yo=0}
  const lo=t.ty===7?-460:-40,hi=t.ty===7?800:900;if(gap<lo||gap>hi){spawnT(t,0);return}
  if(t.ty===7){const f=clamp(1-Math.abs(gap)/450,0,1);if(f>G.siren){G.siren=f;G.sirenT=t}}
  const hw=t.W/2+.95,hl=t.L/2+2.1,dl=Math.abs(t.ly-S.y);
  if(!G.crashed&&t.pg>0&&gap<=0&&t.cd<=0){const rel=S.v-t.v;if(rel>0&&dl>=hw){G.passed++;G.score+=10;A.noise(.35,'bandpass',700,2400,Math.min(.22,.03+rel*.007),0,1.2,'hit');if(rel>7&&dl<hw+1.2)nearMiss(dl-hw)}}
  if(!G.crashed&&t.cd<=0&&Math.abs(gap)<hl&&dl<hw){const rel=S.v-t.v;
   const dr=Math.sign(t.ly-S.y)||1;if(rel>11){knock(t,dr,rel);crash(dr,rel*1.6)}else{S.v=Math.max(t.v*.9,(S.v+t.v)/2);S.y+=Math.sign(S.y-t.ly||1)*.6;t.s+=(gap>=0?3:-3);t.cd=.6;G.cb=0;G.cbT=0;knock(t,dr,rel);impact(Math.max(1,rel),dr)}}
  t.pg=gap})}
const quad=(x1,y1,x2,y2,x3,y3,x4,y4,c)=>{x.fillStyle=c;x.beginPath();x.moveTo(x1,y1);x.lineTo(x2,y2);x.lineTo(x3,y3);x.lineTo(x4,y4);x.fill()};
function carBox(cx,cy,w,col){if(w<2)return;const h=w*.55;x.fillStyle='#0b0c11';x.fillRect(cx-w/2,cy-h*.6,w,h*.6);x.fillStyle=col;x.fillRect(cx-w*.36,cy-h,w*.72,h*.42);
 x.fillStyle='#ff2a2a';x.fillRect(cx-w*.46,cy-h*.5,w*.22,h*.12);x.fillRect(cx+w*.24,cy-h*.5,w*.22,h*.12)}
function spr(t,sx,sy,w,s){if(w<3)return;
 if(t==='L'){const ph=w*1.15;x.fillStyle='#2a2d36';x.fillRect(sx-1,sy-ph,Math.max(2,w*.02),ph);x.fillStyle='#ffd9a0';x.beginPath();x.arc(sx,sy-ph,Math.max(2,w*.035),0,7);x.fill();
  if(w>12){x.fillStyle='rgba(255,200,120,.12)';x.beginPath();x.arc(sx,sy-ph,w*.2,0,7);x.fill()}}
 else if(t==='T'){x.fillStyle='#0a1511';x.beginPath();x.moveTo(sx,sy-w*1.5);x.lineTo(sx-w*.35,sy-w*.2);x.lineTo(sx+w*.35,sy-w*.2);x.fill();x.fillStyle='#1a120c';x.fillRect(sx-w*.03,sy-w*.2,w*.06,w*.2)}
 else if(t==='B'){const bw=w*(.8+s.sh*2),bh=w*(1.5+s.sh*9);x.fillStyle='#0b0d15';x.fillRect(sx-bw/2,sy-bh,bw,bh);
  if(w>14){x.fillStyle='#ffd27a';for(let r=0;r<5;r++)for(let c=0;c<3;c++)if(hash(s.sh*100+r*3+c)<.4)x.fillRect(sx-bw/2+bw*(.15+c*.28),sy-bh+bh*(.1+r*.17),bw*.14,bh*.07)}}
 else{x.fillStyle='#1a1c26';x.fillRect(sx-w*.04,sy-w*1.2,w*.08,w*1.2);x.fillStyle=`hsl(${s.sh*360|0},90%,45%)`;x.fillRect(sx-w*.55,sy-w*1.8,w*1.1,w*.6)}}
function player(){const sc=G.camS;
 if(sc<.3){x.fillStyle='#0b0c11';x.beginPath();x.moveTo(W*.22,H);x.lineTo(W*.4,H*.8);x.lineTo(W*.6,H*.8);x.lineTo(W*.78,H);x.fill();x.strokeStyle=CARC[G.car];x.lineWidth=2;x.stroke();EX=W/2;EY=H*.82;EXO=60;return}
 const w=210*sc,h=w*.5,cx=W/2+S.steer*14,cy=H-60,c=CARC[G.car],br=S.brake>.25;
 x.save();x.translate(cx,cy);x.rotate(clamp(-Math.atan2(S.vlat,Math.max(S.v,3))*1.5+S.steer*.03,-.5,.5));
 x.fillStyle='#0c0d12';x.beginPath();x.moveTo(-w/2,0);x.lineTo(-w/2,-h*.5);x.lineTo(-w*.38,-h*.62);x.lineTo(-w*.28,-h*1.02);x.lineTo(w*.28,-h*1.02);x.lineTo(w*.38,-h*.62);x.lineTo(w/2,-h*.5);x.lineTo(w/2,0);x.closePath();x.fill();
 x.strokeStyle=c;x.lineWidth=2;x.shadowColor=c;x.shadowBlur=8;x.stroke();x.shadowBlur=0;
 x.fillStyle='#14161e';x.fillRect(-w*.24,-h*.97,w*.48,h*.28);x.fillStyle=c;x.fillRect(-w*.46,-h*.7,w*.92,h*.06);
 x.fillStyle=br?'#ff4040':'#b01218';x.shadowColor='#ff2020';x.shadowBlur=br?26:8;x.fillRect(-w*.46,-h*.42,w*.3,h*.1);x.fillRect(w*.16,-h*.42,w*.3,h*.1);x.shadowBlur=0;
 x.fillStyle='#050507';x.fillRect(-w*.5,-h*.18,w*.12,h*.2);x.fillRect(w*.38,-h*.18,w*.12,h*.2);x.fillStyle='#2a2d36';{const ph=(S.wheel/6.2832*4)%1;for(let q=0;q<4;q++){const ty=-h*.18+((q+ph)/4)*h*.19;x.fillRect(-w*.5,ty,w*.12,1.5);x.fillRect(w*.38,ty,w*.12,1.5)}}
 const g=clamp(S.rpm/8000*.7+S.boost/1.8*.6+S.throttle*.2,0,1);x.fillStyle=`rgba(255,${120+g*80|0},50,${.3+g*.7})`;x.shadowColor='#ff7a2e';x.shadowBlur=10+g*30;
 for(const sx of[-1,1]){x.beginPath();x.arc(sx*w*.16,-h*.1,3+g*5,0,7);x.fill()}x.shadowBlur=0;x.restore();EX=cx;EY=cy-h*.1;EXO=w*.16}
function parts(){x.globalCompositeOperation='lighter';for(const p of P){if(p.k==='smoke')continue;const a=p.t/p.m;x.fillStyle=`hsla(${20+a*30},100%,55%,${a})`;x.beginPath();x.arc(p.x,p.y,p.s*(a+.4),0,7);x.fill()}
 x.globalCompositeOperation='source-over';for(const p of P){if(p.k!=='smoke')continue;const a=p.t/p.m;x.fillStyle=`rgba(120,120,130,${a*.25})`;x.beginPath();x.arc(p.x,p.y,p.s*(2-a),0,7);x.fill()}}
function drawWorld(now){if(window.R3D&&R3D.on){R3D.draw(now);parts();return}const cam=CAMS[G.cam],y0=H*.42+G.pitch+S.kick*4,hw=W/2;G.camH+=(cam.h-G.camH)*.08;G.camS+=(cam.s-G.camS)*.08;
 const base=Math.floor(G.pos),fr=G.pos-base,s0=seg[base%N],s1=seg[(base+1)%N],camY=G.camH+s0.y+(s1.y-s0.y)*fr,camX=G.x*ROADW;
 const k=(G.km%12)/12*3,i0=Math.floor(k)%3,i1=(i0+1)%3,f=k-Math.floor(k),top=mix(PAL[i0][0],PAL[i1][0],f),bot=mix(PAL[i0][1],PAL[i1][1],f);
 const g=x.createLinearGradient(0,0,0,y0);g.addColorStop(0,rgb(top));g.addColorStop(1,rgb(bot));x.fillStyle=g;x.fillRect(0,0,W,y0+2);
 x.fillStyle='#fff';for(const s of ST){x.globalAlpha=s.a*.6*(i0===2?1-f:1);x.fillRect(s.x,s.y,1.5,1.5)}x.globalAlpha=1;
 x.fillStyle='#070911';x.beginPath();x.moveTo(0,y0);for(let px=0;px<=W;px+=32){const q=px+G.bgx;x.lineTo(px,y0-40-38*Math.abs(Math.sin(q*.004))-22*Math.sin(q*.011+1))}x.lineTo(W,y0);x.fill();
 for(const c of CL){x.fillStyle=c.c;x.fillRect((((c.x-G.bgx*1.5)%W)+W)%W,y0-4-c.o,2,2)}
 x.fillStyle='#06080c';x.fillRect(0,y0,W,H-y0);
 let wx=0,dx=-s0.c*fr;
 for(let j=0;j<=D;j++){const s=seg[(base+j)%N],z=(j-fr)*SEG+600,sc=G.cd/z,p=PR[j];p.X=hw-clamp(S.yaw,-.4,.4)*G.cd*hw+sc*(wx-camX)*hw;p.Y=y0+sc*(camY-s.y)*H/2;p.w=sc*ROADW*hw;wx+=dx;dx+=s.c}
 for(let j=D-1;j>=0;j--){const a=PR[j],b=PR[j+1],n=base+j,s=seg[n%N],par=(n/3|0)&1;if(a.Y<=b.Y)continue;
  x.fillStyle=par?'#07090d':'#05070b';x.fillRect(0,b.Y,W,a.Y-b.Y+1);const aw=a.w,bw=b.w,rc=par?'#6a1820':'#9aa0ae',rl=par?'#3a3e4a':'#2a2d36';
  quad(a.X-aw*1.12,a.Y,a.X-aw,a.Y,b.X-bw,b.Y,b.X-bw*1.12,b.Y,rc);quad(a.X+aw,a.Y,a.X+aw*1.12,a.Y,b.X+bw*1.12,b.Y,b.X+bw,b.Y,rc);
  quad(a.X-aw,a.Y,a.X+aw,a.Y,b.X+bw,b.Y,b.X-bw,b.Y,par?'#15161d':'#181a22');
  if(par)quad(a.X-aw*.012,a.Y,a.X+aw*.012,a.Y,b.X+bw*.012,b.Y,b.X-bw*.012,b.Y,'#c9ced9');
  quad(a.X-aw*1.2,a.Y-aw*.1,a.X-aw*1.2,a.Y,b.X-bw*1.2,b.Y,b.X-bw*1.2,b.Y-bw*.1,rl);quad(a.X+aw*1.2,a.Y-aw*.1,a.X+aw*1.2,a.Y,b.X+bw*1.2,b.Y,b.X+bw*1.2,b.Y-bw*.1,rl);
  if(s.la)spr('L',a.X+s.la*aw*1.35,a.Y,aw,s);
  if(s.sb)spr(s.sb===1?'T':s.sb===2?'B':'P',a.X+s.ss*aw*s.so,a.Y,aw,s);
  for(const t of T)if(t.on&&Math.floor(t.s/SEGM)===n)carBox(a.X+t.ly/6*aw,a.Y,aw*.36,`hsl(${t.c},60%,35%)`)}
 const fg=x.createLinearGradient(0,y0-10,0,y0+170);fg.addColorStop(0,`rgba(${bot.map(Math.round)},.9)`);fg.addColorStop(1,`rgba(${bot.map(Math.round)},0)`);x.fillStyle=fg;x.fillRect(0,y0-10,W,180);
 const hg=x.createRadialGradient(W/2,H*.7,10,W/2,H*.7,380);hg.addColorStop(0,'rgba(255,230,180,.14)');hg.addColorStop(1,'rgba(255,230,180,0)');x.fillStyle=hg;x.fillRect(0,H*.4,W,H*.6);
 const sf=S.speed/300+S.boost*.15;
 if(sf>.25&&!cfg.reduced){x.strokeStyle=`rgba(200,220,255,${Math.min(.35,sf*.3)})`;x.lineWidth=1;x.beginPath();
  for(const l of SL){const ph=(now*.0008*(1+sf*3)+l.p)%1,r1=120+ph*ph*700,r2=r1+30+sf*160;x.moveTo(hw+Math.cos(l.a)*r1,y0+Math.sin(l.a)*r1*.6);x.lineTo(hw+Math.cos(l.a)*r2,y0+Math.sin(l.a)*r2*.6)}x.stroke()}
 player();
 x.globalCompositeOperation='lighter';for(const p of P){if(p.k==='smoke')continue;const a=p.t/p.m;x.fillStyle=`hsla(${20+a*30},100%,55%,${a})`;x.beginPath();x.arc(p.x,p.y,p.s*(a+.4),0,7);x.fill()}
 x.globalCompositeOperation='source-over';for(const p of P){if(p.k!=='smoke')continue;const a=p.t/p.m;x.fillStyle=`rgba(120,120,130,${a*.25})`;x.beginPath();x.arc(p.x,p.y,p.s*(2-a),0,7);x.fill()}}
let FOK=true;const FMP3=new Audio('sound/turbo_exhaust_sound.mp3');FMP3.preload='auto';FMP3.addEventListener('error',()=>FOK=false);
function fSound(){if(!FOK){A.purr();return}
 try{if(A.ctx&&!A.fnode){A.fnode=A.ctx.createMediaElementSource(FMP3);A.fnode.connect(A.pan.exhaust)}FMP3.volume=1}catch(e){FMP3.volume=cfg.mute?0:clamp(cfg.master*cfg.fx,0,1)}
 try{FMP3.currentTime=0}catch(e){}FMP3.play().catch(()=>{FOK=false;A.purr()})}

/* ---------- LOOP ---------- */
let last=0;
function frame(now){const rdt=Math.max(0,Math.min(.05,(now-last)/1000||.016));last=now;let ts=1;
 if(G.crashed){G.crashT+=rdt;ts=clamp(.16+G.crashT*.5,.16,1);if(!G.shown&&G.crashT>2.4&&S.started){G.shown=true;$('#crash').style.display='flex'}}else if(G.slowT>0){G.slowT-=rdt;ts=.5}
 G.tsc=ts;const dt=rdt*ts;
 if(S.started&&!G.paused){sim(dt);A.update()}render(now);requestAnimationFrame(frame)}

/* ---------- INPUT / UI ---------- */
const KEYS=[['w','W','ACCELERATE'],['capslock','CAPS','SHIFT'],[' ','SPACE','BOOST'],['e','E','EXHAUST'],['r','R','LIMITER'],['s','S','BRAKE'],['a','A','LEFT'],['d','D','RIGHT'],['1','1-6','GEAR'],['f','F','PURR'],['g','G','TEASE'],['h','H','H-SHIFT'],['j','J','FLUTTER'],['k','K','SILK'],['b','B','HORN'],['shift','SHIFT','DOWN'],['c','C','CAMERA'],['escape','ESC','PAUSE']];
const EL={};KEYS.forEach(([k,b,l])=>{const e=document.createElement('div');e.className='k';e.innerHTML=`<b>${b}</b>${l}`;$('#keys').appendChild(e);EL[k]=e;if(k==='1')'23456'.split('').forEach(n=>EL[n]=e)});
const lit=(k,on)=>{if(EL[k]&&(on?cfg.keyfx:true))EL[k].classList.toggle('on',on)};
addEventListener('keydown',e=>{const k=nk(e);if(e.key.startsWith('Arrow'))e.preventDefault();
 if(k===' '&&e.target.tagName!=='INPUT')e.preventDefault();
 if(G.crashed&&G.shown&&(k==='enter'||k==='r')&&!e.repeat){$('#rs').click();return}
 if(!S.started||G.crashed||e.target.tagName==='INPUT')return;
 if(k==='capslock'){if(!e.repeat){once(k);lit(k,1);setTimeout(()=>lit(k,0),160)}return}
 const fresh=!keys[k]&&!e.repeat;keys[k]=true;lit(k,1);if(fresh)once(k)});
addEventListener('keyup',e=>{const k=nk(e);if(k===' ')e.preventDefault();keys[k]=false;lit(k,0)});
addEventListener('blur',()=>{for(const k in keys){keys[k]=false;lit(k,0)}});
document.querySelectorAll('[data-k]').forEach(i=>{const k=i.dataset.k,chk=i.type==='checkbox';
 chk?i.checked=cfg[k]:i.value=cfg[k];
 i.addEventListener('input',()=>{cfg[k]=chk?i.checked:+i.value;A.apply();try{localStorage.setItem('chaos-engine',JSON.stringify(cfg))}catch(e){}})});
$('#reset').onclick=e=>{resetGame();e.target.blur()};
$('#go').onclick=async()=>{if(!A.ctx)A.init();await A.ctx.resume();resetGame();$('#start').style.display='none';S.started=true;S.rpm=2200;A.pop(1);A.crackle(3);hit(.8,.6);$('#go').blur()};
$('#rs').onclick=async()=>{await A.ctx.resume();resetGame();S.rpm=1500;$('#rs').blur()};
$('#mm').onclick=()=>{S.started=false;G.crashed=false;$('#crash').style.display='none';$('#start').style.display='flex';A.ctx.suspend()};
$('#garage').onclick=e=>{G.car=(G.car+1)%4;try{localStorage.setItem('ce-car',G.car)}catch(_){}e.target.textContent='GARAGE · COLOR '+(G.car+1);e.target.blur()};
$('#sets').onclick=e=>{const b=$('#bar');b.style.display=b.style.display==='none'?'flex':'none';e.target.blur()};
addEventListener('beforeunload',()=>{try{localStorage.setItem('ce-best',Math.max(G.best,G.km))}catch(_){}});
resetGame();
requestAnimationFrame(frame);
