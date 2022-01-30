const http = require('http');

const options = {};
http.get(`http://localhost:8000/${process.argv[2]}`, options);
