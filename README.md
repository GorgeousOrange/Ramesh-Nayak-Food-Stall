# Ramesh's Street Kitchen website

A responsive, static website (plain HTML, CSS and JavaScript, no build step) for the IDT persona Ramesh Naik. Ready for GitHub Pages.

## Files
- `index.html` - page structure and content
- `style.css` - responsive styling
- `script.js` - settings, menu scroller, copy-address and the feedback form
- `assets/` - square menu photos (`sandwiches`, `rolls`, `pav-bhaji`, `patties`, `choris-pav`, `chai`)

## What's on the page
- **Hero** with the "MADE WITH CARE" decal
- **Menu**: horizontal scroller (swipe on phones, arrow buttons or arrow keys on desktop) with Sandwiches, Rolls, Pav Bhaji, Patties, Choris Pav and Tea
- **About**: written in Ramesh's own voice (first person)
- **Find us**: BITS Goa, D'Spine, Goa, India with a Google Maps directions link, a copy-address button, and a "You can also find us on Zomato and Swiggy" block
- **Feedback** (the main feature): visit details, overall star rating, food, service, cleanliness and open-ended questions, with a progress bar and a thank-you screen

## Indicative prices
Prices are estimates, not confirmed prices from a real stall. They were set by comparing street-food and canteen prices found for Goa (for example, pav bhaji around Rs 80 to 90 in Panjim, tea around Rs 20 and sandwiches around Rs 50 at a Goa government canteen, typical veg snacks Rs 20 to 60):

| Item | Price |
|---|---|
| Sandwiches | Rs 60 |
| Rolls | Rs 80 |
| Pav Bhaji | Rs 90 |
| Patties | Rs 30 |
| Choris Pav | Rs 70 |
| Tea | Rs 20 |

To change them, edit the `<b>` price inside each `menu-card` in `index.html`.

## Things to verify before treating this as a real business site
- **Location**: the address is a campus-area address. The map panel is an illustration, not a real pin. Confirm the exact stall spot.
- **Zomato / Swiggy**: the buttons currently open each platform's home page (Zomato's Goa page). No listing for this stall has been verified. Put real listing URLs in the `STALL` object in `script.js`, or remove the block.
- **Opening hours and phone**: set to 4 PM till midnight and +91 82619 67763. Edit `openingHours`, `phoneDisplay` and `phoneHref` in `script.js` (the footer line is in `index.html`).

## Feedback form: demo vs real
Out of the box the form is a **demo**. It validates answers and shows a thank-you screen, but **nothing is sent or stored**, and the page says so. To collect real feedback:
1. Create a free form at https://formspree.io (or use another form service/serverless endpoint that accepts JSON).
2. Paste its URL into `FEEDBACK_ENDPOINT` at the top of `script.js`.
3. Submit a test response and check that it arrives.

Once an endpoint is set, the demo notices switch off automatically. Do not put private API keys in frontend code. Also update the grey note under the submit button in `index.html`.

## Preview locally
Open `index.html` in a browser, or run `python3 -m http.server 8000` and visit http://localhost:8000.

## Publish with GitHub Pages
1. Create a new GitHub repository, e.g. `ramesh-street-kitchen`.
2. Upload `index.html`, `style.css`, `script.js`, `README.md` and the `assets` folder to the repository root.
3. Open **Settings > Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`, then save.
6. Wait for deployment and open the URL shown in Pages settings.
