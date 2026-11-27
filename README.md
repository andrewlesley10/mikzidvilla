# Mik Zid Villa website

One-page website for Mik Zid Villa, Piliyandala, Sri Lanka (a Mikzid Holdings (Private) Limited property). Plain HTML, CSS and JavaScript, with a small PHP script that emails villa enquiries. No build step, no framework and no database.

This is the starter scope: a showcase page with an enquiry form, WhatsApp and call buttons. It has no online booking, payments or admin panel.

## What's in the folder

| Path | What it is |
|---|---|
| `index.html` | The whole site: hero, villa facts, day-to-night photos, spaces, video tours, "Good for", photo gallery and the enquiry form |
| `contact.php` | Receives the enquiry form and emails it to the villa |
| `assets/site.css` | All styles, built on the colour and type tokens at the top of the file |
| `assets/site.js` | Preloader, mobile menu, sticky nav, floating WhatsApp button, scroll reveal, gallery photo viewer |
| `assets/enquiry-form.js` | Date checks, sends the form without reloading, shows the thank-you panel |
| `assets/seo.js` | Adds Google structured data (LodgingBusiness) for the villa |
| `media/` | Web-sized photos, logos and the two tour videos. Every distinct villa photo is on the page, in the main sections or the gallery |
| `assets/WhatsApp …` | The owner's original photos and videos. The page doesn't use them, so they can stay out of the upload to the hosting |
| `.htaccess` | HTTPS redirect, clean URLs, caching and security headers (Apache hosting) |
| `robots.txt`, `sitemap.xml` | For search engines |

## Before launch

1. **Set the email address** in `contact.php`:
   - `MAIL_TO`: the inbox that should receive enquiries.
   - `MAIL_FROM`: an address on the site's own domain, such as `no-reply@your-domain.lk`.

   Until `MAIL_TO` is set, the form tells guests to call or WhatsApp instead.
2. **Replace `your-domain.lk`** with the real domain in `index.html` (canonical and social preview tags), `assets/seo.js`, `robots.txt`, `sitemap.xml` and `contact.php`.
3. **Optional:** in `.htaccess`, uncomment the two lines that send the bare domain to `www` (or the reverse).
4. Upload everything to the hosting's `public_html` folder. The host needs PHP 8.0 or newer with `mail()` enabled, which is standard on cPanel shared hosting.
5. Send a test enquiry and check that it arrives, including in the spam folder.

## How the enquiry form works

- The guest enters their name, email, phone/WhatsApp, type of stay, check-in and check-out dates, number of guests (1 to 15) and an optional message.
- The browser checks the fields first (no past dates, check-out after check-in) and shows the number of nights.
- `contact.php` checks everything again on the server, then emails the villa. The email's Reply-To is the guest, so the owner can reply directly.
- Spam protection: a hidden honeypot field, a limit of 5 enquiries per hour from one connection, and length limits on every field.
- Without JavaScript the form still works: the page reloads and shows the result.

## Run it locally

```bash
php -S localhost:8000
```

Then open http://localhost:8000. Emails won't actually send on most computers unless `mail()` is set up.

## Contact details used on the site

- Phone and WhatsApp: +94 77 7 327 993
- Instagram: https://www.instagram.com/mik_zid_villa_/
- Facebook: https://www.facebook.com/share/14uth8M7kW4/
