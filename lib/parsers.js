(function () {
    'use strict';

    Parsers.scorePartwise = function (node) {
        return Element.scorePartwise();
    }

    Parsers.partList = function (node) {
        return Element.partList();
    }

    Parsers.partGroup = function (node) {
        if (node.attr.type === 'start') {
            this.emit('beginGroup');
        } else if (node.attr.type === 'stop') {
            this.emit('endGroup');
        }
    };

    Parsers.scorePart = function (node) {
        this.emit('addPart', node.attr.id);
    };

}());
