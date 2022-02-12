import '../App.css';
import '../assets/ConfigTab.css';
import Tile from './Tile';
import Pane from './Pane';
import {ThemedInput} from './ThemedInput';
import ThemedLabel from './ThemedLabel';
import StatusIndicator from './StatusIndicator';
import {useCallback, useContext, useState} from 'react';
import {AppContext} from '../Contexts';
import produce from 'immer';
import ThemedButton, {THEMED_BUTTON_TYPE} from './ThemedButton';
import {ThemedSelect} from './ThemedSelect';
import {NCPNumberProperties, NCPProperties, NCPStringProperties} from '../App';
import {Topology} from '../types';
import {APIService} from '../APIService';
import {deriveNCPIndicatorStatus, NCPStateIndicator} from './NCPStateIndicator';
import Tooltip from './Tooltip';

interface ConfigPropertyTextInputProps {
  /**Display Name of Property */
  name: string;
  /**Identifier of Property. Should match server propValues */
  id: NCPStringProperties;
  /**Value of Property */
  value: string | null;
  isDisabled?: boolean;
}

function ConfigPropertyTextInput(props: ConfigPropertyTextInputProps) {
  // const isDisabled = props["Stack:Up"] && disabledStackUp.has(props.id);
  const App = useContext(AppContext);
  if (App === null) {
    throw Error('App null and rendering ConfigTextInput');
  }
  const changeHandler = (newText: string) => {
    App.setState(prevState => {
      return produce(prevState, draftState => {
        draftState.dirtyNCPProperties[props.id] = newText;
      });
    });
  };
  return (
    <div className="config_label">
      <ThemedLabel style={{fontSize: 14}}>{props.name}</ThemedLabel>
      <ThemedInput
        style={{width: '45%', fontSize: 14, height: 30}}
        inputStyle={{height: 30}}
        isDisabled={props.isDisabled}
        value={props.value}
        onChange={changeHandler}
      />
    </div>
  );
}

interface ConfigPropertyNumberInputProps {
  /**Display Name of Property */
  name: string;
  /**Identifier of Property. Should match server propValues */
  id: NCPNumberProperties;
  /**Value of Property */
  value: number | null;
  isDisabled?: boolean;
}
function ConfigPropertyNumberInput(props: ConfigPropertyNumberInputProps) {
  const App = useContext(AppContext);
  if (App === null) {
    throw Error('App null and rendering ConfigTextInput');
  }
  const changeHandler = (newText: string) => {
    App.setState(prevState => {
      return produce(prevState, draftState => {
        draftState.dirtyNCPProperties[props.id] = parseInt(newText, 10);
      });
    });
  };
  return (
    <div className="config_label">
      <ThemedLabel style={{fontSize: 14}}>{props.name}</ThemedLabel>
      <ThemedInput
        style={{width: '45%', fontSize: 14, height: 30}}
        inputStyle={{height: 30}}
        isDisabled={props.isDisabled}
        value={typeof props.value === 'number' ? props.value.toString(10) : null}
        onChange={changeHandler}
      />
    </div>
  );
}

// https://dev.ti.com/tirex/explore/content/simplelink_cc13x2_26x2_sdk_5_20_00_52/docs/ti_wisunfan/html/wisun-guide/NWP_interface.html
interface MacFilterModeConfigProps {
  value: number | null;
}
function MacFilterModeConfig(props: MacFilterModeConfigProps) {
  const App = useContext(AppContext);
  if (App === null) {
    throw Error('App null and rendering ConfigTextInput');
  }
  const onChange = ({value}: {value: string}) => {
    App.setState(prevState => {
      return produce(prevState, draftState => {
        draftState.ncpProperties['macfiltermode'] = parseInt(value, 10);
      });
    });
  };
  const options = [
    {
      label: 'Disabled',
      value: 0,
    },
    {
      label: 'Whitelist',
      value: 1,
    },
    {
      label: 'Blacklist',
      value: 2,
    },
  ];

  const selectedOption = options.find(option => option.value === props.value);
  return (
    <div className="config_label">
      <ThemedLabel style={{fontSize: 14}}>Mac Filter Mode</ThemedLabel>
      <ThemedSelect
        width="45%"
        fontSize={14}
        onChange={onChange}
        options={options}
        value={selectedOption}
      ></ThemedSelect>
    </div>
  );
}

interface ConfigPropertiesProps {
  ncpProperties: NCPProperties;
  dirtyNCPProperties: Partial<NCPProperties>;
}

function ConfigProperties(props: ConfigPropertiesProps) {
  let {['Stack:Up' as 'Stack:Up']: stackUp} = props.ncpProperties;
  stackUp = stackUp === null ? false : stackUp;
  const App = useContext(AppContext);
  if (App === null) {
    throw Error('App null and rendering ConfigTextInput');
  }
  return (
    <div className="config_properties_container">
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          width: '100%',
          justifyContent: 'space-between',
          marginTop: 10,
          marginBottom: 10,
        }}
      >
        <ThemedButton
          themedButtonType={THEMED_BUTTON_TYPE.PRIMARY}
          onClick={App.clearDirtyNCPProperties}
        >
          Get
        </ThemedButton>
        <ThemedButton
          themedButtonType={THEMED_BUTTON_TYPE.SECONDARY}
          onClick={App.setNCPProperties}
        >
          Set
        </ThemedButton>
      </div>
      <ConfigPropertyTextInput
        name="NCP:Version"
        id="NCP:Version"
        value={props.dirtyNCPProperties['NCP:Version'] || props.ncpProperties['NCP:Version']}
        isDisabled={true}
      />

      <ConfigPropertyNumberInput
        name="NCP:InterfaceType"
        id="NCP:InterfaceType"
        value={
          props.dirtyNCPProperties['NCP:InterfaceType'] || props.ncpProperties['NCP:InterfaceType']
        }
        isDisabled={true}
      />
      <ConfigPropertyTextInput
        name="Hardware Address"
        id="NCP:HardwareAddress"
        value={
          props.dirtyNCPProperties['NCP:HardwareAddress'] ||
          props.ncpProperties['NCP:HardwareAddress']
        }
        isDisabled={true}
      />
      <ConfigPropertyNumberInput
        name="NCP:CCAThreshold"
        id="NCP:CCAThreshold"
        value={
          props.dirtyNCPProperties['NCP:CCAThreshold'] || props.ncpProperties['NCP:CCAThreshold']
        }
        isDisabled={stackUp}
      />
      <ConfigPropertyNumberInput
        name="NCP:TXPower"
        id="NCP:TXPower"
        value={props.dirtyNCPProperties['NCP:TXPower'] || props.ncpProperties['NCP:TXPower']}
        isDisabled={stackUp}
      />
      <ConfigPropertyTextInput
        name="NCP:Region"
        id="NCP:Region"
        value={props.dirtyNCPProperties['NCP:Region'] || props.ncpProperties['NCP:Region']}
        isDisabled={true}
      />
      <ConfigPropertyNumberInput
        name="NCP:ModeID"
        id="NCP:ModeID"
        value={props.dirtyNCPProperties['NCP:ModeID'] || props.ncpProperties['NCP:ModeID']}
        isDisabled={true}
      />
      <ConfigPropertyTextInput
        name="unicastchlist"
        id="unicastchlist"
        value={props.dirtyNCPProperties['unicastchlist'] || props.ncpProperties['unicastchlist']}
      />
      <ConfigPropertyTextInput
        name="broadcastchlist"
        id="broadcastchlist"
        value={
          props.dirtyNCPProperties['broadcastchlist'] || props.ncpProperties['broadcastchlist']
        }
      />
      <ConfigPropertyTextInput
        name="asyncchlist"
        id="asyncchlist"
        value={props.dirtyNCPProperties['asyncchlist'] || props.ncpProperties['asyncchlist']}
      />
      <ConfigPropertyTextInput
        name="chspacing"
        id="chspacing"
        value={props.dirtyNCPProperties['chspacing'] || props.ncpProperties['chspacing']}
        isDisabled={true}
      />
      <ConfigPropertyTextInput
        name="ch0centerfreq"
        id="ch0centerfreq"
        value={props.dirtyNCPProperties['ch0centerfreq'] || props.ncpProperties['ch0centerfreq']}
        isDisabled={true}
      />
      <ConfigPropertyTextInput
        name="Network:Panid"
        id="Network:Panid"
        value={props.dirtyNCPProperties['Network:Panid'] || props.ncpProperties['Network:Panid']}
        isDisabled={stackUp}
      />
      <ConfigPropertyNumberInput
        name="bcdwellinterval"
        id="bcdwellinterval"
        value={
          props.dirtyNCPProperties['bcdwellinterval'] || props.ncpProperties['bcdwellinterval']
        }
        isDisabled={stackUp}
      />
      <ConfigPropertyNumberInput
        name="ucdwellinterval"
        id="ucdwellinterval"
        value={
          props.dirtyNCPProperties['ucdwellinterval'] || props.ncpProperties['ucdwellinterval']
        }
        isDisabled={stackUp}
      />
      <ConfigPropertyNumberInput
        name="bcinterval"
        id="bcinterval"
        value={props.dirtyNCPProperties['bcinterval'] || props.ncpProperties['bcinterval']}
        isDisabled={stackUp}
      />
      <ConfigPropertyNumberInput
        name="ucchfunction"
        id="ucchfunction"
        value={props.dirtyNCPProperties['ucchfunction'] || props.ncpProperties['ucchfunction']}
        isDisabled={stackUp}
      />
      <ConfigPropertyNumberInput
        name="bcchfunction"
        id="bcchfunction"
        value={props.dirtyNCPProperties['bcchfunction'] || props.ncpProperties['bcchfunction']}
        isDisabled={stackUp}
      />
      <MacFilterModeConfig value={props.ncpProperties['macfiltermode']} />
      <ConfigPropertyTextInput
        name="BR NodeType"
        id="Network:NodeType"
        value={
          props.dirtyNCPProperties['Network:NodeType'] || props.ncpProperties['Network:NodeType']
        }
        isDisabled={true}
      />
      <ConfigPropertyTextInput
        name="Network Name"
        id="Network:Name"
        value={props.dirtyNCPProperties['Network:Name'] || props.ncpProperties['Network:Name']}
      />
    </div>
  );
}

interface NCPStatusProps {
  interfaceUp: boolean | null;
  stackUp: boolean | null;
  ncpState: string | null;
}

function NCPStatus(props: NCPStatusProps) {
  const App = useContext(AppContext);
  const startStack = useCallback(async () => {
    try {
      let {wasSuccess} = await APIService.setProp('Interface:Up', true);
      console.log(wasSuccess);
      await APIService.setProp('Stack:Up', true);
    } catch (e) {
      //network error
      if (App === null) {
        console.error('App is null');
        return;
      }
      App.receivedNetworkError(e);
    }
  }, [App]);
  const sendReset = useCallback(async () => {
    try {
      await APIService.getReset();
    } catch (e) {
      //network error
      if (App === null) {
        console.error('App is null');
        return;
      }
      App.receivedNetworkError(e);
    }
  }, [App]);

  return (
    <div className="ncpStatusContainer">
      {/* <ThemedLabel style={{fontSize: 24}}>NCP State</ThemedLabel> */}
      {/* <div style={{width: '100%', display: 'flex', flexDirection: 'row', marginBottom: 20}}> */}
      <div
        style={{
          width: '45%',
          display: 'flex',
          flexDirection: 'column',
          rowGap: 20,
          height: '100%',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Tooltip
          content={props.ncpState}
          style={{top: -18}}
          containerStyle={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <NCPStateIndicator status={deriveNCPIndicatorStatus(props.ncpState)} />
        </Tooltip>

        <ThemedButton
          style={{width: '100%'}}
          onClick={startStack}
          themedButtonType={THEMED_BUTTON_TYPE.PRIMARY}
        >
          Start
        </ThemedButton>
      </div>
      <div
        style={{
          width: '45%',
          display: 'flex',
          flexDirection: 'column',
          rowGap: 20,
          height: '100%',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div className="ncpStatusRow">
          <ThemedLabel style={{fontSize: 20}}>Interface</ThemedLabel>
          <StatusIndicator isGoodStatus={Boolean(props.interfaceUp)}></StatusIndicator>
        </div>
        <div className="ncpStatusRow">
          <ThemedLabel style={{fontSize: 20}}>Stack</ThemedLabel>
          <StatusIndicator isGoodStatus={Boolean(props.stackUp)}></StatusIndicator>
        </div>

        <div className="ncpStatusRow">
          <ThemedButton
            style={{width: '100%'}}
            onClick={sendReset}
            themedButtonType={THEMED_BUTTON_TYPE.SECONDARY}
          >
            Reset
          </ThemedButton>
        </div>
      </div>
      {/* </div> */}
    </div>
  );
}

interface ThemedUnorderedListProps {
  items?: string[] | null;
}

function ThemedUnorderedList(props: ThemedUnorderedListProps) {
  let stringItems = props.items ? props.items : ([] as string[]);
  const items = stringItems.map((item, index) => {
    const key = `${index}${item}`;
    return (
      <div key={key}>
        <ThemedLabel key={`${key}`}>{item}</ThemedLabel>
      </div>
    );
  });
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        marginBottom: 20,
        rowGap: 10,
      }}
    >
      {items}
    </div>
  );
}

interface NetworkPropertiesProps {
  connecteddevices: string[];
  macfilterlist: string[] | null;
}

enum NETWORK_PROPERTIES {
  CONNECTED_DEVICES = 'connecteddevices',
  MAC_FILTER_LIST = 'macfilterlist',
}

function NetworkProperties(props: NetworkPropertiesProps) {
  const [activeProperty, setActiveProperty] = useState(NETWORK_PROPERTIES.CONNECTED_DEVICES);
  const options = [
    // { label: "Dodag Route", value: "dodagroute" },
    {label: 'Connected Devices', value: 'connecteddevices'},
    // { label: "IPv6 Addresses", value: "IPv6:AllAddresses" },
    {label: 'MAC Filter List', value: 'macfilterlist'},
  ];
  let displayElement = null;
  switch (activeProperty) {
    case NETWORK_PROPERTIES.CONNECTED_DEVICES:
      displayElement = <ThemedUnorderedList items={props.connecteddevices} />;
      break;
    case NETWORK_PROPERTIES.MAC_FILTER_LIST:
      displayElement = <ThemedUnorderedList items={props.macfilterlist} />;
      break;
    default:
  }
  const selectedOption = options.find(option => option.value === activeProperty);
  return (
    <div className="networkPropertiesContainer">
      <ThemedSelect
        width="100%"
        onChange={({value}) => setActiveProperty(value)}
        value={selectedOption}
        options={options}
      />
      {displayElement}
    </div>
  );
}

interface ConfigTabProps {
  ncpProperties: NCPProperties;
  dirtyNCPProperties: Partial<NCPProperties>;
  topology: Topology;
}

export default function ConfigTab(props: ConfigTabProps) {
  return (
    <div className="pane_container" style={{columnGap: '1.435vw'}}>
      <Pane>
        <div className="tile_container_full tile_container_common">
          <Tile title="Network Properties">
            <NetworkProperties
              connecteddevices={props.topology.connectedDevices}
              macfilterlist={props.ncpProperties.macfilterlist}
            />
          </Tile>
        </div>
      </Pane>
      <Pane>
        <div className="tile_container_full tile_container_common">
          <Tile title="Config Properties">
            <ConfigProperties
              ncpProperties={props.ncpProperties}
              dirtyNCPProperties={props.dirtyNCPProperties}
            />
          </Tile>
        </div>
      </Pane>
      <Pane>
        <div className="tile_container_full tile_container_common">
          <Tile style={{minHeight: 0}} title="NCP Status">
            <NCPStatus
              ncpState={props.ncpProperties['NCP:State']}
              stackUp={props.ncpProperties['Stack:Up']}
              interfaceUp={props.ncpProperties['Interface:Up']}
            ></NCPStatus>
          </Tile>
        </div>
      </Pane>
    </div>
  );
}
