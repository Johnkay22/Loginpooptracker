/*
 * Poop Profit display currency.
 * One setting for everyone (guests and accounts), shared by the homepage and the app.
 * Symbol and number format only: amounts are whatever pay the person typed in,
 * so nothing is ever converted between currencies.
 * Default comes from the browser's time zone, then its language region, then USD.
 */
(function (global) {
  "use strict";

  var STORAGE_KEY = "pp_currency_v1";

  // code, symbol as shown before the number, short icon, decimals, name.
  // Covers every country in Search Console data. Most-used first, rest alphabetical by name.
  var LIST = [
    ["USD", "$", "$", 2, "US dollar"],
    ["GBP", "£", "£", 2, "British pound"],
    ["EUR", "€", "€", 2, "Euro"],
    ["CAD", "CA$", "$", 2, "Canadian dollar"],
    ["AUD", "A$", "$", 2, "Australian dollar"],
    ["INR", "₹", "₹", 2, "Indian rupee"],
    ["BDT", "৳", "৳", 2, "Bangladeshi taka"],
    ["BRL", "R$", "R$", 2, "Brazilian real"],
    ["KHR", "៛", "៛", 0, "Cambodian riel"],
    ["CLP", "CLP$", "$", 0, "Chilean peso"],
    ["DKK", "kr ", "kr", 2, "Danish krone"],
    ["GTQ", "Q", "Q", 2, "Guatemalan quetzal"],
    ["HUF", "Ft ", "Ft", 0, "Hungarian forint"],
    ["IDR", "Rp ", "Rp", 0, "Indonesian rupiah"],
    ["MYR", "RM ", "RM", 2, "Malaysian ringgit"],
    ["MXN", "MX$", "$", 2, "Mexican peso"],
    ["NZD", "NZ$", "$", 2, "New Zealand dollar"],
    ["NGN", "₦", "₦", 2, "Nigerian naira"],
    ["NOK", "kr ", "kr", 2, "Norwegian krone"],
    ["PEN", "S/ ", "S/", 2, "Peruvian sol"],
    ["PHP", "₱", "₱", 2, "Philippine peso"],
    ["SAR", "SAR ", "SAR", 2, "Saudi riyal"],
    ["RSD", "RSD ", "RSD", 0, "Serbian dinar"],
    ["SGD", "S$", "$", 2, "Singapore dollar"],
    ["ZAR", "R ", "R", 2, "South African rand"],
    ["KRW", "₩", "₩", 0, "South Korean won"],
    ["SEK", "kr ", "kr", 2, "Swedish krona"],
    ["TRY", "₺", "₺", 2, "Turkish lira"]
  ];
  var BY_CODE = {};
  LIST.forEach(function (row) {
    BY_CODE[row[0]] = { code: row[0], symbol: row[1], icon: row[2], decimals: row[3], name: row[4] };
  });

  var EURO = "AT BE CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK".split(" ");
  var COUNTRY = {
    US: "USD", GB: "GBP", CA: "CAD", AU: "AUD", NZ: "NZD", IN: "INR", BD: "BDT", BR: "BRL",
    KH: "KHR", CL: "CLP", DK: "DKK", GT: "GTQ", HU: "HUF", ID: "IDR", MY: "MYR", MX: "MXN",
    NG: "NGN", NO: "NOK", PE: "PEN", PH: "PHP", SA: "SAR", RS: "RSD", SG: "SGD", ZA: "ZAR",
    KR: "KRW", SE: "SEK", TR: "TRY"
  };
  EURO.forEach(function (cc) { COUNTRY[cc] = "EUR"; });

  // Time zones that identify a supported non-US country.
  var ZONE = {
    "Europe/London": "GB", "Europe/Belfast": "GB", "Europe/Dublin": "IE",
    "Europe/Paris": "FR", "Europe/Berlin": "DE", "Europe/Madrid": "ES", "Atlantic/Canary": "ES",
    "Europe/Rome": "IT", "Europe/Amsterdam": "NL", "Europe/Brussels": "BE", "Europe/Vienna": "AT",
    "Europe/Lisbon": "PT", "Atlantic/Madeira": "PT", "Atlantic/Azores": "PT", "Europe/Helsinki": "FI",
    "Europe/Athens": "GR", "Europe/Zagreb": "HR", "Europe/Bratislava": "SK", "Asia/Nicosia": "CY",
    "Europe/Nicosia": "CY", "Asia/Famagusta": "CY", "Europe/Ljubljana": "SI", "Europe/Tallinn": "EE",
    "Europe/Riga": "LV", "Europe/Vilnius": "LT", "Europe/Luxembourg": "LU", "Europe/Malta": "MT",
    "Europe/Stockholm": "SE", "Europe/Oslo": "NO", "Europe/Copenhagen": "DK", "Europe/Budapest": "HU",
    "Europe/Belgrade": "RS", "Europe/Istanbul": "TR", "Asia/Istanbul": "TR",
    "Asia/Kolkata": "IN", "Asia/Calcutta": "IN", "Asia/Dhaka": "BD", "Asia/Dacca": "BD",
    "Asia/Manila": "PH", "Asia/Jakarta": "ID", "Asia/Pontianak": "ID", "Asia/Makassar": "ID",
    "Asia/Jayapura": "ID", "Asia/Kuala_Lumpur": "MY", "Asia/Kuching": "MY", "Asia/Singapore": "SG",
    "Asia/Seoul": "KR", "Asia/Riyadh": "SA", "Asia/Phnom_Penh": "KH", "Africa/Lagos": "NG",
    "Africa/Johannesburg": "ZA", "America/Lima": "PE", "America/Santiago": "CL", "America/Punta_Arenas": "CL",
    "Pacific/Easter": "CL", "America/Guatemala": "GT", "Pacific/Auckland": "NZ", "Pacific/Chatham": "NZ",
    "America/Toronto": "CA", "America/Montreal": "CA", "America/Vancouver": "CA", "America/Edmonton": "CA",
    "America/Winnipeg": "CA", "America/Halifax": "CA", "America/St_Johns": "CA", "America/Regina": "CA",
    "America/Moncton": "CA", "America/Glace_Bay": "CA", "America/Goose_Bay": "CA", "America/Whitehorse": "CA",
    "America/Dawson": "CA", "America/Yellowknife": "CA", "America/Iqaluit": "CA", "America/Swift_Current": "CA",
    "America/Thunder_Bay": "CA", "America/Nipigon": "CA", "America/Rankin_Inlet": "CA", "America/Cambridge_Bay": "CA",
    "America/Inuvik": "CA", "America/Creston": "CA", "America/Dawson_Creek": "CA", "America/Fort_Nelson": "CA",
    "America/Atikokan": "CA", "America/Blanc-Sablon": "CA", "America/Resolute": "CA", "America/Rainy_River": "CA",
    "America/Mexico_City": "MX", "America/Monterrey": "MX", "America/Tijuana": "MX", "America/Cancun": "MX",
    "America/Merida": "MX", "America/Chihuahua": "MX", "America/Hermosillo": "MX", "America/Mazatlan": "MX",
    "America/Matamoros": "MX", "America/Ojinaga": "MX", "America/Bahia_Banderas": "MX", "America/Ciudad_Juarez": "MX",
    "America/Sao_Paulo": "BR", "America/Fortaleza": "BR", "America/Recife": "BR", "America/Bahia": "BR",
    "America/Belem": "BR", "America/Manaus": "BR", "America/Cuiaba": "BR", "America/Campo_Grande": "BR",
    "America/Porto_Velho": "BR", "America/Boa_Vista": "BR", "America/Rio_Branco": "BR", "America/Maceio": "BR",
    "America/Araguaina": "BR", "America/Santarem": "BR", "America/Noronha": "BR", "America/Eirunepe": "BR"
  };

  // US time zones: someone physically in the US is paid in dollars whatever their browser language says.
  var US_ZONE = /^(America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Detroit|Boise|Juneau|Adak|Nome|Sitka|Yakutat|Metlakatla|Menominee|Indiana\/.+|Kentucky\/.+|North_Dakota\/.+|Indianapolis|Louisville|Puerto_Rico)|Pacific\/Honolulu|US\/.+)$/;

  function safeGet() {
    try { return global.localStorage ? global.localStorage.getItem(STORAGE_KEY) : null; } catch (e) { return null; }
  }
  function safeSet(code) {
    try { if (global.localStorage) global.localStorage.setItem(STORAGE_KEY, code); } catch (e) {}
  }

  function detect() {
    try {
      var zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (ZONE[zone] && COUNTRY[ZONE[zone]]) return COUNTRY[ZONE[zone]];
      if (zone.indexOf("Australia/") === 0) return "AUD";
      if (US_ZONE.test(zone)) return "USD";
    } catch (e) {}
    try {
      var langs = (global.navigator && (global.navigator.languages || [global.navigator.language])) || [];
      for (var i = 0; i < langs.length; i++) {
        var m = /[-_]([A-Za-z]{2})\b/.exec(String(langs[i] || ""));
        if (m && COUNTRY[m[1].toUpperCase()]) return COUNTRY[m[1].toUpperCase()];
      }
    } catch (e) {}
    return "USD";
  }

  var listeners = [];
  var current = (function () {
    var saved = safeGet();
    return saved && BY_CODE[saved] ? saved : detect();
  })();

  function info(code) { return BY_CODE[code || current] || BY_CODE.USD; }

  // decimals: undefined = currency default, 0 = whole units, 2 = force cents (if the currency has cents)
  function format(amount, decimals, code) {
    var c = info(code);
    var d = decimals === 0 ? 0 : c.decimals;
    var n = Number(amount);
    if (!isFinite(n)) n = 0;
    var body = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
    return (n < 0 ? "-" : "") + c.symbol + body;
  }

  function set(code, opts) {
    if (!BY_CODE[code]) return;
    var changed = code !== current;
    current = code;
    if (!(opts && opts.persist === false)) safeSet(code);
    if (changed) listeners.forEach(function (fn) { try { fn(code); } catch (e) {} });
  }

  // Fill a <select> with every currency, selected to the current one.
  function fillSelect(select, labelStyle) {
    if (!select) return;
    select.innerHTML = "";
    LIST.forEach(function (row) {
      var opt = document.createElement("option");
      opt.value = row[0];
      opt.textContent = labelStyle === "short"
        ? (row[1].trim() + "  " + row[0])
        : (row[0] + " (" + row[1].trim() + ") " + row[4]);
      select.appendChild(opt);
    });
    select.value = current;
  }

  global.PPCurrency = {
    list: LIST.map(function (r) { return r[0]; }),
    get: function () { return current; },
    info: info,
    detect: detect,
    set: set,
    format: format,
    fillSelect: fillSelect,
    hasSaved: function () { var s = safeGet(); return !!(s && BY_CODE[s]); },
    isSupported: function (code) { return !!BY_CODE[code]; },
    onChange: function (fn) { if (typeof fn === "function") listeners.push(fn); }
  };
})(window);
