/*global test, asyncTest, ok, equal, deepEqual, start, module, strictEqual, notStrictEqual, raises*/

// define some paths
require({
    paths: {
        'test-component': 'extra-components/some-component'
    }
});

require([
	'a',
    'path!test-component:module',
    'text!fixture.json',
    'css!style.css'
], function(a, TestComponentModule, fixture) {
	test('require works', function() {
		ok(a);
		equal(a.name, 'a');
	});

    test('path plugin works', function() {
        ok(TestComponentModule);
        TestComponentModule();
    });

    test('text plugin works', function() {
        ok(fixture);
        equal(JSON.parse(fixture).foo, 'bar');
    });

    test('including style works', function() {
        var color, el = document.createElement('div');
        document.getElementsByTagName('body')[0].appendChild(el);
        color = getComputedStyle(el, null).getPropertyValue('color');
        equal(color, 'rgb(0, 0, 0)');
        el.className = 'colorized';
        color = getComputedStyle(el, null).getPropertyValue('color');
        equal(color, 'rgb(255, 0, 0)');
    });

	start();
});
