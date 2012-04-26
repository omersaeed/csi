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
    'path!test-component:css!100:theme.css'
], function(a, TestComponentModule, fixture) {

    // we need to do two layers of `require()` calls since we want to guarantee
    // that 'style.css' was loaded _after_ 'theme.css'
    require([
        'css!style.css'
    ], function() {

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
            document.getElementById('qunit-fixture').appendChild(el);
            color = getComputedStyle(el, null).getPropertyValue('color');
            equal(color, 'rgb(0, 0, 0)');
            el.className = 'colorized';
            color = getComputedStyle(el, null).getPropertyValue('color');
            equal(color, 'rgb(255, 0, 0)');
        });

        test('css ordering works', function() {
            var color, el = document.createElement('div');
            document.getElementById('qunit-fixture').appendChild(el);
            color = getComputedStyle(el, null).getPropertyValue('background-color');
            ok(/rgba?\(0, 0, 0/.test(color));
            el.className = 'my-overridden-style';
            color = getComputedStyle(el, null).getPropertyValue('background-color');
            ok(/rgba?\(0, \d{2,3}, 0/.test(color));
        });

        start();
    });
});
