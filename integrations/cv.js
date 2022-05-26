// Helpers

/**
 * Parses ipfs:// and ar:// links and IPFS hashes to URLs.
 * @param {String} uri The ipfs:// link or IPFS hash.
 * @returns A formatted URL to the IPFS resource.
 */
 const parseProtocol = uri => {
  if (uri.substring(0,4) === "ipfs") {
    return `https://ipfs.zesty.market/ipfs/${uri.substring(7)}`;
  } else if (uri.substring(0,4) === "http") {
    return uri;
  } else if (uri.substring(0,5) === "https") {
    return uri;
  } else if (uri.substring(0,2) === "ar") {
    // get redirected url
    fetch(`https://arweave.net/${uri.substring(5)}`)
      .then(res => {
        return res.url;
      })
      .catch(err => {
        console.error(err);
      })

  } else {
    // default to ipfs
    return `https://ipfs.zesty.market/ipfs/${uri}`;
  }
}

const getIPFSGateway = () => {
  const gateways = [
    { gateway: 'https://cloudflare-ipfs.com', weight: 35 },
    { gateway: 'https://gateway.pinata.cloud', weight: 35 },
    { gateway: 'https://dweb.link', weight: 30 }
  ];

  const weights = [];
  let i;
  for (i = 0; i < gateways.length; i++) {
    weights[i] = gateways[i].weight + (weights[i - 1] || 0);
  }
  const random = Math.random() * weights[weights.length - 1];
  for (i = 0; i < weights.length; i++) {
    if (weights[i] > random) break;
  }
  return gateways[i].gateway;
}

// Formats
const formats = {
  'tall': {
      width: 0.75,
      height: 1,
      style: {
          'standard': `${getIPFSGateway()}/ipns/lib.zesty.market/assets/zesty-banner-tall.png`,
          'minimal': `${getIPFSGateway()}/ipns/lib.zesty.market/assets/zesty-banner-tall-minimal.png`,
          'transparent': `${getIPFSGateway()}/ipns/lib.zesty.market/assets/zesty-banner-tall-transparent.png`
      }
  },
  'wide': {
      width: 4,
      height: 1,
      style: {
          'standard': `${getIPFSGateway()}/ipns/lib.zesty.market/assets/zesty-banner-wide.png`,
          'minimal': `${getIPFSGateway()}/ipns/lib.zesty.market/assets/zesty-banner-wide-minimal.png`,
          'transparent': `${getIPFSGateway()}/ipns/lib.zesty.market/assets/zesty-banner-wide-transparent.png`
      }
  },
  'square': {
      width: 1,
      height: 1,
      style: {
          'standard': `${getIPFSGateway()}/ipns/lib.zesty.market/assets/zesty-banner-square.png`,
          'minimal': `${getIPFSGateway()}/ipns/lib.zesty.market/assets/zesty-banner-square-minimal.png`,
          'transparent': `${getIPFSGateway()}/ipns/lib.zesty.market/assets/zesty-banner-square-transparent.png`
      }
  }
}

const defaultFormat = 'square';
const defaultStyle = 'standard';

// Networking
const API_BASE = 'https://beacon.zesty.market'
const BEACON_GRAPHQL_URI = 'https://beacon2.zesty.market/zgraphql'
const FORWARD_BEACON_URL = `https://forward.zesty.market/${NETWORK}/space/${SPACE}`;


const ENDPOINTS = {
    "matic": 'https://api.thegraph.com/subgraphs/name/zestymarket/zesty-market-graph-matic',
    "polygon": 'https://api.thegraph.com/subgraphs/name/zestymarket/zesty-market-graph-matic',
    "rinkeby": 'https://api.thegraph.com/subgraphs/name/zestymarket/zesty-market-graph-rinkeby'
}

const DEFAULT_DATAS = {
  "uri": undefined,
}

const DEFAULT_URI_CONTENT = {
  "name": "Default banner",
  "description": "This is the default banner that would be displayed ipsum",
  "image": "https://ipfs.zesty.market/ipfs/QmWBNfP8roDrwz3XQo4qpu9fMxvUSTn8LB7d4JK7ybrfZ2/assets/zesty-ad-square.png",
  "url": "https://www.zesty.market"
}

/**
 * Queries The Graph to retrieve NFT information for the space.
 * @param {string} space The space ID
 * @param {string} creator The wallet address of the creator
 * @param {string} network The network to post metrics to
 * @returns An object with the requested space information, or a default if it cannot be retrieved.
 */
const fetchNFT = async (space, network = 'polygon') => {
    const currentTime = Math.floor(Date.now() / 1000);
    const query = {
      query: `
        query {
          tokenDatas (
            where: {
              id: "${space}"
            }
          )
          { 
            sellerNFTSetting {
              sellerAuctions (
                first: 5
                where: {
                  contractTimeStart_lte: ${currentTime}
                  contractTimeEnd_gte: ${currentTime}
                  cancelled: false
                }
              ) {
                id
                buyerCampaigns {
                  id
                  uri
                }
                buyerCampaignsApproved
                buyerCampaignsIdList
              }
            }
            id
          }
        }
      `
    };
  return fetch(ENDPOINTS[network], {
    method: 'POST',
    mode: 'cors',
    body: JSON.stringify(query)
  })
  .then((res) => {
    return parseGraphResponse(res);
  })
  .catch((err) => {
    console.log(err);
    return DEFAULT_DATAS;
  })
};

/**
 * Parses the response from The Graph to find the latest auction campaign.
 * @param {Object} res The response object from The Graph.
 * @returns An object containing either the latest auction campaign or default data.
 */
const parseGraphResponse = async (res) => {
  let body = await res.json();
  let tokenDatas = body.data.tokenDatas;
  if (tokenDatas.length == 0) return DEFAULT_DATAS;

  let sellerAuction = body.data.tokenDatas[0].sellerNFTSetting.sellerAuctions[0];
  let latestAuction = null;
  for (let i=0; i < sellerAuction.buyerCampaignsApproved.length; i++) {
    if (sellerAuction.buyerCampaignsApproved[i] && sellerAuction.buyerCampaigns.length > 0) {
      latestAuction = sellerAuction.buyerCampaigns[i];
    }
  }

  if (latestAuction == null) {
    return DEFAULT_DATAS
  }

  return latestAuction;
}

// Helpers for UTM parameters
const urlContainsUTMParams = (url) => {
  return url.indexOf('utm_source=') !== -1 || url.indexOf('utm_campaign=') !== -1 || url.indexOf('utm_channel=') !== -1;
}

const appendUTMParams = (url, spaceId) => {
  let new_url = new URL(url)
  new_url.searchParams.set('utm_source', 'ZestyMarket');
  new_url.searchParams.set('utm_campaign', 'ZestyCampaign');
  new_url.searchParams.set('utm_channel', `SpaceId_${spaceId}`);
  return new_url.href;
}

/**
 * Pulls data from IPFS for the banner content.
 * @param {string} uri The IPFS URI containing the banner content.
 * @param {string} format The default banner image format to use if there is no active banner.
 * @param {string} style The default banner image style to use if there is no active banner.
 * @param {string} formatsOverride Object to override the default format object.
 * @returns An object with the requested banner content, or a default if it cannot be retrieved.
 */
 const fetchActiveBanner = async (uri, format, style, space, formatsOverride) => {
  if (!uri) {
    let bannerObject = { uri: 'DEFAULT_URI', data: DEFAULT_URI_CONTENT };
    let newFormat = format || defaultFormat;
    let newStyle = style || defaultStyle;
    let usedFormats = formatsOverride || formats;
    bannerObject.data.image = usedFormats[newFormat].style[newStyle];
    return bannerObject;
  }

  let res = await fetch(parseProtocol(uri));
  let data = await res.json();
  let url = res.url;
  if(!urlContainsUTMParams(res.url)) {
    url = appendUTMParams(res.url, space);
  }

  return res.status == 200 ? { uri: url, data: data } : null
}

function sendOnLoadMetric(space) {
  try {
    const spaceCounterEndpoint = API_BASE + `/api/v1/space/${space}`
    fetch(spaceCounterEndpoint, { method: 'PUT' });

    fetch(`${FORWARD_BEACON_URL}/visit`);
  } catch (e) {
    console.log("Failed to emit onload event", e.message)
  }
}

const sendOnClickMetric = async (space) => {
  try {
    const spaceClickEndpoint = API_BASE + `/api/v1/space/click/${space}`
    fetch(spaceClickEndpoint, { method: 'PUT' });

    fetch(`${FORWARD_BEACON_URL}/click`);
  } catch (e) {
    console.log("Failed to emit onclick event", e.message)
  }
}

async function loadBanner(space, network, format, style, beacon = true) {
  let uri = null;
  const activeNFT = await fetchNFT(space, network);
  if (activeNFT) uri = activeNFT.uri;

  const activeBanner = await fetchActiveBanner(uri, format, style, space);

  // Need to add https:// if missing for page to open properly
  let url = activeBanner.data.url;
  url = url.match(/^http[s]?:\/\//) ? url : 'https://' + url;

  if (url == 'https://www.zesty.market') {
    url = `https://app.zesty.market/space/${space}`;
  }

  let image = activeBanner.data.image;
  image = image.match(/^.+\.(png|jpe?g)/i) ? image : parseProtocol(image);

  if (beacon) {
    sendOnLoadMetric(space);
  }

  feature.set({'url': image}); 
  feature.set({'link': url});
}

if (SPACE >= 0 && NETWORK && FORMAT && STYLE && (BEACON !== undefined)) {
  // Call loadBanner here. Parameters are:
  // Space ID, Network, Format, Style, Enable Beacon (optional)
  feature.on('click', e =>{
    sendOnClickMetric(SPACE);
  });

  parcel.on('playerenter', e =>{
    loadBanner(SPACE, NETWORK, FORMAT, STYLE, BEACON);
  });
} else {
  console.warn('You have missing or invalid parameters! SPACE must not be a negative number and all fields are required.');
  console.log(`SPACE: ${SPACE}\nNETWORK: ${NETWORK}\nFORMAT: ${FORMAT}\nSTYLE: ${STYLE}\nBEACON: ${BEACON}`);
}