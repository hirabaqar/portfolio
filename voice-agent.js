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
    fee: '',              // e.g. 'Rs 5,000'
    paymentDetails: '',   // e.g. 'Bank: ..., Account title: ..., Account number: ...'
    minAge: null,         // e.g. 14
    maxAge: null,         // e.g. 60, or null for no upper limit

    social: [
      { name: 'Fiverr', url: 'https://www.fiverr.com/s/8zpvZmr' },
      { name: 'GitHub', url: 'https://github.com/hirabaqar' },
      { name: 'LinkedIn', url: 'https://www.linkedin.com/in/hira-baqar-863096278/' },
      { name: 'YouTube', url: 'https://www.youtube.com/@786-DIGITAL' },
      { name: 'Facebook', url: 'https://www.facebook.com/Skillsenergise786/' },
      { name: 'Instagram', url: 'https://www.instagram.com/huma_syeda7/' }
    ],

    requirements: [
      'a laptop or desktop computer',
      'a stable internet connection',
      'the Zoom app downloaded and working',
      'basic computer skills, such as using a keyboard and mouse, opening files and browsing the internet'
    ],

    /* Free email sending: see README.md, section "Voice assistant emails". */
    emailjs: { publicKey: '', serviceId: '', studentTemplateId: '', ownerTemplateId: '' }
  };
  /* ================================================================== */

  var WA_LINK = 'https://wa.me/' + CFG.whatsappIntl;

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

  var YES = /\b(yes|yeah|yep|yup|correct|right|sure|ok|okay|confirm|go ahead|please do|haan|han|ji|jee)\b/i;
  var NO = /\b(no|nope|nah|wrong|incorrect|change|not correct|nahi|nahin)\b/i;
  var CANCEL = /\b(cancel|stop|never ?mind|not now|forget it|exit)\b/i;

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
  function Brain(cfg) { this.cfg = cfg; this.state = 'idle'; this.data = {}; }

  Brain.prototype.ask = function (what) { return what; };

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
          ? 'The course fee is ' + c.fee + '.' + (c.paymentDetails ? ' ' + c.paymentDetails : '') + ' After paying, send the fee payment slip on ' + wa + ' and mention the student’s name.'
          : 'The fee and payment method are shared by ' + c.ownerName + ' directly. Please message her on ' + wa + '.';
      case 'age':
        if (c.minAge && c.maxAge) return 'The course is open to students aged ' + c.minAge + ' to ' + c.maxAge + '.';
        if (c.minAge) return 'The course is open to students aged ' + c.minAge + ' and above.';
        return 'Please ask ' + c.ownerName + ' about the age criteria on ' + wa + '. She will confirm if the student can join.';
      case 'requirements':
        return 'To join you need ' + c.requirements.slice(0, -1).join(', ') + ', and ' + c.requirements[c.requirements.length - 1] + '. If you have not installed Zoom yet, please download it from the official Zoom website or your app store before the first class.';
      case 'enroll':
        return 'Enrolling takes three steps. First, I note the student’s name, age and an email address, and send a confirmation email. Second, you pay the course fee. Third, you send the fee payment slip to ' + c.ownerName + ' on ' + wa + ' and mention the student’s name in the message. Would you like to enroll now?';
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

  Brain.prototype.prompt = function () {
    var d = this.data;
    switch (this.state) {
      case 'name': return { say: 'What is the student’s full name?', input: 'text' };
      case 'age': return { say: 'How old is the student?', input: 'text' };
      case 'email': return { say: 'Please give an email address for the confirmation. If the student is under 18, use a parent’s or guardian’s email. Type it in the box, or say it like: name at gmail dot com.', input: 'email' };
      case 'confirm':
        return { say: 'Let me check the details. Student name: ' + d.name + '. Age: ' + d.age + '. Email: ' + d.email + '. Is this correct?',
                 speak: 'Let me check the details. Student name: ' + d.name + '. Age: ' + d.age + '. Email: ' + spellEmail(d.email) + '. Is this correct?',
                 chips: ['Yes, confirm', 'No, change'] };
    }
    return { say: '' };
  };

  Brain.prototype.reply = function (text) {
    var t = String(text || '').trim(), self = this, key, p;
    if (!t) return { say: 'I didn’t catch that. You can say it again or type it.' };

    if (this.state !== 'idle' && CANCEL.test(t)) {
      this.state = 'idle'; this.data = {}; this.fixing = false;
      return { say: 'No problem, I have stopped the enrollment. You can start again any time by saying “enroll”.', chips: this.chipsFor() };
    }

    /* questions asked in the middle of enrollment: answer, then repeat the question */
    if (this.state !== 'idle' && this.state !== 'fix') {
      key = detect(t);
      var looksLikeAnswer = (this.state === 'age' && parseAge(t) !== null) ||
        (this.state === 'email' && (/@|\bat\b/i.test(t) && /\bdot\b|\./i.test(t))) ||
        (this.state === 'confirm' && (YES.test(t) || NO.test(t)));
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
      if (this.fixing) { this.fixing = false; this.state = 'confirm'; } else this.state = 'email';
      return this.prompt();
    }

    if (this.state === 'email') {
      var em = parseEmail(t);
      if (!em) return { say: 'That doesn’t look like a valid email address. Please type it in the box below, for example name@gmail.com.', input: 'email' };
      this.data.email = em; this.fixing = false; this.state = 'confirm'; return this.prompt();
    }

    if (this.state === 'confirm') {
      if (YES.test(t) && !NO.test(t)) { this.state = 'submitting'; return { say: 'Thank you. I am sending your confirmation email now.', submit: this.data }; }
      if (NO.test(t)) { this.state = 'fix'; return { say: 'No problem. Which one should I change: the name, the age or the email?', chips: ['Name', 'Age', 'Email'] }; }
      return { say: 'Please say yes to confirm, or no to change something.', chips: ['Yes, confirm', 'No, change'] };
    }

    if (this.state === 'fix') {
      if (/name/i.test(t)) this.state = 'name';
      else if (/age/i.test(t)) this.state = 'age';
      else if (/mail/i.test(t)) this.state = 'email';
      else return { say: 'Please say name, age or email.', chips: ['Name', 'Age', 'Email'] };
      var back = this.prompt(); this.fixing = true; return back;
    }

    key = detect(t);
    if (key === 'enrollNow' || (/^(yes|yeah|yep|sure|ok|okay|haan|ji)\b/i.test(t) && this.lastKey && /enroll|batch/.test(this.lastKey)) || /^yes, enroll now/i.test(t) || /^enroll now/i.test(t)) {
      this.state = 'name'; this.data = {};
      return { say: 'Great, let’s begin. What is the student’s full name?', input: 'text' };
    }
    if (/^not now/i.test(t)) return { say: 'No problem. Ask me anything else about the course.', chips: this.chipsFor() };
    if (key && this.facts(key)) {
      this.lastKey = key;
      return { say: this.facts(key), chips: this.chipsFor(key), links: this.linksFor(key) };
    }
    return { say: 'I can help with questions about Hira, the next batch, how to enroll, the age criteria and the requirements. You can also say “enroll” to start the enrollment.', chips: this.chipsFor() };
  };

  Brain.prototype.waLink = function () {
    var c = this.cfg, d = this.data;
    return WA_LINK + '?text=' + encodeURIComponent('Assalam o Alaikum. I have enrolled in the ' + c.course + '. Student name: ' + d.name + '. Age: ' + d.age + '. I am sending the fee payment slip.');
  };

  Brain.prototype.finish = function (res) {
    var c = this.cfg, d = this.data, parts = [];
    this.state = 'idle';
    parts.push(res.studentSent
      ? 'Done! I have sent a confirmation email to ' + d.email + '. Please check your inbox and spam folder.'
      : 'I have noted the details, but I could not send the confirmation email from here. Please include the details when you message on WhatsApp.');
    parts.push('Next step: please send the fee payment slip to ' + c.ownerName + ' on WhatsApp at ' + c.whatsappDisplay + ', and mention the student name, ' + d.name + ', in your message.' + (c.fee ? ' The course fee is ' + c.fee + '.' : '') + (c.paymentDetails ? ' ' + c.paymentDetails : ''));
    parts.push('Thank you for choosing the course!');
    return { say: parts.join(' '), whatsapp: this.waLink(), chips: ['Requirements', 'Next batch'] };
  };

  /* ---------- emails ---------- */
  function emailTexts(cfg, d) {
    var lines = ['Student name: ' + d.name, 'Student age: ' + d.age, 'Email: ' + d.email];
    if (cfg.nextBatch) lines.push('Next batch: ' + cfg.nextBatch);
    if (cfg.fee) lines.push('Course fee: ' + cfg.fee);
    var student = 'Assalam o Alaikum,\n\nThank you for enrolling in the ' + cfg.course + '. These are the details we received:\n\n' + lines.join('\n') +
      '\n\nNext step: please pay the course fee and send the fee payment slip to ' + cfg.ownerName + ' on WhatsApp at ' + cfg.whatsappDisplay +
      '. Please mention the student name (' + d.name + ') in your message.' + (cfg.paymentDetails ? '\n\nPayment details: ' + cfg.paymentDetails : '') +
      '\n\nWhat you need for the classes: ' + cfg.requirements.join('; ') + '.\n\nRegards,\n' + cfg.ownerName + '\nDigital World Designs';
    var owner = 'New enrollment request for the ' + cfg.course + '.\n\n' + lines.join('\n') +
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
  root.CourseAgentCore = { Brain: Brain, CFG: CFG, parseAge: parseAge, parseEmail: parseEmail, cleanName: cleanName, spellEmail: spellEmail, emailTexts: emailTexts };
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
    '<p class="va-note">Your details are used only to send your enrollment confirmation. For students under 18, please use a parent’s email.</p>';
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
        var a = el('a'); a.href = l.url; a.textContent = l.name; a.dataset.n = l.name.toLowerCase();
        if (/^https?:/.test(l.url)) { a.target = '_blank'; a.rel = 'noopener'; }
        box.appendChild(a);
      });
      log.appendChild(box); log.scrollTop = log.scrollHeight;
    }
    if (r.whatsapp) {
      var a = el('a', 'va-wa'); a.href = r.whatsapp; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Send fee slip on WhatsApp'; log.appendChild(a); log.scrollTop = log.scrollHeight;
    }
    if (r.input === 'email') input.focus();
  }

  function respond(r) {
    show(r);
    busy = true;
    speak(r.speak || r.say, function () { busy = false; if (voiceMode) setTimeout(listen, 250); });
    if (r.submit) {
      setStatus('Sending your confirmation email…');
      submitEnrollment(CFG, r.submit).then(function (res) { setStatus(''); respond(brain.finish(res)); });
    }
  }

  function handleUser(text) {
    if (busy && speaking) { root.speechSynthesis.cancel(); speaking = false; }
    if (brain.state === 'submitting') return;
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
