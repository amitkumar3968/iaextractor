/* Test cases
  1. http://www.youtube.com/watch?v=DQ6bJzzmQvM (video with four digit size, "1020 KB")
  2. http://www.youtube.com/watch?v=A02s8omM_hI (video with one page)
  3. http://www.youtube.com/watch?v=vNFcB-0QTho (video with two pages and non English title)
  4. http://www.youtube.com/watch?v=14dzliD5NNk (video with four pages)
  5. http://www.youtube.com/user/AdeleVEVO?feature=watch (video with three pages, user page, two different sizes based on the window's size)
  6. http://www.youtube.com/watch?v=z6ZV_pZZ_V8 (only for US viewer [still not supported])
  7. http://www.youtube.com/html5 (HTML5 player)
  8. https://www.youtube.com/movie/the-great-gatsby?feature=c4-overview (movie page. Two modes: before and after playing the movie [hiding the player cause error])
  9. http://www.youtube.com/watch?v=DeumyOzKqgI&feature=c4-overview&list=UUomP_epzeKzvBX156r6pm1Q (playlist)
*/

var $ = (function() {
  var cache = [];
  return function(id) {
    if (cache[id]) {
      return cache[id];
    }
    cache[id] = document.getElementById(id);
    return cache[id];
  }
})();
var html = (function() {
  var elems = {
    a: document.createElement("a"),
    span: document.createElement("span"),
    i: document.createElement("i"),
    div: document.createElement("div"),
  }
  return function(tag) {
    var tmp;
    switch (tag) {
    case "a":
    case "span":
    case "i":
      return elems[tag].cloneNode(false);
    default:
      return document.createElement(tag);
    }
  }
})();

var remove = function (elem) {
  if (typeof(elem) == "string") {
    elem = document.getElementById(elem);
  }
  if (!elem) return false;
  elem.parentNode.removeChild(elem);
  return true;
}

// Detect video player
var detect = function () {
  var embeds = (document.querySelector("body") || document).getElementsByTagName("embed");
  var html5s = (document.querySelector("body") || document).getElementsByTagName("video");

  var players = [].concat.apply([].concat.apply([], embeds), html5s)
  .sort(function (a, b) {
    return b.getBoundingClientRect().width - a.getBoundingClientRect().width;
  });

  if (players.length) {
    if (players[0].localName === "embed") { //Flash player
      return {
        player: players[0],
        method: "insertAdjacentHTML"
      }
    }
    else {  //HTML5 player
      return {
        player: players[0].parentNode.parentNode,
        method: "insertAdjacentHTML"
      }
    }
  }
  else {
    var parentDiv = document.getElementById("player-api");
    if (parentDiv) {
      return {
        player: parentDiv,
        method: "innerHTML"
      }
    }
    return {
      player: null,
      method: "insertAdjacentHTML"
    }
  }
}

// Make new menu
var Menu = function (doSize) {
  var vInfo, numbersPerPage, currentIndex;
  // Remove old menu and dropdown
  if (remove("iaextractor-menu")) {
    return; //Toggle
  }
  //
  var d = detect();
  var player = d.player;
  if (!player) {
    self.port.emit("error", "msg4");
    return;
  }
  var rect = player.getBoundingClientRect();
  var width = 320 + (doSize ? 15 : 0);

  var rtl = false;
  try {
    rtl = window.getComputedStyle(player,null).direction == "rtl";
  } catch (e) {}

  if (width > rect.width) {
    self.port.emit("error", "msg16");
    return;
  }
  var code =
    '<div id="iaextractor-menu" dir="ltr">' + //injected menu
    ' <span type="title">Download Links</span> ' +
    ' <span id="iaextractor-close" class="iaextractor-button"></span>' +
    ' <div id="iaextractor-items"></div> ' +
    ' <span id="iaextractor-load"></span>' +
    ' <span id="iaextractor-tabs"></span> ' +
    ' <span id="iaextractor-selected"></span> ' +
    ' <ul id="iaextractor-downloader">' + //dropdown
    ' <li><span>FlashGot</span></li>' +
    ' <li><span>DownThemAll!</span></li>' +
    ' <li><span>dTa! OneClick</span></li>' +
    ' </ul>' +
    '</div>';
  if (d.method == "insertAdjacentHTML") {
    player[d.method]("afterend", code);
  }
  else {
    player[d.method] = code;
  }
  var menu = $("iaextractor-menu"),
      items = $("iaextractor-items"),
      tabs = $("iaextractor-tabs"),
      downloader = $("iaextractor-downloader"),
      selected = $("iaextractor-selected"),
      load = $("iaextractor-load"),
      visible = [];

  var position = function(el, times) {
    var el = document.getElementsByClassName(el);
    for (var i = 0; i < el.length; i++) {
      el[i].style.transform = "translate(" + width * times + "px)";
    }
  }

  var select = function () {
    for (var i = 0; i < items.childNodes.length; i++) {
      if (i == 0) items.childNodes[i].setAttribute("class", "center");
      if (i > 0) items.childNodes[i].setAttribute("class", "right");
    }
    position("center", 1);
    position("right", 2);
    visible.unshift(0);
    items.childNodes[0].style.opacity = "1";
    tabs.children[0].setAttribute("selected", "true");
  }

  numbersPerPage = Math.floor((rect.height - 83) / 51); // Each item is 51

  // Adding styles
  for (var i = 0; i < downloader.children.length; i++) {
    downloader.children[i].setAttribute("style", 'width: ' + width/3 + 'px;');
  }
  menu.setAttribute("style",
    'top: ' + (rect.top - menu.getBoundingClientRect().top) + 'px;' +
    'left: ' + (rtl ? 0 : rect.width - width) + 'px;' +
    'width: ' + width + 'px;' +
    'height: ' + rect.height + 'px;'
  );
  load.setAttribute("style",
    'margin-top: ' + (rect.height - 126) / 2 + 'px;' +
    'margin-left: ' + (width - 64) / 2 + 'px;'
  );
  items.setAttribute("style",
    'width: ' + width * 3 + 'px;' +
    'margin-left: -' + width + 'px;'
  );
  tabs.setAttribute("style", 'width: ' + width + 'px;');
  selected.style.transform = 'translate(0)';

  // Listeners
  var itag;

  tabs.addEventListener('click', function (e) {
    var elem = e.originalTarget;
    var index = elem.getAttribute("index");
    if (index === null) return;
    index = parseInt(index);
    selected.style.transform = "translate(" + (width / tabs.children.length) * index + "px)";
    // Show just 2 pages of items
    if (visible.length == 2) visible.pop();
    visible.unshift(index);
    for (var i = 0; i < items.childNodes.length; i++) {
      if (items.childNodes[i].style.opacity == "1") items.childNodes[i].style.removeProperty("opacity");
    }
    items.childNodes[visible[0]].style.opacity = "1";
    if (visible.length == 2) items.childNodes[visible[1]].style.opacity = "1";
    // Move pages
    for (var i = 0; i < items.childNodes.length; i++) {
      if (i == index) {
        items.childNodes[i].setAttribute("class", "center");
        tabs.children[i].setAttribute("selected", "true");
        position("center", 1);
      }
      else if (i < index) {
        items.childNodes[i].setAttribute("class", "left");
        tabs.children[i].removeAttribute("selected");
        position("left", 0);
      }
      else if (i > index) {
        items.childNodes[i].setAttribute("class", "right");
        tabs.children[i].removeAttribute("selected");
        position("right", 2);
      }
    }
  }, false);
  items.addEventListener('click', function (e) {
    var target = e.originalTarget;
    var isDropdown = target.className.indexOf("iaextractor-dropdown") != -1;
    target = (isDropdown || target.localName != "a") ? target.parentNode : target;
    if (isDropdown) {
      if (target.getAttribute("selected") == "true") {
        target.removeAttribute("selected");
        downloader.style.bottom = "-32px";
      }
      else {
        var formats = document.getElementsByClassName("iaextractor-item");
        for (var i = 0; i < formats.length; i++) {
          if (formats[i].hasAttribute("selected")) formats[i].removeAttribute("selected");
        }
        target.setAttribute("selected", "true");
        downloader.style.bottom = 0;
        itag = target.getAttribute("itag");
      }
      e.stopPropagation();
      e.preventDefault();
    }
    else if (target.localName == "a") {
      self.port.emit("download", target.getAttribute("itag"));
      e.stopPropagation();
      e.preventDefault();
    }
  }, false);
  downloader.addEventListener('click', function (e) {
    var format = vInfo.formats.reduce(function (p, c) {
      return p || (c.itag + "" == itag ? c : null);
    }, null);
    self.port.emit(
      e.originalTarget == downloader.children[0] ? "flashgot" : "downThemAll",
      format,
      vInfo,
      e.originalTarget == downloader.children[2] ? true : false
    );
  }, false);
  $("iaextractor-close").addEventListener('click', function (e) {
    remove("iaextractor-menu");
  }, false);

  return {
    initialize: function (_vInfo) {
      vInfo = _vInfo;
      function map (str) {
        switch (str) {
        case "hd720":
          return "720p";
        case "hd1080":
          return "1080p";
        default:
          return (str || "").toLowerCase().replace(/./, function($1) {return $1.toUpperCase();});
        }
      }
      // filter formats based on user settings
      vInfo.formats = vInfo.formats.filter(function (elem) {
        if (self.options.showFLV && elem.container === "flv") return true;
        if (self.options.showWEBM && elem.container === "webm") return true;
        if (self.options.showMP4 && (elem.container === "mp4" || elem.container === "m4a")) return true;
        if (self.options.show3GP && elem.container === "3gp") return true;
        return !(self.options.showFLV || self.options.showWEBM || self.options.showMP4 || self.options.show3GP);
      });
      //Remove loading icon
      remove("iaextractor-load");
      //Add new items
      var tabIndex = Math.floor((vInfo.formats.length - 1) / numbersPerPage) + 1,
          tabWidth = width / tabIndex;
      for (var i = 0; i < tabIndex; i++) {
        var div = html("div");
        div.setAttribute("style", 'width: ' + width + 'px;');
        $("iaextractor-items").appendChild(div);
        var span = html("span");
        span.setAttribute("index", i);
        span.setAttribute("style", 'width: ' + tabWidth + 'px;');
        span.textContent = i + 1;
        if (i === 0) {
          span.setAttribute("selected", "true");
        }
        $("iaextractor-tabs").appendChild(span);
      }
      tabs.style.display = tabIndex == 1 ? "none" : "block";
      selected.style.display = tabIndex == 1 ? "none" : "block";
      selected.style.width = tabWidth + 'px';

      vInfo.formats.forEach (function (elem, index) {
        var url = elem.url + "&title=" + encodeURIComponent(vInfo.title);
        if (url.indexOf("keepalive=yes") === -1) {
          url += "&keepalive=yes";
        }
        var a = html("a");
        a.setAttribute("class", "iaextractor-item");
        a.setAttribute("href", url);
        a.setAttribute("itag", elem.itag);
        var text = html("span");
        var dropdown = html("span");
        dropdown.setAttribute("class", "iaextractor-button iaextractor-dropdown");
        if (elem.dash) {
          dropdown.setAttribute("dash", elem.dash);
          if (elem.fps === "60") {
            dropdown.setAttribute("fps", "60");
          }
          dropdown.setAttribute(
            "title",
            elem.dash === "v" ? "video-only (no sound)" + (elem.fps === "60" ? " (60fps)" : "") : "audio-only (no video)");
        }
        var i = html("i");
        dropdown.appendChild(i);
        a.appendChild(text);
        a.appendChild(dropdown);
        text.textContent =
          elem.container.toUpperCase() + " " + map(elem.quality) +
          (elem.audioEncoding ? " - " + elem.audioEncoding.toUpperCase() + " " + elem.audioBitrate + "K" : "");

        var i = Math.floor(index / numbersPerPage);
        items.children[i].appendChild(a);
        //Requesting File Size
        if (doSize) {
          self.port.emit("file-size-request", url, i, items.children[i].children.length - 1);
        }
      });
    select();
    }
  }
}
self.port.on("file-size-response", function(url, size, i1, i2) {
  var a = $("iaextractor-items").children[i1].children[i2];
  if (!a || a.localName !== "a") return;
  var span = a.childNodes[0];
  //Rejecting wrong file size
  if (a.getAttribute("href") != url) {
    return;
  }
  span.textContent += " - " + size;
});

var menu = new Menu(self.options.doSize);
self.port.on("info", menu.initialize);
// Clean up after installation
self.on("detach", function() {
  remove("iaextractor-menu");
});
