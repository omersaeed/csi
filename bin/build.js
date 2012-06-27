#!/usr/bin/env node

var log, copy, build, clean, main, submoduleInit,
    fs = require('fs'),
    read = function(filename) { return fs.readFileSync(filename, 'utf8'); },
    exec = require('child_process').exec,
    path = require('path'),
    join = path.join,
    resolve = path.resolve,
    basename = path.basename,
    dirname = path.dirname,
    exists = fs.existsSync || path.existsSync,
    moduleBase = resolve(join(__dirname, '..')),
    srcDir = join(moduleBase, 'src'),
    vendorDir = exists(join(moduleBase, 'vendor/requirejs'))? 'vendor' : 'vendor-cache',
    rjsDir = join(moduleBase, vendorDir, 'requirejs'),
    rjsTextDir = join(moduleBase, vendorDir, 'requirejs-text'),
    qunitDir = dirname(require.resolve('qunit')),
    sources = [
        join(rjsDir, 'require.js'),
        join(rjsTextDir, 'text.js'),
        join(qunitDir, 'qunit.js'),
        join(qunitDir, 'qunit.css')
    ];

log = function(msg) {
    console.log('[' + basename(resolve('.')) + '] ' + msg);
};


copy = function(fromPath, toPath) {
    fs.writeFileSync(toPath, fs.readFileSync(fromPath, 'utf8'));
};

submoduleInit = function(callback) {
    var origDir = process.cwd();
    if (!exists(sources[0])) {
        process.chdir(join(__dirname, '..'));
        exec('git submodule init', function(error, stdout, stderr) {
            process.stdout.write(stdout);
            process.stderr.write(stderr);
            exec('git submodule update', function(error, stdout, stderr) {
                process.chdir(origDir);
                process.stdout.write(stdout);
                process.stderr.write(stderr);
                callback();
            });
        });
    } else {
        callback();
    }
};

build = function(callback) {
    sources.forEach(function(src) {
        log('copying "' + basename(src) + '"');
        copy(src, join(srcDir, basename(src)));
    });

    log('writing "css.js" require.js plugin');
    fs.writeFileSync(
            'src/css.js',
            [
                read('lib/css_rewrite.js'),
                read('lib/css_requirejs_plugin.js')
            ].join(''));
};

clean = function(callback) {
    sources.forEach(function(src) {
		src = join(srcDir, basename(src));
		if (exists(src)) {
			fs.unlinkSync(src);
		}
    });

    callback(0);
};

main = function() {
    var argv = require('optimist')
        .usage('USAGE: $0 [-c|--clean]')
        .boolean('c')
            .alias('c', 'clean')
            .describe('c', 'remove installed files')
        .argv;


    (argv.clean? clean : build)(process.exit);
};

if (require.main === module) {
    main();
}

