# Volt landing page

Static site (no build step): `index.html`, `styles.css`, `main.js`, `assets/`.
Preview: `python3 -m http.server 5500 --directory landing`.

Waitlist forms POST to `${VOLT_API}/v1/waitlist` (set at the bottom of `index.html`;
defaults to `http://localhost:8080`). Sign-ups appear in the admin dashboard → Waitlist.
Replace `hello@volt.example` and set your real domain in the Open Graph tags before launch.
