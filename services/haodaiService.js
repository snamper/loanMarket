"use strict";
let _ = require('lodash');
let crypto = require('crypto');
let request = require('request');
let bb = require('bluebird');
let requestAsync = bb.promisify(request);

function HaodaiService() {
  this.key = 'oadn8DkzKf0jvV0hi9fKxaiXSMktnYot';
  this.channel_id = 23;
  this.biaoshi = 19;
  this.apiDefs = {
    loanAPI: {
      url: "http://dev.oc.haodai.net/Center/pushOrder",
      param: () => {
        return {
          channel_id: this.channel_id,
          biaoshi: this.biaoshi,
          field: {
            username: "",//用户名
            money: 0,//贷款金额，以元为单位
            zone_id: 0,//地区编码
            mobile: 0,//手机号码

            //默认
            month: 12,//贷款期限，单位月
            age: 25 + Math.ceil(Math.random() * 10),//年龄
            salary_bank_public: 3000 + Math.ceil(Math.random()*5000),//月收入，以元为单位
            salary_bank_private: 1,//工资发放形式（1银行代发 2转账工资 3现金发放 4自由职业收入)

            //默认
            is_fund: null,//公积金  1有 2无
            is_security: null,//社保  1有 2无
            house_type: null, //房产  1无 2有，未抵押 3有，已抵押
            car_type: null,//车产  1无 2有，未抵押 3有，已抵押 4无，准备购买    }
          }
        }
      }
    }
  }
}

HaodaiService.prototype.encrypt = function (data, key) {
  let iv = "";
  let clearEncoding = 'utf8';
  let cipherEncoding = 'base64';
  let cipherChunks = [];
  let cipher = crypto.createCipheriv('aes-256-ecb', key, iv);
  cipher.setAutoPadding(true);

  cipherChunks.push(cipher.update(data, clearEncoding, cipherEncoding));
  cipherChunks.push(cipher.final(cipherEncoding));

  return cipherChunks.join('');
};

HaodaiService.prototype.cryptoField = function (data) {
  let dataStr = JSON.stringify(data);

  return this.encrypt(dataStr, this.key)
};

HaodaiService.prototype.post = async function({url, param}) {
  let postData = _.cloneDeep(param);
  postData.field = this.cryptoField(postData.field);

  let res = await requestAsync({
    url: url,
    method: 'POST',
    json: true,
    headers: {
      'Content-Type': 'application/json'
    },
    body: postData
  });
  return res.body;
};

HaodaiService.prototype.loanAPI = function ({cityId, phone, realName, amount}) {
  return (async() => {
    let param = _.clone(this.apiDefs.loanAPI.param());

    //必填字段
    param.field.username = realName;
    param.field.money = amount * 10000;
    param.field.zone_id = Number.parseInt(cityId);
    param.field.mobile = Number.parseInt(phone);

    return await this.post({
      url:this.apiDefs.loanAPI.url,
      param
    });
  })();
};

module.exports = new HaodaiService();
