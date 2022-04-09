# Program Assigment 1

## Writeup

1. Give three examples of Python programs that use binary operators and/or builtins from this PA, but have different behavior than your compiler.  
    + First, my compiler doesn't support float numbers computation. In python, `3.3+4.4` will get `7.7` as a result, but in my compiler, it will throw an error. 

        **Reasion:** Currently, the compiler only supports i32 data type.

        **How to support:** Add float number support.

    + The following sentences will raise an error in Python, but can generate an output in my compiler:

        ```
        max = 1
        max(2,3)
        ```

        **Reasion:** After excuting the first line, python stores max as an integer variable, therefore, it fails to parse the second line of code. In my compiler, the second sentence will return a result 3 anyway.

        **How to support:** Write some rules in compiler to check whether the function name has been used as a variable.

    + Python support passing a variable number of arguments to `max` and `min`. In my compiler, these functions only accept 2 arguments.

        **Reasion:** Now the compiler doesn't support function that has more than 2 arguments.

        **How to support:** Modify the function `traverseExpr` to support case `args.length>2`.

2. What resources did you find most helpful in completing the assignment?
   
    The PA1 Tutorial made by Yousef.

3. Who (if anyone) in the class did you work with on the assignment? (See collaboration below)

    I finished this assisgment by myself.