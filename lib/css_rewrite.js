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
