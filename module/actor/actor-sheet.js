import { ItemTypeSelection } from "../item/item-sheet.js";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class ratasenlasparedesActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["ratasenlasparedes", "sheet", "actor"],
      template: "systems/ratasenlasparedes/templates/actor/actor-sheet.html",
      width: 600,
      height: 600,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    const data = foundry.utils.deepClone(super.getData().data);
    data.dtypes = ["String", "Number", "Boolean"];
    for (let attr of Object.values(data.system.attributes)) {
      attr.isCheckbox = attr.dtype === "Boolean";
    }

    // Prepare items.
    if (this.actor.type == 'character') {
      this._prepareCharacterItems(data);
    }

    data.enrichedBio = await TextEditor.enrichHTML(this.object.system.biography, {async: true})

    return data;
  }
  
  activateEditor(name, options, initialContent) {//TODO: Custom editor
    // remove some controls to the editor as the space is lacking
      // console.log(name);
      // console.log(options);
      // console.log(initialContent);
    if (name == "system.biography") {
      /*options.toolbar = "styleselect bullist hr table removeFormat save";*/
    } 
    super.activateEditor(name, options, initialContent);
  }




  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add Inventory Item
    //html.find('.item-create').click(this._onItemCreate.bind(this));
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

    // Add immediate update for PV and PC max values
    html.find('input[name="system.pv.max"], input[name="system.pv.value"], input[name="system.pc.max"], input[name="system.pc.value"]').on('change', async event => {
        await this._onSubmit(event); // Trigger form submission on change
        this.render(false); // Update the sheet content to reflect changes
    });
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
      stigmaes: ['stigma'],
      resources: ['item']
    };

    // Open the item type selection dialog with filtered types
    const itemData = await ItemTypeSelection.create(this.actor, allowedTypes[tabName]);
    if (!itemData) return; // User cancelled

    // Initialize system data if needed
    itemData.system = itemData.system || {};

    // Create the item
    return await this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    if (!dataset.roll) return;

    // Manejar diferentes tipos de tiradas
    if (dataset.rollType === "ability") {
        // Mostrar diálogo de dificultad
        const dialogContent = await renderTemplate("systems/ratasenlasparedes/templates/dialogs/difficulty-dialog.html", {
            title: `Tirada de ${dataset.label}`
        });

        let difficulty = await new Promise(resolve => {
            new Dialog({
                title: "Dificultad de la Tirada",
                content: dialogContent,
                buttons: {
                    roll: {
                        icon: '<i class="fas fa-dice-d20"></i>',
                        label: "Tirar",
                        callback: html => {
                            const selected = html.find('[name="difficulty"]:checked');
                            return resolve(selected.val());
                        }
                    }
                },
                default: "roll",
                classes: ["ratas-difficulty-dialog"]
            }).render(true);
        });

        // Preparar la tirada con la dificultad seleccionada
        const difficultyText = difficulty === "+2" ? "fácil" : 
                              difficulty === "-2" ? "difícil" : 
                              "normal";

        const modText = difficulty === "0" ? "" : ` (${difficulty})`;
        const rollString = difficulty === "0" ? dataset.roll : `${dataset.roll} ${difficulty}`;
        const label = dataset.label ? `Realiza una tirada <strong>${difficultyText}${modText}</strong> de <strong>${dataset.label}</strong>` : '';
        
        const roll = new Roll(rollString, this.actor.system);
            AudioHelper.play({src: CONFIG.sounds.dice, volume: 0.8, autoplay: true, loop: false}, true);
            const result = await roll.evaluate({async: true});
            
            if (game.dice3d) {
                await game.dice3d.showForRoll(result, game.user, true);
            }
            const html = await result.render();
            
            await ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            flags: {'ratasenlasparedes':{'text':label}},
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            content: html,
            roll: result
        });
    }
    
    else if (dataset.rollType === "spell") {
        try {
            const dialogContent = await renderTemplate("systems/ratasenlasparedes/templates/dialogs/difficulty-dialog.html", {
                title: `Tirada de ${dataset.label}`
            });

            let difficulty = await new Promise(resolve => {
                new Dialog({
                    title: "Dificultad de la Tirada",
                    content: dialogContent,
                    buttons: {
                        roll: {
                            icon: '<i class="fas fa-dice-d20"></i>',
                            label: "Tirar",
                            callback: html => {
                                const selected = html.find('[name="difficulty"]:checked');
                                return resolve(selected.val());
                            }
                        }
                    },
                    default: "roll",
                    classes: ["ratas-difficulty-dialog"]
                }).render(true);
            });

            // Preparar la tirada con la dificultad seleccionada
            const difficultyText = difficulty === "+2" ? "fácil" : 
                                  difficulty === "-2" ? "difícil" : 
                                  "normal";

            const modText = difficulty === "0" ? "" : ` (${difficulty})`;
            const rollString = difficulty === "0" ? dataset.roll : `${dataset.roll} ${difficulty}`;
            const roll = new Roll(rollString, this.actor.system);
            AudioHelper.play({src: CONFIG.sounds.dice, volume: 0.8, autoplay: true, loop: false}, true);
            const result = await roll.evaluate({async: true});
            
            // Mostrar dados 3D si están disponibles
            if (game.dice3d) {
                await game.dice3d.showForRoll(result, game.user, true);
            }

            // Determinar el resultado
            let label = dataset.label ? `Usa su <strong>${dataset.label}</strong> con una tirada <strong>${difficultyText}${modText}</strong>.` : '';
            let goal;

            if (result.total <= 2) {
                label += ` <strong>Fracasas</strong> tu mente se cierra sobre sí misma para protegerte.`;
                goal = "Fracaso";
            } else if (result.total <= 7) {
                label += ` <strong>Fallas</strong> y pierdes <a class="item-name rollable" data-roll="1d6" data-roll-type="spell-sanity" title="Pérdida de Cordura"><i class="fas fa-dice-d6"></i> 1d6</a> de cordura.`;
                goal = "Fallo";
            } else if (result.total <= 9) {
                label += ` Tiene <strong>Éxito</strong>, pero pierdes <a class="item-name rollable" data-roll="1d3" data-roll-type="spell-sanity" title="Pérdida de Cordura"><i class="fas fa-dice-d6"></i> 1d3</a> de cordura.`;
                goal = "Parcial";
            } else {
                label += ` Tiene <strong>Éxito</strong>, no pierdes cordura y obtienes el efecto máximo del hechizo, si es que es aplicable.`;
                goal = "¡Oh sí!";
            }

            // Renderizar el resultado de la tirada
            const html = await result.render();

            // Crear un solo mensaje en el chat
            await ChatMessage.create({
                speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                flags: {'ratasenlasparedes':{'text':label, 'goal':goal}},
                type: CONST.CHAT_MESSAGE_TYPES.ROLL,
                roll: result,
                content: html
            });
        } catch (error) {
            console.error("Error en la tirada de hechizos:", error);
        }
    }

    else if (dataset.rollType === "efect") {
        const damageMod = Array.from(this.actor.items).reduce((acu, current) => {
            if (current.system.type === "Efect" && current.system.value === "Daño") {
                return acu + parseInt(current.system.mod);
            }
            return acu;
        }, 0);

        const damageString = damageMod === 0 ? dataset.roll : `${dataset.roll} + (${damageMod})`;
        const roll = new Roll(damageString);
        AudioHelper.play({src: CONFIG.sounds.dice, volume: 0.8, autoplay: true, loop: false}, true);
        const result = await roll.evaluate({async: true});
        if (game.dice3d) {
            await game.dice3d.showForRoll(result, game.user, true);
        }
        const html = await result.render();
        
        const label = dataset.label ? `El resultado de efecto de <strong>${dataset.label}</strong> es:` : '';
        
        await ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            flags: {'ratasenlasparedes':{'text':label}},
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            content: html,
            roll: result
        });
    }

    else if (dataset.rollType === "weapon") {
        try {
            const dialogContent = await renderTemplate("systems/ratasenlasparedes/templates/dialogs/difficulty-dialog.html", {
                title: `Tirada de ${dataset.label}`
            });

            let difficulty = await new Promise(resolve => {
                new Dialog({
                    title: "Dificultad de la Tirada",
                    content: dialogContent,
                    buttons: {
                        roll: {
                            icon: '<i class="fas fa-dice-d20"></i>',
                            label: "Tirar",
                            callback: html => {
                                const selected = html.find('[name="difficulty"]:checked');
                                return resolve(selected.val());
                            }
                        }
                    },
                    default: "roll",
                    classes: ["ratas-difficulty-dialog"]
                }).render(true);
            });

            // Preparar la tirada con la dificultad seleccionada
            const difficultyText = difficulty === "+2" ? "fácil" : 
                                  difficulty === "-2" ? "difícil" : 
                                  "normal";

            const modText = difficulty === "0" ? "" : ` (${difficulty})`;
            const rollString = difficulty === "0" ? dataset.roll : `${dataset.roll} ${difficulty}`;
            const roll = new Roll(rollString, this.actor.system);
            AudioHelper.play({src: CONFIG.sounds.dice, volume: 0.8, autoplay: true, loop: false}, true);
            const result = await roll.evaluate();
            
            // Mostrar dados 3D si están disponibles
            if (game.dice3d) {
                await game.dice3d.showForRoll(result, game.user, true);
            }

            // Determinar el resultado
            let label = dataset.label ? `Usa su <strong>${dataset.label}</strong>.` : '';
            let goal;

            if (result.total <= 7) {
                label += ` <strong>Falla</strong> y sufre <a class="entity-link" data-pack="ratasenlasparedes.ayudas" data-lookup="Consecuencias" draggable="true"><i class="fas fa-book-open"></i> dos Consecuencias</a>.`;
                goal = "Fallo";
            } else if (result.total <= 9) {
                label += ` Tiene <strong>éxito</strong>, pero sufre <a class="entity-link" data-pack="ratasenlasparedes.ayudas" data-lookup="Consecuencias" draggable="true"><i class="fas fa-book-open"></i> una Consecuencia</a>`;
                goal = "Parcial";
            } else if (result.total <= 11) {
                label += ` Tiene <strong>éxito</strong> y elige <a class="entity-link" data-pack="ratasenlasparedes.ayudas" data-lookup="Consecuencias" draggable="true"><i class="fas fa-book-open"></i> una Consecuencia</a> para su objetivo.`;
                goal = "Exito";
            } else {
                label += ` Tiene <strong>éxito</strong> y elige <a class="entity-link" data-pack="ratasenlasparedes.ayudas" data-lookup="Consecuencias" draggable="true"><i class="fas fa-book-open"></i> dos Consecuencias</a> para su objetivo.`;
                goal = "¡Oh sí!";
            }

            // Renderizar el resultado de la tirada
            const html = await result.render();

            // Crear un solo mensaje en el chat
            await ChatMessage.create({
                speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                flags: {'ratasenlasparedes':{'text':label, 'goal':goal}},
                type: CONST.CHAT_MESSAGE_TYPES.ROLL,
                roll: result,
                content: html
            });
        } catch (error) {
            console.error("Error en la tirada de arma:", error);
        }
    }
    
    else if (dataset.rollType === "damage") {
        const damageMod = Array.from(this.actor.items).reduce((acu, current) => {
            if (current.system.type === "Efecto" && current.system.value === "Daño") {
                return acu + parseInt(current.system.mod);
            }
            return acu;
        }, 0);

        const damageString = damageMod === 0 ? dataset.roll : `${dataset.roll} + (${damageMod})`;
        const roll = new Roll(damageString);
        AudioHelper.play({src: CONFIG.sounds.dice, volume: 0.8, autoplay: true, loop: false}, true);
        const result = await roll.evaluate({async: true});
        if (game.dice3d) {
            await game.dice3d.showForRoll(result, game.user, true);
        }
        const html = await result.render();
        
        const label = dataset.label ? `Causa daño con su <strong>${dataset.label}</strong>.` : '';
        
        await ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            flags: {'ratasenlasparedes':{'text':label}},
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            content: html,
            roll: result
        });
    }
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
console.log(sheetData);
    // Initialize containers.
    const gear = [];
    const profesion = [];
    const reputation = [];
    const weapon = [];
    const stigma = [];
    const mean = [];
    const spell = [];
    const resource = [];

    // Iterate through items, allocating to containers
    // let totalWeight = 0;
    for (let i of sheetData.items) {
      let item = i.data;
      i.img = i.img || DEFAULT_TOKEN;
      // Append to resource.
      if (i.type === 'item') {
        resource.push(i);
      }
      // Append to armor as gear.
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
      // Append to stigma.
      else if (i.type === 'stigma') {
        stigma.push(i);
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
    actorData.stigma = stigma;
    actorData.mean = mean;
    actorData.spell = spell;
    actorData.resource = resource;
  }

}

Hooks.on('renderChatMessage', (message, html, data) => {
    html.find('.rollable[data-roll-type="spell-sanity"]').click(async ev => {
        ev.preventDefault();
        const dataset = ev.currentTarget.dataset;
        const speaker = message.speaker;
        const actor = ChatMessage.getSpeakerActor(speaker);
        
        const roll = new Roll(dataset.roll, actor ? actor.system : {});
        AudioHelper.play({src: CONFIG.sounds.dice, volume: 0.8, autoplay: true, loop: false}, true);
        const result = await roll.evaluate({async: true});
        if (game.dice3d) {
            await game.dice3d.showForRoll(result, game.user, true);
        }
        const rollHtml = await result.render();
        
        const sanityLoss = result.total;
        const label = `Pierdes ${sanityLoss} puntos de cordura.`;
        
        // Update actor's sanity
        if (actor && typeof actor.system.sanity?.value === 'number') {
            const currentSanity = actor.system.sanity.value;
            const newSanity = currentSanity - sanityLoss;
            await actor.update({'system.sanity.value': newSanity});
        }
        
        await ChatMessage.create({
            speaker: speaker,
            flags: {'ratasenlasparedes':{'text':label}},
            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
            content: rollHtml,
            roll: result
        });
    });
});
