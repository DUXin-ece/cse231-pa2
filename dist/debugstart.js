"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var treeprint_1 = require("./treeprint");
var python_1 = require("@lezer/python");
var parser_1 = require("./parser");
var tc_1 = require("./tc");
var compiler = __importStar(require("./compiler"));
var hidden2 = "\nclass C(object):\n  def f(self : C, x : int) -> int:\n    return x * 2\n\nc : C = None\nc = C()\nif c.f(c.f(2)):\n  pass\nelse:\n  pass\n";
var hidden4 = "\nclass C(object):\n    def none(self: C) -> C:\n        return None\n  \nC().none()\n";
var hidden12 = "\nclass C(object):\n   def f(self: C) -> int:\n     if True:\n       return 0\n     else:\n       pass\n\n";
var hidden29 = //init get called
 "\nclass C(object):\n  n : int = 0\n  def __init__(self: C):\n    self.n = 1\n\n";
var source = hidden29;
console.log(source);
var tree = python_1.parser.parse(source);
var cursor = tree.cursor();
cursor.firstChild();
do {
    console.log(treeprint_1.stringifyTree(cursor, source, 0));
} while (cursor.nextSibling());
var ast = parser_1.parse(source);
console.log(ast);
var program = parser_1.toprogram(ast);
console.log(program);
var typedprogrm = tc_1.typeCheckProgram(program);
var compiled = compiler.compile(source);
// console.log(ast);
//# sourceMappingURL=debugstart.js.map