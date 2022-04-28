import { stringifyTree } from "./treeprint";
import {parser} from "@lezer/python"
import {parse, toprogram} from './parser';
import { typeCheckProgram } from "./tc";
import * as compiler from './compiler';



const source =
`
class C(object):
    d : D = None
    def new(self: C, d : D) -> C:
        self.d = d
        return self
  
class D(object):
    c : C = None
    def new(self: D, c: C) -> D:
        self.c = c
        return self
    
c : C = None
d : D = None
c = C().new(d)
c.d.c
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