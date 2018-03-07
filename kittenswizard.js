(function() {
  
  // This is the data object for the Vue app
  let vis = {
    jobsTotalRatio: 0,
    jobsNext: "",
    jobsWant: {},
    btnPrices: {},
    currGoal: null,
    currGoalList: [],
    debug: [],
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
  <div id="goal">
    goal: {{currGoal ? currGoal.name : JSON.stringify(currGoal)}}
    <table>
      <tr v-for="{phase, name} in currGoalList" :class="{want: true}" ><td>{{name}}: </td><td>{{dispPhase(phase)}}</td></tr>
    </table>
  </div>
  <div id="jobs">
    jobs (total {{jobsTotalRatio}}):
    <table>
      <tr v-for="jobs, name in jobsWant" :class="{want: jobs.want > jobs.have}" ><td>{{name}}: </td><td>{{jobs.want.toFixed(1)}} / {{jobs.have}}</td></tr>
    </table>
  </div>
  <div id="prices">
    btn prices:
    <table>
      <tr v-for="price, name in btnPrices" :class="{want: price > have(name)}" ><td>{{name}}: </td><td>{{display(price)}} / {{display(have(name))}}</td></tr>
    </table>
  </div>
<div id="debug">
  <pre v-for="line, i in debug" :key='i'>{{line}}</pre>
</div>
</div>
      `,
      data() {
        let v = vis;
        vis = this;
        return v;
      },
      methods: {
        have(name) {
          return r[name].value;
        },
        display(val) {
          const units = ' KMGTP?';
          let u = 0;
          while(val > 10000) {
            val /= 1000;
            u += 1;
          }
          if (val - (val | 0))
            val = val.toFixed(1);
          return val + (u? units[u] : '');
        },
        dispPhase(phase) {
          return [
            "hidden",
            "max too low",
            "res too low",
            "ready",
            "Built!",
            "Done!",
          ][phase];
        },
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
  
  if (window.vueStyleTag) {
    
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
#vueAppEl table {
  border-spacing: 0;
}
#vueAppEl table td {
  padding: 0 3px;
}
#vueAppEl #debug {
  position: absolute;
  background-color: white;
  left: -500px;
  bottom: -40px;
}
#vueAppEl #debug pre {
  margin: 0;
}
`;
  
  }
  
  

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
    goalbuild: true,
  }
  
  const village = {
    leader: {trait: "Artisan", job: "miner"},
    promoteLeader: true,
    
    autojobs: true,
    //removeFromJobs: false, // TODO: not yet used
    jobs: {
      farmer: {min: 3, ratio: 15}, // need a minimum to produce enough food during cold winter -90%
      woodcutter: {ratio: 20}, // needed when wood/beam/scaffold is low and needed
      miner: {ratio: 17}, // needed when minerals/slab are needed. Production must be positive, and slab is needed for zebras
      scholar: {ratio: 13}, // only needed if science is low or science is being used (compendiums/blueprints)
      hunter: {min: 1, ratio: 15}, // always needed, needed more when things need parchment/manuscript/compendium/blueprint (generally when manuscript is low, if manuscript is high then science can't keep up)
      priest: {ratio: 8},
      geologist: {ratio: 12}, // needed when coal prod < half of iron prod
    },
  };
  
  const totalRatio = Object.values(village.jobs).map(j => j.ratio).reduce((a, b) => a + b, 0);
  vis.jobsTotalRatio = totalRatio;
  
  // Use these as goals
  const goalbuild = [
    {name: "Mine", btns: {Bonfire_mine: {max: 1}}},
    {name: "Smelter", btns: {Bonfire_smelter: {max: 1}}},
    {name: "Workshop", btns: {Bonfire_workshop: {max: 1}}},
    {name: "Coal!", btns: {Workshop_deepMining: {}, Workshop_coalFurnace: {}}},
    {name: "Space!", btns: {Space_orbitalLaunch: {}}},
    {name: "Satellite", btns: {Space_sattelite: {max: 1}}},
    {name: "Moon", btns: {Space_moonMission: {}, Bonfire_oilWell: {max: 28}}},
    {name: "Lunar Outpost", btns: {Space_moonOutpost: {max: 1}, Bonfire_oilWell: {max: 34}}},
    {name: "Dune", btns: {Space_duneMission: {}}},
    {name: "Piscine", btns: {Space_piscineMission: {}}},
  ];
  
  // priceMult slows things down, so they can only be bought if there is a multiple of their price available
  const autobuildSettings = {
    // Catnip
    Bonfire_field: {},
//     Bonfire_aqueduct: {},
//     Bonfire_pasture: {},
    
    // Housing
    Bonfire_hut: {},
    Bonfire_logHouse: {},
    Bonfire_mansion: {priceMult: 3},
    
    // Storage
    Bonfire_barn: {},
    Bonfire_warehouse: {},
    Bonfire_harbor: {},
    
    // Science
    Bonfire_library: {},
    Bonfire_academy: {},
    Bonfire_observatory: {priceMult: 2},
    Bonfire_bioLab: {priceMult: 3},
    
    Bonfire_mine: {priceMult: 1.5},
    Bonfire_smelter: {},
    Bonfire_lumberMill: {priceMult: 1.5},
    Bonfire_steamworks: {max: 15, priceMult: 3},
    Bonfire_magneto: {max: 15, priceMult: 3},
    Bonfire_quarry: {priceMult: 2},
    Bonfire_calciner: {priceMult: 2, dry: true},
    Bonfire_oilWell: {priceMult: 2},
    Bonfire_accelerator: {max: 2},
    Bonfire_reactor: {max: 1},
    Bonfire_factory: {max: 1},
    
    // Bonuses
    Bonfire_workshop: {},
    Bonfire_amphitheatre: {},
    Bonfire_tradepost: {},
    
    // Religion
    Bonfire_temple: {},
    Bonfire_chapel: {priceMult: 1.5},
    Bonfire_unicornPasture: {},
//     Bonfire_ziggurat: {},
    
//     Space_duneMission: {},
//     Space_moonOutpost: {},
    
    "ReligionBtn_Sacrifice Unicorns": {},
    Unicorns_unicornTomb: {},
    Unicorns_ivoryTower: {},
    
    Trade_dragons: {when: {get gold(){return r.gold.maxValue / 2}, get titanium() {return r.titanium.maxValue - 100}, get uranium_lt() {return r.uranium.maxValue - 2}}, quiet: true},
    Trade_zebras: {when: {get gold(){return r.gold.maxValue / 2}, get titanium_lt() {return r.titanium.maxValue - 100}}, quiet: true},
  };

  // Science, Workshop and Religion ignore this
  const keeps = {
    catnip: 1000,
    ship: 2000,
    //beam: 200,
    //gold: 5000,
//     parchment: 0, //500,
//     titanium: 15,
    //manuscript: 500,
    //compedium: 1000,
     //science: 85000,
  };

  // {max: 500, when: {res: 200}, atatime: 1, ratio: 0.99, debug: true}
  const autocraftSettings = {
    wood: {ratio: 0.98, quiet: true},
    beam: {quiet: true},
    scaffold: {max: 9000, when: {beam: 200}, quiet: true},

    slab: {quiet: true},

    steel: {when: {}, quiet: true, debug: true},
    gear: {max: 1, when: {steel: 1}},
    alloy: {max: 2}, // titanium won't max out for a while
    concrate: {max: 10},
    plate: {quiet: true, debug: true},
    
    ship: {when: {scaffold: 5000, plate: 600}},
    
    kerosene: {},

    parchment: {max: 10000, quiet: true},
    manuscript: {max: 50000, quiet: true, debug: true},
    compedium: {get max(){return (r.blueprint.unlocked && r.blueprint.value < 300)? r.blueprint.value * 8 + 25 : 100000}, quiet: false, debug: true}, // SIC
    blueprint: {max: 300, when: {get compedium(){return r.blueprint.value * 8}}, quiet: true},
  };
  
  
  function debug(dbg, ...msg) {
    if (dbg) {
      //console.log(...msg);
      vis.debug.push(msg.join(' '));
    }
  }
  
  const r = game.resPool.resourceMap;
  window.r = r;

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
    function handleButton(t, b, name=undefined, tabName=undefined) {
      if (!b) return;
      
      if (!name) {
        if (b.model) {
          if (b.model.job) {
            name = b.model.job.name;
          } else if (b.model.metadata) {
            name = b.model.metadata.name;
          } else if (b.opts) {
            name = b.opts.name;
          } else {
            name = b.model.name;
          }
        }
      }
      if (!name) name = "?";
      //if (name.slice(0, 14) == "Praise the sun")
      //  name = "Praise";
      if (!tabName)
        tabName = t.tabId;
      buttons[tabName + "_" + name] = b;
    }
    game.tabs.forEach(t => {
      updateTab(t);
      t.buttons.forEach(b => handleButton(t, b));
    });
    updateTab(game.religionTab);
    game.religionTab.rUpgradeButtons.forEach(b => handleButton(game.religionTab, b));
    game.religionTab.zgUpgradeButtons.forEach(b => handleButton(game.religionTab, b, undefined, "Unicorns"));
    for (let k in game.religionTab) {
      if (k.slice(-3) == "Btn")
        handleButton(game.religionTab, game.religionTab[k], undefined, "ReligionBtn");
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

  
  function matchWhen({when, prices={}, keeps, dbg=false, priceMult=1, name}) {
    for (let wname in when) {
      let val = when[wname];

      let lt = false;
      if (wname.slice(-3) == "_lt") {
        lt = true;
        wname = wname.slice(0, -3);
      }

      if (!r[wname]) console.error('bad when:', wname);
      let have = r[wname].value;
      let price = (prices[wname] || 0) * priceMult;
      let keep = keeps[wname] || 0;

      if (lt) {
        if (have > val) {
          debug(dbg, "matchWhen", name, wname, have, val, price, keep);
          return false;
        }
      } else {
        if (have < Math.max(val, keep) + price) {
          debug(dbg, "matchWhen", name, wname, have, val, price, keep);
          return false;
        }
      }
    }
    for (let keepRes in keeps) {
      let price = prices[keepRes];
      if (price == null) continue;
      if (r[keepRes] == null) console.error('matchWhen keeps? ', keepRes);
      let have = r[keepRes].value;
      let keep = keeps[keepRes];
      if (have < keep + price * priceMult) {
        debug(dbg, "matchWhen", name, keepRes, have, price, keep);
        return false;
      }
    }
    /*if (prices.oil && name != "kerosene")
      debug(true, "matchWhen oil", name, r.oil.value, when.oil, prices.oil, keeps.oil, keeps);
    if (prices.alloy)
      debug(true, "matchWhen alloy", name, r.alloy.value, when.alloy, prices.alloy, keeps.alloy, keeps);
      */
    return true;
  }

  function autocraft(res, opt, keeps) {
    //if (res.name == 'plate') console.log('== autocraft', res, opt, keeps);
    let max = opt.max? Math.max(opt.max, keeps[res.name] || 0) : null;
    if (max && r[res.name].value >= max) return debug(opt.debug, res.name, ">=max", max, keeps[res.name]);

    if (!opt.when) opt.when = {};

    let ratio = 1 + gamePage.getResCraftRatio({name : res.name});
    let price = game.workshop.getCraftPrice(res);

    if (!matchWhen({name: res.name, when: opt.when, prices: pairsToObj(price), keeps, dbg: opt.debug, priceMult: opt.priceMult || 1}))
      return debug(opt.debug, res.name, 'when');

    let priceHasMax = false;
    let nearMax = false;
    let canCraft = Infinity;
    let shouldCraft = 0; // for nearMax
    
    let wantThisRes = keeps[res.name] && r[res.name].value < keeps[res.name];

    // Cases of different behavior:
    // Some resource is near its max
    //   - Craft as many as necessary to reduce that resource to its ratio
    //   - but only up to the number that can be crafted based on the others
    // None of the resources has a max
    //   - Craft up to the max of the main resource
    for (let {name, val} of price) {
      let p = r[name];

      if (p.value < val)
        return debug(opt.debug, res.name, "not enough", name, val, 'have:', p.value); // don't have enough of this resource to craft

      let keep = 0;
      let keepNearMax = 0;
      let imNearMax = false;
      if (p.maxValue) {
        priceHasMax = true;
        
        // if the res we are crafting is needed, use a lower ratio to craft faster
        let ratio = opt.ratio || (wantThisRes? 0.1 : 0.995);
        
        // Keep low enough to craft at least one, or keep up to the ratio
        keepNearMax = Math.min(p.maxValue - val, p.maxValue * ratio);
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

      let multiple = 0;
      let multipleNearMax = 0;
      //if (!p.maxValue || true) {
        if (p.value > keep)
          multiple = (p.value - keep) / val;
        if (multiple < canCraft)
          canCraft = multiple | 0;
        if (canCraft <= 0) {
          debug(opt.debug, res.name, "nocraft canCraft", name, p.value, multiple, imNearMax, keep, keepNearMax);
          return;
        }
      //}
      if (imNearMax) {
        nearMax = true;
        if (p.value > keepNearMax)
          multipleNearMax = (p.value - keepNearMax) / val;
        if (multipleNearMax > shouldCraft)
          shouldCraft = multipleNearMax;
      }
    }
    
    let goalToCraft = res.name in keeps? Math.max(0, keeps[res.name] - r[res.name].value) : 0;
    
    let howManyToCraft = 0;
    if (!priceHasMax) howManyToCraft = canCraft;
    else if (goalToCraft) howManyToCraft = Math.min(canCraft, goalToCraft);
    else if (nearMax) howManyToCraft = Math.min(canCraft, shouldCraft);
    
    if (opt.atatime) howManyToCraft = Math.min(howManyToCraft, opt.atatime);
    
    if (howManyToCraft < 1){
      debug(opt.debug, res.name, 'howManyToCraft', howManyToCraft, priceHasMax, canCraft, nearMax, shouldCraft);
      return;
    }
    
    if (howManyToCraft > canCraft)
      debug(true, res.name, 'howManyToCraft:', howManyToCraft, 'can:', canCraft, 'should:', shouldCraft, 'max:', max);
    
    let howmany = howManyToCraft;
    if (max) howmany = Math.min(howmany, Math.ceil((max - r[res.name].value) / ratio));
    if (!opt.quiet)
      console.log('autocrafting', res.name, howmany, "ratio:", ratio.toFixed(2), howManyToCraft, "can", canCraft, "should", shouldCraft, "max", max);
    
    if (howmany < 1){
      debug(opt.debug, res.name, 'howmany', priceHasMax, canCraft, nearMax, shouldCraft);
      return;
    }
    let before = r[res.name].value;
    game.workshop.craft(res.name, Math.max(0, howmany | 0), true); // don't undo
    let after = r[res.name].value;
    
    if (opt.debug)
      debug(true, res.name, 'crafted:', howmany, 'howManyToCraft:', howManyToCraft, 'can:', canCraft, 'should:', shouldCraft, 'max:', max, 'actually:', after-before);
  }
  
  function recordBtnPrice(btn, inKeeps) {
    const prices = btn.model.prices;
    let missingCraftable = false;
    for (let {name, val} of prices) {
      if (!r[name].craftable) continue;
      
      inKeeps[name] = Math.max(inKeeps[name] || 0, val);
      if (r[name].value < val)
        missingCraftable = true;
    }
    // wait for craftable resources first so we don't block up
    // the non-craftable resources the craftable ones might need
    // like science
    if (missingCraftable) return;
    
    for (let {name, val} of prices) {
      if (r[name].craftable) continue;
      
      inKeeps[name] = Math.max(inKeeps[name] || 0, val);
    }
  }
  
  function btnGetHave(btn) {
    if (!btn.model) return console.log("no model", btn) || 0;
    const model = btn.model;
    if (btn.race) return 0; // Trading

    if (model.metaAccessor)
      return model.metaAccessor.meta.val;
    else if (model.metadata) {
     if ('val' in model.metadata)
        return model.metadata.val;
      else if ('researched' in model.metadata)
        return +model.metadata.researched;
    }
    //if (Math.random() < 0.05) console.log("btnGetHave", btn);
    return 0;
  }

  // returns phase:
  // 0 -> not available
  // 1 -> available, but not enough max
  // 2 -> available, but not enough resources
  // 3 -> available for build
  // 4 -> built one
  // 5 -> max limit hit, no more requested
  const PHASE_NOT_AVAIL = 0;
  const PHASE_NO_MAX = 1;
  const PHASE_NO_RES = 2;
  const PHASE_AVAIL = 3;
  const PHASE_BUILT = 4;
  const PHASE_AT_MAX = 5;
  function autobuild(btn, opt, recordPriceIn, keeps) {
    const model = btn.model;
    const meta = model.metadata;
    
    let name = "";
    if (btn.tab) name = btn.tab.tabName;
    else name = btn;

    if (!opt.when) opt.when = {};
    
    let have = btnGetHave(btn);
    
    if (opt.max && have >= opt.max)
      return PHASE_AT_MAX;
    
    if (meta && (meta.researched || (meta.on && meta.noStackable))) return PHASE_AT_MAX; // have one, can't build more
    if (!model.visible) return PHASE_NOT_AVAIL; // can't see yet
    if (model.resourceIsLimited) return PHASE_NO_MAX; // don't have enough cap yet
    if (!model.enabled) {
      if (recordPriceIn && model.prices) {
        recordBtnPrice(btn, recordPriceIn);
      }
      return PHASE_NO_RES; // can't build yet
    }

    if (!matchWhen({name, when: opt.when, prices: pairsToObj(model.prices), priceMult: opt.priceMult || 1, keeps, debug: opt.debug}))
      return PHASE_NO_RES; // debug(opt.debug, name, "when", btn.model.prices, keeps);

    let before = have, after = 0;
    if (!opt.dry)
      btn.domNode.click();

    if (!opt.quiet) {
      if (btn.race)
        console.log("autotrade", btn.race.name);
      else if (model.metadata && model.metaAccessor) {
        if (before != model.metaAccessor.meta.val)
          console.log("autobuild", meta.name, before, '->', btnGetHave(btn), name);
      } else if (model.metadata)
        console.log("autobuild", meta.name, before, '->', btnGetHave(btn), name);
      else
        console.log("autoclick", model.name, name);
    }
    btn.update();
    
    return PHASE_BUILT;
  }

  
  function wizard() {
    if (!game || !game.workshop) return;
    
    vis.debug = [];

    if (Math.random() < 0.1) craftCache = {}; // seems to get messed up sometimes
    if (Math.random() < 0.1) loadButtons(); // seems to get messed up sometimes

    // auto hunt
    if (auto.hunt && r.manpower.value > r.manpower.maxValue * 0.99) {
      let hunts = r.manpower.value / 100;
      if (hunts > 40)
        hunts /= 2;
      game.village.huntMultiple(hunts | 0);
    }

    // auto observe
    if (auto.observe && game.calendar.observeBtn)
      game.calendar.observeHandler();

    // auto praise
    // TODO: Only do if there is nothing to buy on the Religion tab?
    //if (auto.praise && (r.faith.value > r.faith.maxValue * 0.99 || r.faith.value > r.faith.perTickCached * 100))
    if (auto.praise && r.faith.value > r.faith.maxValue * 0.99)
      game.religion.praise();

    let goalKeeps = Object.create(keeps);
    
    
    if (auto.goalbuild) {
      vis.currGoal = 'done';
      vis.currGoalList = [];
      for (let goal of goalbuild) {
        let stopHere = false;
        
        if (goal.btns) for (let k in goal.btns) {
          if (!(k in buttons)) {
            stopHere = true;
            vis.currGoalList.push({
              name: k,
              phase: 0,
            })
            continue;
          }
          let phase = autobuild(buttons[k], goal.btns[k], goalKeeps, keeps);
          if (phase != PHASE_AT_MAX) {
            stopHere = true;
            vis.currGoalList.push({
              name: k,
              phase,
            })
          }
        }
        
        if (stopHere) {
          vis.currGoal = goal;
          break;
        }
      }
    }
    
    let afterGoalKeeps = Object.create(goalKeeps);
    
    if (auto.science) {
      for (let k in buttons) {
        if (k.slice(0, 8) == "Science_")
          autobuild(buttons[k], {}, afterGoalKeeps, goalKeeps);
      }
    }

    if (auto.workshop) {
      for (let k in buttons) {
        if (k.slice(0, 9) == "Workshop_")
          autobuild(buttons[k], {}, afterGoalKeeps, goalKeeps);
      }
    }
    
    if (auto.religion) {
      for (let k in buttons) {
        if (k.slice(0, 9) == "Religion_") {
          autobuild(buttons[k], {}, afterGoalKeeps, goalKeeps);
        }
      }
    }
    
    // hack to allow compendium and blueprint to still be crafted
    //if (afterGoalKeeps.copendium && afterGoalKeeps.science)
    //  afterGoalKeeps.science = Math.min(afterGoalKeeps.science, r.science.maxValue - 10000 - 1000);
    //if (afterGoalKeeps.blueprint && afterGoalKeeps.science)
    if (r.science.maxValue > 25000 + 100)
      afterGoalKeeps.science = Math.min(afterGoalKeeps.science, r.science.maxValue - 25000 - 100);
    

    if (auto.craft) {
      for (let k in autocraftSettings) {
        let c = getCraft(k);
        if (!c){
          console.error("No such craft: ", k);
          continue;
        }
        autocraft(c, autocraftSettings[k], afterGoalKeeps);
      }
    }
    
    if (auto.build) {
      for (let k in autobuildSettings) {
        if (!buttons[k]){
          //console.error("No such button: ", k);
          continue;
        }
        autobuild(buttons[k], autobuildSettings[k], false, afterGoalKeeps);
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
          if (!jobSpec.min) continue;
          const btn = buttons['Village_' + name];
          if (!(btn && btn.model.visible && btn.model.enabled)) continue;
          
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
          const btn = buttons['Village_' + name];
          if (!(btn && btn.model.visible && btn.model.enabled)) continue;
          
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
        
        let assigned = 0;
        
        // Just assign one kitten at a time for now.
        if (belowMin.length) {
          //game.village.assignJob(belowMin[0].job);
          for (let bjob of belowMin) {
            const btn = buttons['Village_' + bjob.job.name];
            if (btn && btn.model.visible && btn.model.enabled) {
              console.log('village assign <min', bjob.job.name, belowMin);
              btn.domNode.click();
              assigned ++;
              break;
            }
          }
        }
        if (belowRatio.length && !assigned) {
          for (let bjob of belowRatio) {
            const btn = buttons['Village_' + bjob.job.name];
            if (btn && btn.model.visible && btn.model.enabled) {
              console.log('village assign <ratio', bjob.job.name, belowRatio);
              btn.domNode.click();
              assigned ++;
              break;
            }
          }
        }
        
        if (!assigned && (belowMin.length || belowRatio.length)) {
          console.log('village not assign?', belowMin, belowRatio);
        }
      }
      //game.village.maxKittens
      //game.village.sim.kittens
    }
    
    vis.btnPrices = afterGoalKeeps;
  }

}())
