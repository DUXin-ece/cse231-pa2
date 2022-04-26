"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var treeprint_1 = require("./treeprint");
var lezer_python_1 = require("lezer-python");
var parser_1 = require("./parser");
var source = "class C(object):\n    x : int = 123\nclass B(object):\n    y: int = 333\n    x: int = 123\n";
console.log(source);
var tree = lezer_python_1.parser.parse(source);
var cursor = tree.cursor();
cursor.firstChild();
do {
    console.log(treeprint_1.stringifyTree(cursor, source, 0));
} while (cursor.nextSibling());
var ast = parser_1.parse(source);
console.log(ast);
var program = parser_1.toprogram(ast);
console.log(program);
// console.log(program)
// const typedprogrm = typeCheckProgram(program)
// const compiled = compiler.compile(source);
// console.log(ast);
//# sourceMappingURL=debugstart.js.map