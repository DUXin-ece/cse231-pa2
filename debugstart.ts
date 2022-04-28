import { stringifyTree } from "./treeprint";
import {parser} from "@lezer/python"
import {parse, toprogram} from './parser';
import { typeCheckProgram } from "./tc";
import * as compiler from './compiler';



const source =
`
class C(object):
    x : int = 123
    def new(self: C, x: int) -> C:
        print(self.x)
        self.x = x
        print(self.x)
        return self
    def clear(self: C) -> C:
        return self.new(123)

C().new(42).clear()
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
const compiled = compiler.compile(source);
// console.log(ast);