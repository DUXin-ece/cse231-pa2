import {parser} from "lezer-python";
import {TreeCursor} from "lezer-tree";
import { visitFunctionBody } from "typescript";
import {Program, BinOp, Expr, Stmt, Type, TypedVar, VarInit, FunDef, ClassDef} from "./ast";

export function traverseParameters(s : string, t : TreeCursor) : Array<TypedVar<null>> {
  t.firstChild();  // Focuses on open paren
  const parameters = []
  t.nextSibling(); // Focuses on a VariableName
  while(t.type.name !== ")") {
    let name = s.substring(t.from, t.to);
    t.nextSibling(); // Focuses on "TypeDef", hopefully, or "," if mistake
    let nextTagName = t.type.name; // NOTE(joe): a bit of a hack so the next line doesn't if-split
    if(nextTagName !== "TypeDef") { throw new Error("Missed type annotation for parameter " + name)};
    t.firstChild();  // Enter TypeDef
    t.nextSibling(); // Focuses on type itself
    let type = traverseType(s, t);
    t.parent();
    t.nextSibling(); // Move on to comma or ")"
    parameters.push({name, type});
    t.nextSibling(); // Focuses on a VariableName
  }
  t.parent();       // Pop to ParamList
  return parameters;
}


export function traverseType(s : string, t : TreeCursor) : Type {
  switch(t.type.name) {
    case "VariableName":
      const name = s.substring(t.from, t.to);
      if(name !== "int") {
        throw new Error("Unknown type: " + name)
      }
      return name;
    default:
      throw new Error("Unknown type: " + t.type.name)

  }
}

export function traverseArgs(c: TreeCursor, s: string): Array<Expr<null>>{  // s: (arg1, arg2)
  var args: Array<Expr<null>> = [];
  c.firstChild(); // go into arglist
  while(c.nextSibling()&& c.type.name!==")"){
    args.push(traverseExpr(c,s));
    c.nextSibling(); 
    //console.log(s.substring(c.from, c.to));
  }
  c.parent(); // pop arglist
  return args;
}

export function traverseExpr(c : TreeCursor, s : string) : Expr<null> {
  switch(c.type.name) {
    case "Boolean":
      if(s.substring(c.from, c.to)=="True"){
        return{
          tag: "literal",
          literal: {tag:"bool", value: true}
        }
      }
      else if(s.substring(c.from, c.to)=="False"){
        return{
          tag: "literal",
          literal: {tag:"bool", value: false}
        }
      }
      else{
        throw new Error("PARSE ERROR: could not parse expr at " + c.from + " " + c.to + ": " + s.substring(c.from, c.to));
      }
    case "Number":
      return {
        tag: "literal",
        literal: {tag:"num", value: Number(s.substring(c.from, c.to))} 
      }
    case "VariableName":
      return {
        tag: "id",
        name: s.substring(c.from, c.to)
      }
    case "MemberExpression":
      c.firstChild();
      var obj = traverseExpr(c,s);
      c.nextSibling(); // .
      c.nextSibling();
      var field = s.substring(c.from, c.to);
      return {
        tag: "lookup",
        obj: obj,
        field: field
      }
    case "CallExpression":
      c.firstChild();
      const callName = s.substring(c.from, c.to);
      c.nextSibling(); // go to arglist
      var args = traverseArgs(c,s);
      if(callName=="abs" || callName=="print"){ 
        c.parent();// pop CallExpression
        if(args.length==1){
          return {
            tag: "builtin1",
            name: callName,
            arg: args[0]
          };
        }
        else{
          throw new Error("PARSE ERROR: incorrect arity")
        }
      }
      else if(callName=="max" || callName=="min" || callName=="pow"){
        c.parent();
        if(args.length==1){
          return {
            tag: "builtin2",
            name: callName,
            arg1: args[0],
            arg2: args[1]
          };;
        }
        else{
          throw new Error("PARSE ERROR: incorrect arity")
        }
      }
      else{
        c.parent();
        return {
          tag: "call", name:callName, args: args
        }
      }
      
      case "UnaryExpression":
        c.firstChild();
        var uniop = s.substring(c.from, c.to);
        if(uniop!=="+" && uniop!=="-"){
          throw new Error("PARSE ERROR: could not parse this UinaryExpression");
        }
        c.nextSibling();
        var number = Number(uniop + s.substring(c.from, c.to));
        if(isNaN(number)){
          throw new Error("PARSE ERROR: could not parse this UinaryExpression");
        }
        c.parent();
        return {
          tag: "literal",
          literal: {tag:"num", value: number} 
        }
      case "BinaryExpression": 
        c.firstChild();
        const left = traverseExpr(c, s);
        c.nextSibling();
        var op : BinOp;
        switch(s.substring(c.from, c.to)){
          case "+":
            op = BinOp.Plus;
            break;
          case "-":
            op = BinOp.Minus;
            break;
          case "*":
            op = BinOp.Mul;
            break;
          case "==":
            op = BinOp.Eq;  // equal
            break;
          case "!=":
            op = BinOp.Neq;  // not equal
            break;
          case ">=":
            op = BinOp.Nlt;  // not less than
            break;
          case "<=":
            op = BinOp.Ngt;  // not greater than
            break;
          case ">":
            op = BinOp.Gt;  // greater than
            break;
          case "<":
            op = BinOp.Lt;  // less than
            break;
          default:
            throw new Error("PARSE ERROR: could not parse expr at " + c.from + " " + c.to + ": " + s.substring(c.from, c.to));
        };
        c.nextSibling();
        const right = traverseExpr(c,s);
        c.parent(); //pop BinaryExpression
        return {tag: "binexpr", op:op, left:left, right:right}
      
      default:
        throw new Error("PARSE ERROR: could not parse expr at " + c.from + " " + c.to + ": " + s.substring(c.from, c.to));
  }
}

export function traverseStmt(c : TreeCursor, s : string) : Stmt<null> {
  switch(c.node.type.name) {
    case "PassStatement":
      return {
        tag: "pass"
      }
    case "ReturnStatement":
      c.firstChild(); //return
      c.nextSibling(); //expr
      const returnexpr = traverseExpr(c, s);
      c.parent();
      return {
        tag:"return",
        ret: returnexpr,
      }
    case "AssignStatement":
      c.firstChild(); // go to name
      var lvalue = traverseExpr(c, s);
      if(lvalue.tag == "lookup"){ // This cannot happen in the initialization
        c.nextSibling(); // = 
        c.nextSibling(); // value
        const value = traverseExpr(c, s);
        c.parent();
        return {
          tag: "assign",
          name: lvalue,
          value: value
        }
      }
      else if(lvalue.tag == "id"){
        c.nextSibling();
        if(c.type.name as any=="TypeDef"){
          c.firstChild(); //:
          c.nextSibling(); //VariableName, actually typename here
          const type = s.substring(c.from, c.to);
          c.parent();
          c.nextSibling();
          c.nextSibling();
          const value = traverseExpr(c, s);
          c.parent();
          if(type!=="int" && type!=="bool" && type!=="none"){
            throw new Error("PARSE ERROR: not a valid type")
          }
          return {
            tag: "varinit",
            var: {name: lvalue.name, type: type},
            value: value
          }
        }
        else if(c.type.name as any=="AssignOp"){  // Assignment
          c.nextSibling();
          const value = traverseExpr(c, s);
          c.parent();
          return {
            tag: "assign",
            name: lvalue,
            value: value
          }
        }
        else{ //Actual don't know what else situation can be here
          throw new Error("PARSE ERROR: could not parse stmt at " + c.node.from + " " + c.node.to + ": " + s.substring(c.from, c.to));
        }
      }
    case "ExpressionStatement":
      c.firstChild();
      const expr = traverseExpr(c, s);
      c.parent(); // pop going into stmt
      return { tag: "expr", expr: expr }
    case "IfStatement":
      var ifbody : Stmt<null>[] = [];
      c.firstChild();  //if 
      c.nextSibling(); //expr
      const ifexpr = traverseExpr(c,s);
      c.nextSibling(); // ifbody
      c.firstChild(); // :
      c.nextSibling(); 
      do{
        ifbody.push(traverseStmt(c,s));
      }while(c.nextSibling())
      c.parent(); //body
      const elifexpr: Array<Expr<null>> = []
      const elifbody: Array<Array<Stmt<null>>> = []
      const elsebody: Array<Stmt<null>> = []
      while(c.nextSibling()&&c.type.name=="elif"){
        c.nextSibling(); //expr
        elifexpr.push(traverseExpr(c,s));
        c.nextSibling(); //body
        c.firstChild();  //:
        c.nextSibling(); 
        var bodystmts :Array<Stmt<null>> = []
        do{
          bodystmts.push(traverseStmt(c,s));
        }while(c.nextSibling())
        c.parent();
        elifbody.push(bodystmts);
      }
      //console.log(elifbody)
      if(c.type.name=="else"){
        c.nextSibling(); 
        c.firstChild(); //:
        c.nextSibling();
        do{
          elsebody.push(traverseStmt(c,s));
        }while(c.nextSibling())
        c.parent();
      }
      c.parent();
      return {
        tag: "if",
        ifexpr: ifexpr,
        ifbody: ifbody,
        elifexpr: elifexpr,
        elifbody: elifbody,
        elsebody: elsebody
      }
    case "WhileStatement":
      c.firstChild();
      c.nextSibling();
      const whileexpr = traverseExpr(c,s);
      c.nextSibling();
      const whilestmts :Stmt<null>[]= []
      if(c.type.name=="Body"){
        c.firstChild();
        while(c.nextSibling()){
          whilestmts.push(traverseStmt(c,s));
        }
      }
      else{
        throw new Error("PARSE ERROR: could not parse while body");
      }
      c.parent();
      return {
        tag:"while",
        expr: whileexpr,
        body: whilestmts
      }
      case "FunctionDefinition":
        c.firstChild();  // Focus on def
        c.nextSibling(); // Focus on name of function
        var funcname = s.substring(c.from, c.to);
        c.nextSibling(); // Focus on ParamList
        var parameters = traverseParameters(s, c)
        c.nextSibling(); // Focus on Body or TypeDef
        let funcret : Type = "none";
        let maybeTD = c;
        if(maybeTD.type.name === "TypeDef") {
          c.firstChild();
          funcret = traverseType(s, c);
          c.parent();
        }
        c.nextSibling(); // Focus on single statement (for now)
        c.firstChild();  // Focus on :
        var body = [];
        while(c.nextSibling()) {
          body.push(traverseStmt(c, s));
        }
        c.parent();      // Pop to Body
        c.parent();      // Pop to FunctionDefinition
        return{
          tag:"funcdef",
          name:funcname,
          params:parameters, 
          ret: funcret,
          body: body
        }
    case "ClassDefinition":
      c.firstChild(); // Focus on class keyword
      c.nextSibling(); // Focus on class name
      var classname = s.substring(c.from, c.to);
      c.nextSibling(); // ArgList
      c.firstChild();  // (
      c.nextSibling(); // should be object
      var superclass = s.substring(c.from, c.to);
      c.parent();
      if(superclass !== "object"){
        throw new Error("PARSE ERROR: undefined superclass");
      }
      c.nextSibling(); // Body
      c.firstChild();  // :
      var methods:Array<FunDef<null>> = [];
      var fields:Array<VarInit<null>> = [];
      while(c.nextSibling()) {
        if(c.type.name =="AssignStatement"){
          var vardecl:any = traverseStmt(c,s);
          var varinit = {
            name: vardecl.var.name,
            type: vardecl.var.type,
            init: vardecl.value
          }
          fields.push(varinit);
        }
        else if(c.type.name == "FunctionDefinition"){
          var methodstmt:any = traverseStmt(c,s);
          var method = {
            name: methodstmt.name,
            params: methodstmt.params,
            ret: methodstmt.ret,
            body: methodstmt.body
          }
          methods.push(method);
        }
      }
      c.parent();
      c.parent();
      return {
        tag: "class",
        name: classname, 
        methods: methods, 
        fields: fields
      }
    default:
      throw new Error("PARSE ERROR: could not parse stmt at " + c.node.from + " " + c.node.to + ": " + s.substring(c.from, c.to));
  }
}

export function traverse(c : TreeCursor, s : string) : Stmt<null>[] {
  switch(c.node.type.name) {
    case "Script":
      const stmts = [];
      c.firstChild();
      do {
        stmts.push(traverseStmt(c, s));
      } while(c.nextSibling())
      console.log("traversed " + stmts.length + " statements ", stmts, "stopped at " , c.node);
      return stmts;
    default:
      throw new Error("PARSE ERROR: could not parse program at " + c.node.from + " " + c.node.to);
  }
}
export function parse(source : string) : Stmt<null>[] {
  const t = parser.parse(source);
  return traverse(t.cursor(), source);
}

export function toprogram(stmts: Stmt<null>[]) : Program<null> {
  var varinits: VarInit<null>[]=[];
  var fundefs:FunDef<null>[]=[];
  var mainstmts: Stmt<null>[]=[];
  var classdefs: ClassDef<null>[] = [];
  var init_state:boolean = true
  stmts.forEach(stmt =>{
    if(init_state==true && stmt.tag=="varinit"){
      var newvar = {
        name: stmt.var.name,
        type: stmt.var.type,
        init: stmt.value
      }
      varinits.push(newvar); 
    }
    else if(init_state==true){
      if(stmt.tag=="funcdef"){
        var newfunc = {
          name: stmt.name,
          params: stmt.params,
          ret: stmt.ret,
          body: stmt.body
        }
        fundefs.push(newfunc); 
      }
      else if(stmt.tag=="class"){
        var classdef = {
          name: stmt.name,
          methods: stmt.methods,
          fields: stmt.fields
        }
        classdefs.push(classdef)
      }
    }
    else{
      init_state = false;
      if(stmt.tag=="varinit"|| stmt.tag=="funcdef"|| stmt.tag=="class"){
        throw new Error("PARSE ERROR: Initialization in a wrong place");
      }
      else{
        mainstmts.push(stmt);
      }
    }
  })

  console.log("PARSER DEBUG INFORMATION:");
  console.log("Varinits:" ,varinits);
  console.log("FunDefs:" ,fundefs);
  console.log("ClassDefs:" ,classdefs);
  console.log("Stmts:" ,mainstmts);
  return {
    varinits: varinits,
    fundefs: fundefs,
    classdefs: classdefs,
    stmts: mainstmts
  }
}
