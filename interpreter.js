const _replaceInArray = (array, position, value) => {
  const newArr = [ ...array ];
  newArr.splice(position, 1, value)
  return newArr;
};

const _findMatchingToken = (tokenArray, tokenPosition, matchingToken, direction = 'asc') => {
  let _nestingLevel = 0, _matchingTokenPos;

  let continueSearching = direction === 'asc'
    ? () => _matchingTokenPos < tokenArray.length
    : () => _matchingTokenPos > -1;

  let moveNextPosition = direction === 'asc'
    ? () => _matchingTokenPos++
    : () => _matchingTokenPos--;

  for (_matchingTokenPos = tokenPosition; continueSearching(); moveNextPosition()) {
    if (tokenArray[ _matchingTokenPos ] === tokenArray[tokenPosition]) _nestingLevel++;
    else if (tokenArray[ _matchingTokenPos ] === matchingToken) _nestingLevel--;
    else continue;

    if (_nestingLevel === 0) break;
  }

  return _matchingTokenPos < tokenArray.length && _matchingTokenPos > -1 ? _matchingTokenPos : null;
};

/**
 * @typedef {object} RuntimeState
 * @prop {string[]} program
 * @prop {number[]} stack
 * @prop {number} dataPointer
 * @prop {number} instructionPointer
 */

const _initState = (program, stackSize) => ({
  program: [ ...program ],
  stack: new Array(stackSize).fill(0),
  dataPointer: 0,
  instructionPointer: 0,
});

 /**
  *
  * @param {string[]} program - Array of instructions to be run
  * @param {object} runtimeConfig - Configuration for the runtime
  * @param {Object<string, string>} runtimeConfig.commandMappings - Instruction mappings
  * @param {number} [runtimeConfig.stackSize] - Size of the memory stack (30000 by default)
  * @param {number} [runtimeConfig.cellSize] - Size of the memory cells of the stack (1 byte by default)
  * @param {function} runtimeConfig.onOutputData - Async function to be called when outputting data
  * @param {function} runtimeConfig.onReadInput - Async function to be called when reading input data
  * @returns {AsyncIterable<RuntimeState>}
  */
const runtime = (program, {
  commandMappings: {
    INCREMENT_DATA_POINTER,
    DECREMENT_DATA_POINTER,
    INCREMENT_DATA_VALUE,
    DECREMENT_DATA_VALUE,
    OUTPUT_DATA_VALUE,
    READ_INPUT_VALUE,
    JUMP_FORWARD,
    JUMP_BACKWARDS,
  },
  stackSize = 30000,
  cellSize = 0xFF,
  onOutputData,
  onReadInput,
}) => {
  /** @typedef {function(RuntimeState): (RuntimeState|Promise<RuntimeState>)} Command */

  /** @type {Object<string, Command>} */
  const commands = {

    /** @prop {Command} - Move the data pointer to the next position in the stack */
    [ INCREMENT_DATA_POINTER ]: ({ program, stack, dataPointer, instructionPointer }) => {
      const _dataPointer = dataPointer + 1;

      if (_dataPointer === stackSize) throw new Error(
        `DATA POINTER ERROR: Tried to access illegal stack position '${ _dataPointer }' (@${ instructionPointer })`
      );

      return {
        program,
        stack,
        dataPointer: _dataPointer,
        instructionPointer: instructionPointer + 1,
      };
    },

    /** @prop {Command} - Move the data pointer to the previous position in the stack */
    [ DECREMENT_DATA_POINTER ]: ({ program, stack, dataPointer, instructionPointer }) => {
      const _dataPointer = dataPointer - 1;

      if (_dataPointer < 0) throw new Error(
        `DATA POINTER ERROR: Tried to access illegal stack position '${ _dataPointer }' (@${ instructionPointer })`
      );

      return {
        program,
        stack,
        dataPointer: _dataPointer,
        instructionPointer: instructionPointer + 1,
      };
    },

    /** @prop {Command} - Increment by one the value at the data pointer */
    [ INCREMENT_DATA_VALUE ]: ({ program, stack, dataPointer, instructionPointer }) => {
      const _newValue = (stack[ dataPointer ] + 1) % cellSize;

      return {
        program,
        stack: _replaceInArray(stack, dataPointer, _newValue),
        dataPointer,
        instructionPointer: instructionPointer + 1,
      };
    },

    /** @prop {Command} - Decrement by one the value at the data pointer */
    [ DECREMENT_DATA_VALUE ]: ({ program, stack, dataPointer, instructionPointer }) => {
      const _newValue = (stack[ dataPointer ] + cellSize - 1) % cellSize;

      return {
        program,
        stack: _replaceInArray(stack, dataPointer, _newValue),
        dataPointer,
        instructionPointer: instructionPointer + 1,
      };
    },

    /** @prop {Command} - Output the value at the data pointer */
    [ OUTPUT_DATA_VALUE ]: async ({ program, stack, dataPointer, instructionPointer }) => {
      await onOutputData(stack[ dataPointer ]);

      return {
        program,
        stack,
        dataPointer,
        instructionPointer: instructionPointer + 1,
      };
    },

    /** @prop {Command} - Accept a value from the input and store it at the data pointer position */
    [ READ_INPUT_VALUE ]: async ({ program, stack, dataPointer, instructionPointer }) => {
      const _inputValue = await onReadInput();

      if (typeof _inputValue !== 'number') throw new Error(
        `INVALID INPUT ERROR: Only numeric inputs are allowed, but '${ _inputValue }' was supplied instead (@${ instructionPointer })`
      );

      if (_inputValue < 0 || _inputValue >= cellSize) throw new Error(
        `INVALID INPUT ERROR: Inputs values must be between 0 and ${ cellSize }, but '${ _inputValue }' was supplied instead (@${ instructionPointer })`
      );

      return {
        program,
        stack: _replaceInArray(stack, dataPointer, _inputValue),
        dataPointer,
        instructionPointer: instructionPointer + 1,
      };
    },

    /**
     * @prop {Command} - If value at the data pointer is zero, move instruction pointer
     *                   to the command after the matching JUMP_BACKWARDS command
     */
    [ JUMP_FORWARD ]: async ({ program, stack, dataPointer, instructionPointer }) => {
      let _matchingInstrPosition = _findMatchingToken(program, instructionPointer, JUMP_BACKWARDS);

      if (_matchingInstrPosition === null) throw new Error(
        `PARSING ERROR: unmatched ${ JUMP_FORWARD } instruction (@${ instructionPointer })`
      );

      return {
        program,
        stack,
        dataPointer,
        instructionPointer: stack[ dataPointer ] === 0
          ? _matchingInstrPosition + 1
          : instructionPointer + 1,
      };
    },

    /**
     * @prop {Command} - If value at the data pointer is nonzero, move instruction pointer
     *                   to the command after the matching JUMP_FORWARD command
     */
    [ JUMP_BACKWARDS ]: async ({ program, stack, dataPointer, instructionPointer }) => {
      let _matchingInstrPosition = _findMatchingToken(program, instructionPointer, JUMP_FORWARD, 'desc');

      if (_matchingInstrPosition === null) throw new Error(
        `PARSING ERROR: unmatched ${ JUMP_BACKWARDS } instruction (@${ instructionPointer })`
      );

      return {
        program,
        stack,
        dataPointer,
        instructionPointer: stack[ dataPointer ] !== 0
          ? _matchingInstrPosition + 1
          : instructionPointer + 1,
      };
    },
  }

  return {
    [ Symbol.asyncIterator ]: async function* () {
      let state = _initState(program, stackSize);
      let nextInstruction = state.program[ state.instructionPointer ];

      yield state;

      while (nextInstruction != null) {
        const command = commands[ nextInstruction ];

        if (command == null) throw new Error(
          `PARSING ERROR: Invalid instruction '${ nextInstruction }' (@${ state.instructionPointer })`
        );

        state = await command(state);
        nextInstruction = state.program[ state.instructionPointer ];

        yield state;
      }
    }
  };
};

module.exports = runtime;
