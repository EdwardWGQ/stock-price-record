import type {Language} from '../lib/types';
import {Eye,Info} from 'lucide-react';
import {indexSentiment,type IndexSentimentRegime,type SentimentInput} from '../lib/market-sentiment';

const scopes={
 VIX:{zh:{title:'美国大盘情绪',scope:'标普 500 大盘',definition:'VIX 衡量标普 500 期权隐含的未来 30 天波动预期，用于观察美国大盘风险情绪，不衡量经济增长。',watch:'观察标普 500 回踩时能否守住近期低点，以及 VIX 是否持续回落。'},en:{title:'U.S. broad-market sentiment',scope:'the S&P 500',definition:'VIX measures 30-day volatility implied by S&P 500 options. It helps assess broad-market risk sentiment, rather than economic growth.',watch:'Watch whether the S&P 500 holds recent lows on a pullback and whether VIX continues to decline.'},source:'https://www.cboe.com/tradable-products/volatility-trading/'},
 VXN:{zh:{title:'科技权重板块情绪',scope:'纳指 100 科技权重板块',definition:'VXN 衡量纳指 100 期权隐含的未来 30 天波动预期。纳指 100 科技权重较高，也包含消费、医药等行业，不覆盖全部科技股。',watch:'观察纳指 100 及目标科技股是否企稳，以及 VXN 是否继续回落；个股还需结合财报和估值。'},en:{title:'Technology-heavy market sentiment',scope:'the technology-heavy Nasdaq-100',definition:'VXN measures 30-day volatility implied by Nasdaq-100 options. This technology-heavy index also includes consumer and healthcare businesses; it does not cover all technology stocks.',watch:'Watch the Nasdaq-100 and target technology stocks for stability, and VXN for further declines. Check individual earnings and valuations too.'},source:'https://www.cboe.com/us/indices/dashboard/VXN/'},
};
const copy:Record<IndexSentimentRegime,{zh:[string,string];en:[string,string]}>= {
 unavailable:{zh:['等待指数数据','该指数尚无完整、有效的收盘数据，暂不判断情绪。'],en:['Awaiting index data','Complete, valid closing data is unavailable; sentiment assessment is paused.']},
 stale:{zh:['数据已过期 · 暂缓判断','当前保留的是上次指数数据，仅供历史参考；重新加载后再判断情绪。'],en:['Stale data · assessment paused','Retained index data is historical reference only. Reload before assessing sentiment.']},
 insufficient:{zh:['历史样本不足','尚未取得 20 个交易日的有效数据，无法结合自身近期均值形成完整判断。'],en:['Insufficient history','Twenty valid trading sessions are needed to assess the index against its own recent average.']},
 'easing-elevated':{zh:['紧张缓解，仍需确认','单日与近 5 日波动预期均下降，风险情绪有所缓解；但指数仍高于自身 20 日均值，持续稳定性有待观察。'],en:['Tension easing · confirmation needed','One- and five-session volatility expectations are lower, but the index remains above its own 20-session average. Sustained stability needs confirmation.']},
 easing:{zh:['情绪趋稳，保持观察','单日与近 5 日波动预期均下降，且指数不高于自身 20 日均值，风险担忧有所降温；这不能单独确认买点。'],en:['Sentiment stabilizing','One- and five-session volatility expectations are lower, and the index is at or below its own 20-session average. This alone does not identify an entry price.']},
 rising:{zh:['紧张升温，谨慎观察','单日与近 5 日波动预期均上升，对未来价格波动的担忧增加；不能据此断言股价必然下跌。'],en:['Tension rising','One- and five-session volatility expectations are higher, indicating greater concern about future fluctuations; this does not guarantee falling prices.']},
 mixed:{zh:['短期反复，等待确认','单日变化与近 5 日趋势相反，风险情绪出现反复，暂不以单日变化判断持续方向。'],en:['Short-term reversal','The daily change opposes the five-session trend. One session does not confirm a lasting direction.']},
 neutral:{zh:['情绪方向尚不明确','日变化与近 5 日变化尚未形成一致的升温或降温信号，继续观察后续收盘数据。'],en:['No clear direction','Daily and five-session changes do not show consistent warming or cooling. Monitor subsequent closes.']},
};

export function IndexSentiment({symbol,language,data,demo=false,loading=false}:{symbol:'VIX'|'VXN';language:Language;data?:SentimentInput;demo?:boolean;loading?:boolean}) {
 const zh=language==='zh',details=scopes[symbol][language],result=indexSentiment(data);
 const [title,summary]=copy[result.regime][language];
 const valid=!['unavailable','stale','insufficient'].includes(result.regime);
 const tone=result.regime==='rising'?'down':result.regime==='easing'?'up':'sentiment-caution';
 const relative=result.metrics?.aboveAverage;
 return <section className="index-sentiment" aria-labelledby={`${symbol}SentimentTitle`} aria-busy={loading}>
  <div className="sentiment-heading"><h4 id={`${symbol}SentimentTitle`}>{details.title}</h4><span className={`sentiment-state ${tone}`}><i aria-hidden="true"/>{title}</span></div>
  <p className="sentiment-summary">{summary}</p>
  {relative!==null&&relative!==undefined&&<p className="index-baseline"><span>{zh?'相对自身 20 日均值':'VS OWN 20D AVG'}</span><strong>{relative>0?'+':''}{relative.toFixed(2)}%</strong></p>}
  {valid&&<div className="index-watch-note"><Eye size={15} aria-hidden="true"/><p><b>{zh?'观察重点':'WATCH NEXT'}</b>{details.watch}</p></div>}
  <div className="index-explanation"><div className="index-explanation-heading"><span><Info size={14} aria-hidden="true"/>{zh?'指数说明与分析依据':'Index definition & analysis'}</span></div><div className="sentiment-disclosure-body"><p className="index-definition">{details.definition} <a href={scopes[symbol].source} target="_blank" rel="noreferrer">{zh?'Cboe 指数说明':'Cboe index definition'}</a></p><p className="sentiment-meta">{zh?'解读结合单日变化、近 5 个交易日变化和自身 20 日均值。图表虚线表示最近 20 个交易日的均值，不代表价格支撑位。':'The assessment combines daily and five-session changes with the index’s own 20-session average. The dashed line shows that average, not a price support level.'}{demo?(zh?' 当前为历史快照。':' Historical snapshot.'):''}{loading?(zh?' 正在刷新，暂时保留上次解读。':' Refreshing; previous assessment retained.'):''}</p></div></div>
 </section>;
}
