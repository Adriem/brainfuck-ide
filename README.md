# Brainfuck JS interpreter
Hey, check this out! A Brainfuck interpreter in JS. Yeah, some men only want to
see the world burn. But if you're interested, keep reading.

This is part of a future little Brainfuck IDE which I intend to use, but for
now there is only one interpreter that outputs all the states of the code you
write in a pretty verbose way.

## Install it
All you need to do is cloning this repo, install node (v10 or greater,
supporting `for await`) and get ready to get your brain fucked. No `npm install`
is necessary (for now :P).

## Run it
This little script just needs you to pass the code in Brainfuck as second
parameter. Don't forget to quote it, since Brainfuck uses reserved characters
for most shells out there. There is no REPL mode yet, so just pass in the code
and watch it being executed.

#### Example (add two values)
```
./index.js ",>,[-<+>]."
```

## References
http://www.muppetlabs.com/~breadbox/bf/
https://esolangs.org/wiki/Brainfuck
https://gist.github.com/roachhd/dce54bec8ba55fb17d3a
