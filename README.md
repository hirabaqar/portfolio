# Hira Baqar: Portfolio Website

A fast, mobile-friendly portfolio for **Hira Baqar, Canva Design Master & Passionate Educator**.
Plain HTML, CSS and a little JavaScript. No build tools, no frameworks, no database.

## What is on the page

Cover · About · Work Experience (Fiverr + AI-generated images) · Professional Certifications ·
Some of my Work · Prices · Learning Now · Skills & Projects · Find Me Online · Get in Touch

## Folder structure

```
portfolio/
├── index.html            the page (all text lives here)
├── style.css             colours, layout, mobile design
├── script.js             mobile menu, image preview, scroll effects
├── voice-agent.js        voice + text course assistant (edit its CONFIG block)
├── voice-agent.css       look of the assistant
├── 404.html              "page not found" page
├── robots.txt            lets search engines index the site
├── favicon.png           browser tab icon
├── apple-touch-icon.png  phone home-screen icon
├── images/               all pictures (33 files)
└── README.md             this file
```

> **Keep every file and the `images` folder together.** `index.html` loads its
> pictures from `images/`. If you move or delete that folder, the pictures will not show.

## Run it on your computer

1. Unzip the folder.
2. Double-click `index.html`. It opens in your browser. Done.

Fonts (Playfair Display, Space Grotesk) load from Google Fonts, so open it online the first time.

## Publish it (free options)

You do not need paid hosting. Pick one:

**Netlify Drop (easiest, no account setup needed to try)**
1. Go to <https://app.netlify.com/drop>.
2. Drag the whole `portfolio` folder onto the page.
3. You get a live link in a few seconds. Sign up to keep it permanently.

**GitHub Pages**
1. Create a new public repository and upload all files, keeping the `images` folder.
2. Open **Settings → Pages**, choose the `main` branch and the root folder, then save.
3. Your site appears at `https://<your-username>.github.io/<repository-name>/`.

**Cloudflare Pages / Vercel**
Create a new project, upload or connect the folder, leave the build command empty and set the
output folder to the project root.

After publishing, open the link on your phone and check every section.

## Edit it

| I want to change | Where |
|---|---|
| Any text, links, phone, email | `index.html` (search for the text) |
| Page colour, heading colour | top of `style.css`, the `:root` block (`--bg`, `--yellow`, `--card`) |
| A picture | replace the file inside `images/` and keep the same file name |
| Add a new picture | put it in `images/` and copy an existing `<img>` line in `index.html` |
| WhatsApp number | `index.html` (search `923171835773`) and `voice-agent.js` (`whatsappIntl`). Country code, no `+` or spaces |
| Prices | `index.html`, the `Prices` section |
| Background pattern | `style.css`, the `Page background` block (`body::before`) |

**Images use the page colour as their background.** In `style.css`, one rule gives every image and
picture frame `background-color: var(--bg)`. Change `--bg` once and the images follow.

## Voice assistant (course helper)

A button at the bottom-right ("Ask about the course") opens an assistant that you can **talk to or type to**.
It answers: about Hira, next batch date, how to enroll, age criteria, fee, and requirements (device,
basic computer skills, Zoom app). To enroll, it asks the student name, age and an email address, reads the
details back for confirmation, then:

1. sends a **confirmation email** to the student (and a notification email to you),
2. tells the student to send the **fee payment slip on WhatsApp (0317 1835773) and mention the student name**,
3. shows a ready-made WhatsApp button with the student name already in the message.

**Step 1: fill in your facts.** Open `voice-agent.js` and edit the `CONFIG` block at the top:
`nextBatch`, `classTiming`, `fee`, `paymentDetails`, `minAge`, `maxAge`, `requirements`.
If a field is empty, the assistant does not guess: it tells the visitor to ask Hira on WhatsApp.

**Step 2: switch on emails (free, about 10 minutes).** A website cannot send email by itself, so use EmailJS:
1. Create a free account at <https://www.emailjs.com> and add an **Email Service** (for example Gmail).
2. Create **two templates**. In both, set **To Email** to `{{to_email}}`, **Subject** to `{{subject}}` and the body to `{{message}}`.
   One template is for students, one is for you.
3. Copy your **Public Key**, **Service ID** and the two **Template IDs** into `CFG.emailjs` in `voice-agent.js`.
4. In the EmailJS dashboard, allow only your website's domain, so nobody else can use your keys.

Until step 2 is done, the assistant still collects the details and shows the WhatsApp button, but it will
say honestly that it could not send the email.

**Notes**
- Voice needs Chrome, Edge or Safari and microphone permission. Firefox users can type instead.
- The assistant speaks English. It follows a set flow, so it answers only the topics above.
- It will not work inside a preview frame (microphone and email are blocked there). Test it on your real site.
- Students under 18: the assistant asks for a parent's or guardian's email.

## Features

- Works on phones, tablets and desktops
- Tap any picture to view it larger (press `Esc` to close)
- Menu button on phones, highlighted menu link while scrolling
- Smooth scroll effects (switched off for visitors who prefer reduced motion)
- Page still works if JavaScript is turned off
- Prices section, "WhatsApp us" button in the top bar, and an AI-style background (network lines, circuit traces, floating AI symbols)

## Contact details used on the site

- Email: digitalworlddesigns22@gmail.com
- WhatsApp: (092) 3171835773

## Troubleshooting

- **Mic does not work:** open the website directly (not inside a preview or an app's built-in browser), use Chrome,
  Edge or Safari, click the lock icon next to the address bar and allow the microphone. The site must use `https`
  (Vercel and Netlify do). The assistant shows the exact reason under the chat box. You can always type instead.

- **Pictures are missing:** the `images` folder is not next to `index.html`. Put it back.
- **Fonts look different:** you are offline. They load when you connect to the internet.
- **Changes do not show after publishing:** refresh the page with `Ctrl + F5` (or clear the cache).

## Notes

- The birthday invitation, coupon and demo class flyer are **sample designs**.
- Coupon and demo class dates on those samples are old. Replace them when you have new flyers.
- All designs and photos belong to their owner. Do not reuse them without permission.
