export type Program<A> = {a?:A, varinits: VarInit<A>[], fundefs:FunDef<A>[],stmts: Stmt<A>[]}

export type VarInit<A> = {a?:A, name: string, type: Type, init: Literal<A>} // A: Anotation

export type FunDef<A> = {a?:A, name:string, params:TypedVar<A>[], ret: Type, inits: VarInit<A>[], body:Stmt<A>[]}

export type TypedVar<A> = {a?:A, name:string, type: Type}

export type Stmt<A> = 
  | { a?:A, tag: "assign", name: string, value: Expr<A> }
  | { a?:A, tag: "return", ret: Expr<A>}
  | { a?:A, tag: "pass"}
  | { a?:A, tag: "expr", expr: Expr<A> }

export type Expr<A> =
    {a?:A, tag: "literal", literal: Literal<A> }
  | {a?:A, tag: "id", name: string }
  | {a?:A, tag: "builtin1", name: string, arg: Expr<A> }
  | {a?:A, tag: "builtin2", name: string, arg1: Expr<A>, arg2: Expr<A>}
  | {a?:A, tag: "call", name: string, args: Expr<A>[]}
  | {a?:A, tag: "binexpr", op: BinOp , left: Expr<A>, right: Expr<A>}

export type Literal<A> = 
    {a?:A, tag:"num", value: number}
  | {a?:A, tag:"bool", value: boolean}
  | {a?:A, tag:"none"}

export enum BinOp{Plus, Minus, Mul}

export enum Type{int, bool, none}