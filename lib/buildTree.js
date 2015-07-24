/**
 * Build an easy-to-use node tree representing the XML doc structure.
 *
 * @param {object} node
 * @param {object} root
 */

MusicXML.buildTree = function buildTree (node, root) {

    if (_.isObject(root)) {
        root = {};
    }

    root.name = node.nodeName;
    root.val = "";
    root.children = [];
    root.attr = {};

    // read attributes
    _.each(node.attributes, function (attr) {
        root.attr[attr.name] = attr.value;
    });

    // read child nodes
    _.each(node.childNodes, function (child) {
        if (child.nodeType === 1) { // element node
            root.children.push(buildTree(child, {}));
        } else if (child.nodeType === 3) { // text node
            root.val += child.nodeValue;
        }
    });

    if (root.children.length > 0) {
        // for clarity
        delete root.val;
    }

    return root;
}
