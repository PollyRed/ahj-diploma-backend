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

const posts = [
  { 
    dateString: '01.01.1970 00:00', 
    message: 'This is test message #1',
	  type: 'text',
    id: v4(), 
  },
];

wsServer.on('connection', (ws) => {
  const errCallback = (err) => {
	  if (err) {
		  console.log(err);
	  }
  }

  ws.on('message', (msg) => {
    const request = JSON.parse(msg);

    if (request.event === 'addPost') {
      const newPost = {
        dateString: request.post.dateString,
        message: request.post.message,
		    type: request.post.type,
        id: v4(),
      };

      posts.push(newPost);

      if (newPost.message.match('@chaos: ')) {
        let botMessage = null;
        if (newPost.message.match('погода')) {
          botMessage = 'Погода сейчас: +30, штиль';
        } else if (newPost.message.match('цой')) {
          botMessage = 'жив';
        } else if (newPost.message.match('фаза Луны')) {
          botMessage = 'Луна растёт';
        } else if (newPost.message.match('HL3')) {
          botMessage = 'HL3 всё ещё не вышла';
        } else if (newPost.message.match('курс')) {
          botMessage = 'Доллар: 60, Евро: 65';
        } else {
          return;
        }

        const botPost = {
          dateString: request.post.dateString,
          message: botMessage,
          type: request.post.type,
          id: v4(),
        };
        posts.push(botPost);
        ws.send(JSON.stringify(
          {
            event: 'botResponse',
            allPosts: [botPost],
          },)
        );
      }
    }
	
	  if (request.event === 'addFilePost') {
      const newPost = {
        dateString: request.post.dateString,
        file: request.post.file,
		    type: request.post.type,
		    name: request.post.name,
        id: v4(),
      };

      posts.push(newPost);
    }
	
	  if (request.event === 'getAllPosts') {
      let postsCount = request.count;
      let startPostForSend = posts.length - request.count;

      if (request.lastId !== null) {
        startPostForSend = posts.indexOf(posts.filter(post => post.id === request.lastId)[0]) - request.count;
      }

      if (startPostForSend + request.count <= 0) return;
      if (startPostForSend < 0) {
        postsCount = startPostForSend + request.count;
        startPostForSend = 0;
      }

      const response = JSON.stringify({
        event: 'getAllPosts',
        allPosts: posts.slice(startPostForSend, startPostForSend + postsCount),
      });
	  
      ws.send(response);
    }
  });
});