/*
---
name : sg-regex-tools
description : A few super-handy tools for messing around with RegExp

authors   : Thomas Aylott
copyright : © 2010 Thomas Aylott
license   : MIT

provides : [combineRegExp]
...
*/
;(function(exports){

exports.combineRegExp = function(regex, group){
	if (regex.source) regex = [regex]
	
	var names = [], i, source = '', this_source
	
	for (i = 0; i < regex.length; ++i){ if (!regex[i]) continue
		this_source = regex[i].source || ''+regex[i]
		if (this_source == '|') source += '|'
		else {
			source += (group?'(':'') + this_source.replace(/\s/g,'') + (group?')':'')
			if (group) names.push(group)
		}
		if (regex[i].names)	names = names.concat(regex[i].names)
	}
	regex = new RegExp(source,'gm')
	// [key] → 1
	for (i = -1; i < names.length; ++i) names[names[i]] = i + 1
	// [1] → key
	regex.names = names
	return regex
}

}(typeof exports != 'undefined' ? exports : this))
;(function() {
var require;
/*
---
name    : SheetParser.CSS

authors   : Thomas Aylott
copyright : © 2010 Thomas Aylott
license   : MIT

provides : SheetParser.CSS
requires : combineRegExp
...
*/
;(function(exports){
	

/*<depend>*/
var UNDEF = {undefined:1}
if (!exports.SheetParser) exports.SheetParser = {}

/*<CommonJS>*/
var combineRegExp = UNDEF[typeof require]
	?	exports.combineRegExp
	:	require('./sg-regex-tools').combineRegExp
var SheetParser = exports.SheetParser
/*</CommonJS>*/

/*<debug>*/;if (UNDEF[typeof combineRegExp]) throw new Error('Missing required function: "combineRegExp"');/*</debug>*/
/*</depend>*/


var CSS = SheetParser.CSS = {version: '1.0.2rc1'}

CSS.camelCase = function(string){
	return ('' + string).replace(camelCaseSearch, camelCaseReplace)
}
var camelCaseSearch = /-\D/g
function camelCaseReplace(match){
	return match.charAt(1).toUpperCase()
}

CSS.parse = function(cssText){
	var	found
	,	rule
	,	rules = {length:0}
	,	keyIndex = -1
	,	regex = this.parser
	,	names = CSS.parser.names
	,	i,r,l
	,	ruleCount
	
	rules.cssText = cssText = ('' + cssText)
	
	// strip comments
	cssText = cssText.replace(CSS.comment, '');
	
	regex.lastIndex = 0
	while ((found = regex.exec(cssText))){
		// avoid an infinite loop on zero-length keys
		if (regex.lastIndex == found.index) ++ regex.lastIndex
		
		// key:value
		if (found[names._key]){
			rules[rules.length ++] = found[names._key]
			rules[found[names._key]] = found[names._value]
			rules[CSS.camelCase(found[names._key])] = found[names._value]
			continue
		}
		
		rules[rules.length++] = rule = {}
		for (i = -1, l = names.length; i < l; ++i){
			if (!found[i]) continue
			rule[names[i-1]] = found[i]
		}
	}
	
	for (i = -1, l = rules.length; i < l; ++i){
		if (!rules[i] || !rules[i].style_cssText) continue
		
		rules[i].style = CSS.parse(rules[i].style_cssText)
		
		for (ruleCount = -1, r = -1, rule; rule = rules[i].style[++r];){
			if (typeof rule == 'string') continue
			rules[i][r] = (rules[i].cssRules || (rules[i].cssRules = {}))[++ ruleCount]  = rule
			rules[i].cssRules.length = ruleCount + 1
			rules[i].rules = rules[i].cssRules
		}
	}
	
	return rules
}

var x = combineRegExp

;(CSS.at = x(/\s*(@[-a-zA-Z0-9]+)\s+([^;{]*)/))
.names=[         'kind',              'name']

CSS.atRule = x([CSS.at, ';'])

;(CSS.keyValue_key = x(/([-a-zA-Z0-9]+)/))
.names=[                '_key']

;(CSS.keyValue_value = x(/(.*?)(?:;|(?=\})|$)/))
.names=[                  '_value']

;(CSS.keyValue = x([CSS.keyValue_key ,/\s*:\s*/, CSS.keyValue_value]))

;(CSS.comment = x(/\/\*\s*((?:[^*]|\*(?!\/))*)\s*\*\//))
.names=[                   'comment']

;(CSS.selector = x(/\s*((\d+%)|[^\{}]+?)\s*/))
.names=[               'selectorText','keyText']

;(CSS.block = x(/\{\s*((?:[^{}]|\{(?:[^{}]|\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\})*\})*)\s*\}/))
.names=[               'style_cssText']

CSS.selectorBlock = x([CSS.selector, CSS.block])

CSS.atBlock = x([CSS.at, CSS.block])

var OR = '|'

CSS.parser = x
(
	[	x(CSS.comment)
	,	OR
	,	x(CSS.atBlock)
	,	OR
	,	x(CSS.atRule)
	,	OR
	,	x(CSS.selectorBlock)
	,	OR
	,	x(CSS.keyValue)
	]
,	'cssText'
)


})(typeof exports != 'undefined' ? exports : this);

})();/*global SheetParser*/
;(function(context) {
    var updateCssPaths = function(cssText, callback) {
        return cssText.replace(/url\(\s*(["']?)(.+)\1\s*\)/g,
                function(match, quote, url, index, cssText) {
                    return ['url(', quote, callback(url), quote, ')'].join('');
                });
    };
    if (require && typeof define === 'function' && define.amd) {
        context.updateCssPaths = updateCssPaths;
    } else {
        exports.updateCssPaths = updateCssPaths;
    }
})(this);
/**
 * @license RequireCSS 0.3.1 Copyright (c) 2011, VIISON All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/VIISON/RequireCSS for details
 *
 * This version has been modified by StoredIQ to allow loading CSS as text in
 * <style> tags and avoid JS errors (see loadCssAsText() below).
 */

/*jslint forin: true */
/*global document: true, setTimeout: true, define: true */

(function () {
    "use strict";

    var doc = document,
		isObject = function(obj) { return obj === Object(obj); },
		basename = function(path) {
			var i = path.length-1;
			while (path[i--] !== '/');
			return path.slice(0, i+1);
		},
        head = doc.head || doc.getElementsByTagName('head')[0],
        // Eliminate browsers that admit to not support the link load event (e.g. Firefox < 9)
        nativeLoad = doc.createElement('link').onload === null ? undefined : false,
        a = doc.createElement('a'),
		loadAsStyleTags;

    function createLink(url) {
        var link = doc.createElement('link');

        link.rel = "stylesheet";
        link.type = "text/css";
        link.href = url;

        return link;
    }

    function styleSheetLoaded(url) {
        var i;

        // Get absolute url by assigning to a link and reading it back below
        a.href = url;

        for (i in doc.styleSheets) {
            if (doc.styleSheets[i].href === a.href) {
                return true;
            }
        }

        return false;
    }

    // we want to support adding an ordering parameter to the css, so that we
    // can enforce a global ordering like so:
    //
    //  'css!100:style1.css'
    //  'css!200:style2.css'
    //
    // in this case style1.css would always come before style2.css in the
    // <head> even if it was loaded second
    function appendToHead(el, order) {
        var i, child, len, children = head.childNodes, tag, curOrder, inserted;
        order = order || 0;
        el.setAttribute('data-order', order);
        for (i = 0, len = children.length; i < len; i++) {
            child = children[i];
            if (child.nodeType === 3) {
                continue; // skip text nodes
            }
            tag = child.tagName.toLowerCase();
            if (tag === 'style' || (tag === 'link' && /css/i.test(child.type))) {
                curOrder = +child.getAttribute('data-order');
                if (curOrder > order) {
                    inserted = head.insertBefore(el, child);
                }
            }
        }
        if (!inserted) {
            head.appendChild(el);
        }
    }

    // Load using the browsers built-in load event on link tags
    function loadLink(url, load, config, order) {
        var link = createLink(url);

        link.onload = function () {
            load();
        };

        // head.appendChild(link);
        appendToHead(link, order);
    }

    // Insert a script tag and use it's onload & onerror to know when the CSS
    // is loaded, this will unfortunately also fire on other errors (file not
    // found, network problems)
    function loadScript(url, load) {
        var link = createLink(url),
            script = doc.createElement('script');

        head.appendChild(link);

        script.onload = script.onerror = function () {
            head.removeChild(script);

            // In Safari the stylesheet might not yet be applied, when
            // the script is loaded so we poll document.styleSheets for it
            var checkLoaded = function () {
                if (styleSheetLoaded(url)) {
                    load();

                    return;
                }

                setTimeout(checkLoaded, 25);
            };
            checkLoaded();
        };
        script.src = url;

        head.appendChild(script);
    }

    // This was added for StoredIQ, since we can't have JS errors caused by
    // loading CSS as JS.
    function loadCssAsText(url, req, load, config, order) {
        req(['text!' + url], function(text) {
            if (text.replace(/^\s+|\s+$/g,"") === '') {
                load();
            }

            var css = document.createElement('style');
            css.setAttribute('type', 'text/css');
            css.setAttribute('data-sourceurl', url);

			if (typeof window.updateCssPaths !== 'undefined') {
				text = window.updateCssPaths(text, function(cssUrl) {
					return (/^https?:|^data:|^file:|^\//).test(cssUrl)?
						cssUrl : basename(url) + '/' + cssUrl;
				});
			}

			// i don't think this works like it does for JS eval()...
			text += '\n/*@ sourceURL='+url+' */\n';

            if (css.styleSheet) { // b/c of IE...
                css.styleSheet.cssText = text;
            } else {
                css.innerHTML = text;
            }

            appendToHead(css, order);

            setTimeout(load, 0);
        });
    }

    function loadSwitch(url, req, load, config, order) {
        if (!loadAsStyleTags && nativeLoad) {
            loadLink(url, load, config, order);
        } else {
            // loadScript(url, load);
            loadCssAsText(url, req, load, config, order);
        }
    }

    define(function () {
        var css;

        css = {
            version: '0.3.1',

            load: function (name, req, load, config) {
                var url, order, split = name.split(':');

				if (isObject(config.css)) {
					loadAsStyleTags = config.css.loadAsStyleTags;
				}

                // pull off the optional ordering from the name, something like
                // the '100' in 'css!100:style.css'
                if (name.indexOf(':') >= 0) {
                    name = split[1];
                    order = +split[0];
                } else {
                    name = split[0];
                }

                // convert name to actual url
                url = req.toUrl(/\.css$/.test(name) ? name : name + '.css');

                // Test if the browser supports the link load event,
                // in case we don't know yet (mostly WebKit)
                if (nativeLoad === undefined) {
                    // Create a link element with a data url,
                    // it would fire a load event immediately
                    var link = createLink('data:text/css,');

                    link.onload = function () {
                        // Native link load event works
                        nativeLoad = true;
                    };

                    head.appendChild(link);

                    // Schedule function in event loop, this will
                    // execute after a potential execution of the link onload
                    setTimeout(function () {
                        head.removeChild(link);

                        if (nativeLoad !== true) {
                            // Native link load event is broken
                            nativeLoad = false;
                        }

                        loadSwitch(url, req, load, config, order);
                    }, 0);
                } else {
                    loadSwitch(url, req, load, config, order);
                }
            }
        };

        return css;
    });
}());

