"use strict";
// The coordinator under Node: the real keychain or credentials files, Anthropic's
// usage and profile endpoints, `claude auth`, the state file, and the HTTP server
// on a Unix socket that sessions and the menu bar app talk to.
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
exports.logPath = exports.statePath = exports.socketPath = void 0;
exports.retryAfter = retryAfter;
exports.stateDir = stateDir;
exports.cleanEnv = cleanEnv;
exports.makeLogger = makeLogger;
exports.nodeDeps = nodeDeps;
exports.serve = serve;
var node_child_process_1 = require("node:child_process");
var node_fs_1 = require("node:fs");
var node_http_1 = require("node:http");
var node_os_1 = require("node:os");
var node_path_1 = require("node:path");
var model_ts_1 = require("../hooks/model.ts");
var core_ts_1 = require("./core.ts");
var version_ts_1 = require("./version.ts");
/** A Retry-After header as milliseconds from now: seconds, or an HTTP date. */
function retryAfter(header, now) {
    if (header === null)
        return undefined;
    var seconds = Number(header);
    if (Number.isFinite(seconds))
        return Math.max(0, seconds * 1000);
    var at = Date.parse(header);
    return Number.isFinite(at) ? Math.max(0, at - now) : undefined;
}
var USAGE_URL = 'https://api.anthropic.com/api/oauth/usage';
var PROFILE_URL = 'https://api.anthropic.com/api/oauth/profile';
var LOG_LIMIT = 1024 * 1024;
/** Where the coordinator keeps its socket, state, log and lock: `~/.claude/account-rotator`. */
function stateDir() {
    var _a;
    return (_a = process.env.CLAUDE_ACCOUNT_ROTATOR_DIR) !== null && _a !== void 0 ? _a : node_path_1.default.join(node_os_1.default.homedir(), '.claude', 'account-rotator');
}
var socketPath = function (dir) {
    if (dir === void 0) { dir = stateDir(); }
    return node_path_1.default.join(dir, 'coordinator.sock');
};
exports.socketPath = socketPath;
var statePath = function (dir) {
    if (dir === void 0) { dir = stateDir(); }
    return node_path_1.default.join(dir, 'state.json');
};
exports.statePath = statePath;
var logPath = function (dir) {
    if (dir === void 0) { dir = stateDir(); }
    return node_path_1.default.join(dir, 'coordinator.log');
};
exports.logPath = logPath;
var lockPath = function (dir) {
    if (dir === void 0) { dir = stateDir(); }
    return node_path_1.default.join(dir, 'coordinator.lock');
};
/**
 * The environment `claude` children get: the coordinator's own, without what a
 * Claude Code session sets for itself (which login it reads, its API endpoint),
 * so a coordinator a session started behaves as one launchd started.
 */
function cleanEnv(env) {
    if (env === void 0) { env = process.env; }
    return Object.fromEntries(Object.entries(env).filter(function (_a) {
        var name = _a[0];
        return name === 'CLAUDE_ACCOUNT_ROTATOR_DIR' || !/^(CLAUDE|ANTHROPIC)_|^CLAUDECODE$/.test(name);
    }));
}
function makeLogger(file) {
    if (file === void 0) { file = (0, exports.logPath)(); }
    return function (text) {
        try {
            if (node_fs_1.default.existsSync(file) && node_fs_1.default.statSync(file).size > LOG_LIMIT)
                node_fs_1.default.renameSync(file, "".concat(file, ".1"));
            node_fs_1.default.appendFileSync(file, "".concat(new Date().toISOString(), " ").concat(text, "\n"), { mode: 384 });
        }
        catch (_a) {
            // A log that can't be written mustn't stop the coordinator; stderr still has it.
            process.stderr.write("".concat(text, "\n"));
        }
    };
}
function run(cmd, args, env, timeoutMs) {
    return new Promise(function (resolve) {
        (0, node_child_process_1.execFile)(cmd, args, { env: env, timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 }, function (error, stdout, stderr) {
            var code = error === null ? 0 : typeof error.code === 'number' ? error.code : -1;
            resolve({ code: code, stdout: String(stdout), stderr: String(stderr) });
        });
    });
}
var oauthHeaders = function (accessToken) { return ({
    Authorization: "Bearer ".concat(accessToken),
    'anthropic-beta': 'oauth-2025-04-20',
    'Content-Type': 'application/json',
}); };
/** The real world beneath the coordinator. */
function nodeDeps(dir, log) {
    var env = cleanEnv();
    var home = node_os_1.default.homedir();
    var isMac = process.platform === 'darwin';
    var saveTimer;
    var pending;
    var flush = function () {
        saveTimer = undefined;
        if (pending === undefined)
            return;
        var tmp = "".concat((0, exports.statePath)(dir), ".tmp");
        node_fs_1.default.writeFileSync(tmp, "".concat(JSON.stringify(pending, null, 2), "\n"), { mode: 384 });
        node_fs_1.default.renameSync(tmp, (0, exports.statePath)(dir));
        pending = undefined;
    };
    process.on('exit', function () {
        if (saveTimer !== undefined)
            clearTimeout(saveTimer);
        flush();
    });
    return {
        now: function () { return Date.now(); },
        after: function (ms, fn) {
            var t = setTimeout(fn, ms);
            return function () { return clearTimeout(t); };
        },
        every: function (ms, fn) {
            var t = setInterval(fn, ms);
            return function () { return clearInterval(t); };
        },
        readStored: function (slot) {
            return __awaiter(this, void 0, void 0, function () {
                var item, _a, code, stdout, file, text, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!isMac) return [3 /*break*/, 3];
                            return [4 /*yield*/, (0, model_ts_1.keychainItem)(slot)];
                        case 1:
                            item = _c.sent();
                            return [4 /*yield*/, run('/usr/bin/security', ['find-generic-password', '-a', (0, model_ts_1.keychainUser)(env.USER), '-w', '-s', item], env, 10000)];
                        case 2:
                            _a = _c.sent(), code = _a.code, stdout = _a.stdout;
                            if (code === 44)
                                return [2 /*return*/, { state: 'absent' }];
                            if (code !== 0)
                                return [2 /*return*/, { state: 'unreadable', code: code }];
                            return [2 /*return*/, { state: 'present', credential: (0, model_ts_1.credentialFrom)(stdout.trim()) }];
                        case 3:
                            file = (0, model_ts_1.credentialsFile)(slot, home);
                            if (!(file === undefined)) return [3 /*break*/, 4];
                            _b = undefined;
                            return [3 /*break*/, 6];
                        case 4: return [4 /*yield*/, node_fs_1.default.promises.readFile(file, 'utf8').catch(function () { return undefined; })];
                        case 5:
                            _b = _c.sent();
                            _c.label = 6;
                        case 6:
                            text = _b;
                            return [2 /*return*/, text === undefined ? { state: 'absent' } : { state: 'present', credential: (0, model_ts_1.credentialFrom)(text) }];
                    }
                });
            });
        },
        fetchUsage: function (accessToken) {
            return __awaiter(this, void 0, void 0, function () {
                var res, retryAfterMs, error_1;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 3, , 4]);
                            return [4 /*yield*/, fetch(USAGE_URL, { headers: oauthHeaders(accessToken), signal: AbortSignal.timeout(20000) })];
                        case 1:
                            res = _b.sent();
                            if (res.status === 401 || res.status === 403)
                                return [2 /*return*/, { kind: 'rejected' }];
                            if (!res.ok) {
                                retryAfterMs = retryAfter(res.headers.get('retry-after'), Date.now());
                                return [2 /*return*/, __assign({ kind: 'failed', status: res.status }, (retryAfterMs === undefined ? {} : { retryAfterMs: retryAfterMs }))];
                            }
                            _a = { kind: 'ok' };
                            return [4 /*yield*/, res.json()];
                        case 2: return [2 /*return*/, (_a.body = _b.sent(), _a)];
                        case 3:
                            error_1 = _b.sent();
                            log("usage call failed: ".concat(String(error_1)));
                            return [2 /*return*/, { kind: 'failed', status: 0 }];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        },
        fetchProfile: function (accessToken) {
            return __awaiter(this, void 0, void 0, function () {
                var res, _a, error_2;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 5, , 6]);
                            return [4 /*yield*/, fetch(PROFILE_URL, { headers: oauthHeaders(accessToken), signal: AbortSignal.timeout(20000) })];
                        case 1:
                            res = _b.sent();
                            if (!res.ok) return [3 /*break*/, 3];
                            return [4 /*yield*/, res.json()];
                        case 2:
                            _a = _b.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            _a = undefined;
                            _b.label = 4;
                        case 4: return [2 /*return*/, _a];
                        case 5:
                            error_2 = _b.sent();
                            log("profile call failed: ".concat(String(error_2)));
                            return [2 /*return*/, undefined];
                        case 6: return [2 /*return*/];
                    }
                });
            });
        },
        authStatus: function (slot) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, code, stdout;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, run('claude', ['auth', 'status', '--json'], __assign(__assign({}, env), (0, model_ts_1.slotEnv)(slot)), 20000)];
                        case 1:
                            _a = _b.sent(), code = _a.code, stdout = _a.stdout;
                            return [2 /*return*/, code === 0 ? (0, model_ts_1.identityFromStatus)(stdout) : undefined];
                    }
                });
            });
        },
        signIn: function (slot, email) {
            var child = (0, node_child_process_1.spawn)('claude', __spreadArray(['auth', 'login', '--claudeai'], (email ? ['--email', email] : []), true), {
                env: __assign(__assign({}, env), (0, model_ts_1.slotEnv)(slot)),
                stdio: ['ignore', 'ignore', 'pipe'],
            });
            var errors = '';
            child.stderr.on('data', function (chunk) {
                errors += String(chunk);
            });
            var done = new Promise(function (resolve) {
                child.on('error', function (error) { return resolve({ code: null, errors: "".concat(errors).concat(String(error)) }); });
                child.on('close', function (code) { return resolve({ code: code, errors: errors }); });
            });
            return { done: done, cancel: function () { return void child.kill('SIGTERM'); } };
        },
        signOut: function (slot) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, run('claude', ['auth', 'logout'], __assign(__assign({}, env), (0, model_ts_1.slotEnv)(slot)), 20000)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        },
        makeSlot: function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var slot;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            slot = node_path_1.default.join(home, '.claude', 'accounts', id);
                            return [4 /*yield*/, node_fs_1.default.promises.mkdir(slot, { recursive: true, mode: 448 })];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, node_fs_1.default.promises.writeFile(node_path_1.default.join(slot, 'README'), "Claude account ".concat(id, ", kept by the account-rotator mod.\n"))];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, slot];
                    }
                });
            });
        },
        isAlive: function (pid) {
            try {
                process.kill(pid, 0);
                return true;
            }
            catch (error) {
                return error.code === 'EPERM';
            }
        },
        save: function (persisted) {
            pending = persisted;
            saveTimer !== null && saveTimer !== void 0 ? saveTimer : (saveTimer = setTimeout(flush, 500));
        },
        log: log,
    };
}
function readPersisted(file, log) {
    try {
        return JSON.parse(node_fs_1.default.readFileSync(file, 'utf8'));
    }
    catch (error) {
        if (error.code !== 'ENOENT')
            log("state file unreadable, starting fresh: ".concat(String(error)));
        return undefined;
    }
}
function isRunning(pid) {
    try {
        process.kill(pid, 0);
        return true;
    }
    catch (error) {
        return error.code === 'EPERM';
    }
}
/** Takes the lock file, or answers the pid that holds it. */
function takeLock(file) {
    for (var attempt = 0; attempt < 2; attempt += 1) {
        try {
            var fd = node_fs_1.default.openSync(file, 'wx', 384);
            node_fs_1.default.writeSync(fd, String(process.pid));
            node_fs_1.default.closeSync(fd);
            return undefined;
        }
        catch (error) {
            if (error.code !== 'EEXIST')
                throw error;
            var holder = Number(node_fs_1.default.readFileSync(file, 'utf8').trim());
            if (Number.isInteger(holder) && holder > 0 && holder !== process.pid && isRunning(holder))
                return holder;
            // A lock left by a coordinator that died.
            node_fs_1.default.rmSync(file, { force: true });
        }
    }
    throw new Error("could not take ".concat(file));
}
/** Runs the coordinator until it is told to stop. Resolves once it has. */
function serve(options) {
    return __awaiter(this, void 0, void 0, function () {
        var dir, log, holder, sock, deps, coordinator, lastActivity, stopping, server, stop, idle_1, timer;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    dir = stateDir();
                    node_fs_1.default.mkdirSync(dir, { recursive: true, mode: 448 });
                    node_fs_1.default.chmodSync(dir, 448);
                    log = makeLogger((0, exports.logPath)(dir));
                    holder = takeLock(lockPath(dir));
                    if (holder !== undefined) {
                        log("another coordinator runs (pid ".concat(holder, "); exiting"));
                        return [2 /*return*/];
                    }
                    sock = (0, exports.socketPath)(dir);
                    node_fs_1.default.rmSync(sock, { force: true });
                    deps = nodeDeps(dir, log);
                    coordinator = new core_ts_1.Coordinator(deps, { version: version_ts_1.VERSION, pid: process.pid, startedAt: Date.now(), isManaged: options.isManaged }, readPersisted((0, exports.statePath)(dir), log));
                    lastActivity = Date.now();
                    server = node_http_1.default.createServer(function (req, res) {
                        var _a;
                        lastActivity = Date.now();
                        var url = new URL((_a = req.url) !== null && _a !== void 0 ? _a : '/', 'http://coordinator');
                        var query = Object.fromEntries(url.searchParams);
                        var raw = '';
                        req.setEncoding('utf8');
                        req.on('data', function (chunk) {
                            raw += chunk;
                            if (raw.length > 1024 * 1024)
                                req.destroy();
                        });
                        req.on('end', function () {
                            var _a;
                            var body;
                            try {
                                body = raw === '' ? undefined : JSON.parse(raw);
                            }
                            catch (_b) {
                                res.writeHead(400, { 'content-type': 'application/json' });
                                res.end(JSON.stringify({ error: 'The body is not JSON.' }));
                                return;
                            }
                            var isPoll = req.method === 'GET' && url.pathname === '/state' && query.since !== undefined;
                            var session = query.session;
                            if (isPoll && session !== undefined) {
                                coordinator.pollOpened(session);
                                res.on('close', function () { return coordinator.pollClosed(session); });
                            }
                            void coordinator.handle({ method: (_a = req.method) !== null && _a !== void 0 ? _a : 'GET', path: url.pathname, query: query, body: body }).then(function (answer) {
                                lastActivity = Date.now();
                                if (!res.destroyed) {
                                    var text = JSON.stringify(answer.body);
                                    res.writeHead(answer.status, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(text) });
                                    res.end(text);
                                }
                                if (answer.shutdown)
                                    void stop('asked to shut down');
                            });
                        });
                    });
                    server.keepAliveTimeout = 5000;
                    server.requestTimeout = 0;
                    server.headersTimeout = 10000;
                    stop = function (why) {
                        stopping !== null && stopping !== void 0 ? stopping : (stopping = new Promise(function (resolve) {
                            log("stopping: ".concat(why));
                            coordinator.stop();
                            server.close(function () { return resolve(); });
                            server.closeAllConnections();
                            setTimeout(resolve, 2000).unref();
                        }).then(function () {
                            node_fs_1.default.rmSync(sock, { force: true });
                            node_fs_1.default.rmSync(lockPath(dir), { force: true });
                        }));
                        return stopping;
                    };
                    process.on('SIGTERM', function () { return void stop('SIGTERM').then(function () { return process.exit(0); }); });
                    process.on('SIGINT', function () { return void stop('SIGINT').then(function () { return process.exit(0); }); });
                    return [4 /*yield*/, new Promise(function (resolve, reject) {
                            server.once('error', reject);
                            server.listen(sock, function () { return resolve(); });
                        })];
                case 1:
                    _a.sent();
                    node_fs_1.default.chmodSync(sock, 384);
                    log("coordinator ".concat(version_ts_1.VERSION, " listening on ").concat(sock, " (pid ").concat(process.pid).concat(options.isManaged ? ', launchd' : '', ")"));
                    void coordinator.start().catch(function (error) { return log("start failed: ".concat(String(error))); });
                    if (options.idleExitMs !== undefined) {
                        idle_1 = options.idleExitMs;
                        timer = setInterval(function () {
                            if (coordinator.state().sessions.length === 0 && Date.now() - lastActivity > idle_1)
                                void stop('idle');
                        }, 60000);
                        timer.unref();
                    }
                    return [4 /*yield*/, new Promise(function (resolve) {
                            var wait = setInterval(function () {
                                if (stopping !== undefined) {
                                    clearInterval(wait);
                                    void stopping.then(resolve);
                                }
                            }, 250);
                        })];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
