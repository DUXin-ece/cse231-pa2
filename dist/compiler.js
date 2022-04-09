"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compile = void 0;
var ast_1 = require("./ast");
var parser_1 = require("./parser");
function compile(source) {
    var ast = parser_1.parse(source);
    var definedVars = new Set();
    ast.forEach(function (s) {
        switch (s.tag) {
            case "define":
                definedVars.add(s.name);
                break;
        }
    });
    var scratchVar = "(local $$last i32)";
    var localDefines = [scratchVar];
    definedVars.forEach(function (v) {
        localDefines.push("(local $" + v + " i32)");
    });
    var commandGroups = ast.map(function (stmt) { return codeGen(stmt); });
    var commands = localDefines.concat([].concat.apply([], commandGroups));
    console.log("Generated: ", commands.join("\n"));
    return {
        wasmSource: commands.join("\n"),
    };
}
exports.compile = compile;
function codeGen(stmt) {
    switch (stmt.tag) {
        case "define":
            var valStmts = codeGenExpr(stmt.value);
            return valStmts.concat(["(local.set $" + stmt.name + ")"]);
        case "expr":
            var exprStmts = codeGenExpr(stmt.expr);
            return exprStmts.concat(["(local.set $$last)"]);
    }
}
function codeGenExpr(expr) {
    switch (expr.tag) {
        case "builtin1":
            var argStmts = codeGenExpr(expr.arg);
            return argStmts.concat(["(call $" + expr.name + ")"]);
        case ("builtin2"):
            var arg1Stmts = codeGenExpr(expr.arg1);
            var arg2Stmts = codeGenExpr(expr.arg2);
            return __spreadArrays(arg1Stmts, arg2Stmts, ["(call $" + expr.name + ")"]);
        case "num":
            return ["(i32.const " + expr.value + ")"];
        case "id":
            return ["(local.get $" + expr.name + ")"];
        case "binexpr":
            var leftStmts = codeGenExpr(expr.left);
            var rightStmts = codeGenExpr(expr.right);
            var opStmt = codeGenBinOp(expr.op);
            return __spreadArrays(leftStmts, rightStmts, [opStmt]);
    }
}
function codeGenBinOp(op) {
    switch (op) {
        case ast_1.BinOp.Plus:
            return "(i32.add)";
        case ast_1.BinOp.Minus:
            return "(i32.sub)";
        case ast_1.BinOp.Mul:
            return "(i32.mul)";
    }
}
//# sourceMappingURL=compiler.js.map