import {authedFetch} from './api';
export type FootballMatch={id:string;league:string;leagueName:string;startTime:string|null;state:{name:string;detail:string;completed:boolean;live:boolean};home:{name:string;shortName:string;score:number|null;logo?:string|null};away:{name:string;shortName:string;score:number|null;logo?:string|null}};
export type FootballStandings={league:string;leagueName:string;table:Array<{rank:number;team:string;logo?:string|null;played:any;won:any;drawn:any;lost:any;points:any;goalDifference:any;form:any}>};
export type FootballNews={id:string;headline:string;description:string;published:string|null;link:string|null;images:string[]};
export type BallHouseFootball={generatedAt:string;provider:string;matches:FootballMatch[];standings:FootballStandings[];news:FootballNews[]};
export type FootballFilters={league?:string;team?:string;state?:'live'|'upcoming'|'completed';date?:string};
export async function getBallHouseFootball(filters?:{league?:string;team?:string}):Promise<BallHouseFootball>;
export async function getBallHouseFootball(filters?:FootballFilters):Promise<BallHouseFootball>;
export async function getBallHouseFootball(filters?:FootballFilters):Promise<BallHouseFootball>{const q=new URLSearchParams();if(filters?.league)q.set('league',filters.league);if(filters?.team)q.set('team',filters.team);if(filters?.state)q.set('state',filters.state);if(filters?.date)q.set('date',filters.date);return authedFetch('/api/ball-house/football'+(q.toString()?'?'+q.toString():''));}
export async function getBallHouseTickets(){return authedFetch('/api/yaayz/tickets?type=stadium&search=Ball%20House');}
