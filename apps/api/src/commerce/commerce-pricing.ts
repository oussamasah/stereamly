import{BillingPeriod}from'@prisma/client';
export const periodMonths:Record<BillingPeriod,number>={MONTH_1:1,MONTH_3:3,MONTH_6:6,MONTH_12:12};
export function priceTotals(subtotalMinor:number,countryCode:string){const taxRate=countryCode.toUpperCase()==='FR'?20:0;const taxMinor=Math.round(subtotalMinor*taxRate/100);return{subtotalMinor,taxMinor,totalMinor:subtotalMinor+taxMinor,taxRate};}
