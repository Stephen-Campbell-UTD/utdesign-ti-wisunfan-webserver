import React from 'react';
import {ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import cytoscape from 'cytoscape';
import CytoscapeComponent from 'react-cytoscapejs';
import dagre from 'cytoscape-dagre';
import produce from 'immer';
import {CytoscapeGraph, IPAddressInfo} from '../types';
import {ComponentThemeImplementations} from '../utils';
cytoscape.use(dagre);

interface TopologyProps {
  ipAddressInfoArray: IPAddressInfo[];
  ipSelectionHandler: (ip: string, isSelected: boolean) => void;
  elements: CytoscapeGraph;
}

interface TopologyTheme {
  stylesheet: cytoscape.Stylesheet[];
}
const topologyThemeImplementations = new ComponentThemeImplementations<TopologyTheme>();
const tiTopologyTheme: TopologyTheme = {
  stylesheet: [
    {
      selector: 'node',
      style: {
        'background-color': ColorScheme.getColor('red', THEME.TI),
      },
    },
    {
      selector: 'edge',
      style: {
        width: 3,
        'line-color': ColorScheme.getColor('gray', THEME.TI),
        'target-arrow-color': ColorScheme.getColor('gray', THEME.TI),
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
      },
    },
    {
      selector: 'node:selected',
      style: {
        'background-color': ColorScheme.getColor('blue', THEME.TI),
      },
    },
  ],
};
topologyThemeImplementations.set(THEME.TI, tiTopologyTheme);
const gruvboxTopologyTheme = {
  stylesheet: [
    {
      selector: 'node',
      style: {
        'background-color': ColorScheme.getColor('orange', THEME.GRUVBOX), //currently no ti orange color so use gruvbox for both,
      },
    },
    {
      selector: 'edge',
      style: {
        width: 3,
        'line-color': ColorScheme.getColor('fg0'),
        'target-arrow-color': ColorScheme.getColor('fg0'),
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
      },
    },
    {
      selector: 'node:selected',
      style: {
        'background-color': ColorScheme.getColor('blue', THEME.GRUVBOX),
      },
    },
  ],
};

topologyThemeImplementations.set(THEME.GRUVBOX, gruvboxTopologyTheme);

export default class Topology extends React.Component<TopologyProps> {
  static contextType = ThemeContext;
  layout = {name: 'dagre'};
  cy: cytoscape.Core | null = null;
  previousTheme: THEME = this.context;

  componentDidMount() {
    if (this.cy === null) {
      return;
    }
    this.cy.on('select', 'node', e => {
      const node = e.target;
      this.props.ipSelectionHandler(node.id(), true);
    });
    this.cy.on('unselect', 'node', e => {
      const node = e.target;
      this.props.ipSelectionHandler(node.id(), false);
    });
    this.cy.on('add', 'node', _evt => {
      if (this.cy === null) {
        return;
      }
      this.cy.layout(this.layout).run();
    });
    document.addEventListener('visibilitychange', this.forceRender);
  }
  forceRender = () => {
    if (this.cy === null) {
      return;
    }
    this.cy.forceRender();
  };
  componentWillUnmount() {
    document.removeEventListener('visibilitychange', this.forceRender);
  }

  componentDidUpdate() {
    if (this.cy === null) {
      return;
    }
    if (this.context !== this.previousTheme) {
      const {stylesheet} = topologyThemeImplementations.get(this.context);
      this.cy.style(stylesheet);
      this.previousTheme = this.context;
    }
  }

  render() {
    const ipInfoArray = this.props.ipAddressInfoArray;
    const unnormalizedElements = produce(this.props.elements, elements => {
      const nodes = elements.nodes;
      for (const node of nodes) {
        const ipInfo = ipInfoArray.find(ipInfo => ipInfo.ipAddress === node.data.id);

        node.selected = ipInfo ? ipInfo.isSelected : false;
      }
    });
    const {stylesheet} = topologyThemeImplementations.get(this.context);
    return (
      <CytoscapeComponent
        elements={CytoscapeComponent.normalizeElements(unnormalizedElements)}
        cy={cy => {
          this.cy = cy;
        }}
        style={{width: '100%', height: 360}}
        layout={this.layout}
        stylesheet={stylesheet}
        wheelSensitivity={0.1}
      />
    );
  }
}
