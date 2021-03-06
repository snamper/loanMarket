"use strict";
let request = require('request');
let bb = require('bluebird');
let moment = require('moment');
let crypto = require('crypto');
let _ = require('lodash');
let cities = require('../domain/cities.js');
let dicts = require('../domain/dicts.js');
let config = require('config');

let log = require('../tools/log');

let requestAsync = bb.promisify(request);


function RongziService() {
  this.ChannelId = dicts.channel.CHANNEL_RONGZI;

  this.secretKey = config.get('chncfg.rongzi.secretKey');
  this.url = config.get('chncfg.rongzi.url');
  this.UtmSource = config.get('chncfg.rongzi.UtmSource');

  this.apiDefs = {
    isRegistered: {
      url: this.url + "/isRegistered",
      param: () => {
        return {
          CellPhoneNumber: "",
          Signature: "",

          //默认处理
          TimeStamp: moment().format('YYYYMMDDHHmmss'),
        }
      }
    },
    register: {
      url: this.url + "/Register",
      param: () => {
        return {
          CityName: "",//所在城市  拼音
          CellPhoneNumber: "",
          RealName: "",
          Gender: 1,//男：1 女：2,
          LoanAmount: 1,//贷款额度  单位：万
          UtmSource: this.UtmSource,//东方融资网指定
          TimeStamp: "20000101000000",//yyyyMMddHHmmss
          Signature: "",

          LoanPerod: null,//单位：月
          Age: null,//年龄
          HaveHouseLoan: null,//房贷
          HaveCarLoan: null,//车贷
          SocialSecurityFund: null,//社保公积金 无社保无公积金：1，有社保有公积金:2，有社保无公积金:4，无社保有公积金:8
          HaveCreditCard: null,//信用卡
          Identity: null,//职业身份 企业主：1， 个体户、私营业主：2， 上班族： 4，其他：8
          IncomeDistributionType: null,//收入发放类型--全部打卡：1 全部现金：2
          WorkingAge: null,//现单位工作时间--6个月以下：2， 6-12个月：4， 12-24个月：8 ，24-36个月：16， 36个月以上：32
          AverageMonthlyIncome: null,//月均总收入--4000以下：4000,4000-5000：4500,5000-10000：7500,10000以上：10000
          WorkingCity: null,//工作所在地 （城市）拼音形式
          CreditCardAmount: null,//信用卡额度 无信用卡:1, 1-500元 :2, 501-1000元:4 ,1001-5000元:8, 5001-8000元:16 ,8001-10000元:32 ,10001-50000元:64 ,50001-100000元:128 ,100001元及以上 :256
          HaveHouse: null,//房产情况 有：1 无：2
          HaveCar: null//车产情况 有：1 无：2
        }
      }
    }
  };
}

RongziService.prototype.sign = function () {
  let md5 = crypto.createHash('md5');
  let s = _.toArray(arguments).join("") + this.secretKey;
  md5.update(s);
  return md5.digest('hex');
};

RongziService.prototype.post = async ({url, param}) => {
  log.debug('东方融资发送:' + JSON.stringify(param));
  let res = await requestAsync({
    url: url,
    method: 'POST',
    json: true,
    headers: {
      'Content-Type': 'application/json'
    },
    body: param
  });
  log.debug('东方融资发送结果:' + JSON.stringify(res.body));
  return res.body;
};

RongziService.prototype.isRegisteredAPI = function ({phone}) {
  return (async () => {
    let param = this.apiDefs.isRegistered.param();
    param.CellPhoneNumber = phone;
    param.Signature = this.sign(param.CellPhoneNumber, param.TimeStamp);
    return await this.post({
      url: this.apiDefs.isRegistered.url,
      param: param
    });
  })();
};

RongziService.prototype.registerAPI = function ({cityName, phone, realName, gender, amount}) {
  return (async () => {
    let refParam = {
      CityName: cityName,
      CellPhoneNumber: phone,
      RealName: realName,
      Gender: gender,
      LoanAmount: amount
    };
    let param = _.extend(this.apiDefs.register.param(), refParam);
    param.Signature = this.sign(
      param.CityName,
      param.CellPhoneNumber,
      param.RealName,
      param.Gender,
      param.LoanAmount,
      param.UtmSource,
      param.TimeStamp
    );
    return await this.post({
      url: this.apiDefs.register.url,
      param
    });
  })();
};

RongziService.prototype.doLoan = async function ({cityId, phone, name, gender, amount}) {
  let param = {
    cityName: await cities.id2Name(cityId, this.ChannelId),
    phone: phone,
    realName: name,
    gender: gender === 1 ? 1 : 2,
    amount
  };

  let rtn = await this.registerAPI(param);
  if(rtn.Code === "0") {
    return {
      errorCode: 0,
      msg: JSON.stringify(rtn)
    }
  }
  else {
    return {
      errorCode: -1,
      msg: JSON.stringify(rtn)
    }
  }
};

module.exports = new RongziService();
