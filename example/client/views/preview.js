
(function () {
    "use strict";

    var current = new ReactiveVar();
    var currentMode = new ReactiveVar('notes');

    Template.preview.helpers({
        files: function() {
            return Files.find();
        },
        maybeActive: function () {
            return current.get() === this._id ? 'active' : '';
        }
    });

    Template.preview.onRendered(function () {
        var that = this;

        var renderer = new Vex.Flow.Renderer(
            this.find('.notes'), Vex.Flow.Renderer.Backends.SVG);

        this.ctx = renderer.getContext();

        this.autorun(function () {

            var mode = currentMode.get();
            var file = Files.findOne({ _id: current.get() });
            if (!file) {
                return;
            }

            var parser = new window.DOMParser();
            var xmldoc = parser.parseFromString(file.content, "text/xml");
            var docTree = MusicXML.buildTree(xmldoc.documentElement, {});
            var notes = MusicXML.parse(docTree);

            if (mode === 'json') {
                that.find('.notes').innerHTML = '<pre>' + JSON.stringify(notes, null, 2) + '</pre>';
            } else {
                console.log(notes);
                that.ctx.resize(notes.pageWidth, notes.pageHeight);
                that.ctx.clear();
                MusicXML.renderNotesIntoContext(that.ctx, notes);
            }
        });

    });

    Template.preview.events({

        'drop .dropzone': function(e, t) {
            "use strict";

            e.preventDefault(); // prevent all default actions

            var listOfFiles = getListOfFiles(e.originalEvent);

            _.each(listOfFiles, function(file) {
                var reader = new FileReader();

                reader.onload = function (e) {
                    Files.insert({
                        createdAt: new Date(),
                        title: file.name,
                        size: file.size,
                        content: e.target.result,
                    }, function(err, id) {
                        if (err) {
                            console.error(err);
                            return;
                        }
                        current.set(id);
                    });
                };
                reader.readAsText(file);
            });
        },

        'click [data-action=render]': function (e, t) {
            if (current.get() === this._id) {
                toggleMode();
            } else {
                current.set(this._id);
            }
        }

    });

    function toggleMode () {
        var mode = currentMode.get();
        if (mode === 'notes') {
            currentMode.set('json');
        } else {
            currentMode.set('notes');
        }
    }

    /**
     * Safely extract the list of files from the given drop event.
     */
    function getListOfFiles(event) {
        "use strict";

        var dt = event && event.dataTransfer;
        if (!dt || !dt.files) {
            return [];
        }
        return dt.files;
    }

}());
