/**
 * Right pane: selection details and graph container.
 * Shows selected entity/class/relation/datatype and its relations; graph is rendered in graphContainer by TTLGraph.
 */

var RightPane = (function() {
    var detailEl = null;
    var graphContainerEl = null;
    var triples = [];
    var nodes = [];

    function render(container, graphContainer) {
        detailEl = container;
        graphContainerEl = graphContainer;
        if (detailEl) detailEl.innerHTML = '<p class="right-pane-placeholder">Select an entity, class, data type, or relation from the left pane.</p>';
    }

    function setData(data) {
        triples = data.triples || [];
        nodes = data.nodes || [];
    }

    function setSelection(selection, fullData) {
        if (fullData) setData(fullData);
        if (!detailEl) return;
        if (!selection) {
            detailEl.innerHTML = '<p class="right-pane-placeholder">Select an entity, class, data type, or relation from the left pane.</p>';
            return;
        }
        var relevant = getRelevantTriples(selection);
        var html = '<div class="right-pane-detail">';
        html += '<h2 class="right-pane-title toggle-header" data-expanded="1" tabindex="0" role="button">';
        html += '<span class="toggle-icon" aria-hidden="true">&#9660;</span> ';
        html += escapeHtml(selection.label) + '</h2>';
        html += '<div class="right-pane-detail-body">';
        html += '<p class="right-pane-meta">' + selection.type + ' &middot; ' + escapeHtml(selection.id) + '</p>';
        if (relevant.length > 0) {
            html += '<h3 class="relations-header toggle-header" data-expanded="1" tabindex="0" role="button">';
            html += '<span class="toggle-icon" aria-hidden="true">&#9660;</span> Relations</h3>';
            html += '<ul class="right-pane-triples">';
            relevant.forEach(function(t) {
                var subj = t.subjectLabel != null ? t.subjectLabel : t.subject;
                var obj = t.objectLabel != null ? t.objectLabel : t.object;
                html += '<li><span class="subj">' + escapeHtml(subj) + '</span> <span class="pred">' + escapeHtml(t.predicateLabel) + '</span> &rarr; <span class="obj">' + escapeHtml(obj) + '</span></li>';
            });
            html += '</ul>';
        } else {
            html += '<p>No relations for this selection.</p>';
        }
        html += '</div></div>';
        detailEl.innerHTML = html;
        bindDetailToggles();
    }

    function bindDetailToggles() {
        if (!detailEl) return;
        detailEl.querySelectorAll('.toggle-header').forEach(function(h) {
            h.addEventListener('click', function() {
                var expanded = this.getAttribute('data-expanded') === '1';
                var icon = this.querySelector('.toggle-icon');
                var body = this.nextElementSibling;
                if (body) body.style.display = expanded ? 'none' : 'block';
                this.setAttribute('data-expanded', expanded ? '0' : '1');
                if (icon) icon.textContent = expanded ? '\u25B6' : '\u9660';
            });
            h.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.click();
                }
            });
        });
    }

    function getRelevantTriples(selection) {
        var out = [];
        var id = selection.id;
        var type = selection.type;
        var nodeMap = {};
        nodes.forEach(function(n) { nodeMap[n.id] = n.label; });
        triples.forEach(function(t) {
            var predLabel = t.predicateLabel != null ? t.predicateLabel : getShortName(t.predicate);
            var subjLabel = nodeMap[t.subject] != null ? nodeMap[t.subject] : t.subject;
            var objLabel = nodeMap[t.object] != null ? nodeMap[t.object] : t.object;
            var include = false;
            if (type === 'entities' && (t.subject === id || t.object === id)) include = true;
            if (type === 'classes' && t.predicate === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' && t.object === id) include = true;
            if (type === 'relations' && t.predicate === id) include = true;
            if (type === 'dataTypes' && t.datatype === id) include = true;
            if (include) out.push({ subject: t.subject, subjectLabel: subjLabel, predicate: t.predicate, object: t.object, predicateLabel: predLabel, objectLabel: objLabel });
        });
        return out;
    }

    function escapeHtml(s) {
        if (s == null) return '';
        var div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    return {
        render: render,
        setData: setData,
        setSelection: setSelection,
        getGraphContainer: function() { return graphContainerEl; }
    };
})();
