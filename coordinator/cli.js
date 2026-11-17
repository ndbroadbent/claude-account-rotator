"use strict";
// The coordinator's command line: `node coordinator/cli.ts <command>`.
//
//   serve [--managed] [--idle-exit-ms N]   run it in the foreground (launchd runs this)
//   start                                  make sure one runs: kickstart launchd's, or start one in the background
//   upgrade                                replace a running coordinator with this version
//   install                                copy this version to ~/.claude/account-rotator/app and run it at login (macOS)
//   uninstall                              stop running it at login
//   status                                 what the running one knows
//   stop                                   ask the running one to exit
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
var node_child_process_1 = require("node:child_process");
var node_fs_1 = require("node:fs");
var node_http_1 = require("node:http");
var node_os_1 = require("node:os");
var node_path_1 = require("node:path");
var node_url_1 = require("node:url");
var server_ts_1 = require("./server.ts");
var version_ts_1 = require("./version.ts");
var LABEL = 'com.github.ndbroadbent.claude-account-rotator';
var HERE = node_path_1.default.dirname((0, node_url_1.fileURLToPath)(import.meta.url));
var ROOT = node_path_1.default.dirname(HERE);
var plistPath = function () { return node_path_1.default.join(node_os_1.default.homedir(), 'Library', 'LaunchAgents', "".concat(LABEL, ".plist")); };
var appDir = function () { return node_path_1.default.join((0, server_ts_1.stateDir)(), 'app'); };
var domain = function () { var _a, _b; return "gui/".concat((_b = (_a = process.getuid) === null || _a === void 0 ? void 0 : _a.call(process)) !== null && _b !== void 0 ? _b : 0); };
function fail(message) {
    process.stderr.write("account-rotator: ".concat(message, "\n"));
    process.exit(1);
}
function checkNode() {
    var _a = process.versions.node.split('.').map(Number), _b = _a[0], major = _b === void 0 ? 0 : _b, _c = _a[1], minor = _c === void 0 ? 0 : _c;
    if (major < 22 || (major === 22 && minor < 18))
        fail("the coordinator needs Node.js 22.18 or later (this is ".concat(process.versions.node, ")"));
}
function call(method, urlPath, body, timeoutMs) {
    if (timeoutMs === void 0) { timeoutMs = 5000; }
    return new Promise(function (resolve, reject) {
        var text = body === undefined ? undefined : JSON.stringify(body);
        var req = node_http_1.default.request({
            socketPath: (0, server_ts_1.socketPath)(),
            path: urlPath,
            method: method,
            headers: __assign({ connection: 'close' }, (text === undefined ? {} : { 'content-type': 'application/json', 'content-length': Buffer.byteLength(text) })),
            timeout: timeoutMs,
        }, function (res) {
            var raw = '';
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                raw += chunk;
            });
            res.on('end', function () {
                var _a;
                try {
                    resolve({ status: (_a = res.statusCode) !== null && _a !== void 0 ? _a : 0, body: raw === '' ? undefined : JSON.parse(raw) });
                }
                catch (error) {
                    reject(new Error("unreadable answer to ".concat(method, " ").concat(urlPath, ": ").concat(String(error))));
                }
            });
        });
        req.on('timeout', function () { return req.destroy(new Error("".concat(method, " ").concat(urlPath, " timed out"))); });
        req.on('error', reject);
        req.end(text);
    });
}
function hello() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, status_1, body, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, call('GET', '/hello', undefined, 3000)];
                case 1:
                    _a = _c.sent(), status_1 = _a.status, body = _a.body;
                    return [2 /*return*/, status_1 === 200 ? body : undefined];
                case 2:
                    _b = _c.sent();
                    // Not listening (no socket, or a socket left by one that died).
                    return [2 /*return*/, undefined];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function waitFor(check, ms, what) {
    return __awaiter(this, void 0, void 0, function () {
        var until;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    until = Date.now() + ms;
                    _a.label = 1;
                case 1:
                    if (!(Date.now() < until)) return [3 /*break*/, 4];
                    return [4 /*yield*/, check()];
                case 2:
                    if (_a.sent())
                        return [2 /*return*/];
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 200); })];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 1];
                case 4:
                    fail("".concat(what, " (see ").concat((0, server_ts_1.logPath)(), ")"));
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Runs `work` while holding the command line's lock, so many sessions starting
 * at once (each runs `start` or `upgrade`) take turns: the first does the work,
 * and the rest find it done. A lock whose holder died is taken over.
 */
function withLock(work) {
    return __awaiter(this, void 0, void 0, function () {
        var file, until, holder;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    node_fs_1.default.mkdirSync((0, server_ts_1.stateDir)(), { recursive: true, mode: 448 });
                    file = node_path_1.default.join((0, server_ts_1.stateDir)(), 'cli.lock');
                    until = Date.now() + 120000;
                    _a.label = 1;
                case 1:
                    try {
                        node_fs_1.default.writeFileSync(file, String(process.pid), { flag: 'wx', mode: 384 });
                        return [3 /*break*/, 4];
                    }
                    catch (error) {
                        if (error.code !== 'EEXIST')
                            throw error;
                    }
                    holder = Number(node_fs_1.default.readFileSync(file, 'utf8').trim());
                    if (!isAlive(holder)) {
                        // Its holder died: whoever removes it first goes next.
                        node_fs_1.default.rmSync(file, { force: true });
                        return [3 /*break*/, 3];
                    }
                    if (Date.now() > until)
                        fail("another account-rotator command (pid ".concat(holder, ") has held ").concat(file, " for 2 minutes"));
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 250); })];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3: return [3 /*break*/, 1];
                case 4:
                    _a.trys.push([4, , 6, 7]);
                    return [4 /*yield*/, work()];
                case 5:
                    _a.sent();
                    return [3 /*break*/, 7];
                case 6:
                    node_fs_1.default.rmSync(file, { force: true });
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    });
}
function isAlive(pid) {
    if (!Number.isInteger(pid) || pid <= 0)
        return false;
    try {
        process.kill(pid, 0);
        return true;
    }
    catch (error) {
        // EPERM: it runs, as another user.
        return error.code === 'EPERM';
    }
}
var isInstalled = function () { return process.platform === 'darwin' && node_fs_1.default.existsSync(plistPath()); };
function launchctl() {
    var _a, _b;
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    try {
        return { ok: true, output: (0, node_child_process_1.execFileSync)('/bin/launchctl', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
    }
    catch (error) {
        var e = error;
        return { ok: false, output: "".concat((_a = e.stdout) !== null && _a !== void 0 ? _a : '').concat((_b = e.stderr) !== null && _b !== void 0 ? _b : '') };
    }
}
/** Starts one in the background, detached from whatever ran this, without its Claude Code session's settings. */
function spawnDetached() {
    node_fs_1.default.mkdirSync((0, server_ts_1.stateDir)(), { recursive: true, mode: 448 });
    var out = node_fs_1.default.openSync((0, server_ts_1.logPath)(), 'a', 384);
    var child = (0, node_child_process_1.spawn)(process.execPath, [node_path_1.default.join(HERE, 'cli.ts'), 'serve', '--idle-exit-ms', String(30 * 60000)], {
        cwd: (0, server_ts_1.stateDir)(),
        env: (0, server_ts_1.cleanEnv)(),
        detached: true,
        stdio: ['ignore', out, out],
    });
    child.unref();
}
function start() {
    return __awaiter(this, void 0, void 0, function () {
        var running, kick, started;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, hello()];
                case 1:
                    running = _a.sent();
                    if (running !== undefined) {
                        process.stdout.write("running: ".concat(running.version, " (pid ").concat(running.pid, ")\n"));
                        return [2 /*return*/];
                    }
                    if (isInstalled()) {
                        kick = launchctl('kickstart', "".concat(domain(), "/").concat(LABEL));
                        if (!kick.ok)
                            launchctl('bootstrap', domain(), plistPath());
                    }
                    else
                        spawnDetached();
                    return [4 /*yield*/, waitFor(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, hello()];
                                case 1: return [2 /*return*/, (_a.sent()) !== undefined];
                            }
                        }); }); }, 15000, 'the coordinator did not start')];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, hello()];
                case 3:
                    started = _a.sent();
                    process.stdout.write("started: ".concat(started === null || started === void 0 ? void 0 : started.version, " (pid ").concat(started === null || started === void 0 ? void 0 : started.pid, ")\n"));
                    return [2 /*return*/];
            }
        });
    });
}
function stopRunning() {
    return __awaiter(this, void 0, void 0, function () {
        var running;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, hello()];
                case 1:
                    running = _a.sent();
                    if (running === undefined)
                        return [2 /*return*/];
                    return [4 /*yield*/, call('POST', '/shutdown').catch(function () { return undefined; })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, waitFor(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, hello()];
                                case 1: return [2 /*return*/, (_a.sent()) === undefined];
                            }
                        }); }); }, 10000, 'the coordinator did not stop')];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
var xml = function (s) { return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'); };
function plist() {
    var _a, _b;
    var env = (0, server_ts_1.cleanEnv)();
    var vars = __assign(__assign({ PATH: (_a = env.PATH) !== null && _a !== void 0 ? _a : '/usr/bin:/bin:/usr/sbin:/sbin', HOME: node_os_1.default.homedir(), USER: (_b = env.USER) !== null && _b !== void 0 ? _b : node_os_1.default.userInfo().username }, (env.LANG === undefined ? {} : { LANG: env.LANG })), (env.CLAUDE_ACCOUNT_ROTATOR_DIR === undefined ? {} : { CLAUDE_ACCOUNT_ROTATOR_DIR: env.CLAUDE_ACCOUNT_ROTATOR_DIR }));
    var args = [process.execPath, node_path_1.default.join(appDir(), 'coordinator', 'cli.ts'), 'serve', '--managed'];
    return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n<plist version=\"1.0\">\n<dict>\n  <key>Label</key><string>".concat(LABEL, "</string>\n  <key>ProgramArguments</key>\n  <array>\n").concat(args.map(function (a) { return "    <string>".concat(xml(a), "</string>"); }).join('\n'), "\n  </array>\n  <key>EnvironmentVariables</key>\n  <dict>\n").concat(Object.entries(vars)
        .map(function (_a) {
        var k = _a[0], v = _a[1];
        return "    <key>".concat(xml(k), "</key><string>").concat(xml(v), "</string>");
    })
        .join('\n'), "\n  </dict>\n  <key>WorkingDirectory</key><string>").concat(xml((0, server_ts_1.stateDir)()), "</string>\n  <key>RunAtLoad</key><true/>\n  <key>KeepAlive</key>\n  <dict>\n    <key>SuccessfulExit</key><false/>\n  </dict>\n  <key>ThrottleInterval</key><integer>10</integer>\n  <key>StandardOutPath</key><string>").concat(xml(node_path_1.default.join((0, server_ts_1.stateDir)(), 'launchd.log')), "</string>\n  <key>StandardErrorPath</key><string>").concat(xml(node_path_1.default.join((0, server_ts_1.stateDir)(), 'launchd.log')), "</string>\n</dict>\n</plist>\n");
}
/** Copies the files the coordinator runs from to a fixed place, so a plugin update's new folder doesn't move it. */
function copyApp() {
    var target = appDir();
    var fresh = "".concat(target, ".new");
    node_fs_1.default.rmSync(fresh, { recursive: true, force: true });
    var files = __spreadArray(__spreadArray([], node_fs_1.default
        .readdirSync(node_path_1.default.join(ROOT, 'coordinator'))
        .filter(function (f) { return f.endsWith('.ts') && !f.endsWith('.spec.ts'); })
        .map(function (f) { return node_path_1.default.join('coordinator', f); }), true), [
        node_path_1.default.join('hooks', 'model.ts'),
        node_path_1.default.join('types', 'index.d.ts'),
        'package.json',
    ], false);
    for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
        var file = files_1[_i];
        var from = node_path_1.default.join(ROOT, file);
        if (!node_fs_1.default.existsSync(from))
            fail("".concat(from, " is missing: run this from the plugin's folder"));
        node_fs_1.default.mkdirSync(node_path_1.default.dirname(node_path_1.default.join(fresh, file)), { recursive: true });
        node_fs_1.default.copyFileSync(from, node_path_1.default.join(fresh, file));
    }
    node_fs_1.default.rmSync(target, { recursive: true, force: true });
    node_fs_1.default.renameSync(fresh, target);
}
function install() {
    return __awaiter(this, void 0, void 0, function () {
        var running, boot, tries;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (process.platform !== 'darwin')
                        fail('install sets up a macOS LaunchAgent; elsewhere, sessions start the coordinator themselves');
                    node_fs_1.default.mkdirSync((0, server_ts_1.stateDir)(), { recursive: true, mode: 448 });
                    return [4 /*yield*/, hello()];
                case 1:
                    running = _a.sent();
                    if (!(running !== undefined && !running.isManaged)) return [3 /*break*/, 3];
                    return [4 /*yield*/, stopRunning()];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    copyApp();
                    node_fs_1.default.mkdirSync(node_path_1.default.dirname(plistPath()), { recursive: true });
                    node_fs_1.default.writeFileSync(plistPath(), plist());
                    launchctl('bootout', "".concat(domain(), "/").concat(LABEL));
                    return [4 /*yield*/, waitFor(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, hello()];
                                case 1: return [2 /*return*/, (_a.sent()) === undefined];
                            }
                        }); }); }, 10000, 'the old coordinator did not stop')
                        // launchd goes on removing the old job after its process exits, and refuses a bootstrap meanwhile ("5: Input/output error").
                    ];
                case 4:
                    _a.sent();
                    // launchd goes on removing the old job after its process exits, and refuses a bootstrap meanwhile ("5: Input/output error").
                    return [4 /*yield*/, waitFor(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, !launchctl('print', "".concat(domain(), "/").concat(LABEL)).ok];
                        }); }); }, 15000, 'launchd did not remove the old coordinator job')];
                case 5:
                    // launchd goes on removing the old job after its process exits, and refuses a bootstrap meanwhile ("5: Input/output error").
                    _a.sent();
                    boot = launchctl('bootstrap', domain(), plistPath());
                    tries = 1;
                    _a.label = 6;
                case 6:
                    if (!(!boot.ok && tries < 5)) return [3 /*break*/, 9];
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1000); })];
                case 7:
                    _a.sent();
                    boot = launchctl('bootstrap', domain(), plistPath());
                    _a.label = 8;
                case 8:
                    tries += 1;
                    return [3 /*break*/, 6];
                case 9:
                    if (!boot.ok)
                        fail("launchctl bootstrap failed: ".concat(boot.output.trim()));
                    return [4 /*yield*/, waitFor(function () { return __awaiter(_this, void 0, void 0, function () { var _a; return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0: return [4 /*yield*/, hello()];
                                case 1: return [2 /*return*/, ((_a = (_b.sent())) === null || _a === void 0 ? void 0 : _a.version) === version_ts_1.VERSION];
                            }
                        }); }); }, 15000, "coordinator ".concat(version_ts_1.VERSION, " did not start"))];
                case 10:
                    _a.sent();
                    process.stdout.write("installed: coordinator ".concat(version_ts_1.VERSION, " runs at login (").concat(plistPath(), ")\n"));
                    return [2 /*return*/];
            }
        });
    });
}
function uninstall() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            if (node_fs_1.default.existsSync(plistPath())) {
                launchctl('bootout', "".concat(domain(), "/").concat(LABEL));
                node_fs_1.default.rmSync(plistPath(), { force: true });
            }
            node_fs_1.default.rmSync(appDir(), { recursive: true, force: true });
            process.stdout.write('uninstalled: the coordinator no longer runs at login (its state stays in ~/.claude/account-rotator)\n');
            return [2 /*return*/];
        });
    });
}
/** Replaces a running coordinator older than this one; a newer one stays. */
function upgrade() {
    return __awaiter(this, void 0, void 0, function () {
        var running;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, hello()];
                case 1:
                    running = _a.sent();
                    if (running !== undefined && (0, version_ts_1.compareVersions)(running.version, version_ts_1.VERSION) >= 0) {
                        process.stdout.write("running: ".concat(running.version, ", not older than ").concat(version_ts_1.VERSION, "\n"));
                        return [2 /*return*/];
                    }
                    if (isInstalled())
                        return [2 /*return*/, install()];
                    return [4 /*yield*/, stopRunning()];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, start()];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function status() {
    return __awaiter(this, void 0, void 0, function () {
        var running, body, state, pct, hasFive, models, _loop_1, _i, _a, a;
        var _b, _c, _d, _e, _f, _g;
        return __generator(this, function (_h) {
            switch (_h.label) {
                case 0: return [4 /*yield*/, hello()];
                case 1:
                    running = _h.sent();
                    if (running === undefined)
                        fail("not running".concat(isInstalled() ? ' (installed: launchctl should restart it)' : ''));
                    return [4 /*yield*/, call('GET', '/state')];
                case 2:
                    body = (_h.sent()).body;
                    state = body;
                    pct = function (n) { return (n === undefined ? '  ?' : "".concat(Math.round(n), "%").padStart(4)); };
                    process.stdout.write("coordinator ".concat(running.version, " (pid ").concat(running.pid).concat(running.isManaged ? ', launchd' : '', "), ").concat(state.sessions.length, " sessions\n"));
                    hasFive = state.accounts.some(function (a) { var _a; return ((_a = a.reading) === null || _a === void 0 ? void 0 : _a.fiveHour) !== undefined; });
                    process.stdout.write("combined: ".concat(hasFive ? "5-hour ".concat(pct((_b = state.combined.fiveHour) === null || _b === void 0 ? void 0 : _b.pct), ", ") : '', "week ").concat(pct((_c = state.combined.sevenDay) === null || _c === void 0 ? void 0 : _c.pct), "\n"));
                    models = __spreadArray([], new Set(state.accounts.flatMap(function (a) { var _a, _b; return Object.keys((_b = (_a = a.reading) === null || _a === void 0 ? void 0 : _a.models) !== null && _b !== void 0 ? _b : {}); })), true).sort();
                    _loop_1 = function (a) {
                        var r = a.reading;
                        var own = models.map(function (m) { var _a, _b; return "".concat(m, " ").concat(pct((_b = (_a = r === null || r === void 0 ? void 0 : r.models) === null || _a === void 0 ? void 0 : _a[m]) === null || _b === void 0 ? void 0 : _b.pct), "  "); }).join('');
                        var moves = __spreadArray(__spreadArray([], (a.moveTo ? ["moves to ".concat(a.moveTo)] : []), true), Object.entries((_d = a.moveToFor) !== null && _d !== void 0 ? _d : {}).map(function (_a) {
                            var m = _a[0], to = _a[1];
                            return "".concat(m, " moves to ").concat(to);
                        }), true);
                        process.stdout.write("  ".concat(a.id, " ").concat(((_e = a.email) !== null && _e !== void 0 ? _e : '(unknown)').padEnd(32), " ").concat(hasFive ? "5h ".concat(pct((_f = r === null || r === void 0 ? void 0 : r.fiveHour) === null || _f === void 0 ? void 0 : _f.pct), "  ") : '', "wk ").concat(pct((_g = r === null || r === void 0 ? void 0 : r.sevenDay) === null || _g === void 0 ? void 0 : _g.pct), "  ").concat(own).concat(a.health.kind) +
                            "".concat(a.health.kind === 'login-needed' ? " (".concat(a.health.why, ")") : '', ", ").concat(a.sessionCount, " sessions").concat(moves.map(function (m) { return ", ".concat(m); }).join(''), "\n"));
                    };
                    for (_i = 0, _a = state.accounts; _i < _a.length; _i++) {
                        a = _a[_i];
                        _loop_1(a);
                    }
                    return [2 /*return*/];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, command, args, _b, at, idle;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    // Piped into `head`, which closes early: stop quietly.
                    process.stdout.on('error', function (error) {
                        if (error.code === 'EPIPE')
                            process.exit(0);
                        throw error;
                    });
                    checkNode();
                    _a = process.argv.slice(2), command = _a[0], args = _a.slice(1);
                    _b = command;
                    switch (_b) {
                        case 'serve': return [3 /*break*/, 1];
                        case 'start': return [3 /*break*/, 3];
                        case 'upgrade': return [3 /*break*/, 4];
                        case 'install': return [3 /*break*/, 5];
                        case 'uninstall': return [3 /*break*/, 6];
                        case 'status': return [3 /*break*/, 7];
                        case 'stop': return [3 /*break*/, 8];
                    }
                    return [3 /*break*/, 9];
                case 1:
                    at = args.indexOf('--idle-exit-ms');
                    idle = at < 0 ? undefined : Number(args[at + 1]);
                    return [4 /*yield*/, (0, server_ts_1.serve)(__assign({ isManaged: args.includes('--managed') }, (idle !== undefined && Number.isFinite(idle) ? { idleExitMs: idle } : {})))];
                case 2:
                    _c.sent();
                    return [2 /*return*/];
                case 3: return [2 /*return*/, withLock(start)];
                case 4: return [2 /*return*/, withLock(upgrade)];
                case 5: return [2 /*return*/, withLock(install)];
                case 6: return [2 /*return*/, withLock(uninstall)];
                case 7: return [2 /*return*/, status()];
                case 8: return [2 /*return*/, stopRunning()];
                case 9:
                    fail('usage: node coordinator/cli.ts serve|start|upgrade|install|uninstall|status|stop');
                    _c.label = 10;
                case 10: return [2 /*return*/];
            }
        });
    });
}
void main().catch(function (error) { return fail(error instanceof Error ? error.message : String(error)); });
