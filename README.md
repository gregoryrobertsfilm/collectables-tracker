# Collectables Tracker

Your private app for tracking Thrilljoy PIX! figures (and later Funko Pops): what you own, whose it is, where it's stored, where it's listed, and what you've spent and made.

This page is written for you, Greg, not for a programmer. You never need to edit code. To change anything, open this folder in Claude Code and ask in plain English.

## Status today

**Stage 2 in progress.** The app is built and tested on this Mac. It is **not online yet** and holds **no data yet**. The lines marked "not set up yet" below become true as each account is created.

## Where things live

| Thing | Where | Status |
|---|---|---|
| The app's code | This folder. Every change is saved as a step that can be undone. | Working on this Mac. |
| Backup of the code | Your private GitHub repository. | **Not set up yet.** Until then, the only copy is this folder. |
| Your data | Supabase (the database): figures, copies, listings, sales, purchases. Photos later. | **Not set up yet.** Nothing is stored. |
| The live app | Cloudflare (the web host). Serves the app to your phone and computer. Holds no data. | **Not set up yet.** |
| Your starting spreadsheet | `Thrilljoy Starting Data for Claude Code - Greg.xlsx` in this folder. | This is your original. It is **not** sent to GitHub (it contains buyer usernames). Keep your own copy somewhere safe. |

## Backing up your data

**Today: the database does not exist yet, so there is nothing to back up.** Your only data is the starting spreadsheet in this folder. Keep a copy of this whole folder somewhere safe (iCloud Drive or an external drive).

What is planned, and when each part becomes real:

1. **Automatic nightly backup: switched on at the end of stage 3**, as soon as your data is loaded. A full copy of the database is saved every night to a private place on GitHub without you doing anything. **Not set up yet.**
2. **One-button export: stage 8.** In the app: Settings → Export. Downloads all your data as spreadsheet (CSV) files you can open in Excel or Numbers. **Not built yet.**
3. **Supabase itself** keeps your data on professional servers. Its free plan does not include its own daily backups, which is why items 1 and 2 exist.

This section will be rewritten with exact steps when each part is switched on.

## Restoring your data

**Today: there are no backups yet, so there is nothing to restore from.** Once the nightly backup is on (end of stage 3):

1. **Stop making changes in the app.**
2. Open this folder in Claude Code and say: *"Something is wrong with my data. Restore from the latest backup."* Claude will show you what backups exist, what each contains, and what would change, and will ask before touching anything.

Restoring replaces what's in the database with a saved copy. Anything entered after that copy was made would be lost, so Claude will always take a fresh backup first.

## If the app itself breaks (not the data)

Every change to the app is saved as a numbered step on this Mac. Tell Claude: *"The last change broke something, undo it."*

Undoing a change to how the app looks or behaves does not touch your data. If a change also altered how your data is stored, Claude will tell you and take a backup first.

## If you get a new computer

This works once the GitHub backup is set up (**not yet**):

1. Install Claude Code.
2. Tell Claude: *"Set up my Collectables Tracker project from GitHub."* It will fetch the code and walk you through signing in to GitHub.
3. Copy your starting spreadsheet into the new folder yourself; it is not kept on GitHub.

Your phone needs nothing: the app is a web page. Open its address in Safari, sign in, then Share → Add to Home Screen.

## What it costs

$0 a month on the planned services (Cloudflare free, Supabase free, GitHub free). Claude will tell you before anything would start costing money.

One thing to know about Supabase's free plan: if the app goes unused for about a week, Supabase pauses the database. You get a warning email first, and simply using the app prevents it. If it does pause, nothing is lost: it can be woken from the Supabase website for up to a year.

## Passwords and keys

- Your passwords live in your password manager and nowhere else. Never paste one into a chat.
- The app's login will be one account: yours. Public sign-up is switched off in Supabase as part of setup (**not done yet**).
- **Forgot your password?** Tap "Forgot password?" on the sign-in screen. The email link opens in Safari; choose a new password there, then go back to the home-screen app and sign in with it.
- **Lost your phone?** Sign in on another device, go to Settings, and tap **Sign out everywhere**. Other devices are signed out within the hour. Then, on the sign-in screen, tap "Forgot password?" and set a new one.
