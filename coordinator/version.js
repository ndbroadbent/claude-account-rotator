"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERSION = void 0;
exports.compareVersions = compareVersions;
/** The mod's and the coordinator's version: a session whose mod is newer than the running coordinator upgrades it. */
exports.VERSION = '0.6.1';
/** -1, 0 or 1 as `a` is older than, the same as, or newer than `b` (dotted numbers). */
function compareVersions(a, b) {
    var _a, _b;
    var pa = a.split('.').map(Number);
    var pb = b.split('.').map(Number);
    for (var i = 0; i < Math.max(pa.length, pb.length); i += 1) {
        var x = (_a = pa[i]) !== null && _a !== void 0 ? _a : 0;
        var y = (_b = pb[i]) !== null && _b !== void 0 ? _b : 0;
        if (x !== y)
            return x < y ? -1 : 1;
    }
    return 0;
}
