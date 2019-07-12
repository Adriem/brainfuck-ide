#!/usr/bin/env node

const readline = require('readline');
const runtime = require('./interpreter');

const commandMappings = {
  INCREMENT_DATA_POINTER: '>',
  DECREMENT_DATA_POINTER: '<',
  INCREMENT_DATA_VALUE: '+',
  DECREMENT_DATA_VALUE: '-',
  OUTPUT_DATA_VALUE: '.',
  READ_INPUT_VALUE: ',',
  JUMP_FORWARD: '[',
  JUMP_BACKWARDS: ']',
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const readData = () => new Promise((resolve) => {
  rl.question('- INPUT: ', (answer) => resolve(parseInt(answer)));
});

const outputData = (data) => console.log('- OUTPUT:', data);

const parserConfig = {
  commandMappings,
  stackSize: 30,
  cellSize: 0xFF,
  onOutputData: outputData,
  onReadInput: readData,
};

const main = async (programStr) => {
  const program = programStr.replace(/[^+-><\[\],\.]+/g, '').split('');

  try {
    for await (let state of runtime(program, parserConfig)) {
      console.log(`
[STEP]
- PROGRAM: ${ state.program.map((v, i) => i === state.instructionPointer ? `( ${ v } )` : `${ v }`).join('') }
- STACK: |${ state.stack.map((v, i) => i === state.dataPointer ? `( ${ v } )` : `${ v }`).join('|') }|`);
    };
  } catch (err) {
    console.log('[ABORT]', err.message);
  } finally {
    rl.close();
  }
}

main(process.argv[ 2 ]);
