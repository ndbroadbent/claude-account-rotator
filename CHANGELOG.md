# Changelog

What each version of the account rotator changed. To get each one as Claude Code starts, turn on auto-update: in `/plugin`, open **Marketplaces**, pick **claude-account-rotator** and choose **Enable auto-update**. To update by hand, run `claude plugin marketplace update claude-account-rotator`, then `claude plugin update account-rotator@claude-account-rotator`, and start a new session.

## 0.5.2 - 2026-11-10

- **Fixes Claude in Chrome dropping without the mod reconnecting it.** Claude Code sometimes reports "Browser extension is not connected" as an ordinary result rather than an error, and the mod caught only the error, so the drop went unnoticed. It now catches both (a page that merely mentions those words doesn't count), and `list_connected_browsers` listing no browsers counts as a drop too.
- **The coordinator backs off when the usage endpoint refuses.** After a failed usage call (an HTTP 429, an outage) it waits a minute before asking for that account again, twice as long after each further failure up to 15 minutes, or as long as a `Retry-After` header says. It used to ask again every 30 seconds while sessions wanted fresh numbers.

## 0.5.1 - 2026-11-09

- **A session that connects Claude in Chrome as it opens goes straight to the account whose week resets soonest** once connected, where it used to go back to the account it started on (Claude Code's own login) first, and move on only a response or two later. A confirmed switch also lets the rotation look again at once.

## 0.5.0 - 2026-11-09

- **Soonest reset now uses the week that resets first, all the time.** Every session moves to the account whose week resets soonest and still has room, at start-up and whenever that changes (an account fills or resets), where before a session moved only once its own account was spent. A session starts on Claude Code's own login, so after a restart they all used to stay there while other accounts' weeks reset unused. Usage going up never moves a session, and another account must reset over an hour sooner. **Most room**, **next in list** and **disabled** work as before.
- **Soonest reset orders accounts by their week**, not the $100 Max plan's 5-hour window, which resets within hours and so always came first. A week at 0% counts: the usage endpoint gives it a reset.

## 0.4.3 - 2026-11-09

- **The combined usage weighs plans by their weekly size.** Ultra (formerly Max 20x) gives 10x Pro's week and Max gives 5x, so an Ultra account now counts twice a Max one, where it counted four times.
- **The footer shows only the week.** The 5-hour row is gone, and so are its settings in **Display**: the one account with a 5-hour window (the $100 Max plan) shows it on its row in the panel.

## 0.4.2 - 2026-11-09

- **A 5-hour window shows only on the account that has one.** As of November 2026 only the $100 Max plan keeps a 5-hour limit; Ultra (formerly Max 20x) dropped it. The menu bar shows the combined week alone, and the panel in Claude Code and the menu bar app show a 5-hour bar only on that account's row. The menu bar app's choice of windows is gone.

## 0.4.1 - 2026-11-09

- **Fixes "Can't reach the account coordinator"** in every session that stayed quiet for 30 seconds. A session's wait for the coordinator's changes asked for 50 seconds, past the 30 seconds Claude Code gives a plugin's request before it gives up. It now asks for 25.

## 0.4.0 - 2026-11-09

The first version of this fork ([ivokund/claude-account-rotator](https://github.com/ivokund/claude-account-rotator) is the original).

- **One coordinator for every session.** Each session used to read every account's sign-in from the keychain and poll every account's usage on its own, so 30 sessions made 30 times the calls. A coordinator process now does that once per account for all of them. Sessions reach it over a Unix socket and get its changes as they happen. Sessions also report the usage their responses carry, so a busy account seldom needs polling at all. It also runs sign-ins one at a time, keeps the settings, and knows which sessions are on which account. Sessions on a spent account go where it says. A notice (an account needing a sign-in) shows in every session, and one of them posts the desktop notification.
- **The coordinator starts itself.** The first session to need it starts it, and it exits once no session has used it for 30 minutes. `node coordinator/cli.ts install` runs it at login instead (macOS), which the menu bar app needs. A session running a newer version replaces an older coordinator.
- **A menu bar app** (`menubar/`, macOS) shows your combined usage across every account, weighted by plan size, so a Max 20x account counts four times a Max 5x one. Click it for each account's usage, sign-ins, the rotation setting, sessions by folder and recent notices.
- **The panel says how many sessions use each account**, and the line above the prompt says when the coordinator can't be reached, with **Retry**.
- **Removing an account in use** moves its sessions off it first, then signs it out.
- **Weekly limits only.** As of November 2026 Claude has no 5-hour limit. The footer, panel and menu bar show the week alone, the rotation moves on at 2% of the week left (was 5%), and **soonest reset** picks the account whose week resets first. A turn that hits the limit counts the week full. If a plan reports a 5-hour window again, it comes back everywhere.
- Needs Node.js 22.18 or later on `PATH`, for the coordinator.

## 0.3.0 - 2026-10-16

- **Other accounts** at the top of the panel's **Chrome** box lists the accounts no Chrome extension is known to answer as, each with **Try to connect**: for a Chrome opened on another account after the window started. The accounts that answer have **Use for Chrome**.
- **A press keeps an account only once a browser answers as it.** If none does, Claude in Chrome goes back to the account picked before, and a toast says what to check. This replaces **Use this account**, which made any account the extension's, and listed it as active, though no browser answered.
- **The box lists every account a browser answered as the last time the mod connected as it,** where before it kept only the one picked. One whose Chrome has closed leaves the list once a press or a new window finds no browser there.

## 0.2.1 - 2026-10-16

- **The Chrome box lists every account until an extension answers,** so you pick the extension's straight away: **Look for Chrome on another account** is gone. Once a browser has answered as an account, the box lists those, and the one picked for it.
- **A window that can't switch accounts says so in the Chrome box,** with the command that brings the conversation back in a session that can: `claude --resume <id>`.

## 0.2.0 - 2026-10-16

Every copy installed before this one said 0.1.0, whatever it held, so `claude plugin update` never offered an update. Updating once brings everything below.

- **Usage based rotation** in the panel picks where the session moves: by default the account whose 5-hour window resets soonest, so room about to refill is used before it does; else the one with the most room, or the next in the list; or disabled, which leaves switching to you.
- **Team and Enterprise seats.** Where Claude Code's security default stops a session from switching, the mod says so once, with why and how to get a session that can switch, marks the footer, and stops trying. **Use now** gives the same answer instead of an error. The README's [Team and Enterprise accounts](README.md#team-and-enterprise-accounts) lists the ways around it, best first.
- **Claude in Chrome stays connected** as the account its extension is signed in to. Pick it with **Use this account** in the panel's **Chrome** box. Each window connects there as it opens, whatever usage that account has left, reconnects by itself after a drop, and **Connect** above the prompt does it by hand. When no extension answers, the panel says what to check.
- **Shows the account really in use.** When responses minutes after a switch still show the old account's usage, the footer and panel go back to it, and the rotation leaves the other account be for the session.
- **Follows `/login`.** An account whose sign-in turns out to be another listed account's asks for its own again, and the session moves off it; one signed in as an account not on the list becomes that account. The panel's second line names Claude Code's own login, and whether it is personal or a Team or Enterprise seat.
- **Linux.** Sign-ins are read from each account's `.credentials.json`, where Claude Code keeps them there.
- **The footer's looks:** bars, pies or braille; the account in use between lines, on a tile or with the rest dimmed; room left or what is used. The panel adds **Rotate now**, notices became toasts, and the footer is the way into the panel: `/accounts` is gone.

## 0.1.0 - 2026-10-12

The first version: each account's usage under the prompt, and a session that moves to another account before the one in use runs out.
