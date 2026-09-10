import { describe,expect,it } from 'vitest'; import { calculateQuote } from '../src/catalog/pricing';
describe('calculateQuote',()=>{
 it('sums authoritative minor-unit prices',()=>expect(calculateQuote([{id:'a',amountMinor:149},{id:'b',amountMinor:249}],[]).totalMinor).toBe(398));
 it('recommends only packs containing the full selection within 25 percent',()=>{const value=calculateQuote([{id:'a',amountMinor:400},{id:'b',amountMinor:400}],[{id:'good',name:'Premium',amountMinor:899,channelIds:['a','b','c']},{id:'partial',name:'Partial',amountMinor:500,channelIds:['a']},{id:'expensive',name:'Too much',amountMinor:1200,channelIds:['a','b']}]);expect(value.recommendations.map(x=>x.id)).toEqual(['good']);expect(value.recommendations[0].differenceMinor).toBe(99);});
});

