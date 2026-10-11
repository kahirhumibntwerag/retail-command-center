import type { Branch, Competitor, Model, Sku } from './types'

export const AS_OF = '2026-08-31'
export const MONTH_LABEL = { ar: 'أغسطس 2026', en: 'August 2026' }
export const CHAIN_BASELINE_FORECAST = 26_929_692

const slug = (name: string) => name.toLowerCase().replace(/\s+/g, '-')

type Raw = Omit<Branch, 'id' | 'units'>

const raw: Raw[] = [
  { name: 'Mall of Tanta', segment: 'Mall', sales: 3368512, trx: 1731, upt: 1.69, atv: 1946, utv: 1152, cv: 0.262, h2vsH1: -0.038, staff: 13, top3: 0.578, unattributed: 0, currency: 'EGP', target: 3500000 },
  { name: 'Alex', segment: 'Governorate', sales: 3112854, trx: 1663, upt: 1.68, atv: 1872, utv: 1115, cv: 0.262, h2vsH1: -0.038, staff: 21, top3: 0.363, unattributed: 0.003, currency: 'EGP', target: 3200000 },
  { name: 'Doqi', segment: 'Mall', sales: 2581554, trx: 1025, upt: 1.97, atv: 2519, utv: 1280, cv: 0.262, h2vsH1: -0.038, staff: 15, top3: 0.473, unattributed: 0.004, currency: 'EGP', target: 2700000 },
  { name: 'Open Air', segment: 'Mall', sales: 2365693, trx: 957, upt: 1.99, atv: 2472, utv: 1245, cv: 0.262, h2vsH1: -0.038, staff: 14, top3: 0.393, unattributed: 0, currency: 'EGP', target: 2500000 },
  { name: 'Shbeen Elkoum', segment: 'Governorate', sales: 2133408, trx: 1088, upt: 1.45, atv: 1961, utv: 1353, cv: 0.262, h2vsH1: -0.038, staff: 11, top3: 0.541, unattributed: 0.004, currency: 'EGP', target: 2200000 },
  { name: 'Mall of Arabia', segment: 'Mall', sales: 1993658, trx: 934, upt: 1.54, atv: 2135, utv: 1388, cv: 0.262, h2vsH1: -0.038, staff: 12, top3: 0.642, unattributed: 0.018, currency: 'EGP', target: 2100000 },
  { name: 'Mansoura Toshka', segment: 'Governorate', sales: 1804517, trx: 827, upt: 1.69, atv: 2182, utv: 1289, cv: 0.262, h2vsH1: -0.038, staff: 6, top3: 0.747, unattributed: 0, currency: 'EGP', target: 1900000 },
  { name: 'All Season', segment: 'Mall', sales: 1453810, trx: 715, upt: 1.7, atv: 2033, utv: 1199, cv: 0.262, h2vsH1: -0.038, staff: 14, top3: 0.553, unattributed: 0.004, currency: 'EGP', target: 2000000 },
  { name: 'Online', segment: 'Online', sales: 1414800, trx: 944, upt: 1.03, atv: 1499, utv: 1451, cv: 0.262, h2vsH1: -0.038, staff: 1, top3: 0.001, unattributed: 1.003, currency: 'EGP', target: 1500000 },
  { name: 'Fayoum', segment: 'Governorate', sales: 1301734, trx: 610, upt: 1.55, atv: 2134, utv: 1373, cv: 0.262, h2vsH1: -0.038, staff: 7, top3: 0.777, unattributed: 0.018, currency: 'EGP', target: 1400000 },
  { name: 'Faisl', segment: 'Governorate', sales: 1057923, trx: 518, upt: 1.7, atv: 2042, utv: 1204, cv: 0.262, h2vsH1: -0.038, staff: 10, top3: 0.423, unattributed: 0, currency: 'EGP', target: 2000000 },
  { name: 'Mahala New', segment: 'Governorate', sales: 900632, trx: 435, upt: 1.57, atv: 2070, utv: 1319, cv: 0.262, h2vsH1: -0.038, staff: 10, top3: 0.723, unattributed: 0, currency: 'EGP', target: 2000000 },
  { name: 'Port Said', segment: 'Governorate', sales: 862453, trx: 418, upt: 1.59, atv: 2063, utv: 1299, cv: 0.325, h2vsH1: -0.308, staff: 11, top3: 0.724, unattributed: -0.001, currency: 'EGP', target: 2000000, last7VsAvg: -0.203 },
  { name: 'Al Minya', segment: 'Governorate', sales: 849224, trx: 424, upt: 1.48, atv: 2003, utv: 1354, cv: 0.262, h2vsH1: -0.038, staff: 6, top3: 0.914, unattributed: 0, currency: 'EGP', target: 2000000 },
  { name: 'Samanoud', segment: 'Governorate', sales: 838235, trx: 393, upt: 1.65, atv: 2133, utv: 1292, cv: 0.262, h2vsH1: -0.038, staff: 5, top3: 0.98, unattributed: 0, currency: 'EGP', target: 2000000 },
  { name: 'Bani Mazar', segment: 'Governorate', sales: 717637, trx: 355, upt: 1.5, atv: 2022, utv: 1344, cv: 0.262, h2vsH1: -0.038, staff: 9, top3: 0.762, unattributed: 0, currency: 'EGP', target: 2000000 },
  { name: 'QENA', segment: 'Governorate', sales: 652020, trx: 340, upt: 1.45, atv: 1918, utv: 1323, cv: 0.262, h2vsH1: -0.038, staff: 2, top3: 1.004, unattributed: 0, currency: 'EGP', target: 2000000 },
  { name: 'Shubra', segment: 'Outlet', sales: 609229, trx: 847, upt: 1.61, atv: 719, utv: 447, cv: 0.262, h2vsH1: -0.038, staff: 7, top3: 0.668, unattributed: 0.002, currency: 'EGP', target: 700000 },
  { name: 'Damanhour', segment: 'Governorate', sales: 603670, trx: 335, upt: 1.33, atv: 1802, utv: 1350, cv: 0.262, h2vsH1: -0.038, staff: 5, top3: 0.92, unattributed: 0, currency: 'EGP', target: 2000000 },
  { name: 'Zaqazek', segment: 'Governorate', sales: 592068, trx: 285, upt: 1.64, atv: 2077, utv: 1271, cv: 0.262, h2vsH1: -0.038, staff: 6, top3: 0.993, unattributed: 0, currency: 'EGP', target: 2000000 },
  { name: 'Ismailya', segment: 'Governorate', sales: 562647, trx: 289, upt: 1.43, atv: 1947, utv: 1366, cv: 0.262, h2vsH1: -0.038, staff: 3, top3: 0.953, unattributed: 0.051, currency: 'EGP', target: 2000000 },
  { name: 'Mansoura', segment: 'Governorate', sales: 326834, trx: 188, upt: 1.3, atv: 1738, utv: 1339, cv: 0.354, h2vsH1: -0.222, staff: 10, top3: 0.915, unattributed: 0, currency: 'EGP', target: 2000000, last7VsAvg: -0.42 },
  { name: 'Faqous', segment: 'Governorate', sales: 288694, trx: 158, upt: 1.37, atv: 1827, utv: 1337, cv: 0.262, h2vsH1: -0.038, staff: 4, top3: 0.994, unattributed: 0.017, currency: 'EGP', target: 2000000 },
  { name: 'Al Doha', segment: 'International', sales: 263717, trx: 750, upt: 2.44, atv: 352, utv: 144, cv: 0.262, h2vsH1: -0.038, staff: 5, top3: 0.816, unattributed: 0, currency: 'QAR', target: 2000000 },
  { name: 'Al Salam', segment: 'Governorate', sales: 252970, trx: 119, upt: 1.68, atv: 2126, utv: 1265, cv: 0.262, h2vsH1: -0.039, staff: 3, top3: 1.004, unattributed: 0, currency: 'EGP', target: 2000000 },
  { name: 'Awlad Saqr', segment: 'Governorate', sales: 250902, trx: 137, upt: 1.48, atv: 1831, utv: 1236, cv: 0.262, h2vsH1: -0.038, staff: 5, top3: 0.989, unattributed: 0.002, currency: 'EGP', target: 2000000 },
  { name: 'Aswan', segment: 'Governorate', sales: 219462, trx: 125, upt: 1.39, atv: 1756, utv: 1261, cv: 0.262, h2vsH1: -0.038, staff: 3, top3: 0.11, unattributed: 0.894, currency: 'EGP', target: 2000000 },
]

export const BRANCHES: Branch[] = raw.map((b) => ({
  ...b,
  id: slug(b.name),
  units: Math.round(b.trx * b.upt),
}))

export const MODELS: Model[] = [
  ['S6121', 'DRESS CHIFFON PRINTED', 358, 'CASUAL', 'CASUAL DRESS'],
  ['S6262', 'PANTS CREPE', 348, 'CASUAL', 'CASUAL PANTS'],
  ['S6151', 'BLOUSE STRIPED', 339, 'CASUAL', 'CASUAL BLOUSE'],
  ['S5985', 'SHAWL SATIN PRINTED', 307, 'ACCESSORY', 'ACCESSORY SCARF'],
  ['S6002', 'CARDIGAN SATIN PRINTED', 251, 'CASUAL', 'CASUAL CARDIGAN'],
  ['S6165', 'SKIRT DOUBLE FLARED', 242, 'CASUAL', 'CASUAL SKIRT'],
  ['S6231', 'VEST SLEEVELESS TR', 242, 'CASUAL', 'CASUAL BASIC'],
  ['S6227', 'BLOUSE CHIFFON', 240, 'CASUAL', 'CASUAL BLOUSE'],
  ['S6227/1', 'SKIRT PLEATED', 211, 'CASUAL', 'CASUAL SKIRT'],
  ['S6259', 'CARDIGAN SATIN PRINTED', 207, 'CASUAL', 'CASUAL CARDIGAN'],
  ['S6213', 'BLOUSE GUIPURE JAPANESE', 206, 'CASUAL', 'CASUAL BLOUSE'],
  ['S6159', 'DRESS PRINTED READY', 205, 'CASUAL', 'CASUAL DRESS'],
  ['S6164', 'DRESS CHIFFON EFFECT', 205, 'CASUAL', 'CASUAL DRESS'],
  ['S6231/1', 'PANTS WAIST ELASTIC', 202, 'CASUAL', 'CASUAL PANTS'],
  ['Y131', 'SCARF THAI COTTON', 200, 'ACCESSORY', 'ACCESSORY SCARF'],
  ['S6140/2', 'CARDIGAN SATIN PRINTED', 196, 'CASUAL', 'CASUAL CARDIGAN'],
  ['S6250', 'SHAWL SATIN BROOCH', 195, 'ACCESSORY', 'ACCESSORY SCARF'],
  ['S6189', 'DRESS SATIN STRIPED', 185, 'CASUAL', 'CASUAL DRESS'],
  ['S6116', 'BLOUSE SATIN CRINKLE', 181, 'CASUAL', 'CASUAL BLOUSE'],
  ['S6206', 'BLAZER LINEN', 180, 'CASUAL', 'CASUAL BLAZER'],
  ['S6250/1', 'PANTS SATIN WIDE', 180, 'CASUAL', 'CASUAL PANTS'],
  ['80476', 'PANTS TURKISH TR', 9, 'CASUAL', 'CASUAL PANTS'],
  ['8284', 'PANTS JEANS WIDE-LEG', 9, 'JEANS', 'JEANS PANTS'],
  ['B142', 'OPEN ABAYA SILK PRINTED', 9, 'CASUAL', 'CASUAL DRESS'],
  ['5633', 'NAYLON BLOUSE', 8, 'CASUAL', 'CASUAL BLOUSE'],
  ['8300', 'PANTS JEANS WIDE LEG', 8, 'JEANS', 'JEANS PANTS'],
  ['HT100', 'BLOUSE STRIPED DENIM', 8, 'CASUAL', 'CASUAL BLOUSE'],
  ['B139', 'ABAYA REVERSED CUFFS', 7, 'CASUAL', 'CASUAL DRESS'],
  ['2009', 'DENIM SKIRT', 6, 'JEANS', 'JEANS PANTS'],
  ['BAS3', 'LONG T-SHIRT', 6, 'CASUAL', 'CASUAL BASIC'],
  ['16103', 'JUMPSUIT JEANS', 5, 'JEANS', 'JEANS PANTS'],
  ['29084', 'JACKET SUIT JEANS', 4, 'JEANS', 'JEANS JACKET'],
].map(([code, name, units, dept, category]) => ({
  code: String(code),
  name: String(name),
  units: Number(units),
  dept: dept as Model['dept'],
  category: String(category),
}))

type SkuRow = [string, string, Sku['dept'], string, Sku['status'], number, number, number, number | null, number, number, Sku['action']]

const skuRows: SkuRow[] = [
  ['16103', 'JUMPSUIT JEANS UTILITY', 'JEANS', 'JEANS PANTS', 'dead', 247, 0, 0, null, 605150, 271700, 'clear35'],
  ['B139', 'ABAYA REVERSED CUFFS', 'CASUAL', 'CASUAL DRESS', 'dead', 166, 1, 0.2, null, 489700, 220780, 'clear35'],
  ['B142', 'OPEN ABAYA SILK PRINTED', 'CASUAL', 'CASUAL DRESS', 'dead', 153, 2, 0.5, null, 442170, 198900, 'clear35'],
  ['29084', 'JACKET SUIT JEANS VINTAGE', 'JEANS', 'JEANS JACKET', 'dead', 195, 0, 0, null, 427050, 193050, 'clear35'],
  ['80476', 'PANTS TURKISH TR', 'CASUAL', 'CASUAL PANTS', 'dead', 255, 4, 0.9, null, 351900, 158100, 'bundle'],
  ['8300', 'PANTS JEANS HEAVY WASH', 'JEANS', 'JEANS PANTS', 'dead', 184, 2, 0.5, null, 266800, 119600, 'bundle'],
  ['2009', 'DENIM SKIRT MAXI', 'JEANS', 'JEANS PANTS', 'dead', 188, 2, 0.5, null, 253800, 114680, 'bundle'],
  ['HT100', 'BLOUSE STRIPED DENIM', 'CASUAL', 'CASUAL BLOUSE', 'dead', 201, 1, 0.2, null, 221100, 98490, 'bundle'],
  ['5633', 'NAYLON BLOUSE RETRO', 'CASUAL', 'CASUAL BLOUSE', 'dead', 223, 1, 0.2, null, 211850, 95890, 'bundle'],
  ['8284', 'PANTS JEANS WIDE-LEG', 'JEANS', 'JEANS PANTS', 'dead', 141, 3, 0.7, null, 210090, 94470, 'bundle'],
  ['BAS3', 'LONG T-SHIRT WINTER', 'CASUAL', 'CASUAL BASIC', 'dead', 273, 1, 0.2, null, 177450, 79170, 'bundle'],
  ['ACC-DIA', 'ACCESSORY DIAMOND BROOCH', 'ACCESSORY', 'ACCESSORY DIAMOND', 'dead', 166, 2, 0.5, null, 141100, 59760, 'bundle'],
  ['DEF-601', 'DEFOU OUTLET CLEARANCE COAT', 'DEFOU', 'DEFOU DEFECTIVE', 'dead', 147, 3, 0.7, null, 130830, 58800, 'outlet'],
  ['J9102', 'DENIM JACKET OVERSIZED', 'JEANS', 'JEANS JACKET', 'normal', 50, 22, 5.1, 68, 112500, 17322, 'steady'],
  ['S6250/1', 'PANTS SATIN WIDE', 'CASUAL', 'CASUAL PANTS', 'normal', 58, 28, 6.5, 62, 92220, 11547, 'steady'],
  ['J8820', 'JEANS HIGH WAIST STRAIGHT', 'JEANS', 'JEANS PANTS', 'normal', 55, 26, 6.1, 63, 85250, 10778, 'steady'],
  ['S6121', 'DRESS CHIFFON PRINTED', 'CASUAL', 'CASUAL DRESS', 'fast', 191, 358, 83.5, 16, 418290, 0, 'replenish'],
  ['S6262', 'PANTS CREPE', 'CASUAL', 'CASUAL PANTS', 'fast', 187, 348, 81.2, 16, 271150, 0, 'replenish'],
  ['S6151', 'BLOUSE STRIPED', 'CASUAL', 'CASUAL BLOUSE', 'fast', 183, 339, 79.1, 16, 236070, 0, 'replenish'],
  ['S5985', 'SHAWL SATIN PRINTED', 'ACCESSORY', 'ACCESSORY SCARF', 'fast', 168, 307, 71.6, 16, 99120, 0, 'replenish'],
  ['S6002', 'CARDIGAN SATIN PRINTED', 'CASUAL', 'CASUAL CARDIGAN', 'fast', 143, 251, 58.6, 17, 241670, 0, 'replenish'],
  ['S6165', 'SKIRT DOUBLE FLARED', 'CASUAL', 'CASUAL SKIRT', 'fast', 139, 242, 56.5, 17, 193210, 0, 'replenish'],
  ['S6231', 'VEST SLEEVELESS TR', 'CASUAL', 'CASUAL BASIC', 'fast', 139, 242, 56.5, 17, 137610, 0, 'replenish'],
  ['S6227', 'BLOUSE CHIFFON', 'CASUAL', 'CASUAL BLOUSE', 'fast', 138, 240, 56, 17, 172500, 0, 'replenish'],
  ['S6227/1', 'SKIRT PLEATED', 'CASUAL', 'CASUAL SKIRT', 'fast', 125, 211, 49.2, 18, 186250, 0, 'replenish'],
  ['S6259', 'CARDIGAN SATIN PRINTED', 'CASUAL', 'CASUAL CARDIGAN', 'fast', 123, 207, 48.3, 18, 215250, 0, 'replenish'],
  ['S6213', 'BLOUSE GUIPURE JAPANESE', 'CASUAL', 'CASUAL BLOUSE', 'normal', 125, 78, 18.2, 48, 198750, 0, 'steady'],
  ['S6159', 'DRESS PRINTED READY', 'CASUAL', 'CASUAL DRESS', 'normal', 108, 65, 15.2, 50, 247320, 0, 'steady'],
  ['S6164', 'DRESS CHIFFON EFFECT', 'CASUAL', 'CASUAL DRESS', 'normal', 98, 58, 13.5, 51, 234220, 0, 'steady'],
  ['S6231/1', 'PANTS WAIST ELASTIC', 'CASUAL', 'CASUAL PANTS', 'normal', 90, 52, 12.1, 52, 121500, 0, 'steady'],
  ['Y131', 'SCARF THAI COTTON', 'ACCESSORY', 'ACCESSORY SCARF', 'normal', 86, 49, 11.4, 53, 42140, 0, 'steady'],
  ['S6140/2', 'CARDIGAN SATIN PRINTED', 'CASUAL', 'CASUAL CARDIGAN', 'normal', 81, 45, 10.5, 54, 139320, 0, 'steady'],
  ['S6250', 'SHAWL SATIN BROOCH', 'ACCESSORY', 'ACCESSORY SCARF', 'normal', 77, 42, 9.8, 55, 47740, 0, 'steady'],
  ['S6189', 'DRESS SATIN STRIPED', 'CASUAL', 'CASUAL DRESS', 'normal', 71, 38, 8.9, 56, 152650, 0, 'steady'],
  ['S6116', 'BLOUSE SATIN CRINKLE', 'CASUAL', 'CASUAL BLOUSE', 'normal', 67, 35, 8.2, 57, 88440, 0, 'steady'],
  ['S6206', 'BLAZER LINEN', 'CASUAL', 'CASUAL BLAZER', 'normal', 63, 32, 7.5, 59, 166950, 0, 'steady'],
]

export const INVENTORY: Sku[] = skuRows.map(([code, name, dept, category, status, onHand, sold30, weekly, doi, stockValue, frozen, action]) => ({
  code, name, dept, category, status, onHand, sold30, weekly, doi, stockValue, frozen, action,
}))

export const COMPETITORS: Competitor[] = [
  {
    id: 'zara',
    name: 'Zara Egypt',
    threat: 'high',
    offers: ['خصومات نهاية الموسم حتى 40% على الفساتين والقمصان', 'شحن مجاني للطلبات فوق 2000 ج.م'],
    collections: ['تشكيلة الخريف المبكر — ألوان ترابية وبيج', 'مجموعة الكتان والحرير'],
    prices: [
      { label: 'Dresses', low: 1890, high: 3990 },
      { label: 'Tops & Blouses', low: 1290, high: 2490 },
      { label: 'Pants & Jeans', low: 1690, high: 2990 },
      { label: 'Accessories', low: 490, high: 1290 },
    ],
    tagline: 'Contemporary Elegance for the Modern Woman',
    expansion: 'فرع جديد قيد التجهيز في مراسي الساحل الشمالي • تجديد فرع سيتي ستارز',
    checked: '2026-08-28',
  },
  {
    id: 'defacto',
    name: 'DeFacto Egypt',
    threat: 'high',
    offers: ['اشترِ 2 واحصل على الثالثة مجاناً', 'خصم إضافي 15% على كود التطبيق'],
    collections: ['Modest Chic — عبايات وملابس محجبات', 'Back to Campus — جينز كاجوال'],
    prices: [
      { label: 'Dresses', low: 899, high: 1699 },
      { label: 'Tops & Blouses', low: 499, high: 999 },
      { label: 'Pants & Jeans', low: 799, high: 1499 },
      { label: 'Accessories', low: 199, high: 499 },
    ],
    tagline: 'أشيك كولكشن بأوفر سعر لكل يوم',
    expansion: 'افتتاح فرع المنصورة مول • توسعة فرع كايرو فستيفال',
    checked: '2026-08-27',
  },
  {
    id: 'dalydress',
    name: 'Dalydress Women',
    threat: 'medium',
    offers: ['خصم 30% على البليزرات وبدل العمل النسائية'],
    collections: ['Smart Workwear & Formal Attire', 'مجموعة الكتان الطبيعي'],
    prices: [
      { label: 'Dresses', low: 1499, high: 2899 },
      { label: 'Tops & Blouses', low: 999, high: 1899 },
      { label: 'Pants & Jeans', low: 1299, high: 2199 },
    ],
    tagline: 'Classics that never fade',
    expansion: 'فرع أركان بلازا الشيخ زايد',
    checked: '2026-08-25',
  },
]

export const CASHIER_ACCOUNTS = ['ACCOUNTING', 'ACCOUNTING2', 'SYSADMIN', 'TEST', 'WEBSITE', 'WAREHOUSE', 'PRISM_CUSTOM']

export const SELLER_NAMES = [
  'AYA TAWFIQ', 'MARIAMKHALED', 'FARHA HATEM', 'SARA HASAN', 'RAWANEMAD', 'SOAD', 'MAHMOUDRAMADAN', 'FATMAIBRAHEM',
  'AHMEDTAREK', 'HAMZAHASSAN', 'DONIA MAHDI', 'NADAMUHAMEED', 'YOUSSEFESMAT', 'SARASABRY', 'GANA MOHAMED',
  'HALAHAMADA', 'HABIBA SAAD', 'ALIKHATER', 'AYAMUSTAFA', 'WAADALAA', 'HEENDAHMED', 'HEBAAHMED', 'MINAYASSER',
  'HAGERKAREEM', 'NESMA TAHA', 'LAMIAASOBHY', 'KAMELIAMOHAMED', 'ZAHRASAID', 'SONYATRABELSI', 'SONYA JABRI',
  'KHALEDHAMMAD', 'SABRIJELLALI', 'MARIAM TAREK', 'YARAAASHRAFF', 'BASMALAMOHAMED', 'MOASTAFAADEL', 'RAWANWALID',
  'YARAMOHAMED', 'MOHAMMEDESMAIEL', 'ASMAA MOSTAFA', 'RANIASAIED', 'SARA MOHAMED', 'HABIBASAMEH',
]

export const FLOATERS: { name: string; branches: string[] }[] = [
  { name: 'MOSTAFAELSHEIKH', branches: ['Alex', 'All Season', 'Doqi'] },
  { name: 'MOHAMEDGAMAL', branches: ['Alex', 'Doqi', 'Mall of Arabia', 'Port Said', 'Zaqazek'] },
  { name: 'MARWANAHMED', branches: ['Alex', 'All Season'] },
  { name: 'AHMEDSERAG', branches: ['Alex', 'Aswan', 'Bani Mazar', 'Ismailya', 'Mahala New'] },
  { name: 'AHMEDGAMAL', branches: ['Alex', 'All Season', 'Aswan', 'Ismailya', 'Mall of Arabia', 'Mall of Tanta', 'Port Said', 'Shubra', 'Zaqazek'] },
  { name: 'MAIMAGDY', branches: ['Alex', 'All Season', 'Fayoum', 'Mall of Tanta', 'QENA'] },
  { name: 'ABOUHEIF', branches: ['All Season', 'Awlad Saqr', 'Ismailya', 'Mahala New'] },
  { name: 'NANCYNASR', branches: ['Bani Mazar', 'Mall of Arabia', 'Port Said'] },
]

export const LOW_UPT: Record<string, { name: string; upt: number; trx: number }> = {
  'Al Minya': { name: 'MANALKHALED', upt: 1.15, trx: 33 },
  Alex: { name: 'HABIBA MAHMOUD', upt: 1.32, trx: 155 },
  Damanhour: { name: 'MARWAELHADAD', upt: 1, trx: 39 },
  'Mall of Tanta': { name: 'RAGABTAREK', upt: 1.34, trx: 38 },
}

export const FIRST_NAMES = ['رنا', 'هند', 'سندس', 'سمر', 'آية', 'أبرار', 'شيرين', 'رضوى', 'سلمى', 'حبيبة', 'أسماء', 'حنين', 'مروة', 'دينا', 'مي', 'ياسمين', 'سارة', 'فاطمة', 'بسمة', 'ولاء', 'مريم', 'نانسي', 'إيمان', 'رحمة', 'نهى', 'داليا', 'ريم', 'هدير', 'نورهان', 'منة']
export const LAST_NAMES = ['سالم', 'سعيد', 'النجار', 'الألفي', 'البحيري', 'نصر', 'خاطر', 'إبراهيم', 'الشاذلي', 'مصطفى']

export function branchId(name: string) {
  return slug(name)
}
