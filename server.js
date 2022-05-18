const http = require('http');
const Koa = require('koa');
const koaBody = require('koa-body');
const app = new Koa();
const WS = require('ws');
const { v4 } = require('uuid');

app.use(async (ctx, next) => {
  const origin = ctx.request.get('Origin');
  if (!origin) {
    return await next();
  }
  const headers = { 'Access-Control-Allow-Origin': '*', };

  if (ctx.request.method !== 'OPTIONS') {
    ctx.response.set({...headers});
    try {
      return await next();
    } catch (e) {
      e.headers = {...e.headers, ...headers};
      throw e;
    }
  }

  if (ctx.request.get('Access-Control-Request-Method')) {
    ctx.response.set({
      ...headers,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH',
    });

    if (ctx.request.get('Access-Control-Request-Headers')) {
      ctx.response.set('Access-Control-Allow-Headers', ctx.request.get('Access-Control-Request-Headers'));
    }
    ctx.response.status = 204;
  }
});

app.use(koaBody({
  text: true,
  urlencoded: true,
  multipart: true,
  json: true,
}));

const port = process.env.PORT || 7070;
const server = http.createServer(app.callback()).listen(port);
const wsServer = new WS.Server({ server });

const posts = [];

wsServer.on('connection', (ws) => {
  const errCallback = (err) => {
	  if (err) {
		  // bla
	  }
  }

  ws.on('message', (msg) => {
    const request = JSON.parse(msg);
	
	console.log('msg');
	ws.send('welcome', errCallback);
    /*if (request.event === 'connected') {
      users.push(ws);
      const lastIndex = posts.findIndex((elem) => elem.pin === true);
      let pinId = null;
      if (lastIndex !== -1) {
        pinId = posts[lastIndex].id;
      }
      const chaosEvent = JSON.stringify({
        event: 'connected',
        message: {
          posts: posts.slice(posts.length - 10, posts.length),
          pinId,
        },
      });
      ws.send(chaosEvent);
    }*/

    if (request.event === 'addPost') {
      const post = {
        date: request.dateString,
        text: request.message,
        id: v4(),
      };

      posts.push(post);
    }
	
	if (request.event === 'getAllPosts') {
      const chaosEvent = JSON.stringify({
        event: 'getAllPosts',
        allPosts: posts,
      });
	  
      ws.send(chaosEvent);
    }
  });
});