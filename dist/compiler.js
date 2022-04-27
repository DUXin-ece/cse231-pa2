"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.codeGenStmt = exports.codeGenMethod = exports.codeGenClassinit = exports.compile = void 0;
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
    var globalVarsDecl = new Set();
    var classes = new Map();
    typedprogrm.varinits.forEach(function (v) {
        globalVarsDecl.add(v.name);
    });
    typedprogrm.classdefs.forEach(function (c) {
        classes.set(c.name, c);
    });
    var globalDefines = [];
    globalDefines.push("(global $heap (mut i32) (i32.const 0))");
    globalVarsDecl.forEach(function (v) {
        globalDefines.push("(global $" + v + " (mut i32) (i32.const 0))");
    });
    var VarInitGroups = typedprogrm.varinits.map(function (varinit) { return codeGenVarInit(varinit, emptyEnv, classes, globalVarsDecl); });
    var FuncdefGroups = typedprogrm.fundefs.map(function (fundef) { return codeGenFunDef(fundef, emptyEnv, classes, globalVarsDecl); });
    var commandGroups = typedprogrm.stmts.map(function (stmt) { return codeGenStmt(stmt, emptyEnv, classes, globalVarsDecl); });
    var MethodGroups = typedprogrm.classdefs.map(function (classdef) { return codeGenMethod(classdef, emptyEnv, classes, globalVarsDecl); });
    var commands = [].concat.apply([], VarInitGroups).concat([].concat.apply([], commandGroups));
    return {
        varinits: globalDefines.join("\n"),
        funcdef: __spreadArrays(FuncdefGroups).join("\n"),
        methoddef: __spreadArrays(MethodGroups).join("\n"),
        wasmSource: commands.join("\n")
    };
}
exports.compile = compile;
function codeGenVarInit(varinit, locals, classes, globals) {
    var init = codeGenExpr(varinit.init, locals, classes, globals);
    if (globals.has(varinit.name)) {
        return init.concat(["(global.set $" + varinit.name + ")"]);
    }
    else {
        return init;
    }
}
function codeGenFunDef(fundef, locals, classes, globals) {
    var withParamsAndVariables = new Map(locals.entries());
    // Construct the environment for the function body
    var variables = variableNames(fundef.body); //local variables
    variables.forEach(function (v) { return withParamsAndVariables.set(v, true); });
    fundef.params.forEach(function (p) { return withParamsAndVariables.set(p.name, true); });
    var params = fundef.params.map(function (p) { return "(param $" + p.name + " i32)"; }).join(" ");
    var varDecls = variables.map(function (v) { return "(local $" + v + " i32)"; }).join("\n");
    var stmts = [];
    fundef.body.map(function (s) { stmts.push(codeGenStmt(s, withParamsAndVariables, classes, globals)); });
    var flattenstmts = [].concat.apply([], stmts);
    var stmtsBody = flattenstmts.join("\n");
    return ["(func $" + fundef.name + " " + params + " (result i32)\n      (local $scratch i32)\n      " + varDecls + "\n      " + stmtsBody + "\n      (i32.const 0))"];
}
function codeGenClassinit(classdef, locals, classes, globals) {
    return null;
}
exports.codeGenClassinit = codeGenClassinit;
function codeGenMethod(classdef, locals, classes, globals) {
    var wasmmethods = [];
    if (classdef.methods) {
        classdef.methods.forEach(function (m) {
            var withParamsAndVariables = new Map(locals.entries());
            var variables = variableNames(m.body); //local variables
            variables.forEach(function (v) { return withParamsAndVariables.set(v, true); });
            m.params.forEach(function (p) { return withParamsAndVariables.set(p.name, true); });
            var params = m.params.map(function (p) { return "(param $" + p.name + " i32)"; }).join(" ");
            var varDecls = variables.map(function (v) { return "(local $" + v + " i32)"; }).join("\n");
            var stmts = [];
            m.body.map(function (s) { stmts.push(codeGenStmt(s, withParamsAndVariables, classes, globals)); });
            var flattenstmts = [].concat.apply([], stmts);
            var stmtsBody = flattenstmts.join("\n");
            wasmmethods.concat(["(func $" + m.name + "$" + classdef.name + " " + params + " (result i32)\n          (local $scratch i32)\n          " + varDecls + "\n          " + stmtsBody + "\n          (i32.const 0))"]);
        });
    }
    return wasmmethods;
}
exports.codeGenMethod = codeGenMethod;
function codeGenStmt(stmt, locals, classes, globals) {
    switch (stmt.tag) {
        case "varinit":
            var valStmts = codeGenExpr(stmt.value, locals, classes, globals);
            if (locals.has(stmt.var.name)) {
                valStmts.push("(local.set $" + stmt.var.name + ")");
            }
            else if (globals.has(stmt.var.name)) {
                valStmts.push("(global.set $" + stmt.var.name + ")");
            }
            else { } // class fields. This should be allocated on heap
            return valStmts;
        case "return":
            var valStmts = codeGenExpr(stmt.ret, locals, classes, globals);
            valStmts.push("return");
            return valStmts;
        case "assign":
            if (stmt.name.tag == "lookup") {
                var valStmts = codeGenExpr(stmt.value, locals, classes, globals);
                var fieldStmts = codeGenExpr(stmt.name, locals, classes, globals);
                fieldStmts.pop(); // Do not need load here
                fieldStmts.push.apply(// Do not need load here
                fieldStmts, valStmts);
                fieldStmts.push("i32.store");
                return fieldStmts;
            }
            else {
                var valStmts = codeGenExpr(stmt.value, locals, classes, globals);
                if (locals.has(stmt.name.name)) {
                    valStmts.push("(local.set $" + stmt.name.name + ")");
                }
                else if (globals.has(stmt.name.name)) {
                    valStmts.push("(global.set $" + stmt.name.name + ")");
                }
                else { }
                return valStmts;
            }
        case "expr":
            var result = codeGenExpr(stmt.expr, locals, classes, globals);
            result.push("(local.set $scratch)");
            return result;
        case "pass":
            return ["nop"];
        case "if":
            var condExpr = codeGenExpr(stmt.ifexpr, locals, classes, globals);
            var elifExpr = [];
            var ifStmts = [];
            var elifStmts = [];
            var elseStmts = [];
            stmt.elifexpr.forEach(function (e) {
                elifExpr.push(codeGenExpr(e, locals, classes, globals));
            });
            stmt.ifbody.forEach(function (s) {
                ifStmts.push(codeGenStmt(s, locals, classes, globals));
            });
            stmt.elifbody.forEach(function (s_arr) {
                var temp = [];
                s_arr.forEach(function (s) {
                    temp.push(codeGenStmt(s, locals, classes, globals));
                });
                elifStmts.push([].concat.apply([], temp));
            });
            stmt.elsebody.forEach(function (s) {
                elseStmts.push(codeGenStmt(s, locals, classes, globals));
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
            var condExpr = codeGenExpr(stmt.expr, locals, classes, globals);
            var whileBody = [];
            stmt.body.forEach(function (s) {
                whileBody.push(codeGenStmt(s, locals, classes, globals));
            });
            var result = ["(block"].concat(condExpr).concat(["i32.eqz", "br_if 0"])
                .concat("(loop").concat([].concat.apply([], whileBody)).concat(condExpr).
                concat(["i32.eqz", "br_if 1", "br 0", "))"]);
            return result;
    }
}
exports.codeGenStmt = codeGenStmt;
function codeGenExpr(expr, locals, classes, globals) {
    switch (expr.tag) {
        case "builtin1":
            var argStmts = codeGenExpr(expr.arg, locals, classes, globals);
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
            var arg1Stmts = codeGenExpr(expr.arg1, locals, classes, globals);
            var arg2Stmts = codeGenExpr(expr.arg2, locals, classes, globals);
            return __spreadArrays(arg1Stmts, arg2Stmts, ["(call $" + expr.name + ")"]);
        case ("call"):
            if (classes.has(expr.name)) {
                var initvals = [];
                var classdata = classes.get(expr.name);
                var classfields = classdata.fields;
                classfields.forEach(function (f, index) {
                    var offset = index * 4;
                    initvals = __spreadArrays(initvals, [
                        "(global.get $heap)",
                        "(i32.add (i32.const " + offset + "))"
                    ], codeGenVarInit(f, locals, classes, globals), [
                        "i32.store"
                    ]);
                });
                return __spreadArrays(initvals, [
                    "(global.get $heap)",
                    "(global.set $heap (i32.add (global.get $heap)(i32.const " + classdata.fields.length * 4 + ")))"
                ]);
            }
            else {
                var argList = expr.args.map(function (e) { return codeGenExpr(e, locals, classes, globals); });
                var flattenargList = [].concat.apply([], argList);
                return flattenargList.concat(["(call $" + expr.name + ")"]);
            }
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
            var leftStmts = codeGenExpr(expr.left, locals, classes, globals);
            var rightStmts = codeGenExpr(expr.right, locals, classes, globals);
            var opStmt = codeGenBinOp(expr.op);
            return __spreadArrays(leftStmts, rightStmts, [opStmt]);
        case "lookup":
            var objStmts = codeGenExpr(expr.obj, locals, classes, globals);
            var classtype = expr.obj.a;
            var classfields = classes.get(classtype.class).fields;
            var indexoffield = getindex(classfields, expr.field);
            return __spreadArrays(objStmts, [
                "(i32.const " + indexoffield * 4 + ")",
                "(i32.add)",
                "(i32.load)"
            ]);
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
function getindex(fields, field) {
    var index;
    for (index = 0; index < fields.length; index++) {
        if (fields[index].name == field) {
            return index;
        }
    }
    return -1;
}
//# sourceMappingURL=compiler.js.map