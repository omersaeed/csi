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

            setTimeout(function() {
				var dummyStyle = document.createElement('style');
				appendToHead(dummyStyle, order);
				setTimeout(function() {
					head.removeChild(dummyStyle);
					setTimeout(load, 0);
				}, 0);
			}, 0);
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

