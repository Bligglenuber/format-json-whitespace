/**
 * @typedef {Object} formatJSONStringWhitespace#options
 * @property {string} [indentSymbol="\t"] - The string to use as the indentation
 * @property {string} [defaultKey="default"] - The name of the key recognised in the config object as being the default if a matching key isn't present
 * @property {string} [arrayKey="array"] - The name of the key used internally to represent being in an array in the path. Set to something that doesn't clash
 * @property {Object} [config={}] - An object defining which part of the input structure is formatted in what way
 * @property {number} [depth] - A short hand for making the output be indented up to the given depth
 */

/**
 * This is JSON.stringify() but with finer control over how the whitespace is formatted
 *
 * @param {Object} inputJSON - The object to stringify
 * @param {formatJSONStringWhitespace#options} [options={}] - Configuration options
 * @returns {string} - The resulting JSON string
 */
function formatJSONStringWhitespace( inputJSON, options = {} ) {
	const indentSymbol = options.indentSymbol || '\t';
	const defaultKey = options.defaultKey || 'default';
	const arrayKey = options.arrayKey || 'array';
	const config = options.config || {};
	const depth = options.depth;
	let output = '';
	let line = '';
	const inObjectHistory = [];
	const inArrayHistory = [];
	const currentPath = [];
	let currentKey;
	let inObject = false;
	let inArray = false;
	let inKey = false;
	let inValue = false;
	let expectKey = false;
	let keyStartIndex = 0;

	const input = JSON.stringify( inputJSON );

	/**
	 * Helper method that returns a string with the indentSymbol repeated the desired number of times
	 *
	 * @param {number} indentCount - The number of indentations
	 * @returns {string} - The resulting indent
	 */
	function getIndent( indentCount ) {
		let indent = '';
		while ( indentCount > 0 ) {
			indentCount--;
			indent += indentSymbol;
		}
		return indent;
	}

	/**
	 * Helper method that returns the desired level of the config object based on where formatter has got to in the input object
	 *
	 * @param {Array.<string>} objectPath - An array of string keys defining whereabouts in the object the formatter has got
	 * @returns {Object} - The desired part of the config
	 */
	function getConfig( objectPath ) {
		let currentConfig = config;
		for ( const key of objectPath ) {
			if ( currentConfig.children ) {
				if ( currentConfig.children.hasOwnProperty( key ) ) {
					currentConfig = currentConfig.children[key];
				} else if ( currentConfig.children.hasOwnProperty( defaultKey ) ) {
					currentConfig = currentConfig.children[defaultKey];
				} else {
					currentConfig = {};
					break;
				}
			} else {
				currentConfig = {};
				break;
			}
		}
		return currentConfig;
	}

	for ( let charIndex = 0; charIndex < input.length; charIndex++ ) {
		const char = input[charIndex];
		let shouldBreakLine = false;
		let indentSize;

		line += char;

		let currentConfig = getConfig( currentPath );

		if ( !inKey && !inValue ) {
			if ( char === '{' ) {
				inObject = true;
				inArray = false;
				expectKey = true;
				inObjectHistory.push( true );
				inArrayHistory.push( false );
				if ( currentKey !== undefined ) {
					currentPath.push( currentKey );
					currentConfig = getConfig( currentPath );
				}
				indentSize = currentPath.length + 1;
				shouldBreakLine = currentConfig.expand !== undefined ? currentConfig.expand : depth >= indentSize;
			} else if ( char === '}' ) {
				inObjectHistory.pop();
				inArrayHistory.pop();
				currentPath.pop();
				inObject = inObjectHistory[inObjectHistory.length - 1];
				inArray = inArrayHistory[inArrayHistory.length - 1];
				currentKey = currentPath[currentPath.length - 1];
				currentConfig = getConfig( currentPath );
				expectKey = inObject;
				if ( input[charIndex + 1] && input[charIndex + 1] !== ',' ) {
					indentSize = currentPath.length + 1;
					shouldBreakLine = currentConfig.expand !== undefined ? currentConfig.expand : depth >= indentSize;
				}
			} else if ( char === '[' ) {
				inObject = false;
				inArray = true;
				inObjectHistory.push( false );
				inArrayHistory.push( true );
				if ( currentKey !== undefined ) {
					currentPath.push( currentKey );
					currentConfig = getConfig( currentPath );
				}
				currentKey = arrayKey;
				indentSize = currentPath.length + 1;
				shouldBreakLine = currentConfig.expand !== undefined ? currentConfig.expand : !!currentConfig.maxCharacters || depth >= indentSize;
			} else if ( char === ']' ) {
				inObjectHistory.pop();
				inArrayHistory.pop();
				currentPath.pop();
				inObject = inObjectHistory[inObjectHistory.length - 1];
				inArray = inArrayHistory[inArrayHistory.length - 1];
				currentKey = currentPath[currentPath.length - 1];
				currentConfig = getConfig( currentPath );
				expectKey = inObject;
				if ( input[charIndex + 1] !== ',' ) {
					indentSize = currentPath.length + 1;
					shouldBreakLine = currentConfig.expand !== undefined ? currentConfig.expand : !!currentConfig.maxCharacters || depth >= indentSize;
				}
			} else if ( char === ':' ) {
				expectKey = false;
				line += ' ';
			} else if ( char === ',' ) {
				if ( !inArray ) {
					expectKey = true;
				}
				line += ' ';
				indentSize = currentPath.length + 1;
				shouldBreakLine = currentConfig.expand !== undefined ? currentConfig.expand : depth >= indentSize;
				if ( currentConfig.maxCharacters && !shouldBreakLine ) {
					const lineLength = line.length - ( indentSymbol.length * indentSize );
					if ( lineLength >= currentConfig.maxCharacters ) {
						output += line + '\n';
						line = getIndent( indentSize );
					}
				}
			}

			if ( input[charIndex + 1] === '}' || input[charIndex + 1] === ']' ) {
				indentSize = currentPath.length;
				shouldBreakLine = currentConfig.expand !== undefined ? currentConfig.expand : !!currentConfig.maxCharacters || depth > indentSize;
			}
		}

		if ( char === '"' ) {
			// If there's a preceding \ then the " is escaped and should be ignored
			if ( ( inKey || inValue ) && input[charIndex - 1] !== '\\' ) {
				if ( inKey ) {
					inKey = false;
					currentKey = input.slice( keyStartIndex, charIndex );
				} else {
					inValue = false;
					if ( input[charIndex + 1] !== ',' && input[charIndex + 1] !== ':' ) {
						indentSize = currentPath.length;
						shouldBreakLine = currentConfig.expand !== undefined ? currentConfig.expand : !!currentConfig.maxCharacters || depth > indentSize;
					}
				}
			} else {
				if ( expectKey ) {
					inKey = true;
					keyStartIndex = charIndex + 1;
				} else {
					inValue = true;
				}
			}
		}

		if ( shouldBreakLine ) {
			output += line + '\n';
			line = getIndent( indentSize );
		}
	}

	output += line;

	output = output.replace( / \n/g, '\n' );

	return output;
}

export default formatJSONStringWhitespace;
