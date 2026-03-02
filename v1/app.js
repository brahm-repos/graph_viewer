// Initialize Cytoscape
let cy;
let currentLayout = 'dagre';
let graphData = { nodes: [], edges: [] };

// DOM refs – only place we read from document; Cytoscape renders the graph, we use refs for app shell UI
let dom;
function getDOM() {
    if (dom) return dom;
    dom = {
        container: document.getElementById('cy'),
        fileInput: document.getElementById('ttl-file'),
        fileName: document.getElementById('file-name'),
        loadBtn: document.getElementById('load-btn'),
        resetBtn: document.getElementById('reset-btn'),
        layoutBtn: document.getElementById('layout-btn'),
        nodeCount: document.getElementById('node-count'),
        edgeCount: document.getElementById('edge-count'),
        loading: document.getElementById('loading')
    };
    return dom;
}

// Layout options
const layouts = {
    dagre: {
        name: 'dagre',
        rankDir: 'TB',
        nodeSep: 50,
        edgeSep: 20,
        rankSep: 80
    },
    breadthfirst: {
        name: 'breadthfirst',
        directed: true,
        spacingFactor: 1.5
    },
    grid: {
        name: 'grid',
        rows: undefined,
        cols: undefined
    },
    circle: {
        name: 'circle',
        radius: 200
    },
    cose: {
        name: 'cose',
        quality: 'default',
        nodeRepulsion: 4500,
        idealEdgeLength: 100
    }
};

let currentLayoutIndex = 0;
const layoutNames = Object.keys(layouts);

// Initialize Cytoscape instance (graph rendering is 100% Cytoscape; container is the only DOM node it needs)
function initCytoscape() {
    console.log('[App] Cytoscape initializing');
    const d = getDOM();
    cy = cytoscape({
        container: d.container,
        elements: [],
        style: [
            {
                selector: 'node',
                style: {
                    'background-color': function(ele) {
                        const type = ele.data('type');
                        if (type === 'subject') return '#667eea';
                        if (type === 'predicate') return '#f39c12';
                        return '#27ae60'; // object
                    },
                    'label': 'data(label)',
                    'width': 60,
                    'height': 60,
                    'shape': 'ellipse',
                    'border-width': 2,
                    'border-color': '#333',
                    'color': '#fff',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'font-size': '12px',
                    'font-weight': 'bold',
                    'text-wrap': 'wrap',
                    'text-max-width': '80px',
                    'text-overflow-wrap': 'anywhere'
                }
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
                    'font-size': '11px',
                    'text-rotation': 'autorotate',
                    'text-margin-y': -10,
                    'color': '#333',
                    'text-background-color': '#fff',
                    'text-background-opacity': 0.8,
                    'text-background-padding': '3px'
                }
            }
        ],
        layout: layouts.dagre
    });

    // Add zoom controls
    cy.on('tap', 'node', function(evt) {
        const node = evt.target;
        console.log('[User] Node clicked:', node.data());
    });

    // Pan and zoom
    cy.userPanningEnabled(true);
    cy.boxSelectionEnabled(true);
    cy.zoomingEnabled(true);
    cy.minZoom(0.1);
    cy.maxZoom(2);
}

// Parse TTL content (string) using N3.js - shared by file and URL loading
function parseTTLContent(content) {
    return new Promise((resolve, reject) => {
        const parser = new N3.Parser();
        const store = new N3.Store();

        parser.parse(content, (error, quad, prefixes) => {
            if (error) {
                reject(error);
                return;
            }

            if (quad) {
                store.addQuad(quad);
            } else {
                // Parsing complete
                const nodes = new Map();
                const edges = [];

                store.forEach((quad) => {
                    const subject = quad.subject.value;
                    const predicate = quad.predicate.value;
                    const object = quad.object.value;

                    if (!nodes.has(subject)) {
                        nodes.set(subject, {
                            id: subject,
                            label: getShortName(subject),
                            type: 'subject',
                            fullName: subject
                        });
                    }

                    if (!nodes.has(object)) {
                        const isLiteral = quad.object.termType === 'Literal';
                        nodes.set(object, {
                            id: object,
                            label: isLiteral ? object : getShortName(object),
                            type: isLiteral ? 'object' : 'subject',
                            fullName: object,
                            isLiteral: isLiteral
                        });
                    }

                    edges.push({
                        source: subject,
                        target: object,
                        label: getShortName(predicate),
                        fullName: predicate
                    });
                });

                resolve({
                    nodes: Array.from(nodes.values()),
                    edges: edges
                });
            }
        });
    }).then(function(result) {
        // Guarantee shape so callers never get undefined
        return {
            nodes: Array.isArray(result?.nodes) ? result.nodes : [],
            edges: Array.isArray(result?.edges) ? result.edges : []
        };
    });
}

// Parse TTL file using N3.js – always returns { nodes, edges } (never undefined)
async function parseTTLFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const content = e.target.result;
                if (typeof content !== 'string') {
                    reject(new Error('File content is not text'));
                    return;
                }
                const data = await parseTTLContent(content);
                const out = {
                    nodes: Array.isArray(data?.nodes) ? data.nodes : [],
                    edges: Array.isArray(data?.edges) ? data.edges : []
                };
                resolve(out);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
}

// Load and parse TTL from a URL (e.g. example.ttl when served by a local server)
async function loadTTLFromURL(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
    const content = await res.text();
    return parseTTLContent(content);
}

// Get short name from URI
function getShortName(uri) {
    if (!uri) return '';
    
    // Check if it's a literal
    if (uri.startsWith('"') || uri.startsWith("'")) {
        return uri.replace(/^["']|["']$/g, '').substring(0, 30);
    }
    
    // Try to extract local name after # or /
    const hashIndex = uri.lastIndexOf('#');
    const slashIndex = uri.lastIndexOf('/');
    const index = Math.max(hashIndex, slashIndex);
    
    if (index !== -1 && index < uri.length - 1) {
        return uri.substring(index + 1);
    }
    
    // Return last 30 characters if no separator found
    return uri.length > 30 ? '...' + uri.substring(uri.length - 27) : uri;
}

// Load graph into Cytoscape
function loadGraph(data) {
    if (!cy) {
        console.error('[App] Cytoscape not initialized');
        return;
    }
    if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
        console.error('[App] loadGraph: invalid data', data);
        throw new Error('Invalid graph data: expected { nodes, edges } from parser');
    }
    console.log('[App] Graph loaded:', { nodes: data.nodes.length, edges: data.edges.length });
    graphData = data;

    const elements = [];

    // Add nodes
    data.nodes.forEach(node => {
        elements.push({
            data: {
                id: node.id,
                label: node.label,
                type: node.type,
                fullName: node.fullName
            }
        });
    });
    
    // Add edges
    data.edges.forEach((edge, index) => {
        elements.push({
            data: {
                id: `edge-${index}`,
                source: edge.source,
                target: edge.target,
                label: edge.label,
                fullName: edge.fullName
            }
        });
    });
    
    cy.elements().remove();
    cy.add(elements);

    // Update layout (Cytoscape layout API)
    applyLayout();

    // Update UI counts from Cytoscape instance (source of truth for graph)
    const d = getDOM();
    d.nodeCount.textContent = cy.nodes().length;
    d.edgeCount.textContent = cy.edges().length;

    cy.fit(undefined, 50);
}

// Apply layout
function applyLayout() {
    const layoutName = layoutNames[currentLayoutIndex];
    const layoutConfig = layouts[layoutName];
    
    cy.layout(layoutConfig).run();
}

// Event listeners (use dom refs; graph state from Cytoscape)
function bindEvents() {
    const d = getDOM();
    d.fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            console.log('[User] File selected:', file.name, '(size:', file.size, 'bytes)');
            d.fileName.textContent = file.name;
            d.loadBtn.disabled = false;
        } else {
            console.log('[User] File selection cleared');
            d.fileName.textContent = 'No file selected';
            d.loadBtn.disabled = true;
        }
    });

    d.loadBtn.addEventListener('click', async function() {
        const d = getDOM();
        const file = d.fileInput.files[0];
        if (!file) {
            console.log('[User] Load clicked with no file selected');
            alert('Please select a TTL file first.');
            return;
        }
        console.log('[User] Load clicked for file:', file.name);
        d.loading.classList.remove('hidden');
        d.loadBtn.disabled = true;
        try {
            const data = await parseTTLFile(file);
            if (!data || !Array.isArray(data.nodes)) {
                console.error('[App] Parser returned invalid data:', data);
                alert('Error: parser did not return graph data. Check the TTL file or try another file.');
                return;
            }
            loadGraph(data);
            console.log('[App] Load response: success, nodes:', cy.nodes().length, 'edges:', cy.edges().length);
        } catch (error) {
            console.error('[App] Load response: error', error);
            alert('Error parsing TTL file: ' + (error && error.message ? error.message : String(error)));
        } finally {
            d.loading.classList.add('hidden');
            d.loadBtn.disabled = false;
        }
    });

    d.resetBtn.addEventListener('click', function() {
        console.log('[User] Reset clicked');
        cy.elements().remove();
        const d = getDOM();
        d.nodeCount.textContent = '0';
        d.edgeCount.textContent = '0';
        d.fileName.textContent = 'No file selected';
        d.fileInput.value = '';
        d.loadBtn.disabled = true;
        graphData = { nodes: [], edges: [] };
        currentLayoutIndex = 0;
        console.log('[App] Reset response: graph cleared');
    });

    d.layoutBtn.addEventListener('click', function() {
        if (cy.nodes().length === 0) {
            console.log('[User] Change layout clicked with no graph loaded');
            alert('Please load a graph first.');
            return;
        }
        currentLayoutIndex = (currentLayoutIndex + 1) % layoutNames.length;
        const layoutName = layoutNames[currentLayoutIndex];
        console.log('[User] Change layout clicked, applying:', layoutName);
        applyLayout();
        console.log('[App] Layout response: applied', layoutName);
        this.textContent = `Layout: ${layoutName}`;
        setTimeout(() => {
            this.textContent = 'Change Layout';
        }, 2000);
    });
}

// Initialize on page load – document used only here and inside getDOM()
document.addEventListener('DOMContentLoaded', function() {
    console.log('[App] Page loaded, initializing');
    getDOM();
    bindEvents();
    initCytoscape();

    function runAutoLoad() {
        const d = getDOM();
        d.loading.classList.remove('hidden');
        console.log('[App] Auto-loading example.ttl');
        loadTTLFromURL('example.ttl')
            .then(function(data) {
                d.fileName.textContent = 'example.ttl';
                loadGraph(data);
                console.log('[App] Auto-load response: success, nodes:', cy.nodes().length, 'edges:', cy.edges().length);
            })
            .catch(function(err) {
                console.warn('[App] Auto-load response: failed', err.message);
                d.fileName.textContent = 'No file selected';
            })
            .finally(function() {
                d.loading.classList.add('hidden');
            });
    }
    setTimeout(runAutoLoad, 0);
});

