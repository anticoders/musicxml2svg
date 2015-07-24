# musicxml2svg

A simple MusicXML to SVG converter.

## Technology

We are using [vexflow](https://github.com/0xfe/vextab) as the rendering API. It's a quite powerful
tool providing a nice abstraction level for programatic notes creation. Unfortunately, it's poorly
documented, but there are a lot of tests implemented and they can be used as a good reference.

By itself, `VexFlow` does not provide a way to parse `MusicXML` documents. Instead we've implemented
a custom parser that transforms the original `MusicXML` notation into some intermediate format that
can be used to render notes with `VexFlow` almost instantly with no further "translations".
There are a few compatibility issues arising from the fact that `MusicXML` specification
is a little too wide. Though it's not a problem at all, because `VexFlow` is totally open source,
which basically means we can implement all missing features which we will find important.
One of them may be for example the ability to load additional music fonts.

## VexFlow know-how

### Vex.Flow.Formater

A useful place to look is the implementation of `Formatter.FormatAndDraw` routine.

```javascript
new Formatter().
  joinVoices([voice], {}).
  formatToStave([voice], stave, {});

/**
 * @param {boolean} options.align_rests
 */

```

### Vex.Flow.Voice

In `STRICT` and `FULL` modes `addTickable` may throw runtime error.

```
// Modes allow the addition of ticks in three different ways:
//
// STRICT: This is the default. Ticks must fill the voice.
// SOFT:   Ticks can be added without restrictions.
// FULL:   Ticks do not need to fill the voice, but can't exceed the maximum
//         tick length.
Voice.Mode = {
  STRICT: 1,
  SOFT:   2,
  FULL:   3
};
```

## TODO

- [x] beams
- [ ] clef mapping
- [ ] note shifts
- [ ] key specs
- [ ] modifiers
- [ ] ties
- [ ] slurs
- [ ] tuplets
- [ ] grace notes
- [ ] lyrics
- [ ] chords
- [ ] overlapping notes
