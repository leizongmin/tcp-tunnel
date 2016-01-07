const TCPTunnelClient = require('../client');

const client = new TCPTunnelClient({
  host: '127.0.0.1',
  port: 5000,
  name: 'A',
  password: '1234567',
});
//console.log(client);
