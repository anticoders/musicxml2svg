
Parser = {
    parsers: {},
    builder: {},
    generic: {},
};

/**
 * Translate "raw" xml data (returned by xmldoc) to a more
 * useful data format, compatible with VexFlow rendering logic.
 *
 * @param {object} data
 */
Parser.parse = function parse (docTree) {
    "use strict";

    return (function next(node, parentContext) {

        var context = {
            __type__: Utils.toCamelCase(node.name)
        };

        // I am not sure if we will ever need this ...
        var build = Parser.builder[context.__type__];

        if (build) {
            build.call(context, node, parentContext);
        }

        _.each(node.children, function (child) {
            return next(child, context);
        });

        var parser = Parser.parsers[context.__type__];
        if (!parser) {
            // looks like we don't know how to parse element of this type
            return;
        }

        if (!_.isArray(parser)) {
            parser = [ parser ];
        }

        _.each(parser, function (p) {
            p.call(context, node, parentContext, context);
        });

        // console.log('parsing', node.name, JSON.stringify(value, null, 2));

        return context;

    })(docTree, {});
}


// ------------------------
// --- common behaviors ---
// ------------------------

Parser.generic.copyValueToParent = function copyValueToParent (parser, name) {
    "use strict";
    if (!parser) {
        parser = function (x) { return x }; // identity
    }
    return function parseValue (node, parentContext) {
        if (!name) {
            name = this.__type__;
        }
        parentContext[name] = parser(node.val);
    };
}

Parser.generic.copyProps = function copyProps () {
    "use strict";
    var props = _.toArray(arguments);
    return function copyProps (node, parentContext) {
        var that = this;
        if (props.length === 0) {
            _.each(that, function (value, name) {
                if (name !== '__type__') {
                    parentContext[name] = value;
                }
            });
        } else {
            _.each(props, function (name) {
                parentContext[name] = that[name];
            });
        }
    };
}

Parser.generic.setParentProp = function setParentProp (name) {
    "use strict";
    return function setParentProp (node, parentContext) {
        if (!name) {
            name = this.__type__;
        }
        parentContext[name] = this;
    };
}


Parser.builder.scorePartwise = function (node, parentContext) {
    "use strict";
}

Parser.parsers.scorePartwise = function (node, parentContext) {
    "use strict";

    var that = this;
    var twSystems = [];

    // rearrange to timewise structure ...

    function getSystem (i) {
        if (!twSystems[i]) {
            twSystems[i] = {
                __type__: 'system',
                index    : i,
                posX     : 0,
                posY     : 0,
                width    : 0,
                height   : 0,
                measures : [],
                staffs   : [],
            }
        }
        return twSystems[i];
    }

    function getMeasure (i, j) {
        var system = getSystem(i);
        if (!system.measures[j]) {
            system.measures[j] = {
                __type__ : 'measure',
                index    : j,
                groups   : [],
                staves   : [],
            };
        }
        return system.measures[j];
    }

    function getGroup (i, j, k) {
        var measure = getMeasure(i, j);
        if (!measure.groups[k]) {
            measure.groups[k] = {
                __type__     : 'group',
                index        : k,
                groupSymbol  : that.groups[k].groupSymbol,
                groupBarline : that.groups[k].groupBarline,
                staves       : [],
            }
        }
        return measure.groups[k];
    }

    function addStaffToSystem (staff, system) {
        if (!staff.isEmpty) {
            staff.posY = 0;
            // this one has quadratic complexity but who cares :)
            _.each(system.staffs, function (anotherStaff, index) {
                if (!anotherStaff.isEmpty) {
                    staff.posY += anotherStaff.staffSize + anotherStaff.staffDistance;
                }
            });
            staff.posY += staff.staffDistance;
        }
        system.staffs.push(staff);
        return staff;
    }

    _.each(this.groups, function (pwGroup, groupIndex) {

        _.each(pwGroup.parts, function (partId, partIndexWithinGroup) {
            var part = that.parts[partId];

            _.each(part.systems, function (pwSystem, systemIndex) {

                var twSystem = getSystem(systemIndex);

                pwSystem.isEmpty = _.all(pwSystem.measures, Utils.propIsTruthy('empty'));
                pwSystem.staffDistance = Utils.findMaxPropValue('staffDistance',
                    pwSystem.measures, that.staffDistance);

                var twStaff = addStaffToSystem({

                    isEmpty       : pwSystem.isEmpty,
                    staffSize     : that.scalingTenths, // usually this is 40
                    staffDistance : pwSystem.staffDistance,

                }, twSystem);

                twSystem.systemDistance = that.systemDistance;

                _.each(pwSystem.measures, function (pwMeasure, measureIndex) {

                    var twGroup = getGroup(systemIndex, measureIndex, groupIndex);
                    var twMeausre = getMeasure(systemIndex, measureIndex);
                    var twStaveIndex = twMeausre.staves.length;

                    if (pwSystem.isEmpty) {

                        pwMeasure.isHidden = true;

                        delete pwMeasure.notes;
                        delete pwMeasure.divisions;
                        delete pwMeasure.timeSignature;
                        delete pwMeasure.clef;
                        delete pwMeasure.key;

                        return;
                    }

                    pwMeasure.staveIndex = twStaveIndex;

                    twGroup.staves.push(twStaveIndex);

                    twMeausre.staves.push({

                        __type__      : 'stave',

                        //key           : pwMeasure.key,
                        clef          : pwMeasure.clef,
                        //divisions     : pwMeasure.divisions,
                        timeSignature : pwMeasure.timeSignature,

                        posY          : twStaff.posY,
                        width         : pwMeasure.width,
                        isEmpty       : pwMeasure.empty,
                        isHidden      : pwMeasure.isHidden,
                        numbering     : pwMeasure.numbering,
                        staffSize     : pwMeasure.staffSize,
                        staffDistance : pwSystem.staffDistance,
                    });

                });
            });
        });
    });

    _.each(twSystems, function (twSystem, i) {

        var distance = null;

        twSystem.posY = (i === 0) ? 0 : twSystems[i-1].posY + twSystems[i-1].height + that.systemDistance;
        twSystem.height = 0;
        twSystem.width = 0;

        _.each(twSystem.staffs, function (staff, i) {
            if (staff.isEmpty) {
                return;
            }
            if (distance !== null) {
                twSystem.height += distance;
            }
            twSystem.height += staff.staffSize;
            distance = staff.staffDistance;
        });

        _.each(twSystem.measures, function (twMeasure, i) {

            //TODO: is it possilbe that all staves in a measure have undefined width?

            twMeasure.posX = i === 0 ? 0 : twSystem.measures[i-1].posX + twSystem.measures[i-1].width;
            twMeasure.width = Utils.findMaxPropValue('width', twMeasure.staves);

            twSystem.width += twMeasure.width;
        });

    });

    this.systems = twSystems;
}

//------------------------------------------------------------------------------
Parser.parsers.defaults = Parser.generic.copyProps();

//------------------------------------------------------------------------------
Parser.parsers.pageLayout   = Parser.generic.copyProps('pageHeight', 'pageWidth', 'pageMargins');
Parser.parsers.pageWidth    = Parser.generic.copyValueToParent(Utils.parseInt10);
Parser.parsers.pageHeight   = Parser.generic.copyValueToParent(Utils.parseInt10);
Parser.parsers.pageMargins  = Parser.generic.setParentProp();
Parser.parsers.leftMargin   = Parser.generic.copyValueToParent(Utils.parseInt10, 'left');
Parser.parsers.rightMargin  = Parser.generic.copyValueToParent(Utils.parseInt10, 'right');
Parser.parsers.topMargin    = Parser.generic.copyValueToParent(Utils.parseInt10, 'top');
Parser.parsers.bottomMargin = Parser.generic.copyValueToParent(Utils.parseInt10, 'bottom');

//------------------------------------------------------------------------------
Parser.parsers.systemLayout   = Parser.generic.copyProps('systemMargins', 'systemDistance', 'topSystemDistance');
Parser.parsers.systemMargins  = Parser.generic.setParentProp();
Parser.parsers.systemDistance = Parser.generic.copyValueToParent(Utils.parseInt10);

Parser.parsers.staffLayout   = Parser.generic.copyProps('staffDistance');
Parser.parsers.staffDistance = Parser.generic.copyValueToParent(Utils.parseInt10);

//------------------------------------------------------------------------------
Parser.parsers.scaling     = Parser.generic.copyProps();
Parser.parsers.tenths      = Parser.generic.copyValueToParent(Utils.parseInt10, 'scalingTenths');
Parser.parsers.millimeters = Parser.generic.copyValueToParent(Utils.parseInt10, 'scalingMillimeters');

// ---------------------
// --- part grouping ---
// ---------------------

Parser.builder.partList = function (node) {
    var that = this;
    this.groups = [];
    this.addPart = function (partId) {
        if (that.group) {
            that.group.parts.push(partId);
        } else {
            that.groups.push({ parts: [ partId ] });
        }
    }
    this.beginGroup = function (props) {
        that.group = props || {};
        that.group.parts = [];
    }
    this.endGroup = function () {
        if (!that.group) {
            return;
        }
        that.groups.push(that.group);
        delete that.group;
    }
}

Parser.parsers.partList = function (node, parentContext) {
    "use strict";
    parentContext.groups = this.groups;
}

Parser.parsers.partGroup = function (node, partList) {
    "use strict";
    if (!partList.beginGroup || !partList.endGroup) {
        // parse error?
        return;
    }
    if (node.attr.type === 'start') {
        partList.beginGroup(this);
    } else if (node.attr.type === 'stop') {
        partList.endGroup();
    }
}

Parser.parsers.groupSymbol  = Parser.generic.copyValueToParent();
Parser.parsers.groupBarline = Parser.generic.copyValueToParent(Utils.yesOrNo);

Parser.parsers.scorePart = function (node, partList) {
    "use strict";
    if (!partList.addPart) {
        // parse error ... ?
        return;
    }
    partList.addPart(node.attr.id);
}

// ------------------------------
// --- actual part definition ---
// ------------------------------

Parser.builder.part = function (node, parentContext) {
    "use strict";

    var systems = [];
    var clef = null;
    var time = null;
    var divisions = null;

    this.systems = systems;

    function addSystem() {
        systems.push({
            __type__ : 'system',
            measures : [],
            width    : 0,
        });
    }

    // we need at least one ...
    addSystem();

    this.addMeasure = function addMeasure (measure, newSystem) {
        if (measure.clef) {
            clef = measure.clef;
        }
        if (measure.time) {
            time = measure.time;
        }
        if (measure.divisions) {
            divisions = measure.divisions;
        }
        if (newSystem) {
            if (!measure.clef && clef) {
                measure.clef = clef;
            }
            addSystem();
        }
        if (!measure.time && time) {
            measure.time = time;
        }
        if (!measure.divisions && divisions) {
            measure.divisions = divisions;
        }
        var system = systems[systems.length - 1];
        system.measures.push(measure);
        if (measure.width) {
            system.width += measure.width;
        }
    }
}

Parser.parsers.part = function (node, parentContext) {
    "use strict";
    var partId = node.attr.id;
    if (!parentContext.parts) {
        parentContext.parts = {};
    }
    parentContext.parts[partId] = this;
    // we are only interested in pure data ...
    delete this.addMeasure;
}

// ------------------------------------
// --- measure and measure elements ---
// ------------------------------------
Parser.builder.measure = function (node, parentContext) {
    "use strict";
    var that = this;

    this.empty  = true;
    this.notes  = [];
    this.voices = {};

    this.addNote = function (note) {
        if (!note.isMeasureRest) {
            that.empty = false;
        }
        if (note.voice === undefined) {
            note.voice = 0;
        }
        if (that.voices[note.voice] === undefined) {
            that.voices[note.voice] = { notes: [] };
        }
        that.voices[note.voice].notes.push(note);
        //---------------------------------------
        delete note.voice;
    }
}

/**
 * Return a traditional name corresponding to the given
 * line / sign configuration. Note that for some combinations
 * there's no valid name, so the clef will be undefined.
 *
 * @param {string} sign
 * @param {number} line
 */
function getClefName (sign, line) {
    // TODO: add support for "percusion" clef

    var mappings = {

        "1": { "G": "french", "C": "soprano" },
        "2": { "G": "treble", "C": "mezzo-soprano" },
        "3": { "C": "alto", "F": "baritone-f" },
        "4": { "C": "tenor", "F": "bass" },
        "5": { "C": "baritone-c", "F": "subbass" },
    };

    return mappings[line][sign];
}

Parser.getClefName = getClefName;

function getOctaveShift (clefOctaveChange) {
    if (clefOctaveChange === 1) {
        return '8va';
    } else if (clefOctaveChange === -1) {
        return '8vb';
    }
}

Parser.getOctaveShift = getOctaveShift;

Parser.parsers.measure = function (node, parentContext) {
    "use strict";
    this.number = parseInt(node.attr.number, 10);
    if (node.attr.width) {
        this.width = parseInt(node.attr.width, 10);
    }
    if (!parentContext.addMeasure) {
        // mark error ...
        return;
    }

    if (this.clef) {
        this.clefName = getClefName(this.clef.sign, this.clef.line);
    }

    parentContext.addMeasure(this, this.newSystem);
    delete this.newSystem; // no longer necessary
}

//---------------------------
// --- measure attributes ---
//---------------------------

Parser.parsers.attributes   = Parser.generic.copyProps();
Parser.parsers.divisions    = Parser.generic.copyValueToParent(Utils.parseInt10);
Parser.parsers.staffDetails = Parser.generic.copyProps('staffSize');
Parser.parsers.staffSize    = Parser.generic.copyValueToParent(Utils.parseInt10);

// key
Parser.parsers.key          = Parser.generic.setParentProp();
Parser.parsers.fifths       = Parser.generic.copyValueToParent(Utils.parseInt10);
Parser.parsers.mode         = Parser.generic.copyValueToParent();

// clef
Parser.parsers.clef         = Parser.generic.setParentProp();
Parser.parsers.line         = Parser.generic.copyValueToParent(Utils.parseInt10);
Parser.parsers.sign         = Parser.generic.copyValueToParent();

Parser.parsers.clefOctaveChange = Parser.generic.copyValueToParent(Utils.parseInt10);

// time
Parser.parsers.time = [

    function (node, parentContext) {
        parentContext.timeSignature = this.beats + '/' + this.beatType;
    },

    Parser.generic.setParentProp(),
];

Parser.parsers.beats        = Parser.generic.copyValueToParent(Utils.parseInt10);
Parser.parsers.beatType     = Parser.generic.copyValueToParent(Utils.parseInt10);

// -------------
// --- print ---
// -------------

Parser.parsers.print = [
    function (node, parentContext) {
        "use strict";
        if (node.attr['new-system'] === 'yes' || node.attr['new-page'] === 'yes') {
            parentContext.newSystem = true;
        }
    },

    Parser.generic.copyProps('numbering', 'staffDistance', 'systemDistance', 'topSystemDistance'),
];

// ---------------
// --- barline ---
// ---------------

Parser.parsers.barline = function (node, parentContext) {
    "use strict";
    if (node.attr.location) {
        this.location = node.attr.location;
    }
    parentContext[this.__type__] = this;
}

Parser.parsers.barStyle = Parser.generic.copyValueToParent();

// ------------
// --- note ---
// ------------

var noteTypeMapper = {
    '256th'   : '256',
    '128th'   : '128',
    '64th'    : '64',
    '32nd'    : '32',
    '16th'    : '16',
    'eighth'  : '8',
    'quarter' : '4',
    'half'    : '2',
    'whole'   : '1',
    'breve'   : '1/2',
    // 'long'    : null, // not supported by VexFlow
};

Parser.parsers.note = function (node, parentContext) {
    "use strict";
    if (!parentContext.addNote) {
        // parse error
        return;
    }
    var noteType = this.type;
    if (noteType) {
        this.noteType = noteTypeMapper[noteType];
    }
    parentContext.addNote(this);
    //--------------------------
}

// -----------------------
// --- note attributes ---
// -----------------------

// beam
Parser.parsers.beam = function (node, parentContext) {
    if (node.attr.number === '1') {
        // we only care about first level beams
        parentContext.beam = node.val;
    } else {
        // TODO: think how we could support secondary breaks
    }
}

// stem
Parser.parsers.stem = function (node, parentContext) {
    if (node.val === 'up') {
        parentContext.stemDirection = 1;
    } if (node.val === 'down') {
        parentContext.stemDirection = -1;
    }
}

Parser.parsers.duration = [
    Parser.generic.copyValueToParent(Utils.parseInt10),
];

Parser.parsers.pitch = [

    function (node, parentContext) {
        if (this.step && this.octave) {
            parentContext.noteKey = this.step.toLowerCase() + '/' + this.octave;
        }
    },

    Parser.generic.setParentProp(),
];

Parser.parsers.step     = Parser.generic.copyValueToParent();
Parser.parsers.alter    = Parser.generic.copyValueToParent(Utils.parseInt10);
Parser.parsers.octave   = Parser.generic.copyValueToParent(Utils.parseInt10);
Parser.parsers.type     = Parser.generic.copyValueToParent();

// dot
Parser.parsers.dot = function (node, parentContext) {
    "use strict";
    parentContext.dot = true;
}

// rest
Parser.parsers.rest = function (node, parentContext) {
    "use strict";
    if (node.attr.measure === 'yes') {
        parentContext.isMeasureRest = true;
    } else {
        parentContext.isRest = true;
    }
}

// voice
Parser.parsers.voice = function (node, parentContext) {
    "use strict";
    parentContext.voice = parseInt(node.val, 10) - 1;
    return parentContext.voice;
}

MusicXML.parse = Parser.parse;
