(function() {

    var parseSubPath = function(component, subPathWithPlugins) {
        var split,
            ret = {plugins: '', path: ''},
            separator = subPathWithPlugins.indexOf(':') >= 0? ':' : '!';
        if (subPathWithPlugins == null) {
            return ret;
        } else if (subPathWithPlugins === '') {
            ret.path = component;
            return ret;
        }
        split = subPathWithPlugins.split(separator);
        ret.plugins = split.slice(0, split.length-1).join(separator);
        if (ret.plugins) {
            ret.plugins += separator;
        }
        ret.path = split[split.length-1] || '';
        return ret;
    };

    var parsePath = function(name, config) {
        var split = name.split(':'),
            component = split[0],
            componentPath = config.paths[component],
            sub = parseSubPath(component, split.slice(1).join(':'));

        if (componentPath == null) {
            throw Error('requested module "' + split[1] +
                '" from unknown component "' + component + '"');
        }

        return {
            component: component,
            subPath: split[1],
            module: sub.plugins +
                (sub.path? componentPath + '/' + sub.path : componentPath)
        };
    };

    define(function() {
        return {
            version: '0.0.1',
            load: function(name, parentRequire, load, config) {
                var path = parsePath(name, config);
                parentRequire([path.module], function(module) {
                    load(module);
                });
            }
        };
    });

})();


