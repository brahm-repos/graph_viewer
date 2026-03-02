/**
 * TTL parsing and extraction of entities, classes, data types, and relations.
 * Depends: N3 (global), getShortName from utils.js
 */

var TTLParser = (function() {
    var RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

    function parseTTLContent(content) {
        return new Promise(function(resolve, reject) {
            var parser = new N3.Parser();
            var store = new N3.Store();

            parser.parse(content, function(error, quad, prefixes) {
                if (error) {
                    reject(error);
                    return;
                }
                if (quad) {
                    store.addQuad(quad);
                } else {
                    var nodes = new Map();
                    var edges = [];
                    var entityIds = new Set();
                    var classIds = new Map();
                    var dataTypes = new Map();
                    var relations = new Map();
                    var triples = [];

                    store.forEach(function(q) {
                        var subject = q.subject.value;
                        var predicate = q.predicate.value;
                        var obj = q.object;
                        var objectVal = obj.value;
                        var isLiteral = obj.termType === 'Literal';

                        if (!nodes.has(subject)) {
                            nodes.set(subject, {
                                id: subject,
                                label: getShortName(subject),
                                type: 'subject',
                                fullName: subject
                            });
                            entityIds.add(subject);
                        }
                        if (!nodes.has(objectVal)) {
                            nodes.set(objectVal, {
                                id: objectVal,
                                label: isLiteral ? objectVal : getShortName(objectVal),
                                type: isLiteral ? 'object' : 'subject',
                                fullName: objectVal,
                                isLiteral: isLiteral
                            });
                            if (!isLiteral) entityIds.add(objectVal);
                        }
                        edges.push({
                            source: subject,
                            target: objectVal,
                            label: getShortName(predicate),
                            fullName: predicate
                        });
                        triples.push({
                            subject: subject,
                            predicate: predicate,
                            predicateLabel: getShortName(predicate),
                            object: objectVal,
                            objectLiteral: isLiteral,
                            datatype: isLiteral && obj.datatype ? obj.datatype.value : null
                        });

                        relations.set(predicate, { id: predicate, label: getShortName(predicate) });
                        if (predicate === RDF_TYPE && !isLiteral) {
                            classIds.set(objectVal, { id: objectVal, label: getShortName(objectVal) });
                        }
                        if (isLiteral && obj.datatype) {
                            var dt = obj.datatype.value;
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

                    resolve({
                        nodes: Array.from(nodes.values()),
                        edges: edges,
                        entities: entities,
                        classes: classesList,
                        dataTypes: dataTypesList,
                        relations: relationsList,
                        triples: triples
                    });
                }
            });
        }).then(function(result) {
            return {
                nodes: Array.isArray(result.nodes) ? result.nodes : [],
                edges: Array.isArray(result.edges) ? result.edges : [],
                entities: Array.isArray(result.entities) ? result.entities : [],
                classes: Array.isArray(result.classes) ? result.classes : [],
                dataTypes: Array.isArray(result.dataTypes) ? result.dataTypes : [],
                relations: Array.isArray(result.relations) ? result.relations : [],
                triples: Array.isArray(result.triples) ? result.triples : []
            };
        });
    }

    function parseTTLFile(file) {
        return new Promise(function(resolve, reject) {
            var reader = new FileReader();
            reader.onload = function() {
                var content = reader.result;
                if (typeof content !== 'string') {
                    reject(new Error('File content is not text'));
                    return;
                }
                parseTTLContent(content).then(resolve).catch(reject);
            };
            reader.onerror = function() { reject(reader.error); };
            reader.readAsText(file);
        });
    }

    function loadTTLFromURL(url) {
        return fetch(url).then(function(res) {
            if (!res.ok) throw new Error('Failed to load ' + url + ': ' + res.status);
            return res.text();
        }).then(parseTTLContent);
    }

    return {
        parseTTLContent: parseTTLContent,
        parseTTLFile: parseTTLFile,
        loadTTLFromURL: loadTTLFromURL
    };
})();
