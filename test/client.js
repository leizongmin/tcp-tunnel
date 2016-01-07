const TCPTunnelClient = require('../client');

const client = new TCPTunnelClient({
  host: '127.0.0.1',
  port: 5000,
  name: 'A',
  password: '123456',
});
//console.log(client);
