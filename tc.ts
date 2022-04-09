import {Expr, Stmt, FunDef, Literal,TypedVar, Program, Type, VarInit} from './ast';

type TypeEnv = {
    vars:Map<string, Type>
    funs:Map<string, [Type[], Type]>
    retType: Type
}

function duplicateEnv(env: TypeEnv): TypeEnv{
    return {vars: new Map(env.vars), funs: new Map(env.funs), retType:env.retType}
}

export function typeCheckProgram(prog: Program<null>) : Program<Type>{
    return null;
}

export function typeCheckVarInits(inits: VarInit<null>[], env: TypeEnv): VarInit<Type>[]{
    const typedInits: VarInit<Type>[] = [];
    inits.forEach( (init) => {
        const typedInit = typeCheckLiteral(init.init);
        if(typedInit.a !== init.type){
            throw new Error("TYPE ERROR: init type does not match literal type");
        }
        env.vars.set(init.name, init.type);
        typedInits.push({...init, a:init.type, init: typedInit});
    })
    return typedInits;
}

export function typeCheckFunDef(fun: FunDef<null>, env: TypeEnv):FunDef<Type>{
    // add params to env
    const localEnv = duplicateEnv(env);
    fun.params.forEach(param =>{
        localEnv.vars.set(param.name, param.type);
    })
    const typedParams = typeCheckParams(fun.params)
    // add inits to env
    // check inits
    const typedInits = typeCheckVarInits(fun.inits, env);
    fun.inits.forEach(init =>{
        localEnv.vars.set(init.name, init.type);
    })

    // add fun type to env
    localEnv.funs.set(fun.name, [fun.params.map(param => param.type), fun.ret])
    
    // add ret type
    localEnv.retType = fun.ret;
    // check body
    // make sure every path has the expected return type
    const typedStmts = typeCheckStmts(fun.body, localEnv);
    return {...fun, params: typedParams, inits: typedInits, body: typedStmts};

}

export function typeCheckParams(params: TypedVar<null>[]): TypedVar<Type>[]{
    return params.map(param=>{
        return {...param, a:param.type};
    })

}

export function typeCheckStmts(stmts: Stmt<null>[], env: TypeEnv): Stmt<Type>[]{
    const typedStmts : Stmt<Type>[] = [];
    stmts.forEach(stmt => {
        switch(stmt.tag){
            case "assign":
                if(!env.vars.get(stmt.name)){
                    throw new Error("TYPE ERROR: unbound id");
                }
                const typedValue = typeCheckExpr(stmt.value, env);
                if(typedValue.a !== env.vars.get(stmt.name)){
                    throw new Error("TYPE ERROR: cannot assign value to id");
                }
                typedStmts.push({...stmt, value: typedValue, a: Type.none})
                break;
            case "return":
                const typedRet = typeCheckExpr(stmt.ret, env);
                if(env.retType!==typedRet.a){
                    throw new Error("TYPE ERROR: return type mismatch");
                }
                typedStmts.push({...stmt, ret:typedRet});
                break;
            case "if":
                // const typedCond ...Expr
                // const typedThen ...Stmt[]
                // const typedEls ...Stmt[]
                break;

            case "pass":
                typedStmts.push({...stmt, a: Type.none});
                break;
            case "expr":
                const typedExpr = typeCheckExpr(stmt.expr, env);
                typedStmts.push({...stmt, a: Type.none});
                break;
        }
    })
    return ;
}

export function typeCheckExpr(expr: Expr<null>, env: TypeEnv) : Expr<Type>{
    switch(expr.tag){
        case "literal":
            const lit = typeCheckLiteral(expr.literal);
            return {...expr, a: lit.a}
        case "id":  //catch referrence error here!
            if(!env.vars.has(expr.name)){
                throw new Error("TYPE ERROR: unbound id")
            }
            const idType = env.vars.get(expr.name);
            return 
        case "builtin1":
            break;
        case "builtin2":
            const arg1 = typeCheckExpr(expr.arg1, env);
            const arg2 = typeCheckExpr(expr.arg2, env);
            if (arg1.a!== Type.int){
                throw new Error("TYPE ERROR: arg1 must be an int");
            }
            if (arg2.a!==Type.int){
                throw new Error("TYPE ERROR: arg2 must be an int");
            }
            return {...expr, arg1, arg2, a:Type.int}
        case "call":
            break;
        case "binexpr":
            const left = typeCheckExpr(expr.left, env);
            const right = typeCheckExpr(expr.right, env);
            if (left.a!== Type.int){
                throw new Error("TYPE ERROR: left must be an int");
            }
            if (right.a!==Type.int){
                throw new Error("TYPE ERROR: right must be an int");
            }
            return {...expr, a:Type.int, left:left, right:right}
    }
}

export function typeCheckLiteral(literal: Literal<null>): Literal<Type>{
    switch(literal.tag){
        case "num":
            return {...literal, a: Type.int};
        case "bool":
            return {...literal, a: Type.bool};    
        case "none":
            return {...literal, a: Type.none};
    }
}