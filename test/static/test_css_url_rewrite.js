/*global test, asyncTest, ok, equal, deepEqual, start, module, strictEqual, notStrictEqual, raises*/
define([
	'css',
	'text!./test_css_rewrite.css',
	'text!./test_css_rewrite_url.css',
	'text!./test_css_rewrite_url_expected.css'
], function(dummy, css, cssWithUrl, expectedRewrittenCss) {
	test('updateCssPaths is in global scope', function() {
		ok(window.updateCssPaths);
	});

	test('updateCssPaths correctly handles "-webkit-linear-gradient"', function() {
		equal(css, window.updateCssPaths(css, function(url) {
			return 'foobar';
		}));
	});

	test('updateCssPaths correctly rewrites paths', function() {
		var rewritten = window.updateCssPaths(cssWithUrl, function(url) {
			return /^https?:|^data:|^file:|^\//.test(url)? url : '/static/'+url;
		});
		equal(rewritten, expectedRewrittenCss);
	});

	start();
});



