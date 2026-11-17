"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Footer = Footer;
exports.Band = Band;
exports.Pane = Pane;
var model_1 = require("./model");
var work_1 = require("./work");
var needsSignIn = function (view) { return view.accounts.filter(function (a) { var _a; return ((_a = view.health[a.id]) === null || _a === void 0 ? void 0 : _a.kind) === 'login-needed'; }); };
/** Imitated room left per login, [right now, week], for the pane's demo preview: every color shows. */
var DEMO = [[85, 70], [60, 40], [35, 90], [15, 20], [95, 55]];
/** A login's room left right now and in its week, or the demo's; undefined where it has none. */
function rooms(view, a, i, now) {
    var _a;
    if (view.demo) {
        var _b = (_a = DEMO[i % DEMO.length]) !== null && _a !== void 0 ? _a : [undefined, undefined], now5 = _b[0], week_1 = _b[1];
        return [(0, model_1.hasFiveHour)(view.readings) ? now5 : undefined, week_1];
    }
    var r = view.readings[a.id];
    // A session on a model with its own week (Fable) runs out at whichever week is fuller.
    var week = (0, model_1.roomLeft)(r === null || r === void 0 ? void 0 : r.sevenDay, now);
    var model = (0, model_1.roomLeft)((0, model_1.modelWindow)(r, (0, model_1.viewScope)(view)), now);
    return [(0, model_1.availableNow)(r, now), model === undefined ? week : week === undefined ? model : Math.min(week, model)];
}
/** A percent's room color, lighter while the pointer is over the footer. */
var roomRun = function (leftPct) { return ({ color: (0, model_1.roomColor)(leftPct), lit: (0, model_1.roomColor)(leftPct, true) }); };
/**
 * A login's glyph in a footer row, green with all of its room left to red with
 * none. The top row shown says when a login needs a sign-in; a login without the
 * room (a plan with no weekly limit) leaves its place blank.
 */
function glyphOf(view, a, style, isTop, room) {
    var _a;
    var health = (_a = view.health[a.id]) === null || _a === void 0 ? void 0 : _a.kind;
    if (health === 'login-needed')
        return isTop ? { text: '⚠', color: 'error' } : { text: ' ' };
    if (health === 'logging-in')
        return isTop ? { text: '◌', color: 'warning' } : { text: ' ' };
    if (room === undefined)
        return { text: isTop ? '·' : ' ' };
    return __assign({ text: (0, model_1.glyph)(style, (0, model_1.shown)(view.footer.fill, room)) }, roomRun(room));
}
/** The tile's color: the theme's dim gray, the lines' own, which stands apart from the screen and from the shade under the pointer. */
var TILE = 'subtle';
/** The lines' color: the theme's dim gray, so they frame the column without outshining it; its lighter gray under the pointer. */
var LINE = { color: 'subtle', lit: 'inactive' };
/** How a login's glyph shows it is the one in use, as the pane's setting picks. */
function marked(highlight, isActive) {
    switch (highlight) {
        case 'tile':
            return isActive ? { backgroundColor: TILE } : {};
        case 'dim':
            return isActive ? {} : { dimColor: true };
        case 'lines':
            return {};
    }
}
/** The highlights drawn in the cells either side of a column: every row keeps those cells. */
var IN_GAPS = ['lines', 'tile'];
/** A row's room left for the account in use, or undefined where it has none. */
function activeRoom(view, now, row) {
    var i = view.accounts.findIndex(function (a) { return a.id === view.activeId; });
    var active = view.accounts[i];
    return active === undefined ? undefined : rooms(view, active, i, now)[row];
}
/**
 * The cell before column `i`, or after the last one at `i` = the number of
 * accounts: a space between columns, nothing at the ends, unless the highlight
 * draws there. The lines stand mid-cell either side of the column in use, half
 * a cell clear of its glyphs. The tile pads it with half of each of those
 * cells, in half blocks, which most terminals draw to fill their cells; where
 * the terminal draws them from its font, short of the line, they would notch
 * the shade, so there it takes the whole cells.
 */
function edge(view, i, inGaps) {
    if (!inGaps)
        return i > 0 && i < view.accounts.length ? [{ text: ' ' }] : [];
    var active = view.accounts.findIndex(function (a) { return a.id === view.activeId; });
    if (i !== active && i - 1 !== active)
        return [{ text: ' ' }];
    if (view.footer.active === 'lines')
        return [__assign({ text: '│' }, LINE)];
    if (view.hasFontBlocks)
        return [{ text: ' ', backgroundColor: TILE }];
    return [{ text: i === active ? '▐' : '▌', color: TILE }];
}
/**
 * One footer row as runs of text: a glyph per account, a space apart, then the
 * account in use's percent at the right end. While another row draws glyphs, a
 * row with its own off keeps their columns blank, so its percent lines up
 * under the other's.
 */
function footerRow(view, now, row, style, showPercent, hasColumns, isTop) {
    var pct = activeRoom(view, now, row);
    var inGaps = hasColumns && IN_GAPS.includes(view.footer.active);
    var columns = hasColumns
        ? __spreadArray(__spreadArray([], view.accounts.flatMap(function (a, i) { return __spreadArray(__spreadArray([], edge(view, i, inGaps), true), [
            __assign(__assign({}, (style === 'none' ? { text: ' ' } : glyphOf(view, a, style, isTop, rooms(view, a, i, now)[row]))), marked(view.footer.active, a.id === view.activeId)),
        ], false); }), true), edge(view, view.accounts.length, inGaps), true) : [];
    // A cell of the hover shade left of the glyphs where no highlight keeps one before the first column.
    var lead = inGaps ? [] : [{ text: ' ' }];
    if (!showPercent)
        return __spreadArray(__spreadArray([], lead, true), columns, true);
    var text = "".concat(hasColumns ? (inGaps ? ' ' : '  ') : '').concat((pct === undefined ? '' : "".concat((0, model_1.shown)(view.footer.fill, pct), "%")).padStart(4));
    return __spreadArray(__spreadArray(__spreadArray([], lead, true), columns, true), [__assign({ text: text }, (pct === undefined ? {} : roomRun(pct)))], false);
}
/** The shade the footer's glyphs stand on under the pointer: the theme's own behind a message the person sent. */
var HOVER_SHADE = 'userMessageBackground';
var widthOf = function (row) { return row.reduce(function (n, run) { return n + run.text.length; }, 0); };
/**
 * The rows' runs as Text, rows a line apart and padded a cell past the widest,
 * so the hover shade is one even block with room right of the percents, as the
 * cell before the glyphs gives it at the left. Under the pointer a Button is
 * drawn inverted, its colors swapped, so each run's hover is given swapped: its
 * lighter color as the background, the shade as the color. Inverted, that is
 * the glyphs lit on the shade, and the tile's cells on their own color.
 */
function runsText(_a, rows) {
    var Text = _a.Text;
    var width = Math.max.apply(Math, rows.map(widthOf)) + 1;
    return rows.flatMap(function (row, i) { return __spreadArray(__spreadArray([], (i > 0 ? ['\n'] : []), true), [
        <Text>
      {__spreadArray(__spreadArray([], row, true), (widthOf(row) < width ? [{ text: ' '.repeat(width - widthOf(row)) }] : []), true).map(function (run) {
                var _a, _b, _c;
                return (<Text color={run.color} backgroundColor={run.backgroundColor} dimColor={run.dimColor} hover={{ color: (_a = run.backgroundColor) !== null && _a !== void 0 ? _a : HOVER_SHADE, backgroundColor: (_c = (_b = run.lit) !== null && _b !== void 0 ? _b : run.color) !== null && _c !== void 0 ? _c : 'text', dimColor: false }}>
          {run.text}
        </Text>);
            })}
    </Text>,
    ], false); });
}
/** What each footer row counts, said left of it while the pointer is over the footer. */
var ROW_NAMES = ['Session:', 'Weekly:'];
/**
 * The footer, right of the prompt: the engine's mode labels, then a row per
 * row picked in the pane (right now, the week), glyphs and percent each on or
 * off, as one control that opens the pane, or closes it while it shows. Under
 * the pointer the glyphs light up on a shade, and each row's name shows at its
 * left. A week row with nothing to show is left out; with both rows off, a
 * word keeps the control.
 */
/**
 * The session's own details left of the accounts, dim, joined by ` · `: its
 * model, its branch (with `↑n` unpushed and `●` uncommitted) and how full its
 * context is, warning from CONTEXT_WARN_PCT. On a narrow row the start is cut.
 */
function sessionDetails(_a, view) {
    var Text = _a.Text;
    var parts = __spreadArray(__spreadArray(__spreadArray([], ((0, work_1.modelLabel)(view.model) === undefined ? [] : [{ text: (0, work_1.modelLabel)(view.model) }]), true), (view.work === undefined ? [] : [{ text: (0, work_1.workText)(view.work) }]), true), (view.contextPct === undefined ? [] : [__assign({ text: "ctx ".concat(view.contextPct, "%") }, (view.contextPct >= work_1.CONTEXT_WARN_PCT ? { color: 'warning' } : {}))]), true);
    if (parts.length === 0)
        return undefined;
    return (<Text wrap="truncate-start">
      {parts.flatMap(function (part, i) { return __spreadArray(__spreadArray([], (i > 0 ? [<Text dimColor>{' · '}</Text>] : []), true), [
            part.color === undefined ? <Text dimColor>{part.text}</Text> : <Text color={part.color}>{part.text}</Text>,
        ], false); })}
    </Text>);
}
function Footer(ui, view, modes, now, act) {
    var Box = ui.Box, Text = ui.Text, Button = ui.Button;
    var _a = view.footer, week = _a.week, weekPercent = _a.weekPercent;
    // One row: the week. As of November 2026 only the $100 Max plan has a 5-hour window, which its row in the pane
    // shows; the 5-hour row stands in only where no login reports a week (a plan with no weekly limit).
    var hasWeek = view.accounts.some(function (a, i) { return rooms(view, a, i, now)[1] !== undefined; });
    var row = hasWeek ? 1 : 0;
    var hasRoom = view.accounts.some(function (a, i) { return rooms(view, a, i, now)[row] !== undefined; });
    var hasColumns = (row === 1 ? week : view.footer.session) !== 'none' && hasRoom;
    var isShown = hasColumns || ((row === 1 ? weekPercent : view.footer.sessionPercent) && activeRoom(view, now, row) !== undefined);
    var shownRows = isShown ? [row] : [];
    var details = sessionDetails(ui, view);
    var rows = shownRows.map(function (r) {
        return r === 1 ? footerRow(view, now, 1, week, weekPercent, hasColumns, true) : footerRow(view, now, 0, view.footer.session, view.footer.sessionPercent, hasColumns, true);
    });
    return (<Box flexDirection="row" columnGap={1}>
      {modes.length > 0 && <Text dimColor>{modes.join(' & ')}</Text>}
      {details !== undefined && (<Box key="details" flexShrink={1}>
          {details}
        </Box>)}
      <Box key="accounts-area" flexDirection="row" columnGap={1} flexShrink={0}>
        {rows.length > 0 && (<Box display="none" hover={{ display: 'flex' }} flexDirection="column" alignItems="flex-end">
            {shownRows.map(function (row) { return (<Text dimColor>{ROW_NAMES[row]}</Text>); })}
          </Box>)}
        {/* Switching is blocked: a press opens the pane, whose first line says why. */}
        {view.isSwitchBlocked && (<Button key="switch-blocked" label="Switching blocked" plain onPress={act.togglePane}>
            <Text color="warning">⚠</Text>
          </Button>)}
        {/* A scope of its own: the glyphs light only while the pointer is on them, as the control inverts. */}
        <Box key="accounts-glyphs">
          <Button key="accounts" label="Claude accounts" plain onPress={act.togglePane}>
            {rows.length === 0 ? <Text dimColor>accounts</Text> : runsText(ui, rows)}
          </Button>
        </Box>
      </Box>
    </Box>);
}
/** The pane's mark for what is in use or picked: the theme's yellow. */
var ACCENT = 'warning';
/** A setting that is on or off, as a press that flips it. */
function toggle(ui, key, label, on, set) {
    var Text = ui.Text, Button = ui.Button;
    return (<Button key={key} plain onPress={function () { return set(!on); }}>
      <Text color={on ? ACCENT : undefined} dimColor={!on}>
        {on ? '■' : '□'} {label}
      </Text>
    </Button>);
}
/** Settings' names take a column of their own; their presses wrap under each other on a narrow pane. */
var NAME_WIDTH = 9;
/** One setting: its name, then its options as presses, the picked one marked. */
function choice(ui, key, name, options, picked, pick) {
    var Box = ui.Box, Text = ui.Text, Button = ui.Button;
    return (<Box key={key} flexDirection="row">
      <Box width={NAME_WIDTH} flexShrink={0}>
        <Text dimColor>{name}</Text>
      </Box>
      <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
        {options.map(function (_a) {
            var value = _a[0], label = _a[1];
            return (<Button key={"".concat(key, "-").concat(value)} plain onPress={function () { return pick(value); }}>
            <Text color={value === picked ? ACCENT : undefined} dimColor={value !== picked}>
              {value === picked ? '●' : '○'} {label}
            </Text>
          </Button>);
        })}
      </Box>
    </Box>);
}
var GLYPH_CHOICES = model_1.GLYPHS.map(function (g) { return [g, g]; });
var HIGHLIGHT_CHOICES = [
    ['lines', 'lines'],
    ['tile', 'tile'],
    ['dim', 'dim the rest'],
];
var FILL_CHOICES = [
    ['left', 'room left'],
    ['used', 'used'],
];
var ROTATE_CHOICES = [
    ['reset', 'soonest reset'],
    ['room', 'most room'],
    ['order', 'next in list'],
    ['off', 'disabled'],
];
var PREVIEW_CHOICES = [
    ['real', 'your usage'],
    ['demo', 'demo values'],
];
/**
 * A group of the pane in a box of its own, its name set in the top border: the
 * name is painted over the border as the wrapper's last child.
 */
function section(ui, key, title, children) {
    var Box = ui.Box, Text = ui.Text;
    return (<Box key={key} flexDirection="column">
      <Box flexDirection="column" borderStyle="round" borderColor="subtle" paddingX={1}>
        {children}
      </Box>
      <Box position="absolute" top={0} left={2}>
        <Text bold> {title} </Text>
      </Box>
    </Box>);
}
/** The footer's settings: a style and a percent per row, what glyphs fill with, how the login in use stands out, and a demo preview. */
function FooterSettings(ui, view, act) {
    var Box = ui.Box, Text = ui.Text;
    return section(ui, 'display', 'Display', [
        choice(ui, 'footer-week', 'Glyphs', GLYPH_CHOICES, view.footer.week, function (week) { return act.setFooter({ week: week }); }),
        <Box key="footer-percent" flexDirection="row">
      <Box width={NAME_WIDTH} flexShrink={0}>
        <Text dimColor>Percent</Text>
      </Box>
      <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
        {toggle(ui, 'footer-percent-week', 'shown', view.footer.weekPercent, function (on) { return act.setFooter({ weekPercent: on }); })}
      </Box>
    </Box>,
        choice(ui, 'footer-fill', 'Show', FILL_CHOICES, view.footer.fill, function (fill) { return act.setFooter({ fill: fill }); }),
        choice(ui, 'footer-active', 'In use', HIGHLIGHT_CHOICES, view.footer.active, function (active) { return act.setFooter({ active: active }); }),
        choice(ui, 'footer-preview', 'Preview', PREVIEW_CHOICES, view.demo ? 'demo' : 'real', function (v) { return act.setDemo(v === 'demo'); }),
    ]);
}
/** Which login the rotation moves to. */
function RotationSettings(ui, view, act) {
    return section(ui, 'rotation', 'Usage based rotation', [
        choice(ui, 'rotate-to', 'Move to', ROTATE_CHOICES, view.rotateTo, act.setRotateTo),
    ]);
}
/** An account as the band names it: its number, and its email once known. */
function named(view, id) {
    var _a;
    var email = (_a = view.accounts.find(function (a) { return a.id === id; })) === null || _a === void 0 ? void 0 : _a.email;
    return email === undefined ? "account ".concat(id) : "account ".concat(id, " (").concat(email, ")");
}
/**
 * What keeps Claude in Chrome from working in this window, in a sentence: no
 * browser answering where it connected, or no move to the extension's account.
 */
function chromeProblem(view) {
    var own = view.chromeAccountId;
    var link = view.chrome;
    if (own === undefined || view.chromeConnecting !== undefined || (link === null || link === void 0 ? void 0 : link.isPaired))
        return undefined;
    if ((link === null || link === void 0 ? void 0 : link.as) === own) {
        return "No Chrome extension answers as ".concat(named(view, own), ". Open Chrome and check its Claude extension is signed in with that email; if it is, restart Chrome.");
    }
    if (!(0, model_1.canConnectChrome)(view))
        return "This window can't switch to ".concat(named(view, own), ". Quit, then run: ").concat((0, model_1.resumeCommand)(view));
    return undefined;
}
/**
 * One account in the Chrome box: who it is, then in use, connecting, or a
 * press: Use for Chrome where a browser answered as it, else Try to connect.
 */
function chromeRow(ui, view, a, act) {
    var _a, _b, _c;
    var Box = ui.Box, Text = ui.Text, Button = ui.Button;
    var link = view.chrome;
    var isConnecting = view.chromeConnecting === a.id;
    var isInUse = !isConnecting && (link === null || link === void 0 ? void 0 : link.isPaired) === true && ((_a = link.as) !== null && _a !== void 0 ? _a : view.chromeAccountId) === a.id;
    var canTry = view.chromeConnecting === undefined && (!view.isSwitchBlocked || view.activeId === a.id);
    var isAnswered = ((_b = view.chromeAccountIds) === null || _b === void 0 ? void 0 : _b.includes(a.id)) === true;
    var end = isConnecting ? (<Text color="warning">◌ Connecting Chrome…</Text>) : isInUse ? (<Text color={ACCENT}>● in use</Text>) : (canTry && (<Button key={"chrome-".concat(isAnswered ? 'use' : 'try', "-").concat(a.id)} onPress={function () { return act.tryChromeAccount(a.id); }}>
        {isAnswered ? 'Use for Chrome' : 'Try to connect'}
      </Button>));
    return (<Box key={"chrome-row-".concat(a.id)} flexDirection="row" flexWrap="wrap" columnGap={2}>
      <Box flexDirection="row" flexShrink={1}>
        <Box width={3} flexShrink={0}>
          <Text bold={isInUse} dimColor={!isInUse}>{a.id}</Text>
        </Box>
        <Text bold={isInUse} dimColor={!isInUse}>{(_c = a.email) !== null && _c !== void 0 ? _c : "account ".concat(a.id)}</Text>
      </Box>
      <Box flexDirection="row" flexGrow={1} justifyContent="flex-end">
        {end}
      </Box>
    </Box>);
}
/**
 * Claude in Chrome: the accounts a Chrome extension answered as the last time
 * Claude in Chrome connected as them, and the one it is connecting as, the one
 * this window's Chrome is connected as in use, as in Accounts, the others a
 * press away; then what keeps it from working. With none found yet, every
 * account, to pick the extension's; after, the rest on a press, under a line
 * of their own, for a Chrome opened on another account.
 */
function ChromeSettings(ui, view, act) {
    var _a;
    var Box = ui.Box, Text = ui.Text, Button = ui.Button;
    if (view.hasChrome === false)
        return section(ui, 'chrome', 'Chrome', [<Text key="chrome-none" dimColor>Not available in this window.</Text>]);
    var found = view.accounts.filter(function (a) { var _a; return ((_a = view.chromeAccountIds) === null || _a === void 0 ? void 0 : _a.includes(a.id)) || a.id === view.chromeConnecting; });
    var others = found.length === 0 ? [] : view.accounts.filter(function (a) { return !found.includes(a); });
    var shownOthers = view.isChromeOthersShown ? others : [];
    var listed = found.length === 0 ? view.accounts : __spreadArray(__spreadArray([], found, true), shownOthers, true);
    // A window that can't switch accounts has a press on its own account only: it says why, once.
    var isStuck = view.isSwitchBlocked === true && listed.some(function (a) { return a.id !== view.activeId; });
    var problem = (_a = chromeProblem(view)) !== null && _a !== void 0 ? _a : (isStuck ? "This window can't switch accounts, so Chrome can't move to another one here. Quit, then run: ".concat((0, model_1.resumeCommand)(view)) : undefined);
    return section(ui, 'chrome', 'Chrome', __spreadArray(__spreadArray(__spreadArray([
        found.length === 0 ? (<Text key="chrome-intro" dimColor>No Chrome extension found yet. Which account is yours signed in to?</Text>) : (<Box key="chrome-intro" flexDirection="row" flexWrap="wrap" columnGap={2}>
        <Text dimColor>Active Claude extension accounts from your Chrome windows:</Text>
        {others.length > 0 && (<Button key="chrome-others" plain onPress={act.toggleChromeOthers}>
            <Text dimColor>{"".concat(view.isChromeOthersShown ? '▾' : '▸', " Other accounts")}</Text>
          </Button>)}
      </Box>)
    ], (found.length === 0 ? view.accounts : found).map(function (a) { return chromeRow(ui, view, a, act); }), true), (shownOthers.length === 0
        ? []
        : __spreadArray([<Text key="chrome-others-intro" dimColor>No Chrome extension is known to answer as these:</Text>], shownOthers.map(function (a) { return chromeRow(ui, view, a, act); }), true)), true), (problem === undefined ? [] : [<Text key="chrome-problem" color="warning">{"\u26A0 ".concat(problem)}</Text>]), true));
}
/**
 * The band while Connect is under way, or once a browser call found no
 * browser: what keeps Claude in Chrome from working, and Connect where it can help.
 */
function ChromeBand(ui, view, act) {
    var _a, _b;
    var Box = ui.Box, Text = ui.Text, Button = ui.Button;
    if (view.chromeConnecting !== undefined) {
        return <Text color="warning">{"\u25CC Connecting Chrome as ".concat(named(view, view.chromeConnecting), "\u2026")}</Text>;
    }
    if (!((_a = view.chrome) === null || _a === void 0 ? void 0 : _a.hasFailed))
        return undefined;
    var own = view.chromeAccountId;
    if (own === undefined) {
        return (<Box flexDirection="row" columnGap={2}>
        <Text color="warning">⚠ Claude in Chrome: which account is your Chrome extension signed in to?</Text>
        <Button key="chrome-pick" onPress={act.togglePane}>Pick it</Button>
      </Box>);
    }
    return (<Box flexDirection="row" columnGap={2}>
      <Text color="warning">{"\u26A0 ".concat((_b = chromeProblem(view)) !== null && _b !== void 0 ? _b : "Chrome isn't connected as ".concat(named(view, own), "."))}</Text>
      {(0, model_1.canConnectChrome)(view) && (<Button key="chrome-connect-band" variant="primary" onPress={act.connectChrome}>
          Connect
        </Button>)}
    </Box>);
}
/** The line saying the coordinator can't be reached: what this session knows may be stale, and nothing it shares reaches the others. */
function CoordinatorLine(ui, view, act) {
    var _a;
    var Box = ui.Box, Text = ui.Text, Button = ui.Button;
    var error = (_a = view.coordinator) === null || _a === void 0 ? void 0 : _a.error;
    if (error === undefined)
        return undefined;
    return (<Box key="coordinator" flexDirection="row" columnGap={2}>
      <Text color="error">⚠ Can't reach the account coordinator: {error}</Text>
      <Button key="coordinator-retry" onPress={act.retryCoordinator}>Retry</Button>
    </Box>);
}
/** The band above the prompt, drawn only while a login needs the person. */
function Band(ui, view, now, act) {
    var _a;
    var Box = ui.Box, Text = ui.Text, Button = ui.Button;
    var unreachable = CoordinatorLine(ui, view, act);
    if (unreachable !== undefined)
        return unreachable;
    var signingIn = view.accounts.find(function (a) { var _a; return ((_a = view.health[a.id]) === null || _a === void 0 ? void 0 : _a.kind) === 'logging-in'; });
    if (signingIn !== undefined) {
        return (<Box flexDirection="row" columnGap={2}>
        <Text color="warning">
          ◌ Account {signingIn.id}: in your browser, approve as {(_a = signingIn.email) !== null && _a !== void 0 ? _a : 'the account to add'} and pick the
          organization. Wrong account there? Sign out of claude.ai in another tab, then reload the sign-in page.
        </Text>
        <Button key="cancel-sign-in" onPress={act.cancelSignIn}>Cancel</Button>
      </Box>);
    }
    var locked = needsSignIn(view);
    if (locked.length > 0) {
        var names = locked.map(function (a) { return (a.email ? "".concat(a.id, " (").concat(a.email, ")") : a.id); }).join(', ');
        var why = locked.map(function (a) { return view.health[a.id]; }).find(function (h) { return (h === null || h === void 0 ? void 0 : h.kind) === 'login-needed'; });
        return (<Box flexDirection="row" columnGap={2}>
        <Text color="error">
          ⚠ Claude account {names} needs a sign-in{(why === null || why === void 0 ? void 0 : why.kind) === 'login-needed' ? " (".concat(why.why, ")") : ''}.
        </Text>
        <Button key="sign-in-all" variant="primary" hotkey="s" onPress={act.signInAll}>
          {locked.length > 1 ? 'Sign in all' : 'Sign in'}
        </Button>
      </Box>);
    }
    var chrome = ChromeBand(ui, view, act);
    if (chrome !== undefined)
        return chrome;
    var scope = (0, model_1.viewScope)(view);
    var spent = view.accounts.every(function (a) { return (0, model_1.isSpent)(view.readings[a.id], now, scope); });
    if (view.accounts.length > 0 && spent) {
        var at = (0, model_1.nextReset)(view, now);
        return (<Text color="warning">
        Every Claude account is near its {scope === undefined ? 'limit' : "".concat(scope, " limit")}{at === undefined ? '' : "; the next frees up ".concat((0, model_1.untilText)(at, now))}.
      </Text>);
    }
    return undefined;
}
/** A window's name column: "week", or a model's own week ("Fable"), and a space. */
var WINDOW_NAME_WIDTH = 6;
/** A window's bar and percent at their widest ("▰▰▰▰▰▰▰▰▰▰ 100% left"), so the reset times line up. */
var BAR_WIDTH = 20;
/**
 * One usage window of a login, filled and colored as the footer draws it, and
 * when it resets: beside it, or under the bar on a narrow pane. A plan that
 * reports no such window (a Team seat's week) says so.
 */
function windowRow(ui, fill, isActive, name, hasReading, w, now) {
    var Box = ui.Box, Text = ui.Text;
    var left = (0, model_1.roomLeft)(w, now);
    return (<Box flexDirection="row" marginLeft={3}>
      <Box width={WINDOW_NAME_WIDTH} flexShrink={0}>
        <Text dimColor={!isActive}>{name}</Text>
      </Box>
      <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
        <Box minWidth={BAR_WIDTH}>
          {left === undefined ? (<Text dimColor>
              {(0, model_1.longBar)(undefined)}
              {hasReading ? ' none reported' : ' no reading yet'}
            </Text>) : (<Text color={(0, model_1.roomColor)(left)}>{"".concat((0, model_1.longBar)((0, model_1.shown)(fill, left)), " ").concat((0, model_1.shown)(fill, left), "% ").concat(fill === 'left' ? 'left' : 'used')}</Text>)}
        </Box>
        {(w === null || w === void 0 ? void 0 : w.resetsAt) !== undefined && left !== undefined && left < 100 && <Text dimColor={!isActive}>resets {(0, model_1.untilText)(w.resetsAt, now)}</Text>}
      </Box>
    </Box>);
}
/** The slot at the right end of a login's line: as wide as a button the terminal draws, `[ Use now ]`, so the Removes beside it line up. */
var USE_WIDTH = '[ Use now ]'.length;
/**
 * The right end of a login's line: what it needs, then Remove, then rightmost
 * always its use, in a slot of its own: in use, Use now, Sign in while it
 * needs one, or signing in.
 */
function lineEnd(ui, view, a, act) {
    var _a;
    var Box = ui.Box, Text = ui.Text, Button = ui.Button;
    var health = view.health[a.id];
    var use = function (end) { return (<Box minWidth={USE_WIDTH} justifyContent="flex-end">
      {end}
    </Box>); };
    if ((_a = view.retiring) === null || _a === void 0 ? void 0 : _a.includes(a.id))
        return [use(<Text dimColor>◌ removing…</Text>)];
    var remove = a.slot !== '' &&
        (health === null || health === void 0 ? void 0 : health.kind) !== 'logging-in' &&
        (view.removing === a.id ? (<Button key={"remove-".concat(a.id)} onPress={function () { return act.remove(a.id); }}>Press again to remove</Button>) : (<Button key={"ask-remove-".concat(a.id)} dimColor onPress={function () { return act.askRemove(a.id); }}>Remove</Button>));
    switch (health === null || health === void 0 ? void 0 : health.kind) {
        case 'login-needed':
            return [
                <Text color="error">⚠ {health.why}</Text>,
                remove,
                use(<Button key={"sign-in-".concat(a.id)} variant="primary" onPress={function () { return act.signInOne(a.id); }}>Sign in</Button>),
            ];
        case 'logging-in':
            return [use(<Text color="warning">◌ signing in…</Text>)];
        default:
            return [
                remove,
                use(a.id === view.activeId ? (view.chromeConnecting === a.id ? (<Text color="warning">◌ Connecting Chrome…</Text>) : (<Text color={ACCENT}>● in use</Text>)) : ((health === null || health === void 0 ? void 0 : health.kind) === 'ok' && <Button key={"use-".concat(a.id)} onPress={function () { return act.use(a.id); }}>Use now</Button>)),
            ];
    }
}
/**
 * One login: who it is at the left of its first line, its state and presses
 * at the right (under it, still at the right, on a pane too narrow for both),
 * then its two windows. The login in use is drawn bright, the rest dim.
 */
function accountRows(ui, view, a, now, act) {
    var _a, _b, _c, _d;
    var Box = ui.Box, Text = ui.Text;
    var health = view.health[a.id];
    var r = view.readings[a.id];
    var isActive = a.id === view.activeId;
    var expiry = (health === null || health === void 0 ? void 0 : health.kind) === 'ok' ? health.refreshExpiresAt : undefined;
    // Its organization and plan, whether the Chrome extension is signed in to it, and how many sessions use it.
    var sessions = (_b = (_a = view.sessionCounts) === null || _a === void 0 ? void 0 : _a[a.id]) !== null && _b !== void 0 ? _b : 0;
    var about = __spreadArray(__spreadArray(__spreadArray([], (a.orgName === undefined ? [] : [a.plan ? "".concat(a.orgName, " \u00B7 ").concat(a.plan) : a.orgName]), true), (view.chromeAccountId === a.id ? ['Chrome'] : []), true), (sessions > 0 ? ["".concat(sessions, " session").concat(sessions === 1 ? '' : 's')] : []), true);
    return (<Box key={"account-".concat(a.id)} flexDirection="column" marginBottom={1}>
      <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
        <Box flexDirection="row" flexShrink={1}>
          <Box width={3} flexShrink={0}>
            <Text bold={isActive} dimColor={!isActive}>{a.id}</Text>
          </Box>
          <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
            <Text bold={isActive} dimColor={!isActive}>{(_c = a.email) !== null && _c !== void 0 ? _c : (a.slot === '' ? 'your normal account' : 'not signed in yet')}</Text>
            {about.length > 0 && <Text dimColor>{about.join(' · ')}</Text>}
          </Box>
        </Box>
        <Box flexDirection="row" flexGrow={1} flexWrap="wrap" justifyContent="flex-end" columnGap={2}>
          {lineEnd(ui, view, a, act)}
        </Box>
      </Box>
      {/* Only a login whose plan has a 5-hour window (as of November 2026, the $100 Max plan) shows one. */}
      {(r === null || r === void 0 ? void 0 : r.fiveHour) !== undefined && windowRow(ui, view.footer.fill, isActive, '5h', true, r.fiveHour, now)}
      {windowRow(ui, view.footer.fill, isActive, 'week', r !== undefined, r === null || r === void 0 ? void 0 : r.sevenDay, now)}
      {/* A model with a week of its own (as of November 2026, Fable): its sessions also move on once it is spent. */}
      {Object.keys((_d = r === null || r === void 0 ? void 0 : r.models) !== null && _d !== void 0 ? _d : {})
            .sort()
            .map(function (name) {
            var _a;
            return (<Box key={"model-".concat(name)}>{windowRow(ui, view.footer.fill, isActive, name, true, (_a = r === null || r === void 0 ? void 0 : r.models) === null || _a === void 0 ? void 0 : _a[name], now)}</Box>);
        })}
      {expiry !== undefined && expiry - now < model_1.SIGN_IN_WARN_MS && (<Text color="warning">   sign-in runs out {(0, model_1.untilText)(expiry, now)}; signing in again renews it</Text>)}
    </Box>);
}
/** Where the rotation moves to, as its setting picks. */
var RULE_TARGETS = {
    reset: 'the account whose usage resets soonest',
    room: 'the account with the most room right now',
    order: 'the next account in the list with room',
};
/** When the rotation moves on, counted the way the footer shows it (room left, or what is used), and where to. */
function rule(fill, rotateTo, hasFive, scope) {
    if (rotateTo === 'off')
        return 'Rotation is disabled: the session stays on the account in use until you pick another.';
    var when = hasFive
        ? fill === 'left'
            ? "Once the account in use has ".concat(100 - model_1.LEAVE_FIVE_HOUR, "% of its 5-hour window or ").concat(100 - model_1.LEAVE_SEVEN_DAY, "% of its week left")
            : "Once the account in use has used ".concat(model_1.LEAVE_FIVE_HOUR, "% of its 5-hour window or ").concat(model_1.LEAVE_SEVEN_DAY, "% of its week")
        : fill === 'left'
            ? "Once the account in use has ".concat(100 - model_1.LEAVE_SEVEN_DAY, "% of its week left")
            : "Once the account in use has used ".concat(model_1.LEAVE_SEVEN_DAY, "% of its week");
    var model = scope === undefined ? '' : " (or of its ".concat(scope, " week, as this session uses ").concat(scope, ")");
    if (rotateTo === 'reset') {
        return "Every session uses the account whose week resets soonest, so its room is used before it refills. ".concat(when).concat(model, ", moves to the next.");
    }
    return "".concat(when).concat(model, ", moves to ").concat(RULE_TARGETS[rotateTo], ".");
}
/** The pane's first line while Claude Code's security policy refuses every switch. */
function blockedRule(view) {
    return ("Can't switch accounts in this session. ".concat((0, model_1.blockedAdvice)((0, model_1.isOnNormalLogin)(view)), " More in the README."));
}
/**
 * Claude Code's own login, the one new sessions start on, as its sign-in
 * says: whose account it is, and its plan, a Team or Enterprise one keeping
 * those sessions from switching. In a session on another login, /login signs
 * in that one instead.
 */
function LoginLine(_a, view) {
    var _b, _c;
    var Text = _a.Text;
    var normal = view.accounts.find(function (a) { return a.slot === ''; });
    if (normal === undefined)
        return undefined;
    var who = (_c = (_b = view.holders[normal.id]) === null || _b === void 0 ? void 0 : _b.who) !== null && _c !== void 0 ? _c : normal;
    var isSeat = (0, model_1.isSeatPlan)(who.plan);
    var text = __spreadArray([
        "Claude Code's login: account ".concat(normal.id).concat(who.email === undefined ? '' : " (".concat(who.email, ")")).concat(who.plan === undefined ? '' : ", ".concat((0, model_1.planText)(who.plan)), "."),
        isSeat
            ? "New sessions start on it, and can't switch accounts: /login with your personal (Pro or Max) account in a session on it, then restart Claude."
            : 'New sessions start on it.'
    ], (view.activeId === normal.id ? [] : ["/login in this session signs in account ".concat(view.activeId, " instead.")]), true);
    return (<Text key="login" color={isSeat ? 'warning' : undefined} dimColor={!isSeat}>
      {text.join(' ')}
    </Text>);
}
/**
 * The pane: when the rotation moves on (or that it can't), and Claude Code's
 * own login, then every account, its usage and what can be done with it, then
 * Claude in Chrome in a session that has it, where the rotation moves to, and
 * the footer's settings, each group in its box.
 */
function Pane(ui, view, now, act) {
    var _a, _b;
    var Box = ui.Box, Text = ui.Text, Button = ui.Button;
    var accounts = __spreadArray(__spreadArray([], view.accounts.map(function (a) { return accountRows(ui, view, a, now, act); }), true), [
        <Box key="add-row" flexDirection="row" columnGap={2}>
      <Button key="add" onPress={act.add}>+ Add an account</Button>
      {view.accounts.length > 1 && <Button key="rotate" onPress={act.rotate}>Rotate now</Button>}
      {needsSignIn(view).length > 1 && <Button key="pane-sign-in-all" variant="primary" onPress={act.signInAll}>Sign in all</Button>}
    </Box>,
    ], false);
    return (<Box flexDirection="column" rowGap={1}>
      {CoordinatorLine(ui, view, act)}
      {view.isSwitchBlocked ? <Text color="warning">{blockedRule(view)}</Text> : <Text dimColor>{rule(view.footer.fill, view.rotateTo, (0, model_1.hasFiveHour)(view.readings), (0, model_1.viewScope)(view))}</Text>}
      {LoginLine(ui, view)}
      {section(ui, 'accounts', 'Accounts', accounts)}
      {(view.hasChrome === true || view.chromeAccountId !== undefined || ((_b = (_a = view.chromeAccountIds) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0) > 0) && ChromeSettings(ui, view, act)}
      {RotationSettings(ui, view, act)}
      {FooterSettings(ui, view, act)}
    </Box>);
}
