export async function parallelEach<T>(items:T[],limit:number,work:(item:T)=>Promise<void>):Promise<void> {
 let position=0;
 await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{
  while(position<items.length)await work(items[position++]);
 }));
}
