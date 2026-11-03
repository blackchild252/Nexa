import { NEXA_COUNTRIES, type NexaCountry } from './countries';

export type NexaCountryMetadata = { callingCode: string | null; currency: string | null; localCurrency: string | null; region: string | null; timeZone: string | null; availability: 'listed' | 'unsupported' };
const COUNTRY_METADATA: Record<string, Omit<NexaCountryMetadata, 'availability'>> = {
  "AF": {
    "callingCode": "93",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Kabul",
    "localCurrency": "AFN"
  },
  "AL": {
    "callingCode": "355",
    "currency": null,
    "region": "Europe",
    "timeZone": "Europe/Tirane",
    "localCurrency": "ALL"
  },
  "DZ": {
    "callingCode": "213",
    "currency": null,
    "region": "Africa",
    "timeZone": "Africa/Algiers",
    "localCurrency": "DZD"
  },
  "AS": {
    "callingCode": "1-684",
    "currency": null,
    "region": "Oceania",
    "timeZone": "Pacific/Pago_Pago",
    "localCurrency": "USD"
  },
  "AD": {
    "callingCode": "376",
    "currency": null,
    "region": "Europe",
    "timeZone": "Europe/Andorra",
    "localCurrency": "EUR"
  },
  "AO": {
    "callingCode": "244",
    "currency": null,
    "region": "Africa",
    "timeZone": "Africa/Luanda",
    "localCurrency": "AOA"
  },
  "AI": {
    "callingCode": "1-264",
    "currency": null,
    "region": "North America",
    "timeZone": "America/Anguilla",
    "localCurrency": "XCD"
  },
  "AQ": {
    "callingCode": "672",
    "currency": null,
    "region": "Antarctica",
    "timeZone": "Antarctica/Casey",
    "localCurrency": null
  },
  "AG": {
    "callingCode": "1-268",
    "currency": null,
    "region": "North America",
    "timeZone": "America/Antigua",
    "localCurrency": "XCD"
  },
  "AR": {
    "callingCode": "54",
    "currency": null,
    "region": "South America",
    "timeZone": "America/Argentina/Buenos_Aires",
    "localCurrency": "ARS"
  },
  "AM": {
    "callingCode": "374",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Yerevan",
    "localCurrency": "AMD"
  },
  "AW": {
    "callingCode": "297",
    "currency": null,
    "region": "North America",
    "timeZone": "America/Aruba",
    "localCurrency": "AWG"
  },
  "AU": {
    "callingCode": "61",
    "currency": "AUD",
    "region": "Oceania",
    "timeZone": "Australia/Sydney",
    "localCurrency": "AUD"
  },
  "AT": {
    "callingCode": "43",
    "currency": "EUR",
    "region": "Europe",
    "timeZone": "Europe/Vienna",
    "localCurrency": "EUR"
  },
  "AZ": {
    "callingCode": "994",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Baku",
    "localCurrency": "AZN"
  },
  "BS": {
    "callingCode": "1-242",
    "currency": null,
    "region": "North America",
    "timeZone": "America/Nassau",
    "localCurrency": "BSD"
  },
  "BH": {
    "callingCode": "973",
    "currency": "BHD",
    "region": "Asia",
    "timeZone": "Asia/Bahrain",
    "localCurrency": "BHD"
  },
  "BD": {
    "callingCode": "880",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Dhaka",
    "localCurrency": "BDT"
  },
  "BB": {
    "callingCode": "1-246",
    "currency": null,
    "region": "North America",
    "timeZone": "America/Barbados",
    "localCurrency": "BBD"
  },
  "BY": {
    "callingCode": "375",
    "currency": null,
    "region": "Europe",
    "timeZone": "Europe/Minsk",
    "localCurrency": "BYN"
  },
  "BE": {
    "callingCode": "32",
    "currency": "EUR",
    "region": "Europe",
    "timeZone": "Europe/Brussels",
    "localCurrency": "EUR"
  },
  "BZ": {
    "callingCode": "501",
    "currency": null,
    "region": "North America",
    "timeZone": "America/Belize",
    "localCurrency": "BZD"
  },
  "BJ": {
    "callingCode": "229",
    "currency": "XOF",
    "region": "Africa",
    "timeZone": "Africa/Porto-Novo",
    "localCurrency": "XOF"
  },
  "BM": {
    "callingCode": "1-441",
    "currency": null,
    "region": "North America",
    "timeZone": "Atlantic/Bermuda",
    "localCurrency": "BMD"
  },
  "BT": {
    "callingCode": "975",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Thimphu",
    "localCurrency": "INR"
  },
  "BO": {
    "callingCode": "591",
    "currency": null,
    "region": "South America",
    "timeZone": "America/La_Paz",
    "localCurrency": "BOB"
  },
  "BQ": {
    "callingCode": "599",
    "currency": null,
    "region": "North America",
    "timeZone": "America/Kralendijk",
    "localCurrency": "USD"
  },
  "BA": {
    "callingCode": "387",
    "currency": null,
    "region": "Europe",
    "timeZone": "Europe/Sarajevo",
    "localCurrency": "BAM"
  },
  "BW": {
    "callingCode": "267",
    "currency": null,
    "region": "Africa",
    "timeZone": "Africa/Gaborone",
    "localCurrency": "BWP"
  },
  "BV": {
    "callingCode": "47",
    "currency": null,
    "region": "Antarctica",
    "timeZone": "Europe/Oslo",
    "localCurrency": "NOK"
  },
  "BR": {
    "callingCode": "55",
    "currency": "BRL",
    "region": "South America",
    "timeZone": "America/Sao_Paulo",
    "localCurrency": "BRL"
  },
  "IO": {
    "callingCode": "246",
    "currency": null,
    "region": "Asia",
    "timeZone": "Indian/Chagos",
    "localCurrency": "USD"
  },
  "BN": {
    "callingCode": "673",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Brunei",
    "localCurrency": "BND"
  },
  "BG": {
    "callingCode": "359",
    "currency": null,
    "region": "Europe",
    "timeZone": "Europe/Sofia",
    "localCurrency": "BGN"
  },
  "BF": {
    "callingCode": "226",
    "currency": "XOF",
    "region": "Africa",
    "timeZone": "Africa/Ouagadougou",
    "localCurrency": "XOF"
  },
  "BI": {
    "callingCode": "257",
    "currency": null,
    "region": "Africa",
    "timeZone": "Africa/Bujumbura",
    "localCurrency": "BIF"
  },
  "CV": {
    "callingCode": "238",
    "currency": null,
    "region": "Africa",
    "timeZone": "Atlantic/Cape_Verde",
    "localCurrency": "CVE"
  },
  "KH": {
    "callingCode": "855",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Phnom_Penh",
    "localCurrency": "KHR"
  },
  "CM": {
    "callingCode": "237",
    "currency": "XAF",
    "region": "Africa",
    "timeZone": "Africa/Douala",
    "localCurrency": "XAF"
  },
  "CA": {
    "callingCode": "1",
    "currency": "CAD",
    "region": "North America",
    "timeZone": "America/Toronto",
    "localCurrency": "CAD"
  },
  "KY": {
    "callingCode": "1-345",
    "currency": null,
    "region": "North America",
    "timeZone": "America/Cayman",
    "localCurrency": "KYD"
  },
  "CF": {
    "callingCode": "236",
    "currency": "XAF",
    "region": "Africa",
    "timeZone": "Africa/Bangui",
    "localCurrency": "XAF"
  },
  "TD": {
    "callingCode": "235",
    "currency": "XAF",
    "region": "Africa",
    "timeZone": "Africa/Ndjamena",
    "localCurrency": "XAF"
  },
  "CL": {
    "callingCode": "56",
    "currency": null,
    "region": "South America",
    "timeZone": "America/Santiago",
    "localCurrency": "CLP"
  },
  "CN": {
    "callingCode": "86",
    "currency": "CNY",
    "region": "Asia",
    "timeZone": "Asia/Shanghai",
    "localCurrency": "CNY"
  },
  "CX": {
    "callingCode": "61",
    "currency": null,
    "region": "Oceania",
    "timeZone": "Indian/Christmas",
    "localCurrency": "AUD"
  },
  "CC": {
    "callingCode": "61",
    "currency": null,
    "region": "Oceania",
    "timeZone": "Indian/Cocos",
    "localCurrency": "AUD"
  },
  "CO": {
    "callingCode": "57",
    "currency": null,
    "region": "South America",
    "timeZone": "America/Bogota",
    "localCurrency": "COP"
  },
  "KM": {
    "callingCode": "269",
    "currency": null,
    "region": "Africa",
    "timeZone": "Indian/Comoro",
    "localCurrency": "KMF"
  },
  "CG": {
    "callingCode": "242",
    "currency": "XAF",
    "region": "Africa",
    "timeZone": "Africa/Brazzaville",
    "localCurrency": "XAF"
  },
  "CD": {
    "callingCode": "243",
    "currency": null,
    "region": "Africa",
    "timeZone": "Africa/Lubumbashi",
    "localCurrency": "CDF"
  },
  "CK": {
    "callingCode": "682",
    "currency": null,
    "region": "Oceania",
    "timeZone": "Pacific/Rarotonga",
    "localCurrency": "NZD"
  },
  "CR": {
    "callingCode": "506",
    "currency": null,
    "region": "North America",
    "timeZone": "America/Costa_Rica",
    "localCurrency": "CRC"
  },
  "HR": {
    "callingCode": "385",
    "currency": "EUR",
    "region": "Europe",
    "timeZone": "Europe/Zagreb",
    "localCurrency": "EUR"
  },
  "CU": {
    "callingCode": "53",
    "currency": null,
    "region": "North America",
    "timeZone": "America/Havana",
    "localCurrency": "CUP"
  },
  "CW": {
    "callingCode": "599",
    "currency": null,
    "region": "North America",
    "timeZone": "America/Curacao",
    "localCurrency": "XCG"
  },
  "CY": {
    "callingCode": "357",
    "currency": "EUR",
    "region": "Asia",
    "timeZone": "Asia/Famagusta",
    "localCurrency": "EUR"
  },
  "CZ": {
    "callingCode": "420",
    "currency": null,
    "region": "Europe",
    "timeZone": "Europe/Prague",
    "localCurrency": "CZK"
  },
  "CI": {
    "callingCode": "225",
    "currency": "XOF",
    "region": "Africa",
    "timeZone": "Africa/Abidjan",
    "localCurrency": "XOF"
  },
  "DK": {
    "callingCode": "45",
    "currency": "DKK",
    "region": "Europe",
    "timeZone": "Europe/Copenhagen",
    "localCurrency": "DKK"
  },
  "DJ": {
    "callingCode": "253",
    "currency": null,
    "region": "Africa",
    "timeZone": "Africa/Djibouti",
    "localCurrency": "DJF"
  },
  "DM": {
    "callingCode": "1-767",
    "currency": null,
    "region": "North America",
    "timeZone": "America/Dominica",
    "localCurrency": "XCD"
  },
  "DO": {
    "callingCode": "1-809",
    "currency": null,
    "region": "North America",
    "timeZone": "America/Santo_Domingo",
    "localCurrency": "DOP"
  },
  "EC": {
    "callingCode": "593",
    "currency": null,
    "region": "South America",
    "timeZone": "Pacific/Galapagos",
    "localCurrency": "USD"
  },
  "EG": {
    "callingCode": "20",
    "currency": null,
    "region": "Africa",
    "timeZone": "Africa/Cairo",
    "localCurrency": "EGP"
  },
  "SV": {
    "callingCode": "503",
    "currency": null,
    "region": "North America",
    "timeZone": "America/El_Salvador",
    "localCurrency": "USD"
  },
  "GQ": {
    "callingCode": "240",
    "currency": "XAF",
    "region": "Africa",
    "timeZone": "Africa/Malabo",
    "localCurrency": "XAF"
  },
  "ER": {
    "callingCode": "291",
    "currency": null,
    "region": "Africa",
    "timeZone": "Africa/Asmara",
    "localCurrency": "ERN"
  },
  "EE": {
    "callingCode": "372",
    "currency": "EUR",
    "region": "Europe",
    "timeZone": "Europe/Tallinn",
    "localCurrency": "EUR"
  },
  "SZ": {
    "callingCode": "268",
    "currency": null,
    "region": "Africa",
    "timeZone": "Africa/Mbabane",
    "localCurrency": "SZL"
  },
  "ET": {
    "callingCode": "251",
    "currency": null,
    "region": "Africa",
    "timeZone": "Africa/Addis_Ababa",
    "localCurrency": "ETB"
  },
  "FK": {
    "callingCode": "500",
    "currency": null,
    "region": "South America",
    "timeZone": "Atlantic/Stanley",
    "localCurrency": "FKP"
  },
  "FO": {
    "callingCode": "298",
    "currency": null,
    "region": "Europe",
    "timeZone": "Atlantic/Faroe",
    "localCurrency": "DKK"
  },
  "FJ": {
    "callingCode": "679",
    "currency": null,
    "region": "Oceania",
    "timeZone": "Pacific/Fiji",
    "localCurrency": "FJD"
  },
  "FI": {
    "callingCode": "358",
    "currency": "EUR",
    "region": "Europe",
    "timeZone": "Europe/Helsinki",
    "localCurrency": "EUR"
  },
  "FR": {
    "callingCode": "33",
    "currency": "EUR",
    "region": "Europe",
    "timeZone": "Europe/Paris",
    "localCurrency": "EUR"
  },
  "GF": {
    "callingCode": "594",
    "currency": null,
    "region": "South America",
    "timeZone": "America/Cayenne",
    "localCurrency": "EUR"
  },
  "PF": {
    "callingCode": "689",
    "currency": null,
    "region": "Oceania",
    "timeZone": "Pacific/Gambier",
    "localCurrency": "XPF"
  },
  "TF": {
    "callingCode": "262",
    "currency": null,
    "region": "Africa",
    "timeZone": "Indian/Kerguelen",
    "localCurrency": "EUR"
  },
  "GA": {
    "callingCode": "241",
    "currency": "XAF",
    "region": "Africa",
    "timeZone": "Africa/Libreville",
    "localCurrency": "XAF"
  },
  "GM": {
    "callingCode": "220",
    "currency": null,
    "region": "Africa",
    "timeZone": "Africa/Banjul",
    "localCurrency": "GMD"
  },
  "GE": {
    "callingCode": "995",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Tbilisi",
    "localCurrency": "GEL"
  },
  "DE": {
    "callingCode": "49",
    "currency": "EUR",
    "region": "Europe",
    "timeZone": "Europe/Berlin",
    "localCurrency": "EUR"
  },
  "GH": {
    "callingCode": "233",
    "currency": "GHS",
    "region": "Africa",
    "timeZone": "Africa/Accra",
    "localCurrency": "GHS"
  },
  "GI": {
    "callingCode": "350",
    "currency": null,
    "region": "Europe",
    "timeZone": "Europe/Gibraltar",
    "localCurrency": "GIP"
  },
  "GR": {
    "callingCode": "30",
    "currency": "EUR",
    "region": "Europe",
    "timeZone": "Europe/Athens",
    "localCurrency": "EUR"
  },
  "GL": {
    "callingCode": "299",
    "currency": null,
    "region": "North America",
    "timeZone": "America/Danmarkshavn",
    "localCurrency": "DKK"
  },
  "GD": {
    "callingCode": "1-473",
    "currency": null,
    "region": "North America",
    "timeZone": "America/Grenada",
    "localCurrency": "XCD"
  },
  "GP": {
    "callingCode": "590",
    "currency": null,
    "region": "North America",
    "timeZone": "America/Guadeloupe",
    "localCurrency": "EUR"
  },
  "GU": {
    "callingCode": "1-671",
    "currency": null,
    "region": "Oceania",
    "timeZone": "Pacific/Guam",
    "localCurrency": "USD"
  },
  "GT": {
    "callingCode": "502",
    "currency": null,
    "region": "North America",
    "timeZone": "America/Guatemala",
    "localCurrency": "GTQ"
  },
  "GG": {
    "callingCode": "44-1481",
    "currency": null,
    "region": "Europe",
    "timeZone": "Europe/Guernsey",
    "localCurrency": "GBP"
  },
  "GN": {
    "callingCode": "224",
    "currency": null,
    "region": "Africa",
    "timeZone": "Africa/Conakry",
    "localCurrency": "GNF"
  },
  "GW": {
    "callingCode": "245",
    "currency": "XOF",
    "region": "Africa",
    "timeZone": "Africa/Bissau",
    "localCurrency": "XOF"
  },
  "GY": {
    "callingCode": "592",
    "currency": null,
    "region": "South America",
    "timeZone": "America/Guyana",
    "localCurrency": "GYD"
  },
  "HT": {
    "callingCode": "509",
    "currency": null,
    "region": "North America",
    "timeZone": "America/Port-au-Prince",
    "localCurrency": "HTG"
  },
  "HM": {
    "callingCode": "672",
    "currency": null,
    "region": "Oceania",
    "timeZone": "Australia/Perth",
    "localCurrency": "AUD"
  },
  "VA": {
    "callingCode": "379",
    "currency": null,
    "region": "Europe",
    "timeZone": "Europe/Vatican",
    "localCurrency": "EUR"
  },
  "HN": {
    "callingCode": "504",
    "currency": null,
    "region": "North America",
    "timeZone": "America/Tegucigalpa",
    "localCurrency": "HNL"
  },
  "HK": {
    "callingCode": "852",
    "currency": "HKD",
    "region": "Asia",
    "timeZone": "Asia/Hong_Kong",
    "localCurrency": "HKD"
  },
  "HU": {
    "callingCode": "36",
    "currency": null,
    "region": "Europe",
    "timeZone": "Europe/Budapest",
    "localCurrency": "HUF"
  },
  "IS": {
    "callingCode": "354",
    "currency": null,
    "region": "Europe",
    "timeZone": "Atlantic/Reykjavik",
    "localCurrency": "ISK"
  },
  "IN": {
    "callingCode": "91",
    "currency": "INR",
    "region": "Asia",
    "timeZone": "Asia/Kolkata",
    "localCurrency": "INR"
  },
  "ID": {
    "callingCode": "62",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Jakarta",
    "localCurrency": "IDR"
  },
  "IR": {
    "callingCode": "98",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Tehran",
    "localCurrency": "IRR"
  },
  "IQ": {
    "callingCode": "964",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Baghdad",
    "localCurrency": "IQD"
  },
  "IE": {
    "callingCode": "353",
    "currency": "EUR",
    "region": "Europe",
    "timeZone": "Europe/Dublin",
    "localCurrency": "EUR"
  },
  "IM": {
    "callingCode": "44-1624",
    "currency": null,
    "region": "Europe",
    "timeZone": "Europe/Isle_of_Man",
    "localCurrency": "GBP"
  },
  "IL": {
    "callingCode": "972",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Jerusalem",
    "localCurrency": "ILS"
  },
  "IT": {
    "callingCode": "39",
    "currency": "EUR",
    "region": "Europe",
    "timeZone": "Europe/Rome",
    "localCurrency": "EUR"
  },
  "JM": {
    "callingCode": "1-876",
    "currency": null,
    "region": "North America",
    "timeZone": "America/Jamaica",
    "localCurrency": "JMD"
  },
  "JP": {
    "callingCode": "81",
    "currency": "JPY",
    "region": "Asia",
    "timeZone": "Asia/Tokyo",
    "localCurrency": "JPY"
  },
  "JE": {
    "callingCode": "44-1534",
    "currency": null,
    "region": "Europe",
    "timeZone": "Europe/Jersey",
    "localCurrency": "GBP"
  },
  "JO": {
    "callingCode": "962",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Amman",
    "localCurrency": "JOD"
  },
  "KZ": {
    "callingCode": "7",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Aqtau",
    "localCurrency": "KZT"
  },
  "KE": {
    "callingCode": "254",
    "currency": "KES",
    "region": "Africa",
    "timeZone": "Africa/Nairobi",
    "localCurrency": "KES"
  },
  "KI": {
    "callingCode": "686",
    "currency": null,
    "region": "Oceania",
    "timeZone": "Pacific/Kiritimati",
    "localCurrency": "AUD"
  },
  "KP": {
    "callingCode": "850",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Pyongyang",
    "localCurrency": "KPW"
  },
  "KR": {
    "callingCode": "82",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Seoul",
    "localCurrency": "KRW"
  },
  "KW": {
    "callingCode": "965",
    "currency": "KWD",
    "region": "Asia",
    "timeZone": "Asia/Kuwait",
    "localCurrency": "KWD"
  },
  "KG": {
    "callingCode": "996",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Bishkek",
    "localCurrency": "KGS"
  },
  "LA": {
    "callingCode": "856",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Vientiane",
    "localCurrency": "LAK"
  },
  "LV": {
    "callingCode": "371",
    "currency": "EUR",
    "region": "Europe",
    "timeZone": "Europe/Riga",
    "localCurrency": "EUR"
  },
  "LB": {
    "callingCode": "961",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Beirut",
    "localCurrency": "LBP"
  },
  "LS": {
    "callingCode": "266",
    "currency": null,
    "region": "Africa",
    "timeZone": "Africa/Maseru",
    "localCurrency": "ZAR"
  },
  "LR": {
    "callingCode": "231",
    "currency": null,
    "region": "Africa",
    "timeZone": "Africa/Monrovia",
    "localCurrency": "LRD"
  },
  "LY": {
    "callingCode": "218",
    "currency": null,
    "region": "Africa",
    "timeZone": "Africa/Tripoli",
    "localCurrency": "LYD"
  },
  "LI": {
    "callingCode": "423",
    "currency": null,
    "region": "Europe",
    "timeZone": "Europe/Vaduz",
    "localCurrency": "CHF"
  },
  "LT": {
    "callingCode": "370",
    "currency": "EUR",
    "region": "Europe",
    "timeZone": "Europe/Vilnius",
    "localCurrency": "EUR"
  },
  "LU": {
    "callingCode": "352",
    "currency": "EUR",
    "region": "Europe",
    "timeZone": "Europe/Luxembourg",
    "localCurrency": "EUR"
  },
  "MO": {
    "callingCode": "853",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Macau",
    "localCurrency": "MOP"
  },
  "MG": {
    "callingCode": "261",
    "currency": null,
    "region": "Africa",
    "timeZone": "Indian/Antananarivo",
    "localCurrency": "MGA"
  },
  "MW": {
    "callingCode": "265",
    "currency": null,
    "region": "Africa",
    "timeZone": "Africa/Blantyre",
    "localCurrency": "MWK"
  },
  "MY": {
    "callingCode": "60",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Kuala_Lumpur",
    "localCurrency": "MYR"
  },
  "MV": {
    "callingCode": "960",
    "currency": null,
    "region": "Asia",
    "timeZone": "Indian/Maldives",
    "localCurrency": "MVR"
  },
  "ML": {
    "callingCode": "223",
    "currency": "XOF",
    "region": "Africa",
    "timeZone": "Africa/Bamako",
    "localCurrency": "XOF"
  },
  "MT": {
    "callingCode": "356",
    "currency": "EUR",
    "region": "Europe",
    "timeZone": "Europe/Malta",
    "localCurrency": "EUR"
  },
  "MH": {
    "callingCode": "692",
    "currency": null,
    "region": "Oceania",
    "timeZone": "Pacific/Kwajalein",
    "localCurrency": "USD"
  },
  "MQ": {
    "callingCode": "596",
    "currency": null,
    "region": "North America",
    "timeZone": "America/Martinique",
    "localCurrency": "EUR"
  },
  "MR": {
    "callingCode": "222",
    "currency": null,
    "region": "Africa",
    "timeZone": "Africa/Nouakchott",
    "localCurrency": "MRU"
  },
  "MU": {
    "callingCode": "230",
    "currency": null,
    "region": "Africa",
    "timeZone": "Indian/Mauritius",
    "localCurrency": "MUR"
  },
  "YT": {
    "callingCode": "262",
    "currency": null,
    "region": "Africa",
    "timeZone": "Indian/Mayotte",
    "localCurrency": "EUR"
  },
  "MX": {
    "callingCode": "52",
    "currency": "MXN",
    "region": "North America",
    "timeZone": "America/Mexico_City",
    "localCurrency": "MXN"
  },
  "FM": {
    "callingCode": "691",
    "currency": null,
    "region": "Oceania",
    "timeZone": "Pacific/Kosrae",
    "localCurrency": "USD"
  },
  "MD": {
    "callingCode": "373",
    "currency": null,
    "region": "Europe",
    "timeZone": "Europe/Chisinau",
    "localCurrency": "MDL"
  },
  "MC": {
    "callingCode": "377",
    "currency": null,
    "region": "Europe",
    "timeZone": "Europe/Monaco",
    "localCurrency": "EUR"
  },
  "MN": {
    "callingCode": "976",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Hovd",
    "localCurrency": "MNT"
  },
  "ME": {
    "callingCode": "382",
    "currency": null,
    "region": "Europe",
    "timeZone": "Europe/Podgorica",
    "localCurrency": "EUR"
  },
  "MS": {
    "callingCode": "1-664",
    "currency": null,
    "region": "North America",
    "timeZone": "America/Montserrat",
    "localCurrency": "XCD"
  },
  "MA": {
    "callingCode": "212",
    "currency": null,
    "region": "Africa",
    "timeZone": "Africa/Casablanca",
    "localCurrency": "MAD"
  },
  "MZ": {
    "callingCode": "258",
    "currency": null,
    "region": "Africa",
    "timeZone": "Africa/Maputo",
    "localCurrency": "MZN"
  },
  "MM": {
    "callingCode": "95",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Yangon",
    "localCurrency": "MMK"
  },
  "NA": {
    "callingCode": "264",
    "currency": null,
    "region": "Africa",
    "timeZone": "Africa/Windhoek",
    "localCurrency": "ZAR"
  },
  "NR": {
    "callingCode": "674",
    "currency": null,
    "region": "Oceania",
    "timeZone": "Pacific/Nauru",
    "localCurrency": "AUD"
  },
  "NP": {
    "callingCode": "977",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Kathmandu",
    "localCurrency": "NPR"
  },
  "NL": {
    "callingCode": "31",
    "currency": "EUR",
    "region": "Europe",
    "timeZone": "Europe/Amsterdam",
    "localCurrency": "EUR"
  },
  "NC": {
    "callingCode": "687",
    "currency": null,
    "region": "Oceania",
    "timeZone": "Pacific/Noumea",
    "localCurrency": "XPF"
  },
  "NZ": {
    "callingCode": "64",
    "currency": "NZD",
    "region": "Oceania",
    "timeZone": "Pacific/Auckland",
    "localCurrency": "NZD"
  },
  "NI": {
    "callingCode": "505",
    "currency": null,
    "region": "North America",
    "timeZone": "America/Managua",
    "localCurrency": "NIO"
  },
  "NE": {
    "callingCode": "227",
    "currency": "XOF",
    "region": "Africa",
    "timeZone": "Africa/Niamey",
    "localCurrency": "XOF"
  },
  "NG": {
    "callingCode": "234",
    "currency": "NGN",
    "region": "Africa",
    "timeZone": "Africa/Lagos",
    "localCurrency": "NGN"
  },
  "NU": {
    "callingCode": "683",
    "currency": null,
    "region": "Oceania",
    "timeZone": "Pacific/Niue",
    "localCurrency": "NZD"
  },
  "NF": {
    "callingCode": "672",
    "currency": null,
    "region": "Oceania",
    "timeZone": "Pacific/Norfolk",
    "localCurrency": "AUD"
  },
  "MK": {
    "callingCode": "389",
    "currency": null,
    "region": "Europe",
    "timeZone": "Europe/Skopje",
    "localCurrency": "MKD"
  },
  "MP": {
    "callingCode": "1-670",
    "currency": null,
    "region": "Oceania",
    "timeZone": "Pacific/Saipan",
    "localCurrency": "USD"
  },
  "NO": {
    "callingCode": "47",
    "currency": "NOK",
    "region": "Europe",
    "timeZone": "Europe/Oslo",
    "localCurrency": "NOK"
  },
  "OM": {
    "callingCode": "968",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Muscat",
    "localCurrency": "OMR"
  },
  "PK": {
    "callingCode": "92",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Karachi",
    "localCurrency": "PKR"
  },
  "PW": {
    "callingCode": "680",
    "currency": null,
    "region": "Oceania",
    "timeZone": "Pacific/Palau",
    "localCurrency": "USD"
  },
  "PS": {
    "callingCode": "970",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Gaza",
    "localCurrency": "ILS"
  },
  "PA": {
    "callingCode": "507",
    "currency": null,
    "region": "North America",
    "timeZone": "America/Panama",
    "localCurrency": "PAB"
  },
  "PG": {
    "callingCode": "675",
    "currency": null,
    "region": "Oceania",
    "timeZone": "Pacific/Port_Moresby",
    "localCurrency": "PGK"
  },
  "PY": {
    "callingCode": "595",
    "currency": null,
    "region": "South America",
    "timeZone": "America/Asuncion",
    "localCurrency": "PYG"
  },
  "PE": {
    "callingCode": "51",
    "currency": null,
    "region": "South America",
    "timeZone": "America/Lima",
    "localCurrency": "PEN"
  },
  "PH": {
    "callingCode": "63",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Manila",
    "localCurrency": "PHP"
  },
  "PN": {
    "callingCode": "64",
    "currency": null,
    "region": "Oceania",
    "timeZone": "Pacific/Pitcairn",
    "localCurrency": "NZD"
  },
  "PL": {
    "callingCode": "48",
    "currency": null,
    "region": "Europe",
    "timeZone": "Europe/Warsaw",
    "localCurrency": "PLN"
  },
  "PT": {
    "callingCode": "351",
    "currency": "EUR",
    "region": "Europe",
    "timeZone": "Europe/Lisbon",
    "localCurrency": "EUR"
  },
  "PR": {
    "callingCode": "1-787",
    "currency": null,
    "region": "North America",
    "timeZone": "America/Puerto_Rico",
    "localCurrency": "USD"
  },
  "QA": {
    "callingCode": "974",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Qatar",
    "localCurrency": "QAR"
  },
  "RO": {
    "callingCode": "40",
    "currency": null,
    "region": "Europe",
    "timeZone": "Europe/Bucharest",
    "localCurrency": "RON"
  },
  "RU": {
    "callingCode": "7",
    "currency": null,
    "region": "Europe",
    "timeZone": "Europe/Moscow",
    "localCurrency": "RUB"
  },
  "RW": {
    "callingCode": "250",
    "currency": "RWF",
    "region": "Africa",
    "timeZone": "Africa/Kigali",
    "localCurrency": "RWF"
  },
  "RE": {
    "callingCode": "262",
    "currency": null,
    "region": "Africa",
    "timeZone": "Indian/Reunion",
    "localCurrency": "EUR"
  },
  "BL": {
    "callingCode": "590",
    "currency": null,
    "region": "North America",
    "timeZone": "America/St_Barthelemy",
    "localCurrency": "EUR"
  },
  "SH": {
    "callingCode": "290",
    "currency": null,
    "region": "Africa",
    "timeZone": "Atlantic/St_Helena",
    "localCurrency": "SHP"
  },
  "KN": {
    "callingCode": "1-869",
    "currency": null,
    "region": "North America",
    "timeZone": "America/St_Kitts",
    "localCurrency": "XCD"
  },
  "LC": {
    "callingCode": "1-758",
    "currency": null,
    "region": "North America",
    "timeZone": "America/St_Lucia",
    "localCurrency": "XCD"
  },
  "MF": {
    "callingCode": "590",
    "currency": null,
    "region": "North America",
    "timeZone": "America/Marigot",
    "localCurrency": "EUR"
  },
  "PM": {
    "callingCode": "508",
    "currency": null,
    "region": "North America",
    "timeZone": "America/Miquelon",
    "localCurrency": "EUR"
  },
  "VC": {
    "callingCode": "1-784",
    "currency": null,
    "region": "North America",
    "timeZone": "America/St_Vincent",
    "localCurrency": "XCD"
  },
  "WS": {
    "callingCode": "685",
    "currency": null,
    "region": "Oceania",
    "timeZone": "Pacific/Apia",
    "localCurrency": "WST"
  },
  "SM": {
    "callingCode": "378",
    "currency": null,
    "region": "Europe",
    "timeZone": "Europe/San_Marino",
    "localCurrency": "EUR"
  },
  "ST": {
    "callingCode": "239",
    "currency": null,
    "region": "Africa",
    "timeZone": "Africa/Sao_Tome",
    "localCurrency": "STN"
  },
  "SA": {
    "callingCode": "966",
    "currency": "SAR",
    "region": "Asia",
    "timeZone": "Asia/Riyadh",
    "localCurrency": "SAR"
  },
  "SN": {
    "callingCode": "221",
    "currency": "XOF",
    "region": "Africa",
    "timeZone": "Africa/Dakar",
    "localCurrency": "XOF"
  },
  "RS": {
    "callingCode": "381",
    "currency": null,
    "region": "Europe",
    "timeZone": "Europe/Belgrade",
    "localCurrency": "RSD"
  },
  "SC": {
    "callingCode": "248",
    "currency": null,
    "region": "Africa",
    "timeZone": "Indian/Mahe",
    "localCurrency": "SCR"
  },
  "SL": {
    "callingCode": "232",
    "currency": null,
    "region": "Africa",
    "timeZone": "Africa/Freetown",
    "localCurrency": "SLE"
  },
  "SG": {
    "callingCode": "65",
    "currency": "SGD",
    "region": "Asia",
    "timeZone": "Asia/Singapore",
    "localCurrency": "SGD"
  },
  "SX": {
    "callingCode": "1-721",
    "currency": null,
    "region": "North America",
    "timeZone": "America/Lower_Princes",
    "localCurrency": "XCG"
  },
  "SK": {
    "callingCode": "421",
    "currency": "EUR",
    "region": "Europe",
    "timeZone": "Europe/Bratislava",
    "localCurrency": "EUR"
  },
  "SI": {
    "callingCode": "386",
    "currency": "EUR",
    "region": "Europe",
    "timeZone": "Europe/Ljubljana",
    "localCurrency": "EUR"
  },
  "SB": {
    "callingCode": "677",
    "currency": null,
    "region": "Oceania",
    "timeZone": "Pacific/Guadalcanal",
    "localCurrency": "SBD"
  },
  "SO": {
    "callingCode": "252",
    "currency": null,
    "region": "Africa",
    "timeZone": "Africa/Mogadishu",
    "localCurrency": "SOS"
  },
  "ZA": {
    "callingCode": "27",
    "currency": "ZAR",
    "region": "Africa",
    "timeZone": "Africa/Johannesburg",
    "localCurrency": "ZAR"
  },
  "GS": {
    "callingCode": "500",
    "currency": null,
    "region": "South America",
    "timeZone": "Atlantic/South_Georgia",
    "localCurrency": "GBP"
  },
  "SS": {
    "callingCode": "211",
    "currency": null,
    "region": "Africa",
    "timeZone": "Africa/Juba",
    "localCurrency": "SSP"
  },
  "ES": {
    "callingCode": "34",
    "currency": "EUR",
    "region": "Europe",
    "timeZone": "Europe/Madrid",
    "localCurrency": "EUR"
  },
  "LK": {
    "callingCode": "94",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Colombo",
    "localCurrency": "LKR"
  },
  "SD": {
    "callingCode": "249",
    "currency": null,
    "region": "Africa",
    "timeZone": "Africa/Khartoum",
    "localCurrency": "SDG"
  },
  "SR": {
    "callingCode": "597",
    "currency": null,
    "region": "South America",
    "timeZone": "America/Paramaribo",
    "localCurrency": "SRD"
  },
  "SJ": {
    "callingCode": "47",
    "currency": null,
    "region": "Europe",
    "timeZone": "Arctic/Longyearbyen",
    "localCurrency": "NOK"
  },
  "SE": {
    "callingCode": "46",
    "currency": "SEK",
    "region": "Europe",
    "timeZone": "Europe/Stockholm",
    "localCurrency": "SEK"
  },
  "CH": {
    "callingCode": "41",
    "currency": "CHF",
    "region": "Europe",
    "timeZone": "Europe/Zurich",
    "localCurrency": "CHF"
  },
  "SY": {
    "callingCode": "963",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Damascus",
    "localCurrency": "SYP"
  },
  "TW": {
    "callingCode": "886",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Taipei",
    "localCurrency": "TWD"
  },
  "TJ": {
    "callingCode": "992",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Dushanbe",
    "localCurrency": "TJS"
  },
  "TZ": {
    "callingCode": "255",
    "currency": "TZS",
    "region": "Africa",
    "timeZone": "Africa/Dar_es_Salaam",
    "localCurrency": "TZS"
  },
  "TH": {
    "callingCode": "66",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Bangkok",
    "localCurrency": "THB"
  },
  "TL": {
    "callingCode": "670",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Dili",
    "localCurrency": "USD"
  },
  "TG": {
    "callingCode": "228",
    "currency": "XOF",
    "region": "Africa",
    "timeZone": "Africa/Lome",
    "localCurrency": "XOF"
  },
  "TK": {
    "callingCode": "690",
    "currency": null,
    "region": "Oceania",
    "timeZone": "Pacific/Fakaofo",
    "localCurrency": "NZD"
  },
  "TO": {
    "callingCode": "676",
    "currency": null,
    "region": "Oceania",
    "timeZone": "Pacific/Tongatapu",
    "localCurrency": "TOP"
  },
  "TT": {
    "callingCode": "1-868",
    "currency": null,
    "region": "North America",
    "timeZone": "America/Port_of_Spain",
    "localCurrency": "TTD"
  },
  "TN": {
    "callingCode": "216",
    "currency": null,
    "region": "Africa",
    "timeZone": "Africa/Tunis",
    "localCurrency": "TND"
  },
  "TM": {
    "callingCode": "993",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Ashgabat",
    "localCurrency": "TMT"
  },
  "TC": {
    "callingCode": "1-649",
    "currency": null,
    "region": "North America",
    "timeZone": "America/Grand_Turk",
    "localCurrency": "USD"
  },
  "TV": {
    "callingCode": "688",
    "currency": null,
    "region": "Oceania",
    "timeZone": "Pacific/Funafuti",
    "localCurrency": "AUD"
  },
  "TR": {
    "callingCode": "90",
    "currency": null,
    "region": "Asia",
    "timeZone": "Europe/Istanbul",
    "localCurrency": "TRY"
  },
  "UG": {
    "callingCode": "256",
    "currency": "UGX",
    "region": "Africa",
    "timeZone": "Africa/Kampala",
    "localCurrency": "UGX"
  },
  "UA": {
    "callingCode": "380",
    "currency": null,
    "region": "Europe",
    "timeZone": "Europe/Kyiv",
    "localCurrency": "UAH"
  },
  "AE": {
    "callingCode": "971",
    "currency": "AED",
    "region": "Asia",
    "timeZone": "Asia/Dubai",
    "localCurrency": "AED"
  },
  "GB": {
    "callingCode": "44",
    "currency": "GBP",
    "region": "Europe",
    "timeZone": "Europe/London",
    "localCurrency": "GBP"
  },
  "US": {
    "callingCode": "1",
    "currency": "USD",
    "region": "North America",
    "timeZone": "America/New_York",
    "localCurrency": "USD"
  },
  "UM": {
    "callingCode": "1",
    "currency": null,
    "region": "Oceania",
    "timeZone": "Pacific/Wake",
    "localCurrency": "USD"
  },
  "UY": {
    "callingCode": "598",
    "currency": null,
    "region": "South America",
    "timeZone": "America/Montevideo",
    "localCurrency": "UYU"
  },
  "UZ": {
    "callingCode": "998",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Samarkand",
    "localCurrency": "UZS"
  },
  "VU": {
    "callingCode": "678",
    "currency": null,
    "region": "Oceania",
    "timeZone": "Pacific/Efate",
    "localCurrency": "VUV"
  },
  "VE": {
    "callingCode": "58",
    "currency": null,
    "region": "South America",
    "timeZone": "America/Caracas",
    "localCurrency": "VES"
  },
  "VN": {
    "callingCode": "84",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Ho_Chi_Minh",
    "localCurrency": "VND"
  },
  "VG": {
    "callingCode": "1-284",
    "currency": null,
    "region": "North America",
    "timeZone": "America/Tortola",
    "localCurrency": "USD"
  },
  "VI": {
    "callingCode": "1-340",
    "currency": null,
    "region": "North America",
    "timeZone": "America/St_Thomas",
    "localCurrency": "USD"
  },
  "WF": {
    "callingCode": "681",
    "currency": null,
    "region": "Oceania",
    "timeZone": "Pacific/Wallis",
    "localCurrency": "XPF"
  },
  "EH": {
    "callingCode": "212",
    "currency": null,
    "region": "Africa",
    "timeZone": "Africa/El_Aaiun",
    "localCurrency": "MAD"
  },
  "YE": {
    "callingCode": "967",
    "currency": null,
    "region": "Asia",
    "timeZone": "Asia/Aden",
    "localCurrency": "YER"
  },
  "ZM": {
    "callingCode": "260",
    "currency": null,
    "region": "Africa",
    "timeZone": "Africa/Lusaka",
    "localCurrency": "ZMW"
  },
  "ZW": {
    "callingCode": "263",
    "currency": null,
    "region": "Africa",
    "timeZone": "Africa/Harare",
    "localCurrency": "USD"
  },
  "AX": {
    "callingCode": "358-18",
    "currency": null,
    "region": "Europe",
    "timeZone": "Europe/Mariehamn",
    "localCurrency": "EUR"
  }
};
export const NEXA_LOCALES = ['en', 'en-GB', 'fr', 'es', 'pt', 'ar', 'ha', 'yo', 'ig', 'pcm', 'sw'] as const;
export const NEXA_LANGUAGES = ['en', 'fr', 'es', 'pt', 'ar', 'ha', 'yo', 'ig', 'pcm', 'sw'] as const;
export type NexaLocale = typeof NEXA_LOCALES[number];
export type NexaLanguage = typeof NEXA_LANGUAGES[number];
export const NEXA_RESTRICTED_COUNTRY_RULES: ReadonlyArray<{ code: string; reason: string }> = []; // No country restrictions are invented here.
export function getCountryMetadata(code: string): NexaCountryMetadata {
  const normalized = String(code || '').trim().toUpperCase();
  const item = COUNTRY_METADATA[normalized];
  return item ? { ...item, availability: 'listed' } : { callingCode: null, currency: null, region: null, timeZone: null, availability: 'unsupported' };
}
export function getLocalizedCountryName(country: NexaCountry, locale = 'en'): string {
  try { const DisplayNames = (Intl as any).DisplayNames; if (typeof DisplayNames === 'function') { const display = new DisplayNames([locale], { type: 'region' }).of(country.code); if (display && display !== country.code) return display; } } catch {}
  return country.name;
}
export function countryFlag(code: string): string {
  const value = String(code || '').toUpperCase(); if (!/^[A-Z]{2}$/.test(value)) return '🌐';
  const fromCodePoint = (String as any).fromCodePoint; return typeof fromCodePoint === 'function' ? fromCodePoint(...value.split('').map(ch => 127397 + ch.charCodeAt(0))) : value;
}
export function countryCurrencySuggestion(code: string): string | null { return getCountryMetadata(code).localCurrency; }
export function supportedDisplayCurrencyForCountry(code: string): string | null { return getCountryMetadata(code).currency; }
export function countryIsRestricted(code: string): boolean { return NEXA_RESTRICTED_COUNTRY_RULES.some(rule => rule.code === String(code || '').trim().toUpperCase()); }
export function formatInternationalPhone(raw: string, countryCode: string): string {
  const meta = getCountryMetadata(countryCode); const input = String(raw || '').trim(); if (!input) return '';
  const digits = input.replace(/[^0-9+]/g, ''); if (input.charAt(0) === '+') return /^\+[1-9][0-9]{4,14}$/.test(digits) ? digits : input;
  if (!meta.callingCode) return input;
  const dial = meta.callingCode.replace(/\D/g, '');
  const national = input.replace(/\D/g, '').replace(/^0+/, ''); return national ? `+${dial}${national}` : input;
}
export function formatRegionalDateTime(value: string | number | Date, locale = 'en', timeZone?: string | null): string {
  const date = value instanceof Date ? value : new Date(value); if (!isFinite(date.getTime())) return 'Date unavailable';
  try { return new Intl.DateTimeFormat(locale, ({ dateStyle: 'medium', timeStyle: 'short', ...(timeZone ? { timeZone } : {}) } as any)).format(date); } catch { return new Intl.DateTimeFormat('en', ({ dateStyle: 'medium', timeStyle: 'short' } as any)).format(date); }
}
export function measurementSystemForCountry(code: string): 'imperial' | 'metric' | 'unknown' { const c=String(code||'').toUpperCase(); if (['US','LR','MM'].indexOf(c) >= 0) return 'imperial'; if (NEXA_COUNTRIES.some(item=>item.code===c)) return 'metric'; return 'unknown'; }
export function addressFieldOrderForCountry(code: string): string[] {
  const c=String(code||'').toUpperCase();
  if (['JP','KR','CN','TW'].includes(c)) return ['postalCode','region','locality','street','country'];
  if (['IE','GB','US','CA','AU','NZ','NG','GH','KE','ZA','IN'].includes(c)) return ['street','locality','region','postalCode','country'];
  if (['BR','MX','AR','CL','CO'].includes(c)) return ['street','postalCode','locality','region','country'];
  return ['street','locality','region','postalCode','country'];
}
export function postalCodeHintForCountry(code: string): string { const c=String(code||'').toUpperCase(); return ({US:'ZIP code',CA:'Postal code',GB:'Postcode',IE:'Eircode',IN:'PIN code',NG:'Postal code',JP:'Postal code',AU:'Postcode',NZ:'Postcode',BR:'CEP'} as Record<string,string>)[c] || 'Postal code (if used in your country)'; }
export function normalizePostalCode(value: string, countryCode: string): string { const c=String(countryCode||'').toUpperCase(); const v=String(value||'').trim(); return ['CA','GB','IE'].includes(c) ? v.toUpperCase().replace(/\s+/g,' ') : v; }
export function normalizeRegionalPreference(input: any) {
  const countryCode = input?.countryCode == null || String(input.countryCode).trim()==='' ? null : String(input.countryCode).trim().toUpperCase();
  const locale = String(input?.locale || 'en'); const languageCode = String(input?.languageCode || 'en');
  if (countryCode && !NEXA_COUNTRIES.some(country => country.code === countryCode)) throw new TypeError('Choose a supported country or territory.');
  if (!(NEXA_LOCALES as readonly string[]).indexOf(locale) >= 0) throw new TypeError('Choose a supported locale.');
  if (!(NEXA_LANGUAGES as readonly string[]).indexOf(languageCode) >= 0) throw new TypeError('Choose a supported language.');
  return { countryCode, locale, languageCode };
}
