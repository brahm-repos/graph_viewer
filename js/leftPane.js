/**
 * Left pane: tabs (Classes, Entities, Object relations, Data types) and list for selected tab.
 * By default Entities tab is selected. Calls onSelect when user selects an item.
 */

var LeftPane = (function() {
    var containerEl = null;
    var onSelectCallback = null;
    var selectedItemEl = null;
    var sections = [];
    var contentEl = null;
    var tabEls = [];
    var defaultTabKey = 'entities';

    function buildList(sectionKey) {
        var section = sections.find(function(s) { return s.key === sectionKey; });
        if (!section) return document.createElement('div');
        var list = document.createElement('ul');
        list.className = 'left-pane-list';
        (section.items || []).forEach(function(item) {
            var li = document.createElement('li');
            li.className = 'left-pane-item';
            li.textContent = item.label;
            li.dataset.type = section.key;
            li.dataset.id = item.id;
            li.dataset.label = item.label;
            li.addEventListener('click', function() {
                setSelectedItem(li);
                if (onSelectCallback) {
                    onSelectCallback({
                        type: section.key,
                        id: item.id,
                        label: item.label
                    });
                }
            });
            list.appendChild(li);
        });
        return list;
    }

    function showTab(tabKey) {
        if (!contentEl) return;
        contentEl.innerHTML = '';
        contentEl.appendChild(buildList(tabKey));
        tabEls.forEach(function(t) {
            t.classList.toggle('active', t.dataset.tab === tabKey);
        });
    }

    function setSelectedItem(el) {
        if (selectedItemEl) selectedItemEl.classList.remove('selected');
        selectedItemEl = el;
        if (el) el.classList.add('selected');
    }

    function render(container, data, onSelect) {
        containerEl = container;
        onSelectCallback = onSelect || function() {};
        if (!containerEl) return;

        containerEl.innerHTML = '';
        selectedItemEl = null;
        tabEls = [];

        sections = [
            { key: 'classes', title: 'Classes', items: data.classes || [] },
            { key: 'entities', title: 'Entities', items: data.entities || [] },
            { key: 'relations', title: 'Object relations', items: data.relations || [] },
            { key: 'dataTypes', title: 'Data types', items: data.dataTypes || [] }
        ];

        var tabsWrap = document.createElement('div');
        tabsWrap.className = 'left-pane-tabs';
        sections.forEach(function(section) {
            var tab = document.createElement('button');
            tab.type = 'button';
            tab.className = 'left-pane-tab';
            tab.dataset.tab = section.key;
            tab.textContent = section.title;
            tab.addEventListener('click', function() {
                showTab(section.key);
            });
            tabsWrap.appendChild(tab);
            tabEls.push(tab);
        });
        containerEl.appendChild(tabsWrap);

        contentEl = document.createElement('div');
        contentEl.className = 'left-pane-content';
        containerEl.appendChild(contentEl);

        var activeKey = defaultTabKey;
        if (!data.entities || data.entities.length === 0) {
            if (data.classes && data.classes.length > 0) activeKey = 'classes';
            else if (data.relations && data.relations.length > 0) activeKey = 'relations';
            else if (data.dataTypes && data.dataTypes.length > 0) activeKey = 'dataTypes';
        }
        showTab(activeKey);
    }

    /**
     * Programmatically select an item (e.g. first entity on load). Shows the right tab and highlights the list item.
     */
    function setSelectionFromItem(selection) {
        if (!selection || !contentEl) return;
        showTab(selection.type);
        var items = contentEl.querySelectorAll('.left-pane-item');
        for (var i = 0; i < items.length; i++) {
            if (items[i].dataset.type === selection.type && items[i].dataset.id === selection.id) {
                setSelectedItem(items[i]);
                return;
            }
        }
    }

    function clearSelection() {
        setSelectedItem(null);
    }

    return {
        render: render,
        setSelectionFromItem: setSelectionFromItem,
        clearSelection: clearSelection
    };
})();
