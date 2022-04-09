"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var lezer_python_1 = require("lezer-python");
var parser_1 = require("../parser");
// We write tests for each function in parser.ts here. Each function gets its 
// own describe statement. Each it statement represents a single test. You
// should write enough unit tests for each function until you are confident
// the parser works as expected. 
describe('traverseExpr(c, s) function', function () {
    it('parses a number in the beginning', function () {
        var source = "987";
        var cursor = lezer_python_1.parser.parse(source).cursor();
        // go to statement
        cursor.firstChild();
        // go to expression
        cursor.firstChild();
        var parsedExpr = parser_1.traverseExpr(cursor, source);
        // Note: we have to use deep equality when comparing objects
        chai_1.expect(parsedExpr).to.deep.equal({ tag: "num", value: 987 });
    });
    // TODO: add additional tests here to ensure traverseExpr works as expected
});
describe('traverseStmt(c, s) function', function () {
    // TODO: add tests here to ensure traverseStmt works as expected
});
describe('traverse(c, s) function', function () {
    // TODO: add tests here to ensure traverse works as expected
});
describe('parse(source) function', function () {
    it('parse a number', function () {
        var parsed = parser_1.parse("987");
        chai_1.expect(parsed).to.deep.equal([{ tag: "expr", expr: { tag: "num", value: 987 } }]);
    });
    // TODO: add additional tests here to ensure parse works as expected
});
//# sourceMappingURL=parser.test.js.map