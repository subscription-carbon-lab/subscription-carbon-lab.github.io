/* Eq. (5): subscription and regular sales inventory model under a carbon tax.
   All time units: years. */
(function(root){
'use strict';
const base={a:800,b:2,lambda:.01,delta:.4,s:500,c:30,h:5,es:40,ec:1.5,eh:.2,Cf:10,Cv:2,eCf:50,eCv:2,Ctau:.3,A:6};
const specs=[
 ['a','Spontaneous demand','units/year',200,1600,10,'Demand'],
 ['b','Price sensitivity','units/year per ($/unit)',.5,4,.05,'Demand'],
 ['lambda','Regular-demand growth','1/year',.001,.05,.001,'Demand'],
 ['delta','Subscription discount','dimensionless (fraction)',.1,.7,.01,'Demand'],
 ['c','Unit purchase cost','$/unit',5,100,1,'Costs'],
 ['s','Ordering cost','$/order',50,1500,10,'Costs'],
 ['h','Holding cost','$/unit/year',1,20,.1,'Costs'],
 ['Cf','Fixed shipping cost','$/shipment',0,50,1,'Costs'],
 ['Cv','Variable shipping cost','$/unit',0,10,.1,'Costs'],
 ['Ctau','Carbon tax rate','$/kg-CO2e',0,3,.01,'Carbon'],
 ['ec','Purchasing emissions','kg-CO2e/unit',0,5,.05,'Carbon'],
 ['es','Ordering emissions','kg-CO2e/order',0,100,1,'Carbon'],
 ['eh','Holding emissions','kg-CO2e/unit/year',0,1,.01,'Carbon'],
 ['eCf','Fixed shipping emissions','kg-CO2e/shipment',0,150,1,'Carbon'],
 ['eCv','Variable shipping emissions','kg-CO2e/unit',0,5,.05,'Carbon']
];
const keys=specs.map(s=>s[0]), changes=[-20,-10,10,20], domain={minL:1e-5,maxL:10};
function validate(p){for(const k of Object.keys(base))if(!Number.isFinite(p[k]))throw Error('Invalid parameter: '+k);if(p.a<=0||p.b<=0||p.lambda<=0||p.lambda>=1||p.delta<=0||p.delta>=1||p.A<1||p.A>12||!Number.isInteger(p.A))throw Error('Demand parameters or delivery count are outside the feasible domain.');for(const k of ['c','s','h','es','ec','eh','Cf','Cv','eCf','eCv','Ctau'])if(p[k]<0)throw Error('Costs and emissions cannot be negative.');}
function factors(L,p){const T=p.A*L,x=p.lambda*T; const f=Math.expm1(x)/x;
 // Stable integral of t exp(lambda t) near zero; avoids cancellation.
 let g;if(Math.abs(x)<.02){let term=.5,sum=term;for(let n=1;n<12;n++){term*=x*(n+1)/(n*(n+2));sum+=term;}g=T*sum;}else g=((x-1)*Math.expm1(x)+x)/(p.lambda*x);
 return {T,f,g,hs:L*(p.A+1)/2};}
function evaluate(L,price,p){const {T,f,g,hs}=factors(L,p),d1=p.a-p.b*(1-p.delta)*price,d0=p.a-p.b*price,regular=d0*f,subHolding=d1*hs,regHolding=d0*g;
 const emissions={Purchasing:p.ec*(d1+regular),Ordering:p.es/T,Holding:p.eh*(subHolding+regHolding),Transportation:p.eCf/L+p.eCv*d1};
 const CE=Object.values(emissions).reduce((a,b)=>a+b,0),costs={Purchasing:p.c*(d1+regular),Ordering:p.s/T,Holding:p.h*(subHolding+regHolding),Shipping:p.Cf/L+p.Cv*d1,'Carbon tax':p.Ctau*CE};
 const revenue=(1-p.delta)*price*d1+price*regular, totalCost=Object.values(costs).reduce((a,b)=>a+b,0),profit=revenue-totalCost;
 return {L,price,T,Q1:d1*T,Q2:regular*T,Q:(d1+regular)*T,CE,profit,revenue,totalCost,costs,emissions,tax:p.Ctau*CE,margin:100*d0/p.a,burden:profit>0?100*p.Ctau*CE/profit:null,d1,d0};}
function bestPrice(L,p){const {f,g,hs}=factors(L,p),r=1-p.delta,c=p.c+p.Ctau*p.ec,v=p.Cv+p.Ctau*p.eCv,h=p.h+p.Ctau*p.eh;const lin=p.a*(r+f)+p.b*(r*(c+v+h*hs)+c*f+h*g),quad=p.b*(r*r+f);return Math.max(0,Math.min(p.a/p.b*(1-1e-10),lin/(2*quad)));}
// Derivatives are evaluated analytically, avoiding the flat objective-value
// comparisons that can lose the fourth reported decimal near an optimum.
function intervalDerivative(L,price,p){
 const x=p.lambda*p.A*L,d1=p.a-p.b*(1-p.delta)*price,d0=p.a-p.b*price;
 const c=p.c+p.Ctau*p.ec,h=p.h+p.Ctau*p.eh;
 const K=(p.s+p.Ctau*p.es)/p.A+p.Cf+p.Ctau*p.eCf;
 let term=1,fx=0,gL=0;
 // term = x^n/n!; the positive series are stable even for small x.
 for(let n=0;n<100;n++){
  const df=term/(n+2),dg=term*(n+1)/(n+2);
  fx+=df;gL+=dg;
  if(n>8&&Math.abs(df)<1e-17*Math.abs(fx)&&Math.abs(dg)<1e-17*Math.abs(gL))break;
  term*=x/(n+1);
 }
 return K/(L*L)-h*d1*(p.A+1)/2+d0*((price-c)*p.lambda*p.A*fx-h*p.A*gL);
}
function optimize(p,fixedPrice){
 validate(p);
 if(fixedPrice!==undefined&&(!Number.isFinite(fixedPrice)||fixedPrice<0||fixedPrice>=p.a/p.b))throw Error('Price must satisfy 0 <= p < a/b.');
 const low=Math.log(domain.minL),high=Math.log(domain.maxL),n=160;
 const at=x=>{const L=Math.exp(x);return evaluate(L,fixedPrice===undefined?bestPrice(L,p):fixedPrice,p);};
 const derivative=x=>{const L=Math.exp(x);return intervalDerivative(L,fixedPrice===undefined?bestPrice(L,p):fixedPrice,p);};
 const candidates=[at(low),at(high)];
 let left=low,gl=derivative(left);
 for(let i=1;i<=n;i++){
  const right=low+(high-low)*i/n,gr=derivative(right);
  if(gl>=0&&gr<=0){
   let a=left,b=right;
   for(let j=0;j<65;j++){const mid=(a+b)/2;if(mid===a||mid===b)break;if(derivative(mid)>0)a=mid;else b=mid;}
   candidates.push(at((a+b)/2));
  }
  left=right;gl=gr;
 }
 const result=candidates.reduce((a,b)=>b.profit>a.profit?b:a);
 result.boundary=result.L<domain.minL*1.01||result.L>domain.maxL*.99;
 return result;
}
function sensitivity(p){const reference=optimize(p);return keys.flatMap(parameter=>changes.map(change=>{const values={...p,[parameter]:p[parameter]*(1+change/100)},r=optimize(values);const pct={};for(const key of ['L','price','T','Q1','Q2','Q','CE','profit'])pct[key]=Math.abs(reference[key])<1e-12?null:100*(r[key]/reference[key]-1);return {parameter,change,value:values[parameter],...r,pct};}));}
const api={base,specs,keys,changes,domain,validate,evaluate,optimize,sensitivity,bestPrice};root.CarbonModel=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);

