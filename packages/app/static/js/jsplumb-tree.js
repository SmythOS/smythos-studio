/*!
 * jsPlumbTree - Dynamic tree created using jsPlumb.
 *
 * Created as a jQuery plugin.
 *
 * Version: 1.0
 *
 * Author: Daniele Ricci
 * Web: https://github.com/daniele-athome/jsPlumbTree
 *
 * Licensed under
 *   GPL v3 http://opensource.org/licenses/GPL-3.0
 *
 */


(function($, undefined){

/**
 * Creates a new tree. See defaults for options parameter.
 */
$.jsPlumbTree = function(_jsPlumb, options) {
    this.options = $.extend(true, {}, this.defaults, options || {});
    this.jsPlumb = _jsPlumb;

    /**
     * Initializes a tree.
     */
    this.init = function() {
        var root = this.nodeById('0'); // Ensure the root node has ID '0'
        root.css('left', options.baseLeft);
        root.css('top', options.baseTop);
        root.show();

        // we are about to do a lot of work - so disable drawing
        this.jsPlumb.setSuspendDrawing(true);

        this._traverseBranch(root, options.baseLeft, options.baseTop, true);

        // resume drawing
        // the second parameter makes jsPlumb trigger a complete redraw
        this.jsPlumb.setSuspendDrawing(false, true);
    };

    // traverses a branch to fix node positions and connections
    /** FIXME compatibility version of _traverseBranch. */
    this._traverseBranch = function(node, offsetLeft, offsetTop, connect) {
        // HACK stupid hack
        this._offsetTop = offsetTop;
        this._traverseBranch2(node, offsetLeft, connect);
    };

    this._traverseBranch2 = function(node, offsetLeft, connect) {
        // position node
        node.css('left', offsetLeft);
        node.css('top', this._offsetTop);

        // connecting, show node
        if (connect) {
            node.show();

            // call connection user callback
            if (options.connectFunc)
                options.connectFunc(this, node);
        }

        // not connecting and node is not visible - exit immediately
        else if (!node.is(':visible')) {
            // calculate new vertical offset
            var parent = this.nodeById(node.data('parent'));
            if (parent) {
                this._offsetTop = parseFloat(parent.css('top')) + parent.outerHeight() + options.vSpace;
            }
            return false;
        }

        var firstChild = node.data('first-child');
        if (firstChild) {
            //console.log('first child ' + firstChild);
            var child = this.nodeById(firstChild);

            // calculate new horizontal offset
            var left = offsetLeft + node.outerWidth() + options.hSpace;

            this._traverseBranch2(child, left, connect);

            if (connect) {
                child.show();
                //alert('node(' + child.data('id') + ') [top=' + offsetTop + ', left=' + left + ']');

                // generate source endpoint for parent node (if needed)
                // TODO can we convert this to: this.jsPlumb.getEndpoint('source-' + node.data('parent'));
                var sourceEndpoint = this._getSourceEndpoint(node);

                // generate target endpoint
                var targetEndpoint = this.jsPlumb.addEndpoint(child, options.targetEndpoint, { anchor:options.targetAnchor, uuid:"target-" + child.data('id') });

                // connect!!!
                //console.log('connecting ' + sourceEndpoint.getUuid() + ' to ' + targetEndpoint.getUuid());
                this.jsPlumb.connect({ source:sourceEndpoint, target:targetEndpoint });
            }
        }

        var nextSibling = node.data('next-sibling');
        if (nextSibling) {
            //console.log('next sibling ' + nextSibling);
            var sibling = this.nodeById(nextSibling);

            // calculate new vertical offset
            if (!firstChild)
                this._offsetTop += node.outerHeight() + options.vSpace;

            // go ahead with next sibling
            this._traverseBranch2(sibling, offsetLeft, connect);

            if (connect) {
                sibling.show();
                //alert('node(' + sibling.data('id') + ') [top=' + top + ', left=' + offsetLeft + ']');

                // get source endpoint
                // TODO can we convert this to: this.jsPlumb.getEndpoint('source-' + sibling.data('parent'));
                var sourceEndpoint = this._getSourceEndpoint(this.nodeById(sibling.data('parent')));

                // create target endpoint
                var targetEndpoint = this.jsPlumb.addEndpoint(sibling, options.targetEndpoint, { anchor:options.targetAnchor, uuid:"target-" + sibling.data('id') });

                // connect!!!
                this.jsPlumb.connect({ source:sourceEndpoint, target:targetEndpoint });
            }
        }
        else {
            // calculate new vertical offset
            var newTop = parseFloat(node.css('top')) + node.outerHeight() + options.vSpace;
            var newTopParent = 0;
            var parent = this.nodeById(node.data('parent'));
            if (parent)
                newTopParent = parseFloat(parent.css('top')) + parent.outerHeight() + options.vSpace;
            // the parent could be bigger than the sum of all its children
            if (newTop > this._offsetTop || newTopParent > this._offsetTop)
                this._offsetTop = Math.max(newTop, newTopParent);
        }
    };

    this._getSourceEndpoint = function(node) {
        // generate source endpoint for parent node (if needed)
        var sourceEndpoint = this.jsPlumb.getEndpoint('source-' + node.data('id'));
        if (!sourceEndpoint) {
            sourceEndpoint = this.jsPlumb.addEndpoint(node, options.sourceEndpoint, { anchor:options.sourceAnchor, uuid:"source-" + node.data('id') });
            var me = this;
            sourceEndpoint.bind('click', function(tree) {
                return function(endpoint) {
                    tree._toggleBranch(endpoint.nodeId, !endpoint.expanded, true);
                    endpoint.setExpanded(!endpoint.expanded);
                };
            }(me));
            sourceEndpoint.setExpanded = function(expanded) {
                this.expanded = expanded;
                // WARNING accessing jsPlumb internals
                if (this.canvas)
                    this.canvas.src = expanded ? options.imgMinus : options.imgPlus;
            };
            sourceEndpoint.nodeId = node.data('id');
            sourceEndpoint.setExpanded(true);
        }

        return sourceEndpoint;
    };

    this._toggleBranch = function(id, visible, root) {
        var node = this.nodeById(id);
        var nextChild = node.data('first-child');

        var query = this.jsPlumb.getConnections({ target: options.prefix+nextChild });
        if (query.length > 0) {
            // suspend drawing
            this.jsPlumb.setSuspendDrawing(true);

            if (!visible) {
                while (nextChild) {
                    var child = this.nodeById(nextChild);
                    // hide node
                    child.hide();
                    // set expanded to false
                    var ep = this.jsPlumb.getEndpoint('source-' + child.data('id'));
                    if (ep)
                        ep.setExpanded(false);
                    // hide connection
                    this.jsPlumb.hide(child, true);

                    this._toggleBranch(nextChild, visible, true);

                    nextChild = child.data('next-sibling');
                }

                if (root) {
                    this._traverseBranch(this.nodeById('0'), options.baseLeft, options.baseTop, false);

                    // resume drawing
                    this.jsPlumb.setSuspendDrawing(false, true);
                }
            }

            else {
                while (nextChild) {
                    var child = this.nodeById(nextChild);
                    // show node
                    child.show();
                    // set expanded to true
                    var ep = this.jsPlumb.getEndpoint('source-' + child.data('id'));
                    if (ep)
                        ep.setExpanded(true);
                    // show connection
                    this.jsPlumb.show(child, true);

                    this._toggleBranch(nextChild, visible, true);

                    nextChild = child.data('next-sibling');
                }

                if (root) {
                    this._traverseBranch(this.nodeById('0'), options.baseLeft, options.baseTop, false);

                    // resume drawing
                    this.jsPlumb.setSuspendDrawing(false, true);
                }
            }
        }
    };

    /** Updates and redraws the whole tree. */
    this.update = function() {
        // we are about to do a lot of work - so disable drawing
        this.jsPlumb.setSuspendDrawing(true);

        this.jsPlumb.deleteEveryEndpoint();
        this._traverseBranch(this.nodeById('0'), options.baseLeft, options.baseTop, true);

        // resume drawing
        // the second parameter makes jsPlumb trigger a complete redraw
        this.jsPlumb.setSuspendDrawing(false, true);
    };

    /**
     * Adds a node to the tree and connects it to the given parent.
     * If parentId is not given, parent attribute from node will be used;
     * otherwise parent attribute will be overwritten with the one given.
     */
    this.addChild = function(node, parentId) {
        // retrieve parent node
        var myParentId;
        if (typeof parentId != 'undefined')
            myParentId = parentId;
        else
            myParentId = node.data('parent');

        var parent = this.nodeById(myParentId);

        // loop through children of parent to update next-sibling

        if (parent) {
            // suspend drawing
            this.jsPlumb.setSuspendDrawing(true);

            // update parent
            node.data('parent', myParentId);

            var firstChild = parent.data('first-child');

            // no children, node will be first child
            if (!firstChild) {
                parent.data('first-child', node.data('id'));
            }
            else {
                var child = this.nodeById(firstChild);
                while(child) {
                    var next = child.data('next-sibling');
                    // no more siblings
                    if (!next) {
                        child.data('next-sibling', node.data('id'));
                        break;
                    }

                    child = this.nodeById(next);
                }
            }

            // show the node
            node.show();

            // call connection user callback
            if (options.connectFunc)
                options.connectFunc(this, node);

            // create or retrieve source endpoint of parent
            var sourceEndpoint = this._getSourceEndpoint(parent);

            // generate target endpoint
            var targetEndpoint = this.jsPlumb.addEndpoint(node, options.targetEndpoint, { anchor:options.targetAnchor, uuid:"target-" + node.data('id') });

            // connect!!!
            this.jsPlumb.connect({ source:sourceEndpoint, target:targetEndpoint });

            // re-arrange tree
            this._traverseBranch(this.nodeById('0'), options.baseLeft, options.baseTop, false);

            // resume drawing
            this.jsPlumb.setSuspendDrawing(false, true);
        }
    };

    /**
     * Removes a node and all of its children.
     */
    this.removeNode = function(id) {
        // suspend drawing
        this.jsPlumb.setSuspendDrawing(true);
        this._removeBranch(this.nodeById(id), false);

        // go through the whole tree again (trust me)
        //console.log('traversing tree');
        this._traverseBranch(this.nodeById('0'), options.baseLeft, options.baseTop, false);

        // resume drawning
        this.jsPlumb.setSuspendDrawing(false, true);
    };

    this._removeBranch = function(node, siblings) {
        var id = node.data('id');
        //console.log('removing node ' + id);

        // remove endpoints (connections will drop too)
        this.jsPlumb.deleteEndpoint('source-' + id);
        this.jsPlumb.deleteEndpoint('target-' + id);

        // check for parent-child relationship that could break
        var parent = null;
        var parentNode = node.data('parent');
        if (typeof(parentNode) != 'undefined') {
            parent = this.nodeById(parentNode);
            var parentFirstChild = parent.data('first-child');

            // update relationship if first child of parent is the same node we are about to remove
            if (parentFirstChild == node.data('id'))
                parent.data('first-child', node.data('next-sibling'));
            //console.log('parent: ' + parent.data('first-child') + ', node: ' + node.data('next-sibling'));

            // previous node (if any) must be re-linked
            // we don't have a reference to the previous node, we must look it up from parent node
            var next = this.nodeById(parentFirstChild), prev = null;
            while (next) {
                // node is the current one and there is something before
                //console.log("nextId=" + next.data('id') + ", prev=" + prev);
                if (next.data('id') == node.data('id') && prev) {
                    // set previous node next-sibling to next-sibling of the current node
                    prev.data('next-sibling', node.data('next-sibling'));
                    break;
                }

                prev = next;
                var nextId = next.data('next-sibling');
                if (nextId)
                    next = this.nodeById(nextId);
                else
                    next = null;
            }
        }


        var firstChild = node.data('first-child');
        if (firstChild) {
            //console.log('removing child ' + firstChild);
            var child = this.nodeById(firstChild);

            // go down the children
            this._removeBranch(child, true);

            // remove node
            child.remove();
        }

        if (siblings) {
            var nextSibling = node.data('next-sibling');
            if (nextSibling) {
                var sibling = this.nodeById(nextSibling);

                // go down the children (will also remove the node)
                this._removeBranch(sibling, true);
            }
        }

        // finally, our turn
        //console.log('removing ' + node.data('id'));
        node.remove();

        // delete source endpoint of parent if there are no children left
        if (parent && !parent.data('first-child'))
        	this.jsPlumb.deleteEndpoint('source-' + parent.data('id'));
    };

    /**
     * Get a node instance by id.
     */
    this.nodeById = function(id) {
        var node = $('#' + options.prefix + id);
        return node.length ? node : null;
    };

    return this;
};

$.jsPlumbTree.defaults = {
    // node objects id prefix
    prefix: 'node_',
    // left coordinate of root node (0)
    baseLeft: 0,
    // top coordinate of root node (0)
    baseTop: 0,
    // node width
    nodeWidth: 100,
    // horizontal padding between nodes
    hSpace: 36,
    // vertical padding between nodes
    vSpace: 10,
    // source anchor
    sourceAnchor: "RightMiddle",
    // target anchor
    targetAnchor: "LeftMiddle",
    // source endpoint definition
    sourceEndpoint: null,
    // target endpoint definition
    targetEndpoint: null,
    // image url for plus anchor button
    imgPlus: null,
    // image url for minus anchor button
    imgMinus: null,
    // a function(this, node) to be called before making a connection
    connectFunc: null
};


})(jQuery);
