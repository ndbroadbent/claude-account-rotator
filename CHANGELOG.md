# Changelog

What each version of the account rotator changed. To get each one as Claude Code starts, turn on auto-update: in `/plugin`, open **Marketplaces**, pick **claude-account-rotator** and choose **Enable auto-update**. To update by hand, run `claude plugin marketplace update claude-account-rotator`, then `claude plugin update account-rotator@claude-account-rotator`, and start a new session.

## 0.7.0 - 2026-11-23

Each session now decides where it goes; the coordinator only knows the accounts. This is the first step of moving the coordinator's work into Quietdeck's node, which will serve the same API.

- **The coordinator no longer picks where sessions move.** Its state drops `moveTo`, `moveToFor` and `isSpent`. Every session already worked the same pick out from the same state when it had to, so where sessions go doesn't change.
- **Remove refuses in the session.** Removing an account sessions are on, while no other account can take them over, says so in the session that asked, as the coordinator did before. The coordinator now retires an account it's asked to remove and drops it once no session is on it.
- **The menu bar app marks an account Spent from its percentages,** at the same 90% of the 5-hour window or 98% of the week. Its tooltip no longer names the account sessions move to.

## 0.6.6 - 2026-11-21

Fixes ported from upstream (ivokund/claude-account-rotator 0.3.1 to 0.5.1), reworked for the coordinator:

- **A limit hit just after a switch isn't blamed on the new account.** For up to 30 s Claude Code still sends the sign-in it read before, so the session checks both accounts' usage, and while the new one can serve it carries on once the switch lands (upstream b90ff1b).
- **A switch is given up on only after a request has tested it.** A late response to a request sent before the switch could land no longer sends the session back, and giving up leaves alone a switch made since (upstream 5986448).
- **A Use now pick stays the person's.** Held back by the refresh guard, it's the switch made once the guard lifts, not the rotation's; Connect goes back to it; and a browser answering on it doesn't hand it to the rotation before a request confirms it (upstream fc186dd).
- **A switch Claude Code holds back, answering why, counts as refused,** as in a session that takes its settings from its organization: the session says once that it can't switch, instead of showing a switch that never happened (upstream 2e37b86).
- **A new session's first move waits while its login's token has run out,** as overnight, until its first request refreshes the token there. Moving first could have the refreshed token saved over the other account's sign-in (upstream feb38e2).

## 0.6.5 - 2026-11-20

- **The menu bar app installs to /Applications**, where Spotlight, Launchpad and Finder's Applications folder show it, so you can start it again if it stops. `menubar/install.sh` deletes the copy earlier versions put in `~/Applications`, and `uninstall.sh` removes either.
- The install and uninstall scripts quit the running app by its bundle ID instead of with `pkill`.

## 0.6.4 - 2026-11-18

- **Accounts no session is on keep their usage current.** The coordinator reads usage with each account's own access token, and only Claude Code refreshes that token, as a session sends a request. An account the rotation had left kept its expired token, so its last reading stayed on screen for days: one that had hit its 5-hour limit showed 100% long after the window reset, counted as spent, and the rotation never sent a session there to refresh it, so its whole week went unused. Now, once the token of an account no session is on has expired, the coordinator runs `claude -p /usage` as that account. Claude Code refreshes the token and saves it as it would in a session, with no model request, and the coordinator reads the account's usage again. An account with sessions on it is left to them, and a refresh that fails is tried again 10 minutes later.

## 0.6.3 - 2026-11-18

- **The permission mode under the prompt is back as Claude Code draws it.** 0.6.2's shortened version replaced the whole hint line, which dropped parts of it, such as what sat between its dots.

## 0.6.2 - 2026-11-18

- **The footer names the session's model, branch and context** left of the accounts: `Fable 5.2 · sc-6450 least-privilege-ci-oidc ↑2 ● · ctx 72%`. The model changes as soon as `/model` picks another. The branch is read in the directory the session's Bash commands last moved to with `cd` (into a repository), so a session that started in one checkout and works in a worktree shows the worktree's branch; a `cd` in a subshell, or to a folder outside any repository, doesn't move it. `↑n` counts the commits no remote has, `●` shows uncommitted changes, and git runs without optional locks so it never holds the session's own `index.lock`. The context figure turns yellow from 80%.
- **The permission mode under the prompt is shortened:** `⏵⏵ bypass permissions on (shift+tab to cycle)` shows as `⏵⏵ bypass`, `⏵⏵ accept edits on (shift+tab to cycle)` as `⏵⏵ accept edits`.

## 0.6.1 - 2026-11-14

- **An idle session whose switch hasn't been confirmed moves on with the rotation.** A switch waits for a response to confirm it, and the rotation used to leave a session alone until then. An idle session has no new response, so one the rotation moved to the account resetting soonest stayed there after that account reset, sometimes for days, until its next turn ran on it. The rotation now moves such a session on as it would any other, except while a turn is running (its response may be on the way) or when you picked the account with **Use now**, which stays until a response confirms it.
- **The menu bar app names plans as Anthropic does now:** Ultra (formerly Max 20x) and Max (formerly Max 5x).

## 0.6.0 - 2026-11-11

- **Rotates Fable sessions by Fable's own weekly limit.** Fable has a weekly limit of its own, which runs out before the account's week. Until now the rotation went by the account's week alone, so a Fable session stayed on an account whose Fable week was spent and spent usage credits there. A session on Fable now also moves on once its account is down to 2% of its Fable week, and picks the next account by whichever of its two weeks has less room. Sessions on Opus or Sonnet go by the account's week alone and keep using an account whose Fable week is spent.
- The coordinator reads each account's Fable week from the usage endpoint's `limits`. Responses don't report it, so while a Fable session's account is past 80% of its Fable week, each response asks for fresh usage (the coordinator still calls the endpoint at most once a minute per account).
- A Fable session whose turn hits the usage limit while its account's week has room counts the Fable week full, not the account's week, so the account's Opus and Sonnet sessions stay on it.
- **The panel and the menu bar show each account's Fable week** under its week, and in a Fable session the footer shows whichever of the two has less room. `cli.ts status` adds a column for it.

## 0.5.3 - 2026-11-10

- **Every session shares one usage call a minute per account.** A session that asks the coordinator for fresh usage now gets any reading up to a minute old (it was 30 seconds), so however many sessions ask, the coordinator calls Anthropic's usage endpoint at most once a minute for each account.
- **Idle sessions no longer ask for fresh usage while a switch waits to be confirmed.** Only a response can confirm a switch, but sessions with no new response still asked every minute, indefinitely. With dozens of sessions moved to one account, that kept the coordinator calling the usage endpoint every 30 seconds for hours (HTTP 429 the whole time). Now only a response asks.
- After a failed usage call the coordinator waits two minutes before the next (was one), doubling up to 15 minutes.

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
