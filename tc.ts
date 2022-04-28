import {Program, Expr, Stmt, Literal,TypedVar,Type, VarInit, FunDef, ClassDef, BinOp} from './ast';
import { NONE } from './tests/helpers.test';

type TypeEnv = {
    vars:Map<string, Type>
    funs:Map<string, [Type[], Type]>
    classes: Map<string, Map<string, Type>>
    retType: Type
}

function duplicateEnv(env: TypeEnv): TypeEnv{
    return {vars: new Map(env.vars), funs: new Map(env.funs), classes: (env.classes), retType:env.retType}
}

export function typeCheckProgram(prog: Program<null>):Program<Type>{
    var typedvarinits: Array<VarInit<Type>> = []
    var typedfundefs: Array<FunDef<Type>> = []
    var typedstmts: Array<Stmt<Type>> = []
    var typedclassdefs: Array<ClassDef<Type>> = []
    var env:TypeEnv = {vars: new Map(), funs: new Map(), classes: new Map(), retType: "none"};
    prog.fundefs.forEach(fundef =>{
        typedfundefs.push(typeCheckFunDef(fundef, env));
        returnCheckFunDef(fundef, env);
    })
    prog.classdefs.forEach(cls=>{
        typedclassdefs.push(typeCheckClassDef(cls, env));
    })
    typedvarinits = typeCheckVarInits(prog.varinits, env);
    typedstmts = typeCheckStmts(prog.stmts, env);
    return {
        varinits: typedvarinits,
        fundefs: typedfundefs,
        classdefs: typedclassdefs,
        stmts: typedstmts
    }
}

export function returnCheckFunDef(fundef:FunDef<Type>, env:TypeEnv):boolean{
    var stmts_num = fundef.body.length;
    var laststmt = fundef.body[stmts_num-1];
    if(laststmt.tag=="return"){
        return true;
    }
    else{
        fundef.body.forEach(s =>{
            if(s.tag=="if"){
                var pathreturn:boolean[] = [];
                var laststmt_if = s.ifbody[s.ifbody.length-1];
                if(laststmt_if.tag!=="return"){
                    throw new Error("Not all paths return");
                }
                for(var i=0;i<s.elifbody.length;i++){
                    var lenarr = s.elifbody[i].length;
                    if (s.elifbody[i][lenarr-1].tag!== "return"){
                        throw new Error("Not all paths return");
                    }
                }
                var laststmt_else = s.elsebody[s.elsebody.length-1];
                if(!laststmt_else){
                    throw new Error("Not all paths return");
                }
                if(laststmt_else.tag!=="return"){
                    throw new Error("Not all paths return");
                }
                
            }
        })
        return true;
    }
}

export function typeCheckVarInits(inits: VarInit<null>[], env: TypeEnv): VarInit<Type>[]{
    const typedInits: VarInit<Type>[] = [];
    inits.forEach( (init) => {
        const typedInit = typeCheckExpr(init.init, env);
        if( typedInit.a =="none" && typeof init.type=="object"){
            
        }
        else if(typeof typedInit.a =="string" && typeof init.type=="string"){ // int, bool, none
            if(typedInit.a !== init.type){
                throw new Error("TYPE ERROR: init type does not match literal type");
            }
        }
        else{
            throw new Error("TYPE ERROR: init type does not match literal type");
        }
        env.vars.set(init.name, init.type);
        typedInits.push({...init, a:init.type, init: typedInit});
    })
    return typedInits;
}

export function typeCheckClassDef(aclass: ClassDef<null>, env: TypeEnv): ClassDef<Type>{
    var classenv: Map<string, Type> = new Map();
    env.funs.set(aclass.name, [undefined, {tag:"object", class: aclass.name}]);
    const localEnv = duplicateEnv(env);
    var typedclass: ClassDef<Type>;
    var typedfields: VarInit<Type>[]=[];
    var typedmethods: FunDef<Type>[]=[];
    aclass.fields.forEach(v => {
        localEnv.vars.set(v.name, v.type);
        classenv.set(v.name, v.type);
    });
    env.classes.set(aclass.name, classenv);
    localEnv.classes.set(aclass.name, classenv);
    typedfields = typeCheckVarInits(aclass.fields, localEnv);
    aclass.methods.forEach(m =>{
        var methodname = m.name + "$"+ aclass.name;
        localEnv.funs.set(methodname, [m.params.map(param => param.type), m.ret]);
        env.funs.set(methodname, [m.params.map(param => param.type), m.ret]);
        classenv.set(methodname, m.ret);
        typedmethods.push(typeCheckFunDef(m, localEnv));
    });
    typedclass = {...aclass, a:{tag:"object", class: aclass.name}, fields: typedfields, methods: typedmethods}
    return typedclass;
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
    // const typedInits = typeCheckVarInits(fun.inits, env);
    // fun.inits.forEach(init =>{
    //     localEnv.vars.set(init.name, init.type);
    // })

    // add fun type to env
    env.funs.set(fun.name, [fun.params.map(param => param.type), fun.ret])
    localEnv.funs.set(fun.name, [fun.params.map(param => param.type), fun.ret])
    
    // add ret type
    localEnv.retType = fun.ret;
    // check body
    // make sure every path has the expected return type
    const typedStmts = typeCheckStmts(fun.body, localEnv);
    return {...fun, params: typedParams,  body: typedStmts};

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
            case "varinit":
                var typedValue = typeCheckExpr(stmt.value, env);
                env.vars.set(stmt.var.name, stmt.var.type);
                console.log(env)
                var lvalueType = env.vars.get(stmt.var.name);
                if(typeof lvalueType == "object"){
                    if(typedValue.a!= "none"){
                        throw new Error("TYPE ERROR: class must be initialized as none type");
                    }
                }
                else if(typeof lvalueType == "string"){
                    if(typedValue.a!=env.vars.get(stmt.var.name)){
                        throw new Error("TYPE ERROR: cannot assign value to id");
                    }
                } 
                typedStmts.push({...stmt, value: typedValue, a: typedValue.a})
                break;
            case "assign":
                if(stmt.name.tag == "id"){
                    var varname = env.vars.get(stmt.name.name)
                    if(!varname){
                        throw new Error("TYPE ERROR: unbound id");
                    }
                    var typedValue = typeCheckExpr(stmt.value, env);
                    if(typeof varname=="object"){
                        if (typedValue.a=="none"){
                            // Allow
                        }
                        else if(typeof typedValue.a=="object" && typedValue.a.class == varname.class){
                            // Allow
                        }
                        else{
                            throw new Error("TYPE ERROR: cannot assign value to id");
                        }
                    }
                    else if(typedValue.a !== env.vars.get(stmt.name.name)){
                        throw new Error("TYPE ERROR: cannot assign value to id");
                    }
                    typedStmts.push({...stmt, value: typedValue, a: typedValue.a})
                }
                else if(stmt.name.tag=="lookup"){
                    var typedValue = typeCheckExpr(stmt.value, env);
                    var typedLValue = typeCheckExpr(stmt.name, env);
                    if(typeof typedLValue.a=="object"){
                        if(typeof typedValue.a =="object" && typedLValue.a.class==typedValue.a.class){

                        }
                        else if(typedValue.a =="none"){}
                        else{
                            throw new Error("TYPE ERROR: cannot assign value to lookup");
                        }
                    }
                    else if(typedLValue.a != typedValue.a){
                        throw new Error("TYPE ERROR: cannot assign value to lookup");
                    }
                    typedStmts.push({...stmt, value: typedValue, name: typedLValue as any, a: typedValue.a});
                }
                break;
            case "return":
                const typedRet = typeCheckExpr(stmt.ret, env);
                if(typeof env.retType == "object" && typeof typedRet.a as any == "object"){
                    var classtype:any = typedRet.a
                    if(env.retType.class!==classtype.class){
                        throw new Error("TYPE ERROR: return type mismatch");
                    }
                }
                else if(typeof env.retType == "object" && typedRet.a == "none"){}
                else if(env.retType!==typedRet.a){
                    throw new Error("TYPE ERROR: return type mismatch");
                }
                typedStmts.push({...stmt, ret:typedRet});
                break;
            case "if":
                var typedifCond = typeCheckExpr(stmt.ifexpr, env);
                var typedelifCond:Expr<Type>[] = [];
                var typedifStmts: Stmt<Type>[] = typeCheckStmts(stmt.ifbody,env);
                var typedelifStmts: Stmt<Type>[][]= [];
                var typedelseStmts: Stmt<Type>[] = typeCheckStmts(stmt.elsebody,env); 
                // const typedCond ...Expr
                // const typedThen ...Stmt[]
                // const typedEls ...Stmt[]
                stmt.elifexpr.forEach(s=>{
                    typedelifCond.push(typeCheckExpr(s, env));
                })
                stmt.elifbody.forEach(s_arr=>{
                    typedelifStmts.push(typeCheckStmts(s_arr, env))
                })
                if(typedifCond.a!="bool"){
                    throw new Error("TYPE ERROR: expect boolean expression");
                }
                typedelifCond.forEach(e =>{
                    if(e.a!="bool"){
                        throw new Error("TYPE ERROR: expect boolean expression");
                    }
                })
                typedStmts.push({...stmt, a: "none",
                ifexpr: typedifCond,
                ifbody: typedifStmts,
                elifexpr: typedelifCond,
                elifbody: typedelifStmts,
                elsebody: typedelseStmts})
                break;
            case "while":
                var typedExpr: Expr<Type> = typeCheckExpr(stmt.expr,env);
                var typedwhileStmts= typeCheckStmts(stmt.body, env);
                typedStmts.push({...stmt, a: "none",
                expr: typedExpr,
                body: typedwhileStmts})
                break;
            case "pass":
                typedStmts.push({...stmt, a: "none"});
                break;
            case "expr":
                var typedExpr = typeCheckExpr(stmt.expr, env);
                typedStmts.push({...stmt, a: typedExpr.a, expr:typedExpr});
                break;
        }
    })
    return typedStmts;
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
            return {...expr, a:idType}
        case "builtin1":
            const arg = typeCheckExpr(expr.arg, env);
            return {...expr, a: "int", arg:arg}
        case "builtin2":
            const arg1 = typeCheckExpr(expr.arg1, env);
            const arg2 = typeCheckExpr(expr.arg2, env);
            if (arg1.a!== "int"){
                throw new Error("TYPE ERROR: arg1 must be an int");
            }
            if (arg2.a!== "int"){
                throw new Error("TYPE ERROR: arg2 must be an int");
            }
            return {...expr, arg1, arg2, a: "int"}
        case "call":
            var func = env.funs.get(expr.name);
            return {...expr, a: func[1]}  // 1 is return type
        case "uniexpr":
            const boolexpr = typeCheckExpr(expr.expr, env);
            if(boolexpr.a!=="bool"){
                throw new Error("TYPE ERROR: Not a boolean expression");
            }
            else{
                return {...expr, a: boolexpr.a};
            }
        case "binexpr":
            const left = typeCheckExpr(expr.left, env);
            const right = typeCheckExpr(expr.right, env);
            switch(expr.op){
                case BinOp.Plus:
                case BinOp.Minus:
                case BinOp.Mul:
                    if (left.a!== "int"){
                        throw new Error("TYPE ERROR: left must be an int");
                    }
                    if (right.a!=="int"){
                        throw new Error("TYPE ERROR: right must be an int");
                    }
                    return {...expr, a: "int", left:left, right:right}
                case BinOp.Eq:
                case BinOp.Gt:
                case BinOp.Lt:
                case BinOp.Neq:
                case BinOp.Ngt:
                case BinOp.Nlt:
                    if (left.a!== "int"){
                        throw new Error("TYPE ERROR: left must be an int");
                    }
                    if (right.a!=="int"){
                        throw new Error("TYPE ERROR: right must be an int");
                    }
                    return {...expr, a: "bool", left:left, right:right}
                case BinOp.Is:
                    if (left.a === "int" || right.a === "int" || left.a === "bool" || right.a === "bool" ) {
                        throw new TypeError(`TYPE ERROR: Not supported type`)
                    }
                    return {...expr, a: "bool", left:left, right:right};
            }
            
        case "lookup":
            var obj = typeCheckExpr(expr.obj, env);
            if(typeof obj.a == "object"){
                if(obj.a.tag!="object"){
                    throw new Error("TYPE ERROR: not an object");
                }
            }
            else{
                throw new Error("TYPE ERROR: not an object");
            }
            var classinfo = env.classes.get(obj.a.class);
            var fieldtype = classinfo.get(expr.field);
            return {...expr, a:fieldtype, obj:obj}
        case "method":
            var obj = typeCheckExpr(expr.obj, env)
            if(typeof obj.a == "object"){
                if(obj.a.tag!="object"){
                    throw new Error("TYPE ERROR: not an object");
                }
            }
            else{
                throw new Error("TYPE ERROR: not an object");
            }
            var classname = obj.a.class;
            var argself:any =  {a:{ tag: "object", class: classname }, tag: "id", name: "self"}
            var newargs:Expr<Type>[] = [];
            newargs.push(argself);
            var realargs = expr.args.map(a=> typeCheckExpr(a, env));
            newargs = newargs.concat(realargs);
            var methodname = expr.name + "$" + classname
            var [argTypes, retType] = env.funs.get(methodname);
            argTypes.forEach((t,i) =>{
                if(typeof t =="object"&& typeof newargs[i].a == "object"){
                    var a:any = newargs[i].a
                    if(t.class !== a.class) {throw new Error("TYPE ERROR: mismatch")}
                }
                else if(t!==newargs[i].a) {throw new Error("TYPE ERROR: mismatch")}
            })
            
            return {...expr, obj:obj, args: newargs, a:retType}
            
    }
}

export function typeCheckLiteral(literal: Literal<null>): Literal<Type>{
    switch(literal.tag){
        case "num":
            return {...literal, a: "int"};
        case "bool":
            return {...literal, a: "bool"};    
        case "none":
            return {...literal, a: "none"};
    }
}