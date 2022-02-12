import {motion} from 'framer-motion';
import React from 'react';
import {useContext, useState} from 'react';
import reactDom from 'react-dom';
import {APIService} from '../APIService';
import {getIPAddressInfoByIP} from '../App';
import '../assets/PingJobMonitor.css';
import {Color, ColorScheme, THEME, ThemeContext} from '../ColorScheme';
import {Pingburst, IPAddressInfo, FlexTableFormat, NumberOfPacketsQuantity} from '../types';
import {ComponentThemeImplementations} from '../utils';
import FlexTable, {FlexTableProps} from './FlexTable';

interface CloseIconTheme {
  light: {
    color: Color;
  };
  dark: {
    color: Color;
  };
}
const closeIconThemeImplementions = new ComponentThemeImplementations<CloseIconTheme>();

const tiCloseIconTheme = {
  light: {
    color: ColorScheme.getColor('white', THEME.TI),
  },
  dark: {
    color: ColorScheme.getColor('gray', THEME.TI),
  },
};
closeIconThemeImplementions.set(THEME.TI, tiCloseIconTheme);
const gruvboxCloseIconTheme = {
  light: {
    color: ColorScheme.getColor('white', THEME.GRUVBOX),
  },
  dark: {
    color: ColorScheme.getColor('white', THEME.GRUVBOX),
  },
};
closeIconThemeImplementions.set(THEME.GRUVBOX, gruvboxCloseIconTheme);

interface CloseIconProps {
  isLight: boolean;
  isHovering: boolean;
}

function pingJobToElementsMapper(index: number, pingJobs: PingJobTable) {
  const job = pingJobs.records[index];
  const elements = [
    job.nickname,
    job.id.toString(10),
    job.numPacketsRemaining.toString(10),
    <CloseButton isLight={false} closeHandler={() => APIService.getAbortPingburst(job.id)} />,
  ];
  return elements;
}

interface CloseButtonProps {
  closeHandler: () => void;
  isLight: boolean;
}

function CloseIcon(props: CloseIconProps) {
  const theme = useContext(ThemeContext);
  const {
    [props.isLight ? 'light' : 'dark']: {color},
  } = closeIconThemeImplementions.get(theme);

  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M18 6L6 18"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 6L18 18"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseButton(props: CloseButtonProps) {
  const [isHovering, setHovering] = useState(false);
  return (
    <motion.div
      whileTap={{scale: 1.2}}
      onClick={() => {
        props.closeHandler();
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <CloseIcon isLight={props.isLight} isHovering={isHovering} />
    </motion.div>
  );
}

interface PingJobMonitorProps {
  pingbursts: Pingburst[];
  ipAddressInfoArray: IPAddressInfo[];
}

interface PingJobRow {
  nickname: string;
  id: number;
  numPacketsRemaining: NumberOfPacketsQuantity;
}
interface PingJobTable {
  records: PingJobRow[];
}

export function PingJobMonitor(props: PingJobMonitorProps) {
  const pingJobRows: PingJobRow[] = props.pingbursts
    .filter(pingburst => {
      const hasCompleted = Number(pingburst.numPacketsRequested) === pingburst.records.length;
      const hasAborted = pingburst.wasAborted;
      return !hasAborted && !hasCompleted;
    })
    .map(pingburst => {
      let nickname = null;
      if (pingburst.records.length > 0) {
        try {
          const ipAddressInfo = getIPAddressInfoByIP(
            props.ipAddressInfoArray,
            pingburst.records[0].destIP
          );
          nickname = ipAddressInfo.nickname;
        } catch (e) {
          nickname = 'N/A';
        }
      } else {
        nickname = 'N/A';
      }
      const numPacketsRemaining =
        pingburst.numPacketsRequested === '∞'
          ? '∞'
          : pingburst.numPacketsRequested - pingburst.records.length;
      return {nickname, id: pingburst.id, numPacketsRemaining};
    });

  function abortAllPingJobs(pingJobs: PingJobRow[]) {
    for (const job of pingJobs) {
      APIService.getAbortPingburst(job.id);
    }
  }

  const tableFormat: FlexTableFormat = [
    {
      headerValue: 'Nickname',
      style: {
        flexGrow: '1',
      },
    },
    {
      headerValue: 'Burst ID',
      style: {
        flexGrow: '1',
      },
    },
    {
      headerValue: 'Remaining',
      style: {
        flexGrow: '1',
      },
    },
    {
      headerValue: (
        <CloseButton isLight={true} closeHandler={() => abortAllPingJobs(pingJobRows)} />
      ),
      style: {
        flexBasis: '100px',
        flexGrow: '0',
      },
    },
  ];
  const tableProps: FlexTableProps<PingJobTable, PingJobRow> = {
    rowKeyGenerator: (index: number, table: PingJobTable) => table.records[index].id.toString(10),
    tableData: {
      records: pingJobRows,
    },
    dataToElementsMapper: pingJobToElementsMapper,
    tableFormat,
  };

  return reactDom.createPortal(
    <div className="ping_job_monitor_container">
      <FlexTable<PingJobTable, PingJobRow> {...tableProps} />
    </div>,
    document.body
  );
}
