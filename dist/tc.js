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
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeCheckLiteral = exports.typeCheckExpr = exports.typeCheckStmts = exports.typeCheckParams = exports.typeCheckFunDef = exports.typeCheckVarInits = exports.returnCheckFunDef = exports.typeCheckProgram = void 0;
var ast_1 = require("./ast");
function duplicateEnv(env) {
    return { vars: new Map(env.vars), funs: new Map(env.funs), retType: env.retType };
}
function typeCheckProgram(prog) {
    var typedvarinits = [];
    var typedfundefs = [];
    var typedstmts = [];
    var env = { vars: new Map(), funs: new Map(), retType: ast_1.Type.none };
    prog.fundefs.forEach(function (fundef) {
        typedfundefs.push(typeCheckFunDef(fundef, env));
        returnCheckFunDef(fundef, env);
    });
    typedvarinits = typeCheckVarInits(prog.varinits, env);
    typedstmts = typeCheckStmts(prog.stmts, env);
    return {
        varinits: typedvarinits,
        fundefs: typedfundefs,
        stmts: typedstmts
    };
}
exports.typeCheckProgram = typeCheckProgram;
function returnCheckFunDef(fundef, env) {
    var stmts_num = fundef.body.length;
    var laststmt = fundef.body[stmts_num - 1];
    if (laststmt.tag == "return") {
        return true;
    }
    else {
        fundef.body.forEach(function (s) {
            if (s.tag == "if") {
                var pathreturn = [];
                var laststmt_if = s.ifbody[s.ifbody.length - 1];
                if (laststmt_if.tag !== "return") {
                    throw new Error("Not all paths return");
                }
                for (var i = 0; i < s.elifbody.length; i++) {
                    var lenarr = s.elifbody[i].length;
                    if (s.elifbody[i][lenarr - 1].tag !== "return") {
                        throw new Error("Not all paths return");
                    }
                }
                var laststmt_else = s.elsebody[s.elsebody.length - 1];
                if (!laststmt_else) {
                    throw new Error("Not all paths return");
                }
                if (laststmt_else.tag !== "return") {
                    throw new Error("Not all paths return");
                }
            }
        });
        return true;
    }
}
exports.returnCheckFunDef = returnCheckFunDef;
function typeCheckVarInits(inits, env) {
    var typedInits = [];
    inits.forEach(function (init) {
        var typedInit = typeCheckExpr(init.init, env);
        if (typedInit.a !== init.type) {
            throw new Error("TYPE ERROR: init type does not match literal type");
        }
        env.vars.set(init.name, init.type);
        typedInits.push(__assign(__assign({}, init), { a: init.type, init: typedInit }));
    });
    return typedInits;
}
exports.typeCheckVarInits = typeCheckVarInits;
function typeCheckFunDef(fun, env) {
    // add params to env
    var localEnv = duplicateEnv(env);
    fun.params.forEach(function (param) {
        localEnv.vars.set(param.name, param.type);
    });
    var typedParams = typeCheckParams(fun.params);
    // add inits to env
    // check inits
    // const typedInits = typeCheckVarInits(fun.inits, env);
    // fun.inits.forEach(init =>{
    //     localEnv.vars.set(init.name, init.type);
    // })
    // add fun type to env
    localEnv.funs.set(fun.name, [fun.params.map(function (param) { return param.type; }), fun.ret]);
    // add ret type
    localEnv.retType = fun.ret;
    // check body
    // make sure every path has the expected return type
    var typedStmts = typeCheckStmts(fun.body, localEnv);
    return __assign(__assign({}, fun), { params: typedParams, body: typedStmts });
}
exports.typeCheckFunDef = typeCheckFunDef;
function typeCheckParams(params) {
    return params.map(function (param) {
        return __assign(__assign({}, param), { a: param.type });
    });
}
exports.typeCheckParams = typeCheckParams;
function typeCheckStmts(stmts, env) {
    var typedStmts = [];
    stmts.forEach(function (stmt) {
        switch (stmt.tag) {
            case "varinit":
                var typedValue = typeCheckExpr(stmt.value, env);
                env.vars.set(stmt.var.name, stmt.var.type);
                console.log(env);
                if (typedValue.a != env.vars.get(stmt.var.name)) {
                    throw new Error("TYPE ERROR: cannot assign value to id");
                }
                typedStmts.push(__assign(__assign({}, stmt), { value: typedValue, a: typedValue.a }));
                break;
            case "assign":
                if (!env.vars.get(stmt.name)) {
                    throw new Error("TYPE ERROR: unbound id");
                }
                var typedValue = typeCheckExpr(stmt.value, env);
                if (typedValue.a !== env.vars.get(stmt.name)) {
                    throw new Error("TYPE ERROR: cannot assign value to id");
                }
                typedStmts.push(__assign(__assign({}, stmt), { value: typedValue, a: typedValue.a }));
                break;
            case "return":
                var typedRet = typeCheckExpr(stmt.ret, env);
                if (env.retType !== typedRet.a) {
                    throw new Error("TYPE ERROR: return type mismatch");
                }
                typedStmts.push(__assign(__assign({}, stmt), { ret: typedRet }));
                break;
            case "if":
                var typedifCond = typeCheckExpr(stmt.ifexpr, env);
                var typedelifCond = [];
                var typedifStmts = typeCheckStmts(stmt.ifbody, env);
                var typedelifStmts = [];
                var typedelseStmts = typeCheckStmts(stmt.elsebody, env);
                // const typedCond ...Expr
                // const typedThen ...Stmt[]
                // const typedEls ...Stmt[]
                stmt.elifexpr.forEach(function (s) {
                    typedelifCond.push(typeCheckExpr(s, env));
                });
                stmt.elifbody.forEach(function (s_arr) {
                    typedelifStmts.push(typeCheckStmts(s_arr, env));
                });
                typedStmts.push(__assign(__assign({}, stmt), { a: ast_1.Type.none, ifexpr: typedifCond, ifbody: typedifStmts, elifexpr: typedelifCond, elifbody: typedelifStmts, elsebody: typedelseStmts }));
                break;
            case "while":
                var typedExpr = typeCheckExpr(stmt.expr, env);
                var typedwhileStmts = typeCheckStmts(stmt.body, env);
                typedStmts.push(__assign(__assign({}, stmt), { a: ast_1.Type.none, expr: typedExpr, body: typedwhileStmts }));
                break;
            case "pass":
                typedStmts.push(__assign(__assign({}, stmt), { a: ast_1.Type.none }));
                break;
            case "expr":
                var typedExpr = typeCheckExpr(stmt.expr, env);
                typedStmts.push(__assign(__assign({}, stmt), { a: ast_1.Type.none, expr: typedExpr }));
                break;
        }
    });
    return typedStmts;
}
exports.typeCheckStmts = typeCheckStmts;
function typeCheckExpr(expr, env) {
    switch (expr.tag) {
        case "literal":
            var lit = typeCheckLiteral(expr.literal);
            return __assign(__assign({}, expr), { a: lit.a });
        case "id": //catch referrence error here!
            if (!env.vars.has(expr.name)) {
                throw new Error("TYPE ERROR: unbound id");
            }
            var idType = env.vars.get(expr.name);
            return __assign(__assign({}, expr), { a: idType });
        case "builtin1":
            var arg = typeCheckExpr(expr.arg, env);
            return __assign(__assign({}, expr), { a: ast_1.Type.int, arg: arg });
        case "builtin2":
            var arg1 = typeCheckExpr(expr.arg1, env);
            var arg2 = typeCheckExpr(expr.arg2, env);
            if (arg1.a !== ast_1.Type.int) {
                throw new Error("TYPE ERROR: arg1 must be an int");
            }
            if (arg2.a !== ast_1.Type.int) {
                throw new Error("TYPE ERROR: arg2 must be an int");
            }
            return __assign(__assign({}, expr), { arg1: arg1, arg2: arg2, a: ast_1.Type.int });
        case "call":
            return __assign(__assign({}, expr), { a: ast_1.Type.int });
        case "binexpr":
            var left = typeCheckExpr(expr.left, env);
            var right = typeCheckExpr(expr.right, env);
            if (left.a !== ast_1.Type.int) {
                throw new Error("TYPE ERROR: left must be an int");
            }
            if (right.a !== ast_1.Type.int) {
                throw new Error("TYPE ERROR: right must be an int");
            }
            return __assign(__assign({}, expr), { a: ast_1.Type.int, left: left, right: right });
    }
}
exports.typeCheckExpr = typeCheckExpr;
function typeCheckLiteral(literal) {
    switch (literal.tag) {
        case "num":
            return __assign(__assign({}, literal), { a: ast_1.Type.int });
        case "bool":
            return __assign(__assign({}, literal), { a: ast_1.Type.bool });
        case "none":
            return __assign(__assign({}, literal), { a: ast_1.Type.none });
    }
}
exports.typeCheckLiteral = typeCheckLiteral;
//# sourceMappingURL=tc.js.map