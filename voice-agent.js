/* Course assistant: a voice + text chat agent for the portfolio.
   1) Fill in the CONFIG block below (batch date, fee, age rules, email keys).
   2) Nothing else needs editing. Voice works in Chrome/Edge/Safari; typing works everywhere. */
(function (root) {
  'use strict';

  /* ===================== CONFIG: edit this part ===================== */
  var CFG = {
    ownerName: 'Hira Baqar',
    course: 'Canva Graphic Designer Course for Beginners',
    whatsappDisplay: '0317 1835773',
    whatsappIntl: '923171835773',
    ownerEmail: 'digitalworlddesigns22@gmail.com',
    collectEmail: true,   // ask for the student's email. Hira then sends the enrollment confirmation from Gmail with one tap.

    nextBatch: '',        // e.g. 'Monday, 3 November 2026'. Leave empty if not decided.
    classTiming: '',      // e.g. 'Monday to Friday, 5 pm to 6 pm'
    fee: 'Rs 5,000',                 // fee for students in Pakistan (PKR)
    feeInternational: 'USD 19',      // fee for international students (5,000 PKR is about USD 18 at 276.6 PKR per USD, rounded up). Leave '' for none.
    /* Shown to the student right after enrolling. To hide them again, write a [PLACEHOLDER] in the text
       or leave it empty: the assistant then tells students to ask Hira on WhatsApp instead. */
    paymentDetails: 'Bank: MCB Bank, Account title: HIRA BAQAR, Account number: 0631987801002325, IBAN: PK37MUCB0631987801002325. International students: please ask Hira on WhatsApp for the SWIFT code and transfer details.',
    minAge: null,         // e.g. 14
    maxAge: null,         // e.g. 60, or null for no upper limit

    social: [
      { name: 'Fiverr', url: 'https://www.fiverr.com/s/8zpvZmr' },
      { name: 'GitHub', url: 'https://github.com/hirabaqar?tab=repositories' },
      { name: 'LinkedIn', url: 'https://www.linkedin.com/in/hira-baqar-863096278/' },
      { name: 'YouTube', url: 'https://www.youtube.com/@786-DIGITAL' },
      { name: 'Facebook', url: 'https://www.facebook.com/profile.php?id=100092529055678' },
      { name: 'Facebook 2', url: 'https://www.facebook.com/profile.php?id=61572294227959' },
      { name: 'Instagram', url: 'https://www.instagram.com/hirabaqar786/' },
      { name: 'X', url: 'https://x.com/hirabaqar786' }
    ],

    requirements: [
      'a laptop or desktop computer',
      'a stable internet connection',
      'the Zoom app downloaded and working',
      'basic computer skills, such as using a keyboard and mouse, opening files and browsing the internet'
    ],

    /* Free email sending: see README.md, section "Voice assistant emails".
       While these are empty, the assistant does NOT ask for an email address. It collects the
       student name and age only, and hands everything over on WhatsApp. */
    emailjs: { publicKey: '', serviceId: '', studentTemplateId: '', ownerTemplateId: '' }
  };
  /* ================================================================== */

  var WA_LINK = 'https://wa.me/' + CFG.whatsappIntl;
  var MAX_ENROLLMENTS_PER_CHAT = 3;

  /* ---------- small helpers (no browser needed, so they can be tested) ---------- */
  var NUM = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
    nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
    /* Roman Urdu */
    teen: 3, char: 4, chaar: 4, panch: 5, paanch: 5, chhe: 6, saat: 7, aath: 8, nau: 9, das: 10, gyarah: 11, barah: 12, terah: 13,
    chaudah: 14, pandrah: 15, solah: 16, satrah: 17, atharah: 18, unnees: 19, bees: 20, ikkees: 21, baees: 22, teis: 23,
    chaubees: 24, pachees: 25, chhabbees: 26, sattais: 27, atthais: 28, untees: 29, tees: 30, chalees: 40, pachas: 50,
    /* Urdu script */
    'تین': 3, 'چار': 4, 'پانچ': 5, 'چھ': 6, 'سات': 7, 'آٹھ': 8, 'نو': 9, 'دس': 10, 'گیارہ': 11, 'بارہ': 12, 'تیرہ': 13,
    'چودہ': 14, 'پندرہ': 15, 'سولہ': 16, 'سترہ': 17, 'اٹھارہ': 18, 'انیس': 19, 'بیس': 20, 'اکیس': 21, 'بائیس': 22, 'تئیس': 23,
    'چوبیس': 24, 'پچیس': 25, 'چھبیس': 26, 'ستائیس': 27, 'اٹھائیس': 28, 'انتیس': 29, 'تیس': 30, 'چالیس': 40, 'پچاس': 50 };

  function parseAge(s) {
    s = westernDigits(s);
    var m = String(s).match(/\b(\d{1,2})\b/);
    if (m) return +m[1];
    var words = String(s).toLowerCase().replace(/-/g, ' ').split(/\s+/), total = 0, found = false;
    words.forEach(function (w) { if (NUM.hasOwnProperty(w)) { total += NUM[w]; found = true; } });
    return found ? total : null;
  }

  function cleanName(s) {
    var t = String(s).trim()
      .replace(/^(the\s+)?(student(’|')?s?\s+)?(full\s+)?name\s+is\s+/i, '')
      .replace(/^(my name is|it(’|')?s|it is|this is|i am|i(’|')?m|call (him|her|me))\s+/i, '')
      .replace(/^(mera|meri|iska|iski|uska|uski|bache ka|bachi ka|beti ka|beta ka)\s+(naam|name)\s+(hai\s+)?/i, '')
      .replace(/^(میرا|میری|اس کا|اس کی|بچے کا|بچی کا)\s+نام\s*/, '')
      .replace(/\s+(hai|hain|ہے|ہیں)\s*$/i, '')
      .replace(/[^A-Za-z\u0600-\u06FF .'’-]/g, ' ').replace(/\s+/g, ' ').trim();
    if (t.length < 2 || t.length > 60) return null;
    return t.split(' ').map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }).join(' ');
  }

  function parseEmail(s) {
    var t = String(s).trim().toLowerCase();
    t = t.replace(/\s*ایٹ دی ریٹ\s*/g, ' at the rate ').replace(/\s*ڈاٹ\s*/g, ' dot ').replace(/جی میل/g, 'gmail')
      .replace(/ہاٹ میل/g, 'hotmail').replace(/یاہو/g, 'yahoo').replace(/\s*انڈر سکور\s*/g, ' underscore ').replace(/\s+کام\s*$/, ' com');
    t = t.replace(/\s+at the rate( of)?\s+|\s+at\s+/, '@').replace(/\s+dot\s+/g, '.')
      .replace(/\s+underscore\s+/g, '_').replace(/\s+(dash|hyphen)\s+/g, '-').replace(/\s+/g, '').replace(/[.,;]+$/, '');
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t) ? t : null;
  }

  function spellEmail(e) {
    var at = e.split('@');
    return at[0].split('').join(' ').replace(/\./g, 'dot').replace(/_/g, 'underscore').replace(/-/g, 'dash') +
      ' at ' + at[1].replace(/\./g, ' dot ');
  }

  /* ---- spoken digits ----
     People say numbers in different ways: "0300", "zero three double zero", "oh three oh oh", "O3OO",
     "double three", "sifar teen". This turns all of those into plain digits. "oh", "o" and "zero" all
     mean 0. A word like "oh" is only changed when it sits next to real digits, so normal sentences
     ("oh I paid yesterday") are left alone. */
  var DIGIT_WORDS = { zero: 0, zeero: 0, ziro: 0, xero: 0, jero: 0, zeros: 0, nought: 0, naught: 0, sifar: 0, siphar: 0, one: 1, ek: 1, aik: 1, two: 2, three: 3, teen: 3,
    four: 4, char: 4, chaar: 4, five: 5, paanch: 5, panch: 5, six: 6, chhe: 6, chay: 6, seven: 7, saat: 7,
    eight: 8, aath: 8, nine: 9, nau: 9,
    'صفر': 0, 'زیرو': 0, 'ایک': 1, 'تین': 3, 'چار': 4, 'پانچ': 5, 'چھ': 6, 'سات': 7, 'آٹھ': 8, 'نو': 9 };
  var REPEAT_WORDS = { double: 2, dabal: 2, dubal: 2, triple: 3, tripal: 3, 'ڈبل': 2, 'ٹرپل': 3 };

  function digitToken(raw) {
    var t = raw.toLowerCase().replace(/^[^a-z0-9+(\u0600-\u06FF]+|[^a-z0-9)\u0600-\u06FF]+$/g, '');
    if (!t) return null;
    if (/^[+()\d-]+$/.test(t) && /\d/.test(t)) return { d: t, strong: true, plain: true };      // already digits
    if (/^[0-9o+()-]+$/.test(t) && /\d/.test(t)) return { d: t.replace(/o/g, '0'), strong: true };  // "O3OO", "0O"
    if (DIGIT_WORDS.hasOwnProperty(t)) return { d: String(DIGIT_WORDS[t]), strong: true };
    if (t === 'oh' || t === 'اوہ' || t === 'او' || /^o+$/.test(t)) return { d: t === 'oh' ? '0' : t.replace(/o/g, '0'), strong: false };   // "oh", "o", "oo"
    if (t === 'do' || t === 'دو') return { d: '2', strong: false };      // Roman Urdu "do" = 2, only counted next to other digits
    return null;
  }

  function westernDigits(s) {   // Urdu / Arabic-Indic digits ۰۱۲۳ -> 0123
    return String(s).replace(/[\u0660-\u0669]/g, function (c) { return c.charCodeAt(0) - 0x0660; })
      .replace(/[\u06F0-\u06F9]/g, function (c) { return c.charCodeAt(0) - 0x06F0; });
  }

  function spokenDigits(s) {
    var toks = westernDigits(s).split(/[\s,]+/).filter(Boolean), items = [], i, k, rep, nx;
    for (i = 0; i < toks.length; i++) {
      k = digitToken(toks[i]);
      rep = REPEAT_WORDS[toks[i].toLowerCase().replace(/[^a-z\u0600-\u06FF]/g, '')];
      nx = rep && i + 1 < toks.length ? digitToken(toks[i + 1]) : null;
      if (rep && nx && !nx.plain) {                       // "double three" -> 33, "triple five" -> 555
        items.push({ d: new Array(rep + 1).join(nx.d), strong: nx.strong }); i++;
      } else if (k) items.push({ d: k.d, strong: k.strong, plain: k.plain, raw: toks[i] });
      else items.push({ text: toks[i] });
    }
    var out = [], g = [];
    function flush() {
      if (!g.length) return;
      var strong = g.some(function (x) { return x.strong; }), plain = g.every(function (x) { return x.plain; });
      if (strong && !plain) out.push(g.map(function (x) { return x.d; }).join(''));
      else g.forEach(function (x) { out.push(x.raw !== undefined ? x.raw : x.d); });
      g = [];
    }
    items.forEach(function (x) { if (x.text !== undefined) { flush(); out.push(x.text); } else g.push(x); });
    flush();
    return out.join(' ');
  }

  /* ---- payment details the student gives after paying ---- */
  /* WhatsApp number: 0300 1234567, +92 300 1234567, 923001234567, "oh three double zero ..." -> "+92 300 1234567" */
  function parsePhone(s) {
    var n = spokenDigits(s).replace(/\D/g, '');
    if (n.indexOf('0092') === 0) n = n.slice(2);
    if (n.length === 11 && n.charAt(0) === '0') n = '92' + n.slice(1);
    else if (n.length === 10 && n.charAt(0) === '3') n = '92' + n;
    if (n.length < 10 || n.length > 15) return null;
    return /^92\d{10}$/.test(n) ? '+92 ' + n.slice(2, 5) + ' ' + n.slice(5) : '+' + n;
  }

  /* Bank / wallet name plus account number (the last 4 digits are enough) */
  function parseAccount(s) {
    var t = spokenDigits(s).replace(/[^A-Za-z0-9\u0600-\u06FF .,\-\/()#'’]/g, ' ').replace(/\s+/g, ' ').trim();
    var digits = (t.match(/\d/g) || []).length;
    if (t.length < 4 || t.length > 60 || digits < 4) return null;
    return t;
  }

  /* Amount in rupees: "5000", "Rs 5,000", "5000 rupees" -> 5000 */
  function parseAmount(s) {
    var m = spokenDigits(String(s).replace(/,/g, '')).match(/\d+(\.\d{1,2})?/);
    if (!m) return null;
    var v = parseFloat(m[0]);
    if (!(v > 0 && v <= 10000000)) return null;
    return { v: v, cur: /usd|dollar|\$/i.test(s) ? 'USD' : 'PKR' };   // no currency given: PKR
  }
  function commas(v) { return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function formatMoney(a) { return a.cur === 'USD' ? 'USD ' + commas(a.v) : 'Rs ' + commas(a.v); }
  function formatRs(v) { return 'Rs ' + commas(v); }

  /* Fee text for students in Pakistan and for international students */
  function feeText(c, lang) {
    if (!c.fee) return '';
    if (lang === 'ur') return c.fee + (c.feeInternational ? ' Pakistan ke students ke liye, ya ' + c.feeInternational + ' international students ke liye' : '');
    return c.fee + (c.feeInternational ? ' for students in Pakistan, or ' + c.feeInternational + ' for international students' : '');
  }
  /* Payment details are "ready" only when they are filled in and no [PLACEHOLDER] is left */
  function payReady(c) { var p = c.paymentDetails; return !!p && !/\[[^\]]+\]/.test(p); }
  /* So the voice reads account numbers digit by digit instead of as one huge number */
  function spokenText(s) { return String(s).replace(/\d{6,}/g, function (m) { return m.split('').join(' '); }); }
  function spellDigits(s) { return String(s).replace(/\d+/g, function (m) { return m.split('').join(' '); }); }

  /* Words that show the student is writing or speaking Urdu (Urdu script or Roman Urdu) */
  var URDU_SCRIPT = /[؀-ۿ]/;
  function keep(x) { return '\uE010' + x + '\uE011'; }      // text between these marks is never converted to Urdu script
  var ROMAN_UR = /\b(aap|kya|kyun|kyu|kitna|kitni|kitne|kab|kaise|kahan|kaun|mujhe|mujhy|mera|meri|mere|hamein|hum|mein|hai|hain|hun|nahi|nhi|nahin|haan|theek|thik|acha|accha|bata|batao|bataiye|batayen|batain|karna|karni|karo|karein|karen|chahiye|chahta|chahti|chahte|lena|dakhla|shuru|baat|zaroor|shukria|shukriya|naam|umar|umr|saal|paise|paisa|ke|ki|ko|zaroori|zarooriyat|rabta|bare|baare)\b/gi;
  var ENGLISH_WORDS = /\b(the|is|are|what|when|where|how|do|does|can|could|i|you|your|my|to|for|of|and|want|would|like|please|tell|about|me|have|has)\b/i;
  /* Which language is the student using? Urdu script -> Urdu (shown in Urdu script), Roman Urdu -> Urdu (shown in Roman Urdu), else English */
  function detectLang(text, cur, curScript, free) {
    if (URDU_SCRIPT.test(text)) return { lang: 'ur', script: true };
    if (!free) return { lang: cur, script: curScript };       // while taking a name, number, email... keep the language
    if ((text.match(ROMAN_UR) || []).length >= 1) return { lang: 'ur', script: false };
    if (text.trim().split(/\s+/).length >= 2 && ENGLISH_WORDS.test(text)) return { lang: 'en', script: false };
    return { lang: cur, script: curScript };
  }

  var YES = /\b(yes|yeah|yep|yup|correct|right|sure|ok|okay|confirm|go ahead|please do|haan|han|ji|jee|bilkul|theek|thik|sahi|zaroor)\b|جی|ہاں|ٹھیک|صحیح|بالکل|کنفرم/i;
  var NO = /\b(no|nope|nah|wrong|incorrect|change|not correct|nahi|nahin|nhi|galat|tabdeel|badal)\b|نہیں|غلط|تبدیل/i;
  var CANCEL = /\b(cancel|stop|never ?mind|not now|forget it|exit|rehne do|ruk jao|band karo)\b|منسوخ|روک/i;

  /* After a student has enrolled: "what's next?", "I already sent the slip", "did you receive it?" */
  var NEXT = /\b(what(’|')?s|whats|what is)\s+next\b(?!\s+batch)|\bnext steps?\b|\bthen what\b|\bab kya\b|\baage kya\b|\bagla step\b|\bkya karna\b|\bwhat (do|should) i do\b|اب کیا|آگے کیا/i;
  var SENT = /\b(already|sent|paid|(bhej|bhar|kar)\s*(di|diya|dia|chuki|chuka|chuke)|payment\s+(done|made|sent|ho gayi|ho gai|kar di)|jama (kara|karwa) (di|diya))\b|ادا کر|بھیج دی|جمع کرا|کر دی/i;
  var STATUS = /\b(received|did you (get|receive)|verif(y|ied)|confirm(ed)?|status|approved|my seat|mil gaya|mil gayi|mil gai|mila|receive hua|confirm hua|pohanch)\b|مل گیا|مل گئی|پہنچ|تصدیق/i;
  var NEG = /\b(not|nahi|nahin|nhi|yet|abhi tak)\b|n(’|')t\b|نہیں|ابھی تک/i;

  var INTENTS = [
    ['thanks', /\b(thanks|thank you|shukria|shukriya|jazak)|شکریہ|جزاک/i],
    ['bye', /\b(bye|goodbye|see you|allah hafiz|khuda hafiz)\b|اللہ حافظ|خدا حافظ/i],
    ['enrollNow', /(i|we)\s*(want|would like|wish|need)\s*to\s*(enrol|enroll|join|register|apply)|\b(enrol|enroll|register|sign me up|admission)\s*(me|now|my|him|her|my (son|daughter|child))|\blet(’|')?s (enrol|enroll)|\b(enrol|enroll|join|register|admission|dakhla)\s*(karna|karni|karein|karen|karo|karwana|lena|lene)\b|داخلہ\s*(لینا|لینے|کرنا|کروانا)|ایڈمیشن|رجسٹر/i],
    ['social', /\b(social|socials|instagram|insta|facebook|fb|youtube|linkedin|fiverr|follow|profiles?|links?|channel|tiktok|twitter)\b|سوشل|انسٹاگرام|فیس بک|یوٹیوب/i],
    ['batch', /\b(batch|start|starts|starting|begin|begins|commence|kab|shuru|schedule|timing|timings|time table|class time)\b|شروع|بیچ|کب|ٹائمنگ|وقت/i],
    ['fee', /\b(fee|fees|price|cost|charges|how much|payment|pay|paisa|paise|kitne|kitni|qeemat|qimat)\b|فیس|قیمت|پیسے|کتنی|کتنے|ادائیگی/i],
    ['age', /\b(age|old|umar|umr|eligib|criteria|criterion|minimum|maximum|kids|children|child)\b|عمر|بچے|بچوں/i],
    ['requirements', /\b(requirement|requirements|need|needs|device|laptop|computer|pc|mobile|phone|tablet|zoom|literacy|skills|internet|prerequisite|prepare|zaroori|zarooriyat|zaruriyat|chahiye)\b|ضرورت|ضروریات|لیپ ٹاپ|کمپیوٹر|زوم|انٹرنیٹ/i],
    ['enroll', /\b(enrol|enroll|enrolment|enrollment|admission|dakhla|register|registration|join|apply|sign ?up)\b|داخلہ/i],
    ['course', /\b(course|curriculum|syllabus|topics|teach|learn|duration|how long|months?|content|canva|seekhna|sikhna|sikhaya)\b|کورس|سیکھ|سلیبس|کتنے مہینے/i],
    ['about', /\b(about (hira|baqar|the (teacher|instructor|tutor|trainer|mentor)|your (teacher|instructor|tutor))|tell me about (hira|baqar|her|the teacher)|who (is|are) (hira|baqar|she|the (teacher|instructor|tutor|trainer)|you|your (teacher|instructor|tutor))|(teacher|instructor|tutor|trainer|mentor)|experience|qualification|qualified|hira\s+(ke|ki|ka)\s+(bare|baare)|ustaad|ustad)\b|ہیرا کے بارے|استاد|ٹیچر|تجربہ/i],
    ['contact', /\b(contact|whatsapp|number|email|call|reach|phone number|rabta|raabta)\b|رابطہ|واٹس ایپ|نمبر/i],
    ['greet', /^(hi|hello|hey|salam|assalam|assalamualaikum|assalam o alaikum|good (morning|afternoon|evening))\b|^(سلام|السلام)/i]
  ];

  function detect(text) {
    for (var i = 0; i < INTENTS.length; i++) if (INTENTS[i][1].test(text)) return INTENTS[i][0];
    return null;
  }

  /* ---------- Roman Urdu -> Urdu script ----------
     Every Urdu reply is written in Roman Urdu. When the student writes or speaks in Urdu script, the same reply is
     shown in Urdu script too, word by word with this list. Names, numbers, e-mail addresses and the bank details
     stay exactly as they are. */
  var UR_WORDS_TEXT = [
    'acha اچھا', 'chahein چاہیں', 'durust درست', 'ka کا', 'liye لیے', 'maangein مانگیں', 'main میں', 'milega ملے گا', 'usi اسی',
    'aage آگے', 'aakhri آخری', 'aamdeed آمدید', 'aane آنے', 'aap آپ', 'aaram آرام', 'aate آتے', 'aaya آیا', 'aaye آئے', 'ab اب', 'abhi ابھی',
    'account اکاؤنٹ', 'address ایڈریس', 'agar اگر', 'agla اگلا', 'agle اگلے', 'ai اے آئی', 'aise ایسے', 'allah اللہ', 'allow الاؤ', 'announce اعلان',
    'app ایپ', 'assistant اسسٹنٹ', 'aur اور', 'awaaz آواز', 'az از', 'baad بعد', 'baare بارے', 'baat بات', 'banana بنانا', 'banati بناتی', 'band بند',
    'bank بینک', 'banners بینرز', 'baqar باقر', 'bata بتا', 'batate بتاتے', 'batati بتاتی', 'batayein بتائیں', 'batch بیچ', 'bhej بھیج', 'bhejein بھیجیں',
    'bhejenge بھیجیں گے', 'bhejengi بھیجیں گی', 'bheji بھیجی', 'bhejne بھیجنے', 'bhejni بھیجنی', 'bhejte بھیجتے', 'bhi بھی', 'bohat بہت', 'bol بول',
    'bolein بولیں', 'boliye بولیے', 'book بک', 'box باکس', 'browse براؤز', 'browser براؤزر', 'buniyadi بنیادی', 'business بزنس', 'button بٹن',
    'canva کینوا', 'cards کارڈز', 'chahenge چاہیں گے', 'chahiye چاہیے', 'chahte چاہتے', 'chal چل', 'chala چلا', 'chalati چلاتی', 'chalenge چلیں گے',
    'chalta چلتا', 'chat چیٹ', 'check چیک', 'chhote چھوٹے', 'chhoti چھوٹی', 'chrome کروم', 'chuke چکے', 'chunein چنیں', 'chunne چننے', 'class کلاس',
    'classes کلاسز', 'computer کمپیوٹر', 'confirm کنفرم', 'confirmation کنفرمیشن', 'connection کنکشن', 'course کورس', 'covers کورز', 'currency کرنسی',
    'dabayein دبائیں', 'dauran دوران', 'de دے', 'dein دیں', 'dene دینے', 'dengi دیں گی', 'design ڈیزائن', 'designer ڈیزائنر', 'designs ڈیزائنز',
    'desktop ڈیسک ٹاپ', 'details ڈیٹیلز', 'deti دیتی', 'dhoond ڈھونڈ', 'di دی', 'digits ہندسے', 'dikhaya دکھایا', 'diye دیے', 'dobara دوبارہ',
    'doosra دوسرا', 'download ڈاؤن لوڈ', 'e ای', 'edge ایج', 'educator ایجوکیٹر', 'ek ایک', 'email ای میل', 'english انگریزی', 'enroll اینرول',
    'enrollment اینرولمنٹ', 'enrollments اینرولمنٹس', 'facebook فیس بک', 'fee فیس', 'fees فیس', 'fikar فکر', 'files فائلیں', 'fiverr فائیور',
    'flyers فلائرز', 'free فری', 'gaye گئے', 'gayi گئی', 'graphic گرافک', 'haan ہاں', 'hafiz حافظ', 'hai ہے', 'hain ہیں', 'hamein ہمیں',
    'hifazat حفاظت', 'hira ہیرا', 'ho ہو', 'hoga ہوگا', 'hon ہوں', 'hone ہونے', 'hota ہوتا', 'hoti ہوتی', 'https ایچ ٹی ٹی پی ایس', 'hue ہوئے', 'hui ہوئی',
    'hum ہم', 'hun ہوں', 'icon آئیکن', 'ijazat اجازت', 'images تصاویر', 'inbox ان باکس', 'input ان پٹ', 'install انسٹال', 'international انٹرنیشنل',
    'internet انٹرنیٹ', 'intezar انتظار', 'is اس', 'isay اسے', 'istemal استعمال', 'ja جا', 'jaanna جاننا', 'jab جب', 'jaise جیسے', 'jama جمع',
    'jata جاتا', 'jati جاتی', 'jawab جواب', 'jaye جائے', 'jayega جائے گا', 'jayegi جائے گی', 'jayengi جائیں گی', 'jis جس', 'jo جو', 'join جوائن',
    'kabhi کبھی', 'kafi کافی', 'kahan کہاں', 'kahein کہیں', 'kaise کیسے', 'kam کم', 'kar کر', 'karein کریں', 'karengi کریں گی', 'karna کرنا',
    'karne کرنے', 'karobar کاروبار', 'karte کرتے', 'karwane کروانے', 'karwate کرواتے', 'karwayein کروائیں', 'ke کے', 'keh کہہ', 'kehte کہتے',
    'keyboard کی بورڈ', 'khol کھول', 'kholein کھولیں', 'kholna کھولنا', 'khud خود', 'khulega کھلے گا', 'khush خوش', 'khushi خوشی', 'ki کی',
    'kijiye کیجیے', 'kis کس', 'kisi کسی', 'kitni کتنی', 'kitne کتنے', 'kiya کیا', 'ko کو', 'koi کوئی', 'koshish کوشش', 'kuch کچھ', 'kya کیا',
    'kyunke کیونکہ', 'laga لگا', 'lagayein لگائیں', 'lagta لگتا', 'laptop لیپ ٹاپ', 'lein لیں', 'lekin لیکن', 'li لی', 'likh لکھ', 'likhein لکھیں',
    'link لنک', 'links لنکس', 'live لائیو', 'lock لاک', 'logo لوگو', 'logos لوگوز', 'maaf معاف', 'maharat مہارت', 'mahine مہینے', 'maine میں نے',
    'maloom معلوم', 'mangne مانگنے', 'masla مسئلہ', 'media میڈیا', 'meherbani مہربانی', 'mehfooz محفوظ', 'mein میں', 'mere میرے', 'message میسج',
    'messages میسجز', 'mic مائیک', 'microphone مائیکروفون', 'mil مل', 'mila ملا', 'milengi ملیں گی', 'minimum کم از کم', 'misaal مثال', 'mouse ماؤس',
    'mug مگ', 'mujh مجھ', 'mujhe مجھے', 'mustaqil مستقل', 'na نہ', 'naam نام', 'nahi نہیں', 'nazar نظر', 'ne نے', 'neeche نیچے', 'note نوٹ',
    'number نمبر', 'official آفیشل', 'online آن لائن', 'paas پاس', 'pakistan پاکستان', 'par پر', 'parega پڑے گا', 'parhaya پڑھایا', 'payment پیمنٹ',
    'pehchanne پہچاننے', 'pehle پہلے', 'pehli پہلی', 'phir پھر', 'pohanchane پہنچانے', 'pooch پوچھ', 'poocha پوچھا', 'poochein پوچھیں', 'poochi پوچھی',
    'poochna پوچھنا', 'poora پورا', 'poori پوری', 'posts پوسٹس', 'qareeb قریب', 'rabta رابطہ', 'rahe رہے', 'rahi رہی', 'raqam رقم', 'rating ریٹنگ',
    'receipt رسید', 'rakhein رکھیں', 'rok روک', 'roman رومن', 'ruken رکیں', 'rukne رکنے', 'saal سال', 'saath ساتھ', 'sab سب', 'safari سفاری',
    'sahulat سہولت', 'saka سکا', 'saki سکی', 'sakta سکتا', 'sakte سکتے', 'sakti سکتی', 'samajh سمجھ', 'sarparast سرپرست', 'save سیو', 'sawal سوال',
    'schedule شیڈول', 'se سے', 'settings سیٹنگز', 'shamil شامل', 'shart شرط', 'shirt شرٹ', 'shukriya شکریہ', 'shuru شروع', 'sikhati سکھاتی',
    'sikhaya سکھایا', 'sirf صرف', 'site سائٹ', 'slip سلپ', 'sms ایس ایم ایس', 'social سوشل', 'sound ساؤنڈ', 'spam سپیم', 'step سٹیپ', 'steps سٹیپس',
    'store اسٹور', 'student اسٹوڈنٹ', 'students اسٹوڈنٹس', 'sun سن', 'suni سنی', 't ٹی', 'tabdeel تبدیل', 'tabdeeli تبدیلی', 'tafseelat تفصیلات',
    'tajurba تجربہ', 'tak تک', 'tap ٹیپ', 'tareekh تاریخ', 'tareeqa طریقہ', 'tareeqe طریقے', 'tasdeeq تصدیق', 'tasveer تصویر', 'taur طور', 'tayyar تیار',
    'teacher ٹیچر', 'teen تین', 'teesra تیسرا', 'theek ٹھیک', 'thumbnails تھمب نیلز', 'to تو', 'type ٹائپ', 'umar عمر', 'un ان', 'unhein انہیں',
    'unmute ان میوٹ', 'unmuted ان میوٹ', 'upar اوپر', 'urdu اردو', 'us اس', 'use استعمال', 'wahin وہیں', 'wala والا', 'wallet والٹ', 'walid والد',
    'website ویب سائٹ', 'whatsapp واٹس ایپ', 'windows ونڈوز', 'wo وہ', 'ya یا', 'yahan یہاں', 'ye یہ', 'youtube یوٹیوب', 'zara ذرا', 'zariye ذریعے',
    'zaroori ضروری', 'zarooriyat ضروریات', 'zoom زوم', 'zubaan زبان', 'zyada زیادہ'
  ];
  var UR_WORDS = {};
  UR_WORDS_TEXT.forEach(function (line) { var i = line.indexOf(' '); UR_WORDS[line.slice(0, i)] = line.slice(i + 1); });
  var UR_PHRASES = [['Assalam o Alaikum', 'السلام علیکم'], ['Allah Hafiz', 'اللہ حافظ'], ['Khush aamdeed', 'خوش آمدید'], ['Digital World Designs', 'Digital World Designs']];

  function stripKeep(s) { return String(s).replace(/[]/g, ''); }
  function romanToUrdu(text) {
    var s = String(text), saved = [];
    function hold(x) { saved.push(x); return '' + (saved.length - 1) + ''; }
    s = s.replace(/([\s\S]*?)/g, function (m, x) { return hold(x); });                  // text that must stay as written
    s = s.replace(/\S+@\S+|https?:\/\/\S+/g, hold);                                                  // e-mail addresses and links
    UR_PHRASES.forEach(function (p) { s = s.replace(new RegExp(p[0], 'gi'), function () { return p[1].indexOf('') === 0 ? hold(p[0]) : p[1]; }); });
    s = s.replace(/[A-Za-z]+/g, function (w) { var u = UR_WORDS[w.toLowerCase()]; return u !== undefined ? u : w; });
    s = s.replace(/(.),(\s)/g, function (m, a, b) { return /\d/.test(a) ? m : a + '،' + b; }).replace(/\?/g, '؟')
      .replace(/([؀-ۿ])\.(\s|$)/g, '$1۔$2');
    s = s.replace(/(\d+)/g, function (m, i) { return saved[+i]; });
    return s;
  }

  /* ---------- the conversation brain ---------- */
  function Brain(cfg) { this.cfg = cfg; this.lang = 'en'; this.script = false; this.state = 'idle'; this.data = {}; this.enrolled = null; this.count = 0;
    /* progress after the details are collected:
       'none' -> 'awaiting_slip' -> 'collecting_payment' -> 'slip_sent' */
    this.progress = 'none';
    this.payData = {}; this.paid = null; this.fixingPay = false; }

  Brain.prototype.ask = function (what) { return what; };
  /* Pick the English or the Roman Urdu text for the language the student is using */
  Brain.prototype.t = function (en, ur) { return this.lang === 'ur' ? ur : en; };
  Brain.prototype.payOn = function () { return payReady(this.cfg); };

  /* The student's email is asked for whenever collectEmail is on (Hira's confirmation goes out from Gmail). */
  Brain.prototype.askEmail = function () { return this.cfg.collectEmail !== false; };

  /* Automatic sending from the website only happens when EmailJS is really set up. */
  Brain.prototype.emailOn = function () {
    var k = this.cfg.emailjs || {};
    return !!(k.publicKey && k.serviceId && k.studentTemplateId);
  };

  Brain.prototype.facts = function (key) {
    var c = this.cfg, t = this.t.bind(this);
    var wa = t('WhatsApp at ' + c.whatsappDisplay, 'WhatsApp par ' + c.whatsappDisplay), fee = feeText(c, this.lang);
    switch (key) {
      case 'greet':
        return t('Assalam o Alaikum! I’m the assistant for ' + c.ownerName + '’s Canva course. I can tell you about Hira, the next batch, how to enroll, the age criteria and what you need to join, or where to find Hira online. You can speak or type in English or Urdu, and I will answer in the same language. What would you like to know?',
                 'Assalam o Alaikum! Main ' + c.ownerName + ' ke Canva course ki assistant hun. Aap mujh se Hira ke baare mein, agle batch, enroll karne ke tareeqe, umar ki shart ya zarooriyat ke baare mein pooch sakte hain, ya ye ke Hira online kahan milengi. Aap English ya Urdu, jis zubaan mein chahein baat karein, jawab usi zubaan mein milega. Aap kya jaanna chahte hain?');
      case 'about':
        return t(c.ownerName + ' is a graphic designer and Canva educator. She has 2 years of design experience and 1 year of running supportive online classes. She teaches Canva live on Zoom and has a 5.0 rating as a Canva teacher on Fiverr. She also runs Digital World Designs, which makes flyers, social media posts and logos for small businesses.',
                 c.ownerName + ' graphic designer aur Canva educator hain. Un ko design ka 2 saal ka tajurba hai aur 1 saal se online classes bhi chala rahi hain. Wo Canva Zoom par live sikhati hain aur Fiverr par Canva teacher ke taur par un ki 5.0 rating hai. Wo Digital World Designs bhi chalati hain, jo chhote karobar ke liye flyers, social media posts aur logos banati hai.');
      case 'course':
        return t('The ' + c.course + ' is a 2-month course taught live on Zoom. You learn AI-generated images, logo design, e-book covers, Facebook banners, YouTube thumbnails and banners, business cards, flyers, T-shirt and mug designs, and how to create a free e-store on an international website. No design experience is needed.',
                 c.course + ' 2 mahine ka course hai jo Zoom par live parhaya jata hai. Is mein AI se images, logo design, e-book covers, Facebook banners, YouTube thumbnails aur banners, business cards, flyers, T-shirt aur mug designs, aur international website par free e-store banana sikhaya jata hai. Design ka pehle se koi tajurba zaroori nahi.');
      case 'batch':
        return c.nextBatch
          ? t('The next batch starts on ' + c.nextBatch + '.' + (c.classTiming ? ' Classes are ' + c.classTiming + '.' : '') + ' Would you like to enroll?',
              'Agla batch ' + c.nextBatch + ' ko shuru hoga.' + (c.classTiming ? ' Classes ' + c.classTiming + ' hongi.' : '') + ' Kya aap enroll karna chahenge?')
          : t('The next batch date has not been announced on this website yet. Please message ' + c.ownerName + ' on ' + wa + ' and she will confirm it.',
              'Agle batch ki tareekh abhi website par announce nahi hui. Meherbani kar ke ' + c.ownerName + ' ko ' + wa + ' message karein, wo confirm kar dengi.');
      case 'fee':
        return c.fee
          ? t('The course fee is ' + fee + '.' + (this.payOn() ? ' ' + keep(c.paymentDetails) : '') + ' After paying, enroll here and tell me “I have paid”. I will prepare the full message for ' + c.ownerName + ' on ' + wa + ', where you attach the payment slip.',
              'Course ki fees ' + fee + ' hai.' + (this.payOn() ? ' ' + keep(c.paymentDetails) : '') + ' Payment karne ke baad yahan enroll karein aur “I have paid” kahein. ' + c.ownerName + ' ke liye ' + wa + ' ka poora message tayyar ho jayega, jis mein aap payment slip laga kar bhej dein.')
          : t('The fee and payment method are shared by ' + c.ownerName + ' directly. Please message her on ' + wa + '.',
              'Fees aur payment ka tareeqa ' + c.ownerName + ' khud batati hain. Meherbani kar ke unhein ' + wa + ' message karein.');
      case 'age':
        if (c.minAge && c.maxAge) return t('The course is open to students aged ' + c.minAge + ' to ' + c.maxAge + '.', 'Ye course ' + c.minAge + ' se ' + c.maxAge + ' saal ki umar ke students ke liye hai.');
        if (c.minAge) return t('The course is open to students aged ' + c.minAge + ' and above.', 'Ye course ' + c.minAge + ' saal aur us se zyada umar ke students ke liye hai.');
        return t('Please ask ' + c.ownerName + ' about the age criteria on ' + wa + '. She will confirm if the student can join.',
                 'Umar ki shart ke baare mein meherbani kar ke ' + c.ownerName + ' se ' + wa + ' poochein. Wo bata dengi ke student join kar sakta hai ya nahi.');
      case 'requirements':
        return t('To join you need ' + c.requirements.slice(0, -1).join(', ') + ', and ' + c.requirements[c.requirements.length - 1] + '. If you have not installed Zoom yet, please download it from the official Zoom website or your app store before the first class.',
                 'Course mein shamil hone ke liye aap ko chahiye: laptop ya desktop computer, mustaqil internet connection, Zoom app jo download ho kar theek chal rahi ho, aur computer ki buniyadi maharat, jaise keyboard aur mouse istemal karna, files kholna aur internet browse karna. Agar aap ne abhi Zoom install nahi kiya, to pehli class se pehle use official Zoom website ya app store se download kar lein.');
      case 'enroll':
        return t('Enrolling takes three steps. First, I note the student’s name and age' + (this.askEmail() ? ' and an email address for the enrollment confirmation' : '') + '. Second, you pay the course fee' + (this.payOn() ? ' to the account I show you' : '') + '. Third, you tell me “I have paid”, I ask for your WhatsApp number, the account you paid from and the amount, and then prepare a full message for ' + c.ownerName + ' on ' + wa + ', where you attach the payment slip. Once ' + c.ownerName + ' has checked the slip, she sends your enrollment confirmation email. Would you like to enroll now?',
                 'Enroll karna teen steps mein hota hai. Pehle student ka naam aur umar note ki jati hai' + (this.askEmail() ? ' aur enrollment confirmation ke liye email address' : '') + '. Doosra, aap course ki fees ' + (this.payOn() ? 'us account mein jama karwate hain jo dikhaya jata hai' : 'jama karwate hain') + '. Teesra, aap “I have paid” kehte hain, phir aap ka WhatsApp number, jis account se payment ki wo account aur raqam poocha jata hai, aur ' + c.ownerName + ' ke liye ' + wa + ' ka poora message tayyar hota hai jis mein aap payment slip laga kar bhejte hain. Slip check karne ke baad ' + c.ownerName + ' aap ko enrollment confirmation email bhej deti hain. Kya aap abhi enroll karna chahte hain?');
      case 'social':
        return t('You can find ' + c.ownerName + ' online on ' + c.social.map(function (s) { return s.name; }).join(', ').replace(/, ([^,]*)$/, ' and $1') + '. I have shown the links below, so you can tap one to open it.',
                 c.ownerName + ' ko aap ' + c.social.map(function (s) { return s.name; }).join(', ').replace(/, ([^,]*)$/, ' aur $1') + ' par dhoond sakte hain. Links neeche diye hain, kisi par tap kar ke khol lein.');
      case 'contact':
        return t('You can reach ' + c.ownerName + ' on ' + wa + ' or by email at ' + c.ownerEmail + '.',
                 c.ownerName + ' se aap ' + wa + ' ya email ' + c.ownerEmail + ' par rabta kar sakte hain.');
      case 'thanks':
        return t('You’re welcome! Ask me anything else about the course, or say “enroll” to start.', 'Khush aamdeed! Course ke baare mein kuch aur poochna ho to poochein, ya shuru karne ke liye “enroll” kahein.');
      case 'bye':
        return t('Allah Hafiz! Message us on WhatsApp any time.', 'Allah Hafiz! Kabhi bhi WhatsApp par message karein.');
    }
    return null;
  };

  Brain.prototype.chipsFor = function (key) {
    if (key === 'enroll' || key === 'batch' && this.cfg.nextBatch) return ['Yes, enroll now', 'Not now'];
    return ['Next batch', 'How to enroll', 'Age criteria', 'Requirements', 'About Hira', 'Social media', 'Enroll now'];
  };

  Brain.prototype.linksFor = function (key) {
    var c = this.cfg;
    if (key === 'social') return c.social;
    if (key === 'contact') return [{ name: 'WhatsApp', url: WA_LINK }, { name: 'Email', url: 'mailto:' + c.ownerEmail }];
    return null;
  };

  Brain.prototype.fixOptions = function () { return this.askEmail() ? ['Name', 'Age', 'Email'] : ['Name', 'Age']; };

  Brain.prototype.prompt = function () {
    var d = this.data, on = this.askEmail(), minor = d.age !== undefined && d.age < 18, t = this.t.bind(this);
    switch (this.state) {
      case 'name': return { say: t('What is the student’s full name?', 'Student ka poora naam kya hai?'), input: 'text' };
      case 'age': return { say: t('How old is the student?', 'Student ki umar kitni hai?'), input: 'text' };
      case 'email':
        return { say: t((minor ? 'Because the student is under 18, please give a parent’s or guardian’s email address for the confirmation.' : 'Please give an email address for the confirmation.') +
                      ' Type it in the box, or say it like: name at gmail dot com.',
                      (minor ? 'Kyunke student ki umar 18 saal se kam hai, meherbani kar ke confirmation ke liye walid ya sarparast ka email address dein.' : 'Meherbani kar ke confirmation ke liye email address dein.') +
                      ' Isay neeche box mein type karein, ya aise bolein: name at gmail dot com.'), input: 'email' };
      case 'confirm':
        var base = t('Let me check the details. Student name: ' + d.name + '. Age: ' + d.age + '.', 'Zara tafseelat check kar lein. Student ka naam: ' + d.name + '. Umar: ' + d.age + '.');
        var q = (on && minor)
          ? t(' Because the student is under 18, please confirm that this email belongs to a parent or guardian. Is everything correct?', ' Kyunke student ki umar 18 saal se kam hai, tasdeeq karein ke ye email walid ya sarparast ki hai. Kya sab theek hai?')
          : t(' Is this correct?', ' Kya ye theek hai?');
        return { say: base + (on ? ' Email: ' + d.email + '.' : '') + q,
                 speak: base + (on ? ' Email: ' + spellEmail(d.email) + '.' : '') + q,
                 chips: ['Yes, confirm', 'No, change'] };
      case 'payWa':
        return { say: t('From which WhatsApp number did you send (or will you send) the fee slip to ' + this.cfg.ownerName + '? For example 0300 1234567.',
                        'Fee ki slip ' + this.cfg.ownerName + ' ko kis WhatsApp number se bheji hai (ya bhejenge)? Misaal ke taur par 0300 1234567.'), input: 'text' };
      case 'payAcct':
        return { say: t('From which bank or wallet account did you pay? Please type the bank name and the account number. The last 4 digits are enough, for example “HBL 1234”.',
                        'Aap ne kis bank ya wallet account se payment ki? Meherbani kar ke bank ka naam aur account number likhein ya bolein. Aakhri 4 digits kafi hain, jaise “HBL 1234”.'), input: 'text' };
      case 'payAmt':
        return { say: t('How much did you pay, and in which currency? For example “5000 PKR” or “19 USD”.', 'Aap ne kitni raqam bheji, aur kis currency mein? Misaal: “5000 PKR” ya “19 USD”.'), input: 'text' };
      case 'payConfirm':
        var pd = this.payData;
        var pay = t('Let me check the payment details. Slip sent from WhatsApp number: ' + pd.wa + '. Paid from account: ' + pd.acct + '. Amount: ' + formatMoney(pd.amt) + '. Is this correct?',
                    'Payment ki tafseelat check kar lein. Slip is WhatsApp number se bheji gayi: ' + pd.wa + '. Jis account se payment hui: ' + pd.acct + '. Raqam: ' + formatMoney(pd.amt) + '. Kya ye theek hai?');
        return { say: pay, speak: spellDigits(pay), chips: ['Yes, confirm', 'No, change'] };
    }
    return { say: '' };
  };

  /* Answers for a student who has already given their details */
  Brain.prototype.postEnroll = function (txt) {
    var c = this.cfg, e = this.enrolled, t = this.t.bind(this), L = this.lang;
    var wa = t('WhatsApp at ' + c.whatsappDisplay, 'WhatsApp par ' + c.whatsappDisplay);
    if (!e) return null;
    var slip = this.progress === 'slip_sent';
    var payHow = t(this.payOn() ? ', using the account details above' : ', after asking ' + c.ownerName + ' for the account details on ' + wa,
                   this.payOn() ? ', upar diye gaye account mein' : ', pehle ' + c.ownerName + ' se ' + wa + ' account details le kar');
    var slipStep = t('pay the course fee' + (c.fee ? ' of ' + feeText(c, L) : '') + payHow + ', then tap “I have paid”. I will note your payment details and prepare the full message for ' + c.ownerName + ' on WhatsApp.',
                     'course ki fees' + (c.fee ? ' (' + feeText(c, L) + ')' : '') + payHow + ' jama karwayein, phir “I have paid” dabayein. Aap ki payment ki tafseelat note ho kar ' + c.ownerName + ' ke liye WhatsApp message tayyar ho jayega.');
    var chipsAwait = ['I have paid', 'What’s next?', 'Requirements'];
    var againLabel = t('Open the message for Hira again', 'Hira ke liye message dobara kholein');

    /* "did you receive it?", "is my seat confirmed?" */
    if (STATUS.test(txt)) {
      return slip
        ? { say: t('I cannot see WhatsApp messages, so I cannot confirm receipt myself. ' + c.ownerName + ' will check your payment, reply to you on WhatsApp and send you an enrollment confirmation email. If you do not hear back, message her again on ' + wa + '.',
                   'WhatsApp messages yahan nazar nahi aate, is liye receipt yahan se confirm nahi ho sakti. ' + c.ownerName + ' aap ki payment check karengi, WhatsApp par jawab dengi aur enrollment confirmation email bhejengi. Agar jawab na aaye to unhein dobara ' + wa + ' message karein.'),
            whatsapp: this.paid ? this.waPayLink() : null, whatsappLabel: againLabel, chips: this.chipsFor() }
        : { say: t('I have the student’s details, but I do not know yet that the fee was paid. Please ' + slipStep,
                   'Student ki tafseelat mere paas hain, lekin abhi tak ye maloom nahi ke fees jama hui ya nahi. Meherbani kar ke ' + slipStep), chips: chipsAwait };
    }
    /* "I have paid" / "I already sent it" (but not "I have not paid yet") */
    if (SENT.test(txt)) {
      if (NEG.test(txt)) {
        return { say: t('No problem. When you are ready, ' + slipStep, 'Koi baat nahi. Jab aap tayyar hon, ' + slipStep), chips: chipsAwait };
      }
      if (slip) {
        return { say: t('You have already given me the payment details, so the message for ' + c.ownerName + ' is ready. Please open it, attach the payment slip picture in WhatsApp and send it. I cannot see WhatsApp messages, so she will check and reply to you there.',
                         'Aap payment ki tafseelat de chuke hain, is liye ' + c.ownerName + ' ke liye message tayyar hai. Use kholein, WhatsApp mein payment slip ki tasveer laga kar bhej dein. WhatsApp messages yahan nazar nahi aate, is liye wo check kar ke aap ko wahin jawab dengi.'),
          whatsapp: this.waPayLink(), whatsappLabel: againLabel, chips: this.chipsFor() };
      }
      return this.startPayment();
    }
    /* "what's next?" depends on how far the student has come */
    if (NEXT.test(txt)) {
      return slip
        ? { say: t('You have shared your payment details, so now ' + c.ownerName + ' will check them, reply to you on WhatsApp and send you an enrollment confirmation email. Meanwhile, please make sure the Zoom app is installed and working.',
                   'Aap ne payment ki tafseelat de di hain, ab ' + c.ownerName + ' unhein check kar ke WhatsApp par jawab dengi aur enrollment confirmation email bhejengi. Is dauran Zoom app install kar ke check kar lein ke theek chal rahi hai.'), chips: this.chipsFor() }
        : { say: t('You have already given the student’s details, so the next step is to ' + slipStep + ' Please also get the Zoom app ready.',
                   'Aap student ki tafseelat de chuke hain, ab agla step ye hai: ' + slipStep + ' Zoom app bhi tayyar rakhein.'), chips: chipsAwait };
    }
    return null;
  };

  /* The student says the fee is paid: collect the payment details for Hira */
  Brain.prototype.startPayment = function () {
    this.state = 'payWa'; this.payData = {}; this.fixingPay = false; this.progress = 'collecting_payment';
    var p = this.prompt();
    p.say = this.t('Thank you! To give ' + this.cfg.ownerName + ' the full picture, I need three quick payment details. ',
                   'Shukriya! ' + this.cfg.ownerName + ' ko poori tasveer dene ke liye payment ki teen chhoti tafseelat chahiye. ') + p.say;
    return p;
  };

  /* Reply in the language the student just used. r.miss = the assistant did not understand (used to retry the microphone in the other language) */
  Brain.prototype.reply = function (text, opts) {
    var before = this.state, t = String(text || '').trim();
    if (!(opts && opts.chip)) { var dl = detectLang(t, this.lang, this.script, before === 'idle'); this.lang = dl.lang; this.script = dl.script; }
    var r = this._reply(t, opts);
    if (r.miss === undefined) r.miss = before !== 'idle' && this.state === before && !r.ok && !r.submit;
    return r;
  };

  Brain.prototype._reply = function (text, opts) {
    var t = String(text || '').trim(), self = this, key, p, T = this.t.bind(this), c0 = this.cfg;
    var wa0 = T('WhatsApp at ' + c0.whatsappDisplay, 'WhatsApp par ' + c0.whatsappDisplay);
    if (!t) return { say: T('I didn’t catch that. You can say it again or type it.', 'Mujhe samajh nahi aaya. Dobara bolein ya type kar dein.'), miss: true };

    if (this.state !== 'idle' && CANCEL.test(t)) {
      var wasPay = /^pay/.test(this.state);
      this.state = 'idle'; this.fixing = false; this.fixingPay = false;
      if (wasPay) {
        this.progress = 'awaiting_slip'; this.payData = {};
        return { say: T('No problem. When you have paid, tap “I have paid” and I will continue from here.', 'Koi baat nahi. Jab payment ho jaye to “I have paid” dabayein, phir wahin se aage chalenge.'), chips: ['I have paid', 'What’s next?', 'Requirements'] };
      }
      this.data = {};
      return { say: T('No problem, I have stopped the enrollment. You can start again any time by saying “enroll”.', 'Koi masla nahi, enrollment rok di gayi hai. Kabhi bhi “enroll” keh kar dobara shuru kar sakte hain.'), chips: this.chipsFor() };
    }

    /* questions asked in the middle of enrollment: answer, then repeat the question */
    if (this.state !== 'idle' && this.state !== 'fix' && this.state !== 'payFix') {
      key = detect(t);
      var looksLikeAnswer = (this.state === 'age' && parseAge(t) !== null) ||
        (this.state === 'email' && (/@|\bat\b|ایٹ/i.test(t) && /\bdot\b|\.|ڈاٹ/i.test(t))) ||
        (this.state === 'confirm' && (YES.test(t) || NO.test(t))) ||
        (/^pay(Wa|Acct|Amt)$/.test(this.state) && /\d/.test(spokenDigits(t))) ||
        (this.state === 'payConfirm' && (YES.test(t) || NO.test(t)));
      var looksLikeQuestion = /\?\s*$|^(what|when|where|how|why|who|which|can|could|do|does|is|are|will|tell me|kab|kya|kitn|kaise|kyun|kahan|kaun)\b|^(کیا|کب|کتنی|کتنے|کیسے|کہاں)/i.test(t) || /^(about hira|next batch|requirements|age criteria|social media|how to enroll|fee|course fee|what’s next\?)$/i.test(t);
      if (key && ['batch', 'fee', 'age', 'requirements', 'about', 'course', 'contact', 'social'].indexOf(key) > -1 && !looksLikeAnswer && (looksLikeQuestion || (opts && opts.chip))) {
        p = this.prompt();
        return { say: this.facts(key) + ' ' + p.say, speak: this.facts(key) + ' ' + (p.speak || p.say), input: p.input, chips: p.chips, links: this.linksFor(key), ok: true };
      }
    }

    if (this.state === 'name') {
      var name = cleanName(t);
      if (!name) return { say: T('Sorry, I could not get the name. Please say or type the student’s full name.', 'Maaf kijiye, naam samajh nahi aaya. Meherbani kar ke student ka poora naam bolein ya type karein.'), input: 'text' };
      this.data.name = name;
      if (this.fixing) { this.fixing = false; this.state = 'confirm'; return this.prompt(); }
      this.state = 'age';
      p = this.prompt(); p.say = T('Thank you. ', 'Shukriya. ') + name + '. ' + p.say; return p;
    }

    if (this.state === 'age') {
      var age = parseAge(t);
      if (age === null || age < 3 || age > 99) return { say: T('Please tell me the age as a number, for example 15.', 'Meherbani kar ke umar number mein batayein, jaise 15.'), input: 'text' };
      var c = this.cfg;
      if ((c.minAge && age < c.minAge) || (c.maxAge && age > c.maxAge)) {
        this.state = 'idle'; this.data = {};
        return { say: T('Thank you. The age criteria for this course is ' + (c.minAge ? c.minAge : 'no minimum') + (c.maxAge ? ' to ' + c.maxAge : ' and above') + ', so I can’t enroll a student aged ' + age + ' here. Please message ' + c.ownerName + ' on WhatsApp at ' + c.whatsappDisplay + ' if you have questions.',
                         'Shukriya. Is course ki umar ki shart ' + (c.minAge ? c.minAge : 'koi minimum nahi') + (c.maxAge ? ' se ' + c.maxAge + ' saal' : ' saal aur us se zyada') + ' hai, is liye yahan ' + age + ' saal ke student ko enroll nahi kiya ja sakta. Sawal hon to ' + c.ownerName + ' ko WhatsApp par ' + c.whatsappDisplay + ' message karein.'), chips: this.chipsFor() };
      }
      this.data.age = age;
      if (this.fixing) { this.fixing = false; this.state = 'confirm'; }
      else this.state = this.askEmail() ? 'email' : 'confirm';
      return this.prompt();
    }

    if (this.state === 'email') {
      var em = parseEmail(t);
      if (!em) return { say: T('That doesn’t look like a valid email address. Please type it in the box below, for example name@gmail.com.', 'Ye email address durust nahi lagta. Meherbani kar ke neeche box mein type karein, jaise name@gmail.com.'), input: 'email' };
      this.data.email = em; this.fixing = false; this.state = 'confirm'; return this.prompt();
    }

    if (this.state === 'confirm') {
      if (YES.test(t) && !NO.test(t)) {
        this.count = (this.count || 0) + 1;
        if (!this.emailOn()) return this.finish({ studentSent: false, noEmail: true });
        this.state = 'submitting';
        return { say: T('Thank you. I am sending your confirmation email now.', 'Shukriya. Confirmation email ab bheji ja rahi hai.'), submit: this.data };
      }
      if (NO.test(t)) {
        this.state = 'fix';
        return { say: T('No problem. Which one should I change: ' + (this.askEmail() ? 'the name, the age or the email?' : 'the name or the age?'),
                         'Koi baat nahi. Kya tabdeel karna hai: ' + (this.askEmail() ? 'naam, umar ya email?' : 'naam ya umar?')), chips: this.fixOptions() };
      }
      return { say: T('Please say yes to confirm, or no to change something.', 'Confirm karne ke liye “haan” kahein, ya tabdeeli ke liye “nahi”.'), chips: ['Yes, confirm', 'No, change'] };
    }

    if (this.state === 'fix') {
      if (/name|naam|نام/i.test(t)) this.state = 'name';
      else if (/age|umar|umr|عمر/i.test(t)) this.state = 'age';
      else if (/mail|میل/i.test(t) && this.askEmail()) this.state = 'email';
      else return { say: this.askEmail() ? T('Please say name, age or email.', 'Meherbani kar ke naam, umar ya email bolein.') : T('Please say name or age.', 'Meherbani kar ke naam ya umar bolein.'), chips: this.fixOptions() };
      var back = this.prompt(); this.fixing = true; return back;
    }

    /* ---- payment details: WhatsApp number, account, amount, then confirm ---- */
    if (this.state === 'payWa') {
      var ph = parsePhone(t);
      if (!ph) return { say: T('Please give the WhatsApp number with digits, for example 0300 1234567.', 'Meherbani kar ke WhatsApp number digits mein batayein, jaise 0300 1234567.'), input: 'text' };
      this.payData.wa = ph;
      if (this.fixingPay) { this.fixingPay = false; this.state = 'payConfirm'; return this.prompt(); }
      this.state = 'payAcct'; return this.prompt();
    }
    if (this.state === 'payAcct') {
      var ac = parseAccount(t);
      if (!ac) return { say: T('Please type the bank or wallet name and the account number. At least the last 4 digits are needed, for example “HBL 1234”.', 'Meherbani kar ke bank ya wallet ka naam aur account number batayein. Kam az kam aakhri 4 digits chahiye, jaise “HBL 1234”.'), input: 'text' };
      this.payData.acct = ac;
      if (this.fixingPay) { this.fixingPay = false; this.state = 'payConfirm'; return this.prompt(); }
      this.state = 'payAmt'; return this.prompt();
    }
    if (this.state === 'payAmt') {
      var am = parseAmount(t);
      if (am === null) return { say: T('Please tell me the amount as a number with the currency, for example 5000 PKR or 19 USD.', 'Meherbani kar ke raqam number mein currency ke saath batayein, jaise 5000 PKR ya 19 USD.'), input: 'text' };
      this.payData.amt = am; this.fixingPay = false; this.state = 'payConfirm'; return this.prompt();
    }
    if (this.state === 'payConfirm') {
      if (YES.test(t) && !NO.test(t)) {
        this.state = 'idle'; this.progress = 'slip_sent';
        this.paid = { wa: this.payData.wa, acct: this.payData.acct, amt: this.payData.amt };
        var mail = this.enrolled && this.enrolled.email;
        return { say: T('Thank you! The full message for ' + this.cfg.ownerName + ' is ready: student details, course, and your payment details. Tap the button below. WhatsApp will open with the message, then please attach the payment slip picture and send it. ' + this.cfg.ownerName + ' will check it, reply to you there' + (mail ? ' and send an enrollment confirmation email to ' + mail : '') + '.',
                         'Shukriya! ' + this.cfg.ownerName + ' ke liye poora message tayyar hai: student ki tafseelat, course aur aap ki payment ki tafseelat. Neeche wala button dabayein. WhatsApp message ke saath khulega, phir payment slip ki tasveer laga kar bhej dein. ' + this.cfg.ownerName + ' check kar ke aap ko wahin jawab dengi' + (mail ? ' aur ' + mail + ' par enrollment confirmation email bhejengi' : '') + '.'),
          whatsapp: this.waPayLink(), whatsappLabel: T('Send details to Hira on WhatsApp', 'Hira ko WhatsApp par tafseelat bhejein'), chips: ['What’s next?', 'Requirements', 'Next batch'] };
      }
      if (NO.test(t)) {
        this.state = 'payFix';
        return { say: T('No problem. Which one should I change: the WhatsApp number, the account or the amount?', 'Koi baat nahi. Kya tabdeel karna hai: WhatsApp number, account ya raqam?'), chips: ['Number', 'Account', 'Amount'] };
      }
      return { say: T('Please say yes to confirm, or no to change something.', 'Confirm karne ke liye “haan” kahein, ya tabdeeli ke liye “nahi”.'), chips: ['Yes, confirm', 'No, change'] };
    }
    if (this.state === 'payFix') {
      if (/number|whatsapp|نمبر/i.test(t)) this.state = 'payWa';
      else if (/account|bank|wallet|اکاؤنٹ|بینک/i.test(t)) this.state = 'payAcct';
      else if (/amount|rupee|fee|raqam|رقم|فیس/i.test(t)) this.state = 'payAmt';
      else return { say: T('Please say number, account or amount.', 'Meherbani kar ke number, account ya raqam bolein.'), chips: ['Number', 'Account', 'Amount'] };
      var pback = this.prompt(); this.fixingPay = true; return pback;
    }

    key = detect(t);
    if (key === 'enrollNow' || (/^(yes|yeah|yep|sure|ok|okay|haan|han|ji|jee|bilkul|theek hai)\b|^(جی|ہاں|بالکل|ٹھیک)/i.test(t) && this.lastKey && /enroll|batch/.test(this.lastKey)) || /^yes, enroll now/i.test(t) || /^enroll now/i.test(t)) {
      if (this.count >= MAX_ENROLLMENTS_PER_CHAT) {
        return { say: T('To keep things safe, I can take up to ' + MAX_ENROLLMENTS_PER_CHAT + ' enrollments in one chat. Please message ' + this.cfg.ownerName + ' on WhatsApp at ' + this.cfg.whatsappDisplay + ' for more.',
                         'Hifazat ke liye ek chat mein sirf ' + MAX_ENROLLMENTS_PER_CHAT + ' enrollments li ja sakti hain. Zyada ke liye meherbani kar ke ' + this.cfg.ownerName + ' ko WhatsApp par ' + this.cfg.whatsappDisplay + ' message karein.'), chips: this.chipsFor() };
      }
      this.state = 'name'; this.data = {};
      return { say: T('Great, let’s begin. What is the student’s full name?', 'Bohat acha, shuru karte hain. Student ka poora naam kya hai?'), input: 'text' };
    }
    if (/^not now/i.test(t) || /^abhi nahi/i.test(t) || /^ابھی نہیں/.test(t)) return { say: T('No problem. Ask me anything else about the course.', 'Koi baat nahi. Course ke baare mein kuch aur poochein.'), chips: this.chipsFor() };

    /* the student has already enrolled in this chat */
    var after = this.postEnroll(t);
    if (after) return after;
    if (!this.enrolled && /\b(paid|payment\s+(done|made|sent)|(bhar|kar)\s*(di|diya|dia|chuki|chuka))\b|ادا کر|کر دی/i.test(t) && !NEG.test(t)) {
      return { say: T('Thank you! To pass your payment to ' + this.cfg.ownerName + ' I first need the student’s details. Please say “enroll” and I will take the name and age first.',
                       'Shukriya! Aap ki payment ' + this.cfg.ownerName + ' tak pohanchane ke liye pehle student ki tafseelat chahiye. Meherbani kar ke “enroll” kahein, pehle naam aur umar poochi jayegi.'), chips: ['Enroll now'] };
    }

    if (key && this.facts(key)) {
      this.lastKey = key;
      return { say: this.facts(key), chips: this.chipsFor(key), links: this.linksFor(key) };
    }
    return { say: T('I can help with questions about Hira, the next batch, how to enroll, the age criteria and the requirements. You can also say “enroll” to start the enrollment.',
                    'Hira, agla batch, enroll karne ka tareeqa, umar ki shart aur zarooriyat ke baare mein aap pooch sakte hain. Enrollment shuru karne ke liye “enroll” bhi keh sakte hain.'), chips: this.chipsFor(), miss: true };
  };

  /* WhatsApp message with all the details the student gave (name, age and, if asked, email) */
  Brain.prototype.waLink = function (info) {
    var c = this.cfg, d = info || this.data;
    var msg = 'Assalam o Alaikum. I have enrolled in the ' + c.course + '. Student name: ' + d.name + '. Age: ' + d.age + '.' +
      (d.email ? ' ' + (d.age < 18 ? 'Parent or guardian email: ' : 'Email: ') + d.email + '.' : '') +
      (payReady(c) ? ' I will send the fee payment slip after paying.' : ' Please share the course fee and the payment account details.');
    return WA_LINK + '?text=' + encodeURIComponent(msg);
  };

  /* The full message for Hira: student, course and payment details (WhatsApp number, account, amount) */
  Brain.prototype.waPayLink = function () {
    var c = this.cfg, e = this.enrolled || this.data, p = this.paid || this.payData;
    var lines = [
      'Assalam o Alaikum ' + c.ownerName + '. New enrollment and fee payment.',
      '',
      'Course: ' + c.course,
      'Student name: ' + e.name,
      'Age: ' + e.age
    ];
    if (e.email) lines.push((e.age < 18 ? 'Parent or guardian email: ' : 'Email: ') + e.email);
    lines.push('',
      'Amount paid: ' + formatMoney(p.amt),
      'Slip sent from WhatsApp number: ' + p.wa,
      'Paid from account: ' + p.acct);
    if (e.email) {      // one tap for Hira: opens Gmail with the enrollment confirmation already written
      var ce = confirmEmailTexts(c, e);
      lines.push('', 'For ' + c.ownerName + ': after checking the payment, tap this link and press Send in Gmail to confirm the enrollment by email:', gmailLink(e.email, ce.subject, ce.body));
    }
    lines.push('', 'I am attaching the fee payment slip below.');
    return WA_LINK + '?text=' + encodeURIComponent(lines.join('\n'));
  };

  Brain.prototype.finish = function (res) {
    var c = this.cfg, d = this.data, parts = [], t = this.t.bind(this), L = this.lang;
    this.state = 'idle';
    this.enrolled = { name: d.name, age: d.age, email: d.email, lang: L };
    this.progress = 'awaiting_slip'; this.paid = null; this.payData = {};
    if (res.studentSent) {
      parts.push(t('Done! I have sent a confirmation email to ' + d.email + '. Please check your inbox and spam folder.', 'Ho gaya! Confirmation email ' + d.email + ' par bhej di gayi hai. Inbox aur spam folder check kar lein.'));
    } else if (res.noEmail) {
      parts.push(t('Thank you! I have noted the details. Student name: ' + d.name + ', age: ' + d.age + (d.email ? ', email: ' + d.email : '') + '.',
                   'Shukriya! Tafseelat note kar li gayi hain. Student ka naam: ' + d.name + ', umar: ' + d.age + (d.email ? ', email: ' + d.email : '') + '.'));
    } else {
      parts.push(t('I have noted the details, but I could not send the confirmation email from here. Do not worry, I will put all the details into the WhatsApp message for ' + c.ownerName + ' later, so you do not need to type them again.',
                   'Tafseelat note ho gayi hain, lekin yahan se confirmation email nahi ja saki. Fikar na karein, baad mein ' + c.ownerName + ' ke WhatsApp message mein sab kuch shamil ho jayega, aap ko dobara type nahi karna parega.'));
    }
    if (payReady(c)) {
      parts.push(t('To pay the course fee' + (c.fee ? ' (' + feeText(c, L) + ')' : '') + ', please use these account details: ' + keep(c.paymentDetails) +
        ' After paying, tap “I have paid”. I will ask for the WhatsApp number you send the slip from, the account you paid from and the amount, and then prepare the full message for ' + c.ownerName + '.',
        'Course ki fees' + (c.fee ? ' (' + feeText(c, L) + ')' : '') + ' jama karwane ke liye ye account details istemal karein: ' + keep(c.paymentDetails) +
        ' Payment ke baad “I have paid” dabayein. Phir aap ka WhatsApp number (jis se slip bhejni hai), jis account se payment ki wo account aur raqam poocha jayega, aur ' + c.ownerName + ' ke liye poora message tayyar hoga.'));
    } else {
      parts.push(t((c.fee ? 'The course fee is ' + feeText(c, L) + '. ' : '') + 'The payment account details are shared by ' + c.ownerName + ' on WhatsApp. Tap the button below to ask for them. After paying, tap “I have paid” and I will prepare the full message for her.',
                   (c.fee ? 'Course ki fees ' + feeText(c, L) + ' hai. ' : '') + 'Payment account ki details ' + c.ownerName + ' WhatsApp par batati hain. Unhein mangne ke liye neeche button dabayein. Payment ke baad “I have paid” dabayein, un ke liye poora message tayyar ho jayega.'));
    }
    parts.push(t('Thank you for choosing the course!', 'Course chunne ka shukriya!'));
    var out = { say: parts.join(' '), chips: ['I have paid', 'What’s next?', 'Requirements'] };
    if (!payReady(c)) { out.whatsapp = this.waLink(this.enrolled); out.whatsappLabel = t('Ask Hira for payment details on WhatsApp', 'Hira se payment details WhatsApp par maangein'); }
    return out;
  };

  /* ---------- emails ---------- */
  /* The enrollment confirmation that Hira sends once she has checked the payment */
  function confirmEmailTexts(cfg, e) {
    var minor = e.age < 18;
    if (e.lang === 'ur') {
      var urBody = 'Assalam o Alaikum,\n\n' +
        (minor ? 'Hamein ye batate hue khushi hai ke ' + e.name + ' ab' : 'Mubarak ho ' + e.name + '! Aap ab') +
        ' ' + cfg.course + ' mein enroll ho gaye hain. Course ki fees mil gayi hain.' +
        (cfg.nextBatch ? '\n\nAgla batch: ' + cfg.nextBatch + (cfg.classTiming ? ' (' + cfg.classTiming + ')' : '') : '') +
        '\n\nCourse ki aage ki tafseelat, jaise class ka schedule aur Zoom link, aap ko SMS, WhatsApp ya email ke zariye bata di jayengi. Meherbani kar ke Zoom app install kar ke tayyar rakhein.' +
        '\n\nKoi sawal ho to ' + cfg.ownerName + ' ko WhatsApp par ' + cfg.whatsappDisplay + ' message karein.' +
        '\n\nShukriya,\n' + cfg.ownerName + '\nDigital World Designs';
      return { subject: 'Enrollment confirm ho gayi: ' + cfg.course, body: urBody };
    }
    var body = 'Assalam o Alaikum,\n\n' +
      (minor ? 'We are happy to confirm that ' + e.name + ' is now enrolled' : 'Congratulations ' + e.name + '! You are now enrolled') +
      ' in the ' + cfg.course + '. We have received the course fee.' +
      (cfg.nextBatch ? '\n\nNext batch: ' + cfg.nextBatch + (cfg.classTiming ? ' (' + cfg.classTiming + ')' : '') : '') +
      '\n\nFurther details about the course, such as the class schedule and the Zoom link, will be shared with you by SMS, WhatsApp or email. Please keep the Zoom app installed and ready.' +
      '\n\nIf you have any questions, message ' + cfg.ownerName + ' on WhatsApp at ' + cfg.whatsappDisplay + '.' +
      '\n\nRegards,\n' + cfg.ownerName + '\nDigital World Designs';
    return { subject: 'Enrollment confirmed: ' + cfg.course, body: body };
  }
  /* A Gmail "compose" link: opens a ready-to-send email, nothing is sent until Hira presses Send */
  function gmailLink(to, subject, body) {
    return 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(to) + '&su=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }

  function emailTexts(cfg, d) {
    var minor = d.age < 18;
    var lines = ['Student name: ' + d.name, 'Student age: ' + d.age, (minor ? 'Parent or guardian email: ' : 'Email: ') + d.email];
    if (cfg.nextBatch) lines.push('Next batch: ' + cfg.nextBatch);
    if (cfg.fee) lines.push('Course fee: ' + feeText(cfg));
    var student = 'Assalam o Alaikum,\n\nThank you for enrolling in the ' + cfg.course + '. These are the details we received:\n\n' + lines.join('\n') +
      '\n\nNext step: please pay the course fee and send the fee payment slip to ' + cfg.ownerName + ' on WhatsApp at ' + cfg.whatsappDisplay +
      '. Please mention the student name (' + d.name + ') in your message.' + (payReady(cfg) ? '\n\nPayment details: ' + cfg.paymentDetails : '') +
      '\n\nWhat you need for the classes: ' + cfg.requirements.join('; ') + '.\n\nRegards,\n' + cfg.ownerName + '\nDigital World Designs';
    var owner = 'New enrollment request for the ' + cfg.course + '.\n\n' + lines.join('\n') +
      (minor ? '\n\nThe student is under 18. The email above was given as a parent or guardian email.' : '') +
      '\n\nThe student has been asked to send the fee payment slip on WhatsApp with the student name mentioned.';
    return { student: student, owner: owner };
  }

  function sendMail(cfg, templateId, to, subject, message) {
    var k = cfg.emailjs;
    return fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service_id: k.serviceId, template_id: templateId, user_id: k.publicKey,
        template_params: { to_email: to, subject: subject, message: message, reply_to: cfg.ownerEmail } })
    }).then(function (r) { if (!r.ok) throw new Error('mail ' + r.status); return true; });
  }

  function submitEnrollment(cfg, d) {
    var k = cfg.emailjs, out = { studentSent: false, ownerSent: false };
    if (!(k.publicKey && k.serviceId && k.studentTemplateId)) return Promise.resolve(out);
    try {   // simple spam guard: at most 3 submissions per hour from one browser
      var now = Date.now(), log = JSON.parse(localStorage.getItem('va_enroll') || '[]').filter(function (x) { return now - x < 3600000; });
      if (log.length >= 3) return Promise.resolve(out);
      log.push(now); localStorage.setItem('va_enroll', JSON.stringify(log));
    } catch (e) { /* storage blocked: continue */ }
    var t = emailTexts(cfg, d);
    return sendMail(cfg, k.studentTemplateId, d.email, 'Enrollment details received: ' + cfg.course, t.student)
      .then(function () { out.studentSent = true; })
      .catch(function () { })
      .then(function () {
        if (!k.ownerTemplateId) return;
        return sendMail(cfg, k.ownerTemplateId, cfg.ownerEmail, 'New enrollment: ' + d.name, t.owner).then(function () { out.ownerSent = true; }).catch(function () { });
      })
      .then(function () { return out; });
  }

  /* expose for tests */
  root.CourseAgentCore = { Brain: Brain, CFG: CFG, parseAge: parseAge, parseEmail: parseEmail, cleanName: cleanName, spellEmail: spellEmail, romanToUrdu: romanToUrdu, stripKeep: stripKeep, emailTexts: emailTexts, confirmEmailTexts: confirmEmailTexts, gmailLink: gmailLink,
    spokenDigits: spokenDigits, parsePhone: parsePhone, parseAccount: parseAccount, parseAmount: parseAmount, formatRs: formatRs, formatMoney: formatMoney, feeText: feeText, payReady: payReady };
  if (typeof document === 'undefined') { if (typeof module !== 'undefined') module.exports = root.CourseAgentCore; return; }

  /* ===================== user interface ===================== */
  var d = document, brain = new Brain(CFG);
  var SR = root.SpeechRecognition || root.webkitSpeechRecognition;
  var canSpeak = 'speechSynthesis' in root, canListen = !!SR;
  var urUnsupported = false, enFallback = false, speakOn = canSpeak, voiceMode = false, listening = false, speaking = false, busy = false, misses = 0, rec = null, opened = false;

  /* The microphone must be told which language to listen for. There is no button for it: the assistant follows the
     language the student used last, and switches to the other language when it could not understand the student. */
  var recPref = /^ur/i.test((root.navigator && (navigator.languages && navigator.languages[0] || navigator.language)) || '') ? 'ur' : 'en';
  var missStreak = 0, lowStreak = 0, LOW_CONF = 0.6;
  var HINT = ' You can speak in English or Urdu. Aap English ya Urdu, jis mein chahein, bol sakte hain.';
  var SORRY = 'Sorry, I did not catch that. Maaf kijiye, samajh nahi aaya. Aap English ya Urdu mein dobara bol sakte hain.';
  function recLangNow() { return recPref === 'ur' && !urUnsupported ? 'ur-PK' : (enFallback ? 'en-US' : 'en-IN'); }
  function flipRec() { recPref = recPref === 'ur' ? 'en' : 'ur'; }

  /* ui(): the text for the language in use (English or Roman Urdu). disp(): the same text as it is shown (Urdu script when the student writes Urdu script). */
  function ui(en, ur) { return brain.lang === 'ur' ? ur : en; }
  function disp(x) { return brain.script ? romanToUrdu(x) : stripKeep(x); }
  var CHIP_UR = { 'Yes, enroll now': 'Haan, enroll karein', 'Not now': 'Abhi nahi', 'Next batch': 'Agla batch', 'How to enroll': 'Enroll kaise karein',
    'Age criteria': 'Umar ki shart', 'Requirements': 'Zarooriyat', 'About Hira': 'Hira ke baare mein', 'Social media': 'Social media',
    'Enroll now': 'Abhi enroll karein', 'Yes, confirm': 'Haan, confirm', 'No, change': 'Nahi, tabdeeli', 'I have paid': 'Maine payment kar di',
    'What’s next?': 'Ab aage kya?', 'Name': 'Naam', 'Age': 'Umar', 'Email': 'Email', 'Number': 'Number', 'Account': 'Account', 'Amount': 'Raqam' };

  function el(tag, cls, html) { var n = d.createElement(tag); if (cls) n.className = cls; if (html) n.innerHTML = html; return n; }
  var MIC = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>';

  var fab = el('button', 'va-fab', MIC + '<span>Ask about the course</span>');
  fab.type = 'button'; fab.setAttribute('aria-haspopup', 'dialog');
  var panel = el('div', 'va-panel'); panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Course assistant');
  panel.innerHTML =
    '<header class="va-head"><div><strong>Course assistant</strong><small>' + CFG.course + '</small></div>' +
    '<div class="va-tools"><button type="button" class="va-speak" aria-pressed="true">Voice replies: on</button>' +
    '<button type="button" class="va-close" aria-label="Close assistant">&times;</button></div></header>' +
    '<div class="va-log" role="log" aria-live="polite"></div>' +
    '<div class="va-chips"></div>' +
    '<p class="va-status" aria-live="polite"></p>' +
    '<form class="va-form" autocomplete="off"><button type="button" class="va-mic" aria-pressed="false" aria-label="Talk to the assistant">' + MIC + '</button>' +
    '<input class="va-input" type="text" aria-label="Type your message" placeholder="Type or tap the mic to talk">' +
    '<button type="submit" class="va-send">Send</button></form>' +
    '<p class="va-note">The details you give here are used only to prepare your enrollment message for Hira on WhatsApp and for her to send you the enrollment confirmation email. For students under 18, please use a parent’s email.</p>';
  d.body.appendChild(fab); d.body.appendChild(panel);

  var log = panel.querySelector('.va-log'), chips = panel.querySelector('.va-chips'), status = panel.querySelector('.va-status'),
      input = panel.querySelector('.va-input'), micBtn = panel.querySelector('.va-mic'), speakBtn = panel.querySelector('.va-speak'),
      noteEl = panel.querySelector('.va-note');
  var NOTE_EN = noteEl.textContent;
  var NOTE_UR = 'Yahan di gayi tafseelat sirf Hira ke liye WhatsApp enrollment message tayyar karne aur un ke zariye aap ko confirmation email bhejne ke liye istemal hoti hain. 18 saal se kam umar ke students ke liye walid ya sarparast ki email dein.';
  function setDir(node, rtl) { node.setAttribute('dir', rtl ? 'rtl' : 'ltr'); }
  /* the small texts around the chat follow the language in use */
  function applyLang() {
    speakBtn.textContent = disp(ui('Voice replies: ', 'Awaaz mein jawab: ')) + (speakOn ? (brain.script ? 'آن' : 'on') : (brain.script ? 'آف' : 'off'));
    noteEl.textContent = disp(brain.lang === 'ur' ? NOTE_UR : NOTE_EN); setDir(noteEl, brain.script);
    micBtn.setAttribute('aria-label', disp(ui('Talk to the assistant', 'Assistant se baat karein')));
    if (input.type !== 'email') input.placeholder = disp(ui('Type or tap the mic to talk', 'Type karein ya mic dabayein'));
    panel.setAttribute('lang', brain.script ? 'ur' : (brain.lang === 'ur' ? 'ur-Latn' : 'en'));
  }
  if (!canSpeak) { speakBtn.hidden = true; }

  function setStatus(t) { var x = t ? disp(t) : ''; status.textContent = x; setDir(status, brain.script && !!x); }
  function bubble(who, text) {
    var b = el('div', 'va-msg va-' + who), x = who === 'bot' ? disp(text) : text;
    b.textContent = x; setDir(b, who === 'bot' ? brain.script : URDU_SCRIPT.test(x));
    log.appendChild(b); log.scrollTop = log.scrollHeight; return b;
  }
  function setChips(list) {
    chips.innerHTML = '';
    (list || []).forEach(function (c) { var b = el('button', 'va-chip'); b.type = 'button'; b.textContent = disp(brain.lang === 'ur' && CHIP_UR[c] ? CHIP_UR[c] : c); b.addEventListener('click', function () { handleUser(c, true); }); chips.appendChild(b); });
  }
  function setInput(kind) {
    input.type = kind === 'email' ? 'email' : 'text';
    input.placeholder = kind === 'email' ? 'name@example.com' : disp(ui('Type or tap the mic to talk', 'Type karein ya mic dabayein'));
    input.setAttribute('inputmode', kind === 'email' ? 'email' : 'text');
  }

  /* Rank the browser's voices: natural / neural and Google voices sound human, eSpeak-style ones are robotic */
  function voiceScore(v) {
    var n = v.name || '', l = v.lang || '', s;
    if (/^en[-_]IN/i.test(l)) s = 30; else if (/^en[-_](GB|US|AU)/i.test(l)) s = 15; else if (/^en/i.test(l)) s = 8; else return -1;
    if (/natural|neural/i.test(n)) s += 50;
    if (/online/i.test(n)) s += 20;
    if (/google/i.test(n)) s += 25;
    if (/espeak|compact|festival|robot/i.test(n)) s -= 40;
    return s;
  }
  function pickVoice() {
    var vs = root.speechSynthesis.getVoices() || [], best = null, bs = -1;
    for (var i = 0; i < vs.length; i++) { var sc = voiceScore(vs[i]); if (sc > bs) { bs = sc; best = vs[i]; } }
    return best;
  }
  /* A real Urdu voice, if this device has one (used when the reply is shown in Urdu script) */
  function urduVoice() {
    var vs = root.speechSynthesis.getVoices() || [];
    for (var i = 0; i < vs.length; i++) if (/^ur/i.test(vs[i].lang || '')) return vs[i];
    return null;
  }
  function speak(text, done) {
    if (!speakOn || !canSpeak || !text) { if (done) done(); return; }
    root.speechSynthesis.cancel();
    /* Urdu script + an Urdu voice on this device: speak real Urdu. Otherwise speak the Roman Urdu / English text with the best English voice. */
    var uv = brain.script ? urduVoice() : null, said = uv ? romanToUrdu(text) : stripKeep(text);
    var u = new SpeechSynthesisUtterance(said), v = uv || pickVoice();
    u.lang = v ? v.lang : 'en-IN'; if (v) u.voice = v; u.rate = 0.95;
    var finished = false, end = function () { if (finished) return; finished = true; speaking = false; if (done) done(); };
    u.onend = end; u.onerror = end; speaking = true; root.speechSynthesis.speak(u);
    setTimeout(function () { if (!root.speechSynthesis.speaking) end(); }, 600 + said.length * 90);   // safety net
  }

  function micProblem(code) {
    if (brain.lang === 'ur') {
      switch (code) {
        case 'not-allowed': case 'service-not-allowed': return 'Microphone band hai. Address bar ke qareeb lock icon dabayein, microphone allow karein, phir mic dobara dabayein. Aap type bhi kar sakte hain.';
        case 'audio-capture': return 'Koi microphone nahi mila. Microphone lagayein, ya type karein.';
        case 'network': return 'Awaaz pehchanne ke liye internet chahiye. Internet check karein, ya type karein.';
        case 'no-speech': return 'Awaaz nahi suni gayi. Chrome ki Site settings mein Microphone aur Windows Sound > Input check karein, microphone unmute karein, aur “Sun rahe hain” aane ke baad boliye. Aap type bhi kar sakte hain.';
      }
      return null;
    }
    switch (code) {
      case 'not-allowed': case 'service-not-allowed':
        return 'The microphone is blocked. Click the lock icon next to the address bar, allow the microphone, then tap the mic again. (It is also blocked inside previews. Open the website directly.) You can always type instead.';
      case 'audio-capture': return 'No microphone was found. Please connect one, or type your message.';
      case 'network': return 'Voice recognition needs an internet connection. Please check it, or type your message.';
      case 'no-speech':
        return 'No speech was detected. Check Chrome’s Site settings > Microphone and Windows Settings > System > Sound > Input. Select and unmute your microphone, make sure its input level moves, then speak after “Listening…” appears. You can type your message instead.';
      default: return null;
    }
  }
  function listen() {
    if (!canListen || listening || speaking || !voiceMode || panel.hidden) return;
    listening = true;                       // set at once, so a second start cannot overlap this one
    var r = new SR(), got = false, failed = false, retry = false;
    /* In the number steps (WhatsApp number, account, amount) people pause between digits.
       So keep listening and only send the answer after a real pause (or once 11 digits are heard). */
    var digitMode = /^pay(Wa|Acct|Amt)$/.test(brain.state), heard = '', timer = null;
    function sendHeard() {
      clearTimeout(timer);
      if (got || !heard) return;
      got = true; misses = 0; var said = heard; heard = ''; input.value = '';
      try { r.abort(); } catch (err) { }
      handleUser(said, false, true);
    }
    rec = r; r.lang = recLangNow(); r.interimResults = true; r.maxAlternatives = 1; r.continuous = digitMode;
    r.onstart = function () { setStatus(digitMode ? ui('Listening… say the digits slowly, I will wait until you stop', 'Sun rahe hain… digits aaram se boliye, aap ke rukne tak intezar hoga') : ui('Listening… speak now', 'Sun rahe hain… ab boliye')); micBtn.setAttribute('aria-pressed', 'true'); micBtn.classList.add('on'); };
    r.onresult = function (e) {
      var txt = '', fin = false;
      if (digitMode) {
        for (var k = 0; k < e.results.length; k++) txt += e.results[k][0].transcript + ' ';
        heard = txt.trim(); input.value = heard; clearTimeout(timer);
        var n = spokenDigits(heard).replace(/\D/g, '').length;
        timer = setTimeout(sendHeard, brain.state === 'payWa' && n >= 11 ? 1300 : 2600);
        return;
      }
      for (var i = e.resultIndex; i < e.results.length; i++) { txt += e.results[i][0].transcript; if (e.results[i].isFinal) fin = true; }
      if (!fin) { input.value = txt; return; }          // show what is being heard
      got = true; misses = 0; input.value = '';
      var said = txt.trim(), conf = e.results[e.results.length - 1][0].confidence;
      /* A question that was heard with low confidence and matches nothing is probably in the other language:
         say sorry in both languages and listen for the other language next time. */
      if (brain.state === 'idle' && conf > 0 && conf < LOW_CONF && !detect(said) && !URDU_SCRIPT.test(said)) {
        if (++lowStreak >= 3) { lowStreak = 0; stopVoice(); setStatus(ui('I could not understand the voice. Please type your message.', 'Awaaz samajh nahi aa rahi. Meherbani kar ke type karein.')); return; }
        flipRec(); respond({ say: SORRY }); return;
      }
      lowStreak = 0; handleUser(said, false, true);
    };
    r.onerror = function (e) {
      if (e.error === 'language-not-supported') {
        if (r.lang === 'ur-PK') { urUnsupported = true; recPref = 'en'; bubble('bot', 'Is browser mein Urdu awaaz pehchanne ki sahulat nahi hai. Aap Roman Urdu mein type kar sakte hain, ya Chrome istemal karein.'); retry = true; return; }
        if (!enFallback) { enFallback = true; retry = true; return; }
      }
      var m = micProblem(e.error);
      if (m) { failed = true; stopVoice(); setStatus(m); }
    };
    r.onend = function () {
      listening = false; micBtn.classList.remove('on'); clearTimeout(timer);
      if (retry) { setTimeout(listen, 200); return; }
      if (!voiceMode) { if (!failed) setStatus(''); return; }
      if (digitMode && !got && heard) { sendHeard(); return; }
      if (!got && !busy) {
        misses++;
        if (misses >= 2) { stopVoice(); setStatus(ui('I could not hear speech. Check Chrome microphone permission and Windows Sound > Input; select an unmuted mic and make sure its input level moves. Then try again, or type your message.', 'Awaaz nahi suni gayi. Chrome mein microphone ki ijazat aur Windows Sound > Input check karein, unmuted mic chunein, phir dobara koshish karein ya type karein.')); return; }
        setTimeout(listen, 300);
      }
    };
    try { r.start(); } catch (err) { listening = false; stopVoice(); setStatus(ui('Could not start the microphone. Please type your message.', 'Microphone shuru nahi ho saka. Meherbani kar ke type karein.')); }
  }
  function stopVoice() { voiceMode = false; misses = 0; listening = false; micBtn.setAttribute('aria-pressed', 'false'); micBtn.classList.remove('on'); try { if (rec) rec.abort(); } catch (e) { } }
  /* Is the bot talking right now (or about to)? */
  function botTalking() { return speaking || (canSpeak && (root.speechSynthesis.speaking || root.speechSynthesis.pending)); }
  /* Make the bot go quiet at once (used when the student taps the mic to talk over it) */
  function hush() { if (canSpeak) { try { root.speechSynthesis.cancel(); } catch (e) { } } speaking = false; busy = false; }

  function show(r) {
    bubble('bot', r.say);
    setChips(r.chips); setInput(r.input || 'text');   // the box is an email box only while an email is being asked for
    if (r.links && r.links.length) {
      var box = el('div', 'va-links');
      r.links.forEach(function (l) {
        var a = el('a'); a.href = l.url; a.textContent = l.name; a.dataset.n = l.name.toLowerCase().split(' ')[0];
        if (/^https?:/.test(l.url)) { a.target = '_blank'; a.rel = 'noopener'; }
        box.appendChild(a);
      });
      log.appendChild(box); log.scrollTop = log.scrollHeight;
    }
    if (r.whatsapp) {
      var a = el('a', 'va-wa'); a.href = r.whatsapp; a.target = '_blank'; a.rel = 'noopener'; a.textContent = disp(r.whatsappLabel || 'Send details on WhatsApp'); log.appendChild(a); log.scrollTop = log.scrollHeight;
    }
    if (r.input === 'email') input.focus();
  }

  function respond(r) {
    show(r);
    busy = true;
    speak(r.speak || spokenText(r.say), function () { busy = false; if (voiceMode) setTimeout(listen, 250); });
    if (r.submit) {
      setStatus(ui('Sending your confirmation email…', 'Confirmation email bheji ja rahi hai…'));
      submitEnrollment(CFG, r.submit)
        .catch(function () { return { studentSent: false, ownerSent: false }; })
        .then(function (res) { setStatus(''); respond(brain.finish(res)); });
    }
  }

  function handleUser(text, fromChip, fromVoice) {
    if (busy && speaking) { root.speechSynthesis.cancel(); speaking = false; }
    if (brain.state === 'submitting') { bubble('bot', ui('One moment, I am still saving your details.', 'Zara ruken, tafseelat save ho rahi hain.')); return; }
    bubble('user', text); input.value = '';
    var wasLang = brain.lang, wasScript = brain.script, r = brain.reply(text, { chip: !!fromChip });
    if (brain.lang !== wasLang || brain.script !== wasScript) applyLang();      // the student changed language: follow it
    if (!fromChip) {
      if (!r.miss) { missStreak = 0; recPref = brain.lang; }                     // understood: keep listening in this language
      else if (++missStreak >= 2 && (fromVoice || voiceMode)) { missStreak = 0; flipRec(); r.say += HINT; }   // twice not understood: try the other language
    }
    respond(r);
  }

  function open() {
    panel.hidden = false; fab.hidden = true; d.body.classList.add('va-open');
    if (!opened) { opened = true; var g = brain.facts('greet'); respond({ say: g, chips: brain.chipsFor() }); } else input.focus();
  }
  function close() {
    panel.hidden = true; fab.hidden = false; d.body.classList.remove('va-open');
    stopVoice(); if (canSpeak) root.speechSynthesis.cancel(); speaking = false; busy = false; setStatus(''); fab.focus();
  }

  fab.addEventListener('click', open);
  panel.querySelector('.va-close').addEventListener('click', close);
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) close(); });
  panel.querySelector('.va-form').addEventListener('submit', function (e) { e.preventDefault(); var v = input.value.trim(); if (v) handleUser(v); });
  micBtn.addEventListener('click', function () {
    /* If the bot is speaking, the mic tap means "let me talk": go quiet at once and start listening (do not just toggle the mic off) */
    if (botTalking()) { hush(); stopVoice(); }
    else if (voiceMode) { stopVoice(); setStatus(''); return; }
    if (!canListen) { bubble('bot', ui('Voice is not supported in this browser. Please use Chrome, Edge or Safari, or type your message below.', 'Is browser mein awaaz ki sahulat nahi hai. Meherbani kar ke Chrome, Edge ya Safari istemal karein, ya neeche type karein.')); return; }
    if (root.isSecureContext === false) { bubble('bot', ui('The microphone only works on a secure (https) website. Please open the site with https, or type your message.', 'Microphone sirf mehfooz (https) website par chalta hai. Meherbani kar ke https se kholein, ya type karein.')); return; }
    voiceMode = true; misses = 0; hush(); listen();
  });
  speakBtn.addEventListener('click', function () {
    speakOn = !speakOn; speakBtn.setAttribute('aria-pressed', String(speakOn)); applyLang();
    if (!speakOn && canSpeak) root.speechSynthesis.cancel();
  });
  if (canSpeak) { root.speechSynthesis.onvoiceschanged = function () { }; root.speechSynthesis.getVoices(); }
})(typeof window !== 'undefined' ? window : globalThis);