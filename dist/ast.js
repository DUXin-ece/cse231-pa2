"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Type = exports.BinOp = void 0;
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
})(BinOp = exports.BinOp || (exports.BinOp = {}));
var Type;
(function (Type) {
    Type["int"] = "int";
    Type["bool"] = "bool";
    Type["none"] = "none";
})(Type = exports.Type || (exports.Type = {}));
//# sourceMappingURL=ast.js.map