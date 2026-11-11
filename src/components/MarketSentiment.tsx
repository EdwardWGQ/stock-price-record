import type {Language} from '../lib/types';
import {ChevronDown,Eye} from 'lucide-react';
import {marketSentiment,type SentimentInput,type SentimentRegime} from '../lib/market-sentiment';

const copy:Record<SentimentRegime,{zh:[string,string,string];en:[string,string,string]}>= {
 unavailable:{zh:['等待完整数据','VIX／VXN 数据尚未齐全，暂不形成总体情绪判断。','等待两项指数加载完成，或点击上方重新加载。'],en:['Awaiting both indexes','VIX / VXN data is incomplete; a combined sentiment assessment is unavailable.','Wait for both indexes to load, or reload the cards above.']},
 stale:{zh:['数据已过期 · 暂缓判断','部分指数保留的是上次数据，以下数值仅供历史参考。','重新加载并核对两项指数的收盘日期后，再判断当前情绪。'],en:['Stale data · assessment paused','At least one index contains retained data. Figures below are historical reference only.','Reload and verify both closing dates before assessing current sentiment.']},
 mismatched:{zh:['日期不一致 · 暂缓判断','VIX 与 VXN 的最新收盘日期不同，暂不合并解读。','等待两项指数更新到同一个交易日。'],en:['Different closing dates','VIX and VXN have different latest closing dates; a combined assessment is paused.','Wait until both indexes cover the same trading session.']},
 insufficient:{zh:['历史样本不足','尚未取得两项指数各 20 个交易日的数据，暂不进行完整情绪判断。','补齐历史数据后，再结合日变化、近 5 日变化与各自均值观察。'],en:['Insufficient history','Both indexes need 20 trading sessions for a complete assessment.','Load more history to compare daily and five-session changes with each index’s own average.']},
 'easing-elevated':{zh:['紧张缓解，仍需确认','两项波动率的日变化和近 5 日变化均为下降，市场紧张程度缓解；但至少一项仍高于自身 20 日均值。','观察波动率能否持续回落，以及目标股票或指数回踩时能否守住近期低点。'],en:['Tension easing · confirmation needed','Both volatility indexes are lower over one and five sessions, but at least one remains above its own 20-session average.','Watch for sustained declines in volatility and whether target equities hold recent lows on a pullback.']},
 easing:{zh:['情绪趋稳，保持观察','两项波动率同步回落，且均不高于各自 20 日均值，预期波动有所降温。','继续观察股价与波动率是否保持一致；情绪趋稳不能单独确认买点。'],en:['Sentiment stabilizing','Both volatility indexes are declining and are at or below their own 20-session averages.','Check whether equity prices confirm the change; calmer sentiment alone does not identify an entry price.']},
 rising:{zh:['紧张升温，谨慎观察','两项波动率的日变化和近 5 日变化均为上升，市场对未来波动的担忧增加。','观察波动率是否继续升高，并检查持仓集中度和目标股票的价格走势。'],en:['Tension rising','Both volatility indexes are higher over one and five sessions, indicating greater concern about future fluctuations.','Watch for further increases, and review position concentration and target equity price trends.']},
 mixed:{zh:['信号分歧，等待确认','两项指数方向不一致，或单日变化与近 5 日趋势相反，情绪尚未形成一致方向。','等待两项波动率与股价走势共同确认，避免只根据单日变化判断。'],en:['Mixed signals','The indexes diverge, or daily changes oppose the five-session trend. Sentiment has no consistent direction.','Wait for volatility and equity prices to confirm, rather than drawing conclusions from one session.']},
 neutral:{zh:['情绪方向尚不明确','当前日变化与近 5 日变化尚未形成两项指数同步升温或降温的信号。','结合后续收盘数据和股价走势继续观察。'],en:['No clear sentiment direction','Daily and five-session changes do not show both indexes consistently rising or falling.','Continue monitoring subsequent closes and equity price trends.']},
};
const formatPercent=(value:number|null)=>value===null?'—':`${value>0?'+':''}${value.toFixed(2)}%`;

export function MarketSentiment({language,vix,vxn,demo=false,loading=false}:{language:Language;vix?:SentimentInput;vxn?:SentimentInput;demo?:boolean;loading?:boolean}) {
 const result=marketSentiment(vix,vxn),zh=language==='zh';
 const [title,summary,watch]=copy[result.regime][language];
 const tone=result.regime==='rising'?'down':result.regime==='easing'?'up':'sentiment-caution';
 const both=result.vix&&result.vxn;
 return <article className="market-sentiment sentiment-overview" aria-labelledby="marketSentimentTitle" aria-busy={loading}>
  <div className="sentiment-overview-heading"><h3 id="marketSentimentTitle">{zh?'市场情绪分析':'MARKET SENTIMENT'}</h3><span className={`sentiment-state ${tone}`}><i aria-hidden="true"/>{title}</span></div>
  <p className="sentiment-summary">{summary}</p>
  <div className="overview-watch"><Eye size={15} aria-hidden="true"/><p><b>{zh?'观察重点':'WATCH NEXT'}</b>{watch}</p></div>
  <details className="sentiment-disclosure overview-disclosure"><summary aria-label={zh?'查看综合判断依据':'View combined assessment details'}><span>{zh?'查看综合判断依据':'View assessment details'}</span><ChevronDown size={15} className="disclosure-chevron" aria-hidden="true"/></summary><div className="sentiment-disclosure-body">{both&&<div className="sentiment-evidence">{([['VIX',result.vix],['VXN',result.vxn]] as const).map(([symbol,metrics])=><div key={symbol}><b translate="no" className="notranslate">{symbol}</b><span>{zh?'日变化':'DAILY'} {formatPercent(metrics!.daily)}</span><span>{zh?'近 5 日':'5D'} {formatPercent(metrics!.fiveDay)}</span><span>{zh?'相对自身 20 日均值':'VS OWN 20D AVG'} {formatPercent(metrics!.aboveAverage)}</span></div>)}</div>}<p className="sentiment-meta">{both?`VIX ${result.vix!.date} · VXN ${result.vxn!.date} · `:''}{demo?(zh?'历史快照 · ':'HISTORICAL SNAPSHOT · '):''}{loading?(zh?'正在刷新 · ':'REFRESHING · '):''}{zh?'基于日收盘波动率的规则解读；不代表涨跌预测或个股估值。':'Rule-based interpretation of daily closing volatility; not a price forecast or an equity valuation.'}</p></div></details>
 </article>;
}
