import { describe, it, expect } from 'vitest';
import { decimalValue, percent, tradeValue, currencyTotals, money } from '../src/lib/finance';
import { initialDemo } from '../src/lib/demo';
describe('exact financial records', () => {
  it('multiplies fractional shares without float drift', () => { expect(tradeValue({ side:'buy', quantity:'0.1', price:'0.2', fees:'0.01' })).toBe('0.03'); });
  it('keeps 20-digit decimals precise', () => { expect(decimalValue('999999999999.12345678')).toBe('999999999999.12345678'); expect(tradeValue({ side:'buy', quantity:'999999999999.12345678', price:'0.00000001', fees:'0' })).toBe('9999.9999999912345678'); });
  it('never uses zero for a missing starting price', () => { expect(percent('100',null)).toBeNull(); expect(percent('100','0')).toBeNull(); expect(percent('110','100')).toBe('10.00'); });
  it('keeps currencies separate', () => { const trade=initialDemo().trades[0]; expect(currencyTotals([{...trade,currency:'USD'},{...trade,currency:'EUR'}])).toEqual({ USD:'-30.973', EUR:'-30.973' }); });
  it('rejects exponent notation, NaN, negatives, overflow and excess scale', () => { for (const v of ['1e5','NaN','-1','0','1000000000000','0.123456789']) expect(() => decimalValue(v)).toThrow(); });
  it('formats a large amount without rounding through Number', () => { expect(money('999999999999999999.12','USD','en')).toContain('999,999,999,999,999,999.12'); });
  it('preserves negative sub-unit cash flow and shows two decimals for JPY', () => { expect(money('-0.03','USD','en')).toContain('-USD'); expect(money('-0.03','USD','en')).toContain('0.03'); expect(money('12.34','JPY','en')).toContain('12.34'); });
});
