import React, { useState, useMemo, useRef, useEffect, createContext, useContext } from "react";
import { Search, Plus, X, Package, Store, ShieldCheck, ChevronRight, Layers, Ruler, Droplets, Trash2, Pencil, Camera, Pipette, Sparkles, Upload, MapPin, Building2, Clock, Check, XCircle, Globe, ShoppingCart, Phone, MessageCircle, Loader2, Wifi, WifiOff, ArrowLeft, TrendingUp, Receipt, Wallet, Download, Eraser, KeyRound, Contact } from "lucide-react";
import * as api from "./lib/api";
import * as marketOutbox from "./lib/marketOutbox";
import { buildInsightFacts } from "./lib/insightFacts";

// ---------------------------------------------------------------------------
// LANGUAGE / i18n — English (default), Pashto, Dari. Pashto and Dari are
// right-to-left scripts, so switching also flips text direction and swaps
// in a font stack that renders Perso-Arabic script properly.
// ---------------------------------------------------------------------------

const LANGUAGES = {
  en: { label: "English", nativeLabel: "English", dir: "ltr" },
  ps: { label: "Pashto", nativeLabel: "پښتو", dir: "rtl" },
  fa: { label: "Dari", nativeLabel: "دری", dir: "rtl" },
};

const STRINGS = {
  // Nav
  brand: { en: "Raihan Fabrics", ps: "ریحان فابریکس", fa: "ریحان فابریکس" },
  navStorefront: { en: "Storefront", ps: "پلورنځی", fa: "فروشگاه" },
  navMatcher: { en: "Match a Swatch", ps: "د نمونې سمون", fa: "تطبیق نمونه" },
  navBecomeBuyer: { en: "Become a Buyer", ps: "پیرودونکی شئ", fa: "خریدار شوید" },
  navAdmin: { en: "Admin", ps: "اداره", fa: "مدیریت" },

  // Storefront
  heroEyebrow: { en: "The Swatch Book — Plain Textiles", ps: "د نمونو کتاب — ساده پارچې/ټوټې", fa: "کتاب نمونه‌ها — پارچه‌های ساده" },
  heroTitle: { en: "Every color, true to the bolt.", ps: "هر رنګ، د تان سره سم.", fa: "هر رنگ، مطابق با طاقه." },
  heroSubWholesale: { en: "Browse by shade, not by guesswork. Wholesale pricing shown — minimum 30m per color.", ps: "د رنګ له مخې وګورئ، نه د حدس له مخې. د عمده پلور نرخونه ښودل شوي — د هر رنګ لپاره لږترلږه ۳۰ متره.", fa: "بر اساس رنگ جستجو کنید، نه حدس. قیمت‌های عمده نمایش داده شده — حداقل ۳۰ متر برای هر رنگ." },
  heroSubRetail: { en: "Browse by shade, not by guesswork. Retail pricing shown — order a physical swatch before you commit.", ps: "د رنګ له مخې وګورئ، نه د حدس له مخې. د پرچون نرخونه ښودل شوي — بهتره ده چي له نږدې ټوکر/نمونه وګوری وروسته فرمایش ورکړی.", fa: "بر اساس رنگ جستجو کنید، نه حدس. قیمت‌های خرده‌فروشی نمایش داده شده — بهتر است تکه/نمونه را از نزدیک ببینید و بعداً سفارش دهید." },
  searchPlaceholder: { en: "Search a color or fabric — e.g. Dust Rose, Linen", ps: "یو رنګ یا پارچه ولټوئ — لکه Dust Rose، Linen", fa: "یک رنگ یا پارچه جستجو کنید — مثلاً Dust Rose، کتان" },
  retail: { en: "Retail", ps: "پرچون", fa: "خرده‌فروشی" },
  wholesale: { en: "Wholesale", ps: "عمده پلور", fa: "عمده‌فروشی" },
  all: { en: "All", ps: "ټول", fa: "همه" },
  wholesaleBanner: { en: "Wholesale account view — pricing is tiered and requires a 30m minimum per color. New buyers can request access from the shop.", ps: "د عمده پلور حساب — نرخونه درجه بندي شوي او د هر رنګ لپاره لږترلږه ۳۰ متره اړین دي. نوي پیرودونکي کولی شي له پلورنځي څخه لاسرسی وغواړي، ترڅو عمده نرخونه وکتلای سي.", fa: "نمای حساب عمده — قیمت‌ها طبقه‌بندی شده و حداقل ۳۰ متر برای هر رنگ نیاز است. خریداران جدید می‌توانند از فروشگاه درخواست دسترسی کنند. تا نرخهای عمده ببیند." },
  noResults: { en: "No fabrics match that search. Try a different color or fabric name.", ps: "هیڅ پارچه له دې لټون سره سمون نه خوري. بل رنګ یا د پارچې/ټوټې نوم وازمویئ.", fa: "هیچ پارچه‌ای با این جستجو مطابقت ندارد. رنگ یا نام پارچه دیگری را امتحان کنید." },
  colors: { en: "colors", ps: "رنګونه", fa: "رنگ‌ها" },

  // Product drawer
  widthLabel: { en: "width", ps: "پلنوالی", fa: "عرض" },
  handWash: { en: "Hand wash", ps: "په لاس مینځل", fa: "شستشو با دست" },
  perMeter: { en: "/meter", ps: "/متر", fa: "/متر" },
  wholesaleTierNote: { en: "Wholesale tier · min.", ps: "د عمده پلور کچه · لږترلږه", fa: "سطح عمده · حداقل" },
  order: { en: "order", ps: "فرمایش", fa: "سفارش" },
  orderWhatsapp: { en: "Order {min}m+ via WhatsApp", ps: "د وټساپ له لارې {min}متره+ فرمایش ورکړی", fa: "سفارش {min} متر+ از طریق واتساپ" },
  addToCart: { en: "Add to cart", ps: "کارت/ سبدې ته اضافه کړئ", fa: "افزودن به سبد خرید" },
  orderSwatchCard: { en: "Order a swatch card · {cur}20", ps: "د نمونې/ټوټې کارت فرمایش ورکړی · {cur}۲۰", fa: "سفارش کارت نمونه · {cur}۲۰" },
  colorDisclaimer: { en: "Colors shown are calibrated but may vary slightly by screen. Order a physical swatch before bulk purchase.", ps: "ښودل شوي رنګونه اصلاح/سم شوي دي مګر د سکرین له مخې لږ توپیر لري. مخکې له عمده رانیولو د یوه فزیکي نمونې/ټوټې غوښتنه وکړی.", fa: "رنگ‌های نمایش داده شده کالیبره شده‌اند اما ممکن است بسته به صفحه نمایش کمی متفاوت باشند. قبل از خرید عمده یک نمونه فیزیکی سفارش دهید." },

  // Stock
  outOfStock: { en: "Out of stock", ps: "په ګدام کي نسته", fa: "در ګدام موجود نیست" },
  lowStock: { en: "Low · {n}m left", ps: "لږ · فقط {n}متره پاته دی", fa: "کم · فقط {n} متر باقی‌مانده" },
  inStock: { en: "In stock · {n}m", ps: "موجود دی · {n}متره", fa: "موجود است · {n} متر" },

  // Matcher
  matcherEyebrow: { en: "Customer swatch matching", ps: "د مشتري د نمونې/ټوټې سمون", fa: "تطبیق نمونه مشتری" },
  matcherTitle: { en: "Match a fabric they brought in.", ps: "هغه پارچه/ټوټه پسي وګوری کوم چې مشتري له ځان سره راوړی.", fa: "پارچه‌ای که مشتری آورده‌اند را جستجو کنید." },
  matcherSub: { en: "Photograph the customer's piece or pick its shade directly, and every color in stock is ranked by how close it actually is — not just how it looks on screen.", ps: "د مشتري د راوړي ټوټې څخه عکس واخلی یا یې رنګ مستقیم وټاکئ، او هر رنګ چې زموږ په سیستم کي دی د دې پر بنسټ درجه بندي کیږي چې دواړه څومره سره ورته دي — نه دا چې په سکرین کې څنګه ښکاري.", fa: "از تکه پارچه مشتری عکس بگیرید یا رنگ آن را مستقیماً انتخاب کنید، و هر رنگ موجود در سیستم بر اساس نزدیکی واقعی آن رتبه‌بندی می‌شود — نه فقط ظاهر آن روی صفحه." },
  referenceColor: { en: "Reference color", ps: "یو عکس اپلوډ کړی، عکس واخلی یا یو رنګ انتخاب کړی", fa: "یک عکس را اپلود کنید، عکس بګیرید یا یک رنګ انتخاب کنید" },
  cameraBtn: { en: "Camera", ps: "کامره", fa: "دوربین" },
  uploadBtn: { en: "Upload", ps: "اپلوډ/پورته کول", fa: "اپلود/بارگذاری" },
  autoExtractHint: { en: "Color auto-extracted from photo center — fine-tune with the picker if lighting was off.", ps: "رنګ په اوتومات ډول د انځور له مرکز/منځ څخه انتخاب سوی — که رڼا سمه نه وه نو د ټاکنې وسیلې (د قلم نښې) سره یې سم کړئ.", fa: "رنگ به صورت خودکار از مرکز عکس استخراج شده — اگر نور مناسب نبود با انتخابگر (نشان قلم) تنظیم کنید." },
  stockOnlyFilter: { en: "Only show fabrics currently in stock", ps: "یوازې هغه پارچې/ټوټې وښایاست چي د اوس لپاره زموږ سره موجود دي", fa: "فقط پارچه‌های را نشان بدی که همرای ما فعلاً موجود است" },
  closestMatch: { en: "Closest match:", ps: "ترټولو ډېر ورته/سمون:", fa: "نزدیک‌ترین تطبیق:" },
  matchWord: { en: "match", ps: "سمون/ورته", fa: "تطبیق" },
  colFabric: { en: "Fabric", ps: "پارچه/ټوکر", fa: "پارچه/تکه" },
  colStock: { en: "Stock", ps: "ذخیره/ګدام", fa: "موجودی/ګدام" },
  colMatch: { en: "Match", ps: "سمون/ورته", fa: "تطبیق" },
  colPrice: { en: "Price", ps: "نرخ", fa: "قیمت" },
  matchExact: { en: "Exact match", ps: "پوره ورته والی/سمون", fa: "تطبیق دقیق" },
  matchExcellent: { en: "Excellent match", ps: "ډیر ښه ورته/سمون", fa: "تطبیق عالی" },
  matchGood: { en: "Good match", ps: "ښه ورته والی/سمون", fa: "تطبیق خوب" },
  matchFair: { en: "Noticeable difference", ps: "د پام وړ توپیر", fa: "تفاوت قابل توجه" },
  matchPoor: { en: "Different shade", ps: "بېل رنګ", fa: "سایه متفاوت" },

  // Camera
  captureTitle: { en: "Capture the customer's fabric", ps: "د مشتري له پارچې/ټوټې څخه عکس واخلی", fa: "عکس‌برداری از پارچه مشتری" },
  captureTip: { en: "Lay the fabric flat, fill the guide frame, and use natural daylight where possible — avoid direct flash.", ps: "پارچه هواره کیږدئ، د لارښود چوکاټ ډک کړئ، او که امکان ولري طبیعي رڼا وکاروئ — د موبایل د مستقیم فلش څخه ډډه وکړئ.", fa: "پارچه را صاف بگذارید، قاب راهنما را پر کنید و در صورت امکان از نور طبیعی روز استفاده کنید — از فلش مستقیم خودداری کنید." },
  captureBtn: { en: "Capture", ps: "عکس/انځور اخیستل", fa: "عکس‌برداری" },
  retakeBtn: { en: "Retake", ps: "بیا اخیستل (دوهم واري عکس واخلی)", fa: "گرفتن مجدد (دوباره عکس بګیرید)" },
  usePhotoBtn: { en: "Use this photo", ps: "دا انځور/عکس وکاروئ", fa: "استفاده از این عکس" },
  cameraUnavailable: { en: "Camera unavailable. Check browser permissions, or use file upload instead.", ps: "کمره شتون نلري. براوزر ته اجازه ورکړی، یا هم عکس اپلوډ/پورته کړی.", fa: "دوربین در دسترس نیست. مجوزهای مرورگر را بررسی کنید یا از بارگذاری فایل استفاده کنید." },
  lightTooDark: { en: "Too dark — move to better light", ps: "ډیر تیاره — ښه رڼا ته لاړ شئ", fa: "خیلی تاریک — به نور بهتر بروید" },
  lightOverexposed: { en: "Overexposed — avoid direct flash/glare", ps: "ډیر روښانه — د مستقیم فلش/زرغونتیا څخه ډډه وکړئ", fa: "بیش از حد روشن — از فلش مستقیم خودداری کنید" },
  lightBorderline: { en: "Lighting is okay but not ideal — try natural daylight", ps: "رڼا مناسبه ده مګر سمه نه ده — د دې پر ځای طبیعي رڼا کي عکس واخلی", fa: "نور قابل قبول اما ایده‌آل نیست — بجای این در نور طبیعی روز عکس بګیرید" },
  lightGood: { en: "Good lighting", ps: "ښه رڼا", fa: "نور مناسب" },

  // Wholesale request
  wholesaleEyebrow: { en: "Wholesale access", ps: "د عمده پلور لاسرسی", fa: "دسترسی عمده" },
  wholesaleFormTitle: { en: "Request a wholesale account.", ps: "د عمده پلور حساب وغواړئ.", fa: "درخواست حساب عمده." },
  wholesaleFormSub: { en: "For tailors, boutiques, and retailers ordering in bulk. We confirm every request by phone before unlocking wholesale pricing — takes 1–2 business days.", ps: "د خیاطانو، دوکاندارانو او پرچون پلورونکو لپاره چې غواړي په عمده توګه زموږ جنس رانیسي. موږ هره غوښتنه(د حساب خلاصولو لپاره) د تلیفون له لارې تایید کوو مخکې له دې چې تاسو د عمده پلور نرخونه وګوری — ۱-۲ ورځې وخت شاید ونیسي.", fa: "برای خیاطان، بوتیک‌ها و خرده‌فروشانی که میخواهند به صورت عمده سفارش ‌دهند. ما هر درخواست (برای بازکردن حساب) را از طریق تلفن تأیید می‌کنیم تا نرخهای عمده را ببینید— ۱ تا ۲ روز شاید طول بګیرد." },
  businessDetails: { en: "Business details", ps: "د سوداګرۍ معلومات /تفصیلات", fa: "جزئیات کسب‌وکار" },
  businessName: { en: "Business name", ps: "د سوداګرۍ نوم", fa: "نام کسب‌وکار" },
  businessNamePlaceholder: { en: "e.g. Meera Boutique", ps: "لکه؛ بست د ټوکرانو پلورنځی /هیواد خیاطي", fa: "مثلاً؛ فروشګاه تکه های بست/ خیاطی هیواد" },
  ownerName: { en: "Owner name", ps: "د مالک نوم", fa: "نام مالک" },
  fullName: { en: "Full name", ps: "بشپړ نوم", fa: "نام کامل" },
  phoneLabel: { en: "Phone (WhatsApp preferred)", ps: "تلیفون (وټساپ غوره ده)", fa: "تلفن (ترجیحاً واتساپ)" },
  gstLabel: { en: "GST / business reg. no.", ps: "د سوداګرۍ ثبت شمېره", fa: "شماره ثبت کسب‌وکار" },
  optional: { en: "(optional)", ps: "(اختیاري /حتمي نه دی)", fa: "(اختیاری/ حتمي نیست)" },
  gstPlaceholder: { en: "If registered", ps: "که ثبت شوی وي", fa: "در صورت ثبت" },
  shopAddress: { en: "Shop address — for delivery", ps: "د دوکان پته — د لیږد لپاره", fa: "آدرس مغازه — برای تحویل" },
  addressLine: { en: "Address line", ps: "آدرس", fa: "آدرس" },
  addressLinePlaceholder: { en: "Shop no., building, street", ps: "د دوکان شمېره، ودانۍ، سړک", fa: "شماره مغازه، ساختمان، خیابان" },
  landmark: { en: "Landmark", ps: "د دوکان د نښې ځای", fa: "نشانی معروف دوکان" },
  landmarkHint: { en: "(helps delivery find you)", ps: "(زموږ له کارکوونکي سره مرسته کوي ترڅو ستاسو ځای پیداکړي)", fa: "(به کارمند ما کمک می‌کند جای شما را پیدا کند)" },
  landmarkPlaceholder: { en: "e.g. Opposite City Bus Stand", ps: "لکه د فلاني کلینیک سره نږدې", fa: "مثلاً نزدیک به فلان کلینیک" },
  city: { en: "City", ps: "ښار", fa: "شهر" },
  state: { en: "State", ps: "ولایت", fa: "ایالت/استان" },
  pincode: { en: "PIN / postal code", ps: "پوستي کوډ", fa: "کد پستی" },
  pinLocationBtn: { en: "Pin my shop's exact location", ps: "زما د دوکان دقیق ځای په نقشه کي وګوری", fa: "مکان دقیق مغازه من را در نقشه ببینید" },
  pinLocating: { en: "Locating…", ps: "د ځای موندل روان دی…", fa: "در حال یافتن مکان…" },
  pinRetake: { en: "Location captured — retake", ps: "ځای ثبت شو — بیا وکړئ", fa: "مکان ثبت شد — دوباره" },
  geoHint: { en: "Best captured while standing inside your shop — this is what our delivery rider uses to navigate directly to you.", ps: "غوره ده چې د خپل دوکان دننه ولاړ یاست او دا ثبت کړئ — زموږ د لیږد کارکوونکی دا کاروي چې مستقیم تاسو ته ورسیږي.", fa: "بهتر است این را هنگام ایستادن داخل مغازه خود ثبت کنید — پیک تحویل ما از این برای رسیدن مستقیم به شما استفاده می‌کند." },
  geoUnavailable: { en: "Location isn't available on this device/browser — you can still submit without it.", ps: "ځای /موقعیت په دې تلیفون کې شتون نلري — تاسو بیا هم کولای شی پرته له دې یی موږ ته راواستوی.", fa: "مکان در این تلفن در دسترس نیست — همچنان می‌توانید بدون آن ارسال کنید." },
  geoFailed: { en: "Couldn't get your location — check permissions, or submit without it and we'll confirm by phone.", ps: "ستاسو ځای ونشو موندلی — په تلیفون کي دي اپشن ته اجازه ورکړی، یا پرته له دې مخته ولاړسی او موږ به یې د تلیفون له لارې تایید کړو.", fa: "مکان شما پیدا نشد — مجوزها را در تلفن تان بررسی کنید یا بدون آن ارسال کنید و ما از طریق تلفن تأیید می‌کنیم." },
  submitForReview: { en: "Submit for review", ps: "د بیاکتنې لپاره وسپارئ", fa: "ارسال برای بررسی" },
  requestSent: { en: "Request sent", ps: "غوښتنه ولیږل شوه", fa: "درخواست ارسال شد" },
  requestSentBody: { en: "We'll review {name} and confirm by phone within 1–2 business days. Once approved, wholesale pricing unlocks on your account.", ps: "موږ به {name} وګورو او د ۱-۲ ورځو دننه به یې د تلیفون له لارې تایید کړو. کله چې تایید شي، کولای سی زموږ د جنسونو عمده نرخونه وګوری.", fa: "ما {name} را بررسی کرده و ظرف ۱ تا ۲ روز از طریق تلفن تأیید می‌کنیم. پس از تأیید، قیمت‌های عمده در حساب شما باز می‌شود." },

  // Wholesale admin
  pendingReview: { en: "Pending review", ps: "د بیاکتنې په تمه", fa: "در انتظار بررسی" },
  approvedBuyers: { en: "Approved buyers", ps: "تاییدشوي پیرودونکي", fa: "خریداران تأیید شده" },
  rejected: { en: "Rejected", ps: "رد شوی", fa: "رد شده" },
  pendingRequests: { en: "Pending requests", ps: "په تمه غوښتنې", fa: "درخواست‌های در انتظار" },
  noApprovedBuyers: { en: "No approved wholesale buyers yet.", ps: "تر اوسه هیڅ تایید شوی عمده پیرودونکی نشته.", fa: "هنوز خریدار عمده تأیید شده‌ای وجود ندارد." },
  approveBtn: { en: "Approve", ps: "تایید", fa: "تأیید" },
  rejectBtn: { en: "Reject", ps: "رد کول", fa: "رد کردن" },
  openInMaps: { en: "Open exact pin in Maps", ps: "په نقشه کې دقیق ځای خلاص کړئ", fa: "باز کردن مکان دقیق در نقشه" },
  noPinCaptured: { en: "No GPS pin captured — confirm by phone", ps: "هیڅ GPS ځای نه دی ثبت شوی — د تلیفون له لارې تایید کړئ", fa: "هیچ مکان GPS ثبت نشده — از طریق تلفن تأیید کنید" },

  // Admin inventory
  totalSkus: { en: "Total SKUs", ps: "ټول SKUs", fa: "تعداد کل اقلام" },
  metersInStock: { en: "Meters in stock", ps: "مترونه په دوکان/ګدام کي دي", fa: "متر موجود در دوکان /انبار" },
  lowStockLabel: { en: "Low stock", ps: "لږه ذخیره", fa: "موجودی کم" },
  outOfStockLabel: { en: "Out of stock", ps: "ذخیره ختمه شوې", fa: "ناموجود" },
  inventory: { en: "Inventory", ps: "د جنسونو لیست", fa: "لیست جنسها" },
  addFabric: { en: "Add fabric", ps: "پارچه/ ټوکر اضافه کړئ", fa: "افزودن پارچه/ تکه" },
  tableColor: { en: "Color", ps: "رنګ", fa: "رنگ" },
  tableFabric: { en: "Fabric", ps: "ټوکر/ پارچه", fa: "تکه/ پارچه" },
  tableSku: { en: "SKU", ps: "SKU", fa: "SKU" },
  tableWidth: { en: "Width", ps: "پلنوالی", fa: "عرض" },
  tableRetail: { en: "Retail", ps: "پرچون", fa: "خرده‌فروشی" },
  tableWholesale: { en: "Wholesale", ps: "عمده پلور", fa: "عمده‌فروشی" },
  tableStock: { en: "Stock", ps: "ذخیره", fa: "موجودی" },
  editFabric: { en: "Edit fabric", ps: "پارچه سمول", fa: "ویرایش پارچه" },
  addFabricTitle: { en: "Add fabric", ps: "پارچه/ ټوکر اضافه کړئ", fa: "افزودن پارچه" },
  fabricType: { en: "Fabric type", ps: "د ټوکر/پارچې ډول", fa: "نوع پارچه" },
  colorName: { en: "Color name", ps: "د رنګ نوم", fa: "نام رنگ" },
  colorNamePlaceholder: { en: "e.g. Dust Rose", ps: "لکه Dust Rose", fa: "مثلاً Dust Rose" },
  swatchColor: { en: "Swatch color", ps: "د نمونې رنګ", fa: "رنگ نمونه" },
  skuLabel: { en: "SKU", ps: "SKU", fa: "کد کالا" },
  skuPlaceholder: { en: "e.g. CTN-DRS-44", ps: "لکه CTN-DRS-44", fa: "مثلاً CTN-DRS-44" },
  widthIn: { en: "Width (in)", ps: "پلنوالی (سانتي متر)", fa: "عرض (سانتي متر)" },
  gsmLabel: { en: "GSM", ps: "GSM", fa: "GSM" },
  retailPricePerM: { en: "Retail price/m", ps: "د پرچون نرخ/متر", fa: "قیمت خرده/متر" },
  wholesalePricePerM: { en: "Wholesale price/m", ps: "د عمده پلور نرخ/متر", fa: "قیمت عمده/متر" },
  stockMeters: { en: "Stock (meters)", ps: "ذخیره/گدام (متره)", fa: "موجودی/گدام (متر)" },
  saveChanges: { en: "Save changes", ps: "بدلونونه ثبت کړئ", fa: "ذخیره تغییرات" },
  addToInventory: { en: "Add to inventory", ps: "لیست ته اضافه کړئ", fa: "افزودن به انبار" },
  wholesaleBuyersTab: { en: "Wholesale Buyers", ps: "عمده پیرودونکي", fa: "خریداران عمده" },
  deleteFabricTitle: { en: "Delete this fabric?", ps: "دا پارچه/ ټوټه ډیلیټ شي؟", fa: "این پارچه حذف شود؟" },
  deleteFabricBody: { en: "\"{name}\" will be removed from inventory. If it has no past sales or purchases it's deleted permanently; if it does, it's archived instead (hidden, but restorable) so old invoices still make sense.", ps: "\"{name}\" به له ذخیرې څخه لرې شي. که پخوانی پلور یا اخیستنه ونلري نو د تل لپاره ډیلیټ کیږي؛ که ولري نو پرځای یې آرشیف کیږي (پټ، مګر بیرته راوستل کیدونکی) ترڅو زاړه فاکتورونه بیا هم معنی ولري.", fa: "\"{name}\" از انبار حذف می‌شود. اگر فروش یا خرید قبلی نداشته باشد برای همیشه حذف می‌شود؛ اگر داشته باشد، به‌جای آن آرشیف می‌شود (پنهان اما قابل بازگردانی) تا فاکتورهای قدیمی همچنان معنا داشته باشند." },
  deleteConfirmBtn: { en: "Delete", ps: "ډیلیټ کول", fa: "حذف" },
  cancelBtn: { en: "Cancel", ps: "لغوه کول", fa: "لغو" },
  archivedInsteadOfDeleted: { en: "\"{name}\" has past sales or purchases on record, so it was archived instead of deleted — it's hidden from customers and staff pickers, and you can restore it anytime.", ps: "\"{name}\" پخوانی پلور یا اخیستنه لري، نو دا ډیلیټ نشو بلکه آرشیف شو — اوس د مشتریانو او کارکوونکو څخه پټ دی، تاسو یې هر وخت بیرته راولی شئ.", fa: "\"{name}\" فروش یا خرید قبلی ثبت‌شده دارد، پس به‌جای حذف، آرشیف شد — اکنون از مشتریان و کارمندان پنهان است و هر زمان می‌توانید آن را بازگردانید." },
  dismissBtn: { en: "Dismiss", ps: "پټول", fa: "نادیده گرفتن" },
  archivedCountNote: { en: "{n} archived fabric(s) — hidden from customers and pickers, shown here greyed out. Use Restore to bring one back.", ps: "{n} آرشیف شوي پارچې — د مشتریانو څخه پټې دي، دلته کمرنګ ښودل شوي. د بیرته راوستلو لپاره Restore کاروئ.", fa: "{n} پارچه آرشیف‌شده — از مشتریان پنهان است و در اینجا کم‌رنگ نمایش داده می‌شود. برای بازگرداندن از Restore استفاده کنید." },
  staffInventoryLimitNote: { en: "Your account can add new fabrics, but only the owner can edit or delete existing inventory items.", ps: "ستاسو حساب کولی شي نوې پارچې اضافه کړي، مګر یوازې مالک کولی شي شتون لرونکي توکي سمون یا ډیلیټ کړي.", fa: "حساب شما می‌تواند پارچه‌های جدید اضافه کند، اما فقط مالک می‌تواند اقلام موجود را ویرایش یا حذف کند." },
  archivedLabel: { en: "archived", ps: "آرشیف شوی", fa: "آرشیف‌شده" },
  restoreBtn: { en: "Restore", ps: "بیرته راوستل", fa: "بازگرداندن" },
  archivedSectionTitle: { en: "Archived fabrics ({n})", ps: "آرشیف شوي پارچې ({n})", fa: "پارچه‌های آرشیف‌شده ({n})" },
  viewArchivedBtn: { en: "View archived", ps: "آرشیف کتل", fa: "مشاهده آرشیف" },
  hideArchivedBtn: { en: "Hide", ps: "پټول", fa: "پنهان کردن" },
  addToPurchaseListBtn: { en: "Add to Purchase List", ps: "د پیرود لیست ته اضافه کول", fa: "افزودن به لیست خرید" },


  // Record Sale
  recordSaleTitle: { en: "Record Sale", ps: "پلور ثبت کړئ", fa: "ثبت فروش" },
  recordedAsLabel: { en: "Recorded as", ps: "دا ثبت شو د:", fa: "ثبت شد به‌عنوان" },
  recordSaleAddLineError: { en: "Add at least one fabric, meters, and price.", ps: "لږترلږه یوه پارچه، متره، او نرخ اضافه کړئ.", fa: "حداقل یک پارچه، متر و قیمت اضافه کنید." },
  recordSaleGenericError: { en: "Could not record the sale. Please try again.", ps: "پلور ثبت نشو. مهرباني وکړئ بیا هڅه وکړئ.", fa: "فروش ثبت نشد. لطفاً دوباره تلاش کنید." },
  fabricSearchPlaceholder: { en: "Type a SKU, color, or fabric type to search…", ps: "د لټون لپاره SKU، رنګ، یا د پارچې ډول ولیکئ…", fa: "برای جستجو SKU، رنگ یا نوع پارچه را تایپ کنید…" },
  noFabricsMatchSearch: { en: "No fabrics match \"{q}\"", ps: "هیڅ پارچه له \"{q}\" سره سمون نه خوري", fa: "هیچ پارچه‌ای با \"{q}\" مطابقت ندارد" },
  metersPlaceholder: { en: "Meters", ps: "متره", fa: "متر" },
  pricePerMeterPlaceholder: { en: "Price/m", ps: "نرخ/متر", fa: "قیمت/متر" },
  onlyNInStock: { en: "only {n}m in stock", ps: "یوازې {n}متره په ګدام کي شتون لري", fa: "فقط {n} متر موجود است" },
  addAnotherFabric: { en: "Add another fabric", ps: "بله پارچه اضافه کړئ", fa: "افزودن پارچه دیگر" },
  customerNameOptional: { en: "Customer name (optional)", ps: "د مشتري نوم (اختیاري)", fa: "نام مشتری (اختیاری)" },
  customerPhoneOptional: { en: "Customer phone (optional)", ps: "د مشتري تلیفون (اختیاري)", fa: "تلفن مشتری (اختیاری)" },
  paymentMethodLabel: { en: "Payment method", ps: "د تادیې طریقه", fa: "روش پرداخت" },
  paymentCash: { en: "Cash", ps: "نغدي", fa: "نقدی" },
  paymentCard: { en: "Card", ps: "کارت", fa: "کارت" },
  paymentTransfer: { en: "Transfer", ps: "لېږد", fa: "حواله" },
  paymentOther: { en: "Other", ps: "نور", fa: "سایر" },
  paymentStatusLabel: { en: "Payment status", ps: "د تادیې حالت", fa: "وضعیت پرداخت" },
  amountPaidLabel: { en: "Amount paid", ps: "تادیه شوی مقدار", fa: "مبلغ پرداخت‌شده" },
  amountPaidPlaceholder: { en: "e.g. 3000", ps: "لکه ۳۰۰۰", fa: "مثلاً ۳۰۰۰" },
  remainingBalanceLabel: { en: "Remaining", ps: "پاتې", fa: "باقی‌مانده" },
  partialAmountError: { en: "Enter an amount paid that's greater than 0 and less than the total.", ps: "تادیه شوی مقدار دې له صفر څخه زیات او له ټول مبلغ څخه کم وی.", fa: "مبلغ پرداخت‌شده باید بیشتر از صفر و کمتر از مبلغ کل باشد." },
  paymentStatusPaid: { en: "Paid", ps: "تادیه شوی", fa: "پرداخت‌شده" },
  paymentStatusPartial: { en: "Partial", ps: "نیمګړی", fa: "جزئی" },
  paymentStatusUnpaid: { en: "Unpaid", ps: "نه تادیه شوی", fa: "پرداخت‌نشده" },
  discountTotalLabel: { en: "Discount total", ps: "ټول تخفیف", fa: "مجموع تخفیف" },
  notesOptional: { en: "Notes (optional)", ps: "یادښتونه (اختیاري)", fa: "یادداشت (اختیاری)" },
  creditLedgerTitle: { en: "Credit Ledger", ps: "د پور کتاب", fa: "دفتر اعتباری" },
  totalOwedLabel: { en: "Total owed to you", ps: "ټول پور چې تاسو ته بایللی دی", fa: "کل بدهی به شما" },
  businessNameLabel: { en: "Business", ps: "سوداګري", fa: "کسب‌وکار" },
  balanceOwedLabel: { en: "Balance Owed", ps: "پاتې پور", fa: "مانده بدهی" },
  viewLedgerBtn: { en: "View Ledger", ps: "د پور کتاب وګورئ", fa: "مشاهده دفتر" },
  hideBtn: { en: "Hide", ps: "پټول", fa: "پنهان کردن" },
  noLedgerActivityMsg: { en: "No credit activity yet.", ps: "تر اوسه هیڅ د پور فعالیت نشته.", fa: "هنوز فعالیت اعتباری‌ای نیست." },
  chargeLabel: { en: "Charge", ps: "پور", fa: "بدهی" },
  paymentReceivedLabel: { en: "Payment received", ps: "تادیه ترلاسه شوه", fa: "پرداخت دریافت شد" },
  paymentLabel: { en: "payment", ps: "تادیه", fa: "پرداخت" },
  amountLabel: { en: "Amount", ps: "اندازه", fa: "مبلغ" },
  paymentAmountError: { en: "Enter an amount greater than zero.", ps: "له صفر څخه لوړه اندازه ولیکئ.", fa: "مبلغی بزرگ‌تر از صفر وارد کنید." },
  paymentGenericError: { en: "Couldn't save this entry. Try again.", ps: "دا ننوت خوندي نشو. بیا هڅه وکړئ.", fa: "این مورد ذخیره نشد. دوباره تلاش کنید." },
  txTypeCharge: { en: "Charge (they borrowed)", ps: "پور (یې واخیست)", fa: "بدهی (قرض گرفت)" },
  txTypePayment: { en: "Payment (they paid back)", ps: "تادیه (یې بیرته ورکړ)", fa: "پرداخت (بازپرداخت)" },
  addEntryBtn: { en: "Add Entry", ps: "ننوت اضافه کړئ", fa: "افزودن مورد" },
  sendBalanceBtn: { en: "Send Balance", ps: "پاتې لېږل", fa: "ارسال مانده" },
  settleBalanceBtn: { en: "Settle Balance", ps: "حساب پاکول", fa: "تسویه حساب" },
  settleBalanceTitle: { en: "Settle balance?", ps: "حساب پاک شي؟", fa: "حساب تسویه شود؟" },
  settleBalanceBody: {
    en: "This permanently deletes every charge and payment on record for {name}, as if the account had no history at all. This can't be undone.",
    ps: "دا به د {name} ټول ثبت شوي پور او تادیات همیشه لپاره ړنګ کړي، لکه دا چې حساب هیڅ تاریخچه نه لري. دا بیرته نشي کیدی.",
    fa: "این کار همه سوابق پور و پرداخت {name} را برای همیشه حذف می‌کند، طوری که حساب هیچ سابقه‌ای نداشته باشد. این کار قابل بازگشت نیست.",
  },
  confirmPasswordLabel: { en: "Confirm your password to continue", ps: "د دوام لپاره خپل پاسورډ تایید کړئ", fa: "برای ادامه رمز عبور خود را تأیید کنید" },
  settleBalanceConfirmBtn: { en: "Delete history & settle", ps: "تاریخچه ړنګه کړئ", fa: "حذف سوابق و تسویه" },
  passwordRequiredError: { en: "Enter your password to confirm.", ps: "د تایید لپاره خپل پاسورډ ولیکئ.", fa: "برای تأیید رمز عبور خود را وارد کنید." },
  incorrectPasswordError: { en: "Incorrect password.", ps: "غلط پاسورډ.", fa: "رمز عبور نادرست است." },
  creditLedgerManualNote: { en: "Everything here is entered by hand — recording a sale never adds or changes anything in this ledger.", ps: "دلته هرڅه په لاس ننوځي — د پلورنې ثبتول هیڅکله دې کتاب کې هیڅ نه اضافه کوي او نه بدلوي.", fa: "همه‌چیز در اینجا به‌صورت دستی وارد می‌شود — ثبت فروش هرگز چیزی در این دفتر اضافه یا تغییر نمی‌دهد." },
  noApprovedAccountsMsg: { en: "No approved wholesale accounts yet.", ps: "تر اوسه هیڅ تصویب شوی عمده حساب نشته.", fa: "هنوز حساب عمده تأییدشده‌ای نیست." },
  subtotalLabel: { en: "Subtotal", ps: "فرعي مجموعه", fa: "جمع جزء" },
  totalLabel: { en: "Total", ps: "ټوله مجموعه", fa: "جمع کل" },

  // Dashboard
  loadingDashboard: { en: "Loading dashboard…", ps: "ډشبورډ لوډ کیږي…", fa: "در حال بارگذاری داشبورد…" },
  todaysRevenue: { en: "Today's revenue", ps: "د نننۍ ورځې عاید", fa: "درآمد امروز" },
  thisWeekLabel: { en: "This week", ps: "دا اونۍ", fa: "این هفته" },
  thisMonthLabel: { en: "This month", ps: "دا میاشت", fa: "این ماه" },
  thisYearLabel: { en: "This year", ps: "دا کال", fa: "امسال" },
  totalProfitLabel: { en: "Total profit", ps: "ټول ګټه", fa: "مجموع سود" },
  profitMarginLabel: { en: "Profit margin", ps: "د ګټې تناسب", fa: "حاشیه سود" },
  avgInvoiceValueLabel: { en: "Avg. invoice value", ps: "د فاکتور اوسط ارزښت", fa: "میانگین ارزش فاکتور" },
  inventoryValuationLabel: { en: "Inventory valuation", ps: "د ذخیرې ارزښت ارزونه", fa: "ارزش‌گذاری موجودی" },
  activeCustomersLabel: { en: "Active customers", ps: "فعال مشتریان", fa: "مشتریان فعال" },
  deadStockLabel: { en: "Dead stock ({d}d)", ps: "مړه ذخیره ({d} ورځې)", fa: "موجودی راکد ({d} روز)" },
  revenueLast14DaysLabel: { en: "Revenue — last 14 days", ps: "عاید — تیرې ۱۴ ورځې", fa: "درآمد — ۱۴ روز گذشته" },
  bestSellingFabricsLabel: { en: "Best-selling fabrics (meters sold)", ps: "ترټولو ښه پلورل شوي پارچې (پلورل شوي متره)", fa: "پرفروش‌ترین پارچه‌ها (متر فروخته‌شده)" },
  mostProfitableFabricsLabel: { en: "Most profitable fabrics", ps: "ترټولو ګټور پارچې", fa: "سودآورترین پارچه‌ها" },
  reorderSuggestionsLabel: { en: "Reorder suggestions", ps: "د بیا امر وړاندیزونه", fa: "پیشنهادهای سفارش مجدد" },
  nothingToReorderMsg: { en: "Nothing urgently needs reordering.", ps: "اوس مهال هیڅ شی بیا امر ته اړتیا نلري.", fa: "چیزی فوراً نیاز به سفارش مجدد ندارد." },
  deadStockTitleLabel: { en: "Dead stock (no sale in {d}+ days)", ps: "مړه ذخیره ({d}+ ورځو کې پلور نشته)", fa: "موجودی راکد (بدون فروش در {d}+ روز)" },
  noDeadStockMsg: { en: "No dead stock right now.", ps: "اوس مهال هیڅ مړه ذخیره نشته.", fa: "در حال حاضر موجودی راکد وجود ندارد." },
  tiedUpLabel: { en: "tied up", ps: "بند شوي", fa: "بلوکه‌شده" },
  buildingInsightsMsg: { en: "Building insights…", ps: "لیدونه جوړیږي…", fa: "در حال ساخت بینش‌ها…" },
  notEnoughSalesHistoryMsg: { en: "Not enough sales history yet for insights to be meaningful — this fills in automatically as more sales are recorded.", ps: "تر اوسه د معنی لرونکو لیدونو لپاره کافي د پلور سابقه نشته — دا به په خپله ډکیږي لکه څومره چې پلورونه ثبت شي.", fa: "هنوز سابقه فروش کافی برای بینش‌های معنادار وجود ندارد — با ثبت فروش بیشتر، این بخش به‌طور خودکار تکمیل می‌شود." },
  insightsLabel: { en: "Insights", ps: "لیدونه", fa: "بینش‌ها" },
  plainSummaryNote: { en: "plain summary — AI phrasing not available", ps: "ساده لنډیز — د AI جوړونه شتون نلري", fa: "خلاصه ساده — عبارت‌پردازی هوش مصنوعی در دسترس نیست" },

  // Trends
  loadingTrendsMsg: { en: "Loading trends…", ps: "رجحانات لوډ کیږي…", fa: "در حال بارگذاری روندها…" },
  salesHistorySoFarNote: { en: "Only {n} day(s) of sales history so far (since {date}). Comparisons below will get more meaningful as more sales are recorded.", ps: "تر اوسه یوازې {n} ورځې د پلور سابقه شتون لري (د {date} راهیسې). لاندې پرتلنې به نور معنی لرونکې شي لکه څومره چې نور پلورونه ثبت شي.", fa: "تاکنون فقط {n} روز سابقه فروش وجود دارد (از {date}). مقایسه‌های زیر با ثبت فروش بیشتر معنادارتر خواهند شد." },
  noSalesYetNote: { en: "No sales recorded yet — comparisons and forecasts will appear here once Record Sale has been used.", ps: "تر اوسه هیڅ پلور نه دی ثبت شوی — پرتلنې او وړاندوینې به دلته وروسته له دې چې د پلور ثبتول وکارول شي راڅرګندې شي.", fa: "هنوز فروشی ثبت نشده — پس از استفاده از ثبت فروش، مقایسه‌ها و پیش‌بینی‌ها اینجا ظاهر می‌شوند." },
  monthVsLastMonthLabel: { en: "This month vs last month", ps: "دا میاشت د تیرې میاشتې سره پرتله", fa: "این ماه در برابر ماه گذشته" },
  yearVsLastYearLabel: { en: "This year vs last year", ps: "دا کال د تیر کال سره پرتله", fa: "امسال در برابر سال گذشته" },
  needsYearOfHistoryNote: { en: "needs a year+ of history", ps: "یو کال+ سابقه ته اړتیا لري", fa: "به بیش از یک سال سابقه نیاز دارد" },
  nextWeekForecastLabel: { en: "Next week forecast", ps: "د راتلونکې اونۍ وړاندوینه", fa: "پیش‌بینی هفته آینده" },
  needsNWeeksWithSalesNote: { en: "needs {n}+ weeks with sales ({so_far} so far)", ps: "{n}+ اونیو ته اړتیا لري چې پلور ولري (تراوسه {so_far})", fa: "به {n}+ هفته با فروش نیاز دارد (تاکنون {so_far})" },
  simpleTrendEstimateNote: { en: "simple trend estimate, not a guarantee", ps: "ساده د رجحان اټکل، نه یوه ډاډمنه ژمنه", fa: "برآورد ساده روند، نه یک تضمین" },
  weeklyRevenueLast16WeeksLabel: { en: "Weekly revenue — last 16 weeks", ps: "اونیزه عاید — تیرې ۱۶ اونۍ", fa: "درآمد هفتگی — ۱۶ هفته گذشته" },
  revenueBySeasonLabel: { en: "Revenue by season (all-time)", ps: "د فصل له مخې عاید (ټول وخت)", fa: "درآمد بر اساس فصل (کل زمان)" },
  topFabricTypePerSeasonLabel: { en: "Top fabric type per season", ps: "د هر فصل غوره ډول پارچه", fa: "پرفروش‌ترین نوع پارچه در هر فصل" },
  topColorsInLabel: { en: "Top colors in {type}", ps: "په {type} کې غوره رنګونه", fa: "برترین رنگ‌ها در {type}" },
  topSeasonSellerNote: { en: "top: {name} ({m}m)", ps: "غوره: {name} ({m}متره)", fa: "برتر: {name} ({m} متر)" },
  noSalesYetShortNote: { en: "no sales yet", ps: "تراوسه پلور نشته", fa: "هنوز فروشی نبوده" },
  seasonCalendarNote: { en: "Uses fixed calendar seasons (Dec–Feb winter, Mar–May spring, Jun–Aug summer, Sep–Nov fall) as a starting point — not aligned to demand-driving events like Ramadan or Eid, which shift dates each year and would need a separate calendar to track properly.", ps: "د ثابت تقویمي فصلونو (ډسمبر-فبروري ژمی، مارچ-می پسرلی، جون-اګست اوړی، سپتمبر-نومبر منی) کاروي — دا د رمضان یا اختر په څیر د غوښتنې راولونکو پیښو سره سمون نه خوري، چې هر کال نیټې بدلوي.", fa: "از فصل‌های تقویمی ثابت (دسامبر–فوریه زمستان، مارس–می بهار، ژوئن–آگوست تابستان، سپتامبر–نوامبر پاییز) به‌عنوان نقطه شروع استفاده می‌کند — با رویدادهای تقاضامحور مانند رمضان یا عید که هر سال تاریخشان تغییر می‌کند هماهنگ نیست." },
  customDateRangeLabel: { en: "Custom date range", ps: "دلخوښه نیټه لړ", fa: "بازه زمانی دلخواه" },
  customDateRangeNote: { en: "Pick any two dates to see what was trending in between — alongside the three fixed comparisons above, not replacing them.", ps: "دوه نیټې وټاکئ ترڅو وګورئ چې تر منځ یې څه شی رجحان درلود — د پورته درې ثابتو پرتلنو سره یوځای، نه یې ځای ناستی.", fa: "دو تاریخ را انتخاب کنید تا ببینید در این بازه چه چیزی روند داشته — در کنار سه مقایسه ثابت بالا، نه جایگزین آن‌ها." },
  fromLabel: { en: "From", ps: "له", fa: "از" },
  toLabel: { en: "To", ps: "تر", fa: "تا" },
  fromBeforeToError: { en: "\"From\" needs to be before \"To\".", ps: "\"له\" باید د \"تر\" مخکې وي.", fa: "\"از\" باید قبل از \"تا\" باشد." },
  revenueInRangeLabel: { en: "Revenue in range", ps: "په لړ کې عاید", fa: "درآمد در این بازه" },
  metersSoldLabel: { en: "Meters sold", ps: "پلورل شوي متره", fa: "متر فروخته‌شده" },
  acrossNFabricsNote: { en: "across {n} fabric(s)", ps: "د {n} پارچو په اوږدو کې", fa: "در {n} پارچه" },
  avgRevenuePerDayLabel: { en: "Avg. revenue / day", ps: "د ورځې اوسط عاید", fa: "میانگین درآمد / روز" },
  noSalesInRangeMsg: { en: "No sales recorded in this date range.", ps: "په دې نیټه لړ کې هیڅ پلور نه دی ثبت شوی.", fa: "در این بازه زمانی فروشی ثبت نشده است." },
  topFabricsInRangeLabel: { en: "Top fabrics in this range (by meters)", ps: "په دې لړ کې غوره پارچې (د مترو له مخې)", fa: "برترین پارچه‌ها در این بازه (بر اساس متر)" },
  topFabricTypesInRangeLabel: { en: "Top fabric types in this range", ps: "په دې لړ کې غوره ډولونه", fa: "برترین انواع پارچه در این بازه" },

  // Log Customer Request
  logCustomerRequestTitle: { en: "Log Customer Request", ps: "د مشتري غوښتنه ثبت کړئ", fa: "ثبت درخواست مشتری" },
  logRequestValidationError: { en: "Add at least a fabric type/color, or a photo.", ps: "لږترلږه د پارچې ډول/رنګ، یا یو انځور اضافه کړئ.", fa: "حداقل نوع/رنگ پارچه یا یک عکس اضافه کنید." },
  logRequestGenericError: { en: "Could not save the request. Please try again.", ps: "غوښتنه خوندي نشوه. مهرباني وکړئ بیا هڅه وکړئ.", fa: "درخواست ذخیره نشد. لطفاً دوباره تلاش کنید." },
  matchedExistingRequestMsg: { en: "Matched an existing request — now requested {n} times.", ps: "د یوې شتون لرونکې غوښتنې سره سمون وموندل شو — اوس {n} ځله غوښتل شوی.", fa: "با یک درخواست موجود مطابقت یافت — اکنون {n} بار درخواست شده." },
  newRequestLoggedMsg: { en: "New request logged.", ps: "نوې غوښتنه ثبته شوه.", fa: "درخواست جدید ثبت شد." },
  requestTypeLabel: { en: "Request type", ps: "د غوښتنې ډول", fa: "نوع درخواست" },
  outOfStockOptionLabel: { en: "Out of Stock (we carry it, none left)", ps: "ذخیره ختمه (موږ یې لرو، مګر پاتې نه دی)", fa: "ناموجود (داریم اما تمام شده)" },
  neverStockedOptionLabel: { en: "Never Stocked (we've never carried it)", ps: "هیڅکله ذخیره نه ده شوې (موږ یې هیڅکله نه دی لرلی)", fa: "هرگز موجود نبوده (تا به حال نداشته‌ایم)" },
  specialOrderOptionLabel: { en: "Special Order", ps: "ځانګړی امر", fa: "سفارش ویژه" },
  whichFabricOptionalLabel: { en: "Which fabric (optional, but helps matching)", ps: "کومه پارچه (اختیاري، مګر سمون کې مرسته کوي)", fa: "کدام پارچه (اختیاری، اما به تطبیق کمک می‌کند)" },
  selectFabricEllipsis: { en: "Select fabric…", ps: "پارچه وټاکئ…", fa: "پارچه را انتخاب کنید…" },
  fabricTypeLabel: { en: "Fabric type", ps: "د پارچې ډول", fa: "نوع پارچه" },
  fabricTypePlaceholderExample: { en: "e.g. Cotton, Georgette", ps: "لکه: کاټن، جورجیټ", fa: "مثلاً: کتان، ژورژت" },
  colorLabel: { en: "Color", ps: "رنګ", fa: "رنگ" },
  colorPlaceholderExample: { en: "e.g. Dust Rose", ps: "لکه: ګلابي", fa: "مثلاً: صورتی خاکی" },
  widthOptionalLabel: { en: "Width (optional)", ps: "پلنوالی (اختیاري)", fa: "عرض (اختیاری)" },
  quantityRequestedLabel: { en: "Quantity requested (meters)", ps: "غوښتل شوې اندازه (متره)", fa: "مقدار درخواستی (متر)" },
  swatchPhotoOptionalLabel: { en: "Swatch photo (optional)", ps: "د نمونې انځور (اختیاري)", fa: "عکس نمونه (اختیاری)" },
  swatchPreviewAlt: { en: "Swatch preview", ps: "د نمونې مخکتنه", fa: "پیش‌نمایش نمونه" },
  logRequestBtn: { en: "Log Request", ps: "غوښتنه ثبت کړئ", fa: "ثبت درخواست" },

  // Demand Intelligence
  loadingRequestsMsg: { en: "Loading requests…", ps: "غوښتنې لوډ کیږي…", fa: "در حال بارگذاری درخواست‌ها…" },
  openRequestsLabel: { en: "Open requests", ps: "پرانیستې غوښتنې", fa: "درخواست‌های باز" },
  neverStockedLabel: { en: "Never stocked", ps: "هیڅکله ذخیره نشوې", fa: "هرگز موجود نبوده" },
  estLostRevenueLabel: { en: "Est. lost revenue", ps: "اټکل شوی له لاسه ورکړل شوی عاید", fa: "برآورد درآمد ازدست‌رفته" },
  estLostRevenueExplainerNote: { en: "Estimated lost revenue = quantity requested × retail price (or catalog average for never-stocked fabrics) × times requested. It's a sizing estimate, not an exact figure.", ps: "اټکل شوی له لاسه ورکړل شوی عاید = غوښتل شوې اندازه × د پرچون نرخ (یا د کاتالوګ اوسط د هیڅکله-ذخیره شوو پارچو لپاره) × د غوښتنې ځلونه. دا د اندازې اټکل دی، نه یو دقیق شمېره.", fa: "برآورد درآمد ازدست‌رفته = مقدار درخواستی × قیمت خرده‌فروشی (یا میانگین کاتالوگ برای پارچه‌های هرگز موجود نبوده) × تعداد دفعات درخواست. این یک برآورد تقریبی است، نه رقم دقیق." },
  mostRequestedUnavailableLabel: { en: "Most requested unavailable fabrics", ps: "ترټولو ډیر غوښتل شوي غیر شتون لرونکي پارچې", fa: "پرتقاضاترین پارچه‌های ناموجود" },
  noOpenRequestsMsg: { en: "No open requests yet.", ps: "تراوسه هیڅ پرانیستې غوښتنه نشته.", fa: "هنوز درخواست باز وجود ندارد." },
  unknownColorLabel: { en: "Unknown color", ps: "نامعلوم رنګ", fa: "رنگ نامشخص" },
  unknownTypeLabel: { en: "Unknown type", ps: "نامعلوم ډول", fa: "نوع نامشخص" },
  allOpenRequestsLabel: { en: "All open requests", ps: "ټولې پرانیستې غوښتنې", fa: "همه درخواست‌های باز" },
  nothingLoggedYetMsg: { en: "Nothing logged yet.", ps: "تراوسه هیڅ شی نه دی ثبت شوی.", fa: "هنوز چیزی ثبت نشده است." },
  requestedNTimesNote: { en: "requested {n}×", ps: "{n}ځله غوښتل شوی", fa: "{n} بار درخواست‌شده" },
  lastOnDateNote: { en: "last {date}", ps: "وروستی {date}", fa: "آخرین {date}" },
  fulfilledBtn: { en: "Fulfilled", ps: "پوره شوی", fa: "برآورده‌شده" },
  requestedSwatchAlt: { en: "Requested swatch", ps: "غوښتل شوې نمونه", fa: "نمونه درخواستی" },

  // Suppliers
  suppliersTitle: { en: "Suppliers", ps: "عرضه کوونکي", fa: "تأمین‌کنندگان" },
  addSupplierBtn: { en: "Add Supplier", ps: "عرضه کوونکی اضافه کړئ", fa: "افزودن تأمین‌کننده" },
  loadingSuppliersMsg: { en: "Loading suppliers…", ps: "عرضه کوونکي لوډ کیږي…", fa: "در حال بارگذاری تأمین‌کنندگان…" },
  nameLabel: { en: "Name", ps: "نوم", fa: "نام" },
  phoneTableLabel: { en: "Phone", ps: "تلیفون", fa: "تلفن" },
  addressLabel: { en: "Address", ps: "پته", fa: "آدرس" },
  locationLabel: { en: "Location", ps: "موقعیت", fa: "موقعیت" },
  notesLabel: { en: "Notes", ps: "یادښتونه", fa: "یادداشت‌ها" },
  openInMapsLabel: { en: "Open in Maps", ps: "په نقشه کې پرانیزئ", fa: "باز کردن در نقشه" },
  noPinLabel: { en: "No pin", ps: "پن نشته", fa: "پین ندارد" },
  ownerOnlyLabel: { en: "Owner only", ps: "یوازې مالک", fa: "فقط مالک" },
  noSuppliersYetMsg: { en: "No suppliers yet.", ps: "تراوسه هیڅ عرضه کوونکی نشته.", fa: "هنوز تأمین‌کننده‌ای وجود ندارد." },
  editSupplierTitle: { en: "Edit Supplier", ps: "عرضه کوونکی سمون", fa: "ویرایش تأمین‌کننده" },
  supplierNotesPlaceholder: { en: "e.g. Good bulk discounts, quality notes…", ps: "لکه: ښه عمده تخفیفونه، د کیفیت یادښتونه…", fa: "مثلاً: تخفیف عمده خوب، یادداشت کیفیت…" },
  gpsLocationLabel: { en: "GPS location", ps: "د GPS موقعیت", fa: "موقعیت GPS" },
  gpsLocationOptionalNote: { en: "(optional, but makes them much easier to find later)", ps: "(اختیاري، مګر وروسته یې موندل خورا اسانه کوي)", fa: "(اختیاری، اما پیدا کردن بعدی را بسیار آسان‌تر می‌کند)" },
  locatingLabel: { en: "Locating…", ps: "موقعیت موندل کیږي…", fa: "در حال یافتن موقعیت…" },
  retakeLocationBtn: { en: "Retake location", ps: "بیا موقعیت واخلئ", fa: "دریافت مجدد موقعیت" },
  captureCurrentLocationBtn: { en: "Capture current location", ps: "اوسنی موقعیت ثبت کړئ", fa: "ثبت موقعیت فعلی" },
  supplierLocationHintNote: { en: "Stand at the supplier's shop/stall when you tap this — same as the GPS pin used for wholesale buyer addresses.", ps: "کله چې دې کیکاږئ د عرضه کوونکي په دوکان/سټال کې ودریږئ — د هول سیل پیرودونکو پتو لپاره د کارول شوي GPS پن په شان.", fa: "هنگام لمس این گزینه در مغازه/غرفه تأمین‌کننده باشید — مشابه پین GPS استفاده‌شده برای آدرس خریداران عمده." },
  saveChangesBtn: { en: "Save Changes", ps: "بدلونونه خوندي کړئ", fa: "ذخیره تغییرات" },
  deleteSupplierTitle: { en: "Delete this supplier?", ps: "دا عرضه کوونکی ړنګ کړم؟", fa: "این تأمین‌کننده حذف شود؟" },
  deleteSupplierBody: { en: "\"{name}\" will be permanently removed. This can't be undone.", ps: "\"{name}\" به د تل لپاره لرې شي. دا بیرته نه شي ګرځیدای.", fa: "\"{name}\" برای همیشه حذف می‌شود. این عمل قابل بازگشت نیست." },
  locationNotAvailableError: { en: "Location isn't available on this device/browser.", ps: "موقعیت پدې وسیله/براوزر کې شتون نلري.", fa: "موقعیت در این دستگاه/مرورگر در دسترس نیست." },
  couldNotGetLocationError: { en: "Couldn't get a location — check location permission and try again.", ps: "موقعیت ونه موندل شو — د موقعیت اجازه وګورئ او بیا هڅه وکړئ.", fa: "موقعیت یافت نشد — مجوز موقعیت را بررسی کرده و دوباره تلاش کنید." },

  // Purchase List
  buildingPurchaseListMsg: { en: "Building purchase list…", ps: "د پیرود لیست جوړیږي…", fa: "در حال ساخت لیست خرید…" },
  itemsToPurchaseLabel: { en: "Items to purchase", ps: "د پیرود لپاره توکي", fa: "اقلام برای خرید" },
  estimatedBudgetLabel: { en: "Estimated budget", ps: "اټکل شوی بودیجه", fa: "بودجه تخمینی" },
  addFabricManuallyLabel: { en: "Add a fabric manually", ps: "پارچه په لاسي ډول اضافه کړئ", fa: "افزودن دستی پارچه" },
  addBtn: { en: "Add", ps: "اضافه کول", fa: "افزودن" },
  clearAllManuallyAddedBtn: { en: "Clear all manually added ({n})", ps: "ټول لاسي اضافه شوي پاک کړئ ({n})", fa: "پاک کردن همه موارد افزوده‌شده دستی ({n})" },
  clearManualItemsTitle: { en: "Clear all manually added items?", ps: "ټول لاسي اضافه شوي توکي پاک کړم؟", fa: "همه موارد افزوده‌شده دستی پاک شوند؟" },
  clearManualItemsBody: { en: "This removes all {n} manually-added item(s) from the Purchase List. Automatically-suggested items (low stock, etc.) aren't affected.", ps: "دا به ټول {n} لاسي اضافه شوي توکي د پیرود لیست څخه لرې کړي. په خپلکار ډول وړاندیز شوي توکي (لږه ذخیره، او نور) اغیزمن نه کیږي.", fa: "این کار همه {n} مورد افزوده‌شده دستی را از لیست خرید حذف می‌کند. موارد پیشنهادی خودکار (موجودی کم و غیره) تحت تأثیر قرار نمی‌گیرند." },
  clearAllBtn: { en: "Clear all", ps: "ټول پاک کړئ", fa: "پاک کردن همه" },
  nothingNeedsPurchasingMsg: { en: "Nothing needs purchasing right now — no low-stock items and no open customer requests.", ps: "اوس مهال هیڅ شی د پیرود ته اړتیا نلري — نه لږه ذخیره توکي او نه پرانیستې د مشتري غوښتنې.", fa: "در حال حاضر چیزی نیاز به خرید ندارد — نه کالای کم‌موجودی و نه درخواست باز مشتری." },
  priorityLabel: { en: "Priority", ps: "لومړیتوب", fa: "اولویت" },
  reasonLabel: { en: "Reason", ps: "دلیل", fa: "دلیل" },
  suggestedQtyLabel: { en: "Suggested qty", ps: "وړاندیز شوې اندازه", fa: "مقدار پیشنهادی" },
  estBudgetLabel: { en: "Est. budget", ps: "اټکل شوی بودیجه", fa: "بودجه تخمینی" },
  preferredSupplierLabel: { en: "Preferred supplier", ps: "غوره عرضه کوونکی", fa: "تأمین‌کننده ترجیحی" },
  lastPriceLabel: { en: "Last price", ps: "وروستی نرخ", fa: "آخرین قیمت" },
  manualLabel: { en: "manual", ps: "لاسي", fa: "دستی" },
  noHistoryLabel: { en: "no history", ps: "سابقه نشته", fa: "بدون سابقه" },

  // Market Mode
  marketModeTitle: { en: "Market Mode", ps: "د بازار حالت", fa: "حالت بازار" },
  startTripBtn: { en: "Start Trip", ps: "سفر پیل کړئ", fa: "شروع سفر" },
  loadingTripsMsg: { en: "Loading trips…", ps: "سفرونه لوډ کیږي…", fa: "در حال بارگذاری سفرها…" },
  couldNotLoadTripsError: { en: "Could not load trips — check your connection and try again.", ps: "سفرونه لوډ نشول — خپل اتصال وګورئ او بیا هڅه وکړئ.", fa: "سفرها بارگذاری نشدند — اتصال خود را بررسی کرده و دوباره تلاش کنید." },
  couldNotLoadTripError: { en: "Could not load this trip — check your connection and try again.", ps: "دا سفر لوډ نشو — خپل اتصال وګورئ او بیا هڅه وکړئ.", fa: "این سفر بارگذاری نشد — اتصال خود را بررسی کرده و دوباره تلاش کنید." },
  retryBtn: { en: "Retry", ps: "بیا هڅه وکړئ", fa: "تلاش دوباره" },
  tripLabel: { en: "Trip", ps: "سفر", fa: "سفر" },
  statusLabel: { en: "Status", ps: "حالت", fa: "وضعیت" },
  startedLabel: { en: "Started", ps: "پیل شوی", fa: "شروع‌شده" },
  noTripsYetMsg: { en: "No trips yet — start one before heading to the market.", ps: "تراوسه هیڅ سفر نشته — مخکې له دې چې بازار ته لاړ شئ یو پیل کړئ.", fa: "هنوز سفری وجود ندارد — قبل از رفتن به بازار یکی را شروع کنید." },
  syncingChangesLabel: { en: "Syncing {n} change(s)…", ps: "{n} بدلونونه همغږي کیږي…", fa: "درحال همگام‌سازی {n} تغییر…" },
  offlineQueuedLabel: { en: "Offline · {n} queued", ps: "آفلاین · {n} په صف کې دي", fa: "آفلاین · {n} در صف" },
  offlineLabel: { en: "Offline", ps: "آفلاین", fa: "آفلاین" },
  marketTripDefaultName: { en: "Market trip", ps: "د بازار سفر", fa: "سفر بازار" },
  startMarketTripTitle: { en: "Start a Market Trip", ps: "د بازار سفر پیل کړئ", fa: "شروع سفر بازار" },
  tripNameLabel: { en: "Trip name", ps: "د سفر نوم", fa: "نام سفر" },
  preloadPurchaseListLabel: { en: "Pre-load with current Purchase List suggestions", ps: "د اوسني پیرود لیست وړاندیزونو سره مخکې لوډ کړئ", fa: "بارگذاری اولیه با پیشنهادات فعلی لیست خرید" },

  // Shopping Trip
  itemsSkippedNote: { en: "{n} item(s) were skipped — they were missing meters bought, price/m, or catalog details, so nothing could be added for them. Check their entries and re-close if needed.", ps: "{n} توکي پریښودل شوي — د پیرود شوي مترو، نرخ/متر، یا کتالوګ توضیحاتو نشتوالی درلود، نو د دوی لپاره هیڅ شی نشو اضافه کیدلی. د دوی داخلات وګورئ او که اړتیا وي بیا وتړئ.", fa: "{n} مورد رد شد — متر خریداری‌شده، قیمت/متر یا جزئیات کاتالوگ آن‌ها موجود نبود، پس چیزی برای آن‌ها اضافه نشد. ورودی‌های آن‌ها را بررسی کرده و در صورت نیاز دوباره ببندید." },
  tripClosedMsg: { en: "Trip closed. {n} item(s) added to inventory.", ps: "سفر وتړل شو. {n} توکي ذخیرې ته اضافه شول.", fa: "سفر بسته شد. {n} مورد به موجودی اضافه شد." },
  couldNotCloseTripError: { en: "Could not close the trip", ps: "سفر ونه تړل شو", fa: "سفر بسته نشد" },
  couldNotCloseTripGenericError: { en: "Could not close the trip — check your connection and try again.", ps: "سفر ونه تړل شو — خپل اتصال وګورئ او بیا هڅه وکړئ.", fa: "سفر بسته نشد — اتصال خود را بررسی کرده و دوباره تلاش کنید." },
  loadingTripMsg: { en: "Loading trip…", ps: "سفر لوډ کیږي…", fa: "در حال بارگذاری سفر…" },
  allTripsBtn: { en: "All trips", ps: "ټول سفرونه", fa: "همه سفرها" },
  plannedLabel: { en: "planned", ps: "پلان شوي", fa: "برنامه‌ریزی‌شده" },
  saveBtn: { en: "Save", ps: "خوندي کول", fa: "ذخیره" },
  editQtyBtn: { en: "Edit planned quantity", ps: "پلان شوې اندازه سمول", fa: "ویرایش مقدار برنامه‌ریزی‌شده" },
  totalPurchasedLabel: { en: "Total Purchased (all-time)", ps: "ټول اخیستل شوي (ټول وخت)", fa: "کل خریداری‌شده (تمام دوران)" },
  noPurchasesYetLabel: { en: "No purchases yet", ps: "تر اوسه اخیستنه نشته", fa: "هنوز خریدی ثبت نشده" },
  ratingLabel: { en: "Rating (1-10)", ps: "درجه‌بندي (۱-۱۰)", fa: "امتیاز (۱ تا ۱۰)" },
  priceTrendFlagHint: { en: "Price rising — up {pct}% on at least one fabric vs. their previous purchase", ps: "نرخ لوړیږي — لږ تر لږه په یوه پارچه کې {pct}% لوړ د پخوانۍ اخیستنې په پرتله", fa: "قیمت رو به افزایش — حداقل روی یک پارچه {pct}% نسبت به خرید قبلی بالاتر رفته است" },
  staleSupplierBadge: { en: "{n}w since last order", ps: "له وروستي امر راهیسې {n} اونۍ", fa: "{n} هفته از آخرین سفارش" },
  staleSupplierHint: { en: "It's been {n} weeks since you last bought anything from this supplier — worth a check-in.", ps: "له دې عرضه کوونکي څخه ستاسو وروستۍ اخیستنه {n} اونۍ مخکې وه — د پوښتنې وړ دی.", fa: "{n} هفته از آخرین خرید شما از این تأمین‌کننده می‌گذرد — ارزش سرزدن دارد." },
  leadTimeLabel: { en: "Lead time", ps: "د تسلیمۍ موده", fa: "زمان تحویل" },
  avgDaysLabel: { en: "~{n} days", ps: "~{n} ورځې", fa: "~{n} روز" },
  noLeadTimeDataLabel: { en: "No data yet", ps: "تر اوسه معلومات نشته", fa: "هنوز داده‌ای نیست" },
  awaitingDeliveryLabel: { en: "{n} order awaiting delivery", ps: "{n} امر د تسلیمۍ په تمه دی", fa: "{n} سفارش در انتظار تحویل" },
  markReceivedBtn: { en: "Mark received", ps: "ترلاسه شوی په نښه کړئ", fa: "دریافت‌شده" },
  logOrderBtn: { en: "+ Log order placed today", ps: "+ نن ورځ ورکړل شوی امر ثبت کړئ", fa: "+ ثبت سفارش امروز" },
  suggestedSuppliersTitle: { en: "Suggested suppliers for this trip", ps: "د دې سفر لپاره وړاندیز شوي عرضه کوونکي", fa: "تأمین‌کنندگان پیشنهادی برای این سفر" },
  suggestedSuppliersHint: { en: "Based on who you've bought these planned items from before, at the best price on record.", ps: "د دې پلان شویو توکو د پخوانۍ اخیستنې پر بنسټ، په غوره ثبت شوي نرخ.", fa: "بر اساس اینکه این اقلام برنامه‌ریزی‌شده را قبلاً از چه کسی و با بهترین قیمت ثبت‌شده خریده‌اید." },
  purchasedLabel: { en: "purchased", ps: "پیرودل شوي", fa: "خریداری‌شده" },
  partialLabel: { en: "partial", ps: "نیمګړي", fa: "جزئی" },
  unavailableLabel: { en: "unavailable", ps: "نه شتون لري", fa: "ناموجود" },
  skippedLabel: { en: "skipped", ps: "پریښودل شوي", fa: "رد‌شده" },
  remainingLabel: { en: "remaining", ps: "پاتې", fa: "باقی‌مانده" },
  shoppingListLabel: { en: "Shopping list", ps: "د پیرود لیست", fa: "لیست خرید" },
  addDiscoveredItemBtn: { en: "Add discovered item", ps: "موندل شوی توکی اضافه کړئ", fa: "افزودن مورد کشف‌شده" },
  noItemsYetMsg: { en: "No items yet.", ps: "تراوسه هیڅ توکي نشته.", fa: "هنوز موردی وجود ندارد." },
  collectionCompletionLabel: { en: "Collection completion", ps: "د ټولګې بشپړتیا", fa: "تکمیل مجموعه" },
  checkFabricTypeEllipsis: { en: "Check a fabric type…", ps: "د پارچې ډول وګورئ…", fa: "بررسی یک نوع پارچه…" },
  collectionCompletionNote: { en: "Based on colors already in the catalog for this fabric type — not a fixed \"official\" collection list.", ps: "د دې د پارچې ډول لپاره د کاتالوګ کې دمخه شتون لرونکو رنګونو پر بنسټ — نه یو ثابت \"رسمي\" ټولګه لیست.", fa: "بر اساس رنگ‌های موجود در کاتالوگ برای این نوع پارچه — نه یک فهرست مجموعه \"رسمی\" ثابت." },
  tripNotesLabel: { en: "Trip notes", ps: "د سفر یادښتونه", fa: "یادداشت‌های سفر" },
  tripNotesPlaceholder: { en: "e.g. Supplier A has better quality. Supplier B gives discounts after 20 rolls.", ps: "لکه: عرضه کوونکی A ښه کیفیت لري. عرضه کوونکی B وروسته له ۲۰ رولونو تخفیف ورکوي.", fa: "مثلاً: تأمین‌کننده A کیفیت بهتری دارد. تأمین‌کننده B بعد از ۲۰ رول تخفیف می‌دهد." },
  recheckAddRemainingBtn: { en: "Recheck & Add Remaining to Inventory", ps: "بیا وګورئ او پاتې ذخیرې ته اضافه کړئ", fa: "بازبینی و افزودن باقی‌مانده به موجودی" },
  closeTripBtn: { en: "Close Trip & Add to Inventory", ps: "سفر وتړئ او ذخیرې ته اضافه کړئ", fa: "بستن سفر و افزودن به موجودی" },
  closingTripNeedsConnectionNote: { en: "Closing a trip needs a connection — reconnect first.", ps: "د سفر تړلو لپاره اتصال ته اړتیا ده — لومړی بیا اتصال ونیسئ.", fa: "بستن سفر نیاز به اتصال دارد — ابتدا دوباره متصل شوید." },
  tripClosedFollowupNote: { en: "This trip is closed. If an item was skipped earlier (missing details), fix it below and use the button above again — already-added items won't be duplicated.", ps: "دا سفر تړل شوی دی. که مخکې یو توکی پریښودل شوی و (توضیحات یې نشتوالی درلود)، لاندې یې سم کړئ او پورته تڼۍ بیا وکاروئ — دمخه اضافه شوي توکي به تکرار نشي.", fa: "این سفر بسته شده است. اگر موردی قبلاً رد شده (جزئیات ناقص)، آن را در زیر اصلاح کرده و دوباره از دکمه بالا استفاده کنید — موارد قبلاً اضافه‌شده تکراری نخواهند شد." },

  // Shopping List Row / Add Discovered Item
  fillCatalogDetailsError: { en: "Fill in width, GSM, retail price, and SKU to add this as a new catalog product.", ps: "پلنوالی، GSM، د پرچون نرخ، او SKU ډک کړئ ترڅو دا د نوي کتالوګ محصول په توګه اضافه کړئ.", fa: "عرض، GSM، قیمت خرده‌فروشی و SKU را پر کنید تا این به‌عنوان محصول جدید کاتالوگ اضافه شود." },
  couldNotSaveGenericError: { en: "Could not save this — please try again.", ps: "دا خوندي نشو — مهرباني وکړئ بیا هڅه وکړئ.", fa: "ذخیره نشد — لطفاً دوباره تلاش کنید." },
  nMetersPlannedLabel: { en: "{n}m planned", ps: "{n}متره پلان شوی", fa: "{n} متر برنامه‌ریزی‌شده" },
  notYetInCatalogLabel: { en: "not yet in catalog", ps: "تراوسه په کتالوګ کې نشته", fa: "هنوز در کاتالوگ نیست" },
  notYetSyncedLabel: { en: "not yet synced", ps: "تراوسه همغږی نه دی شوی", fa: "هنوز همگام‌سازی نشده" },
  purchasedBtn: { en: "Purchased", ps: "پیرودل شوی", fa: "خریداری‌شده" },
  unavailableBtn: { en: "Unavailable", ps: "نه شتون لري", fa: "ناموجود" },
  skipBtn: { en: "Skip", ps: "پریښودل", fa: "رد کردن" },
  fixBtn: { en: "Fix", ps: "سمول", fa: "اصلاح" },
  metersBoughtPlaceholder: { en: "Meters bought", ps: "پیرودل شوي متره", fa: "متر خریداری‌شده" },
  supplierOptionalPlaceholder: { en: "Supplier (optional)", ps: "عرضه کوونکی (اختیاري)", fa: "تأمین‌کننده (اختیاری)" },
  suggestedLabel: { en: "suggested", ps: "وړاندیز شوی", fa: "پیشنهادی" },
  bestPriceSupplierNote: { en: "Best price previously: {name} at {price}/m", ps: "غوره نرخ مخکې: {name} په {price}/متر", fa: "بهترین قیمت قبلی: {name} با {price}/متر" },
  previousSupplierNote: { en: "Bought from {name} before", ps: "مخکې له {name} څخه اخیستل شوی", fa: "قبلاً از {name} خریداری شده" },
  notInCatalogYetNote: { en: "This wasn't already in your catalog — a few more details add it as a new product:", ps: "دا ستاسو په کتالوګ کې دمخه نه و — یو څو نور توضیحات به دا د نوي محصول په توګه اضافه کړي:", fa: "این قبلاً در کاتالوگ شما نبود — چند جزئیات دیگر آن را به‌عنوان محصول جدید اضافه می‌کند:" },
  widthCmPlaceholder: { en: "Width (cm)", ps: "پلنوالی (سانتي متره)", fa: "عرض (سانتی‌متر)" },
  gsmPlaceholder: { en: "GSM", ps: "GSM", fa: "GSM" },
  retailPricePerMeterPlaceholder: { en: "Retail price/m", ps: "د پرچون نرخ/متر", fa: "قیمت خرده‌فروشی/متر" },
  confirmBtn: { en: "Confirm", ps: "تایید", fa: "تأیید" },
  addDiscoveredProductTitle: { en: "Add Discovered Product", ps: "موندل شوی محصول اضافه کړئ", fa: "افزودن محصول کشف‌شده" },
  georgetteExamplePlaceholder: { en: "e.g. Georgette", ps: "لکه: جورجیټ", fa: "مثلاً: ژورژت" },
  quantityOfInterestLabel: { en: "Quantity of interest (meters, optional)", ps: "د لیوالتیا اندازه (متره، اختیاري)", fa: "مقدار مورد نظر (متر، اختیاری)" },
  addToListBtn: { en: "Add to List", ps: "لیست ته اضافه کړئ", fa: "افزودن به لیست" },
  ownerOnlySectionNote: { en: "This section is only available to the owner.", ps: "دا برخه یوازې مالک ته شتون لري.", fa: "این بخش فقط برای مالک در دسترس است." },
  deleteAccountBtn: { en: "Delete account", ps: "حساب ړنګول", fa: "حذف حساب" },
  saveToContactsBtn: { en: "Save to Contacts", ps: "اړیکه ثبتول", fa: "ذخیره در مخاطبین" },
  deleteWholesaleTitle: { en: "Delete this wholesale account?", ps: "دا عمده حساب ړنګ شي؟", fa: "این حساب عمده حذف شود؟" },
  deleteWholesaleBody: { en: "\"{name}\" will lose access permanently and won't be able to sign back in. This can't be undone.", ps: "\"{name}\" به تل لپاره لاسرسی له لاسه ورکړي او بیا ننوتل نشي کولی. دا بیرته نه شي کیدای.", fa: "\"{name}\" برای همیشه دسترسی را از دست می‌دهد و دیگر نمی‌تواند وارد شود. این عمل قابل بازگشت نیست." },

  statusPending: { en: "pending", ps: "په تمه", fa: "در انتظار" },
  statusApproved: { en: "approved", ps: "تاییدشوی", fa: "تأیید شده" },
  statusRejected: { en: "rejected", ps: "رد شوی", fa: "رد شده" },

  // Cart
  addToOrder: { en: "Add to order", ps: "د فرمایشاتو لیست ته یی اضافه کړئ", fa: "افزودن به لیست سفارشها" },
  addedToOrder: { en: "Added ✓", ps: "اضافه شو ✓", fa: "افزوده شد ✓" },
  orderQuick: { en: "or order this item alone:", ps: "یا یوازې د همدې جنس غوښتنه وکړی:", fa: "یا فقط همین کالا را سفارش دهید:" },
  cartTitle: { en: "Your order", ps: "ستاسو امر/فرمایش", fa: "سفارش شما" },
  cartEmpty: { en: "No items added yet. Browse fabrics and tap \"Add to order.\"", ps: "تر اوسه هیڅ جنسونه نه دي اضافه شوی. پارچې/ ټوکران وګورئ او \"د فرمایشاتو لیست ته یی اضافه کړئ\" بټن ووهی.", fa: "هنوز کالایی اضافه نشده. پارچه‌ها را مرور کنید و «افزودن به سفارش» را بزنید." },
  cartQuantity: { en: "Quantity (m)", ps: "اندازه (متره)", fa: "مقدار (متر)" },
  cartCustomQty: { en: "Custom", ps: "خاص فرمایش", fa: "سفارشی" },
  cartRemove: { en: "Remove", ps: "لرې کول", fa: "حذف" },
  cartTotal: { en: "Total", ps: "ټول", fa: "مجموع" },
  cartTotalMeters: { en: "meters", ps: "متره", fa: "متر" },
  cartMinNotice: { en: "Wholesale minimum is {min}m per color — items below this will be flagged when you send.", ps: "د عمده پلور لږترلږه اندازه د هر رنګ لپاره {min}متره ده — هغه جنسونه به د فرمایش پر وخت په نښه سي چي له دې اندازي څخه کم دي.", fa: "حداقل عمده {min} متر برای هر رنگ است — کالاهای کمتر از این هنگام ارسال علامت‌گذاری می‌شوند." },
  belowMinimum: { en: "Below {min}m minimum", ps: "تاسو دا جنس له {min}متره کم انتخاب کړی", fa: "این جنس را کمتر از {min} متر انتخاب کردید" },
  sendViaWhatsapp: { en: "Send order via WhatsApp", ps: "امر/فرمایش د وټساپ له لارې واستوی", fa: "ارسال سفارش از طریق واتساپ" },
  cartClear: { en: "Clear order", ps: "فرمایش پاک کړئ", fa: "پاک کردن سفارش" },
  viewOrder: { en: "View order", ps: "فرمایش وګورئ", fa: "مشاهده سفارش" },
  continueBrowsing: { en: "Continue browsing", ps: "د نورو ټوکرانو لټون ته دوام ورکړئ", fa: "ادامه مرور برای تکه های دیګر" },

  // Auth — staff/admin
  staffLogin: { en: "Staff Login", ps: "د کارکوونکو ننوتل", fa: "ورود کارکنان" },
  staffLoginTitle: { en: "Staff sign in", ps: "د کارکوونکو ننوتل", fa: "ورود کارکنان" },
  staffLoginSub: { en: "For shop owner and staff access only.", ps: "یوازې د دوکان مالک او کارکوونکو د لاسرسي لپاره.", fa: "فقط برای دسترسی مالک و کارکنان مغازه." },
  usernameLabel: { en: "Username", ps: "کارن نوم (یوزر نېم)", fa: "نام کاربری (یوزرنیم)" },
  passwordLabel: { en: "Password", ps: "پټ نوم", fa: "رمز عبور" },
  signIn: { en: "Sign in", ps: "ننوتل", fa: "ورود" },
  signOut: { en: "Sign out", ps: "وتل", fa: "خروج" },
  loginError: { en: "Incorrect username or password.", ps: "ناسم کارن نوم یا پټ نوم.", fa: "نام کاربری یا رمز عبور اشتباه است." },
  roleOwner: { en: "Owner", ps: "مالک", fa: "مالک" },
  roleStaff: { en: "Staff", ps: "کارکوونکی", fa: "کارمند" },
  staffNoPermission: { en: "Only the shop owner can approve or reject wholesale accounts.", ps: "یوازې د دوکان مالک کولی شي د عمده پلور حسابونه تایید یا رد کړي.", fa: "فقط مالک مغازه می‌تواند حساب‌های عمده را تأیید یا رد کند." },
  setPasswordOnApprove: { en: "Set a login password for this buyer", ps: "د دې پیرودونکي لپاره د ننوتلو پټنوم وټاکئ", fa: "رمز عبور ورود برای این خریدار تنظیم کنید" },
  passwordPlaceholder: { en: "Choose a password", ps: "پټنوم وټاکئ", fa: "یک رمز عبور انتخاب کنید" },
  approveAndSetPassword: { en: "Approve & set password", ps: "تایید او پټ نوم ټاکل", fa: "تأیید و تنظیم رمز عبور" },
  loginCredentialsSet: { en: "Login: phone {phone}, password set", ps: "ننوتل: تلیفون {phone}، پټ نوم ټاکل شوی", fa: "ورود: تلفن {phone}، رمز عبور تنظیم شد" },

  // Auth — wholesale buyer
  wholesaleLogin: { en: "Wholesale Login", ps: "د عمده پلور ننوتل", fa: "ورود عمده" },
  wholesaleLoginTitle: { en: "Wholesale buyer sign in", ps: "د عمده پیرودونکي ننوتل", fa: "ورود خریدار عمده" },
  wholesaleLoginSub: { en: "For approved wholesale accounts. New here?", ps: "د تایید شوو عمده حسابونو لپاره. نوی یاست؟", fa: "برای حساب‌های عمده تأیید شده. تازه‌کار هستید؟" },
  requestAccessLink: { en: "Request wholesale access", ps: "د عمده لاسرسي غوښتنه", fa: "درخواست دسترسی عمده" },
  phoneNumberLabel: { en: "Phone number", ps: "د تلیفون شمېره", fa: "شماره تلفن" },
  wholesaleLoginError: { en: "No approved account found with that phone and password.", ps: "د دې تلیفون او پټ نوم سره هیڅ تایید شوی حساب ونه موندل شو.", fa: "هیچ حساب تأیید شده‌ای با این تلفن و رمز عبور یافت نشد." },
  loggedInAs: { en: "Logged in as", ps: "ننوتلی په توګه", fa: "وارد شده به عنوان" },
  wholesaleAccessLocked: { en: "Wholesale pricing is only visible to approved buyers.", ps: "د عمده پلور نرخونه یوازې تایید شوو پیرودونکو ته ښکاره دي.", fa: "قیمت‌های عمده فقط برای خریداران تأیید شده قابل مشاهده است." },

  // Wholesale signup — password + errors
  choosePassword: { en: "Choose a password", ps: "پټ نوم وټاکئ", fa: "یک رمز عبور انتخاب کنید" },
  choosePasswordPlaceholder: { en: "For logging in later", ps: "د راتلونکي ننوتلو لپاره", fa: "برای ورود بعدی" },
  phoneAlreadyRegistered: { en: "This phone number is already registered.", ps: "دا د تلیفون شمېره دمخه ثبت شوې ده.", fa: "این شماره تلفن قبلاً ثبت شده است." },
  passwordTooShort: { en: "Password must be at least 6 characters.", ps: "پټنوم باید لږ تر لږه ۶ توري ولري.", fa: "رمز عبور باید حداقل ۶ کاراکتر باشد." },
  signupFailed: { en: "Something went wrong — please try again.", ps: "یو څه غلط شول — بیا هڅه وکړئ.", fa: "مشکلی پیش آمد — لطفاً دوباره تلاش کنید." },
  loadingText: { en: "Loading…", ps: "بارول کیږي (په تمه شی)…", fa: "در حال بارگذاری (منتظر باشید)…" },
  receiptsTitle: { en: "Receipts", ps: "رسیدونه", fa: "رسیدها" },
  saveReceiptBtn: { en: "Save as Image", ps: "د انځور په توګه خوندي کړئ", fa: "ذخیره به‌صورت تصویر" },
  receiptsSearchPlaceholder: { en: "Search by invoice #, customer name, or phone…", ps: "د رسید شمېره، د پیرودونکي نوم، یا شمېره ولټوئ…", fa: "جستجو با شماره فاکتور، نام یا شماره مشتری…" },
  invoiceLabel: { en: "Invoice", ps: "رسید", fa: "فاکتور" },
  dateLabel: { en: "Date", ps: "نېټه", fa: "تاریخ" },
  customerLabel: { en: "Customer", ps: "پیرودونکی", fa: "مشتری" },
  walkInLabel: { en: "Walk-in", ps: "ناڅاپي پیرودونکی", fa: "مشتری حضوری" },
  noReceiptsMsg: { en: "No receipts match that search.", ps: "دې لټون سره هیڅ رسید سمون نه خوري.", fa: "هیچ رسیدی با این جستجو مطابقت ندارد." },
  sendReceiptWhatsAppBtn: { en: "Send via WhatsApp", ps: "د WhatsApp له لارې ولېږئ", fa: "ارسال از طریق واتساپ" },
  receiptWhatsAppNote: { en: "Here's your receipt {invoice} — see attached.", ps: "دا ستاسو رسید {invoice} دی — منسلکه وګورئ.", fa: "این رسید شما {invoice} است — پیوست را ببینید." },

  // Contact / business address section
  navContact: { en: "Contact", ps: "اړیکه", fa: "تماس" },
  contactTitle: { en: "Visit or contact us", ps: "زموږ دوکان له نږدې وګوری یا اړیکه ونیسئ", fa: "ما را ملاقات یا با ما تماس بگیرید" },
  contactSub: { en: "Come see the fabrics in person, or reach out directly.", ps: "ټوکر مخامخ وګوری، یا مستقیم اړیکه ونیسئ.", fa: "پارچه‌ها را حضوری ببینید یا مستقیماً تماس بگیرید." },
  ourAddress: { en: "Our address", ps: "زموږ آدرس", fa: "آدرس ما" },
  openInMapsBtn: { en: "Open in Maps", ps: "په نقشه کې خلاص کړئ", fa: "باز کردن در نقشه" },
  chatOnWhatsapp: { en: "Chat on WhatsApp", ps: "په وټساپ کې پیغام ولېږئ", fa: "چت در واتساپ" },
  callUs: { en: "Call us", ps: "موږ ته زنګ ووهئ", fa: "با ما تماس بگیرید" },
  addressPlaceholderNote: { en: "Placeholder address — update SHOP_INFO in the code with your real location.", ps: "دا یوه بیلګه پته ده — کوډ کې SHOP_INFO د خپلې ریښتینې پتې سره تازه کړئ.", fa: "این یک آدرس نمونه است — SHOP_INFO را در کد با موقعیت واقعی خود به‌روزرسانی کنید." },
};

function useTranslation(lang) {
  return (key, vars) => {
    let str = STRINGS[key]?.[lang] ?? STRINGS[key]?.en ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.replace(`{${k}}`, v);
      });
    }
    return str;
  };
}

const LanguageContext = createContext({ lang: "en", t: (k) => k, dir: "ltr" });
const useLang = () => useContext(LanguageContext);


// ---------------------------------------------------------------------------
// COLOR SCIENCE — hex -> LAB -> Delta E (CIE76), the industry-standard method
// for perceptual color matching (used by textile/paint companies). Plain RGB
// distance looks close on screen but misleads on real fabric matches.
// ---------------------------------------------------------------------------

function hexToRgb(hex) {
  const m = hex.replace("#", "").match(/.{1,2}/g);
  return { r: parseInt(m[0], 16), g: parseInt(m[1], 16), b: parseInt(m[2], 16) };
}

function rgbToXyz({ r, g, b }) {
  let [rr, gg, bb] = [r, g, b].map((v) => {
    v = v / 255;
    return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92;
  });
  rr *= 100; gg *= 100; bb *= 100;
  return {
    x: rr * 0.4124 + gg * 0.3576 + bb * 0.1805,
    y: rr * 0.2126 + gg * 0.7152 + bb * 0.0722,
    z: rr * 0.0193 + gg * 0.1192 + bb * 0.9505,
  };
}

function xyzToLab({ x, y, z }) {
  const ref = { x: 95.047, y: 100.0, z: 108.883 }; // D65 reference white
  let [xr, yr, zr] = [x / ref.x, y / ref.y, z / ref.z].map((v) =>
    v > 0.008856 ? Math.pow(v, 1 / 3) : 7.787 * v + 16 / 116
  );
  return { l: 116 * yr - 16, a: 500 * (xr - yr), b: 200 * (yr - zr) };
}

function hexToLab(hex) {
  return xyzToLab(rgbToXyz(hexToRgb(hex)));
}

// CIE76 Delta-E: 0 = identical, ~1 = imperceptible, ~2-3 = noticeable to a
// trained eye, ~5+ = clearly different, 10+ = different colors entirely.
function deltaE(lab1, lab2) {
  return Math.sqrt(
    Math.pow(lab1.l - lab2.l, 2) +
    Math.pow(lab1.a - lab2.a, 2) +
    Math.pow(lab1.b - lab2.b, 2)
  );
}

// Convert Delta-E into a friendly match % + label for shop staff to read at
// a glance. Non-linear so small (meaningful) differences spread out more
// than large ones. Returns a translation key rather than a hardcoded label
// since this is a plain function, not a component (can't use hooks here).
function matchScore(de) {
  const pct = Math.max(0, Math.round(100 * Math.exp(-de / 9)));
  let labelKey, cls;
  if (de < 1) { labelKey = "matchExact"; cls = "match-exact"; }
  else if (de < 3) { labelKey = "matchExcellent"; cls = "match-excellent"; }
  else if (de < 6) { labelKey = "matchGood"; cls = "match-good"; }
  else if (de < 12) { labelKey = "matchFair"; cls = "match-fair"; }
  else { labelKey = "matchPoor"; cls = "match-poor"; }
  return { pct, labelKey, cls, de };
}

// Extract the dominant/average color from an uploaded photo of a fabric
// swatch by sampling pixels from the center region of the image (avoids
// shadows/edges near the border of a typical close-up photo).
function extractDominantColor(imageEl) {
  const canvas = document.createElement("canvas");
  const size = 60;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const sx = imageEl.naturalWidth * 0.25;
  const sy = imageEl.naturalHeight * 0.25;
  const sw = imageEl.naturalWidth * 0.5;
  const sh = imageEl.naturalHeight * 0.5;
  ctx.drawImage(imageEl, sx, sy, sw, sh, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  let r = 0, g = 0, b = 0, count = 0;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i]; g += data[i + 1]; b += data[i + 2];
    count++;
  }
  r = Math.round(r / count); g = Math.round(g / count); b = Math.round(b / count);
  const toHex = (v) => v.toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ---------------------------------------------------------------------------
// WHATSAPP ORDER MESSAGE — a wa.me link only pre-fills ONE text message, so
// multi-item orders are built as a single formatted message listing every
// line item, rather than trying to send items one at a time.
// ---------------------------------------------------------------------------

function buildWhatsAppOrderUrl(items, mode, buyerLabel) {
  const lines = items.map(
    (item, i) =>
      `${i + 1}. ${item.product.colorName} (${item.product.fabricType}, ${item.product.width}") — SKU: ${item.product.sku} — ${item.qty}m`
  );
  const totalMeters = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const header = mode === "wholesale" ? "New Wholesale Order" : "New Order";
  const messageParts = [
    header + (buyerLabel ? ` — ${buyerLabel}` : ""),
    "",
    ...lines,
    "",
    `Total: ${totalMeters}m`,
  ];
  const text = encodeURIComponent(messageParts.join("\n"));
  return `https://wa.me/${SHOP_WHATSAPP_NUMBER}?text=${text}`;
}

// ---------------------------------------------------------------------------
// SAMPLE DATA — mirrors the real data model: FabricType -> Colors -> Variants
// Note: actual product/account data now comes from src/lib/api.js (either
// Supabase or the local offline layer) — see the useEffect data loading in
// the app shell below. Only static config constants live here.
// ---------------------------------------------------------------------------

const FABRIC_TYPES = ["Cotton", "Georgette", "Crepe", "Chiffon", "Silk", "Linen"];

const WHOLESALE_MIN_METERS = 30;

// Retail customers can legitimately want less than a full meter (a 50cm or
// 25cm swatch-sized cut is normal for this shop), so retail quantities
// allow quarter-meter fractions. Wholesale stays whole-meter — bulk orders
// aren't cut in fractions.
const RETAIL_MIN_METERS = 0.25;
const RETAIL_QTY_STEP = 0.25;

// Currency symbol used throughout pricing display — Afghan Afghani.
const CURRENCY_SYMBOL = "؋";

// Shop's WhatsApp number for order messages — replace with the real shop
// number. Format: country code + number, no spaces/dashes/plus sign.
const SHOP_WHATSAPP_NUMBER = "+93704050709";

// Shop details shown on the Contact page.
const SHOP_INFO = {
  addressLine: "ګرشک  بازار، د چوک شمال طرف ته، د ډاکټر نوراحمد کوڅه، نوی میوند مارکیټ",
  addressArea: "د حاجي قدرت الله ریحان دوکان",
  lat: 31.818011,
  lng: 64.569962,
  whatsappDisplay: "+93704050709",
  phoneDisplay: "0704050709",
};

// Quantity presets shown as quick-tap buttons in the cart, per pricing mode.
const QTY_PRESETS = {
  retail: [0.25, 0.5, 1, 3, 5],
  wholesale: [30, 60, 90],
};

// ---------------------------------------------------------------------------
// RECEIPT IMAGE — draws a sale onto a plain <canvas> and exports it as a
// PNG the owner/staff can save/share (e.g. over WhatsApp) as an image,
// rather than a PDF or print dialog. Deliberately hand-drawn with the
// Canvas 2D API instead of a screenshot/html2canvas library — no extra
// dependency, works fully offline (this app is a PWA), and gives pixel-
// perfect control over a fixed receipt layout regardless of screen size.
// ---------------------------------------------------------------------------

function receiptLineTotal(item) {
  return Number(item.meters) * Number(item.unitPrice) - Number(item.discount || 0);
}

function buildReceiptCanvas(receipt) {
  const { invoiceNumber, soldAt, customerName, customerPhone, items, discountTotal, paymentMethod, paymentStatus, amountPaid } = receipt;
  const width = 460;
  const padding = 28;
  const rowHeight = 24;
  const headerHeight = 190; // shop name/address + invoice/customer block
  const itemsHeaderHeight = 26;
  const footerHeight = paymentStatus === "partial" ? 180 : 140; // totals + payment + thank-you (partial adds Paid/Remaining rows)
  const height = headerHeight + itemsHeaderHeight + items.length * rowHeight + footerHeight;

  const canvas = document.createElement("canvas");
  const scale = 2; // draw at 2x and scale down via CSS-less sizing, for a crisp image on high-DPI phone screens
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = "#fffdf9";
  ctx.fillRect(0, 0, width, height);

  let y = padding;
  ctx.textBaseline = "top";

  // Shop name + address
  ctx.fillStyle = "#1f1a15";
  ctx.font = "bold 20px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Raihan Fabrics", width / 2, y);
  y += 26;
  ctx.font = "12px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#7a7166";
  ctx.fillText(SHOP_INFO.addressArea, width / 2, y);
  y += 16;
  ctx.fillText(SHOP_INFO.phoneDisplay, width / 2, y);
  y += 22;

  // Dashed divider
  function dashedLine(yPos) {
    ctx.strokeStyle = "#d8cfc0";
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(padding, yPos);
    ctx.lineTo(width - padding, yPos);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  dashedLine(y);
  y += 16;

  // Invoice # / date
  ctx.textAlign = "left";
  ctx.fillStyle = "#1f1a15";
  ctx.font = "bold 13px monospace";
  ctx.fillText(invoiceNumber || "—", padding, y);
  ctx.textAlign = "right";
  ctx.font = "12px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#7a7166";
  const dateStr = new Date(soldAt || Date.now()).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  ctx.fillText(dateStr, width - padding, y);
  y += 20;

  if (customerName || customerPhone) {
    ctx.textAlign = "left";
    ctx.fillStyle = "#4a4237";
    ctx.font = "12px 'Segoe UI', sans-serif";
    ctx.fillText([customerName, customerPhone].filter(Boolean).join(" · "), padding, y);
    y += 20;
  }

  dashedLine(y);
  y += 14;

  // Items header
  ctx.font = "bold 11px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#7a7166";
  ctx.textAlign = "left";
  ctx.fillText("ITEM", padding, y);
  ctx.textAlign = "right";
  ctx.fillText("TOTAL", width - padding, y);
  y += itemsHeaderHeight;

  // Item rows
  for (const item of items) {
    ctx.textAlign = "left";
    ctx.font = "13px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#1f1a15";
    ctx.fillText(`${item.colorName} — ${item.fabricType}`, padding, y);
    ctx.font = "11px monospace";
    ctx.fillStyle = "#7a7166";
    ctx.fillText(`SKU ${item.sku || "—"} · ${item.meters}m × ${CURRENCY_SYMBOL}${item.unitPrice}`, padding, y + 14);
    ctx.textAlign = "right";
    ctx.font = "13px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#1f1a15";
    ctx.fillText(`${CURRENCY_SYMBOL}${Math.round(receiptLineTotal(item)).toLocaleString()}`, width - padding, y);
    y += rowHeight;
  }

  dashedLine(y);
  y += 14;

  const subtotal = items.reduce((s, i) => s + receiptLineTotal(i), 0);
  const total = Math.max(0, subtotal - Number(discountTotal || 0));

  function totalsRow(label, value, bold, color) {
    ctx.textAlign = "left";
    ctx.font = bold ? "bold 14px 'Segoe UI', sans-serif" : "12px 'Segoe UI', sans-serif";
    ctx.fillStyle = color || (bold ? "#1f1a15" : "#7a7166");
    ctx.fillText(label, padding, y);
    ctx.textAlign = "right";
    ctx.fillText(`${CURRENCY_SYMBOL}${Math.round(value).toLocaleString()}`, width - padding, y);
    y += bold ? 22 : 18;
  }
  if (Number(discountTotal) > 0) {
    totalsRow("Subtotal", subtotal, false);
    totalsRow("Discount", -Number(discountTotal), false);
  }
  totalsRow("TOTAL", total, true);
  y += 6;

  if (paymentStatus === "partial") {
    const paid = Number(amountPaid || 0);
    const remaining = Math.max(0, total - paid);
    totalsRow("Paid", paid, false);
    totalsRow("Remaining", remaining, true, "#b3492f");
    y += 4;
  }

  const statusLabel = { paid: "Paid in full", partial: "Partially paid", unpaid: "Unpaid — on credit" }[paymentStatus] || paymentStatus;
  ctx.textAlign = "left";
  ctx.font = "12px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#7a7166";
  ctx.fillText(`${paymentMethod || ""} · ${statusLabel}`, padding, y);
  y += 26;

  dashedLine(y);
  y += 16;
  ctx.textAlign = "center";
  ctx.font = "italic 12px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#7a7166";
  ctx.fillText("Thank you for your business", width / 2, y);

  return canvas;
}

function downloadCanvasAsPng(canvas, filename) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, "image/png");
}

function downloadReceiptImage(receipt) {
  const canvas = buildReceiptCanvas(receipt);
  downloadCanvasAsPng(canvas, `${receipt.invoiceNumber || "receipt"}.png`);
}

// Normalizes a locally-typed Afghan number (however staff entered it while
// recording a sale — "0704050709", "704050709", with spaces/dashes, etc.)
// into the digits-only, country-code-prefixed form wa.me links need. Best
// effort, not validation — an already-international number ("+93…" or
// "93…") passes through untouched.
function normalizePhoneForWhatsApp(phone) {
  const digits = String(phone || "").replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.startsWith("93")) return digits;
  if (digits.startsWith("0")) return "93" + digits.slice(1);
  return digits;
}

// A wholesale account's phone number doubles as its WhatsApp contact (see
// CreditLedger's "Send Balance" button), so a locally-dialed 10-digit
// number — e.g. "0701234567" — is normalized to international form —
// "+93701234567" — right at signup. Only applied to that exact shape (10
// digits, leading 0); anything already international or an unusual
// length is left exactly as typed rather than guessed at.
function normalizeWholesalePhone(phone) {
  const trimmed = String(phone || "").trim();
  const digits = trimmed.replace(/[^\d]/g, "");
  if (digits.length === 10 && digits.startsWith("0")) {
    return "+93" + digits.slice(1);
  }
  return trimmed;
}

// Builds a downloadable .vcf (vCard) contact file and hands it to the
// browser's normal download flow. There's no web/PWA API that can write
// straight into a phone's contacts — a website silently doing that would
// be a serious privacy hole — so this is the closest real equivalent:
// the person taps the downloaded file and their phone's own "Add
// Contact" screen opens, pre-filled with these details for them to
// review and save. CATEGORIES is included as a best-effort "group" tag —
// Android's Google Contacts shows it as a label, but iOS Contacts
// ignores it on import, since there's no vCard field every phone treats
// as a group the same way.
function downloadVCard({ fullName, orgName, phone, addressLine, note, category }) {
  const esc = (s) => String(s || "").replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const lines = ["BEGIN:VCARD", "VERSION:3.0", `N:;${esc(fullName)};;;`, `FN:${esc(fullName)}`];
  if (orgName) lines.push(`ORG:${esc(orgName)}`);
  if (phone) lines.push(`TEL;TYPE=CELL:${normalizeWholesalePhone(phone)}`);
  if (addressLine) lines.push(`ADR;TYPE=WORK:;;${esc(addressLine)};;;;`);
  if (note) lines.push(`NOTE:${esc(note)}`);
  if (category) lines.push(`CATEGORIES:${esc(category)}`);
  lines.push("END:VCARD");
  const blob = new Blob([lines.join("\r\n")], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(fullName || "contact").replace(/[^\w\-]+/g, "_")}.vcf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// Sends a receipt image to a customer over WhatsApp — as close as a plain
// web app can get to this without the paid, approval-gated WhatsApp
// Business API. Two paths:
//   1. Web Share API with a file (works on most mobile browsers, and this
//      is a PWA so it's installed like a native app there): opens the
//      native share sheet with the receipt image already attached — the
//      person picks WhatsApp, then picks the contact themselves. This is
//      the best available flow; the platform doesn't let a web page pick
//      a specific WhatsApp contact automatically.
//   2. Fallback (desktop, or a mobile browser without file-sharing
//      support): downloads the receipt image AND opens the customer's
//      WhatsApp chat pre-filled with a short note, so the image can be
//      attached by hand in two taps instead of hunting for the chat.
function sendReceiptViaWhatsApp(receipt, fallbackNoteText) {
  const canvas = buildReceiptCanvas(receipt);
  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], `${receipt.invoiceNumber || "receipt"}.png`, { type: "image/png" });
    const shareData = { files: [file], title: receipt.invoiceNumber || "Receipt" };
    if (navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if (err?.name === "AbortError") return; // person cancelled the share sheet — not an error
      }
    }
    downloadCanvasAsPng(canvas, `${receipt.invoiceNumber || "receipt"}.png`);
    const waNumber = normalizePhoneForWhatsApp(receipt.customerPhone);
    if (waNumber) {
      window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(fallbackNoteText)}`, "_blank");
    }
  }, "image/png");
}

// ---------------------------------------------------------------------------
// SHARED UI BITS
// ---------------------------------------------------------------------------

function StockBadge({ meters }) {
  const { t } = useLang();
  let label, cls;
  if (meters === 0) { label = t("outOfStock"); cls = "stock-out"; }
  else if (meters < 20) { label = t("lowStock", { n: meters }); cls = "stock-low"; }
  else { label = t("inStock", { n: meters }); cls = "stock-ok"; }
  return <span className={`stock-badge ${cls}`}>{label}</span>;
}

function SwatchTile({ product, mode, onOpen }) {
  return (
    <button className="swatch-tile" onClick={() => onOpen(product)}>
      <span className="swatch-color" style={{ background: product.hex }}>
        {product.photoUrl && <img src={product.photoUrl} alt="" className="swatch-photo" loading="lazy" />}
      </span>
      <span className="swatch-meta">
        <span className="swatch-name">{product.colorName}</span>
        <span className="swatch-sub">
          {product.fabricType} · {product.width}"
        </span>
        <span className="swatch-price">
          {mode === "wholesale"
            ? `${CURRENCY_SYMBOL}${product.wholesalePrice}/m`
            : `${CURRENCY_SYMBOL}${product.retailPrice}/m`}
        </span>
      </span>
    </button>
  );
}

function ProductDrawer({ product, mode, onClose, onAddToCart, cartQty }) {
  const { t } = useLang();
  const [added, setAdded] = useState(false);
  if (!product) return null;
  const price = mode === "wholesale" ? product.wholesalePrice : product.retailPrice;
  const minQty = mode === "wholesale" ? WHOLESALE_MIN_METERS : 1;

  function handleAddToCart() {
    onAddToCart(product, minQty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  function handleQuickOrder() {
    const url = buildWhatsAppOrderUrl([{ product, qty: minQty }], mode);
    window.open(url, "_blank");
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <button className="drawer-close" onClick={onClose}><X size={18} /></button>
        <div className="drawer-hero" style={{ background: product.hex }}>
          {product.photoUrl ? (
            <img src={product.photoUrl} alt="" className="drawer-hero-photo" />
          ) : (
            <div className="drawer-hero-texture" />
          )}
        </div>
        <div className="drawer-body">
          <p className="eyebrow">{product.fabricType} · {product.sku}</p>
          <h2>{product.colorName}</h2>
          <div className="spec-row">
            <span><Ruler size={14} /> {product.width}" {t("widthLabel")}</span>
            <span><Layers size={14} /> {product.gsm} GSM</span>
            <span><Droplets size={14} /> {t("handWash")}</span>
          </div>
          <StockBadge meters={product.stockMeters} />

          <div className="price-block">
            <span className="price-big">{CURRENCY_SYMBOL}{price}<span className="price-unit">{t("perMeter")}</span></span>
            {mode === "wholesale" && (
              <span className="price-note">{t("wholesaleTierNote")} {minQty}m {t("order")}</span>
            )}
          </div>

          <div className="drawer-actions">
            <button className="btn btn-primary" disabled={product.stockMeters === 0} onClick={handleAddToCart}>
              <Plus size={15} /> {added ? t("addedToOrder") : cartQty ? `${t("addToOrder")} (${cartQty}m ${t("cartTotalMeters")})` : t("addToOrder")}
            </button>
            {mode === "retail" && (
              <button className="btn btn-ghost">{t("orderSwatchCard", { cur: CURRENCY_SYMBOL })}</button>
            )}
            <div className="drawer-quick-order">
              <span className="drawer-quick-label">{t("orderQuick")}</span>
              <button className="btn btn-ghost btn-sm" disabled={product.stockMeters === 0} onClick={handleQuickOrder}>
                {t("orderWhatsapp", { min: minQty })}
              </button>
            </div>
          </div>
          <p className="drawer-footnote">
            {t("colorDisclaimer")}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// STOREFRONT VIEW
// ---------------------------------------------------------------------------

function Storefront({ products, mode, setMode, cart, onAddToCart, canToggleWholesale, onWholesaleLoginClick }) {
  const { t } = useLang();
  const [activeType, setActiveType] = useState("All");
  const [query, setQuery] = useState("");
  const [openProduct, setOpenProduct] = useState(null);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesType = activeType === "All" || p.fabricType === activeType;
      const matchesQuery =
        query.trim() === "" ||
        p.colorName.toLowerCase().includes(query.toLowerCase()) ||
        p.fabricType.toLowerCase().includes(query.toLowerCase());
      return matchesType && matchesQuery;
    });
  }, [products, activeType, query]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((p) => {
      if (!map[p.fabricType]) map[p.fabricType] = [];
      map[p.fabricType].push(p);
    });
    return map;
  }, [filtered]);

  return (
    <div className="storefront">
      <header className="hero">
        <div className="hero-text">
          <p className="eyebrow">{t("heroEyebrow")}</p>
          <h1>{t("heroTitle")}</h1>
          <p className="hero-sub">
            {mode === "wholesale" ? t("heroSubWholesale") : t("heroSubRetail")}
          </p>
        </div>
        <div className="hero-strip">
          {products.slice(0, 10).map((p) => (
            <span key={p.id} className="hero-chip" style={{ background: p.hex }} />
          ))}
        </div>
      </header>

      <div className="toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            placeholder={t("searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {canToggleWholesale ? (
          <div className="mode-toggle">
            <button className={mode === "retail" ? "active" : ""} onClick={() => setMode("retail")}>
              <Store size={14} /> {t("retail")}
            </button>
            <button className={mode === "wholesale" ? "active" : ""} onClick={() => setMode("wholesale")}>
              <ShieldCheck size={14} /> {t("wholesale")}
            </button>
          </div>
        ) : (
          <button className="wholesale-login-prompt" onClick={onWholesaleLoginClick}>
            <ShieldCheck size={14} /> {t("wholesaleLogin")}
          </button>
        )}
      </div>

      <div className="type-tabs">
        <button className={activeType === "All" ? "active" : ""} onClick={() => setActiveType("All")}>{t("all")}</button>
        {FABRIC_TYPES.map((ft) => (
          <button key={ft} className={activeType === ft ? "active" : ""} onClick={() => setActiveType(ft)}>
            {ft}
          </button>
        ))}
      </div>

      {mode === "wholesale" && (
        <div className="wholesale-banner">
          <ShieldCheck size={16} />
          {t("wholesaleBanner")}
        </div>
      )}

      {Object.keys(grouped).length === 0 && (
        <p className="empty-state">{t("noResults")}</p>
      )}

      {Object.entries(grouped).map(([type, items]) => (
        <section key={type} className="chapter">
          <div className="chapter-head">
            <h3>{type}</h3>
            <span className="chapter-count">{items.length} {t("colors")}</span>
          </div>
          <div className="swatch-grid">
            {items.map((p) => (
              <SwatchTile key={p.id} product={p} mode={mode} onOpen={setOpenProduct} />
            ))}
          </div>
        </section>
      ))}

      <ProductDrawer
        product={openProduct}
        mode={mode}
        onClose={() => setOpenProduct(null)}
        onAddToCart={onAddToCart}
        cartQty={openProduct ? cart.find((i) => i.product.id === openProduct.id)?.qty : null}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// MATCH A SWATCH — staff-facing tool. A customer brings in a physical fabric
// piece; staff either photograph it or pick its color, and every product in
// stock is ranked by Delta-E perceptual closeness.
// ---------------------------------------------------------------------------

function MatchResultRow({ product, score, mode, onOpen }) {
  const { t } = useLang();
  return (
    <button className="match-row" onClick={() => onOpen(product)}>
      <span className="match-swatch" style={{ background: product.hex }} />
      <span className="match-info">
        <span className="match-name">{product.colorName}</span>
        <span className="match-sub">{product.fabricType} · {product.width}" · {product.sku}</span>
      </span>
      <span className="match-stock"><StockBadge meters={product.stockMeters} /></span>
      <span className={`match-score ${score.cls}`}>
        <span className="match-pct">{score.pct}%</span>
        <span className="match-label">{t(score.labelKey)}</span>
      </span>
      <span className="match-price">
        {mode === "wholesale" ? `${CURRENCY_SYMBOL}${product.wholesalePrice}/m` : `${CURRENCY_SYMBOL}${product.retailPrice}/m`}
      </span>
      <ChevronRight size={16} className="match-arrow" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// CAMERA CAPTURE — live viewfinder with a center guide frame and a basic
// brightness check, so staff get instant feedback if the shot is too dark/
// too bright before it's used for color extraction (bad lighting is the
// #1 cause of bad matches, more than the matching math itself).
// ---------------------------------------------------------------------------

function assessBrightness(imageEl) {
  const canvas = document.createElement("canvas");
  const size = 40;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const sx = imageEl.naturalWidth ? imageEl.naturalWidth * 0.25 : 0;
  const sy = imageEl.naturalHeight ? imageEl.naturalHeight * 0.25 : 0;
  const sw = imageEl.naturalWidth ? imageEl.naturalWidth * 0.5 : imageEl.videoWidth;
  const sh = imageEl.naturalHeight ? imageEl.naturalHeight * 0.5 : imageEl.videoHeight;
  ctx.drawImage(imageEl, sx, sy, sw, sh, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  let sum = 0, count = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
    count++;
  }
  const avg = sum / count;
  if (avg < 60) return { level: "dark", labelKey: "lightTooDark", cls: "light-bad" };
  if (avg > 205) return { level: "bright", labelKey: "lightOverexposed", cls: "light-bad" };
  if (avg < 90 || avg > 180) return { level: "borderline", labelKey: "lightBorderline", cls: "light-warn" };
  return { level: "good", labelKey: "lightGood", cls: "light-good" };
}

function CameraCapture({ onCapture, onClose }) {
  const { t } = useLang();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [brightness, setBrightness] = useState(null);
  const [frozen, setFrozen] = useState(null);

  React.useEffect(() => {
    let active = true;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment", width: 640, height: 480 } })
      .then((s) => {
        if (!active) { s.getTracks().forEach((t) => t.stop()); return; }
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setError(t("cameraUnavailable")));
    return () => {
      active = false;
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (!videoRef.current || frozen) return;
    const interval = setInterval(() => {
      if (videoRef.current && videoRef.current.videoWidth > 0) {
        setBrightness(assessBrightness(videoRef.current));
      }
    }, 500);
    return () => clearInterval(interval);
  }, [frozen]);

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setFrozen(dataUrl);
    stream?.getTracks().forEach((t) => t.stop());
  }

  function retake() {
    setFrozen(null);
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment", width: 640, height: 480 } })
      .then((s) => {
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setError(t("cameraUnavailable")));
  }

  function confirm() {
    onCapture(frozen);
    onClose();
  }

  return (
    <div className="camera-backdrop" onClick={onClose}>
      <div className="camera-modal" onClick={(e) => e.stopPropagation()}>
        <button className="drawer-close" onClick={onClose}><X size={18} /></button>
        <h3>{t("captureTitle")}</h3>
        <p className="camera-tip">{t("captureTip")}</p>

        <div className="camera-viewport">
          {error && <div className="camera-error">{error}</div>}
          {!error && !frozen && (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
              <div className="camera-guide-frame" />
              {brightness && (
                <div className={`camera-brightness ${brightness.cls}`}>{t(brightness.labelKey)}</div>
              )}
            </>
          )}
          {frozen && <img src={frozen} alt="Captured swatch" className="camera-video" />}
        </div>

        <canvas ref={canvasRef} style={{ display: "none" }} />

        <div className="camera-actions">
          {!frozen ? (
            <button className="btn btn-primary" onClick={capture} disabled={!!error}>
              <Camera size={16} /> {t("captureBtn")}
            </button>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={retake}>{t("retakeBtn")}</button>
              <button className="btn btn-primary" onClick={confirm}>{t("usePhotoBtn")}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SwatchMatcher({ products, mode, onOpen, currentUser }) {
  const { t } = useLang();
  const [targetHex, setTargetHex] = useState("#C9A29A");
  const [uploadedImg, setUploadedImg] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [inStockOnly, setInStockOnly] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef(null);
  const imgRef = useRef(null);

  // AI matching (Phase 6) is opt-in, not automatic: Delta-E color matching
  // is instant and fully client-side, so it stays the default experience.
  // AI matching needs a real photo and a server round-trip, so it's
  // triggered explicitly once a photo exists, rather than silently
  // replacing the fast path on every interaction.
  const [aiResults, setAiResults] = useState(null); // null = not tried; array = AI results; also tracks aiAvailable
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUploadedImg(url);
    setUploadedFile(file);
    setAiResults(null);
    setAiError(null);
  }

  function handleImgLoad() {
    if (imgRef.current) {
      const extracted = extractDominantColor(imgRef.current);
      setTargetHex(extracted);
    }
  }

  async function handleTryAiMatch() {
    setAiLoading(true);
    setAiError(null);
    try {
      let queryImageUrl = null;
      if (uploadedFile && api.isBackendLive) {
        // The Edge Function fetches the image server-side, so it needs a
        // reachable URL, not the raw file — upload it to Storage first
        // (reusing the fabric-photos bucket's upload path pattern, tagged
        // as a query rather than a catalog photo).
        queryImageUrl = await api.uploadFabricPhoto(uploadedFile, "query");
      }
      const result = await api.matchFabric({ queryImageUrl, queryHex: targetHex, inStockOnly, products });
      setAiResults(result);
    } catch (err) {
      setAiError(err.message || "AI matching failed — showing color-only results instead.");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSelectMatch(product, rank) {
    if (!aiResults) return;
    try {
      await api.recordMatchFeedback({
        selectedFabricId: product.id,
        selectedRank: rank,
        aiScore: aiResults.results.find((r) => r.fabricId === product.id)?.score ?? null,
        createdBy: currentUser?.id,
      });
    } catch {
      // Feedback recording is best-effort — never block opening the product over it.
    }
    onOpen(product);
  }

  const targetLab = useMemo(() => hexToLab(targetHex), [targetHex]);

  const deltaEResults = useMemo(() => {
    return products
      .filter((p) => !inStockOnly || p.stockMeters > 0)
      .map((p) => {
        const de = deltaE(targetLab, hexToLab(p.hex));
        return { product: p, score: matchScore(de) };
      })
      .sort((a, b) => a.score.de - b.score.de);
  }, [products, targetLab, inStockOnly]);

  // When AI results exist, re-rank the same product list using the hybrid
  // score instead of pure Delta-E — but keep using matchScore()'s
  // Delta-E-derived label/percent for display, since that's still the
  // most interpretable "how close is this color" figure for a merchant,
  // even when AI similarity picked the ordering.
  const ranked = useMemo(() => {
    if (!aiResults) return deltaEResults;
    const scoreByFabric = Object.fromEntries(aiResults.results.map((r) => [r.fabricId, r]));
    return deltaEResults
      .filter((row) => scoreByFabric[row.product.id])
      .sort((a, b) => scoreByFabric[b.product.id].score - scoreByFabric[a.product.id].score);
  }, [deltaEResults, aiResults]);

  const best = ranked[0];

  return (
    <div className="matcher">
      <div className="matcher-intro">
        <p className="eyebrow">{t("matcherEyebrow")}</p>
        <h1>{t("matcherTitle")}</h1>
        <p className="hero-sub">
          {t("matcherSub")}
        </p>
      </div>

      <div className="matcher-input-card">
        <div className="matcher-target">
          <div className="target-preview" style={{ background: targetHex }}>
            {!uploadedImg && <Pipette size={22} className="target-icon" />}
          </div>
          <div className="target-controls">
            <label className="mini-label">{t("referenceColor")}</label>
            <div className="hex-input-row">
              <input
                type="color"
                value={targetHex}
                onChange={(e) => setTargetHex(e.target.value)}
                className="color-picker"
              />
              <input
                type="text"
                value={targetHex}
                onChange={(e) => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && setTargetHex(e.target.value)}
                className="hex-text"
                spellCheck={false}
              />
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCamera(true)}>
                <Camera size={14} /> {t("cameraBtn")}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => fileInputRef.current?.click()}>
                <Upload size={14} /> {t("uploadBtn")}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
            </div>
            {uploadedImg && (
              <p className="matcher-hint">
                <Sparkles size={12} /> {t("autoExtractHint")}
              </p>
            )}
          </div>
        </div>

        {uploadedImg && (
          <img
            ref={imgRef}
            src={uploadedImg}
            alt="Uploaded swatch"
            onLoad={handleImgLoad}
            className="matcher-uploaded-img"
          />
        )}

        {uploadedImg && (
          <div className="ai-match-control">
            <button className="btn btn-ghost btn-sm" onClick={handleTryAiMatch} disabled={aiLoading}>
              {aiLoading ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />} Try AI visual match
            </button>
            {aiResults && aiResults.aiAvailable && (
              <span className="ai-status ai-status-on"><Sparkles size={12} /> AI matching active</span>
            )}
            {aiResults && !aiResults.aiAvailable && (
              <span className="ai-status ai-status-off">AI matching not available for these fabrics yet — showing color-only results.</span>
            )}
            {aiError && <span className="ai-status ai-status-off">{aiError}</span>}
          </div>
        )}

        <label className="stock-filter">
          <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
          {t("stockOnlyFilter")}
        </label>
      </div>

      {best && (
        <div className={`best-match-banner ${best.score.cls}`}>
          <span className="best-match-swatch" style={{ background: best.product.hex }} />
          <span>
            {t("closestMatch")} <strong>{best.product.colorName}</strong> ({best.product.fabricType}) —{" "}
            <strong>{best.score.pct}% {t("matchWord")}</strong>, {t(best.score.labelKey).toLowerCase()}.
          </span>
        </div>
      )}

      <div className="match-results">
        <div className="match-results-head">
          <span>{t("colFabric")}</span>
          <span></span>
          <span>{t("colStock")}</span>
          <span>{t("colMatch")}</span>
          <span>{t("colPrice")}</span>
          <span></span>
        </div>
        {ranked.map(({ product, score }, i) => (
          <MatchResultRow key={product.id} product={product} score={score} mode={mode} onOpen={aiResults ? (p) => handleSelectMatch(p, i + 1) : onOpen} />
        ))}
      </div>

      {showCamera && (
        <CameraCapture
          onCapture={(dataUrl) => setUploadedImg(dataUrl)}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WHOLESALE ACCOUNT REQUEST — B2B signup. Structured address + GPS pin so
// deliveries always find the exact shop, not just a general area.
// ---------------------------------------------------------------------------

function emptyWholesaleForm() {
  return {
    businessName: "", ownerName: "", phone: "", password: "",
    address: { line: "", landmark: "", lat: null, lng: null },
  };
}

function WholesaleRequestForm({ onSubmitted }) {
  const { t } = useLang();
  const [form, setForm] = useState(emptyWholesaleForm());
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  function setAddr(field, value) {
    setForm((f) => ({ ...f, address: { ...f.address, [field]: value } }));
  }

  function captureLocation() {
    setLocating(true);
    setLocError(null);
    if (!navigator.geolocation) {
      setLocError(t("geoUnavailable"));
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setAddr("lat", pos.coords.latitude);
        setAddr("lng", pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setLocError(t("geoFailed"));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  async function submit() {
    if (!form.businessName || !form.ownerName || !form.phone || !form.password) return;
    if (form.password.length < 6) {
      setSubmitError(t("passwordTooShort"));
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.wholesaleSignUp({ ...form, phone: normalizeWholesalePhone(form.phone) });
      setSubmitted(true);
      onSubmitted?.();
    } catch (err) {
      setSubmitError(err.message === "phone_already_registered" ? t("phoneAlreadyRegistered") : t("signupFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="matcher">
        <div className="wholesale-confirm">
          <ShieldCheck size={32} />
          <h2>{t("requestSent")}</h2>
          <p>{t("requestSentBody", { name: form.businessName })}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="matcher">
      <div className="matcher-intro">
        <p className="eyebrow">{t("wholesaleEyebrow")}</p>
        <h1>{t("wholesaleFormTitle")}</h1>
        <p className="hero-sub">
          {t("wholesaleFormSub")}
        </p>
      </div>

      <div className="matcher-input-card wholesale-form">
        <h4><Building2 size={15} /> {t("businessDetails")}</h4>
        <div className="form-row">
          <label>{t("businessName")}
            <input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} placeholder={t("businessNamePlaceholder")} />
          </label>
          <label>{t("ownerName")}
            <input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} placeholder={t("fullName")} />
          </label>
        </div>
        <div className="form-row">
          <label>{t("phoneLabel")}
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+93 …" />
          </label>
          <label>{t("choosePassword")}
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={t("choosePasswordPlaceholder")} />
          </label>
        </div>

        <h4 style={{ marginTop: 8 }}><MapPin size={15} /> {t("shopAddress")}</h4>
        <label>{t("addressLine")}
          <input value={form.address.line} onChange={(e) => setAddr("line", e.target.value)} placeholder={t("addressLinePlaceholder")} />
        </label>
        <label>{t("landmark")} <span className="optional">{t("landmarkHint")}</span>
          <input value={form.address.landmark} onChange={(e) => setAddr("landmark", e.target.value)} placeholder={t("landmarkPlaceholder")} />
        </label>

        <div className="geo-capture">
          <button type="button" className="btn btn-ghost btn-sm" onClick={captureLocation} disabled={locating}>
            <MapPin size={14} /> {locating ? t("pinLocating") : form.address.lat ? t("pinRetake") : t("pinLocationBtn")}
          </button>
          {form.address.lat && (
            <span className="geo-confirmed"><Check size={13} /> {form.address.lat.toFixed(5)}, {form.address.lng.toFixed(5)}</span>
          )}
          {locError && <span className="geo-error">{locError}</span>}
          <p className="matcher-hint" style={{ marginTop: 8 }}>
            <Sparkles size={12} /> {t("geoHint")}
          </p>
        </div>

        {submitError && <p className="auth-error" style={{ marginTop: 12 }}>{submitError}</p>}

        <button className="btn btn-primary" onClick={submit} disabled={submitting} style={{ marginTop: 18 }}>
          {submitting ? <Loader2 size={15} className="spin" /> : null} {t("submitForReview")}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WHOLESALE ACCOUNTS — admin approval queue
// ---------------------------------------------------------------------------

function WholesaleAccountCard({ account, onApprove, onReject, onDeleteRequest, canManage, busy }) {
  const { t } = useLang();
  const mapUrl = account.address.lat
    ? `https://www.google.com/maps?q=${account.address.lat},${account.address.lng}`
    : null;
  const statusKey = { pending: "statusPending", approved: "statusApproved", rejected: "statusRejected" }[account.status];

  return (
    <div className={`wholesale-card status-${account.status}`}>
      <div className="wholesale-card-top">
        <div>
          <h4>{account.businessName}</h4>
          <p className="wholesale-owner">{account.ownerName} · {account.phone}</p>
        </div>
        <span className={`status-pill status-${account.status}`}>
          {account.status === "pending" && <Clock size={12} />}
          {account.status === "approved" && <Check size={12} />}
          {account.status === "rejected" && <XCircle size={12} />}
          {t(statusKey)}
        </span>
      </div>

      <div className="wholesale-address">
        <MapPin size={14} />
        <div>
          <p>{account.address.line}{account.address.landmark ? `, ${account.address.landmark}` : ""}</p>
          {mapUrl ? (
            <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="map-link">{t("openInMaps")} <ChevronRight size={12} /></a>
          ) : (
            <span className="no-pin">{t("noPinCaptured")}</span>
          )}
        </div>
      </div>

      {account.status === "pending" && !canManage && (
        <p className="staff-no-permission">{t("staffNoPermission")}</p>
      )}

      {account.status === "pending" && canManage && (
        <div className="wholesale-actions">
          <button className="btn btn-primary btn-sm" onClick={() => onApprove(account.id)} disabled={busy}>
            {busy ? <Loader2 size={14} className="spin" /> : t("approveBtn")}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onReject(account.id)} disabled={busy}>{t("rejectBtn")}</button>
        </div>
      )}

      {/* Delete is available regardless of status (pending, approved, or
          rejected) — an owner may want to remove any of these, e.g. a
          rejected spam signup or a former buyer who's no longer a
          customer. Owner-only, same gate as approve/reject. */}
      {canManage && (
        <div className="wholesale-actions" style={{ marginTop: account.status === "pending" ? 6 : 12 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => downloadVCard({
              fullName: account.ownerName,
              orgName: account.businessName,
              phone: account.phone,
              addressLine: account.address.line + (account.address.landmark ? `, ${account.address.landmark}` : ""),
              category: "Raihan Fabrics Wholesalers",
            })}
          >
            <Contact size={13} /> {t("saveToContactsBtn")}
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => onDeleteRequest(account)} disabled={busy}>
            <Trash2 size={13} /> {t("deleteAccountBtn")}
          </button>
        </div>
      )}
    </div>
  );
}

function WholesaleAdmin({ accounts, canManage, onApprove, onReject, onDelete, loading }) {
  const { t } = useLang();
  const [busyId, setBusyId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function approve(id) {
    setBusyId(id);
    try { await onApprove(id); } finally { setBusyId(null); }
  }
  async function reject(id) {
    setBusyId(id);
    try { await onReject(id); } finally { setBusyId(null); }
  }
  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await onDelete(pendingDelete.id);
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="admin">
        <p className="loading-state"><Loader2 size={16} className="spin" /> {t("loadingText")}</p>
      </div>
    );
  }

  const pending = accounts.filter((a) => a.status === "pending");
  const approved = accounts.filter((a) => a.status === "approved");
  const rejected = accounts.filter((a) => a.status === "rejected");

  return (
    <div className="admin">
      <div className="admin-stats">
        <div className="stat-card warn">
          <span className="stat-label">{t("pendingReview")}</span>
          <span className="stat-value">{pending.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">{t("approvedBuyers")}</span>
          <span className="stat-value">{approved.length}</span>
        </div>
        <div className="stat-card danger">
          <span className="stat-label">{t("rejected")}</span>
          <span className="stat-value">{rejected.length}</span>
        </div>
      </div>

      {pending.length > 0 && (
        <>
          <h3 className="section-title">{t("pendingRequests")}</h3>
          <div className="wholesale-grid">
            {pending.map((a) => (
              <WholesaleAccountCard key={a.id} account={a} onApprove={approve} onReject={reject} onDeleteRequest={setPendingDelete} canManage={canManage} busy={busyId === a.id} />
            ))}
          </div>
        </>
      )}

      <h3 className="section-title">{t("approvedBuyers")}</h3>
      <div className="wholesale-grid">
        {approved.map((a) => (
          <WholesaleAccountCard key={a.id} account={a} onApprove={approve} onReject={reject} onDeleteRequest={setPendingDelete} canManage={canManage} busy={busyId === a.id} />
        ))}
        {approved.length === 0 && <p className="empty-state">{t("noApprovedBuyers")}</p>}
      </div>

      {rejected.length > 0 && (
        <>
          <h3 className="section-title">{t("rejected")}</h3>
          <div className="wholesale-grid">
            {rejected.map((a) => (
              <WholesaleAccountCard key={a.id} account={a} onApprove={approve} onReject={reject} onDeleteRequest={setPendingDelete} canManage={canManage} busy={busyId === a.id} />
            ))}
          </div>
        </>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={t("deleteWholesaleTitle")}
          body={t("deleteWholesaleBody", { name: pendingDelete.businessName })}
          confirmLabel={t("deleteConfirmBtn")}
          cancelLabel={t("cancelBtn")}
          busy={deleting}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CREDIT LEDGER — fully manual, deliberately decoupled from Record Sale
// (see schema_v11_credit_ledger_manual.sql). Every entry — an account
// borrowing more, or paying some back — is typed in by hand here; nothing
// about recording a sale (or its payment_status) touches this balance.
// Running balance is computed client-side from the transaction log, not
// stored: sum(charge amounts) - sum(payment amounts).
// ---------------------------------------------------------------------------
function CreditLedger({ accounts, currentUser }) {
  const { t } = useLang();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openAccountId, setOpenAccountId] = useState(null); // account whose transaction history drawer is open
  const [txForm, setTxForm] = useState({ type: "charge", amount: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [txError, setTxError] = useState(null);
  const [sendingBalanceFor, setSendingBalanceFor] = useState(null);
  const [settleTarget, setSettleTarget] = useState(null); // account pending settle-balance confirmation, or null
  const [settlePassword, setSettlePassword] = useState("");
  const [settling, setSettling] = useState(false);
  const [settleError, setSettleError] = useState(null);
  const isOwner = currentUser?.role === "owner";

  function load() {
    setLoading(true);
    api.fetchAccountTransactions().then(setTransactions).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  // Same reasoning as the top-level products subscription: this tab
  // already refetches after actions taken here — this covers an entry
  // logged from another device/tab while this one is open.
  useEffect(() => {
    let timer = null;
    const unsubscribe = api.subscribeToTableChanges(["account_transactions"], () => {
      clearTimeout(timer);
      timer = setTimeout(() => { api.fetchAccountTransactions().then(setTransactions); }, 400);
    });
    return () => { clearTimeout(timer); unsubscribe(); };
  }, []);

  // Chronological running balance per account — charges add, payments
  // subtract. Kept in ascending date order so "running balance at this
  // point" reads naturally top-to-bottom; the on-screen history and the
  // WhatsApp summary both reverse/slice from this as needed.
  const ledgerByAccount = useMemo(() => {
    const byAccount = {};
    for (const tx of transactions) {
      const accountId = tx.wholesaleAccountId ?? tx.wholesale_account_id;
      if (!accountId) continue;
      (byAccount[accountId] = byAccount[accountId] || []).push({
        type: tx.type,
        amount: Number(tx.amount),
        occurredAt: tx.occurredAt ?? tx.occurred_at,
        notes: tx.notes,
      });
    }
    const result = {};
    for (const [accountId, list] of Object.entries(byAccount)) {
      const sorted = list.slice().sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt));
      let running = 0;
      const withBalance = sorted.map((tx) => {
        running += tx.type === "charge" ? tx.amount : -tx.amount;
        return { ...tx, runningBalance: running };
      });
      result[accountId] = { transactions: withBalance, balance: running };
    }
    return result;
  }, [transactions]);

  const approvedAccounts = accounts.filter((a) => a.status === "approved");
  const accountsWithBalance = approvedAccounts
    .map((a) => ({ ...a, ledger: ledgerByAccount[a.id] || { balance: 0, transactions: [] } }))
    .sort((a, b) => b.ledger.balance - a.ledger.balance);
  const totalOwed = accountsWithBalance.reduce((s, a) => s + Math.max(0, a.ledger.balance), 0);

  async function submitTransaction(accountId) {
    setTxError(null);
    const amount = Number(txForm.amount);
    if (!amount || amount <= 0) {
      setTxError(t("paymentAmountError"));
      return;
    }
    setSaving(true);
    try {
      const tx = await api.logAccountTransaction(accountId, {
        type: txForm.type,
        amount,
        notes: txForm.notes || null,
        recordedBy: currentUser?.id,
      });
      setTransactions((prev) => [...prev, tx]);
      setTxForm((prev) => ({ type: prev.type, amount: "", notes: "" }));
    } catch (err) {
      setTxError(err?.message || t("paymentGenericError"));
    } finally {
      setSaving(false);
    }
  }

  // Builds a Pashto-language summary of the last (up to) 10 transactions
  // and opens it pre-filled in the account's own WhatsApp chat, so the
  // buyer can read it and confirm back. Deliberately hardcoded to Pashto
  // regardless of which language the staff member's own UI is set to —
  // this message is for the buyer, not the person sending it. Plain
  // Gregorian dates on purpose (no Hijri/Shamsi conversion — same scope
  // decision as everywhere else date-related in this app).
  function sendBalanceViaWhatsApp(account) {
    const ledger = ledgerByAccount[account.id];
    const waNumber = normalizePhoneForWhatsApp(account.phone);
    if (!waNumber) return;
    setSendingBalanceFor(account.id);
    try {
      const last10 = (ledger?.transactions || []).slice(-10);
      const lines = last10.map((tx) => {
        const label = tx.type === "charge" ? "پور" : "تادیه شوی";
        const sign = tx.type === "charge" ? "+" : "−";
        return `${tx.occurredAt} — ${label}: ${sign}${Math.round(tx.amount).toLocaleString()}؋ (پاتې: ${Math.round(tx.runningBalance).toLocaleString()}؋)`;
      });
      const currentBalance = ledger?.balance || 0;
      const message = [
        `د ${account.businessName} د حساب لنډیز`,
        "",
        ...(lines.length > 0 ? lines : ["تر اوسه هیڅ ثبت شوی معامله نشته."]),
        "",
        `اوسنی پاتې بیه: ${Math.round(currentBalance).toLocaleString()}؋`,
        "",
        "مهرباني وکړئ دا معلومات تایید کړئ.",
      ].join("\n");
      window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`, "_blank");
    } finally {
      setSendingBalanceFor(null);
    }
  }

  // Re-checking the owner's own password (rather than, say, a plain "are
  // you sure?") is the confirmation step here — it's the only destructive
  // action in the app that erases history outright rather than
  // archiving/reversing it, so it gets a stronger gate.
  async function confirmSettleBalance() {
    setSettleError(null);
    if (!settlePassword) {
      setSettleError(t("passwordRequiredError"));
      return;
    }
    setSettling(true);
    try {
      await api.staffSignIn(currentUser.username, settlePassword);
      await api.deleteAccountTransactionsForAccount(settleTarget.id);
      setTransactions((prev) => prev.filter((tx) => (tx.wholesaleAccountId ?? tx.wholesale_account_id) !== settleTarget.id));
      setSettleTarget(null);
      setSettlePassword("");
    } catch (err) {
      setSettleError(err?.message === "invalid_credentials" ? t("incorrectPasswordError") : (err?.message || t("paymentGenericError")));
    } finally {
      setSettling(false);
    }
  }

  if (loading) {
    return (
      <div className="admin">
        <p className="loading-state"><Loader2 size={16} className="spin" /> {t("loadingText")}</p>
      </div>
    );
  }

  return (
    <div className="admin">
      <div className="admin-toolbar">
        <h3>{t("creditLedgerTitle")}</h3>
      </div>
      <p className="dim" style={{ fontSize: "0.82rem", marginTop: -6, marginBottom: 14 }}>{t("creditLedgerManualNote")}</p>
      <div className="admin-stats">
        <div className={totalOwed > 0 ? "stat-card warn" : "stat-card"}>
          <span className="stat-label">{t("totalOwedLabel")}</span>
          <span className="stat-value">{CURRENCY_SYMBOL}{Math.round(totalOwed).toLocaleString()}</span>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t("businessNameLabel")}</th>
              <th>{t("phoneTableLabel")}</th>
              <th>{t("balanceOwedLabel")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {accountsWithBalance.map((a) => (
              <React.Fragment key={a.id}>
                <tr>
                  <td>{a.businessName}</td>
                  <td className="mono">{a.phone}</td>
                  <td className={a.ledger.balance > 0 ? "mono danger" : "mono"}>
                    {CURRENCY_SYMBOL}{Math.round(a.ledger.balance).toLocaleString()}
                  </td>
                  <td className="ledger-row-actions">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => sendBalanceViaWhatsApp(a)}
                      disabled={sendingBalanceFor === a.id}
                      title={t("sendBalanceBtn")}
                    >
                      <MessageCircle size={13} /> {t("sendBalanceBtn")}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => { setOpenAccountId(openAccountId === a.id ? null : a.id); setTxError(null); }}
                    >
                      {openAccountId === a.id ? t("hideBtn") : t("viewLedgerBtn")}
                    </button>
                    {isOwner && (
                      <button
                        className="btn btn-ghost btn-sm btn-danger-text"
                        onClick={() => { setSettleTarget(a); setSettlePassword(""); setSettleError(null); }}
                        title={t("settleBalanceBtn")}
                      >
                        <Eraser size={13} /> {t("settleBalanceBtn")}
                      </button>
                    )}
                  </td>
                </tr>
                {openAccountId === a.id && (
                  <tr>
                    <td colSpan={4}>
                      <div className="ledger-detail">
                        {a.ledger.transactions.length === 0 ? (
                          <p className="dim">{t("noLedgerActivityMsg")}</p>
                        ) : (
                          <ul className="ledger-transactions">
                            {a.ledger.transactions.slice().reverse().map((tx, i) => (
                              <li key={i} className={tx.type === "charge" ? "danger" : "ok"}>
                                <span>{new Date(tx.occurredAt).toLocaleDateString()}</span>
                                <span>{tx.type === "charge" ? t("chargeLabel") : t("paymentReceivedLabel")}{tx.notes ? ` — ${tx.notes}` : ""}</span>
                                <span className="mono">{tx.type === "charge" ? "+" : "−"}{CURRENCY_SYMBOL}{Math.round(tx.amount).toLocaleString()}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        <div className="ledger-payment-form">
                          <select value={txForm.type} onChange={(e) => setTxForm({ ...txForm, type: e.target.value })}>
                            <option value="charge">{t("txTypeCharge")}</option>
                            <option value="payment">{t("txTypePayment")}</option>
                          </select>
                          <input
                            type="number"
                            min="1"
                            placeholder={t("amountLabel")}
                            value={txForm.amount}
                            onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                            style={{ maxWidth: 120 }}
                          />
                          <input
                            placeholder={t("notesOptional")}
                            value={txForm.notes}
                            onChange={(e) => setTxForm({ ...txForm, notes: e.target.value })}
                          />
                          <button className="btn btn-primary btn-sm" onClick={() => submitTransaction(a.id)} disabled={saving}>
                            {saving ? <Loader2 size={13} className="spin" /> : t("addEntryBtn")}
                          </button>
                        </div>
                        {txError && <p className="form-error">{txError}</p>}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {accountsWithBalance.length === 0 && (
              <tr><td colSpan={4} className="dim" style={{ textAlign: "center", padding: 20 }}>{t("noApprovedAccountsMsg")}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {settleTarget && (
        <div className="confirm-backdrop" onClick={() => { if (!settling) { setSettleTarget(null); setSettlePassword(""); setSettleError(null); } }}>
          <div className="confirm-card" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
            <h3>{t("settleBalanceTitle")}</h3>
            <p>{t("settleBalanceBody", { name: settleTarget.businessName })}</p>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "0.82rem", fontWeight: 600, color: "var(--ink-soft)", marginTop: 4 }}>
              <span><KeyRound size={13} style={{ verticalAlign: "-2px" }} /> {t("confirmPasswordLabel")}</span>
              <input
                type="password"
                value={settlePassword}
                onChange={(e) => setSettlePassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") confirmSettleBalance(); }}
                autoFocus
              />
            </label>
            {settleError && <p className="form-error">{settleError}</p>}
            <div className="confirm-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => { setSettleTarget(null); setSettlePassword(""); setSettleError(null); }} disabled={settling}>
                {t("cancelBtn")}
              </button>
              <button className="btn btn-danger btn-sm" onClick={confirmSettleBalance} disabled={settling}>
                {settling ? <Loader2 size={14} className="spin" /> : null} {t("settleBalanceConfirmBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// can never destroy data outright. Deliberately separate from the sliding
// `.drawer` used for forms — a confirmation is a quick yes/no, not a form,
// so it gets its own compact centered card instead.
// ---------------------------------------------------------------------------
function ConfirmDialog({ title, body, confirmLabel, cancelLabel, onConfirm, onCancel, busy, error }) {
  return (
    <div className="confirm-backdrop" onClick={onCancel}>
      <div className="confirm-card" onClick={(e) => e.stopPropagation()} role="alertdialog" aria-modal="true">
        <h3>{title}</h3>
        <p>{body}</p>
        {error && <p className="form-error">{error}</p>}
        <div className="confirm-actions">
          <button className="btn btn-ghost btn-sm" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm} disabled={busy}>
            {busy ? <Loader2 size={14} className="spin" /> : null} {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ADMIN VIEW
// ---------------------------------------------------------------------------

function AdminPanel({ products, loading, onAdd, onUpdate, onDelete, onRestore, canEdit = true, canDelete = true, isOwner = false }) {
  const { t } = useLang();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null); // the product about to be deleted, or null
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [archivedNotice, setArchivedNotice] = useState(null); // the fabric just archived (instead of deleted), or null
  const [restoringId, setRestoringId] = useState(null);
  const [showArchived, setShowArchived] = useState(false); // owner-only archive view — see below

  function emptyForm() {
    return { fabricType: "Cotton", colorName: "", hex: "#C9A29A", width: 44, gsm: 100, retailPrice: "", wholesalePrice: "", stockMeters: "", sku: "", photoUrl: "" };
  }

  function startAdd() {
    setForm(emptyForm());
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(p) {
    if (!canEdit) return;
    setForm({ ...p });
    setEditingId(p.id);
    setSaveError(null);
    setShowForm(true);
  }

  async function save() {
    if (!form.colorName || !form.sku) return;
    if (editingId && !canEdit) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        ...form,
        width: Number(form.width),
        gsm: Number(form.gsm),
        retailPrice: Number(form.retailPrice),
        wholesalePrice: Number(form.wholesalePrice),
        // Meters in stock can be fractional (e.g. 45.5m off a bolt), so this
        // is a plain float, not rounded to a whole number.
        stockMeters: Number(form.stockMeters),
      };
      if (editingId) {
        await onUpdate(editingId, payload);
      } else {
        await onAdd(payload);
      }
      setShowForm(false);
    } catch (err) {
      // Previously a failed save (e.g. a permissions error, or a stock
      // value the database rejected) failed silently — the drawer just sat
      // there with no feedback and nothing changed. Surface it instead.
      setSaveError(err?.message || "Could not save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function requestRemove(product) {
    if (!canDelete) return;
    setDeleteError(null);
    setPendingDelete(product);
  }

  async function confirmRemove() {
    if (!pendingDelete || !canDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const result = await onDelete(pendingDelete.id);
      if (result?.archived) setArchivedNotice(pendingDelete);
      setPendingDelete(null);
    } catch (err) {
      setDeleteError(err?.message || "Could not delete this item. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  async function restore(product) {
    setRestoringId(product.id);
    try {
      await onRestore?.(product.id);
    } finally {
      setRestoringId(null);
    }
  }

  const activeOnly = products.filter((p) => p.isActive !== false);
  const archivedOnly = products.filter((p) => p.isActive === false);
  const archivedCount = archivedOnly.length;
  const totalMeters = activeOnly.reduce((sum, p) => sum + Number(p.stockMeters || 0), 0);
  const lowStock = activeOnly.filter((p) => p.stockMeters > 0 && p.stockMeters < 20).length;
  const outStock = activeOnly.filter((p) => p.stockMeters === 0).length;

  // Adds a fabric straight from Inventory to the Purchase List, using the
  // same persisted-manual-items mechanism the Purchase List screen itself
  // uses (see MANUAL_PURCHASE_ITEMS_KEY below) — so it shows up there
  // immediately, survives a refresh, and feeds a Market Mode trip seeded
  // from the Purchase List, without Inventory needing to know anything
  // about pricing/priority scoring itself.
  const [addedToPurchaseListId, setAddedToPurchaseListId] = useState(null);
  function addToPurchaseList(product) {
    const current = readPersistedManualFabricIds();
    if (!current.includes(product.id)) {
      writePersistedManualFabricIds([...current, product.id]);
    }
    setAddedToPurchaseListId(product.id);
    setTimeout(() => setAddedToPurchaseListId((id) => (id === product.id ? null : id)), 1800);
  }

  if (loading) {
    return (
      <div className="admin">
        <p className="loading-state"><Loader2 size={16} className="spin" /> {t("loadingText")}</p>
      </div>
    );
  }

  return (
    <div className="admin">
      <div className="admin-stats">
        <div className="stat-card">
          <span className="stat-label">{t("totalSkus")}</span>
          <span className="stat-value">{activeOnly.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">{t("metersInStock")}</span>
          <span className="stat-value">{totalMeters.toLocaleString()}m</span>
        </div>
        <div className="stat-card warn">
          <span className="stat-label">{t("lowStockLabel")}</span>
          <span className="stat-value">{lowStock}</span>
        </div>
        <div className="stat-card danger">
          <span className="stat-label">{t("outOfStockLabel")}</span>
          <span className="stat-value">{outStock}</span>
        </div>
      </div>

      {archivedNotice && (
        <p className="form-error" style={{ background: "var(--warn-bg, #fff7e6)", borderColor: "var(--warn, #d99a1b)" }}>
          {t("archivedInsteadOfDeleted", { name: `${archivedNotice.colorName} — ${archivedNotice.fabricType}` })}
          {" "}
          <button className="btn btn-ghost btn-sm" onClick={() => setArchivedNotice(null)} style={{ marginInlineStart: 8 }}>{t("dismissBtn")}</button>
        </p>
      )}

      <div className="admin-toolbar">
        <h3>{t("inventory")}</h3>
        <button className="btn btn-primary" onClick={startAdd}><Plus size={15} /> {t("addFabric")}</button>
      </div>

      {!canEdit && !canDelete && (
        <p className="dim" style={{ fontSize: "0.82rem", marginTop: -4, marginBottom: 12 }}>
          {t("staffInventoryLimitNote")}
        </p>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>{t("tableColor")}</th>
              <th>{t("tableFabric")}</th>
              <th>{t("tableSku")}</th>
              <th>{t("tableWidth")}</th>
              <th>{t("tableRetail")}</th>
              <th>{t("tableWholesale")}</th>
              <th>{t("tableStock")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {activeOnly.map((p) => {
              return (
                <tr key={p.id}>
                  <td><span className="table-swatch" style={{ background: p.hex }}>{p.photoUrl && <img src={p.photoUrl} alt="" className="table-swatch-photo" loading="lazy" />}</span></td>
                  <td>{p.colorName}</td>
                  <td>{p.fabricType}</td>
                  <td className="mono">{p.sku}</td>
                  <td>{p.width}"</td>
                  <td>{CURRENCY_SYMBOL}{p.retailPrice}</td>
                  <td>{CURRENCY_SYMBOL}{p.wholesalePrice}</td>
                  <td><StockBadge meters={Number(p.stockMeters)} /></td>
                  <td className="row-actions">
                    <button
                      onClick={() => addToPurchaseList(p)}
                      disabled={addedToPurchaseListId === p.id}
                      aria-label={t("addToPurchaseListBtn")}
                      title={t("addToPurchaseListBtn")}
                    >
                      {addedToPurchaseListId === p.id ? <Check size={14} /> : <ShoppingCart size={14} />}
                    </button>
                    {canEdit && (
                      <button onClick={() => startEdit(p)}><Pencil size={14} /></button>
                    )}
                    {canDelete && (
                      <button onClick={() => requestRemove(p)} aria-label={t("deleteConfirmBtn")}><Trash2 size={14} /></button>
                    )}
                    {!canEdit && !canDelete && <span className="dim" style={{ fontSize: "0.78rem" }}></span>}
                  </td>
                </tr>

              );
            })}
          </tbody>
        </table>
      </div>

      {isOwner && archivedCount > 0 && (
        <div className="table-wrap" style={{ marginTop: 16 }}>
          <div className="admin-toolbar" style={{ marginBottom: showArchived ? 8 : 0 }}>
            <h4 style={{ margin: 0 }}>{t("archivedSectionTitle", { n: archivedCount })}</h4>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowArchived((v) => !v)}>
              {showArchived ? t("hideArchivedBtn") : t("viewArchivedBtn")}
            </button>
          </div>
          {showArchived && (
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>{t("tableColor")}</th>
                  <th>{t("tableFabric")}</th>
                  <th>{t("tableSku")}</th>
                  <th>{t("tableStock")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {archivedOnly.map((p) => (
                  <tr key={p.id} style={{ opacity: 0.65 }}>
                    <td><span className="table-swatch" style={{ background: p.hex }}>{p.photoUrl && <img src={p.photoUrl} alt="" className="table-swatch-photo" loading="lazy" />}</span></td>
                    <td>{p.colorName}</td>
                    <td>{p.fabricType}</td>
                    <td className="mono">{p.sku}</td>
                    <td><StockBadge meters={Number(p.stockMeters)} /></td>
                    <td className="row-actions">
                      <button onClick={() => restore(p)} disabled={restoringId === p.id} aria-label={t("restoreBtn")}>
                        {restoringId === p.id ? <Loader2 size={14} className="spin" /> : t("restoreBtn")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showForm && (
        <div className="drawer-backdrop" onClick={() => setShowForm(false)}>
          <div className="drawer form-drawer" onClick={(e) => e.stopPropagation()}>
            <button className="drawer-close" onClick={() => setShowForm(false)}><X size={18} /></button>
            <h2>{editingId ? t("editFabric") : t("addFabricTitle")}</h2>

            <label>{t("fabricType")}
              <select value={form.fabricType} onChange={(e) => setForm({ ...form, fabricType: e.target.value })}>
                {FABRIC_TYPES.map((ft) => <option key={ft}>{ft}</option>)}
              </select>
            </label>

            <label>{t("colorName")}
              <input value={form.colorName} onChange={(e) => setForm({ ...form, colorName: e.target.value })} placeholder={t("colorNamePlaceholder")} />
            </label>

            <label>{t("skuLabel")}
              <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder={t("skuPlaceholder")} />
            </label>

            <div className="form-row">
              <label>{t("widthIn")}
                <input type="number" value={form.width} onChange={(e) => setForm({ ...form, width: e.target.value })} />
              </label>
              <label>{t("gsmLabel")}
                <input type="number" value={form.gsm} onChange={(e) => setForm({ ...form, gsm: e.target.value })} />
              </label>
            </div>

            <div className="form-row">
              <label>{t("retailPricePerM")}
                <input type="number" value={form.retailPrice} onChange={(e) => setForm({ ...form, retailPrice: e.target.value })} />
              </label>
              <label>{t("wholesalePricePerM")}
                <input type="number" value={form.wholesalePrice} onChange={(e) => setForm({ ...form, wholesalePrice: e.target.value })} />
              </label>
            </div>

            <label>{t("stockMeters")}
              <input type="number" value={form.stockMeters} onChange={(e) => setForm({ ...form, stockMeters: e.target.value })} />
            </label>

            <FabricPhotoField
              photoUrl={form.photoUrl}
              onPhotoChange={(url) => setForm({ ...form, photoUrl: url })}
              fabricId={editingId}
              hex={form.hex}
              onHexChange={(hex) => setForm({ ...form, hex })}
            />

            {saveError && <p className="form-error">{saveError}</p>}
            <button className="btn btn-primary" onClick={save} disabled={saving} style={{ marginTop: 8 }}>
              {saving ? <Loader2 size={15} className="spin" /> : null} {editingId ? t("saveChanges") : t("addToInventory")}
            </button>
          </div>
        </div>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={t("deleteFabricTitle")}
          body={t("deleteFabricBody", { name: `${pendingDelete.colorName} — ${pendingDelete.fabricType}` })}
          confirmLabel={t("deleteConfirmBtn")}
          cancelLabel={t("cancelBtn")}
          busy={deleting}
          error={deleteError}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmRemove}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FABRIC PHOTO FIELD (Phase 6) — upload a real product photo (separate
// from the hex swatch color), and, once the fabric is saved, trigger AI
// embedding generation for it. Embedding is only offered for an already-
// saved fabric (needs a fabricId to attach the embedding to) and only in
// Supabase mode (local mode has no server to run inference on — see
// api.embedFabricPhoto's local-mode implementation).
// ---------------------------------------------------------------------------
function FabricPhotoField({ photoUrl, onPhotoChange, fabricId, hex, onHexChange }) {
  const { t } = useLang();
  const [uploading, setUploading] = useState(false);
  const [embedding, setEmbedding] = useState(false);
  const [embedResult, setEmbedResult] = useState(null);
  // A remote storage URL taints the canvas (no CORS pixel access), so the
  // on-photo color picker samples from a local, same-origin object URL of
  // the just-picked file instead — same trick SwatchMatcher's upload flow
  // already uses. This is purely for picking; the saved fabric still
  // stores the real uploaded photoUrl.
  const [localPreviewUrl, setLocalPreviewUrl] = useState(null);
  const imgRef = useRef(null);

  useEffect(() => {
    return () => { if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl); };
  }, [localPreviewUrl]);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLocalPreviewUrl(URL.createObjectURL(file));
    setUploading(true);
    try {
      const url = await api.uploadFabricPhoto(file, fabricId || "new");
      onPhotoChange(url);
    } catch (err) {
      alert(err?.message ? `Could not upload photo: ${err.message}` : "Could not upload photo. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  // The moment the photo loads, suggest a starting swatch color (whole-
  // image average) so there's always something sensible even if the
  // person never taps the photo to fine-tune it.
  function handleImgLoad() {
    if (imgRef.current && onHexChange) {
      onHexChange(extractDominantColor(imgRef.current));
    }
  }

  // Click/tap anywhere on the photo to sample that exact pixel — much
  // more precise than the whole-photo average for a real fabric close-up,
  // which usually has shadow/highlight/background variation.
  function handlePhotoClick(e) {
    const img = imgRef.current;
    if (!img || !onHexChange) return;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const rect = img.getBoundingClientRect();
    const x = Math.min(canvas.width - 1, Math.max(0, Math.round(((e.clientX - rect.left) / rect.width) * img.naturalWidth)));
    const y = Math.min(canvas.height - 1, Math.max(0, Math.round(((e.clientY - rect.top) / rect.height) * img.naturalHeight)));
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const toHex = (v) => v.toString(16).padStart(2, "0");
    onHexChange(`#${toHex(pixel[0])}${toHex(pixel[1])}${toHex(pixel[2])}`);
  }

  async function handleEmbed() {
    setEmbedding(true);
    setEmbedResult(null);
    try {
      await api.embedFabricPhoto(fabricId);
      setEmbedResult({ ok: true });
    } catch (err) {
      setEmbedResult({ ok: false, message: err.message });
    } finally {
      setEmbedding(false);
    }
  }

  const displayUrl = localPreviewUrl || photoUrl;

  return (
    <div className="fabric-photo-field">
      <label>{t("swatchPhotoOptionalLabel")}
        <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} />
      </label>
      {uploading && <p className="dim" style={{ fontSize: "0.8rem" }}><Loader2 size={13} className="spin" /> Uploading…</p>}

      {displayUrl && (
        <>
          <img
            ref={imgRef}
            src={displayUrl}
            alt="Fabric"
            className="fabric-photo-preview color-pick-photo"
            onLoad={handleImgLoad}
            onClick={handlePhotoClick}
          />
          <div className="swatch-pick-row">
            <span className="swatch-pick-hint"><Pipette size={13} /> Tap the photo to pick the swatch color</span>
            <label className="swatch-pick-manual">{t("swatchColor")}
              <input type="color" value={hex} onChange={(e) => onHexChange(e.target.value)} />
            </label>
          </div>
        </>
      )}

      {!displayUrl && (
        <label className="swatch-pick-manual" style={{ marginTop: 8 }}>{t("swatchColor")}
          <input type="color" value={hex} onChange={(e) => onHexChange(e.target.value)} />
        </label>
      )}

      {photoUrl && fabricId && (
        <div style={{ marginTop: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={handleEmbed} disabled={embedding}>
            {embedding ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />} Generate AI embedding
          </button>
          {embedResult?.ok && <p className="dim" style={{ fontSize: "0.78rem", marginTop: 4 }}><Check size={12} /> Embedded — this fabric will now use AI matching.</p>}
          {embedResult && !embedResult.ok && <p className="form-error">{embedResult.message}</p>}
        </div>
      )}
      {photoUrl && !fabricId && (
        <p className="dim" style={{ fontSize: "0.78rem", marginTop: 4 }}>Save this fabric first, then reopen it to generate an AI embedding.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RECORD SALE — staff-entered record of a completed, paid transaction.
// This is the only way sales data enters the system (Phase 1 decision: the
// WhatsApp order flow reflects intent to order, not a confirmed sale, so it
// does not auto-record — see README Roadmap). Cost is resolved server-side
// (FIFO across stock batches) so the merchant doesn't need to think about
// batches; they just pick a fabric, meters, and price.
// ---------------------------------------------------------------------------
function RecordSaleForm({ products, currentUser, onRecorded }) {
  const { t } = useLang();
  const [lines, setLines] = useState([{ fabricId: "", query: "", meters: "", unitPrice: "" }]);
  const [openSuggestIdx, setOpenSuggestIdx] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentStatus, setPaymentStatus] = useState("paid");
  const [amountPaid, setAmountPaid] = useState(""); // only used/shown when paymentStatus === "partial"
  const [discountTotal, setDiscountTotal] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);
  const [lastSale, setLastSale] = useState(null); // full receipt-ready snapshot of the sale just recorded
  const [formError, setFormError] = useState(null);

  function updateLine(idx, updates) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...updates } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, { fabricId: "", query: "", meters: "", unitPrice: "" }]);
  }

  function removeLine(idx) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  // Typeahead over SKU / color / fabric type, same pattern as Purchase
  // List's "add a fabric manually" search — lets staff type instead of
  // scrolling a plain <select> through the whole catalog.
  function suggestionsFor(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => p.sku?.toLowerCase().includes(q) || p.colorName?.toLowerCase().includes(q) || p.fabricType?.toLowerCase().includes(q))
      .slice(0, 20);
  }

  // Pre-fill unit price with the fabric's list price when it's picked, so
  // staff only need to change it for a negotiated/discounted price.
  function handleFabricPick(idx, product) {
    updateLine(idx, {
      fabricId: product.id,
      query: `${product.colorName} — ${product.fabricType} (${product.sku})`,
      unitPrice: String(product.retailPrice),
    });
    setOpenSuggestIdx(null);
  }

  function handleQueryChange(idx, value) {
    updateLine(idx, { query: value, fabricId: "" });
    setOpenSuggestIdx(idx);
  }

  const validLines = lines.filter((l) => l.fabricId && Number(l.meters) > 0 && l.unitPrice !== "");
  const subtotal = validLines.reduce((sum, l) => sum + Number(l.meters) * Number(l.unitPrice), 0);
  const total = Math.max(0, subtotal - Number(discountTotal || 0));

  async function handleSubmit() {
    setFormError(null);
    if (validLines.length === 0) {
      setFormError(t("recordSaleAddLineError"));
      return;
    }
    if (paymentStatus === "partial" && (amountPaid === "" || Number(amountPaid) <= 0 || Number(amountPaid) >= total)) {
      setFormError(t("partialAmountError"));
      return;
    }
    setSaving(true);
    try {
      const warehouseId = await api.getDefaultWarehouseId();
      const sale = await api.recordSale({
        warehouseId,
        salespersonId: currentUser?.id,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        paymentMethod,
        paymentStatus,
        amountPaid: paymentStatus === "partial" ? Number(amountPaid) : null,
        discountTotal: Number(discountTotal || 0),
        notes: notes || null,
        items: validLines.map((l) => ({
          fabricId: l.fabricId,
          meters: Number(l.meters),
          unitPrice: Number(l.unitPrice),
        })),
      });
      setLastInvoice(sale.invoiceNumber || sale.invoice_number);
      setLastSale({
        invoiceNumber: sale.invoiceNumber || sale.invoice_number,
        soldAt: sale.soldAt || sale.sold_at,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        paymentMethod,
        paymentStatus,
        amountPaid: paymentStatus === "partial" ? Number(amountPaid) : null,
        discountTotal: Number(discountTotal || 0),
        items: validLines.map((l) => {
          const product = products.find((p) => p.id === l.fabricId);
          return {
            colorName: product?.colorName || "",
            fabricType: product?.fabricType || "",
            sku: product?.sku || "",
            meters: Number(l.meters),
            unitPrice: Number(l.unitPrice),
            discount: 0,
          };
        }),
      });
      setLines([{ fabricId: "", query: "", meters: "", unitPrice: "" }]);
      setCustomerName("");
      setCustomerPhone("");
      setDiscountTotal("");
      setAmountPaid("");
      setNotes("");
      onRecorded?.();
    } catch (err) {
      setFormError(err?.message ? t("recordSaleGenericError") + `: ${err.message}` : t("recordSaleGenericError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin">
      <div className="admin-toolbar">
        <h3>{t("recordSaleTitle")}</h3>
      </div>

      {lastInvoice && (
        <div className="sale-confirm">
          <Check size={15} /> {t("recordedAsLabel")} <strong>{lastInvoice}</strong>
          {lastSale && (
            <>
              <button className="btn btn-ghost btn-sm" style={{ marginInlineStart: 10 }} onClick={() => downloadReceiptImage(lastSale)}>
                <Download size={13} /> {t("saveReceiptBtn")}
              </button>
              {lastSale.customerPhone && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ marginInlineStart: 6 }}
                  onClick={() => sendReceiptViaWhatsApp(lastSale, t("receiptWhatsAppNote", { invoice: lastSale.invoiceNumber }))}
                >
                  <MessageCircle size={13} /> {t("sendReceiptWhatsAppBtn")}
                </button>
              )}
            </>
          )}
        </div>
      )}

      <div className="table-wrap" style={{ padding: 18, overflow: "visible" }}>
        {lines.map((line, idx) => {
          const product = products.find((p) => p.id === line.fabricId);
          const suggestions = suggestionsFor(line.query);
          return (
            <div className="sale-line" key={idx}>
              <div className="manual-search-wrap" style={{ flex: 1, position: "relative" }}>
                <input
                  type="text"
                  value={line.query}
                  placeholder={t("fabricSearchPlaceholder")}
                  onChange={(e) => handleQueryChange(idx, e.target.value)}
                  onFocus={() => setOpenSuggestIdx(idx)}
                  onBlur={() => setTimeout(() => setOpenSuggestIdx((cur) => (cur === idx ? null : cur)), 150)}
                />
                {openSuggestIdx === idx && line.query.trim() && (
                  <div className="manual-suggestions">
                    {suggestions.length === 0 ? (
                      <div className="manual-suggestion-empty">{t("noFabricsMatchSearch", { q: line.query })}</div>
                    ) : (
                      suggestions.map((p) => (
                        <button
                          type="button"
                          key={p.id}
                          className="manual-suggestion-item"
                          onMouseDown={() => handleFabricPick(idx, p)}
                        >
                          <span className="table-swatch" style={{ background: p.hex }} />
                          <span>{p.colorName} — {p.fabricType}</span>
                          <span className="mono dim">{p.sku} · {p.stockMeters}m</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <input
                type="number"
                placeholder={t("metersPlaceholder")}
                value={line.meters}
                onChange={(e) => updateLine(idx, { meters: e.target.value })}
                style={{ width: 90 }}
              />
              <input
                type="number"
                placeholder={t("pricePerMeterPlaceholder")}
                value={line.unitPrice}
                onChange={(e) => updateLine(idx, { unitPrice: e.target.value })}
                style={{ width: 100 }}
              />
              {product && line.meters && Number(line.meters) > product.stockMeters && (
                <span className="sale-line-warn">{t("onlyNInStock", { n: product.stockMeters })}</span>
              )}
              {lines.length > 1 && (
                <button className="icon-btn" onClick={() => removeLine(idx)}><Trash2 size={14} /></button>
              )}
            </div>
          );
        })}
        <button className="btn btn-ghost btn-sm" onClick={addLine} style={{ marginTop: 8 }}>
          <Plus size={14} /> {t("addAnotherFabric")}
        </button>
      </div>

      <div className="form-row" style={{ marginTop: 18 }}>
        <label>{t("customerNameOptional")}
          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        </label>
        <label>{t("customerPhoneOptional")}
          <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
        </label>
      </div>

      <div className="form-row">
        <label>{t("paymentMethodLabel")}
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option value="cash">{t("paymentCash")}</option>
            <option value="card">{t("paymentCard")}</option>
            <option value="transfer">{t("paymentTransfer")}</option>
            <option value="other">{t("paymentOther")}</option>
          </select>
        </label>
        <label>{t("paymentStatusLabel")}
          <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
            <option value="paid">{t("paymentStatusPaid")}</option>
            <option value="partial">{t("paymentStatusPartial")}</option>
            <option value="unpaid">{t("paymentStatusUnpaid")}</option>
          </select>
        </label>
        {paymentStatus === "partial" && (
          <label>{t("amountPaidLabel")} ({CURRENCY_SYMBOL})
            <input
              type="number"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder={t("amountPaidPlaceholder")}
            />
          </label>
        )}
      </div>

      {paymentStatus === "partial" && (
        <p className="dim" style={{ fontSize: "0.82rem", marginTop: -8, marginBottom: 8 }}>
          {t("remainingBalanceLabel")}: {CURRENCY_SYMBOL}{Math.max(0, total - Number(amountPaid || 0)).toLocaleString()}
        </p>
      )}

      <label>{t("discountTotalLabel")} ({CURRENCY_SYMBOL})
        <input type="number" value={discountTotal} onChange={(e) => setDiscountTotal(e.target.value)} style={{ maxWidth: 160 }} />
      </label>

      <label>{t("notesOptional")}
        <input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      <div className="sale-total">
        <span>{t("subtotalLabel")}: {CURRENCY_SYMBOL}{subtotal.toLocaleString()}</span>
        <span className="sale-total-final">{t("totalLabel")}: {CURRENCY_SYMBOL}{total.toLocaleString()}</span>
      </div>

      {formError && <p className="form-error">{formError}</p>}

      <button className="btn btn-primary" onClick={handleSubmit} disabled={saving} style={{ marginTop: 12 }}>
        {saving ? <Loader2 size={15} className="spin" /> : null} {t("recordSaleTitle")}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RECEIPTS — browsable log of every past sale, each downloadable as a PNG
// receipt via the same buildReceiptCanvas used right after recording a
// sale (see RecordSaleForm above). Reuses fetchDashboardMetrics rather
// than a dedicated fetch — Dashboard/Trends already pull sales+saleItems+
// fabrics in one shot, and this needs exactly the same shape.
// ---------------------------------------------------------------------------
function ReceiptsAdmin() {
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    api.fetchDashboardMetrics().then(setData).finally(() => setLoading(false));
  }, []);

  const receipts = useMemo(() => {
    if (!data) return [];
    const { sales, saleItems, fabrics } = data;
    const fabricById = Object.fromEntries(fabrics.map((f) => [f.id, f]));
    const itemsBySale = {};
    for (const item of saleItems) {
      const saleId = item.saleId || item.sale_id;
      (itemsBySale[saleId] = itemsBySale[saleId] || []).push(item);
    }
    return sales.map((s) => {
      const items = (itemsBySale[s.id] || []).map((i) => {
        const fabric = fabricById[i.fabricId || i.fabric_id] || {};
        return {
          colorName: fabric.colorName || "",
          fabricType: fabric.fabricType || "",
          sku: fabric.sku || "",
          meters: Number(i.meters),
          unitPrice: Number(i.unitPrice ?? i.unit_price),
          discount: Number(i.discount || 0),
        };
      });
      const total = Math.max(0, items.reduce((sum, i) => sum + receiptLineTotal(i), 0) - Number(s.discountTotal ?? s.discount_total ?? 0));
      return {
        invoiceNumber: s.invoiceNumber || s.invoice_number,
        soldAt: s.soldAt || s.sold_at,
        customerName: s.customerName ?? s.customer_name,
        customerPhone: s.customerPhone ?? s.customer_phone,
        paymentMethod: s.paymentMethod ?? s.payment_method,
        paymentStatus: s.paymentStatus ?? s.payment_status,
        amountPaid: s.amountPaid ?? s.amount_paid ?? null,
        discountTotal: Number(s.discountTotal ?? s.discount_total ?? 0),
        items,
        total,
      };
    });
  }, [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return receipts;
    return receipts.filter(
      (r) =>
        r.invoiceNumber?.toLowerCase().includes(q) ||
        r.customerName?.toLowerCase().includes(q) ||
        r.customerPhone?.toLowerCase().includes(q)
    );
  }, [receipts, query]);

  if (loading) {
    return (
      <div className="admin">
        <p className="loading-state"><Loader2 size={16} className="spin" /> {t("loadingText")}</p>
      </div>
    );
  }

  return (
    <div className="admin">
      <div className="admin-toolbar">
        <h3>{t("receiptsTitle")}</h3>
      </div>
      <label style={{ marginBottom: 12, display: "block" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("receiptsSearchPlaceholder")}
        />
      </label>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t("invoiceLabel")}</th>
              <th>{t("dateLabel")}</th>
              <th>{t("customerLabel")}</th>
              <th>{t("totalLabel")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.invoiceNumber}>
                <td className="mono">{r.invoiceNumber}</td>
                <td>{new Date(r.soldAt).toLocaleDateString()}</td>
                <td>{r.customerName || <span className="dim">{t("walkInLabel")}</span>}</td>
                <td className="mono">{CURRENCY_SYMBOL}{Math.round(r.total).toLocaleString()}</td>
                <td className="row-actions">
                  <button onClick={() => downloadReceiptImage(r)} aria-label={t("saveReceiptBtn")} title={t("saveReceiptBtn")}>
                    <Download size={14} />
                  </button>
                  {r.customerPhone && (
                    <button
                      onClick={() => sendReceiptViaWhatsApp(r, t("receiptWhatsAppNote", { invoice: r.invoiceNumber }))}
                      aria-label={t("sendReceiptWhatsAppBtn")}
                      title={t("sendReceiptWhatsAppBtn")}
                    >
                      <MessageCircle size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="dim" style={{ textAlign: "center", padding: 20 }}>{t("noReceiptsMsg")}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DASHBOARD — Phase 1 business intelligence. All aggregation happens here in
// the app layer from raw sales/sale_items/stock_batches/fabrics rows (see
// api.fetchDashboardMetrics) rather than in SQL views — simpler to read and
// fast enough at single-shop data volumes. If this ever needs to scale to
// many shops or years of history, move the heavy aggregations into SQL.
// ---------------------------------------------------------------------------
function Dashboard({ products, refreshSignal }) {
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lowStockThreshold] = useState(20);
  const [deadStockDays] = useState(90);

  useEffect(() => {
    api.fetchDashboardMetrics().then(setData).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  // Same reasoning as the top-level products subscription (see TextileApp):
  // this tab already refetches after actions taken here — this covers a
  // sale or purchase recorded from somewhere else while this tab is open.
  useEffect(() => {
    let timer = null;
    const unsubscribe = api.subscribeToTableChanges(["sales", "sale_items", "stock_batches", "fabrics"], () => {
      clearTimeout(timer);
      timer = setTimeout(() => { api.fetchDashboardMetrics().then(setData); }, 400);
    });
    return () => { clearTimeout(timer); unsubscribe(); };
  }, []);

  const metrics = useMemo(() => {
    if (!data) return null;
    const { sales, saleItems, batches, fabrics } = data;

    const saleById = Object.fromEntries(sales.map((s) => [s.id, s]));
    const fabricById = Object.fromEntries(fabrics.map((f) => [f.id, f]));

    function itemDate(item) {
      const sale = saleById[item.saleId || item.sale_id];
      return sale ? new Date(sale.soldAt || sale.sold_at) : null;
    }
    function itemRevenue(item) {
      return Number(item.meters) * Number(item.unitPrice ?? item.unit_price) - Number(item.discount || 0);
    }
    function itemCost(item) {
      return Number(item.meters) * Number(item.unitCost ?? item.unit_cost);
    }
    function itemProfit(item) {
      return itemRevenue(item) - itemCost(item);
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay); startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    function sumSince(since) {
      const items = saleItems.filter((i) => {
        const d = itemDate(i);
        return d && d >= since;
      });
      return {
        revenue: items.reduce((s, i) => s + itemRevenue(i), 0),
        profit: items.reduce((s, i) => s + itemProfit(i), 0),
        count: new Set(items.map((i) => i.saleId || i.sale_id)).size,
      };
    }

    const today = sumSince(startOfDay);
    const week = sumSince(startOfWeek);
    const month = sumSince(startOfMonth);
    const year = sumSince(startOfYear);

    const totalRevenue = saleItems.reduce((s, i) => s + itemRevenue(i), 0);
    const totalProfit = saleItems.reduce((s, i) => s + itemProfit(i), 0);
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const avgInvoiceValue = sales.length > 0 ? totalRevenue / sales.length : 0;

    const inventoryValuation = batches.reduce(
      (s, b) => s + Number(b.metersRemaining ?? b.meters_remaining) * Number(b.costPerMeter ?? b.cost_per_meter),
      0
    );

    // Per-fabric rollups for best-sellers / dead stock / reorder.
    const perFabric = {};
    for (const item of saleItems) {
      const fid = item.fabricId || item.fabric_id;
      if (!perFabric[fid]) perFabric[fid] = { metersSold: 0, revenue: 0, profit: 0, lastSaleDate: null };
      perFabric[fid].metersSold += Number(item.meters);
      perFabric[fid].revenue += itemRevenue(item);
      perFabric[fid].profit += itemProfit(item);
      const d = itemDate(item);
      if (d && (!perFabric[fid].lastSaleDate || d > perFabric[fid].lastSaleDate)) {
        perFabric[fid].lastSaleDate = d;
      }
    }

    const bestSellers = Object.entries(perFabric)
      .map(([fid, stats]) => ({ fabric: fabricById[fid], ...stats }))
      .filter((r) => r.fabric)
      .sort((a, b) => b.metersSold - a.metersSold)
      .slice(0, 8);

    // Previously this re-sorted `bestSellers` (already limited to the top 8
    // by meters sold) by profit — so a fabric that's very profitable per
    // meter but doesn't move much volume could never show up here, even
    // though it's exactly the kind of thing this list exists to surface.
    // Re-derived from the full per-fabric rollup instead.
    const mostProfitable = Object.entries(perFabric)
      .map(([fid, stats]) => ({ fabric: fabricById[fid], ...stats }))
      .filter((r) => r.fabric)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 8);

    // Last known cost per meter for each fabric — same "most recent batch
    // wins" approach used elsewhere (see PurchaseList's lastBatchByFabric)
    // — used below to turn "stuck stock" into an actual money figure
    // instead of just a meter count, so dead stock can be ranked by how
    // much capital it's actually tying up, not just how long it's sat.
    const lastCostByFabric = {};
    for (const b of batches) {
      const fid = b.fabricId ?? b.fabric_id;
      const purchasedAt = b.purchasedAt ?? b.purchased_at;
      const existing = lastCostByFabric[fid];
      if (!existing || new Date(purchasedAt) > new Date(existing.purchasedAt)) {
        lastCostByFabric[fid] = { cost: Number(b.costPerMeter ?? b.cost_per_meter ?? 0), purchasedAt };
      }
    }

    const deadStockCutoff = new Date(now);
    deadStockCutoff.setDate(now.getDate() - deadStockDays);
    const deadStock = products
      .filter((p) => {
        if (Number(p.stockMeters) <= 0) return false;
        const stats = perFabric[p.id];
        if (!stats || !stats.lastSaleDate) return true; // never sold at all
        return stats.lastSaleDate < deadStockCutoff;
      })
      .map((p) => {
        const cost = lastCostByFabric[p.id]?.cost ?? Number(p.wholesalePrice) * 0.8; // fall back to the same estimate PurchaseList uses when there's no batch history
        return { ...p, tiedUpValue: Number(p.stockMeters) * cost };
      })
      .sort((a, b) => b.tiedUpValue - a.tiedUpValue); // worst-first: biggest stuck capital at the top, not just alphabetical/insertion order
    const deadStockTiedUpTotal = deadStock.reduce((s, p) => s + p.tiedUpValue, 0);

    const lowStock = products.filter((p) => Number(p.stockMeters) > 0 && Number(p.stockMeters) < lowStockThreshold);
    const outOfStock = products.filter((p) => Number(p.stockMeters) === 0);

    // Count open customer requests per fabric (by fabric_id when linked, or
    // by normalized type+color when not) so unmet demand can boost reorder
    // priority — a product with no sales history but active customer
    // requests is still worth reordering, which sales velocity alone
    // would miss.
    const openRequests = data.openRequests || [];
    function requestCountFor(product) {
      const norm = (s) => (s || "").trim().toLowerCase();
      return openRequests
        .filter((r) => {
          const rFabricId = r.fabricId ?? r.fabric_id;
          if (rFabricId) return rFabricId === product.id;
          const rType = norm(r.fabricType ?? r.fabric_type);
          const rColor = norm(r.colorName ?? r.color_name);
          return rType === norm(product.fabricType) && rColor === norm(product.colorName);
        })
        .reduce((s, r) => s + (r.requestCount ?? r.request_count ?? 1), 0);
    }

    // Reorder suggestions: low or out of stock, ranked by sales velocity
    // plus unmet customer demand — a low-stock item nobody buys and nobody
    // asks for isn't urgent; one with open customer requests is, even with
    // thin sales history.
    const reorderCandidates = [...lowStock, ...outOfStock]
      .map((p) => {
        const requestCount = requestCountFor(p);
        return {
          product: p,
          metersSold: perFabric[p.id]?.metersSold || 0,
          requestCount,
          priorityScore: (perFabric[p.id]?.metersSold || 0) + requestCount * 10, // customer request weighted higher: explicit unmet demand vs inferred velocity
        };
      })
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 10);

    // Last 14 days, for the trend chart.
    const dailySeries = [];
    for (let i = 13; i >= 0; i--) {
      const day = new Date(startOfDay);
      day.setDate(startOfDay.getDate() - i);
      const nextDay = new Date(day); nextDay.setDate(day.getDate() + 1);
      const dayItems = saleItems.filter((it) => {
        const d = itemDate(it);
        return d && d >= day && d < nextDay;
      });
      dailySeries.push({
        label: day.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        revenue: dayItems.reduce((s, i) => s + itemRevenue(i), 0),
      });
    }

    return {
      today, week, month, year,
      totalRevenue, totalProfit, profitMargin, avgInvoiceValue,
      inventoryValuation, bestSellers, mostProfitable, deadStock, deadStockTiedUpTotal, lowStock, outOfStock,
      reorderCandidates, dailySeries,
      activeCustomers: new Set(sales.map((s) => s.customerPhone || s.customer_phone).filter(Boolean)).size,
    };
  }, [data, products, lowStockThreshold, deadStockDays]);

  if (loading || !metrics) {
    return (
      <div className="admin">
        <p className="loading-state"><Loader2 size={16} className="spin" /> {t("loadingDashboard")}</p>
      </div>
    );
  }

  return (
    <div className="admin">
      <InsightsPanel data={data} products={products} />

      <div className="admin-stats">
        <div className="stat-card">
          <span className="stat-label">{t("todaysRevenue")}</span>
          <span className="stat-value">{CURRENCY_SYMBOL}{metrics.today.revenue.toLocaleString()}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">{t("thisWeekLabel")}</span>
          <span className="stat-value">{CURRENCY_SYMBOL}{metrics.week.revenue.toLocaleString()}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">{t("thisMonthLabel")}</span>
          <span className="stat-value">{CURRENCY_SYMBOL}{metrics.month.revenue.toLocaleString()}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">{t("thisYearLabel")}</span>
          <span className="stat-value">{CURRENCY_SYMBOL}{metrics.year.revenue.toLocaleString()}</span>
        </div>
      </div>

      <div className="admin-stats">
        <div className="stat-card">
          <span className="stat-label">{t("totalProfitLabel")}</span>
          <span className="stat-value">{CURRENCY_SYMBOL}{metrics.totalProfit.toLocaleString()}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">{t("profitMarginLabel")}</span>
          <span className="stat-value">{metrics.profitMargin.toFixed(1)}%</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">{t("avgInvoiceValueLabel")}</span>
          <span className="stat-value">{CURRENCY_SYMBOL}{Math.round(metrics.avgInvoiceValue).toLocaleString()}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">{t("inventoryValuationLabel")}</span>
          <span className="stat-value">{CURRENCY_SYMBOL}{Math.round(metrics.inventoryValuation).toLocaleString()}</span>
        </div>
      </div>

      <div className="admin-stats">
        <div className="stat-card">
          <span className="stat-label">{t("activeCustomersLabel")}</span>
          <span className="stat-value">{metrics.activeCustomers}</span>
        </div>
        <div className="stat-card warn">
          <span className="stat-label">{t("lowStockLabel")}</span>
          <span className="stat-value">{metrics.lowStock.length}</span>
        </div>
        <div className="stat-card danger">
          <span className="stat-label">{t("outOfStockLabel")}</span>
          <span className="stat-value">{metrics.outOfStock.length}</span>
        </div>
        <div className="stat-card warn">
          <span className="stat-label">{t("deadStockLabel", { d: deadStockDays })}</span>
          <span className="stat-value">{metrics.deadStock.length}</span>
          {metrics.deadStockTiedUpTotal > 0 && (
            <span className="dim" style={{ fontSize: "0.72rem" }}>{CURRENCY_SYMBOL}{Math.round(metrics.deadStockTiedUpTotal).toLocaleString()} {t("tiedUpLabel")}</span>
          )}
        </div>
      </div>

      <ChartBlock title={t("revenueLast14DaysLabel")} series={metrics.dailySeries} />

      <div className="dash-columns">
        <RankedList
          title={t("bestSellingFabricsLabel")}
          rows={metrics.bestSellers}
          renderRow={(r) => (
            <>
              <span>{r.fabric.colorName} <span className="dim">— {r.fabric.fabricType} · SKU {r.fabric.sku || "—"}</span></span>
              <span className="mono">{r.metersSold.toLocaleString()}m</span>
            </>
          )}
        />
        <RankedList
          title={t("mostProfitableFabricsLabel")}
          rows={metrics.mostProfitable}
          renderRow={(r) => (
            <>
              <span>{r.fabric.colorName} <span className="dim">— {r.fabric.fabricType} · SKU {r.fabric.sku || "—"}</span></span>
              <span className="mono">{CURRENCY_SYMBOL}{Math.round(r.profit).toLocaleString()}</span>
            </>
          )}
        />
      </div>

      <div className="dash-columns">
        <RankedList
          title={t("reorderSuggestionsLabel")}
          rows={metrics.reorderCandidates}
          empty={t("nothingToReorderMsg")}
          renderRow={(r) => (
            <>
              <span>{r.product.colorName} <span className="dim">— {r.product.fabricType} · SKU {r.product.sku || "—"}</span></span>
              <span className="mono">
                {r.product.stockMeters}m left · {r.metersSold}m sold
                {r.requestCount > 0 ? ` · ${r.requestCount} requested` : ""}
              </span>
            </>
          )}
        />
        <RankedList
          title={t("deadStockTitleLabel", { d: deadStockDays })}
          rows={metrics.deadStock}
          empty={t("noDeadStockMsg")}
          renderRow={(p) => (
            <>
              <span>{p.colorName} <span className="dim">— {p.fabricType} · SKU {p.sku || "—"}</span></span>
              <span className="mono">{p.stockMeters}m · {CURRENCY_SYMBOL}{Math.round(p.tiedUpValue).toLocaleString()}</span>
            </>
          )}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// INSIGHTS PANEL (Phase 7) — natural-language summary at the top of the
// Dashboard. Facts are computed by buildInsightFacts() (pure arithmetic,
// already tested via Phases 1/5's own math) and only PHRASED by an LLM —
// see insightFacts.js and generate-insights/index.ts for why that split
// matters. If there's no LLM configured, or it fails, or there's simply
// nothing to say yet (a young shop with little sales history), this shows
// the plain facts (or an honest "not enough data yet" message) rather
// than hiding the section or presenting placeholder confidence.
// ---------------------------------------------------------------------------
function InsightsPanel({ data, products }) {
  const { t } = useLang();
  const [state, setState] = useState({ loading: true, insights: [], aiPhrased: false, error: null });

  useEffect(() => {
    if (!data) return;
    const facts = buildInsightFacts({ sales: data.sales, saleItems: data.saleItems, fabrics: data.fabrics, products });
    if (facts.length === 0) {
      setState({ loading: false, insights: [], aiPhrased: false, error: null });
      return;
    }
    api.generateInsights(facts).then((result) => {
      setState({ loading: false, insights: result.insights, aiPhrased: result.aiPhrased, error: result.error || null });
    });
  }, [data, products]);

  if (state.loading) {
    return (
      <div className="insights-panel">
        <p className="dim" style={{ fontSize: "0.85rem" }}><Loader2 size={13} className="spin" /> {t("buildingInsightsMsg")}</p>
      </div>
    );
  }

  if (state.insights.length === 0) {
    return (
      <div className="insights-panel insights-empty">
        <Sparkles size={14} />
        <span>{t("notEnoughSalesHistoryMsg")}</span>
      </div>
    );
  }

  return (
    <div className="insights-panel">
      <div className="insights-header">
        <Sparkles size={14} />
        <span>{t("insightsLabel")}</span>
        {!state.aiPhrased && <span className="ai-status ai-status-off">{t("plainSummaryNote")}</span>}
      </div>
      <ul className="insights-list">
        {state.insights.map((line, i) => <li key={i}>{line}</li>)}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TRENDS — Phase 5: seasonal comparisons and simple forecasting.
//
// This shop just went live with real sales tracking (Phases 1-4), so there
// is little to no real history yet. Rather than wait to build this, the
// screen is built now and designed to say so honestly — every comparison
// checks whether there's enough data first, and shows a clear "not enough
// history yet" state instead of a misleading 0% or empty chart. It fills
// in naturally as real sales accumulate.
//
// Forecasting is a simple moving average / trend, not ML — consistent with
// keeping this phase rule-based and explainable. A forecast only renders
// once there are at least MIN_WEEKS_FOR_FORECAST weeks of sales; before
// that it explains what's missing rather than guessing.
//
// Season boundaries are fixed Northern Hemisphere calendar quarters
// (Dec-Feb winter, Mar-May spring, Jun-Aug summer, Sep-Nov fall) — a
// reasonable default for this shop's location (Kabul), not a universal
// truth. Adjust SEASON_MONTHS below if that's wrong for how this business
// actually experiences seasons (e.g. Ramadan/Eid/wedding-season demand
// mentioned in the original spec don't line up with fixed calendar
// seasons at all, since Ramadan shifts each year — that's a separate,
// harder problem than calendar seasons and isn't attempted here).
// ---------------------------------------------------------------------------
const SEASON_MONTHS = {
  Winter: [11, 0, 1],  // Dec, Jan, Feb
  Spring: [2, 3, 4],
  Summer: [5, 6, 7],
  Fall: [8, 9, 10],
};
const MIN_WEEKS_FOR_FORECAST = 6;

function seasonOf(date) {
  const month = date.getMonth();
  return Object.entries(SEASON_MONTHS).find(([, months]) => months.includes(month))?.[0] || "Unknown";
}

function pctChange(current, previous) {
  if (previous === 0) return current === 0 ? 0 : null; // null = not a meaningful percentage (division by zero)
  return ((current - previous) / previous) * 100;
}

function Trends({ refreshSignal }) {
  const { t } = useLang();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seasonFabricType, setSeasonFabricType] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");

  useEffect(() => {
    api.fetchDashboardMetrics().then(setData).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  const analysis = useMemo(() => {
    if (!data) return null;
    const { sales, saleItems, fabrics } = data;
    const saleById = Object.fromEntries(sales.map((s) => [s.id, s]));
    const fabricById = Object.fromEntries(fabrics.map((f) => [f.id, f]));

    function itemDate(item) {
      const sale = saleById[item.saleId || item.sale_id];
      return sale ? new Date(sale.soldAt || sale.sold_at) : null;
    }
    function itemRevenue(item) {
      return Number(item.meters) * Number(item.unitPrice ?? item.unit_price) - Number(item.discount || 0);
    }

    const now = new Date();

    // This month vs last month
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonthRevenue = saleItems.filter((i) => itemDate(i) >= startOfThisMonth).reduce((s, i) => s + itemRevenue(i), 0);
    const lastMonthRevenue = saleItems.filter((i) => { const d = itemDate(i); return d >= startOfLastMonth && d < startOfThisMonth; }).reduce((s, i) => s + itemRevenue(i), 0);

    // This year vs last year
    const startOfThisYear = new Date(now.getFullYear(), 0, 1);
    const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
    const thisYearRevenue = saleItems.filter((i) => itemDate(i) >= startOfThisYear).reduce((s, i) => s + itemRevenue(i), 0);
    const lastYearRevenue = saleItems.filter((i) => { const d = itemDate(i); return d >= startOfLastYear && d < startOfThisYear; }).reduce((s, i) => s + itemRevenue(i), 0);

    // Earliest sale date, to judge how much history actually exists.
    const allDates = saleItems.map(itemDate).filter(Boolean);
    const earliestDate = allDates.length > 0 ? new Date(Math.min(...allDates)) : null;
    const daysOfHistory = earliestDate ? Math.floor((now - earliestDate) / (1000 * 60 * 60 * 24)) : 0;

    // Season breakdown: revenue and top fabric type per season, across all
    // history (not just this year, since a young shop needs to pool
    // whatever seasons it's actually seen so far).
    const bySeasonRevenue = { Winter: 0, Spring: 0, Summer: 0, Fall: 0 };
    const bySeasonFabricType = { Winter: {}, Spring: {}, Summer: {}, Fall: {} };
    for (const item of saleItems) {
      const d = itemDate(item);
      if (!d) continue;
      const season = seasonOf(d);
      bySeasonRevenue[season] += itemRevenue(item);
      const fabric = fabricById[item.fabricId ?? item.fabric_id];
      if (fabric) {
        const key = seasonFabricType ? fabric.colorName : fabric.fabricType;
        if (seasonFabricType && fabric.fabricType !== seasonFabricType) continue;
        bySeasonFabricType[season][key] = (bySeasonFabricType[season][key] || 0) + Number(item.meters);
      }
    }
    const seasonTopSeller = {};
    for (const season of Object.keys(bySeasonFabricType)) {
      const entries = Object.entries(bySeasonFabricType[season]).sort((a, b) => b[1] - a[1]);
      seasonTopSeller[season] = entries[0] || null;
    }

    // Weekly revenue series for the forecast, last 16 weeks.
    const weeklyRevenue = [];
    for (let i = 15; i >= 0; i--) {
      const weekStart = new Date(now); weekStart.setDate(now.getDate() - i * 7 - now.getDay());
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);
      const revenue = saleItems.filter((it) => { const d = itemDate(it); return d && d >= weekStart && d < weekEnd; }).reduce((s, i) => s + itemRevenue(i), 0);
      weeklyRevenue.push({ label: weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" }), revenue });
    }
    const weeksWithSales = weeklyRevenue.filter((w) => w.revenue > 0).length;

    // Simple forecast: exponential smoothing (alpha=0.3) over recent weeks,
    // projected forward one week. Deliberately simple and explainable —
    // not a model, just a weighted average that favors recent weeks.
    let forecast = null;
    if (weeksWithSales >= MIN_WEEKS_FOR_FORECAST) {
      const alpha = 0.3;
      let smoothed = weeklyRevenue[0].revenue;
      for (let i = 1; i < weeklyRevenue.length; i++) {
        smoothed = alpha * weeklyRevenue[i].revenue + (1 - alpha) * smoothed;
      }
      forecast = Math.round(smoothed);
    }

    return {
      thisMonthRevenue, lastMonthRevenue,
      thisYearRevenue, lastYearRevenue,
      daysOfHistory, earliestDate,
      bySeasonRevenue, seasonTopSeller,
      weeklyRevenue, weeksWithSales, forecast,
    };
  }, [data, seasonFabricType]);

  const fabricTypes = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.fabrics.map((f) => f.fabricType))].sort();
  }, [data]);

  // Custom date-range trending — same underlying sale-items data as the
  // three fixed comparisons above, just filtered to whatever range the
  // user picks instead of "this month" / "this year" / "next week".
  // Kept as its own useMemo (rather than folded into `analysis`) since it
  // only needs to recompute when the range actually changes, not on every
  // render that touches `analysis`.
  const rangeAnalysis = useMemo(() => {
    if (!data || !rangeStart || !rangeEnd) return null;
    const start = new Date(rangeStart);
    const end = new Date(rangeEnd);
    end.setHours(23, 59, 59, 999); // inclusive of the whole end day
    if (start > end) return null;

    const { sales, saleItems, fabrics } = data;
    const saleById = Object.fromEntries(sales.map((s) => [s.id, s]));
    const fabricById = Object.fromEntries(fabrics.map((f) => [f.id, f]));
    function itemDate(item) {
      const sale = saleById[item.saleId || item.sale_id];
      return sale ? new Date(sale.soldAt || sale.sold_at) : null;
    }
    function itemRevenue(item) {
      return Number(item.meters) * Number(item.unitPrice ?? item.unit_price) - Number(item.discount || 0);
    }

    const itemsInRange = saleItems.filter((it) => {
      const d = itemDate(it);
      return d && d >= start && d <= end;
    });

    const revenue = itemsInRange.reduce((s, i) => s + itemRevenue(i), 0);
    const metersSold = itemsInRange.reduce((s, i) => s + Number(i.meters), 0);
    const saleIds = new Set(itemsInRange.map((i) => i.saleId || i.sale_id));

    const byFabric = {}; // fabricId -> { fabric, meters, revenue }
    for (const item of itemsInRange) {
      const fabric = fabricById[item.fabricId ?? item.fabric_id];
      if (!fabric) continue;
      const key = fabric.id;
      if (!byFabric[key]) byFabric[key] = { fabric, meters: 0, revenue: 0 };
      byFabric[key].meters += Number(item.meters);
      byFabric[key].revenue += itemRevenue(item);
    }
    const topFabrics = Object.values(byFabric).sort((a, b) => b.meters - a.meters).slice(0, 10);

    const byFabricType = {};
    for (const item of itemsInRange) {
      const fabric = fabricById[item.fabricId ?? item.fabric_id];
      if (!fabric) continue;
      byFabricType[fabric.fabricType] = (byFabricType[fabric.fabricType] || 0) + Number(item.meters);
    }
    const topFabricTypes = Object.entries(byFabricType).sort((a, b) => b[1] - a[1]).slice(0, 6);

    const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);

    return { revenue, metersSold, saleCount: saleIds.size, topFabrics, topFabricTypes, days, itemCount: itemsInRange.length };
  }, [data, rangeStart, rangeEnd]);

  if (loading || !analysis) {
    return (
      <div className="admin">
        <p className="loading-state"><Loader2 size={16} className="spin" /> {t("loadingTrendsMsg")}</p>
      </div>
    );
  }

  const monthChange = pctChange(analysis.thisMonthRevenue, analysis.lastMonthRevenue);
  const yearChange = pctChange(analysis.thisYearRevenue, analysis.lastYearRevenue);
  const hasEnoughHistoryForYoY = analysis.daysOfHistory >= 395; // a year + a bit of buffer, so "last year" actually means something

  return (
    <div className="admin">
      {analysis.daysOfHistory < 30 && (
        <div className="history-notice">
          <Clock size={14} />
          {analysis.earliestDate
            ? t("salesHistorySoFarNote", { n: analysis.daysOfHistory, date: analysis.earliestDate.toLocaleDateString() })
            : t("noSalesYetNote")}
        </div>
      )}

      <div className="admin-stats">
        <div className="stat-card">
          <span className="stat-label">{t("monthVsLastMonthLabel")}</span>
          <span className="stat-value">
            {monthChange === null ? "—" : `${monthChange >= 0 ? "+" : ""}${monthChange.toFixed(0)}%`}
          </span>
          <span className="dim" style={{ fontSize: "0.72rem" }}>
            {CURRENCY_SYMBOL}{Math.round(analysis.thisMonthRevenue).toLocaleString()} vs {CURRENCY_SYMBOL}{Math.round(analysis.lastMonthRevenue).toLocaleString()}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">{t("yearVsLastYearLabel")}</span>
          <span className="stat-value">
            {!hasEnoughHistoryForYoY ? "—" : yearChange === null ? "—" : `${yearChange >= 0 ? "+" : ""}${yearChange.toFixed(0)}%`}
          </span>
          <span className="dim" style={{ fontSize: "0.72rem" }}>
            {hasEnoughHistoryForYoY
              ? `${CURRENCY_SYMBOL}${Math.round(analysis.thisYearRevenue).toLocaleString()} vs ${CURRENCY_SYMBOL}${Math.round(analysis.lastYearRevenue).toLocaleString()}`
              : t("needsYearOfHistoryNote")}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">{t("nextWeekForecastLabel")}</span>
          <span className="stat-value">
            {analysis.forecast === null ? "—" : `${CURRENCY_SYMBOL}${analysis.forecast.toLocaleString()}`}
          </span>
          <span className="dim" style={{ fontSize: "0.72rem" }}>
            {analysis.forecast === null
              ? t("needsNWeeksWithSalesNote", { n: MIN_WEEKS_FOR_FORECAST, so_far: analysis.weeksWithSales })
              : t("simpleTrendEstimateNote")}
          </span>
        </div>
      </div>

      <ChartBlock title={t("weeklyRevenueLast16WeeksLabel")} series={analysis.weeklyRevenue} />

      <div className="table-wrap" style={{ padding: 18, marginBottom: 16 }}>
        <div className="admin-toolbar" style={{ marginBottom: 8 }}>
          <h4 style={{ margin: 0 }}>{t("revenueBySeasonLabel")}</h4>
          <select value={seasonFabricType} onChange={(e) => setSeasonFabricType(e.target.value)}>
            <option value="">{t("topFabricTypePerSeasonLabel")}</option>
            {fabricTypes.map((ft) => <option key={ft} value={ft}>{t("topColorsInLabel", { type: ft })}</option>)}
          </select>
        </div>
        <div className="season-grid">
          {Object.entries(analysis.bySeasonRevenue).map(([season, revenue]) => (
            <div className="season-card" key={season}>
              <span className="season-name">{season}</span>
              <span className="season-revenue">{CURRENCY_SYMBOL}{Math.round(revenue).toLocaleString()}</span>
              {analysis.seasonTopSeller[season] ? (
                <span className="dim" style={{ fontSize: "0.75rem" }}>
                  {t("topSeasonSellerNote", { name: analysis.seasonTopSeller[season][0], m: Math.round(analysis.seasonTopSeller[season][1]) })}
                </span>
              ) : (
                <span className="dim" style={{ fontSize: "0.75rem" }}>{t("noSalesYetShortNote")}</span>
              )}
            </div>
          ))}
        </div>
        <p className="dim" style={{ fontSize: "0.75rem", marginTop: 10 }}>
          {t("seasonCalendarNote")}
        </p>
      </div>

      <div className="table-wrap" style={{ padding: 18, marginBottom: 16 }}>
        <div className="admin-toolbar" style={{ marginBottom: 4 }}>
          <h4 style={{ margin: 0 }}>{t("customDateRangeLabel")}</h4>
        </div>
        <p className="dim" style={{ fontSize: "0.8rem", marginTop: 0, marginBottom: 12 }}>
          {t("customDateRangeNote")}
        </p>
        <div className="date-range-picker">
          <label>{t("fromLabel")}
            <input type="date" value={rangeStart} max={rangeEnd || undefined} onChange={(e) => setRangeStart(e.target.value)} />
          </label>
          <label>{t("toLabel")}
            <input type="date" value={rangeEnd} min={rangeStart || undefined} onChange={(e) => setRangeEnd(e.target.value)} />
          </label>
        </div>

        {rangeStart && rangeEnd && !rangeAnalysis && (
          <p className="auth-error" style={{ marginTop: 12 }}>{t("fromBeforeToError")}</p>
        )}

        {rangeAnalysis && (
          <>
            <div className="admin-stats" style={{ marginTop: 16 }}>
              <div className="stat-card">
                <span className="stat-label">{t("revenueInRangeLabel")}</span>
                <span className="stat-value">{CURRENCY_SYMBOL}{Math.round(rangeAnalysis.revenue).toLocaleString()}</span>
                <span className="dim" style={{ fontSize: "0.72rem" }}>
                  {rangeAnalysis.days} day{rangeAnalysis.days === 1 ? "" : "s"} · {rangeAnalysis.saleCount} sale{rangeAnalysis.saleCount === 1 ? "" : "s"}
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-label">{t("metersSoldLabel")}</span>
                <span className="stat-value">{Math.round(rangeAnalysis.metersSold).toLocaleString()}m</span>
                <span className="dim" style={{ fontSize: "0.72rem" }}>{t("acrossNFabricsNote", { n: rangeAnalysis.topFabrics.length })}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">{t("avgRevenuePerDayLabel")}</span>
                <span className="stat-value">{CURRENCY_SYMBOL}{Math.round(rangeAnalysis.revenue / rangeAnalysis.days).toLocaleString()}</span>
              </div>
            </div>

            {rangeAnalysis.itemCount === 0 ? (
              <p className="empty-state">{t("noSalesInRangeMsg")}</p>
            ) : (
              <div className="two-col-grid" style={{ marginTop: 4 }}>
                <RankedList
                  title={t("topFabricsInRangeLabel")}
                  rows={rangeAnalysis.topFabrics}
                  renderRow={(row) => (
                    <>
                      <span className="table-swatch" style={{ background: row.fabric.hex }} />
                      <span style={{ flex: 1 }}>{row.fabric.colorName} — {row.fabric.fabricType}</span>
                      <span className="mono">{Math.round(row.meters)}m</span>
                    </>
                  )}
                />
                <RankedList
                  title={t("topFabricTypesInRangeLabel")}
                  rows={rangeAnalysis.topFabricTypes}
                  renderRow={([type, meters]) => (
                    <>
                      <span style={{ flex: 1 }}>{type}</span>
                      <span className="mono">{Math.round(meters)}m</span>
                    </>
                  )}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ChartBlock({ title, series }) {
  const max = Math.max(1, ...series.map((s) => s.revenue));
  return (
    <div className="table-wrap" style={{ padding: 18, marginBottom: 22 }}>
      <h4 style={{ margin: "0 0 14px" }}>{title}</h4>
      <div className="mini-chart">
        {series.map((s, i) => (
          <div className="mini-chart-bar" key={i} title={`${s.label}: ${CURRENCY_SYMBOL}${Math.round(s.revenue).toLocaleString()}`}>
            <div className="mini-chart-fill" style={{ height: `${(s.revenue / max) * 100}%` }} />
            <span className="mini-chart-label">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RankedList({ title, rows, renderRow, empty = "No data yet." }) {
  return (
    <div className="table-wrap" style={{ padding: 18 }}>
      <h4 style={{ margin: "0 0 12px" }}>{title}</h4>
      {rows.length === 0 ? (
        <p className="dim" style={{ fontSize: "0.85rem" }}>{empty}</p>
      ) : (
        <ul className="ranked-list">
          {rows.map((r, i) => (
            <li key={i} className="ranked-list-row">{renderRow(r)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read photo"));
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------
// CUSTOMER REQUEST FORM — logs a fabric a customer wanted but couldn't buy.
// Repeated requests for the same fabric_type + color_name combination
// increment a count on the backend instead of creating duplicates (see
// api.recordCustomerRequest / schema comment for the matching logic).
// ---------------------------------------------------------------------------
function CustomerRequestForm({ products, onRecorded }) {
  const { t } = useLang();
  const [requestType, setRequestType] = useState("out_of_stock");
  const [fabricId, setFabricId] = useState("");
  const [fabricType, setFabricType] = useState("");
  const [colorName, setColorName] = useState("");
  const [width, setWidth] = useState("");
  const [quantity, setQuantity] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [formError, setFormError] = useState(null);
  const fileInputRef = useRef(null);

  // When staff pick a known out-of-stock fabric, prefill type/color so the
  // dedup match on the backend actually lines up with that fabric's fields.
  function handleFabricPick(id) {
    setFabricId(id);
    const product = products.find((p) => p.id === id);
    if (product) {
      setFabricType(product.fabricType);
      setColorName(product.colorName);
    }
  }

  function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit() {
    setFormError(null);
    if (!fabricType && !colorName && !photoFile) {
      setFormError(t("logRequestValidationError"));
      return;
    }
    setSaving(true);
    try {
      let photoUrl = null;
      if (photoFile) {
        const uploaded = await api.uploadRequestPhoto(photoFile);
        photoUrl = uploaded;
      }
      const warehouseId = await api.getDefaultWarehouseId();
      const { request, wasDuplicate } = await api.recordCustomerRequest({
        requestType,
        fabricId: fabricId || null,
        fabricType: fabricType || null,
        colorName: colorName || null,
        width: width ? Number(width) : null,
        quantityRequested: quantity ? Number(quantity) : null,
        photoUrl,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
        warehouseId,
        notes: notes || null,
      });
      setResult({ wasDuplicate, count: request.requestCount ?? request.request_count });
      setFabricId(""); setFabricType(""); setColorName(""); setWidth("");
      setQuantity(""); setCustomerName(""); setCustomerPhone(""); setNotes("");
      setPhotoFile(null); setPhotoPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onRecorded?.();
    } catch (err) {
      setFormError(err?.message ? t("logRequestGenericError") + `: ${err.message}` : t("logRequestGenericError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin">
      <div className="admin-toolbar">
        <h3>{t("logCustomerRequestTitle")}</h3>
      </div>

      {result && (
        <div className="sale-confirm">
          <Check size={15} />
          {result.wasDuplicate
            ? t("matchedExistingRequestMsg", { n: result.count })
            : t("newRequestLoggedMsg")}
        </div>
      )}

      <div className="table-wrap" style={{ padding: 18 }}>
        <label>{t("requestTypeLabel")}
          <select value={requestType} onChange={(e) => setRequestType(e.target.value)}>
            <option value="out_of_stock">{t("outOfStockOptionLabel")}</option>
            <option value="never_stocked">{t("neverStockedOptionLabel")}</option>
            <option value="special_order">{t("specialOrderOptionLabel")}</option>
          </select>
        </label>

        {requestType === "out_of_stock" && (
          <label>{t("whichFabricOptionalLabel")}
            <select value={fabricId} onChange={(e) => handleFabricPick(e.target.value)}>
              <option value="">{t("selectFabricEllipsis")}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.colorName} — {p.fabricType} ({p.sku})</option>
              ))}
            </select>
          </label>
        )}

        <div className="form-row">
          <label>{t("fabricTypeLabel")}
            <input value={fabricType} onChange={(e) => setFabricType(e.target.value)} placeholder={t("fabricTypePlaceholderExample")} />
          </label>
          <label>{t("colorLabel")}
            <input value={colorName} onChange={(e) => setColorName(e.target.value)} placeholder={t("colorPlaceholderExample")} />
          </label>
        </div>

        <div className="form-row">
          <label>{t("widthOptionalLabel")}
            <input type="number" value={width} onChange={(e) => setWidth(e.target.value)} />
          </label>
          <label>{t("quantityRequestedLabel")}
            <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </label>
        </div>

        <label>{t("swatchPhotoOptionalLabel")}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhoto} />
        </label>
        {photoPreview && <img src={photoPreview} alt={t("swatchPreviewAlt")} className="matcher-uploaded-img" />}

        <div className="form-row">
          <label>{t("customerNameOptional")}
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          </label>
          <label>{t("customerPhoneOptional")}
            <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          </label>
        </div>

        <label>{t("notesOptional")}
          <input value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        {formError && <p className="form-error">{formError}</p>}

        <button className="btn btn-primary" onClick={handleSubmit} disabled={saving} style={{ marginTop: 8 }}>
          {saving ? <Loader2 size={15} className="spin" /> : null} {t("logRequestBtn")}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DEMAND INTELLIGENCE — reporting + resolution view for customer requests.
// "Estimated lost revenue" is an explainable, rule-based estimate (quantity
// requested × the fabric's retail price, or the catalog's average retail
// price when the fabric was never stocked) — not a guess dressed up as a
// precise figure. It's meant to size the opportunity, not be exact.
// ---------------------------------------------------------------------------
function DemandIntelligence({ products }) {
  const { t } = useLang();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.fetchCustomerRequests().then(setRequests).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const avgRetailPrice = useMemo(() => {
    if (products.length === 0) return 0;
    return products.reduce((s, p) => s + Number(p.retailPrice), 0) / products.length;
  }, [products]);

  const fabricById = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);

  function estimatedValue(req) {
    const fabricId = req.fabricId || req.fabric_id;
    const qty = Number(req.quantityRequested ?? req.quantity_requested) || 1;
    const price = fabricById[fabricId]?.retailPrice ?? avgRetailPrice;
    const count = req.requestCount ?? req.request_count ?? 1;
    return qty * price * count;
  }

  async function handleStatus(id, status) {
    await api.setCustomerRequestStatus(id, status);
    load();
  }

  const openRequests = requests.filter((r) => r.status === "open");

  const mostRequested = [...openRequests]
    .sort((a, b) => (b.requestCount ?? b.request_count ?? 1) - (a.requestCount ?? a.request_count ?? 1))
    .slice(0, 8);

  const estimatedLostRevenue = openRequests.reduce((s, r) => s + estimatedValue(r), 0);

  const byType = { out_of_stock: 0, never_stocked: 0, special_order: 0 };
  for (const r of openRequests) {
    const type = r.requestType ?? r.request_type;
    if (type in byType) byType[type] += 1;
  }

  if (loading) {
    return (
      <div className="admin">
        <p className="loading-state"><Loader2 size={16} className="spin" /> {t("loadingRequestsMsg")}</p>
      </div>
    );
  }

  return (
    <div className="admin">
      <div className="admin-stats">
        <div className="stat-card warn">
          <span className="stat-label">{t("openRequestsLabel")}</span>
          <span className="stat-value">{openRequests.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">{t("outOfStockLabel")}</span>
          <span className="stat-value">{byType.out_of_stock}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">{t("neverStockedLabel")}</span>
          <span className="stat-value">{byType.never_stocked}</span>
        </div>
        <div className="stat-card danger">
          <span className="stat-label">{t("estLostRevenueLabel")}</span>
          <span className="stat-value">{CURRENCY_SYMBOL}{Math.round(estimatedLostRevenue).toLocaleString()}</span>
        </div>
      </div>
      <p className="dim" style={{ fontSize: "0.78rem", marginTop: -10, marginBottom: 20 }}>
        {t("estLostRevenueExplainerNote")}
      </p>

      <RankedList
        title={t("mostRequestedUnavailableLabel")}
        rows={mostRequested}
        empty={t("noOpenRequestsMsg")}
        renderRow={(r) => (
          <>
            <span>
              {(r.colorName ?? r.color_name) || t("unknownColorLabel")}
              <span className="dim"> — {(r.fabricType ?? r.fabric_type) || t("unknownTypeLabel")}</span>
            </span>
            <span className="mono">×{r.requestCount ?? r.request_count ?? 1}</span>
          </>
        )}
      />

      <div className="table-wrap" style={{ padding: 18, marginTop: 16 }}>
        <h4 style={{ margin: "0 0 12px" }}>{t("allOpenRequestsLabel")}</h4>
        {openRequests.length === 0 ? (
          <p className="dim" style={{ fontSize: "0.85rem" }}>{t("nothingLoggedYetMsg")}</p>
        ) : (
          <div className="request-list">
            {openRequests.map((r) => (
              <div className="request-row" key={r.id}>
                <RequestPhotoThumb path={r.photoUrl ?? r.photo_url} />
                <div className="request-details">
                  <strong>{(r.colorName ?? r.color_name) || t("unknownColorLabel")} — {(r.fabricType ?? r.fabric_type) || t("unknownTypeLabel")}</strong>
                  <span className="dim">
                    {(r.requestType ?? r.request_type)?.replace("_", " ")} · {t("requestedNTimesNote", { n: r.requestCount ?? r.request_count ?? 1 })} ·
                    {" "}{t("lastOnDateNote", { date: new Date(r.lastRequestedAt ?? r.last_requested_at).toLocaleDateString() })}
                  </span>
                  {(r.customerName ?? r.customer_name) && (
                    <span className="dim">{r.customerName ?? r.customer_name} {(r.customerPhone ?? r.customer_phone) ? `· ${r.customerPhone ?? r.customer_phone}` : ""}</span>
                  )}
                </div>
                <div className="request-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => handleStatus(r.id, "fulfilled")}>{t("fulfilledBtn")}</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleStatus(r.id, "dismissed")}>{t("dismissBtn")}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RequestPhotoThumb({ path }) {
  const { t } = useLang();
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (path) {
      api.getRequestPhotoUrl(path).then((resolved) => {
        if (!cancelled) setUrl(resolved);
      });
    }
    return () => { cancelled = true; };
  }, [path]);

  if (!path) return <div className="request-thumb request-thumb-empty" />;
  if (!url) return <div className="request-thumb request-thumb-empty"><Loader2 size={14} className="spin" /></div>;
  return <img src={url} alt={t("requestedSwatchAlt")} className="request-thumb" />;
}

// ---------------------------------------------------------------------------
// SUPPLIERS — simple CRUD over the suppliers table. No purchase-order
// workflow yet (that would need a schema addition); this is just contact
// info + notes, which is also what the Purchase List needs to point staff
// toward the right supplier for each fabric (see "supplier memory" below).
// ---------------------------------------------------------------------------
function SuppliersAdmin({ canManage }) {
  const { t } = useLang();
  const [suppliers, setSuppliers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [supplierOrders, setSupplierOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", addressLine: "", notes: "", lat: null, lng: null });
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [loggingOrderFor, setLoggingOrderFor] = useState(null); // supplierId currently logging an order (button spinner)
  const [receivingOrderId, setReceivingOrderId] = useState(null);

  function load() {
    setLoading(true);
    Promise.all([api.fetchSuppliers(), api.fetchProcurementData(), api.fetchSupplierOrders()])
      .then(([supplierRows, procurement, orders]) => {
        setSuppliers(supplierRows);
        setBatches(procurement?.batches || []);
        setSupplierOrders(orders || []);
      })
      .finally(() => setLoading(false));
  }

  async function logOrder(supplierId) {
    setLoggingOrderFor(supplierId);
    try {
      const order = await api.logSupplierOrder(supplierId);
      setSupplierOrders((prev) => [order, ...prev]);
    } finally {
      setLoggingOrderFor(null);
    }
  }

  async function receiveOrder(orderId) {
    setReceivingOrderId(orderId);
    try {
      const updated = await api.markSupplierOrderReceived(orderId);
      setSupplierOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    } finally {
      setReceivingOrderId(null);
    }
  }

  // Average lead time per supplier (days between ordered_at and
  // received_at), plus how many placed orders are still awaiting
  // delivery. Only orders logged through this feature count — see
  // schema_v9's note on why this can't be backfilled from past batches.
  const leadTimeBySupplier = useMemo(() => {
    const map = {};
    for (const o of supplierOrders) {
      const supplierId = o.supplierId ?? o.supplier_id;
      if (!supplierId) continue;
      const entry = map[supplierId] || { completedDays: [], open: [] };
      const receivedAt = o.receivedAt ?? o.received_at;
      const orderedAt = o.orderedAt ?? o.ordered_at;
      if (receivedAt) {
        const days = Math.round((new Date(receivedAt) - new Date(orderedAt)) / (24 * 60 * 60 * 1000));
        entry.completedDays.push(days);
      } else {
        entry.open.push(o);
      }
      map[supplierId] = entry;
    }
    const result = {};
    for (const [supplierId, entry] of Object.entries(map)) {
      const avg = entry.completedDays.length > 0
        ? entry.completedDays.reduce((s, d) => s + d, 0) / entry.completedDays.length
        : null;
      result[supplierId] = { avgDays: avg, completedCount: entry.completedDays.length, openOrders: entry.open };
    }
    return result;
  }, [supplierOrders]);

  // Best-rated suppliers first — an unrated supplier (rating null) sorts
  // to the bottom rather than the top, same logic a plain descending sort
  // would get wrong (null/undefined comparisons are unreliable in JS's
  // default sort). Ties (including all-unrated) keep their original
  // fetch order.
  const sortedSuppliers = useMemo(() => {
    return suppliers.slice().sort((a, b) => {
      const ra = a.rating ?? -1;
      const rb = b.rating ?? -1;
      return rb - ra;
    });
  }, [suppliers]);

  // All-time purchased totals per supplier — every batch ever bought from
  // them (not just meters_remaining, which drops as stock sells through;
  // this is a lifetime-purchases figure, so it uses meters_purchased and
  // never goes down).
  const totalsBySupplier = useMemo(() => {
    const map = {};
    for (const b of batches) {
      const supplierId = b.supplierId ?? b.supplier_id;
      if (!supplierId) continue; // manual stock adjustments have no supplier — see adjustFabricStock
      const meters = Number(b.metersPurchased ?? b.meters_purchased ?? 0);
      const cost = Number(b.costPerMeter ?? b.cost_per_meter ?? 0);
      const existing = map[supplierId] || { meters: 0, spend: 0 };
      existing.meters += meters;
      existing.spend += meters * cost;
      map[supplierId] = existing;
    }
    return map;
  }, [batches]);

  // Price trend flag: for each supplier, the biggest price increase seen
  // between a fabric's two most recent purchases from them (only looks at
  // consecutive purchases of the *same* fabric — comparing across
  // different fabrics wouldn't mean anything). A supplier only gets
  // flagged if at least one of their fabrics actually got more expensive
  // last time; flat or falling prices don't flag.
  const priceTrendBySupplier = useMemo(() => {
    const bySupplierFabric = {};
    for (const b of batches) {
      const supplierId = b.supplierId ?? b.supplier_id;
      const fabricId = b.fabricId ?? b.fabric_id;
      if (!supplierId || !fabricId) continue;
      const price = Number(b.costPerMeter ?? b.cost_per_meter);
      const purchasedAt = b.purchasedAt ?? b.purchased_at;
      bySupplierFabric[supplierId] = bySupplierFabric[supplierId] || {};
      (bySupplierFabric[supplierId][fabricId] = bySupplierFabric[supplierId][fabricId] || []).push({ price, purchasedAt });
    }
    const flags = {};
    for (const [supplierId, byFabric] of Object.entries(bySupplierFabric)) {
      let worstPct = 0;
      for (const entries of Object.values(byFabric)) {
        if (entries.length < 2) continue;
        entries.sort((a, b) => new Date(a.purchasedAt) - new Date(b.purchasedAt));
        const prev = entries[entries.length - 2].price;
        const latest = entries[entries.length - 1].price;
        if (prev > 0 && latest > prev) {
          const pct = (latest - prev) / prev;
          if (pct > worstPct) worstPct = pct;
        }
      }
      if (worstPct > 0) flags[supplierId] = worstPct;
    }
    return flags;
  }, [batches]);

  // "Haven't ordered from them in a while" nudge — last purchase date per
  // supplier, from the same batch history already loaded for totals/price
  // trend above, so a supplier that's quietly gone cold doesn't just
  // disappear from attention. Only flags suppliers with *some* purchase
  // history — a supplier you've genuinely never ordered from yet already
  // shows "No purchases yet" in the totals column, which says that more
  // plainly than a stale-nudge badge would.
  const STALE_SUPPLIER_WEEKS = 4;
  const lastPurchaseBySupplier = useMemo(() => {
    const map = {};
    for (const b of batches) {
      const supplierId = b.supplierId ?? b.supplier_id;
      if (!supplierId) continue;
      const purchasedAt = b.purchasedAt ?? b.purchased_at;
      if (!map[supplierId] || new Date(purchasedAt) > new Date(map[supplierId])) {
        map[supplierId] = purchasedAt;
      }
    }
    return map;
  }, [batches]);

  // Rating is inline-edited directly in the table (owner only — canManage
  // already gates this the same way it gates Edit/Delete, and the DB's
  // suppliers_update_owner_only RLS policy backs it up server-side).
  async function saveRating(supplierId, value) {
    const parsed = value === "" ? null : Number(value);
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 1 || parsed > 10)) return;
    await api.updateSupplier(supplierId, { rating: parsed });
    setSuppliers((prev) => prev.map((s) => (s.id === supplierId ? { ...s, rating: parsed } : s)));
  }

  useEffect(() => { load(); }, []);

  function startAdd() {
    setEditingId(null);
    setForm({ name: "", phone: "", addressLine: "", notes: "", lat: null, lng: null });
    setLocError(null);
    setShowForm(true);
  }

  function startEdit(s) {
    if (!canManage) return;
    setEditingId(s.id);
    setForm({
      name: s.name,
      phone: s.phone || "",
      addressLine: s.addressLine ?? s.address_line ?? "",
      notes: s.notes || "",
      lat: s.lat ?? null,
      lng: s.lng ?? null,
    });
    setLocError(null);
    setShowForm(true);
  }

  // Same pattern as the wholesale buyer signup form (WholesaleRequestForm)
  // — a one-tap GPS pin so staff visiting or calling a supplier can find
  // the exact location later, not just a general area from a text address.
  function captureLocation() {
    setLocating(true);
    setLocError(null);
    if (!navigator.geolocation) {
      setLocError(t("locationNotAvailableError"));
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        setLocating(false);
      },
      () => {
        setLocError(t("couldNotGetLocationError"));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await api.updateSupplier(editingId, form);
      } else {
        await api.addSupplier(form);
      }
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  function requestRemove(supplier) {
    if (!canManage) return;
    setPendingDelete(supplier);
  }

  async function confirmRemove() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.deleteSupplier(pendingDelete.id);
      setPendingDelete(null);
      load();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="admin">
      <div className="admin-toolbar">
        <h3>{t("suppliersTitle")}</h3>
        <button className="btn btn-primary btn-sm" onClick={startAdd}><Plus size={14} /> {t("addSupplierBtn")}</button>
      </div>

      {loading ? (
        <p className="loading-state"><Loader2 size={16} className="spin" /> {t("loadingSuppliersMsg")}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("nameLabel")}</th>
                <th>{t("phoneTableLabel")}</th>
                <th>{t("addressLabel")}</th>
                <th>{t("totalPurchasedLabel")}</th>
                <th>{t("leadTimeLabel")}</th>
                {canManage && <th>{t("ratingLabel")}</th>}
                <th>{t("locationLabel")}</th>
                <th>{t("notesLabel")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedSuppliers.map((s) => {
                const lat = s.lat ?? null;
                const lng = s.lng ?? null;
                const mapUrl = lat != null && lng != null ? `https://www.google.com/maps?q=${lat},${lng}` : null;
                const totals = totalsBySupplier[s.id];
                const trendPct = priceTrendBySupplier[s.id];
                const leadInfo = leadTimeBySupplier[s.id];
                const lastPurchase = lastPurchaseBySupplier[s.id];
                const weeksSinceOrder = lastPurchase ? Math.floor((Date.now() - new Date(lastPurchase)) / (7 * 24 * 60 * 60 * 1000)) : null;
                const isStale = weeksSinceOrder !== null && weeksSinceOrder >= STALE_SUPPLIER_WEEKS;
                return (
                  <tr key={s.id}>
                    <td>
                      {s.name}
                      {isStale && (
                        <span className="stale-supplier-flag" title={t("staleSupplierHint", { n: weeksSinceOrder })}>
                          <Clock size={11} /> {t("staleSupplierBadge", { n: weeksSinceOrder })}
                        </span>
                      )}
                    </td>
                    <td className="mono">{s.phone || "—"}</td>
                    <td>{s.addressLine ?? s.address_line ?? "—"}</td>
                    <td className="mono">
                      {totals ? (
                        <>
                          {Math.round(totals.meters).toLocaleString()}m
                          <span className="dim" style={{ fontSize: "0.72rem" }}> · {CURRENCY_SYMBOL}{Math.round(totals.spend).toLocaleString()}</span>
                          {trendPct > 0 && (
                            <span
                              className="price-trend-flag"
                              title={t("priceTrendFlagHint", { pct: Math.round(trendPct * 100) })}
                            >
                              <TrendingUp size={12} /> {Math.round(trendPct * 100)}%
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="dim">{t("noPurchasesYetLabel")}</span>
                      )}
                    </td>
                    <td>
                      <div className="lead-time-cell">
                        {leadInfo?.avgDays != null ? (
                          <span className="mono">{t("avgDaysLabel", { n: Math.round(leadInfo.avgDays) })}</span>
                        ) : (
                          <span className="dim" style={{ fontSize: "0.78rem" }}>{t("noLeadTimeDataLabel")}</span>
                        )}
                        {leadInfo?.openOrders?.length > 0 && (
                          <span className="dim" style={{ fontSize: "0.72rem", display: "block" }}>
                            {t("awaitingDeliveryLabel", { n: leadInfo.openOrders.length })}
                            {" "}
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ padding: "1px 6px" }}
                              disabled={receivingOrderId === leadInfo.openOrders[0].id}
                              onClick={() => receiveOrder(leadInfo.openOrders[0].id)}
                            >
                              {receivingOrderId === leadInfo.openOrders[0].id ? <Loader2 size={11} className="spin" /> : t("markReceivedBtn")}
                            </button>
                          </span>
                        )}
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ padding: "1px 6px", marginTop: 4 }}
                          disabled={loggingOrderFor === s.id}
                          onClick={() => logOrder(s.id)}
                        >
                          {loggingOrderFor === s.id ? <Loader2 size={11} className="spin" /> : t("logOrderBtn")}
                        </button>
                      </div>
                    </td>
                    {canManage && (
                      <td>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          className="rating-input"
                          defaultValue={s.rating ?? ""}
                          placeholder="—"
                          onBlur={(e) => saveRating(s.id, e.target.value)}
                        />
                      </td>
                    )}
                    <td>
                      {mapUrl ? (
                        <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="map-link">
                          <MapPin size={12} /> {t("openInMapsLabel")}
                        </a>
                      ) : (
                        <span className="dim" style={{ fontSize: "0.78rem" }}>{t("noPinLabel")}</span>
                      )}
                    </td>
                    <td className="dim">{s.notes || "—"}</td>
                    <td className="row-actions">
                      {canManage ? (
                        <>
                          {s.phone && (
                            <button
                              title={t("saveToContactsBtn")}
                              onClick={() => downloadVCard({
                                fullName: s.name,
                                orgName: "Supplier — Raihan Fabrics",
                                phone: s.phone,
                                addressLine: s.addressLine ?? s.address_line ?? "",
                                note: s.notes,
                                category: "Raihan Fabrics Suppliers",
                              })}
                            >
                              <Contact size={14} />
                            </button>
                          )}
                          <button onClick={() => startEdit(s)}><Pencil size={14} /></button>
                          <button onClick={() => requestRemove(s)}><Trash2 size={14} /></button>
                        </>
                      ) : (
                        <span className="dim" style={{ fontSize: "0.78rem" }}>{t("ownerOnlyLabel")}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {suppliers.length === 0 && (
                <tr><td colSpan={canManage ? 9 : 8} className="dim" style={{ textAlign: "center", padding: 20 }}>{t("noSuppliersYetMsg")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="drawer-backdrop" onClick={() => setShowForm(false)}>
          <div className="drawer form-drawer" onClick={(e) => e.stopPropagation()}>
            <button className="drawer-close" onClick={() => setShowForm(false)}><X size={18} /></button>
            <h2>{editingId ? t("editSupplierTitle") : t("addSupplierBtn")}</h2>

            <label>{t("nameLabel")}
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>{t("phoneTableLabel")}
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label>{t("addressLabel")}
              <input value={form.addressLine} onChange={(e) => setForm({ ...form, addressLine: e.target.value })} />
            </label>
            <label>{t("notesLabel")}
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t("supplierNotesPlaceholder")} />
            </label>

            <label>{t("gpsLocationLabel")} <span className="optional">{t("gpsLocationOptionalNote")}</span>
              <div className="geo-capture">
                <button type="button" className="btn btn-ghost btn-sm" onClick={captureLocation} disabled={locating}>
                  <MapPin size={14} /> {locating ? t("locatingLabel") : form.lat ? t("retakeLocationBtn") : t("captureCurrentLocationBtn")}
                </button>
                {form.lat != null && (
                  <span className="geo-confirmed"><Check size={13} /> {form.lat.toFixed(5)}, {form.lng.toFixed(5)}</span>
                )}
                {locError && <span className="geo-error">{locError}</span>}
              </div>
            </label>
            <p className="matcher-hint" style={{ marginTop: -4 }}>
              <Sparkles size={12} /> {t("supplierLocationHintNote")}
            </p>

            <button className="btn btn-primary" onClick={save} disabled={saving} style={{ marginTop: 8 }}>
              {saving ? <Loader2 size={15} className="spin" /> : null} {editingId ? t("saveChangesBtn") : t("addSupplierBtn")}
            </button>
          </div>
        </div>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={t("deleteSupplierTitle")}
          body={t("deleteSupplierBody", { name: pendingDelete.name })}
          confirmLabel={t("deleteConfirmBtn")}
          cancelLabel={t("cancelBtn")}
          busy={deleting}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmRemove}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PURCHASE LIST — Phase 3's Smart Purchase List + Purchase Priority Score.
//
// The priority score is a simple, explainable weighted formula — not a
// model. It only uses factors that are real and computable today:
//   - stock urgency       (out of stock scores higher than low stock)
//   - sales velocity      (meters sold recently, from Phase 1's logic)
//   - customer demand     (open requests for this fabric, from Phase 2)
//   - profit margin       (higher-margin items break ties upward)
//
// Lead time and seasonality are in the original spec but are deliberately
// NOT included yet: lead time would need real purchase-order history
// (there's no PO tracking yet, just batches after the fact), and
// seasonality needs a year+ of sales history this shop doesn't have yet.
// Adding fabricated inputs for either would make the score look more
// sophisticated than it actually is. Revisit once that data exists.
// ---------------------------------------------------------------------------
// Manually-added Purchase List items previously lived only in this
// component's React state — closing the tab, refreshing, or just
// navigating to another screen and back silently threw them away, and
// "seed a new Market Mode trip from the Purchase List" never saw them at
// all (it independently re-ran the auto-recommendation math from
// scratch — see buildPurchaseListSeed below — rather than reading what
// was actually on this screen). Persisting just the fabric IDs here
// fixes both: this component reloads them on mount, and
// buildPurchaseListSeed reads the same storage key when building a
// trip's seed list.
const MANUAL_PURCHASE_ITEMS_KEY = "swatchbook_purchase_list_manual_fabric_ids";

function readPersistedManualFabricIds() {
  try {
    const raw = localStorage.getItem(MANUAL_PURCHASE_ITEMS_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

function writePersistedManualFabricIds(ids) {
  try {
    localStorage.setItem(MANUAL_PURCHASE_ITEMS_KEY, JSON.stringify(ids));
  } catch {
    // Storage can fail (private browsing, quota) — losing this convenience
    // isn't worth surfacing an error over.
  }
}

// Lets the owner override the auto-suggested purchase quantity per fabric
// (e.g. "usually we'd suggest 30m, but I know this order needs 80m") —
// persisted the same way as manual items above, and read by
// buildPurchaseListSeed so an edited quantity actually flows into the
// Market Mode trip it seeds, not just this screen's own display.
const QTY_OVERRIDES_KEY = "swatchbook_purchase_list_qty_overrides";

function readPersistedQtyOverrides() {
  try {
    const raw = localStorage.getItem(QTY_OVERRIDES_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" && !Array.isArray(obj) ? obj : {};
  } catch {
    return {};
  }
}

function writePersistedQtyOverrides(overrides) {
  try {
    localStorage.setItem(QTY_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    // Same reasoning as writePersistedManualFabricIds — non-critical.
  }
}

function PurchaseList({ products }) {
  const { t } = useLang();
  const [dashData, setDashData] = useState(null);
  const [procurement, setProcurement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmingClearAll, setConfirmingClearAll] = useState(false);
  const [manualItems, setManualItems] = useState([]);
  const [manualFabricId, setManualFabricId] = useState("");
  const [manualQuery, setManualQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [qtyOverrides, setQtyOverrides] = useState(() => readPersistedQtyOverrides());
  const [editingQtyId, setEditingQtyId] = useState(null);
  const [editQtyValue, setEditQtyValue] = useState("");

  function startEditQty(item) {
    setEditingQtyId(item.product.id);
    setEditQtyValue(String(item.suggestedQuantity));
  }

  function saveEditQty(fabricId) {
    const parsed = Number(editQtyValue);
    setQtyOverrides((prev) => {
      const next = { ...prev };
      if (Number.isFinite(parsed) && parsed > 0) {
        next[fabricId] = parsed;
      } else {
        delete next[fabricId]; // invalid/blank input clears the override back to the suggestion
      }
      writePersistedQtyOverrides(next);
      return next;
    });
    setEditingQtyId(null);
  }

  useEffect(() => {
    Promise.all([api.fetchDashboardMetrics(), api.fetchProcurementData()])
      .then(([dash, proc]) => { setDashData(dash); setProcurement(proc); })
      .finally(() => setLoading(false));
  }, []);
  const supplierById = useMemo(() => {
    if (!procurement) return {};
    return Object.fromEntries(procurement.suppliers.map((s) => [s.id, s]));
  }, [procurement]);

  // Most recent batch per fabric = "supplier memory": who we last bought
  // it from, at what price, and when.
  const lastBatchByFabric = useMemo(() => {
    if (!procurement) return {};
    const map = {};
    for (const b of procurement.batches) {
      const fid = b.fabricId ?? b.fabric_id;
      const existing = map[fid];
      const purchasedAt = b.purchasedAt ?? b.purchased_at;
      if (!existing || new Date(purchasedAt) > new Date(existing.purchasedAt ?? existing.purchased_at)) {
        map[fid] = b;
      }
    }
    return map;
  }, [procurement]);

  const purchaseList = useMemo(() => {
    if (!dashData) return [];
    const { sales, saleItems, openRequests = [] } = dashData;
    const saleById = Object.fromEntries(sales.map((s) => [s.id, s]));

    // Meters sold in the last 30 days, per fabric — recent velocity matters
    // more for reorder urgency than all-time totals.
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentMetersByFabric = {};
    for (const item of saleItems) {
      const sale = saleById[item.saleId ?? item.sale_id];
      if (!sale) continue;
      const soldAt = new Date(sale.soldAt ?? sale.sold_at);
      if (soldAt < thirtyDaysAgo) continue;
      const fid = item.fabricId ?? item.fabric_id;
      recentMetersByFabric[fid] = (recentMetersByFabric[fid] || 0) + Number(item.meters);
    }

    const norm = (s) => (s || "").trim().toLowerCase();
    function requestCountFor(product) {
      return openRequests
        .filter((r) => {
          const rFabricId = r.fabricId ?? r.fabric_id;
          if (rFabricId) return rFabricId === product.id;
          return norm(r.fabricType ?? r.fabric_type) === norm(product.fabricType) && norm(r.colorName ?? r.color_name) === norm(product.colorName);
        })
        .reduce((s, r) => s + (r.requestCount ?? r.request_count ?? 1), 0);
    }

    const candidates = products.filter((p) => Number(p.stockMeters) < 20); // low stock or out of stock

    return candidates.map((p) => {
      const stockMeters = Number(p.stockMeters);
      const recentMeters = recentMetersByFabric[p.id] || 0;
      const requestCount = requestCountFor(p);
      const lastBatch = lastBatchByFabric[p.id];
      const margin = p.retailPrice > 0 ? ((p.retailPrice - (lastBatch?.costPerMeter ?? lastBatch?.cost_per_meter ?? p.wholesalePrice * 0.8)) / p.retailPrice) : 0;

      // Score components, each roughly 0-10 before weighting, so no single
      // factor can silently dominate:
      const stockUrgency = stockMeters === 0 ? 10 : Math.max(0, 10 - stockMeters / 2); // 0m -> 10, 20m -> 0
      const velocityScore = Math.min(10, recentMeters / 5); // 50m/mo -> capped at 10
      const demandScore = Math.min(10, requestCount * 3); // each open request is a strong signal
      const marginScore = Math.max(0, Math.min(10, margin * 20)); // 50% margin -> 10

      const priorityScore = stockUrgency * 3 + velocityScore * 2.5 + demandScore * 3 + marginScore * 1.5;

      const reasons = [];
      if (stockMeters === 0) reasons.push("out of stock");
      else if (stockMeters < 10) reasons.push(`only ${stockMeters}m left`);
      if (recentMeters > 0) reasons.push(`${recentMeters}m sold in last 30 days`);
      if (requestCount > 0) reasons.push(`${requestCount} customer request${requestCount > 1 ? "s" : ""}`);
      if (margin > 0.3) reasons.push(`${Math.round(margin * 100)}% margin`);
      if (reasons.length === 0) reasons.push("low stock");

      // Suggested quantity: cover ~60 days of recent velocity, or a small
      // standard restock if there's no sales history to go on yet.
      const suggestedQuantity = recentMeters > 0 ? Math.ceil(recentMeters * 2) : 30;
      const estimatedCost = lastBatch?.costPerMeter ?? lastBatch?.cost_per_meter ?? p.wholesalePrice * 0.8;
      const estimatedBudget = suggestedQuantity * estimatedCost;

      const supplierId = lastBatch?.supplierId ?? lastBatch?.supplier_id;
      const supplier = supplierId ? supplierById[supplierId] : null;

      return {
        product: p,
        priorityScore,
        reasons,
        suggestedQuantity,
        estimatedBudget,
        supplier,
        lastPrice: lastBatch?.costPerMeter ?? lastBatch?.cost_per_meter,
        lastPurchaseDate: lastBatch?.purchasedAt ?? lastBatch?.purchased_at,
      };
    }).sort((a, b) => b.priorityScore - a.priorityScore);
  }, [dashData, products, lastBatchByFabric, supplierById]);

  const totalBudget = [...purchaseList, ...manualItems].reduce((s, item) => s + (item.estimatedBudget || 0), 0);

  // Rebuild manualItems from whatever fabric IDs were persisted last time,
  // once we actually have products/pricing data to reconstruct full
  // entries from. Runs once real data is ready (guarded by the `procurement`
  // and `manualItems.length === 0` checks so it doesn't stomp on items
  // added later in the same session).
  useEffect(() => {
    if (!procurement || manualItems.length > 0) return;
    const persistedIds = readPersistedManualFabricIds();
    if (persistedIds.length === 0) return;
    const restored = persistedIds
      .map((fabricId) => {
        const product = products.find((p) => p.id === fabricId);
        if (!product) return null;
        const lastBatch = lastBatchByFabric[fabricId];
        const estimatedCost = lastBatch?.costPerMeter ?? lastBatch?.cost_per_meter ?? product.wholesalePrice * 0.8;
        return {
          product,
          priorityScore: null,
          reasons: ["manually added"],
          suggestedQuantity: 30,
          estimatedBudget: 30 * estimatedCost,
          supplier: lastBatch ? supplierById[lastBatch.supplierId ?? lastBatch.supplier_id] : null,
          lastPrice: lastBatch?.costPerMeter ?? lastBatch?.cost_per_meter,
          lastPurchaseDate: lastBatch?.purchasedAt ?? lastBatch?.purchased_at,
          manual: true,
        };
      })
      .filter(Boolean);
    if (restored.length > 0) setManualItems(restored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [procurement, products]);

  function addManualItem(fabricId) {
    const product = products.find((p) => p.id === fabricId);
    if (!product || manualItems.some((m) => m.product.id === fabricId) || purchaseList.some((m) => m.product.id === fabricId)) return;
    const lastBatch = lastBatchByFabric[fabricId];
    const estimatedCost = lastBatch?.costPerMeter ?? lastBatch?.cost_per_meter ?? product.wholesalePrice * 0.8;
    setManualItems((prev) => {
      const next = [...prev, {
        product,
        priorityScore: null,
        reasons: ["manually added"],
        suggestedQuantity: 30,
        estimatedBudget: 30 * estimatedCost,
        supplier: lastBatch ? supplierById[lastBatch.supplierId ?? lastBatch.supplier_id] : null,
        lastPrice: lastBatch?.costPerMeter ?? lastBatch?.cost_per_meter,
        lastPurchaseDate: lastBatch?.purchasedAt ?? lastBatch?.purchased_at,
        manual: true,
      }];
      writePersistedManualFabricIds(next.map((m) => m.product.id));
      return next;
    });
    setManualFabricId("");
    setManualQuery("");
  }

  function selectManualFabric(product) {
    setManualFabricId(product.id);
    setManualQuery(`${product.colorName} — ${product.fabricType} (${product.sku})`);
    setShowSuggestions(false);
  }

  // Typeahead over SKU / color / fabric type — plain fabrics.map() is fine
  // at this catalog size (thousands of rows, not millions; see README's
  // scale note), so no need for a search index here.
  const manualSuggestions = useMemo(() => {
    const q = manualQuery.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => p.sku?.toLowerCase().includes(q) || p.colorName?.toLowerCase().includes(q) || p.fabricType?.toLowerCase().includes(q))
      .slice(0, 20);
  }, [manualQuery, products]);

  function removeManualItem(fabricId) {
    setManualItems((prev) => {
      const next = prev.filter((m) => m.product.id !== fabricId);
      writePersistedManualFabricIds(next.map((m) => m.product.id));
      return next;
    });
  }

  if (loading) {
    return (
      <div className="admin">
        <p className="loading-state"><Loader2 size={16} className="spin" /> {t("buildingPurchaseListMsg")}</p>
      </div>
    );
  }

  // Overrides are applied here, once, on the combined list rather than
  // threaded through purchaseList's scoring math or manualItems — keeps
  // the priority-scoring logic above untouched and this the single place
  // that reconciles "what we'd suggest" with "what the owner actually
  // planned".
  const allItems = [...purchaseList, ...manualItems].map((item) => {
    const override = qtyOverrides[item.product.id];
    if (override === undefined) return item;
    const unitCost = item.suggestedQuantity > 0 ? item.estimatedBudget / item.suggestedQuantity : (item.lastPrice || 0);
    return { ...item, suggestedQuantity: override, estimatedBudget: override * unitCost, quantityOverridden: true };
  });

  return (
    <div className="admin">
      <div className="admin-stats">
        <div className="stat-card warn">
          <span className="stat-label">{t("itemsToPurchaseLabel")}</span>
          <span className="stat-value">{allItems.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">{t("estimatedBudgetLabel")}</span>
          <span className="stat-value">{CURRENCY_SYMBOL}{Math.round(totalBudget).toLocaleString()}</span>
        </div>
      </div>

      <div className="table-wrap" style={{ padding: 18, marginBottom: 16, overflow: "visible" }}>
        <label>{t("addFabricManuallyLabel")}
          <div style={{ display: "flex", gap: 8, position: "relative" }}>
            <div className="manual-search-wrap" style={{ flex: 1, position: "relative" }}>
              <input
                type="text"
                value={manualQuery}
                placeholder={t("fabricSearchPlaceholder")}
                onChange={(e) => {
                  setManualQuery(e.target.value);
                  setManualFabricId("");
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              />
              {showSuggestions && manualQuery.trim() && (
                <div className="manual-suggestions">
                  {manualSuggestions.length === 0 ? (
                    <div className="manual-suggestion-empty">{t("noFabricsMatchSearch", { q: manualQuery })}</div>
                  ) : (
                    manualSuggestions.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        className="manual-suggestion-item"
                        onMouseDown={() => selectManualFabric(p)}
                      >
                        <span className="table-swatch" style={{ background: p.hex }} />
                        <span>{p.colorName} — {p.fabricType}</span>
                        <span className="mono dim">{p.sku}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => addManualItem(manualFabricId)} disabled={!manualFabricId}>
              <Plus size={14} /> {t("addBtn")}
            </button>
          </div>
        </label>
        {manualItems.length > 0 && (
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 10 }}
            onClick={() => setConfirmingClearAll(true)}
          >
            <Trash2 size={14} /> {t("clearAllManuallyAddedBtn", { n: manualItems.length })}
          </button>
        )}
      </div>

      {confirmingClearAll && (
        <ConfirmDialog
          title={t("clearManualItemsTitle")}
          body={t("clearManualItemsBody", { n: manualItems.length })}
          confirmLabel={t("clearAllBtn")}
          cancelLabel={t("cancelBtn")}
          onCancel={() => setConfirmingClearAll(false)}
          onConfirm={() => {
            setManualItems([]);
            writePersistedManualFabricIds([]);
            setConfirmingClearAll(false);
          }}
        />
      )}

      {allItems.length === 0 ? (
        <p className="dim">{t("nothingNeedsPurchasingMsg")}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("tableFabric")}</th>
                <th>{t("priorityLabel")}</th>
                <th>{t("reasonLabel")}</th>
                <th>{t("suggestedQtyLabel")}</th>
                <th>{t("estBudgetLabel")}</th>
                <th>{t("preferredSupplierLabel")}</th>
                <th>{t("lastPriceLabel")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {allItems.map((item) => (
                <tr key={item.product.id}>
                  <td>{item.product.colorName} <span className="dim">— {item.product.fabricType}</span></td>
                  <td>{item.priorityScore !== null ? Math.round(item.priorityScore) : <span className="dim">{t("manualLabel")}</span>}</td>
                  <td className="dim" style={{ fontSize: "0.78rem" }}>{item.reasons.join(" · ")}</td>
                  <td className="mono">
                    {editingQtyId === item.product.id ? (
                      <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                        <input
                          type="number"
                          min="1"
                          autoFocus
                          value={editQtyValue}
                          onChange={(e) => setEditQtyValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveEditQty(item.product.id); if (e.key === "Escape") setEditingQtyId(null); }}
                          style={{ width: 64 }}
                        />
                        <button className="icon-btn" onClick={() => saveEditQty(item.product.id)} aria-label={t("saveBtn")}><Check size={14} /></button>
                      </span>
                    ) : (
                      <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                        {item.suggestedQuantity}m
                        {item.quantityOverridden && <span className="dim" style={{ fontSize: "0.7rem" }}>({t("plannedLabel")})</span>}
                        <button className="icon-btn" onClick={() => startEditQty(item)} aria-label={t("editQtyBtn")} title={t("editQtyBtn")}>
                          <Pencil size={12} />
                        </button>
                      </span>
                    )}
                  </td>
                  <td className="mono">{CURRENCY_SYMBOL}{Math.round(item.estimatedBudget).toLocaleString()}</td>
                  <td>{item.supplier?.name || <span className="dim">{t("noHistoryLabel")}</span>}</td>
                  <td className="mono">
                    {item.lastPrice ? `${CURRENCY_SYMBOL}${item.lastPrice}` : "—"}
                    {item.lastPurchaseDate && <span className="dim"> · {new Date(item.lastPurchaseDate).toLocaleDateString()}</span>}
                  </td>
                  <td>
                    {item.manual && (
                      <button className="icon-btn" onClick={() => removeManualItem(item.product.id)}><Trash2 size={14} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MARKET MODE (Phase 4) — an offline-tolerant shopping assistant for
// visiting wholesalers. Two views: a list of trips (sessions), and an
// active trip's shopping list.
//
// Offline handling: writes made while offline go through marketOutbox.js
// (queued in localStorage, replayed in order once back online). This is a
// simple outbox, not a full sync engine — reasonable for one shop's staff
// on one device at a time; see README for why a heavier sync library
// wasn't used. Reads still require a connection when in Supabase mode —
// only the mutations that would otherwise be lost mid-trip are queued.
// ---------------------------------------------------------------------------
function MarketMode({ products, currentUser, onProductsChanged }) {
  const { t } = useLang();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [showNewTrip, setShowNewTrip] = useState(false);
  const [online, setOnline] = useState(marketOutbox.isOnline());
  const [queuedCount, setQueuedCount] = useState(marketOutbox.getQueuedCount());
  // Supplier purchase history, used to suggest "who did we buy this from
  // (at the best price)" when confirming a purchase in a trip — see
  // bestSupplierForFabric. Best-effort: if this fails to load (e.g. no
  // connection right when the screen opens), the purchase form just falls
  // back to no suggestion rather than blocking the trip on it.
  const [procurement, setProcurement] = useState(null);
  useEffect(() => {
    if (!online) return;
    marketOutbox.withTimeout(api.fetchProcurementData()).then(setProcurement).catch(() => {});
  }, [online]);

  function load() {
    setLoading(true);
    setLoadError(null);
    marketOutbox.withTimeout(api.fetchShoppingSessions())
      .then((data) => setSessions(data))
      .catch((err) => setLoadError(err?.message || t("couldNotLoadTripsError")))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    function handleOnline() {
      setOnline(true);
      if (api.isBackendLive) {
        marketOutbox.flushOutbox(api.rawBackend).then((result) => {
          setQueuedCount(result.remaining);
          if (result.flushed > 0) load();
        });
      }
    }
    function handleOffline() { setOnline(false); }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  async function handleCreateTrip({ title, seedFromPurchaseList }) {
    let seedItems = [];
    if (seedFromPurchaseList) {
      // Re-derive the current Purchase List so the trip starts pre-loaded
      // with what actually needs buying, instead of staff retyping it.
      const [dash, procurement] = await marketOutbox.withTimeout(
        Promise.all([api.fetchDashboardMetrics(), api.fetchProcurementData()])
      );
      seedItems = buildPurchaseListSeed(products, dash, procurement);
    }
    const session = await marketOutbox.withTimeout(api.createShoppingSession({
      title,
      createdBy: currentUser?.id,
      seedItems,
    }));
    load();
    setShowNewTrip(false);
    setActiveSessionId(session.id);
  }

  if (activeSessionId) {
    return (
      <ShoppingTrip
        sessionId={activeSessionId}
        products={products}
        online={online}
        suppliers={procurement?.suppliers || []}
        batches={procurement?.batches || []}
        onBack={() => { setActiveSessionId(null); load(); }}
        onQueuedCountChange={setQueuedCount}
        onProductsChanged={onProductsChanged}
      />
    );
  }

  return (
    <div className="admin">
      <div className="admin-toolbar">
        <h3>{t("marketModeTitle")}</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ConnectionBadge online={online} queuedCount={queuedCount} />
          <button className="btn btn-primary btn-sm" onClick={() => setShowNewTrip(true)}>
            <Plus size={14} /> {t("startTripBtn")}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="loading-state"><Loader2 size={16} className="spin" /> {t("loadingTripsMsg")}</p>
      ) : loadError ? (
        <div className="load-error-state">
          <p>{loadError}</p>
          <button className="btn btn-ghost btn-sm" onClick={load}>{t("retryBtn")}</button>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>{t("tripLabel")}</th><th>{t("statusLabel")}</th><th>{t("startedLabel")}</th><th></th></tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="clickable-row" onClick={() => setActiveSessionId(s.id)}>
                  <td>{s.title}</td>
                  <td><span className={`status-pill ${s.status}`}>{s.status}</span></td>
                  <td className="dim">{new Date(s.startedAt ?? s.started_at).toLocaleDateString()}</td>
                  <td><ChevronRight size={16} /></td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr><td colSpan={4} className="dim" style={{ textAlign: "center", padding: 20 }}>{t("noTripsYetMsg")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showNewTrip && (
        <NewTripForm onCancel={() => setShowNewTrip(false)} onCreate={handleCreateTrip} />
      )}
    </div>
  );
}

function ConnectionBadge({ online, queuedCount }) {
  const { t } = useLang();
  if (online && queuedCount === 0) return null; // don't clutter the UI when everything's normal
  return (
    <span className={`connection-badge ${online ? "syncing" : "offline"}`}>
      {online ? <Wifi size={13} /> : <WifiOff size={13} />}
      {online ? t("syncingChangesLabel", { n: queuedCount }) : (queuedCount > 0 ? t("offlineQueuedLabel", { n: queuedCount }) : t("offlineLabel"))}
    </span>
  );
}

function NewTripForm({ onCancel, onCreate }) {
  const { t } = useLang();
  const [title, setTitle] = useState(`${t("marketTripDefaultName")} — ${new Date().toLocaleDateString()}`);
  const [seedFromPurchaseList, setSeedFromPurchaseList] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  async function handleCreate() {
    if (!title.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await onCreate({ title, seedFromPurchaseList });
    } catch (err) {
      setCreateError(err?.message || t("couldNotSaveGenericError"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="drawer-backdrop" onClick={onCancel}>
      <div className="drawer form-drawer" onClick={(e) => e.stopPropagation()}>
        <button className="drawer-close" onClick={onCancel}><X size={18} /></button>
        <h2>{t("startMarketTripTitle")}</h2>
        <label>{t("tripNameLabel")}
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={seedFromPurchaseList} onChange={(e) => setSeedFromPurchaseList(e.target.checked)} style={{ width: "auto" }} />
          {t("preloadPurchaseListLabel")}
        </label>
        {createError && <p className="form-error">{createError}</p>}
        <button className="btn btn-primary" onClick={handleCreate} disabled={creating} style={{ marginTop: 8 }}>
          {creating ? <Loader2 size={15} className="spin" /> : null} {t("startTripBtn")}
        </button>
      </div>
    </div>
  );
}

// Picks who to buy a fabric from, based on purchase history: if it's been
// bought from more than one supplier before, the one that historically
// offered the lowest price wins (a tie between suppliers at the same price
// is broken by whichever was more recent). A fabric with only one supplier
// in its history just returns that one. Returns null if the fabric has
// never been purchased from a known supplier before.
function bestSupplierForFabric(fabricId, batches, supplierById) {
  if (!fabricId || !batches) return null;
  const bySupplier = {};
  for (const b of batches) {
    const fid = b.fabricId ?? b.fabric_id;
    if (fid !== fabricId) continue;
    const sid = b.supplierId ?? b.supplier_id;
    if (!sid) continue;
    const price = Number(b.costPerMeter ?? b.cost_per_meter);
    const purchasedAt = b.purchasedAt ?? b.purchased_at;
    const existing = bySupplier[sid];
    if (!existing || price < existing.price || (price === existing.price && new Date(purchasedAt) > new Date(existing.purchasedAt))) {
      bySupplier[sid] = { supplierId: sid, price, purchasedAt };
    }
  }
  const options = Object.values(bySupplier).sort(
    (a, b) => a.price - b.price || new Date(b.purchasedAt) - new Date(a.purchasedAt)
  );
  if (options.length === 0) return null;
  const best = options[0];
  return {
    supplierId: best.supplierId,
    supplierName: supplierById?.[best.supplierId]?.name || null,
    price: best.price,
    alternateCount: options.length - 1,
  };
}

// Reuses the same priority-scoring logic as PurchaseList so a trip seeded
// "from the Purchase List" actually matches what that screen shows,
// instead of drifting into a second, slightly different formula.
function buildPurchaseListSeed(products, dashData, procurement) {
  const { sales, saleItems, openRequests = [] } = dashData;
  const saleById = Object.fromEntries(sales.map((s) => [s.id, s]));
  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentMetersByFabric = {};
  for (const item of saleItems) {
    const sale = saleById[item.saleId ?? item.sale_id];
    if (!sale) continue;
    if (new Date(sale.soldAt ?? sale.sold_at) < thirtyDaysAgo) continue;
    const fid = item.fabricId ?? item.fabric_id;
    recentMetersByFabric[fid] = (recentMetersByFabric[fid] || 0) + Number(item.meters);
  }
  const norm = (s) => (s || "").trim().toLowerCase();
  function requestCountFor(product) {
    return openRequests.filter((r) => {
      const rFabricId = r.fabricId ?? r.fabric_id;
      if (rFabricId) return rFabricId === product.id;
      return norm(r.fabricType ?? r.fabric_type) === norm(product.fabricType) && norm(r.colorName ?? r.color_name) === norm(product.colorName);
    }).reduce((s, r) => s + (r.requestCount ?? r.request_count ?? 1), 0);
  }
  const supplierById = Object.fromEntries((procurement.suppliers || []).map((s) => [s.id, s]));

  const autoSeedItems = products
    .filter((p) => Number(p.stockMeters) < 20)
    .map((p) => {
      const stockMeters = Number(p.stockMeters);
      const recentMeters = recentMetersByFabric[p.id] || 0;
      const requestCount = requestCountFor(p);
      const stockUrgency = stockMeters === 0 ? 10 : Math.max(0, 10 - stockMeters / 2);
      const velocityScore = Math.min(10, recentMeters / 5);
      const demandScore = Math.min(10, requestCount * 3);
      const priorityScore = stockUrgency * 3 + velocityScore * 2.5 + demandScore * 3;
      const reasons = [];
      if (stockMeters === 0) reasons.push("out of stock");
      else if (stockMeters < 10) reasons.push(`only ${stockMeters}m left`);
      if (recentMeters > 0) reasons.push(`${recentMeters}m sold recently`);
      if (requestCount > 0) reasons.push(`${requestCount} requested`);
      // Best-price supplier from purchase history, not just whoever we
      // bought it from most recently — see bestSupplierForFabric.
      const bestSupplier = bestSupplierForFabric(p.id, procurement.batches, supplierById);
      return {
        fabricId: p.id,
        fabricType: p.fabricType,
        colorName: p.colorName,
        plannedQuantity: recentMeters > 0 ? Math.ceil(recentMeters * 2) : 30,
        supplierId: bestSupplier?.supplierId || null,
        reason: reasons.join(" · "),
        priorityScore,
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);

  // This used to be the entire return value — but it only ever contains
  // the automatic recommendations, never anything staff typed into
  // "Add a fabric manually" on the Purchase List screen, since that was
  // computed by a completely separate function (see PurchaseList's own
  // `purchaseList`/`manualItems`) with no connection to this one. Merge
  // in whatever's persisted as manually added, skipping any fabric
  // that's already in the automatic list so nothing shows up twice.
  const autoFabricIds = new Set(autoSeedItems.map((i) => i.fabricId));
  const manualSeedItems = readPersistedManualFabricIds()
    .filter((fabricId) => !autoFabricIds.has(fabricId))
    .map((fabricId) => {
      const p = products.find((pr) => pr.id === fabricId);
      if (!p) return null;
      const bestSupplier = bestSupplierForFabric(fabricId, procurement.batches, supplierById);
      return {
        fabricId: p.id,
        fabricType: p.fabricType,
        colorName: p.colorName,
        plannedQuantity: 30,
        supplierId: bestSupplier?.supplierId || null,
        reason: "manually added",
        priorityScore: null,
      };
    })
    .filter(Boolean);

  // Respect whatever the owner edited on the Purchase List screen (the
  // pencil-icon quantity edit) — same override storage that screen writes
  // to, so a trip seeded from the Purchase List loads the planned amount,
  // not the raw auto-suggestion it was edited away from.
  const qtyOverrides = readPersistedQtyOverrides();
  return [...manualSeedItems, ...autoSeedItems].map((item) => {
    const override = qtyOverrides[item.fabricId];
    return override !== undefined ? { ...item, plannedQuantity: override } : item;
  });
}

const SHOPPING_STATUSES = ["planned", "purchased", "partial", "unavailable", "skipped"];

// ---------------------------------------------------------------------------
// SHOPPING TRIP — the actual in-market screen: live list, status buttons
// per item, progress summary, collection completion, trip notes, and
// closing the trip out (which turns purchased/partial items into real
// stock — see api.closeShoppingSession).
// ---------------------------------------------------------------------------
function ShoppingTrip({ sessionId, products, online, suppliers, batches, onBack, onQueuedCountChange, onProductsChanged }) {
  const { t } = useLang();
  const [session, setSession] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [showAddItem, setShowAddItem] = useState(false);
  const [closing, setClosing] = useState(false);
  const [collectionType, setCollectionType] = useState("");
  const [loadError, setLoadError] = useState(null);

  function load() {
    setLoading(true);
    setLoadError(null);
    if (online) {
      marketOutbox.withTimeout(Promise.all([api.fetchShoppingSessions(), api.fetchShoppingItems(sessionId)]))
        .then(([sessions, fetchedItems]) => {
          const s = sessions.find((x) => x.id === sessionId);
          setSession(s);
          setNotes(s?.notes || "");
          setItems(fetchedItems);
          marketOutbox.primeCache(sessions, fetchedItems);
        })
        .catch((err) => {
          // A stalled/failed live fetch shouldn't leave the screen blank —
          // fall back to whatever was last cached so the trip is still
          // usable, and surface the error so a retry is one tap away
          // instead of a full page refresh.
          const cache = marketOutbox.getCache();
          const s = cache.sessions.find((x) => x.id === sessionId);
          if (s) {
            setSession(s);
            setNotes(s?.notes || "");
            setItems(cache.items.filter((i) => i.sessionId === sessionId));
          }
          setLoadError(err?.message || t("couldNotLoadTripError"));
        })
        .finally(() => setLoading(false));
    } else {
      // Offline: fall back to whatever was last cached before connectivity
      // dropped, plus anything queued locally since.
      const cache = marketOutbox.getCache();
      const s = cache.sessions.find((x) => x.id === sessionId);
      setSession(s);
      setNotes(s?.notes || "");
      setItems(cache.items.filter((i) => i.sessionId === sessionId));
      setLoading(false);
    }
  }

  // Re-fetching every session in the shop just to refresh one trip's item
  // list was the "loads a lot on every step" complaint — especially
  // costly on the patchy mobile connections this screen is meant for.
  // Item-level actions (check something off, add a discovered item) only
  // need the items for *this* trip refreshed, not the whole session list.
  function loadItemsOnly() {
    if (!online) {
      const cache = marketOutbox.getCache();
      setItems(cache.items.filter((i) => i.sessionId === sessionId));
      return Promise.resolve();
    }
    return marketOutbox.withTimeout(api.fetchShoppingItems(sessionId))
      .then((fetchedItems) => {
        setItems(fetchedItems);
        marketOutbox.primeCache(null, fetchedItems);
      })
      .catch(() => {
        // Swallowed on purpose: the write that triggered this refresh has
        // already been applied optimistically (see updateItemStatus /
        // addDiscoveredItem below), so a failed *refresh* just means the
        // list stays on its optimistic state until the next successful
        // sync rather than reverting or getting stuck.
      });
  }

  useEffect(() => { load(); }, [sessionId, online]);

  async function updateItemStatus(item, status, extra = {}) {
    const updates = { status, ...extra };
    // Update the visible list immediately so a tap always registers right
    // away, even on the slow/patchy connections this screen is used on —
    // this is what fixes "hit purchase, sometimes needs a refresh to take
    // effect": previously the row only updated after a full round trip to
    // Supabase, which could stall indefinitely with nothing shown for it.
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...updates, _pending: true } : i)));
    if (online) {
      try {
        await marketOutbox.withTimeout(api.updateShoppingItem(item.id, updates));
        await loadItemsOnly();
      } catch (err) {
        // `online` (navigator.onLine) can be true while the actual write
        // still fails or times out on bad market wifi. Fall back to the
        // offline outbox instead of leaving the optimistic update stranded
        // with no way to ever sync it.
        marketOutbox.queueUpdateItem(item.id, updates);
        onQueuedCountChange(marketOutbox.getQueuedCount());
      }
    } else {
      marketOutbox.queueUpdateItem(item.id, updates);
      onQueuedCountChange(marketOutbox.getQueuedCount());
    }
  }

  async function saveNotes() {
    if (online) {
      await api.updateShoppingSessionNotes(sessionId, notes);
    } else {
      marketOutbox.queueUpdateSessionNotes(sessionId, notes);
      onQueuedCountChange(marketOutbox.getQueuedCount());
    }
  }

  async function addDiscoveredItem({ fabricType, colorName, plannedQuantity }) {
    const payload = { fabricType, colorName, plannedQuantity: plannedQuantity || null, isDiscovered: true };
    if (online) {
      try {
        await marketOutbox.withTimeout(api.addShoppingItem(sessionId, payload));
        await loadItemsOnly();
      } catch (err) {
        // Same reasoning as updateItemStatus: a stalled write on flaky
        // market wifi shouldn't silently drop the item — queue it so it
        // still syncs once the connection recovers.
        marketOutbox.queueAddItem(sessionId, payload);
        onQueuedCountChange(marketOutbox.getQueuedCount());
        setItems((prev) => [...prev, { id: "pending_" + Date.now(), sessionId, status: "planned", ...payload, _pending: true }]);
      }
    } else {
      marketOutbox.queueAddItem(sessionId, payload);
      onQueuedCountChange(marketOutbox.getQueuedCount());
      setItems((prev) => [...prev, { id: "pending_" + Date.now(), sessionId, status: "planned", ...payload, _pending: true }]);
    }
    setShowAddItem(false);
  }

  async function handleCloseTrip() {
    setClosing(true);
    try {
      const warehouseId = await marketOutbox.withTimeout(api.getDefaultWarehouseId());
      const result = await marketOutbox.withTimeout(api.closeShoppingSession(sessionId, { warehouseId }), 20000);
      const skippedNote = result.skipped ? " " + t("itemsSkippedNote", { n: result.skipped }) : "";
      alert(t("tripClosedMsg", { n: result.batchesCreated }) + skippedNote);
      // A manually-added Purchase List entry exists to remind someone to
      // go buy that fabric — once this trip has actually bought it, that
      // reminder no longer serves a purpose, so drop it instead of leaving
      // it to be noticed and cleared by hand. (Auto-suggested entries need
      // no equivalent handling: they're derived live from current stock
      // levels, so one already disappears on its own once stock is back
      // above the low-stock threshold — see PurchaseList's `candidates`.)
      if (result.purchasedFabricIds?.length) {
        const currentManualIds = readPersistedManualFabricIds();
        const stillNeeded = currentManualIds.filter((id) => !result.purchasedFabricIds.includes(id));
        if (stillNeeded.length !== currentManualIds.length) {
          writePersistedManualFabricIds(stillNeeded);
        }
      }
      if (result.batchesCreated > 0) await onProductsChanged?.();
      onBack();
    } catch (err) {
      alert(err?.message ? t("couldNotCloseTripError") + `: ${err.message}` : t("couldNotCloseTripGenericError"));
    } finally {
      setClosing(false);
    }
  }

  const progress = useMemo(() => {
    const counts = { planned: 0, purchased: 0, partial: 0, unavailable: 0, skipped: 0 };
    for (const i of items) counts[i.status] = (counts[i.status] || 0) + 1;
    const remaining = counts.planned;
    return { ...counts, total: items.length, remaining };
  }, [items]);

  // "Which suppliers have I bought these before from, and at what price" —
  // scoped only to items that were already on this trip when it was
  // created (i.e. loaded from the Purchase List, isDiscovered false/unset),
  // not fabrics found on the spot mid-trip (isDiscovered true) — those by
  // definition have no "planned supplier" to suggest, you're standing at
  // whoever's stall you found them at. Grouped by supplier so one stop
  // covering several planned items shows up as one card, not one per fabric.
  const supplierSuggestions = useMemo(() => {
    const supplierByIdLocal = Object.fromEntries((suppliers || []).map((s) => [s.id, s]));
    const plannedItems = items.filter((i) => !(i.isDiscovered ?? i.is_discovered));
    const groups = {};
    for (const item of plannedItems) {
      const fabricId = item.fabricId ?? item.fabric_id;
      if (!fabricId) continue;
      const history = bestSupplierForFabric(fabricId, batches, supplierByIdLocal);
      if (!history) continue;
      const existing = groups[history.supplierId] || { supplierId: history.supplierId, supplierName: history.supplierName, fabrics: [] };
      existing.fabrics.push({
        fabricType: item.fabricType ?? item.fabric_type,
        colorName: item.colorName ?? item.color_name,
        price: history.price,
      });
      groups[history.supplierId] = existing;
    }
    return Object.values(groups).sort((a, b) => b.fabrics.length - a.fabrics.length);
  }, [items, batches, suppliers]);

  // Collection completion: for a chosen fabric type, which colors exist in
  // the catalog vs. this trip's shopping list. This uses the catalog's own
  // existing colors as the "expected" set — there's no separate canonical
  // collection definition, so this shows "colors we've carried before but
  // aren't currently stocking/buying," not "colors that officially belong
  // to this line." Worth a real collections concept later if that
  // distinction matters.
  const collectionTypes = useMemo(() => [...new Set(products.map((p) => p.fabricType))].sort(), [products]);
  const collectionStatus = useMemo(() => {
    if (!collectionType) return null;
    const knownColors = [...new Set(products.filter((p) => p.fabricType === collectionType).map((p) => p.colorName))];
    const inStockColors = new Set(products.filter((p) => p.fabricType === collectionType && Number(p.stockMeters) > 0).map((p) => p.colorName));
    const onThisTripColors = new Set(
      items.filter((i) => (i.fabricType ?? i.fabric_type) === collectionType && i.status !== "skipped").map((i) => i.colorName ?? i.color_name)
    );
    return knownColors.map((color) => ({
      color,
      covered: inStockColors.has(color) || onThisTripColors.has(color),
    }));
  }, [collectionType, products, items]);

  if (loading) {
    return (
      <div className="admin">
        <p className="loading-state"><Loader2 size={16} className="spin" /> {t("loadingTripMsg")}</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="admin">
        <div className="admin-toolbar">
          <button className="btn btn-ghost btn-sm" onClick={onBack}><ArrowLeft size={14} /> {t("allTripsBtn")}</button>
        </div>
        <div className="load-error-state">
          <p>{loadError || t("couldNotLoadTripError")}</p>
          <button className="btn btn-ghost btn-sm" onClick={load}>{t("retryBtn")}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin">
      <div className="admin-toolbar">
        <button className="btn btn-ghost btn-sm" onClick={onBack}><ArrowLeft size={14} /> {t("allTripsBtn")}</button>
        <ConnectionBadge online={online} queuedCount={marketOutbox.getQueuedCount()} />
      </div>

      <h3 style={{ marginTop: 4 }}>{session.title}</h3>

      {loadError && (
        <div className="load-error-banner">
          <span>{loadError}</span>
          <button className="btn btn-ghost btn-sm" onClick={load}>{t("retryBtn")}</button>
        </div>
      )}

      <div className="progress-summary">
        <span><strong>{progress.total}</strong> {t("plannedLabel")}</span>
        <span className="ok"><strong>{progress.purchased}</strong> {t("purchasedLabel")}</span>
        <span className="warn"><strong>{progress.partial}</strong> {t("partialLabel")}</span>
        <span className="danger"><strong>{progress.unavailable}</strong> {t("unavailableLabel")}</span>
        <span className="dim"><strong>{progress.skipped}</strong> {t("skippedLabel")}</span>
        <span><strong>{progress.remaining}</strong> {t("remainingLabel")}</span>
      </div>

      {supplierSuggestions.length > 0 && (
        <div className="table-wrap" style={{ padding: 18, marginBottom: 16 }}>
          <h4 style={{ margin: "0 0 4px" }}>{t("suggestedSuppliersTitle")}</h4>
          <p className="dim" style={{ fontSize: "0.8rem", marginTop: 0, marginBottom: 12 }}>{t("suggestedSuppliersHint")}</p>
          <div className="request-list">
            {supplierSuggestions.map((group) => (
              <div key={group.supplierId} className="progress-summary" style={{ background: "var(--cotton-deep)", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
                <strong>{group.supplierName}</strong>
                <span className="dim" style={{ fontSize: "0.82rem" }}>
                  {group.fabrics.map((f) => `${f.colorName} — ${f.fabricType} (${CURRENCY_SYMBOL}${f.price}/m)`).join(" · ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="table-wrap" style={{ padding: 18, marginBottom: 16 }}>
        <div className="admin-toolbar" style={{ marginBottom: 8 }}>
          <h4 style={{ margin: 0 }}>{t("shoppingListLabel")}</h4>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowAddItem(true)}><Plus size={14} /> {t("addDiscoveredItemBtn")}</button>
        </div>
        {items.length === 0 ? (
          <p className="dim" style={{ fontSize: "0.85rem" }}>{t("noItemsYetMsg")}</p>
        ) : (
          <div className="request-list">
            {items.map((item) => (
              <ShoppingListRow key={item.id} item={item} suppliers={suppliers} batches={batches} onSetStatus={updateItemStatus} onProductsChanged={onProductsChanged} />
            ))}
          </div>
        )}
      </div>

      <div className="table-wrap" style={{ padding: 18, marginBottom: 16 }}>
        <h4 style={{ margin: "0 0 12px" }}>{t("collectionCompletionLabel")}</h4>
        <select value={collectionType} onChange={(e) => setCollectionType(e.target.value)} style={{ marginBottom: 12 }}>
          <option value="">{t("checkFabricTypeEllipsis")}</option>
          {collectionTypes.map((ft) => <option key={ft} value={ft}>{ft}</option>)}
        </select>
        {collectionStatus && (
          <div className="collection-grid">
            {collectionStatus.map(({ color, covered }) => (
              <span key={color} className={`collection-chip ${covered ? "covered" : "missing"}`}>
                {covered ? <Check size={12} /> : <X size={12} />} {color}
              </span>
            ))}
          </div>
        )}
        <p className="dim" style={{ fontSize: "0.75rem", marginTop: 10 }}>
          {t("collectionCompletionNote")}
        </p>
      </div>

      <div className="table-wrap" style={{ padding: 18, marginBottom: 16 }}>
        <h4 style={{ margin: "0 0 12px" }}>{t("tripNotesLabel")}</h4>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          rows={3}
          placeholder={t("tripNotesPlaceholder")}
          className="trip-notes-textarea"
        />
      </div>

      {(session.status === "open" || session.status === "closed") && (
        <button className="btn btn-primary" onClick={handleCloseTrip} disabled={closing || !online}>
          {closing ? <Loader2 size={15} className="spin" /> : null}
          {session.status === "closed" ? t("recheckAddRemainingBtn") : t("closeTripBtn")}
        </button>
      )}
      {!online && (
        <p className="dim" style={{ fontSize: "0.78rem", marginTop: 6 }}>{t("closingTripNeedsConnectionNote")}</p>
      )}
      {session.status === "closed" && (
        <p className="dim" style={{ marginTop: 6 }}>
          {t("tripClosedFollowupNote")}
        </p>
      )}

      {showAddItem && (
        <AddDiscoveredItemForm onCancel={() => setShowAddItem(false)} onAdd={addDiscoveredItem} />
      )}
    </div>
  );
}

function ShoppingListRow({ item, suppliers, batches, onSetStatus, onProductsChanged }) {
  const { t } = useLang();
  const [showDetails, setShowDetails] = useState(false);
  const [actualQuantity, setActualQuantity] = useState(item.actualQuantity ?? item.actual_quantity ?? "");
  const [actualPrice, setActualPrice] = useState(item.actualPricePerMeter ?? item.actual_price_per_meter ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const status = item.status;
  const fabricType = item.fabricType ?? item.fabric_type;
  const colorName = item.colorName ?? item.color_name;
  const plannedQuantity = item.plannedQuantity ?? item.planned_quantity;
  const reason = item.reason;
  const fabricId = item.fabricId ?? item.fabric_id;
  // A "discovered" item was typed in on the spot at the supplier — it was
  // never matched to anything already in the catalog, so there's no
  // fabric row to attach a purchase to yet. Marking one purchased needs a
  // few more catalog fields collected first, or closing the trip later
  // has nothing to create a stock batch against and silently skips it
  // (see CHANGES readme: this was the "0 items added to inventory" bug).
  const needsNewFabric = !fabricId;

  const [hex, setHex] = useState("#8a8a8a");
  const [width, setWidth] = useState("");
  const [gsm, setGsm] = useState("");
  const [retailPrice, setRetailPrice] = useState("");
  const [sku, setSku] = useState(() => `MKT-${Date.now().toString(36).toUpperCase()}`);

  // Who to buy this from: the supplier who's historically offered the
  // best price for this fabric (see bestSupplierForFabric), pre-filled
  // but always editable/clearable — this is a suggestion, not a
  // requirement. Falls back to whatever supplier was already recorded on
  // this item (e.g. from a seeded Purchase List entry) if there's no
  // richer price history yet.
  const supplierById = useMemo(() => Object.fromEntries((suppliers || []).map((s) => [s.id, s])), [suppliers]);
  const suggestion = useMemo(
    () => (needsNewFabric ? null : bestSupplierForFabric(fabricId, batches, supplierById)),
    [needsNewFabric, fabricId, batches, supplierById]
  );
  const [supplierId, setSupplierId] = useState(
    () => item.supplierId ?? item.supplier_id ?? suggestion?.supplierId ?? ""
  );
  useEffect(() => {
    // Only auto-fill once a suggestion becomes available and the field is
    // still untouched — never overwrite a value staff already chose.
    if (!supplierId && suggestion?.supplierId) setSupplierId(suggestion.supplierId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestion]);

  async function confirmPurchase(targetStatus) {
    setSaveError(null);
    const extra = {
      actualQuantity: actualQuantity ? Number(actualQuantity) : null,
      actualPricePerMeter: actualPrice ? Number(actualPrice) : null,
      supplierId: supplierId || null,
    };
    setSaving(true);
    try {
      if (needsNewFabric) {
        if (!width || !gsm || !retailPrice || !sku) {
          setSaveError(t("fillCatalogDetailsError"));
          setSaving(false);
          return;
        }
        const newFabric = await api.addProduct({
          fabricType: fabricType || "Unspecified",
          colorName: colorName || "Unspecified",
          hex,
          width: Number(width),
          gsm: Number(gsm),
          retailPrice: Number(retailPrice),
          // Wholesale price defaults to 80% of retail if not given one —
          // same fallback the rest of the app already uses for estimating
          // cost before a real wholesale price is known — the owner can
          // adjust it later in Inventory.
          wholesalePrice: Number(retailPrice) * 0.8,
          stockMeters: 0, // stock is added via the stock-batch/movement created when the trip closes, not here directly
          sku,
        });
        extra.fabricId = newFabric.id;
        await onProductsChanged?.();
      }
      await onSetStatus(item, targetStatus, extra);
      setShowDetails(false);
    } catch (err) {
      setSaveError(err?.message || t("couldNotSaveGenericError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="request-row shopping-row">
      <div className="request-details">
        <strong>{colorName || t("unknownColorLabel")} <span className="dim">— {fabricType || t("unknownTypeLabel")}</span></strong>
        {plannedQuantity && <span className="dim">{t("nMetersPlannedLabel", { n: plannedQuantity })}</span>}
        {reason && <span className="dim">{reason}</span>}
        {needsNewFabric && status !== "unavailable" && status !== "skipped" && <span className="dim pending-tag">{t("notYetInCatalogLabel")}</span>}
        {item._pending && <span className="dim pending-tag">{t("notYetSyncedLabel")}</span>}
      </div>
      <div className="request-actions">
        {status === "planned" && (
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowDetails(!showDetails)}>{t("purchasedBtn")}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => onSetStatus(item, "unavailable")}>{t("unavailableBtn")}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => onSetStatus(item, "skipped")}>{t("skipBtn")}</button>
          </>
        )}
        {(status === "purchased" || status === "partial") && (
          <>
            <span className={`status-pill ${status}`}>{status}</span>
            {needsNewFabric && (
              <button className="btn btn-ghost btn-sm" onClick={() => setShowDetails(!showDetails)}>{t("fixBtn")}</button>
            )}
          </>
        )}
        {(status === "unavailable" || status === "skipped") && <span className={`status-pill ${status}`}>{status}</span>}
      </div>
      {showDetails && (
        <div className="purchase-detail-form">
          <input type="number" placeholder={t("metersBoughtPlaceholder")} value={actualQuantity} onChange={(e) => setActualQuantity(e.target.value)} />
          <input type="number" placeholder={t("pricePerMeterPlaceholder")} value={actualPrice} onChange={(e) => setActualPrice(e.target.value)} />
          {!needsNewFabric && (
            <label className="supplier-field">
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">{t("supplierOptionalPlaceholder")}</option>
                {(suppliers || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}{suggestion?.supplierId === s.id ? ` — ${t("suggestedLabel")}` : ""}
                  </option>
                ))}
              </select>
              {suggestion && (
                <span className="dim" style={{ fontSize: "0.74rem" }}>
                  {suggestion.alternateCount > 0
                    ? t("bestPriceSupplierNote", { name: suggestion.supplierName, price: suggestion.price })
                    : t("previousSupplierNote", { name: suggestion.supplierName })}
                </span>
              )}
            </label>
          )}
          {needsNewFabric && (
            <>
              <p className="dim" style={{ fontSize: "0.78rem", width: "100%", margin: "4px 0" }}>
                {t("notInCatalogYetNote")}
              </p>
              <label style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                {t("colorLabel")} <input type="color" value={hex} onChange={(e) => setHex(e.target.value)} style={{ width: 44, padding: 2 }} />
              </label>
              <input type="number" placeholder={t("widthCmPlaceholder")} value={width} onChange={(e) => setWidth(e.target.value)} />
              <input type="number" placeholder={t("gsmPlaceholder")} value={gsm} onChange={(e) => setGsm(e.target.value)} />
              <input type="number" placeholder={t("retailPricePerMeterPlaceholder")} value={retailPrice} onChange={(e) => setRetailPrice(e.target.value)} />
              <input type="text" placeholder={t("skuPlaceholder")} value={sku} onChange={(e) => setSku(e.target.value)} />
            </>
          )}
          {saveError && <p className="form-error" style={{ width: "100%" }}>{saveError}</p>}
          <button
            className="btn btn-primary btn-sm"
            disabled={saving}
            onClick={() => confirmPurchase(Number(actualQuantity) < Number(plannedQuantity) ? "partial" : "purchased")}
          >
            {saving ? <Loader2 size={14} className="spin" /> : null} {t("confirmBtn")}
          </button>
        </div>
      )}
    </div>
  );
}

function AddDiscoveredItemForm({ onCancel, onAdd }) {
  const { t } = useLang();
  const [fabricType, setFabricType] = useState("");
  const [colorName, setColorName] = useState("");
  const [plannedQuantity, setPlannedQuantity] = useState("");
  const [saving, setSaving] = useState(false);

  // On a slow connection (the exact situation Market Mode is built for —
  // shopping at a supplier with patchy signal), nothing here previously
  // told you a tap had registered, so an impatient second, third, or
  // seventh tap each fired its own insert. This guards against that.
  async function handleAdd() {
    if (saving) return;
    setSaving(true);
    try {
      await onAdd({ fabricType, colorName, plannedQuantity: plannedQuantity ? Number(plannedQuantity) : null });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="drawer-backdrop" onClick={onCancel}>
      <div className="drawer form-drawer" onClick={(e) => e.stopPropagation()}>
        <button className="drawer-close" onClick={onCancel}><X size={18} /></button>
        <h2>{t("addDiscoveredProductTitle")}</h2>
        <label>{t("fabricTypeLabel")}
          <input value={fabricType} onChange={(e) => setFabricType(e.target.value)} placeholder={t("georgetteExamplePlaceholder")} />
        </label>
        <label>{t("colorLabel")}
          <input value={colorName} onChange={(e) => setColorName(e.target.value)} placeholder={t("colorPlaceholderExample")} />
        </label>
        <label>{t("quantityOfInterestLabel")}
          <input type="number" value={plannedQuantity} onChange={(e) => setPlannedQuantity(e.target.value)} />
        </label>
        <button
          className="btn btn-primary"
          onClick={handleAdd}
          disabled={saving || (!fabricType && !colorName)}
          style={{ marginTop: 8 }}
        >
          {saving ? <Loader2 size={15} className="spin" /> : null} {t("addToListBtn")}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CART PANEL — multi-item order review. Since a wa.me link can only carry
// one pre-filled message, this screen is where multiple selections get
// consolidated into a single order before handing off to WhatsApp.
// ---------------------------------------------------------------------------

function CartLineItem({ item, mode, onUpdateQty, onRemove }) {
  const { t } = useLang();
  const presets = QTY_PRESETS[mode];
  const displayMinQty = mode === "wholesale" ? WHOLESALE_MIN_METERS : RETAIL_MIN_METERS;
  // The smallest value actually enterable — distinct from displayMinQty,
  // which for wholesale is the *recommended* minimum (30m) rather than a
  // hard floor; a wholesale line can still be typed lower, it just shows
  // the "below minimum" warning below.
  const enterableMin = mode === "wholesale" ? 1 : RETAIL_MIN_METERS;
  const step = mode === "wholesale" ? 1 : RETAIL_QTY_STEP;
  const belowMin = mode === "wholesale" && item.qty < WHOLESALE_MIN_METERS;
  const price = mode === "wholesale" ? item.product.wholesalePrice : item.product.retailPrice;

  // The custom-quantity box keeps its own editable text so the field can
  // go through an empty state while backspacing. Previously every
  // keystroke ran straight through `Math.max(1, Number(value) || 1)`,
  // which turned "" into 1 immediately — the last digit could never
  // actually be deleted, it just snapped back. This mirrors item.qty
  // whenever it changes from elsewhere (e.g. a preset button tap), but
  // otherwise tracks raw typed input and only clamps to a valid minimum
  // on blur, so the cart itself is never left with an empty quantity.
  const [rawQty, setRawQty] = useState(String(item.qty));
  useEffect(() => { setRawQty(String(item.qty)); }, [item.qty]);

  function handleQtyChange(e) {
    const val = e.target.value;
    setRawQty(val);
    if (val.trim() === "") return; // let the field stay empty while editing
    const n = Number(val);
    if (Number.isFinite(n) && n >= enterableMin) onUpdateQty(item.product.id, n);
  }

  function handleQtyBlur() {
    const n = Number(rawQty);
    if (rawQty.trim() === "" || !Number.isFinite(n) || n < enterableMin) {
      const fallback = Math.max(enterableMin, item.qty || enterableMin);
      setRawQty(String(fallback));
      onUpdateQty(item.product.id, fallback);
    }
  }

  return (
    <div className="cart-line">
      <span className="cart-line-swatch" style={{ background: item.product.hex }} />
      <div className="cart-line-info">
        <span className="cart-line-name">{item.product.colorName}</span>
        <span className="cart-line-sub">{item.product.fabricType} · {item.product.width}" · {CURRENCY_SYMBOL}{price}/m</span>
        {belowMin && <span className="cart-line-warn">{t("belowMinimum", { min: displayMinQty })}</span>}
      </div>
      <div className="cart-line-qty">
        <span className="mini-label">{t("cartQuantity")}</span>
        <div className="qty-presets">
          {presets.map((p) => (
            <button
              key={p}
              className={item.qty === p ? "active" : ""}
              onClick={() => onUpdateQty(item.product.id, p)}
            >
              {p}
            </button>
          ))}
          <input
            type="number"
            min={enterableMin}
            step={step}
            className="qty-custom"
            value={rawQty}
            onChange={handleQtyChange}
            onBlur={handleQtyBlur}
            title={t("cartCustomQty")}
          />
        </div>
      </div>
      <button className="cart-line-remove" onClick={() => onRemove(item.product.id)}>
        <Trash2 size={15} />
      </button>
    </div>
  );
}

function CartPanel({ cart, mode, onUpdateQty, onRemove, onClear, onClose, buyerLabel }) {
  const { t } = useLang();
  const totalMeters = cart.reduce((sum, i) => sum + Number(i.qty || 0), 0);
  const minQty = mode === "wholesale" ? WHOLESALE_MIN_METERS : 1;

  function handleSend() {
    const url = buildWhatsAppOrderUrl(cart, mode, buyerLabel);
    window.open(url, "_blank");
  }

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="drawer cart-drawer" onClick={(e) => e.stopPropagation()}>
        <button className="drawer-close" onClick={onClose}><X size={18} /></button>
        <div className="drawer-body">
          <h2>{t("cartTitle")}</h2>

          {cart.length === 0 ? (
            <p className="empty-state">{t("cartEmpty")}</p>
          ) : (
            <>
              {mode === "wholesale" && (
                <p className="cart-min-notice">{t("cartMinNotice", { min: minQty })}</p>
              )}
              <div className="cart-lines">
                {cart.map((item) => (
                  <CartLineItem key={item.product.id} item={item} mode={mode} onUpdateQty={onUpdateQty} onRemove={onRemove} />
                ))}
              </div>

              <div className="cart-total-row">
                <span>{t("cartTotal")}</span>
                <span className="cart-total-value">{totalMeters} {t("cartTotalMeters")}</span>
              </div>

              <div className="drawer-actions">
                <button className="btn btn-primary" onClick={handleSend}>
                  {t("sendViaWhatsapp")}
                </button>
                <button className="btn btn-ghost" onClick={onClear}>
                  {t("cartClear")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AUTH — staff/admin login and wholesale buyer login. This is a front-end
// demo of the intended flow: credentials are checked against in-memory seed
// data, which is fine for prototyping but is NOT real security — anyone
// could read the "passwords" from browser dev tools. A real deployment
// needs this logic to live in a backend (e.g. Supabase Auth) so credentials
// and role checks are enforced server-side, not just hidden in the UI.
// ---------------------------------------------------------------------------

function StaffLogin({ onLogin, onCancel }) {
  const { t } = useLang();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(false);
    try {
      const user = await api.staffSignIn(username, password);
      onLogin(user);
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="matcher">
      <div className="auth-card">
        <img src="/logo-full.png" alt="Raihan Fabrics" className="auth-logo" />
        <h2>{t("staffLoginTitle")}</h2>
        <p className="hero-sub">{t("staffLoginSub")}</p>
        <form onSubmit={submit} className="auth-form">
          <label>{t("usernameLabel")}
            <input value={username} onChange={(e) => { setUsername(e.target.value); setError(false); }} autoComplete="username" />
          </label>
          <label>{t("passwordLabel")}
            <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(false); }} autoComplete="current-password" />
          </label>
          {error && <p className="auth-error">{t("loginError")}</p>}
          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ marginTop: 6 }}>
            {submitting ? <Loader2 size={15} className="spin" /> : null} {t("signIn")}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>{t("continueBrowsing")}</button>
        </form>
      </div>
    </div>
  );
}

function WholesaleLogin({ onLogin, onGoToRequest, onCancel }) {
  const { t } = useLang();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(false);
    try {
      const account = await api.wholesaleSignIn(phone, password);
      onLogin(account);
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="matcher">
      <div className="auth-card">
        <img src="/logo-full.png" alt="Raihan Fabrics" className="auth-logo" />
        <h2>{t("wholesaleLoginTitle")}</h2>
        <p className="hero-sub">
          {t("wholesaleLoginSub")}{" "}
          <button type="button" className="auth-link" onClick={onGoToRequest}>{t("requestAccessLink")}</button>
        </p>
        <form onSubmit={submit} className="auth-form">
          <label>{t("phoneNumberLabel")}
            <input value={phone} onChange={(e) => { setPhone(e.target.value); setError(false); }} placeholder="+93 …" autoComplete="tel" />
          </label>
          <label>{t("passwordLabel")}
            <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(false); }} autoComplete="current-password" />
          </label>
          {error && <p className="auth-error">{t("wholesaleLoginError")}</p>}
          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ marginTop: 6 }}>
            {submitting ? <Loader2 size={15} className="spin" /> : null} {t("signIn")}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>{t("continueBrowsing")}</button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CONTACT — business address (placeholder text + coordinates) and direct
// WhatsApp/phone contact, separate from the wholesale order flow.
// ---------------------------------------------------------------------------

function ContactSection() {
  const { t } = useLang();
  const mapUrl = `https://www.google.com/maps?q=${SHOP_INFO.lat},${SHOP_INFO.lng}`;
  const whatsappUrl = `https://wa.me/${SHOP_WHATSAPP_NUMBER}`;
  const telUrl = `tel:${SHOP_INFO.phoneDisplay.replace(/\s/g, "")}`;

  return (
    <div className="matcher">
      <div className="matcher-intro">
        <p className="eyebrow">{t("navContact")}</p>
        <h1>{t("contactTitle")}</h1>
        <p className="hero-sub">{t("contactSub")}</p>
      </div>

      <div className="contact-grid">
        <div className="contact-card">
          <MapPin size={20} className="contact-icon" />
          <h4>{t("ourAddress")}</h4>
          <p>{SHOP_INFO.addressLine}</p>
          <p className="contact-sub">{SHOP_INFO.addressArea}</p>
          <p className="contact-coords mono">{SHOP_INFO.lat.toFixed(4)}, {SHOP_INFO.lng.toFixed(4)}</p>
          <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}>
            <MapPin size={13} /> {t("openInMapsBtn")}
          </a>
        </div>

        <div className="contact-card">
          <MessageCircle size={20} className="contact-icon" />
          <h4>{t("chatOnWhatsapp")}</h4>
          <p className="contact-sub">{SHOP_INFO.whatsappDisplay}</p>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm" style={{ marginTop: 10 }}>
            <MessageCircle size={13} /> {t("chatOnWhatsapp")}
          </a>
        </div>

        <div className="contact-card">
          <Phone size={20} className="contact-icon" />
          <h4>{t("callUs")}</h4>
          <p className="contact-sub">{SHOP_INFO.phoneDisplay}</p>
          <a href={telUrl} className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}>
            <Phone size={13} /> {t("callUs")}
          </a>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// APP SHELL
// ---------------------------------------------------------------------------

// Fallback shown if a staff (non-owner) session somehow ends up on an
// owner-only tab (Dashboard, Trends) — the tab buttons themselves are
// already hidden for staff, so in practice this is just a safety net,
// not something staff will normally see.
function OwnerOnlyNotice() {
  const { t } = useLang();
  return (
    <div className="admin">
      <div className="empty-state" style={{ padding: 40, textAlign: "center" }}>
        <ShieldCheck size={28} style={{ opacity: 0.4, marginBottom: 10 }} />
        <p>{t("ownerOnlySectionNote")}</p>
      </div>
    </div>
  );
}

// Top-level pages the URL hash can point to. Kept in one place so the
// initial-load reader and the hash-writer below can't drift apart.
const VALID_VIEWS = ["storefront", "matcher", "wholesale-signup", "wholesale-login", "staff-login", "contact", "admin"];

// On first load, read the page (and, for admin, the tab) straight out of
// the URL hash — e.g. "#/admin/inventory" — instead of always starting at
// "storefront". This is what makes a refresh land back where you were
// instead of bouncing to the home page.
function readViewFromHash() {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const [top] = raw.split("/");
  return VALID_VIEWS.includes(top) ? top : "storefront";
}
function readAdminTabFromHash() {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const [, tab] = raw.split("/");
  return tab || "dashboard";
}

// Cart persistence (Storefront) — a refresh should never lose someone's
// in-progress order. This mirrors the outbox/cache pattern in
// marketOutbox.js: plain localStorage, read once on mount, written on
// every change. Cleared explicitly on login/logout/mode-switch/manual
// clear (see handleStaffLogout, handleWholesaleLogin/Logout,
// handleSetMode, and CartPanel's onClear) — never implicitly by a reload.
const CART_STORAGE_KEY = "swatchbook_cart";

function readPersistedCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePersistedCart(cart) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // Storage can fail (quota, private browsing) — the cart just won't
    // survive a refresh in that case, nothing else depends on this.
  }
}

export default function TextileApp() {
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [wholesaleAccounts, setWholesaleAccounts] = useState([]);
  const [wholesaleLoading, setWholesaleLoading] = useState(true);
  const [view, setView] = useState(readViewFromHash);
  const [adminTab, setAdminTab] = useState(readAdminTabFromHash);
  const [mode, setMode] = useState("retail");
  const [matcherOpenProduct, setMatcherOpenProduct] = useState(null);
  const [lang, setLang] = useState("en");
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [cart, setCart] = useState(readPersistedCart);
  const [cartOpen, setCartOpen] = useState(false);
  const [adminUser, setAdminUser] = useState(null);
  const [wholesaleUser, setWholesaleUser] = useState(null);
  // Starts false so the admin view can wait for the session-restore check
  // below before deciding whether to show the login screen — otherwise
  // adminUser's initial null briefly renders StaffLogin on every refresh,
  // even for an already-signed-in staff member, until getSession resolves.
  const [authChecked, setAuthChecked] = useState(false);

  const dir = LANGUAGES[lang].dir;
  const t = useTranslation(lang);

  // Archived fabrics (deleted-but-had-history — see api.deleteProduct) stay
  // in `products` so Inventory can still see and restore them, but every
  // other screen — storefront, matcher, Record Sale, Purchase List, Market
  // Mode, Demand, Dashboard — should behave as if they don't exist.
  const activeProducts = useMemo(() => products.filter((p) => p.isActive !== false), [products]);

  // Wholesale pricing is reachable only if staff is signed in (to help a
  // walk-in customer) or an approved wholesale buyer is signed into their
  // own account. Everyone else is locked to retail.
  const canToggleWholesale = !!adminUser || (wholesaleUser && wholesaleUser.status === "approved");
  // General owner-only gate, reused for wholesale account management,
  // supplier edit/delete, and the Dashboard/Trends tabs — staff (non-owner)
  // logins can't reach any of those, per the shop's access rules.
  const isOwner = adminUser?.role === "owner";
  const canManageWholesaleAccounts = isOwner;
  const effectiveMode = canToggleWholesale ? mode : "retail";

  // ---- initial data load: restore session, fetch products + accounts ----
  useEffect(() => {
    // Same underlying issue as Market Mode: on a slow/patchy connection a
    // supabase-js query can hang with no timeout, which — for this
    // particular call — would leave the whole storefront stuck on its
    // initial load with nothing to retry. One retry after a timeout covers
    // the common "request just stalled" case without needing a visible
    // error state for what's usually a very fast, very reliable call.
    marketOutbox.withTimeout(api.fetchProducts(), 15000)
      .catch(() => marketOutbox.withTimeout(api.fetchProducts(), 15000))
      .then(setProducts)
      .finally(() => setProductsLoading(false));

    api.getSession().then((session) => {
      if (session?.type === "staff") setAdminUser(session.user);
      if (session?.type === "wholesale") setWholesaleUser(session.user);
    }).finally(() => setAuthChecked(true));
  }, []);

  // ---- stay in sync with changes made elsewhere (another tab, another
  // staff login, another device) so Inventory doesn't need a manual page
  // refresh to show current stock. Every change made IN this tab already
  // updates local state directly or calls refreshProducts(); this covers
  // the remaining case those can't: someone else changing something.
  // Debounced because one sale can touch several rows (batches + fabrics)
  // in quick succession — no need to refetch once per row.
  useEffect(() => {
    let timer = null;
    const unsubscribe = api.subscribeToTableChanges(["fabrics", "stock_batches"], () => {
      clearTimeout(timer);
      timer = setTimeout(() => { api.fetchProducts().then(setProducts); }, 400);
    });
    return () => { clearTimeout(timer); unsubscribe(); };
  }, []);

  // ---- keep the URL hash in sync with where you are, so a refresh (or a
  // shared/bookmarked link) lands back on the same page instead of always
  // resetting to the storefront, AND so the browser's back button steps
  // back through app views instead of leaving the site entirely (that was
  // a real regression — replaceState never adds anything for "back" to
  // go to, so the very first back-press exits). pushState for real
  // navigation; when popstate fires (the user pressed back/forward), only
  // sync state from the hash, without pushing another entry on top. ----
  const isPopStateRef = useRef(false);

  useEffect(() => {
    function handlePopState() {
      isPopStateRef.current = true;
      setView(readViewFromHash());
      setAdminTab(readAdminTabFromHash());
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const hash = view === "admin" ? `#/admin/${adminTab}` : `#/${view}`;
    if (window.location.hash !== hash) {
      if (isPopStateRef.current) {
        window.history.replaceState(null, "", hash);
      } else {
        window.history.pushState(null, "", hash);
      }
    }
    isPopStateRef.current = false;
  }, [view, adminTab]);

  // Defensive: this app never navigates to a real path (only ever the
  // hash after "#"), and raihanfabrics.github.io always serves from "/".
  // If the address bar ever shows something else — e.g. from a stale
  // bookmark, a manually-typed URL, or (most commonly) the browser's own
  // address-bar autocomplete stitching together fragments of past visits
  // while you type — this quietly straightens it out on load without a
  // real page navigation, instead of leaving a confusing-looking URL
  // sitting in the bar.
  useEffect(() => {
    if (window.location.pathname !== "/") {
      window.history.replaceState(null, "", "/" + window.location.hash);
    }
  }, []);


  // If a link/refresh lands on "#/admin/..." but the session check above
  // finds no signed-in staff account, the existing "view === admin &&
  // !adminUser" branch below already falls back to the login screen — so
  // there's nothing extra to do here beyond not crashing on a stale tab.

  // Wholesale accounts are only needed for the admin dashboard, so fetch
  // them once staff signs in (avoids an unnecessary fetch for every visitor).
  useEffect(() => {
    if (adminUser) {
      setWholesaleLoading(true);
      api.fetchWholesaleAccounts().then(setWholesaleAccounts).finally(() => setWholesaleLoading(false));
    }
  }, [adminUser]);

  // A new wholesale signup, or an approval/rejection made from another
  // device or tab, previously only showed up here after a manual refresh
  // — the pending-request badge and the Wholesale/Credit Ledger tabs had
  // no way to know something changed. Mirrors the fabrics/stock_batches
  // subscription above; scoped to signed-in staff only, since anonymous
  // storefront visitors have no RLS access to this table anyway.
  useEffect(() => {
    if (!adminUser) return;
    let timer = null;
    const unsubscribe = api.subscribeToTableChanges(["wholesale_accounts"], () => {
      clearTimeout(timer);
      timer = setTimeout(() => { api.fetchWholesaleAccounts().then(setWholesaleAccounts); }, 400);
    });
    return () => { clearTimeout(timer); unsubscribe(); };
  }, [adminUser]);

  // Persist the cart across refreshes. Explicit clears (login/logout, mode
  // switch, manual "Clear order") still go through setCart([]) as before —
  // this just stops a page reload from being an implicit, unintended one.
  useEffect(() => {
    writePersistedCart(cart);
  }, [cart]);

  function addToCart(product, qty) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) => (i.product.id === product.id ? { ...i, qty: i.qty + qty } : i));
      }
      return [...prev, { product, qty }];
    });
  }

  function updateCartQty(productId, qty) {
    setCart((prev) => prev.map((i) => (i.product.id === productId ? { ...i, qty } : i)));
  }

  function removeFromCart(productId) {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }

  // Cart resets when switching between retail/wholesale — pricing, minimums,
  // and presets differ between the two, so a mixed cart would be ambiguous.
  function handleSetMode(newMode) {
    if (newMode !== mode && cart.length > 0) {
      setCart([]);
    }
    setMode(newMode);
  }

  function handleStaffLogin(user) {
    setAdminUser(user);
    // Dashboard and Trends are owner-only (see Roadmap/README) — a staff
    // login landing there would just hit the "you don't have access"
    // tab, so send staff straight to a tab they can actually use instead.
    setAdminTab(user.role === "owner" ? "dashboard" : "inventory");
    setView("admin");
  }

  async function handleStaffLogout() {
    await api.clearSession();
    setAdminUser(null);
    setCart([]);
    setView("storefront");
  }

  function handleWholesaleLogin(account) {
    // Without this, the cart (plain in-memory state, not tied to who's
    // logged in) would carry over from whoever was using this browser
    // tab before — e.g. buyer A adds items, logs out, buyer B logs in on
    // the same tab and sees A's cart. Every login starts clean.
    setCart([]);
    setWholesaleUser(account);
    setMode("wholesale");
    setView("storefront");
  }

  async function handleWholesaleLogout() {
    await api.clearSession();
    setCart([]);
    setWholesaleUser(null);
    setMode("retail");
  }

  // ---- product CRUD (admin) ----
  async function handleAddProduct(product) {
    const created = await api.addProduct(product);
    setProducts((prev) => [...prev, created]);
  }
  async function handleUpdateProduct(id, updates) {
    const updated = await api.updateProduct(id, updates);
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
  }
  async function handleDeleteProduct(id) {
    const result = await api.deleteProduct(id);
    if (result?.archived) {
      // Couldn't be hard-deleted (has sale/purchase history) — archived
      // instead. Keep it in local state (Inventory still shows it,
      // greyed out) rather than removing it from the list.
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, isActive: false } : p)));
    } else {
      setProducts((prev) => prev.filter((p) => p.id !== id));
    }
    return result;
  }
  async function handleRestoreProduct(id) {
    const updated = await api.restoreProduct(id);
    setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
  }

  // Editing a fabric directly (above) updates `products` state right
  // away from what the server handed back — no refetch needed. But
  // several other actions change a fabric's stock_meters *indirectly*,
  // server-side, as a side effect of something else (a sale decrementing
  // a batch, a Market Mode trip closing and creating one) — the client
  // has no way to know that happened unless it explicitly asks again.
  // This is the one place that does that asking, shared by everything
  // that needs it, so "why do I need to refresh the page" gets fixed
  // once here rather than separately for every screen that hits it.
  function refreshProducts() {
    return api.fetchProducts().then(setProducts);
  }

  // Realtime (see supabase/migration_2026-07-27.sql) is the "another device
  // changed something" path, but it depends on that migration having been
  // run and on Realtime/RLS being configured correctly — not something the
  // client can verify. This counter is a same-tab fallback that doesn't
  // depend on any of that: anything that changes sale/purchase data bumps
  // it, and screens like Dashboard that derive from that data just add it
  // to their fetch effect's dependency list to refetch immediately,
  // regardless of whether Realtime is working. This is what actually fixes
  // "Dashboard still needs a refresh after recording a sale."
  const [dataRefreshSignal, setDataRefreshSignal] = useState(0);
  function bumpDataRefreshSignal() {
    setDataRefreshSignal((n) => n + 1);
  }

  // ---- wholesale account approval (owner only) ----
  async function handleApproveWholesale(id) {
    const updated = await api.setWholesaleStatus(id, "approved");
    setWholesaleAccounts((prev) => prev.map((a) => (a.id === id ? updated : a)));
  }
  async function handleRejectWholesale(id) {
    const updated = await api.setWholesaleStatus(id, "rejected");
    setWholesaleAccounts((prev) => prev.map((a) => (a.id === id ? updated : a)));
  }
  async function handleDeleteWholesale(id) {
    await api.deleteWholesaleAccount(id);
    setWholesaleAccounts((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <LanguageContext.Provider value={{ lang, t, dir }}>
      <div className="app-shell" dir={dir} data-lang={lang}>
        <style>{css}</style>
        <nav className="topnav">
          <div className="brand">
            <img src="/logo-full.png" alt="" className="brand-mark" />
            {t("brand")}
          </div>
          <div className="nav-right">
            <div className="nav-switch">
              <button className={view === "storefront" ? "active" : ""} onClick={() => setView("storefront")}>
                <Store size={14} /> {t("navStorefront")}
              </button>
              <button className={view === "matcher" ? "active" : ""} onClick={() => setView("matcher")}>
                <Pipette size={14} /> {t("navMatcher")}
              </button>
              <button className={view === "wholesale-signup" ? "active" : ""} onClick={() => setView("wholesale-signup")}>
                <Building2 size={14} /> {t("navBecomeBuyer")}
              </button>
              <button className={view === "contact" ? "active" : ""} onClick={() => setView("contact")}>
                <MessageCircle size={14} /> {t("navContact")}
              </button>
              {adminUser && (
                <button className={view === "admin" ? "active" : ""} onClick={() => setView("admin")}>
                  <Package size={14} /> {t("navAdmin")}
                </button>
              )}
            </div>

            {wholesaleUser && (
              <div className="session-chip">
                <Building2 size={13} />
                <span>{wholesaleUser.businessName}</span>
                <button onClick={handleWholesaleLogout} title={t("signOut")}><X size={12} /></button>
              </div>
            )}

            {adminUser && (
              <div className="session-chip">
                <ShieldCheck size={13} />
                <span>{adminUser.name} · {t(adminUser.role === "owner" ? "roleOwner" : "roleStaff")}</span>
                <button onClick={handleStaffLogout} title={t("signOut")}><X size={12} /></button>
              </div>
            )}

            <div className="lang-switch">
              <button className="lang-current" onClick={() => setLangMenuOpen((o) => !o)}>
                <Globe size={14} /> {LANGUAGES[lang].nativeLabel}
              </button>
              {langMenuOpen && (
                <div className="lang-menu">
                  {Object.entries(LANGUAGES).map(([code, info]) => (
                    <button
                      key={code}
                      className={code === lang ? "active" : ""}
                      onClick={() => { setLang(code); setLangMenuOpen(false); }}
                      dir={info.dir}
                    >
                      {info.nativeLabel}
                      {code === "en" && <span className="lang-default-tag">default</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="cart-nav-btn" onClick={() => setCartOpen(true)}>
              <ShoppingCart size={16} />
              {cart.length > 0 && <span className="nav-dot">{cart.length}</span>}
            </button>
          </div>
        </nav>

        {view === "storefront" && (
          <Storefront
            products={activeProducts}
            mode={effectiveMode}
            setMode={handleSetMode}
            cart={cart}
            onAddToCart={addToCart}
            canToggleWholesale={canToggleWholesale}
            onWholesaleLoginClick={() => setView("wholesale-login")}
          />
        )}
        {view === "matcher" && (
          <SwatchMatcher products={activeProducts} mode={effectiveMode} onOpen={setMatcherOpenProduct} currentUser={adminUser} />
        )}
        {view === "wholesale-signup" && (
          <WholesaleRequestForm onSubmitted={() => {}} />
        )}
        {view === "wholesale-login" && (
          <WholesaleLogin
            onLogin={handleWholesaleLogin}
            onGoToRequest={() => setView("wholesale-signup")}
            onCancel={() => setView("storefront")}
          />
        )}
        {view === "staff-login" && (
          <StaffLogin onLogin={handleStaffLogin} onCancel={() => setView("storefront")} />
        )}
        {view === "contact" && <ContactSection />}
        {view === "admin" && adminUser && (
          <>
            <div className="admin-subnav">
              {isOwner && (
                <button className={adminTab === "dashboard" ? "active" : ""} onClick={() => setAdminTab("dashboard")}>
                  <Layers size={13} /> Dashboard
                </button>
              )}
              {isOwner && (
                <button className={adminTab === "trends" ? "active" : ""} onClick={() => setAdminTab("trends")}>
                  <TrendingUp size={13} /> Trends
                </button>
              )}
              <button className={adminTab === "inventory" ? "active" : ""} onClick={() => setAdminTab("inventory")}>
                <Package size={13} /> {t("inventory")}
              </button>
              <button className={adminTab === "record-sale" ? "active" : ""} onClick={() => setAdminTab("record-sale")}>
                <ShoppingCart size={13} /> Record Sale
              </button>
              <button className={adminTab === "receipts" ? "active" : ""} onClick={() => setAdminTab("receipts")}>
                <Receipt size={13} /> {t("receiptsTitle")}
              </button>
              <button className={adminTab === "log-request" ? "active" : ""} onClick={() => setAdminTab("log-request")}>
                <Camera size={13} /> Log Request
              </button>
              <button className={adminTab === "demand" ? "active" : ""} onClick={() => setAdminTab("demand")}>
                <Sparkles size={13} /> Demand
              </button>
              <button className={adminTab === "purchase-list" ? "active" : ""} onClick={() => setAdminTab("purchase-list")}>
                <Layers size={13} /> Purchase List
              </button>
              <button className={adminTab === "suppliers" ? "active" : ""} onClick={() => setAdminTab("suppliers")}>
                <MapPin size={13} /> Suppliers
              </button>
              <button className={adminTab === "market-mode" ? "active" : ""} onClick={() => setAdminTab("market-mode")}>
                <ShoppingCart size={13} /> Market Mode
              </button>
              <button className={adminTab === "wholesale" ? "active" : ""} onClick={() => setAdminTab("wholesale")}>
                <Building2 size={13} /> {t("wholesaleBuyersTab")}
                {canManageWholesaleAccounts && wholesaleAccounts.filter((a) => a.status === "pending").length > 0 && (
                  <span className="nav-dot">{wholesaleAccounts.filter((a) => a.status === "pending").length}</span>
                )}
              </button>
              <button className={adminTab === "credit-ledger" ? "active" : ""} onClick={() => setAdminTab("credit-ledger")}>
                <Wallet size={13} /> {t("creditLedgerTitle")}
              </button>
            </div>
            {adminTab === "dashboard" && (isOwner ? <Dashboard products={activeProducts} refreshSignal={dataRefreshSignal} /> : <OwnerOnlyNotice />)}
            {adminTab === "trends" && (isOwner ? <Trends refreshSignal={dataRefreshSignal} /> : <OwnerOnlyNotice />)}
            {adminTab === "inventory" && (
              <AdminPanel
                products={products}
                loading={productsLoading}
                onAdd={handleAddProduct}
                onUpdate={handleUpdateProduct}
                onDelete={handleDeleteProduct}
                onRestore={handleRestoreProduct}
                // Staff can add new stock, but only the owner can edit or
                // delete an existing inventory item — also enforced at the
                // database level (see supabase/schema.sql), this is just
                // the UI half of it.
                canEdit={isOwner}
                canDelete={isOwner}
                isOwner={isOwner}
              />
            )}
            {adminTab === "record-sale" && (
              <RecordSaleForm
                products={activeProducts}
                currentUser={adminUser}
                onRecorded={() => { refreshProducts(); bumpDataRefreshSignal(); }}
              />
            )}
            {adminTab === "receipts" && <ReceiptsAdmin />}
            {adminTab === "log-request" && (
              <CustomerRequestForm products={activeProducts} />
            )}
            {adminTab === "demand" && (
              <DemandIntelligence products={activeProducts} />
            )}
            {adminTab === "purchase-list" && (
              <PurchaseList products={activeProducts} />
            )}
            {adminTab === "suppliers" && (
              <SuppliersAdmin canManage={isOwner} />
            )}
            {adminTab === "market-mode" && (
              <MarketMode products={activeProducts} currentUser={adminUser} onProductsChanged={() => { bumpDataRefreshSignal(); return refreshProducts(); }} />
            )}
            {adminTab === "wholesale" && (
              <WholesaleAdmin
                accounts={wholesaleAccounts}
                loading={wholesaleLoading}
                canManage={canManageWholesaleAccounts}
                onApprove={handleApproveWholesale}
                onReject={handleRejectWholesale}
                onDelete={handleDeleteWholesale}
              />
            )}
            {adminTab === "credit-ledger" && (
              <CreditLedger accounts={wholesaleAccounts} currentUser={adminUser} />
            )}
          </>
        )}
        {view === "admin" && !adminUser && authChecked && (
          <StaffLogin onLogin={handleStaffLogin} onCancel={() => setView("storefront")} />
        )}
        {view === "admin" && !adminUser && !authChecked && (
          <div className="admin">
            <p className="loading-state"><Loader2 size={16} className="spin" /> {t("loadingText")}</p>
          </div>
        )}

        <ProductDrawer
          product={matcherOpenProduct}
          mode={effectiveMode}
          onClose={() => setMatcherOpenProduct(null)}
          onAddToCart={addToCart}
          cartQty={matcherOpenProduct ? cart.find((i) => i.product.id === matcherOpenProduct.id)?.qty : null}
        />

        {cartOpen && (
          <CartPanel
            cart={cart}
            mode={effectiveMode}
            onUpdateQty={updateCartQty}
            onRemove={removeFromCart}
            onClear={() => { setCart([]); setCartOpen(false); }}
            onClose={() => setCartOpen(false)}
          />
        )}

        {!adminUser && authChecked && (
          <footer className="app-footer">
            <button className="staff-login-link" onClick={() => setView("staff-login")}>
              <ShieldCheck size={12} /> {t("staffLogin")}
            </button>
          </footer>
        )}
      </div>
    </LanguageContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// STYLES
// ---------------------------------------------------------------------------

const css = `
:root {
  --cotton: #EDE8DF;
  --cotton-deep: #E1DACB;
  --ink: #2B2620;
  --ink-soft: #6B6154;
  --thread: #A8412E;
  --thread-deep: #7E2F21;
  --line: #D8CFBE;
  --ok: #3E6B4B;
  --low: #B8792A;
  --out: #A8412E;
}

* { box-sizing: border-box; }

html, body { max-width: 100%; overflow-x: hidden; }

/* Inputs/selects default to a min-content width that can be wider than
   their flex container on a narrow screen (this is what was pushing
   things like the Purchase List "add a fabric" row off-screen on
   mobile) — letting them shrink is safe everywhere in this app since
   none of them need a fixed minimum width to stay usable. */
input, select, textarea { min-width: 0; }

.app-shell {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  background: var(--cotton);
  color: var(--ink);
  min-height: 100vh;
  /* Belt-and-suspenders against any element (a wide flex row, a long
     unbroken string, etc.) forcing the whole page wider than the
     viewport on a phone — that's what was pushing the nav bar off the
     right edge. */
  max-width: 100vw;
  overflow-x: hidden;
}

h1, h2, h3 { font-family: 'Fraunces', Georgia, serif; margin: 0; }

.mono, .sku, td.mono { font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 0.82rem; color: var(--ink-soft); }

/* RTL support for Pashto and Dari — Perso-Arabic script needs its own font
   stack (Latin serif/mono fonts don't render these characters properly),
   and layout needs to flip so it reads naturally right-to-left. */
.app-shell[dir="rtl"] {
  font-family: 'Noto Sans Arabic', 'Noto Naskh Arabic', Tahoma, sans-serif;
}
.app-shell[dir="rtl"] h1, .app-shell[dir="rtl"] h2, .app-shell[dir="rtl"] h3 {
  font-family: 'Noto Naskh Arabic', 'Noto Sans Arabic', Georgia, serif;
}
.app-shell[dir="rtl"] .eyebrow { letter-spacing: 0; }
.app-shell[dir="rtl"] .mono, .app-shell[dir="rtl"] .sku, .app-shell[dir="rtl"] td.mono {
  font-family: 'JetBrains Mono', 'Courier New', monospace; direction: ltr; unicode-bidi: embed; text-align: right;
}
.app-shell[dir="rtl"] .hero-strip { flex-direction: row-reverse; }
.app-shell[dir="rtl"] .hero-chip { margin-left: 0; margin-right: -8px; }
.app-shell[dir="rtl"] .drawer { animation: slideInRtl 0.2s ease; }
@keyframes slideInRtl { from { transform: translateX(-24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
.app-shell[dir="rtl"] .drawer-backdrop { justify-content: flex-start; }
.app-shell[dir="rtl"] .drawer-close { right: auto; left: 16px; }
.app-shell[dir="rtl"] .match-arrow { transform: scaleX(-1); }
.app-shell[dir="rtl"] .price-block, .app-shell[dir="rtl"] .hex-text { direction: ltr; text-align: right; }

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.72rem;
  color: var(--thread-deep);
  font-weight: 600;
  margin: 0 0 6px 0;
}

/* NAV */
.topnav {
  display: flex; justify-content: space-between; align-items: center;
  padding: 18px 32px; border-bottom: 1px solid var(--line);
  background: var(--cotton); position: sticky; top: 0; z-index: 10;
  gap: 16px; flex-wrap: wrap;
}
.brand { display: flex; align-items: center; gap: 12px; font-family: 'Fraunces', serif; font-size: 1.725rem; font-weight: 600; }
.app-shell[dir="rtl"] .brand { font-family: 'Noto Naskh Arabic', serif; }
.brand-mark {
  width: 104px; height: 104px; border-radius: 50%; display: inline-block; flex-shrink: 0;
  object-fit: contain; box-sizing: border-box; padding: 8px;
  background: #FFFFFF; border: 1px solid var(--line); box-shadow: 0 1px 4px rgba(43,38,32,0.08);
}
.nav-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; min-width: 0; max-width: 100%; }
.nav-switch {
  display: flex; gap: 4px; background: var(--cotton-deep); padding: 4px; border-radius: 10px;
  /* On a narrow screen five tab buttons are wider than the viewport —
     rather than letting that stretch the whole page sideways (the bug
     report: "navbar exceeds the main screen to the right"), this strip
     scrolls horizontally within itself and everything else stays put. */
  max-width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}
.nav-switch::-webkit-scrollbar { display: none; }
.nav-switch button, .mode-toggle button {
  display: flex; align-items: center; gap: 6px;
  border: none; background: transparent; padding: 8px 14px; border-radius: 7px;
  font-size: 0.85rem; font-weight: 500; color: var(--ink-soft); cursor: pointer;
  white-space: nowrap;
}
.nav-switch button.active, .mode-toggle button.active { background: var(--ink); color: var(--cotton); }

/* LANGUAGE SWITCHER */
.lang-switch { position: relative; }
.lang-current {
  display: flex; align-items: center; gap: 6px; border: 1px solid var(--line); background: white;
  padding: 8px 14px; border-radius: 10px; font-size: 0.85rem; font-weight: 500; color: var(--ink); cursor: pointer;
}
.lang-menu {
  position: absolute; top: calc(100% + 6px); left: 50%; transform: translateX(-50%); background: white; border: 1px solid var(--line);
  border-radius: 10px; padding: 6px; box-shadow: 0 8px 24px rgba(43,38,32,0.12); z-index: 20; min-width: 150px; max-width: calc(100vw - 32px);
}
.lang-menu button {
  display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; text-align: left;
  border: none; background: transparent; padding: 9px 12px; border-radius: 7px; font-size: 0.88rem; cursor: pointer; color: var(--ink);
}
.lang-menu button:hover { background: var(--cotton); }
.lang-menu button.active { background: var(--cotton-deep); font-weight: 600; }
.lang-default-tag { font-size: 0.65rem; text-transform: uppercase; color: var(--ink-soft); font-weight: 400; }

/* HERO */
.hero { padding: 48px 32px 24px; display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; flex-wrap: wrap; }
.hero-text h1 { font-size: 2.4rem; line-height: 1.1; margin-bottom: 10px; }
.hero-sub { color: var(--ink-soft); max-width: 460px; font-size: 0.95rem; line-height: 1.5; }
.hero-strip { display: flex; }
.hero-chip { width: 30px; height: 60px; margin-left: -8px; border-radius: 4px; border: 2px solid var(--cotton); box-shadow: 0 2px 6px rgba(0,0,0,0.1); }

/* TOOLBAR */
.toolbar { display: flex; gap: 16px; padding: 0 32px 16px; flex-wrap: wrap; }
.search-box { flex: 1; min-width: 240px; display: flex; align-items: center; gap: 8px; background: white; border: 1px solid var(--line); border-radius: 10px; padding: 10px 14px; }
.search-box input { border: none; outline: none; background: transparent; font-size: 0.9rem; width: 100%; color: var(--ink); }
.mode-toggle { display: flex; background: var(--cotton-deep); padding: 4px; border-radius: 10px; }

/* TYPE TABS */
.type-tabs { display: flex; gap: 8px; padding: 0 32px 20px; flex-wrap: wrap; }
.type-tabs button { border: 1px solid var(--line); background: white; padding: 7px 14px; border-radius: 20px; font-size: 0.82rem; cursor: pointer; color: var(--ink-soft); }
.type-tabs button.active { background: var(--ink); color: var(--cotton); border-color: var(--ink); }

.wholesale-banner {
  margin: 0 32px 20px; background: #FBF0E4; border: 1px solid #E3A028;
  color: #7A5417; padding: 12px 16px; border-radius: 10px; font-size: 0.85rem;
  display: flex; align-items: center; gap: 8px;
}

/* CHAPTERS / SWATCH GRID */
.chapter { padding: 0 32px 32px; }
.chapter-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 14px; }
.chapter-head h3 { font-size: 1.3rem; }
.chapter-count { color: var(--ink-soft); font-size: 0.8rem; }

.swatch-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 14px; }
.swatch-tile {
  border: 1px solid var(--line); background: white; border-radius: 12px; overflow: hidden;
  cursor: pointer; text-align: left; padding: 0; transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.swatch-tile:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(43,38,32,0.1); }
.swatch-color { display: block; height: 90px; position: relative; overflow: hidden; }
.swatch-photo { width: 100%; height: 100%; object-fit: cover; display: block; }
.swatch-meta { display: flex; flex-direction: column; padding: 10px 12px 12px; gap: 2px; }
.swatch-name { font-weight: 600; font-size: 0.9rem; }
.swatch-sub { font-size: 0.75rem; color: var(--ink-soft); }
.swatch-price { font-size: 0.82rem; font-weight: 600; color: var(--thread-deep); margin-top: 4px; }

.empty-state { padding: 40px 32px; color: var(--ink-soft); }

/* STOCK BADGE */
.stock-badge { font-size: 0.72rem; font-weight: 600; padding: 3px 9px; border-radius: 12px; display: inline-block; }
.stock-ok { background: #E4EEE6; color: var(--ok); }
.stock-low { background: #FBEFDD; color: var(--low); }
.stock-out { background: #F7E4E0; color: var(--out); }

/* DRAWER */
.drawer-backdrop { position: fixed; inset: 0; background: rgba(43,38,32,0.45); display: flex; justify-content: flex-end; z-index: 100; }
.drawer { width: min(420px, 92vw); background: var(--cotton); height: 100%; overflow-y: auto; position: relative; animation: slideIn 0.2s ease; }
@keyframes slideIn { from { transform: translateX(24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
.drawer-close { position: absolute; top: 16px; right: 16px; background: white; border: none; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 2; }
.drawer-hero { height: 220px; position: relative; overflow: hidden; }
.drawer-hero-photo { width: 100%; height: 100%; object-fit: cover; display: block; }
.drawer-hero-texture { position: absolute; inset: 0; background: repeating-linear-gradient(45deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 2px, transparent 2px, transparent 6px); }
.drawer-body { padding: 24px; }
.drawer-body h2 { font-size: 1.6rem; margin-bottom: 12px; }
.spec-row { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 12px; font-size: 0.8rem; color: var(--ink-soft); }
.spec-row span { display: flex; align-items: center; gap: 5px; }
.price-block { margin: 18px 0; }
.price-big { font-family: 'Fraunces', serif; font-size: 2rem; }
.price-unit { font-size: 0.9rem; font-weight: 400; color: var(--ink-soft); }
.price-note { display: block; font-size: 0.78rem; color: var(--thread-deep); margin-top: 2px; }
.drawer-actions { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
.drawer-footnote { font-size: 0.75rem; color: var(--ink-soft); line-height: 1.4; }
.drawer-quick-order { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding-top: 4px; }
.drawer-quick-label { font-size: 0.76rem; color: var(--ink-soft); }

.btn { border: none; border-radius: 9px; padding: 12px 18px; font-size: 0.88rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; }
.btn-primary { background: var(--thread); color: white; }
.btn-primary:disabled { background: #C9BEB0; cursor: not-allowed; }
.btn-ghost { background: transparent; border: 1px solid var(--line); color: var(--ink); }
.btn-danger-text { color: var(--out); border-color: #E2C4BC; }
.btn-danger-text:hover { background: #FBEEEC; }
.btn-danger { background: var(--out); color: white; }
.btn-danger:disabled { background: #D9AFA6; cursor: not-allowed; }

/* CONFIRM DIALOG — small centered modal, distinct from the sliding .drawer
   used for forms; deleting something should feel like a quick, deliberate
   yes/no, not a full form panel. */
.confirm-backdrop { position: fixed; inset: 0; background: rgba(43,38,32,0.5); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
.confirm-card { background: var(--cotton); border-radius: 14px; padding: 22px; width: min(380px, 100%); box-shadow: 0 10px 40px rgba(0,0,0,0.25); animation: popIn 0.15s ease; }
@keyframes popIn { from { transform: scale(0.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.confirm-card h3 { font-size: 1.15rem; margin-bottom: 8px; }
.confirm-card p { font-size: 0.88rem; color: var(--ink-soft); line-height: 1.45; margin: 0 0 18px; }
.confirm-actions { display: flex; justify-content: flex-end; gap: 10px; }

/* PURCHASE LIST — manual fabric search typeahead */
.manual-suggestions { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: white; border: 1px solid var(--line); border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); max-height: 280px; overflow-y: auto; z-index: 50; }
.manual-suggestion-item { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; background: none; border: none; padding: 10px 12px; cursor: pointer; font-size: 0.85rem; color: var(--ink); border-bottom: 1px solid var(--line); }
.manual-suggestion-item:last-child { border-bottom: none; }
.manual-suggestion-item:hover { background: var(--cotton); }
.manual-suggestion-item .table-swatch { flex-shrink: 0; }
.manual-suggestion-item span:nth-child(2) { flex: 1; }
.manual-suggestion-empty { padding: 12px; font-size: 0.82rem; color: var(--ink-soft); }

/* CART */
.cart-nav-btn {
  position: relative; display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--line); background: white; width: 38px; height: 38px;
  border-radius: 10px; cursor: pointer; color: var(--ink);
}
.cart-nav-btn .nav-dot { position: absolute; top: -6px; right: -6px; }
.app-shell[dir="rtl"] .cart-nav-btn .nav-dot { right: auto; left: -6px; }

/* LOADING */
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.loading-state { display: flex; align-items: center; gap: 8px; color: var(--ink-soft); font-size: 0.9rem; padding: 30px 0; }

/* CONTACT */
.contact-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-top: 8px; }
.contact-card { background: white; border: 1px solid var(--line); border-radius: 14px; padding: 22px; }
.contact-icon { color: var(--thread-deep); margin-bottom: 10px; }
.contact-card h4 { font-size: 1rem; margin-bottom: 6px; }
.contact-sub { color: var(--ink-soft); font-size: 0.88rem; }
.contact-coords { font-size: 0.76rem; color: var(--ink-soft); margin-top: 4px; }
.contact-placeholder-note { font-size: 0.76rem; color: var(--ink-soft); font-style: italic; margin-top: 20px; }

/* AUTH */
.auth-card {
  background: white; border: 1px solid var(--line); border-radius: 16px; padding: 36px;
  max-width: 420px; margin: 20px auto; text-align: center;
}
.auth-icon { color: var(--thread-deep); margin-bottom: 10px; }
.auth-logo { width: 88px; height: auto; margin: 0 auto 14px; display: block; }
.auth-card h2 { margin-bottom: 6px; }
.auth-card .hero-sub { text-align: center; margin: 0 auto 20px; }
/* ---------------------------------------------------------------------
   FORM CONTROLS — one shared look for every text/number/date/password
   input, select, and textarea in the app, whether it's inside
   .form-drawer (Inventory/Suppliers), .auth-form (login screens), or
   just a plain <label> in .admin (Record Sale, Log Request, Market
   Mode) — several of those last ones had no styling at all before this
   and were falling back to the browser's bare default look, which is
   what actually read as "ugly": inconsistent sizing, no focus state, no
   breathing room between fields. This block is the fix, applied once
   instead of per-screen so nothing can be missed again.
   --------------------------------------------------------------------- */
label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ink-soft);
  margin-bottom: 14px;
}
label:last-child { margin-bottom: 0; }
.sale-line label, .form-row label { margin-bottom: 0; } /* side-by-side / inline contexts manage their own spacing via gap */

input[type="text"],
input[type="password"],
input[type="tel"],
input[type="email"],
input[type="number"],
input[type="date"],
input:not([type]),
select,
textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 11px 13px;
  border: 1.5px solid var(--line);
  border-radius: 9px;
  font-size: 0.92rem;
  font-family: inherit;
  color: var(--ink);
  background: white;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
input[type="text"]:focus,
input[type="password"]:focus,
input[type="tel"]:focus,
input[type="email"]:focus,
input[type="number"]:focus,
input[type="date"]:focus,
input:not([type]):focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: var(--thread);
  box-shadow: 0 0 0 3px rgba(168, 65, 46, 0.14);
}
input::placeholder, textarea::placeholder { color: var(--ink-soft); opacity: 0.65; }
input:disabled, select:disabled, textarea:disabled { background: var(--cotton); color: var(--ink-soft); cursor: not-allowed; }
textarea { resize: vertical; min-height: 84px; line-height: 1.5; }
select { cursor: pointer; }
input[type="checkbox"] { width: auto; height: 16px; accent-color: var(--thread); cursor: pointer; }
input[type="color"] { width: 100%; height: 44px; padding: 4px; cursor: pointer; }
input[type="file"] {
  width: 100%; box-sizing: border-box; padding: 9px 10px; border: 1.5px dashed var(--line);
  border-radius: 9px; font-size: 0.85rem; color: var(--ink-soft); background: var(--cotton);
}

.matcher-hint { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: var(--thread-deep); margin-top: 10px; }
.sale-line { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
.sale-line select { flex: 1; min-width: 220px; }
.sale-line-warn { font-size: 0.75rem; color: var(--low); white-space: nowrap; }

.form-drawer { padding: 24px; display: flex; flex-direction: column; gap: 14px; }
.form-drawer h2 { margin-bottom: 8px; }
.auth-form { display: flex; flex-direction: column; gap: 4px; text-align: left; }
.app-shell[dir="rtl"] .auth-form { text-align: right; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 12px; margin-bottom: 14px; }
@media (max-width: 520px) { .form-row { grid-template-columns: 1fr; gap: 14px; } }
.auth-error { color: var(--out); font-size: 0.82rem; background: #F7E4E0; padding: 8px 12px; border-radius: 8px; }
.auth-link { border: none; background: transparent; color: var(--thread-deep); font-weight: 600; cursor: pointer; padding: 0; font-size: inherit; text-decoration: underline; }

.session-chip {
  display: flex; align-items: center; gap: 6px; background: white; border: 1px solid var(--line);
  padding: 7px 10px 7px 12px; border-radius: 20px; font-size: 0.8rem; color: var(--ink); white-space: nowrap;
}
.session-chip button { border: none; background: var(--cotton-deep); border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--ink-soft); flex-shrink: 0; }

.app-footer { padding: 24px 32px; display: flex; justify-content: center; }
.staff-login-link { display: flex; align-items: center; gap: 6px; border: none; background: transparent; color: var(--ink-soft); font-size: 0.76rem; cursor: pointer; opacity: 0.6; }
.staff-login-link:hover { opacity: 1; }

.wholesale-login-prompt {
  display: flex; align-items: center; gap: 6px; border: 1px solid var(--line); background: white;
  padding: 10px 16px; border-radius: 10px; font-size: 0.85rem; font-weight: 500; color: var(--thread-deep); cursor: pointer;
}
.wholesale-login-note { font-size: 0.72rem; color: var(--ok); margin-bottom: 10px; }
.staff-no-permission { font-size: 0.78rem; color: var(--ink-soft); font-style: italic; background: var(--cotton); padding: 8px 10px; border-radius: 8px; }
.wholesale-approve-form { margin-top: 4px; }
.wholesale-approve-row { display: flex; gap: 8px; }
.wholesale-approve-row input { flex: 1; padding: 8px 10px; border: 1px solid var(--line); border-radius: 7px; font-size: 0.82rem; font-family: inherit; }

.cart-drawer { width: min(480px, 94vw); }
.cart-min-notice { font-size: 0.8rem; color: var(--thread-deep); background: #FBF0E4; padding: 10px 14px; border-radius: 10px; margin-bottom: 16px; }
.cart-lines { display: flex; flex-direction: column; gap: 14px; margin-bottom: 18px; }
.cart-line { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; border: 1px solid var(--line); border-radius: 12px; padding: 14px; background: white; }
.cart-line-swatch { width: 40px; height: 40px; border-radius: 8px; flex-shrink: 0; }
.cart-line-info { flex: 1 1 160px; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.cart-line-name { font-weight: 600; font-size: 0.92rem; }
.cart-line-sub { font-size: 0.76rem; color: var(--ink-soft); }
.cart-line-warn { font-size: 0.74rem; color: var(--out); font-weight: 600; margin-top: 2px; }
/* flex-basis + shrink:0 keeps this column from being squeezed narrower than
   its contents on small screens — previously it had no explicit sizing, so
   the preset buttons + input could overflow the column and render on top
   of neighboring text/the remove button instead of wrapping. */
.cart-line-qty { display: flex; flex-direction: column; gap: 6px; flex: 0 0 auto; }
.qty-presets { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; max-width: 180px; }
.qty-presets button {
  border: 1px solid var(--line); background: var(--cotton); color: var(--ink-soft);
  font-size: 0.76rem; font-weight: 600; padding: 5px 9px; border-radius: 6px; cursor: pointer;
}
.qty-presets button.active { background: var(--ink); color: var(--cotton); border-color: var(--ink); }
.qty-custom { width: 52px; padding: 5px 6px; border: 1px solid var(--line); border-radius: 6px; font-size: 0.78rem; font-family: 'JetBrains Mono', monospace; text-align: center; flex-shrink: 0; }
.cart-line-remove { border: none; background: transparent; color: var(--ink-soft); cursor: pointer; padding: 4px; flex-shrink: 0; }
.cart-line-remove:hover { color: var(--out); }
@media (max-width: 480px) {
  .cart-line-qty { flex-basis: 100%; }
  .qty-presets { max-width: none; }
}

.load-error-state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 30px 20px; text-align: center; color: var(--ink-soft); font-size: 0.88rem; }
.load-error-banner {
  display: flex; align-items: center; justify-content: space-between; gap: 10px; background: #FBEDEB; color: var(--out);
  border: 1px solid rgba(168,65,46,0.25); border-radius: 10px; padding: 10px 14px; margin-bottom: 12px; font-size: 0.82rem;
}

.cart-total-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-top: 1px solid var(--line); margin-bottom: 16px; font-weight: 600; }
.cart-total-value { font-family: 'Fraunces', serif; font-size: 1.3rem; }

/* SWATCH MATCHER */
.matcher { padding: 28px 32px 60px; max-width: 920px; }
.matcher-intro h1 { font-size: 2rem; margin-bottom: 10px; }
.matcher-intro { margin-bottom: 24px; }

.matcher-input-card { background: white; border: 1px solid var(--line); border-radius: 14px; padding: 22px; margin-bottom: 20px; }
.matcher-target { display: flex; gap: 18px; align-items: flex-start; }
.target-preview { width: 84px; height: 84px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(0,0,0,0.06); }
.target-icon { color: rgba(0,0,0,0.3); }
.target-controls { flex: 1; }
.mini-label { display: block; font-size: 0.75rem; font-weight: 600; color: var(--ink-soft); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.04em; }
.hex-input-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.color-picker { width: 40px; height: 40px; border: 1px solid var(--line); border-radius: 8px; padding: 2px; cursor: pointer; background: white; }
.hex-text { font-family: 'JetBrains Mono', monospace; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; width: 110px; font-size: 0.9rem; }
.btn-sm { padding: 9px 14px; font-size: 0.8rem; }
.matcher-uploaded-img { max-width: 200px; max-height: 140px; border-radius: 8px; margin-top: 16px; border: 1px solid var(--line); object-fit: cover; }
.stock-filter { display: flex; align-items: center; gap: 8px; font-size: 0.82rem; color: var(--ink-soft); margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--line); cursor: pointer; }

.best-match-banner { display: flex; align-items: center; gap: 12px; padding: 14px 18px; border-radius: 12px; margin-bottom: 20px; font-size: 0.9rem; border: 1px solid; }
.best-match-swatch { width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0; }
.best-match-banner.match-exact, .best-match-banner.match-excellent { background: #E4EEE6; border-color: #B9D6BF; color: #2A4A34; }
.best-match-banner.match-good { background: #FBF0E4; border-color: #E9C98F; color: #7A5417; }
.best-match-banner.match-fair, .best-match-banner.match-poor { background: #F7E4E0; border-color: #E3B3A9; color: #7E2F21; }

.match-results { background: white; border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }
.match-results-head {
  display: grid; grid-template-columns: 40px 1.6fr 110px 140px 90px 20px; gap: 12px; align-items: center;
  padding: 10px 18px; background: var(--cotton-deep); font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink-soft);
}
.match-row {
  display: grid; grid-template-columns: 40px 1.6fr 110px 140px 90px 20px; gap: 12px; align-items: center;
  width: 100%; text-align: left; border: none; background: white; border-top: 1px solid var(--line);
  padding: 12px 18px; cursor: pointer; font-family: inherit;
}
.match-row:hover { background: var(--cotton); }
.match-swatch { width: 32px; height: 32px; border-radius: 7px; }
.match-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.match-name { font-weight: 600; font-size: 0.9rem; }
.match-sub { font-size: 0.75rem; color: var(--ink-soft); font-family: 'JetBrains Mono', monospace; }
.match-score { display: flex; flex-direction: column; }
.match-pct { font-family: 'Fraunces', serif; font-size: 1.15rem; line-height: 1.1; }
.match-label { font-size: 0.7rem; }
.match-score.match-exact .match-pct, .match-score.match-excellent .match-pct { color: var(--ok); }
.match-score.match-good .match-pct { color: var(--low); }
.match-score.match-fair .match-pct, .match-score.match-poor .match-pct { color: var(--out); }
.match-score.match-exact .match-label, .match-score.match-excellent .match-label { color: var(--ok); }
.match-score.match-good .match-label { color: var(--low); }
.match-score.match-fair .match-label, .match-score.match-poor .match-label { color: var(--out); }
.match-price { font-size: 0.85rem; font-weight: 600; }
.match-arrow { color: var(--ink-soft); justify-self: end; }

@media (max-width: 720px) {
  .match-results-head { display: none; }
  .match-row { grid-template-columns: 36px 1fr 70px; grid-template-areas: "swatch info arrow" "swatch info arrow" "stock score price"; }
}

/* CAMERA CAPTURE */
.camera-backdrop { position: fixed; inset: 0; background: rgba(43,38,32,0.6); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
.camera-modal { background: var(--cotton); border-radius: 16px; padding: 24px; max-width: 480px; width: 100%; position: relative; }
.camera-modal h3 { font-size: 1.3rem; margin-bottom: 6px; }
.camera-tip { font-size: 0.82rem; color: var(--ink-soft); margin-bottom: 16px; line-height: 1.4; }
.camera-viewport { position: relative; background: #000; border-radius: 12px; overflow: hidden; aspect-ratio: 4/3; display: flex; align-items: center; justify-content: center; }
.camera-video { width: 100%; height: 100%; object-fit: cover; }
.camera-guide-frame { position: absolute; inset: 15%; border: 2px dashed rgba(255,255,255,0.7); border-radius: 10px; pointer-events: none; }
.camera-brightness { position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); padding: 6px 14px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
.camera-brightness.light-good { background: rgba(62,107,75,0.9); color: white; }
.camera-brightness.light-warn { background: rgba(184,121,42,0.9); color: white; }
.camera-brightness.light-bad { background: rgba(168,65,46,0.9); color: white; }
.camera-error { color: white; font-size: 0.85rem; padding: 20px; text-align: center; }
.camera-actions { display: flex; gap: 10px; margin-top: 16px; justify-content: center; }

/* WHOLESALE REQUEST FORM */
.wholesale-form h4 { display: flex; align-items: center; gap: 7px; font-size: 0.95rem; margin-bottom: 12px; color: var(--ink); }
.wholesale-form > label { display: flex; flex-direction: column; gap: 6px; font-size: 0.8rem; font-weight: 600; color: var(--ink-soft); margin-bottom: 12px; }
.wholesale-form input { padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; font-size: 0.9rem; font-family: inherit; color: var(--ink); background: white; }
.optional { font-weight: 400; text-transform: none; letter-spacing: 0; opacity: 0.7; }
.geo-capture { background: var(--cotton); border-radius: 10px; padding: 14px; margin-top: 4px; }
.geo-confirmed { display: flex; align-items: center; gap: 5px; font-size: 0.78rem; color: var(--ok); margin-top: 8px; font-family: 'JetBrains Mono', monospace; }
.geo-error { display: block; font-size: 0.78rem; color: var(--out); margin-top: 8px; }
.wholesale-confirm { background: white; border: 1px solid var(--line); border-radius: 14px; padding: 40px; text-align: center; max-width: 420px; margin: 40px auto; display: flex; flex-direction: column; align-items: center; gap: 10px; color: var(--ok); }
.wholesale-confirm h2 { color: var(--ink); }
.wholesale-confirm p { color: var(--ink-soft); font-size: 0.9rem; line-height: 1.5; }

/* WHOLESALE ADMIN */
.admin-subnav { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 22px; background: var(--cotton-deep); padding: 4px; border-radius: 10px; width: fit-content; }
.admin-subnav button { display: flex; align-items: center; gap: 6px; border: none; background: transparent; padding: 8px 14px; border-radius: 7px; font-size: 0.82rem; font-weight: 500; color: var(--ink-soft); cursor: pointer; }
.admin-subnav button.active { background: var(--ink); color: var(--cotton); }
.nav-dot { background: var(--thread); color: white; font-size: 0.65rem; font-weight: 700; padding: 1px 6px; border-radius: 10px; }

.section-title { font-size: 1rem; margin: 24px 0 12px; color: var(--ink-soft); }
.wholesale-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
.wholesale-card { background: white; border: 1px solid var(--line); border-radius: 12px; padding: 16px; }
.wholesale-card.status-pending { border-left: 3px solid var(--low); }
.wholesale-card.status-approved { border-left: 3px solid var(--ok); }
.wholesale-card.status-rejected { border-left: 3px solid var(--out); opacity: 0.7; }
.wholesale-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 12px; }
.wholesale-card-top h4 { font-size: 1rem; }
.wholesale-owner { font-size: 0.8rem; color: var(--ink-soft); margin-top: 2px; }
.status-pill { display: flex; align-items: center; gap: 4px; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; padding: 4px 8px; border-radius: 10px; flex-shrink: 0; }
.status-pill.status-pending { background: #FBF0E4; color: var(--low); }
.status-pill.status-approved { background: #E4EEE6; color: var(--ok); }
.status-pill.status-rejected { background: #F7E4E0; color: var(--out); }
.wholesale-address { display: flex; gap: 8px; font-size: 0.82rem; color: var(--ink); margin-bottom: 8px; }
.wholesale-address svg { flex-shrink: 0; margin-top: 3px; color: var(--ink-soft); }
.wholesale-address-sub { color: var(--ink-soft); font-size: 0.78rem; }
.map-link { display: inline-flex; align-items: center; gap: 3px; font-size: 0.78rem; color: var(--thread-deep); font-weight: 600; margin-top: 4px; text-decoration: none; }
.no-pin { font-size: 0.76rem; color: var(--out); font-style: italic; }
.wholesale-gst { font-size: 0.76rem; margin-bottom: 10px; }
.wholesale-actions { display: flex; gap: 8px; flex-wrap: wrap; }

/* ADMIN */
.admin { padding: 28px 32px 60px; }
.admin-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin-bottom: 28px; }
.stat-card { background: white; border: 1px solid var(--line); border-radius: 12px; padding: 16px 18px; display: flex; flex-direction: column; gap: 4px; }
.stat-label { font-size: 0.78rem; color: var(--ink-soft); }
.stat-value { font-family: 'Fraunces', serif; font-size: 1.6rem; }
.stat-card.warn .stat-value { color: var(--low); }
.stat-card.danger .stat-value { color: var(--out); }

.admin-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }

/* Record Sale */
.sale-confirm { display: flex; align-items: center; gap: 6px; background: var(--ok); color: white; padding: 10px 14px; border-radius: 8px; margin-bottom: 14px; font-size: 0.85rem; width: fit-content; }
.sale-total { display: flex; justify-content: flex-end; gap: 20px; margin-top: 14px; font-size: 0.9rem; color: var(--ink-soft); }
.sale-total-final { font-weight: 700; color: var(--ink); }
.icon-btn { border: none; background: transparent; color: var(--ink-soft); cursor: pointer; padding: 6px; border-radius: 6px; }
.icon-btn:hover { background: var(--cotton-deep); }
.form-error { color: var(--out); font-size: 0.82rem; margin-top: 8px; }

/* Demand Intelligence / customer requests */
.request-list { display: flex; flex-direction: column; gap: 12px; }
.request-row { display: flex; align-items: center; gap: 14px; padding: 10px 0; border-bottom: 1px solid var(--line); }
.request-row:last-child { border-bottom: none; }
.request-thumb { width: 48px; height: 48px; border-radius: 8px; object-fit: cover; flex-shrink: 0; border: 1px solid var(--line); }
.request-thumb-empty { background: var(--cotton-deep); display: flex; align-items: center; justify-content: center; }
.request-details { display: flex; flex-direction: column; gap: 2px; flex: 1; font-size: 0.85rem; }
.request-actions { display: flex; gap: 6px; flex-shrink: 0; }

/* Market Mode */
.clickable-row { cursor: pointer; }
.clickable-row:hover { background: var(--cotton-deep); }
.status-pill { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 600; text-transform: capitalize; background: var(--cotton-deep); color: var(--ink-soft); }
.status-pill.purchased { background: var(--ok); color: white; }
.status-pill.partial { background: var(--low); color: white; }
.status-pill.unavailable { background: var(--out); color: white; }
.status-pill.open { background: var(--ok); color: white; }
.status-pill.closed { background: var(--cotton-deep); color: var(--ink-soft); }
.connection-badge { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; }
.connection-badge.offline { background: var(--out); color: white; }
.connection-badge.syncing { background: var(--low); color: white; }
.progress-summary { display: flex; flex-wrap: wrap; gap: 16px; background: var(--cotton-deep); padding: 14px 18px; border-radius: 10px; margin-bottom: 16px; font-size: 0.85rem; }
.progress-summary .ok { color: var(--ok); }
.progress-summary .warn { color: var(--low); }
.progress-summary .danger { color: var(--out); }
.collection-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.collection-chip { display: flex; align-items: center; gap: 4px; padding: 5px 10px; border-radius: 20px; font-size: 0.78rem; }
.collection-chip.covered { background: var(--ok); color: white; }
.collection-chip.missing { background: var(--cotton-deep); color: var(--ink-soft); }
.trip-notes-textarea { width: 100%; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; font-family: inherit; font-size: 0.9rem; resize: vertical; }
.shopping-row { flex-wrap: wrap; }
.purchase-detail-form { display: flex; flex-wrap: wrap; gap: 8px; width: 100%; margin-top: 8px; }
.purchase-detail-form input { flex: 1; min-width: 90px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 6px; }
.supplier-field { flex: 1 1 100%; display: flex; flex-direction: column; gap: 4px; }
.supplier-field select { padding: 8px 10px; border: 1px solid var(--line); border-radius: 6px; font-size: 0.85rem; }
.pending-tag { font-style: italic; }

/* AI fabric matching (Phase 6) */
.fabric-photo-field { display: flex; flex-direction: column; gap: 8px; padding-top: 6px; border-top: 1px solid var(--line); margin-top: 4px; }
.fabric-photo-field label { display: flex; flex-direction: column; gap: 6px; font-size: 0.8rem; font-weight: 600; color: var(--ink-soft); }
.fabric-photo-preview { width: 100%; max-height: 160px; object-fit: cover; border-radius: 8px; border: 1px solid var(--line); }
.color-pick-photo { cursor: crosshair; }
.swatch-pick-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.swatch-pick-hint { display: flex; align-items: center; gap: 5px; font-size: 0.72rem; font-weight: 500; color: var(--ink-soft); opacity: 0.75; }
.swatch-pick-manual { flex-direction: row !important; align-items: center; gap: 8px !important; }
.swatch-pick-manual input[type="color"] { width: 40px; height: 32px; padding: 0; border: 1px solid var(--line); border-radius: 6px; cursor: pointer; }
.ai-match-control { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 10px 0; }
.ai-status { display: flex; align-items: center; gap: 4px; font-size: 0.78rem; }
.ai-status-on { color: var(--ok); font-weight: 600; }
.ai-status-off { color: var(--ink-soft); }

/* AI business insights (Phase 7) */
.insights-panel { background: var(--cotton-deep); border-radius: 12px; padding: 16px 18px; margin-bottom: 18px; }
.insights-panel.insights-empty { display: flex; align-items: center; gap: 8px; color: var(--ink-soft); font-size: 0.85rem; }
.insights-header { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 0.85rem; margin-bottom: 10px; }
.insights-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.insights-list li { font-size: 0.88rem; line-height: 1.4; padding-left: 18px; position: relative; }
.insights-list li::before { content: "•"; position: absolute; left: 4px; color: var(--thread); }

/* Trends (Phase 5) */
.history-notice { display: flex; align-items: flex-start; gap: 8px; background: var(--cotton-deep); color: var(--ink-soft); padding: 12px 16px; border-radius: 10px; margin-bottom: 18px; font-size: 0.82rem; line-height: 1.4; }
.season-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
.date-range-picker { display: flex; gap: 16px; flex-wrap: wrap; }
.date-range-picker label { display: flex; flex-direction: column; gap: 5px; font-size: 0.78rem; font-weight: 600; color: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.03em; }
.date-range-picker input[type="date"] { font-family: inherit; }
.two-col-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
.season-card { display: flex; flex-direction: column; gap: 4px; padding: 14px; background: var(--cotton-deep); border-radius: 10px; }
.season-name { font-size: 0.78rem; font-weight: 700; color: var(--ink-soft); text-transform: uppercase; letter-spacing: 0.03em; }
.season-revenue { font-size: 1.1rem; font-weight: 700; color: var(--ink); }

/* Dashboard */
.dash-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.dim { color: var(--ink-soft); font-weight: 400; }
.ranked-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.ranked-list-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; gap: 12px; border-bottom: 1px solid var(--line); padding-bottom: 8px; }
.ranked-list-row:last-child { border-bottom: none; padding-bottom: 0; }
.mini-chart { display: flex; align-items: flex-end; gap: 6px; height: 140px; }
.mini-chart-bar { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; gap: 6px; }
.mini-chart-fill { width: 100%; background: var(--thread); border-radius: 3px 3px 0 0; min-height: 2px; }
.mini-chart-label { font-size: 0.6rem; color: var(--ink-soft); writing-mode: vertical-rl; text-orientation: mixed; }
@media (max-width: 720px) {
  .dash-columns { grid-template-columns: 1fr; }
  .mini-chart-label { display: none; }
}

.table-wrap { background: white; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 0.86rem; }
th { text-align: left; padding: 12px 14px; background: var(--cotton-deep); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink-soft); }
td { padding: 10px 14px; border-top: 1px solid var(--line); }
.table-swatch { display: inline-block; width: 22px; height: 22px; border-radius: 5px; overflow: hidden; position: relative; }
.table-swatch-photo { width: 100%; height: 100%; object-fit: cover; display: block; }
.price-trend-flag { display: inline-flex; align-items: center; gap: 2px; color: var(--low, #b8860b); font-size: 0.72rem; margin-inline-start: 6px; cursor: help; }
.stale-supplier-flag { display: inline-flex; align-items: center; gap: 3px; color: var(--out, #b04a3a); font-size: 0.7rem; margin-inline-start: 8px; padding: 1px 6px; border-radius: 999px; background: var(--cotton-deep); cursor: help; }
.rating-input { width: 46px; text-align: center; }
.lead-time-cell { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; min-width: 130px; }
.ledger-detail { padding: 14px 4px; }
.ledger-transactions { list-style: none; margin: 0 0 14px; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.ledger-transactions li { display: flex; justify-content: space-between; gap: 12px; font-size: 0.85rem; padding: 4px 0; border-bottom: 1px dashed var(--cotton-deep); }
.ledger-transactions li.danger { color: var(--out); }
.ledger-transactions li.ok { color: var(--ok); }
.ledger-payment-form { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
td.danger { color: var(--out); font-weight: 600; }
.row-actions { display: flex; gap: 6px; }
.row-actions button { border: none; background: var(--cotton-deep); border-radius: 6px; width: 28px; height: 28px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.ledger-row-actions { display: flex; gap: 14px; flex-wrap: wrap; align-items: center; }


@media (max-width: 640px) {
  .hero, .toolbar, .type-tabs, .chapter, .admin { padding-left: 16px; padding-right: 16px; }
  .topnav { padding: 14px 16px; }
  .hero-text h1 { font-size: 1.8rem; }
  .sale-line .manual-search-wrap { flex: 1 1 100%; min-width: 100%; }
  .sale-line input[type="number"] { flex: 1 1 auto; }
}
`;
