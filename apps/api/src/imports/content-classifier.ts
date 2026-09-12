import { ImportedItemKind } from '@prisma/client';

const documentaryTerms=/\b(document(?:ary|aries|aire|aires|al|ales)?|docu|discovery|nature|history|science|decouverte)\b|وثائقي|وثائقية/iu;
const seriesTerms=/\b(series|serie|saison|season|episode|episodes|tv[ -]?shows?)\b|\bs\d{1,2}e\d{1,3}\b|مسلسل|مسلسلات/iu;
const movieTerms=/\b(movie|movies|film|films|cinema|vod)\b|افلام|فيلم/iu;
const liveTerms=/\b(live|direct|channel|channels|chaine|chaines|radio|news|sport)\b|مباشر|قنوات/iu;

export type Classification={kind:ImportedItemKind;confidence:number;reasons:string[];genres:string[]};

export function classifyM3u(input:{explicitType?:string;group?:string;name?:string;url?:string}):Classification{
 const explicit=(input.explicitType??'').toLowerCase(),text=`${input.group??''} ${input.name??''} ${input.url??''}`.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),scores={LIVE:0,MOVIE:0,SERIES:0},reasons:string[]=[];
 const explicitKind=/series|show|episode/.test(explicit)?'SERIES':/movie|vod|film/.test(explicit)?'MOVIE':/live|channel|tv/.test(explicit)?'LIVE':undefined;
 if(explicitKind)return{kind:explicitKind,confidence:.99,reasons:[`explicit:${explicitKind.toLowerCase()}`],genres:documentaryTerms.test(text)?['DOCUMENTARY']:[]};
 if(/\/series(?:\/|\?|$)/i.test(input.url??'')){scores.SERIES+=70;reasons.push('url:series');}if(/\/movie(?:\/|\?|$)|\/vod(?:\/|\?|$)/i.test(input.url??'')){scores.MOVIE+=70;reasons.push('url:movie');}if(/\/live(?:\/|\?|$)/i.test(input.url??'')){scores.LIVE+=60;reasons.push('url:live');}
 if(seriesTerms.test(text)){scores.SERIES+=35;reasons.push('metadata:series');}if(movieTerms.test(text)){scores.MOVIE+=25;reasons.push('metadata:movie');}if(liveTerms.test(text)){scores.LIVE+=15;reasons.push('metadata:live');}
 const ranked=(Object.entries(scores) as ['LIVE'|'MOVIE'|'SERIES',number][]).sort((a,b)=>b[1]-a[1]),winner=ranked[0],margin=winner[1]-ranked[1][1],kind:ImportedItemKind=winner[1]===0?'LIVE':winner[0],confidence=winner[1]===0?.25:Math.min(.99,.55+winner[1]/200+margin/400),genres=documentaryTerms.test(text)?['DOCUMENTARY']:[];
 return{kind,confidence:Number(confidence.toFixed(2)),reasons:reasons.length?reasons:['fallback:live'],genres};
}

export function providerGenres(category?:string,...values:(unknown)[]){const text=[category,...values].map(value=>String(value??'')).join(' ');return documentaryTerms.test(text)?['DOCUMENTARY']:[];}
