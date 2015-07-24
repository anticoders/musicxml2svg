
Package.describe({
  summary: "A MusicXML to SVG renderer",
  version: "0.0.0",
  name: "music:xml",
});

Package.onUse(function (api) {

  api.versionsFrom("METEOR@1.0");

  api.use([ 'underscore' ]);

  api.addFiles([

    'lib/musicxml.js',
    'lib/utils.js',
    'lib/buildTree.js',
    'lib/parser.js',
    'lib/render.js',

  ], ['client', 'server']);

  api.export('MusicXML', ['client', 'server']);
});
