"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniOp = exports.BinOp = void 0;
var BinOp;
(function (BinOp) {
    BinOp["Plus"] = "+";
    BinOp["Minus"] = "-";
    BinOp["Mul"] = "*";
    BinOp["Eq"] = "==";
    BinOp["Neq"] = "!=";
    BinOp["Nlt"] = ">=";
    BinOp["Ngt"] = "<=";
    BinOp["Gt"] = ">";
    BinOp["Lt"] = "<";
    BinOp["Is"] = "is";
})(BinOp = exports.BinOp || (exports.BinOp = {}));
var UniOp;
(function (UniOp) {
    UniOp["Not"] = "not";
})(UniOp = exports.UniOp || (exports.UniOp = {}));
//# sourceMappingURL=ast.js.map