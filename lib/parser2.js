Element = {};
Generic = {};
Parsers = {};

(function () {
    'use strict';

    Element.base = function (type) {
        var el = {};
        var handlers = {};

        el.__type__ = type;

        el.on = function (type, handler) {
            if (!handlers[type]) {
                handlers[type] = [];
            }
            handlers[type].unshift(handler);
        }

        el.emit = function (type, data) {
            return _.some(handlers[type], function (handler) {
                handler(data);
            });
        }

        el.add = function (child) {
            var isFine = _.some(handlers[child.__type__], function (handler) {
                return handler(child);
            });
            if (!isFine) {
                throw new Error('cannot handle ' + child.__type__ + ' at ' + el.__type__);
            }
        }

        el.on('property', function (child) {
            el[child.name] = child.value;
            return true;
        });

        return el;
    };

    Element.property = function (name, value) {
        var el = Element.base('property');
        el.name = name;
        el.value = value;
        return el;
    };

    Generic.property = function (name, value) {
        return function (node) {
            var val;
            if (typeof value === 'function') {
                val = value(node.val);
            } else if (value !== undefined) {
                val = value;
            } else {
                val = node.val;
            }
            return Element.property(name || node.name, val);
        };
    };

    Parsers = {};

    MusicXML.parse = function (docTree) {
        return (function next(node, context) {
            var type = Utils.toCamelCase(node.name);
            var parser = Parsers[type];
            if (!parser) {
                console.warn('don\'t know how to parse node of type ' + type);
                return;
            }
            var el = parser.call(context, node);
            if (el) {
                _.each(node.children, function (child) {
                    var childEl = next(child, {
                        emit: function (type, data) {
                            if (!el.emit(type, data)) {
                                context.emit(type, data);
                            }
                        }
                    });
                    if (childEl) {
                        el.add(childEl);
                    }
                });
                el.emit('clean');
            }
            return el;
        })(docTree, {
            emit: function () {}
        });
    }

}());
