"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var runner_1 = require("../runner");
var chai_1 = require("chai");
require("mocha");
var importObject = {
    imports: {
        // we typically define print to mean logging to the console. To make testing
        // the compiler easier, we define print so it logs to a string object.
        //  We can then examine output to see what would have been printed in the
        //  console.
        print: function (arg) {
            importObject.output += arg;
            importObject.output += "\n";
            return arg;
        },
    },
    output: ""
};
// Clear the output before every test
beforeEach(function () {
    importObject.output = "";
});
// We write end-to-end tests here to make sure the compiler works as expected.
// You should write enough end-to-end tests until you are confident the compiler
// runs as expected. 
describe('run(source, config) function', function () {
    var config = { importObject: importObject };
    // We can test the behavior of the compiler in several ways:
    // 1- we can test the return value of a program
    // Note: since run is an async function, we use await to retrieve the 
    // asynchronous return value. 
    it('returns the right number', function () { return __awaiter(void 0, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, runner_1.run("987", config)];
                case 1:
                    result = _a.sent();
                    chai_1.expect(result).to.equal(987);
                    return [2 /*return*/];
            }
        });
    }); });
    // 2- we can test the behavior of the compiler by also looking at the log 
    // resulting from running the program
    it('prints something right', function () { return __awaiter(void 0, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, runner_1.run("print(1337)", config)];
                case 1:
                    result = _a.sent();
                    chai_1.expect(config.importObject.output).to.equal("1337\n");
                    return [2 /*return*/];
            }
        });
    }); });
    // 3- we can also combine both type of assertions, or feel free to use any 
    // other assertions provided by chai.
    it('prints two numbers but returns last one', function () { return __awaiter(void 0, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, runner_1.run("print(987)", config)];
                case 1:
                    result = _a.sent();
                    chai_1.expect(result).to.equal(987);
                    return [4 /*yield*/, runner_1.run("print(123)", config)];
                case 2:
                    result = _a.sent();
                    chai_1.expect(result).to.equal(123);
                    chai_1.expect(config.importObject.output).to.equal("987\n123\n");
                    return [2 /*return*/];
            }
        });
    }); });
    // Note: it is often helpful to write tests for a functionality before you
    // implement it. You will make this test pass!
    it('adds two numbers', function () { return __awaiter(void 0, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, runner_1.run("2 + 3", config)];
                case 1:
                    result = _a.sent();
                    chai_1.expect(result).to.equal(5);
                    return [2 /*return*/];
            }
        });
    }); });
    // TODO: add additional tests here to ensure the compiler runs as expected
});
//# sourceMappingURL=runner.test.js.map