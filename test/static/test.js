/*global test, asyncTest, ok, equal, deepEqual, start, module, strictEqual, notStrictEqual, raises*/
require([
	'a'
], function(a) {
	test('require works', function() {
		ok(a);
		equal(a.name, 'a');
	});
});
