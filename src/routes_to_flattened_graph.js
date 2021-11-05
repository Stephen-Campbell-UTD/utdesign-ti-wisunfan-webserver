/**
 *
 *  Input:
 *
 *  Example:
 *  [Route1,Route2, ..., RouteN]
 *
 *  Definitions:
 *  Route:=  [NodeID1, NodeID2, ..., NodeIDN]
 *
 *  NodeID := unique node identifier
 *  NodeID1 = always root Node ID
 *
 *
 *  Output:
 *
 *  {
 *  nodes : [{id:NodeID1}, {id:NodeID2}, ..., {id:NodeIDN}]
 *  edges : [{id:edgeID1, source:NodeID1, target:NodeID2}, ...]
 *  }
 *
 */

function routes_to_flattened_graph(routes) {
  let nodes = [];
  //populate nodes
  for (route of routes) {
    for (ip_address of route) {
      if (!nodes.some((node) => node.id === ip_address)) {
        nodes.push({ id: ip_address });
      }
    }
  }
  //populate edges
  let edges = [];
  for (route of routes) {
    let num_pairs = route.length - 1;
    for (let i = 0; i < num_pairs; i++) {
      edge = {};
      edge.source = route[i];
      edge.target = route[i + 1];
      edge.id = `${edge.source}->${edge.target}`;
      if (!edges.some((other_edge) => other_edge.id === edge.id)) {
        edges.push(edge);
      }
    }
  }
  return { nodes, edges };
}

// module.exports = routes_to_flattened_graph;

if (require.main === module) {
  /*
Example
          A
     ┌───────────┐
     │           │
     B           C
     │
┌───┬┘
│   │
D   E
    │
 ┌──┴──┐
 │     │
 F     G

*/
  let route1 = ['A', 'C'];
  let route2 = ['A', 'B'];
  let route3 = ['A', 'B', 'D'];
  let route4 = ['A', 'B', 'E'];
  let route5 = ['A', 'B', 'E', 'F'];
  let route6 = ['A', 'B', 'E', 'G'];

  let input = [route1, route2, route3, route4, route5, route6];

  console.log(routes_to_flattened_graph(input));
} else {
  console.log('ran');
}
