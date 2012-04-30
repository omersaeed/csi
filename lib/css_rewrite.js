/*global SheetParser*/
;(function(context) {
    var parse, updateCssPaths, url, newUrl,
        urlRE = /url\((["']?)([^)]+)\1\)/i;
    updateCssPaths = function(cssText, callback) {
        var i, j, len, rule, propLen, prop, style,
            parsed = parse.call(SheetParser.CSS, cssText),
            output = [];

        for (i = 0, len = parsed.length; i < len; i++) {
            rule = parsed[i];
            style = rule.style;
            output.push('\n'+rule.selectorText+' {\n');
            for (j = 0, propLen = style.length; j < propLen; j++) {
                prop = style[j];
                url = style[prop].match(urlRE);
                url = url && url[2].slice(0, 5) !== 'data:'? url[2] : null;
                style[prop] = callback(rule.selectorText, prop, style[prop], url);
                style[SheetParser.CSS.camelCase(prop)] = style[prop];
                output.push('  '+prop+': '+style[prop]+';\n');
            }
            output.push('}\n');
        }
        return output.join('');
    };
    if (require) {
        if (typeof define === 'function' && define.amd) {
            parse = SheetParser.CSS.parse;
            context.updateCssPaths = updateCssPaths;
        } else {
            parse = function(cssText) {
                return new require('Sheet').Sheet(cssText);
            };
            exports.updateCssPaths = updateCssPaths;
        }
    }
})(this);
