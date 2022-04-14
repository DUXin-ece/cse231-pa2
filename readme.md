<center> <h1>CSE231: Advanced Compiler Design</h1> </center>
<center> <h2>Assignment 2</h2> </center>
<center> <h3>Xin Du   A59005499</h3> </center>

### 1. Representation of Values
I define a type `Literal` in `ast.ts`.

```Typescript
export type Literal<A> = 
    {a?:A, tag:"num", value: number}
  | {a?:A, tag:"bool", value: boolean}
  | {a?:A, tag:"none"}
```

When parsing a statement `print(a)`, first, this statement is parsed as `{tag: "builtin1", name: "print", arg: Literal<null>}`. Then in the type checking stage, according to the tag of `arg`, the compiler will annotate this statement with a attrbute `a`. After that, in function `codeGenExpr`, the compiler will use the attrbute `a` to determine  which print function to call.

A snnipet of `codeGenExpr` is shown as follows:
```Typescript
if(expr.name=="print"){
    switch(expr.arg.a){
        case(Type.bool): toCall = "print_bool"; break;
        case(Type.int): toCall = "print_num"; break;
        case(Type.none): toCall = "print_none"; break;
    }
}
```

There are three print functions in my implementation(in `webstart.ts`):

```Typescript
print_num: (arg : any) => {
    console.log("Logging from WASM: ", arg);
    display(String(arg));
    return arg;
},

print_bool: (arg : any) => {
    if(arg === 0) { display("False"); }
    else { display("True"); }
    return arg;
},

print_none: (arg: any) => {
    display("None");
    return arg;
}
```
This implementation can print all integers and boolean values correctly. For example:

```Python
x:bool = True
print(x)
```

The generated .wat file is shown as follows:
```wasm
(module
        (func $print_num (import "imports" "print_num") (param i32) (result i32))
        (func $print_none (import "imports" "print_none") (param i32) (result i32))
        (func $print_bool (import "imports" "print_bool") (param i32) (result i32))
        (func $abs (import "imports" "abs") (param i32) (result i32))
        (func $max (import "imports" "max") (param i32 i32) (result i32))
        (func $min (import "imports" "min") (param i32 i32) (result i32))
        (func $pow (import "imports" "pow") (param i32 i32) (result i32))
        
        (global $x (mut i32) (i32.const 0))
        (func (export "_start") (result i32)
          (local $scratch i32 )
          (i32.const 1 )
          (global.set $x)
          (global.get $x)
          (call $print_bool)
          (local.set $scratch)
          (local.get $scratch)
        )
      )
```

We can see that in this script, the compiler calls `print_bool` to print data, which is what we expect.

The result is shown as follows:
![avatar](C:\Users\Xin Du\Desktop\img)

### 2. Variables


### 3. Infinite Loop

### 4. Examples

### 5. Analysis
