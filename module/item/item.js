/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class ratasenlasparedesItem extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    super.prepareData();

    // Get the Item's data
    const system = this.system;

    // Ensure basic properties exist
    if (!system.description) system.description = "";
    if (!system.quantity) system.quantity = 1;
    if (!system.weight) system.weight = 0;

    // Type-specific preparations
    switch(this.type) {
      case 'weapon':
        if (!system.damage) system.damage = "";
        break;
      case 'armor':
        if (!system.protection) system.protection = 0;
        break;
      case 'spell':
        system.level = system.level ?? 1;
        system.cost = system.cost ?? 0;
        system.description = system.description || "";
        break;
      case 'profesion':
      case 'reputation':
      case 'mean':
      case 'stigma':
        // These types just need the basic properties
        // Add selector defaults for profesion and reputation so UI can bind
        if (!system.selectorType) system.selectorType = ""; // destreza, ingenio, musculos, violencia, voluntad, pc, pv
        if (system.selectorValue === undefined) system.selectorValue = 0;
        break;
    }
  }
}
