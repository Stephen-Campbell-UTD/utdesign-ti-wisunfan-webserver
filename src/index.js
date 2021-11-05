let express = require('express');
let cors = require('cors');
let ping = require('net-ping');
let os = require('os');
const fs = require('fs');
const { exec } = require('child_process');
var chokidar = require('chokidar');

//ping
const interfaces = os.networkInterfaces(); //gets all the network interfaces connected to the device
const source_ip =
  interfaces['lo'][0]['address']; //prints the ip address used to ping

fs.writeFile('Ping_Results.csv', 'ping_burst_id,source_ip,dest_ip,start_time,duration,pcket_size,was_success\n', function (err) {
  if (err) throw err;
});//creation of the csv file


//gw bringup
const port_path = '/dev/ttyACM0';
let watcher = chokidar.watch(port_path, {ignored: /^\./, persistent: true});
let connected = false;

watcher
  .on('add', device_added)
  .on('unlink', device_removed)
  .on('error', function(error) {console.error(error);})

// Print connection status every 10s
//setInterval(flash_connection_status, 1000);



const app = express();
const PORT = 8000;
app.use(cors());
app.use(express.json());
app.use(express.static('./demo'));

app.get('/topology', (req, res) => {
  const topology = {
    nodes: [],
    edges: [],
  };
  res.json(topology);
});

const pingbursts = [];

function timestamp(date) {
  date_to_format = date ? date : new Date();
  return (
    date_to_format.toLocaleString('en-US', {
      timeZone: 'America/Chicago',
    }) +
    ' ' +
    date_to_format.getUTCMilliseconds() +
    'ms'
  );
}

function repeat_n_times(n, interval, func, ...args) {
  for (let i = 0; i < n; i++) {
    setTimeout(func, interval * (i + 1), ...args);
  }
}

app.post('/pingbursts', (req, res) => {
  const pingburst_request = req.body;
  const id = pingbursts.length;
  const pingburst = {
    id,
    num_packets_requested: pingburst_request.num_packets,
    records: [],
  };
  const n = pingburst_request.num_packets;
  const interval = pingburst_request.interval;
  const timeout = pingburst_request.timeout;
  repeat_n_times(
    n,
    interval,
    (dest_ip, size, records) => {
      var was_success;
      var ms;
      var session = ping.createSession({
        networkProtocol: ping.NetworkProtocol.IPv4,
        packetSize: size,
        sessionId: process.pid % 65535,
        timeout: timeout,
        ttl: 128,
      });
      session.pingHost(
        dest_ip,
        function (error, dest_ip, sent, rcvd) {
          ms = rcvd - sent;
          if (error) {
		//console.log(error.toString());
            //console.log("source: " + sourceIP + " target: " + target + " error:" + error.toString() + " start time: " + sent + " duration: " + ms + "ms packet size: " + size + "bytes pass/fail: fail");
            was_success = false;
            ping_record = {
              source_ip,
              dest_ip,
              start: timestamp(sent),
              duration: -1,
              packet_size: size,
              was_success,
            };
            records.push(ping_record);
	   fs.appendFile('Ping_Results.csv', id+','+source_ip+','+dest_ip+','+timestamp(sent).replace(',','')+','+-1+','+size+',false\n', function (err) {
		  if (err) throw err;
		  //console.log('appended successfully.');
		});
          } else {
            //console.log("source: " + sourceIP + " target: " + target + " start time: " + sent + " duration: " + ms + "ms packet size: " + size + "bytes pass/fail: pass");
            was_success = true;
            ping_record = {
              source_ip,
              dest_ip,
              start: timestamp(sent),
              duration: ms,
              packet_size: size,
              was_success,
            };
            records.push(ping_record);
	    fs.appendFile('Ping_Results.csv', id+','+source_ip+','+dest_ip+','+timestamp(sent).replace(',','')+','+ms+','+size+',true\n', function (err) {
		  if (err) throw err;
		  //console.log('appended successfully.');
		});
          }
        },
      );
    },
    pingburst_request.dest_ip,
    pingburst_request.packet_size,
    pingburst.records,
  );
  pingbursts.push(pingburst);
  res.json({ id });
});

app.get('/pingbursts/:id', (req, res) => {
  pingburst_id = req.params.id;
  res.json(pingbursts[pingburst_id]);
});
app.get('/pingbursts', (req, res) => {
  res.json(pingbursts);
});
app.get('/gw_bringup', (req, res) => {
  res.json(connected)
})
app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});

//gw bringup
function flash_connection_status() {
  console.log('Device connected: ' + connected);
}

function device_added() {
  console.log('Border router connected');
  start_wpantund();
  connected = true;
}

function device_removed() {
  console.log('Border router disconnected');
  connected = false;
}

function start_wpantund() {
  console.log('Starting wfantund');
  exec('sudo /usr/local/sbin/wfantund -s ' + port_path + ' &', (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
  });
}
