# Collectables Tracker — project notes for Claude

Read this whole file at the start of every session. Update it (and add a line to the change log at the bottom) at the end of every session that changes anything.

## What this is

A private web app that is the single home for Greg's Thrilljoy PIX! figures (and later his Funko Pops): what he owns, how many copies, whose they are, where each is stored, where each is listed, and what he has spent and made.

- **Owner and only user:** Greg. He collects and resells on eBay and Vinted. His partner Kaitlyn also collects; she is a *label on copies*, not a user.
- **Greg has zero coding experience.** Claude does all building and maintenance. Greg uses his iPhone most (often mid-sale or in a store), a computer sometimes.
- **The full specification** is `collection-tracker-brief.md` in this folder. It is the source of truth for behaviour. Re-read the relevant section before building a stage.
- **Starting data:** `Thrilljoy Starting Data for Claude Code - Greg.xlsx`. Its "Read me" tab explains every tab and column.

## How to work with Greg (standing rules)

1. Plain language. No jargon, or explain a term the first time it is used.
2. Before writing code for a new stage: ask the questions still needed, show a short plan, wait for his OK.
3. Build in stages (brief section 13), one at a time, so he can try each on his phone.
4. Walk him through every account and setting **one step at a time**, and say what each thing costs **before** he signs up.
5. **Never ask him to paste a password or secret key into the chat.** Tell him which file or dashboard it goes in. He creates accounts and types passwords and verification codes himself.
6. Show changes on a **preview address** before they replace the live app. Wait for his OK to go live.
7. If it is his call (cost, a trade-off, how a screen should work): ask. If it is a technical detail: decide and tell him in one line.
8. Usefulness beats looks whenever they conflict.
9. **Never delete or overwrite his real data** when changing the app. Take a backup before any change to how data is stored.
10. Every change must be undoable: commit to git, push to the private GitHub repository.
11. Run `npm run check` (lint + tests + build) before every deploy. Never deploy with a failing test. Deploy only with `npm run deploy:preview` / `npm run deploy:live`, never by calling wrangler directly.
12. Keep him informed during long jobs. He asked "What's going on?" when a session went quiet for a long stretch (2026-11-26).

## Decisions already made (do not re-ask)

| Topic | Decision | When |
|---|---|---|
| Hosting | **Cloudflare** (Workers static assets, free plan). Greg chose it over Vercel because Vercel's free plan terms say "personal or non-commercial use". | 2026-11-26 |
| Database, login, later photos | **Supabase**, free plan. | 2026-11-26 |
| Monthly cost target | $0 (free or a few dollars at most; never a server to maintain). | 2026-11-26 |
| App type | A single-page app that runs in the browser and talks straight to Supabase. No server code of our own. Chosen so search is instant and the host can be swapped without a rebuild. | 2026-11-26 |
| Login | One account, email + password, created by hand in the Supabase dashboard. The app has no sign-up screen. Public sign-up **must be switched off in Supabase** when the project is created (see the setup checklist; not done until ticked there). | 2026-11-26 |
| Deploying | From this Mac with wrangler (`npm run deploy:preview`, then `npm run deploy:live`). Not connected to GitHub builds: fewer accounts linked, fewer permissions granted. | 2026-11-26 |
| Money | Stored as whole cents (integers). Blank cost = unknown, never zero. | 2026-11-26 |
| Nightly backup timing | Set up at the **end of stage 3**, as soon as real data is in the database (earlier than the brief's stage 8), because rule 9 needs a backup to exist before stages 4 to 7 change how data is stored. The CSV export button stays in stage 8. | 2026-11-26 |
| Sold history on import | The 18 sold units (17 sales) become "sold" copies with cost unknown. They are *not* part of the 226 owned copies. | 2026-11-26 |
| Cross-listed figures on import | Nine figures are on both eBay and Vinted. Import each listing as its own copy (matches the brief's 44 listed units / 102 not listed). The one-time Vinted review screen lets Greg mark any that are really the same copy. | 2026-11-26 |
| Undated Vinted sales | The four Vinted sales have no date. Show them in a "date not recorded" group until Greg fills them in on the review screen. | 2026-11-26 |
| eBay listing 287751723503, The Flash (Chase), "Box Wear" | Greg confirmed it **is** the flawed Bag 05 copy (C-0123, slight tear on the inner box). Attach the listing to that copy on import. | 2026-11-26 |

### Still open with Greg (ask once, do not nag)

- **Should the starting spreadsheet be backed up to GitHub?** It holds real eBay buyer usernames and order numbers. Until he answers it is kept **off** GitHub (ignored by name in `.gitignore`); the copy in this folder is the only one, so he should keep his own copy (iCloud or external drive). If he says no for good, the stage 3 import tests still read the local file, and a new computer will need the spreadsheet copied over by hand.
- Edition sizes for Batgirl, George Jetson, Art the Clown (syringe) and Cylon Centurion are blank. Leave blank unless he supplies them.
- Lucky Cat (Chalice Collectibles Exclusive) is not on thrilljoy.com. Keep the name "PIX! Lucky Cat" unless he says otherwise.
- Whether each copy is in a protector was never recorded. Import as unknown.

## Build stages (brief section 13)

| # | Stage | Status |
|---|---|---|
| 1 | Questions, plan and data model | Done 2026-11-26 (Greg approved) |
| 2 | Accounts and hosting: a live, login-protected app with nothing in it | **In progress.** App built, reviewed and tested on this Mac; first version committed locally. Not online. Waiting on Greg's GitHub, Supabase and Cloudflare accounts (checklist below). |
| 3 | Releases, figures, copies; import the starting data; prove the section 10 counts; **switch on the nightly backup** | Not started |
| 4 | Catalogue, search and tags. Figure page. Collections | Not started |
| 5 | Listings, listed badge, double-listing warning, "Not listed" view | Not started |
| 6 | Sales, mark sold, take-down tasks, home screen | Not started |
| 7 | Purchases, expenses, money dashboard | Not started |
| 8 | Saved listing text. CSV export. Import screen | Not started |
| 9 | Hunt list | Not started |
| 10 | Later stages (photos, barcode scanner, Funko, eBay sync), one at a time, when asked | Not started |

"Done" for the whole project is defined in brief section 15.

## How the app is built

- **Language and tools:** TypeScript 7, React 19, Vite 8 (build tool), Tailwind CSS 4 (styling), React Router 8 (screens; import from `react-router`, there is no `react-router-dom` any more), supabase-js 2 (database and login), Vitest 5 (tests), oxlint (code checks; ESLint's TypeScript plugin does not support TypeScript 7 yet), wrangler 4 (Cloudflare deploys). These are all newer than most online examples; read the installed package or the official docs instead of trusting memory.
- **No service worker** (the piece that would make the app work offline). Left out on purpose: it is not needed for the iPhone home-screen install, and it is the usual cause of "my app is showing an old version".
- **"A new version is ready" notice instead.** Every build gets a unique id (`__BUILD_ID__`, a timestamp) and writes it to `/version.json` (the `buildId` plugin in `vite.config.ts`). The running app re-reads that file when opened or brought to the front (`src/lib/version.ts`, `src/components/update.tsx`) and shows an "Update now" button when it differs. A home-screen app has no reload button, so do not remove this.
- **Build-time settings guard.** `vite.config.ts` runs `src/lib/build-guard.ts` on every build. It stops the build if any `VITE_…` setting holds a Supabase secret key or is not one of the two expected names. For deploy builds (`DEPLOY=1`, set by the deploy scripts) it also requires valid settings pointing at `https://….supabase.co` and refuses to run while any `.env.local`-style file exists.
- **Text colours pass WCAG AA contrast** (4.5:1) on every background in both light and dark. Re-check if tokens change.

### Folder map

| Path | What it is |
|---|---|
| `collection-tracker-brief.md` | Greg's specification. Do not edit. |
| `Thrilljoy Starting Data for Claude Code - Greg.xlsx` | His real starting data. Do not edit. Not in git (see "Still open"). |
| `index.html` | The single page. Holds the iPhone home-screen tags. |
| `src/main.tsx`, `src/App.tsx` | Start-up, and the **AuthGate**: nothing behind the login is drawn without a session. |
| `src/auth/` | Sign-in state (`AuthProvider`, `auth-context`), plain-language error messages (`messages`). |
| `src/screens/` | One file per screen: `Login`, `SetNewPassword`, `NotConnected`, `Home`, `Settings`. |
| `src/components/` | `AppShell` (title bar + navigation), `ui` (buttons, fields, cards), `update` (new-version notice). |
| `src/lib/money.ts` | **All money maths.** Whole cents only. Fully tested. |
| `src/lib/config.ts`, `src/lib/supabase.ts` | Reads and checks the two public Supabase values; the one shared database connection; password-reset link handling. |
| `src/lib/build-guard.ts` | The build-time settings check described above. |
| `src/lib/version.ts`, `src/lib/device.ts` | New-version check; "is this running from the home screen?". |
| `src/index.css` | Design tokens and base styles. Light and dark follow the device. The page colour is repeated in `index.html` (theme-color) and `public/manifest.webmanifest`, and the accent colour in `scripts/make-icons.mjs`: change those too, then run `npm run icons`. |
| `public/` | Icons, `manifest.webmanifest` (home-screen install), `_headers` (security rules), `robots.txt`. |
| `scripts/make-icons.mjs` | Redraws every icon. Run `npm run icons`. |
| `vite.config.ts` | Build settings, the build id and the settings guard. |
| `wrangler.jsonc` | Cloudflare settings: serve `dist/` as plain files, with preview addresses on. |
| `.env.example` | Shows the two settings the app needs. `.env` (real values) is created during setup. |
| `supabase/` | (From stage 3) database structure as numbered SQL files. |

### Security model (important)

- The **real lock is in the database**. Every table must have Row Level Security switched on **and** policies that compare a row's owner to the signed-in user: an `owner_id uuid not null default auth.uid()` column with policies `to authenticated using ((select auth.uid()) = owner_id)` (and the same `with check` for insert/update). **Never write a policy that only says `to authenticated`**: if sign-ups were ever switched on by mistake, any stranger who signed up would then see everything. Do it in the same SQL file that creates the table.
- Since Supabase's 2026 change, a new table also needs an explicit `grant select, insert, update, delete on … to authenticated` (and `revoke all … from anon`), plus grants on any sequence or function it uses. A missing grant shows as error 42501 "permission denied".
- The login screen in the app (`AuthGate`) is for tidiness, not protection. Anyone can download the app's code; it contains no data.
- Only two Supabase values are in the app, both public by design: the project URL and the **publishable** key (`sb_publishable_…`). They live in the file named `.env`, which *is* committed (private repository), alongside `.env.example`. No other `.env.*` file may exist: `.env.local` silently overrides `.env` in every build made on this Mac, including published ones (the build guard blocks deploys while one exists).
- The Supabase **secret key** (`sb_secret_…`), legacy **service_role key** and **database password** must never appear anywhere in this folder, in the chat, or in the app. The build guard stops a build that contains one; `src/lib/config.ts` repeats the check in the running app as a second layer. This app needs no secret key at all. The database connection string for the nightly backup goes in GitHub's "Secrets" page only.
- "Sign out everywhere" revokes other devices' ability to renew their sign-in; a device already open keeps working until its current pass runs out (up to one hour, Supabase's default). The on-screen text says "within the hour". There is no change-password screen: the route is "Forgot password?" on the sign-in screen.
- Password-reset emails on the free plan come from Supabase's built-in mailer: **2 emails an hour, and only to addresses that are members of the Supabase organization.** So the app login email must be the same email Greg's Supabase account uses. The dashboard has no "set password" button for an existing user; reset email is the only route. On iPhone the email link always opens in Safari, never in the home-screen app; the screens tell him to go back to the app and sign in with the new password.
- Search engines: kept out by the `X-Robots-Tag: noindex` header in `public/_headers` and the matching tag in `index.html`. `robots.txt` deliberately *allows* fetching, because a blocked crawler never sees "noindex". None of this makes an address private; the login does.
- No public file links, ever. Photos (later) go in a private storage bucket and are shown with short-lived signed links.

### Data model (plain language; SQL arrives in stage 3)

- **Release** → has one or two **Figures** (Hero, Chase). Hero and Chase of the same release pair automatically.
- **Figure** → has many **Copies**. A sealed blind box is a copy attached to a release with no figure until "Reveal".
- **Copy** → owner (For sale / Greg's collection / Kaitlyn's collection), storage location, condition (boxed or loose, sleeve, certificate card, protector, flaw yes/no, note), optional cost (blank = unknown), status (on its way, in hand, sold, shipped).
- **Listing** → platform, status (draft, live, ended, sold), price, floor, quantity, link/ID, date, reminder. Attached to one or more figures with a quantity, and optionally to specific copies. "Listed" is always *worked out* from listings, never typed.
- **Sale** → the copies sold, price, shipping the buyer paid, fee, label cost, net, buyer, order number, status.
- **Purchase** (one receipt, many copies, cost split evenly by default), **Expense**, **Hunt list item**, **Tags** (automatic + custom), **Tasks** (take-downs, reminders), **Settings lists** (platforms and fee presets, storage locations, variants, package presets, reminder thresholds).
- Keep a **Brand** field everywhere needed so Funko is a second brand later; Funko-only fields (box number) optional. Every release has an optional barcode (UPC). Leave room for photos on figures and copies.
- History is never deleted: sold copies and ended listings stay.

### Money rules (brief section 9)

- Net for a sale = sale price + shipping the buyer paid − platform fee − label cost − any other cost.
- Profit = net − cost, **only when the cost is known**. Blank cost → "cost unknown", kept out of the profit figure. Never fill in a default cost. Never nag for one.
- All US dollars, whole cents, no rounding drift.
- **Built and tested so far** in `src/lib/money.ts` (`money.test.ts`): reading and showing amounts (`toCents`, `formatCents`), exact adding (`sumCents`), net (`saleNet`), profit (`profit`), even split of a receipt (`splitEvenly`), and a percentage helper (`percentOf`).
- **Not built yet:** the fee presets. eBay: 13.6% of the buyer's total (item + shipping + sales tax) + $0.40 per order, with tax estimated from a default rate Greg sets, or he types the real fee. Vinted: 0%. Others: a percentage he sets. When stage 6 needs them, add them to `money.ts` **with tests first**. No money maths anywhere else.

### Numbers the import must reproduce (brief section 10)

Copies 226 · For sale / Greg's / Kaitlyn's 146 / 55 / 25 · For sale Hero / Chase / sealed 109 / 35 / 2 · Bag 01–05 26 each, Bag 06 16 · flawed 5 · boxed without sleeve 5 · loose 2 · figures / releases 110 / 89 · live listings 26 (eBay 14 / Vinted 12) · listed units 44 · for-sale not listed 102 · sales 17 · net $501.51.

All of these were recomputed from the raw spreadsheet on 2026-11-26 and match.

For reading `.xlsx` in stage 3: do not use the npm `xlsx` package (stuck at an old version with known vulnerabilities) or `exceljs` (unmaintained). Use `read-excel-file` from npm, or SheetJS from its own site saved into the project. Check current advisories first.

## Everyday commands

| Command | What it does |
|---|---|
| `npm install` | Fetches the building blocks (first time on a new computer). |
| `npm run dev` | Runs the app on this Mac at http://localhost:5173 for trying things out. This is **not** the preview Greg sees. |
| `npm test` | Runs the automated tests (money maths, settings checks, and from stage 3 the import). |
| `npm run check` | Lint + tests + full build. **Run before every deploy.** |
| `npm run deploy:preview` | Runs every check, then publishes to the **preview address** for Greg to try. Does not touch the live app. |
| `npm run deploy:live` | Runs every check, then **replaces the live app**. Only after Greg's OK on the preview. |
| `npm run icons` | Redraws the app icons. |

`npm run preview` is something else (a local look at the built files); do not show it to Greg as "the preview".

## Accounts and deployment

Facts below were read from the official docs on 2026-11-26 and fact-checked. Dashboards change; if a label is not where this says, look nearby and update this section.

### Stage 2 setup checklist

Tick each line as it is done and record the date. Greg does every sign-up, password and verification code himself.

**GitHub** (free; unlimited private repositories)
- [ ] Greg creates the account at github.com/signup and verifies his email.
- [ ] Greg creates a **private** repository named `collectables-tracker` at github.com/new (no README, no .gitignore, no license).
- [ ] With Greg's OK, Claude creates an SSH key on this Mac for this one repository; Greg pastes the **public** half at repository → Settings → Deploy keys → Add deploy key, with "Allow write access" ticked. (Chosen over installing the GitHub command-line tool: no download, and the key can reach only this one repository. Trade-off: anything else on GitHub, such as adding a secret, Greg does in the browser.)
- [ ] Set this repository's git email to Greg's GitHub no-reply address (shown at github.com/settings/emails; format `ID+username@users.noreply.github.com`). It is currently a placeholder, `greg@collectables-tracker.invalid`. Then push.
- [ ] Recommended: Greg turns on two-factor authentication (Settings → Password and authentication) and saves the recovery codes.

**Supabase** (free: 500 MB database, 1 GB files, no automatic backups, pauses after about a week without use)
- [ ] Greg signs up at supabase.com/dashboard/sign-up **with the email he will use to log in to the app** (see the mailer rule above). Password rules: 8 to 72 characters with an uppercase letter, a lowercase letter, a number and a symbol.
- [ ] Organization: any name, plan **Free**.
- [ ] Project: name `collectables-tracker`; "Generate a password" for the database and save it in his password manager at once (it is never shown again); region: the general Americas region. Under "Data access": leave **Enable Data API** on, **untick** "Grant API access to new tables automatically", **tick** "Enable RLS on new tables automatically". Leave Advanced Configuration alone.
- [ ] Authentication → Sign In / Providers → "User Signups": switch **off** "Allow new users to sign up". Leave "Allow anonymous sign-ins" off.
- [ ] Authentication → Users → Add user → Create new user: his email and a strong password he types himself, "Auto confirm user?" ticked.
- [ ] Greg copies the Project URL and the **Publishable** key (from the "Connect" button) into the file `.env` in this folder. Claude creates the file with two labelled blank lines and opens it for him. Never a key starting `sb_secret_` or a long one starting `eyJ`.
- [ ] After the first deploy: Authentication → URL Configuration → set "Site URL" to the live address and add it under "Redirect URLs" (plus `http://localhost:5173/**` for this Mac). Needed for password-reset links.
- [ ] **Verify sign-up is really off:** try one sign-up call with a made-up address and confirm Supabase refuses it. Then test "Forgot password?" once end to end.

**Cloudflare** (free: static files unlimited; preview addresses included)
- [ ] Greg signs up at dash.cloudflare.com/sign-up with **email and password** (not Google/Apple/GitHub: those accounts start without a password, which blocks some later steps) and verifies his email. No card is asked for at sign-up.
- [ ] Greg opens Workers & Pages and checks "Your subdomain": it becomes part of every address (`collectables-tracker.<subdomain>.workers.dev`) and may default to something based on his name or email. Change it before the first deploy if he wants.
- [ ] Claude runs `npx wrangler login --use-keyring` (stores the sign-in in the Mac's Keychain instead of a plain file); Greg approves in the browser window that opens.
- [ ] First publish: `npm run deploy:live` once (preview addresses only start working after one live deploy), then `npm run deploy:preview` for every later change.
- [ ] After the first deploy, open `/manifest.webmanifest`, `/version.json` and `/icons/apple-touch-icon.png` on the live address to confirm they are the real files (a missing file would silently return the app page instead of an error).
- [ ] Greg adds the app to his iPhone home screen: Safari → Share → Add to Home Screen → leave "Open as Web App" on → Add. He signs in once more inside the installed app. (The icon, name and status-bar style are fixed at the moment of adding; changing them later means removing and re-adding the icon, which also signs him out.)

### Things to know later

- **Preview and live addresses are public** (anyone with the link sees the login screen, nothing else). They can be put behind Cloudflare Access ("Protect all Workers" on the Workers & Pages overview) for free, but that needs Zero Trust set up, which asks for a payment card even though it is $0, and adds a second login for Greg. Not done; his call if he ever wants it.
- **Supabase pausing:** the project pauses after about a week of low activity. Greg gets a warning email first; using the app prevents it. If paused: dashboard → the project → "Resume project", within one year, with all data kept. It is **not confirmed** that the nightly backup job counts as activity, so do not rely on it to keep the project awake.
- **Nightly backup (end of stage 3):** a scheduled GitHub Actions job running `supabase db dump` through the **Session pooler** connection string (the direct connection is IPv6-only on the free plan and GitHub's machines are IPv4-only). Put the workflow in a **separate private repository** that holds only backups (so it never triggers anything else and dumps stay out of the app's history), with the connection string as that repository's secret `SUPABASE_DB_URL` (repository → Settings → Secrets and variables → Actions → New repository secret; Greg pastes it there, replacing `[YOUR-DATABASE-PASSWORD]`). Use `supabase/setup-cli@v3` with a pinned CLI version, schedule it at an off-peak minute (for example `17 3 * * *`), and make failures visible to Greg. Dumps contain his login email and password hash: private repository only. Dumps do not include stored files (photos, later).
- **If GitHub builds are ever connected to Cloudflare:** set `"packageManager": "npm@<version>"` to match this Mac (already in `package.json`), keep `"previews": {}` in `wrangler.jsonc`, and commit `wrangler.jsonc` first.
- **Custom domain later:** needs a domain active in Greg's Cloudflare account (roughly the price of the domain per year); then Worker → Domains → Add.

## Change log

| Date | What changed |
|---|---|
| 2026-11-26 | Stage 1: read brief and spreadsheet, verified every section 10 number, checked hosting terms and prices, Greg chose Cloudflare + Supabase, plan approved. |
| 2026-11-26 | Stage 2 (part 1): project created; login screen, password reset, empty Home and Settings (sign out here / everywhere), new-version notice, iPhone home-screen install files and icons, security headers, build-time settings guard, money maths library. 60 automated tests. Setup steps researched and fact-checked against today's official docs. Independent review (security, correctness, iPhone use, match to brief) run and its confirmed findings fixed. First commit made locally. Not yet online: waiting on Greg's accounts. |
