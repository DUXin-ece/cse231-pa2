import { stringifyTree } from "./treeprint";
import {parser} from "lezer-python"
import {parse, toprogram} from './parser';
import * as compiler from './compiler';



const source =`x:int = 3
while x>0:
    print(x)
    x= x-1`;

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