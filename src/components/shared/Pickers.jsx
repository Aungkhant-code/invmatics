// Type-to-search pickers backed by <datalist>: pick from the list or type anything.
// Currencies come from the browser (all ISO 4217 codes); timezones are every IANA zone.

const FALLBACK_CUR = ['USD', 'EUR', 'GBP', 'JPY', 'THB', 'SGD', 'MYR', 'IDR', 'VND', 'PHP', 'MMK', 'KHR', 'NZD', 'AUD', 'CNY', 'INR'];
const FALLBACK_TZ  = ['UTC', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Kuala_Lumpur', 'Asia/Jakarta', 'Asia/Ho_Chi_Minh',
  'Asia/Manila', 'Asia/Yangon', 'Asia/Tokyo', 'Asia/Kolkata', 'Asia/Dubai', 'Europe/London', 'Europe/Paris',
  'America/New_York', 'America/Los_Angeles', 'Pacific/Auckland', 'Australia/Sydney'];

function supported(kind, fallback) {
  try { return Intl.supportedValuesOf(kind); } catch { return fallback; }
}

let _cur, _tz;
function currencies() {
  if (!_cur) {
    let names = null;
    try { names = new Intl.DisplayNames(undefined, { type: 'currency' }); } catch { /* old browser */ }
    _cur = supported('currency', FALLBACK_CUR).map(c => [c, names ? (names.of(c) || c) : c]);
  }
  return _cur;
}
function timezones() {
  if (!_tz) {
    const list = supported('timeZone', FALLBACK_TZ);
    _tz = list.includes('UTC') ? list : ['UTC', ...list];
  }
  return _tz;
}

export function CurrencyInput({ value, onChange, id = 'im-currencies', ...rest }) {
  return (
    <>
      <input list={id} value={value || ''} placeholder="THB, USD… or your own"
        maxLength={10} autoCapitalize="characters"
        onChange={e => onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} {...rest} />
      <datalist id={id}>
        {currencies().map(([code, name]) => <option key={code} value={code}>{name}</option>)}
      </datalist>
    </>
  );
}

export function TimezoneInput({ value, onChange, id = 'im-timezones', ...rest }) {
  return (
    <>
      <input list={id} value={value || ''} placeholder="Start typing a city, e.g. Bangkok"
        onChange={e => onChange(e.target.value)} {...rest} />
      <datalist id={id}>
        {timezones().map(z => <option key={z} value={z} />)}
      </datalist>
    </>
  );
}
