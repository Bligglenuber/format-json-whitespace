# format-json-whitespace
Can be used to configure the depths at which JSON objects are expanded with whitespace with finer control.
You can specify a depth which which to expand or pass a config object which describes how specific paths in the input are handled.

eg.
```javascript
const json = {"a":1,"b":[1,2,3],"c":{"d":1,"e":[1,2,3],"f":{"g":1}}};
```

We can use the built in `JSON.stringify` as follows:
```javascript
JSON.stringify(json, null, '\t')
```
to get
```
{
	"a": 1,
	"b": [
		1,
		2,
		3
	],
	"c": {
		"d": 1,
		"e": [
			1,
			2,
			3
		],
		"f": {
			"g": 1
		}
	}
}
```

But that consumes a lot of vertical space and very little horizontal. We can use formatJSONWhitespace with the depth option as follows instead:
```javascript
formatJSONStringWhitespace(json, {depth:2})
```
to get
```
{
	"a": 1,
	"b": [
		1,
		2,
		3
	],
	"c": {
		"d": 1,
		"e": [1, 2, 3],
		"f": {"g": 1}
	}
}
```
Even now, the `json.b` array is still being expanded when it could be collapsed as well. We can use the config option as follows for tighter control:
```javascript
const options = {
	"config": {
		"expand": true,
		"children": {
			"c": {
				"expand": true
			}
		}
	}
};
formatJSONStringWhitespace(json, options)
```
where the config states that the top level and the `json.c` property should be expanded:
```
{
	"a": 1,
	"b": [1, 2, 3],
	"c": {
		"d": 1,
		"e": [1, 2, 3],
		"f": {"g": 1}
	}
}
```
Finally, you can set wrapping limits rather than full expansion:
```javascript
const options = {
	"config": {
		"expand": true,
		"children": {
			"b": {
				"maxCharacters": 15
			}
		}
	}
};
formatJSONStringWhitespace(json, options)
```
and (after adding some more elements to `json.b`) we get
```
{
	"a": 1,
	"b": [
		1, 2, 3, 4, 5,
		6, 7, 8, 9, 10,
		11, 12, 13, 14,
		15
	],
	"c": {"d": 1, "e": [1, 2, 3], "f": {"g": 1}}
}
```
