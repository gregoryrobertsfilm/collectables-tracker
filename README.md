# Collectables Tracker

Your private app for tracking Thrilljoy PIX! figures (and later Funko Pops): what you own, whose it is, where it's stored, where it's listed, and what you've spent and made.

This page is written for you, Greg, not for a programmer. You never need to edit code. To change anything, open this folder in Claude Code and ask in plain English.

## Status today

**Stage 3 nearly done.** The app is online at **https://collectables-tracker.collectables-tracker.workers.dev**, only you can sign in, and your starting data is loaded. Browsing and searching your figures arrives in stage 4.

## Where things live

| Thing | Where | Status |
|---|---|---|
| The app's code | This folder. Every change is saved as a step that can be undone. | Working on this Mac. |
| Backup of the code | Your private GitHub repository, `gregoryrobertsfilm/collectables-tracker`. | **Set up.** A copy is uploaded at the end of each stage; you run the upload with one click when Claude asks. |
| Your data | Supabase (the database): figures, copies, listings, sales. Purchases and photos later. | **Loaded** from your starting spreadsheet. |
| The live app | Cloudflare (the web host). Serves the app to your phone and computer. Holds no data. | **Online** at the address above. |
| Your starting spreadsheet | `Thrilljoy Starting Data for Claude Code - Greg.xlsx` in this folder. | This is your original. It is **not** sent to GitHub (it contains buyer usernames). Keep your own copy somewhere safe. |

## Backing up your data

Your data now lives in the database: 226 copies, 110 figures, 26 listings and 17 sales, loaded from your starting spreadsheet on 26 November 2026.

1. **Automatic nightly backup.** Every night a full copy of the database is saved to a private "backups" area of your GitHub repository. Each copy is locked, so nobody can read it even if they got into your GitHub. **Status: set up but not running until the one secret has been pasted in and it has run once.** (This line will be updated when the first backup is confirmed.)
2. **What unlocks a backup is your Supabase database password**, the one saved in your password manager when you created the project. Keep it. If you ever change it, keep the old one too: older backups only open with the password from the time they were made.
3. **One-button export: stage 8.** In the app: Settings → Export. Downloads all your data as spreadsheet (CSV) files. **Not built yet.**
4. **Your starting spreadsheet** in this folder is still your original. Keep your own copy of it somewhere safe; it is not on GitHub.

If a nightly backup fails, GitHub emails you. Claude also checks the date of the newest backup at the start of every session.

## Restoring your data

1. **Stop making changes in the app.**
2. Open this folder in Claude Code and say: *"Something is wrong with my data. Restore from the latest backup."*
3. Claude will take a fresh backup first, show you what backups exist and what would change, and ask before touching anything.
4. At one point you will be asked to type your Supabase database password into a terminal panel on your Mac. It is never typed into the chat.

Restoring replaces data with a saved copy, so anything entered after that copy was made could be lost. That is why a fresh backup is always taken first, and why Claude will usually restore only the part that went wrong.

## If the app itself breaks (not the data)

Every change to the app is saved as a numbered step on this Mac. Tell Claude: *"The last change broke something, undo it."*

Undoing a change to how the app looks or behaves does not touch your data. If a change also altered how your data is stored, Claude will tell you and take a backup first.

## If you get a new computer

This works now that the GitHub backup is set up:

1. Install Claude Code.
2. Tell Claude: *"Set up my Collectables Tracker project from GitHub."* It will fetch the code and walk you through signing in to GitHub.
3. Copy your starting spreadsheet into the new folder yourself; it is not kept on GitHub.

Your phone needs nothing: the app is a web page. Open its address in Safari, sign in, then Share → Add to Home Screen.

## What it costs

$0 a month on the planned services (Cloudflare free, Supabase free, GitHub free). Claude will tell you before anything would start costing money.

One thing to know about Supabase's free plan: if the app goes unused for about a week, Supabase pauses the database. You get a warning email first, and simply using the app prevents it. If it does pause, nothing is lost: it can be woken from the Supabase website for up to a year.

## Passwords and keys

- Your passwords live in your password manager and nowhere else. Never paste one into a chat.
- The app's login is one account: yours. Public sign-up is switched off in Supabase, so nobody else can create one.
- **Forgot your password?** Tap "Forgot password?" on the sign-in screen. The email link opens in Safari; choose a new password there, then go back to the home-screen app and sign in with it.
- **Lost your phone?** Sign in on another device, go to Settings, and tap **Sign out everywhere**. Other devices are signed out within the hour. Then, on the sign-in screen, tap "Forgot password?" and set a new one.
