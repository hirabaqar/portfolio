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
    nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

  function parseAge(s) {
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
      .replace(/[^A-Za-z .'’-]/g, ' ').replace(/\s+/g, ' ').trim();
    if (t.length < 2 || t.length > 60) return null;
    return t.split(' ').map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }).join(' ');
  }

  function parseEmail(s) {
    var t = String(s).trim().toLowerCase();
    t = t.replace(/\s+at the rate( of)?\s+|\s+at\s+/, '@').replace(/\s+dot\s+/g, '.')
      .replace(/\s+underscore\s+/g, '_').replace(/\s+(dash|hyphen)\s+/g, '-').replace(/\s+/g, '').replace(/[.,;]+$/, '');
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t) ? t : null;
  }

  function spellEmail(e) {
    var at = e.split('@');
    return at[0].split('').join(' ').replace(/\./g, 'dot').replace(/_/g, 'underscore').replace(/-/g, 'dash') +
      ' at ' + at[1].replace(/\./g, ' dot ');
  }

  /* ---- payment details the student gives after paying ---- */
  /* WhatsApp number: 0300 1234567, +92 300 1234567, 923001234567 ... -> "+92 300 1234567" */
  function parsePhone(s) {
    var n = String(s).replace(/\D/g, '');
    if (n.indexOf('0092') === 0) n = n.slice(2);
    if (n.length === 11 && n.charAt(0) === '0') n = '92' + n.slice(1);
    else if (n.length === 10 && n.charAt(0) === '3') n = '92' + n;
    if (n.length < 10 || n.length > 15) return null;
    return /^92\d{10}$/.test(n) ? '+92 ' + n.slice(2, 5) + ' ' + n.slice(5) : '+' + n;
  }

  /* Bank / wallet name plus account number (the last 4 digits are enough) */
  function parseAccount(s) {
    var t = String(s).replace(/[^A-Za-z0-9 .,\-\/()#'’]/g, ' ').replace(/\s+/g, ' ').trim();
    var digits = (t.match(/\d/g) || []).length;
    if (t.length < 4 || t.length > 60 || digits < 4) return null;
    return t;
  }

  /* Amount in rupees: "5000", "Rs 5,000", "5000 rupees" -> 5000 */
  function parseAmount(s) {
    var m = String(s).replace(/,/g, '').match(/\d+(\.\d{1,2})?/);
    if (!m) return null;
    var v = parseFloat(m[0]);
    if (!(v > 0 && v <= 10000000)) return null;
    return { v: v, cur: /usd|dollar|\$/i.test(s) ? 'USD' : 'PKR' };   // no currency given: PKR
  }
  function commas(v) { return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function formatMoney(a) { return a.cur === 'USD' ? 'USD ' + commas(a.v) : 'Rs ' + commas(a.v); }
  function formatRs(v) { return 'Rs ' + commas(v); }

  /* Fee text for students in Pakistan and for international students */
  function feeText(c) {
    if (!c.fee) return '';
    return c.fee + (c.feeInternational ? ' for students in Pakistan, or ' + c.feeInternational + ' for international students' : '');
  }
  /* Payment details are "ready" only when they are filled in and no [PLACEHOLDER] is left */
  function payReady(c) { var p = c.paymentDetails; return !!p && !/\[[^\]]+\]/.test(p); }
  /* So the voice reads account numbers digit by digit instead of as one huge number */
  function spokenText(s) { return String(s).replace(/\d{6,}/g, function (m) { return m.split('').join(' '); }); }
  function spellDigits(s) { return String(s).replace(/\d+/g, function (m) { return m.split('').join(' '); }); }

  var YES = /\b(yes|yeah|yep|yup|correct|right|sure|ok|okay|confirm|go ahead|please do|haan|han|ji|jee)\b/i;
  var NO = /\b(no|nope|nah|wrong|incorrect|change|not correct|nahi|nahin)\b/i;
  var CANCEL = /\b(cancel|stop|never ?mind|not now|forget it|exit)\b/i;

  /* After a student has enrolled: "what's next?", "I already sent the slip", "did you receive it?" */
  var NEXT = /\b(what(’|')?s|whats|what is)\s+next\b(?!\s+batch)|\bnext steps?\b|\bthen what\b|\bab kya\b|\bkya karna\b|\bwhat (do|should) i do\b/i;
  var SENT = /\b(already|sent|paid|(bhej|bhar|kar)\s*(di|diya|dia|chuki|chuka)|payment\s+(done|made|sent))\b/i;
  var STATUS = /\b(received|did you (get|receive)|verif(y|ied)|confirm(ed)?|status|approved|my seat)\b/i;
  var NEG = /\b(not|nahi|nahin|yet)\b|n(’|')t\b/i;

  var INTENTS = [
    ['thanks', /\b(thanks|thank you|shukria|jazak)/i],
    ['bye', /\b(bye|goodbye|see you|allah hafiz|khuda hafiz)\b/i],
    ['enrollNow', /(i|we)\s*(want|would like|wish|need)\s*to\s*(enrol|enroll|join|register|apply)|\b(enrol|enroll|register|sign me up|admission)\s*(me|now|my|him|her|my (son|daughter|child))|\blet(’|')?s (enrol|enroll)/i],
    ['social', /\b(social|socials|instagram|insta|facebook|fb|youtube|linkedin|fiverr|follow|profiles?|links?|channel|tiktok|twitter)\b/i],
    ['batch', /\b(batch|start|starts|starting|begin|begins|commence|kab|shuru|schedule|timing|timings|time table|class time)\b/i],
    ['fee', /\b(fee|fees|price|cost|charges|how much|payment|pay|paisa|paise|kitne)\b/i],
    ['age', /\b(age|old|umar|umr|eligib|criteria|criterion|minimum|maximum|kids|children|child)\b/i],
    ['requirements', /\b(requirement|requirements|need|needs|device|laptop|computer|pc|mobile|phone|tablet|zoom|literacy|skills|internet|prerequisite|prepare)\b/i],
    ['enroll', /\b(enrol|enroll|enrolment|enrollment|admission|dakhla|register|registration|join|apply|sign ?up)\b/i],
    ['course', /\b(course|curriculum|syllabus|topics|teach|learn|duration|how long|months?|content|canva)\b/i],
    ['about', /\b(hira|baqar|teacher|instructor|tutor|trainer|who are you|who is|about|experience|fiverr|mentor)\b/i],
    ['contact', /\b(contact|whatsapp|number|email|call|reach|phone number)\b/i],
    ['greet', /^(hi|hello|hey|salam|assalam|assalamualaikum|assalam o alaikum|good (morning|afternoon|evening))\b/i]
  ];

  function detect(text) {
    for (var i = 0; i < INTENTS.length; i++) if (INTENTS[i][1].test(text)) return INTENTS[i][0];
    return null;
  }

  /* ---------- the conversation brain ---------- */
  function Brain(cfg) { this.cfg = cfg; this.state = 'idle'; this.data = {}; this.enrolled = null; this.count = 0;
    /* progress after the details are collected:
       'none' -> 'awaiting_slip' -> 'collecting_payment' -> 'slip_sent' */
    this.progress = 'none';
    this.payData = {}; this.paid = null; this.fixingPay = false; }

  Brain.prototype.ask = function (what) { return what; };
  Brain.prototype.payOn = function () { return payReady(this.cfg); };

  /* Emails are only asked for when EmailJS is really set up. */
  Brain.prototype.emailOn = function () {
    var k = this.cfg.emailjs || {};
    return !!(k.publicKey && k.serviceId && k.studentTemplateId);
  };

  Brain.prototype.facts = function (key) {
    var c = this.cfg, wa = 'WhatsApp at ' + c.whatsappDisplay;
    switch (key) {
      case 'greet':
        return 'Assalam o Alaikum! I’m the assistant for ' + c.ownerName + '’s Canva course. I can tell you about Hira, the next batch, how to enroll, the age criteria and what you need to join, or where to find Hira online. What would you like to know?';
      case 'about':
        return c.ownerName + ' is a graphic designer and Canva educator. She has 2 years of design experience and 1 year of running supportive online classes. She teaches Canva live on Zoom and has a 5.0 rating as a Canva teacher on Fiverr. She also runs Digital World Designs, which makes flyers, social media posts and logos for small businesses.';
      case 'course':
        return 'The ' + c.course + ' is a 2-month course taught live on Zoom. You learn AI-generated images, logo design, e-book covers, Facebook banners, YouTube thumbnails and banners, business cards, flyers, T-shirt and mug designs, and how to create a free e-store on an international website. No design experience is needed.';
      case 'batch':
        return c.nextBatch
          ? 'The next batch starts on ' + c.nextBatch + '.' + (c.classTiming ? ' Classes are ' + c.classTiming + '.' : '') + ' Would you like to enroll?'
          : 'The next batch date has not been announced on this website yet. Please message ' + c.ownerName + ' on ' + wa + ' and she will confirm it.';
      case 'fee':
        return c.fee
          ? 'The course fee is ' + feeText(c) + '.' + (this.payOn() ? ' ' + c.paymentDetails : '') + ' After paying, enroll here and tell me “I have paid”. I will prepare the full message for ' + c.ownerName + ' on ' + wa + ', where you attach the payment slip.'
          : 'The fee and payment method are shared by ' + c.ownerName + ' directly. Please message her on ' + wa + '.';
      case 'age':
        if (c.minAge && c.maxAge) return 'The course is open to students aged ' + c.minAge + ' to ' + c.maxAge + '.';
        if (c.minAge) return 'The course is open to students aged ' + c.minAge + ' and above.';
        return 'Please ask ' + c.ownerName + ' about the age criteria on ' + wa + '. She will confirm if the student can join.';
      case 'requirements':
        return 'To join you need ' + c.requirements.slice(0, -1).join(', ') + ', and ' + c.requirements[c.requirements.length - 1] + '. If you have not installed Zoom yet, please download it from the official Zoom website or your app store before the first class.';
      case 'enroll':
        return 'Enrolling takes three steps. First, I note the student’s name and age' + (this.emailOn() ? ' and an email address, and send a confirmation email' : '') + '. Second, you pay the course fee' + (this.payOn() ? ' to the account I show you' : '') + '. Third, you tell me “I have paid”, I ask for your WhatsApp number, the account you paid from and the amount, and then prepare a full message for ' + c.ownerName + ' on ' + wa + ', where you attach the payment slip. Would you like to enroll now?';
      case 'social':
        return 'You can find ' + c.ownerName + ' online on ' + c.social.map(function (s) { return s.name; }).join(', ').replace(/, ([^,]*)$/, ' and $1') + '. I have shown the links below, so you can tap one to open it.';
      case 'contact':
        return 'You can reach ' + c.ownerName + ' on ' + wa + ' or by email at ' + c.ownerEmail + '.';
      case 'thanks':
        return 'You’re welcome! Ask me anything else about the course, or say “enroll” to start.';
      case 'bye':
        return 'Allah Hafiz! Message us on WhatsApp any time.';
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

  Brain.prototype.fixOptions = function () { return this.emailOn() ? ['Name', 'Age', 'Email'] : ['Name', 'Age']; };

  Brain.prototype.prompt = function () {
    var d = this.data, on = this.emailOn(), minor = d.age !== undefined && d.age < 18;
    switch (this.state) {
      case 'name': return { say: 'What is the student’s full name?', input: 'text' };
      case 'age': return { say: 'How old is the student?', input: 'text' };
      case 'email':
        return { say: (minor ? 'Because the student is under 18, please give a parent’s or guardian’s email address for the confirmation.' : 'Please give an email address for the confirmation.') +
                      ' Type it in the box, or say it like: name at gmail dot com.', input: 'email' };
      case 'confirm':
        var base = 'Let me check the details. Student name: ' + d.name + '. Age: ' + d.age + '.';
        var q = (on && minor) ? ' Because the student is under 18, please confirm that this email belongs to a parent or guardian. Is everything correct?' : ' Is this correct?';
        return { say: base + (on ? ' Email: ' + d.email + '.' : '') + q,
                 speak: base + (on ? ' Email: ' + spellEmail(d.email) + '.' : '') + q,
                 chips: ['Yes, confirm', 'No, change'] };
      case 'payWa':
        return { say: 'From which WhatsApp number did you send (or will you send) the fee slip to ' + this.cfg.ownerName + '? For example 0300 1234567.', input: 'text' };
      case 'payAcct':
        return { say: 'From which bank or wallet account did you pay? Please type the bank name and the account number. The last 4 digits are enough, for example “HBL 1234”.', input: 'text' };
      case 'payAmt':
        return { say: 'How much did you pay, and in which currency? For example “5000 PKR” or “19 USD”.', input: 'text' };
      case 'payConfirm':
        var pd = this.payData;
        var pay = 'Let me check the payment details. Slip sent from WhatsApp number: ' + pd.wa + '. Paid from account: ' + pd.acct + '. Amount: ' + formatMoney(pd.amt) + '. Is this correct?';
        return { say: pay, speak: spellDigits(pay), chips: ['Yes, confirm', 'No, change'] };
    }
    return { say: '' };
  };

  /* Answers for a student who has already given their details */
  Brain.prototype.postEnroll = function (t) {
    var c = this.cfg, e = this.enrolled, wa = 'WhatsApp at ' + c.whatsappDisplay;
    if (!e) return null;
    var slip = this.progress === 'slip_sent';
    var payHow = this.payOn() ? ', using the account details above' : ', after asking ' + c.ownerName + ' for the account details on ' + wa;
    var slipStep = 'pay the course fee' + (c.fee ? ' of ' + feeText(c) : '') + payHow + ', then tap “I have paid”. I will note your payment details and prepare the full message for ' + c.ownerName + ' on WhatsApp.';
    var chipsAwait = ['I have paid', 'What’s next?', 'Requirements'];

    /* "did you receive it?", "is my seat confirmed?" */
    if (STATUS.test(t)) {
      return slip
        ? { say: 'I cannot see WhatsApp messages, so I cannot confirm receipt myself. ' + c.ownerName + ' will check your payment and reply to you on WhatsApp. If you do not hear back, message her again on ' + wa + '.', whatsapp: this.paid ? this.waPayLink() : null, whatsappLabel: 'Open the message for Hira again', chips: this.chipsFor() }
        : { say: 'I have the student’s details, but I do not know yet that the fee was paid. Please ' + slipStep, chips: chipsAwait };
    }
    /* "I have paid" / "I already sent it" (but not "I have not paid yet") */
    if (SENT.test(t)) {
      if (NEG.test(t)) {
        return { say: 'No problem. When you are ready, ' + slipStep, chips: chipsAwait };
      }
      if (slip) {
        return { say: 'You have already given me the payment details, so the message for ' + c.ownerName + ' is ready. Please open it, attach the payment slip picture in WhatsApp and send it. I cannot see WhatsApp messages, so she will check and reply to you there.',
          whatsapp: this.waPayLink(), whatsappLabel: 'Open the message for Hira again', chips: this.chipsFor() };
      }
      return this.startPayment();
    }
    /* "what's next?" depends on how far the student has come */
    if (NEXT.test(t)) {
      return slip
        ? { say: 'You have shared your payment details, so now ' + c.ownerName + ' will check them and reply to you on WhatsApp. Meanwhile, please make sure the Zoom app is installed and working.', chips: this.chipsFor() }
        : { say: 'You have already given the student’s details, so the next step is to ' + slipStep + ' Please also get the Zoom app ready.', chips: chipsAwait };
    }
    return null;
  };

  /* The student says the fee is paid: collect the payment details for Hira */
  Brain.prototype.startPayment = function () {
    this.state = 'payWa'; this.payData = {}; this.fixingPay = false; this.progress = 'collecting_payment';
    var p = this.prompt();
    p.say = 'Thank you! To give ' + this.cfg.ownerName + ' the full picture, I need three quick payment details. ' + p.say;
    return p;
  };

  Brain.prototype.reply = function (text) {
    var t = String(text || '').trim(), self = this, key, p;
    if (!t) return { say: 'I didn’t catch that. You can say it again or type it.' };

    if (this.state !== 'idle' && CANCEL.test(t)) {
      var wasPay = /^pay/.test(this.state);
      this.state = 'idle'; this.fixing = false; this.fixingPay = false;
      if (wasPay) {
        this.progress = 'awaiting_slip'; this.payData = {};
        return { say: 'No problem. When you have paid, tap “I have paid” and I will continue from here.', chips: ['I have paid', 'What’s next?', 'Requirements'] };
      }
      this.data = {};
      return { say: 'No problem, I have stopped the enrollment. You can start again any time by saying “enroll”.', chips: this.chipsFor() };
    }

    /* questions asked in the middle of enrollment: answer, then repeat the question */
    if (this.state !== 'idle' && this.state !== 'fix' && this.state !== 'payFix') {
      key = detect(t);
      var looksLikeAnswer = (this.state === 'age' && parseAge(t) !== null) ||
        (this.state === 'email' && (/@|\bat\b/i.test(t) && /\bdot\b|\./i.test(t))) ||
        (this.state === 'confirm' && (YES.test(t) || NO.test(t))) ||
        (/^pay(Wa|Acct|Amt)$/.test(this.state) && /\d/.test(t)) ||
        (this.state === 'payConfirm' && (YES.test(t) || NO.test(t)));
      if (key && ['batch', 'fee', 'age', 'requirements', 'about', 'course', 'contact', 'social'].indexOf(key) > -1 && !looksLikeAnswer && !(this.state === 'name' && t.split(/\s+/).length <= 3 && key === 'about')) {
        p = this.prompt();
        return { say: this.facts(key) + ' ' + p.say, speak: this.facts(key) + ' ' + (p.speak || p.say), input: p.input, chips: p.chips, links: this.linksFor(key) };
      }
    }

    if (this.state === 'name') {
      var name = cleanName(t);
      if (!name) return { say: 'Sorry, I could not get the name. Please say or type the student’s full name.', input: 'text' };
      this.data.name = name;
      if (this.fixing) { this.fixing = false; this.state = 'confirm'; return this.prompt(); }
      this.state = 'age';
      p = this.prompt(); p.say = 'Thank you. ' + name + '. ' + p.say; return p;
    }

    if (this.state === 'age') {
      var age = parseAge(t);
      if (age === null || age < 3 || age > 99) return { say: 'Please tell me the age as a number, for example 15.', input: 'text' };
      var c = this.cfg;
      if ((c.minAge && age < c.minAge) || (c.maxAge && age > c.maxAge)) {
        this.state = 'idle'; this.data = {};
        return { say: 'Thank you. The age criteria for this course is ' + (c.minAge ? c.minAge : 'no minimum') + (c.maxAge ? ' to ' + c.maxAge : ' and above') + ', so I can’t enroll a student aged ' + age + ' here. Please message ' + c.ownerName + ' on WhatsApp at ' + c.whatsappDisplay + ' if you have questions.', chips: this.chipsFor() };
      }
      this.data.age = age;
      if (this.fixing) { this.fixing = false; this.state = 'confirm'; }
      else this.state = this.emailOn() ? 'email' : 'confirm';
      return this.prompt();
    }

    if (this.state === 'email') {
      var em = parseEmail(t);
      if (!em) return { say: 'That doesn’t look like a valid email address. Please type it in the box below, for example name@gmail.com.', input: 'email' };
      this.data.email = em; this.fixing = false; this.state = 'confirm'; return this.prompt();
    }

    if (this.state === 'confirm') {
      if (YES.test(t) && !NO.test(t)) {
        this.count = (this.count || 0) + 1;
        if (!this.emailOn()) return this.finish({ studentSent: false, noEmail: true });
        this.state = 'submitting';
        return { say: 'Thank you. I am sending your confirmation email now.', submit: this.data };
      }
      if (NO.test(t)) {
        this.state = 'fix';
        return { say: 'No problem. Which one should I change: ' + (this.emailOn() ? 'the name, the age or the email?' : 'the name or the age?'), chips: this.fixOptions() };
      }
      return { say: 'Please say yes to confirm, or no to change something.', chips: ['Yes, confirm', 'No, change'] };
    }

    if (this.state === 'fix') {
      if (/name/i.test(t)) this.state = 'name';
      else if (/age/i.test(t)) this.state = 'age';
      else if (/mail/i.test(t) && this.emailOn()) this.state = 'email';
      else return { say: this.emailOn() ? 'Please say name, age or email.' : 'Please say name or age.', chips: this.fixOptions() };
      var back = this.prompt(); this.fixing = true; return back;
    }

    /* ---- payment details: WhatsApp number, account, amount, then confirm ---- */
    if (this.state === 'payWa') {
      var ph = parsePhone(t);
      if (!ph) return { say: 'Please give the WhatsApp number with digits, for example 0300 1234567.', input: 'text' };
      this.payData.wa = ph;
      if (this.fixingPay) { this.fixingPay = false; this.state = 'payConfirm'; return this.prompt(); }
      this.state = 'payAcct'; return this.prompt();
    }
    if (this.state === 'payAcct') {
      var ac = parseAccount(t);
      if (!ac) return { say: 'Please type the bank or wallet name and the account number. At least the last 4 digits are needed, for example “HBL 1234”.', input: 'text' };
      this.payData.acct = ac;
      if (this.fixingPay) { this.fixingPay = false; this.state = 'payConfirm'; return this.prompt(); }
      this.state = 'payAmt'; return this.prompt();
    }
    if (this.state === 'payAmt') {
      var am = parseAmount(t);
      if (am === null) return { say: 'Please tell me the amount as a number with the currency, for example 5000 PKR or 19 USD.', input: 'text' };
      this.payData.amt = am; this.fixingPay = false; this.state = 'payConfirm'; return this.prompt();
    }
    if (this.state === 'payConfirm') {
      if (YES.test(t) && !NO.test(t)) {
        this.state = 'idle'; this.progress = 'slip_sent';
        this.paid = { wa: this.payData.wa, acct: this.payData.acct, amt: this.payData.amt };
        return { say: 'Thank you! The full message for ' + this.cfg.ownerName + ' is ready: student details, course, and your payment details. Tap the button below. WhatsApp will open with the message, then please attach the payment slip picture and send it. ' + this.cfg.ownerName + ' will check it and reply to you there.',
          whatsapp: this.waPayLink(), whatsappLabel: 'Send details to Hira on WhatsApp', chips: ['What’s next?', 'Requirements', 'Next batch'] };
      }
      if (NO.test(t)) {
        this.state = 'payFix';
        return { say: 'No problem. Which one should I change: the WhatsApp number, the account or the amount?', chips: ['Number', 'Account', 'Amount'] };
      }
      return { say: 'Please say yes to confirm, or no to change something.', chips: ['Yes, confirm', 'No, change'] };
    }
    if (this.state === 'payFix') {
      if (/number|whatsapp/i.test(t)) this.state = 'payWa';
      else if (/account|bank|wallet/i.test(t)) this.state = 'payAcct';
      else if (/amount|rupee|fee/i.test(t)) this.state = 'payAmt';
      else return { say: 'Please say number, account or amount.', chips: ['Number', 'Account', 'Amount'] };
      var pback = this.prompt(); this.fixingPay = true; return pback;
    }

    key = detect(t);
    if (key === 'enrollNow' || (/^(yes|yeah|yep|sure|ok|okay|haan|ji)\b/i.test(t) && this.lastKey && /enroll|batch/.test(this.lastKey)) || /^yes, enroll now/i.test(t) || /^enroll now/i.test(t)) {
      if (this.count >= MAX_ENROLLMENTS_PER_CHAT) {
        return { say: 'To keep things safe, I can take up to ' + MAX_ENROLLMENTS_PER_CHAT + ' enrollments in one chat. Please message ' + this.cfg.ownerName + ' on WhatsApp at ' + this.cfg.whatsappDisplay + ' for more.', chips: this.chipsFor() };
      }
      this.state = 'name'; this.data = {};
      return { say: 'Great, let’s begin. What is the student’s full name?', input: 'text' };
    }
    if (/^not now/i.test(t)) return { say: 'No problem. Ask me anything else about the course.', chips: this.chipsFor() };

    /* the student has already enrolled in this chat */
    var after = this.postEnroll(t);
    if (after) return after;
    if (!this.enrolled && /\b(paid|payment\s+(done|made|sent)|(bhar|kar)\s*(di|diya|dia|chuki|chuka))\b/i.test(t) && !NEG.test(t)) {
      return { say: 'Thank you! To pass your payment to ' + this.cfg.ownerName + ' I first need the student’s details. Please say “enroll” and I will take the name and age first.', chips: ['Enroll now'] };
    }

    if (key && this.facts(key)) {
      this.lastKey = key;
      return { say: this.facts(key), chips: this.chipsFor(key), links: this.linksFor(key) };
    }
    return { say: 'I can help with questions about Hira, the next batch, how to enroll, the age criteria and the requirements. You can also say “enroll” to start the enrollment.', chips: this.chipsFor() };
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
      'Paid from account: ' + p.acct,
      '',
      'I am attaching the fee payment slip below.');
    return WA_LINK + '?text=' + encodeURIComponent(lines.join('\n'));
  };

  Brain.prototype.finish = function (res) {
    var c = this.cfg, d = this.data, parts = [];
    this.state = 'idle';
    this.enrolled = { name: d.name, age: d.age, email: d.email };
    this.progress = 'awaiting_slip'; this.paid = null; this.payData = {};
    if (res.studentSent) {
      parts.push('Done! I have sent a confirmation email to ' + d.email + '. Please check your inbox and spam folder.');
    } else if (res.noEmail) {
      parts.push('Thank you! I have noted the details. Student name: ' + d.name + ', age: ' + d.age + '.');
    } else {
      parts.push('I have noted the details, but I could not send the confirmation email from here. Do not worry, I will put all the details into the WhatsApp message for ' + c.ownerName + ' later, so you do not need to type them again.');
    }
    if (payReady(c)) {
      parts.push('To pay the course fee' + (c.fee ? ' (' + feeText(c) + ')' : '') + ', please use these account details: ' + c.paymentDetails +
        ' After paying, tap “I have paid”. I will ask for the WhatsApp number you send the slip from, the account you paid from and the amount, and then prepare the full message for ' + c.ownerName + '.');
    } else {
      parts.push((c.fee ? 'The course fee is ' + feeText(c) + '. ' : '') + 'The payment account details are shared by ' + c.ownerName + ' on WhatsApp. Tap the button below to ask for them. After paying, tap “I have paid” and I will prepare the full message for her.');
    }
    parts.push('Thank you for choosing the course!');
    var out = { say: parts.join(' '), chips: ['I have paid', 'What’s next?', 'Requirements'] };
    if (!payReady(c)) { out.whatsapp = this.waLink(this.enrolled); out.whatsappLabel = 'Ask Hira for payment details on WhatsApp'; }
    return out;
  };

  /* ---------- emails ---------- */
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
  root.CourseAgentCore = { Brain: Brain, CFG: CFG, parseAge: parseAge, parseEmail: parseEmail, cleanName: cleanName, spellEmail: spellEmail, emailTexts: emailTexts,
    parsePhone: parsePhone, parseAccount: parseAccount, parseAmount: parseAmount, formatRs: formatRs, formatMoney: formatMoney, feeText: feeText, payReady: payReady };
  if (typeof document === 'undefined') { if (typeof module !== 'undefined') module.exports = root.CourseAgentCore; return; }

  /* ===================== user interface ===================== */
  var d = document, brain = new Brain(CFG);
  var SR = root.SpeechRecognition || root.webkitSpeechRecognition;
  var canSpeak = 'speechSynthesis' in root, canListen = !!SR;
  var recLang = 'en-IN', speakOn = canSpeak, voiceMode = false, listening = false, speaking = false, busy = false, misses = 0, rec = null, opened = false;

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
    '<p class="va-note">The details you give here are used only to prepare your enrollment message for Hira on WhatsApp' + (CFG.emailjs && CFG.emailjs.publicKey ? ' and your confirmation email' : '') + '. For students under 18, please use a parent’s email.</p>';
  d.body.appendChild(fab); d.body.appendChild(panel);

  var log = panel.querySelector('.va-log'), chips = panel.querySelector('.va-chips'), status = panel.querySelector('.va-status'),
      input = panel.querySelector('.va-input'), micBtn = panel.querySelector('.va-mic'), speakBtn = panel.querySelector('.va-speak');
  if (!canSpeak) { speakBtn.hidden = true; }

  function setStatus(t) { status.textContent = t || ''; }
  function bubble(who, text) { var b = el('div', 'va-msg va-' + who); b.textContent = text; log.appendChild(b); log.scrollTop = log.scrollHeight; return b; }
  function setChips(list) {
    chips.innerHTML = '';
    (list || []).forEach(function (c) { var b = el('button', 'va-chip'); b.type = 'button'; b.textContent = c; b.addEventListener('click', function () { handleUser(c); }); chips.appendChild(b); });
  }
  function setInput(kind) {
    input.type = kind === 'email' ? 'email' : 'text';
    input.placeholder = kind === 'email' ? 'name@example.com' : 'Type or tap the mic to talk';
    input.setAttribute('inputmode', kind === 'email' ? 'email' : 'text');
  }

  function pickVoice() {
    var vs = root.speechSynthesis.getVoices() || [];
    return vs.filter(function (v) { return /^en[-_]IN/i.test(v.lang); })[0] || vs.filter(function (v) { return /^en/i.test(v.lang); })[0] || null;
  }
  function speak(text, done) {
    if (!speakOn || !canSpeak || !text) { if (done) done(); return; }
    root.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text), v = pickVoice();
    u.lang = v ? v.lang : 'en-IN'; if (v) u.voice = v; u.rate = 0.95;
    var finished = false, end = function () { if (finished) return; finished = true; speaking = false; if (done) done(); };
    u.onend = end; u.onerror = end; speaking = true; root.speechSynthesis.speak(u);
    setTimeout(function () { if (!root.speechSynthesis.speaking) end(); }, 600 + text.length * 90);   // safety net
  }

  function micProblem(code) {
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
    rec = r; r.lang = recLang; r.interimResults = true; r.maxAlternatives = 1; r.continuous = false;
    r.onstart = function () { setStatus('Listening… speak now'); micBtn.setAttribute('aria-pressed', 'true'); micBtn.classList.add('on'); };
    r.onresult = function (e) {
      var txt = '', fin = false;
      for (var i = e.resultIndex; i < e.results.length; i++) { txt += e.results[i][0].transcript; if (e.results[i].isFinal) fin = true; }
      if (!fin) { input.value = txt; return; }          // show what is being heard
      got = true; misses = 0; input.value = ''; handleUser(txt.trim());
    };
    r.onerror = function (e) {
      if (e.error === 'language-not-supported' && recLang !== 'en-US') { recLang = 'en-US'; retry = true; return; }
      var m = micProblem(e.error);
      if (m) { failed = true; stopVoice(); setStatus(m); }
    };
    r.onend = function () {
      listening = false; micBtn.classList.remove('on');
      if (retry) { setTimeout(listen, 200); return; }
      if (!voiceMode) { if (!failed) setStatus(''); return; }
      if (!got && !busy) {
        misses++;
        if (misses >= 2) { stopVoice(); setStatus('I could not hear speech. Check Chrome microphone permission and Windows Sound > Input; select an unmuted mic and make sure its input level moves. Then try again, or type your message.'); return; }
        setTimeout(listen, 300);
      }
    };
    try { r.start(); } catch (err) { listening = false; stopVoice(); setStatus('Could not start the microphone. Please type your message.'); }
  }
  function stopVoice() { voiceMode = false; misses = 0; listening = false; micBtn.setAttribute('aria-pressed', 'false'); micBtn.classList.remove('on'); try { if (rec) rec.abort(); } catch (e) { } }

  function show(r) {
    bubble('bot', r.say);
    setChips(r.chips); if (r.input) setInput(r.input); else if (brain.state === 'idle') setInput('text');
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
      var a = el('a', 'va-wa'); a.href = r.whatsapp; a.target = '_blank'; a.rel = 'noopener'; a.textContent = r.whatsappLabel || 'Send details on WhatsApp'; log.appendChild(a); log.scrollTop = log.scrollHeight;
    }
    if (r.input === 'email') input.focus();
  }

  function respond(r) {
    show(r);
    busy = true;
    speak(r.speak || spokenText(r.say), function () { busy = false; if (voiceMode) setTimeout(listen, 250); });
    if (r.submit) {
      setStatus('Sending your confirmation email…');
      submitEnrollment(CFG, r.submit)
        .catch(function () { return { studentSent: false, ownerSent: false }; })
        .then(function (res) { setStatus(''); respond(brain.finish(res)); });
    }
  }

  function handleUser(text) {
    if (busy && speaking) { root.speechSynthesis.cancel(); speaking = false; }
    if (brain.state === 'submitting') { bubble('bot', 'One moment, I am still saving your details.'); return; }
    bubble('user', text); input.value = '';
    respond(brain.reply(text));
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
    if (voiceMode) { stopVoice(); setStatus(''); return; }
    if (!canListen) { bubble('bot', 'Voice is not supported in this browser. Please use Chrome, Edge or Safari, or type your message below.'); return; }
    if (root.isSecureContext === false) { bubble('bot', 'The microphone only works on a secure (https) website. Please open the site with https, or type your message.'); return; }
    voiceMode = true; misses = 0; if (canSpeak) { root.speechSynthesis.cancel(); speaking = false; } listen();
  });
  speakBtn.addEventListener('click', function () {
    speakOn = !speakOn; speakBtn.setAttribute('aria-pressed', String(speakOn)); speakBtn.textContent = 'Voice replies: ' + (speakOn ? 'on' : 'off');
    if (!speakOn && canSpeak) root.speechSynthesis.cancel();
  });
  if (canSpeak) { root.speechSynthesis.onvoiceschanged = function () { }; root.speechSynthesis.getVoices(); }
})(typeof window !== 'undefined' ? window : globalThis);
