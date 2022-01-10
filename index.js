const express = require('express')
const request = require('request');
const cors = require('cors');
const axios = require('axios');
const networking = require('./utils/networking.js');
const helpers = require('./utils/helpers.js');


const app = express();
const port = 3000;
app.use(cors())

const imageType = {
  jpg: 'ffd8ffe0',
  png: '89504e47',
  gif: '47494638'
};

app.get('/', (req, res) => {
  res.send('Hello World!')
})


app.get('/:network/space/:id/image/:format/:style', async function(req, res) {
  const activeNFT = await networking.fetchNFT(req.params.id, req.params.network);

  // validate chain
  let chainId;
  if (req.params.network == "polygon") {
    chainId = 137;
  } else if (req.params.network == "matic") {
    chainId = 137
  } else if (req.params.network == "rinkeby") {
    chainId = 4;
  } else {
    res.status(400);
    res.send("Chain not supported");
  }

  // validate style
  let formatSet = new Set(['tall', 'wide', 'square']);
  let styleSet = new Set(['standard', 'minimal', 'transparent']);
  let format = req.params.format.toLowerCase();
  let style = req.params.style.toLowerCase();

  if (!formatSet.has(format)) {
    res.status(400);
    res.send("Format not supported. Make sure format is 'tall', 'wide', 'square'.");
  } 

  else if (!styleSet.has(style)) {
    res.status(400);
    res.send("Style not supported. Make sure style is 'standard', 'minimal', 'transparent'.");
  }

  else {
    const activeBanner = await networking.fetchActiveBanner(
      activeNFT.uri, 
      req.params.format, 
      req.params.style
    );
    let image = activeBanner.data.image;
    image = image.match(/^.+\.(png|jpe?g)/i) ? image : helpers.parseProtocol(image);

    request({ 
      url: image, 
      encoding: null 
    }, (err, resp, buffer) => {
      if (!err && resp.statusCode === 200) {
        var imageBytes = buffer.toString('hex',0,4);
        if (imageBytes == imageType.jpg) {
          res.set("Content-Type", "image/jpeg");
          res.send(resp.body);
        }
        else if (imageBytes == imageType.png) {
          res.set("Content-Type", "image/png");
          res.send(resp.body);
        } 
        else if (imageBytes == imageType.gif) {
          res.set("Content-Type", "image/gif");
          res.send(resp.body);
        }
        else {
          res.status(400);
          res.send("Image file is not supported. Make sure image is either a jpeg, png, or gif");
        }
      } else {
          res.status(500);
          res.send("An error has occurred. Please inform the administrators at https://zesty.market");
          console.log(err);
      }
    });
  }
});

app.get('/:network/space/:id/cta', async function(req, res) {
  const activeNFT = await networking.fetchNFT(req.params.id, req.params.network);

  // validate chain
  let chainId;
  if (req.params.network == "polygon") {
    chainId = 137;
  } else if (req.params.network == "matic") {
    chainId = 137
  } else if (req.params.network == "rinkeby") {
    chainId = 4;
  } else {
    res.status(400);
    res.send("Chain not supported");
  }

  if (activeNFT.uri) {
    bannerObject = await networking.fetchActiveBanner(activeNFT.uri);
    res.redirect(bannerObject.data.url);
  } else {
    res.redirect(`https://app.zesty.market/space/${req.params.id}?chainId=${chainId}`);
  }
});

app.listen(port, () => {
  console.log(`Forwarding service listening at http://localhost:${port}`)
})