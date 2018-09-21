// ==UserScript==
// @name        Fifa 19 FUT Show Futbin player price
// @version     0.1
// @description Show the Futbin prices for players in the Search Results, Club Search and Trade Pile
// @license     MIT
// @author      Luis Azevedo
// @match       https://www.easports.com/fifa/ultimate-team/web-app/*
// @match       https://www.easports.com/*/fifa/ultimate-team/web-app/*
// @namespace   https://github.com/braceta
// @grant       GM_xmlhttpRequest
// @connect     www.futbin.com
// @updateURL   https://raw.githubusercontent.com/braceta/fifa19-futweb-tampermonkey/master/futbin-player-prices.js
// @downloadURL https://raw.githubusercontent.com/braceta/fifa19-futweb-tampermonkey/master/futbin-player-prices.js
// @supportURL  https://github.com/braceta/fifa19-futweb-tampermonkey/
// @require     https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js
//
// Thanks to Mardaneus86 for the inspiration
// Check he's stuff at https://github.com/Mardaneus86/futwebapp-tampermonkey/
// ==/UserScript==

var main = function() {
  "use strict";
  $("head").append(`<style id="addedCSS" type="text/css">
  #TradePile .player-stats-data-component, #Unassigned .player-stats-data-component {
    width: 12em;
  }
  #TradePile .listFUTItem .entityContainer, #Unassigned .listFUTItem .entityContainer {
    width: 45%;
  }
  #Unassigned .listFUTItem .auction .auctionValue, #Unassigned .listFUTItem .auction .auction-state {
    display: none;
  }
  #Unassigned .listFUTItem .auction .auctionValue.futbin {
    display: block;
    float: right;
  }

  .MyClubResults .listFUTItem .auction {
    display: block;
    position: absolute;
    right: 0;
  }
  .MyClubResults .listFUTItem .auction .auctionValue, .MyClubResults .listFUTItem .auction .auction-state {
    width: 24%;
    float: right;
    padding-right: 1%;
    display: none;
  }
  .MyClubResults .listFUTItem .auction .auctionValue.futbin {
    display: block;
  }

  .listFUTItem .auction .auction-state {
    width: 25%;
    float: right;
  }
  .listFUTItem .auction .auctionValue {
    width: 24%;
    float: left;
    padding-right: 1%;
  }
  .listFUTItem .auction .futbin {
    background-color: lightgoldenrodyellow;
  }
  .listFUTItem .auction .futbin.oktobuy {
    background-color: lightgreen;
  }

  .listFUTItem .auction .delta-green {
    font-size: small;
    color: green;
    vertical-align: super;
  }

  .listFUTItem .auction .delta-red {
    font-size: 10px;
    color: red;
    vertical-align: super;
  }

  .futbinupdate {
    font-size: 14px;
    clear: both;
    display: block;
  }
  .coins.value.futbin {
    -webkit-filter: hue-rotate(165deg);
    filter: hue-rotate(165deg);
  }
  .popup {
    position: fixed;
    width: 440px;
    height: 40px;
    right: 130px;
    top: 4px;
    z-index: 999999;
    font-family: Helvetica;
    background: lightgreen;
    border-radius: 3px;
    line-height: 40px;
    padding: 0 10px;
  }

  .popup .info {
      font-weight:bold;
  }

  </style>`);

  $("body").append(
    '<div class="popup" style="display:none"><span "info">Best Page Deal:<span> <span class="name"></span> <span class="price"></span> <span class="gain"></span></div>'
  );
  var globalInterval;

  function getPersonaPlatform() {
    var platform = "";
    if (services.User.getUser().getSelectedPersona().isPlaystation) platform = "ps";
    if (services.User.getUser().getSelectedPersona().isPC) platform = "pc";
    if (services.User.getUser().getSelectedPersona().isXbox) platform = "xbox";

    return platform;
  
}
  function showFutbinPriceInPage(listRows, futbinData) {
    console.log("showFutbinPriceInPage", listRows, futbinData);
    var targetDomElements = jQuery(".listFUTItem").get();

    var bestDeal = {
      item: "",
      price: 0,
      futbinPrice: 0,
      gain: 0
    };

    listRows.map((item, idx) => {
      if (!futbinData) {
        return;
      }
      var target = jQuery(targetDomElements[idx]);
      if (!item.data.isPlayer()) {
        return;
      }

      var playerId = item.data.resourceId;

      var platform = getPersonaPlatform();

      if (!futbinData[playerId]) {
        return; // futbin data might not be available for this player
      }

      if (target.find(".futbin").length > 0) {
        return; // futbin price already added to the row
      }

      var targetForButton = null;
      var futbinPriceRaw = futbinData[playerId].prices[platform].LCPrice;

      if (getCurrentControllerClassName() === "UTMarketSearchResultsSplitViewController") {
        // Stuff for transfermarket
        var futbinPrice = parseInt(futbinPriceRaw.replace(/,/g, ""));

        var isBuyNowLowerThanFutbinPrice = item.data.getAuctionData().buyNowPrice < futbinPrice;
        var delta = item.data.getAuctionData().buyNowPrice - futbinPrice;

        var okToBuyClass = isBuyNowLowerThanFutbinPrice ? "oktobuy" : "";
        var deltaClass = delta < 0 ? "delta-green" : "delta-red";
        var deltaString = delta > 0 ? "+" + delta : delta;
        futbinPriceRaw = futbinPriceRaw + '<span class="' + deltaClass + '">(' + deltaString + ")</span>";
        console.log("Comparing: ", delta, bestDeal.gain, bestDeal);
        if (delta < bestDeal.gain) {
          bestDeal.gain = delta;
          bestDeal.name = item.data.getStaticData().name;
          bestDeal.futbinPrice = futbinPrice;
          bestDeal.price = item.data.getAuctionData().buyNowPrice;
        }
      }

      // jQuery(".secondary.player-stats-data-component").css("float", "left");
      targetForButton = target.find(".auction");
      targetForButton.show();
      targetForButton.prepend(
        '<div class="auctionValue futbin ' +
          okToBuyClass +
          '"><span class="label">Futbin <span class="futbinupdate">(' +
          futbinData[playerId].prices[platform].updated +
          ')</span></span><span class="coins value">' +
          futbinPriceRaw +
          "</span></div>"
      );
    });

    if (getCurrentControllerClassName() === "UTMarketSearchResultsSplitViewController") {
      $(".popup").show();
      if (bestDeal.gain === 0) {
        // reset
        $(".popup .name").text("Nothing found");
        $(".popup .price").text("");
        $(".popup .gain").text("");
      } else {
        $(".popup .name").text(bestDeal.name);
        $(".popup .price").text(bestDeal.price);
        $(".popup .gain").text(bestDeal.gain + " (coins cheaper)");
      }
    }
  }

  function getFutbinPlayerPrices(listRows) {
    var playersIds = listRows.map(a => (a.data.isPlayer() ? a.data.resourceId : null)).filter(a => a !== null);
    var futbinUrl = "https://www.futbin.com/19/playerPrices?player=&all_versions=" + playersIds.join(",");

    new GM_xmlhttpRequest({
      method: "GET",
      url: futbinUrl,
      onload: function(res) {
        var futbinData = JSON.parse(res.response);
        console.log("Found futbin prices for current page");
        showFutbinPriceInPage(listRows, futbinData);

        // clearInterval(globalInterval);
      }
    });
  }

  function getCurrentControllerClassName() {
    return getAppMain()
      .getRootViewController()
      .getPresentedViewController()
      .getCurrentViewController()
      .getCurrentController().className;
  }

  function getPagePlayerData() {
    if (document.querySelector(".futbin")) {
      return; // futbin price already added to the page
    }
    $(".popup").hide();
    var playerElements = document.querySelectorAll(".listFUTItem .player");
    if (playerElements.length > 0) {
      // players found
      var currentViewControllerClassName = getCurrentControllerClassName();

      // Club search or Player search
      if (
        currentViewControllerClassName === "ClubSearchResultsSplitViewController" ||
        currentViewControllerClassName === "UTMarketSearchResultsSplitViewController"
      ) {
        return getAppMain()
          .getRootViewController()
          .getPresentedViewController()
          .getCurrentViewController()
          .getCurrentController()._listController._view._list._listRows;
      }

      // Transfer list
      if (
        currentViewControllerClassName === "UTTransferListSplitViewController" ||
        currentViewControllerClassName === "UTWatchListSplitViewController"
      ) {
        return getAppMain()
          .getRootViewController()
          .getPresentedViewController()
          .getCurrentViewController()
          .getCurrentController()
          ._listController._view._sections.flatMap(a => a._listRows);
      }

      return;
    } else {
      return;
    }
  }

  function run() {
    globalInterval = setInterval(() => {
      var listRows = getPagePlayerData();

      if (listRows) {
        getFutbinPlayerPrices(listRows);
      }
    }, 1000);
  }
  run();
};

main();
