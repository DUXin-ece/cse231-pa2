import wabt from 'wabt';
import {parse} from './parser';
import * as compiler from './compiler';
const source = "sss(1,2,3)";
const ast = parse(source);
const compiled = compiler.compile(source);
console.log(ast);