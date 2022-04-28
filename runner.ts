// This is a mashup of tutorials from:
//
// - https://github.com/AssemblyScript/wabt.js/
// - https://developer.mozilla.org/en-US/docs/WebAssembly/Using_the_JavaScript_API

import wabt from 'wabt';
import * as compiler from './compiler';
import {parse} from './parser';

// NOTE(joe): This is a hack to get the CLI Repl to run. WABT registers a global
// uncaught exn handler, and this is not allowed when running the REPL
// (https://nodejs.org/api/repl.html#repl_global_uncaught_exceptions). No reason
// is given for this in the docs page, and I haven't spent time on the domain
// module to figure out what's going on here. It doesn't seem critical for WABT
// to have this support, so we patch it away.
if(typeof process !== "undefined") {
  const oldProcessOn = process.on;
  process.on = (...args : any) : any => {
    if(args[0] === "uncaughtException") { return; }
    else { return oldProcessOn.apply(process, args); }
  };
}

export async function run(watSource : string, config: any) : Promise<number> {
  const wabtApi = await wabt();
  const parsed = wabtApi.parseWat("example", watSource);
  const binary = parsed.toBinary({});
  var memory = new WebAssembly.Memory({initial:10, maximum:100});
  config.mem = {heap: memory}
  config.imports.Checkinit = (obj:number):number=> {
    if(obj==0){
      throw new Error("RUNTIME ERROR: object must be initialized first");
    }
    return obj;
  };

  console.log(config);
  const wasmModule = await WebAssembly.instantiate(binary.buffer, config);
  return (wasmModule.instance.exports as any)._start();
}