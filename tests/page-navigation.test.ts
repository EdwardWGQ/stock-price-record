import {describe,it,expect} from 'vitest';
import {pageFromAddress,pagePaths} from '../src/lib/page-navigation';

describe('workspace page addresses',()=>{
 it('resolves direct URLs and trailing slashes',()=>{
  expect(pageFromAddress('/')).toBe('monitor');
  expect(pageFromAddress('/sentiment')).toBe('sentiment');
  expect(pageFromAddress('/sentiment/')).toBe('sentiment');
  expect(pageFromAddress('/journal')).toBe('journal');
  expect(pageFromAddress('/journal/')).toBe('journal');
 });
 it('maps the old chart jump to the sentiment page while retaining other monitor anchors',()=>{
  expect(pageFromAddress('/','#volSection')).toBe('sentiment');
  expect(pageFromAddress('/','#detailSection')).toBe('monitor');
 });
 it('leaves auth callbacks and unknown routes with the existing monitor flow',()=>{
  expect(pageFromAddress('/auth/callback','#volSection')).toBe('monitor');
  expect(pageFromAddress('/other','#volSection')).toBe('monitor');
 });
 it('maps each view to its own bookmarkable path',()=>{
  for(const page of ['monitor','sentiment','journal'] as const)expect(pageFromAddress(pagePaths[page])).toBe(page);
 });
});
