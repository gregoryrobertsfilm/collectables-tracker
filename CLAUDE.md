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
12. **At the start of every session, check the backups**: `git fetch origin backups` then `git log -1 --format=%cd origin/backups`. If the newest backup is more than two days old, tell Greg first and fix it before other work.
13. **Keep his part tiny.** On 2026-11-26 he said the multi-step setup was exhausting and asked Claude to do it through his Chrome instead. Do everything possible for him (he is happy for Claude to use the Chrome extension on Supabase, GitHub and Cloudflare); design each step so what is left for him is one paste or one click; never hand him a list of manual steps when Claude could do them. Claude still may not type or handle passwords, keys or other secrets: for those, open the right page, fill in everything else, and leave him the single paste.
14. Keep him informed during long jobs. He asked "What's going on?" when a session went quiet for a long stretch (2026-11-26).

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
| 2 | Accounts and hosting: a live, login-protected app with nothing in it | **Done 2026-11-26.** Live at https://collectables-tracker.collectables-tracker.workers.dev. Greg signed in on his Mac and iPhone; password reset tested. Loose ends: confirm he added the home-screen icon; make sure the latest commits are uploaded to GitHub (`git status -sb`). |
| 3 | Releases, figures, copies; import the starting data; prove the section 10 counts; **switch on the nightly backup** | **Nearly done.** Tables created and audited; Greg imported his spreadsheet on 2026-11-26 and the Starting data check showed all 14 section 10 numbers matching; that version is live. Nightly backup job written (`.github/workflows/backup.yml`) but **not running yet**: waiting for Greg to paste the one secret and upload; then run it once and confirm. |
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
| `src/screens/` | One file per screen: `Login`, `SetNewPassword`, `NotConnected`, `Home`, `Settings`, `Import`, `DataCheck`. |
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
| `supabase/migrations/` | Database structure as numbered SQL files. See "Changing the database structure". |
| `src/lib/import/` | Reads a spreadsheet in the starting-data layout (`parse.ts`), the section 10 check table (`checks.ts`), the browser file reader (`read-xlsx.ts`). `starting-data.test.ts` reads Greg's real spreadsheet and must reproduce every section 10 number; it is skipped, with a warning, on a computer that does not have the file. |
| `src/lib/inventory/stats.ts` | Works out all the at-a-glance numbers, including which for-sale copies are spoken for by listings. Runs on a spreadsheet and on the database alike. |
| `src/data/` | The only place that talks to the database: `inventory.ts` (read everything, save an import, plain-language errors), `useSnapshot.ts`. |

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

### Data model (as built in `supabase/migrations/0001_core.sql`)

Rules that are easy to get wrong:

- **"Listed" is computed, never stored** (`reserveForSaleCopies` in `src/lib/inventory/stats.ts`). A listing has figures (`listing_figures`: one, or two for a set) and a quantity. Specific copies are attached (`listing_copies`) only when it matters. A copy with a flaw is never counted as listed unless attached by hand. Sealed blind boxes (no figure) are never "listed".
- **Codes** (`R-001`, `F-001`, `C-0001`, `L-001`, `S-001`) come from the spreadsheet and are optional for records made in the app. Sold-history copies are `SOLD-<sale>-<n>`.
- `brands`, `platforms` and `storage_locations` names are unique ignoring capitals.
- A copy's figure must belong to the copy's release (composite foreign key); moving a figure to another release carries its copies along.
- The signed-in role cannot delete sales, sale_copies or import_runs (history is kept). Refunds will set a status, not delete.
- `sale_copies` allows a copy under more than one sale (a refunded copy can be sold again); the app must make sure at most one of those sales is un-refunded.
- The one-time Vinted review (brief section 10) is `needs_review = true` on Vinted listings and sales; the screen for it is built in stage 5.
- Reading tables: the database returns at most 1,000 rows per request; `fetchAll` pages through with a fixed order.

In plain language:

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
- [x] Greg creates the account at github.com/signup and verifies his email. (2026-11-26; username `gregoryrobertsfilm`)
- [x] Greg creates a **private** repository named `collectables-tracker` at github.com/new (no README, no .gitignore, no license). (2026-11-26)
- [x] Claude creates an SSH key on this Mac for this one repository (`~/.ssh/collectables_tracker_deploy`; this repository's git is set to use only that key); Greg pastes the **public** half at repository → Settings → Deploy keys → Add deploy key, with "Allow write access" ticked. (2026-11-26) (Chosen over installing the GitHub command-line tool: no download, and the key can reach only this one repository. Trade-off: anything else on GitHub, such as adding a secret, Greg does in the browser.)
- [x] Set this repository's git email to Greg's GitHub no-reply address (`361811936+gregoryrobertsfilm@users.noreply.github.com`) and push to `git@github.com:gregoryrobertsfilm/collectables-tracker.git`. (First push 2026-11-26.)
- [ ] Recommended: Greg turns on two-factor authentication (Settings → Password and authentication) and saves the recovery codes.

**Supabase** (free: 500 MB database, 1 GB files, no automatic backups, pauses after about a week without use)
- [x] (2026-11-26) Greg signs up at supabase.com/dashboard/sign-up **with the email he will use to log in to the app** (see the mailer rule above). Password rules: 8 to 72 characters with an uppercase letter, a lowercase letter, a number and a symbol.
- [x] (2026-11-26) Organization: any name, plan **Free**.
- [x] (2026-11-26; project "Collectables Tracker", ref `mtpsviwgvlvdoppbpivt`, organization "Gregory's Collectables"; the Data access boxes were **verified from inside the database**: the `ensure_rls` event trigger is on, and new tables get no select/insert/update/delete for `anon` or `authenticated` by default, only truncate/references/trigger/maintain, which every migration must revoke) Project: name `collectables-tracker`; "Generate a password" for the database and save it in his password manager at once (it is never shown again); region: the general Americas region. Under "Data access": leave **Enable Data API** on, **untick** "Grant API access to new tables automatically", **tick** "Enable RLS on new tables automatically". Leave Advanced Configuration alone.
- [x] (2026-11-26, seen off in the dashboard) Authentication → Sign In / Providers → "User Signups": switch **off** "Allow new users to sign up". Leave "Allow anonymous sign-ins" off.
- [x] (2026-11-26, one user present) Authentication → Users → Add user → Create new user: his email and a strong password he types himself, "Auto confirm user?" ticked.
- [x] (2026-11-26; Greg could not find the values in the Connect window and asked Claude to fetch them through his Chrome extension: URL from the project address, key from Project Settings → API Keys. `DEPLOY=1 npm run check` passes.) The Project URL and the **Publishable** key go into the file `.env` in this folder. Never a key starting `sb_secret_` or a long one starting `eyJ`.
- [x] (2026-11-26) First real sign-in works on this Mac (http://localhost:5173, Greg typed his own password, Home screen shown).
- [x] (2026-11-26, done by Claude through Greg's Chrome at his request, then re-read from the dashboard) Authentication → URL Configuration: "Site URL" is `https://collectables-tracker.collectables-tracker.workers.dev`; "Redirect URLs" are `https://collectables-tracker.collectables-tracker.workers.dev/**` and `http://localhost:5173/**`. Needed for password-reset links. If the live address ever changes, or reset links are wanted from preview addresses, update both.
- [x] **Verify sign-up is really off:** done 2026-11-26 without creating anything: Supabase's own public settings address (`/auth/v1/settings`, called with the publishable key) reports `disable_signup: true` and anonymous sign-ins off. Re-run that check after any change to Auth settings. "Forgot password?" tested end to end by Greg on the live address on 2026-11-26: it works.

**Cloudflare** (free: static files unlimited; preview addresses included)
- [x] (2026-11-26) Greg signs up at dash.cloudflare.com/sign-up with **email and password** (not Google/Apple/GitHub: those accounts start without a password, which blocks some later steps) and verifies his email. No card is asked for at sign-up.
- [x] (2026-11-26) Address name: Greg found this step confusing, so it was skipped. The first publish registered the subdomain `collectables-tracker` automatically, giving the live address **https://collectables-tracker.collectables-tracker.workers.dev** (no personal name in it). It can be changed in the Cloudflare dashboard under Workers & Pages → subdomain, but that changes the address, so only before he relies on it.
- [x] (2026-11-26) Claude runs `npx wrangler login --use-keyring --device`; Greg approves the short code in his browser (Firefox). **The plain `wrangler login` does not work from Claude's sandbox** (it cannot listen on localhost:8976 for the reply, so the browser shows "Unable to connect"); always use `--device`. The sign-in is stored encrypted with its key in the Mac's Keychain.
- [x] (2026-11-26) First publish: `npm run deploy:live` once (preview addresses only start working after one live deploy), then `npm run deploy:preview` for every later change. A brand-new address took about a minute before its security certificate worked.
- [x] (2026-11-26; all real files, security headers present, sign-in screen loads with no errors and can reach Supabase) After each deploy, open `/manifest.webmanifest`, `/version.json` and `/icons/apple-touch-icon.png` on the live address to confirm they are the real files (a missing file would silently return the app page instead of an error). When checking with `curl`, send a browser-style User-Agent: Cloudflare blocks default script User-Agents on workers.dev.
- [x] (2026-11-26) Greg signed in on the live address in Safari on his iPhone and reached Home.
- [ ] (not yet confirmed whether he added the icon) Greg adds the app to his iPhone home screen: Safari → Share → Add to Home Screen → leave "Open as Web App" on → Add. He signs in once more inside the installed app. (The icon, name and status-bar style are fixed at the moment of adding; changing them later means removing and re-adding the icon, which also signs him out.)

### Changing the database structure (migrations)

- Every change to tables is a numbered SQL file in `supabase/migrations/`, wrapped in `begin; ... commit;` so it applies completely or not at all, ending with `insert into public.schema_migrations (version) values ('NNNN_name');`. Never edit a file that has been applied; add a new one.
- **How they are applied:** through the Supabase dashboard SQL Editor in Greg's Chrome (he approved this for stage 3; ask again for later stages). No database password is needed. Steps that worked: open `https://supabase.com/dashboard/project/mtpsviwgvlvdoppbpivt/sql/new`; copy the file to the clipboard with `pbcopy < file`; click in the editor and paste with cmd+v; confirm the editor holds exactly the file by comparing a SHA-256 computed in the page (`window.monaco.editor.getModels()[0].getValue()`) with `shasum -a 256 file`; click Run; expect "Success. No rows returned". The editor runs as the `postgres` role, which bypasses row security (so backups can read everything).
- The SQL Editor tab then asks to confirm leaving because of the unsaved snippet. Nothing needs saving.
- **After every migration, audit the locks** (both were done for 0001/0002 on 2026-11-26): (1) in the SQL editor, check each table has `relrowsecurity` true, exactly one policy, and that `anon` has no privileges and `authenticated` has no TRUNCATE; (2) from this Mac, `curl` each table and each function through `https://mtpsviwgvlvdoppbpivt.supabase.co/rest/v1/...` with only the publishable key and confirm every one answers 401 "permission denied".
- **Take a backup before any migration that changes or removes existing columns or tables** (rule 9).
- Applied so far: `0001_core` (brands, storage_locations, platforms, releases, figures, copies, listings, listing_figures, listing_copies, sales, sale_copies, import_runs, schema_migrations), `0002_import_batch` (the all-or-nothing import function).

### Backups and restoring

**What runs:** `.github/workflows/backup.yml`, a GitHub Actions job in this repository, every night at 09:17 UTC and on demand (repository → Actions → "Nightly database backup" → Run workflow). It copies the database with the Supabase tool (`supabase db dump`, pinned version, three files: roles, structure, data), checks the copy holds the main tables, locks it (with the database password, see below), proves the locked file opens, and commits it to the **`backups` branch** as `backups/<year>/collectables-YYYY-MM-DD.tar.gz.enc`. Greg chose locked backups on 2026-11-26 because the data includes buyer usernames.

**One secret** (repository → Settings → Secrets and variables → Actions; Greg pastes it himself, never through chat): `SUPABASE_DB_PASSWORD`, the Supabase database password exactly as it is. The job builds the connection address itself (Session pooler, `postgres.mtpsviwgvlvdoppbpivt` at `aws-0-us-west-2.pooler.supabase.com:5432`; the direct address is IPv6-only on the free plan and GitHub's machines are IPv4-only) and converts any symbols in the password.

**The database password is also what locks each backup.** This was simplified on 2026-11-26 from a separate passphrase because Greg found the setup exhausting; it leaves him one thing to paste and nothing extra to keep. Consequences to remember:
- A backup can be opened only with the database password **that was in force the night it was made**.
- **Before the database password is ever reset:** have Greg keep the old one in his password manager (labelled with the date range it opens), then update the GitHub secret. Otherwise older backups can never be opened.
- If the password is lost entirely, existing backups cannot be opened by anyone; reset it in Supabase, update the secret, and backups work again from that night on.

**What a backup contains:** everything in the database, including the login email and password hash and buyer usernames. It does **not** contain stored files (photos, a later stage) and it is not a copy of the app's code (that is the `main` branch).

**Checking backups:** `git fetch origin backups && git log -3 --format='%cd %s' origin/backups && git ls-tree -r --name-only origin/backups | tail -5`. Failed runs email Greg from GitHub. It is not confirmed whether GitHub pauses scheduled jobs in a quiet private repository after 60 days; the session-start check (rule 12) is the safety net. It is also not confirmed that the nightly job counts as "activity" that stops Supabase pausing the project.

**Restoring** (never without Greg's go-ahead; it replaces data):
1. Take a fresh backup first (run the job by hand and wait for it to finish), so nothing entered since the last one can be lost.
2. Get the file: `git fetch origin backups && git show origin/backups:backups/2026/collectables-YYYY-MM-DD.tar.gz.enc > /tmp/restore.enc`.
3. Greg unlocks it himself in a Terminal panel, typing the database password when asked (it is not shown and never goes in chat): `openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -md sha256 -in /tmp/restore.enc | tar -xz -C /tmp/restore` (make the folder first). This works with the `openssl` built into his Mac. The options must match the job exactly.
4. Look at what is in `data.sql` and tell Greg what would change before doing anything.
5. Loading it back needs a database connection with the database password (psql or the Supabase tool; neither is installed on this Mac today) or, for a small fix, pasting the relevant rows through the dashboard SQL editor. Work out the least destructive route for the actual problem: usually restoring specific tables or rows, not the whole database. Supabase's own guide: https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
6. Afterwards delete the unlocked files from `/tmp`.

A full restore has **not been rehearsed yet**. Do one practice run (unlock a backup and inspect it) soon after the first backups exist, and record the result here.

### Uploading to GitHub (pushing)

Claude Code's safety check **refuses to let Claude run `git push`** in this project (it treats sending files to an outside service as sensitive), and Claude must not change its own permission settings. So **Greg runs the upload himself**: give him the single line `cd "/Users/gregoryroberts/Documents/Collectables Business" && git push` in a `bash` code block (he uses the Run button on it) or open a Terminal panel tab in this folder for him to type `git push`. Then confirm with `git status -sb` that local and GitHub match. Commit locally as often as needed, but batch the uploads so he is not asked after every small change: ask at the end of each stage and before anything risky. He found the first request confusing when it was explained in jargon; keep it to "click Run on this line" (2026-11-26).

### Things to know later

- **Preview address:** https://preview-collectables-tracker.collectables-tracker.workers.dev (always the latest `npm run deploy:preview`). It uses the **same database** as the live app: only the app's code is a preview, the data is real.
- **Preview and live addresses are public** (anyone with the link sees the login screen, nothing else). They can be put behind Cloudflare Access ("Protect all Workers" on the Workers & Pages overview) for free, but that needs Zero Trust set up, which asks for a payment card even though it is $0, and adds a second login for Greg. Not done; his call if he ever wants it.
- **Supabase pausing:** the project pauses after about a week of low activity. Greg gets a warning email first; using the app prevents it. If paused: dashboard → the project → "Resume project", within one year, with all data kept. It is **not confirmed** that the nightly backup job counts as activity, so do not rely on it to keep the project awake.
- **If GitHub builds are ever connected to Cloudflare:** set `"packageManager": "npm@<version>"` to match this Mac (already in `package.json`), keep `"previews": {}` in `wrangler.jsonc`, and commit `wrangler.jsonc` first.
- **Custom domain later:** needs a domain active in Greg's Cloudflare account (roughly the price of the domain per year); then Worker → Domains → Add.

## Change log

| Date | What changed |
|---|---|
| 2026-11-26 | Stage 1: read brief and spreadsheet, verified every section 10 number, checked hosting terms and prices, Greg chose Cloudflare + Supabase, plan approved. |
| 2026-11-26 | Stage 2 (part 1): project created; login screen, password reset, empty Home and Settings (sign out here / everywhere), new-version notice, iPhone home-screen install files and icons, security headers, build-time settings guard, money maths library. 60 automated tests. Setup steps researched and fact-checked against today's official docs. Independent review (security, correctness, iPhone use, match to brief) run and its confirmed findings fixed. First commit made locally. Not yet online: waiting on Greg's accounts. |
| 2026-11-26 | Stage 2 (part 2): GitHub repository created and code uploaded; Supabase project created, sign-up off, one user, app connected; Cloudflare account created and the app published for the first time. Live address works and shows only the sign-in screen. |
| 2026-11-26 | Stage 2 complete: Supabase URL configuration set, password reset tested by Greg, live sign-in confirmed on Mac and iPhone. |
| 2026-11-26 | Stage 3 (part 1): core tables and import function created in Supabase (0001, 0002) after an independent review whose 18 confirmed findings were fixed first; locks audited from inside and outside. Spreadsheet import, Import screen, Starting data check screen and Home counts built; 122 tests, including the real spreadsheet reproducing every section 10 number. Published to the preview address only. |
| 2026-11-26 | Stage 3 (part 2): Greg imported his starting spreadsheet; all 14 section 10 checks match in the live database; that version went live. Nightly passphrase-locked backup job written; waiting on Greg's two secrets and a first run. |
