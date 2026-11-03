const test=require('node:test'); const assert=require('node:assert/strict');
const football=require('./football');
const sample={generatedAt:'2026-09-28T12:00:00Z',provider:'ESPN',matches:[
{id:'2',league:'eng.1',leagueName:'Premier League',startTime:'2026-09-30T18:00:00Z',state:{name:'scheduled',detail:'Scheduled',completed:false,live:false},home:{name:'Alpha FC',shortName:'Alpha',score:null},away:{name:'Beta FC',shortName:'Beta',score:null}},
{id:'1',league:'eng.1',leagueName:'Premier League',startTime:'2026-09-28T18:00:00Z',state:{name:'in',detail:'45\'',completed:false,live:true},home:{name:'Alpha FC',shortName:'Alpha',score:1},away:{name:'Beta FC',shortName:'Beta',score:0}},
{id:'1',league:'eng.1',leagueName:'Premier League',startTime:'2026-09-28T18:00:00Z',state:{name:'in',detail:'45\'',completed:false,live:true},home:{name:'Alpha FC',shortName:'Alpha',score:1},away:{name:'Beta FC',shortName:'Beta',score:0}},
{id:'3',league:'esp.1',leagueName:'LaLiga',startTime:'2026-09-27T18:00:00Z',state:{name:'post',detail:'FT',completed:true,live:false},home:{name:'Gamma',shortName:'Gamma',score:2},away:{name:'Delta',shortName:'Delta',score:2}}],standings:[{league:'eng.1',leagueName:'Premier League',table:[{rank:2,team:'B',played:2,won:1,drawn:1,lost:0,points:4},{rank:1,team:'A',played:2,won:2,drawn:0,lost:0,points:6}]},{league:'esp.1',leagueName:'LaLiga',table:[]}],news:[{id:'n1',headline:'One',description:'',published:null,link:'https://example.com',images:[]},{id:'n1',headline:'One duplicate',description:'',published:null,link:'https://example.com',images:[]}]};

test('B46.1 exposes supported league catalog including Nigeria',()=>assert.equal(football.LEAGUES.find(x=>x.id==='nigeria.1').name,'Nigeria Premier League'));
test('B46.2 filters leagues case-insensitively',()=>assert.equal(football.filterFootballUpdates(sample,{league:' PREMIER LEAGUE '}).matches.length,2));
test('B46.3 filters teams across full and short names',()=>assert.equal(football.filterFootballUpdates(sample,{team:'beta'}).matches.length,2));
test('B46.4 dedupes match records by provider id',()=>assert.equal(football.prepareFootballData(sample).matches.length,3));
test('B46.5 sorts matches chronologically with live first',()=>assert.deepEqual(football.prepareFootballData(sample).matches.map(x=>x.id),['1','2','3']));
test('B46.6 filters by match state',()=>assert.equal(football.filterFootballUpdates(sample,{state:'live'}).matches.length,1));
test('B46.7 filters by date window',()=>assert.equal(football.filterFootballUpdates(sample,{date:'2026-09-28'}).matches.length,1));
test('B46.8 selects requested standings instead of always first',()=>assert.equal(football.filterFootballUpdates(sample,{league:'esp.1'}).standings[0].league,'esp.1'));
test('B46.9 sorts standings by rank',()=>assert.deepEqual(football.prepareFootballData(sample).standings[0].table.map(x=>x.rank),[1,2]));
test('B46.10 dedupes news records',()=>assert.equal(football.prepareFootballData(sample).news.length,1));
