// ==UserScript==
// @name            enterSelects.uc.js
// @include         main
// @startup         UC.enterSelects.exec(win);
// @shutdown        UC.enterSelects.destroy();
// @author          xiaoxiaoflood
// @onlyonce
// ==/UserScript==

// ver se dá pra tornar independente das outras preferências, exceto o autofill

(function () {

  UC.enterSelects = {
    exec: function (win) {
      xPref.lock('browser.urlbar.autoFill', false);
      xPref.set('browser.urlbar.matchBuckets', 'general:1', true);
      let gURLBar = win.gURLBar;

      gURLBar.controller.orig_oRA = gURLBar.controller.receiveResults
       gURLBar.controller.receiveResults = (function () {
          return function () {
            if (UC.enterSelects.shouldSelect(gURLBar, arguments[0]))
              gURLBar.view._selectItem(gURLBar.view._rows.children[1], { updateInput: false});

            var result =  gURLBar.controller.orig_oRA.apply(this, arguments);
            return result;
          };
        }
      )();

      gURLBar.textbox.addEventListener('keydown', this.keyD, true);
    },

    shouldSelect: function (gURLBar, queryContext) {
      if (queryContext.lastResultCount < 1 || gURLBar.view.selectedIndex > 0)
        return false;

      let {value} = gURLBar;
      if (gURLBar.selectionEnd == value.length)
        value = value.slice(0, gURLBar.selectionStart);
      let search = value.trim();

      try {
        // Test if is URL
        return !Services.eTLD.getBaseDomainFromHost(search);
      } catch (ex) {}

      // Test about:about, chrome://blabla ... 
      if (/[a-zA-Z][\w-]*:(\/\/)?[\w-]+/.test(search))
        return false;

      // Check if the first word is a keyword (search or bookmark) or search suggestion (if enabled and there is no result)
      if (!!queryContext.results[0].payload.keyword || !queryContext.results[1].payload.displayUrl)
        return false;

      return true;
    },
    keyD: (e) => {
      let gURLBar = this.gURLBar;
      if (e.keyCode == e.DOM_VK_TAB) {
        let url = gURLBar.view._queryContext.results[1].payload.url;
        if (gURLBar.view.selectedIndex == 1 && gURLBar.value != url && new RegExp(/^(https?:\/\/(www\.)?)?/.source + gURLBar.value.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).test(url) && gURLBar.value != url.match(/(\w*:\/\/)?.+\..+?\//)[0]) {
          gURLBar.value = url.match(/(\w*:\/\/)?.+\..+?\//)[0];
          gURLBar.view.selectedIndex = gURLBar.value == url ? 1 : -1;
          e.preventDefault();
          e.stopPropagation();
        } else if (gURLBar.view.selectedIndex == -1) {
          gURLBar.view.selectedIndex = 1;
          gURLBar.value = url;
          e.preventDefault();
          e.stopPropagation();
        } else if (gURLBar.view.selectedIndex == 1 && gURLBar.value != url) {
          gURLBar.value = url;
          e.preventDefault();
          e.stopPropagation();
        }
      }
    },

    destroy: function () {
      xPref.unlock('browser.urlbar.autoFill');
      _uc.windows((doc, win) => {
        let gURLBar = win.gURLBar;
        gURLBar.controller.receiveResults = gURLBar.controller.orig_oRA;
        gURLBar.removeEventListener('keydown', this.keyD, false);
      });
      delete UC.enterSelects;
    }
  }

})()