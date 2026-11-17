"use strict";
// The coordinator: the one process that holds what every session shares. It
// reads each login's sign-in, polls usage once per login (not once per session),
// runs browser sign-ins one at a time, keeps the settings, counts the sessions
// on each login and says where sessions on a spent login go. Sessions and the
// menu bar app reach it over HTTP on a Unix socket (server.ts); this file is
// plain TypeScript with everything outside it passed in, so tests drive it
// in memory.
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.Coordinator = exports.MAX_WAIT_MS = exports.MAX_BACKOFF_MS = exports.BACKOFF_MS = exports.STALE_SESSION_MS = exports.FRESH_MS = exports.POLL_MS = exports.TICK_MS = void 0;
exports.readingFrom = readingFrom;
var model_ts_1 = require("../hooks/model.ts");
/** How often the coordinator re-reads every sign-in and prunes dead sessions. */
exports.TICK_MS = 60000;
/** A login's usage is polled once its last reading is this old: sessions' responses keep busy logins fresher. */
exports.POLL_MS = 5 * 60000;
/** A check asked for fresh usage reuses a reading at most this old: every session asking within a minute shares one call. */
exports.FRESH_MS = 60000;
/** A session with no open long poll and no request for this long is gone, even where its process can't be checked. */
exports.STALE_SESSION_MS = 10 * 60000;
/** After a failed usage call (a 429, an outage), how long before the next: doubling with each failure, up to the most. */
exports.BACKOFF_MS = 2 * 60000;
exports.MAX_BACKOFF_MS = 15 * 60000;
/** The longest a long poll waits. */
exports.MAX_WAIT_MS = 55000;
var NOTICE_KEEP = 20;
var HttpError = /** @class */ (function (_super) {
    __extends(HttpError, _super);
    function HttpError(status, message) {
        var _this = _super.call(this, message) || this;
        _this.status = status;
        return _this;
    }
    return HttpError;
}(Error));
var isObject = function (v) { return typeof v === 'object' && v !== null && !Array.isArray(v); };
function windowOf(value) {
    if (!isObject(value) || typeof value.pct !== 'number' || !Number.isFinite(value.pct))
        return undefined;
    return __assign({ pct: value.pct }, (typeof value.resetsAt === 'string' ? { resetsAt: value.resetsAt } : {}));
}
/** A reading a client sent, checked: undefined when it isn't one. */
function readingFrom(value) {
    if (!isObject(value) || typeof value.at !== 'number')
        return undefined;
    var fiveHour = windowOf(value.fiveHour);
    var sevenDay = windowOf(value.sevenDay);
    var models = {};
    for (var _i = 0, _a = Object.entries(isObject(value.models) ? value.models : {}); _i < _a.length; _i++) {
        var _b = _a[_i], name_1 = _b[0], w = _b[1];
        var window_1 = windowOf(w);
        if (window_1 !== undefined)
            models[name_1] = window_1;
    }
    var hasModels = Object.keys(models).length > 0;
    if (fiveHour === undefined && sevenDay === undefined && !hasModels)
        return undefined;
    return __assign(__assign(__assign(__assign({}, (fiveHour ? { fiveHour: fiveHour } : {})), (sevenDay ? { sevenDay: sevenDay } : {})), (hasModels ? { models: models } : {})), { at: value.at });
}
/** Two readings that show the same: within half a point on each window, with the same resets. */
function sameReading(a, b) {
    var _a, _b;
    if (a === undefined)
        return false;
    var same = function (x, y) {
        return (x === undefined && y === undefined) || (x !== undefined && y !== undefined && Math.abs(x.pct - y.pct) < 0.5 && x.resetsAt === y.resetsAt);
    };
    var names = new Set(__spreadArray(__spreadArray([], Object.keys((_a = a.models) !== null && _a !== void 0 ? _a : {}), true), Object.keys((_b = b.models) !== null && _b !== void 0 ? _b : {}), true));
    return same(a.fiveHour, b.fiveHour) && same(a.sevenDay, b.sevenDay) && __spreadArray([], names, true).every(function (n) { var _a, _b; return same((_a = a.models) === null || _a === void 0 ? void 0 : _a[n], (_b = b.models) === null || _b === void 0 ? void 0 : _b[n]); });
}
var Coordinator = /** @class */ (function () {
    function Coordinator(deps, info, persisted) {
        this.accounts = [];
        this.readings = {};
        this.health = {};
        this.holders = {};
        this.expiresAt = {};
        this.retiring = new Set();
        this.settings = { rotateTo: model_ts_1.DEFAULT_ROTATE_TO, footer: model_ts_1.DEFAULT_FOOTER };
        this.chrome = { accountIds: [] };
        this.sessions = new Map();
        this.openPolls = new Map();
        this.notices = [];
        this.nextNoticeId = 1;
        this.claims = new Map();
        this.signQueue = [];
        this.version = 1;
        this.waiters = new Set();
        this.inflight = new Map();
        this.usageAt = {};
        /** Per login, after failed usage calls: no call before `until`; the next failure waits twice `delay`. */
        this.backoff = {};
        this.unreadable = new Set();
        this.stops = [];
        this.isTicking = false;
        this.deps = deps;
        this.info = info;
        if (persisted !== undefined)
            this.load(persisted);
        if (!this.accounts.some(function (a) { return a.slot === ''; }))
            this.accounts = __spreadArray([{ id: '1', slot: '' }], this.accounts.filter(function (a) { return a.id !== '1'; }), true);
        for (var _i = 0, _a = Object.entries(this.health); _i < _a.length; _i++) {
            var _b = _a[_i], id = _b[0], h = _b[1];
            // A sign-in a coordinator before this one ran never finished.
            if (h.kind === 'logging-in')
                this.health[id] = { kind: 'login-needed', why: 'sign-in not finished' };
        }
    }
    Coordinator.prototype.load = function (p) {
        var _a, _b, _c, _d, _e;
        this.accounts = Array.isArray(p.accounts) ? p.accounts.filter(function (a) { return isObject(a) && typeof a.id === 'string' && typeof a.slot === 'string'; }) : [];
        var ids = new Set(this.accounts.map(function (a) { return a.id; }));
        var keep = function (record) {
            return Object.fromEntries(Object.entries(isObject(record) ? record : {}).filter(function (_a) {
                var id = _a[0];
                return ids.has(id);
            }));
        };
        this.readings = keep(p.readings);
        this.health = keep(p.health);
        this.holders = keep(p.holders);
        this.settings = { rotateTo: (0, model_ts_1.rotateToFrom)((_a = p.settings) === null || _a === void 0 ? void 0 : _a.rotateTo), footer: (0, model_ts_1.footerStyleFrom)((_b = p.settings) === null || _b === void 0 ? void 0 : _b.footer) };
        var chromeId = (_c = p.chrome) === null || _c === void 0 ? void 0 : _c.accountId;
        this.chrome = __assign(__assign(__assign({}, (typeof chromeId === 'string' && ids.has(chromeId) ? { accountId: chromeId } : {})), { accountIds: (Array.isArray((_d = p.chrome) === null || _d === void 0 ? void 0 : _d.accountIds) ? p.chrome.accountIds : []).filter(function (id) { return typeof id === 'string' && ids.has(id); }) }), (typeof ((_e = p.chrome) === null || _e === void 0 ? void 0 : _e.miss) === 'string' ? { miss: p.chrome.miss } : {}));
    };
    /** Starts the periodic checks and reads every login once. */
    Coordinator.prototype.start = function () {
        var _this = this;
        this.stops.push(this.deps.every(exports.TICK_MS, function () { return void _this.tick(); }));
        this.changed();
        return this.boot();
    };
    Coordinator.prototype.stop = function () {
        var _a;
        for (var _i = 0, _b = this.stops.splice(0); _i < _b.length; _i++) {
            var stop_1 = _b[_i];
            stop_1();
        }
        (_a = this.signing) === null || _a === void 0 ? void 0 : _a.run.cancel();
        for (var _c = 0, _d = __spreadArray([], this.waiters, true); _c < _d.length; _c++) {
            var wake = _d[_c];
            wake();
        }
    };
    Coordinator.prototype.boot = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, account, who;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.checkAll('poll')
                        // Logins whose token has run out are named from what `claude auth login` left in their folder.
                    ];
                    case 1:
                        _b.sent();
                        _i = 0, _a = this.accounts.filter(function (a) { return a.email === undefined || a.orgId === undefined; });
                        _b.label = 2;
                    case 2:
                        if (!(_i < _a.length)) return [3 /*break*/, 5];
                        account = _a[_i];
                        return [4 /*yield*/, this.deps.authStatus(account.slot).catch(function () { return undefined; })];
                    case 3:
                        who = _b.sent();
                        if (who === undefined)
                            return [3 /*break*/, 4];
                        this.updateAccount(account.id, who);
                        _b.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    // ------------------------------------------------------------ state
    Coordinator.prototype.changed = function () {
        this.version += 1;
        this.persist();
        for (var _i = 0, _a = __spreadArray([], this.waiters, true); _i < _a.length; _i++) {
            var wake = _a[_i];
            wake();
        }
    };
    Coordinator.prototype.persist = function () {
        var health = Object.fromEntries(Object.entries(this.health).filter(function (_a) {
            var h = _a[1];
            return h.kind !== 'logging-in';
        }));
        this.deps.save({ accounts: this.accounts, readings: this.readings, health: health, holders: this.holders, settings: this.settings, chrome: this.chrome });
    };
    /** The view the model's functions read, from the coordinator's side: every login, no session's own. */
    Coordinator.prototype.view = function (activeId) {
        return __assign(__assign({}, model_ts_1.EMPTY_VIEW), { accounts: this.accounts, readings: this.readings, health: this.health, holders: this.holders, rotateTo: this.settings.rotateTo, footer: this.settings.footer, retiring: __spreadArray([], this.retiring, true), activeId: activeId });
    };
    Coordinator.prototype.liveSessions = function () {
        return __spreadArray([], this.sessions.values(), true);
    };
    Coordinator.prototype.sessionCount = function (accountId) {
        return this.liveSessions().filter(function (s) { return s.accountId === accountId; }).length;
    };
    /**
     * Where sessions on a login go: once they must leave it, or with 'soonest
     * reset' once another's week resets sooner. `scope` is a model with a week of
     * its own (Fable): its sessions also leave once that week is spent.
     */
    Coordinator.prototype.moveTo = function (accountId, now, scope) {
        var _a, _b;
        if (now === void 0) { now = this.deps.now(); }
        var view = __assign(__assign({}, this.view(accountId)), (scope === undefined ? {} : { model: scope }));
        return (0, model_ts_1.shouldLeave)(view, now) ? (_a = (0, model_ts_1.pickTarget)(view, now)) === null || _a === void 0 ? void 0 : _a.id : (_b = (0, model_ts_1.soonerTarget)(view, now)) === null || _b === void 0 ? void 0 : _b.id;
    };
    /** The model weeks any login reports, by name. */
    Coordinator.prototype.scopes = function () {
        return __spreadArray([], new Set(Object.values(this.readings).flatMap(function (r) { var _a; return Object.keys((_a = r.models) !== null && _a !== void 0 ? _a : {}); })), true).sort();
    };
    Coordinator.prototype.state = function () {
        var _this = this;
        var now = this.deps.now();
        var accounts = this.accounts.map(function (a) {
            var _a;
            var reading = _this.readings[a.id];
            var holder = _this.holders[a.id];
            var moveTo = _this.moveTo(a.id, now);
            var moveToFor = Object.fromEntries(_this.scopes().flatMap(function (scope) {
                var to = _this.moveTo(a.id, now, scope);
                return to === undefined ? [] : [[scope, to]];
            }));
            return __assign(__assign(__assign(__assign(__assign(__assign(__assign(__assign(__assign(__assign({}, a), { health: (_a = _this.health[a.id]) !== null && _a !== void 0 ? _a : { kind: 'login-needed', why: 'not read yet' } }), (reading === undefined ? {} : { reading: reading })), (holder === undefined ? {} : { holder: holder })), (_this.expiresAt[a.id] === undefined ? {} : { expiresAt: _this.expiresAt[a.id] })), { weight: (0, model_ts_1.weightOf)(a), isSpent: (0, model_ts_1.isSpent)(reading, now) }), (_this.retiring.has(a.id) ? { isRetiring: true } : {})), (moveTo === undefined ? {} : { moveTo: moveTo })), (Object.keys(moveToFor).length === 0 ? {} : { moveToFor: moveToFor })), { sessionCount: _this.sessionCount(a.id) });
        });
        return __assign({ version: this.version, coordinator: this.info, now: now, accounts: accounts, combined: (0, model_ts_1.combinedUsage)(this.accounts, this.readings, this.health, now), settings: this.settings, chrome: this.chrome, sessions: this.liveSessions(), notices: this.notices }, (this.signing === undefined ? {} : { signIn: { accountId: this.signing.accountId, since: this.signing.since } }));
    };
    /** Resolves once the state moves past `since`, or after `ms`. */
    Coordinator.prototype.waitForChange = function (since, ms) {
        var _this = this;
        if (since !== this.version)
            return Promise.resolve();
        return new Promise(function (resolve) {
            var wake = function () {
                _this.waiters.delete(wake);
                cancel();
                resolve();
            };
            var cancel = _this.deps.after(Math.min(Math.max(ms, 0), exports.MAX_WAIT_MS), wake);
            _this.waiters.add(wake);
        });
    };
    Coordinator.prototype.find = function (id) {
        return this.accounts.find(function (a) { return a.id === id; });
    };
    Coordinator.prototype.need = function (id) {
        var account = this.find(id);
        if (account === undefined)
            throw new HttpError(404, "No Claude account ".concat(id, "."));
        return account;
    };
    Coordinator.prototype.updateAccount = function (id, change) {
        var before = this.find(id);
        if (before === undefined)
            return;
        var after = __assign(__assign({}, before), change);
        if (JSON.stringify(after) === JSON.stringify(before))
            return;
        this.accounts = this.accounts.map(function (a) { return (a.id === id ? after : a); });
        this.changed();
    };
    /** Stores a login's health; a login that could serve and can't now is announced. */
    Coordinator.prototype.setHealth = function (id, health) {
        var _a;
        var before = this.health[id];
        if (JSON.stringify(before) === JSON.stringify(health))
            return;
        this.health = __assign(__assign({}, this.health), (_a = {}, _a[id] = health, _a));
        if (health.kind === 'login-needed' && (before === null || before === void 0 ? void 0 : before.kind) === 'ok') {
            var account = this.find(id);
            this.addNotice("Claude account ".concat((0, model_ts_1.label)(account), " needs a sign-in (").concat(health.why, "). Click \u26A0").concat(id, " under the prompt."), true, id);
        }
        this.changed();
    };
    /** A newer reading of a login; one that shows the same as the last moves its time on without waking anyone. */
    /** A response's reading has no model weeks (only the usage endpoint reports them), so it keeps the last poll's. */
    Coordinator.prototype.putReading = function (id, given) {
        var _a;
        var before = this.readings[id];
        if (before !== undefined && before.at > given.at)
            return;
        var reading = given.models === undefined && (before === null || before === void 0 ? void 0 : before.models) !== undefined ? __assign(__assign({}, given), { models: before.models }) : given;
        this.readings = __assign(__assign({}, this.readings), (_a = {}, _a[id] = reading, _a));
        if (sameReading(before, reading))
            this.persist();
        else
            this.changed();
    };
    Coordinator.prototype.addNotice = function (text, notify, accountId) {
        var notice = __assign({ id: this.nextNoticeId++, at: this.deps.now(), text: text, notify: notify }, (accountId === undefined ? {} : { accountId: accountId }));
        this.notices = __spreadArray(__spreadArray([], this.notices, true), [notice], false).slice(-NOTICE_KEEP);
        var kept = new Set(this.notices.map(function (n) { return n.id; }));
        for (var _i = 0, _a = this.claims.keys(); _i < _a.length; _i++) {
            var id = _a[_i];
            if (!kept.has(id))
                this.claims.delete(id);
        }
        this.deps.log("notice: ".concat(text));
        this.changed();
    };
    // ------------------------------------------------------------ checks
    Coordinator.prototype.tick = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.isTicking)
                            return [2 /*return*/];
                        this.isTicking = true;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, 5, 6]);
                        this.prune();
                        return [4 /*yield*/, this.finishRetirements()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, this.checkAll('poll')];
                    case 3:
                        _a.sent();
                        return [3 /*break*/, 6];
                    case 4:
                        error_1 = _a.sent();
                        this.deps.log("tick failed: ".concat(String(error_1)));
                        return [3 /*break*/, 6];
                    case 5:
                        this.isTicking = false;
                        return [7 /*endfinally*/];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    Coordinator.prototype.checkAll = function (usage) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, account, error_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _i = 0, _a = __spreadArray([], this.accounts, true);
                        _b.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 6];
                        account = _a[_i];
                        _b.label = 2;
                    case 2:
                        _b.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.check(account.id, usage)];
                    case 3:
                        _b.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        error_2 = _b.sent();
                        this.deps.log("checking account ".concat(account.id, " failed: ").concat(String(error_2)));
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /** Re-reads one login, one check at a time per login: a fresh check waiting on a running one goes again after it. */
    Coordinator.prototype.check = function (id, usage) {
        return __awaiter(this, void 0, void 0, function () {
            var running, run;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        running = this.inflight.get(id);
                        if (!(running !== undefined)) return [3 /*break*/, 2];
                        return [4 /*yield*/, running];
                    case 1:
                        _a.sent();
                        if (usage === 'poll' || !this.wantsUsage(id, 'fresh', this.deps.now()))
                            return [2 /*return*/];
                        _a.label = 2;
                    case 2:
                        run = this.runCheck(id, usage).finally(function () { return _this.inflight.delete(id); });
                        this.inflight.set(id, run);
                        return [4 /*yield*/, run];
                    case 3:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Coordinator.prototype.wantsUsage = function (id, usage, now) {
        var _a, _b, _c, _d, _e;
        var most = usage === 'fresh' ? exports.FRESH_MS : exports.POLL_MS;
        var readAt = (_b = (_a = this.readings[id]) === null || _a === void 0 ? void 0 : _a.at) !== null && _b !== void 0 ? _b : 0;
        var askedAt = (_c = this.usageAt[id]) !== null && _c !== void 0 ? _c : 0;
        if (now < ((_e = (_d = this.backoff[id]) === null || _d === void 0 ? void 0 : _d.until) !== null && _e !== void 0 ? _e : 0))
            return false;
        return now - readAt >= most && now - askedAt >= most;
    };
    /**
     * Re-reads one login's stored sign-in: who it belongs to and, while its token
     * is live, its usage when the last reading is old enough. One that is another
     * login's on the list leaves this login needing its own.
     */
    Coordinator.prototype.runCheck = function (id, usage) {
        return __awaiter(this, void 0, void 0, function () {
            var account, now, stored, credential, health, isLive, holder, twin, answer, delay, reading;
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        account = this.find(id);
                        if (account === undefined || ((_a = this.health[id]) === null || _a === void 0 ? void 0 : _a.kind) === 'logging-in')
                            return [2 /*return*/];
                        now = this.deps.now();
                        return [4 /*yield*/, this.deps.readStored(account.slot)];
                    case 1:
                        stored = _e.sent();
                        if (this.find(id) === undefined)
                            return [2 /*return*/];
                        if (stored.state === 'unreadable') {
                            if (!this.unreadable.has(id)) {
                                this.unreadable.add(id);
                                this.addNotice("Could not read Claude account ".concat(id, "'s sign-in from the keychain (exit ").concat(stored.code, "); is it locked?"), false, id);
                            }
                            return [2 /*return*/];
                        }
                        this.unreadable.delete(id);
                        credential = stored.state === 'present' ? stored.credential : undefined;
                        this.setExpiry(id, credential === null || credential === void 0 ? void 0 : credential.expiresAt);
                        health = (0, model_ts_1.healthOf)(credential, now);
                        if (!(health.kind === 'ok' && credential !== undefined)) return [3 /*break*/, 5];
                        isLive = credential.expiresAt > now + 60000;
                        return [4 /*yield*/, this.holderOf(account, credential, isLive)];
                    case 2:
                        holder = _e.sent();
                        twin = holder === undefined ? undefined : this.followSignIn(id, holder.who);
                        if (!(twin !== undefined)) return [3 /*break*/, 3];
                        health = { kind: 'login-needed', why: "signed in as account ".concat(twin.id, " now") };
                        return [3 /*break*/, 5];
                    case 3:
                        if (!(isLive && this.wantsUsage(id, usage, now))) return [3 /*break*/, 5];
                        this.usageAt[id] = now;
                        return [4 /*yield*/, this.deps.fetchUsage(credential.accessToken)];
                    case 4:
                        answer = _e.sent();
                        if (answer.kind === 'rejected')
                            health = { kind: 'login-needed', why: 'sign-in rejected' };
                        if (answer.kind === 'failed') {
                            delay = Math.max((_b = answer.retryAfterMs) !== null && _b !== void 0 ? _b : 0, Math.min(exports.MAX_BACKOFF_MS, ((_d = (_c = this.backoff[id]) === null || _c === void 0 ? void 0 : _c.delay) !== null && _d !== void 0 ? _d : exports.BACKOFF_MS / 2) * 2));
                            this.backoff[id] = { until: now + delay, delay: delay };
                            this.deps.log("usage for account ".concat(id, ": HTTP ").concat(answer.status, "; next try in ").concat(Math.round(delay / 1000), " s"));
                        }
                        else
                            delete this.backoff[id];
                        if (answer.kind === 'ok') {
                            reading = (0, model_ts_1.readingFromUsage)(answer.body, this.deps.now());
                            if (reading !== undefined && this.find(id) !== undefined)
                                this.putReading(id, reading);
                        }
                        _e.label = 5;
                    case 5:
                        if (this.find(id) === undefined || this.healthKind(id) === 'logging-in')
                            return [2 /*return*/];
                        this.setHealth(id, health);
                        return [2 /*return*/];
                }
            });
        });
    };
    /** Read fresh: a check's awaits let a sign-in start meanwhile. */
    Coordinator.prototype.healthKind = function (id) {
        var _a;
        return (_a = this.health[id]) === null || _a === void 0 ? void 0 : _a.kind;
    };
    Coordinator.prototype.setExpiry = function (id, expiresAt) {
        if (this.expiresAt[id] === expiresAt)
            return;
        var next = __assign({}, this.expiresAt);
        if (expiresAt === undefined)
            delete next[id];
        else
            next[id] = expiresAt;
        this.expiresAt = next;
        this.changed();
    };
    /**
     * Who a login's sign-in belongs to: as answered for its token before, else
     * asked while the token is live. A /login in a session on a login signs in
     * there, and a new sign-in brings a new token, so it is asked about again.
     */
    Coordinator.prototype.holderOf = function (account, credential, isLive) {
        return __awaiter(this, void 0, void 0, function () {
            var token, known, who, _a, holder;
            var _b;
            var _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, (0, model_ts_1.fingerprint)((_c = credential.refreshToken) !== null && _c !== void 0 ? _c : credential.accessToken)];
                    case 1:
                        token = _d.sent();
                        known = this.holders[account.id];
                        if ((known === null || known === void 0 ? void 0 : known.token) === token)
                            return [2 /*return*/, known];
                        if (!isLive)
                            return [2 /*return*/, undefined];
                        _a = model_ts_1.identityFromProfile;
                        return [4 /*yield*/, this.deps.fetchProfile(credential.accessToken)];
                    case 2:
                        who = _a.apply(void 0, [_d.sent()]);
                        if ((who === null || who === void 0 ? void 0 : who.email) === undefined || this.find(account.id) === undefined)
                            return [2 /*return*/, undefined];
                        holder = { token: token, who: __assign(__assign(__assign({}, who), { email: who.email }), (credential.plan === undefined ? {} : { plan: credential.plan })) };
                        this.holders = __assign(__assign({}, this.holders), (_b = {}, _b[account.id] = holder, _b));
                        this.changed();
                        return [2 /*return*/, holder];
                }
            });
        });
    };
    /**
     * A login's sign-in belongs to `who`. Another login on the list: this one
     * holds that one's sign-in, answered so it asks for its own again. Else the
     * login is who signed in, its name and plan kept current, and told when that
     * is another account than before: a /login in a session on it did that.
     */
    Coordinator.prototype.followSignIn = function (id, who) {
        var own = this.find(id);
        if (own === undefined)
            return undefined;
        var isSame = own.email === undefined || (0, model_ts_1.isLoginOf)(own, who);
        var twin = isSame ? undefined : this.accounts.find(function (a) { return a.id !== own.id && (0, model_ts_1.isLoginOf)(a, who); });
        if (twin !== undefined)
            return twin;
        var followed = __assign(__assign({}, own), who);
        this.updateAccount(id, who);
        if (!isSame) {
            var name_2 = "".concat(followed.email).concat(followed.orgName ? " \u00B7 ".concat(followed.orgName) : '');
            this.addNotice(own.slot === ''
                ? "Claude Code's login, account ".concat(own.id, ", is ").concat(name_2, " now: new sessions start on it.")
                : "Claude account ".concat(own.id, " is ").concat(name_2, " now: a /login in a session on account ").concat(own.id, " signs in there, not Claude Code's login."), false, id);
        }
        return undefined;
    };
    /** A turn hit the usage limit on a login: read it now, and where the usage doesn't show it yet, count the window that limits it full; a session on a model with its own week (`scope`) counts that week. */
    Coordinator.prototype.spent = function (id, scope) {
        return __awaiter(this, void 0, void 0, function () {
            var now, r;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.need(id);
                        return [4 /*yield*/, this.check(id, 'fresh')];
                    case 1:
                        _b.sent();
                        now = this.deps.now();
                        r = this.readings[id];
                        if (((_a = this.health[id]) === null || _a === void 0 ? void 0 : _a.kind) === 'login-needed' || (0, model_ts_1.isSpent)(r, now, scope))
                            return [2 /*return*/];
                        this.putReading(id, (0, model_ts_1.spentReading)(r, now, scope));
                        return [2 /*return*/];
                }
            });
        });
    };
    /** A turn's sign-in was rejected on a login. */
    Coordinator.prototype.rejected = function (id) {
        this.need(id);
        this.setHealth(id, { kind: 'login-needed', why: 'sign-in rejected' });
    };
    /** A response's own usage, as a session on the login saw it. */
    Coordinator.prototype.report = function (id, reading) {
        var _a;
        this.need(id);
        if (((_a = this.health[id]) === null || _a === void 0 ? void 0 : _a.kind) === 'logging-in')
            return;
        this.putReading(id, reading);
    };
    // ------------------------------------------------------------ sessions
    Coordinator.prototype.register = function (input) {
        var _this = this;
        var _a, _b;
        var account = this.accounts.find(function (a) { return a.slot === input.slot; });
        if (account === undefined) {
            // Started on a slot nobody registered (set by hand, or by another tool): adopt it.
            account = { id: (0, model_ts_1.freeId)(this.accounts), slot: input.slot };
            this.accounts = __spreadArray(__spreadArray([], this.accounts, true), [account], false);
            void this.check(account.id, 'fresh').catch(function (error) { return _this.deps.log("checking account ".concat(account === null || account === void 0 ? void 0 : account.id, " failed: ").concat(String(error))); });
        }
        var now = this.deps.now();
        var before = this.sessions.get(input.id);
        this.sessions.set(input.id, __assign(__assign(__assign({ id: input.id, accountId: account.id }, (input.pid === undefined ? {} : { pid: input.pid })), (input.cwd === undefined ? {} : { cwd: input.cwd })), { isInteractive: input.isInteractive, isBlocked: (_a = before === null || before === void 0 ? void 0 : before.isBlocked) !== null && _a !== void 0 ? _a : false, isPending: false, since: (_b = before === null || before === void 0 ? void 0 : before.since) !== null && _b !== void 0 ? _b : now, lastSeen: now }));
        this.changed();
        return account.id;
    };
    Coordinator.prototype.patchSession = function (id, patch) {
        var session = this.sessions.get(id);
        if (session === undefined)
            throw new HttpError(404, "No session ".concat(id, ": register it again."));
        if (patch.accountId !== undefined)
            this.need(patch.accountId);
        var next = __assign(__assign(__assign({}, session), patch), { lastSeen: this.deps.now() });
        this.sessions.set(id, next);
        if (JSON.stringify(__assign(__assign({}, session), { lastSeen: 0 })) !== JSON.stringify(__assign(__assign({}, next), { lastSeen: 0 }))) {
            this.changed();
            void this.finishRetirements();
        }
    };
    Coordinator.prototype.dropSession = function (id) {
        if (!this.sessions.delete(id))
            return;
        this.changed();
        void this.finishRetirements();
    };
    /** A request from a session: it lives. */
    Coordinator.prototype.seen = function (id) {
        var session = this.sessions.get(id);
        if (session !== undefined)
            session.lastSeen = this.deps.now();
    };
    Coordinator.prototype.pollOpened = function (id) {
        var _a;
        this.openPolls.set(id, ((_a = this.openPolls.get(id)) !== null && _a !== void 0 ? _a : 0) + 1);
        this.seen(id);
    };
    Coordinator.prototype.pollClosed = function (id) {
        var _a;
        var open = ((_a = this.openPolls.get(id)) !== null && _a !== void 0 ? _a : 1) - 1;
        if (open <= 0)
            this.openPolls.delete(id);
        else
            this.openPolls.set(id, open);
        this.seen(id);
    };
    /** Drops sessions whose process has ended; one whose process can't be checked, once it has gone quiet. */
    Coordinator.prototype.prune = function () {
        var _a;
        var now = this.deps.now();
        var isChanged = false;
        for (var _i = 0, _b = this.liveSessions(); _i < _b.length; _i++) {
            var session = _b[_i];
            var isQuiet = ((_a = this.openPolls.get(session.id)) !== null && _a !== void 0 ? _a : 0) === 0 && now - session.lastSeen > exports.STALE_SESSION_MS;
            var isDead = session.pid === undefined ? isQuiet : !this.deps.isAlive(session.pid);
            if (isDead) {
                this.sessions.delete(session.id);
                this.openPolls.delete(session.id);
                isChanged = true;
            }
        }
        if (isChanged)
            this.changed();
    };
    // ------------------------------------------------------------ accounts
    /** Adds a login in a new slot under ~/.claude/accounts and signs it in. */
    Coordinator.prototype.add = function () {
        return __awaiter(this, void 0, void 0, function () {
            var id, slot;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        id = (0, model_ts_1.freeId)(this.accounts);
                        return [4 /*yield*/, this.deps.makeSlot(id)];
                    case 1:
                        slot = _b.sent();
                        this.accounts = __spreadArray(__spreadArray([], this.accounts, true), [{ id: id, slot: slot }], false);
                        this.health = __assign(__assign({}, this.health), (_a = {}, _a[id] = { kind: 'login-needed', why: 'not signed in yet' }, _a));
                        this.changed();
                        this.queueSignIn([id]);
                        return [2 /*return*/, id];
                }
            });
        });
    };
    /** Removes a login: sessions on it move off first, then it is signed out and dropped. */
    Coordinator.prototype.remove = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var account, count, view, target;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        account = this.need(id);
                        if (account.slot === '')
                            throw new HttpError(400, "Claude Code's own login can't be removed; sign it in to another account with /login instead.");
                        count = this.sessionCount(id);
                        if (count > 0) {
                            view = this.view(id);
                            target = (0, model_ts_1.pickTarget)(__assign(__assign({}, view), { retiring: __spreadArray(__spreadArray([], this.retiring, true), [id], false) }), this.deps.now());
                            if (target === undefined) {
                                throw new HttpError(409, "Claude account ".concat(id, " is in use by ").concat(count, " session").concat(count === 1 ? '' : 's', " and no other account can take over yet; not removed."));
                            }
                        }
                        this.retiring.add(id);
                        this.changed();
                        return [4 /*yield*/, this.finishRetirements()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Coordinator.prototype.finishRetirements = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _loop_1, this_1, _i, _a, id;
            var _this = this;
            var _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _loop_1 = function (id) {
                            var account, drop;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        if (this_1.sessionCount(id) > 0)
                                            return [2 /*return*/, "continue"];
                                        this_1.retiring.delete(id);
                                        account = this_1.find(id);
                                        if (account === undefined)
                                            return [2 /*return*/, "continue"];
                                        if (((_b = this_1.signing) === null || _b === void 0 ? void 0 : _b.accountId) === id)
                                            this_1.signing.run.cancel();
                                        this_1.signQueue = this_1.signQueue.filter(function (x) { return x !== id; });
                                        return [4 /*yield*/, this_1.deps.signOut(account.slot).catch(function (error) { return _this.deps.log("signing out account ".concat(id, " failed: ").concat(String(error))); })];
                                    case 1:
                                        _d.sent();
                                        this_1.accounts = this_1.accounts.filter(function (a) { return a.id !== id; });
                                        drop = function (record) { return Object.fromEntries(Object.entries(record).filter(function (_a) {
                                            var k = _a[0];
                                            return k !== id;
                                        })); };
                                        this_1.readings = drop(this_1.readings);
                                        this_1.health = drop(this_1.health);
                                        this_1.holders = drop(this_1.holders);
                                        this_1.expiresAt = drop(this_1.expiresAt);
                                        this_1.chrome = __assign(__assign(__assign({}, (this_1.chrome.accountId === id || this_1.chrome.accountId === undefined ? {} : { accountId: this_1.chrome.accountId })), { accountIds: this_1.chrome.accountIds.filter(function (x) { return x !== id; }) }), (this_1.chrome.miss === undefined || this_1.chrome.miss === id ? {} : { miss: this_1.chrome.miss }));
                                        this_1.addNotice("Removed Claude account ".concat((0, model_ts_1.label)(account), "."), false);
                                        return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _i = 0, _a = __spreadArray([], this.retiring, true);
                        _c.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        id = _a[_i];
                        return [5 /*yield**/, _loop_1(id)];
                    case 2:
                        _c.sent();
                        _c.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    // ------------------------------------------------------------ sign-in
    /** Signs one login in, or every login that needs it, one after another. */
    Coordinator.prototype.signIn = function (id) {
        var _this = this;
        if (id !== undefined) {
            this.need(id);
            this.queueSignIn([id]);
            return;
        }
        this.queueSignIn(this.accounts.filter(function (a) { var _a; return ((_a = _this.health[a.id]) === null || _a === void 0 ? void 0 : _a.kind) === 'login-needed'; }).map(function (a) { return a.id; }));
    };
    Coordinator.prototype.cancelSignIn = function () {
        var _a;
        this.signQueue = [];
        (_a = this.signing) === null || _a === void 0 ? void 0 : _a.run.cancel();
    };
    Coordinator.prototype.queueSignIn = function (ids) {
        var _a;
        for (var _i = 0, ids_1 = ids; _i < ids_1.length; _i++) {
            var id = ids_1[_i];
            if (((_a = this.signing) === null || _a === void 0 ? void 0 : _a.accountId) !== id && !this.signQueue.includes(id))
                this.signQueue.push(id);
        }
        this.pump();
    };
    Coordinator.prototype.pump = function () {
        var _a;
        var _this = this;
        if (this.signing !== undefined)
            return;
        var id = this.signQueue.shift();
        if (id === undefined)
            return;
        var account = this.find(id);
        if (account === undefined)
            return this.pump();
        var since = this.deps.now();
        // The child opens the browser itself; its paste-a-code link goes unread.
        var run = this.deps.signIn(account.slot, account.email);
        this.signing = { accountId: id, since: since, run: run };
        this.health = __assign(__assign({}, this.health), (_a = {}, _a[id] = { kind: 'logging-in', since: since }, _a));
        this.changed();
        void run.done
            .catch(function (error) { return ({ code: null, errors: String(error) }); })
            .then(function (_a) { return __awaiter(_this, [_a], void 0, function (_b) {
            var _c;
            var code = _b.code, errors = _b.errors;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        this.signing = undefined;
                        if (!(this.find(id) !== undefined)) return [3 /*break*/, 3];
                        this.health = __assign(__assign({}, this.health), (_c = {}, _c[id] = { kind: 'login-needed', why: 'sign-in not finished' }, _c));
                        this.changed();
                        if (!(code !== 0)) return [3 /*break*/, 1];
                        this.addNotice("Sign-in for Claude account ".concat(id, " did not finish").concat(errors.trim() ? ": ".concat(errors.trim().slice(0, 160)) : '.'), false, id);
                        return [3 /*break*/, 3];
                    case 1: return [4 /*yield*/, this.adoptSignIn(id)];
                    case 2:
                        _d.sent();
                        _d.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        }); })
            .catch(function (error) { return _this.deps.log("sign-in of account ".concat(id, " failed: ").concat(String(error))); })
            .finally(function () { return _this.pump(); });
    };
    /** After a browser sign-in: who signed in, and is it a login already on the list? */
    Coordinator.prototype.adoptSignIn = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var account, who, twin;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        account = this.find(id);
                        if (account === undefined)
                            return [2 /*return*/];
                        return [4 /*yield*/, this.deps.authStatus(account.slot).catch(function () { return undefined; })];
                    case 1:
                        who = _a.sent();
                        twin = who === undefined ? undefined : this.accounts.find(function (a) { return a.id !== id && (0, model_ts_1.sameLogin)(a, who); });
                        if (twin !== undefined) {
                            this.setHealth(id, { kind: 'login-needed', why: "that was account ".concat((0, model_ts_1.label)(twin), " again") });
                            this.addNotice("Claude account ".concat(id, " signed in as account ").concat((0, model_ts_1.label)(twin), ". Sign out of claude.ai in your browser (or pick another organization), then sign in again."), false, id);
                            return [2 /*return*/];
                        }
                        if (who !== undefined)
                            this.updateAccount(id, who);
                        this.setHealth(id, { kind: 'ok' });
                        return [4 /*yield*/, this.check(id, 'fresh')];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    // ------------------------------------------------------------ settings, Chrome, notices
    Coordinator.prototype.patchSettings = function (patch) {
        if (patch.rotateTo !== undefined) {
            if (typeof patch.rotateTo !== 'string' || !model_ts_1.ROTATE_TOS.includes(patch.rotateTo)) {
                throw new HttpError(400, "rotateTo is one of ".concat(model_ts_1.ROTATE_TOS.join(', '), "."));
            }
            this.settings = __assign(__assign({}, this.settings), { rotateTo: patch.rotateTo });
        }
        if (patch.footer !== undefined) {
            if (!isObject(patch.footer))
                throw new HttpError(400, 'footer is an object.');
            this.settings = __assign(__assign({}, this.settings), { footer: (0, model_ts_1.footerStyleFrom)(__assign(__assign({}, this.settings.footer), patch.footer)) });
        }
        this.changed();
    };
    Coordinator.prototype.patchChrome = function (patch) {
        var next = __assign({}, this.chrome);
        if (patch.accountId === null)
            delete next.accountId;
        else if (typeof patch.accountId === 'string')
            next.accountId = this.need(patch.accountId).id;
        if (isObject(patch.seen) && typeof patch.seen.accountId === 'string' && typeof patch.seen.isSeen === 'boolean') {
            var id_1 = patch.seen.accountId;
            next.accountIds = patch.seen.isSeen ? __spreadArray([], new Set(__spreadArray(__spreadArray([], next.accountIds, true), [this.need(id_1).id], false)), true) : next.accountIds.filter(function (x) { return x !== id_1; });
        }
        if (patch.miss === null)
            delete next.miss;
        else if (typeof patch.miss === 'string')
            next.miss = patch.miss;
        if (JSON.stringify(next) === JSON.stringify(this.chrome))
            return;
        this.chrome = next;
        this.changed();
    };
    Coordinator.prototype.claim = function (noticeId, sessionId) {
        var notice = this.notices.find(function (n) { return n.id === noticeId; });
        if (notice === undefined || !notice.notify || this.claims.has(noticeId))
            return false;
        this.claims.set(noticeId, sessionId);
        return true;
    };
    // ------------------------------------------------------------ the API
    /** Answers one request, as docs/coordinator-api.md says. */
    Coordinator.prototype.handle = function (req) {
        return __awaiter(this, void 0, void 0, function () {
            var error_3;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.route(req)];
                    case 1: return [2 /*return*/, _b.sent()];
                    case 2:
                        error_3 = _b.sent();
                        if (error_3 instanceof HttpError)
                            return [2 /*return*/, { status: error_3.status, body: { error: error_3.message } }];
                        this.deps.log("".concat(req.method, " ").concat(req.path, " failed: ").concat(error_3 instanceof Error ? ((_a = error_3.stack) !== null && _a !== void 0 ? _a : error_3.message) : String(error_3)));
                        return [2 /*return*/, { status: 500, body: { error: String(error_3) } }];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    Coordinator.prototype.route = function (_a) {
        return __awaiter(this, arguments, void 0, function (_b) {
            var b, ok, parts, sessionId, route, id, _c, since, accountId, reading, _d;
            var _e;
            var _this = this;
            var _f, _g;
            var method = _b.method, path = _b.path, query = _b.query, body = _b.body;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        b = isObject(body) ? body : {};
                        ok = function (extra) {
                            if (extra === void 0) { extra = {}; }
                            return ({ status: 200, body: __assign(__assign({}, extra), { state: _this.state() }) });
                        };
                        try {
                            // Ids arrive percent-encoded: a session's holds a colon.
                            parts = path.split('/').filter(Boolean).map(decodeURIComponent);
                        }
                        catch (_j) {
                            throw new HttpError(400, "".concat(path, " is not a valid path."));
                        }
                        sessionId = typeof b.sessionId === 'string' ? b.sessionId : query.session;
                        if (sessionId !== undefined)
                            this.seen(sessionId);
                        route = "".concat(method, " /").concat(parts.map(function (p, i) { return (i === 1 && (parts[0] === 'accounts' || parts[0] === 'sessions' || parts[0] === 'notices') ? ':id' : p); }).join('/'));
                        id = (_f = parts[1]) !== null && _f !== void 0 ? _f : '';
                        _c = route;
                        switch (_c) {
                            case 'GET /hello': return [3 /*break*/, 1];
                            case 'GET /state': return [3 /*break*/, 2];
                            case 'POST /sessions': return [3 /*break*/, 5];
                            case 'PATCH /sessions/:id': return [3 /*break*/, 6];
                            case 'DELETE /sessions/:id': return [3 /*break*/, 7];
                            case 'POST /readings': return [3 /*break*/, 8];
                            case 'POST /accounts/:id/spent': return [3 /*break*/, 9];
                            case 'POST /accounts/:id/rejected': return [3 /*break*/, 11];
                            case 'POST /accounts/:id/check': return [3 /*break*/, 12];
                            case 'POST /check': return [3 /*break*/, 14];
                            case 'POST /accounts': return [3 /*break*/, 16];
                            case 'POST /accounts/:id/remove': return [3 /*break*/, 18];
                            case 'POST /signin': return [3 /*break*/, 20];
                            case 'POST /signin/cancel': return [3 /*break*/, 21];
                            case 'PATCH /settings': return [3 /*break*/, 22];
                            case 'PATCH /chrome': return [3 /*break*/, 23];
                            case 'POST /notices/:id/claim': return [3 /*break*/, 24];
                            case 'POST /shutdown': return [3 /*break*/, 25];
                        }
                        return [3 /*break*/, 26];
                    case 1: return [2 /*return*/, { status: 200, body: __assign({ name: 'claude-account-rotator' }, this.info) }];
                    case 2:
                        since = Number(query.since);
                        if (!(query.since !== undefined && Number.isFinite(since))) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.waitForChange(since, Number((_g = query.wait) !== null && _g !== void 0 ? _g : 0) || 0)];
                    case 3:
                        _h.sent();
                        _h.label = 4;
                    case 4: return [2 /*return*/, { status: 200, body: this.state() }];
                    case 5:
                        {
                            if (typeof b.id !== 'string' || b.id === '' || typeof b.slot !== 'string')
                                throw new HttpError(400, 'A session needs an id and a slot.');
                            accountId = this.register(__assign(__assign({ id: b.id, slot: b.slot, isInteractive: b.isInteractive === true }, (typeof b.pid === 'number' ? { pid: b.pid } : {})), (typeof b.cwd === 'string' ? { cwd: b.cwd } : {})));
                            return [2 /*return*/, ok({ accountId: accountId })];
                        }
                        _h.label = 6;
                    case 6:
                        this.patchSession(id, __assign(__assign(__assign({}, (typeof b.accountId === 'string' ? { accountId: b.accountId } : {})), (typeof b.isBlocked === 'boolean' ? { isBlocked: b.isBlocked } : {})), (typeof b.isPending === 'boolean' ? { isPending: b.isPending } : {})));
                        return [2 /*return*/, ok()];
                    case 7:
                        this.dropSession(id);
                        return [2 /*return*/, { status: 200, body: { ok: true } }];
                    case 8:
                        {
                            reading = readingFrom(b.reading);
                            if (typeof b.accountId !== 'string' || reading === undefined)
                                throw new HttpError(400, 'A reading needs an accountId and a reading.');
                            this.report(b.accountId, reading);
                            return [2 /*return*/, ok()];
                        }
                        _h.label = 9;
                    case 9: return [4 /*yield*/, this.spent(id, typeof b.model === 'string' && b.model !== '' ? b.model : undefined)];
                    case 10:
                        _h.sent();
                        return [2 /*return*/, ok()];
                    case 11:
                        this.rejected(id);
                        return [2 /*return*/, ok()];
                    case 12:
                        this.need(id);
                        return [4 /*yield*/, this.check(id, b.fresh === true ? 'fresh' : 'poll')];
                    case 13:
                        _h.sent();
                        return [2 /*return*/, ok()];
                    case 14: return [4 /*yield*/, this.checkAll('fresh')];
                    case 15:
                        _h.sent();
                        return [2 /*return*/, ok()];
                    case 16:
                        _d = ok;
                        _e = {};
                        return [4 /*yield*/, this.add()];
                    case 17: return [2 /*return*/, _d.apply(void 0, [(_e.accountId = _h.sent(), _e)])];
                    case 18: return [4 /*yield*/, this.remove(id)];
                    case 19:
                        _h.sent();
                        return [2 /*return*/, ok()];
                    case 20:
                        this.signIn(typeof b.accountId === 'string' ? b.accountId : undefined);
                        return [2 /*return*/, ok()];
                    case 21:
                        this.cancelSignIn();
                        return [2 /*return*/, ok()];
                    case 22:
                        this.patchSettings(b);
                        return [2 /*return*/, ok()];
                    case 23:
                        this.patchChrome(b);
                        return [2 /*return*/, ok()];
                    case 24:
                        if (typeof b.sessionId !== 'string')
                            throw new HttpError(400, 'A claim needs a sessionId.');
                        return [2 /*return*/, { status: 200, body: { claimed: this.claim(Number(id), b.sessionId) } }];
                    case 25: return [2 /*return*/, { status: 200, body: { ok: true }, shutdown: true }];
                    case 26: throw new HttpError(404, "No ".concat(method, " ").concat(path, "."));
                }
            });
        });
    };
    return Coordinator;
}());
exports.Coordinator = Coordinator;
