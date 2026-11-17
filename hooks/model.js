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
exports.isSeatPlan = exports.CHROME_TOOL = exports.CHROME_SERVER = exports.SOONER_BY_MS = exports.ROTATE_TOS = exports.FILLS = exports.HIGHLIGHTS = exports.GLYPHS = exports.EMPTY_VIEW = exports.DEFAULT_ROTATE_TO = exports.DEFAULT_FOOTER = exports.SIGN_IN_WARN_MS = exports.LEAVE_SEVEN_DAY = exports.LEAVE_FIVE_HOUR = void 0;
exports.rotateToFrom = rotateToFrom;
exports.footerStyleFrom = footerStyleFrom;
exports.windowPct = windowPct;
exports.availableNow = availableNow;
exports.scopeOf = scopeOf;
exports.viewScope = viewScope;
exports.modelWindow = modelWindow;
exports.isSpent = isSpent;
exports.shouldLeave = shouldLeave;
exports.limitingWindow = limitingWindow;
exports.hasFiveHour = hasFiveHour;
exports.roomOf = roomOf;
exports.soonerTarget = soonerTarget;
exports.spentReading = spentReading;
exports.pickTarget = pickTarget;
exports.nextReset = nextReset;
exports.readingFromUsage = readingFromUsage;
exports.readingFromLimits = readingFromLimits;
exports.sameUsage = sameUsage;
exports.credentialFrom = credentialFrom;
exports.healthOf = healthOf;
exports.shown = shown;
exports.roomLeft = roomLeft;
exports.roomColor = roomColor;
exports.bar = bar;
exports.braille = braille;
exports.pie = pie;
exports.glyph = glyph;
exports.longBar = longBar;
exports.untilText = untilText;
exports.label = label;
exports.keychainItem = keychainItem;
exports.fingerprint = fingerprint;
exports.credentialsFile = credentialsFile;
exports.slotEnv = slotEnv;
exports.isPolicyRefusal = isPolicyRefusal;
exports.isOnNormalLogin = isOnNormalLogin;
exports.blockedAdvice = blockedAdvice;
exports.blockedText = blockedText;
exports.browsersFrom = browsersFrom;
exports.isUnansweredCall = isUnansweredCall;
exports.isNoBrowser = isNoBrowser;
exports.canConnectChrome = canConnectChrome;
exports.resumeCommand = resumeCommand;
exports.chromeNote = chromeNote;
exports.keychainUser = keychainUser;
exports.freeId = freeId;
exports.identityFromStatus = identityFromStatus;
exports.sameLogin = sameLogin;
exports.isLoginOf = isLoginOf;
exports.identityFromProfile = identityFromProfile;
exports.planText = planText;
exports.weightOf = weightOf;
exports.combinedUsage = combinedUsage;
/** Leave a login once its 5-hour window is this full (percent). */
exports.LEAVE_FIVE_HOUR = 90;
/** Leave a login once its weekly window is this full (percent). */
exports.LEAVE_SEVEN_DAY = 98;
/** Warn this long before a login's refresh token runs out. */
exports.SIGN_IN_WARN_MS = 3 * 24 * 3600000;
exports.DEFAULT_FOOTER = { session: 'braille', week: 'bars', sessionPercent: true, weekPercent: true, active: 'lines', fill: 'left' };
exports.DEFAULT_ROTATE_TO = 'reset';
exports.EMPTY_VIEW = {
    accounts: [],
    readings: {},
    health: {},
    holders: {},
    activeId: '1',
    footer: exports.DEFAULT_FOOTER,
    rotateTo: exports.DEFAULT_ROTATE_TO,
    hasFontBlocks: false,
};
exports.GLYPHS = ['bars', 'pie', 'braille', 'none'];
exports.HIGHLIGHTS = ['lines', 'tile', 'dim'];
exports.FILLS = ['left', 'used'];
exports.ROTATE_TOS = ['reset', 'room', 'order', 'off'];
var isOneOf = function (value, allowed) {
    return typeof value === 'string' && allowed.includes(value);
};
/** Which login the rotation moves to, as stored; unknown is the default's. */
function rotateToFrom(value) {
    return isOneOf(value, exports.ROTATE_TOS) ? value : exports.DEFAULT_ROTATE_TO;
}
/** The footer's look as stored; any part missing or unknown is the default's. */
function footerStyleFrom(value) {
    var v = typeof value === 'object' && value !== null ? value : {};
    return {
        session: isOneOf(v.session, exports.GLYPHS) ? v.session : exports.DEFAULT_FOOTER.session,
        week: isOneOf(v.week, exports.GLYPHS) ? v.week : exports.DEFAULT_FOOTER.week,
        sessionPercent: typeof v.sessionPercent === 'boolean' ? v.sessionPercent : exports.DEFAULT_FOOTER.sessionPercent,
        weekPercent: typeof v.weekPercent === 'boolean' ? v.weekPercent : exports.DEFAULT_FOOTER.weekPercent,
        active: isOneOf(v.active, exports.HIGHLIGHTS) ? v.active : exports.DEFAULT_FOOTER.active,
        fill: isOneOf(v.fill, exports.FILLS) ? v.fill : exports.DEFAULT_FOOTER.fill,
    };
}
/** A window's percent now: 0 once its reset time has passed. */
function windowPct(w, now) {
    if (w === undefined)
        return undefined;
    if (w.resetsAt !== undefined && Date.parse(w.resetsAt) <= now)
        return 0;
    return w.pct;
}
/**
 * What a login can serve right now, percent of its 5-hour window: a week's
 * percent is a far bigger budget, so the session decides until the week is
 * spent, and then nothing is. Undefined before any 5-hour reading.
 */
function availableNow(r, now) {
    var _a;
    var five = roomLeft(r === null || r === void 0 ? void 0 : r.fiveHour, now);
    if (five === undefined)
        return undefined;
    return ((_a = windowPct(r === null || r === void 0 ? void 0 : r.sevenDay, now)) !== null && _a !== void 0 ? _a : 0) >= exports.LEAVE_SEVEN_DAY ? 0 : five;
}
/**
 * Which of the logins' model weeks a model falls under, by name: `Fable` for
 * `claude-fable-5-2` or "Fable 5.2". Undefined for a model with no week of its
 * own (Opus, Sonnet), which only the login's week limits.
 */
function scopeOf(model, readings) {
    if (model === undefined || model === '')
        return undefined;
    var m = model.toLowerCase();
    var names = new Set(Object.values(readings).flatMap(function (r) { var _a; return Object.keys((_a = r.models) !== null && _a !== void 0 ? _a : {}); }));
    return __spreadArray([], names, true).find(function (name) { return m.includes(name.toLowerCase()); });
}
/** The model week this session's model falls under, if any. */
function viewScope(view) {
    return scopeOf(view.model, view.readings);
}
/** A login's week for one model family, by name. */
function modelWindow(r, scope) {
    var _a;
    return scope === undefined ? undefined : (_a = r === null || r === void 0 ? void 0 : r.models) === null || _a === void 0 ? void 0 : _a[scope];
}
/** Past a leave threshold: the 5-hour window, the week, or (for a session on such a model) the model's own week. */
function isSpent(r, now, scope) {
    var _a, _b, _c;
    return (((_a = windowPct(r === null || r === void 0 ? void 0 : r.fiveHour, now)) !== null && _a !== void 0 ? _a : 0) >= exports.LEAVE_FIVE_HOUR ||
        ((_b = windowPct(r === null || r === void 0 ? void 0 : r.sevenDay, now)) !== null && _b !== void 0 ? _b : 0) >= exports.LEAVE_SEVEN_DAY ||
        ((_c = windowPct(modelWindow(r, scope), now)) !== null && _c !== void 0 ? _c : 0) >= exports.LEAVE_SEVEN_DAY);
}
function shouldLeave(view, now) {
    var _a, _b;
    return (((_a = view.health[view.activeId]) === null || _a === void 0 ? void 0 : _a.kind) === 'login-needed' ||
        ((_b = view.retiring) === null || _b === void 0 ? void 0 : _b.includes(view.activeId)) === true ||
        isSpent(view.readings[view.activeId], now, viewScope(view)));
}
/**
 * The window that limits a login: its 5-hour window where its plan reports
 * one, else its week. As of November 2026 Claude has no 5-hour limit, so
 * this is the week; a plan that reports one again gets it back.
 */
function limitingWindow(r) {
    return (r === null || r === void 0 ? void 0 : r.fiveHour) !== undefined ? 'fiveHour' : 'sevenDay';
}
/** Whether any login reports a 5-hour window: without one, the footer, pane and menu bar show only the week. */
function hasFiveHour(readings) {
    return Object.values(readings).some(function (r) { return r.fiveHour !== undefined; });
}
/**
 * The room a login has to rotate to: what it can serve right now, or its
 * week's room where it reports no 5-hour window; for a session on a model with
 * a week of its own, the smaller of that and the model's week's room.
 */
function roomOf(r, now, scope) {
    var _a;
    var room = (_a = availableNow(r, now)) !== null && _a !== void 0 ? _a : roomLeft(r === null || r === void 0 ? void 0 : r.sevenDay, now);
    var model = roomLeft(modelWindow(r, scope), now);
    return model === undefined ? room : room === undefined ? model : Math.min(room, model);
}
/**
 * When a login's week resets, epoch ms (its 5-hour window's where it reports
 * no week); Infinity with no reset to come. The week is the room that is lost
 * if it isn't used before it refills: a 5-hour window resets within hours, so
 * ranking by it would always put the $100 Max plan first. A week at 0% still
 * counts: the usage endpoint gives it a reset.
 */
function limitReset(r, now) {
    var _a, _b;
    var resetsAt = (_b = ((_a = r === null || r === void 0 ? void 0 : r.sevenDay) !== null && _a !== void 0 ? _a : r === null || r === void 0 ? void 0 : r.fiveHour)) === null || _b === void 0 ? void 0 : _b.resetsAt;
    var at = resetsAt === undefined ? NaN : Date.parse(resetsAt);
    return Number.isFinite(at) && at > now ? at : Infinity;
}
/** How much sooner another login's week must reset before 'soonest reset' moves a session that still has room. */
exports.SOONER_BY_MS = 60 * 60000;
/**
 * With 'soonest reset', where a session whose login still has room goes: the
 * login pickTarget picks, once its week resets at least an hour before the one
 * in use's, so every session uses the room that refills first. The order
 * changes only when a login fills or resets, so rising usage never moves one.
 */
function soonerTarget(view, now) {
    if (view.rotateTo !== 'reset' || shouldLeave(view, now))
        return undefined;
    var target = pickTarget(view, now);
    if (target === undefined)
        return undefined;
    var at = limitReset(view.readings[target.id], now);
    return Number.isFinite(at) && at + exports.SOONER_BY_MS <= limitReset(view.readings[view.activeId], now) ? target : undefined;
}
/** A login's reading once a turn hit its usage limit before its usage showed it: the window that limits it (for a session on a model with its own week, that week), full. */
function spentReading(r, now, scope) {
    var _a, _b;
    var _c, _d, _e, _f;
    // A session on a model with its own week (Fable) that hits a limit while the login's week has room hit that model's week.
    if (scope !== undefined && ((_c = windowPct(r === null || r === void 0 ? void 0 : r.sevenDay, now)) !== null && _c !== void 0 ? _c : 0) < exports.LEAVE_SEVEN_DAY && (r === null || r === void 0 ? void 0 : r.fiveHour) === undefined) {
        var resetsAt_1 = (_e = ((_d = modelWindow(r, scope)) !== null && _d !== void 0 ? _d : r === null || r === void 0 ? void 0 : r.sevenDay)) === null || _e === void 0 ? void 0 : _e.resetsAt;
        return __assign(__assign({}, r), { models: __assign(__assign({}, r === null || r === void 0 ? void 0 : r.models), (_a = {}, _a[scope] = __assign({ pct: 100 }, (resetsAt_1 ? { resetsAt: resetsAt_1 } : {})), _a)), at: now });
    }
    var key = limitingWindow(r);
    var resetsAt = (_f = r === null || r === void 0 ? void 0 : r[key]) === null || _f === void 0 ? void 0 : _f.resetsAt;
    return __assign(__assign({}, r), (_b = {}, _b[key] = __assign({ pct: 100 }, (resetsAt ? { resetsAt: resetsAt } : {})), _b.at = now, _b));
}
/**
 * The signed-in login below both thresholds to move to, as `rotateTo` picks:
 * the one that can serve the most right now (unread counts as fresh); the one
 * whose week resets soonest, so room about to refill is used first,
 * the most room breaking ties; or the next in the list after the one in use.
 * With the rotation off, Rotate now takes the one with the most room.
 */
function pickTarget(view, now) {
    var scope = viewScope(view);
    var ready = view.accounts.filter(function (a) {
        var _a, _b;
        return a.id !== view.activeId &&
            ((_a = view.health[a.id]) === null || _a === void 0 ? void 0 : _a.kind) === 'ok' &&
            ((_b = view.retiring) === null || _b === void 0 ? void 0 : _b.includes(a.id)) !== true &&
            !isSpent(view.readings[a.id], now, scope);
    });
    var available = function (a) { var _a; return (_a = roomOf(view.readings[a.id], now, scope)) !== null && _a !== void 0 ? _a : 100; };
    var byRoom = function (a, b) { return available(b) - available(a); };
    switch (view.rotateTo) {
        case 'room':
        case 'off':
            return ready.sort(byRoom)[0];
        case 'reset': {
            var reset_1 = function (a) { return limitReset(view.readings[a.id], now); };
            return ready.sort(function (a, b) { return (reset_1(a) === reset_1(b) ? byRoom(a, b) : reset_1(a) < reset_1(b) ? -1 : 1); })[0];
        }
        case 'order': {
            var at = view.accounts.findIndex(function (a) { return a.id === view.activeId; });
            var after = __spreadArray(__spreadArray([], view.accounts.slice(at + 1), true), view.accounts.slice(0, at + 1), true);
            return after.find(function (a) { return ready.includes(a); });
        }
    }
}
/** When the soonest spent window among all logins resets, epoch ms. */
function nextReset(view, now) {
    var times = view.accounts.flatMap(function (a) {
        var r = view.readings[a.id];
        return [r === null || r === void 0 ? void 0 : r.fiveHour, r === null || r === void 0 ? void 0 : r.sevenDay]
            .filter(function (w) { var _a; return w !== undefined && w.resetsAt !== undefined && ((_a = windowPct(w, now)) !== null && _a !== void 0 ? _a : 0) > 0; })
            .map(function (w) { var _a; return Date.parse((_a = w.resetsAt) !== null && _a !== void 0 ? _a : ''); });
    });
    return times.length === 0 ? undefined : Math.min.apply(Math, times);
}
function windowFrom(value) {
    if (typeof value !== 'object' || value === null)
        return undefined;
    var _a = value, utilization = _a.utilization, resets_at = _a.resets_at;
    if (typeof utilization !== 'number')
        return undefined;
    return __assign({ pct: utilization }, (typeof resets_at === 'string' ? { resetsAt: resets_at } : {}));
}
/**
 * The weeks a model family has of its own, from the usage body's `limits`:
 * each `weekly_scoped` limit scoped to a model, by the model's display name.
 */
function modelWindowsFrom(limits) {
    var _a;
    if (!Array.isArray(limits))
        return undefined;
    var models = {};
    for (var _i = 0, _b = limits; _i < _b.length; _i++) {
        var limit = _b[_i];
        if (typeof limit !== 'object' || limit === null)
            continue;
        var _c = limit, kind = _c.kind, percent = _c.percent, resets_at = _c.resets_at, scope = _c.scope;
        var model = (_a = scope === null || scope === void 0 ? void 0 : scope.model) === null || _a === void 0 ? void 0 : _a.display_name;
        var surface = scope === null || scope === void 0 ? void 0 : scope.surface;
        if (kind !== 'weekly_scoped' || typeof model !== 'string' || model === '' || surface != null || typeof percent !== 'number')
            continue;
        models[model] = __assign({ pct: percent }, (typeof resets_at === 'string' ? { resetsAt: resets_at } : {}));
    }
    return Object.keys(models).length === 0 ? undefined : models;
}
/** A reading from the body of GET /api/oauth/usage. */
function readingFromUsage(body, now) {
    if (typeof body !== 'object' || body === null)
        return undefined;
    var _a = body, five_hour = _a.five_hour, seven_day = _a.seven_day, limits = _a.limits;
    var fiveHour = windowFrom(five_hour);
    var sevenDay = windowFrom(seven_day);
    var models = modelWindowsFrom(limits);
    if (fiveHour === undefined && sevenDay === undefined && models === undefined)
        return undefined;
    return __assign(__assign(__assign(__assign({}, (fiveHour ? { fiveHour: fiveHour } : {})), (sevenDay ? { sevenDay: sevenDay } : {})), (models ? { models: models } : {})), { at: now });
}
/** A reading from the rate-limit windows the last response reported. */
function readingFromLimits(limits, now) {
    var pick = function (kind) {
        var w = limits.find(function (l) { return l.kind === kind; });
        return w && __assign({ pct: w.percentUsed }, (w.resetsAt ? { resetsAt: w.resetsAt } : {}));
    };
    var fiveHour = pick('five_hour');
    var sevenDay = pick('seven_day');
    if (fiveHour === undefined && sevenDay === undefined)
        return undefined;
    return __assign(__assign(__assign({}, (fiveHour ? { fiveHour: fiveHour } : {})), (sevenDay ? { sevenDay: sevenDay } : {})), { at: now });
}
/** True when two readings agree within a few points on every shared window. */
function sameUsage(a, b, now) {
    if (a === undefined || b === undefined)
        return false;
    var pairs = [
        [a.fiveHour, b.fiveHour],
        [a.sevenDay, b.sevenDay],
    ];
    var shared = pairs.filter(function (_a) {
        var x = _a[0], y = _a[1];
        return x !== undefined && y !== undefined;
    });
    return (shared.length > 0 &&
        shared.every(function (_a) {
            var _b, _c;
            var x = _a[0], y = _a[1];
            return Math.abs(((_b = windowPct(x, now)) !== null && _b !== void 0 ? _b : 0) - ((_c = windowPct(y, now)) !== null && _c !== void 0 ? _c : 0)) <= 3;
        }));
}
function credentialFrom(text) {
    var parsed;
    try {
        parsed = JSON.parse(text);
    }
    catch (_a) {
        // An entry that is not JSON is no usable login: the caller asks for a sign-in.
        return undefined;
    }
    var oauth = parsed === null || parsed === void 0 ? void 0 : parsed.claudeAiOauth;
    if (typeof oauth !== 'object' || oauth === null)
        return undefined;
    var _b = oauth, accessToken = _b.accessToken, expiresAt = _b.expiresAt, refreshTokenExpiresAt = _b.refreshTokenExpiresAt, refreshToken = _b.refreshToken, subscriptionType = _b.subscriptionType;
    if (typeof accessToken !== 'string' || typeof expiresAt !== 'number')
        return undefined;
    return __assign(__assign(__assign({ accessToken: accessToken, expiresAt: expiresAt }, (typeof refreshTokenExpiresAt === 'number' ? { refreshTokenExpiresAt: refreshTokenExpiresAt } : {})), (typeof refreshToken === 'string' ? { refreshToken: refreshToken } : {})), (typeof subscriptionType === 'string' ? { plan: subscriptionType } : {}));
}
/** A login's health from its stored credential alone. */
function healthOf(cred, now) {
    if (cred === undefined)
        return { kind: 'login-needed', why: 'not signed in' };
    if (cred.refreshTokenExpiresAt !== undefined && cred.refreshTokenExpiresAt <= now) {
        return { kind: 'login-needed', why: 'sign-in expired' };
    }
    return __assign({ kind: 'ok' }, (cred.refreshTokenExpiresAt ? { refreshExpiresAt: cred.refreshTokenExpiresAt } : {}));
}
/** The percent a glyph or bar fills to and the footer prints: the room left, or what is used. */
function shown(fill, leftPct) {
    return fill === 'left' ? leftPct : 100 - leftPct;
}
/** Percent of a window still free; undefined when the window has no reading. */
function roomLeft(w, now) {
    var pct = windowPct(w, now);
    return pct === undefined ? undefined : Math.round(100 - pct);
}
/**
 * The color for a percent of room left: green with all of it, through yellow,
 * to red with none (hue 120 down to 0); lighter while the pointer is over it.
 */
function roomColor(leftPct, isLit) {
    if (isLit === void 0) { isLit = false; }
    var hue = Math.max(0, Math.min(100, leftPct)) * 1.2;
    var _a = [0.75, isLit ? 0.72 : 0.55], s = _a[0], l = _a[1];
    var a = s * Math.min(l, 1 - l);
    var channel = function (n) {
        var k = (n + hue / 30) % 12;
        var v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
        return Math.round(v * 255).toString(16).padStart(2, '0');
    };
    return "#".concat(channel(0)).concat(channel(8)).concat(channel(4));
}
var BARS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
/** A vertical bar for a percentage, an eighth to full height. */
function bar(pct) {
    var _a;
    return (_a = BARS[Math.min(7, Math.max(0, Math.round((pct / 100) * 7)))]) !== null && _a !== void 0 ? _a : '█';
}
var BRAILLE = ['⡀', '⣀', '⣄', '⣤', '⣦', '⣶', '⣷', '⣿'];
/** A braille cell filled from the bottom for a percentage, one dot to all eight. */
function braille(pct) {
    var _a;
    return (_a = BRAILLE[Math.min(7, Math.max(0, Math.round((pct / 100) * 7)))]) !== null && _a !== void 0 ? _a : '⣿';
}
var PIES = ['○', '◔', '◑', '◕', '●'];
/** A pie for a percentage, empty to full in quarters; a dot when unknown. */
function pie(pct) {
    var _a;
    if (pct === undefined)
        return '·';
    return (_a = PIES[Math.min(4, Math.max(0, Math.round(pct / 25)))]) !== null && _a !== void 0 ? _a : '●';
}
/** One login's glyph for a percentage in a footer row's style. */
function glyph(style, pct) {
    switch (style) {
        case 'bars':
            return bar(pct);
        case 'pie':
            return pie(pct);
        case 'braille':
            return braille(pct);
        case 'none':
            return '';
    }
}
/** A ten-cell bar for the pane, filled by a percentage. */
function longBar(pct) {
    if (pct === undefined)
        return '··········';
    var full = Math.min(10, Math.max(0, Math.round(pct / 10)));
    return '▰'.repeat(full) + '▱'.repeat(10 - full);
}
/** "in 1h 20m", "in 3d 4h": relative, so it needs no time zone. */
function untilText(at, now) {
    if (at === undefined)
        return '';
    var ms = (typeof at === 'string' ? Date.parse(at) : at) - now;
    if (!Number.isFinite(ms))
        return '';
    if (ms <= 0)
        return 'now';
    var minutes = Math.round(ms / 60000);
    if (minutes < 60)
        return "in ".concat(minutes, "m");
    var hours = Math.floor(minutes / 60);
    if (hours < 24)
        return "in ".concat(hours, "h ").concat(minutes % 60, "m");
    return "in ".concat(Math.floor(hours / 24), "d ").concat(hours % 24, "h");
}
function label(account) {
    if (account === undefined)
        return '?';
    if (account.email === undefined)
        return account.id;
    return "".concat(account.id, " (").concat(account.email).concat(account.orgName ? " \u00B7 ".concat(account.orgName) : '', ")");
}
/**
 * The keychain entry Claude Code keeps a slot's login in. Mirrors Claude Code
 * 2.1.296: the normal login has no suffix; any other slot is suffixed with
 * the first 8 hex digits of the SHA-256 of its directory, NFC-normalized.
 */
function keychainItem(slot) {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (slot === '')
                        return [2 /*return*/, 'Claude Code-credentials'];
                    _a = "Claude Code-credentials-".concat;
                    return [4 /*yield*/, sha256(slot.normalize('NFC'))];
                case 1: return [2 /*return*/, _a.apply("Claude Code-credentials-", [(_b.sent()).slice(0, 8)])];
            }
        });
    });
}
function sha256(text) {
    return __awaiter(this, void 0, void 0, function () {
        var digest;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))];
                case 1:
                    digest = _a.sent();
                    return [2 /*return*/, __spreadArray([], new Uint8Array(digest), true).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('')];
            }
        });
    });
}
/** A digest of a sign-in's token: tells a new sign-in from the one asked about, without keeping the token. */
function fingerprint(token) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, sha256(token)];
                case 1: return [2 /*return*/, (_a.sent()).slice(0, 16)];
            }
        });
    });
}
/**
 * The file Claude Code keeps a slot's login in where there is no keychain
 * (Linux): where 2.1.296 puts it for a `claude` child run with `slotEnv`, the
 * normal login's in ~/.claude and any other slot's in its own directory,
 * NFC-normalized. Undefined for the normal login with no home. A session
 * started with CLAUDE_CONFIG_DIR set keeps its normal login in that directory
 * instead, which this misses as `keychainItem` does on macOS.
 */
function credentialsFile(slot, home) {
    var dir = slot === '' ? home && "".concat(home, "/.claude") : slot;
    return dir ? "".concat(dir.normalize('NFC'), "/.credentials.json") : undefined;
}
/** The environment that points a `claude` child at a slot's login. */
function slotEnv(slot) {
    return slot === ''
        ? { CLAUDE_SECURESTORAGE_CONFIG_DIR: '' }
        : { CLAUDE_SECURESTORAGE_CONFIG_DIR: slot, CLAUDE_CONFIG_DIR: slot };
}
/**
 * Whether an error is Claude Code's security default refusing the switch: in
 * a session on a Team or Enterprise account, or on a machine with managed
 * settings, it keeps a plugin you install from changing where sign-ins are read.
 */
function isPolicyRefusal(error) {
    return String(error).includes('is not for plugins outside policy to change');
}
/** Whether this session reads the normal login, the one `/login` signs in, rather than a slot the mod moved it to. */
function isOnNormalLogin(view) {
    var _a, _b;
    return ((_b = (_a = view.accounts.find(function (a) { return a.id === view.activeId; })) === null || _a === void 0 ? void 0 : _a.slot) !== null && _b !== void 0 ? _b : '') === '';
}
/**
 * Why switching is blocked, and how to get a session that can switch. One on
 * the normal login started on a Team seat: signing that login in to a personal
 * account fixes the next session. One on a seat reloaded plugins there, or
 * started there, as `/restart` keeps the slot in use; a new session from the
 * terminal starts on the normal login already. `/login` there would sign in
 * the seat instead, as sign-ins follow the slot in use.
 */
function blockedAdvice(isNormalLogin) {
    return isNormalLogin
        ? "Claude Code doesn't let plugins switch accounts in a session that starts on a Team or Enterprise account. " +
            'Fix: /login with your personal (Pro or Max) account, then restart Claude.'
        : "Claude Code doesn't let plugins switch accounts once a session on a Team or Enterprise account starts or reloads plugins. " +
            'Fix: quit Claude and run `claude --continue` or `claude --resume`. Not /restart, which keeps this account.';
}
/** What the mod says once Claude Code's security default refuses switching. */
function blockedText(isNormalLogin) {
    return ("Can't switch accounts in this session. ".concat(blockedAdvice(isNormalLogin), " ") +
        'More: https://github.com/ndbroadbent/claude-account-rotator#team-and-enterprise-accounts');
}
/** The MCP server Claude Code runs Claude in Chrome as, and the names of its tools. */
exports.CHROME_SERVER = 'claude-in-chrome';
exports.CHROME_TOOL = /^mcp__claude-in-chrome__/;
/**
 * How many browsers `list_connected_browsers` lists: the Chrome extensions
 * signed in to the account Claude in Chrome connected as. Undefined for an
 * answer that is no list.
 */
function browsersFrom(text) {
    try {
        var parsed = JSON.parse(text);
        return Array.isArray(parsed) ? parsed.length : undefined;
    }
    catch (_a) {
        // Words, not a list: an error, which counts no browsers either way.
        return undefined;
    }
}
/** How Claude Code's words for a browser call that found no browser begin, as a whole result rather than words on a page. */
var NO_BROWSER_START = /^\s*(?:Error:\s*)?(?:Browser extension is not connected|No Chrome extension connected|[^\n]{0,80}isn't paired with your browser)/;
/**
 * Whether a browser call found no browser. Claude Code answers that as an
 * error, or as an ordinary result: one counts when it begins with its words
 * (a page's own text that mentions them doesn't), and list_connected_browsers
 * when it lists none.
 */
function isUnansweredCall(tool, text, isError) {
    if (isNoBrowser(text) && (isError || NO_BROWSER_START.test(text)))
        return true;
    return tool.endsWith('__list_connected_browsers') && browsersFrom(text) === 0;
}
/** Whether a browser call's error says no browser answered, as Claude Code words it over its bridge or its local socket. */
function isNoBrowser(text) {
    return /Browser extension is not connected|isn't paired with your browser|No Chrome extension connected/.test(text);
}
/**
 * Whether Connect can run in a session: an account is named for the Chrome
 * extension, and the session is on it or free to move there.
 */
function canConnectChrome(view) {
    var own = view.chromeAccountId;
    return own !== undefined && view.hasChrome !== false && (!view.isSwitchBlocked || view.activeId === own);
}
/** What brings this conversation back in a new session, which starts on Claude Code's login, free to switch. */
function resumeCommand(view) {
    return view.sessionId === undefined ? 'claude --continue' : "claude --resume ".concat(view.sessionId);
}
/**
 * What Claude reads about Claude in Chrome, in place of Claude Code's advice
 * to /login, which in a session the mod moved signs in the account the
 * session is on: what happens now, and what to tell the user.
 */
function chromeNote(view, kind) {
    var _a, _b, _c, _d;
    var named = function (id) {
        var a = view.accounts.find(function (x) { return x.id === id; });
        return a === undefined ? undefined : "Claude account ".concat(a.id).concat(a.email === undefined ? '' : " (".concat(a.email, ")"));
    };
    var own = "".concat((_a = named(view.chromeAccountId)) !== null && _a !== void 0 ? _a : 'one account', ", the account the user's Chrome extension is signed in to");
    var as = named((_b = view.chrome) === null || _b === void 0 ? void 0 : _b.as);
    var found = as === undefined ? 'Claude in Chrome found no browser.' : "Claude in Chrome connected as ".concat(as, " and found no browser.");
    var wait = "End your turn now: you'll get a message once it's connected.";
    var noLogin = "Don't suggest /login: it doesn't fix this.";
    switch (kind) {
        case 'held':
            return "The account-rotator mod is connecting Claude in Chrome as ".concat(own, ", which takes under a minute; browser calls wait until then. ").concat(wait);
        case 'connecting':
            return "".concat(found, " The account-rotator mod is now ").concat(((_c = view.chrome) === null || _c === void 0 ? void 0 : _c.as) === view.chromeAccountId ? 'reconnecting' : 'connecting', " it as ").concat(own, ", which takes under a minute. ").concat(wait, " ").concat(noLogin);
        case 'no-browser':
            return ("No Chrome extension answers as ".concat((_d = named(view.chromeAccountId)) !== null && _d !== void 0 ? _d : 'that account', ", the account picked for it in the Claude accounts panel: Chrome may be closed, its Claude extension signed in with another email, or its connection stuck. ") +
                "Ask the user to open Chrome and check the email its Claude extension is signed in with. If it is another account, they press Use for Chrome or Try to connect next to it under Chrome in the Claude accounts panel (click the usage under the prompt; under Other accounts if it isn't listed). " +
                (canConnectChrome(view)
                    ? "If it matches, they restart Chrome and press Connect above the prompt. You'll get a message once it's connected. ".concat(noLogin)
                    : "If it matches, they restart Chrome, then you try again. ".concat(noLogin)));
        case 'blocked':
            return ("".concat(found, " This session can't connect it as ").concat(own, ": Claude Code doesn't let this session switch accounts. ") +
                "Tell the user that to use Chrome, they quit Claude Code and run `".concat(resumeCommand(view), "` in this terminal, which brings this conversation back with Chrome connected. ").concat(noLogin));
        case 'unset':
            return ("".concat(found, " The user's Chrome extension answers only the Claude account it is signed in to, and the account-rotator mod doesn't know which one that is. ") +
                "Ask the user to press Use for Chrome or Try to connect next to it under Chrome in the Claude accounts panel (click the usage under the prompt; under Other accounts if it isn't listed). You'll get a message once it's connected. ".concat(noLogin));
    }
}
/** The keychain account name Claude Code files its entries under. */
function keychainUser(user) {
    return user !== undefined && /^[a-zA-Z0-9._-]+$/.test(user) ? user : 'claude-code-user';
}
/** The first number from 2 up that no login uses yet. */
function freeId(accounts) {
    var taken = new Set(accounts.map(function (a) { return a.id; }));
    var n = 2;
    while (taken.has(String(n)))
        n += 1;
    return String(n);
}
/** Who a slot is signed in as, from `claude auth status --json`; undefined when signed out. */
function identityFromStatus(stdout) {
    var status;
    try {
        var parsed = JSON.parse(stdout);
        if (typeof parsed !== 'object' || parsed === null)
            return undefined;
        status = parsed;
    }
    catch (_a) {
        // Output that is not JSON leaves who it is unknown; the label falls back to the number.
        return undefined;
    }
    if (status.loggedIn !== true || typeof status.email !== 'string')
        return undefined;
    return __assign(__assign(__assign({ email: status.email }, (typeof status.orgId === 'string' ? { orgId: status.orgId } : {})), (typeof status.orgName === 'string' ? { orgName: status.orgName } : {})), (typeof status.subscriptionType === 'string' ? { plan: status.subscriptionType } : {}));
}
/** The same login: one email in one organization. */
function sameLogin(a, b) {
    var _a, _b;
    return a.email !== undefined && a.email === b.email && ((_a = a.orgId) !== null && _a !== void 0 ? _a : '') === ((_b = b.orgId) !== null && _b !== void 0 ? _b : '');
}
/** A listed login is the account `who` signed in as, as far as it is known: by its email, and its organization once known. */
function isLoginOf(a, who) {
    return a.email !== undefined && a.email === who.email && (a.orgId === undefined || a.orgId === who.orgId);
}
/**
 * Who a token signs in, from the body of GET /api/oauth/profile, which Claude
 * Code asks at a sign-in: email and organization. The plan is the sign-in's own.
 */
function identityFromProfile(body) {
    var field = function (value, key) { return (typeof value === 'object' && value !== null ? value[key] : undefined); };
    var _a = (typeof body === 'object' && body !== null ? body : {}), account = _a.account, organization = _a.organization;
    var _b = [
        field(account, 'email'),
        field(organization, 'uuid'),
        field(organization, 'name'),
        field(organization, 'rate_limit_tier'),
    ], email = _b[0], orgId = _b[1], orgName = _b[2], tier = _b[3];
    if (typeof email !== 'string' || email === '')
        return undefined;
    return __assign(__assign(__assign({ email: email }, (typeof orgId === 'string' ? { orgId: orgId } : {})), (typeof orgName === 'string' ? { orgName: orgName } : {})), (typeof tier === 'string' && tier !== '' ? { tier: tier } : {}));
}
/** A Team or Enterprise plan: Claude Code keeps plugins from switching accounts in a session that starts on one. */
var isSeatPlan = function (plan) { return plan === 'team' || plan === 'enterprise'; };
exports.isSeatPlan = isSeatPlan;
/** A plan as the pane names it: personal Max or Pro, or a Team or Enterprise seat. */
function planText(plan) {
    switch (plan) {
        case 'max':
            return 'personal Max';
        case 'pro':
            return 'personal Pro';
        case 'team':
            return 'a Team seat';
        case 'enterprise':
            return 'an Enterprise seat';
        default:
            return plan;
    }
}
/**
 * How much weekly usage a login's plan has, in Pros, as claude.com/pricing puts it (November 2026): Ultra
 * (formerly Max 20x, still `default_claude_max_20x` in its rate limit tier) 10, Max (formerly Max 5x) 5, anything
 * else 1. The combined usage weighs each login by it.
 */
function weightOf(account) {
    var _a;
    var tier = (_a = account.tier) !== null && _a !== void 0 ? _a : '';
    if (/max_20x|ultra/.test(tier))
        return 10;
    if (/max_5x/.test(tier))
        return 5;
    return 1;
}
/**
 * Usage across logins, one window at a time: the plan-weighted mean of what
 * each login has used, counting only logins signed in and read. A window past
 * its reset counts as empty. With its soonest reset still to come.
 */
function combinedUsage(accounts, readings, health, now) {
    var combine = function (pick) {
        var _a;
        var total = 0;
        var weights = 0;
        var counted = 0;
        var soonest;
        for (var _i = 0, accounts_1 = accounts; _i < accounts_1.length; _i++) {
            var a = accounts_1[_i];
            if (((_a = health[a.id]) === null || _a === void 0 ? void 0 : _a.kind) === 'login-needed')
                continue;
            var r = readings[a.id];
            var w = r === undefined ? undefined : pick(r);
            var pct = windowPct(w, now);
            if (w === undefined || pct === undefined)
                continue;
            var weight = weightOf(a);
            total += weight * pct;
            weights += weight;
            counted += 1;
            var reset = w.resetsAt === undefined ? NaN : Date.parse(w.resetsAt);
            if (Number.isFinite(reset) && reset > now && (soonest === undefined || reset < soonest))
                soonest = reset;
        }
        if (counted === 0)
            return undefined;
        return __assign({ pct: Math.round((total / weights) * 10) / 10, accounts: counted }, (soonest === undefined ? {} : { nextResetAt: new Date(soonest).toISOString() }));
    };
    var fiveHour = combine(function (r) { return r.fiveHour; });
    var sevenDay = combine(function (r) { return r.sevenDay; });
    return __assign(__assign({}, (fiveHour ? { fiveHour: fiveHour } : {})), (sevenDay ? { sevenDay: sevenDay } : {}));
}
