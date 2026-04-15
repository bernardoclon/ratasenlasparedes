/**
 * Data Models para Actores
 */
export class BaseActorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      pc: new fields.SchemaField({
        value: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        min: new fields.NumberField({ initial: 0, integer: true }),
        max: new fields.NumberField({ initial: 10, integer: true })
      }),
      pv: new fields.SchemaField({
        value: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        min: new fields.NumberField({ initial: 0, integer: true }),
        max: new fields.NumberField({ initial: 10, integer: true })
      }),
      pe: new fields.SchemaField({
        value: new fields.NumberField({ initial: 0, integer: true, min: 0 }),
        min: new fields.NumberField({ initial: 0, integer: true })
      })
    };
  }
}

export class CharacterData extends BaseActorData {
  static defineSchema() {
    const fields = foundry.data.fields;
    const baseSchema = super.defineSchema();
    return {
      ...baseSchema,
      profesion: new fields.StringField({ initial: "" }),
      reputation: new fields.StringField({ initial: "" }),
      biography: new fields.HTMLField({ initial: "" }),
      attributes: new fields.SchemaField({
        level: new fields.SchemaField({
          value: new fields.NumberField({ initial: 1, integer: true, min: 1 })
        })
      }),
      abilities: new fields.SchemaField({
        des: new fields.SchemaField({ value: new fields.NumberField({ initial: 0, integer: true }) }),
        ing: new fields.SchemaField({ value: new fields.NumberField({ initial: 0, integer: true }) }),
        mus: new fields.SchemaField({ value: new fields.NumberField({ initial: 0, integer: true }) }),
        vio: new fields.SchemaField({ value: new fields.NumberField({ initial: 0, integer: true }) }),
        vol: new fields.SchemaField({ value: new fields.NumberField({ initial: 0, integer: true }) })
      })
    };
  }
}

export class NpcData extends CharacterData {}

export class ContainerData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      biography: new fields.HTMLField({ initial: "" })
    };
  }
}

/**
 * Extend the base Actor entity by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class ratasenlasparedesActor extends Actor {
  /** @override */
  prepareDerivedData() {
    const actorData = this;
    const system = actorData.system;
    const flags = actorData.flags.ratasenlasparedes || {};

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    this._prepareCharacterData(actorData);
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    if (actorData.type !== 'character') return;

    const system = actorData.system;

    // --- CÁLCULO DE MODIFICADORES POR CICATRICES/MANÍAS ---
    // Al estar en prepareDerivedData, tenemos acceso a this.items
    let pvstigmaModifier = 0;
    let pcstigmaModifier = 0;
    
    // Filtramos los items. Asegúrate de que los tipos coincidan exactamente con tus IDs de items
    for (const item of this.items) {
        if (!item.system) continue; 
        
        // Logica de stigmas
        if (item.type === 'stigma' && item.system.atributo === 'pv') pvstigmaModifier -= 1;
        if (item.type === 'mean' && item.system.atributo === 'pv') pvstigmaModifier += 1;
        if (item.type === 'mean' && item.system.atributo === 'pc') pcstigmaModifier += 1;
        if (item.type === 'stigma' && item.system.atributo === 'pc') pcstigmaModifier -= 1;
        // Profesión / Reputación: pueden aplicar modificadores directos a PC/PV
        if ((item.type === 'profesion' || item.type === 'reputation') && item.system) {
          const sel = item.system.selectorType;
          const val = parseInt(item.system.selectorValue) || 0;
          if (sel === 'pv') pvstigmaModifier += val;
          if (sel === 'pc') pcstigmaModifier += val;
        }
    }

    // --- CÁLCULO AUTOMÁTICO DE MÁXIMOS (CEILING) ---
    // PV Max = 10 + Musculo + Modificadores
    const musculo = system.abilities.mus.value || 0;
    system.pv.max = 10 + musculo + pvstigmaModifier;

    // PC Max = 10 + Voluntad - Hechizos + Modificadores
    const voluntad = system.abilities.vol.value || 0;
    const hechizos = this.items.filter(i => i.type === 'spell').length;
    system.pc.max = 10 + voluntad - hechizos + pcstigmaModifier;

    // --- CLAMPING (Limitar valor actual al máximo) ---
    // Aseguramos que la vida actual no supere el nuevo máximo calculado
    system.pv.value = Math.min(system.pv.value, system.pv.max);
    system.pc.value = Math.min(system.pc.value, system.pc.max);
  }

    /* -------------------------------------------- */
    /* Socket Listeners and Handlers
    /* -------------------------------------------- */
    /** @override */
    static async create(data, options = {}) {
        let link = true;
        if (data.type === 'npc') {
            link = false;
        }
        data.token = data.token || {};
        foundry.utils.mergeObject(data.token, {
            vision: true,
            dimSight: 30,
            brightSight: 0,
            actorLink: link,
            disposition: 1,
        });
        return super.create(data, options);
    }  
}