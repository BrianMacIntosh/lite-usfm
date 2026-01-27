
/**
 * Object for parsing USFM text into a sequence of Javascript objects.
 */
class UsfmJsonParser
{
	/**
	 * Override tag start handler functions.
	 * @private
	 */
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

	/**
	 * Override tag end handler functions.
	 * @private
	 */
	wordTagEndHandlers = {
		//"f": function(element, params) {
		//	
		//}
	}

	wordTagStartHandlerFallback = function(tag) {
		return { tag: tag, content: [] }
	}

	wordTagEndHandlerFallback = function(element, params) {
		if (Object.keys(params).length > 0) element.params = params
	}

	rootTagHandlers = {
		"v": function(tag, contents, state) {
			if (tag == "v") // v - verse
			{
				const space = contents.indexOf(" ")
				state.handleLine({
					tag: "v", tagClass: "v",
					num: parseInt(contents.substring(0, space)),
					contentRaw: contents,
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
				state.handleLine({ tag: "c", tagClass: "c", num: parseInt(contents), contentRaw: contents })
				return true
			}
			else
			{
				return false
			}
		}
	}

	rootTagHandlerFallback = function(tag, contents, state) {
		const result = { tag: tag, tagClass: tag }

		// parse tag contents
		if (contents && contents.length > 0)
		{
			result.contentRaw = contents
			result.content = this.parseText(state.lineNum, contents)
		}

		// parse level out of tag
		const levelMatch = tag.match(/^([^\d]+)(\d+)$/)
		if (levelMatch)
		{
			result.tagClass = levelMatch[1]
			result.level = parseInt(levelMatch[2])
		}

		state.handleLine(result)
		return true;
	}
	
	/**
	 * Parses USFM text into a sequence of tags.
	 * @param {string} text - Original USFM text to parse.
	 * @param {function} lineCallback - If provided, each parsed tag will be passed to the callback instead of returned.
	 * @returns If lineCallback was not provided, an array of parsed tags.
	 */
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

	/** Parses a tag with an appended level number. If no number, 1 is assumed.
	 * @param {string} key - The expected tag without numbers
	 * @param {string} tag - The tag to parse
	 * @returns {number|null} If the tag was matched, the number. Otherwise, null.
	 */
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

	/**
	 * Tries to produce an empty element for the specified tag.
	 * @private
	 */
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

	/**
	 * Tries to finish off the element for a tag using parsed parameters.
	 * @private
	 */
	handleWordTagEnd(key, element, paramStr)
	{
		// parse parameters
		const params = {}
		var hasParams = false
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
				hasParams = true
			}
			else
			{
				// if no params were named, use the whole string as a default param
				if (!hasParams && paramStr)
				{
					params["_default"] = paramStr.trim()
					hasParams = true
				}

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

	/**
	 * Tests if the character at the specified index can be part of a tag name.
	 * @returns True if the character is allowed.
	 */
	isTagCharacter(str, index)
	{
		const code = str.charCodeAt(index);
		return code >= 48 && code <= 57 // 0-9
			|| code >= 65 && code <= 90 // A-Z
			|| code >= 97 && code <= 122 // a-z
			|| code == 45 // -
	}

	/**
	 * Converts USFM text content into an array of elements. Not for top-level USFM.
	 * @param {number} lineNum 
	 * @param {string} text 
	 * @returns An array of text elements (strings) and character marker objects.
	 */
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

						tagStack = tagStack.slice(0, matchIndex)
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
