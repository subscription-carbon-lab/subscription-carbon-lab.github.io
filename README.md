# Subscription Carbon Lab

An interactive dashboard for a joint subscription-and-regular-sales inventory model
under a carbon tax. It determines the optimal subscription-delivery interval and
selling price that maximise total profit per unit time, and reports the resulting
carbon emissions.

**Live dashboard:** https://USERNAME.github.io/subscription-carbon-lab/

Everything runs in the browser. There is no backend, no tracking, no account and no
installation: open the link and it computes. A Mathematica licence is not required.

## The model

A retailer serves two demand streams over a replenishment cycle `T = A·L`, where `L`
is the subscription-delivery interval and `A` the number of deliveries per cycle.
Subscription demand responds to the discounted price; regular demand responds to the
price and grows at rate `λ` through the cycle.

```
T  = A L
D₁(p)   = a − b(1 − δ)p                       subscription demand
D₂(t,p) = (a − bp) exp(λt)                    regular demand
Q₁ = D₁ T
Q₂ = (a − bp)(exp(λT) − 1)/λ
H₁ = D₁ L² A(A + 1)/2                         integrated subscription inventory
H₂ = (a − bp)[λT exp(λT) − exp(λT) + 1]/λ²    integrated regular inventory

CE = [ŝ + ĉ(Q₁+Q₂) + Ĉf A + Ĉv Q₁ + ĥ(H₁+H₂)] / T
Z  = [(1−δ)pQ₁ + pQ₂ − c(Q₁+Q₂) − s − Cf A − Cv Q₁ − h(H₁+H₂)] / T − Cτ CE
```

`Z` is the objective, referred to throughout as Eq. (5). `H₁` and `H₂` denote
integrated inventory, not Hessian determinants. A hat (`ŝ`, `ĉ`, `ĥ`, `Ĉf`, `Ĉv`)
marks the carbon-emission coefficient matching the cost of the same name. The
discount `δ` is a fraction, so 0.4 means 40% off.

## Parameters

Fifteen continuous parameters are adjustable; `A` is fixed at 6 deliveries.

| Group | Parameters |
| --- | --- |
| Demand | `a` spontaneous demand, `b` price sensitivity, `λ` regular-demand growth, `δ` subscription discount |
| Costs | `c` unit purchase, `s` ordering, `h` holding, `Cf` fixed shipping, `Cv` variable shipping |
| Carbon | `Cτ` carbon-tax rate, `ĉ` purchasing, `ŝ` ordering, `ĥ` holding, `Ĉf` fixed shipping, `Ĉv` variable shipping emissions |

Units: `$`/unit, `$`/order, `$`/shipment and `$`/unit/year for costs; `$`/kg-CO2e for
the carbon tax; matching kg-CO2e units for the emission coefficients; years for time.
The subscription discount is dimensionless.

## What the dashboard shows

| Panel | Contents |
| --- | --- |
| Key indicators | Annual profit, annual carbon emissions, carbon-tax burden, demand feasibility margin |
| 01 Model Explorer | The 15 parameters as sliders or numeric fields |
| 02 Operating policy | Optimal `L*`, `T* = A·L*`, `p*`, `Q₁*`, `Q₂*`, `Q*`, re-solved on every change |
| 03 Cost structure | Purchasing, ordering, holding, shipping and carbon tax, in $/year |
| 04 Carbon footprint | Ordering, purchasing, storage and transport, in kg-CO2e/year |
| 05 Price and profit | Price-profit curve with `L` re-optimized at each price, joint optimum marked |
| 06 Sensitivity explorer | Effect of −20%, −10%, +10%, +20% on optimized profit, one parameter at a time |
| 07 Complete dataset | All 60 sensitivity scenarios, filterable, sortable, exportable as CSV |
| 08 Demand profile | Regular demand `D₂(t,p*)` and subscription demand `D₁(p*)` over the cycle |

The carbon-tax burden is `Cτ·CE/Z × 100` when profit is positive; the demand
feasibility margin is `(a − bp*)/a × 100`. Annual emissions are the cycle total
divided by `T`, in kg-CO2e/year, while quantities are per replenishment cycle.

A 30-second walkthrough is included as `dashboard-demo-30s.mp4`.

## Illustrative baseline

The shipped defaults describe a chain coffee-bean supplier offering both subscription
and regular sales: `a`=800, `b`=2, `λ`=0.01, `δ`=0.4, `s`=$500/order, `c`=$30/unit,
`h`=$5/unit/year, `Cf`=$10/shipment, `Cv`=$2/unit, `Cτ`=$0.3/kg-CO2e, `ĉ`=1.5,
`ŝ`=40, `ĥ`=0.2, `Ĉf`=50, `Ĉv`=2, `A`=6. They solve to:

```
L* = 0.099068574 years      p* = $254.635225223 /unit
Z* = $122,150.801992387 /year
CE* = 2,791.557618557 kg-CO2e/year
```

These values are an illustration of the method, not calibrated data. Parameters should
be estimated from firm-specific records before the results inform a decision: demand
parameters from historical sales and pricing, cost parameters from procurement,
inventory and logistics records, emission factors from supplier, energy-use and
transport data, and the tax rate from the applicable regulation.

## Numerical scope and limitations

At each delivery interval the selling price is optimized analytically from the
quadratic profit function subject to `0 ≤ p < a/b`. A logarithmic grid over
`L ∈ [0.00001, 10]` years is then refined at every detected interior maximum by
golden-section search.

This is a numerical optimum on the stated search interval, **not** a proof of a global
maximum over an unbounded replenishment horizon. The dashboard displays a warning when
the search reaches an interval boundary. Sensitivity results use the current scenario
as the reference and re-optimize both decisions for all 15 continuous parameters
(60 cases); a zero-valued input stays zero under percentage changes, and undefined
ratios are shown as N/A. The delivery count `A` stays fixed throughout.

## Validation

```
node validate.cjs [reference-sensitivity.csv]
```

Tests cover the baseline above, 60 finite and unique scenarios, input immutability,
cost and emissions reconciliation, independent cycle-cost calculations, fixed-price
re-optimization, slider endpoints, zero tax, invalid input and the local Hessian.
Against a 56-row reference computed independently in a computer algebra system, the
maximum difference was 0.000311 percentage points; that reference omitted `ĉ`, whereas
this implementation includes all 15 continuous parameters.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure |
| `style.css` | Styling |
| `model.js` | The model: Eq. (5), price solution, interval search, sensitivity |
| `app.js` | UI, charts, tables, CSV export |
| `source.js` | In-page "View source" viewer |
| `validate.cjs` | Test suite (Node) |

Optional page-scoped WebMCP tools are feature-detected. A supported live WebMCP test
context was not available during implementation, so that integration is unverified.
