import { stringifyTree } from "./treeprint";
import {parser} from "lezer-python"
import {parse, toprogram} from './parser';
import { typeCheckProgram } from "./tc";
import * as compiler from './compiler';



const source =
`class C(object):
    x : int = 123
class B(object):
    y: int = 333
    x: int = 123

a: C = None
a = C()
print(a.x)
`;

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
const typedprogrm = typeCheckProgram(program)
// const compiled = compiler.compile(source);
// console.log(ast);