const $ = new Env('京东风控信息查询');
let cookiesArr = [], cookie = '', jdPetShareArr = [], isBox = false, notify, newShareCodes, allMessage = '';
//助力好友分享码(最多5个,否则后面的助力失败),原因:京东农场每人每天只有四次助力机会
//此此内容是IOS用户下载脚本到本地使用，填写互助码的地方，同一京东账号的好友互助码请使用@符号隔开。
//下面给出两个账号的填写示例（iOS只支持2个京东账号）
let shareCodes = [ // IOS本地脚本用户这个列表填入你要助力的好友的shareCode
]
let message = '', subTitle = '', option = {};
let jdNotify = false;//是否关闭通知，false打开通知推送，true关闭通知推送
const JD_API_HOST = 'https://api.m.jd.com/client.action';
let goodsUrl = '', taskInfoKey = [];
let randomCount = $.isNode() ? 20 : 5;

!(async () => {
  await requireConfig();

  if (!cookiesArr[0]) {
    $.msg($.name, '【提示】请先获取京东账号一cookie\n', '', {"open-url": ""});
    return;
  }

  for (let i = 0; i < cookiesArr.length; i++) {
    if (cookiesArr[i]) {
      cookie = cookiesArr[i];
      $.UserName = decodeURIComponent(cookie.match(/pt_pin=(.+?);/) && cookie.match(/pt_pin=(.+?);/)[1])
      $.index = i + 1;
      $.isLogin = true;
      $.nickName = '';
      console.log(`\n开始【京东账号${$.index}】${ $.UserName}\n`);

      message = '';
      subTitle = '';
      goodsUrl = '';
      taskInfoKey = [];
      option = {};
      let res = await queryScores();
      let level = ''
      let regulation = ''
      let totalScore = ''
      let shop = ''
      let shopAfter = ''
      let active = ''
      let accountInfo = ''
      let baiScore = ''
      let calBeginDate = ''
      let calEndDate = ''
      let realName = ''
      let jingxiang = ''
      if(res != '') {
        let userSynthesizeScore = res.userSynthesizeScore;
        let userDimensionScore = res.userDimensionScore;
        let scoreUserInfo = res.scoreUserInfo;

        level = userSynthesizeScore.level;
        regulation = userSynthesizeScore.regulation;
        totalScore = userSynthesizeScore.totalScore;
        shop = userDimensionScore.shop;
        shopAfter = userDimensionScore.shopAfter;
        active = userDimensionScore.active;
        accountInfo = userDimensionScore.accountInfo;
        baiScore = userDimensionScore.baiScore;
        calBeginDate = scoreUserInfo.calBeginDate;
        calEndDate = scoreUserInfo.calEndDate;
        realName = scoreUserInfo.realName;
      }

      let pg_channel_page = await Pg_channel_page();

      message = `【京东账号${$.index}】\n`;

      if(pg_channel_page ) {
        jingxiang = pg_channel_page.jxScore;

        if(pg_channel_page.changeScore) {
          message += `【京享值】${jingxiang} 【变动】${pg_channel_page.changeScore}\n`;
        }else {
          message += `【京享值】${jingxiang}\n`;
        }
        if(level === "" && pg_channel_page.creditLevel) {
          level = pg_channel_page.creditLevel;
        }
		
		 message += `【京享值】=【账户分】${pg_channel_page.accountScore}+【消费分】${pg_channel_page.consumptionScore}+【活跃分】${pg_channel_page.activityScore}\n`;
		 message += `【下次预估京享值】${pg_channel_page.nextEvalutionScore}\n`;
		 message += `【下次评估时间】${pg_channel_page.statisticalDate}\n`;
		

      }else {
        message += `\n`;
      }

      // 等级字段拿不到了,可以自己根据综合分1算 大于90是正常 88左右是R1 77左右是R2 55左右是R3  20左右是R4
      let scoreDesc = ""
      if(parseInt(totalScore) < 30) {
        scoreDesc = "R4 超级大黑号,建议分享到群里嘲笑它";
      }else if(parseInt(totalScore) < 60) {
        scoreDesc = "R3 大黑号";
      }else if(parseInt(totalScore) < 80) {
        scoreDesc = "R2 大部分活动开始不行了";
      }else if(parseInt(totalScore) < 90) {
        scoreDesc = "R1 略黑请小心点,减少0.01购";
      }else if(parseInt(totalScore) >=90) {
        scoreDesc = "R0 看起来正常";
      }

      //message += `【信誉等级】${level}星\n`;
      message += `【风控等级】${scoreDesc}\n`;
      message += `【综合分】${totalScore} 信用:${baiScore} 购物合规:${shop} 购物历史:${shopAfter} 售后行为:${active} 账户信息:${accountInfo}\n`;
      //message += `【实名信息】${realName}\n`;
      //message += `【风控计算周期】${calBeginDate} -- ${calEndDate} \n`;

      // let userInfos = await plusUserInfos();
      // let plusUserWhiteInfo = userInfos.plusUserWhiteInfo;
      // let baiScoreConfig = plusUserWhiteInfo.baiScoreConfig;
      // let userBaiScore = plusUserWhiteInfo.userBaiScore;
      // let whiteStatus = plusUserWhiteInfo.whiteStatus;
      // let closeWhite = plusUserWhiteInfo.closeWhite;
      // message += `【Plus】userBaiScore:${userBaiScore} whiteStatus:${whiteStatus} closeWhite:${closeWhite}\n`;

      await showMsg();
    }
  }
  if ($.isNode() && allMessage) {
    await notify.sendNotify(`${$.name}`, `${allMessage}`)
  }
})()
    .catch((e) => {
      $.log('', `❌ ${$.name}, 失败! 原因: ${e}!`, '')
    })
    .finally(() => {
      $.done();
    })

function requireConfig() {
  return new Promise(resolve => {
    console.log('开始获取配置文件\n')
    notify = $.isNode() ? require('./sendNotify') : '';
    //Node.js用户请在jdCookie.js处填写京东ck;
    const jdCookieNode = $.isNode() ? require('./jdCookie.js') : '';
    Object.keys(jdCookieNode).forEach((item) => {
      if (jdCookieNode[item]) {
        cookiesArr.push(jdCookieNode[item])
      }
    })
    console.log(`共${cookiesArr.length}个京东账号\n`)

    resolve()
  })
}

function TotalBean2() {
  return new Promise(async(resolve) => {
    const options = {
      url: `https://wxapp.m.jd.com/kwxhome/myJd/home.json?&useGuideModule=0&bizId=&brandId=&fromType=wxapp&timestamp=${Date.now()}`,
      headers: {
        Cookie: cookie,
        'content-type': `application/x-www-form-urlencoded`,
        Connection: `keep-alive`,
        'Accept-Encoding': `gzip,compress,br,deflate`,
        Referer: `https://servicewechat.com/wxa5bf5ee667d91626/161/page-frame.html`,
        Host: `wxapp.m.jd.com`,
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Redmi Note 8 Pro Build/QP1A.190711.020; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/77.0.3865.120 MQQBrowser/6.2 TBS/045715 Mobile Safari/537.36',
      },
    };
    let userInfo = "";
    $.post(options, (err, resp, data) => {
      try {
        if (err) {
          $.logErr(err);
        } else {
          if (data) {
            data = JSON.parse(data);
            if (!data.user) {
              $.isLogin = false; //cookie过期
              return;
            }
            userInfo = data.user;
            // if (userInfo) {
            //   if (!$.nickName)
            //     $.nickName = userInfo.unickName;
            //   if ($.beanCount == 0) {
            //     $.beanCount = userInfo.jingBean;
            //     $.isPlusVip = 3;
            //   }
            //   $.JingXiang=userInfo.uclass;
            // }
          } else {
            $.log('京东服务器返回空数据');
          }
        }
      } catch (e) {
        $.logErr(e);
      }
      finally {
        resolve(userInfo);
      }
    });
  });
}

function Pg_channel_page() {
  return new Promise(async(resolve) => {
    const options = {
      url: `https://api.m.jd.com/?t=${Date.now()}&functionId=pg_channel_page_data&appid=vip_h5&body=%7B%22paramData%22:%7B%22token%22:%2260143dce-1cde-44de-8130-a6e5579e1567%22%7D%7D`,
      headers: {
        Cookie: cookie,
        'accept': `application/json`,
        Connection: `keep-alive`,
        Referer: `https://vipgrowth.m.jd.com`,
        Host: `api.m.jd.com`,
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Redmi Note 8 Pro Build/QP1A.190711.020; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/77.0.3865.120 MQQBrowser/6.2 TBS/045715 Mobile Safari/537.36',
      },
    };
    let jxScoreInfo = {};
    $.get(options, (err, resp, data) => {
      try {
        if (err) {
          $.logErr(err);
        } else {
          if (data) {
            // console.log(JSON.stringify(JSON.parse(data), null, 2))
            data = JSON.parse(data);

            let floorInfoList = data.data.floorInfoList
            for (let i = 0; i < floorInfoList.length; i++) {
              if(floorInfoList[i].code=="JX_SCORE_INFO") {
                jxScoreInfo = floorInfoList[i].floorData.jxScoreInfo
                break
              }
            }
          } else {
            $.log('京东服务器返回空数据');
          }
        }
      } catch (e) {
        $.logErr(e);
      }
      finally {
        resolve(jxScoreInfo);
      }
    });
  });
}


async function showMsg() {
  $.msg($.name, subTitle, message, option);
  allMessage += `${message}${$.index !== cookiesArr.length ? '\n' : ''}`
}


async function queryScores() {
  return new Promise((resolve) => {
    let res = ''
    let url = {
      url: `https://rsp.jd.com/windControl/queryScore/v1?lt=m&an=plus.mobile&stamp=${Date.now()}`,
      // body: ``,
      headers: {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Redmi Note 8 Pro Build/QP1A.190711.020; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/77.0.3865.120 MQQBrowser/6.2 TBS/045715 Mobile Safari/537.36',
        'Referer': 'https://plus.m.jd.com/rights/windControl',
        // 'Content-Type': 'application/x-www-form-urlencoded',
      }
    };
    $.get(url, async (err, resp, data) => {
      try {
        const result = JSON.parse(data)
        if (result.code == 1000) {
          res = result.rs;
          //console.log(JSON.stringify(JSON.parse(data), null, 2))
        } else {
          console.log("queryScores 查询出错 ==>" + data);
          res = '';
        }

      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(res)
      }
    })
  })
}


async function plusUserInfos() {
  return new Promise((resolve) => {
    let res = ''
    let url = {
      url: `https://plus.m.jd.com/user/getUserInfo?lt=m&an=plus.mobile&contentType=1_2_3_4_5_7_8_9_11_12&qids=6_2_5_18_1_7_9_11_12_14_16_17_25&checkLevel=1&signType=1003&stamp=${Date.now()}`,
      // body: ``,
      headers: {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Redmi Note 8 Pro Build/QP1A.190711.020; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/77.0.3865.120 MQQBrowser/6.2 TBS/045715 Mobile Safari/537.36',
        'Referer': 'https://plus.m.jd.com/rights/windControl',
        // 'Content-Type': 'application/x-www-form-urlencoded',
      }
    };
    $.get(url, async (err, resp, data) => {
      try {
        const result = JSON.parse(data)
        if (result.success == true) {
          res = result.result;
          // console.log(JSON.stringify(JSON.parse(data), null, 2))
        } else {
          console.log("queryScores 查询出错 ==>" + data);
          res = '';
        }

      } catch (e) {
        $.logErr(e, resp);
      } finally {
        resolve(res)
      }
    })
  })
}


// prettier-ignore
function Env(t,e){"undefined"!=typeof process&&JSON.stringify(process.env).indexOf("GITHUB")>-1&&process.exit(0);class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`🔔${this.name}, 开始!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),n={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(n,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon()?(this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)})):this.isQuanX()?(this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t))):this.isNode()&&(this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)}))}post(t,e=(()=>{})){if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.post(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method="POST",this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){this.initGotEnv(t);const{url:s,...i}=t;this.got.post(s,i).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>{const{message:s,response:i}=t;e(s,i,i&&i.body)})}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl;return{"open-url":e,"media-url":s}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r))),!this.isMuteLog){let t=["","==============📣系统通知📣=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`❗️${this.name}, 错误!`,t.stack):this.log("",`❗️${this.name}, 错误!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`🔔${this.name}, 结束! 🕛 ${s} 秒`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}
