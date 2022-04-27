import { VarInit, FunDef, ClassDef, Stmt, Expr, BinOp,Type } from "./ast";
import { parse, toprogram} from "./parser";
import {typeCheckProgram} from "./tc";
// https://learnxinyminutes.com/docs/wasm/

type LocalEnv = Map<string, boolean>;

export type CompileResult = {
  varinits: string,
  funcdef: string,
  methoddef: string,
  wasmSource: string,
};

function variableNames(stmts: Stmt<Type>[]) : string[] {
  const vars : Array<string> = [];
  stmts.forEach((stmt) => {
    if(stmt.tag==="varinit") {vars.push(stmt.var.name); }
  });
  return vars;
}



export function compile(source: string) : CompileResult {
  
  let ast = parse(source);
  let program = toprogram(ast);
  let typedprogrm = typeCheckProgram(program);
  const emptyEnv = new Map<string, boolean>(); 
  const globalVarsDecl:Set<string> = new Set();
  const classes:Map<string, ClassDef<Type>> = new Map();
  typedprogrm.varinits.forEach( v => {
    globalVarsDecl.add(v.name);
  }); 
  typedprogrm.classdefs.forEach(c=>{
    classes.set(c.name, c);
  });
  const globalDefines:string[] = [];
  globalDefines.push(`(global $heap (mut i32) (i32.const 0))`);
  globalVarsDecl.forEach(v => {
    globalDefines.push(`(global $${v} (mut i32) (i32.const 0))`);
  })
  
  const VarInitGroups = typedprogrm.varinits.map((varinit)=>codeGenVarInit(varinit, emptyEnv, classes, globalVarsDecl));
  const FuncdefGroups = typedprogrm.fundefs.map((fundef) => codeGenFunDef(fundef, emptyEnv, classes, globalVarsDecl));
  const commandGroups = typedprogrm.stmts.map((stmt) => codeGenStmt(stmt, emptyEnv, classes, globalVarsDecl));
  const MethodGroups = typedprogrm.classdefs.map((classdef)=>codeGenMethod(classdef, emptyEnv, classes, globalVarsDecl));
  const commands = [].concat(...VarInitGroups).concat([].concat.apply([], commandGroups));
  return {
    varinits: globalDefines.join("\n"),
    funcdef: [...FuncdefGroups].join("\n"),
    methoddef: [...MethodGroups].join("\n"),
    wasmSource: commands.join("\n")
  };
}


function codeGenVarInit(varinit: VarInit<Type>, locals: LocalEnv, classes: Map<string, ClassDef<Type>>, globals: Set<string>): string[] {
  var init = codeGenExpr(varinit.init, locals, classes, globals);
  if(globals.has(varinit.name)){
    return init.concat([`(global.set $${varinit.name})`]);
  }
  else{
    return init;
  }
}

function codeGenFunDef(fundef: FunDef<Type>, locals:LocalEnv, classes: Map<string, ClassDef<Type>>, globals: Set<string> ): Array<string>{
  const withParamsAndVariables = new Map<string, boolean>(locals.entries());
  // Construct the environment for the function body
  const variables = variableNames(fundef.body);  //local variables
  variables.forEach(v=> withParamsAndVariables.set(v, true));
  fundef.params.forEach(p=>withParamsAndVariables.set(p.name, true))

  const params = fundef.params.map(p => `(param $${p.name} i32)`).join(" ");
  const varDecls = variables.map(v => `(local $${v} i32)`).join("\n");
  const stmts:Array<string>[] = []
  fundef.body.map(s=>{stmts.push(codeGenStmt(s, withParamsAndVariables, classes, globals))});
  const flattenstmts = [].concat(...stmts)
  const stmtsBody = flattenstmts.join("\n");
  return [`(func $${fundef.name} ${params} (result i32)
      (local $scratch i32)
      ${varDecls}
      ${stmtsBody}
      (i32.const 0))`];
}

export function codeGenClassinit(classdef:ClassDef<Type>, locals:LocalEnv, classes: Map<string, ClassDef<Type>>, globals: Set<string> ): Array<string>{
  return null;
}


export function codeGenMethod(classdef:ClassDef<Type>, locals:LocalEnv, classes: Map<string, ClassDef<Type>>, globals: Set<string> ): Array<string>{
  var wasmmethods:Array<string> = [];
  if (classdef.methods) {
    classdef.methods.forEach(m=>{
      var withParamsAndVariables = new Map<string, boolean>(locals.entries());
      var variables = variableNames(m.body);  //local variables
      variables.forEach(v=> withParamsAndVariables.set(v, true));
      m.params.forEach(p=>withParamsAndVariables.set(p.name, true))
      var params = m.params.map(p => `(param $${p.name} i32)`).join(" ");
      var varDecls = variables.map(v => `(local $${v} i32)`).join("\n");
      var stmts:Array<string>[] = []
      m.body.map(s=>{stmts.push(codeGenStmt(s, withParamsAndVariables, classes, globals))});
      var flattenstmts = [].concat(...stmts)
      var stmtsBody = flattenstmts.join("\n");
      wasmmethods.concat([`(func $${m.name}$${classdef.name} ${params} (result i32)
          (local $scratch i32)
          ${varDecls}
          ${stmtsBody}
          (i32.const 0))`]);
    })
  }
  return wasmmethods;
}


export function codeGenStmt(stmt : Stmt<Type>, locals:LocalEnv, classes: Map<string, ClassDef<Type>>, globals: Set<string>) : Array<string> {
  switch(stmt.tag) {
    case "varinit":
      var valStmts = codeGenExpr(stmt.value, locals, classes, globals);
      if(locals.has(stmt.var.name)) { valStmts.push(`(local.set $${stmt.var.name})`); }
      else if(globals.has(stmt.var.name)){ valStmts.push(`(global.set $${stmt.var.name})`); }
      else{}  // class fields. This should be allocated on heap
      return valStmts;
    case "return":
      var valStmts = codeGenExpr(stmt.ret, locals, classes, globals);
      valStmts.push(`return`);
      return valStmts;
    case "assign":
      if(stmt.name.tag=="lookup"){
        var valStmts = codeGenExpr(stmt.value, locals, classes, globals);
        var fieldStmts = codeGenExpr(stmt.name, locals, classes, globals);
        fieldStmts.pop(); // Do not need load here
        fieldStmts.push(...valStmts)
        fieldStmts.push("i32.store")
        return fieldStmts;    
      }
      else{
        var valStmts = codeGenExpr(stmt.value, locals, classes, globals);
        if(locals.has(stmt.name.name)) { valStmts.push(`(local.set $${stmt.name.name})`); }
        else if(globals.has(stmt.name.name)){ valStmts.push(`(global.set $${stmt.name.name})`); }
        else{} 
        return valStmts;   
      }
    case "expr":
      var result = codeGenExpr(stmt.expr, locals, classes, globals);
      result.push(`(local.set $scratch)`);
      return result;
    case "pass":
      return [`nop`];
    case "if":
      var condExpr = codeGenExpr(stmt.ifexpr, locals, classes, globals);
      var elifExpr :string[][] = []; 
      var ifStmts: string[][]=[];
      var elifStmts: string[][] = []; 
      var elseStmts:string[][] = [];  
      stmt.elifexpr.forEach(e=>{
        elifExpr.push(codeGenExpr(e,locals, classes, globals))
      })
      stmt.ifbody.forEach(s=>{
        ifStmts.push(codeGenStmt(s, locals,classes, globals))
      })
      stmt.elifbody.forEach(s_arr=>{
        var temp:string[][] = [];
        s_arr.forEach(s=>{
          temp.push(codeGenStmt(s, locals,classes, globals))
        })
        elifStmts.push( [].concat(...temp));
      })
      stmt.elsebody.forEach(s=>{
        elseStmts.push(codeGenStmt(s, locals, classes, globals))
      })
      var result = condExpr.concat(["(if (then"]).concat([].concat(...ifStmts)).concat([")", "(else"]);
      for(var i=0;i<elifExpr.length;i++){
        result = result.concat(elifExpr[i]).concat(["(if (then"]).concat(elifStmts[i]).concat([")", "(else"]);
      }
      var flattenstmts = [].concat(...elseStmts);
      result = result.concat(flattenstmts).concat(["))"]);
      for(var i=0;i<elifExpr.length;i++){result = result.concat(["))"])};
      return result;
    case "while":
      var condExpr = codeGenExpr(stmt.expr,locals, classes, globals) ;
      var whileBody: string[][] = [];
      stmt.body.forEach(s=>{
        whileBody.push(codeGenStmt(s, locals, classes, globals));
      })
      var result = [`(block`].concat(condExpr).concat([`i32.eqz`,`br_if 0`])
      .concat(`(loop`).concat([].concat(...whileBody)).concat(condExpr).
      concat([`i32.eqz`,`br_if 1`,`br 0`,`))`]);
      return result;
  }
}

function codeGenExpr(expr : Expr<Type>, locals: LocalEnv, classes: Map<string, ClassDef<Type>>, globals: Set<string>) : Array<string> {
  switch(expr.tag) {
    case "builtin1":
      const argStmts = codeGenExpr(expr.arg, locals, classes, globals);
      var toCall;
      if(expr.name=="print"){
        switch(expr.arg.a){
          case("bool"): toCall = "print_bool"; break;
          case("int"): toCall = "print_num"; break;
          case("none"): toCall = "print_none"; break;
        }
      }
      else{
        toCall = expr.name;
      }
      return argStmts.concat([`(call $${toCall})`]);
    case("builtin2"):
      const arg1Stmts = codeGenExpr(expr.arg1, locals, classes, globals);
      const arg2Stmts = codeGenExpr(expr.arg2, locals, classes, globals);
      return [...arg1Stmts, ...arg2Stmts, `(call $${expr.name})`];
    case("call"):
      if(classes.has(expr.name)){
        var initvals:Array<string> = [];
        var classdata = classes.get(expr.name);
        var classfields = classdata.fields;
        classfields.forEach((f, index)=>{
          var offset = index * 4;
          initvals = [
            ...initvals,
            `(global.get $heap)`,
            `(i32.add (i32.const ${offset}))`,
            ...codeGenVarInit(f, locals, classes, globals),
            `i32.store`
          ];
        });
        return [
          ...initvals,
          `(global.get $heap)`,
          `(global.set $heap (i32.add (global.get $heap)(i32.const ${classdata.fields.length*4})))`
        ]
      }

      else{
        const argList = expr.args.map(e=>codeGenExpr(e, locals, classes, globals));
        const flattenargList = [].concat(...argList);
        return flattenargList.concat([`(call $${expr.name})`]);
      }
    case "literal":
      if(expr.literal.tag=="num"){
        return ["(i32.const " + expr.literal.value + ")"];
      }
      else if(expr.literal.tag=="bool"){
        if(expr.literal.value==true){
          return ["(i32.const " + "1 " + ")"];
        }
        else{
          return ["(i32.const " + "0 " + ")"];
        }
      }
      else{
        return ["(i32.const " + "0 " + ")"];
      }
    case "id":
      if(locals.has(expr.name)) { return [`(local.get $${expr.name})`]; }
      else { return [`(global.get $${expr.name})`]; }
    case "binexpr":
      const leftStmts = codeGenExpr(expr.left, locals, classes, globals);
      const rightStmts = codeGenExpr(expr.right, locals, classes, globals);
      const opStmt = codeGenBinOp(expr.op);
      return [...leftStmts, ...rightStmts, opStmt]
    case "lookup":
      const objStmts = codeGenExpr(expr.obj, locals, classes, globals);
      var classtype:any = expr.obj.a;
      var classfields = classes.get(classtype.class).fields;
      var indexoffield = getindex(classfields, expr.field);
      return [
          ...objStmts,
          `(i32.const ${indexoffield*4})`,
          `(i32.add)`,
          `(i32.load)`
      ]
  }
}

function codeGenBinOp(op: BinOp): string{
  switch(op){
    case BinOp.Plus:
      return "(i32.add)"
    case BinOp.Minus:
      return "(i32.sub)"
    case BinOp.Mul:
      return "(i32.mul)"
    case BinOp.Eq:
      return "(i32.eq)"
    case BinOp.Gt:
      return "i32.gt_u"
    case BinOp.Lt:
      return "(i32.lt_u)"
    case BinOp.Neq:
      return "(i32.ne)"
    case BinOp.Ngt:
      return "(i32.le_u)"
    case BinOp.Nlt:
      return "(i32.ge_u)"
  }

}

function getindex(fields: VarInit<Type>[], field: string):number{
  var index:number;
  for(index=0; index<fields.length; index++){
    if(fields[index].name == field){
      return index;
    }
  }
  return -1;
}