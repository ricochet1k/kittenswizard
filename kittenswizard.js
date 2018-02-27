(function() {
  
  // This is the data object for the Vue app
  let vis = {
    jobsTotalRatio: 0,
    jobsNext: "",
    jobsWant: {},
  };
  
  let jobsMap = {};
  for (let job of game.village.jobs) {
    jobsMap[job.name] = job;
  }
  
  Object.defineProperty(vis, "game", {
    configurable: false,
    enumerable: false,
    get() { return game },
  });
  
  if (window.vueApp) {
    let el = window.vueApp.$el;
    window.vueApp.$destroy();
    el.parentElement.removeChild(el);
    for (let e of document.querySelectorAll("#vueAppEl")) {
      e.parentElement.removeChild(e);
    }
  }
  
  let vueApp;
  
  function initVue() {
    let vueEl = window.vueEl = document.createElement('div');
    vueEl.id = "vueAppEl";
    document.getElementsByTagName('body')[0].appendChild(vueEl);
    
    vueApp = window.vueApp = new Vue({
      el: vueEl,
      template: `
<div id="vueAppEl">
jobs (total {{jobsTotalRatio}}):
<div v-for="jobs, name in jobsWant" :class="{want: jobs.want > jobs.have}" >{{name}}: {{jobs.want.toFixed(1)}} / {{jobs.have}}</div>
</div>
      `,
      data() {
        let v = vis;
        vis = this;
        return v;
      },
    });
  }
  
  if (!window.Vue) {
    console.log("loading vue");
    // fake out AMD and capture Vue
    window.exports = {};
    window.module = {
      set exports(v) {
        window.Vue = v;
        delete window.exports;
        delete window.module;
        initVue();
      },
    };
    
    (function(d, script) {
      script = d.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.onload = function(){};
      script.src = 'https://cdn.jsdelivr.net/npm/vue@2.5.13/dist/vue.min.js';
      d.getElementsByTagName('head')[0].appendChild(script);
    }(document));
  } else {
    initVue();
  }
  
  if (!window.vueStyleTag) {
      let style = document.createElement('style');
      style.type = 'text/css';
      style.id = 'vueStyleTag';
      document.getElementsByTagName('head')[0].appendChild(style);
  }
  
  vueStyleTag.innerText = `
#vueAppEl {
  border-radius: 10px;
box-shadow: 2px 2px 5px;
  background-color: white;
  padding: 10px;
  position: absolute;
  bottom: 50px;
  right: 50px;
}
#vueAppEl .want {
  font-weight: bold;
}
`;
  
  

  if (window.wizardHelper) clearInterval(window.wizardHelper);
  window.wizardHelper = setInterval(wizard, 500);
  
  const auto = {
    hunt: true,
    observe: true,
    praise: true,
    craft: true,
    build: true,
    village: true,
    religion: true,
    
    science: true,
    workshop: true,
  }
  
  const village = {
    leader: {trait: "Artisan", job: "miner"},
    promoteLeader: true,
    
    autojobs: true,
    //removeFromJobs: false, // TODO: not yet used
    jobs: {
      farmer: {min: 3, ratio: 8},
      woodcutter: {ratio: 38},
      miner: {ratio: 23},
      scholar: {ratio: 12},
      hunter: {ratio: 10},
      priest: {ratio: 3},
      geologist: {ratio: 6},
    },
  };
  
  const totalRatio = Object.values(village.jobs).map(j => j.ratio).reduce((a, b) => a + b, 0);
  vis.jobsTotalRatio = totalRatio;
  
  const autobuildSettings = {
    Bonfire_field: {},
//     Bonfire_aqueduct: {},
//     Bonfire_pasture: {},
    
    Bonfire_hut: {},
    Bonfire_logHouse: {},
//     Bonfire_mansion: {},
    
    Bonfire_barn: {},
    Bonfire_warehouse: {},
    Bonfire_harbor: {},
    
    Bonfire_library: {},
    Bonfire_academy: {},
    Bonfire_observatory: {},
    Bonfire_mine: {},
    Bonfire_smelter: {},
    Bonfire_lumberMill: {},
    Bonfire_workshop: {},
    Bonfire_amphitheatre: {},
    Bonfire_temple: {},
    Bonfire_chapel: {},
    Bonfire_tradepost: {},
    Bonfire_quarry: {max: 5},
    Bonfire_calciner: {max: 5},
//     Bonfire_oilWell: {max: 36},
    
    Bonfire_unicornPasture: {},
    
//     Space_duneMission: {},
//     Space_moonOutpost: {},
    
//     "Religion_Sacrifice Unicorns": {},
//     Religion_ivoryTower: {},
//     Religion_unicornTomb: {},
    
//     Trade_dragons: {when: {gold: 1000, titanium: 6000, uranium_lt: 500}},
    Trade_zebras: {when: {gold: 100, titanium_lt: 3300}},
  };

  // Science, Workshop and Religion ignore this
  const keeps = {
    catnip: 15000,
    //beam: 200,
    gold: 5000,
    parchment: 0, //500,
    titanium: 15,
    //manuscript: 500,
    //compedium: 1000,
     //science: 85000,
  };
  
  let btnKeeps = {};

  // {max: 500, when: {res: 200}, atatime: 1, ratio: 0.99, debug: true}
  const autocraftSettings = {
    wood: {ratio: 0.98, quiet: true},
    beam: {quiet: true},
    scaffold: {max: 9000, when: {beam: 200}, quiet: true},

    slab: {quiet: true},

    steel: {when: {coal: 1000, iron: 10000}, quiet: true},
    gear: {max: 45, when: {steel: 100}},
    alloy: {max: 20}, // titanium won't max out for a while
    concrate: {max: 180},
    plate: {quiet: true},
    
    ship: {when: {scaffold: 5000, plate: 600}},
    
    kerosene: {},

    parchment: {max: 10000, quiet: true},
    manuscript: {when: {parchment: 600}, quiet: true},
    compedium: {max: 4000, when: {manuscript: 500}}, // SIC
    blueprint: {max: 25, when: {compedium: 200}},
  };
  
  
  const r = game.resPool.resourceMap;

  var craftCache = {};

  function getCraft(k) {
    let c = craftCache[k];
    if (!c)
      c = craftCache[k] = game.workshop.getCraft(k);
    return c;
  }
  
  function switchTabId(tabId) {
    game.ui.activeTabId = tabId;
    game.ui.render();
  }

  function rerenderTabId(tabId) {
    const oldActiveTab = game.ui.activeTabId;
    switchTabId(tabId);
    switchTabId(oldActiveTab);
  }
  
  function updateTab(tab) {
    try {
        if (tab.visible) {
            tab.updateTab();
            tab.update();
        }
      }
      catch (e) {
        rerenderTabId(tab.tabId);
        try {
          if (tab.visible) {
              tab.updateTab();
              tab.update();
          }
        }
        catch (e) {
          console.error("Updating tab ", tab, e.message);
        }
      }
  }

  let buttons = {};
  function loadButtons() {
    buttons = {};
    window.buttons = buttons;
    function handleButton(t, b, name=undefined) {
      if (!b) return;
      
      if (!name) {
        if (b.model) {
          if (b.model.job) {
            name = b.model.job.name;
          } else if (b.model.metadata) {
            name = b.model.metadata.name;
          } else {
            name = b.model.name;
          }
        }
      }
      if (!name) name = "?";
      if (name.slice(0, 14) == "Praise the sun")
        name = "Praise";
      buttons[t.tabId + "_" + name] = b;
    }
    game.tabs.forEach(t => {
      updateTab(t);
      t.buttons.forEach(b => handleButton(t, b));
    });
    updateTab(game.religionTab);
    for (let k in game.religionTab) {
      if (k.slice(-3) == "Btn")
        handleButton(game.religionTab, game.religionTab[k]);
      else if (k.slice(-7) == "Buttons")
        game.religionTab[k].forEach(b => handleButton(game.religionTab, b));
    }
    updateTab(game.diplomacyTab);
    game.diplomacyTab.racePanels.forEach(r => {
      handleButton(game.diplomacyTab, r.tradeBtn, r.race.name);
    })
    // space
    if (game.spaceTab.visible) {
      updateTab(game.spaceTab);
      for (let btn of game.spaceTab.GCPanel.children)
        handleButton(game.spaceTab, btn);
      for (let planet of game.spaceTab.planetPanels) {
        for (let btn of planet.children)
          handleButton(game.spaceTab, btn);
      }
    }

  }
  loadButtons();
  
  function pairsToObj(pairs) {
    try {
    let obj = {};
    for (let {name: key, val: value} of pairs)
      obj[key] = value;
    return obj;
    }
    catch (e) {
      console.error(pairsToObj, pairs, e);
    }
  }

  
  function matchWhen(when, prices={}, _keeps=keeps) {
    for (let name in when) {
      let val = when[name];

      let lt = false;
      if (name.slice(-3) == "_lt") {
        lt = true;
        name = name.slice(0, -3);
      }

      if (!r[name]) console.error('bad when:', name);
      let have = r[name].value;
      let price = prices[name] || 0;
      let keep = _keeps[name] || 0;

      if (lt) {
        if (have > val || have < keep + price)
          return false;
      } else {
        if (have < Math.max(val, keep) + price)
          return false;
      }
    }
    for (let keepRes in _keeps) {
      let price = prices[keepRes];
      if (price == null) continue;
      if (r[keepRes] == null) console.error('matchWhen keeps? ', keepRes);
      let have = r[keepRes].value;
      let keep = _keeps[keepRes];
      if (have < keep + price)
        return false;
    }
    return true;
  }

  function autocraft(res, opt) {
    if (opt.max && r[res.name].value >= opt.max) return;

    if (!opt.when) opt.when = {};

    let price = game.workshop.getCraftPrice(res);

    if (!matchWhen(opt.when, pairsToObj(price)))
      return;

    let priceHasMax = false;
    let nearMax = false;
    let canCraft = Infinity;

    // Cases of different behavior:
    // Some resource is near its max
    //   - Craft as many as necessary to reduce that resource to its ratio
    //   - but only up to the number that can be crafted based on the others
    // None of the resources has a max
    //   - Craft up to the max of the main resource
    for (let {name, val} of price) {
      let p = r[name];

      if (p.value < val)
        return; // don't have enough of this resource to craft

      let keep = 0;
      let imNearMax = false;
      if (p.maxValue) {
        priceHasMax = true;
        // Keep low enough to craft at least one, or keep up to the ratio
        keep = Math.min(p.maxValue - val, p.maxValue * (opt.ratio || 0.995));
        // opt.when takes precedence
        keep = Math.max(opt.when[name] || 0, keep);

        // Something near max that probably won't be overrun and wasted within a few seconds
        let max = p.maxValue - (p.perTickCached ? p.perTickCached * 6 : val);
        if (p.value > max)
          imNearMax = true;
      } else {
        keep = opt.when[name] || 0;
      }
      keep = Math.max(keep, keeps[name] || 0);

      let multiple = 1;
      if (imNearMax)
        nearMax = true;
      if (!p.maxValue || imNearMax) {
        if (p.value > keep)
          multiple = (p.value - keep) / val;
      }
      if (multiple < canCraft)
        canCraft = multiple | 0;
      if (canCraft <= 0) {
        if (opt.debug)
          console.log("nocraft canCraft", res.name, name, p.value, multiple, canCraft);
        return;
      }
    }

    if (!priceHasMax || nearMax) {
      if (opt.atatime > canCraft) return;

      let howmany = opt.atatime || canCraft;
      let ratio = 1 + gamePage.getResCraftRatio({name : res.name});
      let oldhowmany = howmany;
      if (opt.max) howmany = Math.min(howmany, Math.ceil((opt.max - r[res.name].value) / ratio));
      if (!opt.quiet) console.log('autocrafting', res.name, howmany, "ratio:", ratio.toFixed(2), oldhowmany);
      game.workshop.craft(res.name, Math.max(0, howmany | 0), true); // don't undo
    }
  }

  function autobuild(btn, opt, _keeps=keeps) {
    if (!btn.model.visible) return; // can't see yet
    if (btn.model.resourceIsLimited) return; // don't have enough cap yet
    if (!btn.model.enabled) {
      return; // can't build yet
    }

    if (!opt.when) opt.when = {};

    if (!matchWhen(opt.when, pairsToObj(btn.model.prices), _keeps))
      return;
    if (opt.max && btn.model.metaAccessor.meta.val >= opt.max)
      return;

    let before = 0, after = 0;
    if (btn.model && btn.model.metaAccessor)
      before = btn.model.metaAccessor.meta.val;
    btn.domNode.click();

    let name = "";
    if (btn.tab) name = btn.tab.tabName;
    else name = btn;

    if (btn.race)
      console.log("autotrade", btn.race.name);
    else if (btn.model.metadata && btn.model.metaAccessor) {
      if (before != btn.model.metaAccessor.meta.val)
        console.log("autobuild", btn.model.metadata.name, before, '->', btn.model.metaAccessor.meta.val, name);
    } else if (btn.model.metadata)
      console.log("autobuild", btn.model.metadata.name, name);
    else
      console.log("autoclick", btn.model.name, name);
    btn.update();
  }

  
  function wizard() {
    if (!game || !game.workshop) return;

    if (Math.random() < 0.1) craftCache = {}; // seems to get messed up sometimes
    if (Math.random() < 0.1) loadButtons(); // seems to get messed up sometimes

    // auto hunt
    if (auto.hunt && r.manpower.value > r.manpower.maxValue * 0.99)
      game.village.huntMultiple((r.manpower.value / 100 / 1) | 0);

    // auto observe
    if (auto.observe && game.calendar.observeBtn)
      game.calendar.observeHandler();

    // auto praise
    // TODO: Only do if there is nothing to buy on the Religion tab?
    if (auto.praise && r.faith.value > r.faith.maxValue * 0.99)
      game.religion.praise();

    // opt = {
    //   max: maximum to craft
    //   atatime: how many to craft at once, default: 1
    // }
    

    if (auto.craft) {
      for (let k in autocraftSettings) {
        let c = getCraft(k);
        if (!c){
          console.error("No such craft: ", k);
          continue;
        }
        autocraft(c, autocraftSettings[k]);
      }
    }
    
    if (auto.build) {
      for (let k in autobuildSettings) {
        if (!buttons[k]){
          //console.error("No such button: ", k);
          continue;
        }
        autobuild(buttons[k], autobuildSettings[k]);
      }
    }
    
    if (auto.science) {
      for (let k in buttons) {
        if (k.slice(0, 8) == "Science_")
          autobuild(buttons[k], {}, {});
      }
    }

    if (auto.workshop) {
      for (let k in buttons) {
        if (k.slice(0, 9) == "Workshop_")
          autobuild(buttons[k], {}, {});
      }
    }
    
    if (auto.religion) {
      for (let k in buttons) {
        if (k.slice(0, 9) == "Religion_") {
          let name = k.slice(9);
          if (name == "?" || name == "Praise" || name.slice(0, 9) == "Transcend")
            continue;
          autobuild(buttons[k], {}, {});
        }
      }
    }
    
    if (auto.village) {
      vis.jobsWant = {};
      Object.entries(village.jobs).forEach(([job, spec]) => {
        vis.jobsWant[job] = {want: (spec.ratio / totalRatio) * game.village.maxKittens, have: jobsMap[job].value};
      });

      
      if (village.leader && !game.village.leader) {
        // matching trait and job (if exists)
        let traitJobKitten = null;
        
        // matching trait only
        let traitKitten = null;
        
        // find a leader that matches
        for (let k of game.village.sim.kittens) {
          if (k.trait.title == village.leader.trait) {
            if (!traitKitten || traitKitten.exp < k.exp)
              traitKitten = k;
            
            if (k.job == village.leader.job) {
              if (!traitJobKitten || traitJobKitten.exp < k.exp)
                traitJobKitten = k;
            }
          }
        }
        
        const newLeader = traitJobKitten || traitKitten;
        if (newLeader)
          game.villageTab.censusPanel.census.makeLeader(newLeader);
      }
      
      if (village.promoteLeader && game.village.leader) {
        // always promote
        // TODO: respect keeps.gold
        game.village.sim.promote(game.village.leader);
      }
      
      if (village.autojobs && game.village.getFreeKittens() > 0) {
        // which jobs need kittens. below .min takes priority, then lowest relative to ratio
        let maxRatio = 0;
        let totalMin = 0;
        let belowMin = []; // jobs below min
        for (let [name, jobSpec] of Object.entries(village.jobs)) {
          let assigned = jobsMap[name].value;
          if (jobSpec.min)
            totalMin += jobSpec.min;
          if (assigned < jobSpec.min)
            belowMin.push({job: jobsMap[name], below: jobSpec.min - assigned});
          
          if (jobSpec.ratio)
            maxRatio += jobSpec.ratio;
        }
        
        let kittensPerRatio = (game.village.maxKittens /*- totalMin*/) / maxRatio;
        let belowRatio = []; // jobs below ratio
        for (let [name, jobSpec] of Object.entries(village.jobs)) {
          if (!jobSpec.ratio) continue;
          
          let assigned = jobsMap[name].value;
          let want = kittensPerRatio * jobSpec.ratio;
          
          //if (jobSpec.min)
            // TODO: want -= job.min or something like it?
          
          if (assigned < want) {
            belowRatio.push({job: jobsMap[name], below: want - assigned});
          }
        }
        
        belowMin.sort((a, b) => b.below - a.below);
        belowRatio.sort((a, b) => b.below - a.below);
        
        // Just assign one kitten at a time for now.
        if (belowMin.length) {
          console.log('village assign <min', belowMin[0].job.name, belowMin);
          game.village.assignJob(belowMin[0].job);
        } else if (belowRatio.length) {
          console.log('village assign <ratio', belowRatio[0].job.name, belowRatio);
          game.village.assignJob(belowRatio[0].job);
        }
      }
      //game.village.maxKittens
      //game.village.sim.kittens
    }
  }

}())
