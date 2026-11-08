import {expect,type Page} from '@playwright/test';

export async function hoverHistoryPoint(page:Page,symbol:string,date:string) {
 const point=await page.evaluate(async({symbol,date})=>{
  const modulePath=performance.getEntriesByType('resource').find(entry=>new URL(entry.name).pathname.endsWith('/chart__js_auto.js'))!.name;
  const {default:Chart}=await import(modulePath) as typeof import('chart.js/auto');
  const canvas=document.querySelector<HTMLCanvasElement>('#mainChart')!;
  const chart=Chart.getChart(canvas)!;
  const datasetIndex=chart.data.datasets.findIndex(dataset=>dataset.label===symbol);
  const index=chart.data.labels!.indexOf(date);
  if(datasetIndex<0||index<0||chart.data.datasets[datasetIndex].data[index]===null)throw new Error('Missing historical point');
  const point=(chart.getDatasetMeta(datasetIndex).data[index] as import('chart.js').PointElement).getCenterPoint();
  const bounds=canvas.getBoundingClientRect();
  return {x:bounds.left+point.x,y:bounds.top+point.y};
 },{symbol,date});
 await page.mouse.move(point.x,point.y);
 await expect.poll(()=>page.evaluate(async()=>{
  const modulePath=performance.getEntriesByType('resource').find(entry=>new URL(entry.name).pathname.endsWith('/chart__js_auto.js'))!.name;
  const {default:Chart}=await import(modulePath) as typeof import('chart.js/auto');
  const tooltip=Chart.getChart(document.querySelector<HTMLCanvasElement>('#mainChart')!)?.tooltip;
  return {title:tooltip?.title??[],lines:tooltip?.body?.flatMap(row=>row.lines)??[]};
 })).toMatchObject({title:[date]});
 return page.evaluate(async()=>{
  const modulePath=performance.getEntriesByType('resource').find(entry=>new URL(entry.name).pathname.endsWith('/chart__js_auto.js'))!.name;
  const {default:Chart}=await import(modulePath) as typeof import('chart.js/auto');
  const tooltip=Chart.getChart(document.querySelector<HTMLCanvasElement>('#mainChart')!)!.tooltip!;
  return {title:tooltip.title,lines:tooltip.body.flatMap(row=>row.lines)};
 });
}
