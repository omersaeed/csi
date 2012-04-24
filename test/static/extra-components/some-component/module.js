/*global test, asyncTest, ok, equal, deepEqual, start, module, strictEqual, notStrictEqual, raises*/
define([
    'path!test-component:util'
], function(util) {
    return function() {
        ok(util);
        equal(util.str, 'some string in util');
    };
});
