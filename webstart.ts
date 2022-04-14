import {compile} from './compiler';
import {run} from './runner'
import {parse} from './parser';

document.addEventListener("DOMContentLoaded", async () => {
  function display(arg : string) {
    const elt = document.createElement("pre");
    document.getElementById("output").appendChild(elt);
    elt.innerText = arg;
  }
  var importObject = {
    imports: {
      abs: Math.abs,
      max: Math.max,
      min: Math.min,
      pow: Math.pow,
      print_num: (arg : any) => {
        console.log("Logging from WASM: ", arg);
        display(String(arg));
        return arg;
      },
      print_bool: (arg : any) => {
        if(arg === 0) { display("False"); }
        else { display("True\n"); }
        return arg;
      },
      print_none: (arg: any) => {
        display("None");
        return arg;
      }
    },
  };
  const runButton = document.getElementById("run");
  const userCode = document.getElementById("user-code") as HTMLTextAreaElement;
  runButton.addEventListener("click", async () => {
    const program = userCode.value;
    const output = document.getElementById("output");
    try {
      const parsed = parse(program);
      var returnType = "";
      var returnExpr = "";
      const lastExpr = parsed[parsed.length - 1]
      if(lastExpr.tag === "expr") {
        returnType = "(result i32)";
        returnExpr = "(local.get $scratch)"
      }
      const compiled = compile(program);
      const wasmSource = `(module
        (func $print_num (import "imports" "print_num") (param i32) (result i32))
        (func $print_none (import "imports" "print_none") (param i32) (result i32))
        (func $print_bool (import "imports" "print_bool") (param i32) (result i32))
        (func $abs (import "imports" "abs") (param i32) (result i32))
        (func $max (import "imports" "max") (param i32 i32) (result i32))
        (func $min (import "imports" "min") (param i32 i32) (result i32))
        (func $pow (import "imports" "pow") (param i32 i32) (result i32))
        ${compiled.funcdef}
        ${compiled.varinits}
        (func (export "_start") ${returnType}
          (local $scratch i32 )
          ${compiled.wasmSource}
          ${returnExpr}
        )
      )`;
      const code = document.getElementById("generated-code");
      code.textContent = wasmSource;
      const result = await run(wasmSource, importObject);
      //output.textContent += String(result);
      output.setAttribute("style", "color: black");
    }
    catch(e) {
      console.error(e)
      output.textContent = String(e);
      output.setAttribute("style", "color: red");
    }
  });

  userCode.value = localStorage.getItem("program");
  userCode.addEventListener("keypress", async() => {
    localStorage.setItem("program", userCode.value);
  });
});