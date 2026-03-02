/**
 * Main app: wires file load, parser, left pane, right pane, graph, and view-by-distance.
 * Subgraph logic lives in js/subgraph.js (SubgraphFilter).
 */

(function() {
    var currentData = null;
    var currentSelection = null;
    var leftPaneEl, rightPaneDetailEl, graphContainerEl, fileInputEl, fileNameEl, loadBtnEl, layoutRadiosEl, viewAllCheckboxEl, nodeCountEl, edgeCountEl, loadingEl;

    function isViewAll() {
        var el = document.getElementById('view-all');
        return el && el.checked; /* "View all" radio */
    }

    /**
     * Apply graph and counts: full graph when "View all" is checked, else selected item's subgraph.
     */
    function applyGraphFromSelection() {
        if (!currentData) return;
        var sub;
        if (isViewAll()) {
            sub = { nodes: currentData.nodes, edges: currentData.edges };
        } else {
            sub = SubgraphFilter.getSubgraph(currentSelection, currentData, 'selection');
        }
        TTLGraph.setData(sub.nodes, sub.edges);
        var highlightId = (currentSelection && (currentSelection.type === 'entities' || currentSelection.type === 'classes')) ? currentSelection.id : null;
        TTLGraph.setSelection(highlightId);
        if (isViewAll()) {
            TTLGraph.fitAll(50);
        }
        nodeCountEl.textContent = sub.nodes.length;
        edgeCountEl.textContent = sub.edges.length;
    }

    function getDOM() {
        if (leftPaneEl) return;
        leftPaneEl = document.getElementById('left-pane');
        rightPaneDetailEl = document.getElementById('right-pane-detail');
        graphContainerEl = document.getElementById('graph-container');
        fileInputEl = document.getElementById('ttl-file');
        fileNameEl = document.getElementById('file-name');
        loadBtnEl = document.getElementById('load-btn');
        layoutRadiosEl = document.getElementById('layout-radios');
        viewAllCheckboxEl = document.getElementById('view-all');
        nodeCountEl = document.getElementById('node-count');
        edgeCountEl = document.getElementById('edge-count');
        loadingEl = document.getElementById('loading');
    }

    function ensureElements() {
        var required = [
            { el: graphContainerEl, id: 'graph-container' },
            { el: fileInputEl, id: 'ttl-file' },
            { el: loadBtnEl, id: 'load-btn' },
            { el: leftPaneEl, id: 'left-pane' },
            { el: rightPaneDetailEl, id: 'right-pane-detail' }
        ];
        for (var i = 0; i < required.length; i++) {
            if (!required[i].el) {
                console.error('[App] Missing DOM element: #' + required[i].id);
                return false;
            }
        }
        return true;
    }

    function onSelect(selection) {
        currentSelection = selection;
        RightPane.setSelection(selection, currentData);
        if (!currentData) return;
        applyGraphFromSelection();
    }

    function loadData(data) {
        if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
            console.error('[App] loadData: invalid or missing data', data);
            throw new Error('Invalid graph data: expected nodes and edges from parser');
        }
        currentData = data;
        currentSelection = null;
        LeftPane.render(leftPaneEl, {
            entities: data.entities,
            classes: data.classes,
            dataTypes: data.dataTypes,
            relations: data.relations
        }, onSelect);

        if (data.entities && data.entities.length > 0) {
            var firstEntity = { type: 'entities', id: data.entities[0].id, label: data.entities[0].label };
            currentSelection = firstEntity;
            LeftPane.setSelectionFromItem(firstEntity);
            RightPane.setSelection(firstEntity, data);
            var viewHopsRadio = document.getElementById('view-hops');
            if (viewHopsRadio) viewHopsRadio.checked = true;
            var sub = SubgraphFilter.getSubgraph(firstEntity, data, 'selection');
            TTLGraph.setData(sub.nodes, sub.edges);
            TTLGraph.setSelection(firstEntity.id);
            nodeCountEl.textContent = sub.nodes.length;
            edgeCountEl.textContent = sub.edges.length;
        } else {
            RightPane.setSelection(null, data);
            TTLGraph.setData(data.nodes, data.edges);
            TTLGraph.setSelection(null);
            nodeCountEl.textContent = data.nodes.length;
            edgeCountEl.textContent = data.edges.length;
        }
    }

    function bindEvents() {
        if (!fileInputEl || !loadBtnEl) {
            console.error('[App] Cannot bind events: missing file input or load button');
            return;
        }
        function loadSelectedFile() {
            var file = fileInputEl.files[0];
            if (!file) return;
            if (loadingEl) loadingEl.classList.remove('hidden');
            loadBtnEl.disabled = true;
            TTLParser.parseTTLFile(file)
                .then(function(data) {
                    if (!data || !Array.isArray(data.nodes)) {
                        alert('Error: parser did not return valid graph data. Try another file.');
                        return;
                    }
                    loadData(data);
                })
                .catch(function(err) {
                    alert('Error parsing TTL file: ' + (err && err.message ? err.message : String(err)));
                })
                .finally(function() {
                    if (loadingEl) loadingEl.classList.add('hidden');
                    loadBtnEl.disabled = false;
                });
        }

        fileInputEl.addEventListener('change', function() {
            var file = fileInputEl.files[0];
            if (file) {
                fileNameEl.textContent = file.name;
                loadBtnEl.disabled = false;
                loadSelectedFile();
            } else {
                fileNameEl.textContent = 'No file selected';
                loadBtnEl.disabled = true;
            }
        });

        loadBtnEl.addEventListener('click', function() {
            var file = fileInputEl.files[0];
            if (!file) {
                alert('Please select a TTL file first.');
                return;
            }
            loadSelectedFile();
        });

        var sourceTypeRadios = document.querySelectorAll('input[name="source-type"]');
        var sourceOptionsFieldset = document.getElementById('source-options');
        if (sourceOptionsFieldset) {
            function updateSourcePanels() {
                var sparqlChecked = document.getElementById('source-sparql') && document.getElementById('source-sparql').checked;
                sourceOptionsFieldset.classList.toggle('source-sparql-active', !!sparqlChecked);
            }
            if (sourceTypeRadios.length) {
                sourceTypeRadios.forEach(function(radio) {
                    radio.addEventListener('change', updateSourcePanels);
                });
            }
            updateSourcePanels();
        }

        var sparqlFetchBtn = document.getElementById('sparql-fetch');
        var sparqlEndpointInput = document.getElementById('sparql-endpoint');
        var sparqlQueryInput = document.getElementById('sparql-query');
        if (sparqlFetchBtn && sparqlEndpointInput && sparqlQueryInput) {
            sparqlFetchBtn.addEventListener('click', function() {
                var endpoint = (sparqlEndpointInput.value || '').trim();
                var query = (sparqlQueryInput.value || '').trim();
                if (!endpoint) {
                    alert('Enter a SPARQL endpoint URL.');
                    return;
                }
                if (!query) {
                    alert('Enter a SPARQL SELECT query (e.g. SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 500).');
                    return;
                }
                if (loadingEl) loadingEl.classList.remove('hidden');
                sparqlFetchBtn.disabled = true;
                SparqlClient.fetchFromEndpoint(endpoint, query)
                    .then(function(data) {
                        if (!data || !Array.isArray(data.nodes)) {
                            alert('Endpoint returned no graph data. Check that your query returns at least 3 variables (e.g. ?s ?p ?o).');
                            return;
                        }
                        loadData(data);
                    })
                    .catch(function(err) {
                        alert('SPARQL error: ' + (err && err.message ? err.message : String(err)));
                    })
                    .finally(function() {
                        if (loadingEl) loadingEl.classList.add('hidden');
                        sparqlFetchBtn.disabled = false;
                    });
            });
        }

        if (layoutRadiosEl) {
            layoutRadiosEl.addEventListener('change', function(e) {
                var radio = e.target;
                if (radio.name !== 'layout' || !radio.value) return;
                if (!currentData || !currentData.nodes.length) {
                    alert('Load a graph first.');
                    return;
                }
                TTLGraph.setLayout(radio.value);
            });
        }
        var viewModeRadios = document.querySelectorAll('input[name="view-mode"]');
        if (viewModeRadios.length) {
            viewModeRadios.forEach(function(radio) {
                radio.addEventListener('change', function() {
                    if (document.getElementById('view-all').checked) {
                        applyGraphFromSelection();
                    }
                });
            });
        }
        var applyHopsBtn = document.getElementById('apply-hops');
        var maxHopsInput = document.getElementById('max-hops');
        if (applyHopsBtn && maxHopsInput) {
            applyHopsBtn.addEventListener('click', function() {
                if (!currentData || !currentData.nodes.length) {
                    alert('Load a graph first.');
                    return;
                }
                var sel = currentSelection;
                if (!sel || (sel.type !== 'entities' && sel.type !== 'classes')) {
                    alert('Select an entity or class in the left pane first.');
                    return;
                }
                var hops = parseInt(maxHopsInput.value, 10);
                if (isNaN(hops) || hops < 0) {
                    alert('Enter a non-negative number of hops (e.g. 0, 1, 2).');
                    return;
                }
                var viewHopsRadio = document.getElementById('view-hops');
                if (viewHopsRadio) viewHopsRadio.checked = true;
                var viewDistance = hops + 1;
                var sub = SubgraphFilter.getSubgraph(sel, currentData, viewDistance);
                TTLGraph.setData(sub.nodes, sub.edges);
                TTLGraph.setSelection(sel.id);
                nodeCountEl.textContent = sub.nodes.length;
                edgeCountEl.textContent = sub.edges.length;
            });
        }
        var zoomInBtn = document.getElementById('zoom-in');
        var zoomOutBtn = document.getElementById('zoom-out');
        if (zoomInBtn) zoomInBtn.addEventListener('click', function() { TTLGraph.zoomIn(); });
        if (zoomOutBtn) zoomOutBtn.addEventListener('click', function() { TTLGraph.zoomOut(); });

        var headerToggleBtn = document.getElementById('header-toggle');
        var appHeader = document.getElementById('app-header');
        if (headerToggleBtn && appHeader) {
            headerToggleBtn.addEventListener('click', function() {
                var collapsed = appHeader.classList.toggle('collapsed');
                headerToggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
                headerToggleBtn.textContent = '\u9660';
            });
        }
    }

    function init() {
        getDOM();
        if (!ensureElements()) {
            console.error('[App] Required DOM elements missing. Check that index.html has #graph-container, #ttl-file, #load-btn, #left-pane, #right-pane-detail.');
            return;
        }
        TTLGraph.init(graphContainerEl);
        RightPane.render(rightPaneDetailEl, graphContainerEl);
        bindEvents();

        if (loadingEl) loadingEl.classList.remove('hidden');
        TTLParser.loadTTLFromURL('example.ttl')
            .then(function(data) {
                if (data && Array.isArray(data.nodes)) {
                    loadData(data);
                    fileNameEl.textContent = 'example.ttl';
                }
            })
            .catch(function() {
                if (fileNameEl) fileNameEl.textContent = 'No file selected';
            })
            .finally(function() {
                if (loadingEl) loadingEl.classList.add('hidden');
            });
    }

    document.addEventListener('DOMContentLoaded', init);
})();
