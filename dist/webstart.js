"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var runner_1 = require("./runner");
function webStart() {
    document.addEventListener("DOMContentLoaded", function () {
        var importObject = {
            imports: {
                print: function (arg) {
                    console.log("Logging from WASM: ", arg);
                    var elt = document.createElement("pre");
                    document.getElementById("output").appendChild(elt);
                    elt.innerText = arg;
                    return arg;
                },
                abs: Math.abs,
                max: Math.max,
                min: Math.min,
                pow: Math.pow,
            },
        };
        function renderResult(result) {
            if (result === undefined) {
                console.log("skip");
                return;
            }
            var elt = document.createElement("pre");
            document.getElementById("output").appendChild(elt);
            elt.innerText = String(result);
        }
        function renderError(result) {
            var elt = document.createElement("pre");
            document.getElementById("output").appendChild(elt);
            elt.setAttribute("style", "color: red");
            elt.innerText = String(result);
        }
        document.getElementById("run").addEventListener("click", function (e) {
            var source = document.getElementById("user-code");
            var output = document.getElementById("output").innerHTML = "";
            runner_1.run(source.value, { importObject: importObject }).then(function (r) { renderResult(r); console.log("run finished"); })
                .catch(function (e) { renderError(e); console.log("run failed", e); });
            ;
        });
    });
}
webStart();
//# sourceMappingURL=webstart.js.map