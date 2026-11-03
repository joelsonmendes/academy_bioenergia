import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {studyGuide,offlineDocument,escapeHTML} from '../src/study-export.js';
const modules=JSON.parse(await readFile(new URL('../src/amazon-lessons.json',import.meta.url),'utf8'));
test('offline guide contains all five modules, references and embedded original branding',()=>{
 for(const lang of ['pt','en','es']){const html=studyGuide(modules,lang,'data:image/webp;base64,test-logo');assert.equal((html.match(/<article>/g)??[]).length,5);for(const item of modules)assert.ok(html.includes(escapeHTML(item.title[lang])));assert.ok(html.includes('data:image/webp;base64,test-logo'));assert.ok(!/<script|<link[^>]+stylesheet/.test(html));}
});
test('exported project notes can contain text resembling HTML without executing it',()=>{
 const value='<script>alert("test")</script><img src=x onerror=test>';
 const html=offlineDocument('Teste',`<pre>${escapeHTML(value)}</pre>`,'pt','data:image/webp;base64,test');assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('&lt;img'));
});
