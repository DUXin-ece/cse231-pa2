import { stringifyTree } from "./treeprint";
import {parser} from "lezer-python"
import {parse, toprogram} from './parser';
import * as compiler from './compiler';



const source =`def f(x:int)->int:
    y:int = 4
    while y>2:
        y=y-1
        print(y)
        if y==1:
            return 1
    return 0

print(f(4))`;

console.log(source);

const tree = parser.parse(source);
const cursor = tree.cursor();
cursor.firstChild();
do{
    console.log(stringifyTree(cursor, source,0));
}while(cursor.nextSibling())

const ast = parse(source);

console.log(ast)
const program = toprogram(ast)
console.log(program)

const compiled = compiler.compile(source);
// console.log(ast);