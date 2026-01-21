
class UsfmJsonParser
{
	// override tag start handler functions
	wordTagStartHandlers = {
		//"f": function(tag) {
		//	if (tag == "f")
		//	{
		//		return { tag: "f" }
		//	}
		//	else
		//	{
		//		return false
		//	}
		//}
	}

	// override tag end handler functions
	wordTagEndHandlers = {
		//"f": function(element, params) {
		//	
		//}
	}

	wordTagStartHandlerFallback = function(tag) {
		return { tag: tag, content: [] }
	}

	wordTagEndHandlerFallback = function(element, params) {
		Object.assign(element, params)
	}

	rootTagHandlers = {
		"id": function(tag, contents, state) {
			if (tag == "id") // id - identification
			{
				const space = contents.indexOf(" ")
				state.handleLine({ tag: "id", id: contents.substring(0, space) })
				return true
			}
			else
			{
				return false
			}
		},
		"v": function(tag, contents, state) {
			if (tag == "v") // v - verse
			{
				const space = contents.indexOf(" ")
				state.handleLine({
					tag: "v",
					num: parseInt(contents.substring(0, space)),
					content: this.parseText(state.lineNum, contents.substring(space + 1))
				})
				return true
			}
			else
			{
				return false
			}
		},
		"c": function(tag, contents, state) { // c - chapter
			if (tag == "c")
			{
				state.handleLine({ tag: "c", num: parseInt(contents) })
				return true
			}
			else
			{
				return false
			}
		},
		"s#": function(tag, contents, state) { // s# - section heading
			const level = this.parseLeveledTag("s", tag)
			if (level !== null)
			{
				state.handleLine({
					tag: "s",
					level: level,
					content: this.parseText(state.lineNum, contents)
				})
				return true;
			}
			else
			{
				return false;
			}
		},
		"q#": function(tag, contents, state) { // q# - poetic line
			const level = this.parseLeveledTag("q", tag)
			if (level !== null)
			{
				state.handleLine({
					tag: "q",
					level: level,
					content: this.parseText(state.lineNum, contents)
				})
				return true;
			}
			else
			{
				return false;
			}
		},
		"b": function(tag, contents, state) {
			if (tag == "b") // b - blank line
			{
				state.handleLine({ tag: "b" })
				return true;
			}
			else
			{
				return false;
			}
		}
		// "m": fallback
	}

	rootTagHandlerFallback = function(tag, contents, state) {
		// fallback behavior is to treat the contents as text
		state.handleLine({
			tag: tag,
			content: this.parseText(state.lineNum, contents)
		})
		return true;
	}

	// lineCallback - If provided, each parsed line will be passed to the callback.
	//		Otherwise, the lines are returned as an array.
	parse(text, lineCallback)
	{
		const state = {}
		if (lineCallback)
		{
			state.handleLine = function(item) {
				lineCallback(item)
			}
		}
		else
		{
			state.lines = []
			state.handleLine = function(item) {
				this.lines.push(item)
			}
		}
		const lines = text.split(/\r?\n/)
		for (var lineNum = 0; lineNum < lines.length; ++lineNum)
		{
			const line = lines[lineNum]
			if (line.length == 0) continue
			state.lineNum = lineNum + 1
			const space1 = line.indexOf(" ")
			const leadTag = space1 >= 0 ? line.substring(1, space1) : line.substring(1)
			const contents = space1 >= 0 ? line.substring(space1 + 1) : ""

			var matchedType = null
			for (const tagKey in this.rootTagHandlers)
			{
				if (this.rootTagHandlers[tagKey].bind(this)(leadTag, contents, state))
				{
					matchedType = tagKey
					break;
				}
			}
			if (!matchedType)
			{
				this.rootTagHandlerFallback.bind(this)(leadTag, contents, state)
				matchedType = leadTag
			}
			state.lastTagType = matchedType
			state.lastTag = leadTag
		}
		return state.lines
	}

	parseLeveledTag(key, tag)
	{
		const match = tag.match(new RegExp(String.raw`^${key}(\d*)$`))
		if (match)
		{
			return match[1] && match[1].length > 0 ? parseInt(match[1]) : 1
		}
		else
		{
			return null;
		}
	}

	// Tries to produce an empty element for the specified tag.
	handleWordTagStart(tag)
	{
		for (const key in this.wordTagStartHandlers)
		{
			const result = this.wordTagStartHandlers[key].bind(this)(tag)
			if (result)
			{
				return { key: key, element: result };
			}
		}
		return { key: tag, element: this.wordTagStartHandlerFallback.bind(this)(tag) }
	}

	// Tries to finish off the element for a tag using parsed parameters
	handleWordTagEnd(key, element, paramStr)
	{
		// parse parameters
		const params = {}
		var paramKeyStart = 0
		while (true)
		{
			var paramSep = paramStr.indexOf('=', paramKeyStart)
			if (paramSep >= 0)
			{
				const paramKey = paramStr.substring(paramKeyStart, paramSep).trim()
				var valStart = paramStr.indexOf("\"", paramSep)
				var valEnd = paramStr.indexOf("\"", valStart + 1) //TODO: handle escaped quotes
				//TODO: error checking
				params[paramKey] = paramStr.substring(valStart + 1, valEnd)
				paramKeyStart = valEnd + 1
			}
			else
			{
				break;
			}
		}

		if (this.wordTagEndHandlers[key])
		{
			this.wordTagEndHandlers[key].bind(this)(element, params)
		}
		else
		{
			return this.wordTagEndHandlerFallback.bind(this)(element, params)
		}
	}

	isTagCharacter(str, index)
	{
		const code = str.charCodeAt(index);
		return code >= 48 && code <= 57 // 0-9
			|| code >= 65 && code <= 90 // A-Z
			|| code >= 97 && code <= 122 // a-z
			|| code == 45 // -
	}

	// Converts USFM text content into an array of elements. Not for top-level USFM.
	parseText(lineNum, text)
	{
		text = text.trim()

		const rootNode = []
		
		const closeOutText = function(throughIndex)
		{
			if (contentHandled <= throughIndex)
			{
				const newElement = text.substring(contentHandled, throughIndex + 1)
				const parentElement = tagStack.at(-1).element
				if (parentElement) // a tag with a null element will cause children to be discarded
				{
					parentElement.content.push(newElement)
				}
				contentHandled = throughIndex + 1
			}
		}

		var contentHandled = 0 // first index of content that has not yet been turned into DOM
		var tagStack = [ {
			element: { content: rootNode },
			tag: "(root)",
			contentStart: 0, // first index of the tag's content
		}]
		for (var i = 0; i < text.length; ++i)
		{
			if (text[i] == '\\')
			{
				const tagStart = i

				// locate the end of the tag
				for (var tagEndPlus = i + 1; tagEndPlus < text.length; tagEndPlus++)
				{
					if (text.charCodeAt(tagEndPlus) == 42) // '*'
					{
						tagEndPlus++
						break
					}
					else if (!this.isTagCharacter(text, tagEndPlus))
					{
						break
					}
				}

				var tag = text.substring(tagStart + 1, tagEndPlus) // drop leading \
				if (tag[tag.length - 1] == '*') // close tag
				{
					tag = tag.substring(0, tag.length - 1) // drop *

					// pop all the way back down to the last matching tag
					// handles the fact that non-ranged tags look the same as block tags
					const matchIndex = tag.length == 0
						? tagStack.length - 1 // special case: \* closes the last opened tag
						: tagStack.findLastIndex(item => item.tag == tag)
					if (matchIndex >= 0)
					{
						tagStack = tagStack.slice(0, matchIndex + 1)
						const thisTag = tagStack.at(-1);
						const tagContent = text.substring(thisTag.contentStart, tagStart)
						const splitPoint = tagContent.indexOf('|', contentHandled - thisTag.contentStart)
						const splitContent = splitPoint >= 0 ? tagContent.substring(0, splitPoint) : tagContent
						const splitParams = splitPoint >= 0 ? tagContent.substring(splitPoint + 1) : ""

						// close out raw text
						closeOutText(thisTag.contentStart + splitContent.length - 1)
						contentHandled = tagEndPlus

						// close out tag
						this.handleWordTagEnd(thisTag.key, thisTag.element, splitParams)

						tagStack.pop()
					}
					else
					{
						console.error(`Mismatched USFM word-level tags '${tagStack.at(-1).tag}' and '${tag}' (ln ${lineNum}, col ${tagStart})`)
					}
				}
				else // open tag
				{
					closeOutText(tagStart - 1)

					// create an empty element to start adding children into
					const tagData = this.handleWordTagStart(tag)
					const parentElement = tagStack.at(-1).element
					if (tagData.element)
					{
						contentHandled = tagEndPlus

						// also skip over any whitespace trailing the open tag
						while (contentHandled < text.length && text[contentHandled] == ' ') contentHandled++

						if (parentElement)
						{
							parentElement.content.push(tagData.element)
						}
					}
					tagData.tag = tag
					tagData.contentStart = tagEndPlus
					tagData.content = []
					tagStack.push(tagData)
				}

				i = tagEndPlus - 1
			}
		}

		closeOutText(text.length - 1)

		return rootNode
	}
}
module.exports = UsfmJsonParser
