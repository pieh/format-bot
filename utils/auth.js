const axios = require(`axios`);

const getUserInfo = async token => {
  const reqInfo = {
    url: `https://${process.env.AUTH0_DOMAIN}/userinfo`,
    method: `get`,
    headers: {
      Authorization: token
    }
  };
  const result = await axios(reqInfo);
  return result.data;
};

exports.getUserInfo = getUserInfo;
