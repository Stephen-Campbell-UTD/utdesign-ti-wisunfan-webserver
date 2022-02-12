import Pane from './Pane';
import Tile, {TileHeader} from './Tile';
import PingConfig from './PingConfig';
import AtAGlance from './AtAGlance';
import Monitor from './Monitor';
import IPAddressTable from './IPAddressTable';
import Topology from './Topology';
import '../App.css';
import {CytoscapeGraph, IPAddressInfo, Pingburst} from '../types';

interface MonitorTabProps {
  ipSelectionHandler: (ip: string, newVal: boolean) => void;
  ipAddressInfoArray: IPAddressInfo[];
  graph: CytoscapeGraph;
  pingbursts: Pingburst[];
}

export default function MonitorTab(props: MonitorTabProps) {
  return (
    <div className="pane_container" style={{columnGap: '2.87vw'}}>
      <Pane>
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
      </Pane>
      <Pane>
        <div className="tile_container_hstack tile_container_common">
          <div className="tile_container_half">
            <Tile title="Ping Config">
              <PingConfig ipAddressInfoArray={props.ipAddressInfoArray} />
            </Tile>
          </div>
          <div className="tile_container_half">
            <Tile title="At A Glance">
              <AtAGlance {...props} />
            </Tile>
          </div>
        </div>
        <div className="tile_container_full tile_container_common">
          <Monitor {...props} />
        </div>
      </Pane>
    </div>
  );
}
