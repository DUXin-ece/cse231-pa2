import { VarInit, FunDef, Stmt, Expr, BinOp,Type } from "./ast";
import { parse, toprogram} from "./parser";
import {typeCheckProgram} from "./tc";
// https://learnxinyminutes.com/docs/wasm/

type LocalEnv = Map<string, boolean>;

export type CompileResult = {
  varinits: string,
  funcdef: string,
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
  const globaldVarsDecl = new Set();
  typedprogrm.varinits.forEach( v => {
    globaldVarsDecl.add(v.name);
  }); 
  const globalDefines:string[] = [];
  globaldVarsDecl.forEach(v => {
    globalDefines.push(`(global $${v} (mut i32) (i32.const 0))`);
  })
  
  const VarInitGroups = typedprogrm.varinits.map((varinit)=>codeGenVarInit(varinit, emptyEnv));
  const FuncdefGroups = typedprogrm.fundefs.map((fundef) => codeGenFunDef(fundef, emptyEnv));
  const commandGroups = typedprogrm.stmts.map((stmt) => codeGenStmt(stmt, emptyEnv));
  const commands = [].concat(...VarInitGroups).concat([].concat.apply([], commandGroups));
  return {
    varinits: globalDefines.join("\n"),
    funcdef: [...FuncdefGroups].join("\n"),
    wasmSource: commands.join("\n")
  };
}


function codeGenVarInit(varinit: VarInit<Type>, locals: LocalEnv): string[] {
  var init = codeGenExpr(varinit.init, locals);
  return init.concat([`(global.set $${varinit.name})`]);
}

function codeGenFunDef(fundef: FunDef<Type>, locals:LocalEnv): Array<string>{
  const withParamsAndVariables = new Map<string, boolean>(locals.entries());
  // Construct the environment for the function body
  const variables = variableNames(fundef.body);  //local variables
  variables.forEach(v=> withParamsAndVariables.set(v, true));
  fundef.params.forEach(p=>withParamsAndVariables.set(p.name, true))

  const params = fundef.params.map(p => `(param $${p.name} i32)`).join(" ");
  const varDecls = variables.map(v => `(local $${v} i32)`).join("\n");
  const stmts:Array<string>[] = []
  fundef.body.map(s=>{stmts.push(codeGenStmt(s, withParamsAndVariables))});
  const flattenstmts = [].concat(...stmts)
  const stmtsBody = flattenstmts.join("\n");
  return [`(func $${fundef.name} ${params} (result i32)
      (local $scratch i32)
      ${varDecls}
      ${stmtsBody}
      (i32.const 0))`];
}

export function codeGenStmt(stmt : Stmt<Type>, locals:LocalEnv) : Array<string> {
  switch(stmt.tag) {
    case "varinit":
      var valStmts = codeGenExpr(stmt.value, locals);
      if(locals.has(stmt.var.name)) { valStmts.push(`(local.set $${stmt.var.name})`); }
      else { valStmts.push(`(global.set $${stmt.var.name})`); }
      return valStmts;
    case "return":
      var valStmts = codeGenExpr(stmt.ret, locals);
      valStmts.push(`return`);
      return valStmts;
    case "assign":
      if(typeof stmt.name== "string"){
        var valStmts = codeGenExpr(stmt.value, locals);
        if(locals.has(stmt.name)) { valStmts.push(`(local.set $${stmt.name})`); }
        else { valStmts.push(`(global.set $${stmt.name})`); }
        return valStmts;
      }
      else {
        throw new Error("TODO");
      }
    case "expr":
      var result = codeGenExpr(stmt.expr, locals);
      result.push(`(local.set $scratch)`);
      return result;
    case "pass":
      return [`nop`];
    case "if":
      var condExpr = codeGenExpr(stmt.ifexpr, locals);
      var elifExpr :string[][] = []; 
      var ifStmts: string[][]=[];
      var elifStmts: string[][] = []; 
      var elseStmts:string[][] = [];  
      stmt.elifexpr.forEach(e=>{
        elifExpr.push(codeGenExpr(e,locals))
      })
      stmt.ifbody.forEach(s=>{
        ifStmts.push(codeGenStmt(s, locals))
      })
      stmt.elifbody.forEach(s_arr=>{
        var temp:string[][] = [];
        s_arr.forEach(s=>{
          temp.push(codeGenStmt(s, locals))
        })
        elifStmts.push( [].concat(...temp));
      })
      stmt.elsebody.forEach(s=>{
        elseStmts.push(codeGenStmt(s, locals))
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
      var condExpr = codeGenExpr(stmt.expr,locals) ;
      var whileBody: string[][] = [];
      stmt.body.forEach(s=>{
        whileBody.push(codeGenStmt(s, locals));
      })
      var result = [`(block`].concat(condExpr).concat([`i32.eqz`,`br_if 0`])
      .concat(`(loop`).concat([].concat(...whileBody)).concat(condExpr).
      concat([`i32.eqz`,`br_if 1`,`br 0`,`))`]);
      return result;
  }
}

function codeGenExpr(expr : Expr<Type>, locals: LocalEnv) : Array<string> {
  switch(expr.tag) {
    case "builtin1":
      const argStmts = codeGenExpr(expr.arg, locals);
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
      const arg1Stmts = codeGenExpr(expr.arg1, locals);
      const arg2Stmts = codeGenExpr(expr.arg2, locals);
      return [...arg1Stmts, ...arg2Stmts, `(call $${expr.name})`];
    case("call"):
      const argList = expr.args.map(e=>codeGenExpr(e, locals));
      const flattenargList = [].concat(...argList);
      return flattenargList.concat([`(call $${expr.name})`]);
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
      const leftStmts = codeGenExpr(expr.left, locals);
      const rightStmts = codeGenExpr(expr.right, locals);
      const opStmt = codeGenBinOp(expr.op);
      return [...leftStmts, ...rightStmts, opStmt]
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