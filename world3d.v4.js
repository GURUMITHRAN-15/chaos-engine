/* CHAOS ENGINE 3D renderer: reads the ONE vehicle state (S) + road data (seg) from script.js. No physics lives here. */
import * as THREE from 'three';
const cvs=document.getElementById('gl'),stage=cvs.parentElement;
let ren;try{ren=new THREE.WebGLRenderer({canvas:cvs,antialias:true,powerPreference:'high-performance'})}catch(e){console.warn('WebGL unavailable, using 2D fallback');}
if(ren){
ren.setPixelRatio(1);
const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(60,16/9,.1,1500),fogc=new THREE.Color(0x0e1022);
scene.fog=new THREE.Fog(fogc,30,1000);scene.background=fogc;
const rs=()=>{const w=stage.clientWidth,h=stage.clientHeight;ren.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()};new ResizeObserver(rs).observe(stage);rs();
scene.add(new THREE.HemisphereLight(0x4a5580,0x05060a,.7));const moon=new THREE.DirectionalLight(0x7080b0,.5);moon.position.set(-1,2,1);scene.add(moon);
const cv2=(w,h,f)=>{const c=document.createElement('canvas');c.width=w;c.height=h;f(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t};
const roadTex=cv2(256,256,(g,w,h)=>{g.fillStyle='#17181e';g.fillRect(0,0,w,h);for(let i=0;i<1500;i++){g.fillStyle=`rgba(${70+Math.random()*40|0},${70+Math.random()*40|0},${80+Math.random()*40|0},.15)`;g.fillRect(Math.random()*w,Math.random()*h,2,2)}
 g.fillStyle='#c9ced9';g.fillRect(w*.04,0,5,h);g.fillRect(w*.96-5,0,5,h);g.fillRect(w*.5-3,0,6,h*.5);
 for(let i=0;i<8;i++){g.fillStyle=i%2?'#8a1a22':'#aab0be';g.fillRect(0,i*h/8,w*.03,h/8);g.fillRect(w*.97,i*h/8,w*.03,h/8)}});
roadTex.wrapS=roadTex.wrapT=THREE.RepeatWrapping;roadTex.anisotropy=8;
const glowT=cv2(64,64,(g)=>{const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.3,'rgba(255,255,255,.4)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64)});
const winT=cv2(64,128,(g)=>{g.fillStyle='#0b0d15';g.fillRect(0,0,64,128);for(let y=0;y<16;y++)for(let x=0;x<6;x++)if(Math.random()<.35){g.fillStyle=Math.random()<.8?'#ffd27a':'#7ad7ff';g.fillRect(x*10+3,y*8+2,5,4)}});
const wheelT=cv2(128,128,(g)=>{g.translate(64,64);g.fillStyle='#08080b';g.beginPath();g.arc(0,0,63,0,7);g.fill();g.fillStyle='#17171d';g.beginPath();g.arc(0,0,48,0,7);g.fill();g.fillStyle='#34343e';for(let i=0;i<5;i++){g.rotate(1.2566);g.fillRect(-5,0,10,46)}g.fillStyle='#0c0c10';g.beginPath();g.arc(0,0,11,0,7);g.fill()});

/* ----- road ribbons built from the SAME segments the physics uses (curvature = c*.0008 rad/m, slope = dy/200) ----- */
const J0=10,J1=110,NJ=J0+J1+1,NX=new Float32Array(NJ),NZ=new Float32Array(NJ),NE=new Float32Array(NJ),NT=new Float32Array(NJ);let BASE=0;
const sg=n=>seg[((n%N)+N)%N];
function nodes(){NX[J0]=NZ[J0]=NE[J0]=NT[J0]=0;
 for(let j=0;j<J1;j++){const i=J0+j,k=sg(BASE+j),k2=sg(BASE+j+1);NX[i+1]=NX[i]+Math.sin(NT[i])*SEGM;NZ[i+1]=NZ[i]-Math.cos(NT[i])*SEGM;NT[i+1]=NT[i]+k.c*.0048;NE[i+1]=NE[i]+(k2.y-k.y)*.03}
 for(let j=0;j>-J0;j--){const i=J0+j,k=sg(BASE+j-1),k2=sg(BASE+j);NT[i-1]=NT[i]-k.c*.0048;NX[i-1]=NX[i]-Math.sin(NT[i-1])*SEGM;NZ[i-1]=NZ[i]+Math.cos(NT[i-1])*SEGM;NE[i-1]=NE[i]-(k2.y-sg(BASE+j-1).y)*.03}}
function strip(mat,uv){const g=new THREE.BufferGeometry(),nrm=new Float32Array(NJ*6);for(let i=0;i<NJ*2;i++)nrm[i*3+1]=1;
 g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(NJ*6),3).setUsage(THREE.DynamicDrawUsage));g.setAttribute('normal',new THREE.BufferAttribute(nrm,3));
 if(uv){const u=new Float32Array(NJ*4);for(let i=0;i<NJ;i++){u[i*4+2]=1}g.setAttribute('uv',new THREE.BufferAttribute(u,2).setUsage(THREE.DynamicDrawUsage))}
 const idx=[];for(let i=0;i<NJ-1;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}g.setIndex(idx);const m=new THREE.Mesh(g,mat);m.frustumCulled=false;scene.add(m);return m}
function fill(m,la,ha,lb,hb){const p=m.geometry.attributes.position.array;for(let i=0;i<NJ;i++){const o=i*6,c=Math.cos(NT[i]),s=Math.sin(NT[i]);p[o]=NX[i]+c*la;p[o+1]=NE[i]+ha;p[o+2]=NZ[i]+s*la;p[o+3]=NX[i]+c*lb;p[o+4]=NE[i]+hb;p[o+5]=NZ[i]+s*lb}m.geometry.attributes.position.needsUpdate=true}
const road=strip(new THREE.MeshStandardMaterial({map:roadTex,roughness:.5,metalness:.15,side:THREE.DoubleSide}),true),
 ground=strip(new THREE.MeshStandardMaterial({color:0x07090e,roughness:1,side:THREE.DoubleSide})),
 railMat=new THREE.MeshStandardMaterial({color:0x5a606e,roughness:.4,metalness:.6,side:THREE.DoubleSide}),railL=strip(railMat),railR=strip(railMat);
function pt(s,lat,o){const f=s/SEGM-BASE+J0,i=clamp(Math.floor(f),0,NJ-2),a=clamp(f-i,0,1),th=NT[i]+(NT[i+1]-NT[i])*a;
 o.x=NX[i]+(NX[i+1]-NX[i])*a+Math.cos(th)*lat;o.y=NE[i]+(NE[i+1]-NE[i])*a;o.z=NZ[i]+(NZ[i+1]-NZ[i])*a+Math.sin(th)*lat;o.th=th;return o}

/* ----- pooled / instanced scenery ----- */
const dm=new THREE.Object3D(),col=new THREE.Color(),bm=(o)=>new THREE.MeshBasicMaterial(o);
const mk=(geo,mat,n)=>{const m=new THREE.InstancedMesh(geo,mat,n);m.frustumCulled=false;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(m);return m};
const poles=mk(new THREE.CylinderGeometry(.08,.1,8,6).translate(0,4,0),bm({color:0x2a2d36}),40),heads=mk(new THREE.SphereGeometry(.3,6,4),bm({color:0xffd9a0}),40),
 pools=mk(new THREE.PlaneGeometry(11,11).rotateX(-Math.PI/2),bm({map:glowT,color:0xffc880,transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false}),40),
 trees=mk(new THREE.ConeGeometry(1.8,7,6).translate(0,3.5,0),bm({color:0x0a1812}),90),bldg=mk(new THREE.BoxGeometry(1,1,1).translate(0,.5,0),bm({map:winT,color:0x9a9aaa}),50),
 bill=mk(new THREE.BoxGeometry(1,1,1).translate(0,.5,0),bm({color:0xffffff}),14);
const place=(m,k,x,y,z,ry,sx,sy,sz)=>{dm.position.set(x,y,z);dm.rotation.set(0,ry,0);dm.scale.set(sx,sy,sz);dm.updateMatrix();m.setMatrixAt(k,dm.matrix)};
const mt=new THREE.Group();for(let i=0;i<18;i++){const a=i/18*6.283+Math.random()*.2,r=640+Math.random()*180,h=90+Math.random()*180,m=new THREE.Mesh(new THREE.ConeGeometry(1,1,5),bm({color:0x090b16}));m.scale.set(130+Math.random()*120,h,130+Math.random()*120);m.position.set(Math.cos(a)*r,h/2-20,Math.sin(a)*r);mt.add(m)}scene.add(mt);
const pts=(n,f,size,color)=>{const p=new Float32Array(n*3);for(let i=0;i<n;i++)p.set(f(),i*3);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));const o=new THREE.Points(g,new THREE.PointsMaterial({color,size,sizeAttenuation:false,fog:false}));o.frustumCulled=false;scene.add(o);return o};
const stars=pts(400,()=>{const a=Math.random()*6.283,e=Math.random()*1.2+.05;return[Math.cos(a)*Math.cos(e)*1100,Math.sin(e)*1100,Math.sin(a)*Math.cos(e)*1100]},1.6,0xaab4ff),
 city=pts(160,()=>{const a=Math.random()*6.283,r=560+Math.random()*120;return[Math.cos(a)*r,2+Math.random()*30,Math.sin(a)*r]},2,0xffc878);

/* ----- traffic (positions/velocities come from script.js T) ----- */
const tm=T.map(()=>{const g=new THREE.Group(),b=new THREE.MeshStandardMaterial({color:0x222530,roughness:.4,metalness:.5});
 const body=new THREE.Mesh(new THREE.BoxGeometry(1.8,.7,4.2),b);body.position.y=.55;const cab=new THREE.Mesh(new THREE.BoxGeometry(1.5,.5,2.2),b);cab.position.set(0,1.05,.3);
 const tl=new THREE.Mesh(new THREE.BoxGeometry(1.5,.16,.1),bm({color:0xff2a20}));tl.position.set(0,.7,2.12);g.add(body,cab,tl);g.visible=false;scene.add(g);return g});

/* ----- player car: built from YOUR car sheet (cut-outs in assets/images) ----- */
const L=4.5,H=1.3,ld=new THREE.TextureLoader(),car=new THREE.Group();car.rotation.order='YXZ';scene.add(car);
const cm=f=>{const t=ld.load('assets/images/'+f);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return new THREE.MeshBasicMaterial({map:t,alphaTest:.45,color:0xc0c0d0})};
const face=(w,h,f,x,y,z,rx,ry)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),cm(f));m.rotation.order='YXZ';m.position.set(x,y,z);m.rotation.set(rx,ry,0);car.add(m)};
face(L,H,'car_side.png',-.92,H/2,0,0,-Math.PI/2);face(L,H,'car_side_r.png',.92,H/2,0,0,Math.PI/2);
face(2.05,H,'car_rear.png',0,H/2,L/2,0,0);face(2.13,H,'car_front.png',0,H/2,-L/2,0,Math.PI);face(2,L,'car_top.png',0,.98,0,-Math.PI/2,Math.PI);
const wheels=[[-1,-1.28,1],[1,-1.28,1],[-1,1.31,0],[1,1.31,0]].map(([sd,z,fr])=>{const pos=new THREE.Group(),st=new THREE.Group(),fc=new THREE.Group(),d=new THREE.Mesh(new THREE.CircleGeometry(.31,24),bm({map:wheelT,alphaTest:.5}));
 pos.position.set(sd*.935,.32,z);fc.rotation.y=sd*Math.PI/2;fc.add(d);st.add(fc);pos.add(st);car.add(pos);return{sd,fr,st,d}});
const glow=c=>{const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowT,color:c,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));car.add(s);return s};
const tails=[-.62,.62].map(x=>{const s=glow(0xff2a20);s.position.set(x,.8,L/2+.06);return s}),exh=glow(0xff8a2e);exh.position.set(-.57,.3,L/2+.12);
const spot=new THREE.SpotLight(0xffe6c0,250,120,.5,.6,1.2);spot.position.set(0,.8,-2.1);spot.target.position.set(0,0,-30);car.add(spot,spot.target);

/* ----- per-frame: everything below only READS the vehicle state ----- */
let last=0,camH=0,fov=60,first=1;const tmp={},v3=new THREE.Vector3();
function draw(now){const dt=Math.min(.05,(now-last)/1000||.016);last=now;BASE=Math.floor(S.dist/SEGM);nodes();
 fill(ground,-400,-.05,400,-.05);fill(road,-6,0,6,0);fill(railL,-7.2,0,-7.2,.8);fill(railR,7.2,0,7.2,.8);
 const ua=road.geometry.attributes.uv.array;for(let i=0;i<NJ;i++){const v=(i-J0+BASE%4)*.25;ua[i*4+1]=v;ua[i*4+3]=v}road.geometry.attributes.uv.needsUpdate=true;
 let nl=0,nt=0,nb=0,ng=0;
 for(let j=0;j<J1-1;j++){const i=J0+j,s=sg(BASE+j),c=Math.cos(NT[i]),sn=Math.sin(NT[i]),ry=-NT[i],X=l=>NX[i]+c*l,Z=l=>NZ[i]+sn*l,y=NE[i];
  if(s.la&&nl<40){place(poles,nl,X(s.la*7.9),y,Z(s.la*7.9),ry,1,1,1);place(heads,nl,X(s.la*7.9),y+8,Z(s.la*7.9),0,1,1,1);place(pools,nl,X(s.la*4),y+.06,Z(s.la*4),ry,1,1,1);nl++}
  if(s.sb===1&&nt<90){const l=s.ss*s.so*6,k=1+s.sh*.7;place(trees,nt++,X(l),y,Z(l),0,k,k,k)}
  else if(s.sb===2&&nb<50){const l=s.ss*(s.so*6+8);place(bldg,nb++,X(l),y,Z(l),ry,10+s.sh*14,10+s.sh*50,10+s.sh*10)}
  else if(s.sb===3&&ng<14){const l=s.ss*(s.so*3+9);place(bill,ng,X(l),y+5,Z(l),ry+(s.ss>0?-1:1)*1.2,7,3,.3);bill.setColorAt(ng++,col.setHSL(s.sh,.9,.5))}}
 [[poles,nl],[heads,nl],[pools,nl],[trees,nt],[bldg,nb],[bill,ng]].forEach(([m,n])=>{m.count=n;m.instanceMatrix.needsUpdate=true});if(bill.instanceColor)bill.instanceColor.needsUpdate=true;
 T.forEach((t,k)=>{const g=tm[k],r=t.s-S.dist;g.visible=t.on&&r<SEGM*(J1-6)&&r>-SEGM*(J0-2);if(g.visible){pt(t.s,t.ly,tmp);g.position.set(tmp.x,tmp.y,tmp.z);g.rotation.y=-tmp.th;g.children[0].material.color.setHSL(t.c/360,.5,.12)}});
 /* player car: position on road from distance + lateral offset, heading = road tangent + yaw */
 pt(S.dist,S.y,tmp);const th=tmp.th+S.yaw;car.position.set(tmp.x,tmp.y,tmp.z);car.rotation.set(clamp(-S.acc*.003,-.04,.04),-th,clamp(S.omega*S.v*.0035,-.07,.07));
 const maxd=Math.min(.5,35/(S.v*S.v+1)),spin=S.wheel;wheels.forEach(w=>{w.d.rotation.z=w.sd<0?spin:-spin;if(w.fr)w.st.rotation.y=-S.steer*maxd});
 const g=clamp(S.rpm/8000*.7+S.boost/1.8*.6+S.throttle*.2,0,1);exh.material.opacity=.3+g*.7;exh.scale.setScalar(.3+g*1.2);tails.forEach(s=>{s.material.opacity=.35+S.brake*.65;s.scale.setScalar(.5+S.brake*.8)});
 /* camera: follows actual vehicle position + heading (lagged), FOV from real speed/boost, roll from steering, kick from shifts */
 const hood=G.cam===2,dist=G.cam===1?4.8:6.8,h=G.cam===1?1.9:2.5;car.visible=!hood;if(first){camH=th;first=0}camH+=(th-camH)*Math.min(1,dt*(hood?30:5));
 const fx=Math.sin(camH),fz=-Math.cos(camH);
 if(hood)cam.position.set(car.position.x+fx*.3,car.position.y+1.12,car.position.z+fz*.3);else cam.position.set(car.position.x-fx*dist,car.position.y+h-S.kick*.15,car.position.z-fz*dist);
 cam.lookAt(car.position.x+Math.sin(th)*10,car.position.y+1.1,car.position.z-Math.cos(th)*10);cam.rotateZ(clamp(-S.steer*.025*Math.min(1,S.v/40),-.03,.03)-S.vlat*.004);
 if(cfgShake()&&S.shake>0){cam.position.x+=(Math.random()-.5)*S.shake*.4;cam.position.y+=(Math.random()-.5)*S.shake*.4}
 fov+=(60+clamp(S.v/80,0,1)*12+S.boost/1.8*8+S.kick*2-fov)*Math.min(1,dt*4);cam.fov=fov;cam.updateProjectionMatrix();
 const k=(G.km%12)/12*3,i0=Math.floor(k)%3,i1=(i0+1)%3,bot=mix(PAL[i0][1],PAL[i1][1],k-Math.floor(k));fogc.setRGB(bot[0]/255*.8,bot[1]/255*.8,bot[2]/255*.8);
 mt.position.set(cam.position.x,car.position.y,cam.position.z);stars.position.copy(cam.position);city.position.set(cam.position.x,car.position.y,cam.position.z);
 ren.render(scene,cam);
 car.updateMatrixWorld(true);cam.updateMatrixWorld();v3.set(-.57,.3,L/2+.2);car.localToWorld(v3);v3.project(cam);
 if(v3.z<1&&!hood){EX=(v3.x*.5+.5)*W;EY=(-v3.y*.5+.5)*H}else{EX=W/2;EY=H*.9}EXO=4}
window.R3D={on:true,draw};
}
