import React, {useCallback, useRef, useState} from 'react';
import Slider from './Slider';
import '../assets/PingConfig.css';
import {ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import CheckBox from './CheckBox';
import {ThemedInput} from './ThemedInput';
import {useContext} from 'react';
import {IPAddressInfo, NumberOfPacketsQuantity, Pingburst} from '../types';
import {APIService} from '../APIService';
import {ComponentThemeImplementations} from '../utils';
import ThemedButton, {THEMED_BUTTON_TYPE} from './ThemedButton';
import {PingJobsButton} from './PingJobsButton';

interface NumberOfPacketsProps {
  numPackets: NumberOfPacketsQuantity;
  changeHandler: (newVal: NumberOfPacketsQuantity) => void;
}

interface PingConfigTheme {
  labelStyle: React.CSSProperties;
}
const pingConfigThemeImplementations = new ComponentThemeImplementations<PingConfigTheme>();
const tiPingConfigTheme = {
  labelStyle: {
    color: ColorScheme.getColor('gray', THEME.TI),
    fontWeight: 600,
  },
};
pingConfigThemeImplementations.set(THEME.TI, tiPingConfigTheme);

const gruvboxPingConfigTheme = {
  labelStyle: {},
};
pingConfigThemeImplementations.set(THEME.GRUVBOX, gruvboxPingConfigTheme);
function NumberOfPackets(props: NumberOfPacketsProps) {
  const theme = useContext(ThemeContext);
  const [isInfinite, setIsInfinite] = useState(false);
  const lastKnownFiniteNumPackets = useRef<NumberOfPacketsQuantity>(props.numPackets);
  let fontSize = isInfinite ? 20 : 14;

  const updateIsInfinite = (isInfiniteChecked: boolean) => {
    setIsInfinite(isInfiniteChecked);
    props.changeHandler(isInfiniteChecked ? '∞' : lastKnownFiniteNumPackets.current);
  };

  const onChangeHandler = (newText: string) => {
    if (isInfinite) {
      return;
    }
    const newVal = parseInt(newText, 10);
    lastKnownFiniteNumPackets.current = newVal;
    props.changeHandler(newVal);
  };

  return (
    <div className="num_packets_container">
      <div>
        <CheckBox
          className={'is_infinite_checkbox '.concat(theme)}
          isChecked={isInfinite}
          clickHandler={updateIsInfinite}
        />
      </div>
      <ThemedInput
        value={props.numPackets.toString(10)}
        style={{marginLeft: 10, width: '16%', fontSize}}
        onChange={onChangeHandler}
      />
    </div>
  );
}

interface PingConfigurationProps {
  ipAddressInfoArray: IPAddressInfo[];
  pingbursts: Pingburst[];
}

export default function PingConfiguration(props: PingConfigurationProps) {
  const [packetSize, setPacketSize] = useState<number>(50);
  const [timeout, setTimeoutDuration] = useState<number>(500);
  const [interval, setIntervalDuration] = useState<number>(1000);
  const [numPackets, setNumPackets] = useState<NumberOfPacketsQuantity>(10);

  const theme = useContext(ThemeContext);

  const sendPingburst = useCallback(
    (destIP: string) => {
      APIService.postPingbursts({
        destIP,
        packetSize,
        numPackets,
        timeout,
        interval,
      });
    },
    [packetSize, numPackets, timeout, interval]
  );
  const setIntervalClamped = useCallback(
    val => {
      if (timeout >= val) {
        setTimeoutDuration(val);
      }
      setIntervalDuration(val);
    },
    [setTimeoutDuration, setIntervalDuration, timeout]
  );
  const setTimeoutClamped = useCallback(
    val => {
      if (val >= interval) {
        setIntervalDuration(val);
      }
      setTimeoutDuration(val);
    },
    [setTimeoutDuration, setIntervalDuration, interval]
  );

  const clickHandler = useCallback(() => {
    const destinationIPs = [];
    for (let ipInfo of props.ipAddressInfoArray)
      if (ipInfo.isSelected) {
        destinationIPs.push(ipInfo.ipAddress);
      }
    destinationIPs.forEach(ip => {
      sendPingburst(ip);
    });
  }, [props.ipAddressInfoArray, sendPingburst]);

  let {labelStyle} = pingConfigThemeImplementations.get(theme);

  return (
    <div className="ping_form_container" style={{position: 'relative', paddingTop: 15}}>
      <PingJobsButton
        style={{position: 'absolute', right: 10, top: 10}}
        ipAddressInfoArray={props.ipAddressInfoArray}
        pingbursts={props.pingbursts}
      />
      <label style={labelStyle} className="ping_form_label">
        Packet Size [B]
      </label>
      <Slider min={0} step={25} max={1000} value={packetSize} changeHandler={setPacketSize} />
      <label style={labelStyle} className="ping_form_label">
        Timeout [ms]
      </label>
      <Slider min={0} step={500} max={9999} value={timeout} changeHandler={setTimeoutClamped} />
      <label style={labelStyle} className="ping_form_label">
        Interval [ms]
      </label>
      <Slider min={0} step={500} max={9999} value={interval} changeHandler={setIntervalClamped} />
      <label style={labelStyle} className="ping_form_label">
        Number of Packets
      </label>
      <NumberOfPackets changeHandler={setNumPackets} numPackets={numPackets} />
      <ThemedButton
        style={{
          marginTop: 20,
          marginBottom: 25,
        }}
        themedButtonType={THEMED_BUTTON_TYPE.PRIMARY}
        onClick={clickHandler}
      >
        Submit
      </ThemedButton>
    </div>
  );
}
