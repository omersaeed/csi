#!/usr/bin/env node

var copy, main, build, clean,
    fs = require('fs'),
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

build = function() {
    sources.forEach(function(src) {
        copy(src, join(srcDir, basename(src)));
    });
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

