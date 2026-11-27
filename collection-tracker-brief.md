# Collection & Sales Tracker: build brief for Claude Code

Read this whole file before doing anything. It sits in the project folder next to my starting data file:

- `collection-tracker-brief.md` (this file)
- `Thrilljoy Starting Data for Claude Code - Greg.xlsx` (my real inventory, listings and sales)

## 1. The goal

Build me a private web app that is the single home for my Thrilljoy PIX! figures, and later my Funko Pops. It must answer these questions in seconds, on my phone or my computer:

- What do I own, how many copies, and whose are they?
- Which copies are for sale, and which are in my personal collection or Kaitlyn's?
- Is this figure listed anywhere right now, so I never double-list or forget to take a listing down?
- Where is the physical copy stored?
- What have I spent, what have I sold, and what did I actually make?

About me:

- I'm Greg. I collect and resell. My partner Kaitlyn collects too.
- I sell on eBay and Vinted today.
- I use my iPhone most, often in a store or in the middle of a sale, and a computer sometimes.
- **I have zero coding experience.** You do all the building, and you will keep maintaining this app for me after launch.

The app has to be sleek and easy, and above all functional. If a design choice trades usefulness for looks, pick usefulness.

## 2. How to work with me

- Use plain language. No jargon, or explain a term the first time you use it.
- Before writing code, ask me the questions you still need answered, then show me a short plan and wait for my OK.
- Build in stages (section 13). Get a basic version live on the internet with login early, then add one stage at a time so I can try each on my phone.
- Walk me through every account I need to create and every setting, one step at a time. Tell me what each thing costs before I sign up.
- Never ask me to paste passwords or secret keys into the chat. Tell me which file or dashboard they go in.
- Show me changes on a preview before they replace the live app.
- When something is my call (cost, a trade-off, how a screen should work), ask me. When it is a technical detail, decide and tell me in one line.

### This is an ongoing project

I will keep coming back with new requests in plain English, such as "add a filter for Kaitlyn's collection" or "the sold screen is confusing". Set the project up for that from day one:

- Create a `CLAUDE.md` file in the project. Keep in it: what this app is, the standing rules from this brief, the design and data model as built, how to run, test and deploy, and a dated log of every change. Read it at the start of every session and update it at the end, so I never have to re-explain the project.
- Keep all code in version control and back it up to a private GitHub repository. Every change must be undoable.
- Write automated tests for all the money maths and for the import, and run them before every deploy.
- Keep a `README.md` that explains, for a non-coder, how to back up and restore my data.
- Never delete or overwrite my real data when changing the app. Back up before any change to how data is stored.

## 3. Hosting, login and privacy

- A hosted web app at a web address I can open from any device. Design for a phone screen first, and make it work well on a computer too.
- Make it installable to my iPhone home screen so it opens like an app.
- Login is required for every page. **I am the only user: one account, mine.** No public sign-up. Kaitlyn does not log in; she is a label on copies.
- Suggested stack: Next.js on Vercel, with Supabase for the database, login and (later) photo storage. This is a suggestion only. Check current free-tier limits and terms, tell me the expected monthly cost, and recommend something else if it fits better. I'm aiming for free or a few dollars a month, and I never want to maintain a server.
- All data and photos stay private. No public file links.
- Automatic database backups, plus a one-button export of all my data to CSV.

## 4. Scope at launch

- **Thrilljoy PIX! only.** I'm still inventorying my Funko Pops (500+ items across both brands eventually). Build everything so Funko is added later as a second brand without rebuilding: keep a Brand field, and make Funko-only fields (box number) optional.
- **Photos are a later stage.** I haven't taken them yet. Leave room for photos on every figure and every copy in the design now.
- **Barcode scanning is a later stage.** Add a barcode (UPC) field to every release now.

## 5. What to track

The core idea: **track every physical copy, not just every figure.** Two copies of the same figure can have different owners, conditions, storage places and costs.

### Release

One Thrilljoy product. A release contains a Hero figure and a Chase figure, sold as a blind box.

- Official Thrilljoy release name, license, edition size.
- Exclusive or sticker (retailer or event), barcode (optional), link to the Thrilljoy page, notes.

### Figure

One specific figure: a Hero or a Chase within a release. This is what I search for.

- Name, variant, the release it belongs to, how to tell it apart, other names I use for it.
- Variant list (editable in Settings): Hero, Chase, Rare Chase. Thrilljoy has a regular 1-in-6 Chase and much rarer numbered chases; every Chase in my starting data is the regular one.
- Hero and Chase of the same release are paired automatically. Show on each figure whether I hold its partner, and in which bucket.
- Optional: my estimated market value and the date I last checked it. I enter this by hand. No automatic price lookups.
- My target list price and my floor price.
- Saved listing text (see section 8).
- Tags (see section 6).
- Room for photos (later stage).

### Copy

One physical item I can hold. If I own 5 Draco Malfoy Chases, that is 5 copies under one figure.

- **Owner:** For sale, Greg's collection, or Kaitlyn's collection. Changing it takes one tap.
- **Variant known?** A copy can be a sealed blind box whose variant is unknown. It belongs to a release but not yet to a figure. Give it a "Reveal" action where I pick Hero or Chase.
- **Storage location:** an editable list. Today it is Bag 01 to Bag 06 for for-sale copies.
- **Condition, per copy:** in box or loose (no box); has sleeve; has Certificate of Authenticity card; in a protector; flaw yes or no; a free-text condition note (for example "small tear on the side of the box").
- **Cost paid:** optional and typed in by me. See the money rules.
- **Status:** on its way to me, in hand, sold, shipped. "Listed" is worked out from listings, not typed.
- Room for photos of this specific copy (later stage), for showing a flaw.

Adding a figure with quantity 12 creates 12 copies in one step. Lists show copies grouped with counts. I should only have to deal with a single copy when it differs from the others.

### Purchase

- Date, where I bought it, total paid including tax and shipping, and which copies it covers.
- One purchase can cover many copies (for example 8 blind boxes in one receipt). Split the cost evenly by default and let me adjust per copy.

### Listing

- Platform (eBay and Vinted now; the list is editable so I can add Whatnot, Mercari and others).
- Status: draft, live, ended, sold.
- Price, floor (auto-decline amount), quantity, link or listing ID, date listed.
- The figures and copies attached to it, and an optional reminder date with a note.

### Sale

- Date, platform, copies sold, sale price, shipping the buyer paid, label cost, platform fee, net.
- Buyer username, order number, notes, and status (to ship, shipped, complete, refunded).

### Expense

Supplies such as protectors, boxes, bubble wrap and tape: date, description, amount.

### Hunt list

Figures I want: target price, maximum price, notes. Simple list. Build it last.

## 6. Search and tags

The app is driven by tags and fast search.

- One search box, reachable from every screen. It matches figure name, other names, release name, license and tags, and it tolerates typos.
- **Automatic tags** come from the data and need no typing: brand, license, variant, exclusive or sticker, owner, storage location, where it's listed, flaw, no sleeve, loose, sealed.
- **Custom tags** I can add to any figure or copy, such as "horror", "holiday", "keep for now".
- Tapping any tag anywhere filters to it. I can combine tags (for example: For sale + Chase + not listed).
- Let me save filter combinations I use often.

## 7. Key behaviours

- **Listed badge everywhere.** Every figure row shows where it's listed, such as "eBay", "Vinted" or "eBay + Vinted", with the count. This is how I avoid double listings.
- **Double-listing warning.** When I create a listing for a figure, show what is already listed and how many for-sale copies are still unlisted. Warn me if I try to list more copies than I have free.
- **Two sites at once.** I may list one copy on eBay and a different copy of the same figure on Vinted. I may also list the very same copy on both. Support both.
- **Take-down task.** When I mark a copy sold and it is still attached to another live listing, create a "Take this down" task with the link. Keep it on the home screen until I tick it off.
- **Multi-quantity listings.** One eBay listing can have a quantity of 4. Each sale reduces it by one.
- **Sets.** One listing can hold two or more different figures, such as a Hero + Chase set. Those copies are reserved. Warn me if I try to sell one separately.
- **Which copy ships.** A listing is attached to a figure and a quantity. When identical copies exist, I don't care which one ships. When I mark a sale, show me the matching copies with their storage locations and let me pick the one I pulled. Copies with a flaw are never picked automatically.
- **At-a-glance counts.** For each figure: how many I own, how many in each bucket, how many listed and where, how many for sale but not listed.
- **Home screen reminders.** Take-down tasks, sales waiting to ship, for-sale copies not listed anywhere, listings older than a number of days I set, and listing reminder dates that have arrived.
- **Moving buckets** takes one tap. If the copy is listed and I move it into a collection, warn me to end the listing.
- **History is kept.** Sold copies and ended listings are never deleted.

## 8. Saved listing text

For each figure, let me store the text I reuse when listing, each with a copy button:

- eBay title (80 characters maximum; show a counter).
- eBay description (HTML).
- Vinted title and description.
- List price and floor for each platform.
- Package weight and size. My usual presets, editable in Settings: single Hero, 14 oz, 9 x 6 x 6 in; single Chase in a protector, 1 lb 8 oz, 10 x 8 x 6 in; two-figure set, 2 lb 8 oz, 12 x 10 x 6 in.

## 9. Money rules

**Net for a sale** = sale price + shipping the buyer paid - platform fee - label cost - any other cost.

**Fee presets**, editable in Settings. I can always type the real fee on any sale.

- eBay: 13.6% of the buyer's total (item + shipping + sales tax) plus $0.40 per order. I usually won't know the tax, so estimate it with a default tax rate I can set, or let me enter the actual fee.
- Vinted: 0% for the seller.
- Other platforms: a percentage I set.

**Purchase price is manual and optional.** I don't know what I paid for many older copies, and I'm only now starting to track it.

- Never fill in a default cost and never nag me for one.
- A blank cost means unknown. It never means zero.
- When a copy has a cost: profit = net - cost.
- When a copy has no cost: label it "cost unknown" and keep it out of the profit figure.
- If I add or change a cost later, every total recalculates.

**Money dashboard.** Show these as separate lines, so missing costs never blur the real profit:

- Total net received.
- Profit on copies with a known cost.
- Proceeds from copies with cost unknown.
- Supply expenses.
- Bottom line.
- How complete the costs are, such as "38 of 226 copies have a cost entered".

**Over time**

- Show the dashboard by month and by year, with a chart.
- Filter by platform, brand and bucket.
- Money spent on purchases per month.
- If I have entered estimated values: the value of unsold for-sale stock and of each collection.

**Refunds.** A refund reverses the sale and puts the copy back in inventory.

All amounts are US dollars and must be stored exactly, with no rounding drift.

## 10. Starting data

Load `Thrilljoy Starting Data for Claude Code - Greg.xlsx`. It is clean and checked. Its "Read me" tab explains every tab and column; read that tab first.

| Tab | What it holds | Rows |
|---|---|---|
| Releases | One row per Thrilljoy release | 89 |
| Figures | One row per Hero or Chase | 110 |
| Copies | One row per physical copy owned today | 226 |
| Listings | Live eBay and Vinted listings | 26 |
| Sales | Thrilljoy sales so far in 2026 | 17 |

How the tabs link: `Copies.Figure ID` -> `Figures.Figure ID` -> `Figures.Release ID` -> `Releases.Release ID`. Listings and Sales point at Figure IDs.

Import rules:

- Columns whose header ends in "(calculated)" are spreadsheet formulas for my own checking. Do not import them. Work the same numbers out from the data.
- `Cost paid` is blank on every copy on purpose. Import it as unknown.
- `In a protector` is blank on every copy. Import it as unknown.
- Two copies are sealed blind boxes: Variant is "Unknown (sealed blind box)" and Figure ID is blank. They have a Release ID only.
- `Owner` is one of: For sale, Greg's collection, Kaitlyn's collection.
- `Storage location` is Bag 01 to Bag 06, or blank for the two collections.
- The figure "Kara Thrace (Chase)" has no copies. It exists only because one was sold.
- Listings link to figures, not to specific copies. On import, reserve the listed quantity against that figure's for-sale copies without choosing which physical copy, and never reserve a flawed copy unless the listing's Note says so.
- For a "Hero + Chase set" listing, the quantity applies to each of its two figures.
- Sales are history. The sold copies are not in the Copies tab. Record each sale so it shows under its figure and counts in the money totals.
- eBay data was checked live on Nov 26, 2026. Vinted data comes from screenshots taken Nov 25, 2026 and may be out of date. After the import, show me a one-time "review these" screen for the Vinted listings so I can correct them.
- The "Read me" tab lists a few open items under "Still open: confirm with Greg". Ask me about them once.

**After importing, prove it worked.** Show me these numbers from the app and confirm each matches:

| Check | Expected |
|---|---|
| Copies in total | 226 |
| For sale / Greg's collection / Kaitlyn's collection | 146 / 55 / 25 |
| For sale by variant: Hero / Chase / sealed | 109 / 35 / 2 |
| Bag 01 to Bag 05, each | 26 |
| Bag 06 | 16 |
| Copies with a flaw | 5 |
| Boxed copies without a sleeve | 5 |
| Loose figures with no box | 2 |
| Figures / releases | 110 / 89 |
| Live listings (eBay / Vinted) | 26 (14 / 12) |
| Units on a live listing (a set counts as two) | 44 |
| For-sale copies not on any listing | 102 |
| Sales | 17 |
| Net earnings from those sales | $501.51 |

Also build an import screen that accepts a spreadsheet in this same layout, so I can load my Funko Pops later and add big batches without typing.

## 11. Screens

- **Home:** take-down tasks and reminders, this month's net and profit, and the quick buttons.
- **Quick buttons, reachable from anywhere:** Add figure or copies, Log purchase, Create listing, Mark sold. Mark sold should take about three taps: pick the listing, confirm the price, pick the copy. Prefill the fee.
- **Catalogue:** search and tags. Grouped by figure with counts and listed badges. Filter by owner, variant, license, storage location, listed or not, platform.
- **Figure page:** details, its Hero or Chase partner, every copy with its condition and location, listings, sale history, saved listing text, value, and (later) photos.
- **Listings:** everything drafted or live, by platform, with how long it has been up.
- **Not listed:** for-sale copies that aren't on any listing. This is my to-do list for listing.
- **Sales** and **Purchases:** logs I can edit.
- **Collections:** Greg's and Kaitlyn's, each as its own view.
- **Money:** the dashboard in section 9.
- **Hunt list.**
- **Settings:** platforms and fee presets, default tax rate, storage locations, variants, package presets, reminder thresholds, import, export, my account.

## 12. Later stages (do not build at launch, but design for them)

**Photos**

- Upload several photos per figure and per copy, straight from my iPhone camera or photo library.
- Download one photo or all photos for a figure as a zip, on any device. On iPhone, offer the share sheet so I can save to Photos.
- A bulk "unsorted" inbox: I upload a big batch, then tap to assign each photo to a figure or copy.
- Convert HEIC to JPEG on upload. Make small thumbnails for lists.
- Default to listing quality (about 1600 pixels on the longest side). Before building, tell me what keeping full-size originals would cost in storage and let me choose.
- Let me pick the main photo, reorder and delete. Photos stay private behind the login. Show me storage used and the limit.

**Barcode scanner**

- Scan a box with the phone camera to pull up my own record: do I own it, how many, whose, is it listed.
- A barcode identifies the release, not Hero or Chase. The first scan of a new release asks me to link it; after that it's instant.

**Funko Pops**

- Load my Funko inventory through the import screen. Funko needs a box number and has no Hero and Chase pairing.

**eBay sync**

- Import my eBay listings and sales automatically through eBay's official API. Vinted has no public API and stays manual.

## 13. Build order

1. Questions, plan and data model. Wait for my OK.
2. Accounts and hosting. A live, login-protected app with nothing in it yet.
3. Releases, figures and copies, plus the import of my starting data. Prove the counts in section 10.
4. Catalogue, search and tags. Figure page. Collections.
5. Listings, the listed badge, the double-listing warning, and the "Not listed" view.
6. Sales, mark sold, take-down tasks, home screen.
7. Purchases, expenses and the money dashboard.
8. Saved listing text. Export and backups. Import screen.
9. Hunt list.
10. Later stages, one at a time, when I ask.

## 14. Not in version one

- No automatic syncing with eBay or Vinted, and no automatic price lookups.
- No photos and no barcode scanning yet (section 12).
- No public pages, no sharing and no other users.
- No tax features beyond a yearly CSV export of sales.

## 15. Done means

1. I can log in on my iPhone and my computer and see the same data. Nobody else can.
2. My starting data is loaded and every number in the section 10 table matches.
3. I can find any figure in a few seconds by name, license or tag.
4. Each figure shows how many copies I have, whose they are, where they're stored, and where they're listed.
5. Two copies of the same figure can have different owners, conditions and costs.
6. Creating a listing for something already listed warns me first.
7. Marking a cross-listed copy sold creates a take-down task.
8. A sale with a known cost shows the right profit. A sale without one shows as proceeds. Adding the cost later updates the totals.
9. I can export everything to CSV, and backups run automatically.
10. The money tests and import tests pass.
11. `CLAUDE.md` exists and is up to date, so a new session can pick up the project without me re-explaining it.
