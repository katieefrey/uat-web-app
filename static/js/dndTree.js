// Get JSON data


function renderTree(j){
treeJSON = d3.json(j, function(error, treeData) {
    var nodenames = {};

    //console.log(treeData);


    $("#undobutton").unbind();
    $("#redobutton").unbind();
    clear_history("undo");
    clear_history("redo");
    undo_list = [];
    redo_list = [];
    var changenum = 1;

    $("#history").hide()


    //if i'm sending an actual json string instead of a file....
    if(typeof treeData == 'undefined') {

        //console.log(j);

        treeData = j;

        try {
            for (var i = 0; i < j["children"].length; i++) {

                if (j["children"][i]["name"] == "recycle") {
                    recycle = j.children[i]["children"];
                }
                else if (j["children"][i]["name"] == "orphans") {
                    recycle = j.children[i]["children"];

                } else if (j["children"][i]["name"] == "branch") {
                    treeData = j.children[i]["children"];

                } else if (j["children"][i]["name"] == "orig") {
                    orig = j.children[i]["children"];
                }
            }
        } catch(err){
            alert("The JSON file you have tried to load is not compatible with the Sorting Tool.")
        }

    } else {
        //otherwise it is a file, and add in the recycle node
        var recycle = {};
        recycle["name"] = "recycle";
        orig = JSON.parse(JSON.stringify(treeData));
    }

    var treeDataExtend = {};
    treeDataExtend["name"] = "root";
    treeDataExtend["children"] = [recycle, treeData];

    treeData = treeDataExtend;

    // Calculate total nodes, max label length
    var totalNodes = 0;
    var maxLabelLength = 0;
    // variables for drag/drop
    var selectedNode = null;
    var draggingNode = null;
    // panning variables
    var panSpeed = 200;
    var panBoundary = 20; // Within 20px from edges will pan when dragging.
    // Misc. variables
    var i = 0;
    var duration = 750;
    var root;
    //var orig;

    // size of the diagram
    var viewerWidth = $(document).width();
    var viewerHeight = $(document).height();

    var tree = d3.layout.tree()
        .size([viewerHeight, viewerWidth]);

    // define a d3 diagonal projection for use by the node paths later on.
    var diagonal = d3.svg.diagonal()
        .projection(function(d) {
            return [d.y, d.x];
        });

    // A recursive helper function for performing some setup by walking through all nodes

    function visit(parent, visitFn, childrenFn) {
        if (!parent) return;

        visitFn(parent);

        var children = childrenFn(parent);
        if (children) {
            var count = children.length;
            for (var i = 0; i < count; i++) {
                visit(children[i], visitFn, childrenFn);
            }
        }
    }
    visit(treeData, function(d){
       var downCasename = d.name.toLowerCase();
       nodenames[downCasename] = 1; 
       return;
    }, function(d){
        return d.children;
    });

    // Call visit function to establish maxLabelLength
    visit(treeData, function(d) {
        totalNodes++;
        maxLabelLength = Math.max(d.name.length, maxLabelLength);
    }, function(d) {
        return d.children && d.children.length > 0 ? d.children : null;
    });


    // sort the tree according to the node names

    function sortTree() {
        tree.sort(function(a, b) {
            return b.name.toLowerCase() < a.name.toLowerCase() ? 1 : -1;
        });
    }
    // Sort the tree initially incase the JSON isn't in a sorted order.
    //sortTree();

    // TODO: Pan function, can be better implemented.

    function pan(domNode, direction) {
        var speed = panSpeed;
        if (panTimer) {
            clearTimeout(panTimer);
            translateCoords = d3.transform(svgGroup.attr("transform"));
            if (direction == 'left' || direction == 'right') {
                translateX = direction == 'left' ? translateCoords.translate[0] + speed : translateCoords.translate[0] - speed;
                translateY = translateCoords.translate[1];
            } else if (direction == 'up' || direction == 'down') {
                translateX = translateCoords.translate[0];
                translateY = direction == 'up' ? translateCoords.translate[1] + speed : translateCoords.translate[1] - speed;
            }
            scaleX = translateCoords.scale[0];
            scaleY = translateCoords.scale[1];
            scale = zoomListener.scale();
            svgGroup.transition().attr("transform", "translate(" + translateX + "," + translateY + ")scale(" + scale + ")");
            d3.select(domNode).select('g.node').attr("transform", "translate(" + translateX + "," + translateY + ")");
            zoomListener.scale(zoomListener.scale());
            zoomListener.translate([translateX, translateY]);
            panTimer = setTimeout(function() {
                pan(domNode, speed, direction);
            }, 50);
        }
    }

    // Define the zoom function for the zoomable tree

    function zoom() {
        svgGroup.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    }


    // define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
    var zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);

    function initiateDrag(d, domNode) {

        oldparent = d.parent;

        draggingNode = d;
        d3.select(domNode).select('.ghostCircle').attr('pointer-events', 'none');
        d3.selectAll('.ghostCircle').attr('class', 'ghostCircle show');
        d3.select(domNode).attr('class', 'node activeDrag');

        svgGroup.selectAll("g.node").sort(function(a, b) { // select the parent and sort the path's
            if (a.id != draggingNode.id) return 1; // a is not the hovered element, send "a" to the back
            else return -1; // a is the hovered element, bring "a" to the front
        });
        // if nodes has children, remove the links and nodes
        if (nodes.length > 1) {
            // remove link paths
            links = tree.links(nodes);
            nodePaths = svgGroup.selectAll("path.link")
                .data(links, function(d) {
                    return d.target.id;
                }).remove();
            // remove child nodes
            nodesExit = svgGroup.selectAll("g.node")
                .data(nodes, function(d) {
                    return d.id;
                }).filter(function(d, i) {
                    if (d.id == draggingNode.id) {
                        return false;
                    }
                    return true;
                }).remove();
        }

        // remove parent link
        parentLink = tree.links(tree.nodes(draggingNode.parent));
        svgGroup.selectAll('path.link').filter(function(d, i) {

            if (d.target.id == draggingNode.id) {
                return true;
            }

            return false;
        }).remove();

        dragStarted = null;
    }

    // define the baseSvg, attaching a class for styling and the zoomListener
    var baseSvg = d3.select("#tree-container").html("").append("svg")
        .attr("width", viewerWidth)
        .attr("height", viewerHeight)
        .attr("class", "overlay")
        .call(zoomListener);


            $(".overlay").css('cursor', 'grab');
            
            $(".overlay").on("mousedown", function(){
                $(".overlay").css('cursor', 'grabbing');
            });


            $(".overlay").on("mouseup", function(){
                $(".overlay").css('cursor', 'grab');
            });

    // Define the drag listeners for drag/drop behaviour of nodes.
    dragListener = d3.behavior.drag()
        .on("dragstart", function(d) {
            if (d == root) {
                return;
            }
            dragStarted = true;
            nodes = tree.nodes(d);
            d3.event.sourceEvent.stopPropagation();
            // it's important that we suppress the mouseover event on the node being dragged. Otherwise it will absorb the mouseover event and the underlying node will not detect it d3.select(this).attr('pointer-events', 'none');
        })
        .on("drag", function(d) {
            if(d.name == "recycle"){
                return;
            }
            if (d == root) {
                return;
            }
            if (dragStarted) {
                domNode = this;
                initiateDrag(d, domNode);
            }

            // get coords of mouseEvent relative to svg container to allow for panning
            relCoords = d3.mouse($('svg').get(0));
            if (relCoords[0] < panBoundary) {
                panTimer = true;
                pan(this, 'left');
            } else if (relCoords[0] > ($('svg').width() - panBoundary)) {

                panTimer = true;
                pan(this, 'right');
            } else if (relCoords[1] < panBoundary) {
                panTimer = true;
                pan(this, 'up');
            } else if (relCoords[1] > ($('svg').height() - panBoundary)) {
                panTimer = true;
                pan(this, 'down');
            } else {
                try {
                    clearTimeout(panTimer);
                } catch (e) {

                }
            }

            d.x0 += d3.event.dy;
            d.y0 += d3.event.dx;
            var node = d3.select(this);
            node.attr("transform", "translate(" + d.y0 + "," + d.x0 + ")");
            updateTempConnector();
        }).on("dragend", function(d) {
            if (d == root) {
                return;
            }
            domNode = this;
            if (selectedNode) {
            // now remove the element from the parent, and insert it into the new elements children
                var foundNodes = [];
                searchTree(root,draggingNode.parent.name,foundNodes);
                foundNodes.forEach(function(d){
                    var children = (d.children) ? d.children : d._children;
                    var index = -1;
                    if(children !== null){
                        for(var i=0;i<children.length;i++){
                            if(children[i].name === draggingNode.name){
                                index = i;
                            }
                        }
                    }
                    if (index > -1) {
                        children.splice(index, 1);
                    }
                });

                foundNodes = [];
                searchTree(root,selectedNode.name,foundNodes);
                foundNodes.forEach(function(d){           
                    appendNode(d,draggingNode); 
                });

                newparents = foundNodes

                //setupbackbutton(oldparent,newparents,draggingNode);
                add_to_history("undo",oldparent,newparents,draggingNode);
                
                if($('#openright').is(':visible')){
                    //nothing
                } else {
                    $("#history").show();
                    $("#closeright").show();
                }
                $("#undosection").show();

                clear_history("redo");
                redo_list = [];
                $("#redosection").hide();

                endDrag();
            } else {
                endDrag();
            }
        });
        
    function searchTree(obj,search,path){
        //if(obj.name === "Cataclysmic variable stars (31)"){
        //    console.log("CVS");
        //}
        if(obj.name === search){ //if search is found return, add the object to the path and return it
            path.push(obj);
        }
        var doCollapse = false;
        if(!(obj._children || obj.children)){
            return;
        }
        if(obj._children){
            expand(obj);
            tree.nodes(obj);
            doCollapse = true;
        }
        var children = obj.children;
        for(var i=0;i<children.length;i++){
            searchTree(children[i],search,path);
        }
        if(doCollapse){
            collapse(obj);
        }
    }


    function endDrag() {
        //console.log("End drag");
        d3.selectAll('.ghostCircle').attr('class', 'ghostCircle');
        d3.select(domNode).attr('class', 'node');
        // now restore the mouseover event or we won't be able to drag a 2nd time
        d3.select(domNode).select('.ghostCircle').attr('pointer-events', '');
        updateTempConnector();
        if (draggingNode !== null) {
            collapse(draggingNode); //< --- collapse the node in question at all times when dropped.
            update(selectedNode);

            //centerNode(draggingNode);
            draggingNode = null;
        }
        selectedNode = null;
    }

    // Helper functions for collapsing and expanding nodes.

    function collapse(d) {
        if (d.children) {
            d._children = d.children;
            d._children.forEach(collapse);
            d.children = null;
        }
    }

    function expand(d) {
        if (d._children) {
            d.children = d._children;
            //d.children.forEach(expand); //possible comment out?
            d._children = null;
        }
    }

    var overCircle = function(d) {
        //console.log("overCircle " + d.name);
        selectedNode = d;
        updateTempConnector();
    };
    var outCircle = function(d) {
        //console.log("outCircle " + d.name);
        selectedNode = null;
        updateTempConnector();

    };

    // Function to update the temporary connector indicating dragging affiliation
    var updateTempConnector = function() {
        var data = [];
        if (draggingNode !== null && selectedNode !== null) {
            // have to flip the source coordinates since we did this for the existing connectors on the original tree
            data = [{
                source: {
                    x: selectedNode.y0,
                    y: selectedNode.x0
                },
                target: {
                    x: draggingNode.y0,
                    y: draggingNode.x0
                }
            }];
        }
        var link = svgGroup.selectAll(".templink").data(data);

        link.enter().append("path")
            .attr("class", "templink")
            .attr("d", d3.svg.diagonal())
            .attr('pointer-events', 'none');

        link.attr("d", d3.svg.diagonal());

        link.exit().remove();
    };

    // Function to center node when clicked/dropped so node doesn't get lost when collapsing/moving with large amount of children.

    function centerNode(source) {
        scale = zoomListener.scale();
        x = -source.y0;
        y = -source.x0;
        x = x * scale + viewerWidth / 13;
        y = y * scale + viewerHeight / 2;
        d3.select('g').transition()
            .duration(duration)
            .attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
        zoomListener.scale(scale);
        zoomListener.translate([x, y]);
    }

    // Toggle children function

    function toggleChildren(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else if (d._children) {
            d.children = d._children;
            d._children = null;
        }
        return d;
    }

    // Toggle children on click.

    function click(d) {
        if (d3.event.defaultPrevented) return; // click suppressed
        d = toggleChildren(d);
        update(d);
        //centerNode(d);
    }

    function update(source) {
        // Compute the new height, function counts total children of root node and sets tree height accordingly.
        // This prevents the layout looking squashed when new nodes are made visible or looking sparse when nodes are removed
        // This makes the layout more consistent.
        var levelWidth = [1];
        var childCount = function(level, n) {

            if (n.children && n.children.length > 0) {
                if (levelWidth.length <= level + 1) levelWidth.push(0);

                levelWidth[level + 1] += n.children.length;
                n.children.forEach(function(d) {
                    childCount(level + 1, d);
                });
            }
        };
        childCount(0, root);
        
        //var newHeight = viewerHeight-50; // 25 pixels per line  
        //tree = tree.size([newHeight, viewerWidth]);


        var newHeight = ((Math.max(...levelWidth))*48);
        //console.log("new Height "+newHeight);
        tree = tree.size([newHeight, viewerWidth]);

        // Compute the new tree layout.
        var nodes = tree.nodes(root).reverse(),
            links = tree.links(nodes);

        // Set widths between levels based on maxLabelLength.
        nodes.forEach(function(d) {
            //console.log("d.depth "+d.depth);
            d.y = (d.depth * (maxLabelLength * 7) + 10); //maxLabelLength * 10px
            //console.log("d.y "+d.y);
            //if (d.y < 100){
            //    d.y = 100;
            //}
            //console.log("new d.y "+d.y);
            // alternatively to keep a fixed scale one can set a fixed depth per level
            // Normalize for fixed-depth by commenting out below line
            // d.y = (d.depth * 500); //500px per level.
        });

        // Update the nodes…
        node = svgGroup.selectAll("g.node")
            .data(nodes, function(d) {
                return d.id || (d.id = ++i);
            });


        // Define the div for the tooltip
        

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append("g")
            .call(dragListener)
            .attr("class", "node")
            .attr("transform", function(d) {
                return "translate(" + source.y0 + "," + source.x0 + ")";
            })
            .on('click', click)
            .on("mouseover", function(d) {
                    var g = d3.select(this); // The node
                    // The class is used to remove the additional text later;
                    // console.log(typeof d.note);

                    if (typeof d.note == 'string'){

                    var tip = d3.select("body").append("div")   
                        .attr("class", "tooltip")
                        .style("opacity", 0);

                    tip.transition() 
                        .duration(200)      
                        .style("opacity", .9);      
                    tip.html(d.note)  
                        .style("left", (d3.event.pageX) + "px")     
                        .style("top", (d3.event.pageY - 28) + "px");
                };
            })
            .on("mouseout", function() {
                // Remove the info text on mouse out.
                $(".tooltip").remove()
            });

        nodeEnter.append("circle")
            .attr('class', 'nodeCircle')
            .attr("r", 0)
            .style("fill", function(d) {
                return d._children ? "lightsteelblue" : "#fff";
            });

        nodeEnter.append("text")
            .attr("x", function(d) {
                return d.children || d._children ? -10 : 10;
            })
            .attr("dy", ".35em")
            .attr('class', 'nodeText')
            .attr("text-anchor", function(d) {
                return d.children || d._children ? "end" : "start";
            })
            .text(function(d) {
                return d.name;
            })
            .style("fill-opacity", 0);

        // phantom node to give us mouseover in a radius around it
        nodeEnter.append("circle")
            .attr('class', 'ghostCircle')
            .attr("r", 30)
            .attr("opacity", 0.2) // change this to zero to hide the target area
        .style("fill", "red")
            .attr('pointer-events', 'mouseover')
            .on("mouseover", function(node) {
                overCircle(node);
            })
            .on("mouseout", function(node) {
                outCircle(node);
            });

        // Update the text to reflect whether node has children or not.
        node.select('text')
            .attr("x", function(d) {
                return d.children || d._children ? -10 : 10;
            })
            .attr("text-anchor", function(d) {
                return d.children || d._children ? "end" : "start";
            })
            .text(function(d) {
                return d.name;
            });

        // Change the circle fill depending on whether it has children and is collapsed
        node.select("circle.nodeCircle")
            .attr("r", 4.5)
            .style("fill", function(d) {
                return d._children ? "lightsteelblue" : "#fff";
            });

        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" + d.y + "," + d.x + ")";
            });

        // Fade the text in
        nodeUpdate.select("text")
            .style("fill-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" + source.y + "," + source.x + ")";
            })
            .remove();

        nodeExit.select("circle")
            .attr("r", 0);

        nodeExit.select("text")
            .style("fill-opacity", 0);

        // Update the links…
        var link = svgGroup.selectAll("path.link")
            .data(links, function(d) {
                return d.target.id;
            });

        // Enter any new links at the parent's previous position.
        link.enter().insert("path", "g")
            .attr("class", "link")
            .attr("d", function(d) {
                var o = {
                    x: source.x0,
                    y: source.y0
                };
                return diagonal({
                    source: o,
                    target: o
                });
            });

        // Transition links to their new position.
        link.transition()
            .duration(duration)
            .attr("d", diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
            .duration(duration)
            .attr("d", function(d) {
                var o = {
                    x: source.x,
                    y: source.y
                };
                return diagonal({
                    source: o,
                    target: o
                });
            })
            .remove();

        // Stash the old positions for transition.
        nodes.forEach(function(d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    // Append a group which holds all nodes and which the zoom Listener can act upon.
    var svgGroup = baseSvg.append("g");

    // Define the root
    root = treeData;
    //orig = JSON.parse(JSON.stringify(treeData));
    root.x0 = viewerHeight / 2;
    root.y0 = 0;

    // Collapse all children of roots children before rendering.
    root.children.forEach(function(child){
    collapse(child);
    });

    // Layout the tree initially and center on the root node.
    update(root);
    centerNode(root);
    

    function fullexpand(d) {
        expand(d);
        if (d._children) {
            d.children = d._children;
            expand(d);
            d.children.forEach(fullexpand);
            d._children = null;
        } else if (d.children) {
            expand(d);
            d.children.forEach(fullexpand);
        } else {
            // do nothing
        }
    };


    function fullcollapse(d) {
        if (d.children) {
            d._children = d.children;
            d._children.forEach(fullcollapse);
            d.children = null;
        } else if (d._children) {
            collapse(d._children)
            d._children.forEach(fullcollapse);
        } else {
            // do nothing
        }
    };


    $("#fullex").on("click", function(){
        var root = getRoot();
        fullexpand(root);
        update(root);
        centerNode(root);
    });

    $("#fullcollapse").on("click", function(){
        var root = getRoot();
        fullcollapse(root);
        update(root);
        centerNode(root);
    });


    function copyTree(tree,newtree){
        newtree.name = tree.name;
        if(!tree.children){
            newtree.children = null;
        }else{
            newtree.children = [];
            tree.children.forEach(function(c){
               var newchild = {};
               newtree.children.push(newchild);
               copyTree(c,newchild);
            });
        }
        if(!tree._children){
            newtree._children = null;
        } else {
            newtree._children = [];
            tree._children.forEach(function(c){
                var newchild = {};
                newtree._children.push(newchild);
                copyTree(c,newchild);
            });
        }
    };


    function clear_history(historytype){
        $("#"+historytype+"history").empty();
    }


    function add_to_history(historytype, oldparent, newparents, newchild){

        change = {
            "oldparent" : oldparent,
            "newparents" : newparents,
            "newchild" : newchild,
            "changenum" : changenum
        }

        if (historytype == "undo") {
            undo_list.push(change);
        } else {
            redo_list.push(change);
        }

        var desc = '"'+newchild['name']+'" <i>moved from</i> "'+oldparent['name']+'" <i>to</i> "'+newparents[0]['name']+'"';

        var historyitem = $("<li></li>")
                        .attr("id",historytype+"num"+changenum)
                        .html(desc);

        $("#"+historytype+"history").append(historyitem);
        
        changenum++;

    }


    $("#undobutton").on("click", function(){
        try {
            var item = undo_list.slice(-1) 

            undo_list.pop();

            newparents = item[0]["newparents"];
            newchild = item[0]["newchild"];
            oldparent = item[0]["oldparent"];
            changenum = item[0]["changenum"];

            for (x in newparents){
                    var childs = newparents[x]["children"];
                    for (y in childs){
                        if (childs[y]["name"] == newchild["name"]){
                            childs.splice(y,1);
                        }
                    }
                }
                
                foundNodes = [];
                searchTree(root,oldparent.name,foundNodes);

                foundNodes.forEach(function(oldparent){  
                    appendNode(oldparent,newchild); 
                });

                $("#undonum"+changenum).remove();

                add_to_history("redo", oldparent, newparents, newchild);
                $("#redosection").show();

                update(oldparent);
                endDrag();

                //console.log(undo_list.length);

                if (undo_list.length == 0){
                    $("#undosection").hide();
                }
        }
        catch(err) {
            console.log(err);
        }
    });

    $("#redobutton").on("click", function(){
        try {
            var item = redo_list.slice(-1)[0] 

            redo_list.pop();
            
            newparents = item["newparents"];
            newchild = item["newchild"];
            oldparent = item["oldparent"];
            changenum = item["changenum"];

            for (x in oldparent["children"]){
                if (oldparent["children"][x]["name"] == newchild["name"]){
                    oldparent["children"].splice(x,1);
                }

            }
            
            foundNodes = [];
            var newp = newparents[0]
            searchTree(root,newp.name,foundNodes);
            foundNodes.forEach(function(newparents){  
                appendNode(newparents,newchild); 
            });

            $("#redonum"+changenum).remove();

            add_to_history("undo", oldparent, newparents, newchild);
            $("#undosection").show();

            update(oldparent);
            endDrag();

            //console.log(redo_list.length);
            if (redo_list.length == 0){
                    $("#redosection").hide();
                }
        }
        catch(err) {
            console.log(err);
        }

    });

    function appendNode(selectedNode, appNode){
        var children = (selectedNode.children) ? selectedNode.children : selectedNode._children;
        var newObject = {};
        copyTree(appNode,newObject);
        if(children){
            children.push(newObject);
        }else{
            selectedNode._children = [];
            selectedNode._children.push(newObject);
        }
        // Make sure that the node being added to is expanded so user can see added node is correctly moved
        expand(selectedNode);
        //collapse(selectedNode.children);
        //sortTree();
    }

    addNode = function(nodename,errorElement){
        /*
        if(nodenames[nodename.toLowerCase()]){
            var errorMsg = document.createTextNode("name already exists");
            errorElement.classname += "error";
            errorElement.appendChild(errorMsg);
            return;
        }
        */
        nodenames[nodename] = 1;
        var newNode = {};
        newNode["name"] = nodename;
        newNode["x0"] = recycle["x0"];
        newNode["y0"] = recycle["y0"];
        newNode.children = [];
        appendNode(recycle,newNode);
        update(recycle);
        centerNode(newNode);

    }

    getRoot = function(){
        return root;
    };

    getOrig = function(){
        return orig;
    };


}
)};