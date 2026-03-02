# TTL Graph Visualizer

A modern web-based application for visualizing RDF/Turtle (TTL) files using Cytoscape.js, an open-source graph visualization library.

## Features

- 🔷 **Interactive Graph Visualization**: Beautiful, interactive graph visualization powered by Cytoscape.js
- 📁 **File Upload**: Easy drag-and-drop or click to upload TTL files
- 🎨 **Multiple Layouts**: Switch between different graph layouts (Dagre, Breadthfirst, Grid, Circle, Cose)
- 🎯 **Node Types**: Color-coded nodes for subjects, predicates, and objects
- 📊 **Graph Statistics**: Real-time display of node and edge counts
- 🔍 **Interactive Exploration**: Zoom, pan, and click nodes to explore the graph
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- A local web server (optional, but recommended)

### Installation

1. **Clone or download** this repository

2. **Option 1: Simple HTTP Server (Recommended)**

   Using Python 3:
   ```bash
   python -m http.server 8000
   ```

   Using Node.js:
   ```bash
   npx http-server -p 8000
   ```

   Using PHP:
   ```bash
   php -S localhost:8000
   ```

3. **Option 2: Open Directly**

   You can also open `index.html` directly in your browser, though some features may be limited due to CORS restrictions.

4. **Access the application**

   Open your browser and navigate to:
   ```
   http://localhost:8000
   ```

## Usage

1. **Upload a TTL File**
   - Click the "Choose TTL File" button
   - Select a `.ttl`, `.turtle`, or `.rdf` file from your computer

2. **Load the Graph**
   - Click the "Load Graph" button
   - The graph will be parsed and visualized automatically

3. **Explore the Graph**
   - **Zoom**: Use mouse wheel or pinch gesture
   - **Pan**: Click and drag the background
   - **Select Nodes**: Click on nodes to see details in the console
   - **Change Layout**: Click "Change Layout" to cycle through different layouts

4. **Reset**
   - Click "Reset" to clear the current graph and start over

## File Format Support

The application supports standard RDF/Turtle format:

- **Subjects**: Resources (nodes in blue)
- **Predicates**: Properties/relationships (nodes in orange)
- **Objects**: Values or other resources (nodes in green)
- **Triples**: Subject-Predicate-Object relationships (edges)

### Example TTL Format

```turtle
@prefix ex: <http://example.org/> .
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

ex:John rdf:type ex:Person .
ex:John ex:hasName "John Doe" .
ex:John ex:worksAt ex:Company .
ex:Company rdf:type ex:Organization .
```

## Graph Layouts

The application supports multiple layout algorithms:

1. **Dagre**: Hierarchical layout (default)
2. **Breadthfirst**: Tree-like layout
3. **Grid**: Regular grid arrangement
4. **Circle**: Circular arrangement
5. **Cose**: Force-directed layout

Click "Change Layout" to cycle through these options.

## Technologies Used

- **Cytoscape.js**: Graph visualization library
- **N3.js**: RDF/Turtle parser for JavaScript
- **Dagre**: Graph layout algorithm
- **HTML5/CSS3**: Modern web standards
- **Vanilla JavaScript**: No framework dependencies

## Browser Compatibility

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Opera (latest)

## Troubleshooting

### File Won't Load

- Ensure the file is a valid TTL/Turtle format
- Check browser console for error messages
- Try a different TTL file to verify the application works

### Graph Not Displaying

- Check that the TTL file contains valid RDF triples
- Verify the file was loaded successfully (check file name display)
- Try refreshing the page and loading again

### Performance Issues

- Large graphs (>1000 nodes) may take longer to render
- Try using different layouts for better performance
- Consider filtering or subsetting very large TTL files

## License

This project uses open-source libraries:
- Cytoscape.js: MIT License
- N3.js: MIT License
- Dagre: MIT License

## Contributing

Feel free to submit issues, fork the repository, and create pull requests for any improvements.

## Support

For issues or questions, please check the browser console for error messages and ensure your TTL file follows the standard RDF/Turtle format.

