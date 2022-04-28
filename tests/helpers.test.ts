import { importObject } from "./import-object.test";
import {parse, toprogram} from  "../parser"
import {compile} from "../compiler"
import wabt from 'wabt';
import { typeCheckProgram } from "../tc";

// Modify typeCheck to return a `Type` as we have specified below
export function typeCheck(source: string) : Type {
  const parsed = parse(source);
  const program = toprogram(parsed);
  const typedprogram = typeCheckProgram(program);
  if(typedprogram.stmts.length == 0){
    return "none";
  }
  else{
    return typedprogram.stmts[typedprogram.stmts.length-1].a;
  }
}

// Modify run to use `importObject` (imported above) to use for printing
export async function run(source: string) {
  throw new Error(source);
  const program = source;
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
      (import "mem" "heap" (memory 1))
      (func $print_num (import "imports" "print_num") (param i32) (result i32))
      (func $print_none (import "imports" "print_none") (param i32) (result i32))
      (func $print_bool (import "imports" "print_bool") (param i32) (result i32))
      (func $Checkinit (import "imports" "Checkinit") (param i32) (result i32))
      (func $abs (import "imports" "abs") (param i32) (result i32))
      (func $max (import "imports" "max") (param i32 i32) (result i32))
      (func $min (import "imports" "min") (param i32 i32) (result i32))
      (func $pow (import "imports" "pow") (param i32 i32) (result i32))
      ${compiled.funcdef}
      ${compiled.varinits}
      ${compiled.methoddef}
      (func (export "_start") ${returnType}
        (local $scratch i32 )
        ${compiled.wasmSource}
        ${returnExpr}
      )
    )`;
    const wabtApi = await wabt();
    const parsedWat = wabtApi.parseWat("example", wasmSource);
    const binary = parsedWat.toBinary({});
    var memory = new WebAssembly.Memory({initial:10, maximum:100});
    var importObjectPlus:any = importObject;  // use importObjectPlus to add supplemental attributes
    importObjectPlus.mem = {heap: memory};
    importObjectPlus.imports.Checkinit = (obj:number):number=> {
      if(obj==0){
        throw new Error("RUNTIME ERROR: object must be initialized first");
      }
      return obj;
    }
    const wasmModule = await WebAssembly.instantiate(binary.buffer, importObjectPlus);
    (wasmModule.instance.exports as any)._start();
  }
  catch(e){
    console.error(e);
  }
  return;
}

type Type =
  | "int"
  | "bool"
  | "none"
  | { tag: "object", class: string }

export const NUM : Type = "int";
export const BOOL : Type = "bool";
export const NONE : Type = "none";
export function CLASS(name : string) : Type { 
  return { tag: "object", class: name }
};
