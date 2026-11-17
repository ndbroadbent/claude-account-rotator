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
var testing_1 = require("claude-code/testing");
var model_1 = require("./model");
var NOW = Date.parse('2026-10-12T10:00:00Z');
var LATER = '2026-10-12T12:00:00Z';
var WEEK_END = '2026-10-18T03:00:00Z';
function view(readings, health, rotateTo) {
    if (health === void 0) { health = {}; }
    if (rotateTo === void 0) { rotateTo = 'room'; }
    var ids = Object.keys(readings);
    return {
        accounts: ids.map(function (id) { return ({ id: id, slot: id === '1' ? '' : "/h/.claude/accounts/".concat(id) }); }),
        readings: Object.fromEntries(ids.map(function (id) {
            var _a;
            var _b = (_a = readings[id]) !== null && _a !== void 0 ? _a : [0, 0], five = _b[0], week = _b[1];
            return [id, { fiveHour: { pct: five, resetsAt: LATER }, sevenDay: { pct: week, resetsAt: WEEK_END }, at: NOW }];
        })),
        health: Object.fromEntries(ids.map(function (id) { var _a; return [id, (_a = health[id]) !== null && _a !== void 0 ? _a : { kind: 'ok' }]; })),
        holders: {},
        activeId: '1',
        footer: model_1.DEFAULT_FOOTER,
        rotateTo: rotateTo,
        hasFontBlocks: false,
    };
}
(0, testing_1.test)('leaves at 90% of the 5-hour window or 98% of the week, and not before', function () {
    (0, testing_1.expect)((0, model_1.shouldLeave)(view({ '1': [89, 97.9] }), NOW)).toBe(false);
    (0, testing_1.expect)((0, model_1.shouldLeave)(view({ '1': [90, 10] }), NOW)).toBe(true);
    (0, testing_1.expect)((0, model_1.shouldLeave)(view({ '1': [10, 98] }), NOW)).toBe(true);
    (0, testing_1.expect)((0, model_1.shouldLeave)(view({ '1': [0, 0] }, { '1': { kind: 'login-needed', why: 'x' } }), NOW)).toBe(true);
});
(0, testing_1.test)('picks the signed-in login with the most room, never a spent or locked one', function () {
    var _a;
    var v = view({ '1': [95, 50], '2': [40, 80], '3': [10, 20], '4': [5, 5] }, { '4': { kind: 'login-needed', why: 'sign-in expired' } });
    (0, testing_1.expect)((_a = (0, model_1.pickTarget)(v, NOW)) === null || _a === void 0 ? void 0 : _a.id).toBe('3');
    (0, testing_1.expect)((0, model_1.pickTarget)(view({ '1': [95, 50], '2': [91, 10] }), NOW)).toBeUndefined();
});
(0, testing_1.test)('ranks logins by what they can serve now: the 5-hour room, nothing once the week is spent', function () {
    var _a;
    // A fresh session with a busy week beats a half-used session with a fresh week.
    (0, testing_1.expect)((_a = (0, model_1.pickTarget)(view({ '1': [95, 50], '2': [10, 80], '3': [50, 0] }), NOW)) === null || _a === void 0 ? void 0 : _a.id).toBe('2');
    (0, testing_1.expect)((0, model_1.availableNow)({ fiveHour: { pct: 10, resetsAt: LATER }, sevenDay: { pct: 80, resetsAt: WEEK_END }, at: NOW }, NOW)).toBe(90);
    (0, testing_1.expect)((0, model_1.availableNow)({ fiveHour: { pct: 10, resetsAt: LATER }, sevenDay: { pct: 98, resetsAt: WEEK_END }, at: NOW }, NOW)).toBe(0);
    (0, testing_1.expect)((0, model_1.availableNow)({ fiveHour: { pct: 97, resetsAt: LATER }, at: NOW }, Date.parse(LATER) + 1)).toBe(100);
});
(0, testing_1.test)('soonest reset moves to the login whose week resets first, never a spent one; a week at 0% counts, one whose reset has passed comes last', function () {
    var _a, _b, _c, _d;
    var weekResets = function (v, id, at) {
        var r = v.readings[id];
        if (r === null || r === void 0 ? void 0 : r.sevenDay)
            r.sevenDay = { pct: r.sevenDay.pct, resetsAt: at };
    };
    // Login 4's week resets first but it is spent; login 3 has less room than 2 but its week resets sooner.
    var v = view({ '1': [95, 50], '2': [10, 10], '3': [60, 0], '4': [10, 99] }, {}, 'reset');
    weekResets(v, '2', '2026-10-16T03:00:00Z');
    weekResets(v, '3', '2026-10-13T03:00:00Z');
    weekResets(v, '4', '2026-10-12T20:00:00Z');
    (0, testing_1.expect)((_a = (0, model_1.pickTarget)(v, NOW)) === null || _a === void 0 ? void 0 : _a.id).toBe('3');
    // The 5-hour windows, which reset within hours, don't order them: the $100 Max plan would always come first.
    var r3 = v.readings['3'];
    if (r3 === null || r3 === void 0 ? void 0 : r3.fiveHour)
        r3.fiveHour = { pct: 60, resetsAt: '2026-10-12T23:00:00Z' };
    var r2 = v.readings['2'];
    if (r2 === null || r2 === void 0 ? void 0 : r2.fiveHour)
        r2.fiveHour = { pct: 10, resetsAt: '2026-10-12T10:30:00Z' };
    (0, testing_1.expect)((_b = (0, model_1.pickTarget)(v, NOW)) === null || _b === void 0 ? void 0 : _b.id).toBe('3');
    // Login 3's week has reset since its reading: no reset to come is known, so it comes last.
    (0, testing_1.expect)((_c = (0, model_1.pickTarget)(v, Date.parse('2026-10-13T03:00:00Z') + 1)) === null || _c === void 0 ? void 0 : _c.id).toBe('2');
    // Two resets at once: the more room wins.
    weekResets(v, '2', '2026-10-13T03:00:00Z');
    (0, testing_1.expect)((_d = (0, model_1.pickTarget)(v, NOW)) === null || _d === void 0 ? void 0 : _d.id).toBe('2');
});
(0, testing_1.test)('with soonest reset, a session with room moves once another login\'s week resets over an hour sooner, and only then', function () {
    var _a;
    var weekResets = function (v, id, at) {
        var r = v.readings[id];
        if (r === null || r === void 0 ? void 0 : r.sevenDay)
            r.sevenDay = { pct: r.sevenDay.pct, resetsAt: at };
    };
    var v = view({ '1': [10, 10], '2': [0, 0], '3': [0, 0] }, {}, 'reset');
    // Every week resets together: nowhere is sooner.
    (0, testing_1.expect)((0, model_1.soonerTarget)(v, NOW)).toBeUndefined();
    weekResets(v, '2', '2026-10-15T03:00:00Z');
    weekResets(v, '3', '2026-10-14T03:00:00Z');
    (0, testing_1.expect)((_a = (0, model_1.soonerTarget)(v, NOW)) === null || _a === void 0 ? void 0 : _a.id).toBe('3');
    // On login 3 it stays: login 2's week resets later, and login 1's later still.
    (0, testing_1.expect)((0, model_1.soonerTarget)(__assign(__assign({}, v), { activeId: '3' }), NOW)).toBeUndefined();
    // Within the hour of the one in use's reset is not sooner enough to move for.
    weekResets(v, '1', '2026-10-14T03:30:00Z');
    (0, testing_1.expect)((0, model_1.soonerTarget)(v, NOW)).toBeUndefined();
    weekResets(v, '1', WEEK_END);
    // A spent login is never the target; a session that must leave goes where pickTarget says, not here.
    (0, testing_1.expect)((0, model_1.soonerTarget)(view({ '1': [10, 10], '2': [0, 99] }, {}, 'reset'), NOW)).toBeUndefined();
    (0, testing_1.expect)((0, model_1.soonerTarget)(__assign(__assign({}, v), { readings: __assign(__assign({}, v.readings), { '1': { sevenDay: { pct: 99, resetsAt: WEEK_END }, at: NOW } }) }), NOW)).toBeUndefined();
    // Only 'soonest reset' moves a session that still has room.
    for (var _i = 0, _b = ['room', 'order', 'off']; _i < _b.length; _i++) {
        var rotateTo = _b[_i];
        (0, testing_1.expect)((0, model_1.soonerTarget)(__assign(__assign({}, v), { rotateTo: rotateTo }), NOW)).toBeUndefined();
    }
});
(0, testing_1.test)('next in list moves to the login after the one in use, wrapping, past spent and locked ones', function () {
    var at = function (activeId, v) { var _a; return (_a = (0, model_1.pickTarget)(__assign(__assign({}, v), { activeId: activeId }), NOW)) === null || _a === void 0 ? void 0 : _a.id; };
    var v = view({ '1': [10, 10], '2': [95, 10], '3': [20, 10], '4': [80, 10] }, {}, 'order');
    (0, testing_1.expect)(at('2', v)).toBe('3');
    (0, testing_1.expect)(at('4', v)).toBe('1');
    (0, testing_1.expect)(at('3', v)).toBe('4');
    (0, testing_1.expect)(at('2', view({ '1': [10, 10], '2': [95, 10], '3': [91, 10], '4': [80, 10] }, {}, 'order'))).toBe('4');
    (0, testing_1.expect)(at('2', view({ '1': [10, 10], '2': [95, 10], '3': [20, 10], '4': [0, 0] }, { '3': { kind: 'login-needed', why: 'x' } }, 'order'))).toBe('4');
});
(0, testing_1.test)('a stored rotation choice is kept when known, else the soonest reset', function () {
    (0, testing_1.expect)((0, model_1.rotateToFrom)('order')).toBe('order');
    (0, testing_1.expect)((0, model_1.rotateToFrom)('off')).toBe('off');
    (0, testing_1.expect)((0, model_1.rotateToFrom)('room')).toBe('room');
    (0, testing_1.expect)((0, model_1.rotateToFrom)('nope')).toBe('reset');
    (0, testing_1.expect)((0, model_1.rotateToFrom)(undefined)).toBe('reset');
});
(0, testing_1.test)('a window counts as empty once its reset time has passed', function () {
    (0, testing_1.expect)((0, model_1.windowPct)({ pct: 97, resetsAt: LATER }, Date.parse(LATER) + 1)).toBe(0);
    (0, testing_1.expect)((0, model_1.windowPct)({ pct: 97, resetsAt: LATER }, NOW)).toBe(97);
});
(0, testing_1.test)('reads the usage endpoint body as /usage serves it', function () {
    var body = {
        five_hour: { utilization: 39.0, resets_at: '2026-10-12T12:10:00.246761+00:00', locked_reason: null },
        seven_day: { utilization: 55.0, resets_at: '2026-10-18T03:00:00.246781+00:00', locked_reason: null },
        seven_day_opus: null,
    };
    (0, testing_1.expect)((0, model_1.readingFromUsage)(body, NOW)).toEqual({
        fiveHour: { pct: 39, resetsAt: '2026-10-12T12:10:00.246761+00:00' },
        sevenDay: { pct: 55, resetsAt: '2026-10-18T03:00:00.246781+00:00' },
        at: NOW,
    });
});
(0, testing_1.test)('a stored login whose refresh token ran out needs a sign-in', function () {
    var blob = function (refreshTokenExpiresAt) {
        return JSON.stringify({ claudeAiOauth: { accessToken: 't', refreshToken: 'r', expiresAt: NOW + 1000, refreshTokenExpiresAt: refreshTokenExpiresAt } });
    };
    (0, testing_1.expect)((0, model_1.healthOf)((0, model_1.credentialFrom)(blob(NOW - 1)), NOW)).toEqual({ kind: 'login-needed', why: 'sign-in expired' });
    (0, testing_1.expect)((0, model_1.healthOf)((0, model_1.credentialFrom)(blob(NOW + 1000)), NOW).kind).toBe('ok');
    (0, testing_1.expect)((0, model_1.healthOf)((0, model_1.credentialFrom)('not json'), NOW)).toEqual({ kind: 'login-needed', why: 'not signed in' });
});
(0, testing_1.test)('reads who a token signs in from the profile endpoint body: its email and organization', function () {
    var body = {
        account: { uuid: 'a-1', email: 'you@example.com', full_name: 'You' },
        organization: { uuid: 'o-1', name: 'Acme', organization_type: 'claude_team', rate_limit_tier: 'default_raven', seat_tier: 'team_standard' },
    };
    (0, testing_1.expect)((0, model_1.identityFromProfile)(body)).toEqual({ email: 'you@example.com', orgId: 'o-1', orgName: 'Acme', tier: 'default_raven' });
    (0, testing_1.expect)((0, model_1.identityFromProfile)({ account: { email: 'you@example.com' } })).toEqual({ email: 'you@example.com' });
    (0, testing_1.expect)((0, model_1.identityFromProfile)({ organization: { uuid: 'o-1' } })).toBeUndefined();
    (0, testing_1.expect)((0, model_1.identityFromProfile)(null)).toBeUndefined();
});
(0, testing_1.test)('a login counts toward the combined usage by its plan\'s weekly usage: Ultra (Max 20x) twice Max (5x), anything else as one', function () {
    (0, testing_1.expect)((0, model_1.weightOf)({ tier: 'default_claude_max_20x' })).toBe(10);
    (0, testing_1.expect)((0, model_1.weightOf)({ tier: 'default_claude_ultra' })).toBe(10);
    (0, testing_1.expect)((0, model_1.weightOf)({ tier: 'default_claude_max_5x' })).toBe(5);
    (0, testing_1.expect)((0, model_1.weightOf)({ tier: 'default_raven' })).toBe(1);
    (0, testing_1.expect)((0, model_1.weightOf)({})).toBe(1);
});
(0, testing_1.test)('a stored sign-in carries its plan, which Claude Code reads to tell a Team seat, and the refresh token a new sign-in replaces', function () {
    var text = JSON.stringify({ claudeAiOauth: { accessToken: 't', refreshToken: 'r', expiresAt: NOW, subscriptionType: 'team' } });
    (0, testing_1.expect)((0, model_1.credentialFrom)(text)).toEqual({ accessToken: 't', expiresAt: NOW, refreshToken: 'r', plan: 'team' });
});
(0, testing_1.test)('names keychain entries as Claude Code does', function () { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = testing_1.expect;
                return [4 /*yield*/, (0, model_1.keychainItem)('')];
            case 1:
                _a.apply(void 0, [_c.sent()]).toBe('Claude Code-credentials');
                // sha256("/Users/tester/.claude/accounts/2") starts with these 8 hex digits.
                _b = testing_1.expect;
                return [4 /*yield*/, (0, model_1.keychainItem)('/Users/tester/.claude/accounts/2')];
            case 2:
                // sha256("/Users/tester/.claude/accounts/2") starts with these 8 hex digits.
                _b.apply(void 0, [_c.sent()]).toBe("Claude Code-credentials-".concat(EXPECTED_SLOT2_HASH));
                return [2 /*return*/];
        }
    });
}); });
var EXPECTED_SLOT2_HASH = 'a296c876';
(0, testing_1.test)('names credentials files as Claude Code does where there is no keychain', function () {
    (0, testing_1.expect)((0, model_1.credentialsFile)('', '/home/tester')).toBe('/home/tester/.claude/.credentials.json');
    (0, testing_1.expect)((0, model_1.credentialsFile)('', undefined)).toBeUndefined();
    (0, testing_1.expect)((0, model_1.credentialsFile)('', '')).toBeUndefined();
    (0, testing_1.expect)((0, model_1.credentialsFile)('/home/tester/.claude/accounts/2', undefined)).toBe('/home/tester/.claude/accounts/2/.credentials.json');
    // Claude Code keeps it in the directory's NFC spelling, which Linux tells apart from others.
    (0, testing_1.expect)((0, model_1.credentialsFile)('/home/rene\u0301/.claude/accounts/2', undefined)).toBe('/home/ren\u00e9/.claude/accounts/2/.credentials.json');
});
(0, testing_1.test)('room left is colored green with all of it, through yellow, to red with none', function () {
    (0, testing_1.expect)((0, model_1.roomColor)(100)).toBe('#36e236');
    (0, testing_1.expect)((0, model_1.roomColor)(50)).toBe('#e2e236');
    (0, testing_1.expect)((0, model_1.roomColor)(0)).toBe('#e23636');
});
(0, testing_1.test)('a pie fills by quarters', function () {
    (0, testing_1.expect)([0, 12, 13, 50, 87, 88, 100].map(model_1.pie)).toEqual(['○', '○', '◔', '◑', '◕', '●', '●']);
    (0, testing_1.expect)((0, model_1.pie)(undefined)).toBe('·');
});
(0, testing_1.test)('a braille cell fills from one dot to eight', function () {
    (0, testing_1.expect)([0, 14, 50, 93, 100].map(model_1.braille)).toEqual(['⡀', '⣀', '⣦', '⣿', '⣿']);
});
(0, testing_1.test)('a stored footer look keeps what it knows and defaults the rest', function () {
    (0, testing_1.expect)((0, model_1.footerStyleFrom)({ session: 'pie', week: 'nope', weekPercent: false, active: 'bright', fill: 'used' })).toEqual({
        session: 'pie',
        week: 'bars',
        sessionPercent: true,
        weekPercent: false,
        active: 'lines',
        fill: 'used',
    });
    (0, testing_1.expect)((0, model_1.footerStyleFrom)(undefined)).toEqual({ session: 'braille', week: 'bars', sessionPercent: true, weekPercent: true, active: 'lines', fill: 'left' });
});
(0, testing_1.test)('a switch Claude Code\'s security policy refuses is told from any other failure', function () {
    var refused = 'HooksError: account-rotator: $.env.set: env (managed): CLAUDE_SECURESTORAGE_CONFIG_DIR is not for plugins outside policy to change';
    (0, testing_1.expect)((0, model_1.isPolicyRefusal)(new Error(refused))).toBe(true);
    (0, testing_1.expect)((0, model_1.isPolicyRefusal)(refused)).toBe(true);
    (0, testing_1.expect)((0, model_1.isPolicyRefusal)(new Error('HooksError: account-rotator: $.env.set: timed out'))).toBe(false);
    (0, testing_1.expect)((0, model_1.isPolicyRefusal)(undefined)).toBe(false);
});
(0, testing_1.test)('counts the browsers Claude in Chrome lists, and knows its words for none answering', function () {
    (0, testing_1.expect)((0, model_1.browsersFrom)('[{"deviceId":"d","name":"Browser 1","osPlatform":"macOS","isLocal":true}]')).toBe(1);
    (0, testing_1.expect)((0, model_1.browsersFrom)('[]')).toBe(0);
    (0, testing_1.expect)((0, model_1.browsersFrom)('Browser extension is not connected.')).toBeUndefined();
    (0, testing_1.expect)((0, model_1.isNoBrowser)('Browser extension is not connected. Please ensure the Claude browser extension is installed and running')).toBe(true);
    (0, testing_1.expect)((0, model_1.isNoBrowser)("[Claude in Chrome] Claude in Chrome isn't paired with your browser (reported by the extension, unverified: account_mismatch)")).toBe(true);
    (0, testing_1.expect)((0, model_1.isNoBrowser)('Tab 12 no longer exists')).toBe(false);
});
(0, testing_1.test)('the notes about Claude in Chrome say what the mod does now and what to tell the user, never /login', function () {
    var accounts = [
        { id: '1', slot: '', email: 'one@example.com' },
        { id: '2', slot: '/h/.claude/accounts/2', email: 'two@example.com' },
    ];
    var base = __assign(__assign({}, view({ '1': [10, 10], '2': [10, 10] })), { accounts: accounts, chromeAccountId: '1', activeId: '2', sessionId: 'session-1' });
    var onTwo = __assign(__assign({}, base), { chrome: { as: '2', isPaired: false, hasFailed: true } });
    (0, testing_1.expect)((0, model_1.chromeNote)(onTwo, 'connecting')).toBe('Claude in Chrome connected as Claude account 2 (two@example.com) and found no browser. ' +
        "The account-rotator mod is now connecting it as Claude account 1 (one@example.com), the account the user's Chrome extension is signed in to, which takes under a minute. " +
        "End your turn now: you'll get a message once it's connected. Don't suggest /login: it doesn't fix this.");
    (0, testing_1.expect)((0, model_1.chromeNote)(base, 'held')).toMatch(/^The account-rotator mod is connecting Claude in Chrome as Claude account 1 \(one@example\.com\).* End your turn now/);
    (0, testing_1.expect)((0, model_1.chromeNote)(onTwo, 'no-browser')).toMatch(/^No Chrome extension answers as Claude account 1 \(one@example\.com\), the account picked for it in the Claude accounts panel: .* If it is another account, they press Use for Chrome or Try to connect next to it .* If it matches, they restart Chrome and press Connect above the prompt\./);
    var blocked = __assign(__assign({}, onTwo), { isSwitchBlocked: true });
    (0, testing_1.expect)((0, model_1.chromeNote)(blocked, 'blocked')).toMatch(/Claude Code doesn't let this session switch accounts\. Tell the user that to use Chrome, they quit Claude Code and run `claude --resume session-1` in this terminal/);
    // Connected as the extension's account in a session that can't move: no Connect to press, Chrome to open.
    (0, testing_1.expect)((0, model_1.chromeNote)(__assign(__assign({}, blocked), { chrome: { as: '1', isPaired: false } }), 'no-browser')).toMatch(/If it matches, they restart Chrome, then you try again\./);
    (0, testing_1.expect)((0, model_1.chromeNote)(__assign(__assign({}, onTwo), { chromeAccountId: undefined }), 'unset')).toMatch(/doesn't know which one that is\. Ask the user to press Use for Chrome or Try to connect next to it under Chrome in the Claude accounts panel/);
    for (var _i = 0, _a = ['held', 'connecting', 'no-browser', 'blocked', 'unset']; _i < _a.length; _i++) {
        var kind = _a[_i];
        (0, testing_1.expect)((0, model_1.chromeNote)(onTwo, kind)).not.toMatch(/Run \/login|run \/login/);
    }
});
(0, testing_1.test)('a browser call found no browser when Claude Code says so as an error or as a whole result, or the list of browsers is empty; not when a page mentions it', function () {
    var words = 'Browser extension is not connected: the OAuth token Claude Code is using belongs to a different claude.ai account.';
    (0, testing_1.expect)((0, model_1.isUnansweredCall)('mcp__claude-in-chrome__tabs_context_mcp', words, true)).toBe(true);
    (0, testing_1.expect)((0, model_1.isUnansweredCall)('mcp__claude-in-chrome__tabs_context_mcp', words, false)).toBe(true);
    (0, testing_1.expect)((0, model_1.isUnansweredCall)('mcp__claude-in-chrome__tabs_context_mcp', "Error: ".concat(words), false)).toBe(true);
    (0, testing_1.expect)((0, model_1.isUnansweredCall)('mcp__claude-in-chrome__get_page_text', "Troubleshooting\n\nIf you see \"".concat(words, "\", sign in again."), false)).toBe(false);
    (0, testing_1.expect)((0, model_1.isUnansweredCall)('mcp__claude-in-chrome__list_connected_browsers', '[]', false)).toBe(true);
    (0, testing_1.expect)((0, model_1.isUnansweredCall)('mcp__claude-in-chrome__list_connected_browsers', '[{"deviceId":"d"}]', false)).toBe(false);
    (0, testing_1.expect)((0, model_1.isUnansweredCall)('mcp__claude-in-chrome__get_page_text', '[]', false)).toBe(false);
});
(0, testing_1.test)('reads each model\'s own week from the usage body\'s limits, and which one a session\'s model falls under', function () {
    var body = {
        five_hour: null,
        seven_day: { utilization: 80, resets_at: WEEK_END },
        limits: [
            { kind: 'weekly_all', group: 'weekly', percent: 80, resets_at: WEEK_END, scope: null },
            { kind: 'weekly_scoped', group: 'weekly', percent: 100, resets_at: WEEK_END, scope: { model: { id: null, display_name: 'Fable' }, surface: null } },
            // A limit on a surface, not a model, is not a model's week.
            { kind: 'weekly_scoped', group: 'weekly', percent: 50, resets_at: WEEK_END, scope: { model: null, surface: 'cowork' } },
        ],
    };
    var reading = (0, model_1.readingFromUsage)(body, NOW);
    (0, testing_1.expect)(reading).toEqual({ sevenDay: { pct: 80, resetsAt: WEEK_END }, models: { Fable: { pct: 100, resetsAt: WEEK_END } }, at: NOW });
    var readings = { '1': reading !== null && reading !== void 0 ? reading : { at: NOW } };
    (0, testing_1.expect)((0, model_1.scopeOf)('claude-fable-5-2', readings)).toBe('Fable');
    (0, testing_1.expect)((0, model_1.scopeOf)('Fable 5.2', readings)).toBe('Fable');
    (0, testing_1.expect)((0, model_1.scopeOf)('claude-opus-5-5', readings)).toBeUndefined();
    (0, testing_1.expect)((0, model_1.scopeOf)(undefined, readings)).toBeUndefined();
});
(0, testing_1.test)('a Fable session leaves at 98% of the Fable week and picks by the smaller room; an Opus session goes by the week alone', function () {
    var _a, _b;
    var v = view({ '1': [0, 80], '2': [0, 10], '3': [0, 30] });
    var fable = function (pct) { return ({ Fable: { pct: pct, resetsAt: WEEK_END } }); };
    var readings = {
        '1': { sevenDay: { pct: 80, resetsAt: WEEK_END }, models: fable(98), at: NOW },
        '2': { sevenDay: { pct: 10, resetsAt: WEEK_END }, models: fable(95), at: NOW },
        '3': { sevenDay: { pct: 30, resetsAt: WEEK_END }, models: fable(20), at: NOW },
    };
    var opus = __assign(__assign({}, v), { readings: readings, model: 'claude-opus-5-5' });
    var onFable = __assign(__assign({}, opus), { model: 'claude-fable-5-2' });
    (0, testing_1.expect)((0, model_1.shouldLeave)(opus, NOW)).toBe(false);
    (0, testing_1.expect)((0, model_1.shouldLeave)(onFable, NOW)).toBe(true);
    // Account 2 has the most week left, but only 5% of its Fable week.
    (0, testing_1.expect)((_a = (0, model_1.pickTarget)(onFable, NOW)) === null || _a === void 0 ? void 0 : _a.id).toBe('3');
    (0, testing_1.expect)((_b = (0, model_1.pickTarget)(opus, NOW)) === null || _b === void 0 ? void 0 : _b.id).toBe('2');
    (0, testing_1.expect)((0, model_1.roomOf)(readings['2'], NOW, 'Fable')).toBe(5);
    (0, testing_1.expect)((0, model_1.roomOf)(readings['2'], NOW)).toBe(90);
});
(0, testing_1.test)('a turn on Fable that hits a limit while the week has room fills the Fable week, not the week', function () {
    var r = { sevenDay: { pct: 80, resetsAt: WEEK_END }, models: { Fable: { pct: 96, resetsAt: WEEK_END } }, at: NOW };
    (0, testing_1.expect)((0, model_1.spentReading)(r, NOW, 'Fable')).toEqual({ sevenDay: { pct: 80, resetsAt: WEEK_END }, models: { Fable: { pct: 100, resetsAt: WEEK_END } }, at: NOW });
    (0, testing_1.expect)((0, model_1.spentReading)(r, NOW)).toEqual({ sevenDay: { pct: 100, resetsAt: WEEK_END }, models: { Fable: { pct: 96, resetsAt: WEEK_END } }, at: NOW });
});
