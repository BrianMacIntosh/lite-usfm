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

The output is an array of objects. Each object represents one marker line. The objects will have the following properties:

* `tag`: (string) The tag (e.g. 'v')
* `tagClass`: (string) The tag, without any trailing numbers.
* `level`: (number|undefined) Trailing numbers from the tag.
* `contentRaw`: (string) Unparsed content of the tag.
* `num`: (number) For 'v' and 'c' tags, the verse or chapter number.
* `content`: (array) Parsed content of the tag. This array will contain either strings or character marker objects. Character markers have:
	* `tag`: (string) The tag (e.g. 'f')
	* `content`: The content of the tag. This may again be an array of strings and character markers.
	* `params`: The attributes of the tag. If there is a default (unnamed) parameter, it will be named `_default`.
```

