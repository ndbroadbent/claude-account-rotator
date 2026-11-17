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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncDelegator = (this && this.__asyncDelegator) || function (o) {
    var i, p;
    return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
    function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: false } : f ? f(v) : v; } : f; }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype), verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
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
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = void 0;
// Answers the account-rotator mod's calls on `$` with imitated logins, so a
// recording shows the real mod with nobody's accounts in it. The session's own
// requests stay on whatever login started it: a switch here is the mod's alone.
// The login in use drains once the recorder creates the file DEMO_DRAIN_FILE
// names, so it runs low while the camera is on the footer, with no prompt sent.
// DEMO_IN_USE picks how the footer marks the login in use, and the login
// DEMO_SIGNED_OUT names starts signed out, for a shot of the footer asking
// for a sign-in.
/** The mod whose calls are answered; every other plugin's go through. */
var MOD = 'account-rotator';
var HOME = '/home/you';
var USAGE_URL = 'https://api.anthropic.com/api/oauth/usage';
var PROFILE_URL = 'https://api.anthropic.com/api/oauth/profile';
var MINUTE = 60000;
var HOUR = 60 * MINUTE;
var DAY = 24 * HOUR;
/** The mod's clock runs this many times faster than the wall's, so a switch settles in seconds. */
var SPEED = 10;
/** The mod's one-minute sync and ten-minute check both run this often. */
var TICK_MS = 500;
/** How often the recorder's file is looked for. */
var POLL_MS = 250;
/** How long the imitated browser sign-in takes. */
var SIGN_IN_MS = 4500;
/** Login 1 runs low within seconds of draining. */
var logins = [
    { id: '1', email: 'you@example.com', orgName: 'Personal', plan: 'max', five: 60, week: 38, fillPerSecond: 10, fiveResets: 2 * HOUR + 14 * MINUTE, weekResets: 2 * DAY + 5 * HOUR, isSignedIn: true },
    { id: '2', email: 'you@acme.example', orgName: 'Acme', plan: 'team', five: 6, week: 22, fillPerSecond: 1.5, fiveResets: 4 * HOUR + 41 * MINUTE, weekResets: 5 * DAY + 2 * HOUR, isSignedIn: true },
    { id: '3', email: 'you@example.com', orgName: 'Side gig', plan: 'pro', five: 41, week: 77, fillPerSecond: 1.5, fiveResets: 1 * HOUR + 3 * MINUTE, weekResets: 3 * DAY + 20 * HOUR, isSignedIn: true },
];
/** The login + Add a login signs in, its reset offsets counted from the sign-in. */
var ADDED = { email: 'you@studio.example', orgName: 'Studio', plan: 'max', five: 0, week: 9, fillPerSecond: 1.5, fiveIn: 5 * HOUR, weekIn: 6 * DAY + 9 * HOUR };
var slotOf = function (id) { return (id === '1' ? '' : "".concat(HOME, "/.claude/accounts/").concat(id)); };
var idOf = function (slot) { var _a; return (slot === '' ? '1' : ((_a = slot.split('/').pop()) !== null && _a !== void 0 ? _a : '')); };
/** The mod's store, kept here: nothing reaches the file every session of the real mod shares. */
var store = new Map([
    [
        'accounts',
        logins.map(function (l) { return ({ id: l.id, slot: slotOf(l.id), email: l.email, orgId: "org-".concat(l.id), orgName: l.orgName, plan: l.plan }); }),
    ],
]);
var activeSlot = '';
/** From the recorder's file until the mod moves off the login it drains. */
var isDraining = false;
/** Wall-clock start, and the last time the fill was brought up to date. */
var start;
var filledTo;
var fakeNow = function (wall) {
    start !== null && start !== void 0 ? start : (start = wall);
    return start + (wall - start) * SPEED;
};
var iso = function (offset) { return new Date((start !== null && start !== void 0 ? start : 0) + offset).toISOString(); };
/** Every 5-hour reset time handed out: a reading that carries none of them is the real session's. */
var isImitated = function (value) {
    var _a;
    var resetsAt = (_a = value === null || value === void 0 ? void 0 : value.fiveHour) === null || _a === void 0 ? void 0 : _a.resetsAt;
    return logins.some(function (l) { return iso(l.fiveResets) === resetsAt; });
};
/** Fills the login in use for the time it drained since the last look. */
function fill(wall) {
    var elapsed = filledTo === undefined ? 0 : (wall - filledTo) / 1000;
    filledTo = wall;
    var active = logins.find(function (l) { return l.id === idOf(activeSlot); });
    if (isDraining && active !== undefined)
        active.five = Math.min(100, active.five + active.fillPerSecond * elapsed);
}
var usageOf = function (l) { return ({
    five_hour: { utilization: Math.round(l.five), resets_at: iso(l.fiveResets) },
    seven_day: { utilization: Math.round(l.week), resets_at: iso(l.weekResets) },
}); };
/** Who a login's token signs in, as the profile endpoint answers: the organization the store names. */
var profileOf = function (l) { return ({
    account: { uuid: "account-".concat(l.id), email: l.email },
    organization: { uuid: "org-".concat(l.id), name: l.orgName, organization_type: "claude_".concat(l.plan) },
}); };
var limitsOf = function (l) { return [
    { kind: 'five_hour', percentUsed: Math.round(l.five), resetsAt: iso(l.fiveResets) },
    { kind: 'seven_day', percentUsed: Math.round(l.week), resetsAt: iso(l.weekResets) },
]; };
var ran = function (exitCode, stdout) { return ({
    exitCode: exitCode,
    stdout: stdout,
    stderr: '',
    isStdoutTruncated: false,
    isStderrTruncated: false,
}); };
/** The keychain entry Claude Code keeps a slot's login in, as the mod names it. */
function keychainItem(slot) {
    return __awaiter(this, void 0, void 0, function () {
        var digest, hex;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (slot === '')
                        return [2 /*return*/, 'Claude Code-credentials'];
                    return [4 /*yield*/, crypto.subtle.digest('SHA-256', new TextEncoder().encode(slot.normalize('NFC')))];
                case 1:
                    digest = _a.sent();
                    hex = __spreadArray([], new Uint8Array(digest), true).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
                    return [2 /*return*/, "Claude Code-credentials-".concat(hex.slice(0, 8))];
            }
        });
    });
}
/** A login's sign-in as Claude Code stores it, its token the one the usage answer knows. */
function signInOf($, l) {
    return __awaiter(this, void 0, void 0, function () {
        var now, _a, oauth;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = fakeNow;
                    return [4 /*yield*/, $.clock.now()];
                case 1:
                    now = _a.apply(void 0, [_b.sent()]);
                    oauth = { accessToken: "demo-".concat(l.id), expiresAt: now + 6 * HOUR, refreshTokenExpiresAt: now + 25 * DAY, subscriptionType: l.plan };
                    return [2 /*return*/, JSON.stringify({ claudeAiOauth: oauth })];
            }
        });
    });
}
function stored($, item) {
    return __awaiter(this, void 0, void 0, function () {
        var _i, logins_1, l, _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _i = 0, logins_1 = logins;
                    _d.label = 1;
                case 1:
                    if (!(_i < logins_1.length)) return [3 /*break*/, 6];
                    l = logins_1[_i];
                    _a = !l.isSignedIn;
                    if (_a) return [3 /*break*/, 3];
                    return [4 /*yield*/, keychainItem(slotOf(l.id))];
                case 2:
                    _a = (_d.sent()) !== item;
                    _d.label = 3;
                case 3:
                    if (_a)
                        return [3 /*break*/, 5];
                    _b = ran;
                    _c = [0];
                    return [4 /*yield*/, signInOf($, l)];
                case 4: return [2 /*return*/, _b.apply(void 0, _c.concat([_d.sent()]))];
                case 5:
                    _i++;
                    return [3 /*break*/, 1];
                case 6: return [2 /*return*/, ran(44, '')];
            }
        });
    });
}
/** Where there is no keychain (Linux): the signed-in login whose credentials file is `path`. */
var fileLogin = function (path) {
    return logins.find(function (l) { return l.isSignedIn && "".concat(slotOf(l.id) || "".concat(HOME, "/.claude"), "/.credentials.json") === path; });
};
function status(slot) {
    var l = logins.find(function (x) { return x.id === idOf(slot) && x.isSignedIn; });
    if (l === undefined)
        return JSON.stringify({ loggedIn: false });
    return JSON.stringify({ loggedIn: true, email: l.email, orgId: "org-".concat(l.id), orgName: l.orgName, subscriptionType: l.plan });
}
var register = function (on) {
    on('session.start', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var inUse, signedOut, _i, logins_2, l, started, trigger, poll;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, $.env.get('DEMO_IN_USE')];
                case 1:
                    inUse = _a.sent();
                    if (inUse !== undefined && inUse !== '')
                        store.set('footer', { active: inUse });
                    return [4 /*yield*/, $.env.get('DEMO_SIGNED_OUT')];
                case 2:
                    signedOut = _a.sent();
                    for (_i = 0, logins_2 = logins; _i < logins_2.length; _i++) {
                        l = logins_2[_i];
                        if (l.id === signedOut)
                            l.isSignedIn = false;
                    }
                    return [4 /*yield*/, next(e)];
                case 3:
                    started = _a.sent();
                    return [4 /*yield*/, $.env.get('DEMO_DRAIN_FILE')];
                case 4:
                    trigger = _a.sent();
                    if (trigger === undefined || trigger === '')
                        return [2 /*return*/, started];
                    poll = $.clock.every(POLL_MS, function () {
                        void $.fs.exists(trigger).then(function (exists) { return __awaiter(void 0, void 0, void 0, function () {
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        if (!exists || isDraining)
                                            return [2 /*return*/];
                                        poll.cancel();
                                        _a = fill;
                                        return [4 /*yield*/, $.clock.now()];
                                    case 1:
                                        _a.apply(void 0, [_b.sent()]);
                                        isDraining = true;
                                        return [2 /*return*/];
                                }
                            });
                        }); });
                    });
                    return [2 /*return*/, started];
            }
        });
    }); });
    on('clock.now', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var wall;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, next(e)];
                case 1:
                    wall = _a.sent();
                    return [2 /*return*/, next.origin.plugin !== MOD || wall.deny !== undefined ? wall : { value: fakeNow(wall.value) }];
            }
        });
    }); });
    on('clock.every', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/, (next.origin.plugin === MOD ? next(__assign(__assign({}, e), { ms: TICK_MS })) : next(e))];
    }); }); });
    on('env.get', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (next.origin.plugin !== MOD)
                return [2 /*return*/, next(e)];
            if (e.name === 'USER')
                return [2 /*return*/, { value: 'you' }];
            if (e.name === 'HOME')
                return [2 /*return*/, { value: HOME }];
            if (e.name === 'CLAUDE_SECURESTORAGE_CONFIG_DIR')
                return [2 /*return*/, { value: activeSlot === '' ? undefined : activeSlot }];
            return [2 /*return*/, next(e)];
        });
    }); });
    // A switch is the mod's alone: the session keeps the login it started with,
    // and the drain ends with the login that ran low.
    on('env.set', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var _a;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    if (next.origin.plugin !== MOD || e.name !== 'CLAUDE_SECURESTORAGE_CONFIG_DIR')
                        return [2 /*return*/, next(e)
                            // The mod sets the slot in use at its start, to learn whether switching is allowed: no switch.
                        ];
                    // The mod sets the slot in use at its start, to learn whether switching is allowed: no switch.
                    if (((_b = e.value) !== null && _b !== void 0 ? _b : '') === activeSlot)
                        return [2 /*return*/, { value: undefined }];
                    _a = fill;
                    return [4 /*yield*/, $.clock.now()];
                case 1:
                    _a.apply(void 0, [_d.sent()]);
                    activeSlot = (_c = e.value) !== null && _c !== void 0 ? _c : '';
                    isDraining = false;
                    return [2 /*return*/, { value: undefined }];
            }
        });
    }); });
    on('process.run', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var _a, cmd, sub, verb, slot_1, l;
        var _b;
        var _c, _d, _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    if (next.origin.plugin !== MOD)
                        return [2 /*return*/, next(e)];
                    _a = e.argv, cmd = _a[0], sub = _a[1], verb = _a[2];
                    if (!(cmd === 'security')) return [3 /*break*/, 2];
                    _b = {};
                    return [4 /*yield*/, stored($, (_c = e.argv[e.argv.length - 1]) !== null && _c !== void 0 ? _c : '')];
                case 1: return [2 /*return*/, (_b.value = _g.sent(), _b)];
                case 2:
                    if (cmd === 'claude' && sub === 'auth') {
                        slot_1 = (_f = (_e = (_d = e.init) === null || _d === void 0 ? void 0 : _d.env) === null || _e === void 0 ? void 0 : _e.CLAUDE_SECURESTORAGE_CONFIG_DIR) !== null && _f !== void 0 ? _f : '';
                        if (verb === 'status')
                            return [2 /*return*/, { value: ran(0, status(slot_1)) }];
                        if (verb === 'logout') {
                            l = logins.find(function (x) { return x.id === idOf(slot_1); });
                            if (l !== undefined)
                                l.isSignedIn = false;
                            return [2 /*return*/, { value: ran(0, '') }];
                        }
                    }
                    return [2 /*return*/, next(e)];
            }
        });
    }); });
    // The browser sign-in, imitated: a pause, then the new login is there.
    on('process.spawn', function ($, e, next) {
        return __asyncGenerator(this, arguments, function () {
            var id, existing, elapsed, _a, fiveIn, weekIn, who;
            var _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!(next.origin.plugin !== MOD || e.argv[0] !== 'claude' || e.argv[2] !== 'login')) return [3 /*break*/, 4];
                        return [5 /*yield**/, __values(__asyncDelegator(__asyncValues(next(e))))];
                    case 1: return [4 /*yield*/, __await.apply(void 0, [_d.sent()])];
                    case 2: return [4 /*yield*/, __await.apply(void 0, [_d.sent()])];
                    case 3: return [2 /*return*/, _d.sent()];
                    case 4:
                        id = idOf((_c = (_b = e.env) === null || _b === void 0 ? void 0 : _b.CLAUDE_SECURESTORAGE_CONFIG_DIR) !== null && _c !== void 0 ? _c : '');
                        return [4 /*yield*/, __await({ stream: 'stdout', text: 'Opening browser to sign in…\n' })];
                    case 5: return [4 /*yield*/, _d.sent()];
                    case 6:
                        _d.sent();
                        return [4 /*yield*/, __await($.clock.sleep(SIGN_IN_MS))];
                    case 7:
                        _d.sent();
                        existing = logins.find(function (l) { return l.id === id; });
                        if (!(existing !== undefined)) return [3 /*break*/, 8];
                        existing.isSignedIn = true;
                        return [3 /*break*/, 10];
                    case 8:
                        _a = fakeNow;
                        return [4 /*yield*/, __await($.clock.now())];
                    case 9:
                        elapsed = _a.apply(void 0, [_d.sent()]) - (start !== null && start !== void 0 ? start : 0);
                        fiveIn = ADDED.fiveIn, weekIn = ADDED.weekIn, who = __rest(ADDED, ["fiveIn", "weekIn"]);
                        logins.push(__assign(__assign({ id: id }, who), { fiveResets: elapsed + fiveIn, weekResets: elapsed + weekIn, isSignedIn: true }));
                        _d.label = 10;
                    case 10: return [4 /*yield*/, __await({ value: { code: 0, signal: null } })];
                    case 11: return [2 /*return*/, _d.sent()];
                }
            });
        });
    });
    on('http.fetch', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var _a, token, l, body;
        var _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    if (next.origin.plugin !== MOD || (e.url !== USAGE_URL && e.url !== PROFILE_URL))
                        return [2 /*return*/, next(e)];
                    _a = fill;
                    return [4 /*yield*/, $.clock.now()];
                case 1:
                    _a.apply(void 0, [_e.sent()]);
                    token = ((_d = (_c = (_b = e.init) === null || _b === void 0 ? void 0 : _b.headers) === null || _c === void 0 ? void 0 : _c.Authorization) !== null && _d !== void 0 ? _d : '').replace('Bearer ', '');
                    l = logins.find(function (x) { return "demo-".concat(x.id) === token && x.isSignedIn; });
                    if (l === undefined)
                        return [2 /*return*/, { value: { status: 401, ok: false, headers: {}, text: '' } }];
                    body = e.url === PROFILE_URL ? profileOf(l) : usageOf(l);
                    return [2 /*return*/, { value: { status: 200, ok: true, headers: {}, text: JSON.stringify(body) } }];
            }
        });
    }); });
    // What the session's last response reported, for the mod's check that a switch took.
    on('session.usage', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var real, _a, active;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, next(e)];
                case 1:
                    real = _b.sent();
                    if (next.origin.plugin !== MOD || real.deny !== undefined)
                        return [2 /*return*/, real];
                    _a = fill;
                    return [4 /*yield*/, $.clock.now()];
                case 2:
                    _a.apply(void 0, [_b.sent()]);
                    active = logins.find(function (l) { return l.id === idOf(activeSlot); });
                    return [2 /*return*/, { value: __assign(__assign({}, real.value), { rateLimits: active === undefined ? [] : limitsOf(active) }) }];
            }
        });
    }); });
    on('store.get', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/, (next.origin.plugin === MOD ? { value: store.get(e.key) } : next(e))];
    }); }); });
    // The real responses' usage is the starting login's, not the imitated one in use: refused.
    on('store.set', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (next.origin.plugin !== MOD)
                return [2 /*return*/, next(e)];
            if (e.key.startsWith('reading:') && !isImitated(e.value))
                return [2 /*return*/, { deny: 'the demo shows imitated usage only' }];
            store.set(e.key, e.value);
            return [2 /*return*/, { value: undefined }];
        });
    }); });
    on('store.delete', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (next.origin.plugin !== MOD)
                return [2 /*return*/, next(e)];
            store.delete(e.key);
            return [2 /*return*/, { value: undefined }];
        });
    }); });
    on('store.keys', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/, (next.origin.plugin === MOD ? { value: __spreadArray([], store.keys(), true) } : next(e))];
    }); }); });
    on('fs.write', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/, (next.origin.plugin === MOD ? { value: undefined } : next(e))];
    }); }); });
    on('fs.read', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var l, _a;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (next.origin.plugin !== MOD || !e.path.endsWith('/.credentials.json'))
                        return [2 /*return*/, next(e)];
                    l = fileLogin(e.path);
                    if (!(l === undefined)) return [3 /*break*/, 1];
                    _a = { deny: 'no such file' };
                    return [3 /*break*/, 3];
                case 1:
                    _b = {};
                    return [4 /*yield*/, signInOf($, l)];
                case 2:
                    _a = (_b.value = _c.sent(), _b);
                    _c.label = 3;
                case 3: return [2 /*return*/, _a];
            }
        });
    }); });
    on('ui.notify', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/, (next.origin.plugin === MOD ? { value: { isSent: false, reason: 'refused' } } : next(e))];
    }); }); });
};
exports.register = register;
