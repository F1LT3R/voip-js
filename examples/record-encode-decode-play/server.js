var connect = require('connect');
var serveStatic = require('serve-static');
var server = connect().use(serveStatic(__dirname)).listen(8080);
var io = require('socket.io')(server);
var fs = require('fs');



function now(){
  return + new Date();
}

io.on('connection', function (socket) {
  socket.on('packets', function(data){
    console.log(data.packets);
    
    // To write buffer down to a file....
    // var buf = data.packets.join();
    // fs.writeFile('test_'+now()+'.opus', buf, function(err) {
    //   if (err) { console.log(err); }
    // });
    
  })
});




