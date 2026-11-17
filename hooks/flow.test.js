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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
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
var testing_1 = require("claude-code/testing");
var core_1 = require("../coordinator/core");
var version_1 = require("../coordinator/version");
var model_1 = require("./model");
var NOW = Date.parse('2026-10-12T10:00:00Z');
var HOUR = 3600000;
var HOME = '/Users/tester';
var SLOT2 = "".concat(HOME, "/.claude/accounts/2");
/** Where Claude Code keeps logins 1 and 2 on Linux. */
var FILE1 = "".concat(HOME, "/.claude/.credentials.json");
var FILE2 = "".concat(SLOT2, "/.credentials.json");
/** The process the session runs as, as its shell's $PPID says. */
var PID = 4242;
/** Claude Code's words for a browser call that found no browser, as a session moved off its login gets them. */
var NO_BROWSER = 'Browser extension is not connected: the OAuth token Claude Code is using belongs to a different claude.ai account than the one Claude Code is logged in as. ' +
    'If CLAUDE_CODE_OAUTH_TOKEN is set in your shell or CI profile, unset it (or re-mint it for this account), then run /logout and /login in Claude Code and make sure the browser extension is signed into the same claude.ai account.';
var blob = function (token, expiresAt, plan) {
    if (expiresAt === void 0) { expiresAt = NOW + 6 * HOUR; }
    if (plan === void 0) { plan = 'max'; }
    return JSON.stringify({
        claudeAiOauth: {
            accessToken: token,
            refreshToken: "refresh-".concat(token),
            expiresAt: expiresAt,
            refreshTokenExpiresAt: NOW + 20 * 24 * HOUR,
            scopes: ['user:inference', 'user:profile'],
            subscriptionType: plan,
        },
    });
};
var ran = function (exitCode, stdout) { return ({
    exitCode: exitCode,
    stdout: stdout,
    stderr: '',
    isStdoutTruncated: false,
    isStderrTruncated: false,
}); };
/** What the store held before the coordinator, as the coordinator keeps it. */
function persisted(store) {
    var _a, _b;
    var chromeId = store['chrome-account'];
    var miss = store['chrome-miss'];
    return {
        accounts: ((_a = store.accounts) !== null && _a !== void 0 ? _a : []),
        readings: {},
        health: {},
        holders: {},
        settings: { rotateTo: (0, model_1.rotateToFrom)(store['rotate-to']), footer: (0, model_1.footerStyleFrom)(store.footer) },
        chrome: __assign(__assign(__assign({}, (typeof chromeId === 'string' ? { accountId: chromeId } : {})), { accountIds: ((_b = store['chrome-accounts']) !== null && _b !== void 0 ? _b : []) }), (typeof miss === 'string' ? { miss: miss } : {})),
    };
}
/**
 * The coordinator, run in memory on the test's clock, over the same world: the
 * keychain or credentials files, the usage and profile endpoints, `claude auth`.
 */
function coordinatorIn(w, clock, store) {
    var after = function (ms, fn) {
        var isCancelled = false;
        void clock.sleep(ms).then(function () {
            if (!isCancelled)
                fn();
        });
        return function () {
            isCancelled = true;
        };
    };
    var every = function (ms, fn) {
        var isCancelled = false;
        var loop = function () {
            return void clock.sleep(ms).then(function () {
                if (isCancelled)
                    return;
                fn();
                loop();
            });
        };
        loop();
        return function () {
            isCancelled = true;
        };
    };
    var deps = {
        now: function () { return clock.now(); },
        after: after,
        every: every,
        readStored: function (slot) {
            return __awaiter(this, void 0, void 0, function () {
                var stored, _a, file, text;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            if (!(w.system === 'macOS')) return [3 /*break*/, 2];
                            _a = w.keychain;
                            return [4 /*yield*/, (0, model_1.keychainItem)(slot)];
                        case 1:
                            stored = _a[_b.sent()];
                            return [2 /*return*/, stored === undefined ? { state: 'absent' } : { state: 'present', credential: (0, model_1.credentialFrom)(stored) }];
                        case 2:
                            file = (0, model_1.credentialsFile)(slot, HOME);
                            text = file === undefined ? undefined : w.files[file];
                            return [2 /*return*/, text === undefined || text === null ? { state: 'absent' } : { state: 'present', credential: (0, model_1.credentialFrom)(text) }];
                    }
                });
            });
        },
        fetchUsage: function (token) {
            return __awaiter(this, void 0, void 0, function () {
                var usage, five, week, _a, weekResetsAt;
                var _b;
                return __generator(this, function (_c) {
                    usage = w.usage[token];
                    if (usage === undefined)
                        return [2 /*return*/, { kind: 'rejected' }];
                    five = usage[0], week = usage[1], _a = usage[2], weekResetsAt = _a === void 0 ? '2026-10-18T03:00:00Z' : _a;
                    return [2 /*return*/, {
                            kind: 'ok',
                            body: __assign({ five_hour: five === null ? null : { utilization: five, resets_at: '2026-10-12T12:00:00Z' }, seven_day: week === null ? null : { utilization: week, resets_at: weekResetsAt } }, (((_b = w.fable) === null || _b === void 0 ? void 0 : _b[token]) === undefined
                                ? {}
                                : {
                                    limits: [
                                        { kind: 'weekly_all', percent: week, resets_at: weekResetsAt, scope: null },
                                        { kind: 'weekly_scoped', percent: w.fable[token], resets_at: weekResetsAt, scope: { model: { id: null, display_name: 'Fable' }, surface: null } },
                                    ],
                                })),
                        }];
                });
            });
        },
        fetchProfile: function (token) {
            return __awaiter(this, void 0, void 0, function () {
                var email;
                return __generator(this, function (_a) {
                    email = w.owners[token];
                    if (email === undefined)
                        return [2 /*return*/, undefined];
                    return [2 /*return*/, {
                            account: { uuid: "account-".concat(email), email: email },
                            organization: { uuid: "org-".concat(email), name: 'Org', organization_type: 'claude_max' },
                        }];
                });
            });
        },
        authStatus: function (slot) {
            return __awaiter(this, void 0, void 0, function () {
                var email, status;
                return __generator(this, function (_a) {
                    email = w.emails[slot];
                    status = email ? { loggedIn: true, email: email, orgId: "org-".concat(email), orgName: 'Org', subscriptionType: 'max' } : { loggedIn: false };
                    return [2 /*return*/, (0, model_1.identityFromStatus)(JSON.stringify(status))];
                });
            });
        },
        signIn: function (slot, email) {
            w.spawned.push({ argv: __spreadArray(['claude', 'auth', 'login', '--claudeai'], (email ? ['--email', email] : []), true), env: (0, model_1.slotEnv)(slot) });
            var done = clock.sleep(0).then(function () {
                var _a;
                (_a = w.onSignIn) === null || _a === void 0 ? void 0 : _a.call(w, slot);
                return { code: w.onSignIn === undefined ? 1 : 0, errors: '' };
            });
            return { done: done, cancel: function () { return undefined; } };
        },
        signOut: function () {
            return __awaiter(this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/];
            }); });
        },
        makeSlot: function (id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, "".concat(HOME, "/.claude/accounts/").concat(id)];
                });
            });
        },
        isAlive: function () { return true; },
        save: function () { return undefined; },
        log: function () { return undefined; },
    };
    var coordinator = new core_1.Coordinator(deps, { version: version_1.VERSION, pid: 1, startedAt: NOW, isManaged: false }, persisted(store));
    void coordinator.start();
    return coordinator;
}
/** Everything beneath the plugin: the coordinator over its socket, the session's environment, Claude in Chrome, the UI sinks. */
function world(on, w, store) {
    var _this = this;
    var _a;
    var clock = testing_1.mock.clock(on, { now: NOW });
    testing_1.mock.env(on, __assign({ USER: 'tester', HOME: HOME }, w.env));
    var coordinator = coordinatorIn(w, clock, store);
    w.coordinator = coordinator;
    var slot = (_a = w.env.CLAUDE_SECURESTORAGE_CONFIG_DIR) !== null && _a !== void 0 ? _a : '';
    on('env.set', function (_$, e) {
        var _a, _b;
        if (w.refuseEnv)
            return { deny: "env (managed): ".concat(e.name, " is not for plugins outside policy to change") };
        // The mod sets the slot in use at its start, to learn whether it may switch: not a switch.
        if (((_a = e.value) !== null && _a !== void 0 ? _a : '') === slot)
            return { value: {} };
        slot = (_b = e.value) !== null && _b !== void 0 ? _b : '';
        w.envSets.push(e);
        return { value: {} };
    });
    on('process.run', function (_$, e) {
        if (e.argv[0] === '/bin/sh')
            return { value: ran(0, "".concat(PID, "\n")) };
        throw new Error("unexpected command: ".concat(e.argv.join(' ')));
    });
    on('http.fetch', function (_$, e) { return __awaiter(_this, void 0, void 0, function () {
        var url, body, answer;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    if (((_a = e.init) === null || _a === void 0 ? void 0 : _a.socketPath) !== "".concat(HOME, "/.claude/account-rotator/coordinator.sock"))
                        throw new Error("unexpected fetch: ".concat(e.url));
                    url = new URL(e.url);
                    // Claude Code aborts a `$.http.fetch` with no answer after 30 s: a long poll must ask for less.
                    if (Number((_b = url.searchParams.get('wait')) !== null && _b !== void 0 ? _b : 0) >= 30000)
                        throw new Error("a long poll waits past $.http.fetch's 30 s: ".concat(e.url));
                    body = e.init.body === undefined ? undefined : JSON.parse(String(e.init.body));
                    return [4 /*yield*/, coordinator.handle({ method: (_c = e.init.method) !== null && _c !== void 0 ? _c : 'GET', path: url.pathname, query: Object.fromEntries(url.searchParams), body: body })];
                case 1:
                    answer = _d.sent();
                    return [2 /*return*/, { value: { status: answer.status, ok: answer.status < 300, headers: {}, text: JSON.stringify(answer.body) } }];
            }
        });
    }); });
    // Claude Code keeps a /login's sign-in where the session reads its own: the slot it is on.
    on('command.run', { command: 'login' }, function () { return __awaiter(_this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!(w.loginToken !== undefined)) return [3 /*break*/, 2];
                    _a = w.keychain;
                    return [4 /*yield*/, (0, model_1.keychainItem)(slot)];
                case 1:
                    _a[_b.sent()] = blob(w.loginToken, NOW + 6 * HOUR, w.loginPlan);
                    _b.label = 2;
                case 2: return [2 /*return*/, { text: 'Login successful' }];
            }
        });
    }); });
    // Claude in Chrome connects at its first call, as the slot the session is on then, until `/mcp reconnect`;
    // a browser answers only where that is an account a Chrome extension is signed in to.
    var isAnswered = function (chrome) {
        var _a;
        (_a = chrome.as) !== null && _a !== void 0 ? _a : (chrome.as = slot);
        return chrome.extensions.includes(chrome.as);
    };
    on('mcp.call', function (_$, e) {
        w.chromeAsked.push(slot);
        if (w.chrome === undefined)
            return { deny: "no connected MCP tool \"".concat(e.tool, "\" on a server named \"").concat(e.server, "\"") };
        var browsers = isAnswered(w.chrome) ? [{ deviceId: 'device-1', name: 'Browser 1', osPlatform: 'macOS', isLocal: true }] : [];
        return { value: { content: [{ type: 'text', text: JSON.stringify(browsers) }], isError: false } };
    });
    on('tool.call', { tool: /^mcp__claude-in-chrome__/ }, function (_$, e) {
        var _a;
        var isListed = e.tool.endsWith('__list_connected_browsers');
        if (w.chrome !== undefined && isAnswered(w.chrome)) {
            var text = isListed ? JSON.stringify([{ deviceId: 'device-1', name: 'Browser 1' }]) : 'Tabs: none';
            return { result: [{ type: 'text', text: text }], text: text };
        }
        if (isListed)
            return { result: [{ type: 'text', text: '[]' }], text: '[]' };
        if (((_a = w.chrome) === null || _a === void 0 ? void 0 : _a.asText) === true)
            return { result: [{ type: 'text', text: NO_BROWSER }], text: NO_BROWSER };
        return { isError: true, result: NO_BROWSER, text: NO_BROWSER };
    });
    on('command.run', { command: 'mcp' }, function (_$, e) {
        w.commands.push("/mcp ".concat(e.args));
        if (w.chrome !== undefined && e.args === 'reconnect claude-in-chrome')
            delete w.chrome.as;
        return { text: 'Successfully reconnected to claude-in-chrome' };
    });
    on('prompt.submit', function (_$, e) {
        w.submitted.push(e.text);
        return { text: e.text };
    });
    on('session.start', function (_$, e) { return ({ cwd: e.cwd }); });
    on('session.id', function () { return ({ value: 'session-1' }); });
    on('session.model', function () { var _a; return ({ value: (_a = w.model) !== null && _a !== void 0 ? _a : 'claude-opus-5-5' }); });
    on('tool.check', function () { return ({ decision: 'allow' }); });
    on('session.usage', function () { return ({ value: { startedAt: NOW, context: { window: 200000 }, rateLimits: w.limits } }); });
    on('session.measure', function (_$, e) { return ({ changed: e.changed }); });
    on('turn.start', function (_$, e) { return ({ turnId: e.turnId }); });
    on('turn.complete', function () { return ({ text: '' }); });
    on('classic.StopFailure', function () { return ({}); });
    on('ui.toast', function (_$, e) {
        w.toasts.push(e.text);
        return { value: undefined };
    });
    on('ui.log', function () { return ({ value: undefined }); });
    on('ui.notify', function () { return ({ value: { isSent: true, channel: 'iterm2' } }); });
    on('ui.open', function (_$, e) {
        if (!w.panes.includes(e.id))
            w.panes.push(e.id);
        return { value: { isPlaced: true } };
    });
    on('ui.panes', function () { return ({ value: w.panes.map(function (id) { return ({ id: id, title: id, isShown: true, isFocused: false, isPlaced: true }); }) }); });
    on('ui.close', function (_$, e) {
        w.panes = w.panes.filter(function (id) { return id !== e.id; });
        return { value: undefined };
    });
    return clock;
}
var fresh = function (system) {
    if (system === void 0) { system = 'macOS'; }
    return ({
        system: system,
        keychain: {},
        files: {},
        usage: {},
        owners: {},
        emails: {},
        envSets: [],
        spawned: [],
        submitted: [],
        limits: [],
        panes: [],
        toasts: [],
        env: {},
        chromeAsked: [],
        commands: [],
    });
};
var TWO_LOGINS = { accounts: [{ id: '1', slot: '', email: 'one@example.com' }, { id: '2', slot: SLOT2, email: 'two@example.com' }] };
/** The props of every Text drawn with a color or on one, its hover with them, in document order. */
function painted(node) {
    if (typeof node !== 'object' || node === null)
        return [];
    var _a = node, type = _a.type, props = _a.props, hover = _a.hover, children = _a.children;
    var isPainted = (props === null || props === void 0 ? void 0 : props.color) !== undefined || (props === null || props === void 0 ? void 0 : props.backgroundColor) !== undefined;
    var own = type === 'Text' && isPainted ? [__assign(__assign({}, props), (hover === undefined ? {} : { hover: hover }))] : [];
    return __spreadArray(__spreadArray([], own, true), (children !== null && children !== void 0 ? children : []).flatMap(painted), true);
}
/** The footer's one control: its glyphs, opening the pane. */
var GLYPHS = { key: 'accounts' };
var PANE_PROPS = {
    title: 'Claude accounts',
    isFocused: false,
    bodyColumns: 100,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
};
function start($, clock) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, $.session.start({ cwd: '/work', surface: 'terminal', isInteractive: true })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, clock.settle()];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
(0, testing_1.test)('a login with nothing in the keychain shows as needing a sign-in, with one button for it', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, clock, _i, _a, surface, band, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                w = fresh();
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                w.usage['tok-1'] = [20, 30];
                clock = world(on, w, TWO_LOGINS);
                return [4 /*yield*/, start($, clock)];
            case 1:
                _d.sent();
                _i = 0, _a = ['terminal', 'desktop'];
                _d.label = 2;
            case 2:
                if (!(_i < _a.length)) return [3 /*break*/, 8];
                surface = _a[_i];
                return [4 /*yield*/, $.ui.mount({
                        plugin: 'account-rotator',
                        surface: surface,
                        component: 'AbovePrompt',
                        props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120, scroll: { offset: 0, bodyRows: 9 }, view: {} },
                    })];
            case 3:
                band = _d.sent();
                _b = testing_1.expect;
                return [4 /*yield*/, band.find({ text: /account 2 \(two@example.com\) needs a sign-in \(not signed in\)/ })];
            case 4:
                _b.apply(void 0, [_d.sent()]).toBeDefined();
                _c = testing_1.expect;
                return [4 /*yield*/, band.find({ key: 'sign-in-all' })];
            case 5:
                _c.apply(void 0, [_d.sent()]).toBeDefined();
                return [4 /*yield*/, band.unmount()];
            case 6:
                _d.sent();
                _d.label = 7;
            case 7:
                _i++;
                return [3 /*break*/, 2];
            case 8:
                (0, testing_1.expect)(w.envSets).toEqual([]);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('moves to the login with room once the active one passes 90% of its 5-hour window', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, _a, clock, footer, button, _b, one, lineBefore, two, lineAfter, percent;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                w = fresh();
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                _a = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(SLOT2)];
            case 1:
                _a[_c.sent()] = blob('tok-2');
                w.usage['tok-1'] = [92, 40];
                w.usage['tok-2'] = [10, 30];
                clock = world(on, w, TWO_LOGINS);
                return [4 /*yield*/, start($, clock)];
            case 2:
                _c.sent();
                (0, testing_1.expect)(w.envSets).toEqual([{ name: 'CLAUDE_SECURESTORAGE_CONFIG_DIR', value: SLOT2 }]);
                return [4 /*yield*/, $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'SessionMode', props: { modes: [] } })
                    // Bars of each login's week: login 1 (60% left) on standby, login 2 (70% left) in use, a line
                    // down each side of its column, its percent at the right.
                ];
            case 3:
                footer = _c.sent();
                return [4 /*yield*/, footer.find(GLYPHS)];
            case 4:
                button = _c.sent();
                (0, testing_1.expect)(button === null || button === void 0 ? void 0 : button.text).toBe(' ▅│▆│  70% ');
                _b = painted(button === null || button === void 0 ? void 0 : button.children[0]), one = _b[0], lineBefore = _b[1], two = _b[2], lineAfter = _b[3], percent = _b[4];
                (0, testing_1.expect)(one).toMatchObject({ color: (0, model_1.roomColor)(60) });
                (0, testing_1.expect)(lineBefore).toMatchObject({ color: 'subtle' });
                (0, testing_1.expect)(two).toMatchObject({ color: (0, model_1.roomColor)(70) });
                (0, testing_1.expect)(lineAfter).toMatchObject({ color: 'subtle' });
                (0, testing_1.expect)(percent).toMatchObject({ color: (0, model_1.roomColor)(70) });
                return [4 /*yield*/, footer.unmount()];
            case 5:
                _c.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('on Linux each login is read from the credentials file in its folder, the normal one\'s in ~/.claude, even with a `security` there', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, _a, clock, footer, _b;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                w = fresh('Linux');
                w.keychain['Claude Code-credentials'] = blob('stale-1');
                _a = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(SLOT2)];
            case 1:
                _a[_d.sent()] = blob('stale-2');
                w.files[FILE1] = blob('tok-1');
                w.files[FILE2] = blob('tok-2');
                w.usage['tok-1'] = [92, 40];
                w.usage['tok-2'] = [10, 30];
                clock = world(on, w, TWO_LOGINS);
                return [4 /*yield*/, start($, clock)];
            case 2:
                _d.sent();
                (0, testing_1.expect)(w.envSets).toEqual([{ name: 'CLAUDE_SECURESTORAGE_CONFIG_DIR', value: SLOT2 }]);
                return [4 /*yield*/, $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'SessionMode', props: { modes: [] } })];
            case 3:
                footer = _d.sent();
                _b = testing_1.expect;
                return [4 /*yield*/, footer.find(GLYPHS)];
            case 4:
                _b.apply(void 0, [(_c = (_d.sent())) === null || _c === void 0 ? void 0 : _c.text]).toBe(' ▅│▆│  70% ');
                return [4 /*yield*/, footer.unmount()];
            case 5:
                _d.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('on Linux a login whose file is missing, holds no Claude login, cannot be read or is not JSON needs a sign-in, as Claude Code counts it', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var slot, w, more, clock, band, names, _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                slot = function (id) { return "".concat(HOME, "/.claude/accounts/").concat(id); };
                w = fresh('Linux');
                w.files[FILE1] = blob('tok-1');
                // Claude Code keeps MCP servers' sign-ins in the same file.
                w.files["".concat(slot(3), "/.credentials.json")] = JSON.stringify({ mcpOAuth: {} });
                w.files["".concat(slot(4), "/.credentials.json")] = null;
                w.files["".concat(slot(5), "/.credentials.json")] = blob('tok-5').slice(0, 40);
                w.usage['tok-1'] = [20, 30];
                more = [3, 4, 5].map(function (id) { return ({ id: String(id), slot: slot(id), email: "".concat(id, "@example.com") }); });
                clock = world(on, w, { accounts: __spreadArray(__spreadArray([], TWO_LOGINS.accounts, true), more, true) });
                return [4 /*yield*/, start($, clock)];
            case 1:
                _c.sent();
                return [4 /*yield*/, $.ui.mount({
                        plugin: 'account-rotator',
                        surface: 'terminal',
                        component: 'AbovePrompt',
                        props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120, scroll: { offset: 0, bodyRows: 9 }, view: {} },
                    })];
            case 2:
                band = _c.sent();
                names = /account 2 \(two@example.com\), 3 \(3@example.com\), 4 \(4@example.com\), 5 \(5@example.com\) needs a sign-in \(not signed in\)\./;
                _a = testing_1.expect;
                return [4 /*yield*/, band.find({ text: names })];
            case 3:
                _a.apply(void 0, [_c.sent()]).toBeDefined();
                _b = testing_1.expect;
                return [4 /*yield*/, band.find({ key: 'sign-in-all' })];
            case 4:
                _b.apply(void 0, [_c.sent()]).toBeDefined();
                return [4 /*yield*/, band.unmount()];
            case 5:
                _c.sent();
                (0, testing_1.expect)(w.envSets).toEqual([]);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('on Linux the band\'s Sign in reads the new login from the file the browser sign-in wrote in its slot', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, clock, footer, _a, band, _b;
    var _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                w = fresh('Linux');
                w.files[FILE1] = blob('tok-1');
                w.usage['tok-1'] = [20, 30];
                clock = world(on, w, TWO_LOGINS);
                w.onSignIn = function () {
                    w.files[FILE2] = blob('tok-2');
                    w.usage['tok-2'] = [5, 12];
                };
                return [4 /*yield*/, start($, clock)];
            case 1:
                _e.sent();
                return [4 /*yield*/, $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'SessionMode', props: { modes: [] } })];
            case 2:
                footer = _e.sent();
                _a = testing_1.expect;
                return [4 /*yield*/, footer.find(GLYPHS)];
            case 3:
                _a.apply(void 0, [(_c = (_e.sent())) === null || _c === void 0 ? void 0 : _c.text]).toBe('│▆│⚠   70% ');
                return [4 /*yield*/, $.ui.mount({
                        plugin: 'account-rotator',
                        surface: 'terminal',
                        component: 'AbovePrompt',
                        props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120, scroll: { offset: 0, bodyRows: 9 }, view: {} },
                    })];
            case 4:
                band = _e.sent();
                return [4 /*yield*/, band.press({ key: 'sign-in-all' })];
            case 5:
                _e.sent();
                return [4 /*yield*/, clock.settle()];
            case 6:
                _e.sent();
                return [4 /*yield*/, band.unmount()];
            case 7:
                _e.sent();
                return [4 /*yield*/, footer.redraw()];
            case 8:
                _e.sent();
                _b = testing_1.expect;
                return [4 /*yield*/, footer.find(GLYPHS)];
            case 9:
                _b.apply(void 0, [(_d = (_e.sent())) === null || _d === void 0 ? void 0 : _d.text]).toBe('│▆│▇   70% ');
                return [4 /*yield*/, footer.unmount()];
            case 10:
                _e.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('on Linux a switch held back for a token about to refresh is made once the file holds the refreshed one', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, clock, pane;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                w = fresh('Linux');
                w.files[FILE1] = blob('tok-1', NOW + 5 * 60000);
                w.files[FILE2] = blob('tok-2');
                w.usage['tok-1'] = [20, 30];
                w.usage['tok-2'] = [10, 30];
                clock = world(on, w, TWO_LOGINS);
                return [4 /*yield*/, start($, clock)];
            case 1:
                _a.sent();
                return [4 /*yield*/, $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'Pane', requestId: 'claude-accounts', props: PANE_PROPS })];
            case 2:
                pane = _a.sent();
                return [4 /*yield*/, pane.press({ key: 'rotate' })];
            case 3:
                _a.sent();
                return [4 /*yield*/, clock.settle()];
            case 4:
                _a.sent();
                return [4 /*yield*/, clock.advance(2 * 60000)];
            case 5:
                _a.sent();
                (0, testing_1.expect)(w.envSets).toEqual([]);
                w.files[FILE1] = blob('tok-1', NOW + 8 * HOUR);
                return [4 /*yield*/, clock.advance(3 * 60000)];
            case 6:
                _a.sent();
                (0, testing_1.expect)(w.envSets).toEqual([{ name: 'CLAUDE_SECURESTORAGE_CONFIG_DIR', value: SLOT2 }]);
                return [4 /*yield*/, pane.unmount()];
            case 7:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('the band\'s Sign in signs a locked login in through the browser, in its own slot', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, item2, clock, footer, _a, band, _b, _c;
    var _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                w = fresh();
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                w.usage['tok-1'] = [20, 30];
                return [4 /*yield*/, (0, model_1.keychainItem)(SLOT2)];
            case 1:
                item2 = _f.sent();
                clock = world(on, w, TWO_LOGINS);
                w.onSignIn = function () {
                    w.keychain[item2] = blob('tok-2');
                    w.usage['tok-2'] = [5, 12];
                };
                return [4 /*yield*/, start($, clock)];
            case 2:
                _f.sent();
                return [4 /*yield*/, $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'SessionMode', props: { modes: ['auto mode'] } })];
            case 3:
                footer = _f.sent();
                _a = testing_1.expect;
                return [4 /*yield*/, footer.find(GLYPHS)];
            case 4:
                _a.apply(void 0, [(_d = (_f.sent())) === null || _d === void 0 ? void 0 : _d.text]).toBe('│▆│⚠   70% ');
                return [4 /*yield*/, $.ui.mount({
                        plugin: 'account-rotator',
                        surface: 'terminal',
                        component: 'AbovePrompt',
                        props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120, scroll: { offset: 0, bodyRows: 9 }, view: {} },
                    })];
            case 5:
                band = _f.sent();
                return [4 /*yield*/, band.press({ key: 'sign-in-all' })];
            case 6:
                _f.sent();
                return [4 /*yield*/, clock.settle()];
            case 7:
                _f.sent();
                return [4 /*yield*/, band.unmount()];
            case 8:
                _f.sent();
                (0, testing_1.expect)(w.spawned).toEqual([
                    {
                        argv: ['claude', 'auth', 'login', '--claudeai', '--email', 'two@example.com'],
                        env: { CLAUDE_SECURESTORAGE_CONFIG_DIR: SLOT2, CLAUDE_CONFIG_DIR: SLOT2 },
                    },
                ]);
                return [4 /*yield*/, footer.redraw()];
            case 9:
                _f.sent();
                _b = testing_1.expect;
                return [4 /*yield*/, footer.find(GLYPHS)];
            case 10:
                _b.apply(void 0, [(_e = (_f.sent())) === null || _e === void 0 ? void 0 : _e.text]).toBe('│▆│▇   70% ');
                _c = testing_1.expect;
                return [4 /*yield*/, footer.find({ text: /auto mode/ })];
            case 11:
                _c.apply(void 0, [_f.sent()]).toBeDefined();
                return [4 /*yield*/, footer.unmount()];
            case 12:
                _f.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('with rotation disabled, a spent login or a turn that dies on the usage limit stays put, and the pane says so', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, _a, clock, pane, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                w = fresh();
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                _a = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(SLOT2)];
            case 1:
                _a[_c.sent()] = blob('tok-2');
                w.usage['tok-1'] = [92, 40];
                w.usage['tok-2'] = [10, 30];
                clock = world(on, w, __assign(__assign({}, TWO_LOGINS), { 'rotate-to': 'off' }));
                return [4 /*yield*/, start($, clock)];
            case 2:
                _c.sent();
                return [4 /*yield*/, clock.advance(11 * 60000)];
            case 3:
                _c.sent();
                w.usage['tok-1'] = [100, 41];
                return [4 /*yield*/, $.classic.StopFailure({ error: 'rate_limit' })];
            case 4:
                _c.sent();
                return [4 /*yield*/, clock.settle()];
            case 5:
                _c.sent();
                return [4 /*yield*/, clock.advance(36000)];
            case 6:
                _c.sent();
                (0, testing_1.expect)(w.envSets).toEqual([]);
                (0, testing_1.expect)(w.submitted).toEqual([]);
                return [4 /*yield*/, $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'Pane', requestId: 'claude-accounts', props: PANE_PROPS })];
            case 7:
                pane = _c.sent();
                _b = testing_1.expect;
                return [4 /*yield*/, pane.find({ text: /^Rotation is disabled/ })];
            case 8:
                _b.apply(void 0, [_c.sent()]).toBeDefined();
                return [4 /*yield*/, pane.unmount()];
            case 9:
                _c.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('where Claude Code\'s security policy refuses switching, as on a Team seat, the session says so at its start and once, then stops trying; a press still answers', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, _a, clock, notice, footer, _b, pane, _c;
    var _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                w = fresh();
                w.refuseEnv = true;
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                _a = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(SLOT2)];
            case 1:
                _a[_f.sent()] = blob('tok-2');
                w.usage['tok-1'] = [20, 40];
                w.usage['tok-2'] = [10, 30];
                clock = world(on, w, TWO_LOGINS);
                return [4 /*yield*/, start($, clock)];
            case 2:
                _f.sent();
                notice = function (t) { return /^Can't switch accounts in this session/.test(t) && /#team-and-enterprise-accounts/.test(t); };
                (0, testing_1.expect)(w.toasts.filter(notice)).toHaveLength(1);
                // On the normal login, a personal sign-in there gives the next session one that can switch.
                (0, testing_1.expect)(w.toasts.find(notice)).toMatch(/session that starts on a Team or Enterprise account\. Fix: \/login with your personal \(Pro or Max\) account, then restart Claude/);
                // The login in use runs out: no switch is tried, and nothing more is said.
                w.usage['tok-1'] = [95, 41];
                return [4 /*yield*/, clock.advance(21 * 60000)];
            case 3:
                _f.sent();
                w.usage['tok-1'] = [100, 41];
                return [4 /*yield*/, $.classic.StopFailure({ error: 'rate_limit' })];
            case 4:
                _f.sent();
                return [4 /*yield*/, clock.settle()];
            case 5:
                _f.sent();
                return [4 /*yield*/, clock.advance(36000)];
            case 6:
                _f.sent();
                (0, testing_1.expect)(w.toasts.filter(notice)).toHaveLength(1);
                (0, testing_1.expect)(w.submitted).toEqual([]);
                return [4 /*yield*/, $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'SessionMode', props: { modes: [] } })];
            case 7:
                footer = _f.sent();
                _b = testing_1.expect;
                return [4 /*yield*/, footer.find({ type: 'Text', text: '⚠' })];
            case 8:
                _b.apply(void 0, [(_d = (_f.sent())) === null || _d === void 0 ? void 0 : _d.props]).toMatchObject({ color: 'warning' });
                return [4 /*yield*/, footer.press({ key: 'switch-blocked' })];
            case 9:
                _f.sent();
                return [4 /*yield*/, clock.settle()];
            case 10:
                _f.sent();
                (0, testing_1.expect)(w.panes).toEqual(['claude-accounts']);
                return [4 /*yield*/, footer.unmount()];
            case 11:
                _f.sent();
                return [4 /*yield*/, $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'Pane', requestId: 'claude-accounts', props: PANE_PROPS })];
            case 12:
                pane = _f.sent();
                _c = testing_1.expect;
                return [4 /*yield*/, pane.find({ type: 'Text', text: /^Can't switch accounts in this session\. .*starts on a Team/ })];
            case 13:
                _c.apply(void 0, [(_e = (_f.sent())) === null || _e === void 0 ? void 0 : _e.props]).toMatchObject({ color: 'warning' });
                return [4 /*yield*/, pane.press({ key: 'rotate' })];
            case 14:
                _f.sent();
                return [4 /*yield*/, clock.settle()];
            case 15:
                _f.sent();
                (0, testing_1.expect)(w.toasts.filter(notice)).toHaveLength(2);
                (0, testing_1.expect)(w.toasts.filter(function (t) { return /Something went wrong|Switched to/.test(t); })).toEqual([]);
                return [4 /*yield*/, pane.unmount()];
            case 16:
                _f.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('where the policy starts refusing once the mod has moved the session to a seat, it says to start again, not to /login, which would sign in the seat', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, _a, clock, notice, pane, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                w = fresh();
                w.refuseEnv = true;
                w.env.CLAUDE_SECURESTORAGE_CONFIG_DIR = SLOT2;
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                _a = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(SLOT2)];
            case 1:
                _a[_c.sent()] = blob('tok-2');
                w.usage['tok-1'] = [20, 40];
                w.usage['tok-2'] = [10, 30];
                clock = world(on, w, TWO_LOGINS);
                return [4 /*yield*/, start($, clock)];
            case 2:
                _c.sent();
                notice = w.toasts.filter(function (t) { return /^Can't switch accounts/.test(t); });
                (0, testing_1.expect)(notice).toHaveLength(1);
                (0, testing_1.expect)(notice[0]).toMatch(/starts or reloads plugins\. Fix: quit Claude and run `claude --continue` or `claude --resume`\. Not \/restart, which keeps this account\./);
                (0, testing_1.expect)(notice[0]).not.toMatch(/\/login/);
                return [4 /*yield*/, $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'Pane', requestId: 'claude-accounts', props: PANE_PROPS })];
            case 3:
                pane = _c.sent();
                _b = testing_1.expect;
                return [4 /*yield*/, pane.find({ type: 'Text', text: /^Can't switch accounts.*Fix: quit Claude and run `claude --continue`/ })];
            case 4:
                _b.apply(void 0, [_c.sent()]).toBeDefined();
                return [4 /*yield*/, pane.unmount()];
            case 5:
                _c.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('a switch that does not take, its responses still the old login\'s minutes later, points the session back and marks the old login in use, and the rotation does not try it again', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, _a, clock, pane, ends;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                w = fresh();
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                _a = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(SLOT2)];
            case 1:
                _a[_b.sent()] = blob('tok-2');
                w.usage['tok-1'] = [93, 40];
                w.usage['tok-2'] = [10, 30];
                clock = world(on, w, TWO_LOGINS);
                return [4 /*yield*/, start($, clock)];
            case 2:
                _b.sent();
                (0, testing_1.expect)(w.envSets).toEqual([{ name: 'CLAUDE_SECURESTORAGE_CONFIG_DIR', value: SLOT2 }]);
                // Responses go on reporting login 1's usage.
                w.limits = [
                    { kind: 'five_hour', percentUsed: 93, resetsAt: '2026-10-12T12:00:00Z' },
                    { kind: 'seven_day', percentUsed: 40, resetsAt: '2026-10-18T03:00:00Z' },
                ];
                return [4 /*yield*/, clock.advance(5 * 60000)];
            case 3:
                _b.sent();
                return [4 /*yield*/, $.session.measure({ context: { window: 200000 }, rateLimits: w.limits, changed: ['rateLimits'] })];
            case 4:
                _b.sent();
                return [4 /*yield*/, clock.settle()];
            case 5:
                _b.sent();
                (0, testing_1.expect)(w.toasts.filter(function (t) { return /did not take: responses still use account 1/.test(t); })).toHaveLength(1);
                (0, testing_1.expect)(w.envSets).toEqual([
                    { name: 'CLAUDE_SECURESTORAGE_CONFIG_DIR', value: SLOT2 },
                    { name: 'CLAUDE_SECURESTORAGE_CONFIG_DIR', value: undefined },
                ]);
                return [4 /*yield*/, $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'Pane', requestId: 'claude-accounts', props: PANE_PROPS })];
            case 6:
                pane = _b.sent();
                return [4 /*yield*/, pane.findAll({ text: /^(Remove|Use now|● in use)$/ })];
            case 7:
                ends = (_b.sent()).filter(function (e) { return e.type !== 'Box'; });
                (0, testing_1.expect)(ends.map(function (e) { return e.text; })).toEqual(['● in use', 'Remove', 'Use now']);
                // Still spent, but the rotation leaves login 2 be.
                return [4 /*yield*/, $.session.measure({ context: { window: 200000 }, rateLimits: w.limits, changed: ['rateLimits'] })];
            case 8:
                // Still spent, but the rotation leaves login 2 be.
                _b.sent();
                return [4 /*yield*/, clock.advance(30 * 60000)];
            case 9:
                _b.sent();
                (0, testing_1.expect)(w.envSets).toHaveLength(2);
                return [4 /*yield*/, pane.press({ key: 'use-2' })];
            case 10:
                _b.sent();
                return [4 /*yield*/, clock.settle()];
            case 11:
                _b.sent();
                (0, testing_1.expect)(w.envSets).toHaveLength(3);
                return [4 /*yield*/, pane.unmount()];
            case 12:
                _b.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('a turn that dies on the usage limit moves to the other login, then asks Claude to carry on', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, _a, clock;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                w = fresh();
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                _a = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(SLOT2)];
            case 1:
                _a[_b.sent()] = blob('tok-2');
                w.usage['tok-1'] = [60, 40];
                w.usage['tok-2'] = [10, 30];
                clock = world(on, w, TWO_LOGINS);
                return [4 /*yield*/, start($, clock)];
            case 2:
                _b.sent();
                (0, testing_1.expect)(w.envSets).toEqual([]);
                w.usage['tok-1'] = [100, 41];
                return [4 /*yield*/, $.classic.StopFailure({ error: 'rate_limit' })];
            case 3:
                _b.sent();
                return [4 /*yield*/, clock.settle()];
            case 4:
                _b.sent();
                (0, testing_1.expect)(w.envSets).toEqual([{ name: 'CLAUDE_SECURESTORAGE_CONFIG_DIR', value: SLOT2 }]);
                (0, testing_1.expect)(w.submitted).toEqual([]);
                return [4 /*yield*/, clock.advance(36000)];
            case 5:
                _b.sent();
                (0, testing_1.expect)(w.submitted).toHaveLength(1);
                (0, testing_1.expect)(w.submitted[0]).toMatch(/Continue where you left off/);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('a switch is confirmed once a response reports the new login usage, and an idle session is not told it failed', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, _a, clock, pane, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                w = fresh();
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                _a = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(SLOT2)];
            case 1:
                _a[_d.sent()] = blob('tok-2');
                w.usage['tok-1'] = [93, 40];
                w.usage['tok-2'] = [10, 30];
                clock = world(on, w, TWO_LOGINS);
                return [4 /*yield*/, start($, clock)
                    // Minutes with no response: the last one is still login 1's, which says nothing of the switch.
                ];
            case 2:
                _d.sent();
                // Minutes with no response: the last one is still login 1's, which says nothing of the switch.
                w.limits = [{ kind: 'five_hour', percentUsed: 93, resetsAt: '2026-10-12T12:00:00Z' }];
                return [4 /*yield*/, clock.advance(5 * 60000)];
            case 3:
                _d.sent();
                (0, testing_1.expect)(w.toasts.filter(function (t) { return /has not shown/.test(t); })).toEqual([]);
                w.limits = [
                    { kind: 'five_hour', percentUsed: 11, resetsAt: '2026-10-12T12:00:00Z' },
                    { kind: 'seven_day', percentUsed: 30, resetsAt: '2026-10-18T03:00:00Z' },
                ];
                return [4 /*yield*/, $.session.measure({ context: { window: 200000 }, rateLimits: w.limits, changed: ['rateLimits'] })];
            case 4:
                _d.sent();
                return [4 /*yield*/, clock.settle()
                    // Confirmed: the next response's usage is login 2's own again.
                ];
            case 5:
                _d.sent();
                // Confirmed: the next response's usage is login 2's own again.
                w.limits = [
                    { kind: 'five_hour', percentUsed: 20, resetsAt: '2026-10-12T12:00:00Z' },
                    { kind: 'seven_day', percentUsed: 30, resetsAt: '2026-10-18T03:00:00Z' },
                ];
                return [4 /*yield*/, $.session.measure({ context: { window: 200000 }, rateLimits: w.limits, changed: ['rateLimits'] })];
            case 6:
                _d.sent();
                return [4 /*yield*/, clock.settle()];
            case 7:
                _d.sent();
                return [4 /*yield*/, $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'Pane', requestId: 'claude-accounts', props: PANE_PROPS })
                    // Room left, as the footer counts it: login 2 has used 20% of its 5-hour window and 30% of its week.
                ];
            case 8:
                pane = _d.sent();
                // Room left, as the footer counts it: login 2 has used 20% of its 5-hour window and 30% of its week.
                _b = testing_1.expect;
                return [4 /*yield*/, pane.find({ text: /^▰{8}▱{2} 80% left$/ })];
            case 9:
                // Room left, as the footer counts it: login 2 has used 20% of its 5-hour window and 30% of its week.
                _b.apply(void 0, [_d.sent()]).toBeDefined();
                _c = testing_1.expect;
                return [4 /*yield*/, pane.find({ text: /^▰{7}▱{3} 70% left$/ })];
            case 10:
                _c.apply(void 0, [_d.sent()]).toBeDefined();
                (0, testing_1.expect)(w.toasts.filter(function (t) { return /has not shown/.test(t); })).toEqual([]);
                return [4 /*yield*/, pane.unmount()];
            case 11:
                _d.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('one press on the footer opens the accounts pane, the next closes it', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, clock, footer, _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                w = fresh();
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                w.usage['tok-1'] = [20, 30];
                clock = world(on, w, TWO_LOGINS);
                return [4 /*yield*/, start($, clock)];
            case 1:
                _b.sent();
                return [4 /*yield*/, $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'SessionMode', props: { modes: [] } })
                    // Switching works here: no warning beside the glyphs.
                ];
            case 2:
                footer = _b.sent();
                // Switching works here: no warning beside the glyphs.
                _a = testing_1.expect;
                return [4 /*yield*/, footer.find({ key: 'switch-blocked' })];
            case 3:
                // Switching works here: no warning beside the glyphs.
                _a.apply(void 0, [_b.sent()]).toBeUndefined();
                return [4 /*yield*/, footer.press(GLYPHS)];
            case 4:
                _b.sent();
                return [4 /*yield*/, clock.settle()];
            case 5:
                _b.sent();
                (0, testing_1.expect)(w.panes).toEqual(['claude-accounts']);
                return [4 /*yield*/, footer.press(GLYPHS)];
            case 6:
                _b.sent();
                return [4 /*yield*/, clock.settle()];
            case 7:
                _b.sent();
                (0, testing_1.expect)(w.panes).toEqual([]);
                return [4 /*yield*/, footer.unmount()];
            case 8:
                _b.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('under the pointer the footer names its row and lights its glyphs on a shade, drawn swapped for the inverting control', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, clock, footer, _a, _b, _c, line, one, _d;
    var _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                w = fresh();
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                w.usage['tok-1'] = [20, 30];
                clock = world(on, w, TWO_LOGINS);
                return [4 /*yield*/, start($, clock)];
            case 1:
                _f.sent();
                return [4 /*yield*/, $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'SessionMode', props: { modes: [] } })];
            case 2:
                footer = _f.sent();
                _a = testing_1.expect;
                return [4 /*yield*/, footer.find({ text: 'Session:' })];
            case 3:
                _a.apply(void 0, [_f.sent()]).toBeUndefined();
                _b = testing_1.expect;
                return [4 /*yield*/, footer.find({ text: 'Weekly:' })];
            case 4:
                _b.apply(void 0, [_f.sent()]).toBeDefined();
                _d = painted;
                return [4 /*yield*/, footer.find(GLYPHS)];
            case 5:
                _c = _d.apply(void 0, [(_e = (_f.sent())) === null || _e === void 0 ? void 0 : _e.children[0]]), line = _c[0], one = _c[1];
                (0, testing_1.expect)(line).toMatchObject({ color: 'subtle', hover: { color: 'userMessageBackground', backgroundColor: 'inactive' } });
                (0, testing_1.expect)(one).toMatchObject({ color: (0, model_1.roomColor)(70), hover: { color: 'userMessageBackground', backgroundColor: (0, model_1.roomColor)(70, true) } });
                return [4 /*yield*/, footer.unmount()];
            case 6:
                _f.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('Rotate now moves to the login with the most room; the one in use is marked in use at the right end, with no switching left on it', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, SLOT3, _a, _b, three, clock, pane, _c, _d, ends;
    var _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                w = fresh();
                SLOT3 = '/Users/tester/.claude/accounts/3';
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                _a = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(SLOT2)];
            case 1:
                _a[_f.sent()] = blob('tok-2');
                _b = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(SLOT3)];
            case 2:
                _b[_f.sent()] = blob('tok-3');
                w.usage['tok-1'] = [20, 30];
                w.usage['tok-2'] = [60, 30];
                w.usage['tok-3'] = [40, 50];
                three = { accounts: __spreadArray(__spreadArray([], TWO_LOGINS.accounts, true), [{ id: '3', slot: SLOT3, email: 'three@example.com' }], false) };
                clock = world(on, w, three);
                return [4 /*yield*/, start($, clock)];
            case 3:
                _f.sent();
                return [4 /*yield*/, $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'Pane', requestId: 'claude-accounts', props: PANE_PROPS })];
            case 4:
                pane = _f.sent();
                return [4 /*yield*/, pane.press({ key: 'rotate' })];
            case 5:
                _f.sent();
                return [4 /*yield*/, clock.settle()];
            case 6:
                _f.sent();
                (0, testing_1.expect)(w.envSets).toEqual([{ name: 'CLAUDE_SECURESTORAGE_CONFIG_DIR', value: SLOT3 }]);
                return [4 /*yield*/, pane.redraw()];
            case 7:
                _f.sent();
                _c = testing_1.expect;
                return [4 /*yield*/, pane.find({ type: 'Text', text: /^● in use$/ })];
            case 8:
                _c.apply(void 0, [(_e = (_f.sent())) === null || _e === void 0 ? void 0 : _e.props]).toMatchObject({ color: 'warning' });
                _d = testing_1.expect;
                return [4 /*yield*/, pane.find({ text: /switching/ })];
            case 9:
                _d.apply(void 0, [_f.sent()]).toBeUndefined();
                return [4 /*yield*/, pane.findAll({ text: /^(Remove|Use now|● in use)$/ })];
            case 10:
                ends = (_f.sent()).filter(function (e) { return e.type !== 'Box'; });
                (0, testing_1.expect)(ends.map(function (e) { return e.text; })).toEqual(['Use now', 'Remove', 'Use now', 'Remove', '● in use']);
                return [4 /*yield*/, pane.unmount()];
            case 11:
                _f.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('with next in list picked, Rotate now moves to the login after the one in use, not the one with the most room', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, SLOT3, _a, _b, three, clock, pane, _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                w = fresh();
                SLOT3 = '/Users/tester/.claude/accounts/3';
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                _a = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(SLOT2)];
            case 1:
                _a[_e.sent()] = blob('tok-2');
                _b = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(SLOT3)];
            case 2:
                _b[_e.sent()] = blob('tok-3');
                w.usage['tok-1'] = [20, 30];
                w.usage['tok-2'] = [60, 30];
                w.usage['tok-3'] = [40, 50];
                three = { accounts: __spreadArray(__spreadArray([], TWO_LOGINS.accounts, true), [{ id: '3', slot: SLOT3, email: 'three@example.com' }], false) };
                clock = world(on, w, three);
                return [4 /*yield*/, start($, clock)];
            case 3:
                _e.sent();
                return [4 /*yield*/, $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'Pane', requestId: 'claude-accounts', props: PANE_PROPS })];
            case 4:
                pane = _e.sent();
                _c = testing_1.expect;
                return [4 /*yield*/, pane.find({ text: /^Every session uses the account whose week resets soonest/ })];
            case 5:
                _c.apply(void 0, [_e.sent()]).toBeDefined();
                return [4 /*yield*/, pane.press({ key: 'rotate-to-order' })];
            case 6:
                _e.sent();
                return [4 /*yield*/, clock.settle()];
            case 7:
                _e.sent();
                return [4 /*yield*/, pane.redraw()];
            case 8:
                _e.sent();
                _d = testing_1.expect;
                return [4 /*yield*/, pane.find({ text: /moves to the next account in the list with room/ })];
            case 9:
                _d.apply(void 0, [_e.sent()]).toBeDefined();
                return [4 /*yield*/, pane.press({ key: 'rotate' })];
            case 10:
                _e.sent();
                return [4 /*yield*/, clock.settle()];
            case 11:
                _e.sent();
                (0, testing_1.expect)(w.envSets).toEqual([{ name: 'CLAUDE_SECURESTORAGE_CONFIG_DIR', value: SLOT2 }]);
                return [4 /*yield*/, pane.unmount()];
            case 12:
                _e.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('a switch held back for a token about to refresh is said once and made once, when the refresh lands', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, _a, clock, pane;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                w = fresh();
                w.keychain['Claude Code-credentials'] = blob('tok-1', NOW + 5 * 60000);
                _a = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(SLOT2)];
            case 1:
                _a[_b.sent()] = blob('tok-2');
                w.usage['tok-1'] = [20, 30];
                w.usage['tok-2'] = [10, 30];
                clock = world(on, w, TWO_LOGINS);
                return [4 /*yield*/, start($, clock)];
            case 2:
                _b.sent();
                return [4 /*yield*/, $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'Pane', requestId: 'claude-accounts', props: PANE_PROPS })];
            case 3:
                pane = _b.sent();
                return [4 /*yield*/, pane.press({ key: 'rotate' })];
            case 4:
                _b.sent();
                return [4 /*yield*/, clock.settle()];
            case 5:
                _b.sent();
                return [4 /*yield*/, clock.advance(2 * 60000)];
            case 6:
                _b.sent();
                (0, testing_1.expect)(w.envSets).toEqual([]);
                (0, testing_1.expect)(w.toasts.filter(function (t) { return /Switching to Claude account 2/.test(t); })).toHaveLength(1);
                // Claude Code refreshes the token: the next try goes through, once.
                w.keychain['Claude Code-credentials'] = blob('tok-1', NOW + 8 * HOUR);
                return [4 /*yield*/, clock.advance(3 * 60000)];
            case 7:
                _b.sent();
                (0, testing_1.expect)(w.envSets).toEqual([{ name: 'CLAUDE_SECURESTORAGE_CONFIG_DIR', value: SLOT2 }]);
                (0, testing_1.expect)(w.toasts.filter(function (t) { return /Switched to Claude account 2/.test(t); })).toHaveLength(1);
                return [4 /*yield*/, pane.unmount()];
            case 8:
                _b.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('a login whose plan reports no weekly limit leaves its week blank in the footer', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, _a, clock, footer, _b;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                w = fresh();
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                _a = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(SLOT2)];
            case 1:
                _a[_d.sent()] = blob('tok-2');
                w.usage['tok-1'] = [20, null];
                w.usage['tok-2'] = [10, 30];
                clock = world(on, w, TWO_LOGINS);
                return [4 /*yield*/, start($, clock)];
            case 2:
                _d.sent();
                return [4 /*yield*/, $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'SessionMode', props: { modes: [] } })
                    // Login 1, in use, has no week: blank below its braille, and no week percent at the right.
                ];
            case 3:
                footer = _d.sent();
                // Login 1, in use, has no week: blank below its braille, and no week percent at the right.
                _b = testing_1.expect;
                return [4 /*yield*/, footer.find(GLYPHS)];
            case 4:
                // Login 1, in use, has no week: blank below its braille, and no week percent at the right.
                _b.apply(void 0, [(_c = (_d.sent())) === null || _c === void 0 ? void 0 : _c.text]).toBe('│·│▆       ');
                return [4 /*yield*/, footer.unmount()];
            case 5:
                _d.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('with no weekly limit on any login, the footer leaves the week row out', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, _a, clock, footer, _b;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                w = fresh();
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                _a = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(SLOT2)];
            case 1:
                _a[_d.sent()] = blob('tok-2');
                w.usage['tok-1'] = [20, null];
                w.usage['tok-2'] = [10, null];
                clock = world(on, w, TWO_LOGINS);
                return [4 /*yield*/, start($, clock)];
            case 2:
                _d.sent();
                return [4 /*yield*/, $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'SessionMode', props: { modes: [] } })];
            case 3:
                footer = _d.sent();
                _b = testing_1.expect;
                return [4 /*yield*/, footer.find(GLYPHS)];
            case 4:
                _b.apply(void 0, [(_c = (_d.sent())) === null || _c === void 0 ? void 0 : _c.text]).toBe('│⣷│⣷   80% ');
                return [4 /*yield*/, footer.unmount()];
            case 5:
                _d.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('the pane picks the footer\'s style for every session, and previews it with demo values', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, _a, clock, pane, footer, _b, _c, _d, _e, _f, _g, _h, _j, padBefore, tiledOne, padAfter, untiled, _k, _l, _m, brightOne, dimTwo, _o, _p, _q, usedOne, usedTwo, _r, _s;
    var _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3;
    return __generator(this, function (_4) {
        switch (_4.label) {
            case 0:
                w = fresh();
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                _a = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(SLOT2)];
            case 1:
                _a[_4.sent()] = blob('tok-2');
                w.usage['tok-1'] = [20, 30];
                w.usage['tok-2'] = [10, 30];
                clock = world(on, w, TWO_LOGINS);
                return [4 /*yield*/, start($, clock)];
            case 2:
                _4.sent();
                return [4 /*yield*/, $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'Pane', requestId: 'claude-accounts', props: PANE_PROPS })];
            case 3:
                pane = _4.sent();
                return [4 /*yield*/, $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'SessionMode', props: { modes: [] } })];
            case 4:
                footer = _4.sent();
                _b = testing_1.expect;
                return [4 /*yield*/, footer.find(GLYPHS)];
            case 5:
                _b.apply(void 0, [(_t = (_4.sent())) === null || _t === void 0 ? void 0 : _t.text]).toBe('│▆│▆   70% ');
                // Only the week has a row now: the pane no longer offers the 5-hour one.
                _c = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'footer-session-bars' })];
            case 6:
                // Only the week has a row now: the pane no longer offers the 5-hour one.
                _c.apply(void 0, [_4.sent()]).toBeUndefined();
                return [4 /*yield*/, pane.press({ key: 'footer-week-none' })];
            case 7:
                _4.sent();
                return [4 /*yield*/, clock.settle()];
            case 8:
                _4.sent();
                return [4 /*yield*/, footer.redraw()
                    // The glyphs are off but the percent is still on: the footer keeps just that.
                ];
            case 9:
                _4.sent();
                // The glyphs are off but the percent is still on: the footer keeps just that.
                _d = testing_1.expect;
                return [4 /*yield*/, footer.find(GLYPHS)];
            case 10:
                // The glyphs are off but the percent is still on: the footer keeps just that.
                _d.apply(void 0, [(_u = (_4.sent())) === null || _u === void 0 ? void 0 : _u.text]).toBe('  70% ');
                // Kept in the store every session reads: the next sync from it keeps the pick.
                return [4 /*yield*/, clock.advance(61000)];
            case 11:
                // Kept in the store every session reads: the next sync from it keeps the pick.
                _4.sent();
                return [4 /*yield*/, footer.redraw()];
            case 12:
                _4.sent();
                _e = testing_1.expect;
                return [4 /*yield*/, footer.find(GLYPHS)];
            case 13:
                _e.apply(void 0, [(_v = (_4.sent())) === null || _v === void 0 ? void 0 : _v.text]).toBe('  70% ');
                // The demo draws imitated usage (login 1: 70% of its week left; login 2: 40%), this session only.
                return [4 /*yield*/, pane.press({ key: 'footer-preview-demo' })];
            case 14:
                // The demo draws imitated usage (login 1: 70% of its week left; login 2: 40%), this session only.
                _4.sent();
                return [4 /*yield*/, pane.press({ key: 'footer-week-pie' })];
            case 15:
                _4.sent();
                return [4 /*yield*/, clock.settle()];
            case 16:
                _4.sent();
                return [4 /*yield*/, footer.redraw()];
            case 17:
                _4.sent();
                _f = testing_1.expect;
                return [4 /*yield*/, footer.find(GLYPHS)];
            case 18:
                _f.apply(void 0, [(_w = (_4.sent())) === null || _w === void 0 ? void 0 : _w.text]).toBe('│◕│◑   70% ');
                // The percent switches off on its own.
                return [4 /*yield*/, pane.press({ key: 'footer-percent-week' })];
            case 19:
                // The percent switches off on its own.
                _4.sent();
                return [4 /*yield*/, clock.settle()];
            case 20:
                _4.sent();
                return [4 /*yield*/, footer.redraw()];
            case 21:
                _4.sent();
                _g = testing_1.expect;
                return [4 /*yield*/, footer.find(GLYPHS)];
            case 22:
                _g.apply(void 0, [(_x = (_4.sent())) === null || _x === void 0 ? void 0 : _x.text]).toBe('│◕│◑  ');
                // 'tile': the column in use on the theme's dim gray, padded half a cell each side, kept under the pointer.
                return [4 /*yield*/, pane.press({ key: 'footer-active-tile' })];
            case 23:
                // 'tile': the column in use on the theme's dim gray, padded half a cell each side, kept under the pointer.
                _4.sent();
                return [4 /*yield*/, clock.settle()];
            case 24:
                _4.sent();
                return [4 /*yield*/, footer.redraw()];
            case 25:
                _4.sent();
                _h = testing_1.expect;
                return [4 /*yield*/, footer.find(GLYPHS)];
            case 26:
                _h.apply(void 0, [(_y = (_4.sent())) === null || _y === void 0 ? void 0 : _y.text]).toBe('▐◕▌◑  ');
                _k = painted;
                return [4 /*yield*/, footer.find(GLYPHS)];
            case 27:
                _j = _k.apply(void 0, [(_z = (_4.sent())) === null || _z === void 0 ? void 0 : _z.children[0]]), padBefore = _j[0], tiledOne = _j[1], padAfter = _j[2], untiled = _j[3];
                (0, testing_1.expect)(padBefore).toMatchObject({ color: 'subtle', hover: { color: 'userMessageBackground', backgroundColor: 'subtle' } });
                (0, testing_1.expect)(tiledOne).toMatchObject({ color: (0, model_1.roomColor)(70), backgroundColor: 'subtle', hover: { color: 'subtle', backgroundColor: (0, model_1.roomColor)(70, true) } });
                (0, testing_1.expect)(padAfter).toMatchObject({ color: 'subtle' });
                (0, testing_1.expect)(untiled).toMatchObject({ color: (0, model_1.roomColor)(40), hover: { color: 'userMessageBackground' } });
                (0, testing_1.expect)(untiled === null || untiled === void 0 ? void 0 : untiled.backgroundColor).toBeUndefined();
                // 'dim the rest': no marks beside the columns, the logins not in use dimmed.
                return [4 /*yield*/, pane.press({ key: 'footer-active-dim' })];
            case 28:
                // 'dim the rest': no marks beside the columns, the logins not in use dimmed.
                _4.sent();
                return [4 /*yield*/, clock.settle()];
            case 29:
                _4.sent();
                return [4 /*yield*/, footer.redraw()];
            case 30:
                _4.sent();
                _l = testing_1.expect;
                return [4 /*yield*/, footer.find(GLYPHS)];
            case 31:
                _l.apply(void 0, [(_0 = (_4.sent())) === null || _0 === void 0 ? void 0 : _0.text]).toBe(' ◕ ◑ ');
                _o = painted;
                return [4 /*yield*/, footer.find(GLYPHS)];
            case 32:
                _m = _o.apply(void 0, [(_1 = (_4.sent())) === null || _1 === void 0 ? void 0 : _1.children[0]]), brightOne = _m[0], dimTwo = _m[1];
                (0, testing_1.expect)(brightOne === null || brightOne === void 0 ? void 0 : brightOne.dimColor).toBeUndefined();
                (0, testing_1.expect)(dimTwo).toMatchObject({ color: (0, model_1.roomColor)(40), dimColor: true });
                // Showing what is used fills by it, in the footer and the pane; the colors still follow the room left.
                return [4 /*yield*/, pane.press({ key: 'footer-fill-used' })];
            case 33:
                // Showing what is used fills by it, in the footer and the pane; the colors still follow the room left.
                _4.sent();
                return [4 /*yield*/, clock.settle()];
            case 34:
                _4.sent();
                return [4 /*yield*/, footer.redraw()];
            case 35:
                _4.sent();
                return [4 /*yield*/, pane.redraw()];
            case 36:
                _4.sent();
                _p = testing_1.expect;
                return [4 /*yield*/, footer.find(GLYPHS)];
            case 37:
                _p.apply(void 0, [(_2 = (_4.sent())) === null || _2 === void 0 ? void 0 : _2.text]).toBe(' ◔ ◑ ');
                _r = painted;
                return [4 /*yield*/, footer.find(GLYPHS)];
            case 38:
                _q = _r.apply(void 0, [(_3 = (_4.sent())) === null || _3 === void 0 ? void 0 : _3.children[0]]), usedOne = _q[0], usedTwo = _q[1];
                (0, testing_1.expect)(usedOne).toMatchObject({ color: (0, model_1.roomColor)(70) });
                (0, testing_1.expect)(usedTwo).toMatchObject({ color: (0, model_1.roomColor)(40) });
                _s = testing_1.expect;
                return [4 /*yield*/, pane.find({ text: /^▰{2}▱{8} 20% used$/ })];
            case 39:
                _s.apply(void 0, [_4.sent()]).toBeDefined();
                return [4 /*yield*/, pane.unmount()];
            case 40:
                _4.sent();
                return [4 /*yield*/, footer.unmount()];
            case 41:
                _4.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('in Terminal.app, which draws block characters from its font, the tile pads its column with whole cells', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, _a, clock, footer, _b, _c, padBefore, tiled, padAfter, untiled, _d;
    var _e, _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                w = fresh();
                w.env.TERM_PROGRAM = 'Apple_Terminal';
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                _a = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(SLOT2)];
            case 1:
                _a[_g.sent()] = blob('tok-2');
                w.usage['tok-1'] = [20, 30];
                w.usage['tok-2'] = [10, 30];
                clock = world(on, w, __assign(__assign({}, TWO_LOGINS), { footer: { active: 'tile' } }));
                return [4 /*yield*/, start($, clock)];
            case 2:
                _g.sent();
                return [4 /*yield*/, $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'SessionMode', props: { modes: [] } })];
            case 3:
                footer = _g.sent();
                _b = testing_1.expect;
                return [4 /*yield*/, footer.find(GLYPHS)];
            case 4:
                _b.apply(void 0, [(_e = (_g.sent())) === null || _e === void 0 ? void 0 : _e.text]).toBe(' ▆ ▆   70% ');
                _d = painted;
                return [4 /*yield*/, footer.find(GLYPHS)];
            case 5:
                _c = _d.apply(void 0, [(_f = (_g.sent())) === null || _f === void 0 ? void 0 : _f.children[0]]), padBefore = _c[0], tiled = _c[1], padAfter = _c[2], untiled = _c[3];
                (0, testing_1.expect)(padBefore).toMatchObject({ backgroundColor: 'subtle', hover: { color: 'subtle' } });
                (0, testing_1.expect)(tiled).toMatchObject({ color: (0, model_1.roomColor)(70), backgroundColor: 'subtle' });
                (0, testing_1.expect)(padAfter).toMatchObject({ backgroundColor: 'subtle', hover: { color: 'subtle' } });
                (0, testing_1.expect)(untiled).toMatchObject({ color: (0, model_1.roomColor)(70) });
                (0, testing_1.expect)(untiled === null || untiled === void 0 ? void 0 : untiled.backgroundColor).toBeUndefined();
                return [4 /*yield*/, footer.unmount()];
            case 6:
                _g.sent();
                return [2 /*return*/];
        }
    });
}); });
var SLOT3 = "".concat(HOME, "/.claude/accounts/3");
var THREE_LOGINS = { accounts: __spreadArray(__spreadArray([], TWO_LOGINS.accounts, true), [{ id: '3', slot: SLOT3, email: 'three@example.com' }], false) };
/** The person types /login at the prompt. */
var LOGIN = { command: 'login', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: true, columns: 120 } };
/** Three logins, each signed in as its own account; the session on login 3, as the mod leaves it after a switch. */
function onThree(w) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    w.env.CLAUDE_SECURESTORAGE_CONFIG_DIR = SLOT3;
                    w.keychain['Claude Code-credentials'] = blob('tok-1');
                    _a = w.keychain;
                    return [4 /*yield*/, (0, model_1.keychainItem)(SLOT2)];
                case 1:
                    _a[_c.sent()] = blob('tok-2');
                    _b = w.keychain;
                    return [4 /*yield*/, (0, model_1.keychainItem)(SLOT3)];
                case 2:
                    _b[_c.sent()] = blob('tok-3');
                    w.usage['tok-1'] = [20, 30];
                    w.usage['tok-2'] = [10, 30];
                    w.usage['tok-3'] = [40, 50];
                    w.owners = { 'tok-1': 'one@example.com', 'tok-2': 'two@example.com', 'tok-3': 'three@example.com' };
                    return [2 /*return*/];
            }
        });
    });
}
(0, testing_1.test)('a /login in a session on login 3 that signs in login 2\'s account leaves 3 needing its own sign-in, and the session moves to 2', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, clock, band, _a, _b, pane, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                w = fresh();
                return [4 /*yield*/, onThree(w)];
            case 1:
                _d.sent();
                clock = world(on, w, THREE_LOGINS);
                return [4 /*yield*/, start($, clock)];
            case 2:
                _d.sent();
                (0, testing_1.expect)(w.envSets).toEqual([]);
                // The browser was signed in to claude.ai as login 2's account.
                w.loginToken = 'tok-2b';
                w.usage['tok-2b'] = [10, 30];
                w.owners['tok-2b'] = 'two@example.com';
                return [4 /*yield*/, $.command.run(LOGIN)];
            case 3:
                _d.sent();
                return [4 /*yield*/, clock.settle()];
            case 4:
                _d.sent();
                return [4 /*yield*/, $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'AbovePrompt', props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 120, scroll: { offset: 0, bodyRows: 9 }, view: {} } })];
            case 5:
                band = _d.sent();
                _a = testing_1.expect;
                return [4 /*yield*/, band.find({ text: /account 3 \(three@example.com\) needs a sign-in \(signed in as account 2 now\)/ })];
            case 6:
                _a.apply(void 0, [_d.sent()]).toBeDefined();
                return [4 /*yield*/, band.unmount()
                    // The session moves off it, to the login the rotation picks: 2, with the most room.
                ];
            case 7:
                _d.sent();
                // The session moves off it, to the login the rotation picks: 2, with the most room.
                (0, testing_1.expect)(w.envSets).toEqual([{ name: 'CLAUDE_SECURESTORAGE_CONFIG_DIR', value: SLOT2 }]);
                (0, testing_1.expect)(w.toasts.filter(function (t) { return /^Switched to Claude account 2 .*: account 3 needs a sign-in\.$/.test(t); })).toHaveLength(1);
                // A later check, its token run out, keeps 3 needing a sign-in: the sign-in it holds is still 2's.
                _b = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(SLOT3)];
            case 8:
                // A later check, its token run out, keeps 3 needing a sign-in: the sign-in it holds is still 2's.
                _b[_d.sent()] = blob('tok-2b', NOW + 30 * 60000);
                return [4 /*yield*/, clock.advance(41 * 60000)];
            case 9:
                _d.sent();
                return [4 /*yield*/, $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'Pane', requestId: 'claude-accounts', props: PANE_PROPS })];
            case 10:
                pane = _d.sent();
                _c = testing_1.expect;
                return [4 /*yield*/, pane.find({ text: /^⚠ signed in as account 2 now$/ })];
            case 11:
                _c.apply(void 0, [_d.sent()]).toBeDefined();
                return [4 /*yield*/, pane.unmount()];
            case 12:
                _d.sent();
                (0, testing_1.expect)(w.envSets).toHaveLength(1);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('a /login in a session on login 3 that signs in an account not on the list makes 3 that account, and says /login signs in the account the session is on', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, clock, pane, _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                w = fresh();
                return [4 /*yield*/, onThree(w)];
            case 1:
                _c.sent();
                clock = world(on, w, THREE_LOGINS);
                return [4 /*yield*/, start($, clock)];
            case 2:
                _c.sent();
                w.loginToken = 'tok-x';
                w.usage['tok-x'] = [5, 10];
                w.owners['tok-x'] = 'x@example.com';
                return [4 /*yield*/, $.command.run(LOGIN)];
            case 3:
                _c.sent();
                return [4 /*yield*/, clock.settle()];
            case 4:
                _c.sent();
                (0, testing_1.expect)(w.toasts.filter(function (t) { return /^Claude account 3 is x@example.com · Org now: a \/login in a session on account 3 signs in there, not Claude Code's login\.$/.test(t); })).toHaveLength(1);
                (0, testing_1.expect)(w.envSets).toEqual([]);
                return [4 /*yield*/, $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'Pane', requestId: 'claude-accounts', props: PANE_PROPS })];
            case 5:
                pane = _c.sent();
                _a = testing_1.expect;
                return [4 /*yield*/, pane.find({ text: 'x@example.com' })];
            case 6:
                _a.apply(void 0, [_c.sent()]).toBeDefined();
                _b = testing_1.expect;
                return [4 /*yield*/, pane.find({ text: 'three@example.com' })];
            case 7:
                _b.apply(void 0, [_c.sent()]).toBeUndefined();
                return [4 /*yield*/, pane.unmount()];
            case 8:
                _c.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('a /login in a session on login 3 as its own account again, as a new token is, changes nothing', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, clock, pane, _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                w = fresh();
                return [4 /*yield*/, onThree(w)];
            case 1:
                _c.sent();
                clock = world(on, w, THREE_LOGINS);
                return [4 /*yield*/, start($, clock)];
            case 2:
                _c.sent();
                w.loginToken = 'tok-3b';
                w.usage['tok-3b'] = [40, 50];
                w.owners['tok-3b'] = 'three@example.com';
                return [4 /*yield*/, $.command.run(LOGIN)];
            case 3:
                _c.sent();
                return [4 /*yield*/, clock.settle()];
            case 4:
                _c.sent();
                (0, testing_1.expect)(w.toasts).toEqual([]);
                (0, testing_1.expect)(w.envSets).toEqual([]);
                return [4 /*yield*/, $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'Pane', requestId: 'claude-accounts', props: PANE_PROPS })];
            case 5:
                pane = _c.sent();
                _a = testing_1.expect;
                return [4 /*yield*/, pane.find({ text: /^⚠/ })];
            case 6:
                _a.apply(void 0, [_c.sent()]).toBeUndefined();
                _b = testing_1.expect;
                return [4 /*yield*/, pane.find({ text: 'three@example.com' })];
            case 7:
                _b.apply(void 0, [_c.sent()]).toBeDefined();
                return [4 /*yield*/, pane.unmount()];
            case 8:
                _c.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('the pane names Claude Code\'s own login, where new sessions start, and its plan; on another login it says /login there signs that one in', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, _a, clock, pane, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                w = fresh();
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                _a = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(SLOT2)];
            case 1:
                _a[_d.sent()] = blob('tok-2', NOW + 6 * HOUR, 'team');
                w.usage['tok-1'] = [20, 30];
                w.usage['tok-2'] = [10, 30];
                w.owners = { 'tok-1': 'one@example.com', 'tok-2': 'two@example.com' };
                clock = world(on, w, TWO_LOGINS);
                return [4 /*yield*/, start($, clock)];
            case 2:
                _d.sent();
                return [4 /*yield*/, $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'Pane', requestId: 'claude-accounts', props: PANE_PROPS })];
            case 3:
                pane = _d.sent();
                _b = testing_1.expect;
                return [4 /*yield*/, pane.find({ type: 'Text', text: "Claude Code's login: account 1 (one@example.com), personal Max. New sessions start on it." })];
            case 4:
                _b.apply(void 0, [_d.sent()]).toBeDefined();
                return [4 /*yield*/, pane.press({ key: 'rotate' })];
            case 5:
                _d.sent();
                return [4 /*yield*/, clock.settle()];
            case 6:
                _d.sent();
                return [4 /*yield*/, pane.redraw()];
            case 7:
                _d.sent();
                _c = testing_1.expect;
                return [4 /*yield*/, pane.find({ type: 'Text', text: /^Claude Code's login: account 1 \(one@example\.com\), personal Max\. New sessions start on it\. \/login in this session signs in account 2 instead\.$/ })];
            case 8:
                _c.apply(void 0, [_d.sent()]).toBeDefined();
                return [4 /*yield*/, pane.unmount()];
            case 9:
                _d.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('a Team seat as Claude Code\'s own login is told in the pane: new sessions start on it, and can\'t switch', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, clock, pane, line;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                w = fresh();
                w.keychain['Claude Code-credentials'] = blob('tok-1', NOW + 6 * HOUR, 'team');
                w.usage['tok-1'] = [20, 30];
                w.owners = { 'tok-1': 'one@example.com' };
                clock = world(on, w, TWO_LOGINS);
                return [4 /*yield*/, start($, clock)];
            case 1:
                _a.sent();
                return [4 /*yield*/, $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'Pane', requestId: 'claude-accounts', props: PANE_PROPS })];
            case 2:
                pane = _a.sent();
                return [4 /*yield*/, pane.find({ type: 'Text', text: /^Claude Code's login: account 1 \(one@example\.com\), a Team seat\. New sessions start on it, and can't switch accounts: / })];
            case 3:
                line = _a.sent();
                (0, testing_1.expect)(line === null || line === void 0 ? void 0 : line.props).toMatchObject({ color: 'warning' });
                return [4 /*yield*/, pane.unmount()];
            case 4:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('a /login on Claude Code\'s login that signs in a Team seat on the list leaves login 1 needing its own sign-in, and the pane names the seat as Claude Code\'s login', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, _a, clock, pane, line;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                w = fresh();
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                _a = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(SLOT2)];
            case 1:
                _a[_b.sent()] = blob('tok-2', NOW + 6 * HOUR, 'team');
                w.usage['tok-1'] = [20, 30];
                w.usage['tok-2'] = [10, 30];
                w.owners = { 'tok-1': 'one@example.com', 'tok-2': 'two@example.com' };
                clock = world(on, w, TWO_LOGINS);
                return [4 /*yield*/, start($, clock)];
            case 2:
                _b.sent();
                w.loginToken = 'tok-2b';
                w.loginPlan = 'team';
                w.usage['tok-2b'] = [10, 30];
                w.owners['tok-2b'] = 'two@example.com';
                return [4 /*yield*/, $.command.run(LOGIN)];
            case 3:
                _b.sent();
                return [4 /*yield*/, clock.settle()];
            case 4:
                _b.sent();
                (0, testing_1.expect)(w.toasts.filter(function (t) { return /^Claude account 1 \(one@example.com · Org\) needs a sign-in \(signed in as account 2 now\)/.test(t); })).toHaveLength(1);
                (0, testing_1.expect)(w.envSets).toEqual([{ name: 'CLAUDE_SECURESTORAGE_CONFIG_DIR', value: SLOT2 }]);
                return [4 /*yield*/, $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'Pane', requestId: 'claude-accounts', props: PANE_PROPS })];
            case 5:
                pane = _b.sent();
                return [4 /*yield*/, pane.find({ type: 'Text', text: /^Claude Code's login: account 1 \(two@example\.com\), a Team seat\. New sessions start on it, and can't switch accounts: .* \/login in this session signs in account 2 instead\.$/ })];
            case 6:
                line = _b.sent();
                (0, testing_1.expect)(line === null || line === void 0 ? void 0 : line.props).toMatchObject({ color: 'warning' });
                return [4 /*yield*/, pane.unmount()];
            case 7:
                _b.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('a view kept from the code before a hot reload, which lacks what this code added, still draws and checks', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, clock, before, isKept, pane, _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                w = fresh();
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                w.usage['tok-1'] = [20, 30];
                w.owners = { 'tok-1': 'one@example.com' };
                clock = world(on, w, TWO_LOGINS);
                before = { accounts: TWO_LOGINS.accounts, readings: {}, health: {}, activeId: '1', footer: model_1.DEFAULT_FOOTER, rotateTo: 'reset', hasFontBlocks: false };
                isKept = false;
                on('state.get', function (_$, e, next) { return __awaiter(void 0, void 0, void 0, function () {
                    var read;
                    var _a, _b;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0: return [4 /*yield*/, next(e)];
                            case 1:
                                read = _c.sent();
                                if (isKept || e.plugin !== 'account-rotator' || e.key !== 'view')
                                    return [2 /*return*/, read];
                                isKept = true;
                                return [2 /*return*/, { value: { value: before, version: (_b = (_a = read.value) === null || _a === void 0 ? void 0 : _a.version) !== null && _b !== void 0 ? _b : 0 } }];
                        }
                    });
                }); });
                return [4 /*yield*/, start($, clock)];
            case 1:
                _b.sent();
                return [4 /*yield*/, $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'Pane', requestId: 'claude-accounts', props: PANE_PROPS })];
            case 2:
                pane = _b.sent();
                _a = testing_1.expect;
                return [4 /*yield*/, pane.find({ type: 'Text', text: "Claude Code's login: account 1 (one@example.com), personal Max. New sessions start on it." })];
            case 3:
                _a.apply(void 0, [_b.sent()]).toBeDefined();
                return [4 /*yield*/, pane.unmount()];
            case 4:
                _b.sent();
                return [2 /*return*/];
        }
    });
}); });
var BAND_PROPS = { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 160, scroll: { offset: 0, bodyRows: 9 }, view: {} };
/**
 * A call to one of Claude in Chrome's tools, as Claude makes one: its input
 * typed loosely, as the type root lists only the MCP tools this machine has.
 */
var browse = function ($, tool, args) {
    if (args === void 0) { args = {}; }
    return $.tool.call(__assign({ tool: "mcp__claude-in-chrome__".concat(tool) }, args));
};
/** Login 1 spent and login 2 with room, both signed in. */
function spentOne(w) {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    w.keychain['Claude Code-credentials'] = blob('tok-1');
                    _a = w.keychain;
                    return [4 /*yield*/, (0, model_1.keychainItem)(SLOT2)];
                case 1:
                    _a[_b.sent()] = blob('tok-2');
                    w.usage['tok-1'] = [92, 40];
                    w.usage['tok-2'] = [10, 30];
                    return [2 /*return*/];
            }
        });
    });
}
/** Login 1 with room and login 2 spent, both signed in. */
function spentTwo(w) {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    w.keychain['Claude Code-credentials'] = blob('tok-1');
                    _a = w.keychain;
                    return [4 /*yield*/, (0, model_1.keychainItem)(SLOT2)];
                case 1:
                    _a[_b.sent()] = blob('tok-2');
                    w.usage['tok-1'] = [20, 30];
                    w.usage['tok-2'] = [100, 30];
                    return [2 /*return*/];
            }
        });
    });
}
/** A session with no person at it, as `claude -p` runs. */
function startHeadless($, clock) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, $.session.start({ cwd: '/work', surface: 'terminal', isInteractive: false })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, clock.settle()];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
var mountPane = function ($) {
    return $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'Pane', requestId: 'claude-accounts', props: PANE_PROPS });
};
var mountBand = function ($) { return $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'AbovePrompt', props: BAND_PROPS }); };
var slots = function (w) { return w.envSets.map(function (e) { var _a; return (_a = e.value) !== null && _a !== void 0 ? _a : ''; }); };
(0, testing_1.test)('before the rotation moves the session off Claude Code\'s login, Claude in Chrome connects there, where the extension answers, and goes on answering as the session moves', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, clock, learned, called, pane, _a, _b, _c, _d, _e, _f;
    var _g;
    var _h, _j;
    return __generator(this, function (_k) {
        switch (_k.label) {
            case 0:
                w = fresh();
                w.chrome = { extensions: [''] };
                w.emails = (_g = { '': 'one@example.com' }, _g[SLOT2] = 'two@example.com', _g);
                return [4 /*yield*/, spentOne(w)];
            case 1:
                _k.sent();
                clock = world(on, w, TWO_LOGINS);
                return [4 /*yield*/, start($, clock)
                    // Asked once, on login 1, and only then moved to login 2.
                ];
            case 2:
                _k.sent();
                // Asked once, on login 1, and only then moved to login 2.
                (0, testing_1.expect)(w.chromeAsked).toEqual(['']);
                (0, testing_1.expect)(slots(w)).toEqual([SLOT2]);
                learned = /^Claude in Chrome connects as Claude account 1 \(one@example\.com[^)]*\): your Chrome extension is signed in to it\.$/;
                (0, testing_1.expect)(w.toasts.filter(function (t) { return learned.test(t); })).toHaveLength(1);
                return [4 /*yield*/, browse($, 'tabs_context_mcp')];
            case 3:
                called = _k.sent();
                (0, testing_1.expect)(called.isError).toBeUndefined();
                (0, testing_1.expect)(called.context).toBeUndefined();
                // Kept in the store every session reads: the next sync from it keeps it.
                return [4 /*yield*/, clock.advance(61000)];
            case 4:
                // Kept in the store every session reads: the next sync from it keeps it.
                _k.sent();
                return [4 /*yield*/, mountPane($)];
            case 5:
                pane = _k.sent();
                _a = testing_1.expect;
                return [4 /*yield*/, pane.find({ type: 'Text', text: 'Org · max · Chrome' })];
            case 6:
                _a.apply(void 0, [_k.sent()]).toBeDefined();
                _b = testing_1.expect;
                return [4 /*yield*/, pane.find({ type: 'Text', text: 'Active Claude extension accounts from your Chrome windows:' })];
            case 7:
                _b.apply(void 0, [_k.sent()]).toBeDefined();
                _c = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-row-1' })];
            case 8:
                _c.apply(void 0, [(_h = (_k.sent())) === null || _h === void 0 ? void 0 : _h.text]).toMatch(/● in use$/);
                _d = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-use-1' })];
            case 9:
                _d.apply(void 0, [_k.sent()]).toBeUndefined();
                // No Chrome extension has answered as login 2: it waits behind Other accounts.
                _e = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-row-2' })];
            case 10:
                // No Chrome extension has answered as login 2: it waits behind Other accounts.
                _e.apply(void 0, [_k.sent()]).toBeUndefined();
                _f = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-others' })];
            case 11:
                _f.apply(void 0, [(_j = (_k.sent())) === null || _j === void 0 ? void 0 : _j.text]).toBe('▸ Other accounts');
                return [4 /*yield*/, pane.unmount()];
            case 12:
                _k.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('a Chrome opened later on an account the box hasn\'t listed is a press away: Other accounts lists the rest, and Try to connect connects there and lists it, the one before with Use for Chrome', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, _a, clock, pane, _b, _c, _d, _e, _f, _g, _h;
    var _j, _k, _l, _m, _o;
    return __generator(this, function (_p) {
        switch (_p.label) {
            case 0:
                w = fresh();
                w.chrome = { extensions: [''] };
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                _a = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(SLOT2)];
            case 1:
                _a[_p.sent()] = blob('tok-2');
                w.usage['tok-1'] = [20, 40];
                w.usage['tok-2'] = [10, 30];
                clock = world(on, w, __assign(__assign({}, TWO_LOGINS), { 'chrome-account': '1' }));
                return [4 /*yield*/, start($, clock)
                    // As it opened: connected on login 1, where the session is, and a browser answered there.
                ];
            case 2:
                _p.sent();
                // As it opened: connected on login 1, where the session is, and a browser answered there.
                (0, testing_1.expect)(w.chromeAsked).toEqual(['']);
                return [4 /*yield*/, mountPane($)];
            case 3:
                pane = _p.sent();
                _b = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-row-1' })];
            case 4:
                _b.apply(void 0, [(_j = (_p.sent())) === null || _j === void 0 ? void 0 : _j.text]).toMatch(/● in use$/);
                _c = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-row-2' })];
            case 5:
                _c.apply(void 0, [_p.sent()]).toBeUndefined();
                // Chrome opens in a second profile, signed in to login 2's account.
                w.chrome.extensions.push(SLOT2);
                return [4 /*yield*/, pane.press({ key: 'chrome-others' })];
            case 6:
                _p.sent();
                return [4 /*yield*/, clock.settle()];
            case 7:
                _p.sent();
                return [4 /*yield*/, pane.redraw()];
            case 8:
                _p.sent();
                _d = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-others' })];
            case 9:
                _d.apply(void 0, [(_k = (_p.sent())) === null || _k === void 0 ? void 0 : _k.text]).toBe('▾ Other accounts');
                _e = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-try-2' })];
            case 10:
                _e.apply(void 0, [(_l = (_p.sent())) === null || _l === void 0 ? void 0 : _l.text]).toBe('Try to connect');
                return [4 /*yield*/, pane.press({ key: 'chrome-try-2' })];
            case 11:
                _p.sent();
                return [4 /*yield*/, clock.settle()];
            case 12:
                _p.sent();
                (0, testing_1.expect)(slots(w)).toEqual([SLOT2]);
                return [4 /*yield*/, clock.advance(36000)];
            case 13:
                _p.sent();
                (0, testing_1.expect)(w.commands).toEqual(['/mcp reconnect claude-in-chrome']);
                (0, testing_1.expect)(w.chromeAsked).toEqual(['', SLOT2]);
                (0, testing_1.expect)(w.toasts).toContain('Claude in Chrome is connected as Claude account 2 (two@example.com).');
                (0, testing_1.expect)(slots(w)).toEqual([SLOT2, '']);
                // Kept in the store every session reads: both listed from now on, login 2 in use, none left behind the press.
                return [4 /*yield*/, clock.advance(61000)];
            case 14:
                // Kept in the store every session reads: both listed from now on, login 2 in use, none left behind the press.
                _p.sent();
                return [4 /*yield*/, pane.redraw()];
            case 15:
                _p.sent();
                _f = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-row-2' })];
            case 16:
                _f.apply(void 0, [(_m = (_p.sent())) === null || _m === void 0 ? void 0 : _m.text]).toMatch(/● in use$/);
                _g = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-use-1' })];
            case 17:
                _g.apply(void 0, [(_o = (_p.sent())) === null || _o === void 0 ? void 0 : _o.text]).toBe('Use for Chrome');
                _h = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-others' })];
            case 18:
                _h.apply(void 0, [_p.sent()]).toBeUndefined();
                return [4 /*yield*/, pane.unmount()];
            case 19:
                _p.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('Try to connect as an account no Chrome answers as changes nothing: the box keeps the accounts that answered, lists none that didn\'t as active, and Claude in Chrome goes back to the one picked before', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, _a, clock, pane, _b, _c, _d, _e, _f, _g, _h;
    var _j, _k, _l, _m;
    return __generator(this, function (_o) {
        switch (_o.label) {
            case 0:
                w = fresh();
                w.chrome = { extensions: [''] };
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                _a = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(SLOT2)];
            case 1:
                _a[_o.sent()] = blob('tok-2');
                w.usage['tok-1'] = [20, 40];
                w.usage['tok-2'] = [10, 30];
                clock = world(on, w, __assign(__assign({}, TWO_LOGINS), { 'chrome-account': '1' }));
                return [4 /*yield*/, start($, clock)];
            case 2:
                _o.sent();
                return [4 /*yield*/, mountPane($)];
            case 3:
                pane = _o.sent();
                return [4 /*yield*/, pane.press({ key: 'chrome-others' })];
            case 4:
                _o.sent();
                return [4 /*yield*/, clock.settle()];
            case 5:
                _o.sent();
                return [4 /*yield*/, pane.redraw()];
            case 6:
                _o.sent();
                _b = testing_1.expect;
                return [4 /*yield*/, pane.find({ type: 'Text', text: 'No Chrome extension is known to answer as these:' })];
            case 7:
                _b.apply(void 0, [_o.sent()]).toBeDefined();
                return [4 /*yield*/, pane.press({ key: 'chrome-try-2' })];
            case 8:
                _o.sent();
                return [4 /*yield*/, clock.settle()];
            case 9:
                _o.sent();
                (0, testing_1.expect)(slots(w)).toEqual([SLOT2]);
                return [4 /*yield*/, clock.advance(36000)];
            case 10:
                _o.sent();
                (0, testing_1.expect)(w.chromeAsked).toEqual(['', SLOT2]);
                (0, testing_1.expect)(w.toasts).toContain('No Chrome extension answers as Claude account 2 (two@example.com). Open Chrome and check its Claude extension is signed in with that email; if it is, restart Chrome and try again. ' +
                    'Claude in Chrome goes back to account 1 (one@example.com).');
                // Back on login 1, Claude in Chrome connects there again once the move lands.
                (0, testing_1.expect)(slots(w)).toEqual([SLOT2, '']);
                return [4 /*yield*/, clock.advance(36000)];
            case 11:
                _o.sent();
                (0, testing_1.expect)(w.commands).toEqual(['/mcp reconnect claude-in-chrome', '/mcp reconnect claude-in-chrome']);
                (0, testing_1.expect)(w.chromeAsked).toEqual(['', SLOT2, '']);
                (0, testing_1.expect)(w.toasts).toContain('Claude in Chrome is connected as Claude account 1 (one@example.com).');
                // Kept in the store every session reads: login 1 still picked, listed and in use; login 2 only behind Other accounts.
                return [4 /*yield*/, clock.advance(61000)];
            case 12:
                // Kept in the store every session reads: login 1 still picked, listed and in use; login 2 only behind Other accounts.
                _o.sent();
                return [4 /*yield*/, pane.redraw()];
            case 13:
                _o.sent();
                _c = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-row-1' })];
            case 14:
                _c.apply(void 0, [(_j = (_o.sent())) === null || _j === void 0 ? void 0 : _j.text]).toMatch(/● in use$/);
                _d = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-try-2' })];
            case 15:
                _d.apply(void 0, [_o.sent()]).toBeDefined();
                return [4 /*yield*/, pane.press({ key: 'chrome-others' })];
            case 16:
                _o.sent();
                return [4 /*yield*/, clock.settle()];
            case 17:
                _o.sent();
                return [4 /*yield*/, pane.redraw()];
            case 18:
                _o.sent();
                _e = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-row-2' })];
            case 19:
                _e.apply(void 0, [_o.sent()]).toBeUndefined();
                _f = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'account-1' })];
            case 20:
                _f.apply(void 0, [(_k = (_o.sent())) === null || _k === void 0 ? void 0 : _k.text]).toMatch(/one@example\.com.*Chrome/);
                _g = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'account-2' })];
            case 21:
                _g.apply(void 0, [(_l = (_o.sent())) === null || _l === void 0 ? void 0 : _l.text]).toMatch(/two@example\.com/);
                _h = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'account-2' })];
            case 22:
                _h.apply(void 0, [(_m = (_o.sent())) === null || _m === void 0 ? void 0 : _m.text]).not.toMatch(/Chrome/);
                return [4 /*yield*/, pane.unmount()];
            case 23:
                _o.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('Use for Chrome on a listed account whose Chrome has closed since finds no browser: the box lists it no more, Try to connect under Other accounts, and Claude in Chrome goes back to the one picked before', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, _a, clock, pane, _b, _c, _d, _e, _f, _g;
    var _h, _j, _k, _l;
    return __generator(this, function (_m) {
        switch (_m.label) {
            case 0:
                w = fresh();
                w.chrome = { extensions: ['', SLOT2] };
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                _a = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(SLOT2)];
            case 1:
                _a[_m.sent()] = blob('tok-2');
                w.usage['tok-1'] = [20, 40];
                w.usage['tok-2'] = [10, 30];
                clock = world(on, w, __assign(__assign({}, TWO_LOGINS), { 'chrome-account': '1', 'chrome-accounts': ['1', '2'] }));
                return [4 /*yield*/, start($, clock)];
            case 2:
                _m.sent();
                return [4 /*yield*/, mountPane($)];
            case 3:
                pane = _m.sent();
                _b = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-row-1' })];
            case 4:
                _b.apply(void 0, [(_h = (_m.sent())) === null || _h === void 0 ? void 0 : _h.text]).toMatch(/● in use$/);
                _c = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-use-2' })];
            case 5:
                _c.apply(void 0, [(_j = (_m.sent())) === null || _j === void 0 ? void 0 : _j.text]).toBe('Use for Chrome');
                _d = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-others' })];
            case 6:
                _d.apply(void 0, [_m.sent()]).toBeUndefined();
                // The Chrome profile signed in to login 2's account closes.
                w.chrome.extensions = [''];
                return [4 /*yield*/, pane.press({ key: 'chrome-use-2' })];
            case 7:
                _m.sent();
                return [4 /*yield*/, clock.settle()];
            case 8:
                _m.sent();
                (0, testing_1.expect)(slots(w)).toEqual([SLOT2]);
                return [4 /*yield*/, clock.advance(36000)];
            case 9:
                _m.sent();
                (0, testing_1.expect)(w.chromeAsked).toEqual(['', SLOT2]);
                (0, testing_1.expect)(w.toasts).toContain('No Chrome extension answers as Claude account 2 (two@example.com). Open Chrome and check its Claude extension is signed in with that email; if it is, restart Chrome and try again. ' +
                    'Claude in Chrome goes back to account 1 (one@example.com).');
                (0, testing_1.expect)(slots(w)).toEqual([SLOT2, '']);
                return [4 /*yield*/, clock.advance(36000)];
            case 10:
                _m.sent();
                (0, testing_1.expect)(w.chromeAsked).toEqual(['', SLOT2, '']);
                // Kept in the store every session reads: login 1 picked and in use, login 2 behind Other accounts, to try again.
                return [4 /*yield*/, clock.advance(61000)];
            case 11:
                // Kept in the store every session reads: login 1 picked and in use, login 2 behind Other accounts, to try again.
                _m.sent();
                return [4 /*yield*/, pane.redraw()];
            case 12:
                _m.sent();
                _e = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-row-1' })];
            case 13:
                _e.apply(void 0, [(_k = (_m.sent())) === null || _k === void 0 ? void 0 : _k.text]).toMatch(/● in use$/);
                _f = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-row-2' })];
            case 14:
                _f.apply(void 0, [_m.sent()]).toBeUndefined();
                return [4 /*yield*/, pane.press({ key: 'chrome-others' })];
            case 15:
                _m.sent();
                return [4 /*yield*/, clock.settle()];
            case 16:
                _m.sent();
                return [4 /*yield*/, pane.redraw()];
            case 17:
                _m.sent();
                _g = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-try-2' })];
            case 18:
                _g.apply(void 0, [(_l = (_m.sent())) === null || _l === void 0 ? void 0 : _l.text]).toBe('Try to connect');
                return [4 /*yield*/, pane.unmount()];
            case 19:
                _m.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('a window opening while the picked account\'s Chrome is closed lists that account no more, and a browser call answered there lists it in use again', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, _a, clock, pane, _b, _c, _d, _e, _f, _g, _h;
    var _j, _k, _l;
    return __generator(this, function (_m) {
        switch (_m.label) {
            case 0:
                w = fresh();
                w.chrome = { extensions: [] };
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                _a = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(SLOT2)];
            case 1:
                _a[_m.sent()] = blob('tok-2');
                w.usage['tok-1'] = [20, 40];
                w.usage['tok-2'] = [10, 30];
                clock = world(on, w, __assign(__assign({}, TWO_LOGINS), { 'chrome-account': '1', 'chrome-accounts': ['1', '2'] }));
                return [4 /*yield*/, start($, clock)];
            case 2:
                _m.sent();
                (0, testing_1.expect)(w.chromeAsked).toEqual(['']);
                // Kept in the store every session reads: login 2, not checked, still listed.
                return [4 /*yield*/, clock.advance(61000)];
            case 3:
                // Kept in the store every session reads: login 2, not checked, still listed.
                _m.sent();
                return [4 /*yield*/, mountPane($)];
            case 4:
                pane = _m.sent();
                _b = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-row-1' })];
            case 5:
                _b.apply(void 0, [_m.sent()]).toBeUndefined();
                _c = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-use-2' })];
            case 6:
                _c.apply(void 0, [(_j = (_m.sent())) === null || _j === void 0 ? void 0 : _j.text]).toBe('Use for Chrome');
                _d = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-others' })];
            case 7:
                _d.apply(void 0, [(_k = (_m.sent())) === null || _k === void 0 ? void 0 : _k.text]).toBe('▸ Other accounts');
                _e = testing_1.expect;
                return [4 /*yield*/, pane.find({
                        type: 'Text',
                        text: '⚠ No Chrome extension answers as account 1 (one@example.com). Open Chrome and check its Claude extension is signed in with that email; if it is, restart Chrome.',
                    })];
            case 8:
                _e.apply(void 0, [_m.sent()]).toBeDefined();
                // Chrome opens, signed in to login 1's account.
                w.chrome.extensions.push('');
                _f = testing_1.expect;
                return [4 /*yield*/, browse($, 'tabs_context_mcp')];
            case 9:
                _f.apply(void 0, [(_m.sent()).isError]).toBeUndefined();
                return [4 /*yield*/, clock.advance(61000)];
            case 10:
                _m.sent();
                return [4 /*yield*/, pane.redraw()];
            case 11:
                _m.sent();
                _g = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-row-1' })];
            case 12:
                _g.apply(void 0, [(_l = (_m.sent())) === null || _l === void 0 ? void 0 : _l.text]).toMatch(/● in use$/);
                _h = testing_1.expect;
                return [4 /*yield*/, pane.find({ type: 'Text', text: /^⚠/ })];
            case 13:
                _h.apply(void 0, [_m.sent()]).toBeUndefined();
                return [4 /*yield*/, pane.unmount()];
            case 14:
                _m.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('as a session opens it visits the extension\'s account to connect Claude in Chrome there, whatever usage that has left, and comes back; browser calls wait meanwhile', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, clock, band, _a, visiting, _b, _c, held, _d, pane, _e, _f;
    var _g;
    return __generator(this, function (_h) {
        switch (_h.label) {
            case 0:
                w = fresh();
                w.chrome = { extensions: [SLOT2] };
                return [4 /*yield*/, spentTwo(w)];
            case 1:
                _h.sent();
                clock = world(on, w, __assign(__assign({}, TWO_LOGINS), { 'chrome-account': '2' }));
                return [4 /*yield*/, start($, clock)];
            case 2:
                _h.sent();
                (0, testing_1.expect)(slots(w)).toEqual([SLOT2]);
                // Not asked before Claude Code reads login 2's sign-in, which a call would connect as.
                (0, testing_1.expect)(w.chromeAsked).toEqual([]);
                return [4 /*yield*/, mountBand($)];
            case 3:
                band = _h.sent();
                _a = testing_1.expect;
                return [4 /*yield*/, band.find({ type: 'Text', text: '◌ Connecting Chrome as account 2 (two@example.com)…' })];
            case 4:
                _a.apply(void 0, [_h.sent()]).toBeDefined();
                return [4 /*yield*/, band.unmount()
                    // The visit is no switch: login 2's line says so, not "in use".
                ];
            case 5:
                _h.sent();
                return [4 /*yield*/, mountPane($)];
            case 6:
                visiting = _h.sent();
                _b = testing_1.expect;
                return [4 /*yield*/, visiting.find({ type: 'Text', text: '◌ Connecting Chrome…' })];
            case 7:
                _b.apply(void 0, [_h.sent()]).toBeDefined();
                _c = testing_1.expect;
                return [4 /*yield*/, visiting.find({ type: 'Text', text: '● in use' })];
            case 8:
                _c.apply(void 0, [_h.sent()]).toBeUndefined();
                return [4 /*yield*/, visiting.unmount()];
            case 9:
                _h.sent();
                return [4 /*yield*/, $.tool.check({ tool: 'mcp__claude-in-chrome__navigate', input: { url: 'https://example.com' } })];
            case 10:
                held = _h.sent();
                (0, testing_1.expect)(held.decision).toBe('deny');
                (0, testing_1.expect)(held.reason).toMatch(/^The account-rotator mod is connecting Claude in Chrome as Claude account 2 \(two@example\.com\).* End your turn now/);
                return [4 /*yield*/, clock.advance(36000)
                    // A first connection, nothing to reconnect; then back on login 1, which has room. No switch was told: the visit is the band's.
                ];
            case 11:
                _h.sent();
                // A first connection, nothing to reconnect; then back on login 1, which has room. No switch was told: the visit is the band's.
                (0, testing_1.expect)(w.chromeAsked).toEqual([SLOT2]);
                (0, testing_1.expect)(w.commands).toEqual([]);
                (0, testing_1.expect)(slots(w)).toEqual([SLOT2, '']);
                (0, testing_1.expect)(w.toasts.filter(function (t) { return /^Switched to/.test(t); })).toEqual([]);
                _d = testing_1.expect;
                return [4 /*yield*/, $.tool.check({ tool: 'mcp__claude-in-chrome__navigate', input: {} })];
            case 12:
                _d.apply(void 0, [(_h.sent()).decision]).toBe('allow');
                return [4 /*yield*/, mountPane($)];
            case 13:
                pane = _h.sent();
                _e = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-row-2' })];
            case 14:
                _e.apply(void 0, [(_g = (_h.sent())) === null || _g === void 0 ? void 0 : _g.text]).toMatch(/● in use$/);
                return [4 /*yield*/, pane.unmount()
                    // The connection stays login 2's on login 1.
                ];
            case 15:
                _h.sent();
                // The connection stays login 2's on login 1.
                _f = testing_1.expect;
                return [4 /*yield*/, browse($, 'navigate', { url: 'https://example.com' })];
            case 16:
                // The connection stays login 2's on login 1.
                _f.apply(void 0, [(_h.sent()).isError]).toBeUndefined();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('as a session opens it connects Claude in Chrome on the extension\'s account, then goes straight to the account whose week resets soonest, not back first', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, slot, _a, _b, accounts, clock, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                w = fresh();
                slot = function (id) { return "".concat(HOME, "/.claude/accounts/").concat(id); };
                w.chrome = { extensions: [slot(3)] };
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                _a = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(slot(2))];
            case 1:
                _a[_d.sent()] = blob('tok-2');
                _b = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(slot(3))];
            case 2:
                _b[_d.sent()] = blob('tok-3');
                // Claude Code's login resets last, the extension's account (3) next, account 2 first.
                w.usage['tok-1'] = [null, 10, '2026-10-18T03:00:00Z'];
                w.usage['tok-2'] = [null, 0, '2026-10-13T03:00:00Z'];
                w.usage['tok-3'] = [null, 0, '2026-10-15T03:00:00Z'];
                accounts = [1, 2, 3].map(function (id) { return ({ id: String(id), slot: id === 1 ? '' : slot(id), email: "".concat(id, "@example.com") }); });
                clock = world(on, w, { accounts: accounts, 'chrome-account': '3' });
                return [4 /*yield*/, start($, clock)];
            case 3:
                _d.sent();
                (0, testing_1.expect)(slots(w)).toEqual([slot(3)]);
                return [4 /*yield*/, clock.advance(36000)];
            case 4:
                _d.sent();
                (0, testing_1.expect)(w.chromeAsked).toEqual([slot(3)]);
                (0, testing_1.expect)(slots(w)).toEqual([slot(3), slot(2)]);
                (0, testing_1.expect)(w.toasts.filter(function (t) { return /^Switched to Claude account 2 .*: its week resets before account 1's\.$/.test(t); })).toHaveLength(1);
                // It stays there: the connection is account 3's, and no response moves it on.
                return [4 /*yield*/, clock.advance(6 * 60000)];
            case 5:
                // It stays there: the connection is account 3's, and no response moves it on.
                _d.sent();
                (0, testing_1.expect)(slots(w)).toEqual([slot(3), slot(2)]);
                _c = testing_1.expect;
                return [4 /*yield*/, browse($, 'navigate', { url: 'https://example.com' })];
            case 6:
                _c.apply(void 0, [(_d.sent()).isError]).toBeUndefined();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('as a session opens, a visit to the extension\'s account that resets soonest stays there', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, _a, clock;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                w = fresh();
                w.chrome = { extensions: [SLOT2] };
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                _a = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(SLOT2)];
            case 1:
                _a[_b.sent()] = blob('tok-2');
                w.usage['tok-1'] = [null, 10, '2026-10-18T03:00:00Z'];
                w.usage['tok-2'] = [null, 0, '2026-10-13T03:00:00Z'];
                clock = world(on, w, __assign(__assign({}, TWO_LOGINS), { 'chrome-account': '2' }));
                return [4 /*yield*/, start($, clock)];
            case 2:
                _b.sent();
                return [4 /*yield*/, clock.advance(36000)];
            case 3:
                _b.sent();
                (0, testing_1.expect)(w.chromeAsked).toEqual([SLOT2]);
                (0, testing_1.expect)(slots(w)).toEqual([SLOT2]);
                return [4 /*yield*/, clock.advance(6 * 60000)];
            case 4:
                _b.sent();
                (0, testing_1.expect)(slots(w)).toEqual([SLOT2]);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('a turn that hits the usage limit while the session visits a spent extension account carries on once it is back', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, clock;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                w = fresh();
                w.chrome = { extensions: [SLOT2] };
                return [4 /*yield*/, spentTwo(w)];
            case 1:
                _a.sent();
                clock = world(on, w, __assign(__assign({}, TWO_LOGINS), { 'chrome-account': '2' }));
                return [4 /*yield*/, start($, clock)];
            case 2:
                _a.sent();
                return [4 /*yield*/, $.classic.StopFailure({ error: 'rate_limit' })];
            case 3:
                _a.sent();
                return [4 /*yield*/, clock.settle()];
            case 4:
                _a.sent();
                return [4 /*yield*/, clock.advance(36000)];
            case 5:
                _a.sent();
                (0, testing_1.expect)(slots(w)).toEqual([SLOT2, '']);
                (0, testing_1.expect)(w.submitted).toEqual([]);
                return [4 /*yield*/, clock.advance(36000)];
            case 6:
                _a.sent();
                (0, testing_1.expect)(w.submitted).toHaveLength(1);
                (0, testing_1.expect)(w.submitted[0]).toMatch(/Continue where you left off/);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('a dropped connection that Claude Code reports as an ordinary result, not an error, has the mod reconnect it all the same', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, clock, called;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                w = fresh();
                w.chrome = { extensions: [''], asText: true };
                w.env.CLAUDE_SECURESTORAGE_CONFIG_DIR = SLOT2;
                return [4 /*yield*/, spentOne(w)];
            case 1:
                _b.sent();
                clock = world(on, w, __assign(__assign({}, TWO_LOGINS), { 'chrome-account': '1' }));
                return [4 /*yield*/, start($, clock)];
            case 2:
                _b.sent();
                return [4 /*yield*/, clock.advance(36000)];
            case 3:
                _b.sent();
                return [4 /*yield*/, clock.advance(36000)];
            case 4:
                _b.sent();
                (0, testing_1.expect)(slots(w)).toEqual(['', SLOT2]);
                w.chrome.as = SLOT2;
                return [4 /*yield*/, browse($, 'tabs_context_mcp', { createIfEmpty: true })];
            case 5:
                called = _b.sent();
                (0, testing_1.expect)(called.isError).toBeUndefined();
                (0, testing_1.expect)((_a = called.context) === null || _a === void 0 ? void 0 : _a[0]).toMatch(/^Claude in Chrome connected as Claude account 1 \(one@example\.com\) and found no browser\. The account-rotator mod is now reconnecting it/);
                return [4 /*yield*/, clock.settle()];
            case 6:
                _b.sent();
                return [4 /*yield*/, clock.advance(36000)];
            case 7:
                _b.sent();
                (0, testing_1.expect)(w.commands).toEqual(['/mcp reconnect claude-in-chrome']);
                (0, testing_1.expect)(w.toasts).toContain('Claude in Chrome is connected as Claude account 1 (one@example.com).');
                (0, testing_1.expect)(slots(w)).toEqual(['', SLOT2, '', SLOT2]);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('list_connected_browsers listing none counts as a dropped connection, and has the mod reconnect it', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, clock, called, _a;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                w = fresh();
                w.chrome = { extensions: [''] };
                w.env.CLAUDE_SECURESTORAGE_CONFIG_DIR = SLOT2;
                return [4 /*yield*/, spentOne(w)];
            case 1:
                _c.sent();
                clock = world(on, w, __assign(__assign({}, TWO_LOGINS), { 'chrome-account': '1' }));
                return [4 /*yield*/, start($, clock)];
            case 2:
                _c.sent();
                return [4 /*yield*/, clock.advance(36000)];
            case 3:
                _c.sent();
                return [4 /*yield*/, clock.advance(36000)];
            case 4:
                _c.sent();
                w.chrome.as = SLOT2;
                return [4 /*yield*/, browse($, 'list_connected_browsers')];
            case 5:
                called = _c.sent();
                (0, testing_1.expect)(called.text).toBe('[]');
                (0, testing_1.expect)((_b = called.context) === null || _b === void 0 ? void 0 : _b[0]).toMatch(/The account-rotator mod is now reconnecting it/);
                return [4 /*yield*/, clock.settle()];
            case 6:
                _c.sent();
                return [4 /*yield*/, clock.advance(36000)];
            case 7:
                _c.sent();
                (0, testing_1.expect)(w.commands).toEqual(['/mcp reconnect claude-in-chrome']);
                // Once connected, a list with a browser in it is no drop.
                _a = testing_1.expect;
                return [4 /*yield*/, browse($, 'list_connected_browsers')];
            case 8:
                // Once connected, a list with a browser in it is no drop.
                _a.apply(void 0, [(_c.sent()).context]).toBeUndefined();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('when the connection drops and comes back as the account in use, the next browser call has the mod reconnect it as the extension\'s account, not /login, and tell Claude to carry on once one answers', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, clock, called, band, _a, _b;
    var _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                w = fresh();
                w.chrome = { extensions: [''] };
                w.env.CLAUDE_SECURESTORAGE_CONFIG_DIR = SLOT2;
                return [4 /*yield*/, spentOne(w)];
            case 1:
                _d.sent();
                clock = world(on, w, __assign(__assign({}, TWO_LOGINS), { 'chrome-account': '1' }));
                return [4 /*yield*/, start($, clock)
                    // As it opened: on login 1 to connect there, spent as it is, then back on login 2.
                ];
            case 2:
                _d.sent();
                // As it opened: on login 1 to connect there, spent as it is, then back on login 2.
                return [4 /*yield*/, clock.advance(36000)];
            case 3:
                // As it opened: on login 1 to connect there, spent as it is, then back on login 2.
                _d.sent();
                (0, testing_1.expect)(w.chromeAsked).toEqual(['']);
                (0, testing_1.expect)(slots(w)).toEqual(['', SLOT2]);
                return [4 /*yield*/, clock.advance(36000)
                    // The connection drops and comes back as login 2, which the extension doesn't answer.
                ];
            case 4:
                _d.sent();
                // The connection drops and comes back as login 2, which the extension doesn't answer.
                w.chrome.as = SLOT2;
                return [4 /*yield*/, browse($, 'navigate', { url: 'https://example.com' })];
            case 5:
                called = _d.sent();
                (0, testing_1.expect)(called.isError).toBe(true);
                (0, testing_1.expect)((_c = called.context) === null || _c === void 0 ? void 0 : _c[0]).toBe('Claude in Chrome connected as Claude account 1 (one@example.com) and found no browser. ' +
                    "The account-rotator mod is now reconnecting it as Claude account 1 (one@example.com), the account the user's Chrome extension is signed in to, which takes under a minute. " +
                    "End your turn now: you'll get a message once it's connected. Don't suggest /login: it doesn't fix this.");
                return [4 /*yield*/, clock.settle()];
            case 6:
                _d.sent();
                (0, testing_1.expect)(slots(w)).toEqual(['', SLOT2, '']);
                return [4 /*yield*/, mountBand($)];
            case 7:
                band = _d.sent();
                _a = testing_1.expect;
                return [4 /*yield*/, band.find({ type: 'Text', text: '◌ Connecting Chrome as account 1 (one@example.com)…' })];
            case 8:
                _a.apply(void 0, [_d.sent()]).toBeDefined();
                return [4 /*yield*/, band.unmount()];
            case 9:
                _d.sent();
                return [4 /*yield*/, clock.advance(36000)];
            case 10:
                _d.sent();
                (0, testing_1.expect)(w.commands).toEqual(['/mcp reconnect claude-in-chrome']);
                (0, testing_1.expect)(w.chromeAsked).toEqual(['', '']);
                (0, testing_1.expect)(w.toasts).toContain('Claude in Chrome is connected as Claude account 1 (one@example.com).');
                // Back on login 2, and Claude is told to carry on once that lands.
                (0, testing_1.expect)(slots(w)).toEqual(['', SLOT2, '', SLOT2]);
                (0, testing_1.expect)(w.submitted).toEqual([]);
                return [4 /*yield*/, clock.advance(36000)];
            case 11:
                _d.sent();
                (0, testing_1.expect)(w.submitted).toEqual(['Claude in Chrome is connected as Claude account 1 (one@example.com). Continue where you left off.']);
                _b = testing_1.expect;
                return [4 /*yield*/, browse($, 'navigate', { url: 'https://example.com' })];
            case 12:
                _b.apply(void 0, [(_d.sent()).isError]).toBeUndefined();
                (0, testing_1.expect)(w.toasts.filter(function (t) { return /Something went wrong/.test(t); })).toEqual([]);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('a session Claude Code stops from switching, on another account than the extension\'s, can\'t connect Claude in Chrome: Claude and the band give the command that brings the conversation back connected', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, clock, called, band, _a, _b, _c, pane, _d, _e, _f, _g;
    var _h;
    return __generator(this, function (_j) {
        switch (_j.label) {
            case 0:
                w = fresh();
                w.chrome = { extensions: [''] };
                w.env.CLAUDE_SECURESTORAGE_CONFIG_DIR = SLOT2;
                w.refuseEnv = true;
                return [4 /*yield*/, spentOne(w)];
            case 1:
                _j.sent();
                clock = world(on, w, __assign(__assign({}, TWO_LOGINS), { 'chrome-account': '1' }));
                return [4 /*yield*/, start($, clock)];
            case 2:
                _j.sent();
                return [4 /*yield*/, browse($, 'tabs_context_mcp')];
            case 3:
                called = _j.sent();
                (0, testing_1.expect)((_h = called.context) === null || _h === void 0 ? void 0 : _h[0]).toMatch(/Tell the user that to use Chrome, they quit Claude Code and run `claude --resume session-1` in this terminal/);
                return [4 /*yield*/, mountBand($)];
            case 4:
                band = _j.sent();
                _a = testing_1.expect;
                return [4 /*yield*/, band.find({ type: 'Text', text: "⚠ This window can't switch to account 1 (one@example.com). Quit, then run: claude --resume session-1" })];
            case 5:
                _a.apply(void 0, [_j.sent()]).toBeDefined();
                _b = testing_1.expect;
                return [4 /*yield*/, band.find({ key: 'chrome-connect-band' })];
            case 6:
                _b.apply(void 0, [_j.sent()]).toBeUndefined();
                return [4 /*yield*/, band.unmount()];
            case 7:
                _j.sent();
                (0, testing_1.expect)(w.envSets).toEqual([]);
                (0, testing_1.expect)(w.commands).toEqual([]);
                // Connected after all, the box says why the accounts behind Other accounts can't be tried here.
                return [4 /*yield*/, clock.advance(61000)];
            case 8:
                // Connected after all, the box says why the accounts behind Other accounts can't be tried here.
                _j.sent();
                w.chrome.as = '';
                _c = testing_1.expect;
                return [4 /*yield*/, browse($, 'tabs_context_mcp')];
            case 9:
                _c.apply(void 0, [(_j.sent()).isError]).toBeUndefined();
                return [4 /*yield*/, mountPane($)];
            case 10:
                pane = _j.sent();
                _d = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-use-2' })];
            case 11:
                _d.apply(void 0, [_j.sent()]).toBeUndefined();
                return [4 /*yield*/, pane.press({ key: 'chrome-others' })];
            case 12:
                _j.sent();
                return [4 /*yield*/, clock.settle()];
            case 13:
                _j.sent();
                return [4 /*yield*/, pane.redraw()];
            case 14:
                _j.sent();
                _e = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-row-1' })];
            case 15:
                _e.apply(void 0, [_j.sent()]).toBeDefined();
                _f = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-try-1' })];
            case 16:
                _f.apply(void 0, [_j.sent()]).toBeUndefined();
                _g = testing_1.expect;
                return [4 /*yield*/, pane.find({ type: 'Text', text: "⚠ This window can't switch accounts, so Chrome can't move to another one here. Quit, then run: claude --resume session-1" })];
            case 17:
                _g.apply(void 0, [_j.sent()]).toBeDefined();
                return [4 /*yield*/, pane.unmount()];
            case 18:
                _j.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('with no account named for the Chrome extension, a browser call that finds no browser has Claude ask which it is; picked in the pane, Connect connects there, comes back, and tells Claude to carry on', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, _a, clock, called, band, _b, pane, _c, _d, _e, _f;
    var _g, _h;
    return __generator(this, function (_j) {
        switch (_j.label) {
            case 0:
                w = fresh();
                w.chrome = { extensions: [''] };
                w.env.CLAUDE_SECURESTORAGE_CONFIG_DIR = SLOT2;
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                _a = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(SLOT2)];
            case 1:
                _a[_j.sent()] = blob('tok-2');
                w.usage['tok-1'] = [20, 40];
                w.usage['tok-2'] = [10, 30];
                clock = world(on, w, TWO_LOGINS);
                return [4 /*yield*/, start($, clock)];
            case 2:
                _j.sent();
                return [4 /*yield*/, browse($, 'tabs_context_mcp')];
            case 3:
                called = _j.sent();
                (0, testing_1.expect)((_g = called.context) === null || _g === void 0 ? void 0 : _g[0]).toMatch(/^Claude in Chrome connected as Claude account 2 \(two@example\.com\) and found no browser\. .* Ask the user to press Use for Chrome or Try to connect next to it under Chrome in the Claude accounts panel/);
                return [4 /*yield*/, mountBand($)];
            case 4:
                band = _j.sent();
                _b = testing_1.expect;
                return [4 /*yield*/, band.find({ type: 'Text', text: '⚠ Claude in Chrome: which account is your Chrome extension signed in to?' })];
            case 5:
                _b.apply(void 0, [_j.sent()]).toBeDefined();
                return [4 /*yield*/, band.press({ key: 'chrome-pick' })];
            case 6:
                _j.sent();
                return [4 /*yield*/, clock.settle()];
            case 7:
                _j.sent();
                (0, testing_1.expect)(w.panes).toEqual(['claude-accounts']);
                return [4 /*yield*/, band.unmount()];
            case 8:
                _j.sent();
                return [4 /*yield*/, mountPane($)];
            case 9:
                pane = _j.sent();
                _c = testing_1.expect;
                return [4 /*yield*/, pane.find({ type: 'Text', text: 'No Chrome extension found yet. Which account is yours signed in to?' })];
            case 10:
                _c.apply(void 0, [_j.sent()]).toBeDefined();
                _d = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-try-2' })];
            case 11:
                _d.apply(void 0, [_j.sent()]).toBeDefined();
                return [4 /*yield*/, pane.press({ key: 'chrome-try-1' })];
            case 12:
                _j.sent();
                return [4 /*yield*/, clock.settle()];
            case 13:
                _j.sent();
                (0, testing_1.expect)(slots(w)).toEqual(['']);
                return [4 /*yield*/, clock.advance(36000)];
            case 14:
                _j.sent();
                return [4 /*yield*/, pane.redraw()];
            case 15:
                _j.sent();
                _e = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-row-1' })];
            case 16:
                _e.apply(void 0, [(_h = (_j.sent())) === null || _h === void 0 ? void 0 : _h.text]).toMatch(/● in use$/);
                _f = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-row-2' })];
            case 17:
                _f.apply(void 0, [_j.sent()]).toBeUndefined();
                return [4 /*yield*/, pane.unmount()
                    // Back on login 2, where the session was; Claude is told once that lands.
                ];
            case 18:
                _j.sent();
                // Back on login 2, where the session was; Claude is told once that lands.
                (0, testing_1.expect)(slots(w)).toEqual(['', SLOT2]);
                return [4 /*yield*/, clock.advance(36000)];
            case 19:
                _j.sent();
                (0, testing_1.expect)(w.submitted).toEqual(['Claude in Chrome is connected as Claude account 1 (one@example.com). Continue where you left off.']);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('a Connect that finds no browser says to check Chrome and its extension\'s email, and a call that finds none then asks the person instead of connecting again', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, clock, called, band, noBrowser, _a;
    var _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                w = fresh();
                w.chrome = { extensions: ['a browser signed in elsewhere'] };
                w.env.CLAUDE_SECURESTORAGE_CONFIG_DIR = SLOT2;
                return [4 /*yield*/, spentOne(w)];
            case 1:
                _c.sent();
                clock = world(on, w, __assign(__assign({}, TWO_LOGINS), { 'chrome-account': '1' }));
                return [4 /*yield*/, start($, clock)
                    // As it opened: no browser as login 1, quietly, and back on login 2.
                ];
            case 2:
                _c.sent();
                // As it opened: no browser as login 1, quietly, and back on login 2.
                return [4 /*yield*/, clock.advance(36000)];
            case 3:
                // As it opened: no browser as login 1, quietly, and back on login 2.
                _c.sent();
                (0, testing_1.expect)(w.chromeAsked).toEqual(['']);
                (0, testing_1.expect)(slots(w)).toEqual(['', SLOT2]);
                (0, testing_1.expect)(w.toasts.filter(function (t) { return /Chrome extension answers/.test(t); })).toEqual([]);
                return [4 /*yield*/, browse($, 'tabs_context_mcp')];
            case 4:
                called = _c.sent();
                (0, testing_1.expect)((_b = called.context) === null || _b === void 0 ? void 0 : _b[0]).toMatch(/^No Chrome extension answers as Claude account 1 \(one@example\.com\).*Ask the user to open Chrome and check the email its Claude extension is signed in with\..*press Connect above the prompt/);
                return [4 /*yield*/, clock.settle()];
            case 5:
                _c.sent();
                (0, testing_1.expect)(slots(w)).toEqual(['', SLOT2]);
                return [4 /*yield*/, mountBand($)];
            case 6:
                band = _c.sent();
                noBrowser = '⚠ No Chrome extension answers as account 1 (one@example.com). Open Chrome and check its Claude extension is signed in with that email; if it is, restart Chrome.';
                _a = testing_1.expect;
                return [4 /*yield*/, band.find({ type: 'Text', text: noBrowser })];
            case 7:
                _a.apply(void 0, [_c.sent()]).toBeDefined();
                return [4 /*yield*/, band.press({ key: 'chrome-connect-band' })];
            case 8:
                _c.sent();
                return [4 /*yield*/, clock.settle()];
            case 9:
                _c.sent();
                return [4 /*yield*/, band.unmount()];
            case 10:
                _c.sent();
                return [4 /*yield*/, clock.advance(36000)];
            case 11:
                _c.sent();
                (0, testing_1.expect)(w.commands).toEqual(['/mcp reconnect claude-in-chrome']);
                (0, testing_1.expect)(w.toasts).toContain('No Chrome extension answers as Claude account 1 (one@example.com). Open Chrome and check its Claude extension is signed in with that email; if it is, restart Chrome.');
                (0, testing_1.expect)(slots(w)).toEqual(['', SLOT2, '', SLOT2]);
                return [4 /*yield*/, clock.advance(36000)];
            case 12:
                _c.sent();
                (0, testing_1.expect)(w.submitted).toEqual([]);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('a browser answering as another account than the one picked for the extension lists that account in use, and leaves the pick as it is', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, _a, clock, _b, pane, _c, _d, _e, _f;
    var _g, _h;
    return __generator(this, function (_j) {
        switch (_j.label) {
            case 0:
                w = fresh();
                w.chrome = { extensions: [''] };
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                _a = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(SLOT2)];
            case 1:
                _a[_j.sent()] = blob('tok-2');
                w.usage['tok-1'] = [20, 40];
                w.usage['tok-2'] = [10, 30];
                clock = world(on, w, __assign(__assign({}, TWO_LOGINS), { 'chrome-account': '2' }));
                // With no person at it, the session doesn't connect as it opens: the first browser call connects as login 1.
                return [4 /*yield*/, startHeadless($, clock)];
            case 2:
                // With no person at it, the session doesn't connect as it opens: the first browser call connects as login 1.
                _j.sent();
                (0, testing_1.expect)(w.envSets).toEqual([]);
                _b = testing_1.expect;
                return [4 /*yield*/, browse($, 'tabs_context_mcp')];
            case 3:
                _b.apply(void 0, [(_j.sent()).isError]).toBeUndefined();
                return [4 /*yield*/, clock.advance(61000)];
            case 4:
                _j.sent();
                return [4 /*yield*/, mountPane($)];
            case 5:
                pane = _j.sent();
                _c = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-row-1' })];
            case 6:
                _c.apply(void 0, [(_g = (_j.sent())) === null || _g === void 0 ? void 0 : _g.text]).toMatch(/● in use$/);
                // Login 2, picked but never answered as, isn't listed as active: it waits behind Other accounts.
                _d = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-row-2' })];
            case 7:
                // Login 2, picked but never answered as, isn't listed as active: it waits behind Other accounts.
                _d.apply(void 0, [_j.sent()]).toBeUndefined();
                _e = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-others' })];
            case 8:
                _e.apply(void 0, [(_h = (_j.sent())) === null || _h === void 0 ? void 0 : _h.text]).toBe('▸ Other accounts');
                // Still the account new sessions connect as.
                _f = testing_1.expect;
                return [4 /*yield*/, pane.find({ type: 'Text', text: 'Chrome' })];
            case 9:
                // Still the account new sessions connect as.
                _f.apply(void 0, [_j.sent()]).toBeDefined();
                return [4 /*yield*/, pane.unmount()];
            case 10:
                _j.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('a guess at Claude Code\'s login that finds no browser leaves the extension\'s account to be picked, and is not tried again', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, clock, pane, _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                w = fresh();
                w.chrome = { extensions: [SLOT2] };
                return [4 /*yield*/, spentOne(w)];
            case 1:
                _b.sent();
                clock = world(on, w, TWO_LOGINS);
                return [4 /*yield*/, start($, clock)];
            case 2:
                _b.sent();
                (0, testing_1.expect)(w.chromeAsked).toEqual(['']);
                (0, testing_1.expect)(w.toasts.filter(function (t) { return /^Claude in Chrome connects as/.test(t); })).toEqual([]);
                return [4 /*yield*/, mountPane($)];
            case 3:
                pane = _b.sent();
                _a = testing_1.expect;
                return [4 /*yield*/, pane.find({ type: 'Text', text: 'No Chrome extension found yet. Which account is yours signed in to?' })];
            case 4:
                _a.apply(void 0, [_b.sent()]).toBeDefined();
                // Back on login 1 and off it again: no second guess.
                return [4 /*yield*/, pane.press({ key: 'use-1' })];
            case 5:
                // Back on login 1 and off it again: no second guess.
                _b.sent();
                return [4 /*yield*/, clock.settle()];
            case 6:
                _b.sent();
                return [4 /*yield*/, clock.advance(36000)];
            case 7:
                _b.sent();
                return [4 /*yield*/, pane.press({ key: 'use-2' })];
            case 8:
                _b.sent();
                return [4 /*yield*/, clock.settle()];
            case 9:
                _b.sent();
                (0, testing_1.expect)(w.envSets).toHaveLength(3);
                (0, testing_1.expect)(w.chromeAsked).toEqual(['']);
                return [4 /*yield*/, pane.unmount()];
            case 10:
                _b.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('a session that a guess at Claude Code\'s login found no browser for before does not guess it again', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, clock;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                w = fresh();
                w.chrome = { extensions: [SLOT2] };
                return [4 /*yield*/, spentOne(w)];
            case 1:
                _a.sent();
                clock = world(on, w, __assign(__assign({}, TWO_LOGINS), { 'chrome-miss': '1' }));
                return [4 /*yield*/, start($, clock)];
            case 2:
                _a.sent();
                (0, testing_1.expect)(slots(w)).toEqual([SLOT2]);
                (0, testing_1.expect)(w.chromeAsked).toEqual([]);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('a session without Claude in Chrome is asked once, and its pane has no Chrome box', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, clock, pane, _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                w = fresh();
                return [4 /*yield*/, spentOne(w)];
            case 1:
                _c.sent();
                clock = world(on, w, TWO_LOGINS);
                return [4 /*yield*/, start($, clock)];
            case 2:
                _c.sent();
                (0, testing_1.expect)(w.chromeAsked).toEqual(['']);
                return [4 /*yield*/, mountPane($)];
            case 3:
                pane = _c.sent();
                return [4 /*yield*/, pane.press({ key: 'use-1' })];
            case 4:
                _c.sent();
                return [4 /*yield*/, clock.settle()];
            case 5:
                _c.sent();
                return [4 /*yield*/, clock.advance(36000)];
            case 6:
                _c.sent();
                return [4 /*yield*/, pane.press({ key: 'use-2' })];
            case 7:
                _c.sent();
                return [4 /*yield*/, clock.settle()];
            case 8:
                _c.sent();
                (0, testing_1.expect)(w.envSets).toHaveLength(3);
                (0, testing_1.expect)(w.chromeAsked).toEqual(['']);
                return [4 /*yield*/, pane.redraw()];
            case 9:
                _c.sent();
                _a = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'chrome-row-1' })];
            case 10:
                _a.apply(void 0, [_c.sent()]).toBeUndefined();
                _b = testing_1.expect;
                return [4 /*yield*/, pane.find({ text: /Chrome/ })];
            case 11:
                _b.apply(void 0, [_c.sent()]).toBeUndefined();
                return [4 /*yield*/, pane.unmount()];
            case 12:
                _c.sent();
                return [2 /*return*/];
        }
    });
}); });
// As of November 2026 Claude has no 5-hour limit: the usage endpoint and responses report the week alone.
(0, testing_1.test)('with only a weekly limit, the footer shows one row, the week, with its sign-in mark, and the pane only weeks', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, clock, footer, _a, pane, _b, _c, _d, _e;
    var _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                w = fresh();
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                w.usage['tok-1'] = [null, 30];
                clock = world(on, w, TWO_LOGINS);
                return [4 /*yield*/, start($, clock)];
            case 1:
                _g.sent();
                return [4 /*yield*/, $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'SessionMode', props: { modes: [] } })];
            case 2:
                footer = _g.sent();
                _a = testing_1.expect;
                return [4 /*yield*/, footer.find(GLYPHS)];
            case 3:
                _a.apply(void 0, [(_f = (_g.sent())) === null || _f === void 0 ? void 0 : _f.text]).toBe('│▆│⚠   70% ');
                return [4 /*yield*/, footer.unmount()];
            case 4:
                _g.sent();
                return [4 /*yield*/, $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'Pane', requestId: 'claude-accounts', props: PANE_PROPS })];
            case 5:
                pane = _g.sent();
                _b = testing_1.expect;
                return [4 /*yield*/, pane.find({ text: /^Every session uses the account whose week resets soonest, so its room is used before it refills\. Once the account in use has 2% of its week left, moves to the next\.$/ })];
            case 6:
                _b.apply(void 0, [_g.sent()]).toBeDefined();
                _c = testing_1.expect;
                return [4 /*yield*/, pane.find({ text: '5h' })];
            case 7:
                _c.apply(void 0, [_g.sent()]).toBeUndefined();
                _d = testing_1.expect;
                return [4 /*yield*/, pane.find({ text: 'week' })];
            case 8:
                _d.apply(void 0, [_g.sent()]).toBeDefined();
                _e = testing_1.expect;
                return [4 /*yield*/, pane.find({ key: 'footer-session' })];
            case 9:
                _e.apply(void 0, [_g.sent()]).toBeUndefined();
                return [4 /*yield*/, pane.unmount()];
            case 10:
                _g.sent();
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('with soonest reset, a session whose account has room moves at start-up to the one whose week resets sooner, and on once that one fills', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, slot, _a, _b, accounts, clock, respond;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                w = fresh();
                slot = function (id) { return "".concat(HOME, "/.claude/accounts/").concat(id); };
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                _a = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(slot(2))];
            case 1:
                _a[_c.sent()] = blob('tok-2');
                _b = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(slot(3))];
            case 2:
                _b[_c.sent()] = blob('tok-3');
                // Claude Code's own login, where every session starts, resets last: its room keeps; the others' would be lost.
                w.usage['tok-1'] = [null, 10, '2026-10-18T03:00:00Z'];
                w.usage['tok-2'] = [null, 0, '2026-10-13T03:00:00Z'];
                w.usage['tok-3'] = [null, 0, '2026-10-15T03:00:00Z'];
                accounts = [1, 2, 3].map(function (id) { return ({ id: String(id), slot: id === 1 ? '' : slot(id), email: "".concat(id, "@example.com") }); });
                clock = world(on, w, { accounts: accounts });
                return [4 /*yield*/, start($, clock)];
            case 3:
                _c.sent();
                (0, testing_1.expect)(w.envSets).toEqual([{ name: 'CLAUDE_SECURESTORAGE_CONFIG_DIR', value: slot(2) }]);
                (0, testing_1.expect)(w.toasts.filter(function (t) { return /^Switched to Claude account 2 .*: its week resets before account 1's\.$/.test(t); })).toHaveLength(1);
                respond = function (percentUsed) { return __awaiter(void 0, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                w.usage['tok-2'] = [null, percentUsed, '2026-10-13T03:00:00Z'];
                                w.limits = [{ kind: 'seven_day', percentUsed: percentUsed, resetsAt: '2026-10-13T03:00:00Z' }];
                                return [4 /*yield*/, clock.advance(61000)];
                            case 1:
                                _a.sent();
                                return [4 /*yield*/, $.session.measure({ context: { window: 200000 }, rateLimits: w.limits, changed: ['rateLimits'] })];
                            case 2:
                                _a.sent();
                                return [4 /*yield*/, clock.settle()];
                            case 3:
                                _a.sent();
                                return [2 /*return*/];
                        }
                    });
                }); };
                return [4 /*yield*/, respond(1)];
            case 4:
                _c.sent();
                return [4 /*yield*/, respond(60)];
            case 5:
                _c.sent();
                (0, testing_1.expect)(w.envSets).toHaveLength(1);
                return [4 /*yield*/, respond(99)];
            case 6:
                _c.sent();
                (0, testing_1.expect)(w.envSets).toEqual([
                    { name: 'CLAUDE_SECURESTORAGE_CONFIG_DIR', value: slot(2) },
                    { name: 'CLAUDE_SECURESTORAGE_CONFIG_DIR', value: slot(3) },
                ]);
                return [2 /*return*/];
        }
    });
}); });
/** Three logins with soonest reset: 2 resets in two hours, then 3, then Claude Code's own (1). The session starts on 1 and moves to 2. */
function idleOnTwo(on, $) {
    return __awaiter(this, void 0, void 0, function () {
        var w, slot, _a, _b, accounts, clock;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    w = fresh();
                    slot = function (id) { return "".concat(HOME, "/.claude/accounts/").concat(id); };
                    w.keychain['Claude Code-credentials'] = blob('tok-1');
                    _a = w.keychain;
                    return [4 /*yield*/, (0, model_1.keychainItem)(slot(2))];
                case 1:
                    _a[_c.sent()] = blob('tok-2');
                    _b = w.keychain;
                    return [4 /*yield*/, (0, model_1.keychainItem)(slot(3))];
                case 2:
                    _b[_c.sent()] = blob('tok-3');
                    w.usage['tok-1'] = [null, 10, '2026-10-18T03:00:00Z'];
                    w.usage['tok-2'] = [null, 0, '2026-10-12T12:00:00Z'];
                    w.usage['tok-3'] = [null, 0, '2026-10-15T03:00:00Z'];
                    accounts = [1, 2, 3].map(function (id) { return ({ id: String(id), slot: id === 1 ? '' : slot(id), email: "".concat(id, "@example.com") }); });
                    clock = world(on, w, { accounts: accounts });
                    return [4 /*yield*/, start($, clock)];
                case 3:
                    _c.sent();
                    (0, testing_1.expect)(w.envSets).toEqual([{ name: 'CLAUDE_SECURESTORAGE_CONFIG_DIR', value: slot(2) }]);
                    // Account 2's week resets; account 3's now resets first.
                    w.usage['tok-2'] = [null, 0, '2026-10-19T12:00:00Z'];
                    return [2 /*return*/, { w: w, clock: clock, slot: slot }];
            }
        });
    });
}
(0, testing_1.test)('with soonest reset, an idle session whose switch no response has confirmed yet moves on once another week resets first', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, w, clock, slot;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, idleOnTwo(on, $)];
            case 1:
                _a = _b.sent(), w = _a.w, clock = _a.clock, slot = _a.slot;
                return [4 /*yield*/, clock.advance(3 * HOUR)];
            case 2:
                _b.sent();
                (0, testing_1.expect)(w.envSets.map(function (e) { return e.value; })).toEqual([slot(2), slot(3)]);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('a switch waiting for its response stays put while a turn runs, and moves on once the turn ends', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, w, clock, slot;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, idleOnTwo(on, $)];
            case 1:
                _a = _b.sent(), w = _a.w, clock = _a.clock, slot = _a.slot;
                return [4 /*yield*/, $.turn.start({ text: 'go on', turnId: 'turn-1' })];
            case 2:
                _b.sent();
                return [4 /*yield*/, clock.advance(3 * HOUR)];
            case 3:
                _b.sent();
                (0, testing_1.expect)(w.envSets.map(function (e) { return e.value; })).toEqual([slot(2)]);
                return [4 /*yield*/, $.turn.complete({ turnId: 'turn-1', answer: '', durationMs: 1, isAborted: false, reason: 'answer' })];
            case 4:
                _b.sent();
                return [4 /*yield*/, clock.advance(61000)];
            case 5:
                _b.sent();
                (0, testing_1.expect)(w.envSets.map(function (e) { return e.value; })).toEqual([slot(2), slot(3)]);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('with most room picked, a session whose account has room stays on it, though another week resets sooner', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, slot, _a, accounts, clock;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                w = fresh();
                slot = function (id) { return "".concat(HOME, "/.claude/accounts/").concat(id); };
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                _a = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(slot(2))];
            case 1:
                _a[_b.sent()] = blob('tok-2');
                w.usage['tok-1'] = [null, 10, '2026-10-18T03:00:00Z'];
                w.usage['tok-2'] = [null, 0, '2026-10-13T03:00:00Z'];
                accounts = [1, 2].map(function (id) { return ({ id: String(id), slot: id === 1 ? '' : slot(id), email: "".concat(id, "@example.com") }); });
                clock = world(on, w, { accounts: accounts, 'rotate-to': 'room' });
                return [4 /*yield*/, start($, clock)];
            case 2:
                _b.sent();
                return [4 /*yield*/, clock.advance(6 * 60000)];
            case 3:
                _b.sent();
                (0, testing_1.expect)(w.envSets).toEqual([]);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('with only a weekly limit, the session moves once the week reaches 98%, to the account whose week resets soonest', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, slot, _a, _b, accounts, clock;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                w = fresh();
                slot = function (id) { return "".concat(HOME, "/.claude/accounts/").concat(id); };
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                _a = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(slot(2))];
            case 1:
                _a[_c.sent()] = blob('tok-2');
                _b = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(slot(3))];
            case 2:
                _b[_c.sent()] = blob('tok-3');
                w.usage['tok-1'] = [null, 99];
                // Account 2 has more room, but account 3's week resets first: use its room before it refills.
                w.usage['tok-2'] = [null, 10, '2026-10-18T03:00:00Z'];
                w.usage['tok-3'] = [null, 40, '2026-10-13T03:00:00Z'];
                accounts = [1, 2, 3].map(function (id) { return ({ id: String(id), slot: id === 1 ? '' : slot(id), email: "".concat(id, "@example.com") }); });
                clock = world(on, w, { accounts: accounts });
                return [4 /*yield*/, start($, clock)];
            case 3:
                _c.sent();
                (0, testing_1.expect)(w.envSets).toEqual([{ name: 'CLAUDE_SECURESTORAGE_CONFIG_DIR', value: slot(3) }]);
                (0, testing_1.expect)(w.toasts.filter(function (t) { return /^Switched to Claude account 3 .*: account 1 has 1% of its week left\.$/.test(t); })).toHaveLength(1);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('with only a weekly limit, most room picks the account with the most of its week left', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, slot, _a, _b, accounts, clock;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                w = fresh();
                slot = function (id) { return "".concat(HOME, "/.claude/accounts/").concat(id); };
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                _a = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(slot(2))];
            case 1:
                _a[_c.sent()] = blob('tok-2');
                _b = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(slot(3))];
            case 2:
                _b[_c.sent()] = blob('tok-3');
                w.usage['tok-1'] = [null, 99];
                w.usage['tok-2'] = [null, 10, '2026-10-18T03:00:00Z'];
                w.usage['tok-3'] = [null, 40, '2026-10-13T03:00:00Z'];
                accounts = [1, 2, 3].map(function (id) { return ({ id: String(id), slot: id === 1 ? '' : slot(id), email: "".concat(id, "@example.com") }); });
                clock = world(on, w, { accounts: accounts, 'rotate-to': 'room' });
                return [4 /*yield*/, start($, clock)];
            case 3:
                _c.sent();
                (0, testing_1.expect)(w.envSets).toEqual([{ name: 'CLAUDE_SECURESTORAGE_CONFIG_DIR', value: slot(2) }]);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('with only a weekly limit, a turn that dies on the usage limit counts the week full and moves on', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, _a, clock;
    var _b, _c, _d, _e;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                w = fresh();
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                _a = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(SLOT2)];
            case 1:
                _a[_f.sent()] = blob('tok-2');
                w.usage['tok-1'] = [null, 80];
                w.usage['tok-2'] = [null, 30];
                clock = world(on, w, TWO_LOGINS);
                return [4 /*yield*/, start($, clock)];
            case 2:
                _f.sent();
                (0, testing_1.expect)(w.envSets).toEqual([]);
                // The limit was hit before the usage endpoint shows it.
                return [4 /*yield*/, $.classic.StopFailure({ error: 'rate_limit' })];
            case 3:
                // The limit was hit before the usage endpoint shows it.
                _f.sent();
                return [4 /*yield*/, clock.settle()];
            case 4:
                _f.sent();
                (0, testing_1.expect)(w.envSets).toEqual([{ name: 'CLAUDE_SECURESTORAGE_CONFIG_DIR', value: SLOT2 }]);
                (0, testing_1.expect)((_e = (_d = (_c = (_b = w.coordinator) === null || _b === void 0 ? void 0 : _b.state().accounts.find(function (a) { return a.id === '1'; })) === null || _c === void 0 ? void 0 : _c.reading) === null || _d === void 0 ? void 0 : _d.sevenDay) === null || _e === void 0 ? void 0 : _e.pct).toBe(100);
                return [4 /*yield*/, clock.advance(36000)];
            case 5:
                _f.sent();
                (0, testing_1.expect)(w.submitted).toHaveLength(1);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('a 5-hour window shows only on the row of the login whose plan has one', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, _a, clock, pane, texts, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                w = fresh();
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                _a = w.keychain;
                return [4 /*yield*/, (0, model_1.keychainItem)(SLOT2)];
            case 1:
                _a[_d.sent()] = blob('tok-2');
                w.usage['tok-1'] = [null, 30];
                // Login 2 is on the $100 Max plan, which keeps a 5-hour window.
                w.usage['tok-2'] = [20, 10];
                clock = world(on, w, TWO_LOGINS);
                return [4 /*yield*/, start($, clock)];
            case 2:
                _d.sent();
                return [4 /*yield*/, $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'Pane', requestId: 'claude-accounts', props: PANE_PROPS })];
            case 3:
                pane = _d.sent();
                texts = function (text) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, pane.findAll({ text: text })];
                        case 1: return [2 /*return*/, (_a.sent()).filter(function (e) { return e.type === 'Text'; })];
                    }
                }); }); };
                _b = testing_1.expect;
                return [4 /*yield*/, texts('5h')];
            case 4:
                _b.apply(void 0, [_d.sent()]).toHaveLength(1);
                _c = testing_1.expect;
                return [4 /*yield*/, pane.find({ text: / none reported$/ })];
            case 5:
                _c.apply(void 0, [_d.sent()]).toBeUndefined();
                return [4 /*yield*/, pane.unmount()];
            case 6:
                _d.sent();
                return [2 /*return*/];
        }
    });
}); });
/** Account 1, Claude Code's login, resets first with 20% of its week left but its Fable week at 98%; account 2 has room in both. */
function fableWorld(on, model) {
    return __awaiter(this, void 0, void 0, function () {
        var w, slot2, _a, clock;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    w = fresh();
                    slot2 = "".concat(HOME, "/.claude/accounts/2");
                    w.model = model;
                    w.keychain['Claude Code-credentials'] = blob('tok-1');
                    _a = w.keychain;
                    return [4 /*yield*/, (0, model_1.keychainItem)(slot2)];
                case 1:
                    _a[_b.sent()] = blob('tok-2');
                    w.usage['tok-1'] = [null, 80, '2026-10-13T03:00:00Z'];
                    w.usage['tok-2'] = [null, 10, '2026-10-18T03:00:00Z'];
                    w.fable = { 'tok-1': 98, 'tok-2': 5 };
                    clock = world(on, w, { accounts: [{ id: '1', slot: '', email: '1@example.com' }, { id: '2', slot: slot2, email: '2@example.com' }] });
                    return [2 /*return*/, { w: w, clock: clock, slot2: slot2 }];
            }
        });
    });
}
(0, testing_1.test)('a Fable session moves once its account\'s Fable week reaches 98%, though its week has room', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, w, clock, slot2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, fableWorld(on, 'claude-fable-5-2')];
            case 1:
                _a = _b.sent(), w = _a.w, clock = _a.clock, slot2 = _a.slot2;
                return [4 /*yield*/, start($, clock)];
            case 2:
                _b.sent();
                (0, testing_1.expect)(w.envSets).toEqual([{ name: 'CLAUDE_SECURESTORAGE_CONFIG_DIR', value: slot2 }]);
                (0, testing_1.expect)(w.toasts.filter(function (t) { return /^Switched to Claude account 2 .*: account 1 has 2% of its Fable week left\.$/.test(t); })).toHaveLength(1);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('an Opus session stays on an account whose Fable week is spent while its week has room', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, w, clock;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0: return [4 /*yield*/, fableWorld(on, 'claude-opus-5-5')];
            case 1:
                _a = _b.sent(), w = _a.w, clock = _a.clock;
                return [4 /*yield*/, start($, clock)];
            case 2:
                _b.sent();
                return [4 /*yield*/, clock.advance(6 * 60000)];
            case 3:
                _b.sent();
                (0, testing_1.expect)(w.envSets).toEqual([]);
                return [2 /*return*/];
        }
    });
}); });
(0, testing_1.test)('a response keeps the Fable week the coordinator read, and the pane shows it under the week', function ($, on) { return __awaiter(void 0, void 0, void 0, function () {
    var w, clock, pane, _a, _b, _c;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                w = fresh();
                w.model = 'claude-fable-5-2';
                w.keychain['Claude Code-credentials'] = blob('tok-1');
                w.usage['tok-1'] = [null, 40, '2026-10-13T03:00:00Z'];
                w.fable = { 'tok-1': 60 };
                clock = world(on, w, { accounts: [{ id: '1', slot: '', email: 'one@example.com' }] });
                return [4 /*yield*/, start($, clock)];
            case 1:
                _d.sent();
                w.limits = [{ kind: 'seven_day', percentUsed: 41, resetsAt: '2026-10-13T03:00:00Z' }];
                return [4 /*yield*/, $.session.measure({ context: { window: 200000 }, rateLimits: w.limits, changed: ['rateLimits'] })];
            case 2:
                _d.sent();
                return [4 /*yield*/, clock.settle()];
            case 3:
                _d.sent();
                return [4 /*yield*/, $.ui.mount({ plugin: 'account-rotator', surface: 'terminal', component: 'Pane', requestId: 'claude-accounts', props: PANE_PROPS })];
            case 4:
                pane = _d.sent();
                _a = testing_1.expect;
                return [4 /*yield*/, pane.find({ text: 'Fable' })];
            case 5:
                _a.apply(void 0, [_d.sent()]).toBeDefined();
                _b = testing_1.expect;
                return [4 /*yield*/, pane.find({ text: /40% left/ })];
            case 6:
                _b.apply(void 0, [_d.sent()]).toBeDefined();
                _c = testing_1.expect;
                return [4 /*yield*/, pane.find({ text: /59% left/ })];
            case 7:
                _c.apply(void 0, [_d.sent()]).toBeDefined();
                return [4 /*yield*/, pane.unmount()];
            case 8:
                _d.sent();
                return [2 /*return*/];
        }
    });
}); });
