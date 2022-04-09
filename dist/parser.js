"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = exports.traverse = exports.traverseStmt = exports.traverseExpr = exports.traverseArgs = void 0;
var lezer_python_1 = require("lezer-python");
var ast_1 = require("./ast");
function traverseArgs(c, s) {
    var args = [];
    c.firstChild(); // go into arglist
    while (c.nextSibling()) {
        args.push(traverseExpr(c, s));
        c.nextSibling();
    }
    c.parent(); // pop arglist
    return args;
}
exports.traverseArgs = traverseArgs;
function traverseExpr(c, s) {
    switch (c.type.name) {
        case "Number":
            return {
                tag: "num",
                value: Number(s.substring(c.from, c.to))
            };
        case "VariableName":
            return {
                tag: "id",
                name: s.substring(c.from, c.to)
            };
        case "CallExpression":
            c.firstChild();
            var callName = s.substring(c.from, c.to);
            c.nextSibling(); // go to arglist
            var args = traverseArgs(c, s);
            if (args.length == 1) {
                if (callName !== "abs" && callName != "print") {
                    throw new Error("PARSE ERROR: unknown builtin1");
                }
                c.parent(); // pop CallExpression
                return {
                    tag: "builtin1",
                    name: callName,
                    arg: args[0]
                };
            }
            else if (args.length == 2) {
                if (callName !== "max" && callName !== "min" && callName !== "pow") {
                    throw new Error("PARSE ERROR: unknown builtin2");
                }
                c.parent();
                return {
                    tag: "builtin2",
                    name: callName,
                    arg1: args[0],
                    arg2: args[1]
                };
            }
            throw new Error("PARSE ERROR: incorrect arity");
        case "UnaryExpression":
            c.firstChild();
            var uniop = s.substring(c.from, c.to);
            if (uniop !== "+" && uniop !== "-") {
                throw new Error("Could not parse this UinaryExpression");
            }
            c.nextSibling();
            var number = Number(uniop + s.substring(c.from, c.to));
            if (isNaN(number)) {
                throw new Error("Could not parse this UinaryExpression");
            }
            c.parent();
            return { tag: "num", value: number };
        case "BinaryExpression": // num Op num
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
                default:
                    throw new Error("Could not parse expr at " + c.from + " " + c.to + ": " + s.substring(c.from, c.to));
            }
            ;
            c.nextSibling();
            var right = traverseExpr(c, s);
            c.parent(); //pop BinaryExpression
            return { tag: "binexpr", op: op, left: left, right: right };
        default:
            throw new Error("Could not parse expr at " + c.from + " " + c.to + ": " + s.substring(c.from, c.to));
    }
}
exports.traverseExpr = traverseExpr;
function traverseStmt(c, s) {
    switch (c.node.type.name) {
        case "AssignStatement":
            c.firstChild(); // go to name
            var name_1 = s.substring(c.from, c.to);
            c.nextSibling(); // go to equals
            c.nextSibling(); // go to value
            var value = traverseExpr(c, s);
            c.parent();
            return {
                tag: "define",
                name: name_1,
                value: value
            };
        case "ExpressionStatement":
            c.firstChild();
            var expr = traverseExpr(c, s);
            c.parent(); // pop going into stmt
            return { tag: "expr", expr: expr };
        default:
            throw new Error("Could not parse stmt at " + c.node.from + " " + c.node.to + ": " + s.substring(c.from, c.to));
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
            throw new Error("Could not parse program at " + c.node.from + " " + c.node.to);
    }
}
exports.traverse = traverse;
function parse(source) {
    var t = lezer_python_1.parser.parse(source);
    return traverse(t.cursor(), source);
}
exports.parse = parse;
//# sourceMappingURL=parser.js.map