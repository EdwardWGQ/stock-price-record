/** Only available markets may navigate; planned markets remain clearly marked. */
export const markets=[
 {id:'us',name:'美股',english:'U.S. equities',code:'US',available:true,monitorLabel:'美股监测',analysisLabel:'美股市场分析'},
 {id:'bitcoin',name:'比特币',english:'Bitcoin',code:'BTC',available:false,monitorLabel:'比特币监测',analysisLabel:'比特币市场分析'},
 {id:'gold',name:'黄金',english:'Gold',code:'AU',available:false,monitorLabel:'黄金监测',analysisLabel:'黄金市场分析'},
] as const;
export const activeMarket=markets[0];
