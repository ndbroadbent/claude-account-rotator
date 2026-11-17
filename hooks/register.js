"use strict";
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
exports.register = void 0;
var claude_code_1 = require("claude-code");
var version_1 = require("../coordinator/version");
var model_1 = require("./model");
var view_1 = require("./view");
var work_1 = require("./work");
var PANE = 'claude-accounts';
var TITLE = 'Claude accounts';
/** The dock width the pane asks for: a login's line, its buttons and its usage rows fit on one line each. */
var PANE_COLUMNS = 64;
/** Claude Code caches a keychain read for 30 s, so a switch lands within this. */
var SETTLE_MS = 35000;
/** A switch no response has shown after this long is reported as not taken. */
var CONFIRM_GIVE_UP_MS = 4 * 60000;
/** From this percent of a model's own week, a response asks for fresh usage: the poll every 5 minutes could miss the 98% mark. */
var WATCH_MODEL_FROM = 80;
/** How often a session asks for its model week afresh, at most. */
var MODEL_FRESH_MS = 60000;
/** When this session last asked for its model week afresh. */
var modelCheckedAt = -Infinity;
/**
 * Claude Code refreshes a token 5 minutes before it expires. A refresh that
 * runs while the old login's read is still cached is saved under the new
 * slot, overwriting that login: so no switch this close to the expiry.
 */
var REFRESH_GUARD_MS = 8 * 60000;
/** How long the mod waits on Claude in Chrome to list its browsers, connecting first, before going on without. */
var CHROME_WAIT_MS = 15000;
/** How long a long poll on the coordinator waits for a change: under the 30 s Claude Code gives a `$.http.fetch` before it aborts. */
var WAIT_MS = 25000;
/** A response's usage goes to the coordinator when it moved by this many points, or this long after the last. */
var REPORT_POINTS = 1;
var REPORT_EVERY_MS = 60000;
var CONTINUE = 'Claude Code switched to another of your Claude accounts because the previous one hit its usage limit or lost its sign-in. Continue where you left off.';
var viewAtom = (0, claude_code_1.atom)({ plugin: 'account-rotator', key: 'view' }, model_1.EMPTY_VIEW);
/**
 * Whether this session's pane shows. A press opens or closes it in its own
 * turn, with no read before: the engine counts an open as the person's only
 * there, and places it at any width; one made after an await waits undrawn
 * below 144 columns. Kept in step with closes by the person and with reloads.
 */
var isPaneShown = false;
/** A switch the refresh guard holds back: the latest one asked for, tried again each minute until it goes. */
var held;
/** Logins a switch to did not take this session: the rotation leaves them be; Use now still tries. */
var untaken = new Set();
/** When this session last moved to another login: until SETTLE_MS after, its requests may still go out as the one before. */
var movedAt;
/**
 * The turns under way in this session, its subagents' too. A switch waits for a
 * response to confirm it, and while one of these runs that response may be on
 * its way: the rotation leaves the switch be. An idle session's switch can
 * wait for days; with none running, the rotation may move it on again.
 */
var turns = new Set();
/** Connect is under way: the rotation waits for it, and browser calls are held back. */
var isConnectingChrome = false;
/** This session as the coordinator knows it: its id there, and the details it registers with. */
var session;
/** The state version this session last read, and the notices it has shown. */
var version = 0;
var lastNotice;
/** Claude Code's login, guessed for the Chrome extension, found no browser: not guessed again. */
var chromeMiss;
/** The last reading reported, so a busy session doesn't report every response. */
var reported;
// ---------------------------------------------------------------- the view
/** The view survives a hot reload as the code before wrote it: what this code added starts as in a new session. */
var current = function (v) { return (__assign(__assign({}, model_1.EMPTY_VIEW), v)); };
var getView = function ($) { return __awaiter(void 0, void 0, void 0, function () { var _a; return __generator(this, function (_b) {
    switch (_b.label) {
        case 0:
            _a = current;
            return [4 /*yield*/, (0, claude_code_1.read)($, viewAtom)];
        case 1: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
    }
}); }); };
var setView = function ($, fn) { return (0, claude_code_1.update)($, viewAtom, function (v) { return fn(current(v)); }); };
/** Something the person should know that nothing on screen says: a toast, on screen for a while. */
var tell = function ($, text) { return $.ui.toast(text, { timeoutMs: 8000 }); };
var debug = function ($, text) { return $.ui.log("account-rotator: ".concat(text), { to: 'debug' }); };
// ---------------------------------------------------------------- the coordinator
var CoordinatorError = /** @class */ (function (_super) {
    __extends(CoordinatorError, _super);
    function CoordinatorError(status, message) {
        var _this = _super.call(this, message) || this;
        _this.status = status;
        return _this;
    }
    return CoordinatorError;
}(Error));
function socketPath($) {
    return __awaiter(this, void 0, void 0, function () {
        var dir, _a, _b;
        var _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, $.env.get('CLAUDE_ACCOUNT_ROTATOR_DIR')];
                case 1:
                    if (!((_c = (_e.sent())) !== null && _c !== void 0)) return [3 /*break*/, 2];
                    _a = _c;
                    return [3 /*break*/, 4];
                case 2:
                    _b = "".concat;
                    return [4 /*yield*/, $.env.get('HOME')];
                case 3:
                    _a = _b.apply("", [(_d = (_e.sent())) !== null && _d !== void 0 ? _d : '', "/.claude/account-rotator"]);
                    _e.label = 4;
                case 4:
                    dir = _a;
                    return [2 /*return*/, "".concat(dir, "/coordinator.sock")];
            }
        });
    });
}
/** One call to the coordinator: its JSON answer, or a CoordinatorError with its words. */
function api($, method, path, body) {
    return __awaiter(this, void 0, void 0, function () {
        var res, _a, _b, _c, parsed, error;
        var _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _b = (_a = $.http).fetch;
                    _c = ["http://coordinator".concat(path)];
                    _d = { method: method };
                    return [4 /*yield*/, socketPath($)];
                case 1: return [4 /*yield*/, _b.apply(_a, _c.concat([__assign.apply(void 0, [(_d.socketPath = _e.sent(), _d.headers = { 'content-type': 'application/json' }, _d), (body === undefined ? {} : { body: JSON.stringify(body) })])]))];
                case 2:
                    res = _e.sent();
                    try {
                        parsed = res.text === '' ? undefined : JSON.parse(res.text);
                    }
                    catch (_f) {
                        // An answer that is not JSON is the coordinator failing; the status says so below.
                        parsed = undefined;
                    }
                    if (!res.ok) {
                        error = typeof parsed === 'object' && parsed !== null ? parsed.error : undefined;
                        throw new CoordinatorError(res.status, typeof error === 'string' ? error : "the coordinator answered HTTP ".concat(res.status));
                    }
                    return [2 /*return*/, parsed];
            }
        });
    });
}
/** Calls the coordinator and takes the state it answers with. */
function act($, method, path, body) {
    return __awaiter(this, void 0, void 0, function () {
        var answer;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, api($, method, path, body)];
                case 1:
                    answer = _a.sent();
                    return [4 /*yield*/, applyState($, answer.state)];
                case 2:
                    _a.sent();
                    return [2 /*return*/, answer.state];
            }
        });
    });
}
/**
 * Makes sure a coordinator this version or newer runs: starts one where none
 * answers (launchd's, where it is installed), and upgrades an older one.
 */
function ensureCoordinator($) {
    return __awaiter(this, void 0, void 0, function () {
        var hello, verb, result, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, api($, 'GET', '/hello').catch(function () { return undefined; })];
                case 1:
                    hello = _a.sent();
                    if (hello !== undefined && (0, version_1.compareVersions)(hello.version, version_1.VERSION) >= 0)
                        return [2 /*return*/];
                    verb = hello === undefined ? 'start' : 'upgrade';
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, $.process.run(['node', "".concat($.plugin.root, "/coordinator/cli.ts"), verb], { timeoutMs: 90000 })];
                case 3:
                    result = _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    throw new Error("could not run node to start the account coordinator (it needs Node.js 22.18 or later on PATH): ".concat(String(error_1)));
                case 5:
                    if (result.exitCode !== 0)
                        throw new Error((result.stderr.trim() || result.stdout.trim() || "coordinator ".concat(verb, " failed")).slice(0, 300));
                    return [2 /*return*/];
            }
        });
    });
}
function registerSession($) {
    return __awaiter(this, void 0, void 0, function () {
        var answer, view;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (session === undefined)
                        return [2 /*return*/];
                    return [4 /*yield*/, api($, 'POST', '/sessions', __assign(__assign({ id: session.key, slot: session.slot, isInteractive: session.isInteractive }, (session.pid === undefined ? {} : { pid: session.pid })), (session.cwd === undefined ? {} : { cwd: session.cwd })))];
                case 1:
                    answer = _a.sent();
                    return [4 /*yield*/, applyState($, answer.state, answer.accountId)];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, getView($)
                        // A coordinator that restarted learns again what it can't tell from the slot.
                    ];
                case 3:
                    view = _a.sent();
                    if (!(view.isSwitchBlocked || view.pending !== undefined)) return [3 /*break*/, 5];
                    return [4 /*yield*/, patchSession($, { isBlocked: view.isSwitchBlocked === true, isPending: view.pending !== undefined }, false)];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5: return [2 /*return*/];
            }
        });
    });
}
/** Tells the coordinator what changed in this session; one that no longer knows it (it restarted) gets it registered again, once. */
function patchSession($, patch, canRegister) {
    var _this = this;
    if (canRegister === void 0) { canRegister = true; }
    if (session === undefined)
        return Promise.resolve();
    return api($, 'PATCH', "/sessions/".concat(encodeURIComponent(session.key)), patch)
        .then(function () { return undefined; })
        .catch(function (error) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(canRegister && error instanceof CoordinatorError && error.status === 404)) return [3 /*break*/, 2];
                    return [4 /*yield*/, registerSession($)];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 2: return [4 /*yield*/, debug($, "session update failed: ".concat(String(error)))];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4: return [2 /*return*/];
            }
        });
    }); });
}
/**
 * Takes the coordinator's state into this session's view. A reading this
 * session made itself and the coordinator hasn't caught up with stays. New
 * notices show as toasts; the first session to claim one that asks for it
 * posts the desktop notification.
 */
function applyState($, state, activeId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, _b, accounts;
        var _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _a = state.version < version;
                    if (!_a) return [3 /*break*/, 2];
                    _b = state.coordinator.startedAt;
                    return [4 /*yield*/, getView($)];
                case 1:
                    _a = _b === ((_d = (_c = (_e.sent()).coordinator) === null || _c === void 0 ? void 0 : _c.info) === null || _d === void 0 ? void 0 : _d.startedAt);
                    _e.label = 2;
                case 2:
                    if (_a)
                        return [2 /*return*/];
                    version = state.version;
                    chromeMiss = state.chrome.miss;
                    accounts = state.accounts.map(function (a) { return (__assign(__assign(__assign(__assign(__assign({ id: a.id, slot: a.slot }, (a.email === undefined ? {} : { email: a.email })), (a.orgId === undefined ? {} : { orgId: a.orgId })), (a.orgName === undefined ? {} : { orgName: a.orgName })), (a.plan === undefined ? {} : { plan: a.plan })), (a.tier === undefined ? {} : { tier: a.tier }))); });
                    return [4 /*yield*/, setView($, function (v) {
                            var _a;
                            var readings = {};
                            for (var _i = 0, _b = state.accounts; _i < _b.length; _i++) {
                                var a = _b[_i];
                                var mine = v.readings[a.id];
                                var theirs = a.reading;
                                var newer = mine !== undefined && (theirs === undefined || mine.at > theirs.at) ? mine : theirs;
                                // A response's reading has no model weeks: the coordinator's poll has them.
                                var models = (_a = newer === null || newer === void 0 ? void 0 : newer.models) !== null && _a !== void 0 ? _a : theirs === null || theirs === void 0 ? void 0 : theirs.models;
                                var reading = newer === undefined || models === undefined ? newer : __assign(__assign({}, newer), { models: models });
                                if (reading !== undefined)
                                    readings[a.id] = reading;
                            }
                            var pick = function (f) {
                                return Object.fromEntries(state.accounts.flatMap(function (a) {
                                    var value = f(a);
                                    return value === undefined ? [] : [[a.id, value]];
                                }));
                            };
                            return __assign(__assign(__assign({}, v), { accounts: accounts, readings: readings, health: pick(function (a) { return a.health; }), holders: pick(function (a) { return a.holder; }), expiresAt: pick(function (a) { return a.expiresAt; }), moveTo: pick(function (a) { return a.moveTo; }), moveToFor: byModel(state.accounts), retiring: state.accounts.filter(function (a) { return a.isRetiring; }).map(function (a) { return a.id; }), sessionCounts: pick(function (a) { return a.sessionCount; }), combined: state.combined, footer: state.settings.footer, rotateTo: state.settings.rotateTo, chromeAccountId: state.chrome.accountId, chromeAccountIds: state.chrome.accountIds, coordinator: { info: state.coordinator } }), (activeId === undefined ? {} : { activeId: activeId }));
                        })];
                case 3:
                    _e.sent();
                    return [4 /*yield*/, showNotices($, state)];
                case 4:
                    _e.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/** Each account's moveToFor turned around: by model, then by account. */
function byModel(accounts) {
    var _a, _b;
    var out = {};
    for (var _i = 0, accounts_1 = accounts; _i < accounts_1.length; _i++) {
        var a = accounts_1[_i];
        for (var _c = 0, _d = Object.entries((_a = a.moveToFor) !== null && _a !== void 0 ? _a : {}); _c < _d.length; _c++) {
            var _e = _d[_c], model = _e[0], to = _e[1];
            ((_b = out[model]) !== null && _b !== void 0 ? _b : (out[model] = {}))[a.id] = to;
        }
    }
    return out;
}
function showNotices($, state) {
    return __awaiter(this, void 0, void 0, function () {
        var newest, fresh, _i, fresh_1, notice, claimed;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    newest = (_b = (_a = state.notices.at(-1)) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : 0;
                    if (lastNotice === undefined) {
                        // A session shows what happens after it starts, not what happened before.
                        lastNotice = newest;
                        return [2 /*return*/];
                    }
                    fresh = state.notices.filter(function (n) { return n.id > (lastNotice !== null && lastNotice !== void 0 ? lastNotice : 0); });
                    lastNotice = Math.max(lastNotice, newest);
                    _i = 0, fresh_1 = fresh;
                    _c.label = 1;
                case 1:
                    if (!(_i < fresh_1.length)) return [3 /*break*/, 5];
                    notice = fresh_1[_i];
                    $.ui.toast(notice.text, { timeoutMs: 8000 });
                    if (!notice.notify || session === undefined)
                        return [3 /*break*/, 4];
                    return [4 /*yield*/, api($, 'POST', "/notices/".concat(notice.id, "/claim"), { sessionId: session.key }).catch(function () { return ({ claimed: false }); })];
                case 2:
                    claimed = (_c.sent()).claimed;
                    if (!claimed) return [3 /*break*/, 4];
                    return [4 /*yield*/, $.ui.notify(notice.text, { title: TITLE })];
                case 3:
                    _c.sent();
                    _c.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 1];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Follows the coordinator for the session's life: a long poll that answers on
 * each change. A coordinator gone (restarted, upgraded, killed) is started
 * again and the session registered there again. Ends with the module.
 */
function watch($) {
    return __awaiter(this, void 0, void 0, function () {
        var failures, _loop_1;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    failures = 0;
                    _loop_1 = function () {
                        var key, state_1, error_2, why_1;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _b.trys.push([0, 10, , 15]);
                                    key = session === undefined ? '' : "&session=".concat(encodeURIComponent(session.key));
                                    return [4 /*yield*/, api($, 'GET', "/state?since=".concat(version, "&wait=").concat(WAIT_MS).concat(key))];
                                case 1:
                                    state_1 = _b.sent();
                                    if (!(failures > 0)) return [3 /*break*/, 3];
                                    return [4 /*yield*/, setView($, function (v) { return (__assign(__assign({}, v), { coordinator: { info: state_1.coordinator } })); })];
                                case 2:
                                    _b.sent();
                                    _b.label = 3;
                                case 3:
                                    failures = 0;
                                    if (!(session !== undefined && !state_1.sessions.some(function (s) { return s.id === (session === null || session === void 0 ? void 0 : session.key); }))) return [3 /*break*/, 5];
                                    return [4 /*yield*/, registerSession($)];
                                case 4:
                                    _b.sent();
                                    return [3 /*break*/, 7];
                                case 5:
                                    if (!(state_1.version !== version)) return [3 /*break*/, 7];
                                    return [4 /*yield*/, applyState($, state_1)];
                                case 6:
                                    _b.sent();
                                    _b.label = 7;
                                case 7: return [4 /*yield*/, settlePending($, false)];
                                case 8:
                                    _b.sent();
                                    return [4 /*yield*/, maybeRotate($)];
                                case 9:
                                    _b.sent();
                                    return [3 /*break*/, 15];
                                case 10:
                                    error_2 = _b.sent();
                                    failures += 1;
                                    why_1 = error_2 instanceof Error ? error_2.message : String(error_2);
                                    return [4 /*yield*/, setView($, function (v) { var _a; return (__assign(__assign({}, v), { coordinator: __assign(__assign({}, (((_a = v.coordinator) === null || _a === void 0 ? void 0 : _a.info) ? { info: v.coordinator.info } : {})), { error: why_1 }) })); })
                                        // Rejects once the module is gone, which ends the loop.
                                    ];
                                case 11:
                                    _b.sent();
                                    // Rejects once the module is gone, which ends the loop.
                                    return [4 /*yield*/, $.clock.sleep(Math.min(30000, 2000 * failures))];
                                case 12:
                                    // Rejects once the module is gone, which ends the loop.
                                    _b.sent();
                                    if (!(failures === 1 || failures % 5 === 0)) return [3 /*break*/, 14];
                                    return [4 /*yield*/, ensureCoordinator($).catch(function (e) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                            return [2 /*return*/, debug($, "coordinator start failed: ".concat(String(e)))];
                                        }); }); })];
                                case 13:
                                    _b.sent();
                                    _b.label = 14;
                                case 14: return [3 /*break*/, 15];
                                case 15: return [2 /*return*/];
                            }
                        });
                    };
                    _a.label = 1;
                case 1: return [5 /*yield**/, _loop_1()];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3: return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// ---------------------------------------------------------------- switching
/** Points this session's requests, and every child it starts after, at a slot's login. */
function useSlot($, slot) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(slot === '')) return [3 /*break*/, 2];
                    return [4 /*yield*/, $.env.set('CLAUDE_SECURESTORAGE_CONFIG_DIR', undefined)];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 2: return [4 /*yield*/, $.env.set('CLAUDE_SECURESTORAGE_CONFIG_DIR', slot)
                    // Registered again (a coordinator restarted), the session is on the login this slot holds.
                ];
                case 3:
                    _a.sent();
                    _a.label = 4;
                case 4:
                    // Registered again (a coordinator restarted), the session is on the login this slot holds.
                    if (session !== undefined)
                        session.slot = slot;
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Claude Code's security policy refuses switching in this session: says so
 * once, as a toast and a notification, and the pane says so while it lasts.
 * False when it was said already.
 */
function blocked($) {
    return __awaiter(this, void 0, void 0, function () {
        var view, text;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getView($)];
                case 1:
                    view = _a.sent();
                    if (view.isSwitchBlocked)
                        return [2 /*return*/, false];
                    return [4 /*yield*/, setView($, function (v) { return (__assign(__assign({}, v), { isSwitchBlocked: true })); })];
                case 2:
                    _a.sent();
                    void patchSession($, { isBlocked: true });
                    text = (0, model_1.blockedText)((0, model_1.isOnNormalLogin)(view));
                    $.ui.toast(text, { timeoutMs: 15000 });
                    return [4 /*yield*/, $.ui.notify(text, { title: TITLE })];
                case 3:
                    _a.sent();
                    return [2 /*return*/, true];
            }
        });
    });
}
/**
 * Sets the slot already in use, which changes nothing: the policy that refuses
 * a switch refuses this too, so a session that cannot switch says so at its start.
 */
function checkSwitching($, slot) {
    return __awaiter(this, void 0, void 0, function () {
        var error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 7]);
                    return [4 /*yield*/, useSlot($, slot)];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 7];
                case 2:
                    error_3 = _a.sent();
                    if (!(0, model_1.isPolicyRefusal)(error_3)) return [3 /*break*/, 4];
                    return [4 /*yield*/, blocked($)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 4: return [4 /*yield*/, debug($, "switch check failed: ".concat(String(error_3)))];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6: return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
}
/** Why the login in use is left, counted the way the footer shows it: room left, or what is used. */
function whyLeave(view, now) {
    var _a, _b, _c, _d, _e, _f;
    if (((_a = view.health[view.activeId]) === null || _a === void 0 ? void 0 : _a.kind) === 'login-needed')
        return "account ".concat(view.activeId, " needs a sign-in");
    if ((_b = view.retiring) === null || _b === void 0 ? void 0 : _b.includes(view.activeId))
        return "account ".concat(view.activeId, " is being removed");
    var r = view.readings[view.activeId];
    var five = (_c = (0, model_1.windowPct)(r === null || r === void 0 ? void 0 : r.fiveHour, now)) !== null && _c !== void 0 ? _c : 0;
    var scope = (0, model_1.viewScope)(view);
    var model = (_d = (0, model_1.windowPct)((0, model_1.modelWindow)(r, scope), now)) !== null && _d !== void 0 ? _d : 0;
    var _g = five >= model_1.LEAVE_FIVE_HOUR
        ? ['5-hour window', five]
        : scope !== undefined && model >= ((_e = (0, model_1.windowPct)(r === null || r === void 0 ? void 0 : r.sevenDay, now)) !== null && _e !== void 0 ? _e : 0)
            ? ["".concat(scope, " week"), model]
            : ['week', (_f = (0, model_1.windowPct)(r === null || r === void 0 ? void 0 : r.sevenDay, now)) !== null && _f !== void 0 ? _f : 0], window = _g[0], used = _g[1];
    return view.footer.fill === 'left'
        ? "account ".concat(view.activeId, " has ").concat(Math.round(100 - used), "% of its ").concat(window, " left")
        : "account ".concat(view.activeId, " has used ").concat(Math.round(used), "% of its ").concat(window);
}
/**
 * Where a session goes, once it must leave the login it is on or, with
 * 'soonest reset', once another login's week resets sooner: the coordinator's
 * pick, else its own without the logins a switch didn't take here.
 */
function targetFor(view, now) {
    var _a, _b, _c;
    var scope = (0, model_1.viewScope)(view);
    var shared = scope === undefined ? (_a = view.moveTo) === null || _a === void 0 ? void 0 : _a[view.activeId] : (_c = (_b = view.moveToFor) === null || _b === void 0 ? void 0 : _b[scope]) === null || _c === void 0 ? void 0 : _c[view.activeId];
    if (shared !== undefined && !untaken.has(shared))
        return view.accounts.find(function (a) { return a.id === shared; });
    var own = __assign(__assign({}, view), { accounts: view.accounts.filter(function (a) { return !untaken.has(a.id); }) });
    return (0, model_1.shouldLeave)(view, now) ? (0, model_1.pickTarget)(own, now) : (0, model_1.soonerTarget)(own, now);
}
/** The rotation check under way: the coordinator's changes, a response and a timer can all ask at once, and one switch answers them all. */
var rotating;
/**
 * Once the active login is spent, locked out or being removed, or with
 * 'soonest reset' once another login's week resets sooner (at start-up too),
 * moves to where the coordinator sends sessions on it, a session whose last
 * switch still waits for a response too; never while the rotation is off,
 * Claude Code's policy refuses it, Connect holds the session where it is, or a
 * turn runs while a switch waits, or the switch waiting is one the person picked.
 */
function maybeRotate($) {
    rotating !== null && rotating !== void 0 ? rotating : (rotating = rotateOnce($).finally(function () {
        rotating = undefined;
    }));
    return rotating;
}
function rotateOnce($) {
    return __awaiter(this, void 0, void 0, function () {
        var now, view, isLeaving, isRetiring, target;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, $.clock.now()];
                case 1:
                    now = _b.sent();
                    return [4 /*yield*/, getView($)];
                case 2:
                    view = _b.sent();
                    if (view.accounts.length === 0 || isConnectingChrome || view.isSwitchBlocked || (view.pending !== undefined && (view.pending.isPicked === true || turns.size > 0)))
                        return [2 /*return*/, false];
                    isLeaving = (0, model_1.shouldLeave)(view, now);
                    if (!isLeaving && view.rotateTo !== 'reset')
                        return [2 /*return*/, false];
                    isRetiring = ((_a = view.retiring) === null || _a === void 0 ? void 0 : _a.includes(view.activeId)) === true;
                    if (view.rotateTo === 'off' && !isRetiring)
                        return [2 /*return*/, false
                            // With none to move to, the band above the prompt says when the next login frees up.
                        ];
                    target = targetFor(view, now);
                    if (target === undefined)
                        return [2 /*return*/, false];
                    return [2 /*return*/, switchTo($, target, isLeaving ? whyLeave(view, now) : "its week resets before account ".concat(view.activeId, "'s"))];
            }
        });
    });
}
/** The login in use, when its token refreshes too soon for the refresh guard to let the session leave it for `target`. */
function refreshingSoon(view, target, now) {
    var _a;
    var active = view.accounts.find(function (a) { return a.id === view.activeId; });
    if (active === undefined || active.id === target.id)
        return undefined;
    var expiresAt = (_a = view.expiresAt) === null || _a === void 0 ? void 0 : _a[active.id];
    var isSoon = expiresAt !== undefined && expiresAt > now && expiresAt - now < REFRESH_GUARD_MS;
    return isSoon ? active : undefined;
}
/** Points this session at `target`; false while the refresh guard holds it back, or Claude Code's policy refuses it. Quiet: no toast. */
function switchTo($_1, target_1, why_2) {
    return __awaiter(this, arguments, void 0, function ($, target, why, isQuiet) {
        var active, _a, _b, retry, error_4, _c, _d, _e, _f, now;
        if (isQuiet === void 0) { isQuiet = false; }
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    _a = refreshingSoon;
                    return [4 /*yield*/, getView($)];
                case 1:
                    _b = [_g.sent(), target];
                    return [4 /*yield*/, $.clock.now()];
                case 2:
                    active = _a.apply(void 0, _b.concat([_g.sent()]));
                    if (active !== undefined) {
                        if (held === undefined) {
                            tell($, "Switching to Claude account ".concat(target.id, " in a few minutes, once account ").concat(active.id, "'s token has refreshed."));
                            retry = function () {
                                if (held !== undefined)
                                    void switchTo($, held.target, held.why);
                            };
                            held = { target: target, why: why, timer: $.clock.every(60000, retry) };
                        }
                        else
                            held = __assign(__assign({}, held), { target: target, why: why });
                        return [2 /*return*/, false];
                    }
                    held === null || held === void 0 ? void 0 : held.timer.cancel();
                    held = undefined;
                    return [4 /*yield*/, keepChrome($)];
                case 3:
                    _g.sent();
                    _g.label = 4;
                case 4:
                    _g.trys.push([4, 6, , 10]);
                    return [4 /*yield*/, useSlot($, target.slot)];
                case 5:
                    _g.sent();
                    return [3 /*break*/, 10];
                case 6:
                    error_4 = _g.sent();
                    if (!(0, model_1.isPolicyRefusal)(error_4))
                        throw error_4;
                    return [4 /*yield*/, blocked($)];
                case 7:
                    if (!!(_g.sent())) return [3 /*break*/, 9];
                    _c = tell;
                    _d = [$];
                    _e = model_1.blockedText;
                    _f = model_1.isOnNormalLogin;
                    return [4 /*yield*/, getView($)];
                case 8:
                    _c.apply(void 0, _d.concat([_e.apply(void 0, [_f.apply(void 0, [_g.sent()])])]));
                    _g.label = 9;
                case 9: return [2 /*return*/, false];
                case 10: return [4 /*yield*/, $.clock.now()];
                case 11:
                    now = _g.sent();
                    movedAt = now;
                    reported = undefined;
                    return [4 /*yield*/, setView($, function (v) {
                            var _a, _b;
                            return (__assign(__assign({}, v), { activeId: target.id, 
                                // A switch made while another waits keeps the login the last response confirmed, which a switch that doesn't take goes back to.
                                pending: { id: target.id, from: (_b = (_a = v.pending) === null || _a === void 0 ? void 0 : _a.from) !== null && _b !== void 0 ? _b : v.activeId, since: now }, removing: undefined }));
                        })];
                case 12:
                    _g.sent();
                    void patchSession($, { accountId: target.id, isPending: true });
                    if (!isQuiet)
                        $.ui.toast("Switched to Claude account ".concat((0, model_1.label)(target), ": ").concat(why, "."), { timeoutMs: 6000 });
                    return [2 /*return*/, true];
            }
        });
    });
}
/**
 * After a switch: which login answered the latest response? The new one
 * (confirmed), or too soon to say. Only a response still answered by the old
 * login minutes later is reported: an idle session has no new response to tell.
 * Then the session is pointed back at the old login, and the footer and pane
 * mark it in use again, as it is the one spending.
 */
function settlePending($, isResponse) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, pending, accounts, now, reading, _b, _c, _d, from_1, _e, _f, _g, error_5;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0: return [4 /*yield*/, getView($)];
                case 1:
                    _a = _h.sent(), pending = _a.pending, accounts = _a.accounts;
                    if (pending === undefined)
                        return [2 /*return*/];
                    return [4 /*yield*/, $.clock.now()];
                case 2:
                    now = _h.sent();
                    if (now - pending.since < SETTLE_MS)
                        return [2 /*return*/];
                    _b = model_1.readingFromLimits;
                    return [4 /*yield*/, $.session.usage()];
                case 3:
                    reading = _b.apply(void 0, [(_h.sent()).rateLimits, now]);
                    if (!isResponse) return [3 /*break*/, 5];
                    return [4 /*yield*/, act($, 'POST', "/accounts/".concat(pending.id, "/check"), { fresh: true }).catch(function (error) { return debug($, "check of account ".concat(pending.id, " failed: ").concat(String(error))); })];
                case 4:
                    _h.sent();
                    _h.label = 5;
                case 5:
                    _c = model_1.sameUsage;
                    _d = [reading];
                    return [4 /*yield*/, getView($)];
                case 6:
                    if (!_c.apply(void 0, _d.concat([(_h.sent()).readings[pending.id], now]))) return [3 /*break*/, 8];
                    untaken.delete(pending.id);
                    return [4 /*yield*/, setView($, function (v) { return (__assign(__assign({}, v), { pending: undefined })); })];
                case 7:
                    _h.sent();
                    void patchSession($, { isPending: false });
                    return [3 /*break*/, 21];
                case 8:
                    if (!(isResponse && now - pending.since > CONFIRM_GIVE_UP_MS)) return [3 /*break*/, 21];
                    from_1 = accounts.find(function (a) { return a.id === pending.from; });
                    if (!(from_1 !== undefined)) return [3 /*break*/, 10];
                    return [4 /*yield*/, act($, 'POST', "/accounts/".concat(from_1.id, "/check"), { fresh: true }).catch(function () { return undefined; })];
                case 9:
                    _h.sent();
                    _h.label = 10;
                case 10:
                    _e = from_1 === undefined;
                    if (_e) return [3 /*break*/, 12];
                    _f = model_1.sameUsage;
                    _g = [reading];
                    return [4 /*yield*/, getView($)];
                case 11:
                    _e = !_f.apply(void 0, _g.concat([(_h.sent()).readings[from_1.id], now]));
                    _h.label = 12;
                case 12:
                    if (!_e) return [3 /*break*/, 14];
                    return [4 /*yield*/, setView($, function (v) { return (__assign(__assign({}, v), { pending: undefined })); })];
                case 13:
                    _h.sent();
                    void patchSession($, { isPending: false });
                    tell($, "The switch to Claude account ".concat(pending.id, " has not shown in responses."));
                    return [2 /*return*/];
                case 14:
                    untaken.add(pending.id);
                    _h.label = 15;
                case 15:
                    _h.trys.push([15, 17, , 19]);
                    return [4 /*yield*/, useSlot($, from_1.slot)];
                case 16:
                    _h.sent();
                    movedAt = now;
                    return [3 /*break*/, 19];
                case 17:
                    error_5 = _h.sent();
                    return [4 /*yield*/, debug($, "switch back failed: ".concat(String(error_5)))];
                case 18:
                    _h.sent();
                    return [3 /*break*/, 19];
                case 19: return [4 /*yield*/, setView($, function (v) { return (__assign(__assign({}, v), { activeId: from_1.id, pending: undefined })); })];
                case 20:
                    _h.sent();
                    void patchSession($, { accountId: from_1.id, isPending: false });
                    tell($, "The switch to Claude account ".concat(pending.id, " did not take: responses still use account ").concat((0, model_1.label)(from_1), ", so it shows in use again. ") +
                        "The rotation leaves account ".concat(pending.id, " be in this session; Use now tries it again."));
                    _h.label = 21;
                case 21: return [2 /*return*/];
            }
        });
    });
}
/** Reports a response's usage to the coordinator, once it has moved enough or a while has passed. */
function report($, id, reading) {
    return __awaiter(this, void 0, void 0, function () {
        var last, moved, isDue;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    last = (reported === null || reported === void 0 ? void 0 : reported.id) === id ? reported.reading : undefined;
                    moved = function (a, b) {
                        return (a === undefined) !== (b === undefined) || (a !== undefined && b !== undefined && (Math.abs(a.pct - b.pct) >= REPORT_POINTS || a.resetsAt !== b.resetsAt));
                    };
                    isDue = last === undefined || reading.at - last.at >= REPORT_EVERY_MS || moved(last.fiveHour, reading.fiveHour) || moved(last.sevenDay, reading.sevenDay);
                    if (!isDue)
                        return [2 /*return*/];
                    reported = { id: id, reading: reading };
                    return [4 /*yield*/, act($, 'POST', '/readings', __assign({ accountId: id, reading: reading }, (session === undefined ? {} : { sessionId: session.key })))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/** A response's own usage: the active login's, unless a switch is still settling. */
function onMeasure($, limits) {
    return __awaiter(this, void 0, void 0, function () {
        var view, now, given, id, models, reading;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, getView($)];
                case 1:
                    view = _b.sent();
                    if (!(view.pending !== undefined)) return [3 /*break*/, 6];
                    return [4 /*yield*/, settlePending($, true)
                        // A switch the response confirmed lets the rotation look again now, not at the next response.
                    ];
                case 2:
                    _b.sent();
                    return [4 /*yield*/, getView($)];
                case 3:
                    if (!((_b.sent()).pending === undefined)) return [3 /*break*/, 5];
                    return [4 /*yield*/, maybeRotate($)];
                case 4:
                    _b.sent();
                    _b.label = 5;
                case 5: return [2 /*return*/];
                case 6: return [4 /*yield*/, $.clock.now()];
                case 7:
                    now = _b.sent();
                    given = (0, model_1.readingFromLimits)(limits, now);
                    if (given === undefined || view.accounts.length === 0)
                        return [2 /*return*/];
                    id = view.activeId;
                    return [4 /*yield*/, noteModel($)
                        // A response reports no model weeks: keep the coordinator's.
                    ];
                case 8:
                    _b.sent();
                    models = (_a = view.readings[id]) === null || _a === void 0 ? void 0 : _a.models;
                    reading = models === undefined ? given : __assign(__assign({}, given), { models: models });
                    return [4 /*yield*/, setView($, function (v) {
                            var _a;
                            return (__assign(__assign({}, v), { readings: __assign(__assign({}, v.readings), (_a = {}, _a[id] = reading, _a)) }));
                        })];
                case 9:
                    _b.sent();
                    return [4 /*yield*/, report($, id, given).catch(function (error) { return debug($, "usage report failed: ".concat(String(error))); })];
                case 10:
                    _b.sent();
                    return [4 /*yield*/, refreshModelWeek($, now)];
                case 11:
                    _b.sent();
                    return [4 /*yield*/, maybeRotate($)];
                case 12:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/** Keeps the view's model as `/model` shows it: a model with its own week (Fable) also leaves a login once that week is spent. */
function noteModel($) {
    return __awaiter(this, void 0, void 0, function () {
        var model, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, $.session.model().catch(function () { return undefined; })];
                case 1:
                    model = _c.sent();
                    _a = model !== undefined;
                    if (!_a) return [3 /*break*/, 3];
                    _b = model;
                    return [4 /*yield*/, getView($)];
                case 2:
                    _a = _b !== (_c.sent()).model;
                    _c.label = 3;
                case 3:
                    if (!_a) return [3 /*break*/, 5];
                    return [4 /*yield*/, setView($, function (v) { return (__assign(__assign({}, v), { model: model })); })];
                case 4:
                    _c.sent();
                    _c.label = 5;
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * A response doesn't report a model's own week, so while this session's model
 * week runs high, each response asks the coordinator for fresh usage; it calls
 * the usage endpoint at most once a minute per login, however many ask.
 */
function refreshModelWeek($, now) {
    return __awaiter(this, void 0, void 0, function () {
        var view, w;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, getView($)];
                case 1:
                    view = _b.sent();
                    w = (0, model_1.modelWindow)(view.readings[view.activeId], (0, model_1.viewScope)(view));
                    if (w === undefined || ((_a = (0, model_1.windowPct)(w, now)) !== null && _a !== void 0 ? _a : 0) < WATCH_MODEL_FROM || now - modelCheckedAt < MODEL_FRESH_MS)
                        return [2 /*return*/];
                    modelCheckedAt = now;
                    return [4 /*yield*/, act($, 'POST', "/accounts/".concat(view.activeId, "/check"), { fresh: true }).catch(function (error) { return debug($, "check failed: ".concat(String(error))); })];
                case 2:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/** A turn that died on a usage limit or a rejected sign-in: switch, then carry on. */
function onStopFailure($, error) {
    return __awaiter(this, void 0, void 0, function () {
        var view, active, scope, now_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (error !== 'rate_limit' && error !== 'authentication_failed')
                        return [2 /*return*/];
                    return [4 /*yield*/, getView($)];
                case 1:
                    view = _a.sent();
                    active = view.accounts.find(function (a) { return a.id === view.activeId; });
                    if (active === undefined)
                        return [2 /*return*/];
                    scope = (0, model_1.viewScope)(view);
                    return [4 /*yield*/, act($, 'POST', "/accounts/".concat(active.id, "/").concat(error === 'rate_limit' ? 'spent' : 'rejected'), __assign(__assign({}, (session === undefined ? {} : { sessionId: session.key })), (scope === undefined ? {} : { model: scope })))];
                case 2:
                    _a.sent();
                    if (!(error === 'rate_limit')) return [3 /*break*/, 5];
                    return [4 /*yield*/, $.clock.now()];
                case 3:
                    now_1 = _a.sent();
                    return [4 /*yield*/, setView($, function (v) {
                            var _a;
                            return ((0, model_1.shouldLeave)(v, now_1) ? v : __assign(__assign({}, v), { readings: __assign(__assign({}, v.readings), (_a = {}, _a[active.id] = (0, model_1.spentReading)(v.readings[active.id], now_1, scope), _a)) }));
                        })];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5: return [4 /*yield*/, setView($, function (v) { return (__assign(__assign({}, v), { pending: undefined })); })];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, maybeRotate($)];
                case 7:
                    if (_a.sent()) {
                        $.clock.after(SETTLE_MS, function () { return void $.prompt.submit({ text: CONTINUE }); });
                    }
                    else if (isConnectingChrome)
                        isCutByVisit = true;
                    return [2 /*return*/];
            }
        });
    });
}
// ---------------------------------------------------------------- the session's work
// The footer names the branch the session works on. Sessions often start in one
// checkout and work in a worktree of it, moving there with `cd` in their Bash
// commands, either once (the Bash tool keeps the directory) or at the start of
// every command: the last directory a command moved to in a repository is
// where the work is, else the session's own.
/** A burst of tool calls reads git once, this long after the first. */
var WORK_DELAY_MS = 1000;
/** The last directory in a repository a Bash command moved to. */
var workDir;
/** The session's own directory when last read: a move of its own (a worktree it entered) starts over from there. */
var lastCwd;
var workTimer;
var isReadingWork = false;
/** Git's output in `dir`, or undefined when it fails; it takes no optional locks, so the session's own git commands never meet its index.lock. */
function gitIn($, dir, args) {
    return __awaiter(this, void 0, void 0, function () {
        var run;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, $.process.run(__spreadArray(['git', '--no-optional-locks', '-C', dir], args, true), { timeoutMs: 10000 }).catch(function () { return undefined; })];
                case 1:
                    run = _a.sent();
                    return [2 /*return*/, (run === null || run === void 0 ? void 0 : run.exitCode) === 0 ? run.stdout : undefined];
            }
        });
    });
}
/** The branch in `dir`, what no remote has of it and whether anything is uncommitted; undefined outside a repository. */
function readWork($, dir) {
    return __awaiter(this, void 0, void 0, function () {
        var status, parsed, unpushed, hasRemote, count, _a, _b;
        var _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, gitIn($, dir, ['status', '--porcelain=v2', '--branch'])];
                case 1:
                    status = _e.sent();
                    parsed = status === undefined ? undefined : (0, work_1.parseStatus)(status);
                    if (parsed === undefined)
                        return [2 /*return*/, undefined];
                    unpushed = parsed.ahead;
                    if (!!parsed.hasUpstream) return [3 /*break*/, 6];
                    return [4 /*yield*/, gitIn($, dir, ['remote'])];
                case 2:
                    hasRemote = ((_c = (_e.sent())) !== null && _c !== void 0 ? _c : '').trim() !== '';
                    if (!hasRemote) return [3 /*break*/, 4];
                    _b = Number;
                    return [4 /*yield*/, gitIn($, dir, ['rev-list', '--count', 'HEAD', '--not', '--remotes'])];
                case 3:
                    _a = _b.apply(void 0, [(_d = (_e.sent())) === null || _d === void 0 ? void 0 : _d.trim()]);
                    return [3 /*break*/, 5];
                case 4:
                    _a = NaN;
                    _e.label = 5;
                case 5:
                    count = _a;
                    unpushed = Number.isInteger(count) ? count : undefined;
                    _e.label = 6;
                case 6: return [2 /*return*/, __assign(__assign({ branch: parsed.branch }, (unpushed === undefined ? {} : { unpushed: unpushed })), { isDirty: parsed.isDirty })];
            }
        });
    });
}
/** Where the work is: the last directory a Bash command moved to, unless the session itself moved since. */
function workDirectory($) {
    return __awaiter(this, void 0, void 0, function () {
        var cwd;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, $.session.cwd().catch(function () { return undefined; })];
                case 1:
                    cwd = _a.sent();
                    if (cwd !== lastCwd) {
                        lastCwd = cwd;
                        workDir = undefined;
                    }
                    return [2 /*return*/, workDir !== null && workDir !== void 0 ? workDir : cwd];
            }
        });
    });
}
/** Reads the work again and keeps it in the view. */
function refreshWork($) {
    return __awaiter(this, void 0, void 0, function () {
        var dir, work_2, _a, now, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    if (isReadingWork)
                        return [2 /*return*/, scheduleWork($)];
                    isReadingWork = true;
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, , 9, 10]);
                    return [4 /*yield*/, workDirectory($)];
                case 2:
                    dir = _e.sent();
                    if (!(dir === undefined)) return [3 /*break*/, 3];
                    _a = undefined;
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, readWork($, dir)];
                case 4:
                    _a = _e.sent();
                    _e.label = 5;
                case 5:
                    work_2 = _a;
                    now = JSON.stringify(work_2);
                    _b = now;
                    _d = (_c = JSON).stringify;
                    return [4 /*yield*/, getView($)];
                case 6:
                    if (!(_b !== _d.apply(_c, [(_e.sent()).work]))) return [3 /*break*/, 8];
                    return [4 /*yield*/, setView($, function (v) { return (__assign(__assign({}, v), { work: work_2 })); })];
                case 7:
                    _e.sent();
                    _e.label = 8;
                case 8: return [3 /*break*/, 10];
                case 9:
                    isReadingWork = false;
                    return [7 /*endfinally*/];
                case 10: return [2 /*return*/];
            }
        });
    });
}
/** Reads the work again soon: once for a burst of calls. */
function scheduleWork($) {
    if (workTimer !== undefined)
        return;
    workTimer = $.clock.after(WORK_DELAY_MS, function () {
        workTimer = undefined;
        void refreshWork($).catch(function (error) { return debug($, "reading the branch failed: ".concat(String(error))); });
    });
}
/** A Bash command ran: a `cd` in it into a repository moves the work there. */
function onBash($, command) {
    return __awaiter(this, void 0, void 0, function () {
        var home, from, target, _a;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, $.env.get('HOME')];
                case 1:
                    home = (_b = (_d.sent())) !== null && _b !== void 0 ? _b : '/';
                    return [4 /*yield*/, workDirectory($)];
                case 2:
                    from = (_c = (_d.sent())) !== null && _c !== void 0 ? _c : home;
                    target = (0, work_1.cdTarget)(command, from, home);
                    _a = target !== undefined && target !== workDir;
                    if (!_a) return [3 /*break*/, 4];
                    return [4 /*yield*/, readWork($, target)];
                case 3:
                    _a = (_d.sent()) !== undefined;
                    _d.label = 4;
                case 4:
                    if (_a)
                        workDir = target;
                    scheduleWork($);
                    return [2 /*return*/];
            }
        });
    });
}
/** Claude was held back from the browser, or found none: once Claude in Chrome connects, it is told to carry on. */
var isChromeAwaited = false;
/** Connect found no browser as the extension's account: until one answers, a browser call that finds none asks the person instead. */
var hasChromeMissed = false;
/** The mod's own call to Claude in Chrome is under way: Connect does not hold it back. */
var isAskingChrome = false;
/** A turn hit a usage limit while Connect held the session on the extension's account: it carries on once the session is back. */
var isCutByVisit = false;
/** Names the account the Chrome extension is signed in to, for every session; none forgets it. */
function setChromeAccount($, id) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, setView($, function (v) { return (__assign(__assign({}, v), { chromeAccountId: id })); })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, act($, 'PATCH', '/chrome', { accountId: id !== null && id !== void 0 ? id : null })];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/** A Chrome extension answered as `id`, or none did: the Chrome box lists it, or not, for every session. */
function noteChromeAccount($, id, isSeen) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, setView($, function (v) {
                        var _a;
                        var before = (_a = v.chromeAccountIds) !== null && _a !== void 0 ? _a : [];
                        return __assign(__assign({}, v), { chromeAccountIds: isSeen ? __spreadArray([], new Set(__spreadArray(__spreadArray([], before, true), [id], false)), true) : before.filter(function (x) { return x !== id; }) });
                    })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, act($, 'PATCH', '/chrome', { seen: { accountId: id, isSeen: isSeen } })];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Asks Claude in Chrome which browsers answer, connecting it if this session
 * has not yet: 'failed' when it could not tell (no connection, or no answer in
 * time), 'absent' in a session without Claude in Chrome.
 */
function askChrome($) {
    return __awaiter(this, void 0, void 0, function () {
        var answer, late, error_6, browsers;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    isAskingChrome = true;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 5, 6]);
                    late = $.clock.sleep(CHROME_WAIT_MS).then(function () { return undefined; });
                    return [4 /*yield*/, Promise.race([$.mcp.call(model_1.CHROME_SERVER, 'list_connected_browsers', {}), late])];
                case 2:
                    answer = _a.sent();
                    return [3 /*break*/, 6];
                case 3:
                    error_6 = _a.sent();
                    // No Claude in Chrome tools in this session, or a hook refused the call.
                    return [4 /*yield*/, debug($, "Claude in Chrome not reached: ".concat(String(error_6)))];
                case 4:
                    // No Claude in Chrome tools in this session, or a hook refused the call.
                    _a.sent();
                    return [2 /*return*/, 'absent'];
                case 5:
                    isAskingChrome = false;
                    return [7 /*endfinally*/];
                case 6:
                    if (answer === undefined || answer.isError)
                        return [2 /*return*/, 'failed'];
                    browsers = (0, model_1.browsersFrom)(answer.content.map(function (block) { var _a; return (_a = block.text) !== null && _a !== void 0 ? _a : ''; }).join(''));
                    return [2 /*return*/, browsers === undefined ? 'failed' : browsers > 0 ? 'paired' : 'unpaired'];
            }
        });
    });
}
/** With no account named for the Chrome extension yet, the one a browser answered as is it, for every session. */
function learnChrome($, account) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getView($)];
                case 1:
                    if ((_a.sent()).chromeAccountId !== undefined)
                        return [2 /*return*/];
                    return [4 /*yield*/, setChromeAccount($, account.id)];
                case 2:
                    _a.sent();
                    tell($, "Claude in Chrome connects as Claude account ".concat((0, model_1.label)(account), ": your Chrome extension is signed in to it."));
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * What an answer tells, Claude in Chrome having connected as `as`: whether the
 * session has it, how its connection stands, whether the Chrome box lists the
 * account, and, a browser answering, the extension's account. A guess at
 * Claude Code's login that finds none is kept, so it is not tried again.
 */
function noteChrome($, as, answer) {
    return __awaiter(this, void 0, void 0, function () {
        var isPaired;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(answer === 'absent' || answer === 'failed')) return [3 /*break*/, 2];
                    return [4 /*yield*/, setView($, function (v) { return (__assign(__assign({}, v), { hasChrome: answer === 'failed' })); })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
                case 2:
                    isPaired = answer === 'paired';
                    return [4 /*yield*/, setView($, function (v) {
                            var _a;
                            return (__assign(__assign({}, v), { hasChrome: true, chrome: __assign({ as: as.id, isPaired: isPaired }, (!isPaired && ((_a = v.chrome) === null || _a === void 0 ? void 0 : _a.hasFailed) ? { hasFailed: true } : {})) }));
                        })];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, noteChromeAccount($, as.id, isPaired)];
                case 4:
                    _a.sent();
                    if (!isPaired) return [3 /*break*/, 6];
                    return [4 /*yield*/, learnChrome($, as)];
                case 5:
                    _a.sent();
                    return [3 /*break*/, 9];
                case 6: return [4 /*yield*/, getView($)];
                case 7:
                    if (!((_a.sent()).chromeAccountId === undefined && as.slot === '')) return [3 /*break*/, 9];
                    chromeMiss = as.id;
                    return [4 /*yield*/, act($, 'PATCH', '/chrome', { miss: as.id })];
                case 8:
                    _a.sent();
                    _a.label = 9;
                case 9: return [2 /*return*/];
            }
        });
    });
}
/**
 * Before the session moves off the login it is on: where that is the account
 * the Chrome extension is signed in to (or, none named yet, Claude Code's
 * login, where it most often is), connects Claude in Chrome there first, once a
 * session. The connection keeps that account as the session moves on.
 */
function keepChrome($) {
    return __awaiter(this, void 0, void 0, function () {
        var view, _a, active, isGuess, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, getView($)];
                case 1:
                    view = _d.sent();
                    if (view.chrome !== undefined || view.hasChrome === false || isConnectingChrome)
                        return [2 /*return*/];
                    _a = movedAt !== undefined;
                    if (!_a) return [3 /*break*/, 3];
                    return [4 /*yield*/, $.clock.now()];
                case 2:
                    _a = (_d.sent()) - movedAt < SETTLE_MS;
                    _d.label = 3;
                case 3:
                    // Until a switch lands, the connection could be made as either login.
                    if (_a)
                        return [2 /*return*/];
                    active = view.accounts.find(function (a) { return a.id === view.activeId; });
                    if (active === undefined)
                        return [2 /*return*/];
                    isGuess = view.chromeAccountId === undefined && active.slot === '' && chromeMiss !== active.id;
                    if (view.chromeAccountId !== active.id && !isGuess)
                        return [2 /*return*/];
                    _b = noteChrome;
                    _c = [$, active];
                    return [4 /*yield*/, askChrome($)];
                case 4: return [4 /*yield*/, _b.apply(void 0, _c.concat([_d.sent()]))];
                case 5:
                    _d.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Whether the session connects Claude in Chrome as it opens: an account is
 * named for the extension, signed in. Whatever usage it has left: connecting
 * uses its sign-in, not its usage. Later, a session Claude Code stops from
 * switching couldn't go there.
 */
function shouldConnectAtOpen(view) {
    var _a;
    var target = view.accounts.find(function (a) { return a.id === view.chromeAccountId; });
    if (target === undefined || !(0, model_1.canConnectChrome)(view))
        return false;
    var health = (_a = view.health[target.id]) === null || _a === void 0 ? void 0 : _a.kind;
    return target.id === view.activeId || (health !== 'login-needed' && health !== 'logging-in');
}
/**
 * Connect: visits the account the Chrome extension is signed in to, or one
 * tried for it, as Claude Code connects Claude in Chrome with the sign-in the
 * session uses: moves the session there, has Claude in Chrome connect once the
 * move lands (again, where it connected before), asks which browsers answer,
 * and moves back. The connection stays. Then Claude carries on: held back from
 * the browser, or cut by a usage limit on the way. Quiet as the session opens:
 * the pane says how it went. Answers what the browsers did, where it asked them.
 */
function connectChrome($, isQuiet, tryId) {
    var _this = this;
    if (isQuiet === void 0) { isQuiet = false; }
    if (isConnectingChrome)
        return Promise.resolve(undefined);
    isConnectingChrome = true;
    return (function () { return __awaiter(_this, void 0, void 0, function () {
        var done, isMoved, isConnected, text;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, , 2, 4]);
                    return [4 /*yield*/, connectingChrome($, isQuiet, tryId)];
                case 1:
                    done = _a.sent();
                    return [3 /*break*/, 4];
                case 2:
                    isConnectingChrome = false;
                    return [4 /*yield*/, setView($, function (v) { return (__assign(__assign({}, v), { chromeConnecting: undefined })); })];
                case 3:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 4: return [4 /*yield*/, maybeRotate($)];
                case 5:
                    isMoved = (_a.sent()) || (done === null || done === void 0 ? void 0 : done.isVisit) === true;
                    isConnected = (done === null || done === void 0 ? void 0 : done.answer) === 'paired' && isChromeAwaited;
                    text = isConnected && done !== undefined ? "Claude in Chrome is connected as Claude account ".concat((0, model_1.label)(done.target), ". Continue where you left off.") : isCutByVisit ? CONTINUE : undefined;
                    if (isConnected)
                        isChromeAwaited = false;
                    isCutByVisit = false;
                    if (text !== undefined) {
                        // Once the move back lands: until then the turn's requests may go out as the extension's account.
                        if (isMoved)
                            $.clock.after(SETTLE_MS, function () { return void $.prompt.submit({ text: text }); });
                        else
                            void $.prompt.submit({ text: text });
                    }
                    return [2 /*return*/, done === null || done === void 0 ? void 0 : done.answer];
            }
        });
    }); })();
}
/**
 * Use for Chrome, on an account a browser answered as, or Try to connect, on
 * another: Claude in Chrome connects as the account, which once a browser
 * answers there is the extension's, in this session now and in every session
 * from now on. Where none answers, the Chrome box lists it no more, and Claude
 * in Chrome connects again as the account picked before.
 */
function tryChromeAccount($, id) {
    return __awaiter(this, void 0, void 0, function () {
        var answer, picked;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, connectChrome($, false, id)];
                case 1:
                    answer = _a.sent();
                    return [4 /*yield*/, getView($)];
                case 2:
                    picked = (_a.sent()).chromeAccountId;
                    if (!(answer === 'paired')) return [3 /*break*/, 4];
                    return [4 /*yield*/, setView($, function (v) { return (__assign(__assign({}, v), { isChromeOthersShown: false })); })];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 6];
                case 4:
                    if (!((answer === 'unpaired' || answer === 'failed') && picked !== undefined && picked !== id)) return [3 /*break*/, 6];
                    return [4 /*yield*/, connectChrome($)];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6: return [2 /*return*/];
            }
        });
    });
}
function connectingChrome($, isQuiet, tryId) {
    return __awaiter(this, void 0, void 0, function () {
        var view, target, from, isTrial, active, _a, _b, isVisit, _c, wait, _d, _e, before, error_7, answer, back;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0: return [4 /*yield*/, getView($)];
                case 1:
                    view = _f.sent();
                    target = view.accounts.find(function (a) { return a.id === (tryId !== null && tryId !== void 0 ? tryId : view.chromeAccountId); });
                    from = view.accounts.find(function (a) { return a.id === view.activeId; });
                    if (target === undefined || from === undefined || !(0, model_1.canConnectChrome)(__assign(__assign({}, view), { chromeAccountId: target.id })))
                        return [2 /*return*/, undefined
                            // Tried for the extension: the account picked before stays its own until a browser answers as this one.
                        ];
                    isTrial = target.id !== view.chromeAccountId;
                    _a = refreshingSoon;
                    _b = [view, target];
                    return [4 /*yield*/, $.clock.now()];
                case 2:
                    active = _a.apply(void 0, _b.concat([_f.sent()]));
                    if (active !== undefined) {
                        if (!isQuiet)
                            tell($, "Chrome can connect as account ".concat(target.id, " once account ").concat(active.id, "'s token has refreshed: try again in a few minutes."));
                        return [2 /*return*/, undefined];
                    }
                    return [4 /*yield*/, setView($, function (v) { return (__assign(__assign({}, v), { chromeConnecting: target.id })); })];
                case 3:
                    _f.sent();
                    isVisit = from.id !== target.id;
                    _c = isVisit;
                    if (!_c) return [3 /*break*/, 5];
                    return [4 /*yield*/, switchTo($, target, 'Claude in Chrome connects as it', true)];
                case 4:
                    _c = !(_f.sent());
                    _f.label = 5;
                case 5:
                    if (_c)
                        return [2 /*return*/, undefined];
                    if (!(movedAt === undefined)) return [3 /*break*/, 6];
                    _d = 0;
                    return [3 /*break*/, 8];
                case 6:
                    _e = movedAt + SETTLE_MS;
                    return [4 /*yield*/, $.clock.now()];
                case 7:
                    _d = _e - (_f.sent());
                    _f.label = 8;
                case 8:
                    wait = _d;
                    if (!(wait > 0)) return [3 /*break*/, 10];
                    return [4 /*yield*/, $.clock.sleep(wait)
                        // A connection made before, as whichever login the session was on then, is made again as this one.
                    ];
                case 9:
                    _f.sent();
                    _f.label = 10;
                case 10: return [4 /*yield*/, getView($)];
                case 11:
                    before = _f.sent();
                    if (!(before.chrome !== undefined || before.hasChrome === true)) return [3 /*break*/, 16];
                    _f.label = 12;
                case 12:
                    _f.trys.push([12, 14, , 16]);
                    return [4 /*yield*/, $.command.run({ command: 'mcp', args: "reconnect ".concat(model_1.CHROME_SERVER) })];
                case 13:
                    _f.sent();
                    return [3 /*break*/, 16];
                case 14:
                    error_7 = _f.sent();
                    return [4 /*yield*/, debug($, "/mcp reconnect ".concat(model_1.CHROME_SERVER, " failed: ").concat(String(error_7)))];
                case 15:
                    _f.sent();
                    return [3 /*break*/, 16];
                case 16: return [4 /*yield*/, askChrome($)];
                case 17:
                    answer = _f.sent();
                    if (!(isTrial && answer === 'paired')) return [3 /*break*/, 19];
                    return [4 /*yield*/, setChromeAccount($, target.id)];
                case 18:
                    _f.sent();
                    _f.label = 19;
                case 19: return [4 /*yield*/, noteChrome($, target, answer)
                    // Whether a browser answers as the extension's account: a trial that found none didn't ask there.
                ];
                case 20:
                    _f.sent();
                    // Whether a browser answers as the extension's account: a trial that found none didn't ask there.
                    if (!isTrial || answer === 'paired')
                        hasChromeMissed = answer === 'unpaired';
                    if (!(answer === 'paired')) return [3 /*break*/, 22];
                    // A browser answering as the account shows the switch took: the rotation need not wait for a response to say so.
                    untaken.delete(target.id);
                    return [4 /*yield*/, setView($, function (v) { var _a; return (((_a = v.pending) === null || _a === void 0 ? void 0 : _a.id) === target.id ? __assign(__assign({}, v), { pending: undefined }) : v); })];
                case 21:
                    _f.sent();
                    _f.label = 22;
                case 22:
                    if (!isVisit) return [3 /*break*/, 24];
                    return [4 /*yield*/, leaveVisit($, from)];
                case 23:
                    _f.sent();
                    _f.label = 24;
                case 24:
                    if (!isQuiet && answer === 'paired')
                        tell($, "Claude in Chrome is connected as Claude account ".concat((0, model_1.label)(target), "."));
                    if (!isQuiet && answer === 'unpaired') {
                        back = isTrial ? view.accounts.find(function (a) { return a.id === view.chromeAccountId; }) : undefined;
                        tell($, "No Chrome extension answers as Claude account ".concat((0, model_1.label)(target), ". Open Chrome and check its Claude extension is signed in with that email; if it is, restart Chrome").concat(isTrial ? ' and try again' : '', ".") +
                            (back === undefined ? '' : " Claude in Chrome goes back to account ".concat((0, model_1.label)(back), ".")));
                    }
                    return [2 /*return*/, { target: target, answer: answer, isVisit: isVisit }];
            }
        });
    });
}
/**
 * After Connect's visit: where the session would go from the login it was on.
 * With 'soonest reset', that is the login whose week resets soonest (which can
 * be the one visited), without a stop back on the login it came from, as a
 * session opening on Claude Code's login would; else back to that login while
 * it can serve, or with the rotation off; else on to the one the coordinator
 * picks. Other than that, the extension's account's usage is not the
 * session's to spend.
 */
function leaveVisit($, from) {
    return __awaiter(this, void 0, void 0, function () {
        var now, view, fromView, health, canServe, sooner, target;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, $.clock.now()];
                case 1:
                    now = _b.sent();
                    return [4 /*yield*/, getView($)];
                case 2:
                    view = _b.sent();
                    fromView = __assign(__assign({}, view), { activeId: from.id });
                    health = (_a = view.health[from.id]) === null || _a === void 0 ? void 0 : _a.kind;
                    canServe = health !== 'login-needed' && health !== 'logging-in' && !(0, model_1.shouldLeave)(fromView, now);
                    sooner = canServe && view.rotateTo === 'reset' ? targetFor(fromView, now) : undefined;
                    if (!(sooner !== undefined)) return [3 /*break*/, 5];
                    if (!(sooner.id !== view.activeId)) return [3 /*break*/, 4];
                    return [4 /*yield*/, switchTo($, sooner, "its week resets before account ".concat(from.id, "'s"))];
                case 3:
                    _b.sent();
                    _b.label = 4;
                case 4: return [2 /*return*/];
                case 5:
                    if (!(view.rotateTo === 'off' || canServe)) return [3 /*break*/, 7];
                    return [4 /*yield*/, switchTo($, from, 'back from connecting Claude in Chrome', true)];
                case 6:
                    _b.sent();
                    return [2 /*return*/];
                case 7:
                    target = targetFor(fromView, now);
                    if (!(target !== undefined)) return [3 /*break*/, 9];
                    return [4 /*yield*/, switchTo($, target, whyLeave(fromView, now))];
                case 8:
                    _b.sent();
                    _b.label = 9;
                case 9: return [2 /*return*/];
            }
        });
    });
}
/**
 * After a call to one of Claude in Chrome's tools. One answered marks the
 * connection paired and, as the session's first, names the extension's
 * account where none is. One that found no browser marks it so, for the band,
 * and returns what Claude reads in place of Claude Code's advice to /login:
 * that the mod connects it now, or what to ask the person.
 */
function onBrowserCall($, isUnanswered) {
    return __awaiter(this, void 0, void 0, function () {
        var view, isSure, _a, as, chrome, after, active;
        var _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, getView($)];
                case 1:
                    view = _e.sent();
                    _a = movedAt === undefined;
                    if (_a) return [3 /*break*/, 3];
                    return [4 /*yield*/, $.clock.now()];
                case 2:
                    _a = (_e.sent()) - movedAt >= SETTLE_MS;
                    _e.label = 3;
                case 3:
                    isSure = _a;
                    as = (_c = (_b = view.chrome) === null || _b === void 0 ? void 0 : _b.as) !== null && _c !== void 0 ? _c : (isSure ? view.activeId : undefined);
                    chrome = __assign(__assign(__assign({}, (as === undefined ? {} : { as: as })), { isPaired: !isUnanswered }), (isUnanswered ? { hasFailed: true } : {}));
                    return [4 /*yield*/, setView($, function (v) { return (__assign(__assign({}, v), { hasChrome: true, chrome: chrome })); })];
                case 4:
                    after = _e.sent();
                    if (!!isUnanswered) return [3 /*break*/, 9];
                    hasChromeMissed = false;
                    if (!(as !== undefined)) return [3 /*break*/, 6];
                    return [4 /*yield*/, noteChromeAccount($, as, true)];
                case 5:
                    _e.sent();
                    _e.label = 6;
                case 6:
                    active = view.accounts.find(function (a) { return a.id === view.activeId; });
                    if (!(view.chrome === undefined && isSure && active !== undefined)) return [3 /*break*/, 8];
                    return [4 /*yield*/, learnChrome($, active)];
                case 7:
                    _e.sent();
                    _e.label = 8;
                case 8: return [2 /*return*/, undefined];
                case 9:
                    if (after.chromeAccountId === undefined) {
                        isChromeAwaited = true;
                        return [2 /*return*/, (0, model_1.chromeNote)(after, 'unset')];
                    }
                    // Where Connect can't run: connected as the extension's account already, so Chrome may be closed, or the session can't move there.
                    if (!(0, model_1.canConnectChrome)(after))
                        return [2 /*return*/, (0, model_1.chromeNote)(after, ((_d = after.chrome) === null || _d === void 0 ? void 0 : _d.as) === after.chromeAccountId ? 'no-browser' : 'blocked')];
                    isChromeAwaited = true;
                    if (hasChromeMissed)
                        return [2 /*return*/, (0, model_1.chromeNote)(after, 'no-browser')
                            // Once this hook is done: the turn waits on it, and Connect's /mcp reconnect waits on the turn.
                        ];
                    // Once this hook is done: the turn waits on it, and Connect's /mcp reconnect waits on the turn.
                    $.clock.after(0, function () { return void connectChrome($).catch(function (error) { return debug($, "Chrome connect failed: ".concat(String(error))); }); });
                    return [2 /*return*/, (0, model_1.chromeNote)(after, 'connecting')];
            }
        });
    });
}
// ---------------------------------------------------------------- wiring
/** The footer's one press: opens the pane, or closes it while it shows. */
function togglePane($) {
    isPaneShown = !isPaneShown;
    return isPaneShown ? $.ui.open({ id: PANE, title: TITLE, columns: PANE_COLUMNS }) : $.ui.close({ id: PANE });
}
/** After a /login, which signs in the login this session is on: who it is now, and a move off it when that is another login's account. */
function checkActive($) {
    return __awaiter(this, void 0, void 0, function () {
        var view;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getView($)];
                case 1:
                    view = _a.sent();
                    return [4 /*yield*/, act($, 'POST', "/accounts/".concat(view.activeId, "/check"), { fresh: true })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, maybeRotate($)];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/** Rotate now: moves to the login the pane's Rotation setting picks, as the rotation would once this one runs low; with it off, the most room. */
function rotate($) {
    return __awaiter(this, void 0, void 0, function () {
        var view, target, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, getView($)];
                case 1:
                    view = _c.sent();
                    _a = model_1.pickTarget;
                    _b = [__assign(__assign({}, view), { accounts: view.accounts.filter(function (a) { var _a; return !((_a = view.retiring) === null || _a === void 0 ? void 0 : _a.includes(a.id)); }) })];
                    return [4 /*yield*/, $.clock.now()];
                case 2:
                    target = _a.apply(void 0, _b.concat([_c.sent()]));
                    if (!(target === undefined)) return [3 /*break*/, 3];
                    tell($, 'No other Claude account can take over right now.');
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, switchTo($, target, 'you pressed Rotate now')];
                case 4:
                    _c.sent();
                    _c.label = 5;
                case 5: return [2 /*return*/];
            }
        });
    });
}
function removeAccount($, id) {
    return __awaiter(this, void 0, void 0, function () {
        var error_8;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, setView($, function (v) { return (__assign(__assign({}, v), { removing: undefined })); })];
                case 1:
                    _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, act($, 'POST', "/accounts/".concat(id, "/remove"))];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    error_8 = _a.sent();
                    if (error_8 instanceof CoordinatorError)
                        tell($, error_8.message);
                    else
                        throw error_8;
                    return [3 /*break*/, 5];
                case 5: return [4 /*yield*/, maybeRotate($)];
                case 6:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/** Every press starts its work in the background: a sign-in outlives the press. */
function actions($) {
    var _this = this;
    var background = function (work) {
        work.catch(function (error) { return tell($, "Something went wrong: ".concat(error instanceof Error ? error.message : String(error))); });
    };
    return {
        togglePane: function () { return background(togglePane($)); },
        rotate: function () { return background(rotate($)); },
        signInAll: function () { return background(act($, 'POST', '/signin', {})); },
        signInOne: function (id) { return background(act($, 'POST', '/signin', { accountId: id })); },
        cancelSignIn: function () { return background(act($, 'POST', '/signin/cancel')); },
        add: function () { return background(act($, 'POST', '/accounts')); },
        use: function (id) {
            return background(getView($).then(function (view) {
                var account = view.accounts.find(function (a) { return a.id === id; });
                if (account === undefined)
                    return false;
                return switchTo($, account, 'you picked it').then(function (isMoved) { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0:
                                if (!isMoved) return [3 /*break*/, 2];
                                return [4 /*yield*/, setView($, function (v) { return (v.pending === undefined ? v : __assign(__assign({}, v), { pending: __assign(__assign({}, v.pending), { isPicked: true }) })); })];
                            case 1:
                                _a.sent();
                                _a.label = 2;
                            case 2: return [2 /*return*/, isMoved];
                        }
                    });
                }); });
            }));
        },
        askRemove: function (id) { return background(setView($, function (v) { return (__assign(__assign({}, v), { removing: id })); })); },
        remove: function (id) { return background(removeAccount($, id)); },
        setFooter: function (change) { return background(act($, 'PATCH', '/settings', { footer: change })); },
        setRotateTo: function (rotateTo) { return background(act($, 'PATCH', '/settings', { rotateTo: rotateTo })); },
        tryChromeAccount: function (id) { return background(tryChromeAccount($, id)); },
        toggleChromeOthers: function () { return background(setView($, function (v) { return (__assign(__assign({}, v), { isChromeOthersShown: !v.isChromeOthersShown })); })); },
        connectChrome: function () { return background(connectChrome($)); },
        setDemo: function (on) { return background(setView($, function (v) { return (__assign(__assign({}, v), { demo: on })); })); },
        retryCoordinator: function () { return background(ensureCoordinator($).then(function () { return registerSession($); })); },
    };
}
/** The process this session runs as: the parent of a shell it starts. */
function sessionPid($) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, exitCode, stdout, pid;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, $.process.run(['/bin/sh', '-c', 'echo $PPID'], { timeoutMs: 5000 }).catch(function () { return ({ exitCode: -1, stdout: '' }); })];
                case 1:
                    _a = _b.sent(), exitCode = _a.exitCode, stdout = _a.stdout;
                    pid = Number(stdout.trim());
                    return [2 /*return*/, exitCode === 0 && Number.isInteger(pid) && pid > 1 ? pid : undefined];
            }
        });
    });
}
/** Joins the coordinator (starting it where none runs), then follows it; Claude in Chrome connects as the extension's account first. */
function boot($, isInteractive) {
    return __awaiter(this, void 0, void 0, function () {
        var hasFontBlocks, sessionId, slot, pid, cwd, context, error_9, _a, _b;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, $.env.get('TERM_PROGRAM')];
                case 1:
                    hasFontBlocks = (_d.sent()) === 'Apple_Terminal';
                    return [4 /*yield*/, $.session.id().catch(function () { return undefined; })];
                case 2:
                    sessionId = _d.sent();
                    return [4 /*yield*/, setView($, function (v) { return (__assign(__assign(__assign({}, v), { hasFontBlocks: hasFontBlocks }), (sessionId === undefined ? {} : { sessionId: sessionId }))); })
                        // A session started with its own CLAUDE_CONFIG_DIR reads its login there, unless the mod moved it.
                    ];
                case 3:
                    _d.sent();
                    return [4 /*yield*/, $.env.get('CLAUDE_SECURESTORAGE_CONFIG_DIR')];
                case 4:
                    slot = (_c = (_d.sent())) !== null && _c !== void 0 ? _c : '';
                    return [4 /*yield*/, sessionPid($)];
                case 5:
                    pid = _d.sent();
                    return [4 /*yield*/, $.session.cwd().catch(function () { return undefined; })];
                case 6:
                    cwd = _d.sent();
                    return [4 /*yield*/, noteModel($)];
                case 7:
                    _d.sent();
                    return [4 /*yield*/, $.session.usage().then(function (u) { return u.context.percent; }).catch(function () { return undefined; })];
                case 8:
                    context = _d.sent();
                    if (!(context !== undefined)) return [3 /*break*/, 10];
                    return [4 /*yield*/, setView($, function (v) { return (__assign(__assign({}, v), { contextPct: context })); })];
                case 9:
                    _d.sent();
                    _d.label = 10;
                case 10:
                    void refreshWork($).catch(function (error) { return debug($, "reading the branch failed: ".concat(String(error))); });
                    session = __assign(__assign({ key: "".concat(sessionId !== null && sessionId !== void 0 ? sessionId : 'session', ":").concat(pid !== null && pid !== void 0 ? pid : Math.random().toString(36).slice(2)), slot: slot, isInteractive: isInteractive }, (pid === undefined ? {} : { pid: pid })), (cwd === undefined ? {} : { cwd: cwd }));
                    _d.label = 11;
                case 11:
                    _d.trys.push([11, 14, , 16]);
                    return [4 /*yield*/, ensureCoordinator($)];
                case 12:
                    _d.sent();
                    return [4 /*yield*/, registerSession($)];
                case 13:
                    _d.sent();
                    return [3 /*break*/, 16];
                case 14:
                    error_9 = _d.sent();
                    return [4 /*yield*/, setView($, function (v) { return (__assign(__assign({}, v), { coordinator: { error: error_9 instanceof Error ? error_9.message : String(error_9) } })); })];
                case 15:
                    _d.sent();
                    return [3 /*break*/, 16];
                case 16: return [4 /*yield*/, checkSwitching($, slot)
                    // First, while the session can still move: the rotation waits for it.
                ];
                case 17:
                    _d.sent();
                    _a = isInteractive;
                    if (!_a) return [3 /*break*/, 19];
                    _b = shouldConnectAtOpen;
                    return [4 /*yield*/, getView($)];
                case 18:
                    _a = _b.apply(void 0, [_d.sent()]);
                    _d.label = 19;
                case 19:
                    // First, while the session can still move: the rotation waits for it.
                    if (_a) {
                        void connectChrome($, true).catch(function (error) { return debug($, "Chrome connect failed: ".concat(String(error))); });
                    }
                    return [4 /*yield*/, maybeRotate($)];
                case 20:
                    _d.sent();
                    void watch($).catch(function (error) { return debug($, "stopped following the coordinator: ".concat(String(error))); });
                    return [2 /*return*/];
            }
        });
    });
}
var register = function (on) {
    on('session.start', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var started;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, next(e)];
                case 1:
                    started = _a.sent();
                    void boot($, e.isInteractive).catch(function (error) { return debug($, "start failed: ".concat(String(error))); });
                    void $.ui.panes().then(function (panes) {
                        isPaneShown = panes.some(function (p) { return p.id === PANE && p.isShown; });
                    });
                    // A switch settles, and a window resets, with no change at the coordinator to say so.
                    $.clock.every(60000, function () {
                        scheduleWork($);
                        void noteModel($)
                            .then(function () { return settlePending($, false); })
                            .then(function () { return maybeRotate($); })
                            .catch(function (error) { return debug($, "sync failed: ".concat(String(error))); });
                    });
                    return [2 /*return*/, started];
            }
        });
    }); });
    on('session.end', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (session !== undefined)
                void api($, 'DELETE', "/sessions/".concat(encodeURIComponent(session.key))).catch(function () { return undefined; });
            return [2 /*return*/, next(e)];
        });
    }); }).catch(function ($, e, next) { return next(e); });
    on('turn.start', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            turns.add(e.turnId);
            return [2 /*return*/, next(e)];
        });
    }); });
    on('turn.complete', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            turns.delete(e.turnId);
            scheduleWork($);
            return [2 /*return*/, next(e)];
        });
    }); });
    // The footer's branch: a Bash command may move the work (`cd`), commit or push; a file edit leaves changes uncommitted.
    on('tool.call', { tool: /^(Bash|Edit|MultiEdit|Write|NotebookEdit)$/ }, function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var done;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, next(e)];
                case 1:
                    done = _a.sent();
                    if (e.tool === 'Bash')
                        void onBash($, e.command).catch(function (error) { return debug($, "reading the branch failed: ".concat(String(error))); });
                    else
                        scheduleWork($);
                    return [2 /*return*/, done];
            }
        });
    }); }).catch(function ($, e, next) { return next(e); });
    // The footer names the model as soon as /model changes it.
    on('command.run', { command: 'model' }, function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var ran;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, next(e)];
                case 1:
                    ran = _a.sent();
                    void noteModel($).catch(function (error) { return debug($, "reading the model failed: ".concat(String(error))); });
                    return [2 /*return*/, ran];
            }
        });
    }); }).catch(function ($, e, next) { return next(e); });
    // The permission mode's words under the prompt, shortened: `⏵⏵ bypass permissions on (shift+tab to cycle)` as `⏵⏵ bypass`.
    on('ui.render', { component: 'PromptHint' }, function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var hint;
        return __generator(this, function (_a) {
            hint = (0, work_1.shortHint)(e.props.hint);
            return [2 /*return*/, next(hint === e.props.hint ? e : __assign(__assign({}, e), { props: __assign(__assign({}, e.props), { hint: hint }) }))];
        });
    }); });
    on('session.measure', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var contextPct;
        return __generator(this, function (_a) {
            contextPct = e.context.percent;
            if (e.changed.includes('context') && contextPct !== undefined) {
                void setView($, function (v) { return (__assign(__assign({}, v), { contextPct: contextPct })); }).catch(function (error) { return debug($, "context failed: ".concat(String(error))); });
            }
            if (e.changed.includes('rateLimits')) {
                void onMeasure($, e.rateLimits).catch(function (error) { return debug($, "measure failed: ".concat(String(error))); });
            }
            return [2 /*return*/, next(e)];
        });
    }); });
    on('classic.StopFailure', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            void onStopFailure($, e.error).catch(function (error) { return debug($, "stop failure handling failed: ".concat(String(error))); });
            return [2 /*return*/, next(e)];
        });
    }); }).catch(function ($, e, next) { return next(e); });
    // Typed at the prompt, /login answers once its sign-in is done; run mid-turn, at once, and the checks find it later.
    on('command.run', { command: 'login' }, function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var ran;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, next(e)];
                case 1:
                    ran = _a.sent();
                    void checkActive($).catch(function (error) { return debug($, "check after /login failed: ".concat(String(error))); });
                    return [2 /*return*/, ran];
            }
        });
    }); }).catch(function ($, e, next) { return next(e); });
    // While Connect is under way a browser call would connect as the login being left: Claude waits, and is told when to carry on.
    on('tool.check', { tool: model_1.CHROME_TOOL }, function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var _a;
        var _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!isConnectingChrome || isAskingChrome)
                        return [2 /*return*/, next(e)];
                    if (e.tool_use_id !== undefined)
                        isChromeAwaited = true;
                    _b = { decision: 'deny' };
                    _a = model_1.chromeNote;
                    return [4 /*yield*/, getView($)];
                case 1: return [2 /*return*/, (_b.reason = _a.apply(void 0, [_c.sent(), 'held']), _b)];
            }
        });
    }); }).catch(function ($, e, next) { return next(e); });
    // Claude Code's words for a browser call that found no browser send the person to /login, which here signs in the wrong account.
    on('tool.call', { tool: model_1.CHROME_TOOL }, function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var done, note;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, next(e)
                    // The mod's own question to Claude in Chrome is answered where it asked.
                ];
                case 1:
                    done = _c.sent();
                    // The mod's own question to Claude in Chrome is answered where it asked.
                    if (done.deny !== undefined || isAskingChrome)
                        return [2 /*return*/, done];
                    return [4 /*yield*/, onBrowserCall($, (0, model_1.isUnansweredCall)(e.tool, (_a = done.text) !== null && _a !== void 0 ? _a : '', done.isError === true)).catch(function (error) { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, debug($, "browser call handling failed: ".concat(String(error)))];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/, undefined];
                                }
                            });
                        }); })];
                case 2:
                    note = _c.sent();
                    return [2 /*return*/, note === undefined ? done : __assign(__assign({}, done), { context: __spreadArray(__spreadArray([], ((_b = done.context) !== null && _b !== void 0 ? _b : []), true), [note], false) })];
            }
        });
    }); }).catch(function ($, e, next) { return next(e); });
    on('ui.close', function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (e.id === PANE)
                isPaneShown = false;
            return [2 /*return*/, next(e)];
        });
    }); });
    on('ui.render', { component: 'SessionMode' }, function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var view, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, getView($)];
                case 1:
                    view = _c.sent();
                    if (view.accounts.length === 0)
                        return [2 /*return*/, next(e)];
                    _a = view_1.Footer;
                    _b = [$.ui.resolve(e), view, e.props.modes];
                    return [4 /*yield*/, $.clock.now()];
                case 2: return [2 /*return*/, _a.apply(void 0, _b.concat([_c.sent(), actions($)]))];
            }
        });
    }); });
    on('ui.render', { component: 'AbovePrompt' }, function ($, e, next) { return __awaiter(void 0, void 0, void 0, function () {
        var view, _a, _b;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    if (e.props.hasSurvey)
                        return [2 /*return*/, next(e)];
                    return [4 /*yield*/, getView($)];
                case 1:
                    view = _d.sent();
                    _a = view_1.Band;
                    _b = [$.ui.resolve(e), view];
                    return [4 /*yield*/, $.clock.now()];
                case 2: return [2 /*return*/, (_c = _a.apply(void 0, _b.concat([_d.sent(), actions($)]))) !== null && _c !== void 0 ? _c : next(e)];
            }
        });
    }); });
    on('ui.render', { component: 'Pane', requestId: PANE }, function ($, e) { return __awaiter(void 0, void 0, void 0, function () {
        var view, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, getView($)];
                case 1:
                    view = _c.sent();
                    _a = view_1.Pane;
                    _b = [$.ui.resolve(e), view];
                    return [4 /*yield*/, $.clock.now()];
                case 2: return [2 /*return*/, _a.apply(void 0, _b.concat([_c.sent(), actions($)]))];
            }
        });
    }); });
};
exports.register = register;
