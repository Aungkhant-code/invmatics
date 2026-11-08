// Currency + exchange-rate fields for the new sales / purchase order forms.
import { CurrencyInput } from './Pickers';
import { baseCurrency, rateFor, fmt } from '../../lib/money';

export default function OrderCurrency({ currency, rate, onCurrency, onRate, id }) {
  const base = baseCurrency();
  const cur = currency || base;
  const live = rateFor(cur);
  return (
    <>
      <div className="im-field">
        <label>Currency</label>
        <CurrencyInput value={currency || base} id={id} onChange={v => onCurrency(v === base ? '' : v)} />
      </div>
      {cur !== base && (
        <div className="im-field">
          <label>Exchange rate (1 {cur} = ? {base})</label>
          <input type="number" min="0" step="any" value={rate}
            placeholder={live ? String(Math.round(live * 1e6) / 1e6) : 'Required'}
            onChange={e => onRate(e.target.value)} />
          <small style={{ color: 'var(--text-muted)' }}>
            {live ? `Live rate ${fmt(live, base)} — leave blank to use it` : `No live rate for ${cur} — enter one`}
          </small>
        </div>
      )}
    </>
  );
}
