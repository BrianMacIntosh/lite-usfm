const test = require('node:test')
const assert = require('node:assert')
const UsfmJsonParser = require('../src/index.js')

test('Parse test-input.sfm', (t) => {
	  const fs = require('fs')
	  const parser = new UsfmJsonParser()
	  const input = fs.readFileSync('test/test-input.sfm', 'utf8')
	  const expectedOutput = JSON.parse(fs.readFileSync('test/test-output.json', 'utf8'))
	  const output = parser.parse(input)
	  assert.deepStrictEqual(output, expectedOutput)
	})
