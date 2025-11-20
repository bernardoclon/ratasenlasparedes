import { ItemTypeSelection } from "../item/item-sheet.js";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class ratasenlasparedesNpcSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["ratasenlasparedes", "sheet", "actor", "npc"],
      //template: "systems/ratasenlasparedes/templates/actor/npc-sheet.html",
      width: 600,
      height: 600,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  get template() {
        // Later you might want to return a different template
        // based on user permissions.
        if (!game.user.isGM && this.actor.limited)
            return 'systems/ratasenlasparedes/templates/actor/limited-sheet.html';
        return 'systems/ratasenlasparedes/templates/actor/npc-sheet.html';
    }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    const context = await super.getData();
    
    // Add actor to context
    context.actor = this.actor;
    context.dtypes = ["String", "Number", "Boolean"];

    // Set default image if none exists
    context.img = this.actor.img || "icons/svg/mystery-man.svg";

    // Prepare items.
    if (this.actor.type == 'npc') {
      this._prepareCharacterItems(context);
    }

    // Get the data from actor.system
    const system = this.actor.system;

    // Initialize system data if needed
    if (!system.pv) system.pv = { value: 0, max: 0 };
    if (!system.pc) system.pc = { value: 0, max: 0 };

    // Make sure we have valid numbers
    system.pv.value = Number.isNaN(Number(system.pv.value)) ? 0 : Number(system.pv.value);
    system.pv.max = Number.isNaN(Number(system.pv.max)) ? 0 : Number(system.pv.max);
    system.pc.value = Number.isNaN(Number(system.pc.value)) ? 0 : Number(system.pc.value);
    system.pc.max = Number.isNaN(Number(system.pc.max)) ? 0 : Number(system.pc.max);

    // Add to context
    context.system = system;

    // Enrich the biography text
    context.enrichedBio = await TextEditor.enrichHTML(this.object.system.biography || "", {
      async: true,
      secrets: this.object.isOwner,
      relativeTo: this.object
    });

    return context;
  }
  



  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add Inventory Item
    html.find('.item-create').click(ev => this._onItemCreate(ev));
    
    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.getEmbeddedDocument("Item",li.data("itemId"));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      if (li.length > 0) {
        this.actor.deleteEmbeddedDocuments("Item",[li.data("itemId")]);
        li.slideUp(200, () => this.render(false));
      } else {
        const itemId = $(ev.currentTarget).data("item-id");
        this.actor.deleteEmbeddedDocuments("Item", [itemId]);
      }
    });

    // Clickable item links
    html.find('.item-link').click(ev => {
      const itemId = $(ev.currentTarget).data("item-id");
      const item = this.actor.getEmbeddedDocument("Item", itemId);
      item.sheet.render(true);
    });

    // Create specific items (Profesion/Reputation)
    html.find('.item-create-specific').click(async (ev) => {
      const type = ev.currentTarget.dataset.type;
      if (!type) return;

      const itemData = {
        name: `Nueva ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        type: type,
        system: {}
      };

      await this.actor.createEmbeddedDocuments("Item", [itemData]);
    });

    // Rollable abilities.
    html.find('.rollable').click(this._onRoll.bind(this));
  }

  /* -------------------------------------------- */

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();

    // Get the tab we're in
    const header = event.currentTarget.closest('.tab');
    const tabName = header?.dataset.tab;

    // Define allowed types per tab
    const allowedTypes = {
      items: ['weapon', 'armor'],
      spells: ['spell'],
      scares: ['scar'],
      resources: ['item']
    };

    // Open the item type selection dialog with filtered types
    const itemData = await ItemTypeSelection.create(this.actor, allowedTypes[tabName]);
    if (!itemData) return; // User cancelled

    // Create the item
    return this.actor.createEmbeddedDocuments("Item",[itemData]);
  }
  
  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterItems(sheetData) {
    const actorData = sheetData;

    // Initialize containers.
    const gear = [];
    const profesion = [];
    const reputation = [];
    const weapon = [];
    const scar = [];
    const mean = [];
    const spell = [];
    const resource = [];

    // Iterate through items, allocating to containers
    // let totalWeight = 0;
    for (let i of sheetData.items) {
      let item = i.data;
      i.img = i.img || DEFAULT_TOKEN;
      // Append to gear.
      if (i.type === 'item') {
        resource.push(i);
      }
      // Append to armor as gear
      else if (i.type === 'armor') {
        gear.push(i);
      }
      // Append to profesion.
      else if (i.type === 'profesion') {
        profesion.push(i);
      }
      // Append to reputation.
      else if (i.type === 'reputation') {
        reputation.push(i);
      }
      // Append to weapons.
      else if (i.type === 'weapon') {
        weapon.push(i);
      }
      // Append to scar.
      else if (i.type === 'scar') {
        scar.push(i);
      }
      // Append to mean.
      else if (i.type === 'mean') {
        mean.push(i);
      }
      // Append to spell.
      else if (i.type === 'spell') {
        spell.push(i);
      }
    }

    // Assign and return
    actorData.gear = gear;
    actorData.profesion = profesion[0];
    actorData.reputation = reputation[0];
    actorData.weapon = weapon;
    actorData.scar = scar;
    actorData.mean = mean;
    actorData.spell = spell;
    actorData.resource = resource;
  }


  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async _onRoll(event) {
    event.preventDefault();
    const dataset = event.currentTarget.dataset;
    const rollType = dataset.rollType;
    
    if (!dataset.roll) return;

    // Setup dificulty based on key modifiers
    let difficulty = ["0", "normal"];
    if (event.ctrlKey || event.metaKey)
        difficulty = ["-2", "difícil"];
    if (event.altKey)
        difficulty = ["-1", "arriesgada"];
    if (event.shiftKey)
        difficulty = ["+2", "fácil"];

    let rollString = dataset.roll;
    
    if (rollType === "weapon") {
        if (difficulty[0] !== "0") {
            rollString = dataset.roll + ' ' + difficulty[0];
        }
        let roll = new Roll(rollString, this.actor.system);
        let label = dataset.label ? `Usa su <strong>${dataset.label}</strong>${difficulty[0] !== "0" ? ` en una situación <strong>${difficulty[1]}</strong>` : ''}.` : '';
        let attackResult = await roll.roll();
        let goal;

        if (attackResult._total <= 7) {
            label += ` <strong>Falla</strong> y sufre <a class="entity-link" data-pack="ratasenlasparedes.ayudas" data-lookup="Consecuencias" draggable="true"><i class="fas fa-book-open"></i> dos Consecuencias</a>.`;
            goal = "Fallo";
        } else if (attackResult._total <= 9) {
            label += ` Tiene <strong>éxito</strong>, pero sufre <a class="entity-link" data-pack="ratasenlasparedes.ayudas" data-lookup="Consecuencias" draggable="true"><i class="fas fa-book-open"></i> una Consecuencia</a>`;
            goal = "Parcial";
        } else if (attackResult._total <= 11) {
            label += ` Tiene <strong>éxito</strong> y elige <a class="entity-link" data-pack="ratasenlasparedes.ayudas" data-lookup="Consecuencias" draggable="true"><i class="fas fa-book-open"></i> una Consecuencia</a> para su objetivo.`;
            goal = "Exito";
        } else {
            label += ` Tiene <strong>éxito</strong> y elige <a class="entity-link" data-pack="ratasenlasparedes.ayudas" data-lookup="Consecuencias" draggable="true"><i class="fas fa-book-open"></i> dos Consecuencias</a> para su objetivo.`;
            goal = "!Oh sí!";
        }
        
        let attackData = {
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            flags: {'ratasenlasparedes':{'text':label, 'goal':goal, 'detail': attackResult.result}},
            flavor: label,
        };
        
        attackResult.toMessage(attackData);
    }
    else if (rollType === "damage") {
        await this.damageRoll(dataset);
    }
  }


  async damageRoll(dataset) {
      const damageMod = Array.from(this.actor.items).reduce(function (acu, current) {
                          if (current.system.type == "Efecto" && current.system.value == "Daño") {
                              acu += parseInt(current.system.mod);
                          }
                          return acu;
                      }, 0);
      const rollString = damageMod === 0 ? dataset.roll : `${dataset.roll} + (${damageMod})`; 
      const roll = new Roll(rollString);
      const label = dataset.label ? `Causa daño con su <strong>${dataset.label}</strong>.` : '';
      const attackResult = await roll.roll();
      const attackData = {
          speaker: ChatMessage.getSpeaker({ actor: this.actor }),
          flags: {'ratasenlasparedes':{'text':label}},
          flavor: label,
      };
          
      attackResult.toMessage(attackData);
  }
}
