/**
 * Data Models para Items
 */
class BaseItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      description: new fields.HTMLField({ initial: "" }),
      quantity: new fields.NumberField({ initial: 1, integer: true, min: 0 }),
      weight: new fields.NumberField({ initial: 0, min: 0 })
    };
  }
}

export class ItemData extends BaseItemData {}

export class WeaponData extends BaseItemData {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      damage: new fields.StringField({ initial: "1d6" })
    };
  }
}

export class ArmorData extends BaseItemData {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      protection: new fields.StringField({ initial: "0" })
    };
  }
}

export class StigmaData extends BaseItemData {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      atributo: new fields.StringField({ initial: "" }),
      type: new fields.StringField({ initial: "" }),
      selectorType: new fields.StringField({ initial: "" }),
      selectorValue: new fields.NumberField({ initial: 0, integer: true })
    };
  }
}

export class SpellData extends BaseItemData {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      efect: new fields.StringField({ initial: "1d6" }),
      level: new fields.NumberField({ initial: 1, integer: true }),
      cost: new fields.NumberField({ initial: 0, integer: true })
    };
  }
}

export class ProfessionData extends BaseItemData {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      ...super.defineSchema(),
      selectorType: new fields.StringField({ initial: "" }),
      selectorValue: new fields.NumberField({ initial: 0, integer: true })
    };
  }
}

export class ReputationData extends ProfessionData {}
export class MeanData extends ProfessionData {}

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class ratasenlasparedesItem extends Item {
}
