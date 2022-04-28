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
exports.typeCheckLiteral = exports.typeCheckExpr = exports.typeCheckStmts = exports.typeCheckParams = exports.typeCheckFunDef = exports.typeCheckClassDef = exports.typeCheckVarInits = exports.returnCheckFunDef = exports.typeCheckProgram = void 0;
var ast_1 = require("./ast");
function duplicateEnv(env) {
    return { vars: new Map(env.vars), funs: new Map(env.funs), classes: (env.classes), retType: env.retType };
}
function typeCheckProgram(prog) {
    var typedvarinits = [];
    var typedfundefs = [];
    var typedstmts = [];
    var typedclassdefs = [];
    var env = { vars: new Map(), funs: new Map(), classes: new Map(), retType: "none" };
    prog.fundefs.forEach(function (fundef) {
        typedfundefs.push(typeCheckFunDef(fundef, env));
        returnCheckFunDef(fundef, env);
    });
    prog.classdefs.forEach(function (cls) {
        typedclassdefs.push(typeCheckClassDef(cls, env));
    });
    typedvarinits = typeCheckVarInits(prog.varinits, env);
    typedstmts = typeCheckStmts(prog.stmts, env);
    return {
        varinits: typedvarinits,
        fundefs: typedfundefs,
        classdefs: typedclassdefs,
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
        if (typedInit.a == "none" && typeof init.type == "object") {
        }
        else if (typeof typedInit.a == "string" && typeof init.type == "string") { // int, bool, none
            if (typedInit.a !== init.type) {
                throw new Error("TYPE ERROR: init type does not match literal type");
            }
        }
        else {
            throw new Error("TYPE ERROR: init type does not match literal type");
        }
        env.vars.set(init.name, init.type);
        typedInits.push(__assign(__assign({}, init), { a: init.type, init: typedInit }));
    });
    return typedInits;
}
exports.typeCheckVarInits = typeCheckVarInits;
function typeCheckClassDef(aclass, env) {
    var classenv = new Map();
    env.funs.set(aclass.name, [undefined, { tag: "object", class: aclass.name }]);
    var localEnv = duplicateEnv(env);
    var typedclass;
    var typedfields = [];
    var typedmethods = [];
    aclass.fields.forEach(function (v) {
        localEnv.vars.set(v.name, v.type);
        classenv.set(v.name, v.type);
    });
    env.classes.set(aclass.name, classenv);
    localEnv.classes.set(aclass.name, classenv);
    typedfields = typeCheckVarInits(aclass.fields, localEnv);
    aclass.methods.forEach(function (m) {
        var methodname = m.name + "$" + aclass.name;
        localEnv.funs.set(methodname, [m.params.map(function (param) { return param.type; }), m.ret]);
        env.funs.set(methodname, [m.params.map(function (param) { return param.type; }), m.ret]);
        classenv.set(methodname, m.ret);
        typedmethods.push(typeCheckFunDef(m, localEnv));
    });
    typedclass = __assign(__assign({}, aclass), { a: { tag: "object", class: aclass.name }, fields: typedfields, methods: typedmethods });
    return typedclass;
}
exports.typeCheckClassDef = typeCheckClassDef;
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
    env.funs.set(fun.name, [fun.params.map(function (param) { return param.type; }), fun.ret]);
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
                var lvalueType = env.vars.get(stmt.var.name);
                if (typeof lvalueType == "object") {
                    if (typedValue.a != "none") {
                        throw new Error("TYPE ERROR: class must be initialized as none type");
                    }
                }
                else if (typeof lvalueType == "string") {
                    if (typedValue.a != env.vars.get(stmt.var.name)) {
                        throw new Error("TYPE ERROR: cannot assign value to id");
                    }
                }
                typedStmts.push(__assign(__assign({}, stmt), { value: typedValue, a: typedValue.a }));
                break;
            case "assign":
                if (stmt.name.tag == "id") {
                    var varname = env.vars.get(stmt.name.name);
                    if (!varname) {
                        throw new Error("TYPE ERROR: unbound id");
                    }
                    var typedValue = typeCheckExpr(stmt.value, env);
                    if (typeof varname == "object") {
                        if (typedValue.a == "none") {
                            // Allow
                        }
                        else if (typeof typedValue.a == "object" && typedValue.a.class == varname.class) {
                            // Allow
                        }
                        else {
                            throw new Error("TYPE ERROR: cannot assign value to id");
                        }
                    }
                    else if (typedValue.a !== env.vars.get(stmt.name.name)) {
                        throw new Error("TYPE ERROR: cannot assign value to id");
                    }
                    typedStmts.push(__assign(__assign({}, stmt), { value: typedValue, a: typedValue.a }));
                }
                else if (stmt.name.tag == "lookup") {
                    var typedValue = typeCheckExpr(stmt.value, env);
                    var typedLValue = typeCheckExpr(stmt.name, env);
                    if (typeof typedLValue.a == "object") {
                        if (typeof typedValue.a == "object" && typedLValue.a.class == typedValue.a.class) {
                        }
                        else if (typedValue.a == "none") { }
                        else {
                            throw new Error("TYPE ERROR: cannot assign value to lookup");
                        }
                    }
                    else if (typedLValue.a != typedValue.a) {
                        throw new Error("TYPE ERROR: cannot assign value to lookup");
                    }
                    typedStmts.push(__assign(__assign({}, stmt), { value: typedValue, name: typedLValue, a: typedValue.a }));
                }
                break;
            case "return":
                var typedRet = typeCheckExpr(stmt.ret, env);
                if (typeof env.retType == "object" && typeof typedRet.a == "object") {
                    var classtype = typedRet.a;
                    if (env.retType.class !== classtype.class) {
                        throw new Error("TYPE ERROR: return type mismatch");
                    }
                }
                else if (env.retType !== typedRet.a) {
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
                typedStmts.push(__assign(__assign({}, stmt), { a: "none", ifexpr: typedifCond, ifbody: typedifStmts, elifexpr: typedelifCond, elifbody: typedelifStmts, elsebody: typedelseStmts }));
                break;
            case "while":
                var typedExpr = typeCheckExpr(stmt.expr, env);
                var typedwhileStmts = typeCheckStmts(stmt.body, env);
                typedStmts.push(__assign(__assign({}, stmt), { a: "none", expr: typedExpr, body: typedwhileStmts }));
                break;
            case "pass":
                typedStmts.push(__assign(__assign({}, stmt), { a: "none" }));
                break;
            case "expr":
                var typedExpr = typeCheckExpr(stmt.expr, env);
                typedStmts.push(__assign(__assign({}, stmt), { a: typedExpr.a, expr: typedExpr }));
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
            return __assign(__assign({}, expr), { a: "int", arg: arg });
        case "builtin2":
            var arg1 = typeCheckExpr(expr.arg1, env);
            var arg2 = typeCheckExpr(expr.arg2, env);
            if (arg1.a !== "int") {
                throw new Error("TYPE ERROR: arg1 must be an int");
            }
            if (arg2.a !== "int") {
                throw new Error("TYPE ERROR: arg2 must be an int");
            }
            return __assign(__assign({}, expr), { arg1: arg1, arg2: arg2, a: "int" });
        case "call":
            var func = env.funs.get(expr.name);
            return __assign(__assign({}, expr), { a: func[1] }); // 1 is return type
        case "uniexpr":
            var boolexpr = typeCheckExpr(expr.expr, env);
            if (boolexpr.a !== "bool") {
                throw new Error("TYPE ERROR: Not a boolean expression");
            }
            else {
                return __assign(__assign({}, expr), { a: boolexpr.a });
            }
        case "binexpr":
            var left = typeCheckExpr(expr.left, env);
            var right = typeCheckExpr(expr.right, env);
            switch (expr.op) {
                case ast_1.BinOp.Plus:
                case ast_1.BinOp.Minus:
                case ast_1.BinOp.Mul:
                    if (left.a !== "int") {
                        throw new Error("TYPE ERROR: left must be an int");
                    }
                    if (right.a !== "int") {
                        throw new Error("TYPE ERROR: right must be an int");
                    }
                    return __assign(__assign({}, expr), { a: "int", left: left, right: right });
                case ast_1.BinOp.Eq:
                case ast_1.BinOp.Gt:
                case ast_1.BinOp.Lt:
                case ast_1.BinOp.Neq:
                case ast_1.BinOp.Ngt:
                case ast_1.BinOp.Nlt:
                    if (left.a !== "int") {
                        throw new Error("TYPE ERROR: left must be an int");
                    }
                    if (right.a !== "int") {
                        throw new Error("TYPE ERROR: right must be an int");
                    }
                    return __assign(__assign({}, expr), { a: "bool", left: left, right: right });
                case ast_1.BinOp.Is:
                    if (left.a === "int" || right.a === "int" || left.a === "bool" || right.a === "bool") {
                        throw new TypeError("TYPE ERROR: Not supported type");
                    }
                    return __assign(__assign({}, expr), { a: "bool", left: left, right: right });
            }
        case "lookup":
            var obj = typeCheckExpr(expr.obj, env);
            if (typeof obj.a == "object") {
                if (obj.a.tag != "object") {
                    throw new Error("TYPE ERROR: not an object");
                }
            }
            else {
                throw new Error("TYPE ERROR: not an object");
            }
            var classinfo = env.classes.get(obj.a.class);
            var fieldtype = classinfo.get(expr.field);
            return __assign(__assign({}, expr), { a: fieldtype, obj: obj });
        case "method":
            var obj = typeCheckExpr(expr.obj, env);
            if (typeof obj.a == "object") {
                if (obj.a.tag != "object") {
                    throw new Error("TYPE ERROR: not an object");
                }
            }
            else {
                throw new Error("TYPE ERROR: not an object");
            }
            var classname = obj.a.class;
            var argself = { a: { tag: "object", class: classname }, tag: "id", name: "self" };
            var newargs = [];
            newargs.push(argself);
            var realargs = expr.args.map(function (a) { return typeCheckExpr(a, env); });
            newargs = newargs.concat(realargs);
            var methodname = expr.name + "$" + classname;
            var _a = env.funs.get(methodname), argTypes = _a[0], retType = _a[1];
            argTypes.forEach(function (t, i) {
                if (typeof t == "object" && typeof newargs[i].a == "object") {
                    var a = newargs[i].a;
                    if (t.class !== a.class) {
                        throw new Error("TYPE ERROR: mismatch");
                    }
                }
                else if (t !== newargs[i].a) {
                    throw new Error("TYPE ERROR: mismatch");
                }
            });
            return __assign(__assign({}, expr), { obj: obj, args: newargs, a: retType });
    }
}
exports.typeCheckExpr = typeCheckExpr;
function typeCheckLiteral(literal) {
    switch (literal.tag) {
        case "num":
            return __assign(__assign({}, literal), { a: "int" });
        case "bool":
            return __assign(__assign({}, literal), { a: "bool" });
        case "none":
            return __assign(__assign({}, literal), { a: "none" });
    }
}
exports.typeCheckLiteral = typeCheckLiteral;
//# sourceMappingURL=tc.js.map