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
Object.defineProperty(exports, "__esModule", { value: true });
var strict_1 = require("node:assert/strict");
var node_test_1 = require("node:test");
var core_ts_1 = require("./core.ts");
var server_ts_1 = require("./server.ts");
var NOW = Date.parse('2026-11-09T10:00:00Z');
var HOUR = 3600000;
var SLOT2 = '/Users/tester/.claude/accounts/2';
var SLOT3 = '/Users/tester/.claude/accounts/3';
var blob = function (token, expiresAt) {
    if (expiresAt === void 0) { expiresAt = NOW + 6 * HOUR; }
    return ({
        state: 'present',
        credential: { accessToken: token, refreshToken: "refresh-".concat(token), expiresAt: expiresAt, refreshTokenExpiresAt: NOW + 20 * 24 * HOUR, plan: 'max' },
    });
};
/** Everything beneath the coordinator, in memory, on a clock the test moves. */
var World = /** @class */ (function () {
    function World() {
        this.now = NOW;
        this.timers = [];
        this.nextTimer = 1;
        /** slot -> what its stored sign-in reads as */
        this.stored = {};
        /** access token -> [5-hour %, week %] */
        /** token -> [5-hour %, or null as since November 2026; week %] */
        this.usage = {};
        /** access token -> email */
        this.owners = {};
        this.tiers = {};
        /** slot -> who `claude auth status` says */
        this.status = {};
        this.usageCalls = [];
        /** Tokens' Fable weeks, as the usage endpoint's `limits` lists them. */
        this.fable = {};
        /** Tokens whose usage calls fail, as a 429 or an outage does. */
        this.failing = {};
        this.profileCalls = [];
        this.signIns = [];
        this.signOuts = [];
        this.alive = new Set();
        this.logs = [];
    }
    World.prototype.deps = function () {
        var _this = this;
        return {
            now: function () { return _this.now; },
            after: function (ms, fn) { return _this.timer(ms, fn); },
            every: function (ms, fn) { return _this.timer(ms, fn, ms); },
            readStored: function (slot) { return __awaiter(_this, void 0, void 0, function () { var _a; return __generator(this, function (_b) {
                return [2 /*return*/, (_a = this.stored[slot]) !== null && _a !== void 0 ? _a : { state: 'absent' }];
            }); }); },
            fetchUsage: function (token) { return __awaiter(_this, void 0, void 0, function () {
                var failure, u;
                return __generator(this, function (_a) {
                    this.usageCalls.push(token);
                    failure = this.failing[token];
                    if (failure !== undefined)
                        return [2 /*return*/, __assign({ kind: 'failed' }, failure)];
                    u = this.usage[token];
                    if (u === undefined)
                        return [2 /*return*/, { kind: 'rejected' }];
                    return [2 /*return*/, {
                            kind: 'ok',
                            body: __assign({ five_hour: u[0] === null ? null : { utilization: u[0], resets_at: '2026-11-09T12:00:00Z' }, seven_day: { utilization: u[1], resets_at: '2026-11-14T03:00:00Z' } }, (this.fable[token] === undefined
                                ? {}
                                : { limits: [{ kind: 'weekly_scoped', percent: this.fable[token], resets_at: '2026-11-14T03:00:00Z', scope: { model: { display_name: 'Fable' }, surface: null } }] })),
                        }];
                });
            }); },
            fetchProfile: function (token) { return __awaiter(_this, void 0, void 0, function () {
                var email;
                var _a;
                return __generator(this, function (_b) {
                    this.profileCalls.push(token);
                    email = this.owners[token];
                    return [2 /*return*/, email === undefined
                            ? undefined
                            : { account: { email: email }, organization: { uuid: "org-".concat(email), name: 'Org', rate_limit_tier: (_a = this.tiers[token]) !== null && _a !== void 0 ? _a : 'default_claude_max_20x' } }];
                });
            }); },
            authStatus: function (slot) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, this.status[slot]];
            }); }); },
            signIn: function (slot, email) {
                var finish = function () { return undefined; };
                var done = new Promise(function (resolve) {
                    finish = function (code, errors) {
                        if (errors === void 0) { errors = ''; }
                        return resolve({ code: code, errors: errors });
                    };
                });
                var run = __assign(__assign({ slot: slot }, (email === undefined ? {} : { email: email })), { finish: finish, cancelled: false });
                _this.signIns.push(run);
                return {
                    done: done,
                    cancel: function () {
                        run.cancelled = true;
                        finish(null, 'cancelled');
                    },
                };
            },
            signOut: function (slot) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    this.signOuts.push(slot);
                    return [2 /*return*/];
                });
            }); },
            makeSlot: function (id) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, "/Users/tester/.claude/accounts/".concat(id)];
            }); }); },
            isAlive: function (pid) { return _this.alive.has(pid); },
            save: function (p) {
                _this.saved = structuredClone(p);
            },
            log: function (text) {
                _this.logs.push(text);
            },
        };
    };
    World.prototype.timer = function (ms, fn, every) {
        var _this = this;
        var t = __assign({ at: this.now + ms, fn: fn, id: this.nextTimer++ }, (every === undefined ? {} : { every: every }));
        this.timers.push(t);
        return function () {
            _this.timers = _this.timers.filter(function (x) { return x !== t; });
        };
    };
    /** Moves the clock on, running each timer as it comes due and letting its work settle. */
    World.prototype.advance = function (ms) {
        return __awaiter(this, void 0, void 0, function () {
            var until, _loop_1, this_1, state_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        until = this.now + ms;
                        _loop_1 = function () {
                            var due;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        due = this_1.timers.filter(function (t) { return t.at <= until; }).sort(function (a, b) { return a.at - b.at || a.id - b.id; })[0];
                                        if (due === undefined)
                                            return [2 /*return*/, "break"];
                                        this_1.now = due.at;
                                        if (due.every === undefined)
                                            this_1.timers = this_1.timers.filter(function (t) { return t !== due; });
                                        else
                                            due.at += due.every;
                                        due.fn();
                                        return [4 /*yield*/, settle()];
                                    case 1:
                                        _b.sent();
                                        return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _a.label = 1;
                    case 1: return [5 /*yield**/, _loop_1()];
                    case 2:
                        state_1 = _a.sent();
                        if (state_1 === "break")
                            return [3 /*break*/, 4];
                        _a.label = 3;
                    case 3: return [3 /*break*/, 1];
                    case 4:
                        this.now = until;
                        return [4 /*yield*/, settle()];
                    case 5:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return World;
}());
function settle() {
    return __awaiter(this, void 0, void 0, function () {
        var i;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    i = 0;
                    _a.label = 1;
                case 1:
                    if (!(i < 20)) return [3 /*break*/, 4];
                    return [4 /*yield*/, new Promise(function (resolve) { return setImmediate(resolve); })];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    i += 1;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/** Three Max 20x logins, signed in, at 20%, 40% and 60% of their 5-hour windows. */
function threeLogins(w) {
    w.stored[''] = blob('t1');
    w.stored[SLOT2] = blob('t2');
    w.stored[SLOT3] = blob('t3');
    w.usage = { t1: [20, 30], t2: [40, 50], t3: [60, 70] };
    w.owners = { t1: 'one@example.com', t2: 'two@example.com', t3: 'three@example.com' };
    var org = function (email) { return ({ email: email, orgId: "org-".concat(email), orgName: 'Org' }); };
    return {
        accounts: [
            __assign({ id: '1', slot: '' }, org('one@example.com')),
            __assign({ id: '2', slot: SLOT2 }, org('two@example.com')),
            __assign({ id: '3', slot: SLOT3 }, org('three@example.com')),
        ],
        readings: {},
        health: {},
        holders: {},
        settings: { rotateTo: 'reset', footer: { session: 'braille', week: 'bars', sessionPercent: true, weekPercent: true, active: 'lines', fill: 'left' } },
        chrome: { accountIds: [] },
    };
}
function started(w, persisted) {
    return __awaiter(this, void 0, void 0, function () {
        var c;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    c = new core_ts_1.Coordinator(w.deps(), { version: '0.4.0', pid: 1, startedAt: NOW, isManaged: false }, persisted);
                    return [4 /*yield*/, c.start()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, settle()];
                case 2:
                    _a.sent();
                    return [2 /*return*/, c];
            }
        });
    });
}
var account = function (c, id) {
    var a = c.state().accounts.find(function (x) { return x.id === id; });
    strict_1.default.ok(a, "account ".concat(id));
    return a;
};
(0, node_test_1.describe)('polling', function () {
    (0, node_test_1.test)('reads each login once at start and polls its usage once per login, however many sessions run', function () { return __awaiter(void 0, void 0, void 0, function () {
        var w, c, i;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    w = new World();
                    return [4 /*yield*/, started(w, threeLogins(w))];
                case 1:
                    c = _a.sent();
                    strict_1.default.deepEqual(w.usageCalls.sort(), ['t1', 't2', 't3']);
                    for (i = 0; i < 30; i += 1)
                        c.register({ id: "s".concat(i), slot: i % 2 === 0 ? '' : SLOT2, isInteractive: true });
                    w.usageCalls = [];
                    return [4 /*yield*/, w.advance(core_ts_1.POLL_MS + core_ts_1.TICK_MS)];
                case 2:
                    _a.sent();
                    strict_1.default.deepEqual(w.usageCalls.sort(), ['t1', 't2', 't3'], 'one poll per login in a poll period');
                    strict_1.default.equal(account(c, '1').sessionCount, 15);
                    strict_1.default.equal(account(c, '2').sessionCount, 15);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, node_test_1.test)("a session's readings keep its login fresh, so the coordinator doesn't poll it", function () { return __awaiter(void 0, void 0, void 0, function () {
        var w, c, minute;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    w = new World();
                    return [4 /*yield*/, started(w, threeLogins(w))];
                case 1:
                    c = _c.sent();
                    w.usageCalls = [];
                    minute = 1;
                    _c.label = 2;
                case 2:
                    if (!(minute <= 12)) return [3 /*break*/, 5];
                    return [4 /*yield*/, w.advance(60000)];
                case 3:
                    _c.sent();
                    c.report('1', { fiveHour: { pct: 20 + minute, resetsAt: '2026-11-09T12:00:00Z' }, at: w.now });
                    _c.label = 4;
                case 4:
                    minute += 1;
                    return [3 /*break*/, 2];
                case 5:
                    strict_1.default.ok(!w.usageCalls.includes('t1'), 'login 1 was never polled');
                    strict_1.default.ok(w.usageCalls.includes('t2'), 'idle logins still are');
                    strict_1.default.equal((_b = (_a = account(c, '1').reading) === null || _a === void 0 ? void 0 : _a.fiveHour) === null || _b === void 0 ? void 0 : _b.pct, 32);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, node_test_1.test)('a reading that shows the same as the last moves its time on without waking long polls', function () { return __awaiter(void 0, void 0, void 0, function () {
        var w, c, before;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    w = new World();
                    return [4 /*yield*/, started(w, threeLogins(w))];
                case 1:
                    c = _a.sent();
                    before = c.state().version;
                    c.report('1', { fiveHour: { pct: 20.2, resetsAt: '2026-11-09T12:00:00Z' }, sevenDay: { pct: 30, resetsAt: '2026-11-14T03:00:00Z' }, at: w.now + 1 });
                    strict_1.default.equal(c.state().version, before);
                    c.report('1', { fiveHour: { pct: 25, resetsAt: '2026-11-09T12:00:00Z' }, sevenDay: { pct: 30, resetsAt: '2026-11-14T03:00:00Z' }, at: w.now + 2 });
                    strict_1.default.equal(c.state().version, before + 1);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, node_test_1.test)('an older reading never replaces a newer one', function () { return __awaiter(void 0, void 0, void 0, function () {
        var w, c;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    w = new World();
                    return [4 /*yield*/, started(w, threeLogins(w))];
                case 1:
                    c = _c.sent();
                    c.report('1', { fiveHour: { pct: 50 }, at: w.now - 10000 });
                    strict_1.default.equal((_b = (_a = account(c, '1').reading) === null || _a === void 0 ? void 0 : _a.fiveHour) === null || _b === void 0 ? void 0 : _b.pct, 20);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, node_test_1.test)('a keychain that cannot be read is said once, and leaves the health as it was', function () { return __awaiter(void 0, void 0, void 0, function () {
        var w, c;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    w = new World();
                    return [4 /*yield*/, started(w, threeLogins(w))];
                case 1:
                    c = _a.sent();
                    w.stored[SLOT2] = { state: 'unreadable', code: 51 };
                    return [4 /*yield*/, w.advance(core_ts_1.TICK_MS)];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, w.advance(core_ts_1.TICK_MS)];
                case 3:
                    _a.sent();
                    strict_1.default.equal(c.state().notices.filter(function (n) { return n.text.includes('keychain'); }).length, 1);
                    strict_1.default.equal(account(c, '2').health.kind, 'ok');
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, node_test_1.describe)('rotation', function () {
    (0, node_test_1.test)('sessions on a spent login go to the login whose week resets soonest; none when all are spent', function () { return __awaiter(void 0, void 0, void 0, function () {
        var w, c;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    w = new World();
                    return [4 /*yield*/, started(w, threeLogins(w))];
                case 1:
                    c = _a.sent();
                    strict_1.default.equal(account(c, '1').moveTo, undefined);
                    c.report('1', { fiveHour: { pct: 95, resetsAt: '2026-11-09T12:00:00Z' }, at: w.now + 1 });
                    strict_1.default.equal(account(c, '1').isSpent, true);
                    strict_1.default.equal(account(c, '1').moveTo, '2', 'same resets: the most room breaks the tie');
                    c.report('2', { fiveHour: { pct: 92 }, at: w.now + 1 });
                    c.report('3', { fiveHour: { pct: 99 }, at: w.now + 1 });
                    strict_1.default.equal(account(c, '1').moveTo, undefined);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, node_test_1.test)('with soonest reset, sessions on a login with room go to one whose week resets over an hour sooner', function () { return __awaiter(void 0, void 0, void 0, function () {
        var w, c;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    w = new World();
                    return [4 /*yield*/, started(w, threeLogins(w))
                        // Every week resets together.
                    ];
                case 1:
                    c = _a.sent();
                    // Every week resets together.
                    strict_1.default.equal(account(c, '1').moveTo, undefined);
                    c.report('2', { sevenDay: { pct: 0, resetsAt: '2026-11-12T03:00:00Z' }, at: w.now + 1 });
                    strict_1.default.equal(account(c, '1').moveTo, '2');
                    strict_1.default.equal(account(c, '3').moveTo, '2');
                    strict_1.default.equal(account(c, '2').moveTo, undefined);
                    // Half an hour sooner than login 2's is not enough to move for.
                    c.report('3', { sevenDay: { pct: 10, resetsAt: '2026-11-12T03:30:00Z' }, at: w.now + 1 });
                    strict_1.default.equal(account(c, '3').moveTo, undefined);
                    c.patchSettings({ rotateTo: 'room' });
                    strict_1.default.equal(account(c, '1').moveTo, undefined);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, node_test_1.test)('a turn that hits the limit before the usage shows it counts the 5-hour window full, with one usage call for many sessions', function () { return __awaiter(void 0, void 0, void 0, function () {
        var w, c;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    w = new World();
                    return [4 /*yield*/, started(w, threeLogins(w))];
                case 1:
                    c = _c.sent();
                    w.usageCalls = [];
                    return [4 /*yield*/, w.advance(core_ts_1.FRESH_MS)];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, Promise.all([c.spent('1'), c.spent('1'), c.spent('1')])];
                case 3:
                    _c.sent();
                    strict_1.default.deepEqual(w.usageCalls, ['t1']);
                    strict_1.default.equal((_b = (_a = account(c, '1').reading) === null || _a === void 0 ? void 0 : _a.fiveHour) === null || _b === void 0 ? void 0 : _b.pct, 100);
                    strict_1.default.equal(account(c, '1').moveTo, '2');
                    return [2 /*return*/];
            }
        });
    }); });
    (0, node_test_1.test)('with only a weekly limit, a turn that hits it counts the week full', function () { return __awaiter(void 0, void 0, void 0, function () {
        var w, persisted, _i, _a, token, c;
        var _b, _c, _d, _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    w = new World();
                    persisted = threeLogins(w);
                    for (_i = 0, _a = Object.keys(w.usage); _i < _a.length; _i++) {
                        token = _a[_i];
                        w.usage[token] = [null, (_c = (_b = w.usage[token]) === null || _b === void 0 ? void 0 : _b[1]) !== null && _c !== void 0 ? _c : 0];
                    }
                    return [4 /*yield*/, started(w, persisted)];
                case 1:
                    c = _g.sent();
                    strict_1.default.equal((_d = account(c, '1').reading) === null || _d === void 0 ? void 0 : _d.fiveHour, undefined);
                    return [4 /*yield*/, w.advance(core_ts_1.FRESH_MS)];
                case 2:
                    _g.sent();
                    return [4 /*yield*/, c.spent('1')];
                case 3:
                    _g.sent();
                    strict_1.default.equal((_f = (_e = account(c, '1').reading) === null || _e === void 0 ? void 0 : _e.sevenDay) === null || _f === void 0 ? void 0 : _f.pct, 100);
                    strict_1.default.equal(account(c, '1').isSpent, true);
                    strict_1.default.equal(c.state().combined.fiveHour, undefined);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, node_test_1.test)('a rejected sign-in needs a sign-in, announced once, and the first session to claim the notice notifies', function () { return __awaiter(void 0, void 0, void 0, function () {
        var w, c, notices, id;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    w = new World();
                    return [4 /*yield*/, started(w, threeLogins(w))];
                case 1:
                    c = _c.sent();
                    c.rejected('2');
                    c.rejected('2');
                    notices = c.state().notices.filter(function (n) { return n.notify; });
                    strict_1.default.equal(notices.length, 1);
                    id = (_b = (_a = notices[0]) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : -1;
                    strict_1.default.equal(c.claim(id, 'a'), true);
                    strict_1.default.equal(c.claim(id, 'b'), false);
                    strict_1.default.equal(account(c, '2').health.kind, 'login-needed');
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, node_test_1.describe)('model weeks', function () {
    (0, node_test_1.test)('a login\'s Fable week sends Fable sessions on alone, and a response\'s reading keeps it', function () { return __awaiter(void 0, void 0, void 0, function () {
        var w, persisted, c;
        var _a, _b, _c, _d, _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    w = new World();
                    persisted = threeLogins(w);
                    w.usage = { t1: [null, 30], t2: [null, 50], t3: [null, 70] };
                    w.fable = { t1: 99, t2: 10, t3: 40 };
                    return [4 /*yield*/, started(w, persisted)];
                case 1:
                    c = _g.sent();
                    strict_1.default.deepEqual((_a = account(c, '1').reading) === null || _a === void 0 ? void 0 : _a.models, { Fable: { pct: 99, resetsAt: '2026-11-14T03:00:00Z' } });
                    // Fable sessions on 1 go on; the rest stay. Sessions on 2 have room in both.
                    strict_1.default.deepEqual(account(c, '1').moveToFor, { Fable: '2' });
                    strict_1.default.equal(account(c, '1').moveTo, undefined);
                    strict_1.default.equal(account(c, '2').moveToFor, undefined);
                    c.report('1', { sevenDay: { pct: 31, resetsAt: '2026-11-14T03:00:00Z' }, at: w.now + 1 });
                    strict_1.default.equal((_c = (_b = account(c, '1').reading) === null || _b === void 0 ? void 0 : _b.sevenDay) === null || _c === void 0 ? void 0 : _c.pct, 31);
                    strict_1.default.equal((_f = (_e = (_d = account(c, '1').reading) === null || _d === void 0 ? void 0 : _d.models) === null || _e === void 0 ? void 0 : _e.Fable) === null || _f === void 0 ? void 0 : _f.pct, 99);
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, node_test_1.describe)('usage calls', function () {
    (0, node_test_1.test)('after a failed call (a 429) the next waits two minutes, then twice as long each time, and a Retry-After longer than that', function () { return __awaiter(void 0, void 0, void 0, function () {
        var w, c, ones, twos;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    w = new World();
                    return [4 /*yield*/, started(w, threeLogins(w))];
                case 1:
                    c = _a.sent();
                    w.usageCalls = [];
                    w.failing.t1 = { status: 429 };
                    ones = function () { return w.usageCalls.filter(function (t) { return t === 't1'; }); };
                    return [4 /*yield*/, w.advance(core_ts_1.FRESH_MS)];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, c.check('1', 'fresh')];
                case 3:
                    _a.sent();
                    strict_1.default.deepEqual(ones(), ['t1']);
                    // Sessions asking for fresh usage every minute don't get a call each: the first waits two minutes.
                    return [4 /*yield*/, w.advance(core_ts_1.FRESH_MS)];
                case 4:
                    // Sessions asking for fresh usage every minute don't get a call each: the first waits two minutes.
                    _a.sent();
                    return [4 /*yield*/, c.check('1', 'fresh')];
                case 5:
                    _a.sent();
                    strict_1.default.deepEqual(ones(), ['t1']);
                    return [4 /*yield*/, w.advance(core_ts_1.BACKOFF_MS - core_ts_1.FRESH_MS)];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, c.check('1', 'fresh')];
                case 7:
                    _a.sent();
                    strict_1.default.deepEqual(ones(), ['t1', 't1']);
                    // The second failure waits four minutes.
                    return [4 /*yield*/, w.advance(core_ts_1.BACKOFF_MS)];
                case 8:
                    // The second failure waits four minutes.
                    _a.sent();
                    return [4 /*yield*/, c.check('1', 'fresh')];
                case 9:
                    _a.sent();
                    strict_1.default.deepEqual(ones(), ['t1', 't1']);
                    return [4 /*yield*/, w.advance(core_ts_1.BACKOFF_MS)];
                case 10:
                    _a.sent();
                    delete w.failing.t1;
                    return [4 /*yield*/, c.check('1', 'fresh')];
                case 11:
                    _a.sent();
                    strict_1.default.deepEqual(ones(), ['t1', 't1', 't1']);
                    // A call that answers clears the wait.
                    return [4 /*yield*/, w.advance(core_ts_1.FRESH_MS)];
                case 12:
                    // A call that answers clears the wait.
                    _a.sent();
                    return [4 /*yield*/, c.check('1', 'fresh')];
                case 13:
                    _a.sent();
                    strict_1.default.equal(ones().length, 4);
                    // A Retry-After of ten minutes is kept, past the minute.
                    w.usageCalls = [];
                    w.failing.t2 = { status: 429, retryAfterMs: 10 * 60000 };
                    return [4 /*yield*/, c.check('2', 'fresh')
                        // Login 2 waits, its polls included.
                    ];
                case 14:
                    _a.sent();
                    twos = function () { return w.usageCalls.filter(function (t) { return t === 't2'; }); };
                    return [4 /*yield*/, w.advance(9 * 60000)];
                case 15:
                    _a.sent();
                    return [4 /*yield*/, c.check('2', 'fresh')];
                case 16:
                    _a.sent();
                    strict_1.default.deepEqual(twos(), ['t2']);
                    return [4 /*yield*/, w.advance(60000)];
                case 17:
                    _a.sent();
                    return [4 /*yield*/, c.check('2', 'fresh')];
                case 18:
                    _a.sent();
                    strict_1.default.deepEqual(twos(), ['t2', 't2']);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, node_test_1.test)('a Retry-After header reads as seconds or as a date', function () {
        var now = Date.parse('2026-11-10T00:00:00Z');
        strict_1.default.equal((0, server_ts_1.retryAfter)('120', now), 120000);
        strict_1.default.equal((0, server_ts_1.retryAfter)('Tue, 10 Nov 2026 00:05:00 GMT', now), 300000);
        strict_1.default.equal((0, server_ts_1.retryAfter)(null, now), undefined);
        strict_1.default.equal((0, server_ts_1.retryAfter)('soon', now), undefined);
    });
});
(0, node_test_1.describe)('combined usage', function () {
    (0, node_test_1.test)('weighs each login by its plan and leaves out logins that need a sign-in', function () { return __awaiter(void 0, void 0, void 0, function () {
        var w, persisted, c;
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    w = new World();
                    persisted = threeLogins(w);
                    w.tiers = { t3: 'default_claude_max_5x' };
                    return [4 /*yield*/, started(w, persisted)
                        // Ultra (formerly Max 20x) gives 10x Pro's week, Max 5x gives 5x: an Ultra login counts twice a Max one.
                    ];
                case 1:
                    c = _e.sent();
                    // Ultra (formerly Max 20x) gives 10x Pro's week, Max 5x gives 5x: an Ultra login counts twice a Max one.
                    strict_1.default.equal(account(c, '1').weight, 10);
                    strict_1.default.equal(account(c, '3').weight, 5);
                    // (10*20 + 10*40 + 5*60) / 25
                    strict_1.default.equal((_a = c.state().combined.fiveHour) === null || _a === void 0 ? void 0 : _a.pct, Math.round(((10 * 20 + 10 * 40 + 5 * 60) / 25) * 10) / 10);
                    c.rejected('2');
                    strict_1.default.equal((_b = c.state().combined.fiveHour) === null || _b === void 0 ? void 0 : _b.pct, Math.round(((10 * 20 + 5 * 60) / 15) * 10) / 10);
                    strict_1.default.equal((_c = c.state().combined.fiveHour) === null || _c === void 0 ? void 0 : _c.accounts, 2);
                    strict_1.default.equal((_d = c.state().combined.fiveHour) === null || _d === void 0 ? void 0 : _d.nextResetAt, '2026-11-09T12:00:00.000Z');
                    return [2 /*return*/];
            }
        });
    }); });
    (0, node_test_1.test)('a window past its reset counts as empty', function () { return __awaiter(void 0, void 0, void 0, function () {
        var w, c;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    w = new World();
                    return [4 /*yield*/, started(w, threeLogins(w))];
                case 1:
                    c = _b.sent();
                    return [4 /*yield*/, w.advance(2 * HOUR + 60000)];
                case 2:
                    _b.sent();
                    strict_1.default.equal((_a = c.state().combined.fiveHour) === null || _a === void 0 ? void 0 : _a.pct, 0);
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, node_test_1.describe)('long polls', function () {
    (0, node_test_1.test)('answer at once when the state moved, on the next change, or after the wait', function () { return __awaiter(void 0, void 0, void 0, function () {
        var w, c, v, isDone;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    w = new World();
                    return [4 /*yield*/, started(w, threeLogins(w))];
                case 1:
                    c = _a.sent();
                    v = c.state().version;
                    isDone = false;
                    void c.waitForChange(v - 1, 50000).then(function () { return (isDone = true); });
                    return [4 /*yield*/, settle()];
                case 2:
                    _a.sent();
                    strict_1.default.equal(isDone, true, 'already moved');
                    isDone = false;
                    void c.waitForChange(v, 50000).then(function () { return (isDone = true); });
                    return [4 /*yield*/, settle()];
                case 3:
                    _a.sent();
                    strict_1.default.equal(isDone, false);
                    c.patchSettings({ rotateTo: 'room' });
                    return [4 /*yield*/, settle()];
                case 4:
                    _a.sent();
                    strict_1.default.equal(isDone, true, 'woken by a change');
                    isDone = false;
                    void c.waitForChange(c.state().version, 120000).then(function () { return (isDone = true); });
                    return [4 /*yield*/, w.advance(core_ts_1.MAX_WAIT_MS - 1)];
                case 5:
                    _a.sent();
                    strict_1.default.equal(isDone, false);
                    return [4 /*yield*/, w.advance(1)];
                case 6:
                    _a.sent();
                    strict_1.default.equal(isDone, true, 'capped at the longest wait');
                    return [2 /*return*/];
            }
        });
    }); });
    (0, node_test_1.test)('GET /state through the API waits the same way', function () { return __awaiter(void 0, void 0, void 0, function () {
        var w, c, v, answer;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    w = new World();
                    return [4 /*yield*/, started(w, threeLogins(w))];
                case 1:
                    c = _a.sent();
                    v = c.state().version;
                    void c.handle({ method: 'GET', path: '/state', query: { since: String(v), wait: '5000' }, body: undefined }).then(function (a) { return (answer = a); });
                    return [4 /*yield*/, w.advance(4000)];
                case 2:
                    _a.sent();
                    strict_1.default.equal(answer, undefined);
                    return [4 /*yield*/, w.advance(1000)
                        // Set by the handler meanwhile: the assertion above narrowed it to undefined.
                    ];
                case 3:
                    _a.sent();
                    // Set by the handler meanwhile: the assertion above narrowed it to undefined.
                    strict_1.default.equal(answer === null || answer === void 0 ? void 0 : answer.status, 200);
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, node_test_1.describe)('identity', function () {
    (0, node_test_1.test)('a new sign-in in a slot is asked about once, and names the login', function () { return __awaiter(void 0, void 0, void 0, function () {
        var w, persisted, c;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    w = new World();
                    persisted = threeLogins(w);
                    persisted.accounts = persisted.accounts.map(function (a) { return (a.id === '2' ? { id: '2', slot: SLOT2 } : a); });
                    return [4 /*yield*/, started(w, persisted)];
                case 1:
                    c = _a.sent();
                    strict_1.default.equal(account(c, '2').email, 'two@example.com');
                    strict_1.default.equal(account(c, '2').tier, 'default_claude_max_20x');
                    w.profileCalls = [];
                    return [4 /*yield*/, w.advance(core_ts_1.TICK_MS)];
                case 2:
                    _a.sent();
                    strict_1.default.deepEqual(w.profileCalls, [], 'the same token is not asked about again');
                    return [2 /*return*/];
            }
        });
    }); });
    (0, node_test_1.test)("a slot that holds another login's sign-in needs its own again", function () { return __awaiter(void 0, void 0, void 0, function () {
        var w, c;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    w = new World();
                    return [4 /*yield*/, started(w, threeLogins(w))];
                case 1:
                    c = _a.sent();
                    w.stored[SLOT3] = blob('t2b');
                    w.owners.t2b = 'two@example.com';
                    w.usage.t2b = [40, 50];
                    return [4 /*yield*/, w.advance(core_ts_1.TICK_MS)];
                case 2:
                    _a.sent();
                    strict_1.default.deepEqual(account(c, '3').health, { kind: 'login-needed', why: 'signed in as account 2 now' });
                    return [2 /*return*/];
            }
        });
    }); });
    (0, node_test_1.test)("a /login that signs Claude Code's login in to another account renames it, and says so", function () { return __awaiter(void 0, void 0, void 0, function () {
        var w, c;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    w = new World();
                    return [4 /*yield*/, started(w, threeLogins(w))];
                case 1:
                    c = _a.sent();
                    w.stored[''] = blob('t9');
                    w.owners.t9 = 'nine@example.com';
                    w.usage.t9 = [5, 5];
                    return [4 /*yield*/, c.check('1', 'fresh')];
                case 2:
                    _a.sent();
                    strict_1.default.equal(account(c, '1').email, 'nine@example.com');
                    strict_1.default.ok(c.state().notices.some(function (n) { return n.text.startsWith("Claude Code's login, account 1, is nine@example.com"); }));
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, node_test_1.describe)('sign-in', function () {
    (0, node_test_1.test)('signs in every login that needs it, one at a time, and adopts who signed in', function () { return __awaiter(void 0, void 0, void 0, function () {
        var w, persisted, c;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    w = new World();
                    persisted = threeLogins(w);
                    delete w.stored[SLOT2];
                    delete w.stored[SLOT3];
                    return [4 /*yield*/, started(w, persisted)];
                case 1:
                    c = _d.sent();
                    strict_1.default.equal(account(c, '2').health.kind, 'login-needed');
                    c.signIn();
                    strict_1.default.equal(w.signIns.length, 1);
                    strict_1.default.equal(account(c, '2').health.kind, 'logging-in');
                    strict_1.default.equal((_a = c.state().signIn) === null || _a === void 0 ? void 0 : _a.accountId, '2');
                    w.stored[SLOT2] = blob('t2');
                    w.status[SLOT2] = { email: 'two@example.com', orgId: 'org-two@example.com', orgName: 'Org', plan: 'max' };
                    (_b = w.signIns[0]) === null || _b === void 0 ? void 0 : _b.finish(0);
                    return [4 /*yield*/, settle()];
                case 2:
                    _d.sent();
                    strict_1.default.equal(account(c, '2').health.kind, 'ok');
                    strict_1.default.equal(w.signIns.length, 2, 'then the next');
                    strict_1.default.equal((_c = w.signIns[1]) === null || _c === void 0 ? void 0 : _c.slot, SLOT3);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, node_test_1.test)('a sign-in as a login already on the list asks for another account', function () { return __awaiter(void 0, void 0, void 0, function () {
        var w, persisted, c;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    w = new World();
                    persisted = threeLogins(w);
                    delete w.stored[SLOT3];
                    return [4 /*yield*/, started(w, persisted)];
                case 1:
                    c = _b.sent();
                    c.signIn('3');
                    w.status[SLOT3] = { email: 'one@example.com', orgId: 'org-one@example.com' };
                    (_a = w.signIns[0]) === null || _a === void 0 ? void 0 : _a.finish(0);
                    return [4 /*yield*/, settle()];
                case 2:
                    _b.sent();
                    strict_1.default.deepEqual(account(c, '3').health, { kind: 'login-needed', why: 'that was account 1 (one@example.com · Org) again' });
                    strict_1.default.ok(c.state().notices.some(function (n) { return n.text.includes('Sign out of claude.ai in your browser'); }));
                    return [2 /*return*/];
            }
        });
    }); });
    (0, node_test_1.test)('a sign-in that fails says why; cancel ends the queue', function () { return __awaiter(void 0, void 0, void 0, function () {
        var w, persisted, c;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    w = new World();
                    persisted = threeLogins(w);
                    delete w.stored[SLOT2];
                    delete w.stored[SLOT3];
                    return [4 /*yield*/, started(w, persisted)];
                case 1:
                    c = _c.sent();
                    c.signIn();
                    (_a = w.signIns[0]) === null || _a === void 0 ? void 0 : _a.finish(1, 'browser closed');
                    return [4 /*yield*/, settle()];
                case 2:
                    _c.sent();
                    strict_1.default.ok(c.state().notices.some(function (n) { return n.text === 'Sign-in for Claude account 2 did not finish: browser closed'; }));
                    c.cancelSignIn();
                    return [4 /*yield*/, settle()];
                case 3:
                    _c.sent();
                    strict_1.default.equal((_b = w.signIns[1]) === null || _b === void 0 ? void 0 : _b.cancelled, true);
                    strict_1.default.equal(c.state().signIn, undefined);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, node_test_1.test)('a coordinator that died mid sign-in counts it unfinished', function () { return __awaiter(void 0, void 0, void 0, function () {
        var w, persisted, c;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    w = new World();
                    persisted = threeLogins(w);
                    persisted.health = { '2': { kind: 'logging-in', since: NOW - 1000 } };
                    delete w.stored[SLOT2];
                    return [4 /*yield*/, started(w, persisted)];
                case 1:
                    c = _a.sent();
                    strict_1.default.equal(account(c, '2').health.kind, 'login-needed');
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, node_test_1.describe)('sessions', function () {
    (0, node_test_1.test)('a session on a slot nobody registered adopts it as a new login', function () { return __awaiter(void 0, void 0, void 0, function () {
        var w, c, slot, id;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    w = new World();
                    return [4 /*yield*/, started(w, threeLogins(w))];
                case 1:
                    c = _a.sent();
                    slot = '/Users/tester/elsewhere';
                    w.stored[slot] = blob('t4');
                    w.owners.t4 = 'four@example.com';
                    w.usage.t4 = [1, 1];
                    id = c.register({ id: 's', slot: slot, isInteractive: true });
                    return [4 /*yield*/, settle()];
                case 2:
                    _a.sent();
                    strict_1.default.equal(id, '4');
                    strict_1.default.equal(account(c, '4').email, 'four@example.com');
                    return [2 /*return*/];
            }
        });
    }); });
    (0, node_test_1.test)('a session id arrives percent-encoded in a path, as sessions send it, and is found', function () { return __awaiter(void 0, void 0, void 0, function () {
        var w, c, path, _a, _b, _c, _d;
        var _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    w = new World();
                    return [4 /*yield*/, started(w, threeLogins(w))];
                case 1:
                    c = _f.sent();
                    c.register({ id: 'session-1:4242', slot: '', isInteractive: true });
                    path = "/sessions/".concat(encodeURIComponent('session-1:4242'));
                    _b = (_a = strict_1.default).equal;
                    return [4 /*yield*/, c.handle({ method: 'PATCH', path: path, query: {}, body: { accountId: '2' } })];
                case 2:
                    _b.apply(_a, [(_f.sent()).status, 200]);
                    strict_1.default.equal((_e = c.state().sessions[0]) === null || _e === void 0 ? void 0 : _e.accountId, '2');
                    _d = (_c = strict_1.default).equal;
                    return [4 /*yield*/, c.handle({ method: 'PATCH', path: '/sessions/%E0%A4%A', query: {}, body: {} })];
                case 3:
                    _d.apply(_c, [(_f.sent()).status, 400]);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, node_test_1.test)('a session whose process ended, or that went quiet, is dropped', function () { return __awaiter(void 0, void 0, void 0, function () {
        var w, c;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    w = new World();
                    return [4 /*yield*/, started(w, threeLogins(w))];
                case 1:
                    c = _a.sent();
                    w.alive.add(100);
                    c.register({ id: 'live', pid: 100, slot: '', isInteractive: true });
                    c.register({ id: 'dead', pid: 101, slot: '', isInteractive: true });
                    c.register({ id: 'quiet', slot: '', isInteractive: true });
                    c.register({ id: 'polling', slot: '', isInteractive: true });
                    c.pollOpened('polling');
                    return [4 /*yield*/, w.advance(core_ts_1.TICK_MS)];
                case 2:
                    _a.sent();
                    strict_1.default.deepEqual(c.state().sessions.map(function (s) { return s.id; }).sort(), ['live', 'polling', 'quiet']);
                    return [4 /*yield*/, w.advance(core_ts_1.STALE_SESSION_MS)];
                case 3:
                    _a.sent();
                    strict_1.default.deepEqual(c.state().sessions.map(function (s) { return s.id; }).sort(), ['live', 'polling']);
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, node_test_1.describe)('removing a login', function () {
    (0, node_test_1.test)("Claude Code's own login can't be removed", function () { return __awaiter(void 0, void 0, void 0, function () {
        var w, c, answer;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    w = new World();
                    return [4 /*yield*/, started(w, threeLogins(w))];
                case 1:
                    c = _a.sent();
                    return [4 /*yield*/, c.handle({ method: 'POST', path: '/accounts/1/remove', query: {}, body: {} })];
                case 2:
                    answer = _a.sent();
                    strict_1.default.equal(answer.status, 400);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, node_test_1.test)('sessions on it move off first; then it is signed out and dropped', function () { return __awaiter(void 0, void 0, void 0, function () {
        var w, c;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    w = new World();
                    return [4 /*yield*/, started(w, threeLogins(w))];
                case 1:
                    c = _a.sent();
                    c.register({ id: 's', slot: SLOT2, isInteractive: true });
                    return [4 /*yield*/, c.remove('2')];
                case 2:
                    _a.sent();
                    strict_1.default.equal(account(c, '2').isRetiring, true);
                    strict_1.default.equal(account(c, '2').moveTo, '1');
                    strict_1.default.deepEqual(w.signOuts, []);
                    c.patchSession('s', { accountId: '1' });
                    return [4 /*yield*/, settle()];
                case 3:
                    _a.sent();
                    strict_1.default.deepEqual(w.signOuts, [SLOT2]);
                    strict_1.default.equal(c.state().accounts.some(function (a) { return a.id === '2'; }), false);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, node_test_1.test)('is refused while sessions use it and nothing can take over', function () { return __awaiter(void 0, void 0, void 0, function () {
        var w, c, answer;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    w = new World();
                    return [4 /*yield*/, started(w, threeLogins(w))];
                case 1:
                    c = _a.sent();
                    c.register({ id: 's', slot: SLOT2, isInteractive: true });
                    c.rejected('1');
                    c.rejected('3');
                    return [4 /*yield*/, c.handle({ method: 'POST', path: '/accounts/2/remove', query: {}, body: {} })];
                case 2:
                    answer = _a.sent();
                    strict_1.default.equal(answer.status, 409);
                    return [2 /*return*/];
            }
        });
    }); });
});
(0, node_test_1.describe)('the API', function () {
    (0, node_test_1.test)('refuses what it does not know and readings that are not readings', function () { return __awaiter(void 0, void 0, void 0, function () {
        var w, c, _a, _b, _c, _d, _e, _f, _g, _h;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0:
                    w = new World();
                    return [4 /*yield*/, started(w, threeLogins(w))];
                case 1:
                    c = _j.sent();
                    _b = (_a = strict_1.default).equal;
                    return [4 /*yield*/, c.handle({ method: 'GET', path: '/nope', query: {}, body: undefined })];
                case 2:
                    _b.apply(_a, [(_j.sent()).status, 404]);
                    _d = (_c = strict_1.default).equal;
                    return [4 /*yield*/, c.handle({ method: 'POST', path: '/readings', query: {}, body: { accountId: '1', reading: { pct: 3 } } })];
                case 3:
                    _d.apply(_c, [(_j.sent()).status, 400]);
                    _f = (_e = strict_1.default).equal;
                    return [4 /*yield*/, c.handle({ method: 'PATCH', path: '/settings', query: {}, body: { rotateTo: 'sideways' } })];
                case 4:
                    _f.apply(_e, [(_j.sent()).status, 400]);
                    _h = (_g = strict_1.default).equal;
                    return [4 /*yield*/, c.handle({ method: 'PATCH', path: '/sessions/ghost', query: {}, body: { accountId: '1' } })];
                case 5:
                    _h.apply(_g, [(_j.sent()).status, 404]);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, node_test_1.test)('keeps what it learned across a restart', function () { return __awaiter(void 0, void 0, void 0, function () {
        var w, c, saved, again;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    w = new World();
                    return [4 /*yield*/, started(w, threeLogins(w))];
                case 1:
                    c = _a.sent();
                    c.patchSettings({ rotateTo: 'order' });
                    c.patchChrome({ accountId: '2', seen: { accountId: '2', isSeen: true } });
                    c.stop();
                    saved = w.saved;
                    strict_1.default.ok(saved);
                    return [4 /*yield*/, started(new World(), saved)];
                case 2:
                    again = _a.sent();
                    strict_1.default.equal(again.state().settings.rotateTo, 'order');
                    strict_1.default.equal(again.state().chrome.accountId, '2');
                    strict_1.default.deepEqual(again.state().chrome.accountIds, ['2']);
                    return [2 /*return*/];
            }
        });
    }); });
});
