const express = require('express');
const cors = require('cors'); // 
const morgan = require('morgan'); // logging in -- middleware
const helmet = require('helmet'); //helmet for basic security --middleware
const yup = require('yup'); // schema validation
const monk = require('monk')
const {nanoid} = require('nanoid');

require('dotenv').config()

const db = monk(process.env.MONGODB_URI);
const urls = db.get('urls');
urls.createIndex({ slug: 1 }, { unique: true });

const app = express(); // creating the express app
app.enable('trust proxyy');


app.use(helmet());
app.use(morgan('common')); // logger tiny 
app.use(cors()); //default is going to be star i.e anyone can use this api
app.use(express.json()); // bodyparsers
app.use(express.static('./public'));

const notFoundPath = path.join(__dirname, 'public/404.html');

app.get('/:id', async(request, response) => {
    const { id: slug } = request.params;
    try{
        const url = await urls.findOne({ slug });
        if (url) {
            return response.redirect(url.url);
        }
        return response.status(404).sendFile(notFoundPath);
    } catch(error){
        return response.status(404).sendFile(notFoundPath);
    }
});

// app.get('/url/:id', (request, response) => {
//     // TODO: get a short url
// });

// app.get('/:id', (request, response) => {
//     // TODO: redirect to url
// });

const schema = yup.object().shape({
    slug: yup.string().trim().matches(/[\w\-]/i),
    url: yup.string().trim().url().required,
})



app.post('/url', slowDown({
  windowMs: 30 * 1000,
  delayAfter: 1,
  delayMs: 500,
}), rateLimit({
  windowMs: 30 * 1000,
  max: 1,
}), async (req, res, next) => {
  let { slug, url } = req.body;
  try {
    await schema.validate({
      slug,
      url,
    });
    if (url.includes('cdg.sh')) {
      throw new Error('Stop it. 🛑');
    }
    if (!slug) {
      slug = nanoid(5);
    } else {
      const existing = await urls.findOne({ slug });
      if (existing) {
        throw new Error('Slug in use. 🍔');
      }
    }
    slug = slug.toLowerCase();
    const newUrl = {
      url,
      slug,
    };
    const created = await urls.insert(newUrl);
    res.json(created);
  } catch (error) {
    next(error);
  }
});

app.use((req, res, next) => {
  res.status(404).sendFile(notFoundPath);
});

app.use((error, request, response, next) => {
    if(error.status){
        response.status(error.status);
    } else{
        response.status(500);
    }
    response.json({
        message: error.message,
        stack: process.env.NODE_ENV === 'production' ? 'yay' : error.stack
    })
})

const port = process.env.PORT || 1500; //the 1500 is programmer defined can be any port
app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`);
});