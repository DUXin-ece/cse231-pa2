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
const hidden11 = //return id
`
class C(object):
  x : int = 0
  def f(self: C) -> int:
    x
`

const hidden12 = 
`
class C(object):
   def f(self: C) -> int:
     if True:
       return 0
     else:
       pass

`


const hidden29 = //init get called
`
class C(object):
  n : int = 0
  def __init__(self: C):
    self.n = 1

print(C().n)
`

const source =
`class LinkedList(object):
  value : int = 0
  next: LinkedList = None
  def new(self: LinkedList, value: int, next: LinkedList) -> LinkedList:
    self.value = value
    self.next = next
    return self

  def sum(self: LinkedList) -> int:
    if self.next is None:
      return self.value
    else:
      return self.value + self.next.sum()

l: LinkedList = None
l = LinkedList().new(1, LinkedList().new(2, LinkedList().new(3, None)))
print(l.sum())
print(l.next.sum())
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