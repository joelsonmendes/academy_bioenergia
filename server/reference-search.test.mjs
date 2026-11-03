import test from 'node:test';
import assert from 'node:assert/strict';
import {SOURCES,MODULES} from '../src/content.js';
import {filterReferences} from '../src/reference-search.js';

test('reference search accepts multiple words in any order, accents and aliases',()=>{
 const hits=filterReferences(SOURCES,{search:'  POTÊNCIA eólica  '});
 assert.ok(hits.some(r=>r.id==='cepel-wind'));
 assert.deepEqual(filterReferences(SOURCES,{search:'eolica potencia'}).map(r=>r.id),hits.map(r=>r.id));
 assert.ok(filterReferences(SOURCES,{search:'energia fotovoltaico'}).some(r=>r.id==='inpe-solar'));
 assert.ok(filterReferences(SOURCES,{search:'umidade Embrapa'}).some(r=>r.id==='embrapa-moisture'));
 assert.ok(!filterReferences(SOURCES,{search:'umidade Embrapa'}).some(r=>r.id==='embrapa-biomass'));
});

test('reference search covers translated descriptions and institution names',()=>{
 assert.ok(filterReferences(SOURCES,{search:'moisture Embrapa'}).some(r=>r.id==='embrapa-moisture'));
 assert.ok(filterReferences(SOURCES,{search:'INPE Brasil'}).some(r=>r.id==='inpe-solar'));
 assert.equal(filterReferences(SOURCES,{search:'___zzzz_nao_existe___'}).length,0);
});

test('reference search combines origin, energy source and query filters',()=>{
 const hits=filterReferences(SOURCES,{search:'energia',origin:'BR',module:'tidal'});
 assert.ok(hits.some(r=>r.id==='ufma-tidal'));
 assert.ok(hits.every(r=>r.origin==='BR'&&r.modules.includes('tidal')));
 assert.equal(filterReferences(SOURCES,{search:'NOAA',origin:'BR'}).length,0);
 assert.equal(filterReferences(SOURCES,{search:'   '}).length,SOURCES.length);
});

test('each lesson points to existing references and includes Brazilian material',()=>{
 const ids=new Set(SOURCES.map(r=>r.id));
 assert.equal(ids.size,SOURCES.length);
 for(const [key,lesson] of Object.entries(MODULES)){
  assert.ok(lesson.sourceIds.every(id=>ids.has(id)),`unknown reference in ${key}`);
  assert.ok(lesson.sourceIds.some(id=>SOURCES.find(r=>r.id===id).origin==='BR'),`Brazil reference missing in ${key}`);
 }
 for(const r of SOURCES){
  assert.equal(new URL(r.url).protocol,'https:');
  if(r.alternateUrl)assert.equal(new URL(r.alternateUrl).protocol,'https:');
  assert.ok(r.modules.length&&r.modules.every(key=>key in MODULES));
  assert.match(r.verifiedOn,/^\d{4}-\d{2}-\d{2}$/);
 }
});
