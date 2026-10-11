/* CHAOS ENGINE 3D renderer: reads the ONE vehicle state (S) + road data (seg) from script.js. No physics lives here. */
import * as THREE from 'three';
const cvs=document.getElementById('gl'),stage=cvs.parentElement;
let ren;try{ren=new THREE.WebGLRenderer({canvas:cvs,antialias:true,powerPreference:'high-performance'})}catch(e){console.warn('WebGL unavailable, using 2D fallback');}
if(ren){
ren.setPixelRatio(1);ren.toneMapping=THREE.ACESFilmicToneMapping;ren.toneMappingExposure=1.15;
const scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(60,16/9,.1,1500),fogc=new THREE.Color(0x0e1022);
scene.fog=new THREE.Fog(fogc,30,1000);scene.background=fogc;
const rs=()=>{const w=stage.clientWidth,h=stage.clientHeight;ren.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()};new ResizeObserver(rs).observe(stage);rs();
scene.add(new THREE.HemisphereLight(0x4a5580,0x05060a,.45));
/* night-city reflection environment (lamps, neon, tail glow) -> real reflections in the paint & glass */
{const es=new THREE.Scene();es.add(new THREE.Mesh(new THREE.SphereGeometry(40,24,12),new THREE.MeshBasicMaterial({color:0x0b0e1c,side:THREE.BackSide})));
 const st=(w,h,x,y,z,c,i,ry,rx)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(c).multiplyScalar(i),side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.set(rx,ry,0);es.add(m)};
 for(let i=-3;i<=3;i++)st(1.4,7,0,14,i*9,0xffc880,14,0,-Math.PI/2);
 st(10,4,-24,6,-6,0x3dd6ff,7,Math.PI/2,0);st(10,4,24,7,8,0xff3d8a,6,-Math.PI/2,0);st(12,3,0,3,32,0xff2a20,5,0,0);st(8,5,-22,9,14,0x8a3cff,6,Math.PI/2,0);
 scene.environment=new THREE.PMREMGenerator(ren).fromScene(es,.02).texture}const moon=new THREE.DirectionalLight(0x7080b0,.5);moon.position.set(-1,2,1);scene.add(moon);
const cv2=(w,h,f)=>{const c=document.createElement('canvas');c.width=w;c.height=h;f(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t};
const roadTex=cv2(512,512,(g,w,h)=>{g.fillStyle='#1a1b21';g.fillRect(0,0,w,h);
 for(let i=0;i<9000;i++){const v=55+Math.random()*50|0;g.fillStyle=`rgba(${v},${v},${v+10},${.1+Math.random()*.15})`;g.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*2,1+Math.random()*2)}
 for(let l=0;l<4;l++){const c=w*(l*.25+.125);g.fillStyle='rgba(0,0,0,.28)';g.fillRect(c-w*.07,0,w*.035,h);g.fillRect(c+w*.035,0,w*.035,h)}
 g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=1.5;for(let i=0;i<7;i++){g.beginPath();let x=Math.random()*w,y=Math.random()*h;g.moveTo(x,y);for(let k=0;k<5;k++){x+=(Math.random()-.5)*40;y+=Math.random()*30;g.lineTo(x,y)}g.stroke()}
 g.fillStyle='#c9ced9';g.fillRect(w*.04,0,8,h);g.fillRect(w*.96-8,0,8,h);for(const u of[.25,.5,.75])g.fillRect(w*u-4,0,8,h*.5);
 for(let i=0;i<8;i++){g.fillStyle=i%2?'#8a1a22':'#aab0be';g.fillRect(0,i*h/8,w*.03,h/8);g.fillRect(w*.97,i*h/8,w*.03,h/8)}});
roadTex.wrapS=roadTex.wrapT=THREE.RepeatWrapping;
const groundTex=cv2(128,128,(g,w,h)=>{g.fillStyle='#0b120e';g.fillRect(0,0,w,h);for(let i=0;i<1400;i++){const r=Math.random();g.fillStyle=r<.6?`rgba(22,40,28,${.3+Math.random()*.4})`:r<.85?'rgba(40,34,26,.5)':'rgba(10,10,12,.6)';g.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*3,1+Math.random()*3)}});
groundTex.wrapS=groundTex.wrapT=THREE.RepeatWrapping;groundTex.anisotropy=8;
const treeT=cv2(64,64,(g,w,h)=>{g.fillStyle='#0b1a12';g.fillRect(0,0,w,h);for(let i=0;i<260;i++){g.fillStyle=Math.random()<.6?'#16301f':'#08120c';g.fillRect(Math.random()*w,Math.random()*h,2+Math.random()*4,2+Math.random()*4)}});
const treeT2=cv2(64,64,(g,w,h)=>{g.fillStyle='#1d4a2c';g.fillRect(0,0,w,h);for(let i=0;i<300;i++){g.fillStyle=Math.random()<.5?'#2b6a3c':'#0f2c19';g.fillRect(Math.random()*w,Math.random()*h,2+Math.random()*5,2+Math.random()*3)}}),
 groundTex2=cv2(256,256,(g,w,h)=>{g.fillStyle='#9a9a9a';g.fillRect(0,0,w,h);for(let i=0;i<30;i++){const x=Math.random()*w,y=Math.random()*h,r=10+Math.random()*30,gr=g.createRadialGradient(x,y,0,x,y,r),v=Math.random()<.5?255:0;gr.addColorStop(0,`rgba(${v},${v},${v},.18)`);gr.addColorStop(1,`rgba(${v},${v},${v},0)`);g.fillStyle=gr;g.fillRect(x-r,y-r,2*r,2*r)}
  for(let i=0;i<4500;i++){const v=70+Math.random()*150|0;g.fillStyle=`rgba(${v},${v},${v},${.2+Math.random()*.4})`;g.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*3,1+Math.random()*3)}}),
 shT=cv2(128,128,(g,w,h)=>{g.fillStyle='#4a4a50';g.fillRect(0,0,w,h);for(let i=0;i<1600;i++){const v=60+Math.random()*100|0;g.fillStyle=`rgb(${v},${v},${v+6})`;g.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*3,1+Math.random()*2)}}),
 rockT=cv2(128,128,(g,w,h)=>{g.fillStyle='#8a7a6a';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=4){const v=110+Math.random()*60|0;g.fillStyle=`rgba(${v},${v-15},${v-35},.55)`;g.fillRect(0,y,w,2+Math.random()*4)}
  g.strokeStyle='rgba(0,0,0,.35)';for(let i=0;i<30;i++){g.beginPath();let x=Math.random()*w,y=Math.random()*h;g.moveTo(x,y);for(let k=0;k<4;k++){x+=(Math.random()-.5)*20;y+=Math.random()*14;g.lineTo(x,y)}g.stroke()}}),
 contT=cv2(64,64,(g,w,h)=>{g.fillStyle='#c4c4c8';g.fillRect(0,0,w,h);g.fillStyle='rgba(0,0,0,.28)';for(let x=0;x<w;x+=5)g.fillRect(x,0,2,h);g.fillStyle='rgba(0,0,0,.5)';g.fillRect(0,0,w,3);g.fillRect(0,h-3,w,3);for(let i=0;i<60;i++){g.fillStyle='rgba(90,40,10,.25)';g.fillRect(Math.random()*w,Math.random()*h,2,3)}}),
 lhT=cv2(32,128,(g,w,h)=>{for(let y=0;y<h;y+=32){g.fillStyle=(y/32)%2?'#d8dce8':'#c8242c';g.fillRect(0,y,w,32)}}),
 tunT=cv2(128,128,(g,w,h)=>{g.fillStyle='#3a3d46';g.fillRect(0,0,w,h);g.strokeStyle='#1b1d24';g.lineWidth=2;for(let i=0;i<=w;i+=32){g.beginPath();g.moveTo(i,0);g.lineTo(i,h);g.stroke();g.beginPath();g.moveTo(0,i);g.lineTo(w,i);g.stroke()}for(let i=0;i<500;i++){g.fillStyle=`rgba(255,255,255,${Math.random()*.06})`;g.fillRect(Math.random()*w,Math.random()*h,2,2)}});
groundTex2.wrapS=groundTex2.wrapT=shT.wrapS=shT.wrapT=THREE.RepeatWrapping;groundTex2.anisotropy=shT.anisotropy=8;
const billT=cv2(512,220,(g,w,h)=>{g.fillStyle='#07080c';g.fillRect(0,0,w,h);const gr=g.createLinearGradient(0,0,w,0);gr.addColorStop(0,'rgba(255,255,255,.18)');gr.addColorStop(.5,'rgba(255,255,255,.04)');gr.addColorStop(1,'rgba(255,255,255,.18)');g.fillStyle=gr;g.fillRect(0,0,w,h);
 g.strokeStyle='#fff';g.lineWidth=8;g.strokeRect(10,10,w-20,h-20);g.lineWidth=2;g.strokeRect(24,24,w-48,h-48);g.fillStyle='#fff';g.textAlign='center';
 let fs=70;const F='"Bahnschrift","Arial Narrow",Impact,sans-serif';do{fs-=2;g.font=`italic 800 ${fs}px ${F}`}while(g.measureText('GURUMITHRAN').width>w-90&&fs>20);
 g.shadowColor='#fff';g.shadowBlur=14;g.fillText('GURUMITHRAN',w/2,h*.55);g.shadowBlur=0;g.font=`600 22px ${F}`;g.fillText('CHAOS ENGINE · ENDLESS NIGHT DRIVE',w/2,h*.8);for(let i=0;i<5;i++)g.fillRect(40+i*18,38,10,4)});roadTex.anisotropy=8;
const glowT=cv2(64,64,(g)=>{const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.3,'rgba(255,255,255,.4)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64)});
const winT=cv2(128,256,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#10131c');gr.addColorStop(1,'#0a0c13');g.fillStyle=gr;g.fillRect(0,0,w,h);
 for(let i=0;i<500;i++){g.fillStyle=`rgba(255,255,255,${Math.random()*.04})`;g.fillRect(Math.random()*w,Math.random()*h,2,2)}
 g.fillStyle='rgba(255,255,255,.05)';for(let y=0;y<h;y+=16)g.fillRect(0,y,w,1);
 for(let y=0;y<16;y++)for(let x=0;x<8;x++){const r=Math.random();if(r<.4){g.fillStyle=r<.3?'#ffd27a':r<.36?'#7ad7ff':'#fff3d0';g.fillRect(x*16+3,y*16+3,10,9)}else{g.fillStyle='#0d1018';g.fillRect(x*16+3,y*16+3,10,9)}}
 g.fillStyle='#2a2e3c';g.fillRect(0,0,w,3)});
const wheelT=cv2(128,128,(g)=>{g.translate(64,64);g.fillStyle='#08080b';g.beginPath();g.arc(0,0,63,0,7);g.fill();g.fillStyle='#17171d';g.beginPath();g.arc(0,0,48,0,7);g.fill();g.fillStyle='#34343e';for(let i=0;i<5;i++){g.rotate(1.2566);g.fillRect(-5,0,10,46)}g.fillStyle='#0c0c10';g.beginPath();g.arc(0,0,11,0,7);g.fill()});

/* ----- road ribbons built from the SAME segments the physics uses (curvature = c*.0008 rad/m, slope = dy/200) ----- */
const J0=10,J1=110,NJ=J0+J1+1,NX=new Float32Array(NJ),NZ=new Float32Array(NJ),NE=new Float32Array(NJ),NT=new Float32Array(NJ);let BASE=0;
const sg=n=>seg[((n%N)+N)%N];
function nodes(){NX[J0]=NZ[J0]=NE[J0]=NT[J0]=0;
 for(let j=0;j<J1;j++){const i=J0+j,k=sg(BASE+j),k2=sg(BASE+j+1);NX[i+1]=NX[i]+Math.sin(NT[i])*SEGM;NZ[i+1]=NZ[i]-Math.cos(NT[i])*SEGM;NT[i+1]=NT[i]+k.c*.0048;NE[i+1]=NE[i]+(k2.y-k.y)*.03}
 for(let j=0;j>-J0;j--){const i=J0+j,k=sg(BASE+j-1),k2=sg(BASE+j);NT[i-1]=NT[i]-k.c*.0048;NX[i-1]=NX[i]-Math.sin(NT[i-1])*SEGM;NZ[i-1]=NZ[i]+Math.cos(NT[i-1])*SEGM;NE[i-1]=NE[i]-(k2.y-sg(BASE+j-1).y)*.03}}
function strip(mat,uv){const g=new THREE.BufferGeometry(),nrm=new Float32Array(NJ*6);for(let i=0;i<NJ*2;i++)nrm[i*3+1]=1;
 g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(NJ*6),3).setUsage(THREE.DynamicDrawUsage));g.setAttribute('normal',new THREE.BufferAttribute(nrm,3));
 if(uv){const u=new Float32Array(NJ*4);for(let i=0;i<NJ;i++){u[i*4+2]=uv===true?1:uv}g.setAttribute('uv',new THREE.BufferAttribute(u,2).setUsage(THREE.DynamicDrawUsage))}
 const idx=[];for(let i=0;i<NJ-1;i++){const a=i*2;idx.push(a,a+1,a+2,a+1,a+3,a+2)}g.setIndex(idx);const m=new THREE.Mesh(g,mat);m.frustumCulled=false;scene.add(m);return m}
function fill(m,la,ha,lb,hb){const p=m.geometry.attributes.position.array;for(let i=0;i<NJ;i++){const o=i*6,c=Math.cos(NT[i]),s=Math.sin(NT[i]);p[o]=NX[i]+c*la;p[o+1]=NE[i]+ha;p[o+2]=NZ[i]+s*la;p[o+3]=NX[i]+c*lb;p[o+4]=NE[i]+hb;p[o+5]=NZ[i]+s*lb}m.geometry.attributes.position.needsUpdate=true}
const road=strip(new THREE.MeshStandardMaterial({map:roadTex,roughness:.5,metalness:.15,envMapIntensity:.25,side:THREE.DoubleSide}),true),
 ground=strip(new THREE.MeshStandardMaterial({map:groundTex,roughness:1,envMapIntensity:.05,side:THREE.DoubleSide}),100),
 railMat=new THREE.MeshStandardMaterial({color:0x5a606e,roughness:.4,metalness:.6,side:THREE.DoubleSide}),railL=strip(railMat),railR=strip(railMat);
function pt(s,lat,o){const f=s/SEGM-BASE+J0,i=clamp(Math.floor(f),0,NJ-2),a=clamp(f-i,0,1),th=NT[i]+(NT[i+1]-NT[i])*a;
 o.x=NX[i]+(NX[i+1]-NX[i])*a+Math.cos(th)*lat;o.y=NE[i]+(NE[i+1]-NE[i])*a;o.z=NZ[i]+(NZ[i+1]-NZ[i])*a+Math.sin(th)*lat;o.th=th;return o}

/* ----- pooled / instanced scenery ----- */
const vD=new THREE.Vector3(),vU=new THREE.Vector3(),SRC={engine:[0,.5,.6],exhaust:[-.57,.3,2.35],turbo:[.35,.55,-.9],brake:[0,.3,1.3],hit:[0,.5,-2.2]},dm=new THREE.Object3D(),col=new THREE.Color(),bm=(o)=>new THREE.MeshBasicMaterial(o);
const mk=(geo,mat,n)=>{const m=new THREE.InstancedMesh(geo,mat,n);m.frustumCulled=false;m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(m);return m};
const poles=mk(new THREE.CylinderGeometry(.08,.1,8,6).translate(0,4,0),bm({color:0x2a2d36}),40),heads=mk(new THREE.SphereGeometry(.3,6,4),bm({color:0xffd9a0}),40),
 pools=mk(new THREE.PlaneGeometry(11,11).rotateX(-Math.PI/2),bm({map:glowT,color:0xffc880,transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false}),40),
 trees=mk(new THREE.ConeGeometry(1.8,7,6).translate(0,3.5,0),bm({map:treeT2}),160),bldg=mk(new THREE.BoxGeometry(1,1,1).translate(0,.5,0),bm({map:winT,color:0x9a9aaa}),50),
 bill=mk(new THREE.BoxGeometry(1,1,1).translate(0,.5,0),bm({map:billT}),14),bpost=mk(new THREE.CylinderGeometry(.14,.18,6,8).translate(0,3,0),bm({color:0x2a2d36}),14);
const place=(m,k,x,y,z,ry,sx,sy,sz)=>{dm.position.set(x,y,z);dm.rotation.set(0,ry,0);dm.scale.set(sx,sy,sz);dm.updateMatrix();m.setMatrixAt(k,dm.matrix)};

/* ===== SCENARIOS: each zone is 450 segments (2.7 km), order is pseudo-random, never repeats back-to-back ===== */
const ZL=450,ZN=['CITY NIGHT','PINE FOREST · RAIN','DESERT HIGHWAY','COASTAL DRIVE','MOUNTAIN PASS'],
 ZG=[0x3a3f4c,0x2f6b3a,0xb88a52,0x14589a,0xdfe8ff].map(c=>new THREE.Color(c)),ZF=[[.05,.06,.14],[.03,.09,.07],[.26,.13,.07],[.04,.1,.2],[.12,.14,.24]].map(a=>new THREE.Color(a[0],a[1],a[2])),
 ZM=[0x090b16,0x08140e,0x5a3220,0x0c1a30,0xb4bed8].map(c=>new THREE.Color(c)),ZT=[0];
const zid=Z=>{while(ZT.length<=Z){const p=ZT[ZT.length-1],k=ZT.length;ZT.push((p+1+Math.floor(hash(k*3.7+1)*4))%5)}return ZT[Z]};
const tmpC=new THREE.Color();let curZ=-1,rainA=0,snowA=0;
function gcol(n,out){const f=Math.max(0,n)/ZL,Z=Math.floor(f),u=f-Z,e=12/ZL,c=ZG[zid(Z)];
 if(u<e&&Z>0)out.copy(ZG[zid(Z-1)]).lerp(c,.5+.5*u/e);else if(u>1-e)out.copy(c).lerp(ZG[zid(Z+1)],.5*(1-(1-u)/e));else out.copy(c)}
ground.material.map=groundTex2;ground.material.vertexColors=true;ground.material.needsUpdate=true;
ground.geometry.setAttribute('color',new THREE.BufferAttribute(new Float32Array(NJ*6),3).setUsage(THREE.DynamicDrawUsage));
const shM=new THREE.MeshStandardMaterial({map:shT,roughness:1,envMapIntensity:.05,side:THREE.DoubleSide}),shL=strip(shM,2),shR=strip(shM,2);
const rocks=mk(new THREE.DodecahedronGeometry(1,0),bm({map:rockT}),80),cacti=mk(new THREE.CylinderGeometry(.16,.2,1,8).translate(0,.5,0),bm({color:0x1c4a2a}),50),
 mesas=mk(new THREE.BoxGeometry(1,1,1).translate(0,.5,0),bm({map:rockT}),14),cont=mk(new THREE.BoxGeometry(1,1,1).translate(0,.5,0),bm({map:contT}),45),
 lhs=mk(new THREE.CylinderGeometry(.6,1,1,12).translate(0,.5,0),bm({map:lhT}),5),lhl=mk(new THREE.SphereGeometry(1.2,10,8),bm({color:0xfff2b0}),5),
 neon=mk(new THREE.PlaneGeometry(1,1),bm({color:0xffffff,side:THREE.DoubleSide}),32),spines=mk(new THREE.ConeGeometry(1.7,7,6).translate(0,3.5,0),bm({color:0xdfe8f5}),120),
 spark=mk(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2),bm({map:glowT,color:0x7fbfff,transparent:true,opacity:.6,blending:THREE.AdditiveBlending,depthWrite:false}),70),
 tcei=mk(new THREE.BoxGeometry(1,1,1),bm({map:tunT}),60),twal=mk(new THREE.BoxGeometry(1,1,1),bm({map:tunT}),120),tlit=mk(new THREE.BoxGeometry(1,1,1),bm({color:0xffa24a}),120);
const pre=new THREE.Group();scene.add(pre);
function mkPre(n,lines){const g=new THREE.BufferGeometry(),loc=new Float32Array(n*3),pos=new Float32Array(n*(lines?6:3));for(let i=0;i<n;i++){loc[i*3]=(Math.random()-.5)*50;loc[i*3+1]=Math.random()*18;loc[i*3+2]=-Math.random()*70+8}
 g.setAttribute('position',new THREE.BufferAttribute(pos,3).setUsage(THREE.DynamicDrawUsage));
 const o=lines?new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0x9fb4d8,transparent:true,opacity:0,fog:false,depthWrite:false})):new THREE.Points(g,new THREE.PointsMaterial({color:0xffffff,size:2.6,sizeAttenuation:false,transparent:true,opacity:0,fog:false,depthWrite:false}));
 o.frustumCulled=false;o.visible=false;pre.add(o);return{o,g,loc,pos,n,lines}}
function stepPre(p,fall,dt,v,amt){p.o.visible=amt>.02;if(!p.o.visible)return;p.o.material.opacity=(p.lines?.5:.85)*amt;const L=p.loc,a=p.pos;
 for(let k=0;k<p.n;k++){let x=L[k*3],y=L[k*3+1],z=L[k*3+2];y-=fall*dt;z+=v*dt;if(y<0){y=14+Math.random()*6;z=-Math.random()*70+8;x=(Math.random()-.5)*50}if(z>8){z-=78;x=(Math.random()-.5)*50}
  L[k*3]=x;L[k*3+1]=y;L[k*3+2]=z;if(p.lines){const o=k*6;a[o]=x;a[o+1]=y;a[o+2]=z;a[o+3]=x;a[o+4]=y+.7;a[o+5]=z-v*.012-.1}else{a[k*3]=x;a[k*3+1]=y;a[k*3+2]=z}}
 p.g.attributes.position.needsUpdate=true}
const rainP=mkPre(500,true),snowP=mkPre(420,false);
const mt=new THREE.Group();for(let i=0;i<18;i++){const a=i/18*6.283+Math.random()*.2,r=640+Math.random()*180,h=90+Math.random()*180,m=new THREE.Mesh(new THREE.ConeGeometry(1,1,5),bm({color:0x090b16}));m.scale.set(130+Math.random()*120,h,130+Math.random()*120);m.position.set(Math.cos(a)*r,h/2-20,Math.sin(a)*r);mt.add(m)}scene.add(mt);
const pts=(n,f,size,color)=>{const p=new Float32Array(n*3);for(let i=0;i<n;i++)p.set(f(),i*3);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));const o=new THREE.Points(g,new THREE.PointsMaterial({color,size,sizeAttenuation:false,fog:false}));o.frustumCulled=false;scene.add(o);return o};
const stars=pts(400,()=>{const a=Math.random()*6.283,e=Math.random()*1.2+.05;return[Math.cos(a)*Math.cos(e)*1100,Math.sin(e)*1100,Math.sin(a)*Math.cos(e)*1100]},1.6,0xaab4ff),
 city=pts(160,()=>{const a=Math.random()*6.283,r=560+Math.random()*120;return[Math.cos(a)*r,2+Math.random()*30,Math.sin(a)*r]},2,0xffc878);

/* ----- traffic (positions/velocities come from script.js T) ----- */
/* ----- traffic: 8 distinct vehicle models (built lazily per slot) driven by T[]: type, brake, indicator, police lights ----- */
const GEO={},geo=(a,b,c)=>{const k=a.toFixed(2)+'_'+b.toFixed(2)+'_'+c.toFixed(2);return GEO[k]||(GEO[k]=new THREE.BoxGeometry(a,b,c))},
 glassM=new THREE.MeshStandardMaterial({color:0x06080e,roughness:.12,metalness:.9,envMapIntensity:1.4}),tyreM=new THREE.MeshStandardMaterial({color:0x07070a,roughness:.9}),
 whiteM=new THREE.MeshStandardMaterial({color:0xd9dde6,roughness:.55,metalness:.2}),blackM=new THREE.MeshStandardMaterial({color:0x0a0b10,roughness:.3,metalness:.6,envMapIntensity:1.4}),headM=new THREE.MeshBasicMaterial({color:0xfff2d0}),
 glowSprite=(c,sz)=>{const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:glowT,color:c,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));sp.scale.setScalar(sz);return sp};
function buildVeh(ty){const d=TY[ty],L=d.L,W=d.W,g=new THREE.Group(),u=g.userData={},paint=u.paint=new THREE.MeshStandardMaterial({color:0x333844,roughness:.32,metalness:.55,envMapIntensity:1.4}),
 m=(a,b,c,mat,x,y,z)=>{const o=new THREE.Mesh(geo(a,b,c),mat);o.position.set(x,y,z);g.add(o);return o},wh=(r,wd,zs)=>{for(const z of zs)for(const sd of[-1,1])m(wd,r*2,r*2,tyreM,sd*(W/2-wd*.35),r,z)};
 if(ty===0){m(W,.6,L,paint,0,.56,0);m(W*.84,.5,L*.48,paint,0,1.1,L*.06);m(W*.86,.28,L*.44,glassM,0,1.13,L*.06);wh(.32,.24,[-L*.31,L*.31]);u.ty=.8}
 else if(ty===1){m(W,.82,L,paint,0,.72,0);m(W*.92,.62,L*.68,paint,0,1.42,L*.08);m(W*.94,.36,L*.64,glassM,0,1.44,L*.08);wh(.36,.26,[-L*.3,L*.3]);u.ty=1.05}
 else if(ty===2){m(W,.46,L,paint,0,.42,0);m(W*.78,.36,L*.4,paint,0,.8,L*.1);m(W*.8,.22,L*.36,glassM,0,.82,L*.1);m(W*.92,.05,.42,paint,0,.98,L/2-.15);[-1,1].forEach(sd=>m(.05,.2,.08,paint,sd*W*.3,.88,L/2-.2));wh(.31,.28,[-L*.31,L*.31]);u.ty=.62}
 else if(ty===3){m(W,1.55,L,paint,0,1.05,0);m(W*1.01,.45,L*.55,glassM,0,1.6,-L*.1);m(W*.8,.36,.08,glassM,0,1.55,L/2);wh(.34,.26,[-L*.3,L*.3]);u.ty=1.1}
 else if(ty===4){m(W*.95,.3,L,tyreM,0,.6,0);m(W,2.1,2.8,paint,0,1.55,-L/2+1.4);m(W*1.01,.7,1.6,glassM,0,2.05,-L/2+1.5);const lt=L-3.2;m(W,2.9,lt,whiteM,0,2.25,-L/2+3.2+lt/2);wh(.5,.34,[-L/2+1.6,L/2-1.4,L/2-2.8]);u.ty=1.0}
 else if(ty===5){m(W,2.9,L,paint,0,2.0,0);m(W*1.01,.95,L*.9,glassM,0,2.55,0);m(W*1.01,.14,L,whiteM,0,1.6,0);wh(.5,.34,[-L/2+1.8,L/2-2]);u.ty=1.25}
 else if(ty===6){m(.34,.5,L*.9,paint,0,.6,0);m(.42,.7,.34,tyreM,0,1.15,.2);m(.3,.3,.3,whiteM,0,1.68,.15);m(.12,.7,.7,tyreM,0,.35,-L/2+.35);m(.12,.7,.7,tyreM,0,.35,L/2-.35);u.ty=.7}
 else{m(W,.6,L,blackM,0,.56,0);m(W*1.005,.48,L*.36,whiteM,0,.56,L*.06);m(W*.84,.5,L*.48,blackM,0,1.1,L*.06);m(W*.86,.28,L*.44,glassM,0,1.13,L*.06);wh(.32,.24,[-L*.31,L*.31]);
  const rb=u.rb=new THREE.MeshBasicMaterial({color:0xff2020}),bb=u.bb=new THREE.MeshBasicMaterial({color:0x2060ff});m(.55,.12,.34,rb,-.28,1.42,L*.06);m(.55,.12,.34,bb,.28,1.42,L*.06);
  const rs=u.rs=glowSprite(0xff2020,3.2),bs=u.bs=glowSprite(0x2060ff,3.2);rs.position.set(-.45,1.55,L*.06);bs.position.set(.45,1.55,L*.06);g.add(rs,bs);u.ty=.8}
 const tlM=u.tail=new THREE.MeshBasicMaterial({color:0x550808}),y0=u.ty,tz=L/2+.01,bike=ty===6,tx=bike?0:W/2-(ty===4||ty===5?.45:.32);
 [-1,1].forEach(sd=>{if(bike&&sd>0)return;m(bike?.2:.42,.14,.06,tlM,bike?0:sd*tx,y0,tz)});
 u.ts=[-1,1].map(sd=>{const sp=glowSprite(0xff2a20,.9);sp.position.set(bike?0:sd*tx,y0,tz+.1);if(bike&&sd>0)sp.visible=false;g.add(sp);return sp});
 u.ind=[-1,1].map(sd=>{const sp=glowSprite(0xffa020,.8);sp.position.set(bike?sd*.2:sd*(W/2-.1),y0+.18,tz+.12);sp.visible=false;g.add(sp);return sp});
 [-1,1].forEach(sd=>{if(bike&&sd>0)return;m(.3,.12,.06,headM,bike?0:sd*(W/2-.4),y0-.05,-L/2-.01)});
 g.visible=false;return g}
const tm=T.map(()=>{const root=new THREE.Group();root.visible=false;scene.add(root);return{root,v:[],cur:-1}});

/* ----- player car: built from YOUR car sheet (cut-outs in assets/images) ----- */
const L=4.5,car=new THREE.Group();car.rotation.order='YXZ';scene.add(car);
/* ---- procedural PBR coupe: lofted body (superellipse sections), clear-coat paint, glass, trim ---- */
const paint=new THREE.MeshPhysicalMaterial({color:0x4a1d9c,metalness:.55,roughness:.3,clearcoat:1,clearcoatRoughness:.04,envMapIntensity:1.5,side:THREE.DoubleSide}),
 glass=new THREE.MeshPhysicalMaterial({color:0x04050a,metalness:.9,roughness:.06,clearcoat:1,envMapIntensity:1.8,side:THREE.DoubleSide}),
 trim=new THREE.MeshStandardMaterial({color:0x0a0a0e,roughness:.6,metalness:.3}),chrome=new THREE.MeshStandardMaterial({color:0x9aa4c0,metalness:1,roughness:.18});
function loft(ctrl,yb,n,M=28,S=44){const cr=new THREE.CatmullRomCurve3(ctrl.map(c=>new THREE.Vector3(c[1],c[2],c[0])),false,'centripetal'),pos=[],idx=[];
 for(let i=0;i<=S;i++){const p=cr.getPoint(i/S),yc=(p.y+yb)/2,hh=(p.y-yb)/2;for(let k=0;k<M;k++){const a=k/M*Math.PI*2,c=Math.cos(a),s=Math.sin(a);pos.push(p.x*Math.sign(c)*Math.abs(c)**(2/n),yc+hh*Math.sign(s)*Math.abs(s)**(2/n),p.z)}}
 for(let i=0;i<S;i++)for(let k=0;k<M;k++){const a=i*M+k,b=i*M+(k+1)%M,c=(i+1)*M+k,d=(i+1)*M+(k+1)%M;idx.push(a,c,b,b,c,d)}
 const f=pos.length/3,e0=cr.getPoint(0),e1=cr.getPoint(1);pos.push(0,(e0.y+yb)/2,e0.z,0,(e1.y+yb)/2,e1.z);
 for(let k=0;k<M;k++){idx.push(f,k,(k+1)%M);idx.push(f+1,S*M+(k+1)%M,S*M+k)}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();return g}
const add=(g,m,x,y,z,rx=0,ry=0,rz=0)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.rotation.set(rx,ry,rz);car.add(o);return o},bx=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
add(loft([[-2.25,.55,.5],[-2.15,.78,.56],[-1.85,.88,.64],[-1.3,.92,.72],[-.7,.93,.8],[0,.93,.86],[.8,.94,.92],[1.4,.95,.97],[1.9,.93,.98],[2.2,.8,.92],[2.25,.55,.86]],.2,2.8),paint,0,0,0);
add(loft([[-.85,.72,.84],[-.5,.78,1.04],[-.1,.78,1.2],[.35,.78,1.27],[.9,.78,1.2],[1.35,.76,1.05],[1.65,.7,.97]],.8,2.3),glass,0,0,0);
add(new THREE.SphereGeometry(1,28,10),paint,0,1.25,.32).scale.set(.6,.045,1);
add(bx(1.75,.045,.42),paint,0,1.14,1.95,-.12);[-.6,.6].forEach(x=>add(bx(.05,.32,.22),paint,x,.98,1.95));[-.88,.88].forEach(x=>add(bx(.03,.2,.46),paint,x,1.14,1.95));
[-1,1].forEach(sd=>{add(bx(.16,.1,.1),paint,sd*1,.93,-.55);add(bx(.06,.1,2.3),trim,sd*.91,.26,.1)});
add(bx(1.7,.05,.3),trim,0,.17,-2.15);add(bx(1.3,.14,.3),trim,0,.26,2.15);for(let i=-2;i<=2;i++)add(bx(.025,.14,.32),trim,i*.24,.2,2.17);
add(new THREE.CylinderGeometry(.065,.065,.2,20).rotateX(Math.PI/2),chrome,-.57,.3,2.3);add(new THREE.CylinderGeometry(.045,.045,.21,16).rotateX(Math.PI/2),new THREE.MeshBasicMaterial({color:0x000000}),-.57,.3,2.3);
const tailMat=new THREE.MeshStandardMaterial({color:0x300000,emissive:0xff3010,emissiveIntensity:1}),headMat=new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xfff2d8,emissiveIntensity:2.5});
[-1,1].forEach(sd=>{add(bx(.72,.15,.08),trim,sd*.5,.78,2.24);for(let i=0;i<4;i++)add(new THREE.SphereGeometry(.06,12,8),tailMat,sd*(.24+i*.16),.78,2.29);add(bx(.34,.08,.08),headMat,sd*.66,.5,-2.2)});
const plateT=cv2(256,64,(g,w,h)=>{g.fillStyle='#050507';g.fillRect(0,0,w,h);g.strokeStyle='#cfd5e4';g.lineWidth=3;g.strokeRect(2,2,w-4,h-4);g.fillStyle='#fff';g.font='bold 30px sans-serif';g.textAlign='center';g.fillText('GURUMITHRAN',w/2,43)}),
 decalT=cv2(256,32,(g)=>{g.fillStyle='#fff';g.font='bold 24px sans-serif';g.textAlign='center';g.fillText('GURUMITHRAN',128,25)});
add(new THREE.PlaneGeometry(.52,.13),new THREE.MeshBasicMaterial({map:plateT}),0,.5,2.262);
const dm2=new THREE.MeshBasicMaterial({map:decalT,transparent:true});add(new THREE.PlaneGeometry(.9,.08),dm2,-.945,.26,.1,0,-Math.PI/2);add(new THREE.PlaneGeometry(.9,.08),dm2,.945,.26,.1,0,Math.PI/2);
const sh=new THREE.Mesh(new THREE.PlaneGeometry(2.8,5.8).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:glowT,color:0x000000,transparent:true,opacity:.8,depthWrite:false}));sh.position.y=.03;car.add(sh);
const addG=(w,l,c,o,x,z)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,l).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:glowT,color:c,transparent:true,opacity:o,blending:THREE.AdditiveBlending,depthWrite:false}));m.position.set(x,.05,z);car.add(m);return m};
const under=addG(3.4,6.4,0x7a2cff,.45,0,0),tailRef=addG(3.6,3.6,0xff2a20,.3,0,3.4);
const rubber=new THREE.MeshStandardMaterial({color:0x08080a,roughness:.9}),alloy=new THREE.MeshStandardMaterial({color:0x2a2c34,metalness:.9,roughness:.35,envMapIntensity:1.2}),
 caliperM=new THREE.MeshStandardMaterial({color:0xc01820,roughness:.4,metalness:.3});
const wheels=[[-1,-1.28,1],[1,-1.28,1],[-1,1.31,0],[1,1.31,0]].map(([sd,z,fr])=>{const pos=new THREE.Group(),st=new THREE.Group(),fc=new THREE.Group(),sp=new THREE.Group();
 const tire=new THREE.Mesh(new THREE.TorusGeometry(.27,.085,14,36),rubber);tire.scale.z=1.5;sp.add(tire);
 sp.add(new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,.1,32).rotateX(Math.PI/2),alloy));
 for(let i=0;i<5;i++){const a=i*1.2566,s=new THREE.Mesh(new THREE.BoxGeometry(.055,.2,.04),alloy);s.rotation.z=a;s.position.set(-Math.sin(a)*.12,Math.cos(a)*.12,.055);sp.add(s)}
 const disc=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,.02,28).rotateX(Math.PI/2),chrome);disc.position.z=-.03;sp.add(disc);
 const cal=new THREE.Mesh(new THREE.BoxGeometry(.09,.15,.06),caliperM);cal.position.set(.12,.05,-.03);fc.add(cal);
 pos.position.set(sd*.82,.355,z);fc.rotation.y=sd*Math.PI/2;fc.add(sp);st.add(fc);pos.add(st);car.add(pos);return{sd,fr,st,d:sp}});
const glow=c=>{const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowT,color:c,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));car.add(s);return s};
const tails=[-.62,.62].map(x=>{const s=glow(0xff2a20);s.position.set(x,.8,L/2+.06);return s}),exh=glow(0xff8a2e);exh.position.set(-.57,.3,L/2+.12);const flame=glow(0xffb050);flame.position.copy(exh.position);flame.material.opacity=0;
const tunL=new THREE.PointLight(0xffa860,0,34,2);tunL.position.set(0,4.5,-2);car.add(tunL);
const spot=new THREE.SpotLight(0xffe6c0,250,120,.5,.6,1.2);spot.position.set(0,.8,-2.1);spot.target.position.set(0,0,-30);car.add(spot,spot.target);

/* ----- impact FX: car hop/roll/spin (spring-damped), 3D sparks + debris (pooled) ----- */
const cs={y:0,vy:0,roll:0,vr:0,yaw:0,vyaw:0},SPN=260,spPos=new Float32Array(SPN*3).fill(-9999),spVel=new Float32Array(SPN*3),spLife=new Float32Array(SPN),spFl=new Float32Array(SPN);let spI=0,lastTh=0;
const spGeo=new THREE.BufferGeometry();spGeo.setAttribute('position',new THREE.BufferAttribute(spPos,3).setUsage(THREE.DynamicDrawUsage));
const sparks=new THREE.Points(spGeo,new THREE.PointsMaterial({color:0xffb050,size:3.2,sizeAttenuation:false,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true,fog:false}));sparks.frustumCulled=false;scene.add(sparks);
const DBN=40,deb=mk(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.5,metalness:.6}),DBN),dbP=new Float32Array(DBN*3),dbV=new Float32Array(DBN*3),dbR=new Float32Array(DBN*3),dbW=new Float32Array(DBN*3),dbL=new Float32Array(DBN),dbS=new Float32Array(DBN),dbF=new Float32Array(DBN);let dbI=0;
for(let k=0;k<DBN;k++){deb.setColorAt(k,col.setRGB(.2,.2,.2));place(deb,k,0,-9999,0,0,0,0,0)}deb.count=DBN;
function impactFX(sev,dir,fatal){const n=Math.round(30+sev*90*(fatal?1.6:1)),nd=fatal?20+Math.round(sev*14):Math.round(sev*8);
 cs.vy=fatal?4+sev*3:1.2+sev*2.4;cs.vr=dir*(fatal?.6+sev*.7:sev*1.1);cs.vyaw=dir*(fatal?1+sev*2:sev*.9);
 const fx=Math.sin(lastTh),fz=-Math.cos(lastTh),rx=Math.cos(lastTh),rz=Math.sin(lastTh),px=car.position.x+fx*2+rx*dir*.9,py=car.position.y+.4,pz=car.position.z+fz*2+rz*dir*.9;
 for(let i=0;i<n;i++){const k=spI++%SPN,sp=(2+Math.random()*9)*(.6+sev),vf=S.v*(.35+Math.random()*.4)+Math.random()*4-2,vl=dir*(1+Math.random()*sp*.7)*(Math.random()<.7?1:-.4),vu=1.5+Math.random()*sp*.6;
  spPos[k*3]=px+rx*(Math.random()-.5)*.6;spPos[k*3+1]=py+Math.random()*.4;spPos[k*3+2]=pz+rz*(Math.random()-.5)*.6;spFl[k]=py-.4;
  spVel[k*3]=fx*vf+rx*vl+(Math.random()-.5)*2;spVel[k*3+1]=vu;spVel[k*3+2]=fz*vf+rz*vl+(Math.random()-.5)*2;spLife[k]=.5+Math.random()*(.5+sev*.7)}
 for(let i=0;i<nd;i++){const k=dbI++%DBN,vf=S.v*(.4+Math.random()*.5),vl=dir*(1+Math.random()*5*(.5+sev))*(Math.random()<.75?1:-.5);dbS[k]=.1+Math.random()*(.12+sev*.12);
  dbP[k*3]=px+(Math.random()-.5)*.8;dbP[k*3+1]=py+.2;dbP[k*3+2]=pz+(Math.random()-.5)*.8;dbF[k]=py-.35;
  dbV[k*3]=fx*vf+rx*vl;dbV[k*3+1]=2+Math.random()*5*(.5+sev);dbV[k*3+2]=fz*vf+rz*vl;
  for(let a=0;a<3;a++){dbR[k*3+a]=Math.random()*6.28;dbW[k*3+a]=(Math.random()-.5)*16}dbL[k]=2+Math.random()*1.5;
  deb.setColorAt(k,Math.random()<.55?col.setRGB(.18,.04,.45):col.setRGB(.05,.05,.07))}
 if(deb.instanceColor)deb.instanceColor.needsUpdate=true;
 if(cfg.particles){v3.set(px,py,pz);v3.project(cam);if(v3.z<1){const sx=(v3.x*.5+.5)*W,sy=(-v3.y*.5+.5)*H;
  for(let i=0;i<Math.round(6+sev*14)&&P.length<400;i++)P.push({x:sx+(Math.random()-.5)*30,y:sy+(Math.random()-.5)*20,vx:(Math.random()-.5)*160,vy:-30-Math.random()*90,t:.9+Math.random()*.9,m:1.8,k:'smoke',s:12+Math.random()*16});
  for(let i=0;i<(fatal?10:4)&&P.length<400;i++)P.push({x:sx,y:sy,vx:(Math.random()-.5)*300,vy:-60-Math.random()*200,t:.25+Math.random()*.25,m:.5,k:'flame',s:6+Math.random()*10})}}}
function fxReset(){Object.assign(cs,{y:0,vy:0,roll:0,vr:0,yaw:0,vyaw:0});spLife.fill(0);spPos.fill(-9999);spGeo.attributes.position.needsUpdate=true;dbL.fill(0)}
function fxStep(sdt){cs.vy-=16*sdt;cs.y+=cs.vy*sdt;const air=cs.y>0;if(cs.y<=0){if(cs.vy<-1.5){cs.vy=-cs.vy*.35;cs.vr*=.6}else cs.vy=0;cs.y=0}
 cs.vr+=(-cs.roll*(air?0:14)-cs.vr*(air?.05:3.2))*sdt;cs.roll+=cs.vr*sdt;cs.vyaw+=(-cs.yaw*(G.crashed?.4:6)-cs.vyaw*(air?.1:1.6))*sdt;cs.yaw+=cs.vyaw*sdt;
 for(let k=0;k<SPN;k++)if(spLife[k]>0){spLife[k]-=sdt;if(spLife[k]<=0){spPos[k*3+1]=-9999;continue}const o=k*3;spVel[o+1]-=14*sdt;spPos[o]+=spVel[o]*sdt;spPos[o+1]+=spVel[o+1]*sdt;spPos[o+2]+=spVel[o+2]*sdt;if(spPos[o+1]<spFl[k]&&spVel[o+1]<0){spPos[o+1]=spFl[k];spVel[o+1]*=-.35}}
 spGeo.attributes.position.needsUpdate=true;
 for(let k=0;k<DBN;k++){if(dbL[k]>0){dbL[k]-=sdt;const o=k*3;dbV[o+1]-=16*sdt;dbP[o]+=dbV[o]*sdt;dbP[o+1]+=dbV[o+1]*sdt;dbP[o+2]+=dbV[o+2]*sdt;
   if(dbP[o+1]<dbF[k]){dbP[o+1]=dbF[k];if(dbV[o+1]<0)dbV[o+1]*=-.3;dbV[o]*=1-Math.min(1,3*sdt);dbV[o+2]*=1-Math.min(1,3*sdt);for(let a=0;a<3;a++)dbW[o+a]*=.9}
   for(let a=0;a<3;a++)dbR[o+a]+=dbW[o+a]*sdt;dm.position.set(dbP[o],dbP[o+1],dbP[o+2]);dm.rotation.set(dbR[o],dbR[o+1],dbR[o+2]);const sc=dbL[k]>0?dbS[k]*Math.min(1,dbL[k]*2):0;dm.scale.set(sc,sc,sc);dm.updateMatrix();deb.setMatrixAt(k,dm.matrix)}
  else if(dbS[k]>0){dbS[k]=0;place(deb,k,0,-9999,0,0,0,0,0)}}
 deb.instanceMatrix.needsUpdate=true}
/* ----- per-frame: everything below only READS the vehicle state ----- */
let last=0,camH=0,fov=60,first=1;const tmp={},v3=new THREE.Vector3();
function draw(now){const dt=Math.min(.05,(now-last)/1000||.016);last=now;BASE=Math.floor(S.dist/SEGM);nodes();
 fill(ground,-400,-.05,400,-.05);fill(road,-6,0,6,0);fill(railL,-7.2,0,-7.2,.8);fill(railR,7.2,0,7.2,.8);fill(shL,-9,.01,-6,.01);fill(shR,6,.01,9,.01);
 {const ca=ground.geometry.attributes.color.array;for(let i=0;i<NJ;i++){gcol(BASE+i-J0,tmpC);const o=i*6;ca[o]=ca[o+3]=tmpC.r;ca[o+1]=ca[o+4]=tmpC.g;ca[o+2]=ca[o+5]=tmpC.b}ground.geometry.attributes.color.needsUpdate=true}
 const ua=road.geometry.attributes.uv.array;for(let i=0;i<NJ;i++){const v=(i-J0+BASE%4)*.25;ua[i*4+1]=v;ua[i*4+3]=v}road.geometry.attributes.uv.needsUpdate=true;const ga=ground.geometry.attributes.uv.array;for(let i=0;i<NJ;i++){const v=(i-J0+BASE%4)*.75;ga[i*4+1]=v;ga[i*4+3]=v}ground.geometry.attributes.uv.needsUpdate=true;
 for(const m of[shL,shR]){const sa=m.geometry.attributes.uv.array;for(let i=0;i<NJ;i++){const v=(i-J0+BASE%4)*.5;sa[i*4+1]=v;sa[i*4+3]=v}m.geometry.attributes.uv.needsUpdate=true}
 let nl=0,nt=0,nb=0,ng=0,nr=0,nc=0,nm=0,nk=0,nh=0,nn=0,np=0,nsp=0,tc=0,tw=0,tl=0;
 const pn0=Math.max(0,Math.floor(S.dist/SEGM)),pz=zid(Math.floor(pn0/ZL)),ploc=pn0-Math.floor(pn0/ZL)*ZL,ptun=pz===4&&ploc>=170&&ploc<300;
 const bb=(X,Z,y,ry,ss,s,h2)=>{const l=ss*(s.so*2+9);place(bill,ng,X(l),y+6,Z(l),ry+(ss>0?-1:1)*.45,9,3.9,.3);place(bpost,ng,X(l),y,Z(l),0,1,1,1);bill.setColorAt(ng++,col.setHSL(h2,1,.6))};
 for(let j=0;j<J1-1;j++){const i=J0+j,s=sg(BASE+j),c=Math.cos(NT[i]),sn=Math.sin(NT[i]),ry=-NT[i],X=l=>NX[i]+c*l,Z=l=>NZ[i]+sn*l,y=NE[i],
  n=BASE+j,zz=Math.floor(n/ZL),zi=zid(zz),loc=n-zz*ZL,h1=hash(n*1.37+11),h2=hash(n*2.11+5),h3=hash(n*.73+3),ss=s.ss,tun=zi===4&&loc>=170&&loc<300;
  if(s.la&&nl<40&&!tun&&(zi===0||zi===3||zi===4||n%27===0)){const lx=s.la*7.9;place(poles,nl,X(lx),y,Z(lx),ry,1,1,1);place(heads,nl,X(lx),y+8,Z(lx),0,1,1,1);place(pools,nl,X(s.la*4),y+.06,Z(s.la*4),ry,1,1,1);nl++}
  if(tun){if((n&1)===0&&tc<60){const fx=NX[i]+Math.sin(NT[i])*6,fz=NZ[i]-Math.cos(NT[i])*6;
    place(tcei,tc,fx,y+7,fz,ry,17.6,.9,12);place(twal,tw++,fx-c*8.6,y+3.6,fz-sn*8.6,ry,.9,7.4,12);place(twal,tw++,fx+c*8.6,y+3.6,fz+sn*8.6,ry,.9,7.4,12);
    place(tlit,tl++,fx-c*3,y+6.45,fz-sn*3,ry,.4,.12,6);place(tlit,tl++,fx+c*3,y+6.45,fz+sn*3,ry,.4,.12,6);tc++}}
  else if(zi===0){
   if(h1<.5&&nb<50){const l=ss*(s.so*6+8),W3=10+h3*14,H3=12+h2*h2*75,D3=10+h2*10;place(bldg,nb,X(l),y,Z(l),ry,W3,H3,D3);bldg.setColorAt(nb++,col.setHSL(.58+h3*.15,.15,.5+h2*.4));
    if(h1<.1&&nn<32){const a=Math.atan2(-ss*c,-ss*sn),lx=l-ss*(W3/2+.2);place(neon,nn,X(lx),y+H3*(.3+h3*.4),Z(lx),a,5,1.4,1);neon.setColorAt(nn++,col.setHSL(h2,1,.55))}}
   else if(h1<.56&&ng<14)bb(X,Z,y,ry,ss,s,h2);
   else if(h1>.9&&nt<160){const l=ss*(9+h2*8),k=.6+h3*.5;place(trees,nt,X(l),y,Z(l),0,k,k,k);trees.setColorAt(nt++,col.setRGB(.8+h2*.5,1,.8+h3*.4))}
  }else if(zi===1){
   if(h1<.85&&nt<160){const l=ss*(9+h2*32),k=1.1+h3*1.1;place(trees,nt,X(l),y,Z(l),0,k*.8,k*1.5,k*.8);trees.setColorAt(nt++,col.setRGB(.6+h2*.7,.8+h3*.6,.6+h1*.4))}
   if(h3<.55&&nt<160){const l=-ss*(9+h1*32),k=1+h2*1.2;place(trees,nt,X(l),y,Z(l),0,k*.8,k*1.5,k*.8);trees.setColorAt(nt++,col.setRGB(.6+h1*.7,.8+h2*.6,.6+h3*.4))}
   if(h1>.985&&nb<50){const l=ss*(s.so*4+12);place(bldg,nb,X(l),y,Z(l),ry,7,4.5,6);bldg.setColorAt(nb++,col.setRGB(1.4,.9,.6))}
  }else if(zi===2){
   if(h1<.3&&nr<80){const l=ss*(9+h2*40),k=.8+h3*3.2;place(rocks,nr,X(l),y+k*.3,Z(l),h3*6,k*1.3,k*.7,k);rocks.setColorAt(nr++,col.setRGB(1.3+h2*.5,.95+h3*.3,.75))}
   else if(h1<.42&&nc<50){const l=ss*(9+h2*30);place(cacti,nc++,X(l),y,Z(l),0,1.6,1.8+h3*3.5,1.6)}
   if(n%11===0&&nm<14){const l=ss*(80+h2*160);place(mesas,nm,X(l),y-2,Z(l),ry,35+h3*60,22+h2*50,30+h3*45);mesas.setColorAt(nm++,col.setRGB(1.5,.9,.6))}
   if(h1>.93&&ng<14)bb(X,Z,y,ry,ss,s,h2);
  }else if(zi===3){
   if(h1<.1&&nk<45){const l=ss*(11+h2*10),hh=1+(h3*3|0);for(let q=0;q<hh&&nk<45;q++){place(cont,nk,X(l),y+q*2.6,Z(l),ry,12,2.6,2.6);cont.setColorAt(nk++,col.setHSL((h2+q*.13)%1,.7,.5))}}
   else if(h1<.16&&nb<50){const l=ss*(14+h2*10);place(bldg,nb,X(l),y,Z(l),ry,18,7,12);bldg.setColorAt(nb++,col.setRGB(1.1,1,.9))}
   if(n%40===0&&nh<5){const l=ss*(16+h2*12);place(lhs,nh,X(l),y,Z(l),0,2.4,24,2.4);place(lhl,nh++,X(l),y+25,Z(l),0,1.4,1.4,1.4)}
   if(h1>.9&&h1<.94&&ng<14)bb(X,Z,y,ry,ss,s,h2);
   if(h1>.45&&nsp<70){const l=(h2<.5?-1:1)*(10+h3*220);place(spark,nsp++,X(l),y-.03,Z(l),0,2+h2*5,1,2+h3*5)}
  }else{
   if(h1<.6&&np<120){const l=ss*(9+h2*30),k=1+h3;place(spines,np,X(l),y,Z(l),0,k*.9,k*1.5,k*.9);spines.setColorAt(np++,col.setRGB(.9+h2*.15,.95,1.05))}
   else if(h1<.72&&nr<80){const l=ss*(9+h2*30),k=.8+h3*3;place(rocks,nr,X(l),y+k*.3,Z(l),h3*6,k*1.3,k*.7,k);rocks.setColorAt(nr++,col.setRGB(1.8,1.9,2.2))}
   if(h3>.96&&nb<50){const l=ss*(s.so*4+14);place(bldg,nb,X(l),y,Z(l),ry,8,5,7);bldg.setColorAt(nb++,col.setRGB(1.3,.95,.7))}
  }}
 [[poles,nl],[heads,nl],[pools,nl],[trees,nt],[bldg,nb],[bill,ng],[bpost,ng],[rocks,nr],[cacti,nc],[mesas,nm],[cont,nk],[lhs,nh],[lhl,nh],[neon,nn],[spines,np],[spark,nsp],[tcei,tc],[twal,tw],[tlit,tl]].forEach(([m,k])=>{m.count=k;m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true});
 const cand=[];
 T.forEach((t,k)=>{const sl=tm[k],r=t.s-S.dist,vis=t.on&&r<SEGM*(J1-6)&&r>-SEGM*(J0-2);sl.root.visible=vis;if(!vis)return;
  if(sl.cur!==t.ty){if(sl.cur>=0)sl.v[sl.cur].visible=false;let v=sl.v[t.ty];if(!v){v=sl.v[t.ty]=buildVeh(t.ty);sl.root.add(v)}v.visible=true;sl.cur=t.ty}
  const v=sl.v[t.ty],u=v.userData;pt(t.s,t.ly,tmp);sl.root.position.set(tmp.x,tmp.y,tmp.z);sl.root.rotation.y=-(tmp.th+Math.atan2((t.tl-t.ly)*1.2,Math.max(t.v,5)))+t.yo;
  if(t.ty<4||t.ty===5)u.paint.color.setHSL(t.c/360,t.ty===2?.85:.5,t.ty===2?.42:t.ty===5?.3:.24);else if(t.ty===4)u.paint.color.setHSL(t.c/360,.35,.3);else if(t.ty===6)u.paint.color.setHSL(t.c/360,.7,.35);
  const b=t.br;u.tail.color.setRGB(.33+.67*b,.03+.09*b,.03+.09*b);u.ts.forEach(sp=>{sp.material.opacity=.3+.7*b;sp.scale.setScalar(.7+b)});
  const on=t.sig!==0&&((now/330|0)%2===0);u.ind[0].visible=on&&t.sig<0;u.ind[1].visible=on&&t.sig>0;
  if(t.ty===7){const f=(now/120|0)%2===0;u.rb.color.setRGB(f?1:.15,.05,.05);u.bb.color.setRGB(.05,.1,f?.15:1);u.rs.visible=f;u.bs.visible=!f}
  const gap=t.s-S.dist;if(Math.abs(gap)<150)cand.push({t,sl,gap})});
 if(A.ctx&&A.tv){cand.sort((a,b)=>Math.abs(a.gap)-Math.abs(b.gap));const base=[58,52,75,48,38,34,95,58],lou=[.1,.11,.13,.12,.2,.18,.08,.11];
  for(let i=0;i<A.tv.length;i++){const c=cand[i];if(!c){A.tvOff(i);continue}const t=c.t,p=c.sl.root.position,vr=clamp((S.v-t.v)*Math.sign(c.gap||1),-60,60);
   A.tvSet(i,p.x,p.y+.6,p.z,base[t.ty]*(.7+t.v/45)*(343/(343-vr)),lou[t.ty],450+t.v*20)}
  if(G.sirenT){const idx=T.indexOf(G.sirenT);if(idx>=0&&tm[idx].root.visible){const p=tm[idx].root.position;A.pan.siren.positionX.value=p.x;A.pan.siren.positionY.value=p.y+1.5;A.pan.siren.positionZ.value=p.z}}}
 /* player car: position on road from distance + lateral offset, heading = road tangent + yaw */
 pt(S.dist,S.y,tmp);const th=tmp.th+S.yaw;car.position.set(tmp.x,tmp.y+.02-clamp(Math.abs(S.acc)*.003+Math.abs(S.omega*S.v)*.001,0,.05),tmp.z);car.rotation.set(clamp(S.acc*.006,-.06,.06),-th,clamp(S.omega*S.v*.0045,-.08,.08));
 lastTh=th;fxStep(dt*G.tsc);car.position.y+=cs.y;car.rotation.z+=cs.roll;car.rotation.y+=cs.yaw;
 const maxd=Math.min(.5,35/(S.v*S.v+1)),spin=S.wheel;wheels.forEach(w=>{w.d.rotation.z=w.sd<0?spin:-spin;if(w.fr)w.st.rotation.y=-S.steer*maxd});
 const g=clamp(S.rpm/8000*.7+S.boost/1.8*.6+S.throttle*.2,0,1);exh.material.opacity=.3+g*.7;exh.scale.setScalar(.3+g*1.2);tails.forEach(s=>{s.material.opacity=.35+S.brake*.65;s.scale.setScalar(.5+S.brake*.8)});tailRef.material.opacity=.15+S.brake*.45;tailMat.emissiveIntensity=.8+S.brake*3.5;
 const fb=Math.max(S.popT>0?S.popT/.25:0,S.shifting&&S.shiftT<.25?1:0,S.cut>0?.8:0,S.boost>1.2?.4:0);flame.material.opacity=fb;flame.scale.setScalar(.4+fb*1.8);
 /* camera: follows actual vehicle position + heading (lagged), FOV from real speed/boost, roll from steering, kick from shifts */
 const hood=G.cam===2,dist=G.cam===1?3.9:5.4,h=G.cam===1?1.4:1.9;car.visible=!hood;if(first){camH=th;first=0}camH+=(th-camH)*Math.min(1,dt*(hood?30:5));
 const fx=Math.sin(camH),fz=-Math.cos(camH);
 if(hood)cam.position.set(car.position.x+fx*.3,car.position.y+1.12,car.position.z+fz*.3);else cam.position.set(car.position.x-fx*dist,car.position.y+h-S.kick*.15,car.position.z-fz*dist);
 cam.lookAt(car.position.x+Math.sin(th)*14,car.position.y+1.25,car.position.z-Math.cos(th)*14);cam.rotateZ(clamp(-S.steer*.025*Math.min(1,S.v/40),-.03,.03)-S.vlat*.004-cs.roll*.25);
 if(cfgShake()&&S.shake>0){cam.position.x+=(Math.random()-.5)*S.shake*.28;cam.position.y+=(Math.random()-.5)*S.shake*.28}
 fov+=(60+clamp(S.v/80,0,1)*12+S.boost/1.8*8+S.kick*2+(G.crashed?Math.max(0,1-G.crashT*1.1)*14:0)-fov)*Math.min(1,dt*4);cam.fov=fov;cam.updateProjectionMatrix();
 const k=(G.km%12)/12*3,i0=Math.floor(k)%3,i1=(i0+1)%3,bot=mix(PAL[i0][1],PAL[i1][1],k-Math.floor(k));tmpC.setRGB(bot[0]/255*.8,bot[1]/255*.8,bot[2]/255*.8).lerp(ZF[pz],.55);if(ptun)tmpC.multiplyScalar(.35);fogc.lerp(tmpC,Math.min(1,dt*2));scene.fog.color.copy(fogc);
 const rainT=pz===1&&!ptun?1:0,snowT=pz===4&&!ptun?1:0,kk=Math.min(1,dt*.8);rainA+=(rainT-rainA)*kk;snowA+=(snowT-snowA)*kk;
 scene.fog.far+=((ptun?220:rainT?460:snowT?650:pz===2?1400:1000)-scene.fog.far)*Math.min(1,dt*1.5);
 road.material.roughness=.5-.38*rainA;road.material.envMapIntensity=.25+.7*rainA;tunL.intensity+=((ptun?140:0)-tunL.intensity)*Math.min(1,dt*6);
 mt.children.forEach(m=>m.material.color.lerp(ZM[pz],kk));pre.position.copy(cam.position);pre.rotation.y=-camH;stepPre(rainP,24,dt,S.v,rainA);stepPre(snowP,2.4,dt,S.v,snowA);
 G.zn=ptun?'MOUNTAIN TUNNEL':ZN[pz];if(pz!==curZ){if(curZ>=0&&S.started)say('ENTERING '+ZN[pz].split(' · ')[0]);curZ=pz}
 mt.position.set(cam.position.x,car.position.y,cam.position.z);stars.position.copy(cam.position);city.position.set(cam.position.x,car.position.y,cam.position.z);
 ren.render(scene,cam);
 car.updateMatrixWorld(true);cam.updateMatrixWorld();v3.set(-.57,.3,L/2+.2);car.localToWorld(v3);v3.project(cam);
 if(v3.z<1&&!hood){EX=(v3.x*.5+.5)*W;EY=(-v3.y*.5+.5)*H}else{EX=W/2;EY=H*.9}EXO=4;
 [-.95,.95].forEach((x,i)=>{v3.set(x,.1,1.31);car.localToWorld(v3);v3.project(cam);R.rw[i][0]=(v3.x*.5+.5)*W;R.rw[i][1]=(-v3.y*.5+.5)*H});
 /* 3D audio: listener = camera, every sound source = a real point on the car */
 if(A.ctx&&A.pan){const l=A.ctx.listener;cam.getWorldDirection(vD);vU.set(0,1,0).applyQuaternion(cam.quaternion);
  l.positionX.value=cam.position.x;l.positionY.value=cam.position.y;l.positionZ.value=cam.position.z;l.forwardX.value=vD.x;l.forwardY.value=vD.y;l.forwardZ.value=vD.z;l.upX.value=vU.x;l.upY.value=vU.y;l.upZ.value=vU.z;
  for(const k in SRC){v3.set(SRC[k][0],SRC[k][1],SRC[k][2]);car.localToWorld(v3);const p=A.pan[k];p.positionX.value=v3.x;p.positionY.value=v3.y;p.positionZ.value=v3.z}}}
const R=window.R3D={on:true,draw,tm,impact:impactFX,reset:fxReset,dbg:{cs,spLife,dbL},rw:[[W/2,H*.9],[W/2,H*.9]]};
}
