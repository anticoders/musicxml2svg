/**
 * Return notes into Vex.Flow.Context
 *
 * @param {obejct} ctx
 * @param {object} notes
 */

MusicXML.renderNotesIntoContext = function renderNotesIntoContext (ctx, notes) {

    // NOTE: we assume VexFlow is already available here

    // var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    //
    // svg.setAttribute('width'   , notes.pageWidth);
    // svg.setAttribute('height'  , notes.pageHeight);
    // svg.setAttribute('viewBox' , '0 0 ' + notes.pageWidth + ' ' + notes.pageHeight);

    _.each(notes.systems, function (system, systemIndex) {

        var systemStaves = [];

        // first draw system layout

        _.each(system.measures, function (measure, measureIndex) {

            var measureStaves = [];

            systemStaves.push(measureStaves);

            _.each(measure.staves, function (twStave) {

                var stave = new Vex.Flow.Stave(
                    notes.pageMargins.left + measure.posX,
                    system.posY + twStave.posY,
                    measure.width
                );

                stave.setBegBarType(Vex.Flow.Barline.type.NONE);
                stave.setEndBarType(Vex.Flow.Barline.type.NONE);

                if (twStave.clef) {
                    stave.addClef(
                        Parser.getClefName(twStave.clef.sign, twStave.clef.line),
                        'default',
                        Parser.getOctaveShift(twStave.clef.clefOctaveChange)
                    );
                }

                if (twStave.timeSignature) {
                    stave.addTimeSignature(twStave.timeSignature);
                }

                stave.setContext(ctx).draw();

                measureStaves.push(stave);
            });

            _.each(measure.groups, function (twGroup) {

                if (twGroup.staves.length === 0) {
                    return;
                }

                var first = twGroup.staves[0];
                var last  = twGroup.staves[twGroup.staves.length-1];

                var firstStave = measureStaves[first];
                var lastStave  = measureStaves[last];

                new Vex.Flow.StaveConnector(firstStave, lastStave)
                    .setType(Vex.Flow.StaveConnector.type.SINGLE_RIGHT)
                    .setContext(ctx)
                    .draw();

                if (measureIndex > 0) {
                    return;
                }

                new Vex.Flow.StaveConnector(firstStave, lastStave)
                    .setType(Vex.Flow.StaveConnector.type.BRACKET)
                    .setContext(ctx)
                    .draw();
            });

            if (measureIndex === 0) {
                new Vex.Flow.StaveConnector(measureStaves[0], measureStaves[measureStaves.length-1])
                    .setType(Vex.Flow.StaveConnector.type.SINGLE_LEFT)
                    .setContext(ctx)
                    .draw();
            }

        });

        // draw all notes in this system

        _.each(notes.parts, function (part) {

            var system = part.systems[systemIndex];
            var time = null;
            var clef = null;

            var statesByVoiceId = {};

            function getVoiceState (id) {
                if (!statesByVoiceId[id]) {
                    statesByVoiceId[id] = {

                    }
                }
                return statesByVoiceId[id];
            }

            _.each(system.measures, function (measure, i) {

                if (measure.isHidden) {
                    return;
                }

                if (measure.time) {
                    time = measure.time;
                }

                if (measure.clef) {
                    clef = measure.clef;
                }

                if (!time) {
                    console.log('no time signature');
                    // TODO: guess automatically based
                    //       on the notes duration ...
                    time = {
                        beats    : 4,
                        beatType : 4
                    }
                }

                if (!clef) {
                    clef = { sign: 'G', line: 2 };
                }

                var stave = systemStaves[i][measure.staveIndex];

                var beams = [];

                var voices = _.map(measure.voices, function (mVoice, voiceId) {

                    var voice = new Vex.Flow.Voice({

                        num_beats  : time.beats,
                        beat_value : time.beatType,
                        resolution : Vex.Flow.RESOLUTION
                    });

                    var state = getVoiceState(voiceId);

                    voice.setMode(Vex.Flow.Voice.Mode.SOFT);
                    voice.setStave(stave);

                    var notes = _.map(mVoice.notes, function (note) {
                        var staveNote = null;

                        //TODO: change noteKey using clefOctaveChange value

                        if (note.noteKey) {
                            staveNote = new Vex.Flow.StaveNote({
                                keys: [ note.noteKey ],
                                duration: note.noteType,
                                stem_direction: note.stemDirection,
                                clef: Parser.getClefName(clef.sign, clef.line),
                                octave_shift: clef.clefOctaveChange,
                            });
                        } else if (note.isRest) {
                            staveNote = new Vex.Flow.StaveNote({
                                keys: ["b/4"], duration: note.noteType + "r"
                            });
                        } else {
                            staveNote = new Vex.Flow.StaveNote({
                                keys: ["b/4"], duration: "1r"
                            });
                        }

                        if (note.beam === 'begin') {
                            state.beamNotes = [ staveNote ];
                        } else if (note.beam === 'continue') {
                            state.beamNotes.push(staveNote);
                        } else if (note.beam === 'end') {
                            state.beamNotes.push(staveNote);
                            beams.push(new Vex.Flow.Beam(state.beamNotes));
                        }

                        return staveNote;
                    });

                    voice.addTickables(notes);

                    return voice;
                });

                var formatter = new Vex.Flow.Formatter()
                    .joinVoices(voices)
                    .formatToStave(voices, stave);

                _.each(voices, function (voice) {
                    voice.draw(ctx, stave);
                });

                _.each(beams, function (beam) {
                    beam.setContext(ctx).draw();
                });

            });

        });

    });
}
