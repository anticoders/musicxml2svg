(function () {
    'use strict';

    Element.scorePartwise = function () {
        var el = Element.base('scorePartwise');
        el.on('partList', function (child) {
            el.groups = child.groups;
            return true;
        });
        return el;
    }

    Element.partList = function () {
        var el = Element.base('partList');
        var group = null;
        el.groups = [];
        el.on('addPart', function (partId) {
            if (group) {
                group.parts.push(partId);
            } else {
                el.groups.push({ parts: [ partId ]})
            }
        });
        el.on('beginGroup', function () {
            group = { parts: [] };
        });
        el.on('endGroup', function () {
            el.groups.push(group);
            group = null;
        });
        return el;
    }

}());
