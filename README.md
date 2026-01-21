# lite-usfm

lite-usfm is a superlite, zero-dependency USFM-to-JSON parser that makes minimal assumptions about the semantic meaning of the source text.

While other parsers impose semantic meaning on the markers in the source text in order to produce a more friendly output, lite-usfm imposes minimal meaning on the source syntax - a tag in is a tag out. This makes it more suitable for handling non-standard markers.

## Usage

The parser can be invoked in one of two ways.

Return the parsed tags in an array:
```
const UsfmJsonParser = require("lite-usfm")
const array = new UsfmJsonParser().parse("\v USFM text")
```
Call a callback for each parsed line in order:

```
const UsfmJsonParser = require("lite-usfm")
const callback = (line) => { console.log(line) }
new UsfmJsonParser().parse("\v USFM text", callback)
```

## Output Format

Document me.
