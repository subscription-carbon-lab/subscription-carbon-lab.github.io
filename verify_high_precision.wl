ClearAll["Global`*"];
base = <|"a"->800,"b"->2,"lambda"->1/100,"delta"->2/5,"c"->30,"s"->500,"h"->5,"es"->40,"ec"->3/2,"eh"->1/5,"Cf"->10,"Cv"->2,"eCf"->50,"eCv"->2,"Ctau"->3/10,"A"->6|>;
keys={"a","b","delta","lambda","c","Cf","Cv","s","es","ec","h","eh","eCf","eCv","Ctau"};
solve[pr_] := Module[{t,q1,q2,h1,h2,ce,z,stationary,ls,ps,hs,vals},
 t=pr["A"] l;
 q1=(pr["a"]-pr["b"](1-pr["delta"]) p) t;
 q2=(pr["a"]-pr["b"] p)(Exp[pr["lambda"] t]-1)/pr["lambda"];
 h1=(pr["a"]-pr["b"](1-pr["delta"])p) l^2 pr["A"](pr["A"]+1)/2;
 h2=(pr["a"]-pr["b"]p)(pr["lambda"] t Exp[pr["lambda"]t]-Exp[pr["lambda"]t]+1)/pr["lambda"]^2;
 ce=(pr["es"]+pr["ec"](q1+q2)+pr["eCf"]pr["A"]+pr["eCv"]q1+pr["eh"](h1+h2))/t;
 z=((1-pr["delta"])p q1+p q2-pr["c"](q1+q2)-pr["s"]-pr["Cf"]pr["A"]-pr["Cv"]q1-pr["h"](h1+h2))/t-pr["Ctau"]ce;
 stationary=FindRoot[{D[z,l]==0,D[z,p]==0},{{l,1/10},{p,255}},WorkingPrecision->60,AccuracyGoal->40,PrecisionGoal->40];
 vals=N[{l,p,t,q1,q2,q1+q2,ce,z}/.stationary,30];
 hs=N[D[z,{{l,p},2}]/.stationary,30];
 Join[AssociationThread[{"L","price","T","Q1","Q2","Q","CE","profit"},vals],<|"hpp"->hs[[2,2]],"hessianDeterminant"->Det[hs],"negativeDefinite"->TrueQ[hs[[1,1]]<0&&Det[hs]>0],"feasible"->TrueQ[0<vals[[1]]<10&&0<vals[[2]]<pr["a"]/pr["b"]]|>]
];
reference=solve[base];
rows=Flatten[Table[Module[{r,pr=Join[base,<|key->base[key](1+change/100)|>]},r=solve[pr];<|"parameter"->key,"change"->change,"result"->r,"pct"->AssociationThread[{"L","price","T","Q1","Q2","Q","CE","profit"},Table[N[100(r[k]/reference[k]-1),25],{k,{"L","price","T","Q1","Q2","Q","CE","profit"}}]]|>],{key,keys},{change,{-20,-10,10,20}}],1];
Export[FileNameJoin[{DirectoryName[$InputFileName],"high_precision.json"}],<|"baseline"->reference,"rows"->rows|>,"RawJSON"];
Print["Verified ",Length[rows]," cases at 60-digit working precision. All local maxima and feasible: ",And@@Join[Lookup[Lookup[rows,"result"],"negativeDefinite"],Lookup[Lookup[rows,"result"],"feasible"]]];
Quit[];
