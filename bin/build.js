#!/usr/bin/env node

var copy, sheetParserWrapper, build, clean, main,
    fs = require('fs'),
    read = function(filename) { return fs.readFileSync(filename, 'utf8'); },
    path = require('path'),
    join = path.join,
    resolve = path.resolve,
    basename = path.basename,
    dirname = path.dirname,
    exists = path.existsSync,
    moduleBase = resolve(join(__dirname, '..')),
    srcDir = join(moduleBase, 'src'),
    rjsDir = join(moduleBase, 'vendor/requirejs'),
    qunitDir = join(dirname(require.resolve('qunit')), 'deps/qunit/qunit'),
    sources = [
        join(rjsDir, 'require.js'),
        join(rjsDir, 'text.js'),
        join(rjsDir, 'order.js'),
        join(qunitDir, 'qunit.js'),
        join(qunitDir, 'qunit.css')
    ];


copy = function(fromPath, toPath) {
    fs.writeFileSync(toPath, fs.readFileSync(fromPath, 'utf8'));
};

sheetParserWrapper = function(js) {
    return ';(function() {\nvar require;\n' + js + '\n})();';
};

build = function() {
    var sheetPath = dirname(require.resolve('Sheet')),
        sheetRegExPath = join(sheetPath, 'sg-regex-tools.js'),
        sheetParserPath = join(sheetPath, 'SheetParser.CSS.js');
    sources.forEach(function(src) {
        copy(src, join(srcDir, basename(src)));
    });

    fs.writeFileSync(
            'src/css.js',
            [
                read(sheetRegExPath),
                sheetParserWrapper(read(sheetParserPath)),
                read('lib/css_rewrite.js'),
                read('lib/css_requirejs_plugin.js')
            ].join(''));
};

clean = function() {
    sources.forEach(function(src) {
		src = join(srcDir, basename(src));
		if (exists(src)) {
			fs.unlinkSync(src);
		}
    });
};

main = function() {
    var argv = require('optimist')
        .usage('USAGE: $0 [-c|--clean]')
        .boolean('c').alias('c', 'clean').describe('c', 'remove installed files')
        .argv;

    process.exit(argv.clean? clean() : build());
};

if (require.main === module) {
    main();
}

