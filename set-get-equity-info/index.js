var Nightmare = require('nightmare');   
var http = require("http");
var request = require('request');
var fs = require('fs');
var express = require('express');
var app = express();
var mapper = {};

var exceptionList = ['2S', 'S11', 'S&J'];

function findEquityInMapper (name) {
  var equity = mapper[name];
  if (equity) {
    var time = equity['time'];
    if (new Date().getTime() - time.getTime() < 60000) {
      console.log('Already in the cached table - ' + name);
      console.log('--------------------------');
      return equity;
    }
  }
  return null;
}

function getEquityInfoFromSET (name, res) {
  var url = 'http://www.settrade.com/C04_01_stock_quote_p1.jsp?txtSymbol=' + name;
  var nightmare = Nightmare({
    show: false,
    maxHeight: 2000,
    maxWidth: 2000
  });
  
  nightmare
    .viewport(1716, 993)
    .goto(url)
    .wait(3000)
    .evaluate(function () {
        console.log('Opening page...');
        // GET ROUNDBORDER FROM SET THAT CONTAINS NAME, LASTTRADE AND CHANGE DETAIL
        var roundBorder = document.querySelector('div.round-border');
        if (roundBorder) {
            var name = roundBorder.querySelector('span').innerHTML.trim();
            var lastTrade = roundBorder.querySelector('h1').innerHTML.trim();
            var prior = document.querySelectorAll('table.table-info td')[1].innerHTML.trim();
            return name + ' - Last Trade: ' + lastTrade + ', Prior: ' + prior;
        }
        else {
            return 'Not Found';
        }
    })
    .end()
    .then(function(result) {
      if (result !== 'Not Found') {
        mapper[name] = {
          data: result,
          time: new Date()
        }
        console.log('Add in the cached table - ' + name);
        res.send(mapper[name]);
      }
      else {
        res.send(result);
      }
      console.log(result);
      console.log('--------------------------');
    })
    .catch(function (err) {
      console.log(err);
      res.send('Not Found');
      console.log('--------------------------');
    });
}

app.route('/equity/:symbol')
  .get(function (req, res) {
    var symbol = (req.params.symbol + '').toUpperCase();
    console.log('Find Equity info for - ' + symbol);

    var checkSymbol = (/^[A-Za-z][A-Za-z]*$/).test(symbol);
    var isNotInTheList = (exceptionList.filter(sym => sym === symbol).length === 0);
    
    if (!checkSymbol && isNotInTheList) {
      res.send('Not Found');
      console.log('Not Found');
      console.log('--------------------------');
    }
    else {
      var eq = findEquityInMapper(symbol);
      if (eq) {
        res.send(eq);
      }
      else {
        getEquityInfoFromSET(symbol, res);
      }
    }

  });

app.listen(3000);
console.log('Start FB-msg-equity-bot server --- at port:3000');