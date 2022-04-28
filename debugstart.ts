import { stringifyTree } from "./treeprint";
import {parser} from "@lezer/python"
import {parse, toprogram} from './parser';
import { typeCheckProgram } from "./tc";
import * as compiler from './compiler';

const hidden2 = 
`
class C(object):
  def f(self : C, x : int) -> int:
    return x * 2

c : C = None
c = C()
if c.f(c.f(2)):
  pass
else:
  pass
`
const hidden4=
`
class C(object):
    def none(self: C) -> C:
        return None
  
C().none()
`

const source =hidden4;

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