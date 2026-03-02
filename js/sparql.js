/**
 * SPARQL endpoint client: fetch SELECT results and convert to graph data
 * compatible with TTLParser output (nodes, edges, entities, classes, etc.).
 * Depends: getShortName from utils.js
 */

var SparqlClient = (function() {
    var RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

    /**
     * Fetch SPARQL SELECT query from endpoint. Expects JSON results with
     * at least three variables (treated as subject, predicate, object).
     * @param {string} endpointUrl - SPARQL endpoint URL (e.g. https://dbpedia.org/sparql)
     * @param {string} query - SPARQL SELECT query
     * @returns {Promise<{nodes, edges, entities, classes, dataTypes, relations, triples}>}
     */
    function fetchFromEndpoint(endpointUrl, query) {
        if (!endpointUrl || !query || !query.trim()) {
            return Promise.reject(new Error('Endpoint URL and query are required.'));
        }
        var url = endpointUrl.replace(/\?.*$/, '') + '?query=' + encodeURIComponent(query.trim());
        return fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/sparql-results+json' }
        }).then(function(res) {
            if (!res.ok) {
                throw new Error('SPARQL request failed: ' + res.status + ' ' + res.statusText);
            }
            return res.json();
        }).then(function(json) {
            return parseSelectResults(json);
        });
    }

    /**
     * Parse SPARQL 1.1 JSON results and build graph structures.
     * Uses first three variables as subject, predicate, object.
     */
    function parseSelectResults(json) {
        var vars = (json.head && json.head.vars) ? json.head.vars : [];
        var bindings = (json.results && json.results.bindings) ? json.results.bindings : [];
        if (vars.length < 3) {
            return Promise.reject(new Error('Query must return at least 3 variables (e.g. ?s ?p ?o).'));
        }
        var sVar = vars[0];
        var pVar = vars[1];
        var oVar = vars[2];

        var nodes = new Map();
        var edges = [];
        var entityIds = new Set();
        var classIds = new Map();
        var dataTypes = new Map();
        var relations = new Map();
        var triples = [];

        function termValue(binding) {
            if (!binding || typeof binding.type === 'undefined') return null;
            return binding.value;
        }

        function isLiteral(binding) {
            return binding && binding.type === 'literal';
        }

        function addNode(id, label, type, isLiteralFlag) {
            if (!id) return;
            if (!nodes.has(id)) {
                nodes.set(id, {
                    id: id,
                    label: label || getShortName(id),
                    type: type || 'subject',
                    fullName: id,
                    isLiteral: !!isLiteralFlag
                });
                if (!isLiteralFlag) entityIds.add(id);
            }
        }

        bindings.forEach(function(b) {
            var s = termValue(b[sVar]);
            var p = termValue(b[pVar]);
            var oBinding = b[oVar];
            var o = termValue(oBinding);
            if (!s || !p || !o) return;

            var oIsLiteral = isLiteral(oBinding);
            addNode(s, getShortName(s), 'subject', false);
            addNode(o, oIsLiteral ? o : getShortName(o), 'object', oIsLiteral);

            edges.push({
                source: s,
                target: o,
                label: getShortName(p),
                fullName: p
            });
            triples.push({
                subject: s,
                predicate: p,
                predicateLabel: getShortName(p),
                object: o,
                objectLiteral: oIsLiteral,
                datatype: oIsLiteral && oBinding.datatype ? oBinding.datatype.value : null
            });
            relations.set(p, { id: p, label: getShortName(p) });
            if (p === RDF_TYPE && !oIsLiteral) {
                classIds.set(o, { id: o, label: getShortName(o) });
            }
            if (oIsLiteral && oBinding.datatype) {
                var dt = oBinding.datatype.value;
                dataTypes.set(dt, { id: dt, label: getShortName(dt) });
            }
        });

        var entities = Array.from(entityIds)
            .filter(function(id) { return !classIds.has(id); })
            .map(function(id) {
                var n = nodes.get(id);
                return { id: n.id, label: n.label };
            })
            .sort(function(a, b) { return a.label.localeCompare(b.label); });
        var classesList = Array.from(classIds.values()).sort(function(a, b) { return a.label.localeCompare(b.label); });
        var dataTypesList = Array.from(dataTypes.values()).sort(function(a, b) { return a.label.localeCompare(b.label); });
        var relationsList = Array.from(relations.values()).sort(function(a, b) { return a.label.localeCompare(b.label); });

        return {
            nodes: Array.from(nodes.values()),
            edges: edges,
            entities: entities,
            classes: classesList,
            dataTypes: dataTypesList,
            relations: relationsList,
            triples: triples
        };
    }

    return {
        fetchFromEndpoint: fetchFromEndpoint
    };
})();
