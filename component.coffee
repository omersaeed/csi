fs = require "fs"
path = require "path"
extend = require "node.extend"
_ = require "underscore"
t = require "t"
wrench = require "wrench"
yaml = require "js-yaml"
testServer = require "./server"

read = (fname, encoding="utf8") -> fs.readFileSync(fname, encoding)
write = (fname, content, encoding="utf8") -> fs.writeFileSync(fname, content, encoding)
exists = path.existsSync
join = path.join
pathSep = path.normalize("/")
argv = null

usage = """node $0 [-l] install
node $0 [-l] [--list] test

`component` is a utility that's used for installing javascript components and
their dependencies -- imagine that!
"""

pkgJson = (dir = ".") ->
  JSON.parse read(join(dir, "package.json"))

componentName = (dir = ".", json = null) ->
  (json or pkgJson(dir)).component?.name

sourceDirectory = (dir = ".") ->
  pkgJson(dir).component?.sourceDirectory || "src"

testDirectory = exports.testDirectory = (dir = ".") ->
  pkgJson(dir).component?.testDirectory or (exists("static") and ".") or ".test"

testTemplate = (dir = ".") ->
  tt = pkgJson(dir).component?.testTemplate
  if tt then read join(dir,tt) else ""

isComponent = (dir = ".", json = null) ->
  if json
    return not not componentName(dir, json)
  exists(join dir, "package.json") and (not not componentName(dir))

requirejsConfig = (filename, dir = ".") ->
  filename ||= join(dir, "requirejs-config.json")
  if exists filename then JSON.parse read(filename) else {}

makePathsAbsolute = (rjsConfigObj = {}, root = "components") ->
  extend true, rjsConfigObj,
    paths: _.reduce(rjsConfigObj.paths, ((memo, v, k) ->
      memo[k] = v.replace(/^.\//, root.replace(/\/$/, "") + "/")
      memo
    ), {})

addComponentToConfig = (rjsConfigObj = {}, dir = ".", root = "components") ->
  paths = {}
  paths[componentName()] = join root, componentName()
  extend true, {paths: paths}, rjsConfigObj

installTo = (tgtDir, link = false, src, name = null) ->
  src ||= sourceDirectory()
  name ||= componentName()
  if not exists join(tgtDir, name)
    if link
      orig = path.resolve process.cwd()
      process.chdir tgtDir
      fs.symlinkSync join(orig, src), name, "dir"
      process.chdir orig
    else
      wrench.copyDirSyncRecursive src, join(tgtDir, name)

allNodeModules = () ->
  modules = {}
  t.dfs directories = {path: "."}, (n) ->
    if exists join(n.path, "package.json")
      n.json = pkgJson n.path
    if exists join(n.path, "requirejs-config.json")
      n.config = requirejsConfig(null, n.path)
    modulesDir = join n.path, "node_modules"
    if exists modulesDir
      n.children = _(fs.readdirSync(modulesDir)).map((d) ->
        full = join modulesDir, d
        fs.statSync(full).isDirectory() and d isnt ".bin" and full
      ).filter(_.identity).map (d) -> {path: d}
  directories

allComponents = () ->
  results = []
  names = () -> component.json.name for component in results
  t.dfs allNodeModules(), (m) ->
    if m.json and isComponent(null, m.json) and m.json.name not in names()
      results.push(m)
  _.filter results, (m) -> m.path isnt "."

provide = (pth) ->
  if not exists pth
    _.reduce [""].concat(pth.split(pathSep)), (soFar, dir) ->
      fs.mkdirSync join(soFar, dir) if not exists(join(soFar, dir))
      soFar += (if soFar then pathSep else "") + dir

discoverTests = (dir) ->
  dir ||= join testDirectory(), "static"
  return [] if not exists dir
  results = []
  t.dfs dirTree = {path: "."}, (n) ->
    if /test[^\/]*\.js$/.test(n.path) and path.basename(n.path)[0] isnt "."
      results.push(n.path)
    if fs.statSync(join(dir, n.path)).isDirectory()
      n.children = fs.readdirSync(join(dir, n.path)).map (d) ->
        path: join n.path, d
  results

getConfig = (root = "components") ->
  components = allComponents()
  componentPath = (c) ->
    ret = {paths: {}}
    ret.paths[c.json.component.name] = join root, c.json.component.name
    ret
  componentConfig = (c) ->
    makePathsAbsolute(c.config, join(root, componentName(c.path)))
  thisComponentConfig = () ->
    if not isComponent() then return {}
    destPath = join(root, componentName())
    addComponentToConfig(makePathsAbsolute(requirejsConfig(), destPath))
  extend.apply this, [true]
    .concat(componentConfig(c) for c in components)
    .concat(componentPath(c) for c in components)
    .concat([thisComponentConfig()])

getTestTemplate = () ->
  components = allComponents().concat([{path: "."}])
  (testTemplate(component.path) for component in components).join("\n")

getTestMiddleware = () ->
  components = allComponents()
  components.push({path: ".", json: pkgJson()}) if isComponent()
  require(join(component.path, component.json.component.testMiddleware)) \
    for component in components when component.json.component.testMiddleware


stringBundles = (dir = ".") ->
  stringsYml = join(dir, "strings.yml")
  stringsYaml = join(dir, "strings.yaml")
  if exists stringsYml
    yaml.load read(stringsYml)
  else if exists stringsYaml
    yaml.load read(stringsYaml)
  else
    {}

allStringBundles = () ->
  _.reduce(allComponents().concat([stringBundles()]), ((strings, component) ->
    extend true, strings, stringBundles(component.path)
  ), {})

stringBundlesAsRequirejsModule = () ->
  bundles = JSON.stringify(allStringBundles(), null, "    ")
    .replace(/\n/g, "\n      ")
  """
  <script>
    define('strings', [], function() {
        return #{bundles};
    });
  </script>
  """

listTests = (tests, host, port) ->
  for test in tests
    console.log("http://#{host}:#{port}/#{test.replace(/\.js$/, "")}")

templateCommands =
  requirejs: (config) ->
    join config.baseUrl || '', config.paths.csi, "require.js"
  extra: () ->
    stringBundlesAsRequirejsModule()
  config: (config) ->
    JSON.stringify config, null, "    "

commands =

  install: () ->
    components = allComponents()
    componentsDirName = join testDirectory(), "static/components"
    provide componentsDirName
    for component in components
      src = join(component.path, sourceDirectory(component.path))
      name = componentName(null, component.json)
      installTo componentsDirName, argv.link, src, name
    if isComponent()
      installTo componentsDirName, argv.link, 'src', componentName()

  test: () ->
    port = process.env.PORT || 1335
    host = process.env.HOST || "localhost"
    components = allComponents()
    staticDirName = join testDirectory(), "static"
    return listTests(discoverTests(staticDirName), host, port) if argv.listtests
    commands.install()
    tests = discoverTests staticDirName
    extraHtml = getTestTemplate() + "\n" + stringBundlesAsRequirejsModule()
    testServer
      .createServer(staticDirName, getConfig(), extraHtml, getTestMiddleware())
      .listen(port, host)
    console.log "serving at http://#{host}:#{port}"
    console.log "available tests:"
    listTests tests, host, port

  template: (cmd, args...) ->
    templateCommands[cmd] getConfig()

  build: () ->
    commands.install()

    staticDirName = join testDirectory(), "static"
    provide argv.staticpath
    wrench.copyDirSyncRecursive staticDirName, argv.staticpath

    config = getConfig()
    templateObj = _.reduce(templateCommands, ((templateObj, cmd, name) ->
      templateObj[name] = templateCommands[name](config)
      return templateObj
    ), {})
    provide argv.templatepath
    contextjsonname = join(argv.templatepath, argv.contextjsonname)
    write contextjsonname, JSON.stringify(templateObj)


commandNames = _.reduce(commands, ((memo, v, k) ->
  memo[k] = true
  (memo[alias] = true) for alias in (v.aliases || [])
  memo
), {})

exports.run = () ->
  argv = require("optimist")
    .usage(usage)

    .boolean(["l", "link"]).alias("l", "link")
    .describe("l", "install components as symlinks (useful for development)")

    .boolean("listtests")
    .describe("listtests", "when running the 'test' command, just list tests")

    .string(["t", "templatepath"]).alias("t", "templatepath")
    .describe("t", "when running 'build', command, specify the templatepath")

    .string(["j", "contextjsonname"]).alias("j", "contextjsonname")
    .default("contextjsonname", "csi-context.json")
    .describe("j", "when running 'build', command, specify the name of the context json")

    .string(["s", "staticpath"]).alias("s", "staticpath")
    .describe("s", "when running 'build', command, specify the staticpath")

    .string(["b", "baseurl"]).alias("b", "baseurl")
    .default("baseurl", "/static")
    .describe("b", "when running 'build', command, specify the baseurl")

    .check((argv) ->
      if argv._[0] is 'build'
        for arg in ['templatepath', 'staticpath']
          if not argv[arg]
            throw Error "'#{arg}' option must be defined for 'build' command"
    )

    .alias("h", "help")

    .argv

  command = argv._[0]

  if argv.help
    console.log require("optimist").help()
    process.exit 0
  if not command or not commandNames[command]
    console.error "ERROR: command must be one of: #{k for k,v of commands}\n"
    require("optimist").showHelp()
    process.exit 1

  commands[command](argv._[1..]...)

