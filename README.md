# Neighbourhood — multi-vendor food + feedback platform

This is the Node.js server version of the Neighbourhood local-food directory. It includes the two starter vendor pages automatically: Ramesh Naik's full Street Kitchen page and Prakash's full Food Stall page. You do **not** need to run a separate seed command or manually add either vendor.

## Included

- Main directory at `/`, automatically populated with Ramesh and Prakash on first server start.
- Full vendor websites at `/v/ramesh-naik-street-kitchen` and `/v/prakashs-food-stall`, based on the supplied original Ramesh layout.
- Original six Ramesh menu photos and starter menu items. Prakash's page is intentionally a placeholder until his real menu, photos and details are supplied.
- Customer feedback questionnaire saved to SQLite and associated with the correct vendor.
- Vendor portal at `/vendor/login` for editing page details, menu items, prices and photos, and reviewing feedback.
- Admin portal at `/admin/login` for managing vendors, visibility, vendor passwords and feedback export.

## Run on macOS

Use Node.js 22 LTS (recommended for the included SQLite native module). In Terminal, enter the project folder and run:

```bash
npm install
npm start
```

The first start automatically creates both starter vendor records and Ramesh's six menu items. No `npm run seed` command is needed.

Open `http://localhost:3000/setup` and create the first admin account. This setup page closes after the first admin is created. Then sign in at `http://localhost:3000/admin/login`.

In the admin dashboard, use **Reset password** for each starter vendor before sharing their login details. Their initial login IDs are:

- Ramesh: `ramesh@neighbourhood.local`
- Prakash: `prakash@neighbourhood.local`

The starter passwords are intentionally random and not printed or hard-coded. Set a new password from the admin dashboard.

## Important URLs

- Main directory: `http://localhost:3000/`
- Ramesh's full page: `http://localhost:3000/v/ramesh-naik-street-kitchen`
- Prakash's full page: `http://localhost:3000/v/prakashs-food-stall`
- First admin setup: `http://localhost:3000/setup`
- Admin login: `http://localhost:3000/admin/login`
- Vendor login: `http://localhost:3000/vendor/login`

## Data storage

- Main database: `data/neighbourhood.sqlite`
- Session database: `data/sessions.sqlite`
- Vendor-uploaded images: `public/uploads/`
- Starter Ramesh images: `public/assets/`

Do not delete the `data` folder if you want to keep existing admin accounts, vendors, menu edits and customer feedback. Back up the database and uploaded photos regularly.

## Before public deployment

This is a local development starter, not a completed security/compliance review. Before accepting real customer data, set a unique `SESSION_SECRET` (32+ characters), use HTTPS and persistent storage, back up the database and uploads, add a privacy/data-retention process, and test role permissions and moderation. Confirm Ramesh's real address, phone, hours, menu prices and ordering links before publishing; some starter values are assumptions from the prototype. Confirm Prakash's actual business details before publishing his page as complete.

GitHub Pages cannot run this backend. Deploy the Express app to a Node-capable host with persistent disk storage (for example Render, Railway, Fly.io or a VPS).
