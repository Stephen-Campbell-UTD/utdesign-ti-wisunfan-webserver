import Pane from './Pane';
import Tile, {TileHeader} from './Tile';
import PingConfig from './PingConfig';
import AtAGlance from './AtAGlance';
import Monitor from './Monitor';
import IPAddressTable from './IPAddressTable';
import Topology from './Topology';
import '../App.css';
import {CytoscapeGraph, IPAddressInfo, Pingburst} from '../types';
import {PaneContainer} from './PaneContainer';
import {TileColumns} from './TileColumns';

interface MonitorTabProps {
  ipSelectionHandler: (ip: string, newVal: boolean) => void;
  ipAddressInfoArray: IPAddressInfo[];
  graph: CytoscapeGraph;
  pingbursts: Pingburst[];
}

export default function MonitorTab(props: MonitorTabProps) {
  return (
    <PaneContainer
      maxColumns={2}
      columnWidthMinMax={{min: 530, max: 650}}
      elementOrdering={[
        [[0, 1, 2, 3]],
        [
          [0, 1],
          [2, 3],
        ],
      ]}
      gutterWidth={20}
      style={{width: '91.67vw'}}
    >
      <div className="tile_container_full tile_container_common">
        <Tile title="Topology">
          <Topology
            ipSelectionHandler={props.ipSelectionHandler}
            ipAddressInfoArray={props.ipAddressInfoArray}
            elements={props.graph}
          />
        </Tile>
      </div>
      <div className="tile_container_full tile_container_common">
        <TileHeader title="IP Addresses" />
        <IPAddressTable
          ipSelectionHandler={props.ipSelectionHandler}
          ipAddressInfoArray={props.ipAddressInfoArray}
        />
      </div>
      <TileColumns minColumnWidth={250} gutterWidth={20}>
        <Tile title="Ping Config">
          <PingConfig ipAddressInfoArray={props.ipAddressInfoArray} pingbursts={props.pingbursts} />
        </Tile>
        <Tile title="At A Glance">
          <AtAGlance {...props} />
        </Tile>
      </TileColumns>
      <div className="tile_container_full tile_container_common">
        <Monitor {...props} />
      </div>
    </PaneContainer>
  );
}
