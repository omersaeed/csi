#!/usr/bin/env node

var path = require('path'),
    coffeescript = require('coffee-script'),
    srcPath = path.join(__dirname, '../component'),
    component = require(srcPath);

component.run();
