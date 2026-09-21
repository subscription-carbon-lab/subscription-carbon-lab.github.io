const assert = require('node:assert/strict');
const fs = require('node:fs');
const M = require('./dist/model.js');
const near=(a,b,t,label)=>assert(Math.abs(a-b)<t,`${label}: ${a} vs ${b}`);
const baseline=M.optimize(M.base);
near(baseline.L,.0990685672154,1e-6,'Baseline L');
near(baseline.price,254.6352251655,1e-5,'Baseline price');
near(baseline.profit,122150.801992389,1e-5,'Baseline profit');
near(baseline.CE,2791.5576544119,.001,'Baseline emissions');
const snapshot=JSON.stringify(M.base),rows=M.sensitivity(M.base);
assert.equal(rows.length,60);assert.equal(new Set(rows.map(r=>r.parameter+':'+r.change)).size,60);
assert.equal(snapshot,JSON.stringify(M.base),'Sensitivity must not mutate inputs');
for(const r of rows){for(const k of ['L','price','T','Q1','Q2','Q','CE','profit'])assert(Number.isFinite(r[k]));near(r.T,6*r.L,1e-12,'T=6L');near(r.Q,r.Q1+r.Q2,1e-9,'Order quantities');near(r.profit,r.revenue-r.totalCost,1e-9,'Profit reconciliation');near(r.CE,Object.values(r.emissions).reduce((a,b)=>a+b),1e-9,'Emissions reconciliation');assert(!r.boundary);}
near(rows.find(r=>r.parameter==='a'&&r.change===20).pct.profit,49.65,.01,'a +20%');
near(rows.find(r=>r.parameter==='ec'&&r.change===20).pct.CE,8.43,.01,'ec +20%');
const optionalCSV=process.argv[2];
let maxDifference=0;
if(optionalCSV){const lines=fs.readFileSync(optionalCSV,'utf8').trim().split(/\r?\n/).map(l=>l.split(',').map(v=>v.replace(/^"|"$/g,''))),headers=lines.shift();const map={L:'LPercentChange',price:'PPercentChange',T:'TPercentChange',Q1:'Q1PercentChange',Q2:'Q2PercentChange',Q:'QPercentChange',CE:'CEPercentChange',profit:'ProfitPercentChange'};for(const data of lines){const old=Object.fromEntries(headers.map((h,i)=>[h,data[i]]));const now=rows.find(r=>r.parameter===old.Parameter&&r.change===Number(old.PercentInputChange));assert(now);for(const [key,col] of Object.entries(map)){const diff=Math.abs(now.pct[key]-Number(old[col]));maxDifference=Math.max(maxDifference,diff);assert(diff<.002,`${old.Parameter} ${old.PercentInputChange} ${col}: ${diff}`);}}}
// Independent direct cycle-cost evaluation at well-conditioned test points.
function direct(L,p,r){const T=r.A*L,e=Math.exp(r.lambda*T),d=r.a-r.b*(1-r.delta)*p,q1=d*T,q2=(r.a-r.b*p)*(e-1)/r.lambda,holding=d*L*L*r.A*(r.A+1)/2+(r.a-r.b*p)*(r.lambda*T*e-e+1)/(r.lambda*r.lambda);return ((1-r.delta)*p*q1+p*q2-(r.c+r.Ctau*r.ec)*(q1+q2)-(r.s+r.Ctau*r.es)-(r.Cf+r.Ctau*r.eCf)*r.A-(r.Cv+r.Ctau*r.eCv)*q1-(r.h+r.Ctau*r.eh)*holding)/T;}
for(const l of [.03,.1,1,5])for(const p of [30,150,300])near(M.evaluate(l,p,M.base).profit,direct(l,p,M.base),1e-5,'Independent objective');
for(const p of [50,150,250,350]){const optimum=M.optimize(M.base,p);near(optimum.price,p,1e-12,'Fixed-price curve');assert(optimum.profit<=baseline.profit+1e-7);assert(optimum.profit>=M.evaluate(baseline.L,p,M.base).profit-1e-7);}
for(const spec of M.specs)for(const v of [spec[3],spec[4]]){const r=M.optimize({...M.base,[spec[0]]:v});assert(Number.isFinite(r.profit));assert(r.L>=M.domain.minL*.99999&&r.L<=M.domain.maxL*1.00001);}
const noTax=M.optimize({...M.base,Ctau:0});near(noTax.tax,0,1e-12,'Zero tax');assert(noTax.profit>=baseline.profit);assert.throws(()=>M.optimize({...M.base,b:0}));
const dp=.001,dl=.00001,z=(l,p)=>M.evaluate(l,p,M.base).profit,L=baseline.L,p=baseline.price,f=z(L,p),hll=(z(L+dl,p)-2*f+z(L-dl,p))/dl**2,hpp=(z(L,p+dp)-2*f+z(L,p-dp))/dp**2,hlp=(z(L+dl,p+dp)-z(L+dl,p-dp)-z(L-dl,p+dp)+z(L-dl,p-dp))/(4*dl*dp);assert(hll<0&&hll*hpp-hlp*hlp>0,'Negative definite local Hessian');
for(const filename of ['index.html','model.js','app.js','style.css'])assert(fs.statSync('dist/'+filename).size>0);
console.log(JSON.stringify({status:'passed',scenarios:60,baseline:{L:baseline.L,price:baseline.price,profit:baseline.profit,CE:baseline.CE},maxCSVPercentagePointDifference:maxDifference,localHessian:{hll,det:hll*hpp-hlp*hlp},emissions:baseline.emissions},null,2));
