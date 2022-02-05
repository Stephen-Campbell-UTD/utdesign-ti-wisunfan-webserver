const {parseNCPIPv6, canonicalIPtoExpandedIP, expandedIPToCanonicalIP} = require('./parsing');
const {repeatNTimes} = require('./utils');

function testParseIPv6() {
  const testIPs = [
    '2020:abcd::212:4b00:14f8:2af0            prefix_len:64   origin:ncp      valid:7199       preferred:3599      ',
    'fe80::212:4b00:14f8:2af0                 prefix_len:64   origin:ncp      valid:forever   preferred:forever',
  ];
  const correctOutput = [
    {
      ip: '2020:abcd::212:4b00:14f8:2af0',
      prefixLen: 64,
      origin: 'ncp',
      valid: '7199',
      preferred: '3599',
    },
    {
      ip: 'fe80::212:4b00:14f8:2af0',
      prefixLen: 64,
      origin: 'ncp',
      valid: 'forever',
      preferred: 'forever',
    },
  ];

  const result1IPs = parseNCPIPv6(testIPs);
  console.log(JSON.stringify(result1IPs) === JSON.stringify(correctOutput));

  const result2IPs = parseNCPIPv6([]);
  console.log(JSON.stringify(result2IPs) === JSON.stringify([]));
}
// testParseIPv6();

function testCanonicalIPToExpandedIP() {
  const canonicalIP = '2020:abcd::212:4b00:14f8:2b8f';
  const expandedIP = '2020:abcd:0000:0000:0212:4b00:14f8:2b8f';
  const result = canonicalIPtoExpandedIP(canonicalIP);
  console.log(result === expandedIP);
}

function testExpandedIPToCanonicalIP() {
  const canonicalIP = '2020:abcd::212:4b00:14f8:2b8f';
  const expandedIP = '2020:abcd:0000:0000:0212:4b00:14f8:2b8f';
  const result = expandedIPToCanonicalIP(expandedIP);
  console.log(result, canonicalIP);
  console.log(result === canonicalIP);
}
