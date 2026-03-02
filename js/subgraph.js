/**
 * SubgraphFilter: computes a subgraph by selection type and optional node distance.
 * Used to show "view by node distance": All, By 1 (only selected node), By 2/3/4 (k-hop neighborhood).
 * Distance logic applies only to Entities and Classes; Relations and Data types use full selection subgraph.
 */

var SubgraphFilter = (function() {
    var RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

    /**
     * Build undirected adjacency list from edges: nodeId -> Set of neighbor ids.
     */
    function buildAdjacency(edges) {
        var adj = {};
        edges.forEach(function(edge) {
            if (!adj[edge.source]) adj[edge.source] = new Set();
            if (!adj[edge.target]) adj[edge.target] = new Set();
            adj[edge.source].add(edge.target);
            adj[edge.target].add(edge.source);
        });
        return adj;
    }

    /**
     * BFS from startId, collect node ids up to maxHops (0 = only start, 1 = start + neighbors, etc.).
     */
    function nodesWithinHops(adj, startId, maxHops) {
        var result = new Set();
        if (maxHops < 0) return result;
        result.add(startId);
        var current = [startId];
        var depth = 0;
        while (depth < maxHops && current.length > 0) {
            var next = [];
            current.forEach(function(id) {
                var neighbors = adj[id];
                if (neighbors) {
                    neighbors.forEach(function(nid) {
                        if (!result.has(nid)) {
                            result.add(nid);
                            next.push(nid);
                        }
                    });
                }
            });
            current = next;
            depth++;
        }
        return result;
    }

    /**
     * Get base subgraph for selection (no distance limit): which nodes and edges belong to the selection.
     * For entity/class: neighborhood of that node. For relation/datatype: all matching edges/nodes.
     */
    function getBaseSubgraph(selection, data) {
        var nodeIds = new Set();
        var subEdges = [];
        if (!selection || !data || !data.nodes || !data.edges) {
            return { nodeIds: nodeIds, edges: subEdges };
        }

        if (selection.type === 'entities') {
            nodeIds.add(selection.id);
            data.edges.forEach(function(edge) {
                if (edge.source === selection.id || edge.target === selection.id) {
                    subEdges.push(edge);
                    nodeIds.add(edge.source);
                    nodeIds.add(edge.target);
                }
            });
        } else if (selection.type === 'classes') {
            nodeIds.add(selection.id);
            data.edges.forEach(function(edge) {
                if (edge.fullName === RDF_TYPE && edge.target === selection.id) {
                    subEdges.push(edge);
                    nodeIds.add(edge.source);
                    nodeIds.add(edge.target);
                }
            });
        } else if (selection.type === 'relations') {
            data.edges.forEach(function(edge) {
                if (edge.fullName === selection.id) {
                    subEdges.push(edge);
                    nodeIds.add(edge.source);
                    nodeIds.add(edge.target);
                }
            });
        } else if (selection.type === 'dataTypes' && data.triples) {
            data.triples.forEach(function(t) {
                if (t.datatype === selection.id) {
                    nodeIds.add(t.subject);
                    nodeIds.add(t.object);
                    subEdges.push({
                        source: t.subject,
                        target: t.object,
                        label: t.predicateLabel,
                        fullName: t.predicate
                    });
                }
            });
        }
        return { nodeIds: nodeIds, edges: subEdges };
    }

    /**
     * Apply distance limit for entity/class: restrict to center node (by 1) or k-hop neighborhood (by 2/3/4).
     * viewDistance: 1 = only node, 2 = 1-hop, 3 = 2-hop, 4 = 3-hop.
     * Uses full graph edges for BFS so multi-hop works.
     */
    function applyDistanceToEntityOrClass(selection, data, viewDistance) {
        var centerId = selection.id;
        var adj = buildAdjacency(data.edges);
        var maxHops = viewDistance - 1; // 1 => 0 hops (only center), 2 => 1 hop, etc.
        var allowedIds = nodesWithinHops(adj, centerId, maxHops);
        var nodes = data.nodes.filter(function(n) { return allowedIds.has(n.id); });
        var edges = data.edges.filter(function(e) {
            return allowedIds.has(e.source) && allowedIds.has(e.target);
        });
        return { nodes: nodes, edges: edges };
    }

    /**
     * Public API.
     * @param {object|null} selection - { type, id, label } or null
     * @param {object} data - { nodes, edges, triples }
     * @param {string|number} viewDistance - 'all' or 1, 2, 3, 4
     * @returns {{ nodes: Array, edges: Array }}
     */
    function getSubgraph(selection, data, viewDistance) {
        if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
            return { nodes: [], edges: [] };
        }
        if (viewDistance === 'all' || viewDistance == null) {
            if (!selection) {
                return { nodes: data.nodes, edges: data.edges };
            }
            // With selection, "all" still means full graph (entire TTL)
            return { nodes: data.nodes, edges: data.edges };
        }
        if (!selection) {
            return { nodes: data.nodes, edges: data.edges };
        }

        // Data types and Object relations: distance does not apply; show full selection subgraph
        if (selection.type === 'relations' || selection.type === 'dataTypes') {
            var base = getBaseSubgraph(selection, data);
            var nodeList = data.nodes.filter(function(n) { return base.nodeIds.has(n.id); });
            return { nodes: nodeList, edges: base.edges };
        }

        // Entities and Classes: apply view by node distance
        if (selection.type === 'entities' || selection.type === 'classes') {
            var vd = typeof viewDistance === 'number' ? viewDistance : parseInt(viewDistance, 10);
            if (vd === 1 || vd === 0) {
                // By 0/1: only the selected entity/class node (no edges)
                var single = data.nodes.filter(function(n) { return n.id === selection.id; });
                return { nodes: single, edges: [] };
            }
            if (vd >= 2) {
                return applyDistanceToEntityOrClass(selection, data, vd);
            }
        }

        // Fallback: base subgraph
        var base2 = getBaseSubgraph(selection, data);
        var nodeList2 = data.nodes.filter(function(n) { return base2.nodeIds.has(n.id); });
        return { nodes: nodeList2, edges: base2.edges };
    }

    return {
        getSubgraph: getSubgraph,
        RDF_TYPE: RDF_TYPE
    };
})();
