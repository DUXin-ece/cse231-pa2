"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toprogram = exports.parse = exports.traverse = exports.traverseStmt = exports.traverseExpr = exports.traverseArgs = exports.traverseType = exports.traverseParameters = void 0;
var python_1 = require("@lezer/python");
var ast_1 = require("./ast");
function traverseParameters(s, t) {
    t.firstChild(); // Focuses on open paren
    var parameters = [];
    t.nextSibling(); // Focuses on a VariableName
    while (t.type.name !== ")") {
        var name_1 = s.substring(t.from, t.to);
        t.nextSibling(); // Focuses on "TypeDef", hopefully, or "," if mistake
        var nextTagName = t.type.name; // NOTE(joe): a bit of a hack so the next line doesn't if-split
        if (nextTagName !== "TypeDef") {
            throw new Error("Missed type annotation for parameter " + name_1);
        }
        ;
        t.firstChild(); // Enter TypeDef
        t.nextSibling(); // Focuses on type itself
        var type = traverseType(s, t);
        t.parent();
        t.nextSibling(); // Move on to comma or ")"
        parameters.push({ name: name_1, type: type });
        t.nextSibling(); // Focuses on a VariableName
    }
    t.parent(); // Pop to ParamList
    return parameters;
}
exports.traverseParameters = traverseParameters;
function traverseType(s, t) {
    switch (t.type.name) {
        case "VariableName":
            var name_2 = s.substring(t.from, t.to);
            if (name_2 == "int" || name_2 == "none" || name_2 == "bool") {
                return name_2;
            }
            else {
                return { tag: "object", class: name_2 };
            }
        default:
            throw new Error("Unknown type: " + t.type.name);
    }
}
exports.traverseType = traverseType;
function traverseArgs(c, s) {
    var args = [];
    c.firstChild(); // go into arglist
    while (c.nextSibling() && c.type.name !== ")") {
        args.push(traverseExpr(c, s));
        c.nextSibling();
        //console.log(s.substring(c.from, c.to));
    }
    c.parent(); // pop arglist
    return args;
}
exports.traverseArgs = traverseArgs;
function traverseExpr(c, s) {
    switch (c.type.name) {
        case "None":
            return {
                tag: "literal",
                literal: { tag: "none", value: 0 }
            };
        case "Boolean":
            if (s.substring(c.from, c.to) == "True") {
                return {
                    tag: "literal",
                    literal: { tag: "bool", value: true }
                };
            }
            else if (s.substring(c.from, c.to) == "False") {
                return {
                    tag: "literal",
                    literal: { tag: "bool", value: false }
                };
            }
            else {
                throw new Error("PARSE ERROR: could not parse expr at " + c.from + " " + c.to + ": " + s.substring(c.from, c.to));
            }
        case "Number":
            return {
                tag: "literal",
                literal: { tag: "num", value: Number(s.substring(c.from, c.to)) }
            };
        case "VariableName":
            return {
                tag: "id",
                name: s.substring(c.from, c.to)
            };
        case "ParenthesizedExpression":
            c.firstChild();
            c.nextSibling();
            var newexpr = traverseExpr(c, s);
            c.parent();
            return newexpr;
        case "MemberExpression":
            c.firstChild();
            var obj = traverseExpr(c, s);
            c.nextSibling(); // .
            c.nextSibling();
            var field = s.substring(c.from, c.to);
            c.parent();
            return {
                tag: "lookup",
                obj: obj,
                field: field
            };
        case "CallExpression":
            c.firstChild();
            if (c.type.name == "VariableName") { // This is a function
                var callName = s.substring(c.from, c.to);
                c.nextSibling(); // go to arglist
                var args = traverseArgs(c, s);
                if (callName == "abs" || callName == "print") {
                    c.parent(); // pop CallExpression
                    if (args.length == 1) {
                        return {
                            tag: "builtin1",
                            name: callName,
                            arg: args[0]
                        };
                    }
                    else {
                        throw new Error("PARSE ERROR: incorrect arity");
                    }
                }
                else if (callName == "max" || callName == "min" || callName == "pow") {
                    c.parent();
                    if (args.length == 1) {
                        return {
                            tag: "builtin2",
                            name: callName,
                            arg1: args[0],
                            arg2: args[1]
                        };
                        ;
                    }
                    else {
                        throw new Error("PARSE ERROR: incorrect arity");
                    }
                }
                else {
                    c.parent();
                    return {
                        tag: "call", name: callName, args: args
                    };
                }
            }
            else {
                c.firstChild(); //focus on obj
                var obj = traverseExpr(c, s);
                c.nextSibling();
                c.nextSibling();
                var name = s.substring(c.from, c.to);
                c.parent();
                c.nextSibling();
                var args = traverseArgs(c, s);
                c.parent();
                return {
                    tag: "method",
                    obj: obj,
                    name: name,
                    args: args,
                };
            }
        case "UnaryExpression":
            c.firstChild();
            var uniop = s.substring(c.from, c.to);
            switch (uniop) {
                case "+":
                    c.nextSibling();
                    var expr = traverseExpr(c, s);
                    c.parent();
                    return {
                        tag: "uniexpr",
                        op: ast_1.UniOp.Pos,
                        expr: expr
                    };
                case "-":
                    c.nextSibling();
                    var expr = traverseExpr(c, s);
                    c.parent();
                    return {
                        tag: "uniexpr",
                        op: ast_1.UniOp.Neg,
                        expr: expr
                    };
                case "not":
                    c.nextSibling();
                    var expr = traverseExpr(c, s);
                    c.parent();
                    return {
                        tag: "uniexpr",
                        op: ast_1.UniOp.Not,
                        expr: expr
                    };
                default: throw new Error("PARSE ERROR: could not parse this UinaryExpression");
            }
        case "BinaryExpression":
            c.firstChild();
            var left = traverseExpr(c, s);
            c.nextSibling();
            var op;
            switch (s.substring(c.from, c.to)) {
                case "+":
                    op = ast_1.BinOp.Plus;
                    break;
                case "-":
                    op = ast_1.BinOp.Minus;
                    break;
                case "*":
                    op = ast_1.BinOp.Mul;
                    break;
                case "==":
                    op = ast_1.BinOp.Eq; // equal
                    break;
                case "!=":
                    op = ast_1.BinOp.Neq; // not equal
                    break;
                case ">=":
                    op = ast_1.BinOp.Nlt; // not less than
                    break;
                case "<=":
                    op = ast_1.BinOp.Ngt; // not greater than
                    break;
                case ">":
                    op = ast_1.BinOp.Gt; // greater than
                    break;
                case "<":
                    op = ast_1.BinOp.Lt; // less than
                    break;
                case "is":
                    op = ast_1.BinOp.Is;
                    break;
                default:
                    throw new Error("PARSE ERROR: could not parse expr at " + c.from + " " + c.to + ": " + s.substring(c.from, c.to));
            }
            ;
            c.nextSibling();
            var right = traverseExpr(c, s);
            c.parent(); //pop BinaryExpression
            return { tag: "binexpr", op: op, left: left, right: right };
        default:
            throw new Error("PARSE ERROR: could not parse expr at " + c.from + " " + c.to + ": " + s.substring(c.from, c.to));
    }
}
exports.traverseExpr = traverseExpr;
function traverseStmt(c, s) {
    switch (c.node.type.name) {
        case "PassStatement":
            return {
                tag: "pass"
            };
        case "ReturnStatement":
            c.firstChild(); //return
            c.nextSibling(); //expr
            var returnexpr = traverseExpr(c, s);
            c.parent();
            return {
                tag: "return",
                ret: returnexpr,
            };
        case "AssignStatement":
            c.firstChild(); // go to name
            var lvalue = traverseExpr(c, s);
            if (lvalue.tag == "lookup") { // This cannot happen in the initialization
                c.nextSibling(); // = 
                c.nextSibling(); // value
                var value = traverseExpr(c, s);
                c.parent();
                return {
                    tag: "assign",
                    name: lvalue,
                    value: value
                };
            }
            else if (lvalue.tag == "id") {
                c.nextSibling();
                if (c.type.name == "TypeDef") {
                    c.firstChild(); //:
                    c.nextSibling(); //VariableName, actually typename here
                    var type = s.substring(c.from, c.to);
                    c.parent();
                    c.nextSibling();
                    c.nextSibling();
                    var value = traverseExpr(c, s);
                    c.parent();
                    if (type !== "int" && type !== "bool" && type !== "none") {
                        return {
                            tag: "varinit",
                            var: { name: lvalue.name, type: { tag: "object", class: type } },
                            value: value
                        };
                    }
                    else {
                        return {
                            tag: "varinit",
                            var: { name: lvalue.name, type: type },
                            value: value
                        };
                    }
                }
                else if (c.type.name == "AssignOp") { // Assignment
                    c.nextSibling();
                    var value = traverseExpr(c, s);
                    c.parent();
                    return {
                        tag: "assign",
                        name: lvalue,
                        value: value
                    };
                }
                else { //Actual don't know what else situation can be here
                    throw new Error("PARSE ERROR: could not parse stmt at " + c.node.from + " " + c.node.to + ": " + s.substring(c.from, c.to));
                }
            }
        case "ExpressionStatement":
            c.firstChild();
            var expr = traverseExpr(c, s);
            c.parent(); // pop going into stmt
            return { tag: "expr", expr: expr };
        case "IfStatement":
            var ifbody = [];
            c.firstChild(); //if 
            c.nextSibling(); //expr
            var ifexpr = traverseExpr(c, s);
            c.nextSibling(); // ifbody
            c.firstChild(); // :
            c.nextSibling();
            do {
                ifbody.push(traverseStmt(c, s));
            } while (c.nextSibling());
            c.parent(); //body
            var elifexpr = [];
            var elifbody = [];
            var elsebody = [];
            while (c.nextSibling() && c.type.name == "elif") {
                c.nextSibling(); //expr
                elifexpr.push(traverseExpr(c, s));
                c.nextSibling(); //body
                c.firstChild(); //:
                c.nextSibling();
                var bodystmts = [];
                do {
                    bodystmts.push(traverseStmt(c, s));
                } while (c.nextSibling());
                c.parent();
                elifbody.push(bodystmts);
            }
            //console.log(elifbody)
            if (c.type.name == "else") {
                c.nextSibling();
                c.firstChild(); //:
                c.nextSibling();
                do {
                    elsebody.push(traverseStmt(c, s));
                } while (c.nextSibling());
                c.parent();
            }
            c.parent();
            return {
                tag: "if",
                ifexpr: ifexpr,
                ifbody: ifbody,
                elifexpr: elifexpr,
                elifbody: elifbody,
                elsebody: elsebody
            };
        case "WhileStatement":
            c.firstChild();
            c.nextSibling();
            var whileexpr = traverseExpr(c, s);
            c.nextSibling();
            var whilestmts = [];
            if (c.type.name == "Body") {
                c.firstChild();
                while (c.nextSibling()) {
                    whilestmts.push(traverseStmt(c, s));
                }
            }
            else {
                throw new Error("PARSE ERROR: could not parse while body");
            }
            c.parent();
            return {
                tag: "while",
                expr: whileexpr,
                body: whilestmts
            };
        case "FunctionDefinition":
            c.firstChild(); // Focus on def
            c.nextSibling(); // Focus on name of function
            var funcname = s.substring(c.from, c.to);
            c.nextSibling(); // Focus on ParamList
            var parameters = traverseParameters(s, c);
            c.nextSibling(); // Focus on Body or TypeDef
            var funcret = "none";
            var maybeTD = c;
            if (maybeTD.type.name === "TypeDef") {
                c.firstChild();
                funcret = traverseType(s, c);
                c.parent();
            }
            c.nextSibling(); // Focus on single statement (for now)
            c.firstChild(); // Focus on :
            var body = [];
            while (c.nextSibling()) {
                body.push(traverseStmt(c, s));
            }
            c.parent(); // Pop to Body
            c.parent(); // Pop to FunctionDefinition
            return {
                tag: "funcdef",
                name: funcname,
                params: parameters,
                ret: funcret,
                body: body
            };
        case "ClassDefinition":
            c.firstChild(); // Focus on class keyword
            c.nextSibling(); // Focus on class name
            var classname = s.substring(c.from, c.to);
            c.nextSibling(); // ArgList
            c.firstChild(); // (
            c.nextSibling(); // should be object
            var superclass = s.substring(c.from, c.to);
            c.parent();
            if (superclass !== "object") {
                throw new Error("PARSE ERROR: undefined superclass");
            }
            c.nextSibling(); // Body
            c.firstChild(); // :
            var methods = [];
            var fields = [];
            while (c.nextSibling()) {
                if (c.type.name == "AssignStatement") {
                    var vardecl = traverseStmt(c, s);
                    var varinit = {
                        name: vardecl.var.name,
                        type: vardecl.var.type,
                        init: vardecl.value
                    };
                    fields.push(varinit);
                }
                else if (c.type.name == "FunctionDefinition") {
                    var methodstmt = traverseStmt(c, s);
                    var method = {
                        name: methodstmt.name,
                        params: methodstmt.params,
                        ret: methodstmt.ret,
                        body: methodstmt.body
                    };
                    methods.push(method);
                }
            }
            c.parent();
            c.parent();
            return {
                tag: "class",
                name: classname,
                methods: methods,
                fields: fields
            };
        default:
            throw new Error("PARSE ERROR: could not parse stmt at " + c.node.from + " " + c.node.to + ": " + s.substring(c.from, c.to));
    }
}
exports.traverseStmt = traverseStmt;
function traverse(c, s) {
    switch (c.node.type.name) {
        case "Script":
            var stmts = [];
            c.firstChild();
            do {
                stmts.push(traverseStmt(c, s));
            } while (c.nextSibling());
            console.log("traversed " + stmts.length + " statements ", stmts, "stopped at ", c.node);
            return stmts;
        default:
            throw new Error("PARSE ERROR: could not parse program at " + c.node.from + " " + c.node.to);
    }
}
exports.traverse = traverse;
function parse(source) {
    var t = python_1.parser.parse(source);
    return traverse(t.cursor(), source);
}
exports.parse = parse;
function toprogram(stmts) {
    var varinits = [];
    var fundefs = [];
    var mainstmts = [];
    var classdefs = [];
    var init_state = true;
    stmts.forEach(function (stmt) {
        if (init_state == true && stmt.tag == "varinit") {
            var newvar = {
                name: stmt.var.name,
                type: stmt.var.type,
                init: stmt.value
            };
            varinits.push(newvar);
        }
        else if (init_state == true && stmt.tag == "funcdef") {
            var newfunc = {
                name: stmt.name,
                params: stmt.params,
                ret: stmt.ret,
                body: stmt.body
            };
            fundefs.push(newfunc);
        }
        else if (init_state == true && stmt.tag == "class") {
            var classdef = {
                name: stmt.name,
                methods: stmt.methods,
                fields: stmt.fields
            };
            classdefs.push(classdef);
        }
        else {
            init_state = false;
            if (stmt.tag == "varinit" || stmt.tag == "funcdef" || stmt.tag == "class") {
                throw new Error("PARSE ERROR: Initialization in a wrong place");
            }
            else {
                mainstmts.push(stmt);
            }
        }
    });
    console.log("PARSER DEBUG INFORMATION:");
    console.log("Varinits:", varinits);
    console.log("FunDefs:", fundefs);
    console.log("ClassDefs:", classdefs);
    console.log("Stmts:", mainstmts);
    return {
        varinits: varinits,
        fundefs: fundefs,
        classdefs: classdefs,
        stmts: mainstmts
    };
}
exports.toprogram = toprogram;
//# sourceMappingURL=parser.js.map