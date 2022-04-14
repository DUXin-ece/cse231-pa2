export type Program<A> = { varinits: VarInit<A>[], fundefs:FunDef<A>[],stmts: Stmt<A>[]}

export type VarInit<A> = {a?:A, name: string, type: Type, init: Expr<A>} // A: Anotation

export type FunDef<A> = {a?:A,  name:string, params:TypedVar<A>[], ret: Type, body:Stmt<A>[]}

export type TypedVar<A> = {a?:A, name:string, type: Type}

export type Stmt<A> = 
    { a?: A, tag: "funcdef", name: string, params: TypedVar<A>[], ret: Type, body: Stmt<A>[] }
  | { a?: A, tag: "varinit", var: TypedVar<A>, value: Expr<A> } // Done
  | { a?:A, tag: "assign", name: string, value: Expr<A> } // Done
  | { a?:A, tag: "pass"}  // Done
  | { a?:A, tag: "expr", expr: Expr<A> }
  | { a?:A, tag: "if", ifexpr: Expr<A>, ifbody: Stmt<A>[], elifexpr: Expr<A>[], elifbody: Stmt<A>[][], elsebody: Stmt<A>[]}  //Done
  | { a?:A, tag: "while", expr: Expr<A>, body: Stmt<A>[]}  //Done
  | { a?:A, tag: "return", ret: Expr<A> }  // Done

export type Expr<A> =
    {a?:A, tag: "literal", literal: Literal<A> }
  | {a?:A, tag: "id", name: string }
  | {a?:A, tag: "call", name: string, args: Expr<A>[]}
  | {a?:A, tag: "builtin1", name: string, arg: Expr<A> }
  | {a?:A, tag: "builtin2", name: string, arg1: Expr<A>, arg2: Expr<A>}
  | {a?:A, tag: "binexpr", op: BinOp , left: Expr<A>, right: Expr<A>}

export type Literal<A> = 
    {a?:A, tag:"num", value: number}
  | {a?:A, tag:"bool", value: boolean}
  | {a?:A, tag:"none"}

export enum BinOp{Plus="+", Minus="-", Mul="*", Eq="==", Neq="!=", Nlt=">=", Ngt="<=", Gt=">", Lt="<"}

export enum Type{int="int", bool="bool", none="none"}