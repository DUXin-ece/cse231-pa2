"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var asserts_test_1 = require("./asserts.test");
var helpers_test_1 = require("./helpers.test");
describe("PA3 visible tests", function () {
    // 1
    asserts_test_1.assertPrint("literal-int-ops", "print(100 + 20 + 3)", ["123"]);
    // 2
    asserts_test_1.assertPrint("literal-bool", "print(True)", ["True"]);
    // 3
    asserts_test_1.assertPrint("print-int-print-bool", "\n  print(0)\n  print(False)", ["0", "False"]);
    // 4
    asserts_test_1.assertPrint("basic-global", "x : int = 0\n     x = -1 * -1\n     print(x)", ["1"]);
    // 5
    asserts_test_1.assertPrint("basic-if", "\nx : int = 0\nif True:\n  x = 5\nelse:\n  x = 3\nprint(x)", ["5"]);
    // 6
    asserts_test_1.assertPrint("basic-class-lookup", "\n  class C(object):\n    x : int = 123\n  \n  c : C = None\n  c = C()\n  print(c.x) ", ["123"]);
    // 7
    asserts_test_1.assertPrint("basic-class-field-assign", "\n  class C(object):\n    x : int = 123\n    \n  c : C = None\n  c = C()\n  c.x = 42\n  print(c.x)", ["42"]);
    // 8
    asserts_test_1.assertPrint("basic-class-method", "\n  class C(object):\n    x : int = 123\n    def getX(self: C) -> int:\n      return self.x\n    def setX(self: C, x: int):\n      self.x = x\n      \nc : C = None\nc = C()\nprint(c.getX())\nc.setX(42)\nprint(c.getX())", ["123", "42"]);
    // 9
    asserts_test_1.assertPrint("multi-class", "\nclass C(object):\n  x : int = 1\n  y : int = 2\n\nclass D(object):\n  y : int = 3\n  x : int = 4\nc : C = None\nd : D = None\nc = C()\nd = D()\nprint(c.x)\nprint(d.x)", ["1", "4"]);
    // 10
    asserts_test_1.assertPrint("alias-obj", "\nclass C(object):\n  x : int = 1\n\nc1 : C = None\nc2 : C = None\n\nc1 = C()\nc2 = c1\nc1.x = 123\nprint(c2.x)\n", ["123"]),
        // 11
        asserts_test_1.assertPrint("chained-method-calls", "\n  class C(object):\n    x : int = 123\n    def new(self: C, x: int) -> C:\n      print(self.x)\n      self.x = x\n      print(self.x)\n      return self\n    def clear(self: C) -> C:\n      return self.new(123)\n  \n  C().new(42).clear()", ["123", "42", "42", "123"]);
    // 12
    asserts_test_1.assertFail("no-fields-for-none", "\n  class C(object):\n    x : int = 0\n    \n  c : C = None\n  c.x");
    // 13
    asserts_test_1.assertPrint("constructor-non-none", "\n  class C(object):\n    x : int = 0\n  print(not (C() is None))", ["True"]);
    // 14
    asserts_test_1.assertTC("non-literal-condition", "\n  x : int = 1\n  y : int = 2\n  if x < y:\n    pass\n  else:\n    x = -x\n  x", helpers_test_1.NUM);
    // 15
    asserts_test_1.assertTC("tc-two-classes", "\n  class C(object):\n    d : D = None\n    \n  class D(object):\n    c : C = None\n  c : C = None\n  c.d\n  ", helpers_test_1.CLASS("D"));
    // 16
    asserts_test_1.assertTC("tc-two-classes-methods", "\n  class C(object):\n    d : D = None\n    def new(self: C, d : D) -> C:\n      self.d = d\n      return self\n      \n  class D(object):\n    c : C = None\n    def new(self: D, c: C) -> D:\n      self.c = c\n      return self\n      \n  c : C = None\n  d : D = None\n  c = C().new(d)\n  c.d.c", helpers_test_1.CLASS("C"));
    // 17
    asserts_test_1.assertTC("none-assignable-to-object", "\n  class C(object):\n    x : int = 1\n    def clear(self: C) -> C:\n      return None\n  \n  c : C = None\n  c = C().clear()\n  c", helpers_test_1.CLASS("C"));
    // 18
    asserts_test_1.assertTC("constructor-type", "\n  class C(object):\n    x : int = 0\n    \n  C()", helpers_test_1.CLASS("C"));
    // 19
    asserts_test_1.assertTCFail("tc-literal", "\n  x : int = None");
    // 20
    asserts_test_1.assertTC("assign-none", "\n  class C(object):\n    x : int = 0\n  c : C = None\n  c = None", helpers_test_1.NONE);
});
//# sourceMappingURL=pa3-visible.test.js.map