"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.codeGenStmt = exports.compile = void 0;
var ast_1 = require("./ast");
var parser_1 = require("./parser");
var tc_1 = require("./tc");
function variableNames(stmts) {
    var vars = [];
    stmts.forEach(function (stmt) {
        if (stmt.tag === "varinit") {
            vars.push(stmt.var.name);
        }
    });
    return vars;
}
function compile(source) {
    var ast = parser_1.parse(source);
    var program = parser_1.toprogram(ast);
    var typedprogrm = tc_1.typeCheckProgram(program);
    var emptyEnv = new Map();
    var globaldVarsDecl = new Set();
    typedprogrm.varinits.forEach(function (v) {
        globaldVarsDecl.add(v.name);
    });
    var globalDefines = [];
    globaldVarsDecl.forEach(function (v) {
        globalDefines.push("(global $" + v + " (mut i32) (i32.const 0))");
    });
    var VarInitGroups = typedprogrm.varinits.map(function (varinit) { return codeGenVarInit(varinit, emptyEnv); });
    var FuncdefGroups = typedprogrm.fundefs.map(function (fundef) { return codeGenFunDef(fundef, emptyEnv); });
    var commandGroups = typedprogrm.stmts.map(function (stmt) { return codeGenStmt(stmt, emptyEnv); });
    var commands = [].concat.apply([], VarInitGroups).concat([].concat.apply([], commandGroups));
    return {
        varinits: globalDefines.join("\n"),
        funcdef: __spreadArrays(FuncdefGroups).join("\n"),
        wasmSource: commands.join("\n")
    };
}
exports.compile = compile;
function codeGenVarInit(varinit, locals) {
    var init = codeGenExpr(varinit.init, locals);
    return init.concat(["(global.set $" + varinit.name + ")"]);
}
function codeGenFunDef(fundef, locals) {
    var withParamsAndVariables = new Map(locals.entries());
    // Construct the environment for the function body
    var variables = variableNames(fundef.body); //local variables
    variables.forEach(function (v) { return withParamsAndVariables.set(v, true); });
    fundef.params.forEach(function (p) { return withParamsAndVariables.set(p.name, true); });
    var params = fundef.params.map(function (p) { return "(param $" + p.name + " i32)"; }).join(" ");
    var varDecls = variables.map(function (v) { return "(local $" + v + " i32)"; }).join("\n");
    var stmts = [];
    fundef.body.map(function (s) { stmts.push(codeGenStmt(s, withParamsAndVariables)); });
    var flattenstmts = [].concat.apply([], stmts);
    var stmtsBody = flattenstmts.join("\n");
    return ["(func $" + fundef.name + " " + params + " (result i32)\n      (local $scratch i32)\n      " + varDecls + "\n      " + stmtsBody + "\n      (i32.const 0))"];
}
function codeGenStmt(stmt, locals) {
    switch (stmt.tag) {
        case "varinit":
            var valStmts = codeGenExpr(stmt.value, locals);
            if (locals.has(stmt.var.name)) {
                valStmts.push("(local.set $" + stmt.var.name + ")");
            }
            else {
                valStmts.push("(global.set $" + stmt.var.name + ")");
            }
            return valStmts;
        case "return":
            var valStmts = codeGenExpr(stmt.ret, locals);
            valStmts.push("return");
            return valStmts;
        case "assign":
            if (typeof stmt.name == "string") {
                var valStmts = codeGenExpr(stmt.value, locals);
                if (locals.has(stmt.name)) {
                    valStmts.push("(local.set $" + stmt.name + ")");
                }
                else {
                    valStmts.push("(global.set $" + stmt.name + ")");
                }
                return valStmts;
            }
            else {
                throw new Error("TODO");
            }
        case "expr":
            var result = codeGenExpr(stmt.expr, locals);
            result.push("(local.set $scratch)");
            return result;
        case "pass":
            return ["nop"];
        case "if":
            var condExpr = codeGenExpr(stmt.ifexpr, locals);
            var elifExpr = [];
            var ifStmts = [];
            var elifStmts = [];
            var elseStmts = [];
            stmt.elifexpr.forEach(function (e) {
                elifExpr.push(codeGenExpr(e, locals));
            });
            stmt.ifbody.forEach(function (s) {
                ifStmts.push(codeGenStmt(s, locals));
            });
            stmt.elifbody.forEach(function (s_arr) {
                var temp = [];
                s_arr.forEach(function (s) {
                    temp.push(codeGenStmt(s, locals));
                });
                elifStmts.push([].concat.apply([], temp));
            });
            stmt.elsebody.forEach(function (s) {
                elseStmts.push(codeGenStmt(s, locals));
            });
            var result = condExpr.concat(["(if (then"]).concat([].concat.apply([], ifStmts)).concat([")", "(else"]);
            for (var i = 0; i < elifExpr.length; i++) {
                result = result.concat(elifExpr[i]).concat(["(if (then"]).concat(elifStmts[i]).concat([")", "(else"]);
            }
            var flattenstmts = [].concat.apply([], elseStmts);
            result = result.concat(flattenstmts).concat(["))"]);
            for (var i = 0; i < elifExpr.length; i++) {
                result = result.concat(["))"]);
            }
            ;
            return result;
        case "while":
            var condExpr = codeGenExpr(stmt.expr, locals);
            var whileBody = [];
            stmt.body.forEach(function (s) {
                whileBody.push(codeGenStmt(s, locals));
            });
            var result = ["(block"].concat(condExpr).concat(["i32.eqz", "br_if 0"])
                .concat("(loop").concat([].concat.apply([], whileBody)).concat(condExpr).
                concat(["i32.eqz", "br_if 1", "br 0", "))"]);
            return result;
    }
}
exports.codeGenStmt = codeGenStmt;
function codeGenExpr(expr, locals) {
    switch (expr.tag) {
        case "builtin1":
            var argStmts = codeGenExpr(expr.arg, locals);
            var toCall;
            if (expr.name == "print") {
                switch (expr.arg.a) {
                    case ("bool"):
                        toCall = "print_bool";
                        break;
                    case ("int"):
                        toCall = "print_num";
                        break;
                    case ("none"):
                        toCall = "print_none";
                        break;
                }
            }
            else {
                toCall = expr.name;
            }
            return argStmts.concat(["(call $" + toCall + ")"]);
        case ("builtin2"):
            var arg1Stmts = codeGenExpr(expr.arg1, locals);
            var arg2Stmts = codeGenExpr(expr.arg2, locals);
            return __spreadArrays(arg1Stmts, arg2Stmts, ["(call $" + expr.name + ")"]);
        case ("call"):
            var argList = expr.args.map(function (e) { return codeGenExpr(e, locals); });
            var flattenargList = [].concat.apply([], argList);
            return flattenargList.concat(["(call $" + expr.name + ")"]);
        case "literal":
            if (expr.literal.tag == "num") {
                return ["(i32.const " + expr.literal.value + ")"];
            }
            else if (expr.literal.tag == "bool") {
                if (expr.literal.value == true) {
                    return ["(i32.const " + "1 " + ")"];
                }
                else {
                    return ["(i32.const " + "0 " + ")"];
                }
            }
            else {
                return ["(i32.const " + "0 " + ")"];
            }
        case "id":
            if (locals.has(expr.name)) {
                return ["(local.get $" + expr.name + ")"];
            }
            else {
                return ["(global.get $" + expr.name + ")"];
            }
        case "binexpr":
            var leftStmts = codeGenExpr(expr.left, locals);
            var rightStmts = codeGenExpr(expr.right, locals);
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
        case ast_1.BinOp.Eq:
            return "(i32.eq)";
        case ast_1.BinOp.Gt:
            return "i32.gt_u";
        case ast_1.BinOp.Lt:
            return "(i32.lt_u)";
        case ast_1.BinOp.Neq:
            return "(i32.ne)";
        case ast_1.BinOp.Ngt:
            return "(i32.le_u)";
        case ast_1.BinOp.Nlt:
            return "(i32.ge_u)";
    }
}
//# sourceMappingURL=compiler.js.map