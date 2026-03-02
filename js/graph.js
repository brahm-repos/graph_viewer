/**
 * Cytoscape graph: init, set data, selection highlight, layout.
 * Depends: cytoscape (global), cytoscape-dagre registered
 */

var TTLGraph = (function() {
    var cy = null;
    var currentLayoutIndex = 0;
    var layoutNames = ['dagre', 'breadthfirst', 'grid', 'circle', 'cose'];
    var layouts = {
        dagre: { name: 'dagre', rankDir: 'TB', nodeSep: 50, edgeSep: 20, rankSep: 80 },
        breadthfirst: { name: 'breadthfirst', directed: true, spacingFactor: 1.5 },
        grid: { name: 'grid', rows: undefined, cols: undefined },
        circle: { name: 'circle', radius: 200 },
        cose: { name: 'cose', quality: 'default', nodeRepulsion: 4500, idealEdgeLength: 100 }
    };

    function init(containerEl) {
        if (!containerEl) return;
        cy = cytoscape({
            container: containerEl,
            elements: [],
            style: [
                {
                    selector: 'node',
                    style: {
                        'background-color': function(ele) {
                            var t = ele.data('type');
                            if (t === 'subject') return '#667eea';
                            if (t === 'predicate') return '#f39c12';
                            return '#27ae60';
                        },
                        'label': 'data(label)',
                        'width': 90,
                        'height': 50,
                        'shape': 'ellipse',
                        'border-width': 2,
                        'border-color': '#333',
                        'color': '#fff',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'font-size': '16px',
                        'font-weight': 'bold',
                        'text-wrap': 'wrap',
                        'text-max-width': '120px',
                        'text-overflow-wrap': 'anywhere',
                        'text-outline-width': 1,
                        'text-outline-color': '#333',
                        'text-outline-opacity': 0.8
                    }
                },
                {
                    selector: 'node:selected',
                    style: {
                        'border-width': 6,
                        'border-color': '#c0392b',
                        'overlay-color': '#e74c3c',
                        'overlay-opacity': 0.4,
                        'overlay-padding': 8,
                        'width': 100,
                        'height': 56,
                        'font-size': '18px',
                        'z-index': 999
                    }
                },
                {
                    selector: 'node.dimmed',
                    style: { 'opacity': 0.82 }
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 3,
                        'line-color': '#95a5a6',
                        'target-arrow-color': '#95a5a6',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        'label': 'data(label)',
                        'font-size': 15,
                        'font-weight': 'bold',
                        'text-rotation': 'autorotate',
                        'text-margin-y': -10,
                        'color': '#1a1a1a',
                        'text-background-color': '#fff',
                        'text-background-opacity': 0.98,
                        'text-background-padding': '5px',
                        'text-background-shape': 'round-rectangle',
                        'text-outline-width': 0.5,
                        'text-outline-color': '#fff',
                        'text-outline-opacity': 0.9
                    }
                },
                {
                    selector: 'edge.dimmed',
                    style: { 'opacity': 0.6 }
                }
            ],
            layout: layouts.dagre
        });
        cy.userPanningEnabled(true);
        cy.boxSelectionEnabled(true);
        cy.zoomingEnabled(true);
        cy.minZoom(0.1);
        cy.maxZoom(2);
        return cy;
    }

    function setData(nodes, edges) {
        if (!cy) return;
        var elements = [];
        (nodes || []).forEach(function(node) {
            elements.push({
                data: {
                    id: node.id,
                    label: node.label,
                    type: node.type,
                    fullName: node.fullName
                }
            });
        });
        (edges || []).forEach(function(edge, i) {
            elements.push({
                data: {
                    id: 'edge-' + i,
                    source: edge.source,
                    target: edge.target,
                    label: edge.label,
                    fullName: edge.fullName
                }
            });
        });
        cy.elements().remove();
        cy.add(elements);
        applyLayout();
        cy.fit(undefined, 50);
    }

    function setSelection(selectedId) {
        if (!cy) return;
        cy.elements().removeClass('dimmed selected');
        if (!selectedId) {
            cy.elements().removeClass('dimmed');
            cy.fit(undefined, 50);
            return;
        }
        var node = cy.getElementById(selectedId);
        if (node.length === 0) {
            cy.fit(undefined, 50);
            return;
        }
        var connected = node.connectedEdges().add(node);
        cy.elements().addClass('dimmed');
        connected.removeClass('dimmed');
        node.addClass('selected');
        cy.fit(connected, 50);
    }

    function applyLayout() {
        if (!cy) return;
        var name = layoutNames[currentLayoutIndex];
        var config = layouts[name] || layouts.dagre;
        cy.layout(config).run();
    }

    function nextLayout() {
        currentLayoutIndex = (currentLayoutIndex + 1) % layoutNames.length;
        applyLayout();
        return layoutNames[currentLayoutIndex];
    }

    function setLayout(name) {
        var idx = layoutNames.indexOf(name);
        if (idx === -1) idx = 0;
        currentLayoutIndex = idx;
        applyLayout();
        return layoutNames[currentLayoutIndex];
    }

    function getCounts() {
        if (!cy) return { nodes: 0, edges: 0 };
        return { nodes: cy.nodes().length, edges: cy.edges().length };
    }

    function zoomIn() {
        if (!cy) return;
        var level = Math.min(cy.maxZoom(), cy.zoom() * 1.25);
        cy.zoom(level);
    }

    function zoomOut() {
        if (!cy) return;
        var level = Math.max(cy.minZoom(), cy.zoom() / 1.25);
        cy.zoom(level);
    }

    function fitAll(padding) {
        if (!cy || cy.elements().length === 0) return;
        cy.fit(undefined, padding != null ? padding : 50);
    }

    return {
        init: init,
        setData: setData,
        setSelection: setSelection,
        applyLayout: applyLayout,
        nextLayout: nextLayout,
        setLayout: setLayout,
        layoutNames: layoutNames,
        getCounts: getCounts,
        zoomIn: zoomIn,
        zoomOut: zoomOut,
        fitAll: fitAll
    };
})();
